import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { evaluate, STAGES } from "../engine";
import type { EngineResult } from "../engine/types";
import { createDemoRepository } from "../data/demoRepository";
import { DEFAULT_PERMITTED } from "../data/records";
import { findForbidden, PERCENT_PATTERN } from "../guardrails/forbiddenPhrases";
import { splitGlossary } from "../i18n/glossary";
import { explain, explainPayload } from "../services/explanation.service";
import { runEvaluation } from "../services/reproductive.service";
import { templateSummary } from "../services/templateExplainer";
import { validateCycle, validateDate, validateLab, validateSemen } from "../services/validation";
import { expand } from "./cases.test";
import { amh, hba1c, woman } from "./helpers";

const engineFixtures = readdirSync(resolve(process.cwd(), "src/features/reproductive/__tests__/cases"))
  .map((f) => JSON.parse(readFileSync(resolve(process.cwd(), "src/features/reproductive/__tests__/cases", f), "utf8")))
  .filter((f) => f.kind === "engine" || f.kind === "catalogue");

const sample = (): EngineResult => evaluate(woman(33, { observations: [amh(2.5, "2026-05-01"), hba1c(5.9, "2025-11-15"), hba1c(5.4, "2026-09-01")] }));

describe("template explainer", () => {
  for (const lang of ["en", "ar"] as const) {
    it(`${lang}: every fixture gives calm, complete text ending with "your doctor decides"`, () => {
      for (const f of engineFixtures) {
        const { text, lines } = templateSummary(evaluate(expand(f.input)), lang);
        expect(lines[lines.length - 1], f.id).toBe(lang === "en" ? "Your doctor decides." : "طبيبك هو من يقرر.");
        expect(findForbidden(text), f.id).toEqual([]);
        expect(text, f.id).not.toMatch(/\b(rule|vector|state|gap|common)\.[A-Za-z]/); // no raw keys
        if (!text.includes("NICE NG257 1.4.1")) expect(PERCENT_PATTERN.test(text), f.id).toBe(false);
      }
    });
  }
  it("shows only the emergency text when processing stopped", () => {
    const r = evaluate(woman(29, { openRedFlags: ["R35"] }));
    expect(templateSummary(r, "en").lines[0]).toMatch(/^These symptoms need urgent medical care/);
  });
});

describe("explanation service", () => {
  const ok = (text: string) => async () => ({ ok: true, json: async () => ({ text }) });

  it("uses standard wording with the note when no URL is set", async () => {
    const x = await explain(sample(), "en", { url: undefined });
    expect(x).toMatchObject({ source: "TEMPLATE", noteKey: "explain.standardWording", fallbackReason: "NOT_CONFIGURED" });
  });
  it("uses AI wording that passes the output check, for that language only", async () => {
    const x = await explain(sample(), "en", { url: "https://x.test", fetchImpl: ok("HbA1c came down from 5.9% to 5.4%. Your doctor decides.") });
    expect(x).toMatchObject({ source: "AI", noteKey: null });
    expect(x.text.en).toBe("HbA1c came down from 5.9% to 5.4%. Your doctor decides.");
    expect(x.text.ar).toBe(templateSummary(sample(), "ar").text);
    expect(x.trace[1].decision).toBe("AI wording, checked");
  });
  it("falls back when the AI wording fails the output check", async () => {
    const x = await explain(sample(), "en", { url: "https://x.test", fetchImpl: ok("You are 70% fertile.") });
    expect(x).toMatchObject({ source: "TEMPLATE", fallbackReason: "OUTPUT_CHECK", noteKey: "explain.standardWording" });
    expect(x.violations).toContain("PERCENTAGE");
  });
  it("falls back after 2.5 s", async () => {
    vi.useFakeTimers();
    const slow = () => new Promise<{ ok: boolean; json(): Promise<unknown> }>((r) => setTimeout(() => r({ ok: true, json: async () => ({ text: "x" }) }), 3500));
    const pending = explain(sample(), "en", { url: "https://x.test", fetchImpl: slow });
    await vi.advanceTimersByTimeAsync(2600);
    expect((await pending).fallbackReason).toBe("TIMEOUT");
    vi.useRealTimers();
  });
  it("falls back when offline or on a server error", async () => {
    expect((await explain(sample(), "en", { url: "https://x.test", fetchImpl: () => Promise.reject(new TypeError("offline")) })).fallbackReason).toBe("FAILED");
    expect((await explain(sample(), "en", { url: "https://x.test", fetchImpl: async () => ({ ok: false, json: async () => ({}) }) })).fallbackReason).toBe("FAILED");
  });
  it("sends structure and numbers only: no names, MRN or free text", async () => {
    const input = woman(33, { observations: [amh(2.5, "2026-05-01")], symptoms: { freeText: "my name is Sara, MRN-123" } });
    const body = JSON.stringify(explainPayload(evaluate(input), "en"));
    expect(body).not.toMatch(/Sara|MRN|freeText/);
  });
});

describe("run with trace (stages 1–9)", () => {
  const doctor = { id: "u-7", name: "Dr Test" };
  const repo = () => createDemoRepository({ storage: null, now: () => "2026-11-07T10:00:00.000Z", today: "2026-11-01" });

  it("asks for consent before evaluating a real patient", async () => {
    expect(await runEvaluation({ repo: repo(), patientId: "MRN-NEW", lang: "en" })).toEqual({ status: "CONSENT_REQUIRED", asOf: "2026-11-01" });
  });

  it("records all nine stages in order, with counts only", async () => {
    const out = await runEvaluation({ repo: repo(), patientId: "DEMO-1", lang: "en" });
    if (out.status !== "READY") throw new Error("not ready");
    expect(out.trace.map((t) => t.stage)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(out.trace.map((t) => t.id)).toEqual(STAGES.map((s) => s.id));
    expect(out.trace.every((t) => t.status === "done")).toBe(true);
    expect(JSON.stringify(out.trace)).not.toMatch(/DEMO-1|Synthetic|Main demo/);
    expect(STAGES.map((s) => s.name.toLowerCase()).join(" ")).not.toContain("diagnos");
  });

  it("shows the linked partner's V4 on scenario 1", async () => {
    const out = await runEvaluation({ repo: repo(), patientId: "DEMO-1", lang: "en" });
    if (out.status !== "READY") throw new Error("not ready");
    expect(out.result.vectors.find((v) => v.vector === "V4")).toMatchObject({ fromPartner: true, state: "NEEDS_ATTENTION" });
  });

  it("stops after stage 2 on a red flag, R36 included", async () => {
    const r = repo();
    await r.createRecord("MRN-1", { sex: "female", language: "en" }, doctor, DEFAULT_PERMITTED);
    await r.submitSymptoms("MRN-1", { bleedingBetweenPeriods: true }, doctor);
    const out = await runEvaluation({ repo: r, patientId: "MRN-1", lang: "en" });
    if (out.status !== "READY") throw new Error("not ready");
    expect(out.result.halted).toBe(true);
    expect(out.trace.map((t) => t.status)).toEqual(["done", "stopped", "skipped", "skipped", "skipped", "skipped", "skipped", "skipped", "skipped"]);
    expect(out.brief).toBeNull();
  });

  it("maps EMR data for a real patient and says so in stage 3", async () => {
    const r = repo();
    await r.createRecord("MRN-2", { sex: "female", language: "en" }, doctor, DEFAULT_PERMITTED);
    const emr = {
      patient: { mrn: "MRN-2", demographics: { gender: "Female", display_age: "33Y" } },
      vitals: [{ id: 1, recorded_at: "2026-10-01", bmi: "24.1" }],
      history: [{ labs: [{ service_name: "AMH", ordered_at: "2026-09-01", lab_status: "RELEASED", results: [{ parameter: "AMH", value: "2.2", unit: "ng/mL" }] }] }],
    };
    const out = await runEvaluation({ repo: r, patientId: "MRN-2", lang: "en", emr });
    if (out.status !== "READY") throw new Error("not ready");
    expect(out.hasData).toBe(true);
    expect(out.trace[2].input).toContain("EMR: 2 value(s) read, 1 lab name(s) matched");
    expect(out.result.vectors.find((v) => v.vector === "V1")!.state).toBe("STABLE");
  });

  it("an empty real record is READY with no data (empty state)", async () => {
    const r = repo();
    await r.createRecord("MRN-3", { sex: "female", language: "en" }, doctor, DEFAULT_PERMITTED);
    const out = await runEvaluation({ repo: r, patientId: "MRN-3", lang: "en", emr: { patient: { demographics: { gender: "Female" } }, vitals: [], history: [] } });
    expect(out.status === "READY" && out.hasData).toBe(false);
  });

  it("brief payload collects trends, discussion points, missing tests and citations", async () => {
    const out = await runEvaluation({ repo: repo(), patientId: "DEMO-3", lang: "en" });
    if (out.status !== "READY" || !out.brief) throw new Error("no brief");
    expect(out.brief.discussionPoints.map((d) => d.pathway)).toEqual(expect.arrayContaining(["P5", "P2", "P1"]));
    expect(out.brief.citations.length).toBeGreaterThan(0);
  });
});

describe("data-entry validation", () => {
  const asOf = "2026-11-01";
  it("dates", () => {
    expect(validateDate("2026-10-31", asOf)).toBeNull();
    expect(validateDate("2026-11-02", asOf)).toMatch(/future/);
    expect(validateDate("2026-02-30", asOf)).toMatch(/does not exist/);
    expect(validateDate("31/10/2026", asOf)).toMatch(/format/);
    expect(validateDate("", asOf)).toMatch(/Enter/);
  });
  it("labs check units and plausible ranges", () => {
    expect(validateLab("AMH", "2.5", "ng/mL", "2026-10-01", asOf)).toEqual({});
    expect(validateLab("AMH", "2.5", "%", "2026-10-01", asOf).unit).toMatch(/ng\/mL, pmol\/L/);
    expect(validateLab("AMH", "45", "ng/mL", "2026-10-01", asOf).value).toMatch(/between 0 and 30/);
    expect(validateLab("HBA1C", "abc", "%", "2026-10-01", asOf).value).toMatch(/number/);
  });
  it("cycles and semen", () => {
    expect(validateCycle("2026-10-01", "28", asOf)).toEqual({});
    expect(validateCycle("2026-10-01", "200", asOf).lengthDays).toMatch(/10 and 120/);
    expect(validateSemen({}, "2026-10-01", asOf).form).toMatch(/at least one/);
    expect(validateSemen({ TOTAL_MOTILITY: "140" }, "2026-10-01", asOf).TOTAL_MOTILITY).toMatch(/at most 100/);
  });
});

describe("glossary", () => {
  it("marks the first occurrence of each term", () => {
    const parts = splitGlossary("AMH reflects ovarian reserve. AMH again.", "en");
    expect(parts.filter((p) => p.term).map((p) => p.term)).toEqual(["AMH", "OVARIAN_RESERVE"]);
    expect(parts.map((p) => p.text).join("")).toBe("AMH reflects ovarian reserve. AMH again.");
  });
  it("works in Arabic", () => {
    expect(splitGlossary("نتيجة تحليل السائل المنوي", "ar").find((p) => p.term)?.term).toBe("SEMEN_ANALYSIS");
  });
});
