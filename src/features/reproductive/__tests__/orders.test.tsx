// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("../../../api/client", () => ({ default: http }));

import { OrderTests } from "../components/OrderTests";
import { evaluate } from "../engine";
import type { MappedTrajectory } from "../data/trajectoryMapper";
import { RULE_TESTS, suggestedTests } from "../services/orders";
import { trajectoryApi } from "../services/trajectory.service";
import { woman } from "./helpers";

afterEach(cleanup);

const clinician = { id: "1", name: "Test Clinician" };
// Planning a pregnancy, rubella status unknown (R28) and thyroid symptoms (R27).
const result = () => evaluate(woman(31, { reproductive: { planningPregnancy: true, thyroidSymptoms: true } }));
const noOrders = { pendingOrders: [], recommended: [] };

describe("suggested tests", () => {
  it("lists the test each fired rule names, with its citation and the rule's wording", () => {
    const tests = suggestedTests(result(), noOrders);
    expect(tests.map((x) => [x.testName, x.loinc, x.ruleIds])).toEqual(
      expect.arrayContaining([
        ["TSH", "3016-3", ["R27"]],
        ["Rubella IgG", "8014-3", ["R28"]],
      ]),
    );
    const tsh = tests.find((x) => x.loinc === "3016-3")!;
    expect(tsh.source).toMatch(/^NICE NG257 /);
    expect(tsh.reason.length).toBeGreaterThan(10);
    expect(tsh.from).toBe("RULE");
  });

  it("marks a test as already ordered when the HIS has it open (by code or by name)", () => {
    const tests = suggestedTests(result(), {
      pendingOrders: [{ id: "9", name: "Rubella IgG antibody", code: "LAB-RUB-0001", status: "IN_PROGRESS", orderedAt: "2026-11-11 15:03:18" }],
      recommended: [],
    });
    expect(tests.find((x) => x.loinc === "8014-3")?.alreadyOrdered).toBe(true);
    expect(tests.find((x) => x.loinc === "3016-3")?.alreadyOrdered).toBe(false);
  });

  it("adds tests the HIS suggests, without duplicating a rule's test", () => {
    const tests = suggestedTests(result(), {
      pendingOrders: [],
      recommended: [
        { testName: "TSH", loinc: "3016-3", source: "HIS", reason: "dup" },
        { testName: "Fasting Blood Glucose", loinc: "1558-6", source: "NICE NG257 1.9.1", reason: "Follow up HbA1c" },
      ],
    });
    expect(tests.filter((x) => x.loinc === "3016-3")).toHaveLength(1);
    expect(tests.find((x) => x.loinc === "1558-6")).toMatchObject({ from: "HIS", reason: "Follow up HbA1c" });
  });

  it("suggests nothing while the emergency panel is up", () => {
    const halted = evaluate(woman(31, { reproductive: { planningPregnancy: true }, openRedFlags: ["R35"] }));
    expect(halted.halted).toBe(true);
    expect(suggestedTests(halted, noOrders)).toEqual([]);
  });

  it("only maps rules that exist in the engine", () => {
    const ids = new Set(result().firedRules.map((r) => r.id));
    expect(ids.has("R27") && ids.has("R28")).toBe(true);
    for (const id of Object.keys(RULE_TESTS)) expect(id).toMatch(/^R\d{2}$/);
  });
});

describe("order call (POST /clinical/trajectory-order-diagnostics)", () => {
  beforeEach(() => http.post.mockReset());

  it("sends patient, encounter, the ordering clinician and the ticked tests", async () => {
    http.post.mockResolvedValue({ data: { status: "success" } });
    const diagnostics = [{ test_name: "TSH", loinc: "3016-3", source: "NICE NG257 1.18.12", reason: "Thyroid symptoms" }];
    await trajectoryApi.orderDiagnostics("TEST-0001", 559, clinician, diagnostics);
    expect(http.post).toHaveBeenCalledWith("/clinical/trajectory-order-diagnostics", { patient_id: "TEST-0001", encounter_id: 559, ordered_by: 1, diagnostics });
  });

  it("refuses an empty order without calling the HIS", async () => {
    await expect(trajectoryApi.orderDiagnostics("TEST-0001", 559, clinician, [])).rejects.toThrow(/at least one/);
    expect(http.post).not.toHaveBeenCalled();
  });
});

describe("Order tests dialog", () => {
  const his = (over: Partial<MappedTrajectory> = {}) => ({ encounterId: 559, pendingOrders: [], recommended: [], ...over }) as unknown as MappedTrajectory;
  const setup = (h = his()) => {
    const backend = { load: vi.fn(), confirmConsent: vi.fn(), setConsent: vi.fn(), orderDiagnostics: vi.fn(async () => {}), createReferral: vi.fn() };
    const onOrdered = vi.fn();
    render(<OrderTests patientId="TEST-0001" his={h} tests={suggestedTests(result(), h)} backend={backend} actor={clinician} onOrdered={onOrdered} onClose={() => {}} />);
    return { backend, onOrdered };
  };

  it("starts with nothing ticked and orders only what the clinician ticks, after confirming", async () => {
    const { backend, onOrdered } = setup();
    const order = screen.getByRole("button", { name: /order tests/i });
    expect((order as HTMLButtonElement).disabled).toBe(true);
    expect(backend.orderDiagnostics).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("checkbox", { name: /TSH/ }));
    fireEvent.click(screen.getByRole("button", { name: "Order 1 test" }));
    await waitFor(() => expect(onOrdered).toHaveBeenCalledWith("1 test ordered in the HIS"));
    expect(backend.orderDiagnostics).toHaveBeenCalledWith("TEST-0001", 559, clinician, [expect.objectContaining({ test_name: "TSH", loinc: "3016-3" })]);
  });

  it("cannot tick a test that is already open in the HIS", () => {
    setup(his({ pendingOrders: [{ id: "9", name: "TSH", code: "LAB-TSH-0001", status: "IN_PROGRESS", orderedAt: "2026-11-11 15:03:18" }] }));
    expect((screen.getByRole("checkbox", { name: /TSH/ }) as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByText("Open orders in the HIS")).toBeTruthy();
  });

  it("explains instead of ordering when the HIS sent no encounter", async () => {
    const { backend } = setup(his({ encounterId: null }));
    fireEvent.click(screen.getByRole("checkbox", { name: /TSH/ }));
    fireEvent.click(screen.getByRole("button", { name: "Order 1 test" }));
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", expect.stringMatching(/no encounter/));
    expect(backend.orderDiagnostics).not.toHaveBeenCalled();
  });
});
