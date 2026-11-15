import { beforeEach, describe, expect, it, vi } from "vitest";

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("../../../api/client", () => ({ default: http }));

import { historyBody, lifestyleBody, plansBody } from "../services/hisSections";
import { trajectoryApi } from "../services/trajectory.service";

const clinician = { id: "1", name: "Test Clinician" };

describe("section bodies", () => {
  it("lifestyle: keeps fields the form does not edit, drops fields the HIS fills in itself", () => {
    const raw = { smoking_status: "current", sticks_per_day: 5, smoking_stopped_at: null, heat_exposure_detail: "Kitchen", smoker: true, updated_at: "x", updated_by: {} };
    expect(lifestyleBody(raw, { smoking: "former", heatExposure: true, occupation: "Chef" })).toEqual({
      smoking_status: "former",
      sticks_per_day: 5,
      smoking_stopped_at: null,
      heat_exposure_detail: "Kitchen",
      passive_smoke: false,
      alcohol_units_per_week: null,
      heat_exposure: true,
      occupation: "Chef",
      hazardous_occupation: false,
    });
  });

  it("history: sends every form item as true/false and leaves the HIS-only items as they were", () => {
    const body = historyBody({ fibroidsOrUterineAnomaly: true, pcos: true }, { newCancerDiagnosis: true });
    expect(body).toMatchObject({ fibroidsOrUterineAnomaly: true, newCancerDiagnosis: true, pcos: false, endometriosis: false });
    expect(Object.keys(body)).toHaveLength(14);
  });

  it("plans: maps answers, questions and rubella to the HIS names", () => {
    const body = plansBody(
      { on_hormonal_contraception: true, trying_months: 6, updated_at: "x" },
      { tryingSince: "2026-05-01", planningPregnancy: true, thyroidSymptoms: true, rubellaStatus: "susceptible", questions: ["CAFFEINE", "OVULATION_CHECK"] },
    );
    expect(body).toEqual({
      on_hormonal_contraception: true,
      trying_since: "2026-05-01",
      rubella_status: "NON_IMMUNE",
      planning_pregnancy: true,
      concerned_about_fertility: false,
      regular_intercourse: false,
      using_contraception: false,
      in_assisted_conception: false,
      considering_egg_freezing: false,
      egg_freezing_for_age: false,
      periods_absent: false,
      thyroid_symptoms: true,
      asked_about_caffeine: true,
      asked_for_dna_fragmentation: false,
      wants_ovulation_check: true,
      asked_about_egg_freezing: false,
    });
    expect(plansBody({}, {}).rubella_status).toBe("NOT_RECORDED");
    expect(plansBody({}, { rubellaStatus: "immune" }).rubella_status).toBe("IMMUNE");
  });
});

describe("section saves (POST, creates or updates)", () => {
  beforeEach(() => http.post.mockReset());

  it("lifestyle and plans: fields at the top level, with patient and clinician", async () => {
    http.post.mockResolvedValue({ data: { status: "success" } });
    await trajectoryApi.saveSection("TEST-0001", "lifestyle", clinician, { smoking_status: "never", patient_id: "spoofed" });
    expect(http.post).toHaveBeenCalledWith("/clinical/trajectory-lifestyle", { smoking_status: "never", patient_id: "TEST-0001", user_id: 1, user_name: "Test Clinician" });
    await trajectoryApi.saveSection("TEST-0001", "plans", clinician, { planning_pregnancy: true });
    expect(http.post).toHaveBeenLastCalledWith("/clinical/trajectory-plans", { planning_pregnancy: true, patient_id: "TEST-0001", user_id: 1, user_name: "Test Clinician" });
  });

  it("history: items go under `items`", async () => {
    http.post.mockResolvedValue({ data: { status: "success" } });
    await trajectoryApi.saveSection("TEST-0001", "history", clinician, { pcos: true });
    expect(http.post).toHaveBeenCalledWith("/clinical/trajectory-history", { patient_id: "TEST-0001", user_id: 1, user_name: "Test Clinician", items: { pcos: true } });
  });

  it("reports a failure with the HIS message", async () => {
    http.post.mockResolvedValue({ data: { status: "error", message: "Invalid smoking status" } });
    await expect(trajectoryApi.saveSection("TEST-0001", "lifestyle", clinician, {})).rejects.toThrow("Lifestyle was not saved: Invalid smoking status");
  });
});
