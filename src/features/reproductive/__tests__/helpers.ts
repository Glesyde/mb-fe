// Test builders. Deterministic: fixed AS_OF, ids derived from content.

import { LOINC } from "../engine/config";
import type {
  ConsentState,
  CycleRecord,
  DataSource,
  EngineInput,
  Observation,
  ObservationKey,
  SemenComponentKey,
  Sex,
} from "../engine/types";

export const AS_OF = "2026-11-01";

export const fullConsent = (): ConsentState => ({
  PROFILE: true,
  HISTORY: true,
  LIFESTYLE: true,
  PLANS: true,
  CYCLES: true,
  METABOLIC: true,
  HORMONES_SEMEN: true,
  WEARABLES: true,
  PARTNER_SHARING: true,
  CLINICIAN_SHARING: true,
});

export type InputOverrides = Partial<Omit<EngineInput, "consent">> & { consent?: Partial<ConsentState> };

export function person(sex: Sex | null, ageYears: number | null, o: InputOverrides = {}): EngineInput {
  return {
    asOf: o.asOf ?? AS_OF,
    subject: o.subject ?? { sex, ageYears },
    observations: o.observations ?? [],
    cycles: o.cycles ?? [],
    lifestyle: o.lifestyle ?? null,
    history: o.history ?? null,
    reproductive: o.reproductive ?? {},
    symptoms: o.symptoms ?? {},
    ...(o.openRedFlags ? { openRedFlags: o.openRedFlags } : {}),
    consent: { ...fullConsent(), ...(o.consent ?? {}) },
  };
}

export const woman = (age: number | null, o?: InputOverrides) => person("female", age, o);
export const man = (age: number | null, o?: InputOverrides) => person("male", age, o);

const LOINC_FOR: Partial<Record<ObservationKey, string>> = {
  AMH: LOINC.AMH,
  FSH: LOINC.FSH,
  HBA1C: LOINC.HBA1C,
  BMI: LOINC.BMI,
};

export function obs(
  key: ObservationKey,
  value: number,
  unit: string,
  date: string,
  extra: Partial<Observation> = {},
): Observation {
  const code = LOINC_FOR[key];
  return {
    resourceType: "Observation",
    id: `${key}-${date}-${value}`,
    code: { key, ...(code ? { coding: [{ system: "http://loinc.org", code }] } : {}) },
    valueQuantity: { value, unit },
    effectiveDateTime: date,
    source: "ENTERED",
    ...extra,
  };
}

export const amh = (value: number, date: string, extra?: Partial<Observation>) => obs("AMH", value, "ng/mL", date, extra);
export const bmi = (value: number, date: string) => obs("BMI", value, "kg/m2", date);
export const hba1c = (value: number, date: string) => obs("HBA1C", value, "%", date);

const SEMEN_UNITS: Record<SemenComponentKey, string> = {
  SEMEN_VOLUME: "mL",
  SPERM_CONCENTRATION: "10*6/mL",
  TOTAL_SPERM_NUMBER: "10*6",
  TOTAL_MOTILITY: "%",
  PROGRESSIVE_MOTILITY: "%",
  NORMAL_FORMS: "%",
};

export const NORMAL_SEMEN: Partial<Record<SemenComponentKey, number>> = {
  SEMEN_VOLUME: 2.5,
  SPERM_CONCENTRATION: 40,
  TOTAL_SPERM_NUMBER: 100,
  TOTAL_MOTILITY: 55,
  PROGRESSIVE_MOTILITY: 40,
  NORMAL_FORMS: 6,
};

export function semen(date: string, values: Partial<Record<SemenComponentKey, number>> = NORMAL_SEMEN): Observation {
  return {
    resourceType: "Observation",
    id: `SEMEN-${date}`,
    code: { key: "SEMEN_ANALYSIS" },
    component: (Object.entries(values) as [SemenComponentKey, number][]).map(([key, value]) => ({
      code: { key },
      valueQuantity: { value, unit: SEMEN_UNITS[key] },
    })),
    effectiveDateTime: date,
    source: "ENTERED",
  };
}

/** Cycles with the given lengths, ending just before AS_OF. */
export function cycles(lengths: number[], source: DataSource = "ENTERED", end = AS_OF): CycleRecord[] {
  const out: CycleRecord[] = [];
  let cursor = Date.UTC(+end.slice(0, 4), +end.slice(5, 7) - 1, +end.slice(8, 10));
  for (const len of [...lengths].reverse()) {
    cursor -= len * 86_400_000;
    out.unshift({ startDate: new Date(cursor).toISOString().slice(0, 10), lengthDays: len, source });
  }
  return out;
}

export const REGULAR = [28, 29, 28, 27, 28, 29];
