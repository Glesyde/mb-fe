// Deterministic rules R01–R40. Each rule returns a message KEY, never a sentence.
// No rule prescribes medication or books an appointment.

import { CITE } from "./citations";
import { BMI, RULE_THRESHOLDS as T } from "./config";
import type { Facts } from "./facts";
import type { Citation, ConsentCategory, EngineInput, PathwayId, Urgency, VectorId } from "./types";
import type { ComputedVector } from "./vectors";

export interface RuleContext {
  /** Consent-filtered input. */
  input: EngineInput;
  facts: Facts;
  vectors: Partial<Record<VectorId, ComputedVector>>;
  withdrawn: ConsentCategory[];
}

export interface Rule {
  id: string;
  description: string;
  /** Cards whose evidence drawer lists this rule when it fires. */
  vectors: VectorId[];
  applies: (ctx: RuleContext) => boolean;
  /** For per-vector rules (R39, R40): attach only to the vectors this returns true for. */
  appliesToVector?: (ctx: RuleContext, vector: VectorId) => boolean;
  output: { pathways: PathwayId[]; urgency: Urgency; messageKey: string };
  citation: Citation;
}

const has = (ctx: RuleContext, q: NonNullable<EngineInput["reproductive"]["questions"]>[number]) =>
  ctx.input.reproductive.questions?.includes(q) === true;
const h = (ctx: RuleContext) => ctx.input.history ?? {};
const female = (ctx: RuleContext) => ctx.facts.isFemale;
const male = (ctx: RuleContext) => ctx.facts.isMale;
const amhOrAfc = (ctx: RuleContext) => ctx.facts.amhRecent.length > 0 || ctx.facts.afcRecent.length > 0;
const ALL_DATA_VECTORS: VectorId[] = ["V1", "V2", "V3", "V4"];

export const RULES: Rule[] = [
  {
    id: "R01",
    description: "Any AMH, not in assisted conception: egg-number context only; no natural-pregnancy prediction",
    vectors: ["V1"],
    applies: (c) => c.facts.amhRecent.length > 0 && c.input.reproductive.assistedConception !== true,
    output: { pathways: [], urgency: "INFO", messageKey: "rule.R01" },
    citation: CITE.NICE_1_18_3_AND_STEINER,
  },
  {
    id: "R02",
    description: "AMH/AFC with assisted conception or egg freezing considered: informs response to stimulation",
    vectors: ["V1"],
    applies: (c) =>
      amhOrAfc(c) &&
      (c.input.reproductive.assistedConception === true || c.input.reproductive.eggFreezingConsidered === true),
    output: { pathways: [], urgency: "INFO", messageKey: "rule.R02" },
    citation: CITE.NICE_1_18_4,
  },
  {
    id: "R03",
    description: "Basal FSH result: do not use to predict ovarian response or IVF outcome",
    vectors: ["V1"],
    applies: (c) => c.facts.fsh.length > 0,
    output: { pathways: [], urgency: "INFO", messageKey: "rule.R03" },
    citation: CITE.NICE_1_18_5,
  },
  {
    id: "R04",
    description: "Age recorded: female and, to a lesser extent, male fertility declines with age",
    vectors: ["V1", "V4"],
    applies: (c) => c.facts.age !== null,
    output: { pathways: [], urgency: "INFO", messageKey: "rule.R04" },
    citation: CITE.NICE_1_4_3,
  },
  {
    id: "R05",
    description: "Woman <40, regular intercourse, no contraception, concerned: population figure for couples in general",
    vectors: [],
    applies: (c) => {
      const r = c.input.reproductive;
      const exposed = c.facts.trying || (r.regularIntercourse === true && r.usingContraception !== true);
      return female(c) && c.facts.age !== null && c.facts.age < T.r05MaxAgeExclusive && exposed && r.concerned === true;
    },
    output: { pathways: [], urgency: "INFO", messageKey: "rule.R05" },
    citation: CITE.NICE_1_4_1,
  },
  {
    id: "R06",
    description: "Woman ≥36 trying ≥6 months: earlier assessment",
    vectors: [],
    applies: (c) =>
      female(c) &&
      c.facts.age !== null &&
      c.facts.age >= T.r06MinAge &&
      (c.facts.monthsTrying ?? -1) >= T.r06MinMonthsTrying,
    output: { pathways: ["P5"], urgency: "ROUTINE", messageKey: "rule.R06" },
    citation: CITE.NICE_1_16_8,
  },
  {
    id: "R07",
    description: "Trying ≥12 months: assess both partners",
    vectors: [],
    applies: (c) => (c.facts.monthsTrying ?? -1) >= T.r07MinMonthsTrying,
    output: { pathways: ["P5"], urgency: "ROUTINE", messageKey: "rule.R07" },
    citation: CITE.NICE_1_16,
  },
  {
    id: "R08",
    description: "Woman with past pelvic infection, ectopic, endometriosis or pelvic surgery: earlier assessment",
    vectors: ["V5"],
    applies: (c) =>
      female(c) &&
      (h(c).pastPelvicInfection === true ||
        h(c).pastEctopicPregnancy === true ||
        h(c).endometriosis === true ||
        h(c).pastPelvicSurgery === true),
    output: { pathways: ["P5"], urgency: "ROUTINE", messageKey: "rule.R08" },
    citation: CITE.NICE_1_16,
  },
  {
    id: "R09",
    description: "Man with undescended testes, genital surgery/trauma, past chemo/radiotherapy: earlier assessment and semen analysis",
    vectors: ["V4", "V5"],
    applies: (c) =>
      male(c) &&
      (h(c).undescendedTestes === true || h(c).genitalSurgeryOrTrauma === true || h(c).pastChemoOrRadiotherapy === true),
    output: { pathways: ["P5"], urgency: "ROUTINE", messageKey: "rule.R09" },
    citation: CITE.NICE_1_16,
  },
  {
    id: "R10",
    description: "Cycles >35 days or absent: ovulation tests and specialist assessment",
    vectors: ["V2"],
    applies: (c) => female(c) && (c.facts.cyclesLong || c.facts.periodsAbsent),
    output: { pathways: ["P2", "P5"], urgency: "ROUTINE", messageKey: "rule.R10" },
    citation: CITE.NICE_1_18_6_AND_1_16,
  },
  {
    id: "R11",
    description: "Regular monthly cycles: reassure, likely ovulating",
    vectors: ["V2"],
    applies: (c) => female(c) && c.facts.cyclesRegular,
    output: { pathways: [], urgency: "INFO", messageKey: "rule.R11" },
    citation: CITE.NICE_1_18_6,
  },
  {
    id: "R12",
    description: "Irregular cycles, ovulation check wanted: mid-luteal progesterone",
    vectors: ["V2"],
    applies: (c) => female(c) && c.facts.cyclesIrregular && has(c, "OVULATION_CHECK"),
    output: { pathways: ["P2"], urgency: "ROUTINE", messageKey: "rule.R12" },
    citation: CITE.NICE_1_18_7,
  },
  {
    id: "R13",
    description: "Woman BMI ≥30: likely longer to conceive; if not ovulating, weight loss likely helps",
    vectors: ["V3"],
    applies: (c) => female(c) && c.facts.latestBmi !== null && c.facts.latestBmi >= BMI.high,
    output: { pathways: ["P1"], urgency: "ROUTINE", messageKey: "rule.R13" },
    citation: CITE.NICE_1_9_1,
  },
  {
    id: "R14",
    description: "BMI ≥30 and planning: group exercise and diet programme",
    vectors: ["V3"],
    applies: (c) => c.facts.latestBmi !== null && c.facts.latestBmi >= BMI.high && c.facts.planning,
    output: { pathways: ["P1"], urgency: "ROUTINE", messageKey: "rule.R14" },
    citation: CITE.NICE_1_9_2,
  },
  {
    id: "R15",
    description: "BMI <18.5 with irregular/absent periods: weight gain advice",
    vectors: ["V3"],
    applies: (c) => female(c) && c.facts.latestBmi !== null && c.facts.latestBmi < BMI.low && c.facts.cyclesIrregular,
    output: { pathways: ["P1"], urgency: "ROUTINE", messageKey: "rule.R15" },
    citation: CITE.NICE_1_10_1,
  },
  {
    id: "R16",
    description: "Woman smokes: smoking likely reduces fertility; cessation",
    vectors: ["V3"],
    applies: (c) => female(c) && c.facts.smokesCurrently,
    output: { pathways: ["P1"], urgency: "ROUTINE", messageKey: "rule.R16" },
    citation: CITE.NICE_1_7_1,
  },
  {
    id: "R17",
    description: "Man smokes or passive smoke: cessation, smoke-free home",
    vectors: ["V3", "V4"],
    applies: (c) => male(c) && (c.facts.smokesCurrently || c.facts.passiveSmoke),
    output: { pathways: ["P1"], urgency: "ROUTINE", messageKey: "rule.R17" },
    citation: CITE.NICE_1_7,
  },
  {
    id: "R18",
    description: "Alcohol recorded: alcohol advice",
    vectors: ["V3"],
    applies: (c) => c.facts.alcoholRecorded,
    output: { pathways: ["P1"], urgency: "ROUTINE", messageKey: "rule.R18" },
    citation: CITE.NICE_1_6,
  },
  {
    id: "R19",
    description: "Caffeine question: no consistent evidence of a link",
    vectors: [],
    applies: (c) => has(c, "CAFFEINE"),
    output: { pathways: [], urgency: "INFO", messageKey: "rule.R19" },
    citation: CITE.NICE_1_8_1,
  },
  {
    id: "R20",
    description: "Man with heat exposure: raised scrotal temperature linked to lower semen quality",
    vectors: ["V4"],
    applies: (c) => male(c) && c.facts.heatExposure,
    output: { pathways: ["P1"], urgency: "ROUTINE", messageKey: "rule.R20" },
    citation: CITE.NICE_1_11_1,
  },
  {
    id: "R21",
    description: "Hazardous occupation: ask about occupation; occupational health advice",
    vectors: ["V3", "V4"],
    applies: (c) => c.facts.hazardousOccupation,
    output: { pathways: ["P1"], urgency: "ROUTINE", messageKey: "rule.R21" },
    citation: CITE.NICE_1_12_1,
  },
  {
    id: "R22",
    description: "Semen analysis entered: compare with WHO reference values",
    vectors: ["V4"],
    applies: (c) => c.facts.semen.length > 0,
    output: { pathways: [], urgency: "INFO", messageKey: "rule.R22" },
    citation: CITE.NICE_1_17_1,
  },
  {
    id: "R23",
    description: "One abnormal semen analysis: repeat test, ideally 3 months later",
    vectors: ["V4"],
    applies: (c) => c.facts.abnormalSemenCount === 1 && c.facts.semen[c.facts.semen.length - 1]?.abnormal === true,
    output: { pathways: ["P2"], urgency: "ROUTINE", messageKey: "rule.R23" },
    citation: CITE.NICE_1_17_3_4,
  },
  {
    id: "R24",
    description: "Two or more abnormal analyses: examination; consider testosterone and gonadotrophins",
    vectors: ["V4"],
    applies: (c) => c.facts.abnormalSemenCount >= 2,
    output: { pathways: ["P5"], urgency: "ROUTINE", messageKey: "rule.R24" },
    citation: CITE.NICE_1_17_5,
  },
  {
    id: "R25",
    description: "No sperm on repeat analysis: andrology referral",
    vectors: ["V4"],
    applies: (c) => c.facts.noSpermCount >= 2,
    output: { pathways: ["P5"], urgency: "ROUTINE", messageKey: "rule.R25" },
    citation: CITE.NICE_1_17,
  },
  {
    id: "R26",
    description: "DNA fragmentation test asked for: not recommended",
    vectors: ["V4"],
    applies: (c) => has(c, "DNA_FRAGMENTATION"),
    output: { pathways: [], urgency: "INFO", messageKey: "rule.R26" },
    citation: CITE.NICE_1_17_6,
  },
  {
    id: "R27",
    description: "Symptoms of thyroid disease: offer thyroid test; no routine test without symptoms",
    vectors: [],
    applies: (c) => c.input.reproductive.thyroidSymptoms === true,
    output: { pathways: ["P2"], urgency: "ROUTINE", messageKey: "rule.R27" },
    citation: CITE.NICE_1_18_12,
  },
  {
    id: "R28",
    description: "Rubella status unknown (woman planning or trying): offer test; vaccinate if susceptible",
    vectors: [],
    applies: (c) => {
      const status = c.input.reproductive.rubellaStatus;
      return female(c) && c.facts.planning && (status === undefined || status === "unknown");
    },
    output: { pathways: ["P2"], urgency: "ROUTINE", messageKey: "rule.R28" },
    citation: CITE.NICE_1_20_1_2,
  },
  {
    id: "R29",
    description: "Planning pregnancy: folic acid advice",
    vectors: [],
    applies: (c) => female(c) && c.facts.planning,
    output: { pathways: ["P3"], urgency: "ROUTINE", messageKey: "rule.R29" },
    citation: CITE.NICE_1_15_1,
  },
  {
    id: "R30",
    description: "New cancer diagnosis before chemo/pelvic radiotherapy: URGENT fertility-preservation discussion",
    vectors: ["V5"],
    applies: (c) => female(c) && h(c).newCancerDiagnosis === true,
    output: { pathways: ["P4"], urgency: "URGENT", messageKey: "rule.R30" },
    citation: CITE.ESHRE_FP,
  },
  {
    id: "R31",
    description: "Planned ovarian surgery: preservation discussion before surgery",
    vectors: ["V5"],
    applies: (c) => female(c) && h(c).plannedOvarianSurgery === true,
    output: { pathways: ["P4"], urgency: "ROUTINE", messageKey: "rule.R31" },
    citation: CITE.ESHRE_FP,
  },
  {
    id: "R32",
    description: "Family history of early menopause / genetic POI risk: earlier planning discussion",
    vectors: ["V5"],
    applies: (c) => female(c) && (h(c).familyEarlyMenopause === true || h(c).geneticPoiRisk === true),
    output: { pathways: ["P4"], urgency: "ROUTINE", messageKey: "rule.R32" },
    citation: CITE.ESHRE_FP,
  },
  {
    id: "R33",
    description: "Considering egg freezing for age reasons: education and specialist discussion",
    vectors: ["V1"],
    applies: (c) =>
      female(c) &&
      c.input.reproductive.eggFreezingConsidered === true &&
      c.input.reproductive.eggFreezingForAge === true,
    output: { pathways: ["P4"], urgency: "ROUTINE", messageKey: "rule.R33" },
    citation: CITE.ESHRE_FP,
  },
  {
    id: "R34",
    description: "Low AMH for age, regular cycles, not trying: explain Steiner finding; offer planning discussion",
    vectors: ["V1"],
    applies: (c) => female(c) && c.facts.amhBandStatus === "below" && c.facts.cyclesRegular && !c.facts.trying,
    output: { pathways: [], urgency: "INFO", messageKey: "rule.R34" },
    citation: CITE.STEINER_AND_NICE_1_18_3,
  },
  {
    id: "R35",
    description: "Severe sudden one-sided pelvic pain + missed period / positive test / fainting: EMERGENCY, stop",
    vectors: [],
    applies: (c) => c.facts.redFlagR35,
    output: { pathways: ["P6"], urgency: "EMERGENCY", messageKey: "common.emergency" },
    citation: CITE.ASSUMPTION_CLINICAL_LEAD,
  },
  {
    id: "R36",
    description: "Bleeding after sex or between periods: urgent gynaecology assessment",
    vectors: [],
    applies: (c) => c.facts.redFlagR36,
    output: { pathways: ["P6"], urgency: "URGENT", messageKey: "rule.R36" },
    citation: CITE.ASSUMPTION_CLINICAL_LEAD,
  },
  {
    id: "R37",
    description: "HbA1c falling toward target across ≥2 readings: V3 IMPROVING",
    vectors: ["V3"],
    applies: (c) => c.facts.hba1cTrend === "falling",
    output: { pathways: [], urgency: "INFO", messageKey: "rule.R37" },
    citation: CITE.ASSUMPTION,
  },
  {
    id: "R38",
    description: "HbA1c rising into prediabetes range: V3 NEEDS_ATTENTION, P1 + doctor review",
    vectors: ["V3"],
    applies: (c) => c.facts.hba1cTrend === "rising" && c.facts.hba1cLatestBand !== "normal",
    output: { pathways: ["P1"], urgency: "ROUTINE", messageKey: "rule.R38" },
    citation: CITE.ASSUMPTION_CONFIG,
  },
  {
    id: "R39",
    description: "Only one reading for a vector: BASELINE_ONLY, no direction",
    vectors: ALL_DATA_VECTORS,
    applies: (c) => ALL_DATA_VECTORS.some((v) => c.vectors[v]?.primaryReadings === 1),
    appliesToVector: (c, v) => c.vectors[v]?.primaryReadings === 1,
    output: { pathways: [], urgency: "INFO", messageKey: "common.trendNeedsTwo" },
    citation: CITE.ASSUMPTION,
  },
  {
    id: "R40",
    description: "Consent withdrawn for a category: exclude data; card shows Data withdrawn",
    vectors: ALL_DATA_VECTORS,
    applies: (c) => c.withdrawn.length > 0,
    appliesToVector: (c, v) => c.vectors[v]?.result.dataWithdrawn === true,
    output: { pathways: [], urgency: "INFO", messageKey: "common.dataWithdrawn" },
    citation: CITE.DOH_RAI_3_1_6_1_3,
  },
];

export const RULES_BY_ID: Record<string, Rule> = Object.fromEntries(RULES.map((r) => [r.id, r]));
