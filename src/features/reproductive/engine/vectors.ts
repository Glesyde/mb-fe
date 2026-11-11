// The five trajectory vectors. Each returns a state with its inputs, density, reasons and gaps.
// Rule IDs are attached afterwards (index.ts). Missing data is named as a gap, never estimated.

import { isPlaceholderBand } from "./amhReference";
import { CITE } from "./citations";
import { BMI, SEMEN_REFERENCE, VECTOR_CATEGORIES } from "./config";
import { densityOf, type Facts } from "./facts";
import type {
  ConsentCategory,
  DensityBadge,
  HistoryItems,
  MessageRef,
  SemenComponentKey,
  SeriesPoint,
  Sex,
  VectorId,
  VectorResult,
} from "./types";

export interface ComputedVector {
  result: VectorResult;
  /** Readings in the vector's main series. R39 attaches when this is exactly 1. */
  primaryReadings: number;
}

function base(vector: VectorId, withdrawn: ConsentCategory[]): VectorResult {
  const cats = VECTOR_CATEGORIES[vector] as readonly ConsentCategory[];
  const withdrawnHere = cats.filter((c) => withdrawn.includes(c));
  return {
    vector,
    state: "NOT_ENOUGH_DATA",
    dataWithdrawn: withdrawnHere.length > 0,
    withdrawnCategories: withdrawnHere,
    density: "NONE",
    inputsUsed: [],
    reasons: [],
    // Name every withdrawn category as a gap, so the card says what it is not using.
    gaps: withdrawnHere.map((c) => ({ key: `gap.withdrawn.${c}` })),
    ruleIds: [],
    citations: [],
    series: [],
  };
}

const ref = (key: string, citation?: MessageRef["citation"], params?: MessageRef["params"]): MessageRef => ({
  key,
  ...(params ? { params } : {}),
  ...(citation ? { citation } : {}),
});

/** "No X shared" gap, unless the category was withdrawn (that gap is already listed). */
function missingGap(r: VectorResult, category: ConsentCategory, gapKey: string) {
  if (!r.withdrawnCategories.includes(category)) r.gaps.push(ref(gapKey));
}

const withdrew = (r: VectorResult, category: ConsentCategory) => r.withdrawnCategories.includes(category);

// ---------------------------------------------------------------------------
// V1 Reserve in age context
// ---------------------------------------------------------------------------
export function computeV1(f: Facts, withdrawn: ConsentCategory[]): ComputedVector {
  const r = base("V1", withdrawn);
  if (f.age !== null) r.inputsUsed.push("AGE");
  if (f.amhRecent.length) r.inputsUsed.push("AMH");
  if (f.afcRecent.length) r.inputsUsed.push("AFC");
  if (f.amh.length) r.series.push({ key: "AMH", points: f.amh });
  if (f.afc.length) r.series.push({ key: "AFC", points: f.afc });

  const primary = f.amhRecent.length ? f.amhRecent : f.afcRecent;
  r.density = densityOf(primary.map((p) => p.date));

  if (f.amhBand) {
    r.referenceBand = { ...f.amhBand, placeholder: isPlaceholderBand(f.amhBand) };
  }

  if (!f.amhRecent.length && !f.afcRecent.length) {
    r.reasons.push(ref(withdrew(r, "HORMONES_SEMEN") ? "common.dataWithdrawn" : "v1.noRecentData"));
    missingGap(r, "HORMONES_SEMEN", "gap.noHormones");
  } else if (!f.amhRecent.length) {
    r.reasons.push(ref("v1.afcOnly", CITE.ASSUMPTION));
  } else if (f.age === null) {
    r.reasons.push(ref("v1.noAge"));
    r.gaps.push(ref("gap.noAge"));
  } else if (!f.amhBand) {
    r.reasons.push(ref("v1.noBandForAge"));
  } else if (f.amhBandStatus === "within") {
    r.state = "STABLE";
    r.reasons.push(ref("v1.inLine", CITE.NICE_1_18_3));
  } else {
    r.state = "NEEDS_ATTENTION";
    r.reasons.push(ref(f.amhBandStatus === "below" ? "v1.belowBand" : "v1.aboveBand", CITE.NICE_1_18_3));
  }

  if (f.amhRecent.length && f.amhLatestOnHormonalContraception) {
    r.reasons.push(ref("v1.confounder.hormonalContraception", CITE.ASSUMPTION_CLINICAL_LEAD));
  }
  return { result: r, primaryReadings: primary.length };
}

// ---------------------------------------------------------------------------
// V2 Cycle and ovulation
// ---------------------------------------------------------------------------
export function computeV2(f: Facts, withdrawn: ConsentCategory[]): ComputedVector {
  const r = base("V2", withdrawn);
  if (f.cyclePoints.length) {
    r.inputsUsed.push("CYCLES");
    r.series.push({ key: "CYCLE_LENGTH", points: f.cyclePoints });
  }
  if (f.periodsAbsent) r.inputsUsed.push("PERIODS_ABSENT");
  r.density = densityOf(f.cycleStarts);

  if (f.periodsAbsent) {
    r.state = "NEEDS_ATTENTION";
    r.reasons.push(ref("v2.absent", CITE.NICE_1_18_6_AND_1_16));
  } else if (f.cycleMedian === null) {
    r.reasons.push(ref(withdrew(r, "CYCLES") ? "common.dataWithdrawn" : "v2.fewCycles"));
    if (!f.cyclePoints.length) missingGap(r, "CYCLES", "gap.noCycles");
  } else if (f.cyclesShort || f.cyclesLong || f.cyclesVariable) {
    r.state = "NEEDS_ATTENTION";
    if (f.cyclesShort) r.reasons.push(ref("v2.short", CITE.NICE_1_18_6));
    if (f.cyclesLong) r.reasons.push(ref("v2.long", CITE.NICE_1_18_6_AND_1_16));
    if (f.cyclesVariable) r.reasons.push(ref("v2.variable", CITE.ASSUMPTION_CONFIG));
  } else {
    r.state = "STABLE";
    r.reasons.push(ref("v2.regular", CITE.NICE_1_18_6));
  }
  return { result: r, primaryReadings: f.cyclePoints.length };
}

// ---------------------------------------------------------------------------
// V3 Metabolic and lifestyle
// ---------------------------------------------------------------------------
function bestDensity(candidates: SeriesPoint[][]): { density: DensityBadge; readings: number } {
  const order: DensityBadge[] = ["NONE", "BASELINE_ONLY", "TREND", "ESTABLISHED"];
  let best = { density: "NONE" as DensityBadge, readings: 0 };
  for (const points of candidates) {
    const d = densityOf(points.map((p) => p.date));
    if (order.indexOf(d) > order.indexOf(best.density) || (d === best.density && points.length > best.readings)) {
      best = { density: d, readings: points.length };
    }
  }
  return best;
}

export function computeV3(f: Facts, withdrawn: ConsentCategory[]): ComputedVector {
  const r = base("V3", withdrawn);
  if (f.bmi.length) r.inputsUsed.push("BMI");
  if (f.hba1c.length) r.inputsUsed.push("HBA1C");
  if (f.glucose.length) r.inputsUsed.push("FASTING_GLUCOSE");
  if (f.bp.length) r.inputsUsed.push("BP");
  if (f.smokesCurrently) r.inputsUsed.push("SMOKING");
  if (f.alcoholRecorded) r.inputsUsed.push("ALCOHOL");
  if (f.hba1c.length) r.series.push({ key: "HBA1C", points: f.hba1c });
  if (f.bmi.length) r.series.push({ key: "BMI", points: f.bmi });
  if (f.glucose.length) r.series.push({ key: "FASTING_GLUCOSE", points: f.glucose });
  const systolic = f.bp.filter((b) => b.systolic !== undefined).map((b) => ({ date: b.date, value: b.systolic!, unit: "mmHg" }));
  const diastolic = f.bp.filter((b) => b.diastolic !== undefined).map((b) => ({ date: b.date, value: b.diastolic!, unit: "mmHg" }));
  if (systolic.length) r.series.push({ key: "SYSTOLIC_BP", points: systolic });
  if (diastolic.length) r.series.push({ key: "DIASTOLIC_BP", points: diastolic });

  const best = bestDensity([f.hba1c, f.glucose, f.bmi]);
  r.density = best.density;

  const triggers: MessageRef[] = [];
  if (f.latestBmi !== null && f.latestBmi >= BMI.high) triggers.push(ref("v3.bmiHigh", CITE.NICE_1_9_1));
  if (f.latestBmi !== null && f.latestBmi < BMI.low) triggers.push(ref("v3.bmiLow", CITE.NICE_1_10_1));
  if (f.hba1cTrend === "rising" && f.hba1cLatestBand !== "normal") {
    triggers.push(ref("v3.hba1cRising", CITE.ASSUMPTION_CONFIG));
  } else if (f.hba1cLatestBand === "above") {
    triggers.push(ref("v3.hba1cAbove", CITE.ASSUMPTION_CONFIG));
  } else if (f.hba1cLatestBand === "prediabetes" && f.hba1cTrend !== "falling") {
    triggers.push(ref("v3.hba1cPrediabetes", CITE.ASSUMPTION_CONFIG));
  }
  if (f.smokesCurrently) triggers.push(ref("v3.smoking", f.isMale ? CITE.NICE_1_7 : CITE.NICE_1_7_1));

  // ASSUMPTION: a threshold crossed on available data outranks "not enough data"; the density
  // badge still says when it is a single reading.
  if (triggers.length) {
    r.state = "NEEDS_ATTENTION";
    r.reasons.push(...triggers);
  } else if (f.metabolicReadingsInWindow < 2) {
    r.reasons.push(ref(withdrew(r, "METABOLIC") ? "common.dataWithdrawn" : "v3.fewReadings"));
  } else if (f.hba1cTrend === "falling") {
    r.state = "IMPROVING";
    r.reasons.push(ref("v3.hba1cImproving", CITE.ASSUMPTION));
  } else {
    r.state = "STABLE";
    r.reasons.push(ref("v3.stable"));
  }
  if (!f.bmi.length && !f.hba1c.length && !f.glucose.length && !f.bp.length) {
    missingGap(r, "METABOLIC", "gap.noMetabolic");
  }
  return { result: r, primaryReadings: best.readings };
}

// ---------------------------------------------------------------------------
// V4 Male factor
// ---------------------------------------------------------------------------
const SEMEN_SERIES: SemenComponentKey[] = ["SPERM_CONCENTRATION", "PROGRESSIVE_MOTILITY", "TOTAL_MOTILITY", "SEMEN_VOLUME"];

export function computeV4(f: Facts, withdrawn: ConsentCategory[]): ComputedVector {
  const r = base("V4", withdrawn);
  if (f.age !== null) r.inputsUsed.push("AGE");
  if (f.semen.length) r.inputsUsed.push("SEMEN_ANALYSIS");
  if (f.bmi.length) r.inputsUsed.push("BMI");
  if (f.smokesCurrently || f.passiveSmoke) r.inputsUsed.push("SMOKING");
  if (f.heatExposure) r.inputsUsed.push("HEAT_EXPOSURE");
  if (f.hazardousOccupation) r.inputsUsed.push("OCCUPATION");
  for (const key of SEMEN_SERIES) {
    const points = f.semen
      .filter((s) => s.values[key] !== undefined)
      .map((s) => ({ date: s.date, value: s.values[key]!, unit: SEMEN_REFERENCE[key].unit }));
    if (points.length) r.series.push({ key, points });
  }
  r.density = densityOf(f.semen.map((s) => s.date));

  const latest = f.semen[f.semen.length - 1];
  const triggers: MessageRef[] = [];
  if (latest?.noSperm) triggers.push(ref("v4.noSperm", CITE.NICE_1_17_1));
  else if (latest?.abnormal) triggers.push(ref("v4.belowReference", CITE.NICE_1_17_1));
  if (f.heatExposure) triggers.push(ref("v4.heat", CITE.NICE_1_11_1));
  if (f.smokesCurrently) triggers.push(ref("v4.smoking", CITE.NICE_1_7));

  if (triggers.length) {
    r.state = "NEEDS_ATTENTION";
    r.reasons.push(...triggers);
  } else if (!latest) {
    r.reasons.push(ref(withdrew(r, "HORMONES_SEMEN") ? "common.dataWithdrawn" : "v4.noSemen"));
  } else {
    r.state = "STABLE";
    r.reasons.push(ref("v4.withinReference", CITE.NICE_1_17_1));
  }
  if (!latest) missingGap(r, "HORMONES_SEMEN", "gap.noSemen");
  return { result: r, primaryReadings: f.semen.length };
}

// ---------------------------------------------------------------------------
// V5 History-based risk
// ---------------------------------------------------------------------------
type HistoryKey = keyof HistoryItems;

const FEMALE_HISTORY: [HistoryKey, MessageRef["citation"]][] = [
  ["newCancerDiagnosis", CITE.ESHRE_FP],
  ["pastChemoOrRadiotherapy", CITE.ESHRE_FP],
  ["plannedOvarianSurgery", CITE.ESHRE_FP],
  ["pastOvarianSurgery", CITE.NICE_1_16],
  ["pastPelvicSurgery", CITE.NICE_1_16],
  ["pastPelvicInfection", CITE.NICE_1_16],
  ["pastEctopicPregnancy", CITE.NICE_1_16],
  ["endometriosis", CITE.NICE_1_16],
  ["familyEarlyMenopause", CITE.ESHRE_FP],
  ["geneticPoiRisk", CITE.ESHRE_FP],
];
const MALE_HISTORY: [HistoryKey, MessageRef["citation"]][] = [
  ["newCancerDiagnosis", CITE.ASSUMPTION_CLINICAL_LEAD],
  ["pastChemoOrRadiotherapy", CITE.NICE_1_16],
  ["undescendedTestes", CITE.NICE_1_16],
  ["genitalSurgeryOrTrauma", CITE.NICE_1_16],
];

function historyListFor(sex: Sex | null) {
  return sex === "male" ? MALE_HISTORY : sex === "female" ? FEMALE_HISTORY : [...FEMALE_HISTORY, ...MALE_HISTORY.slice(2)];
}

/** History items that count for a person of this sex (used by the V5 card and the history form). */
export function historyKeysFor(sex: Sex | null): HistoryKey[] {
  return historyListFor(sex).map(([k]) => k);
}

export function computeV5(f: Facts, history: HistoryItems | null, withdrawn: ConsentCategory[]): ComputedVector {
  const r = base("V5", withdrawn);
  if (history === null) {
    r.reasons.push(ref(withdrew(r, "HISTORY") ? "common.dataWithdrawn" : "v5.notFilled"));
    missingGap(r, "HISTORY", "gap.noHistory");
    return { result: r, primaryReadings: 0 };
  }
  r.inputsUsed.push("HISTORY");
  r.density = "BASELINE_ONLY";
  const list = historyListFor(f.sex);
  const present = list.filter(([k]) => history[k] === true);
  if (present.length) {
    r.state = "NEEDS_ATTENTION";
    r.reasons.push(ref("v5.riskPresent"));
    for (const [k, citation] of present) r.reasons.push(ref(`history.${k}`, citation));
  } else {
    r.state = "STABLE";
    r.reasons.push(ref("v5.none"));
  }
  return { result: r, primaryReadings: 0 };
}

/** Which vectors a person sees. V1 and V2 are hidden for men; V4 is shown to women only via a partner. */
export function visibleVectors(f: Facts, hasPartnerV4: boolean): VectorId[] {
  if (f.isMale) return ["V3", "V4", "V5"];
  if (f.isFemale) return hasPartnerV4 ? ["V1", "V2", "V3", "V4", "V5"] : ["V1", "V2", "V3", "V5"];
  return ["V3", "V5"];
}
