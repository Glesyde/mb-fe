// Builders for FHIR-shaped records: consent, conditions, observations, and the record itself.

import { LOINC, SNOMED } from "../engine/config";
import { DATA_CATEGORIES } from "../engine/consent";
import type {
  ConsentCategory,
  ConsentState,
  DataSource,
  HistoryItems,
  Observation,
  ObservationKey,
  SemenComponentKey,
} from "../engine/types";
import type { Actor, ConditionResource, ConsentResource, HistoryKey, ReproProfile, ReproRecord } from "./repository";

export const SYSTEM_ACTOR: Actor = { id: "system", name: "System" };

export const ALL_CATEGORIES: ConsentCategory[] = ["PROFILE", ...DATA_CATEGORIES, "PARTNER_SHARING", "CLINICIAN_SHARING"];

/** Shown in the consent step, in this order. PROFILE (age and sex) is required and always on. */
export const CONSENT_STEP_CATEGORIES: ConsentCategory[] = [
  "CYCLES",
  "METABOLIC",
  "HORMONES_SEMEN",
  "HISTORY",
  "LIFESTYLE",
  "PLANS",
  "CLINICIAN_SHARING",
  "WEARABLES",
  "PARTNER_SHARING",
];

/** Pre-ticked in the consent step (and the simulated "Demo consent" for synthetic records). */
export const DEFAULT_PERMITTED: ConsentCategory[] = [
  "PROFILE",
  "HISTORY",
  "LIFESTYLE",
  "PLANS",
  "CYCLES",
  "METABOLIC",
  "HORMONES_SEMEN",
  "CLINICIAN_SHARING",
];

export const CONSENT_STATEMENT = "I have explained this tool to the patient and they agree to use:";

function newConsent(
  patientId: string,
  at: string,
  by: Actor,
  permitted = DEFAULT_PERMITTED,
  reason = "Initial consent",
): ConsentResource {
  return {
    resourceType: "Consent",
    id: `${patientId}-consent`,
    status: "active",
    provision: ALL_CATEGORIES.map((category) => ({
      category,
      type: category === "PROFILE" || permitted.includes(category) ? "permit" : "deny",
      updatedAt: at,
      updatedBy: by,
      reason,
    })),
  };
}

/** True when this person's consent permits the category. */
export function isPermitted(record: Pick<ReproRecord, "consent">, category: ConsentCategory): boolean {
  return record.consent.provision.some((p) => p.category === category && p.type === "permit");
}

export function consentState(consent: ConsentResource): ConsentState {
  const state = Object.fromEntries(ALL_CATEGORIES.map((c) => [c, false])) as ConsentState;
  for (const p of consent.provision) state[p.category] = p.type === "permit";
  state.PROFILE = true;
  return state;
}

/** Synthetic records get the simulated "Demo consent"; real ones the categories the clinician confirmed. */
export function newRecord(
  patientId: string,
  profile: ReproProfile,
  at: string,
  by: Actor,
  isDemo: boolean,
  permitted: ConsentCategory[] = DEFAULT_PERMITTED,
): ReproRecord {
  return {
    patientId,
    isDemo,
    consentMode: isDemo ? "DEMO" : "CLINICIAN_CONFIRMED",
    profile,
    observations: [],
    cycles: [],
    historyCompleted: false,
    conditions: [],
    lifestyle: null,
    reproductive: {},
    consent: isDemo ? newConsent(patientId, at, by, permitted, "Demo consent") : newConsent(patientId, at, by, permitted, "Confirmed in consent step"),
    redFlags: [],
    counselling: [],
    serviceRequests: [],
    activity: [{ id: `${patientId}-act-1`, at, by, action: "RECORD_CREATED", detail: isDemo ? "Demo record created" : "Record created" }],
    createdAt: at,
    updatedAt: at,
  };
}

// --- Conditions ↔ history items ------------------------------------------------------------------
const CONDITION_SNOMED: Partial<Record<HistoryKey, string>> = {
  endometriosis: SNOMED.ENDOMETRIOSIS,
  pcos: SNOMED.PCOS,
  geneticPoiRisk: SNOMED.POI,
};

export function conditionsFromHistory(patientId: string, items: HistoryItems, recordedDate: string): ConditionResource[] {
  return (Object.keys(items) as HistoryKey[])
    .filter((k) => items[k] === true)
    .map((key) => {
      const code = CONDITION_SNOMED[key];
      return {
        resourceType: "Condition",
        id: `${patientId}-cond-${key}`,
        code: { key, ...(code ? { coding: [{ system: "http://snomed.info/sct", code }] } : {}) },
        clinicalStatus: "active",
        recordedDate,
      };
    });
}

export function historyFromConditions(conditions: ConditionResource[]): HistoryItems {
  const items: HistoryItems = {};
  for (const c of conditions) items[c.code.key] = true;
  return items;
}

// --- Observations -----------------------------------------------------------------------------
const OBSERVATION_LOINC: Partial<Record<ObservationKey, string>> = {
  AMH: LOINC.AMH,
  FSH: LOINC.FSH,
  ESTRADIOL: LOINC.ESTRADIOL,
  PROGESTERONE: LOINC.PROGESTERONE,
  TSH: LOINC.TSH,
  HBA1C: LOINC.HBA1C,
  BMI: LOINC.BMI,
};

const SEMEN_LOINC: Partial<Record<SemenComponentKey, string>> = {
  SPERM_CONCENTRATION: LOINC.SPERM_CONCENTRATION,
  TOTAL_MOTILITY: LOINC.SPERM_MOTILITY,
};

export const SEMEN_UNITS: Record<SemenComponentKey, string> = {
  SEMEN_VOLUME: "mL",
  SPERM_CONCENTRATION: "10*6/mL",
  TOTAL_SPERM_NUMBER: "10*6",
  TOTAL_MOTILITY: "%",
  PROGRESSIVE_MOTILITY: "%",
  NORMAL_FORMS: "%",
};

export function makeObservation(
  id: string,
  key: ObservationKey,
  value: number,
  unit: string,
  date: string,
  source: DataSource,
  extra: Partial<Observation> = {},
): Observation {
  const code = OBSERVATION_LOINC[key];
  return {
    resourceType: "Observation",
    id,
    code: { key, ...(code ? { coding: [{ system: "http://loinc.org", code }] } : {}) },
    valueQuantity: { value, unit },
    effectiveDateTime: date,
    source,
    ...extra,
  };
}

export function makeSemenObservation(
  id: string,
  date: string,
  values: Partial<Record<SemenComponentKey, number>>,
  source: DataSource,
  units: Partial<Record<SemenComponentKey, string>> = {},
): Observation {
  return {
    resourceType: "Observation",
    id,
    code: { key: "SEMEN_ANALYSIS", text: "Semen analysis" },
    component: (Object.entries(values) as [SemenComponentKey, number][]).map(([key, value]) => {
      const code = SEMEN_LOINC[key];
      return {
        code: { key, ...(code ? { coding: [{ system: "http://loinc.org", code }] } : {}) },
        valueQuantity: { value, unit: units[key] ?? SEMEN_UNITS[key] },
      };
    }),
    effectiveDateTime: date,
    source,
  };
}

/** Whole years between a birth date and `asOf`. */
export function ageAt(birthDate: string, asOf: string): number {
  const [by, bm, bd] = birthDate.slice(0, 10).split("-").map(Number);
  const [y, m, d] = asOf.slice(0, 10).split("-").map(Number);
  return y - by - (m < bm || (m === bm && d < bd) ? 1 : 0);
}
