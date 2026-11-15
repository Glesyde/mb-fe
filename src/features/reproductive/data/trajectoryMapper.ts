// Maps the HIS response of GET /clinical/trajectory to what the engine reads: profile, lab
// observations and consent. Only values that exist are read; nothing is estimated. Anything that
// cannot be read cleanly is listed in `skipped` with the reason.
//
// Not used: the backend explanation (our own template wording is used).

import type {
  ConsentCategory,
  CycleRecord,
  DataSource,
  HistoryItems,
  Lifestyle,
  Observation,
  ObservationKey,
  QuestionTopic,
  RedFlag,
  ReproductiveContext,
  SemenComponentKey,
  Sex,
} from "../engine/types";
import { LAB_NAME_PATTERNS, type MappedProfile, type Skipped } from "./mappers";
import { ageAt, ALL_CATEGORIES, makeObservation, makeSemenObservation } from "./records";
import type { ActivityAction, ActivityEntry, Actor, ConsentResource, RedFlagEvent } from "./repository";

/** Semen parameters by the code the HIS sends (LOINC). */
const SEMEN_BY_CODE: Record<string, SemenComponentKey> = {
  "3155-9": "SEMEN_VOLUME",
  "6800-1": "SPERM_CONCENTRATION",
  "9781-6": "TOTAL_SPERM_NUMBER",
  "13942-8": "TOTAL_MOTILITY",
  "13943-6": "PROGRESSIVE_MOTILITY",
  "13944-4": "NORMAL_FORMS",
};

const SEMEN_UNITS: Record<SemenComponentKey, RegExp> = {
  SEMEN_VOLUME: /^ml$/i,
  SPERM_CONCENTRATION: /million|10\^?\*?6|x\s*10/i,
  TOTAL_SPERM_NUMBER: /million|10\^?\*?6|x\s*10/i,
  TOTAL_MOTILITY: /^%$/,
  PROGRESSIVE_MOTILITY: /^%$/,
  NORMAL_FORMS: /^%$/,
};

/** FSH is only read in IU/L (= mIU/mL). Any other unit is skipped, never converted. */
const FSH_UNITS = /^(iu\/l|miu\/ml)$/i;

/** Only released results are used. */
const FINAL_STATUS = /^(RELEASED|VERIFIED|COMPLETED|FINAL)$/i;

export interface MappedTrajectory {
  mrn: string;
  profile: MappedProfile;
  observations: Observation[];
  matched: { parameter: string; mappedTo: string; count: number }[];
  skipped: Skipped[];
  consent: {
    /** True when a clinician has confirmed consent in the HIS. */
    confirmed: boolean;
    resource: ConsentResource;
    consented: ConsentCategory[];
    /** Who recorded the consent in the HIS. */
    recordedBy: Actor | null;
  };
  /** Consent activity from the HIS, newest first, in the tab's own log format. */
  activity: ActivityEntry[];
  /** The HIS flagged this patient for an emergency stop. */
  emergencyHalt: boolean;
  /** Needed to place orders. Null when the HIS sent none. */
  encounterId: number | null;
  /** Orders not finished yet, so the same test is not ordered twice. */
  pendingOrders: HisOrder[];
  /** Tests the HIS itself suggests (`recommended_diagnostics`), if any. */
  recommended: { testName: string; loinc: string; source: string; reason: string }[];
  /** Referrals already sent to the HIS, newest first. */
  referrals: HisReferral[];
  /** Entered sections. `null` = the HIS sent no such section (older backend). */
  lifestyle: Lifestyle | null;
  /** `completed: false` = history not filled in yet. */
  history: { completed: boolean; items: HistoryItems; updatedAt: string | null } | null;
  plans: ReproductiveContext | null;
  cycles: CycleRecord[] | null;
  /** Open red flags only; resolved ones stay in the HIS log. */
  redFlags: RedFlagEvent[] | null;
  /**
   * The sections exactly as the HIS sent them. A save starts from these, so fields the tab does not
   * edit (e.g. sticks per day, fibroids) are sent back unchanged instead of being cleared.
   */
  raw: { lifestyle: Record<string, unknown>; historyItems: Record<string, unknown>; plans: Record<string, unknown> };
  /** Partner link as the HIS holds it. `null` = no link (or an older backend). */
  partner: HisPartnerLink | null;
}

export interface HisPartnerLink {
  /** PENDING_THEM: this patient asked; PENDING_YOU: the partner asked; LINKED: both agreed. */
  status: "PENDING_THEM" | "PENDING_YOU" | "LINKED";
  partnerId: string;
  youShare: ConsentCategory[];
  theyShare: ConsentCategory[];
}

/** Status words the HIS may use. Anything else (e.g. NONE, REVOKED) means no link. */
const PARTNER_STATUS: Record<string, HisPartnerLink["status"]> = {
  PENDING_THEM: "PENDING_THEM",
  REQUESTED: "PENDING_THEM",
  REQUEST_SENT: "PENDING_THEM",
  PENDING: "PENDING_THEM",
  PENDING_YOU: "PENDING_YOU",
  INVITED: "PENDING_YOU",
  REQUEST_RECEIVED: "PENDING_YOU",
  LINKED: "LINKED",
  ACTIVE: "LINKED",
  ACCEPTED: "LINKED",
};

function mapPartner(data: Record<string, any>): HisPartnerLink | null {
  const p = data.partner_link;
  if (!isObj(p)) return null;
  const status = PARTNER_STATUS[str(p.status).toUpperCase()];
  const partnerId = str(p.partnerId) || str(p.partner_mrn) || str(p.partner_id);
  if (!status || !partnerId) return null;
  return { status, partnerId, youShare: categories(p.shared_by_you), theyShare: status === "LINKED" ? categories(p.shared_by_them) : [] };
}

/** Red flag ids from the HIS are kept as "HIS-rf-<id>" so they can be resolved there. */
export const HIS_RED_FLAG_PREFIX = "HIS-rf-";
export function hisRedFlagId(eventId: string): number | null {
  return eventId.startsWith(HIS_RED_FLAG_PREFIX) ? num(eventId.slice(HIS_RED_FLAG_PREFIX.length)) : null;
}

export interface HisReferral {
  id: string;
  doctor: string;
  specialty: string;
  createdAt: string;
  reason: string;
  status: string;
}

export interface HisOrder {
  id: string;
  name: string;
  code: string;
  status: string;
  orderedAt: string;
}

const isObj = (v: unknown): v is Record<string, any> => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && /^\s*-?\d+(\.\d+)?\s*$/.test(v)) return Number(v);
  return null;
};
const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
/** "2026-11-12 17:00:54" → "2026-11-12T17:00:54". Anything that is not a date → null. */
const isoDate = (v: unknown): string | null => {
  const s = str(v);
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.replace(" ", "T") : null;
};
const actorOf = (v: unknown): Actor | null =>
  isObj(v) && (v.id !== undefined || v.name) ? { id: String(v.id ?? "unknown"), name: str(v.name) || "HIS user" } : null;

function mapSex(v: unknown): Sex | null {
  const g = str(v).toLowerCase();
  return g === "female" || g === "f" ? "female" : g === "male" || g === "m" ? "male" : null;
}

const CATEGORY_SET = new Set<string>(ALL_CATEGORIES);
const categories = (v: unknown): ConsentCategory[] =>
  Array.isArray(v) ? (v.filter((c) => typeof c === "string" && CATEGORY_SET.has(c)) as ConsentCategory[]) : [];

/** Unwraps `{ status: "success", data: {...} }`; throws if the response is not usable. */
export function trajectoryData(response: unknown): Record<string, any> {
  const body = isObj(response) && isObj(response.data) && "status" in response ? response.data : response;
  if (!isObj(body) || (isObj(response) && response.status !== undefined && response.status !== "success")) {
    throw new Error("The HIS did not return reproductive health data for this patient.");
  }
  return body;
}

function mapProfile(data: Record<string, any>, asOf: string): MappedProfile {
  const entries: any[] = Array.isArray(data.fhir_bundle_preview?.entry) ? data.fhir_bundle_preview.entry : [];
  const patient = entries.find((e) => e?.resourceType === "Patient") ?? {};
  const birthDate = /^\d{4}-\d{2}-\d{2}$/.test(str(patient.birthDate)) ? str(patient.birthDate) : null;
  const fromDob = birthDate ? ageAt(birthDate, asOf) : null;
  const reported = num(data.patient_age);
  const fromReported = fromDob === null && reported !== null && reported >= 0 ? reported : null;
  return {
    mrn: str(data.patient_mrn) || str(data.patient_id) || null,
    sex: mapSex(patient.gender) ?? mapSex(data.patient_gender),
    ageYears: fromDob ?? fromReported,
    ageSource: fromDob !== null ? "date_of_birth" : fromReported !== null ? "display_age" : null,
  };
}

function mapTrends(data: Record<string, any>) {
  const observations: Observation[] = [];
  const skipped: Skipped[] = [];
  const matched = new Map<string, { parameter: string; mappedTo: string; count: number }>();
  const note = (parameter: string, mappedTo: string) => {
    const m = matched.get(`${parameter}→${mappedTo}`) ?? { parameter, mappedTo, count: 0 };
    m.count++;
    matched.set(`${parameter}→${mappedTo}`, m);
  };
  // Semen parameters are grouped back into one analysis per lab order.
  const semen = new Map<string, { date: string; values: Partial<Record<SemenComponentKey, number>>; units: Partial<Record<SemenComponentKey, string>> }>();

  const trends = isObj(data.historical_trends) ? Object.values(data.historical_trends) : [];
  for (const trend of trends) {
    if (!isObj(trend)) continue;
    const name = str(trend.parameter_name) || str(trend.short_name) || "lab";
    const semenKey = SEMEN_BY_CODE[str(trend.code)];
    const rule = semenKey ? null : LAB_NAME_PATTERNS.find((p) => p.pattern.test(name) || p.pattern.test(str(trend.short_name)));
    if (!semenKey && !rule) continue; // Not used by this tool (e.g. Rubella IgG, full blood count).

    for (const point of Array.isArray(trend.series) ? trend.series : []) {
      const value = num(point?.value);
      const unit = str(point?.unit) || str(trend.unit);
      const date = isoDate(point?.timestamps?.effective_at) ?? isoDate(point?.timestamps?.released_at);
      const status = str(point?.workflow_status);
      const why =
        value === null ? "not a plain number"
        : !date ? "no result date"
        : status && !FINAL_STATUS.test(status) ? `status ${status}`
        : value < 0 ? "below zero"
        : unit === "%" && value > 100 ? "a percentage above 100"
        : !unit ? "no unit"
        : semenKey && !SEMEN_UNITS[semenKey].test(unit) ? `unit "${unit}" not recognised`
        : rule?.key === "FSH" && !FSH_UNITS.test(unit) ? `unit "${unit}" not recognised`
        : rule?.units && !rule.units.test(unit) ? `unit "${unit}" not used by this tool`
        : null;
      if (why) {
        skipped.push({ name: `${name}${value !== null ? ` ${value} ${unit}` : ""}`, reason: why });
        continue;
      }
      if (semenKey) {
        const order = String(point.order_id ?? point.reference_no ?? date);
        const group = semen.get(order) ?? { date: date!, values: {}, units: {} };
        if (date! > group.date) group.date = date!;
        group.values[semenKey] = value!;
        group.units[semenKey] = unit;
        semen.set(order, group);
      } else {
        observations.push(makeObservation(`HIS-trend-${point.entry_id ?? `${rule!.key}-${date}`}`, rule!.key as ObservationKey, value!, unit, date!, "HIS"));
      }
      note(name, semenKey ?? rule!.key);
    }
  }
  for (const [order, g] of semen) observations.push(makeSemenObservation(`HIS-semen-${order}`, g.date, g.values, "HIS", g.units));

  // BMI from the FHIR preview, only when it carries its own date.
  const entries: any[] = Array.isArray(data.fhir_bundle_preview?.entry) ? data.fhir_bundle_preview.entry : [];
  entries
    .filter((e) => e?.resourceType === "Observation" && e?.code?.coding?.some((c: any) => c?.code === "39156-5"))
    .forEach((e, i) => {
      const value = num(e.valueQuantity?.value);
      const date = isoDate(e.effectiveDateTime);
      if (value === null || value <= 0) return void skipped.push({ name: "BMI", reason: "not a plain number" });
      if (!date) return void skipped.push({ name: `BMI ${value}`, reason: "no date" });
      observations.push(makeObservation(`HIS-bmi-${i}-${date}`, "BMI", value, "kg/m2", date, "HIS"));
      note("BMI", "BMI");
    });

  return { observations, skipped, matched: Array.from(matched.values()) };
}

function mapConsent(data: Record<string, any>, today: string): MappedTrajectory["consent"] {
  const details = isObj(data.consent_details) ? data.consent_details : {};
  const consented = categories(data.consented_categories ?? details.consented_categories);
  const provisions: any[] = Array.isArray(details.provision) ? details.provision : [];
  const fallbackAt = isoDate(details.dateTime) ?? today;
  const recordedBy = actorOf(details.recorded_by);
  return {
    confirmed: data.consent_confirmed === true,
    consented,
    recordedBy,
    resource: {
      resourceType: "Consent",
      id: `${str(data.patient_mrn) || str(data.patient_id)}-consent`,
      status: "active",
      provision: ALL_CATEGORIES.map((category) => {
        const p = provisions.find((x) => x?.category === category);
        return {
          category,
          // The consented list is the source of truth; PROFILE (age and sex) is always on.
          type: category === "PROFILE" || consented.includes(category) ? ("permit" as const) : ("deny" as const),
          updatedAt: isoDate(p?.updatedAt) ?? fallbackAt,
          updatedBy: actorOf(p?.updatedBy) ?? recordedBy ?? { id: "unknown", name: "HIS" },
          ...(str(p?.reason) ? { reason: str(p.reason) } : {}),
        };
      }),
    },
  };
}

/** Non-consent events the HIS writes into the same log, with the tab's wording. */
const OTHER_EVENTS: { pattern: RegExp; action: ActivityAction; text: string }[] = [
  { pattern: /^REPRO_PARTNER_LINK_REQUESTED$/, action: "PARTNER_LINK_REQUESTED", text: "Partner link requested" },
  { pattern: /^REPRO_PARTNER_LINK_ACCEPTED$/, action: "PARTNER_LINK_ACCEPTED", text: "Partner link accepted" },
  { pattern: /^REPRO_PARTNER_LINK_DECLINED$/, action: "PARTNER_LINK_DECLINED", text: "Partner link declined" },
  { pattern: /^REPRO_PARTNER_LINK_(REVOKED|CANCELLED|CANCELED|ENDED)$/, action: "PARTNER_LINK_ENDED", text: "Partner link ended" },
  { pattern: /^REPRO_PARTNER_SHARING/, action: "PARTNER_SHARING_CHANGED", text: "Partner sharing changed" },
  { pattern: /^REPRO_RED_FLAG_TRIGGERED$/, action: "RED_FLAG_RAISED", text: "Red flag raised" },
  { pattern: /^REPRO_RED_FLAG_DISMISSED$/, action: "RED_FLAG_RESOLVED", text: "Red flag marked not present" },
  { pattern: /^REPRO_RED_FLAG_/, action: "RED_FLAG_RESOLVED", text: "Red flag acknowledged and referred" },
  { pattern: /^REPRO_HISTORY_/, action: "HISTORY_UPDATED", text: "History updated" },
  { pattern: /^REPRO_LIFESTYLE_/, action: "LIFESTYLE_UPDATED", text: "Lifestyle updated" },
  { pattern: /^REPRO_PLANS_/, action: "PLANS_UPDATED", text: "Plans and questions updated" },
];
/** Generic reasons the HIS writes that add nothing for the reader. */
const GENERIC_REASON = /^updated in patient chart$/i;

function mapActivity(data: Record<string, any>): ActivityEntry[] {
  const log: any[] = Array.isArray(data.consent_activity_log) ? data.consent_activity_log : [];
  return log.flatMap((a, i) => {
    const at = isoDate(a?.at);
    if (!at) return [];
    const action = str(a?.action);
    const reason = str(a?.reason);
    const base = { id: `HIS-log-${a?.id ?? i}`, at, by: actorOf(a?.by) ?? { id: "unknown", name: "HIS" } };
    const other = OTHER_EVENTS.find((e) => e.pattern.test(action));
    if (other) {
      return [{ ...base, action: other.action, detail: `${other.text}${reason && !GENERIC_REASON.test(reason) ? `: ${reason}` : ""}` }];
    }
    if (action && !/^REPRO_CONSENT_/.test(action)) {
      return [{ ...base, action: "CONSENT_CHANGED" as const, detail: `${action.replace(/^REPRO_/, "").replace(/_/g, " ").toLowerCase()}` }];
    }
    const category = CATEGORY_SET.has(a?.category) ? (a.category as ConsentCategory) : undefined;
    const detail = category
      ? `${a?.granted ? "Shared" : "Withdrawn"}${reason ? `: ${reason}` : ""}`
      : `${action === "REPRO_CONSENT_CONFIRMED" ? "Consent confirmed" : "Consent updated"}. Shared: ${categories(a?.consented_categories).join(", ") || "none"}${reason ? `. ${reason}` : ""}`;
    return [
      {
        ...base,
        action: action === "REPRO_CONSENT_CONFIRMED" ? ("CONSENT_CAPTURED" as const) : ("CONSENT_CHANGED" as const),
        detail,
        ...(category ? { category } : {}),
      },
    ];
  });
}

// --- Entered sections ------------------------------------------------------------------------------
const bool = (v: unknown): boolean | undefined => (typeof v === "boolean" ? v : undefined);
/** Copies only the fields that are present, so "not answered" stays absent. */
function defined<T extends object>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
}

function mapLifestyle(data: Record<string, any>): Lifestyle | null {
  const c = data.lifestyle?.current;
  if (!isObj(c) || !str(c.updated_at)) return null; // not filled in yet
  const smoking = str(c.smoking_status).toLowerCase();
  const units = num(c.alcohol_units_per_week);
  return defined<Lifestyle>({
    smoking: smoking === "current" || smoking === "former" || smoking === "never" ? smoking : undefined,
    passiveSmoke: bool(c.passive_smoke),
    alcoholUnitsPerWeek: units !== null && units >= 0 ? units : undefined,
    heatExposure: bool(c.heat_exposure),
    occupation: str(c.occupation) || undefined,
    hazardousOccupation: bool(c.hazardous_occupation),
  });
}

/** The history items this tool's rules use. Others the HIS sends (e.g. fibroids) are kept there only. */
const HISTORY_KEYS: (keyof HistoryItems)[] = [
  "newCancerDiagnosis",
  "pastChemoOrRadiotherapy",
  "pastOvarianSurgery",
  "plannedOvarianSurgery",
  "pastPelvicSurgery",
  "pastPelvicInfection",
  "pastEctopicPregnancy",
  "endometriosis",
  "familyEarlyMenopause",
  "geneticPoiRisk",
  "undescendedTestes",
  "genitalSurgeryOrTrauma",
  "pcos",
];

function mapHistory(data: Record<string, any>): MappedTrajectory["history"] {
  const h = data.history;
  if (!isObj(h)) return null;
  const items: HistoryItems = {};
  for (const k of HISTORY_KEYS) if (typeof h.items?.[k] === "boolean") items[k] = h.items[k];
  return { completed: h.history_completed === true, items, updatedAt: isoDate(h.updated_at) };
}

function mapRubella(v: unknown): ReproductiveContext["rubellaStatus"] {
  const r = str(v).toUpperCase().replace(/[\s-]+/g, "_");
  if (r === "IMMUNE") return "immune";
  if (r === "NON_IMMUNE" || r === "NOT_IMMUNE" || r === "SUSCEPTIBLE") return "susceptible";
  return "unknown"; // NOT_RECORDED, empty or anything else
}

function mapPlans(data: Record<string, any>): ReproductiveContext | null {
  const p = data.plans_and_questions;
  if (!isObj(p) || !str(p.updated_at)) return null; // never saved
  const questions: QuestionTopic[] = [];
  if (p.asked_about_caffeine === true) questions.push("CAFFEINE");
  if (p.asked_for_dna_fragmentation === true) questions.push("DNA_FRAGMENTATION");
  if (p.wants_ovulation_check === true) questions.push("OVULATION_CHECK");
  if (p.asked_about_egg_freezing === true) questions.push("EGG_FREEZING");
  const trying = /^\d{4}-\d{2}-\d{2}/.test(str(p.trying_since)) ? str(p.trying_since).slice(0, 10) : undefined;
  return defined<ReproductiveContext>({
    tryingSince: trying,
    planningPregnancy: bool(p.planning_pregnancy),
    regularIntercourse: bool(p.regular_intercourse),
    usingContraception: bool(p.using_contraception),
    concerned: bool(p.concerned_about_fertility),
    assistedConception: bool(p.in_assisted_conception),
    eggFreezingConsidered: bool(p.considering_egg_freezing),
    eggFreezingForAge: bool(p.egg_freezing_for_age),
    periodsAbsent: bool(p.periods_absent),
    thyroidSymptoms: bool(p.thyroid_symptoms),
    rubellaStatus: mapRubella(p.rubella_status),
    questions: questions.length ? questions : undefined,
  });
}

/** Cycle records only. The HIS's own predictions (next period, fertile window) are never used. */
function mapCycles(data: Record<string, any>): CycleRecord[] | null {
  const c = data.cycle_records;
  if (!isObj(c)) return null;
  const records: any[] = Array.isArray(c.records) ? c.records : [];
  return records.flatMap((r) => {
    const start = str(r?.start_date) || str(r?.startDate) || str(r?.started_at);
    if (!/^\d{4}-\d{2}-\d{2}/.test(start)) return [];
    const length = num(r?.length_days ?? r?.lengthDays);
    const src = str(r?.source).toUpperCase();
    const source: DataSource = src === "WEARABLE" ? "WEARABLE" : src === "HIS" ? "HIS" : "ENTERED";
    return [{ startDate: start.slice(0, 10), ...(length !== null && length > 0 ? { lengthDays: length } : {}), source }];
  });
}

function mapRedFlags(data: Record<string, any>): RedFlagEvent[] | null {
  const r = data.red_flags;
  if (!isObj(r)) return null;
  const open: any[] = Array.isArray(r.open) ? r.open : [];
  return open.flatMap((f) => {
    const rule = str(f?.rule_id).toUpperCase();
    if ((rule !== "R35" && rule !== "R36") || f?.id === undefined) return [];
    return [
      {
        id: `${HIS_RED_FLAG_PREFIX}${f.id}`,
        ruleId: rule as RedFlag,
        detectedAt: isoDate(f.created_at) ?? "",
        source: "STRUCTURED" as const,
        status: "OPEN" as const,
      },
    ];
  });
}

function mapOrders(data: Record<string, any>): HisOrder[] {
  const list: any[] = Array.isArray(data.pending_diagnostic_orders) ? data.pending_diagnostic_orders : [];
  return list
    .filter((o) => isObj(o) && (str(o.service_name) || str(o.service_code)))
    .map((o) => ({ id: String(o.id ?? ""), name: str(o.service_name), code: str(o.service_code), status: str(o.order_status), orderedAt: str(o.ordered_at) }));
}

function mapRecommended(data: Record<string, any>): MappedTrajectory["recommended"] {
  const list: any[] = Array.isArray(data.recommended_diagnostics) ? data.recommended_diagnostics : [];
  return list.flatMap((d) => {
    const testName = str(d?.test_name) || str(d?.name);
    const loinc = str(d?.loinc) || str(d?.code);
    return testName && loinc ? [{ testName, loinc, source: str(d?.source), reason: str(d?.reason) }] : [];
  });
}

function mapReferrals(data: Record<string, any>): HisReferral[] {
  const list: any[] = Array.isArray(data.specialist_referrals) ? data.specialist_referrals : [];
  return list
    .filter(isObj)
    .map((r) => ({
      id: String(r.referral_id ?? r.id ?? ""),
      doctor: str(r.referring_doctor_name),
      specialty: str(r.target_specialty),
      createdAt: str(r.created_at),
      reason: str(r.fhir_serviceRequest?.reasonCode?.[0]?.text) || str(r.clinical_reason),
      status: str(r.fhir_serviceRequest?.status) || str(r.status),
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** `today` (YYYY-MM-DD) is used for age and as the date of consent entries that carry none. */
export function mapTrajectory(response: unknown, today: string): MappedTrajectory {
  const data = trajectoryData(response);
  const profile = mapProfile(data, today);
  const trends = mapTrends(data);
  return {
    mrn: profile.mrn ?? "",
    profile,
    ...trends,
    consent: mapConsent(data, today),
    activity: mapActivity(data),
    emergencyHalt: data.emergency_halt === true,
    encounterId: num(data.encounter_id),
    pendingOrders: mapOrders(data),
    recommended: mapRecommended(data),
    referrals: mapReferrals(data),
    lifestyle: mapLifestyle(data),
    history: mapHistory(data),
    plans: mapPlans(data),
    cycles: mapCycles(data),
    redFlags: mapRedFlags(data),
    raw: {
      lifestyle: isObj(data.lifestyle?.current) ? data.lifestyle.current : {},
      historyItems: isObj(data.history?.items) ? data.history.items : {},
      plans: isObj(data.plans_and_questions) ? data.plans_and_questions : {},
    },
    partner: mapPartner(data),
  };
}
