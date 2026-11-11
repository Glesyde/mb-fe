// Reproductive Health engine: shared types.
// Pure data. No React, no network, no clock (every evaluation is relative to `asOf`).

export type Sex = "female" | "male";
export type Language = "en" | "ar";

export type VectorId = "V1" | "V2" | "V3" | "V4" | "V5";
export type VectorState = "IMPROVING" | "STABLE" | "NEEDS_ATTENTION" | "NOT_ENOUGH_DATA";
/** NONE = no readings at all. The other three are the badges defined in the spec. */
export type DensityBadge = "NONE" | "BASELINE_ONLY" | "TREND" | "ESTABLISHED";

export type PathwayId = "P1" | "P2" | "P3" | "P4" | "P5" | "P6";
export type Urgency = "INFO" | "ROUTINE" | "URGENT" | "EMERGENCY";

export type ConsentCategory =
  | "PROFILE"
  | "HISTORY"
  | "LIFESTYLE"
  | "PLANS"
  | "CYCLES"
  | "METABOLIC"
  | "HORMONES_SEMEN"
  | "WEARABLES"
  | "PARTNER_SHARING"
  | "CLINICIAN_SHARING";

export type DataSource = "HIS" | "ENTERED" | "WEARABLE" | "DEMO";

export type ObservationKey =
  | "AMH"
  | "AFC"
  | "FSH"
  | "ESTRADIOL"
  | "PROGESTERONE"
  | "TSH"
  | "HBA1C"
  | "FASTING_GLUCOSE"
  | "BMI"
  | "SYSTOLIC_BP"
  | "DIASTOLIC_BP"
  | "SEMEN_ANALYSIS";

export type SemenComponentKey =
  | "SEMEN_VOLUME"
  | "SPERM_CONCENTRATION"
  | "TOTAL_SPERM_NUMBER"
  | "TOTAL_MOTILITY"
  | "PROGRESSIVE_MOTILITY"
  | "NORMAL_FORMS";

export interface Coding {
  system: string;
  code: string;
  display?: string;
}

export interface Quantity {
  value: number;
  unit: string;
}

/** FHIR R4 Observation, trimmed to the fields the engine reads. `code.key` is our internal code. */
export interface Observation {
  resourceType: "Observation";
  id: string;
  code: { key: ObservationKey; coding?: Coding[]; text?: string };
  valueQuantity?: Quantity;
  /** Used for multi-part results (semen analysis). */
  component?: { code: { key: SemenComponentKey; coding?: Coding[] }; valueQuantity: Quantity }[];
  effectiveDateTime: string;
  /** Where the value came from. WEARABLE data is also gated by the WEARABLES consent category. */
  source: DataSource;
  /** "calculated" when derived from other values on the same reading (e.g. BMI from weight and height). */
  derivation?: "calculated";
  /** Context recorded with the sample. */
  context?: { hormonalContraception?: boolean };
}

export interface CycleRecord {
  startDate: string;
  /** Length of this cycle in days, if known. Otherwise derived from the next start date. */
  lengthDays?: number;
  source: DataSource;
}

export interface Lifestyle {
  smoking?: "current" | "former" | "never";
  passiveSmoke?: boolean;
  alcoholUnitsPerWeek?: number;
  heatExposure?: boolean;
  occupation?: string;
  hazardousOccupation?: boolean;
}

/** `null` on the input means the history has not been filled in. Absent fields mean "not recorded". */
export interface HistoryItems {
  newCancerDiagnosis?: boolean;
  pastChemoOrRadiotherapy?: boolean;
  pastOvarianSurgery?: boolean;
  plannedOvarianSurgery?: boolean;
  pastPelvicSurgery?: boolean;
  pastPelvicInfection?: boolean;
  pastEctopicPregnancy?: boolean;
  endometriosis?: boolean;
  familyEarlyMenopause?: boolean;
  geneticPoiRisk?: boolean;
  undescendedTestes?: boolean;
  genitalSurgeryOrTrauma?: boolean;
  pcos?: boolean;
}

export type QuestionTopic = "CAFFEINE" | "DNA_FRAGMENTATION" | "OVULATION_CHECK" | "EGG_FREEZING";

export interface ReproductiveContext {
  /** ISO date the person started trying to conceive. Absent = not trying. */
  tryingSince?: string;
  planningPregnancy?: boolean;
  regularIntercourse?: boolean;
  usingContraception?: boolean;
  concerned?: boolean;
  assistedConception?: boolean;
  eggFreezingConsidered?: boolean;
  eggFreezingForAge?: boolean;
  periodsAbsent?: boolean;
  thyroidSymptoms?: boolean;
  rubellaStatus?: "immune" | "susceptible" | "unknown";
  questions?: QuestionTopic[];
}

export type RedFlag = "R35" | "R36";

/**
 * Symptoms are not a consent category and are never carried into the evaluation or stored.
 * The red-flag check runs on them at entry time whatever the consent settings; only the
 * resulting red flags are kept (see EngineInput.openRedFlags).
 */
export interface Symptoms {
  /** Free text is run through the Safety Guardrail Layer input check before anything else. */
  freeText?: string;
  severeOneSidedPelvicPain?: boolean;
  missedPeriod?: boolean;
  positivePregnancyTest?: boolean;
  fainting?: boolean;
  bleedingAfterSex?: boolean;
  bleedingBetweenPeriods?: boolean;
}

export type ConsentState = Record<ConsentCategory, boolean>;

export interface EngineInput {
  /** Evaluation date (ISO). The engine never reads the clock. */
  asOf: string;
  subject: { sex: Sex | null; ageYears: number | null };
  observations: Observation[];
  cycles: CycleRecord[];
  lifestyle: Lifestyle | null;
  history: HistoryItems | null;
  reproductive: ReproductiveContext;
  symptoms: Symptoms;
  /** Red flags found at entry time and not yet resolved by a clinician. */
  openRedFlags?: RedFlag[];
  consent: ConsentState;
}

/** A message catalogue key plus optional values to interpolate. The engine never returns sentences. */
export interface MessageRef {
  key: string;
  params?: Record<string, string | number>;
  citation?: Citation;
}

export interface Citation {
  source: string;
  ref: string;
  verified: boolean;
}

export interface SeriesPoint {
  date: string;
  value: number;
  unit: string;
  derivation?: "calculated";
}

export interface ReferenceBandInfo {
  ageMin: number;
  ageMax: number;
  low: number;
  high: number;
  unit: string;
  assay: string;
  source: string;
  placeholder: boolean;
}

export interface VectorResult {
  vector: VectorId;
  state: VectorState;
  /** True when consent for a category this vector uses was withdrawn. Card shows "Data withdrawn". */
  dataWithdrawn: boolean;
  /** Which of this vector's categories were withdrawn (or, for a partner, not shared). */
  withdrawnCategories: ConsentCategory[];
  density: DensityBadge;
  inputsUsed: string[];
  reasons: MessageRef[];
  gaps: MessageRef[];
  ruleIds: string[];
  citations: Citation[];
  series: { key: string; points: SeriesPoint[] }[];
  referenceBand?: ReferenceBandInfo;
  /** V4 on a woman's record, built only from what a linked partner shared. */
  fromPartner?: boolean;
}

export interface FiredRule {
  id: string;
  messageKey: string;
  pathways: PathwayId[];
  urgency: Urgency;
  citation: Citation;
}

export interface NextStep {
  pathway: PathwayId;
  urgency: Urgency;
  items: { ruleId: string; messageKey: string; citation: Citation }[];
}

export interface EngineResult {
  asOf: string;
  /** R35 fired: all other processing stopped. Only the P6 step is returned. */
  emergency: boolean;
  /** Processing stopped after stage 2 (R35, or any red flag with haltOnAnyRedFlag). */
  halted: boolean;
  redFlags: string[];
  vectors: VectorResult[];
  nextSteps: NextStep[];
  /**
   * "For your partner": rules that fired on a linked partner's shared categories only, in pathway
   * priority order (information-only rules last). Never includes the partner's red flags.
   */
  partnerSteps: FiredRule[];
  firedRules: FiredRule[];
  withdrawnCategories: ConsentCategory[];
  /** True when any AMH reference band in use is a placeholder. UI shows the sign-off banner. */
  placeholderReferenceInUse: boolean;
  gaps: MessageRef[];
  /** Stages 1–6 of "How this result was reached". */
  trace: import("./trace").TraceEntry[];
}

export interface PartnerShare {
  input: EngineInput;
  /** Categories the partner chose to share with this person. PARTNER_SHARING must also be granted. */
  sharedCategories: ConsentCategory[];
}

export interface EvaluateOptions {
  partner?: PartnerShare;
  /** Stop after stage 2 on R36 as well as R35 (the chart does this: the emergency panel pauses the view). */
  haltOnAnyRedFlag?: boolean;
  /** For trace durations only. Without it durations are 0, so results stay deterministic. */
  clock?: () => number;
  /** Counts from mapping EMR data, shown in the stage 3 trace entry. */
  mappingSummary?: string;
}
