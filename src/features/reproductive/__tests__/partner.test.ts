import { describe, expect, it, vi } from "vitest";
import { createDemoRepository } from "../data/demoRepository";
import { DEFAULT_PERMITTED, makeObservation, makeSemenObservation } from "../data/records";
import { runEvaluation } from "../services/reproductive.service";

const doctor = { id: "u-7", name: "Dr Test" };
const repo = () => createDemoRepository({ storage: null, now: () => "2026-11-07T10:00:00.000Z", today: "2026-11-01" });
const ready = async (r: ReturnType<typeof repo>, id: string) => {
  const out = await runEvaluation({ repo: r, patientId: id, lang: "en" });
  if (out.status !== "READY") throw new Error("not ready");
  return out;
};

async function couple() {
  const r = repo();
  await r.createRecord("W-1", { sex: "female", language: "en" }, doctor, [...DEFAULT_PERMITTED, "PARTNER_SHARING"]);
  await r.createRecord("M-1", { sex: "male", language: "en" }, doctor, [...DEFAULT_PERMITTED, "PARTNER_SHARING"]);
  await r.addObservations("W-1", [makeObservation("x", "HBA1C", 5.6, "%", "2026-09-01", "ENTERED"), makeObservation("x", "HBA1C", 5.5, "%", "2026-03-01", "ENTERED")], doctor);
  await r.addObservations("M-1", [makeSemenObservation("x", "2026-08-01", { SPERM_CONCENTRATION: 9, PROGRESSIVE_MOTILITY: 20 }, "ENTERED")], doctor);
  await r.setLifestyle("M-1", { heatExposure: true }, doctor);
  return r;
}

describe("partner link", () => {
  it("needs both sides: nothing is shared until the partner accepts", async () => {
    const r = await couple();
    await r.requestPartnerLink("W-1", "M-1", ["METABOLIC"], doctor);
    expect((await ready(r, "W-1")).partner).toMatchObject({ status: "PENDING_THEM", theyShare: [], sharedVectors: [] });
    expect((await ready(r, "M-1")).partner).toMatchObject({ status: "PENDING_YOU" });
    expect((await ready(r, "W-1")).result.vectors.map((v) => v.vector)).not.toContain("V4");
  });

  it("after acceptance each side sees only what the other shared", async () => {
    const r = await couple();
    await r.requestPartnerLink("W-1", "M-1", ["METABOLIC"], doctor);
    await r.respondPartnerLink("M-1", true, ["HORMONES_SEMEN"], doctor);
    const her = await ready(r, "W-1");
    expect(her.partner).toMatchObject({ status: "LINKED", theyShare: ["HORMONES_SEMEN"], youShare: ["METABOLIC"] });
    const v4 = her.result.vectors.find((v) => v.vector === "V4")!;
    expect(v4.fromPartner).toBe(true);
    // Heat exposure is LIFESTYLE, which he did not share: R20 must not appear for her.
    expect(her.result.partnerSteps.map((f) => f.id)).toEqual(["R23", "R22"]);
    const him = await ready(r, "M-1");
    expect(him.partner!.sharedVectors.map((v) => v.vector)).toEqual(["V3"]);
    expect(him.partner!.sharedVectors[0].inputsUsed).toEqual(["HBA1C"]);
  });

  it("a partner can change what they share, and either side can end the link", async () => {
    const r = await couple();
    await r.requestPartnerLink("W-1", "M-1", [], doctor);
    await r.respondPartnerLink("M-1", true, ["HORMONES_SEMEN"], doctor);
    await r.setPartnerSharing("M-1", ["HORMONES_SEMEN", "LIFESTYLE"], doctor);
    expect((await ready(r, "W-1")).result.partnerSteps.map((f) => f.id)).toEqual(["R23", "R20", "R22"]);
    await r.unlinkPartner("M-1", doctor);
    expect((await ready(r, "W-1")).partner).toBeNull();
    expect((await r.getActivity("W-1"))[0].detail).toMatch(/ended by the other side/);
  });

  it("stops sharing when the partner withdraws partner-sharing consent", async () => {
    const r = await couple();
    await r.requestPartnerLink("W-1", "M-1", [], doctor);
    await r.respondPartnerLink("M-1", true, ["HORMONES_SEMEN"], doctor);
    await r.setConsent("M-1", "PARTNER_SHARING", false, "Changed his mind", doctor);
    const her = await ready(r, "W-1");
    expect(her.result.vectors.map((v) => v.vector)).not.toContain("V4");
    expect(her.partner!.theyShare).toEqual([]);
  });

  it("can only share consented categories, never symptoms", async () => {
    const r = await couple();
    await r.setConsent("W-1", "CYCLES", false, "x", doctor);
    const rec = await r.requestPartnerLink("W-1", "M-1", ["CYCLES", "METABOLIC", "CLINICIAN_SHARING"], doctor);
    expect(rec.partner!.sharedCategories).toEqual(["METABOLIC"]);
  });

  it("refuses bad links", async () => {
    const r = await couple();
    await expect(r.requestPartnerLink("W-1", "W-1", [], doctor)).rejects.toThrow(/themselves/);
    await expect(r.requestPartnerLink("W-1", "NOPE", [], doctor)).rejects.toThrow(/consent step/);
    await expect(r.requestPartnerLink("W-1", "DEMO-2", [], doctor)).rejects.toThrow(/Demo records/);
    await r.setConsent("W-1", "PARTNER_SHARING", false, "x", doctor);
    await expect(r.requestPartnerLink("W-1", "M-1", [], doctor)).rejects.toThrow(/Partner sharing consent/);
    await expect(r.respondPartnerLink("M-1", true, [], doctor)).rejects.toThrow(/no link request/);
  });

  it("a declined request leaves both records unlinked", async () => {
    const r = await couple();
    await r.requestPartnerLink("W-1", "M-1", [], doctor);
    await r.respondPartnerLink("M-1", false, [], doctor);
    expect((await r.getRecord("W-1"))!.partner).toBeUndefined();
    expect((await r.getRecord("M-1"))!.partner).toBeUndefined();
  });
});

describe("a real partner's EMR data", () => {
  const hisSemen = {
    patient: { mrn: "M-2", demographics: { gender: "Male", display_age: "36Y" } },
    vitals: [],
    history: [{ labs: [{ service_name: "Semen analysis", ordered_at: "2026-08-01", lab_status: "RELEASED", results: [{ parameter: "Sperm concentration", value: "9", unit: "million/mL" }] }] }],
  };

  it("is loaded for a linked real partner and used only for shared categories", async () => {
    const r = repo();
    await r.createRecord("W-2", { sex: "female", language: "en" }, doctor, [...DEFAULT_PERMITTED, "PARTNER_SHARING"]);
    await r.createRecord("M-2", { sex: "male", language: "en" }, doctor, [...DEFAULT_PERMITTED, "PARTNER_SHARING"]);
    await r.requestPartnerLink("W-2", "M-2", [], doctor);
    await r.respondPartnerLink("M-2", true, ["HORMONES_SEMEN"], doctor);
    const loader = vi.fn(async () => hisSemen);
    const out = await runEvaluation({ repo: r, patientId: "W-2", lang: "en", partnerEmr: { load: loader, actor: doctor } });
    expect(loader).toHaveBeenCalledWith("M-2");
    // Audited on both records: time, clinician, which chart, partner MRN, shared categories read.
    const [hers] = await r.getActivity("W-2");
    const [his] = await r.getActivity("M-2");
    expect(hers).toMatchObject({ action: "PARTNER_DATA_READ", by: doctor, at: "2026-11-07T10:00:00.000Z" });
    expect(hers.detail).toBe("Linked partner M-2's EMR history read in this chart; shared categories read: HORMONES_SEMEN (loaded)");
    expect(his.detail).toBe("EMR history read from the chart of linked partner W-2; shared categories read: HORMONES_SEMEN (loaded)");
    if (out.status !== "READY") throw new Error("not ready");
    expect(out.result.partnerSteps.map((f) => f.id)).toEqual(["R23", "R22"]);
    await r.setPartnerSharing("M-2", [], doctor);
    const none = await runEvaluation({ repo: r, patientId: "W-2", lang: "en", partnerEmr: { load: loader, actor: doctor } });
    expect(loader).toHaveBeenCalledTimes(1);
    expect(none.status === "READY" && none.result.partnerSteps).toEqual([]);
  });

  it("audits a failed or empty load too", async () => {
    const r = repo();
    await r.createRecord("W-3", { sex: "female", language: "en" }, doctor, [...DEFAULT_PERMITTED, "PARTNER_SHARING"]);
    await r.createRecord("M-3", { sex: "male", language: "en" }, doctor, [...DEFAULT_PERMITTED, "PARTNER_SHARING"]);
    await r.requestPartnerLink("W-3", "M-3", [], doctor);
    await r.respondPartnerLink("M-3", true, ["PROFILE", "METABOLIC", "CYCLES"], doctor);
    await runEvaluation({ repo: r, patientId: "W-3", lang: "en", partnerEmr: { load: async () => { throw new Error("offline"); }, actor: doctor } });
    expect((await r.getActivity("W-3"))[0].detail).toBe("Linked partner M-3's EMR history read in this chart; shared categories read: PROFILE, METABOLIC (load failed)");
  });

  it("is never loaded for demo partners (no API call in demo mode)", async () => {
    const loader = vi.fn(async () => null);
    await runEvaluation({ repo: repo(), patientId: "DEMO-1", lang: "en", partnerEmr: { load: loader, actor: doctor } });
    expect(loader).not.toHaveBeenCalled();
  });
});

describe("referral summary", () => {
  it("records a ServiceRequest with its created time, and completion", async () => {
    const r = await couple();
    const { referral } = await r.createReferral("W-1", "P5", ["R07"], doctor);
    expect(referral).toMatchObject({ resourceType: "ServiceRequest", status: "active", intent: "proposal", pathway: "P5", authoredOn: "2026-11-07T10:00:00.000Z" });
    const rec = await r.completeReferral("W-1", referral.id, doctor);
    expect(rec.serviceRequests[0]).toMatchObject({ status: "completed", completedOn: "2026-11-07T10:00:00.000Z" });
    expect((await r.getActivity("W-1")).map((a) => a.action).slice(0, 2)).toEqual(["REFERRAL_COMPLETED", "REFERRAL_CREATED"]);
  });

  it("needs clinician-sharing consent", async () => {
    const r = await couple();
    await r.setConsent("W-1", "CLINICIAN_SHARING", false, "x", doctor);
    await expect(r.createReferral("W-1", "P5", ["R07"], doctor)).rejects.toThrow(/Clinician sharing/);
  });
});
