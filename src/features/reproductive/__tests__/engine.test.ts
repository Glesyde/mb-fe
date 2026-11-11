import { describe, expect, it } from "vitest";
import { AMH_PMOL_PER_NG, AMH_REFERENCE_BANDS, buildNextSteps, convertAmh, evaluate, findAmhBand, PATHWAY_PRIORITY } from "../engine";
import { applyConsent } from "../engine/consent";
import { densityOf } from "../engine/facts";
import type { EngineInput, FiredRule, VectorId } from "../engine/types";
import { amh, bmi, cycles, hba1c, man, NORMAL_SEMEN, obs, REGULAR, semen, woman } from "./helpers";

const vec = (input: EngineInput, id: VectorId, partner?: Parameters<typeof evaluate>[1]) =>
  evaluate(input, partner).vectors.find((v) => v.vector === id);

describe("density badges", () => {
  it("NONE with no readings", () => expect(densityOf([])).toBe("NONE"));
  it("BASELINE_ONLY with one reading", () => expect(densityOf(["2026-06-01"])).toBe("BASELINE_ONLY"));
  it("BASELINE_ONLY with two readings under 6 months apart", () =>
    expect(densityOf(["2026-03-01", "2026-06-01"])).toBe("BASELINE_ONLY"));
  it("TREND with two readings at least 6 months apart", () =>
    expect(densityOf(["2025-12-01", "2026-06-01"])).toBe("TREND"));
  it("ESTABLISHED with three readings over at least 6 months", () =>
    expect(densityOf(["2025-12-01", "2026-03-01", "2026-06-01"])).toBe("ESTABLISHED"));
  it("counts the same day once", () => expect(densityOf(["2026-06-01", "2026-06-01T10:00:00Z"])).toBe("BASELINE_ONLY"));
});

describe("V1 reserve in age context", () => {
  it("In line with age (STABLE) inside the band, with the placeholder flag", () => {
    const result = evaluate(woman(33, { observations: [amh(2.5, "2026-06-01")] }));
    const v1 = result.vectors.find((v) => v.vector === "V1")!;
    expect(v1.state).toBe("STABLE");
    expect(v1.reasons[0].key).toBe("v1.inLine");
    expect(v1.referenceBand?.placeholder).toBe(true);
    expect(result.placeholderReferenceInUse).toBe(true);
  });
  it("NEEDS_ATTENTION below and above the band", () => {
    expect(vec(woman(31, { observations: [amh(0.5, "2026-06-01")] }), "V1")!.state).toBe("NEEDS_ATTENTION");
    expect(vec(woman(26, { observations: [amh(11, "2026-06-01")] }), "V1")!.reasons[0].key).toBe("v1.aboveBand");
  });
  it("NOT_ENOUGH_DATA with no AMH/AFC in the last 24 months", () => {
    const v1 = vec(woman(33, { observations: [amh(2.5, "2024-06-01")] }), "V1")!;
    expect(v1.state).toBe("NOT_ENOUGH_DATA");
    expect(v1.reasons[0].key).toBe("v1.noRecentData");
  });
  it("accepts pmol/L via the single conversion factor", () => {
    expect(convertAmh({ value: 1, unit: "ng/mL" }, "pmol/L")).toBeCloseTo(AMH_PMOL_PER_NG);
    expect(vec(woman(33, { observations: [obs("AMH", 17.85, "pmol/L", "2026-06-01")] }), "V1")!.state).toBe("STABLE");
  });
  it("never shows IMPROVING", () => {
    const v1 = vec(woman(33, { observations: [amh(1.5, "2025-06-01"), amh(3.0, "2026-06-01")] }), "V1")!;
    expect(v1.state).toBe("STABLE");
  });
  it("is hidden for men", () => expect(vec(man(35, { observations: [amh(2, "2026-06-01")] }), "V1")).toBeUndefined());
  it("AMH bands are age-banded, never one cut-off", () => {
    expect(new Set(AMH_REFERENCE_BANDS.map((b) => b.low)).size).toBeGreaterThan(1);
    expect(findAmhBand(33)?.ageMin).toBe(30);
    expect(findAmhBand(50)).toBeNull();
  });
});

describe("V2 cycle and ovulation", () => {
  it("STABLE with regular cycles", () => expect(vec(woman(30, { cycles: cycles(REGULAR) }), "V2")!.state).toBe("STABLE"));
  it("NEEDS_ATTENTION for long, short or variable cycles", () => {
    expect(vec(woman(26, { cycles: cycles([45, 52, 60, 48]) }), "V2")!.reasons.map((r) => r.key)).toContain("v2.long");
    expect(vec(woman(26, { cycles: cycles([21, 22, 21, 22]) }), "V2")!.reasons.map((r) => r.key)).toContain("v2.short");
    expect(vec(woman(26, { cycles: cycles([26, 34, 25, 35]) }), "V2")!.reasons.map((r) => r.key)).toEqual(["v2.variable"]);
  });
  it("NOT_ENOUGH_DATA with fewer than 3 cycles", () =>
    expect(vec(woman(30, { cycles: cycles([28, 28]) }), "V2")!.state).toBe("NOT_ENOUGH_DATA"));
  it("derives lengths from start dates when no length is given", () => {
    const starts = ["2026-07-01", "2026-07-29", "2026-08-26", "2026-09-23", "2026-10-21"].map((startDate) => ({
      startDate,
      source: "ENTERED" as const,
    }));
    expect(vec(woman(30, { cycles: starts }), "V2")!.state).toBe("STABLE");
  });
});

describe("V3 metabolic and lifestyle", () => {
  it("IMPROVING when HbA1c falls across results 6+ months apart", () => {
    const v3 = vec(woman(33, { observations: [hba1c(5.9, "2025-11-01"), hba1c(5.4, "2026-08-01"), bmi(24, "2026-08-01")] }), "V3")!;
    expect(v3.state).toBe("IMPROVING");
    expect(v3.ruleIds).toContain("R37");
    expect(v3.density).toBe("TREND");
  });
  it("NEEDS_ATTENTION for BMI ≥30, BMI <18.5, HbA1c rising, smoking", () => {
    expect(vec(woman(30, { observations: [bmi(36, "2026-09-01")] }), "V3")!.state).toBe("NEEDS_ATTENTION");
    expect(vec(woman(30, { observations: [bmi(17.5, "2026-09-01")] }), "V3")!.state).toBe("NEEDS_ATTENTION");
    expect(vec(woman(30, { observations: [hba1c(5.4, "2025-11-01"), hba1c(6.0, "2026-08-01")] }), "V3")!.ruleIds).toContain("R38");
    expect(vec(woman(30, { lifestyle: { smoking: "current" } }), "V3")!.state).toBe("NEEDS_ATTENTION");
  });
  it("NOT_ENOUGH_DATA with fewer than 2 readings in 12 months", () =>
    expect(vec(woman(30, { observations: [bmi(24, "2026-09-01")] }), "V3")!.state).toBe("NOT_ENOUGH_DATA"));
  it("STABLE with 2+ readings and nothing to flag", () =>
    expect(vec(woman(30, { observations: [bmi(24, "2026-03-01"), bmi(24.2, "2026-09-01")] }), "V3")!.state).toBe("STABLE"));
  it("names the gap when no metabolic data is shared", () =>
    expect(vec(woman(30), "V3")!.gaps.map((g) => g.key)).toEqual(["gap.noMetabolic"]));
  it("keeps the calculated label on BMI points", () => {
    const calc = { ...bmi(24, "2026-09-01"), derivation: "calculated" as const };
    expect(vec(woman(30, { observations: [calc] }), "V3")!.series[0].points[0].derivation).toBe("calculated");
  });
});

describe("V4 male factor", () => {
  it("STABLE when the latest analysis is within reference", () =>
    expect(vec(man(35, { observations: [semen("2026-06-01")] }), "V4")!.state).toBe("STABLE"));
  it("NEEDS_ATTENTION below reference, with heat, or smoking", () => {
    expect(vec(man(35, { observations: [semen("2026-06-01", { ...NORMAL_SEMEN, SPERM_CONCENTRATION: 8 })] }), "V4")!.state).toBe(
      "NEEDS_ATTENTION",
    );
    expect(vec(man(35, { lifestyle: { heatExposure: true } }), "V4")!.state).toBe("NEEDS_ATTENTION");
    expect(vec(man(35, { lifestyle: { smoking: "current" } }), "V4")!.state).toBe("NEEDS_ATTENTION");
  });
  it("NOT_ENOUGH_DATA with no semen analysis", () => {
    const v4 = vec(man(35), "V4")!;
    expect(v4.state).toBe("NOT_ENOUGH_DATA");
    expect(v4.gaps.map((g) => g.key)).toEqual(["gap.noSemen"]);
  });
  it("is not shown to a woman without a linked partner", () => expect(vec(woman(33), "V4")).toBeUndefined());
});

describe("V5 history-based risk", () => {
  it("NOT_ENOUGH_DATA when history is not filled in", () => expect(vec(woman(30), "V5")!.state).toBe("NOT_ENOUGH_DATA"));
  it("STABLE with no risk factors", () => expect(vec(woman(30, { history: {} }), "V5")!.state).toBe("STABLE"));
  it("NEEDS_ATTENTION with any risk factor", () => {
    const v5 = vec(woman(30, { history: { pastChemoOrRadiotherapy: true } }), "V5")!;
    expect(v5.state).toBe("NEEDS_ATTENTION");
    expect(v5.reasons.map((r) => r.key)).toContain("history.pastChemoOrRadiotherapy");
  });
});

describe("vector visibility", () => {
  it("men see V3, V4, V5; women see V1, V2, V3, V5", () => {
    expect(evaluate(man(35)).vectors.map((v) => v.vector)).toEqual(["V3", "V4", "V5"]);
    expect(evaluate(woman(33)).vectors.map((v) => v.vector)).toEqual(["V1", "V2", "V3", "V5"]);
  });
  it("unknown sex sees only V3 and V5, and the gap is named", () => {
    const r = evaluate(woman(33, { subject: { sex: null, ageYears: 33 } }));
    expect(r.vectors.map((v) => v.vector)).toEqual(["V3", "V5"]);
    expect(r.gaps.map((g) => g.key)).toContain("gap.noSex");
  });
});

describe("pathway priority", () => {
  const rule = (id: string, pathways: FiredRule["pathways"], urgency: FiredRule["urgency"] = "ROUTINE"): FiredRule => ({
    id,
    messageKey: `rule.${id}`,
    pathways,
    urgency,
    citation: { source: "x", ref: "", verified: true },
  });

  it("orders P6 → P4 → P5 → P2 → P3 → P1", () => {
    expect(PATHWAY_PRIORITY).toEqual(["P6", "P4", "P5", "P2", "P3", "P1"]);
    const steps = buildNextSteps([rule("A", ["P1"]), rule("B", ["P3"]), rule("C", ["P2", "P5"]), rule("D", ["P4"]), rule("E", ["P6"], "URGENT")]);
    expect(steps.map((s) => s.pathway)).toEqual(["P6", "P4", "P5", "P2", "P3", "P1"]);
  });
  it("lets lower pathways co-exist with P6 (R36) and carries the highest urgency", () => {
    const r = evaluate(woman(30, { symptoms: { bleedingAfterSex: true }, reproductive: { planningPregnancy: true } }));
    expect(r.nextSteps.map((s) => s.pathway)).toEqual(["P6", "P2", "P3"]);
    expect(r.nextSteps[0].urgency).toBe("URGENT");
  });
  it("marks R30 as URGENT P4", () => {
    const step = evaluate(woman(30, { history: { newCancerDiagnosis: true } })).nextSteps[0];
    expect(step).toMatchObject({ pathway: "P4", urgency: "URGENT" });
  });
  it("informational rules never create a pathway", () => {
    const r = evaluate(woman(33, { observations: [amh(2.5, "2026-06-01"), obs("FSH", 7, "IU/L", "2026-06-01")] }));
    expect(r.nextSteps).toEqual([]);
  });
});

describe("consent", () => {
  const full = woman(33, {
    observations: [amh(2.5, "2026-06-01"), hba1c(5.9, "2025-11-01"), hba1c(5.4, "2026-08-01")],
    cycles: cycles(REGULAR),
  });

  it("removes withdrawn data before evaluation", () => {
    const { input, withdrawn } = applyConsent({ ...full, consent: { ...full.consent, HORMONES_SEMEN: false } });
    expect(withdrawn).toEqual(["HORMONES_SEMEN"]);
    expect(input.observations.map((o) => o.code.key)).toEqual(["HBA1C", "HBA1C"]);
  });

  it("withdrawn data leaves every calculation and the card shows Data withdrawn", () => {
    const r = evaluate({ ...full, consent: { ...full.consent, HORMONES_SEMEN: false } });
    const v1 = r.vectors.find((v) => v.vector === "V1")!;
    expect(v1).toMatchObject({ state: "NOT_ENOUGH_DATA", dataWithdrawn: true, series: [] });
    expect(v1.ruleIds).toContain("R40");
    expect(r.firedRules.map((f) => f.id)).not.toContain("R01");
    // Other cards are unaffected.
    expect(r.vectors.find((v) => v.vector === "V3")!.state).toBe("IMPROVING");
  });

  it("withdrawing cycles removes cycle data from V2", () => {
    const v2 = vec({ ...full, consent: { ...full.consent, CYCLES: false } }, "V2")!;
    expect(v2).toMatchObject({ state: "NOT_ENOUGH_DATA", dataWithdrawn: true });
    expect(v2.gaps.map((g) => g.key)).toEqual(["gap.withdrawn.CYCLES"]);
  });

  it("withdrawing wearables removes wearable-sourced data only", () => {
    const input = woman(30, { cycles: cycles(REGULAR, "WEARABLE"), consent: { WEARABLES: false } });
    expect(vec(input, "V2")!.state).toBe("NOT_ENOUGH_DATA");
    expect(vec({ ...input, cycles: cycles(REGULAR, "ENTERED") }, "V2")!.state).toBe("STABLE");
  });

  it("profile (age and sex) cannot be withdrawn", () => {
    const r = evaluate(woman(33, { history: { endometriosis: true }, consent: { PROFILE: false } }));
    expect(r.withdrawnCategories).toEqual([]);
    expect(r.firedRules.map((f) => f.id)).toContain("R04");
    expect(r.firedRules.map((f) => f.id)).toContain("R08");
  });

  it("withdrawing history removes history items, thyroid symptoms and rubella status", () => {
    const input = woman(33, {
      history: { endometriosis: true },
      reproductive: { thyroidSymptoms: true, planningPregnancy: true, rubellaStatus: "unknown" },
      consent: { HISTORY: false },
    });
    const r = evaluate(input);
    const ids = r.firedRules.map((f) => f.id);
    expect(ids).not.toContain("R08");
    expect(ids).not.toContain("R27");
    expect(ids).toContain("R29"); // plans are a separate category
    const v5 = r.vectors.find((v) => v.vector === "V5")!;
    expect(v5).toMatchObject({ state: "NOT_ENOUGH_DATA", dataWithdrawn: true, withdrawnCategories: ["HISTORY"] });
    expect(v5.reasons[0].key).toBe("common.dataWithdrawn");
    expect(v5.gaps.map((g) => g.key)).toEqual(["gap.withdrawn.HISTORY"]);
  });

  it("withdrawing lifestyle removes smoking, alcohol, heat and occupation", () => {
    const lifestyle = { smoking: "current" as const, alcoholUnitsPerWeek: 6, heatExposure: true, hazardousOccupation: true };
    const r = evaluate(man(35, { lifestyle, observations: [semen("2026-06-01")], consent: { LIFESTYLE: false } }));
    expect(r.firedRules.map((f) => f.id).filter((id) => ["R17", "R18", "R20", "R21"].includes(id))).toEqual([]);
    const v4 = r.vectors.find((v) => v.vector === "V4")!;
    expect(v4).toMatchObject({ state: "STABLE", dataWithdrawn: true, withdrawnCategories: ["LIFESTYLE"] });
    expect(v4.gaps.map((g) => g.key)).toEqual(["gap.withdrawn.LIFESTYLE"]);
  });

  it("withdrawing plans removes trying-since and questions", () => {
    const r = evaluate(woman(38, { reproductive: { tryingSince: "2025-01-01", questions: ["CAFFEINE"] }, consent: { PLANS: false } }));
    expect(r.withdrawnCategories).toEqual(["PLANS"]);
    expect(r.firedRules.map((f) => f.id).filter((id) => ["R06", "R07", "R19", "R29"].includes(id))).toEqual([]);
  });

  it("red flags are checked whatever the consent settings", () => {
    const none = { HISTORY: false, LIFESTYLE: false, PLANS: false, CYCLES: false, METABOLIC: false, HORMONES_SEMEN: false, WEARABLES: false };
    expect(evaluate(woman(29, { symptoms: { freeText: "sudden severe right pelvic pain, missed my period" }, consent: none })).emergency).toBe(true);
    expect(evaluate(woman(29, { openRedFlags: ["R35"], consent: none })).emergency).toBe(true);
    expect(evaluate(woman(29, { openRedFlags: ["R36"], consent: none })).nextSteps[0].pathway).toBe("P6");
  });

  it("symptom text is never carried into the evaluation", () => {
    const input = woman(29, { symptoms: { freeText: "bleeding after sex, my name is on the form" } });
    expect(applyConsent(input).input.symptoms).toEqual({});
    expect(JSON.stringify(evaluate(input))).not.toContain("bleeding after sex");
  });
});

describe("partner link (V4 for a woman)", () => {
  const partner = man(35, { observations: [semen("2026-06-01")], lifestyle: { heatExposure: true } });

  it("shows V4 from the partner's shared categories", () => {
    const v4 = vec(woman(33), "V4", { partner: { input: partner, sharedCategories: ["PROFILE", "HORMONES_SEMEN", "LIFESTYLE"] } })!;
    expect(v4).toMatchObject({ fromPartner: true, state: "NEEDS_ATTENTION" });
    expect(v4.ruleIds).toEqual(expect.arrayContaining(["R20", "R22"]));
  });
  it("only uses categories the partner shared", () => {
    const v4 = vec(woman(33), "V4", { partner: { input: partner, sharedCategories: ["HORMONES_SEMEN"] } })!;
    expect(v4.state).toBe("STABLE"); // heat exposure (LIFESTYLE) was not shared
    expect(v4.inputsUsed).not.toContain("HEAT_EXPOSURE");
    expect(v4.gaps.map((g) => g.key)).toEqual(["gap.partnerNotShared.LIFESTYLE"]);
  });
  it("adds the partner's own steps under 'For your partner', in pathway order, from shared categories only", () => {
    const below = man(35, { observations: [semen("2026-06-01", { ...NORMAL_SEMEN, SPERM_CONCENTRATION: 8 })], lifestyle: { heatExposure: true, smoking: "current" } });
    const all = evaluate(woman(33), { partner: { input: below, sharedCategories: ["PROFILE", "HORMONES_SEMEN", "LIFESTYLE"] } });
    expect(all.partnerSteps.map((f) => f.id)).toEqual(["R23", "R17", "R20", "R22"]);
    expect(all.nextSteps).toEqual([]); // her own steps are separate
    const semenOnly = evaluate(woman(33), { partner: { input: below, sharedCategories: ["HORMONES_SEMEN"] } });
    expect(semenOnly.partnerSteps.map((f) => f.id)).toEqual(["R23", "R22"]);
  });
  it("shows a step once when it fired for both partners", () => {
    const trying = { tryingSince: "2025-01-01" };
    const r = evaluate(woman(33, { reproductive: trying }), {
      partner: { input: man(35, { reproductive: trying }), sharedCategories: ["PROFILE", "PLANS"] },
    });
    expect(r.firedRules.map((f) => f.id)).toContain("R07");
    expect(r.partnerSteps.map((f) => f.id)).not.toContain("R07");
  });
  it("is hidden when the partner has not granted partner sharing", () => {
    const blocked = { ...partner, consent: { ...partner.consent, PARTNER_SHARING: false } };
    expect(vec(woman(33), "V4", { partner: { input: blocked, sharedCategories: ["HORMONES_SEMEN"] } })).toBeUndefined();
  });
});
