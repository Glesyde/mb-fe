// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("../../../api/client", () => ({ default: http }));

import { DataEntryForms } from "../components/DataEntryForms";
import { createDemoRepository } from "../data/demoRepository";
import { makeObservation, makeSemenObservation } from "../data/records";
import { mapTrajectory } from "../data/trajectoryMapper";
import { runEvaluation } from "../services/reproductive.service";

afterEach(cleanup);
const doctor = { id: "1", name: "Test Clinician" };
const repo = () => createDemoRepository({ storage: null, now: () => "2026-11-15T09:00:00.000Z", today: "2026-11-15" });

describe("emergency stop with cards for reference", () => {
  it("keeps the stop, and adds the cards and summary as they would be without the red flag", async () => {
    const r = repo();
    await r.createRecord("TEST-W", { sex: "female", language: "en" }, doctor, ["PROFILE", "METABOLIC", "HORMONES_SEMEN"]);
    await r.addObservations("TEST-W", [makeObservation("a", "AMH", 2.4, "ng/mL", "2026-07-01", "ENTERED")], doctor);
    await r.submitSymptoms("TEST-W", { bleedingAfterSex: true }, doctor);
    const out = await runEvaluation({ repo: r, patientId: "TEST-W", lang: "en" });
    if (out.status !== "READY") throw new Error("not ready");
    expect(out.result.halted).toBe(true);
    expect(out.brief).toBeNull();
    expect(out.reference?.result.halted).toBe(false);
    expect(out.reference?.result.vectors.length).toBeGreaterThan(0);
    expect(out.reference?.explanation.text.en).toMatch(/Reserve/);
  });

  it("has no reference block when there is no emergency", async () => {
    const out = await runEvaluation({ repo: repo(), patientId: "DEMO-1", lang: "en" });
    expect(out.status === "READY" && out.reference).toBeNull();
  });
});

describe("Add data shows what is already recorded", () => {
  it("lists cycles, lab results, semen analyses and red flags, newest first, with where they came from", async () => {
    const r = repo();
    const record = await r.createRecord("TEST-W", { sex: "female", language: "en" }, doctor, ["PROFILE"]);
    const his = mapTrajectory(
      {
        status: "success",
        data: {
          red_flags: {
            log: [
              { id: 1, rule_id: "R35", status: "RESOLVED", resolution: "DISMISSED", resolution_note: "False alarm", resolved_by_name: "Test Clinician", created_at: "2026-11-15 11:19:05" },
              { id: 5, rule_id: "R36", status: "OPEN", created_at: "2026-11-15 15:29:54" },
            ],
          },
        },
      },
      "2026-11-15",
    );
    render(
      <DataEntryForms
        repo={r}
        record={record}
        sex="female"
        asOf="2026-11-15"
        actor={doctor}
        onSaved={() => {}}
        onClose={() => {}}
        previous={{
          cycles: [{ startDate: "2026-09-01", lengthDays: 29, source: "ENTERED" }, { startDate: "2026-10-01", source: "HIS" }],
          observations: [
            makeObservation("h1", "HBA1C", 6.4, "%", "2026-11-12T17:00:54", "HIS"),
            makeSemenObservation("s1", "2026-11-12", { SPERM_CONCENTRATION: 22, TOTAL_MOTILITY: 48 }, "HIS", { SPERM_CONCENTRATION: "million/mL" }),
          ],
          redFlags: his.redFlagLog,
        }}
      />,
    );
    const items = () => screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(items()[0]).toMatch(/Cycle started · HIS/);
    expect(items()[1]).toMatch(/Cycle started, 29 days · entered/);
    fireEvent.click(screen.getByRole("tab", { name: "Lab results" }));
    expect(items().join(" ")).toMatch(/HbA1c.*6\.4 %.*HIS/);
    fireEvent.click(screen.getByRole("tab", { name: "Semen analysis" }));
    expect(items().join(" ")).toMatch(/Sperm concentration 22 million\/mL, Total motility 48 %/);
    fireEvent.click(screen.getByRole("tab", { name: "Symptoms" }));
    expect(items()[0]).toMatch(/R36: Bleeding after sex or between periods — Open/);
    expect(items()[1]).toMatch(/R35: .* — Not present \(dismissed\) · by Test Clinician · False alarm/);
  });
});

describe("Add data opens with the saved answers", () => {
  it("shows when the plans were saved, and unticking then saving records false", async () => {
    const r = repo();
    await r.createRecord("TEST-P", { sex: "female", language: "en" }, doctor, ["PROFILE", "PLANS"]);
    await r.setReproductiveContext("TEST-P", { planningPregnancy: true, concerned: true }, doctor);
    const record = (await r.getRecord("TEST-P"))!;
    const setReproductiveContext = vi.spyOn(r, "setReproductiveContext");
    render(
      <DataEntryForms
        repo={r}
        record={record}
        sex="female"
        asOf="2026-11-15"
        actor={doctor}
        previous={{ cycles: [], observations: [], redFlags: [], savedAt: { plans: "2026-11-14T10:00:00" } }}
        onSaved={() => {}}
        onClose={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Plans and questions" }));
    expect(screen.getByText(/These are the answers saved on/)).toBeTruthy();
    const planning = screen.getByRole("checkbox", { name: "Planning a pregnancy" }) as HTMLInputElement;
    expect(planning.checked).toBe(true);
    fireEvent.click(planning);
    fireEvent.click(screen.getByRole("button", { name: "Save plans" }));
    await vi.waitFor(() => expect(setReproductiveContext).toHaveBeenCalled());
    expect(setReproductiveContext.mock.calls[0][1]).toMatchObject({ planningPregnancy: false, concerned: true });
  });

  it("starts the symptom boxes empty when no red flag is open", async () => {
    const r = repo();
    await r.createRecord("TEST-S", { sex: "female", language: "en" }, doctor, ["PROFILE"]);
    render(<DataEntryForms repo={r} record={(await r.getRecord("TEST-S"))!} sex="female" asOf="2026-11-15" actor={doctor} onSaved={() => {}} onClose={() => {}} />);
    fireEvent.click(screen.getByRole("tab", { name: "Symptoms" }));
    expect(screen.queryByText(/raised a red flag that is still open/)).toBeNull();
    expect((screen.getByRole("checkbox", { name: "Fainting" }) as HTMLInputElement).checked).toBe(false);
  });

  it("pre-ticks the boxes that raised an open red flag, and says unticking does not close it", async () => {
    const r = repo();
    await r.createRecord("TEST-S", { sex: "female", language: "en" }, doctor, ["PROFILE"]);
    await r.submitSymptoms("TEST-S", { severeOneSidedPelvicPain: true, positivePregnancyTest: true, bleedingAfterSex: false }, doctor);
    const record = (await r.getRecord("TEST-S"))!;
    expect(record.redFlags[0].indicators).toEqual(["severeOneSidedPelvicPain", "positivePregnancyTest"]);
    render(<DataEntryForms repo={r} record={record} sex="female" asOf="2026-11-15" actor={doctor} onSaved={() => {}} onClose={() => {}} />);
    fireEvent.click(screen.getByRole("tab", { name: "Symptoms" }));
    expect(screen.getByText(/raised a red flag that is still open/)).toBeTruthy();
    const box = (name: string) => (screen.getByRole("checkbox", { name }) as HTMLInputElement).checked;
    expect(box("Severe, sudden one-sided pelvic pain")).toBe(true);
    expect(box("Positive pregnancy test")).toBe(true);
    expect(box("Missed period")).toBe(false);
    expect(box("Bleeding after sex")).toBe(false);
  });
});

describe("ticked symptoms from the HIS", () => {
  const body = (open: unknown[]) => ({ status: "success", data: { consent_confirmed: true, consented_categories: ["PROFILE"], red_flags: { halted: true, open, log: [] } } });

  it("reads triggered_indicators on each open red flag, keeping only known boxes", () => {
    const his = mapTrajectory(
      body([{ id: 2, rule_id: "R35", status: "OPEN", created_at: "2026-11-15 13:01:03", triggered_indicators: ["severeOneSidedPelvicPain", "missedPeriod", "positivePregnancyTest", "somethingElse"] }]),
      "2026-11-15",
    );
    expect(his.redFlags?.[0].indicators).toEqual(["severeOneSidedPelvicPain", "missedPeriod", "positivePregnancyTest"]);
  });

  it("shows the ticked symptoms on the red panel", async () => {
    const { EmergencyPanel } = await import("../components/EmergencyPanel");
    render(
      <EmergencyPanel
        events={[{ id: "HIS-rf-2", ruleId: "R35", detectedAt: "2026-11-15T13:01:03", source: "STRUCTURED", status: "OPEN", indicators: ["severeOneSidedPelvicPain", "missedPeriod"] }]}
        onResolve={async () => {}}
      />,
    );
    expect(screen.getByText("Ticked: Severe, sudden one-sided pelvic pain, Missed period")).toBeTruthy();
  });
});
