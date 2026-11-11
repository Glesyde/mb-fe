// Reproductive Health engine: every threshold, window and code in one place.
// Each value names its source. ASSUMPTION = not from a guideline; needs clinical lead sign-off.

import type { ConsentCategory, ObservationKey, ReproductiveContext, SemenComponentKey } from "./types";

// ---------------------------------------------------------------------------
// Data density and time windows
// ---------------------------------------------------------------------------
export const DENSITY = {
  /** Spec: TREND = 2+ readings at least 6 months apart. */
  trendMinReadings: 2,
  trendMinSpanMonths: 6,
  /** Spec: ESTABLISHED = 3+ readings over at least 6 months. */
  establishedMinReadings: 3,
  establishedMinSpanMonths: 6,
} as const;

export const WINDOWS = {
  /** Spec V1: not enough data when no AMH/AFC in the last 24 months. */
  reserveMonths: 24,
  /** Spec V3: not enough data when fewer than 2 readings in 12 months. */
  metabolicMonths: 12,
  /** Spec V3. */
  metabolicMinReadings: 2,
  /** ASSUMPTION: HbA1c/BMI direction and "latest value" only use results from the last 24 months. */
  metabolicTrendMonths: 24,
  /** ASSUMPTION: only cycles that started in the last 12 months describe the current pattern. */
  cycleMonths: 12,
} as const;

// ---------------------------------------------------------------------------
// V2 Cycle and ovulation
// ---------------------------------------------------------------------------
export const CYCLE = {
  /** Spec V2 / NICE NG257 1.18.6 context: cycles under 24 or over 35 days. */
  minDays: 24,
  maxDays: 35,
  /** Spec V2: fewer than 3 cycles = not enough data. */
  minCycles: 3,
  /** ASSUMPTION: "high variation" = longest minus shortest cycle above this many days. */
  maxVariationDays: 7,
} as const;

// ---------------------------------------------------------------------------
// V3 Metabolic and lifestyle
// ---------------------------------------------------------------------------
export const BMI = {
  /** NICE NG257 1.9.1 / 1.9.2. */
  high: 30,
  /** NICE NG257 1.10.1 (verify). */
  low: 18.5,
} as const;

export const HBA1C = {
  /** ASSUMPTION (clinical lead to confirm local guidance): normal below 5.7 %. */
  prediabetesMin: 5.7,
  /** ASSUMPTION (clinical lead to confirm local guidance): prediabetes 5.7 to 6.4 %. */
  prediabetesMax: 6.4,
  /** ASSUMPTION: smallest change between first and latest result that counts as a direction. */
  minChange: 0.2,
  unit: "%",
} as const;

/** ASSUMPTION: "alcohol recorded" means more than this many units per week. */
export const ALCOHOL_UNITS_PER_WEEK_RECORDED = 0;

// ---------------------------------------------------------------------------
// V4 Male factor: WHO laboratory manual, 6th edition (2021), lower reference limits,
// as referred to by NICE NG257 1.17.1. verify against the manual before clinical use.
// ---------------------------------------------------------------------------
export const SEMEN_REFERENCE: Record<SemenComponentKey, { lowerLimit: number; unit: string }> = {
  SEMEN_VOLUME: { lowerLimit: 1.4, unit: "mL" }, // verify: WHO 2021
  SPERM_CONCENTRATION: { lowerLimit: 16, unit: "10*6/mL" }, // verify: WHO 2021
  TOTAL_SPERM_NUMBER: { lowerLimit: 39, unit: "10*6" }, // verify: WHO 2021
  TOTAL_MOTILITY: { lowerLimit: 42, unit: "%" }, // verify: WHO 2021 (progressive + non-progressive)
  PROGRESSIVE_MOTILITY: { lowerLimit: 30, unit: "%" }, // verify: WHO 2021
  NORMAL_FORMS: { lowerLimit: 4, unit: "%" }, // verify: WHO 2021
};

// ---------------------------------------------------------------------------
// Rule thresholds (NICE NG257 unless marked)
// ---------------------------------------------------------------------------
export const RULE_THRESHOLDS = {
  /** R05: NICE NG257 1.4.1, woman under 40. */
  r05MaxAgeExclusive: 40,
  /** R06: NICE NG257 1.16.8, woman 36 or over, trying 6 months or more (verify). */
  r06MinAge: 36,
  r06MinMonthsTrying: 6,
  /** R07: NICE NG257 section 1.16, trying 12 months or more (verify). */
  r07MinMonthsTrying: 12,
  /** R23: NICE NG257 1.17.3 to 1.17.4, repeat ideally 3 months later (verify). */
  r23RepeatAfterMonths: 3,
} as const;

// ---------------------------------------------------------------------------
// Consent: which category gates which data.
// ---------------------------------------------------------------------------
export const OBSERVATION_CATEGORY: Record<ObservationKey, ConsentCategory> = {
  AMH: "HORMONES_SEMEN",
  AFC: "HORMONES_SEMEN",
  FSH: "HORMONES_SEMEN",
  ESTRADIOL: "HORMONES_SEMEN",
  PROGESTERONE: "HORMONES_SEMEN",
  TSH: "HORMONES_SEMEN",
  SEMEN_ANALYSIS: "HORMONES_SEMEN",
  HBA1C: "METABOLIC",
  FASTING_GLUCOSE: "METABOLIC",
  BMI: "METABOLIC",
  SYSTOLIC_BP: "METABOLIC",
  DIASTOLIC_BP: "METABOLIC",
};

/** PROFILE holds only age and sex. It is required and cannot be withdrawn. */
export const REQUIRED_CATEGORIES: ConsentCategory[] = ["PROFILE"];

/**
 * ASSUMPTION: reproductive plans and consultation questions (trying since, planning, egg
 * freezing, caffeine / DNA-fragmentation questions) form their own withdrawable category, PLANS.
 * Absent periods are cycle data; thyroid symptoms and rubella status are history.
 * PARTNER_SHARING and CLINICIAN_SHARING control who may see results; they do not remove
 * data from this person's own evaluation.
 */
export const REPRODUCTIVE_FIELD_CATEGORY: Record<keyof ReproductiveContext, ConsentCategory> = {
  tryingSince: "PLANS",
  planningPregnancy: "PLANS",
  regularIntercourse: "PLANS",
  usingContraception: "PLANS",
  concerned: "PLANS",
  assistedConception: "PLANS",
  eggFreezingConsidered: "PLANS",
  eggFreezingForAge: "PLANS",
  questions: "PLANS",
  periodsAbsent: "CYCLES",
  thyroidSymptoms: "HISTORY",
  rubellaStatus: "HISTORY",
};

/** Which consent categories each vector depends on (for the "Data withdrawn" state). */
export const VECTOR_CATEGORIES = {
  V1: ["HORMONES_SEMEN"],
  V2: ["CYCLES"],
  V3: ["METABOLIC", "LIFESTYLE"],
  V4: ["HORMONES_SEMEN", "LIFESTYLE"],
  V5: ["HISTORY"],
} as const satisfies Record<string, ConsentCategory[]>;

// ---------------------------------------------------------------------------
// Codes. verify in LOINC/SNOMED browser before any real exchange.
// ---------------------------------------------------------------------------
export const LOINC = {
  AMH: "38476-8", // verify in LOINC/SNOMED browser
  FSH: "15067-2", // verify in LOINC/SNOMED browser
  ESTRADIOL: "2243-4", // verify in LOINC/SNOMED browser
  PROGESTERONE: "2839-9", // verify in LOINC/SNOMED browser
  TSH: "3016-3", // verify in LOINC/SNOMED browser
  HBA1C: "4548-4", // verify in LOINC/SNOMED browser
  BMI: "39156-5", // verify in LOINC/SNOMED browser
  SPERM_CONCENTRATION: "6800-1", // verify in LOINC/SNOMED browser
  SPERM_MOTILITY: "13942-8", // verify in LOINC/SNOMED browser
} as const;

export const SNOMED = {
  PCOS: "19829001", // verify in LOINC/SNOMED browser
  ENDOMETRIOSIS: "129103003", // verify in LOINC/SNOMED browser
  POI: "237788002", // verify in LOINC/SNOMED browser
} as const;

// ---------------------------------------------------------------------------
// Safety Guardrail Layer: medicine names that AI wording must never contain.
// ASSUMPTION: starter list, clinical lead to extend. Lower case; matched as whole words.
// ---------------------------------------------------------------------------
export const MEDICINE_BLOCKLIST: string[] = [
  "metformin",
  "clomifene",
  "clomiphene",
  "clomid",
  "letrozole",
  "femara",
  "tamoxifen",
  "cabergoline",
  "bromocriptine",
  "dhea",
  "inositol",
  "orlistat",
  "semaglutide",
  "ozempic",
  "sildenafil",
  "viagra",
  "ميتفورمين",
  "كلوميفين",
  "ليتروزول",
];

/** AI wording: give up and show template text after this many milliseconds. Spec. */
export const EXPLAIN_TIMEOUT_MS = 2500;
