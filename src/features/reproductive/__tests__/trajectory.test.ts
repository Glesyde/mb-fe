import { beforeEach, describe, expect, it, vi } from "vitest";

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("../../../api/client", () => ({ default: http }));
import { createDemoRepository, type StorageLike } from "../data/demoRepository";
import { mapTrajectory } from "../data/trajectoryMapper";
import { runEvaluation } from "../services/reproductive.service";
import { CONSENT_STEP_REASON, trajectoryApi } from "../services/trajectory.service";

// Shape of GET /clinical/trajectory, anonymised and trimmed from the sample the HIS team shared
// (2026-11-13). Values that the HIS has since fixed (percentages over 100, FSH in IU/mL) are kept
// here on purpose, to check that the tab skips them.
const point = (entry: number, order: number, value: number, unit: string, at: string, status = "RELEASED") => ({
  entry_id: entry,
  order_id: order,
  value,
  unit,
  workflow_status: status,
  timestamps: { ordered_at: at, effective_at: at },
});
const trend = (parameter_name: string, short_name: string, code: string, unit: string, series: unknown[]) => ({
  parameter_name,
  short_name,
  code,
  unit,
  series,
});

const fixture = (over: Record<string, unknown> = {}) => ({
  status: "success",
  data: {
    emergency_halt: false,
    patient_id: "TEST-0001",
    patient_mrn: "TEST-0001",
    patient_gender: "Male",
    patient_age: 48,
    consent_confirmed: true,
    consented_categories: ["PROFILE", "METABOLIC", "HORMONES_SEMEN", "CLINICIAN_SHARING", "NOT_A_CATEGORY"],
    withdrawn_categories: ["CYCLES"],
    consent_details: {
      dateTime: "2026-11-13T00:04:27+00:00",
      provision: [
        { type: "permit", category: "METABOLIC", reason: "Explained to patient", updatedAt: "2026-11-13T00:03:54+00:00", updatedBy: { id: "1", name: "Test Clinician" } },
      ],
      recorded_by: { id: 1, name: "Test Clinician" },
    },
    consent_activity_log: [
      { id: "2", at: "2026-11-12T22:33:17+00:00", by: { id: "1", name: "Test Clinician" }, action: "REPRO_CONSENT_CATEGORY_WITHDRAWN", category: "METABOLIC", granted: false, reason: "Patient asked" },
      { id: "1", at: "2026-11-12T22:27:45+00:00", by: { id: "1", name: "Test Clinician" }, action: "REPRO_CONSENT_CONFIRMED", category: "ALL", granted: true, reason: "Explained", consented_categories: ["PROFILE", "METABOLIC"] },
    ],
    historical_trends: {
      HBA1C: trend("HbA1c", "HBA1C", "CHEM-HBA1C", "%", [point(1, 10, 6.4, "%", "2026-11-12 17:00:54")]),
      TSH: trend("TSH (Thyroid Stimulating Hormone)", "TSH", "CHEM-THY-TSH", "mIU/L", [point(2, 11, 5.8, "mIU/L", "2026-11-12 17:00:54")]),
      FSH: trend("FSH (Follicle Stimulating Hormone)", "FSH", "CHEM-GON-FSH", "IU/mL", [point(3, 12, 6.5, "IU/mL", "2026-11-12 17:00:54")]),
      FBG: trend("Fasting Blood Glucose", "FBG", "CHEM-FBG", "mmol/L", [
        point(4, 13, 4.5, "mmol/L", "2026-11-12 23:24:03"),
        point(5, 14, 5, "mmol/L", "2026-11-12 23:29:04", "COLLECTED"),
      ]),
      "Rubella IgG": trend("Rubella IgG", "Rubella IgG", "8014-3", "IU/mL", [point(6, 15, 4.5, "IU/mL", "2026-11-12 17:00:54")]),
      "Sperm Conc": trend("Sperm Concentration", "Sperm Conc", "6800-1", "million/mL", [
        point(7, 20, 16.2, "million/mL", "2026-11-12 23:26:45"),
        point(8, 21, 30, "million/mL", "2026-11-12 23:29:08"),
      ]),
      Volume: trend("Semen Volume", "Volume", "3155-9", "mL", [point(9, 20, 1.3, "mL", "2026-11-12 23:26:45")]),
      "Sperm Motility": trend("Sperm Motility", "Sperm Motility", "13942-8", "%", [
        point(10, 20, 105, "%", "2026-11-12 23:26:45"),
        point(11, 21, 45, "%", "2026-11-12 23:29:08"),
      ]),
    },
    fhir_bundle_preview: {
      entry: [
        { resourceType: "Patient", id: "TEST-0001", gender: "male", birthDate: "1978-01-20" },
        { resourceType: "Observation", code: { coding: [{ code: "39156-5", display: "BMI" }] }, valueQuantity: { value: 23.3, unit: "kg/m2" } },
      ],
    },
    ...over,
  },
});

const TODAY = "2026-11-14";

describe("trajectory mapper (GET /clinical/trajectory)", () => {
  const m = mapTrajectory(fixture(), TODAY);

  it("reads sex and age from the FHIR Patient (birth date wins over patient_age)", () => {
    expect(m.profile).toMatchObject({ mrn: "TEST-0001", sex: "male", ageYears: 48, ageSource: "date_of_birth" });
  });

  it("maps released labs it uses, with the result date", () => {
    const keys = m.observations.map((o) => o.code.key).sort();
    expect(keys).toEqual(["FASTING_GLUCOSE", "HBA1C", "SEMEN_ANALYSIS", "SEMEN_ANALYSIS", "TSH"]);
    expect(m.observations.find((o) => o.code.key === "HBA1C")).toMatchObject({ valueQuantity: { value: 6.4, unit: "%" }, effectiveDateTime: "2026-11-12T17:00:54", source: "HIS" });
  });

  it("groups semen parameters back into one analysis per lab order", () => {
    const semen = m.observations.filter((o) => o.code.key === "SEMEN_ANALYSIS");
    const byOrder = Object.fromEntries(semen.map((o) => [o.id, Object.fromEntries(o.component!.map((c) => [c.code.key, c.valueQuantity.value]))]));
    expect(byOrder).toEqual({
      "HIS-semen-20": { SPERM_CONCENTRATION: 16.2, SEMEN_VOLUME: 1.3 },
      "HIS-semen-21": { SPERM_CONCENTRATION: 30, TOTAL_MOTILITY: 45 },
    });
  });

  it("skips impossible percentages, unknown FSH units, unreleased results and an undated BMI, and says why", () => {
    const reasons = m.skipped.map((s) => s.reason);
    expect(reasons).toContain("a percentage above 100");
    expect(reasons).toContain('unit "IU/mL" not recognised');
    expect(reasons).toContain("status COLLECTED");
    expect(m.skipped).toContainEqual({ name: "BMI 23.3", reason: "no date" });
    expect(m.observations.some((o) => o.code.key === "FSH" || o.code.key === "BMI")).toBe(false);
  });

  it("ignores labs this tool does not use (Rubella IgG)", () => {
    expect(m.matched.some((x) => /rubella/i.test(x.parameter))).toBe(false);
    expect(m.skipped.some((x) => /rubella/i.test(x.name))).toBe(false);
  });

  it("takes consent from the consented list; unknown categories are dropped and PROFILE is always on", () => {
    expect(m.consent.confirmed).toBe(true);
    expect(m.consent.consented).toEqual(["PROFILE", "METABOLIC", "HORMONES_SEMEN", "CLINICIAN_SHARING"]);
    const type = (c: string) => m.consent.resource.provision.find((p) => p.category === c)?.type;
    expect([type("PROFILE"), type("METABOLIC"), type("CYCLES"), type("WEARABLES")]).toEqual(["permit", "permit", "deny", "deny"]);
    expect(m.consent.resource.provision.find((p) => p.category === "METABOLIC")).toMatchObject({ reason: "Explained to patient", updatedBy: { id: "1", name: "Test Clinician" } });
  });

  it("turns the HIS consent log into the tab's activity entries", () => {
    expect(m.activity.map((a) => [a.action, a.category, a.detail])).toEqual([
      ["CONSENT_CHANGED", "METABOLIC", "Withdrawn: Patient asked"],
      ["CONSENT_CAPTURED", undefined, "Consent confirmed. Shared: PROFILE, METABOLIC. Explained"],
    ]);
  });

  it("falls back to patient_age and patient_gender when the FHIR Patient is missing", () => {
    const x = mapTrajectory(fixture({ fhir_bundle_preview: undefined }), TODAY);
    expect(x.profile).toMatchObject({ sex: "male", ageYears: 48, ageSource: "display_age" });
  });

  it("rejects a response that is not a success", () => {
    expect(() => mapTrajectory({ status: "error", message: "x" }, TODAY)).toThrow(/did not return/);
  });
});

describe("evaluation with the HIS trajectory", () => {
  const memory = (): StorageLike => {
    const d = new Map<string, string>();
    return { getItem: (k) => d.get(k) ?? null, setItem: (k, v) => void d.set(k, v), removeItem: (k) => void d.delete(k) };
  };
  const repo = () => createDemoRepository({ storage: memory(), now: () => "2026-11-14T09:00:00.000Z", today: TODAY });

  it("uses HIS consent and labs, skipping the consent step when the HIS says consent is confirmed", async () => {
    const r = repo();
    const load = vi.fn(async () => fixture());
    const out = await runEvaluation({ repo: r, patientId: "TEST-0001", lang: "en", backend: { load } });
    expect(load).toHaveBeenCalledTimes(1);
    expect(out.status).toBe("READY");
    if (out.status !== "READY") return;
    expect(out.his).not.toBeNull();
    expect(out.input.subject).toEqual({ sex: "male", ageYears: 48 });
    expect(out.input.consent.CYCLES).toBe(false);
    expect(out.input.consent.METABOLIC).toBe(true);
    expect(out.input.observations.some((o) => o.code.key === "HBA1C")).toBe(true);
    // A local record now exists for the entered data that has no HIS endpoint yet.
    expect((await r.getRecord("TEST-0001"))?.consentMode).toBe("CLINICIAN_CONFIRMED");
  });

  it("shows the consent step when the HIS has no confirmed consent, even if this browser has a record", async () => {
    const r = repo();
    await r.createRecord("TEST-0001", { sex: "male", language: "en" }, { id: "1", name: "Test Clinician" }, ["PROFILE", "METABOLIC"]);
    const out = await runEvaluation({ repo: r, patientId: "TEST-0001", lang: "en", backend: { load: async () => fixture({ consent_confirmed: false }) } });
    expect(out.status).toBe("CONSENT_REQUIRED");
  });

  it("shows the consent step when the HIS has no confirmed consent", async () => {
    const out = await runEvaluation({ repo: repo(), patientId: "TEST-0001", lang: "en", backend: { load: async () => fixture({ consent_confirmed: false }) } });
    expect(out.status).toBe("CONSENT_REQUIRED");
  });

  it("never calls the HIS for a demo scenario loaded onto the MRN", async () => {
    const r = repo();
    await r.loadScenario("TEST-0001", "DEMO-1", { id: "1", name: "Test Clinician" });
    const load = vi.fn(async () => fixture());
    const out = await runEvaluation({ repo: r, patientId: "TEST-0001", lang: "en", backend: { load } });
    expect(load).not.toHaveBeenCalled();
    expect(out.status === "READY" && out.his).toBeNull();
  });

  it("passes a failed HIS request up to the tab (no silent fallback)", async () => {
    await expect(runEvaluation({ repo: repo(), patientId: "TEST-0001", lang: "en", backend: { load: async () => Promise.reject(new Error("Network Error")) } })).rejects.toThrow("Network Error");
  });
});

describe("consent calls (POST /clinical/trajectory-consent)", () => {
  const clinician = { id: "1", name: "Test Clinician" };
  beforeEach(() => {
    http.get.mockReset();
    http.post.mockReset();
  });

  it("loads the trajectory by MRN", async () => {
    http.get.mockResolvedValue({ data: fixture() });
    await trajectoryApi.load("TEST-0001");
    expect(http.get).toHaveBeenCalledWith("/clinical/trajectory", { params: { patient_id: "TEST-0001" } });
  });

  it("consent step: sends the full list, always with PROFILE, and a numeric user id", async () => {
    http.post.mockResolvedValue({ data: { status: "success" } });
    await trajectoryApi.confirmConsent("TEST-0001", clinician, ["METABOLIC", "HORMONES_SEMEN"], CONSENT_STEP_REASON);
    expect(http.post).toHaveBeenCalledWith("/clinical/trajectory-consent", {
      patient_id: "TEST-0001",
      user_id: 1,
      user_name: "Test Clinician",
      reason: CONSENT_STEP_REASON,
      consented_categories: ["PROFILE", "METABOLIC", "HORMONES_SEMEN"],
    });
  });

  it("one category: sends category, granted and the trimmed reason", async () => {
    http.post.mockResolvedValue({ data: { status: "success" } });
    await trajectoryApi.setConsent("TEST-0001", clinician, "METABOLIC", false, "  Patient asked  ");
    expect(http.post).toHaveBeenCalledWith("/clinical/trajectory-consent", {
      patient_id: "TEST-0001",
      user_id: 1,
      user_name: "Test Clinician",
      category: "METABOLIC",
      granted: false,
      reason: "Patient asked",
    });
  });

  it("refuses to withdraw PROFILE or to send without a reason, without calling the HIS", async () => {
    await expect(trajectoryApi.setConsent("TEST-0001", clinician, "PROFILE", false, "x")).rejects.toThrow(/cannot be withdrawn/);
    await expect(trajectoryApi.setConsent("TEST-0001", clinician, "METABOLIC", false, "  ")).rejects.toThrow(/reason/);
    expect(http.post).not.toHaveBeenCalled();
  });

  it("reports a failure with the HIS message, for an HTTP error or a non-success answer", async () => {
    http.post.mockRejectedValueOnce(Object.assign(new Error("Request failed with status code 422"), { response: { data: { message: "Unknown category" } } }));
    await expect(trajectoryApi.setConsent("TEST-0001", clinician, "METABOLIC", true, "ok")).rejects.toThrow("The consent change was not saved: Unknown category");
    http.post.mockResolvedValueOnce({ data: { status: "error", message: "Patient not found" } });
    await expect(trajectoryApi.confirmConsent("TEST-0001", clinician, [], CONSENT_STEP_REASON)).rejects.toThrow("Consent was not saved: Patient not found");
  });
});

// Sections added to GET /clinical/trajectory on 2026-11-15 (anonymised).
const sections = {
  lifestyle: {
    current: { smoking_status: "former", passive_smoke: false, alcohol_units_per_week: 4, heat_exposure: true, occupation: "Chef", hazardous_occupation: false, updated_at: "2026-11-15T06:09:40+00:00" },
  },
  history: { history_completed: true, items: { newCancerDiagnosis: true, pcos: false, fibroidsOrUterineAnomaly: true }, updated_at: "2026-11-15T11:15:19+00:00" },
  plans_and_questions: {
    trying_since: "2026-05-01",
    rubella_status: "NOT_RECORDED",
    planning_pregnancy: true,
    concerned_about_fertility: true,
    thyroid_symptoms: true,
    asked_about_caffeine: true,
    asked_for_dna_fragmentation: true,
    wants_ovulation_check: false,
    updated_at: "2026-11-15T11:17:12+00:00",
  },
  cycle_records: {
    records: [{ start_date: "2026-09-01", length_days: 29 }, { start_date: "bad" }],
    medical_calculation: { predicted_next_period: "2026-12-01", estimated_fertile_window: "x" },
  },
  red_flags: {
    halted: true,
    open: [{ id: 7, rule_id: "R35", created_at: "2026-11-15 11:19:05" }, { id: 8, rule_id: "R99" }],
    log: [{ id: 1, rule_id: "R35", status: "RESOLVED" }],
  },
  consent_activity_log: [
    { id: "9", at: "2026-11-15T11:29:02+00:00", by: { id: "1", name: "Test Clinician" }, action: "REPRO_PARTNER_LINK_REVOKED", category: "REPRO_PARTNER", reason: "Updated in patient chart" },
    { id: "8", at: "2026-11-15T11:21:07+00:00", by: { id: "1", name: "Test Clinician" }, action: "REPRO_RED_FLAG_DISMISSED", category: "REPRO_RED_FLAG", reason: "Updated in patient chart" },
    { id: "7", at: "2026-11-15T11:19:05+00:00", by: { id: "1", name: "Test Clinician" }, action: "REPRO_RED_FLAG_TRIGGERED", category: "REPRO_RED_FLAG", reason: "Symptom freeText discarded per privacy rule" },
    { id: "6", at: "2026-11-15T11:15:19+00:00", by: { id: "1", name: "Test Clinician" }, action: "REPRO_HISTORY_CONFIRMED", category: "REPRO_HISTORY", reason: "Updated in patient chart" },
  ],
};

describe("entered sections from the HIS", () => {
  const m = mapTrajectory(fixture(sections), TODAY);

  it("reads lifestyle, the history items the rules use, and plans (rubella NOT_RECORDED = unknown)", () => {
    expect(m.lifestyle).toEqual({ smoking: "former", passiveSmoke: false, alcoholUnitsPerWeek: 4, heatExposure: true, occupation: "Chef", hazardousOccupation: false });
    expect(m.history).toEqual({ completed: true, items: { newCancerDiagnosis: true, pcos: false }, updatedAt: "2026-11-15T11:15:19+00:00" });
    expect(m.plans).toEqual({
      tryingSince: "2026-05-01",
      planningPregnancy: true,
      concerned: true,
      thyroidSymptoms: true,
      rubellaStatus: "unknown",
      questions: ["CAFFEINE", "DNA_FRAGMENTATION"],
    });
  });

  it("reads cycle records only, never the HIS predictions", () => {
    expect(m.cycles).toEqual([{ startDate: "2026-09-01", lengthDays: 29, source: "ENTERED" }]);
    expect(JSON.stringify(m)).not.toMatch(/predicted|fertile/i);
  });

  it("keeps open R35/R36 red flags with an id the HIS can resolve", () => {
    expect(m.redFlags).toEqual([{ id: "HIS-rf-7", ruleId: "R35", detectedAt: "2026-11-15T11:19:05", source: "STRUCTURED", status: "OPEN", indicators: [] }]);
  });

  it("words partner, red-flag and history events properly instead of as consent changes", () => {
    expect(m.activity.map((a) => [a.action, a.detail])).toEqual([
      ["PARTNER_LINK_ENDED", "Partner link ended"],
      ["RED_FLAG_RESOLVED", "Red flag marked not present"],
      ["RED_FLAG_RAISED", "Red flag raised: Symptom freeText discarded per privacy rule"],
      ["HISTORY_UPDATED", "History updated"],
    ]);
  });

  it("treats missing or never-saved sections as not filled in", () => {
    const x = mapTrajectory(fixture({ lifestyle: { current: { smoking_status: "never" } }, plans_and_questions: { rubella_status: "IMMUNE" } }), TODAY);
    expect([x.lifestyle, x.history, x.plans, x.cycles, x.redFlags]).toEqual([null, null, null, null, null]);
  });

  it("maps the other rubella answers", () => {
    const rubella = (v: string) => mapTrajectory(fixture({ plans_and_questions: { rubella_status: v, updated_at: "2026-11-15" } }), TODAY).plans?.rubellaStatus;
    expect([rubella("IMMUNE"), rubella("NON_IMMUNE"), rubella("susceptible"), rubella("")]).toEqual(["immune", "susceptible", "susceptible", "unknown"]);
  });
});

describe("evaluation with HIS sections", () => {
  const memory = (): StorageLike => {
    const d = new Map<string, string>();
    return { getItem: (k) => d.get(k) ?? null, setItem: (k, v) => void d.set(k, v), removeItem: (k) => void d.delete(k) };
  };
  const repo = () => createDemoRepository({ storage: memory(), now: () => "2026-11-15T09:00:00.000Z", today: TODAY });
  const doctor = { id: "1", name: "Test Clinician" };

  it("uses the HIS lifestyle, history and plans, and stops at the emergency panel for an open HIS red flag", async () => {
    const out = await runEvaluation({ repo: repo(), patientId: "TEST-0001", lang: "en", backend: { load: async () => fixture(sections) } });
    if (out.status !== "READY") throw new Error("not ready");
    expect(out.input.lifestyle).toMatchObject({ heatExposure: true });
    expect(out.input.history).toEqual({ newCancerDiagnosis: true });
    expect(out.input.reproductive).toMatchObject({ planningPregnancy: true, thyroidSymptoms: true });
    expect(out.input.openRedFlags).toEqual(["R35"]);
    expect(out.result.halted).toBe(true);
  });

  it("keeps browser data for a section the HIS has not filled in, and never hides a browser red flag", async () => {
    const r = repo();
    await r.createRecord("TEST-0001", { sex: "male", language: "en" }, doctor, ["PROFILE", "LIFESTYLE", "HISTORY", "PLANS"]);
    await r.setLifestyle("TEST-0001", { smoking: "current" }, doctor);
    await r.submitSymptoms("TEST-0001", { bleedingAfterSex: true }, doctor);
    const out = await runEvaluation({ repo: r, patientId: "TEST-0001", lang: "en", backend: { load: async () => fixture({ red_flags: { open: [] } }) } });
    if (out.status !== "READY") throw new Error("not ready");
    expect(out.input.lifestyle).toEqual({ smoking: "current" });
    expect(out.input.openRedFlags?.length).toBeGreaterThan(0);
  });
});

describe("red flag call (POST /clinical/trajectory-red-flag-resolve)", () => {
  beforeEach(() => http.post.mockReset());
  it("sends the HIS red flag id, the decision, the clinician and a note", async () => {
    http.post.mockResolvedValue({ data: { status: "success" } });
    await trajectoryApi.resolveRedFlag("TEST-0001", 7, "DISMISSED", { id: "1", name: "Test Clinician" }, "Not present");
    expect(http.post).toHaveBeenCalledWith("/clinical/trajectory-red-flag-resolve", {
      patient_id: "TEST-0001",
      red_flag_id: 7,
      resolution: "DISMISSED",
      user_id: 1,
      user_name: "Test Clinician",
      note: "Not present",
    });
  });
});
