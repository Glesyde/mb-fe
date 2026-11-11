import { describe, expect, it, vi } from "vitest";
import { evaluate } from "../engine";
import { createDemoRepository, STORAGE_KEY, type StorageLike } from "../data/demoRepository";
import { toEngineInput } from "../data/mappers";
import { runEvaluation } from "../services/reproductive.service";
import { DEFAULT_PERMITTED, makeObservation } from "../data/records";

class MemoryStorage implements StorageLike {
  data = new Map<string, string>();
  getItem = (k: string) => this.data.get(k) ?? null;
  setItem = (k: string, v: string) => void this.data.set(k, v);
  removeItem = (k: string) => void this.data.delete(k);
}

class BrokenStorage implements StorageLike {
  getItem(): string | null {
    throw new Error("SecurityError");
  }
  setItem(): void {
    throw new Error("QuotaExceededError");
  }
  removeItem(): void {
    throw new Error("SecurityError");
  }
}

const doctor = { id: "u-7", name: "Dr Test" };
let tick = 0;
const clock = () => `2026-11-07T10:00:${String(tick++ % 60).padStart(2, "0")}.000Z`;
const repo = (storage: StorageLike | null = new MemoryStorage()) => createDemoRepository({ storage, now: clock, today: "2026-11-01" });

describe("demo repository storage", () => {
  it("stores everything under one versioned key and survives a reload", async () => {
    const storage = new MemoryStorage();
    const a = repo(storage);
    await a.createRecord("MRN-1", { sex: "female", language: "en" }, doctor, DEFAULT_PERMITTED);
    expect(Array.from(storage.data.keys())).toEqual([STORAGE_KEY]);
    expect(JSON.parse(storage.data.get(STORAGE_KEY)!).version).toBe(3);
    expect(await repo(storage).getRecord("MRN-1")).not.toBeNull();
  });

  it("keeps working in memory when storage throws", async () => {
    const r = repo(new BrokenStorage());
    await r.createRecord("MRN-1", { sex: "female", language: "en" }, doctor, DEFAULT_PERMITTED);
    expect(await r.getRecord("MRN-1")).not.toBeNull();
    expect(r.isPersistent()).toBe(false);
  });

  it("works with no storage at all", async () => {
    const r = repo(null);
    expect((await r.getRecord("DEMO-1"))?.isDemo).toBe(true);
    expect(r.isPersistent()).toBe(false);
  });

  it("ignores data stored under another version", async () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: 0, asOf: "2020-01-01", records: {} }));
    expect(await repo(storage).getAsOf()).toBe("2026-11-01");
  });

  it("has 1,000 synthetic patients and the 8 scenarios, but stores only what is needed", async () => {
    const storage = new MemoryStorage();
    const r = repo(storage);
    expect(await r.getRecord("SYN-1000")).not.toBeNull();
    expect((await r.listScenarios()).map((s) => s.id)).toEqual(["DEMO-1", "DEMO-2", "DEMO-3", "DEMO-4", "DEMO-5", "DEMO-6", "DEMO-7", "DEMO-8"]);
    const stored = JSON.parse(storage.data.get(STORAGE_KEY)!);
    expect(Object.keys(stored.records).some((id) => id.startsWith("SYN-"))).toBe(false);
    expect(storage.data.get(STORAGE_KEY)!.length).toBeLessThan(200_000);
  });

  it("regenerates the synthetic population after a reload, including advances and changes", async () => {
    const storage = new MemoryStorage();
    const a = repo(storage);
    await a.advanceDemo(6, doctor);
    await a.recordCounselling("SYN-0007", "2027-01-01", doctor);
    const before = { s1: await a.getRecord("SYN-0001"), s7: await a.getRecord("SYN-0007") };
    const b = repo(storage);
    expect(await b.getAsOf()).toBe("2027-05-01");
    expect(await b.getRecord("SYN-0001")).toEqual(before.s1);
    expect(await b.getRecord("SYN-0007")).toEqual(before.s7);
    const stored = JSON.parse(storage.data.get(STORAGE_KEY)!);
    expect(Object.keys(stored.records).filter((id) => id.startsWith("SYN-"))).toEqual(["SYN-0007"]);
  });

  it("makes no network calls", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const r = repo();
    await r.getRecord("DEMO-1");
    await r.advanceDemo(6, doctor);
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

describe("consent", () => {
  it("logs every change with time, user and reason, and the engine drops withdrawn data", async () => {
    const r = repo();
    await r.loadScenario("MRN-2", "DEMO-1", doctor);
    const rec = await r.setConsent("MRN-2", "METABOLIC", false, "Patient asked to stop sharing lab results", doctor);
    const entry = (await r.getActivity("MRN-2"))[0];
    expect(entry).toMatchObject({ action: "CONSENT_CHANGED", category: "METABOLIC", by: doctor, detail: "Withdrawn: Patient asked to stop sharing lab results" });
    expect(entry.at).toMatch(/^2026-11-07T/);
    const v3 = evaluate(toEngineInput(rec, await r.getAsOf())).vectors.find((v) => v.vector === "V3")!;
    expect(v3).toMatchObject({ dataWithdrawn: true, series: [] });
  });

  it("refuses to withdraw PROFILE, and refuses a change without a reason", async () => {
    const r = repo();
    await r.createRecord("MRN-3", { sex: "male", language: "ar" }, doctor, DEFAULT_PERMITTED);
    await expect(r.setConsent("MRN-3", "PROFILE", false, "x", doctor)).rejects.toThrow(/cannot be withdrawn/);
    await expect(r.setConsent("MRN-3", "HISTORY", false, "  ", doctor)).rejects.toThrow(/reason/);
  });

  it("the consent step records the clinician, date and categories; defaults leave wearables and partner off", async () => {
    const r = repo();
    const rec = await r.createRecord("MRN-4", { sex: "female", language: "en" }, doctor, DEFAULT_PERMITTED);
    expect(rec.consentMode).toBe("CLINICIAN_CONFIRMED");
    expect(rec.consent.provision.filter((p) => p.type === "deny").map((p) => p.category)).toEqual(["WEARABLES", "PARTNER_SHARING"]);
    const entry = (await r.getActivity("MRN-4"))[0];
    expect(entry).toMatchObject({ action: "CONSENT_CAPTURED", by: { id: "u-7", name: "Dr Test" } });
    expect(entry.detail).toBe(
      "I have explained this tool to the patient and they agree to use: PROFILE, CYCLES, METABOLIC, HORMONES_SEMEN, HISTORY, LIFESTYLE, PLANS, CLINICIAN_SHARING (confirmed 2026-11-07)",
    );
  });

  it("the clinician can untick categories in the consent step", async () => {
    const rec = await repo().createRecord("MRN-12", { sex: "female", language: "en" }, doctor, ["CYCLES", "WEARABLES"]);
    const permitted = rec.consent.provision.filter((p) => p.type === "permit").map((p) => p.category);
    expect(permitted).toEqual(["PROFILE", "CYCLES", "WEARABLES"]);
  });

  it("demo records carry Demo consent", async () => {
    expect((await repo().getRecord("DEMO-1"))!.consentMode).toBe("DEMO");
    expect((await repo().getRecord("SYN-0001"))!.consentMode).toBe("DEMO");
  });
});

describe("symptoms and red flags", () => {
  it("runs the red-flag check at entry whatever the consent, and never stores the text", async () => {
    const storage = new MemoryStorage();
    const r = repo(storage);
    await r.createRecord("MRN-5", { sex: "female", language: "en" }, doctor, DEFAULT_PERMITTED);
    for (const c of ["HISTORY", "LIFESTYLE", "PLANS", "CYCLES", "METABOLIC", "HORMONES_SEMEN"] as const) {
      await r.setConsent("MRN-5", c, false, "test", doctor);
    }
    const text = "Sudden severe pain on my left side in the pelvis and my period is late";
    const { check, record } = await r.submitSymptoms("MRN-5", { freeText: text }, doctor);
    expect(check.redFlags).toEqual(["R35"]);
    expect(record.redFlags).toMatchObject([{ ruleId: "R35", status: "OPEN", source: "FREE_TEXT" }]);
    expect(storage.data.get(STORAGE_KEY)).not.toContain("period is late");
    expect(evaluate(toEngineInput(record, await r.getAsOf())).emergency).toBe(true);
  });

  it("records both clinician actions with time and user, and the panel clears", async () => {
    const r = repo();
    await r.createRecord("MRN-6", { sex: "female", language: "en" }, doctor, DEFAULT_PERMITTED);
    await r.submitSymptoms("MRN-6", { bleedingAfterSex: true, severeOneSidedPelvicPain: true, fainting: true }, doctor);
    let rec = (await r.getRecord("MRN-6"))!;
    const [r35, r36] = [rec.redFlags.find((e) => e.ruleId === "R35")!, rec.redFlags.find((e) => e.ruleId === "R36")!];
    rec = await r.resolveRedFlag("MRN-6", r35.id, "DISMISSED", doctor);
    rec = await r.resolveRedFlag("MRN-6", r36.id, "ACKNOWLEDGED_REFERRED", doctor);
    expect(rec.redFlags.map((e) => [e.ruleId, e.status, e.resolvedBy?.id])).toEqual([
      ["R35", "DISMISSED", "u-7"],
      ["R36", "ACKNOWLEDGED_REFERRED", "u-7"],
    ]);
    const details = (await r.getActivity("MRN-6")).filter((a) => a.action === "RED_FLAG_RESOLVED").map((a) => a.detail);
    expect(details).toEqual(["R36: Acknowledged and referred", "R35: Not present (dismissed)"]);
    expect(evaluate(toEngineInput(rec, await r.getAsOf())).emergency).toBe(false);
    await expect(r.resolveRedFlag("MRN-6", r35.id, "DISMISSED", doctor)).rejects.toThrow(/already resolved/);
  });
});

describe("scenarios and demo controls", () => {
  it("loads a scenario onto an empty MRN, labelled as demo data", async () => {
    const r = repo();
    const rec = await r.loadScenario("MRN-7", "DEMO-3", doctor);
    expect(rec).toMatchObject({ patientId: "MRN-7", isDemo: true, scenarioId: "DEMO-3" });
    expect((await r.getActivity("MRN-7"))[0].detail).toMatch(/synthetic data/);
  });

  it("refuses to overwrite a record that has real data", async () => {
    const r = repo();
    await r.createRecord("MRN-8", { sex: "female", language: "en" }, doctor, DEFAULT_PERMITTED);
    await r.addObservations("MRN-8", [makeObservation("x", "BMI", 24, "kg/m2", "2026-10-01", "ENTERED")], doctor);
    await expect(r.loadScenario("MRN-8", "DEMO-1", doctor)).rejects.toThrow(/real data/);
  });

  it("advance 6 months adds seeded follow-ups to demo records only, deterministically", async () => {
    const run = async () => {
      const r = repo();
      await r.createRecord("MRN-9", { sex: "female", language: "en" }, doctor, DEFAULT_PERMITTED);
      await r.addObservations("MRN-9", [makeObservation("x", "BMI", 24, "kg/m2", "2026-10-01", "ENTERED")], doctor);
      const asOf = await r.advanceDemo(6, doctor);
      return { r, asOf };
    };
    const { r, asOf } = await run();
    expect(asOf).toBe("2027-05-01");
    expect((await r.getRecord("MRN-9"))!.observations).toHaveLength(1);
    const one = (await r.getRecord("DEMO-8"))!;
    expect(one.observations.filter((o) => o.code.key === "AMH")).toHaveLength(2);
    const v1 = evaluate(toEngineInput(one, asOf)).vectors.find((v) => v.vector === "V1")!;
    expect(v1.density).toBe("TREND");
    const again = await (await run()).r.getRecord("DEMO-8");
    expect(again!.observations).toEqual(one.observations);
  });

  it("the demo date is today unless advanced, follows the real date, and Reset brings it back to today", async () => {
    const storage = new MemoryStorage();
    const day1 = createDemoRepository({ storage, now: clock, today: "2026-11-01" });
    expect(await day1.getAsOf()).toBe("2026-11-01");
    // Next day, same stored data: still today, never a stale or future date.
    const day2 = createDemoRepository({ storage, now: clock, today: "2026-11-02" });
    expect(await day2.getAsOf()).toBe("2026-11-02");
    await day2.advanceDemo(6, doctor);
    expect(await day2.getAsOf()).toBe("2027-05-02");
    expect(await day2.getToday()).toBe("2026-11-02");
    await day2.resetDemo();
    expect(await day2.getAsOf()).toBe("2026-11-02");
  });

  it("real patients are evaluated at today even after the demo is advanced", async () => {
    const r = repo();
    await r.createRecord("MRN-13", { sex: "female", language: "en" }, doctor, DEFAULT_PERMITTED);
    await r.advanceDemo(6, doctor);
    const out = await runEvaluation({ repo: r, patientId: "MRN-13", lang: "en" });
    expect(out.asOf).toBe("2026-11-01");
    const demo = await runEvaluation({ repo: r, patientId: "DEMO-1", lang: "en" });
    expect(demo.asOf).toBe("2027-05-01");
  });

  it("reset restores demo data and keeps real records", async () => {
    const r = repo();
    await r.createRecord("MRN-10", { sex: "male", language: "en" }, doctor, DEFAULT_PERMITTED);
    await r.loadScenario("MRN-11", "DEMO-2", doctor);
    await r.advanceDemo(6, doctor);
    await r.resetDemo();
    expect(await r.getAsOf()).toBe("2026-11-01");
    expect(await r.getRecord("MRN-10")).not.toBeNull();
    expect(await r.getRecord("MRN-11")).toBeNull();
  });
});
