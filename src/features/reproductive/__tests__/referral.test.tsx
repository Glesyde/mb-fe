// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("../../../api/client", () => ({ default: http }));

import { ReferralSummary } from "../components/ReferralSummary";
import { createDemoRepository } from "../data/demoRepository";
import type { MappedTrajectory } from "../data/trajectoryMapper";
import { defaultSpecialty, referralReason } from "../services/referral";
import { runEvaluation } from "../services/reproductive.service";
import { trajectoryApi } from "../services/trajectory.service";

afterEach(cleanup);
const clinician = { id: "1", name: "Test Clinician" };

async function context() {
  const repo = createDemoRepository({ storage: null, now: () => "2026-11-07T10:00:00.000Z", today: "2026-11-01" });
  // DEMO-6: woman, 38, trying for 6 months (P5 specialist referral).
  const out = await runEvaluation({ repo, patientId: "DEMO-6", lang: "en" });
  if (out.status !== "READY" || !out.brief) throw new Error("not ready");
  return { repo, out, ctx: { record: out.record, result: out.result, brief: out.brief, summary: out.explanation.text, subject: out.input.subject } };
}

describe("referral text", () => {
  it("suggests a specialty per pathway, by sex for P5", () => {
    expect(defaultSpecialty("P5", "male")).toBe("Andrology & Reproductive Endocrinology Specialist");
    expect(defaultSpecialty("P5", "female")).toBe("Reproductive Medicine Specialist");
    expect(defaultSpecialty("P4", null)).toBe("Fertility Preservation Specialist");
  });

  it("builds the reason from the pathway's rules, each with its citation and rule id", async () => {
    const { out } = await context();
    const step = out.result.nextSteps.find((s) => s.pathway === "P5")!;
    const reason = referralReason(step);
    expect(reason.startsWith("Specialist referral: ")).toBe(true);
    for (const i of step.items) expect(reason).toContain(`; ${i.ruleId})`);
    expect(reason).toMatch(/NICE NG257/);
  });
});

describe("referral call (POST /clinical/trajectory-referral)", () => {
  beforeEach(() => http.post.mockReset());

  it("sends the MRN, the logged-in doctor, the specialty and the reason", async () => {
    http.post.mockResolvedValue({ data: { status: "success" } });
    await trajectoryApi.createReferral("TEST-0001", clinician, " Reproductive Medicine Specialist ", " Reason. ");
    expect(http.post).toHaveBeenCalledWith("/clinical/trajectory-referral", {
      patient_id: "TEST-0001",
      doctor_name: "Test Clinician",
      target_specialty: "Reproductive Medicine Specialist",
      clinical_reason: "Reason.",
    });
  });

  it("refuses an empty specialty or reason without calling the HIS", async () => {
    await expect(trajectoryApi.createReferral("TEST-0001", clinician, " ", "x")).rejects.toThrow(/specialty/);
    await expect(trajectoryApi.createReferral("TEST-0001", clinician, "x", " ")).rejects.toThrow(/reason/);
    expect(http.post).not.toHaveBeenCalled();
  });
});

describe("Referral summary dialog with the HIS", () => {
  const his = {
    referrals: [{ id: "35", doctor: "Test Doctor", specialty: "Andrology & Reproductive Endocrinology Specialist", createdAt: "2026-11-12 23:01:21", reason: "Earlier reason", status: "active" }],
  } as unknown as MappedTrajectory;

  it("pre-fills specialty and reason, lets the clinician edit them, then sends and keeps a local summary", async () => {
    const { repo, ctx } = await context();
    const api = { load: vi.fn(), confirmConsent: vi.fn(), setConsent: vi.fn(), orderDiagnostics: vi.fn(), createReferral: vi.fn(async () => {}) };
    const onChanged = vi.fn();
    render(<ReferralSummary repo={repo} ctx={ctx} today="2026-11-01" actor={clinician} his={{ api, data: his }} onChanged={onChanged} onClose={() => {}} />);

    expect(screen.getByText("Referrals in the HIS")).toBeTruthy();
    expect(screen.getByText("Earlier reason")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Pathway"), { target: { value: "P5" } });
    const specialty = screen.getByLabelText("Refer to (specialty)") as HTMLInputElement;
    const reason = screen.getByLabelText("Clinical reason") as HTMLTextAreaElement;
    await waitFor(() => expect(specialty.value).toBe("Reproductive Medicine Specialist"));
    expect(reason.value.startsWith("Specialist referral: ")).toBe(true);

    fireEvent.change(reason, { target: { value: "Edited by the clinician." } });
    fireEvent.click(screen.getByRole("button", { name: "Send referral to the HIS" }));
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith("Referral sent to the HIS"));
    expect(api.createReferral).toHaveBeenCalledWith("DEMO-6", clinician, "Reproductive Medicine Specialist", "Edited by the clinician.");
    expect((await repo.getRecord("DEMO-6"))?.serviceRequests).toHaveLength(1);
  });

  it("keeps nothing locally when the HIS refuses the referral", async () => {
    const { repo, ctx } = await context();
    const api = { load: vi.fn(), confirmConsent: vi.fn(), setConsent: vi.fn(), orderDiagnostics: vi.fn(), createReferral: vi.fn(async () => Promise.reject(new Error("The referral was not saved: down"))) };
    render(<ReferralSummary repo={repo} ctx={ctx} today="2026-11-01" actor={clinician} his={{ api, data: his }} onChanged={() => {}} onClose={() => {}} />);
    await waitFor(() => expect((screen.getByLabelText("Clinical reason") as HTMLTextAreaElement).value).not.toBe(""));
    fireEvent.click(screen.getByRole("button", { name: "Send referral to the HIS" }));
    expect(await screen.findByText("The referral was not saved: down")).toBeTruthy();
    expect((await repo.getRecord("DEMO-6"))?.serviceRequests).toHaveLength(0);
  });
});
