// Derived facts: everything rules and vectors need, computed once from consent-filtered input.
// Missing data stays missing. Nothing here fills gaps with averages or estimates.

import { AMH_PMOL_PER_NG, convertAmh, findAmhBand, type AmhReferenceBand } from "./amhReference";
import { ALCOHOL_UNITS_PER_WEEK_RECORDED, CYCLE, DENSITY, HBA1C, SEMEN_REFERENCE, WINDOWS } from "./config";
import { daysBetween, isWithinMonths, monthsBetween, toDay } from "./dates";
import type { DensityBadge, EngineInput, ObservationKey, SemenComponentKey, SeriesPoint, Sex } from "./types";

export interface SemenFact {
  date: string;
  values: Partial<Record<SemenComponentKey, number>>;
  below: SemenComponentKey[];
  noSperm: boolean;
  abnormal: boolean;
}

export interface Facts {
  asOf: string;
  sex: Sex | null;
  isFemale: boolean;
  isMale: boolean;
  age: number | null;

  /** AMH in ng/mL, oldest first. */
  amh: SeriesPoint[];
  amhRecent: SeriesPoint[];
  amhLatestOnHormonalContraception: boolean;
  afc: SeriesPoint[];
  afcRecent: SeriesPoint[];
  fsh: SeriesPoint[];
  amhBand: AmhReferenceBand | null;
  amhBandStatus: "below" | "within" | "above" | null;

  hba1c: SeriesPoint[];
  glucose: SeriesPoint[];
  bmi: SeriesPoint[];
  bp: { date: string; systolic?: number; diastolic?: number }[];
  latestBmi: number | null;
  hba1cTrend: "falling" | "rising" | "flat" | null;
  hba1cLatestBand: "normal" | "prediabetes" | "above" | null;
  metabolicReadingsInWindow: number;

  semen: SemenFact[];
  abnormalSemenCount: number;
  noSpermCount: number;

  cycleStarts: string[];
  /** One point per complete cycle: start date and length in days. */
  cyclePoints: SeriesPoint[];
  cycleLengths: number[];
  cycleMedian: number | null;
  cycleVariation: number | null;
  cyclesShort: boolean;
  cyclesLong: boolean;
  cyclesVariable: boolean;
  periodsAbsent: boolean;
  /** Enough cycles and none of short / long / variable / absent. */
  cyclesRegular: boolean;
  /** Short, long, variable or absent. */
  cyclesIrregular: boolean;

  trying: boolean;
  monthsTrying: number | null;
  planning: boolean;
  smokesCurrently: boolean;
  passiveSmoke: boolean;
  alcoholRecorded: boolean;
  heatExposure: boolean;
  hazardousOccupation: boolean;

  redFlagR35: boolean;
  redFlagR36: boolean;
}

const byDate = (a: SeriesPoint, b: SeriesPoint) => a.date.localeCompare(b.date);

function series(input: EngineInput, key: ObservationKey, unitFilter?: (unit: string) => boolean): SeriesPoint[] {
  return input.observations
    .filter((o) => o.code.key === key && o.valueQuantity && Number.isFinite(o.valueQuantity.value))
    .filter((o) => !unitFilter || unitFilter(o.valueQuantity!.unit))
    .map((o) => ({
      date: toDay(o.effectiveDateTime),
      value: o.valueQuantity!.value,
      unit: o.valueQuantity!.unit,
      ...(o.derivation ? { derivation: o.derivation } : {}),
    }))
    .sort(byDate);
}

export function densityOf(dates: string[]): DensityBadge {
  const unique = Array.from(new Set(dates.map(toDay))).sort();
  if (unique.length === 0) return "NONE";
  const span = monthsBetween(unique[0], unique[unique.length - 1]);
  if (unique.length >= DENSITY.establishedMinReadings && span >= DENSITY.establishedMinSpanMonths) return "ESTABLISHED";
  if (unique.length >= DENSITY.trendMinReadings && span >= DENSITY.trendMinSpanMonths) return "TREND";
  return "BASELINE_ONLY";
}

function showsDirection(badge: DensityBadge): boolean {
  return badge === "TREND" || badge === "ESTABLISHED";
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function hba1cBand(value: number): "normal" | "prediabetes" | "above" {
  if (value < HBA1C.prediabetesMin) return "normal";
  if (value <= HBA1C.prediabetesMax) return "prediabetes";
  return "above";
}

export function deriveFacts(input: EngineInput, redFlags: { r35: boolean; r36: boolean }): Facts {
  const { asOf } = input;
  const sex = input.subject.sex;
  const age = input.subject.ageYears;

  // --- Reserve -------------------------------------------------------------
  const amhObs = input.observations
    .filter((o) => o.code.key === "AMH" && o.valueQuantity)
    .map((o) => ({ o, ng: convertAmh(o.valueQuantity!, "ng/mL") }))
    .filter((x): x is { o: (typeof x)["o"]; ng: number } => x.ng !== null)
    .sort((a, b) => a.o.effectiveDateTime.localeCompare(b.o.effectiveDateTime));
  const amh: SeriesPoint[] = amhObs.map(({ o, ng }) => ({
    date: toDay(o.effectiveDateTime),
    value: Math.round(ng * 100) / 100,
    unit: "ng/mL",
  }));
  const amhRecentObs = amhObs.filter(({ o }) => isWithinMonths(o.effectiveDateTime, asOf, WINDOWS.reserveMonths));
  const amhRecent = amh.filter((p) => isWithinMonths(p.date, asOf, WINDOWS.reserveMonths));
  const latestAmhObs = amhRecentObs[amhRecentObs.length - 1]?.o;
  const afc = series(input, "AFC");
  const afcRecent = afc.filter((p) => isWithinMonths(p.date, asOf, WINDOWS.reserveMonths));
  const amhBand = age !== null ? findAmhBand(age) : null;
  const latestAmh = amhRecent[amhRecent.length - 1];
  let amhBandStatus: Facts["amhBandStatus"] = null;
  if (amhBand && latestAmh) {
    const low = amhBand.unit === "ng/mL" ? amhBand.low : amhBand.low / AMH_PMOL_PER_NG;
    const high = amhBand.unit === "ng/mL" ? amhBand.high : amhBand.high / AMH_PMOL_PER_NG;
    amhBandStatus = latestAmh.value < low ? "below" : latestAmh.value > high ? "above" : "within";
  }

  // --- Metabolic ------------------------------------------------------------
  const hba1c = series(input, "HBA1C", (u) => u.trim() === HBA1C.unit);
  const glucose = series(input, "FASTING_GLUCOSE");
  const bmi = series(input, "BMI");
  const bpByDate = new Map<string, { date: string; systolic?: number; diastolic?: number }>();
  for (const o of input.observations) {
    if ((o.code.key !== "SYSTOLIC_BP" && o.code.key !== "DIASTOLIC_BP") || !o.valueQuantity) continue;
    const day = toDay(o.effectiveDateTime);
    const row = bpByDate.get(day) ?? { date: day };
    if (o.code.key === "SYSTOLIC_BP") row.systolic = o.valueQuantity.value;
    else row.diastolic = o.valueQuantity.value;
    bpByDate.set(day, row);
  }
  const bp = Array.from(bpByDate.values()).sort((a, b) => a.date.localeCompare(b.date));

  let hba1cTrend: Facts["hba1cTrend"] = null;
  const current = (d: string) => isWithinMonths(d, asOf, WINDOWS.metabolicTrendMonths);
  const hba1cWindow = hba1c.filter((p) => current(p.date));
  if (showsDirection(densityOf(hba1cWindow.map((p) => p.date)))) {
    const change = hba1cWindow[hba1cWindow.length - 1].value - hba1cWindow[0].value;
    hba1cTrend = change <= -HBA1C.minChange ? "falling" : change >= HBA1C.minChange ? "rising" : "flat";
  }
  const latestHba1c = hba1cWindow[hba1cWindow.length - 1];
  const bmiWindow = bmi.filter((p) => current(p.date));
  const inWindow = (d: string) => isWithinMonths(d, asOf, WINDOWS.metabolicMonths);
  const metabolicReadingsInWindow =
    hba1c.filter((p) => inWindow(p.date)).length +
    glucose.filter((p) => inWindow(p.date)).length +
    bmi.filter((p) => inWindow(p.date)).length +
    bp.filter((p) => inWindow(p.date)).length;

  // --- Semen ------------------------------------------------------------------
  const semen: SemenFact[] = input.observations
    .filter((o) => o.code.key === "SEMEN_ANALYSIS" && o.component?.length)
    .map((o) => {
      const values: SemenFact["values"] = {};
      for (const c of o.component!) values[c.code.key] = c.valueQuantity.value;
      const below = (Object.keys(values) as SemenComponentKey[]).filter(
        (k) => (values[k] as number) < SEMEN_REFERENCE[k].lowerLimit,
      );
      const noSperm = values.SPERM_CONCENTRATION === 0 || values.TOTAL_SPERM_NUMBER === 0;
      return { date: toDay(o.effectiveDateTime), values, below, noSperm, abnormal: below.length > 0 || noSperm };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  // --- Cycles -----------------------------------------------------------------
  const cycles = [...input.cycles].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const recentCycles = cycles.filter((c) => isWithinMonths(c.startDate, asOf, WINDOWS.cycleMonths));
  const cyclePoints: SeriesPoint[] = [];
  recentCycles.forEach((c) => {
    const next = cycles.find((n) => n.startDate > c.startDate);
    const length = typeof c.lengthDays === "number" ? c.lengthDays : next ? daysBetween(c.startDate, next.startDate) : null;
    if (length !== null) cyclePoints.push({ date: toDay(c.startDate), value: length, unit: "days" });
  });
  const cycleLengths = cyclePoints.map((p) => p.value);
  const periodsAbsent = input.reproductive.periodsAbsent === true;
  const enoughCycles = cycleLengths.length >= CYCLE.minCycles;
  const cycleMedian = enoughCycles ? median(cycleLengths) : null;
  const cycleVariation = enoughCycles ? Math.max(...cycleLengths) - Math.min(...cycleLengths) : null;
  const cyclesShort = cycleMedian !== null && cycleMedian < CYCLE.minDays;
  const cyclesLong = cycleMedian !== null && cycleMedian > CYCLE.maxDays;
  const cyclesVariable = cycleVariation !== null && cycleVariation > CYCLE.maxVariationDays;
  const cyclesIrregular = periodsAbsent || cyclesShort || cyclesLong || cyclesVariable;

  // --- Plans and lifestyle ------------------------------------------------------
  const r = input.reproductive;
  const trying = Boolean(r.tryingSince);
  const lifestyle = input.lifestyle ?? {};

  return {
    asOf,
    sex,
    isFemale: sex === "female",
    isMale: sex === "male",
    age,
    amh,
    amhRecent,
    amhLatestOnHormonalContraception: latestAmhObs?.context?.hormonalContraception === true,
    afc,
    afcRecent,
    fsh: series(input, "FSH"),
    amhBand,
    amhBandStatus,
    hba1c,
    glucose,
    bmi,
    bp,
    latestBmi: bmiWindow.length ? bmiWindow[bmiWindow.length - 1].value : null,
    hba1cTrend,
    hba1cLatestBand: latestHba1c ? hba1cBand(latestHba1c.value) : null,
    metabolicReadingsInWindow,
    semen,
    abnormalSemenCount: semen.filter((s) => s.abnormal).length,
    noSpermCount: semen.filter((s) => s.noSperm).length,
    cycleStarts: recentCycles.map((c) => c.startDate),
    cyclePoints,
    cycleLengths,
    cycleMedian,
    cycleVariation,
    cyclesShort,
    cyclesLong,
    cyclesVariable,
    periodsAbsent,
    cyclesRegular: enoughCycles && !cyclesIrregular,
    cyclesIrregular,
    trying,
    monthsTrying: r.tryingSince ? monthsBetween(r.tryingSince, asOf) : null,
    planning: trying || r.planningPregnancy === true,
    smokesCurrently: lifestyle.smoking === "current",
    passiveSmoke: lifestyle.passiveSmoke === true,
    alcoholRecorded: typeof lifestyle.alcoholUnitsPerWeek === "number" && lifestyle.alcoholUnitsPerWeek > ALCOHOL_UNITS_PER_WEEK_RECORDED,
    heatExposure: lifestyle.heatExposure === true,
    hazardousOccupation: lifestyle.hazardousOccupation === true,
    redFlagR35: redFlags.r35,
    redFlagR36: redFlags.r36,
  };
}
