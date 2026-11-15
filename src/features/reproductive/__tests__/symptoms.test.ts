import { beforeEach, describe, expect, it, vi } from "vitest";

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("../../../api/client", () => ({ default: http }));

import { hisRepo } from "../components/ReproductiveTab";
import { createDemoRepository } from "../data/demoRepository";
import type { MappedTrajectory } from "../data/trajectoryMapper";
import { trajectoryApi, type TrajectoryApi } from "../services/trajectory.service";

const clinician = { id: "1", name: "Test Clinician" };
const his = { raw: { lifestyle: {}, historyItems: {}, plans: {} } } as unknown as MappedTrajectory;

async function setup(submit: TrajectoryApi["submitSymptoms"]) {
  const repo = createDemoRepository({ storage: null, now: () => "2026-11-15T09:00:00.000Z", today: "2026-11-15" });
  const record = await repo.createRecord("TEST-0001", { sex: "female", language: "en" }, clinician, ["PROFILE"]);
  const backend = { submitSymptoms: vi.fn(submit) } as unknown as TrajectoryApi;
  return { repo, backend, forms: hisRepo(repo, backend, his, record) };
}

describe("symptoms call (POST /clinical/trajectory-symptoms)", () => {
  beforeEach(() => http.post.mockReset());

  it("sends the text and every tick box as true/false", async () => {
    http.post.mockResolvedValue({ data: { status: "success" } });
    await trajectoryApi.submitSymptoms("TEST-0001", clinician, { freeText: "pain", severeOneSidedPelvicPain: true, missedPeriod: true });
    expect(http.post).toHaveBeenCalledWith("/clinical/trajectory-symptoms", {
      patient_id: "TEST-0001",
      user_id: 1,
      user_name: "Test Clinician",
      freeText: "pain",
      severeOneSidedPelvicPain: true,
      missedPeriod: true,
      positivePregnancyTest: false,
      fainting: false,
      bleedingAfterSex: false,
      bleedingBetweenPeriods: false,
    });
  });
});

describe("symptoms form when connected to the HIS", () => {
  it("sends to the HIS, keeps nothing in the browser, and still shows the tab's own check", async () => {
    const { repo, backend, forms } = await setup(async () => {});
    const out = await forms.submitSymptoms("TEST-0001", { freeText: "Can you give me a fertility score?", bleedingAfterSex: true }, clinician);
    expect(backend.submitSymptoms).toHaveBeenCalledTimes(1);
    expect(out.check.blocked).toContain("FERTILITY_SCORE");
    expect(out.warning).toBeUndefined();
    expect((await repo.getRecord("TEST-0001"))?.redFlags).toEqual([]);
  });

  it("keeps the red flag in the browser when the HIS cannot be reached, and says so", async () => {
    const { repo, forms } = await setup(async () => Promise.reject(new Error("The symptom check was not saved: Network Error")));
    const out = await forms.submitSymptoms("TEST-0001", { bleedingAfterSex: true }, clinician);
    expect(out.warning).toMatch(/kept in this browser instead/);
    const flags = (await repo.getRecord("TEST-0001"))?.redFlags ?? [];
    expect(flags.map((f) => [f.ruleId, f.status])).toEqual([["R36", "OPEN"]]);
  });
});
