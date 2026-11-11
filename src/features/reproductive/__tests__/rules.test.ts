import { describe, expect, it } from "vitest";
import { evaluate, RULES } from "../engine";
import type { EngineInput } from "../engine/types";
import { messagesAr } from "../i18n/messages.ar";
import { messagesEn } from "../i18n/messages.en";
import { amh, bmi, cycles, hba1c, man, NORMAL_SEMEN, obs, REGULAR, semen, woman } from "./helpers";

const fired = (input: EngineInput) => evaluate(input).firedRules.map((r) => r.id);

const BELOW = { ...NORMAL_SEMEN, SPERM_CONCENTRATION: 8, PROGRESSIVE_MOTILITY: 20 };
const NONE = { SEMEN_VOLUME: 2.5, SPERM_CONCENTRATION: 0 };
const LONG = cycles([45, 52, 60, 48]);
const IRREGULAR = cycles([40, 55, 38, 60]);

/** For every rule: an input where it fires and a close neighbour where it does not. */
const CASES: Record<string, { fires: EngineInput; not: EngineInput }> = {
  R01: {
    fires: woman(33, { observations: [amh(2.5, "2026-06-01")] }),
    not: woman(33, { observations: [amh(2.5, "2026-06-01")], reproductive: { assistedConception: true } }),
  },
  R02: {
    fires: woman(33, { observations: [amh(2.5, "2026-06-01")], reproductive: { eggFreezingConsidered: true } }),
    not: woman(33, { observations: [amh(2.5, "2026-06-01")] }),
  },
  R03: { fires: woman(33, { observations: [obs("FSH", 14.2, "IU/L", "2026-06-01")] }), not: woman(33) },
  R04: { fires: woman(33), not: woman(null) },
  R05: {
    fires: woman(36, { reproductive: { tryingSince: "2026-07-01", concerned: true } }),
    not: woman(41, { reproductive: { tryingSince: "2026-07-01", concerned: true } }),
  },
  R06: {
    fires: woman(38, { reproductive: { tryingSince: "2026-05-01" } }),
    not: woman(38, { reproductive: { tryingSince: "2026-07-01" } }),
  },
  R07: {
    fires: woman(29, { reproductive: { tryingSince: "2025-10-01" } }),
    not: woman(29, { reproductive: { tryingSince: "2026-01-01" } }),
  },
  R08: { fires: woman(30, { history: { endometriosis: true } }), not: man(30, { history: { pastPelvicSurgery: true } }) },
  R09: { fires: man(30, { history: { undescendedTestes: true } }), not: man(30, { history: {} }) },
  R10: { fires: woman(26, { cycles: LONG }), not: woman(26, { cycles: cycles(REGULAR) }) },
  R11: { fires: woman(30, { cycles: cycles(REGULAR) }), not: woman(30, { cycles: cycles([28, 28]) }) },
  R12: {
    fires: woman(26, { cycles: LONG, reproductive: { questions: ["OVULATION_CHECK"] } }),
    not: woman(26, { cycles: cycles(REGULAR), reproductive: { questions: ["OVULATION_CHECK"] } }),
  },
  R13: { fires: woman(30, { observations: [bmi(31, "2026-09-01")] }), not: man(30, { observations: [bmi(31, "2026-09-01")] }) },
  R14: {
    fires: man(30, { observations: [bmi(31, "2026-09-01")], reproductive: { planningPregnancy: true } }),
    not: man(30, { observations: [bmi(31, "2026-09-01")] }),
  },
  R15: {
    fires: woman(25, { observations: [bmi(17.5, "2026-09-01")], cycles: IRREGULAR }),
    not: woman(25, { observations: [bmi(17.5, "2026-09-01")], cycles: cycles(REGULAR) }),
  },
  R16: { fires: woman(30, { lifestyle: { smoking: "current" } }), not: woman(30, { lifestyle: { smoking: "former" } }) },
  R17: { fires: man(30, { lifestyle: { passiveSmoke: true } }), not: woman(30, { lifestyle: { passiveSmoke: true } }) },
  R18: {
    fires: woman(30, { lifestyle: { alcoholUnitsPerWeek: 6 } }),
    not: woman(30, { lifestyle: { alcoholUnitsPerWeek: 0 } }),
  },
  R19: { fires: woman(30, { reproductive: { questions: ["CAFFEINE"] } }), not: woman(30) },
  R20: { fires: man(35, { lifestyle: { heatExposure: true } }), not: woman(35, { lifestyle: { heatExposure: true } }) },
  R21: {
    fires: woman(30, { lifestyle: { hazardousOccupation: true } }),
    not: woman(30, { lifestyle: { hazardousOccupation: false } }),
  },
  R22: { fires: man(35, { observations: [semen("2026-06-01")] }), not: man(35) },
  R23: {
    fires: man(35, { observations: [semen("2026-06-01", BELOW)] }),
    not: man(35, { observations: [semen("2026-03-01", BELOW), semen("2026-06-01", BELOW)] }),
  },
  R24: {
    fires: man(35, { observations: [semen("2026-03-01", BELOW), semen("2026-06-01", BELOW)] }),
    not: man(35, { observations: [semen("2026-06-01", BELOW)] }),
  },
  R25: {
    fires: man(35, { observations: [semen("2026-03-01", NONE), semen("2026-06-01", NONE)] }),
    not: man(35, { observations: [semen("2026-06-01", NONE)] }),
  },
  R26: { fires: man(35, { reproductive: { questions: ["DNA_FRAGMENTATION"] } }), not: man(35) },
  R27: { fires: woman(30, { reproductive: { thyroidSymptoms: true } }), not: woman(30, { reproductive: { thyroidSymptoms: false } }) },
  R28: {
    fires: woman(30, { reproductive: { planningPregnancy: true, rubellaStatus: "unknown" } }),
    not: woman(30, { reproductive: { planningPregnancy: true, rubellaStatus: "immune" } }),
  },
  R29: { fires: woman(30, { reproductive: { planningPregnancy: true } }), not: man(30, { reproductive: { planningPregnancy: true } }) },
  R30: { fires: woman(30, { history: { newCancerDiagnosis: true } }), not: woman(30, { history: { pastChemoOrRadiotherapy: true } }) },
  R31: { fires: woman(30, { history: { plannedOvarianSurgery: true } }), not: woman(30, { history: { pastOvarianSurgery: true } }) },
  R32: { fires: woman(30, { history: { familyEarlyMenopause: true } }), not: woman(30, { history: {} }) },
  R33: {
    fires: woman(35, { reproductive: { eggFreezingConsidered: true, eggFreezingForAge: true } }),
    not: woman(35, { reproductive: { eggFreezingConsidered: true } }),
  },
  R34: {
    fires: woman(31, { observations: [amh(0.5, "2026-06-01")], cycles: cycles(REGULAR) }),
    not: woman(31, { observations: [amh(0.5, "2026-06-01")], cycles: cycles(REGULAR), reproductive: { tryingSince: "2026-08-01" } }),
  },
  R35: {
    fires: woman(29, { symptoms: { severeOneSidedPelvicPain: true, missedPeriod: true } }),
    not: woman(29, { symptoms: { severeOneSidedPelvicPain: true } }),
  },
  R36: { fires: woman(29, { symptoms: { bleedingAfterSex: true } }), not: woman(29) },
  R37: {
    fires: woman(33, { observations: [hba1c(5.9, "2025-11-01"), hba1c(5.4, "2026-08-01")] }),
    not: woman(33, { observations: [hba1c(5.9, "2026-06-01"), hba1c(5.4, "2026-08-01")] }),
  },
  R38: {
    fires: woman(33, { observations: [hba1c(5.4, "2025-11-01"), hba1c(6.0, "2026-08-01")] }),
    not: woman(33, { observations: [hba1c(5.4, "2025-11-01"), hba1c(5.5, "2026-08-01")] }),
  },
  R39: {
    fires: woman(29, { observations: [amh(2.5, "2026-06-01")] }),
    not: woman(29, { observations: [amh(2.8, "2025-11-01"), amh(2.5, "2026-06-01")] }),
  },
  R40: {
    fires: woman(29, { observations: [amh(2.5, "2026-06-01")], consent: { HORMONES_SEMEN: false } }),
    not: woman(29, { observations: [amh(2.5, "2026-06-01")] }),
  },
};

describe("rules: each fires and does not fire", () => {
  it("has a test case for every rule", () => {
    expect(RULES.map((r) => r.id).sort()).toEqual(Object.keys(CASES).sort());
  });

  for (const [id, c] of Object.entries(CASES)) {
    it(`${id} fires`, () => expect(fired(c.fires)).toContain(id));
    it(`${id} does not fire`, () => expect(fired(c.not)).not.toContain(id));
  }
});

describe("rule definitions", () => {
  it("every rule has a citation, and its message key exists in both catalogues", () => {
    for (const rule of RULES) {
      expect(rule.citation.source, rule.id).toBeTruthy();
      expect(messagesEn, rule.id).toHaveProperty([rule.output.messageKey]);
      expect(messagesAr, rule.id).toHaveProperty([rule.output.messageKey]);
    }
  });

  it("marks citations verified exactly as the spec says", () => {
    const unverified = RULES.filter((r) => !r.citation.verified).map((r) => r.id);
    expect(unverified).toEqual([
      "R06", "R07", "R08", "R09", "R10", "R12", "R15", "R17", "R18", "R23", "R25",
      "R30", "R31", "R32", "R33", "R35", "R36", "R37", "R38", "R39",
    ]);
  });

  it("R35 stops all other processing", () => {
    const result = evaluate(CASES.R35.fires);
    expect(result.emergency).toBe(true);
    expect(result.firedRules.map((r) => r.id)).toEqual(["R35"]);
    expect(result.vectors).toEqual([]);
    expect(result.nextSteps.map((s) => s.pathway)).toEqual(["P6"]);
    expect(result.nextSteps[0].urgency).toBe("EMERGENCY");
  });

  it("is deterministic", () => {
    const input = woman(33, { observations: [amh(2.5, "2026-06-01"), hba1c(5.9, "2025-11-01"), hba1c(5.4, "2026-08-01")] });
    expect(evaluate(input)).toEqual(evaluate(structuredClone(input)));
  });
});
