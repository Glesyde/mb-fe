// Mappers from existing EMR data (EMRChart's patientData, vitalsList, historyEncounters) to
// FHIR-shaped observations, and from a stored record to the engine input.
// Only values that exist are read. Nothing is estimated. Anything that cannot be read cleanly
// is listed in `skipped` with the reason.
//
// Field names confirmed in Phase 0:
//   patientData.mrn, patientData.demographics.{gender, date_of_birth?, display_age}
//   vitals rows: recorded_at, bmi, weight (kg), height, systolic_bp, diastolic_bp
//   historyEncounters[].labs[]: service_name, ordered_at, lab_status, results[]: parameter|name, value, unit
//   historyEncounters[].vitals[]: same shape as vitals rows

import { ageAt, consentState, historyFromConditions, makeObservation, makeSemenObservation } from "./records";
import type { ReproRecord } from "./repository";
import type { EngineInput, Observation, ObservationKey, SemenComponentKey, Sex } from "../engine/types";

// --- Patient --------------------------------------------------------------------------------------
export interface MappedProfile {
  mrn: string | null;
  sex: Sex | null;
  ageYears: number | null;
  ageSource: "date_of_birth" | "display_age" | null;
}

function mapSex(gender: unknown): Sex | null {
  if (typeof gender !== "string") return null;
  const g = gender.trim().toLowerCase();
  if (g === "female" || g === "f") return "female";
  if (g === "male" || g === "m") return "male";
  return null;
}

/** "33Y", "33 Y", "33 years", "33Y 4M" → 33. Months or days only ("8M") → 0. Anything else → null. */
export function parseDisplayAge(display: unknown): number | null {
  if (typeof display !== "string") return null;
  const t = display.trim();
  const years = t.match(/^(\d{1,3})\s*(y|yr|yrs|year|years)\b/i);
  if (years) return Number(years[1]);
  if (/^\d{1,3}\s*(m|mo|month|months|d|day|days|w|wk|weeks?)\b/i.test(t)) return 0;
  return null;
}

/** Age: date_of_birth if present, otherwise display_age, otherwise not known. */
export function mapPatientProfile(patient: any, asOf: string): MappedProfile {
  const d = patient?.demographics ?? {};
  const dob = typeof d.date_of_birth === "string" && /^\d{4}-\d{2}-\d{2}/.test(d.date_of_birth) ? d.date_of_birth : null;
  const fromDob = dob ? ageAt(dob, asOf) : null;
  const fromDisplay = fromDob === null ? parseDisplayAge(d.display_age) : null;
  return {
    mrn: typeof patient?.mrn === "string" ? patient.mrn : null,
    sex: mapSex(d.gender),
    ageYears: fromDob ?? fromDisplay,
    ageSource: fromDob !== null ? "date_of_birth" : fromDisplay !== null ? "display_age" : null,
  };
}

// --- Vitals -----------------------------------------------------------------------------------
export interface Skipped {
  name: string;
  reason: string;
}

export interface MappedVitals {
  observations: Observation[];
  skipped: Skipped[];
}

const num = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && /^\s*-?\d+(\.\d+)?\s*$/.test(v)) return Number(v);
  return null;
};

/**
 * BMI from the recorded value; if it is missing, calculated from weight and height on the SAME
 * reading only (labelled "calculated"). Height above 3 is read as cm, otherwise metres (ASSUMPTION).
 * Blood pressure is mapped too. Blood glucose is not: the vitals form records no unit.
 */
export function mapVitals(vitalsRows: any[]): MappedVitals {
  const observations: Observation[] = [];
  const skipped: Skipped[] = [];
  const seen = new Set<string>();

  for (const v of vitalsRows ?? []) {
    const date = typeof v?.recorded_at === "string" ? v.recorded_at : typeof v?.created_at === "string" ? v.created_at : null;
    if (!date) continue;
    const key = String(v.id ?? date);
    if (seen.has(key)) continue;
    seen.add(key);
    const id = `HIS-vitals-${key}`;

    const recorded = num(v.bmi);
    if (recorded !== null && recorded > 0) {
      observations.push(makeObservation(`${id}-bmi`, "BMI", recorded, "kg/m2", date, "HIS"));
    } else {
      const w = num(v.weight);
      const h = num(v.height);
      if (w !== null && w > 0 && h !== null && h > 0) {
        const metres = h > 3 ? h / 100 : h;
        const bmi = Math.round((w / (metres * metres)) * 10) / 10;
        if (bmi >= 10 && bmi <= 80) {
          observations.push(makeObservation(`${id}-bmi`, "BMI", bmi, "kg/m2", date, "HIS", { derivation: "calculated" }));
        } else {
          skipped.push({ name: "BMI (calculated)", reason: "outside 10–80, weight or height likely mis-entered" });
        }
      }
    }

    const sys = num(v.systolic_bp);
    const dia = num(v.diastolic_bp);
    if (sys !== null && sys > 0) observations.push(makeObservation(`${id}-sbp`, "SYSTOLIC_BP", sys, "mmHg", date, "HIS"));
    if (dia !== null && dia > 0) observations.push(makeObservation(`${id}-dbp`, "DIASTOLIC_BP", dia, "mmHg", date, "HIS"));
    if (num(v.blood_glucose) !== null) skipped.push({ name: "blood_glucose (vitals)", reason: "no unit recorded" });
  }
  return { observations, skipped };
}

// --- Labs -----------------------------------------------------------------------------------------
/** Lab parameter names we recognise (case-insensitive). Listed in the phase summary. */
const LAB_NAME_PATTERNS: { key: ObservationKey; pattern: RegExp; units?: RegExp }[] = [
  { key: "AMH", pattern: /\bamh\b|anti[- ]?m(u|ü)ll?erian/i, units: /^(ng\/ml|pmol\/l|µg\/l|ug\/l)$/i },
  { key: "FSH", pattern: /\bfsh\b|follicle[- ]stimulating/i },
  { key: "ESTRADIOL", pattern: /\b(o?estradiol|e2)\b/i },
  { key: "PROGESTERONE", pattern: /\bprogesterone\b/i },
  { key: "TSH", pattern: /\btsh\b|thyroid[- ]stimulating/i },
  { key: "HBA1C", pattern: /hba1c|\ba1c\b|glycated\s+ha?emoglobin|glycosylated\s+ha?emoglobin/i, units: /^%$/ },
  { key: "FASTING_GLUCOSE", pattern: /fasting\s+(blood\s+|plasma\s+)?(glucose|sugar)|\bfbs\b|\bfbg\b|\bfpg\b/i },
];

/** Lab services treated as a semen analysis, and the parameter names inside them. */
const SEMEN_SERVICE_PATTERN = /semen|seminal|sperm/i;
const SEMEN_PARAMETER_PATTERNS: { key: SemenComponentKey; pattern: RegExp; units: RegExp }[] = [
  { key: "PROGRESSIVE_MOTILITY", pattern: /progressive/i, units: /^%$/ },
  { key: "TOTAL_MOTILITY", pattern: /motility/i, units: /^%$/ },
  { key: "NORMAL_FORMS", pattern: /morpholog|normal\s+forms/i, units: /^%$/ },
  { key: "TOTAL_SPERM_NUMBER", pattern: /total\s+(sperm\s+)?(count|number)/i, units: /million|10\^?\*?6|x\s*10/i },
  { key: "SPERM_CONCENTRATION", pattern: /concentration|density|count/i, units: /million|10\^?\*?6|x\s*10/i },
  { key: "SEMEN_VOLUME", pattern: /volume/i, units: /^ml$/i },
];

const NOT_FINAL = /PENDING|CANCEL|TECH_REVIEW|IN_PROGRESS|REJECT/i;

export interface MappedLabs {
  observations: Observation[];
  matched: { parameter: string; mappedTo: string; count: number }[];
  skipped: Skipped[];
}

function labsOf(encounter: any): any[] {
  if (Array.isArray(encounter?.labs)) return encounter.labs;
  // Fallback: listOrders shape (order.lab.results).
  if (Array.isArray(encounter?.orders)) {
    return encounter.orders
      .filter((o: any) => o?.lab?.results)
      .map((o: any) => ({ ...o.lab, service_name: o.service_name, ordered_at: o.ordered_at }));
  }
  return [];
}

/** Effective date of a lab result = lab.ordered_at (ASSUMPTION: no per-result date in the payload). */
export function mapLabs(encounters: any[]): MappedLabs {
  const observations: Observation[] = [];
  const matched = new Map<string, { parameter: string; mappedTo: string; count: number }>();
  const skipped: Skipped[] = [];
  const note = (parameter: string, mappedTo: string) => {
    const k = `${parameter}→${mappedTo}`;
    const m = matched.get(k) ?? { parameter, mappedTo, count: 0 };
    m.count++;
    matched.set(k, m);
  };

  (encounters ?? []).forEach((enc, ei) => {
    labsOf(enc).forEach((lab: any, li: number) => {
      const date = typeof lab?.ordered_at === "string" ? lab.ordered_at : null;
      const results: any[] = Array.isArray(lab?.results) ? lab.results : [];
      if (!date || !results.length) return;
      const labId = `HIS-lab-${lab.id ?? `${enc?.encounter_number ?? ei}-${li}`}`;
      if (typeof lab.lab_status === "string" && NOT_FINAL.test(lab.lab_status)) {
        skipped.push({ name: String(lab.service_name ?? "lab"), reason: `status ${lab.lab_status}` });
        return;
      }

      // Semen analysis: one Observation with components.
      if (SEMEN_SERVICE_PATTERN.test(String(lab.service_name ?? ""))) {
        const values: Partial<Record<SemenComponentKey, number>> = {};
        const units: Partial<Record<SemenComponentKey, string>> = {};
        for (const r of results) {
          const name = String(r?.parameter ?? r?.name ?? "");
          const rule = SEMEN_PARAMETER_PATTERNS.find((p) => p.pattern.test(name));
          if (!rule) continue;
          const value = num(r?.value);
          const unit = typeof r?.unit === "string" ? r.unit.trim() : "";
          if (value === null) skipped.push({ name, reason: "not a plain number" });
          else if (!rule.units.test(unit)) skipped.push({ name, reason: `unit "${unit || "none"}" not recognised` });
          else if (values[rule.key] === undefined) {
            values[rule.key] = value;
            units[rule.key] = unit;
            note(name, rule.key);
          }
        }
        if (Object.keys(values).length) observations.push(makeSemenObservation(`${labId}-semen`, date, values, "HIS", units));
        return;
      }

      results.forEach((r, ri) => {
        const name = String(r?.parameter ?? r?.name ?? "");
        const rule = LAB_NAME_PATTERNS.find((p) => p.pattern.test(name));
        if (!rule) return;
        const value = num(r?.value);
        const unit = typeof r?.unit === "string" ? r.unit.trim() : "";
        if (value === null) return void skipped.push({ name, reason: "not a plain number" });
        if (!unit) return void skipped.push({ name, reason: "no unit" });
        if (rule.units && !rule.units.test(unit)) return void skipped.push({ name, reason: `unit "${unit}" not used by this tool` });
        observations.push(makeObservation(`${labId}-${ri}`, rule.key, value, unit, date, "HIS"));
        note(name, rule.key);
      });
    });
  });

  return { observations, matched: Array.from(matched.values()), skipped };
}

// --- Everything the chart already has ----------------------------------------------------------
export interface MappedEmr {
  profile: MappedProfile;
  observations: Observation[];
  matchedLabParameters: MappedLabs["matched"];
  skipped: Skipped[];
}

/** `vitals` = EMRChart vitalsList (current encounter); `history` = historyEncounters (all encounters). */
export function mapEmrData(args: { patient: any; vitals: any[]; history: any[]; asOf: string }): MappedEmr {
  const historyVitals = (args.history ?? []).flatMap((e: any) => (Array.isArray(e?.vitals) ? e.vitals : []));
  const vitals = mapVitals([...(args.vitals ?? []), ...historyVitals]);
  const labs = mapLabs(args.history);
  return {
    profile: mapPatientProfile(args.patient, args.asOf),
    observations: [...vitals.observations, ...labs.observations],
    matchedLabParameters: labs.matched,
    skipped: [...vitals.skipped, ...labs.skipped],
  };
}

// --- Record (+ EMR) → engine input -----------------------------------------------------------------
/**
 * Builds the engine input. A real patient must have a record (the consent step creates it);
 * nothing is evaluated without one. For a real patient, age and sex come from the EMR; for demo data
 * (including a scenario loaded onto a real MRN) they come from the demo record, and real EMR
 * values are left out so demo and real data never mix.
 * Consent is applied later, inside the engine, before any calculation.
 */
export function toEngineInput(record: ReproRecord, asOf: string, emr?: MappedEmr): EngineInput {
  const useDemoProfile = record.isDemo || !emr;
  const sex = useDemoProfile ? record.profile.sex : emr!.profile.sex;
  const ageYears = useDemoProfile
    ? record.profile.birthDate
      ? ageAt(record.profile.birthDate, asOf)
      : null
    : emr!.profile.ageYears;

  const byId = new Map<string, Observation>();
  for (const o of [...(record.isDemo ? [] : emr?.observations ?? []), ...record.observations]) byId.set(o.id, o);

  return {
    asOf,
    subject: { sex, ageYears },
    observations: Array.from(byId.values()).filter((o) => o.effectiveDateTime.slice(0, 10) <= asOf),
    cycles: record.cycles.filter((c) => c.startDate <= asOf),
    lifestyle: record.lifestyle,
    history: record.historyCompleted ? historyFromConditions(record.conditions) : null,
    reproductive: record.reproductive,
    symptoms: {},
    openRedFlags: record.redFlags.filter((r) => r.status === "OPEN").map((r) => r.ruleId),
    consent: consentState(record.consent),
  };
}
