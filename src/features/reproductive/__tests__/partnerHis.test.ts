import { beforeEach, describe, expect, it, vi } from "vitest";

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("../../../api/client", () => ({ default: http }));

import { hisRepo } from "../components/ReproductiveTab";
import { createDemoRepository } from "../data/demoRepository";
import { mapTrajectory, type MappedTrajectory } from "../data/trajectoryMapper";
import { runEvaluation } from "../services/reproductive.service";
import { trajectoryApi, type TrajectoryApi } from "../services/trajectory.service";

const TODAY = "2026-11-15";
const clinician = { id: "1", name: "Test Clinician" };
const ALL = ["PROFILE", "CYCLES", "METABOLIC", "HORMONES_SEMEN", "HISTORY", "LIFESTYLE", "PLANS", "CLINICIAN_SHARING", "PARTNER_SHARING"];

// Anonymised shapes of GET /clinical/trajectory for a linked couple.
const woman = (partner: unknown) => ({
  status: "success",
  data: {
    patient_mrn: "TEST-W",
    patient_gender: "Female",
    patient_age: 33,
    consent_confirmed: true,
    consented_categories: ALL,
    historical_trends: {},
    partner_link: partner,
  },
});
const man = (consented = ALL) => ({
  status: "success",
  data: {
    patient_mrn: "TEST-M",
    patient_gender: "Male",
    patient_age: 35,
    consent_confirmed: true,
    consented_categories: consented,
    historical_trends: {
      "Sperm Conc": {
        parameter_name: "Sperm Concentration",
        code: "6800-1",
        unit: "million/mL",
        series: [{ entry_id: 1, order_id: 9, value: 9, unit: "million/mL", workflow_status: "RELEASED", timestamps: { effective_at: "2026-10-01 10:00:00" } }],
      },
    },
    lifestyle: { current: { heat_exposure: true, smoking_status: "never", updated_at: "2026-10-01" } },
    red_flags: { open: [{ id: 3, rule_id: "R36", created_at: "2026-10-02 10:00:00" }] },
  },
});
const linked = { status: "LINKED", partnerId: "TEST-M", shared_by_you: ["PROFILE"], shared_by_them: ["PROFILE", "HORMONES_SEMEN", "LIFESTYLE"] };

describe("partner link from the HIS", () => {
  it("maps the status words and keeps 'shared by them' only once linked", () => {
    const m = (p: unknown) => mapTrajectory(woman(p), TODAY).partner;
    expect(m({ status: "NONE", partnerId: null })).toBeNull();
    expect(m({ status: "REQUESTED", partnerId: "TEST-M", shared_by_you: ["PROFILE"], shared_by_them: ["CYCLES"] })).toEqual({
      status: "PENDING_THEM",
      partnerId: "TEST-M",
      youShare: ["PROFILE"],
      theyShare: [],
    });
    expect(m(linked)).toMatchObject({ status: "LINKED", theyShare: ["PROFILE", "HORMONES_SEMEN", "LIFESTYLE"] });
  });

  const repo = () => createDemoRepository({ storage: null, now: () => "2026-11-15T09:00:00.000Z", today: TODAY });

  it("when linked, loads the partner and uses only what they share; never their red flags", async () => {
    const loadPartner = vi.fn(async () => man());
    const out = await runEvaluation({ repo: repo(), patientId: "TEST-W", lang: "en", backend: { load: async () => woman(linked), loadPartner } });
    if (out.status !== "READY") throw new Error("not ready");
    expect(loadPartner).toHaveBeenCalledWith("TEST-M");
    expect(out.partner).toMatchObject({ status: "LINKED", partnerId: "TEST-M", partnerSex: "male" });
    expect(out.result.halted).toBe(false);
    // Her own V4 card is the partner's semen result; heat exposure gives a "For your partner" step.
    expect(out.result.partnerSteps.map((s) => s.id)).toContain("R20");
  });

  it("shows nothing from the partner when their partner-sharing consent is off", async () => {
    const out = await runEvaluation({
      repo: repo(),
      patientId: "TEST-W",
      lang: "en",
      backend: { load: async () => woman(linked), loadPartner: async () => man(ALL.filter((c) => c !== "PARTNER_SHARING")) },
    });
    if (out.status !== "READY") throw new Error("not ready");
    expect(out.partner?.theyShare).toEqual([]);
    expect(out.result.partnerSteps).toEqual([]);
  });

  it("does not load the partner while the request is pending, and survives a failed load", async () => {
    const loadPartner = vi.fn(async () => man());
    await runEvaluation({ repo: repo(), patientId: "TEST-W", lang: "en", backend: { load: async () => woman({ ...linked, status: "PENDING_THEM" }), loadPartner } });
    expect(loadPartner).not.toHaveBeenCalled();
    const out = await runEvaluation({ repo: repo(), patientId: "TEST-W", lang: "en", backend: { load: async () => woman(linked), loadPartner: async () => Promise.reject(new Error("down")) } });
    expect(out.status === "READY" && out.partner?.status).toBe("LINKED");
  });
});

describe("partner call (POST /clinical/trajectory-partner)", () => {
  beforeEach(() => http.post.mockReset());

  it("REQUEST / ACCEPT / CANCEL bodies", async () => {
    http.post.mockResolvedValue({ data: { status: "success" } });
    await trajectoryApi.partner("TEST-W", clinician, "REQUEST", { partnerMrn: " TEST-M ", shared: ["PROFILE", "CYCLES", "PROFILE"] });
    await trajectoryApi.partner("TEST-M", clinician, "ACCEPT", { shared: ["PROFILE", "HORMONES_SEMEN"] });
    await trajectoryApi.partner("TEST-W", clinician, "CANCEL");
    const who = { user_id: 1, user_name: "Test Clinician" };
    expect(http.post.mock.calls).toEqual([
      ["/clinical/trajectory-partner", { patient_id: "TEST-W", action: "REQUEST", ...who, partner_mrn: "TEST-M", shared_categories: ["PROFILE", "CYCLES"] }],
      ["/clinical/trajectory-partner", { patient_id: "TEST-M", action: "ACCEPT", ...who, shared_categories: ["PROFILE", "HORMONES_SEMEN"] }],
      ["/clinical/trajectory-partner", { patient_id: "TEST-W", action: "CANCEL", ...who }],
    ]);
  });

  it("refuses a request without an MRN or to the same patient", async () => {
    await expect(trajectoryApi.partner("TEST-W", clinician, "REQUEST", { partnerMrn: " " })).rejects.toThrow(/MRN/);
    await expect(trajectoryApi.partner("TEST-W", clinician, "REQUEST", { partnerMrn: "TEST-W" })).rejects.toThrow(/themselves/);
    expect(http.post).not.toHaveBeenCalled();
  });
});

describe("partner dialog actions when connected", () => {
  it("decline cancels, and changing sharing after linking explains the limit", async () => {
    const repo = createDemoRepository({ storage: null, now: () => "2026-11-15T09:00:00.000Z", today: TODAY });
    const record = await repo.createRecord("TEST-M", { sex: "male", language: "en" }, clinician, ["PROFILE"]);
    const backend = { partner: vi.fn(async () => {}), setConsent: vi.fn(async () => {}) } as unknown as TrajectoryApi;
    const r = hisRepo(repo, backend, { raw: { lifestyle: {}, historyItems: {}, plans: {} } } as unknown as MappedTrajectory, record);
    await r.respondPartnerLink("TEST-M", false, [], clinician);
    expect(backend.partner).toHaveBeenCalledWith("TEST-M", clinician, "CANCEL", {});
    await r.setConsent("TEST-M", "PARTNER_SHARING", true, "Agreed", clinician);
    expect(backend.setConsent).toHaveBeenCalledWith("TEST-M", clinician, "PARTNER_SHARING", true, "Agreed");
    await expect(r.setPartnerSharing("TEST-M", ["PROFILE"], clinician)).rejects.toThrow(/End the link/);
  });
});
