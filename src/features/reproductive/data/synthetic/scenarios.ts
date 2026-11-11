// The 8 named demo scenarios a presenter can pick by name. All synthetic.
// Dates are relative to the evaluation date, so a scenario loaded today looks current.

import { addMonths } from "../../engine/dates";
import type { CycleRecord, HistoryItems, ReproductiveContext } from "../../engine/types";
import { conditionsFromHistory, makeObservation, newRecord } from "../records";
import type { Actor, ReproRecord, ScenarioSummary } from "../repository";

export const SCENARIOS: ScenarioSummary[] = [
  { id: "DEMO-1", name: "Main demo: improving metabolic health", description: "Woman, 33. AMH in line with age; HbA1c improving from 5.9 to 5.4. Linked partner.", sex: "female", age: 33 },
  { id: "DEMO-2", name: "Linked partner: heat exposure at work", description: "Man, 35. Regular heat exposure at work, no semen analysis yet.", sex: "male", age: 35 },
  { id: "DEMO-3", name: "PCOS-like pattern", description: "Woman, 26. Cycles 45–60 days, AMH above range, BMI 31.", sex: "female", age: 26 },
  { id: "DEMO-4", name: "Low AMH, not trying", description: "Woman, 31. AMH below range, regular cycles, not trying. No alarm.", sex: "female", age: 31 },
  { id: "DEMO-5", name: "New cancer diagnosis", description: "Woman, 30. New breast cancer diagnosis before treatment: urgent preservation discussion.", sex: "female", age: 30 },
  { id: "DEMO-6", name: "Trying 6 months at 38", description: "Woman, 38. Trying to conceive for 6 months: earlier specialist assessment.", sex: "female", age: 38 },
  { id: "DEMO-7", name: "Red-flag symptoms", description: "Woman, 29. Red-flag symptoms logged: emergency panel.", sex: "female", age: 29 },
  { id: "DEMO-8", name: "One result only", description: "Woman, 29. A single AMH result: baseline only, not enough data for a trend.", sex: "female", age: 29 },
];

/** Cycles of the given lengths, the last one starting `endGapDays` before `asOf`. */
function cyclesEndingAt(asOf: string, lengths: number[], endGapDays = 6): CycleRecord[] {
  const [y, m, d] = asOf.split("-").map(Number);
  let cursor = Date.UTC(y, m - 1, d) - endGapDays * 86_400_000;
  const out: CycleRecord[] = [];
  for (const len of [...lengths].reverse()) {
    cursor -= len * 86_400_000;
    out.unshift({ startDate: new Date(cursor).toISOString().slice(0, 10), lengthDays: len, source: "DEMO" });
  }
  return out;
}

const REGULAR = [28, 29, 27, 28, 30, 28];

/** Build scenario `scenarioId` as a record for `patientId`. `at` is the wall-clock time for the audit log. */
export function buildScenario(scenarioId: string, patientId: string, asOf: string, at: string, actor: Actor): ReproRecord {
  const meta = SCENARIOS.find((s) => s.id === scenarioId);
  if (!meta) throw new Error(`Unknown scenario ${scenarioId}`);
  const ago = (months: number) => addMonths(asOf, -months);
  const birthDate = addMonths(asOf, -(meta.age * 12 + 3));
  const record = newRecord(patientId, { sex: meta.sex, birthDate, language: "en", clinic: "Demo clinic", label: meta.name }, at, actor, true);
  record.scenarioId = scenarioId;
  let n = 0;
  const obs = (key: Parameters<typeof makeObservation>[1], value: number, unit: string, date: string, extra = {}) =>
    makeObservation(`${patientId}-${scenarioId}-o${++n}`, key, value, unit, date, "DEMO", extra);
  const history = (items: HistoryItems) => {
    record.historyCompleted = true;
    record.conditions = conditionsFromHistory(patientId, items, ago(1));
  };
  const plans = (ctx: ReproductiveContext) => (record.reproductive = ctx);

  switch (scenarioId) {
    case "DEMO-1":
      record.observations = [
        obs("AMH", 2.6, "ng/mL", ago(4)),
        obs("HBA1C", 5.9, "%", ago(14)),
        obs("HBA1C", 5.7, "%", ago(8)),
        obs("HBA1C", 5.4, "%", ago(2)),
        obs("BMI", 27.1, "kg/m2", ago(14)),
        obs("BMI", 26.4, "kg/m2", ago(8)),
        obs("BMI", 25.6, "kg/m2", ago(2)),
      ];
      record.cycles = cyclesEndingAt(asOf, REGULAR);
      history({});
      record.lifestyle = { smoking: "never", alcoholUnitsPerWeek: 0 };
      plans({ planningPregnancy: true, rubellaStatus: "immune" });
      record.partner = { partnerId: "DEMO-2", selfConsented: true, partnerConsented: true, sharedCategories: ["PROFILE", "CYCLES"], linkedAt: ago(3) };
      break;
    case "DEMO-2":
      record.observations = [obs("BMI", 26.2, "kg/m2", ago(9)), obs("BMI", 26.0, "kg/m2", ago(2))];
      history({});
      record.lifestyle = { smoking: "never", heatExposure: true, occupation: "Commercial kitchen chef" };
      plans({ planningPregnancy: true });
      record.partner = {
        partnerId: "DEMO-1",
        selfConsented: true,
        partnerConsented: true,
        sharedCategories: ["PROFILE", "HORMONES_SEMEN", "LIFESTYLE"],
        linkedAt: ago(3),
      };
      break;
    case "DEMO-3":
      record.observations = [obs("AMH", 10.8, "ng/mL", ago(3)), obs("BMI", 31.4, "kg/m2", ago(10)), obs("BMI", 31.0, "kg/m2", ago(3))];
      record.cycles = cyclesEndingAt(asOf, [46, 58, 51, 60, 45]);
      history({});
      record.lifestyle = { smoking: "never" };
      break;
    case "DEMO-4":
      record.observations = [obs("AMH", 0.6, "ng/mL", ago(3)), obs("BMI", 22.8, "kg/m2", ago(9)), obs("BMI", 23.0, "kg/m2", ago(3))];
      record.cycles = cyclesEndingAt(asOf, REGULAR);
      history({});
      record.lifestyle = { smoking: "never" };
      plans({ planningPregnancy: false });
      break;
    case "DEMO-5":
      record.observations = [obs("AMH", 2.4, "ng/mL", ago(0))];
      record.cycles = cyclesEndingAt(asOf, REGULAR);
      history({ newCancerDiagnosis: true });
      break;
    case "DEMO-6":
      record.observations = [obs("AMH", 1.1, "ng/mL", ago(2))];
      record.cycles = cyclesEndingAt(asOf, REGULAR);
      history({});
      plans({ tryingSince: ago(6), concerned: true, rubellaStatus: "immune" });
      break;
    case "DEMO-7":
      record.observations = [obs("AMH", 2.9, "ng/mL", ago(5))];
      record.cycles = cyclesEndingAt(asOf, REGULAR);
      // The symptom text is never stored; only the red flag found at entry time.
      record.redFlags = [{ id: `${patientId}-rf-1`, ruleId: "R35", detectedAt: at, source: "SCENARIO", status: "OPEN" }];
      break;
    case "DEMO-8":
      record.observations = [obs("AMH", 3.0, "ng/mL", ago(2))];
      break;
  }
  // A linked partner has opted in to partner sharing (simulated "Demo consent").
  if (record.partner) record.consent.provision.find((p) => p.category === "PARTNER_SHARING")!.type = "permit";
  record.activity.push({
    id: `${patientId}-act-2`,
    at,
    by: actor,
    action: "SCENARIO_LOADED",
    detail: `Demo scenario loaded: ${meta.name} (synthetic data)`,
  });
  return record;
}
