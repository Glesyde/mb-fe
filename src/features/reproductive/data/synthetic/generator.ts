// Deterministic synthetic population for the demo and the population view.
// Fixed seed; every random draw comes from createRng. No real people, clinics or organisations.
// ASSUMPTION: archetype mix, value ranges and care-event rates below are illustrative only, tuned so the
// population view looks plausible (V3 "needs attention" about 20–30 %, V1 about 10–20 %, V4 about a third
// of men). Not epidemiological.

import { findAmhBand } from "../../engine/amhReference";
import { addDays, addMonths } from "../../engine/dates";
import type { ConsentCategory, CycleRecord, HistoryItems, Language, Observation, SemenComponentKey } from "../../engine/types";
import { ALL_CATEGORIES, conditionsFromHistory, makeObservation, makeSemenObservation, newRecord, SYSTEM_ACTOR } from "../records";
import type { ReproRecord } from "../repository";
import { createRng, type Rng } from "./random";

const POPULATION_SEED = 20261101;
const POPULATION_SIZE = 1000;
/** Clinic D is deliberately small (under 50 people) to demonstrate the small-group rule. */
export const CLINICS = ["Clinic A", "Clinic B", "Clinic C", "Clinic D"] as const;

export type Archetype = "NORMAL_AGEING" | "PCOS_PATTERN" | "HISTORY_RISK" | "MALE_NORMAL" | "MALE_FACTOR";

const FEMALE_HISTORY_RISKS: (keyof HistoryItems)[] = [
  "pastChemoOrRadiotherapy",
  "pastOvarianSurgery",
  "plannedOvarianSurgery",
  "endometriosis",
  "familyEarlyMenopause",
  "pastPelvicInfection",
  "pastEctopicPregnancy",
  "newCancerDiagnosis",
];

const NORMAL_SEMEN: Record<SemenComponentKey, [number, number]> = {
  SEMEN_VOLUME: [1.8, 4.5],
  SPERM_CONCENTRATION: [25, 90],
  TOTAL_SPERM_NUMBER: [60, 250],
  TOTAL_MOTILITY: [48, 70],
  PROGRESSIVE_MOTILITY: [34, 55],
  NORMAL_FORMS: [5, 12],
};
const LOW_SEMEN: Record<SemenComponentKey, [number, number]> = {
  SEMEN_VOLUME: [1.0, 3.0],
  SPERM_CONCENTRATION: [2, 15],
  TOTAL_SPERM_NUMBER: [5, 38],
  TOTAL_MOTILITY: [20, 41],
  PROGRESSIVE_MOTILITY: [10, 29],
  NORMAL_FORMS: [1, 3],
};

function semenValues(rng: Rng, ranges: Record<SemenComponentKey, [number, number]>) {
  const out: Partial<Record<SemenComponentKey, number>> = {};
  for (const [k, [lo, hi]] of Object.entries(ranges) as [SemenComponentKey, [number, number]][]) out[k] = rng.range(lo, hi, 1);
  return out;
}

function cyclesFrom(asOf: string, rng: Rng, count: number, lo: number, hi: number, source: "WEARABLE" | "ENTERED"): CycleRecord[] {
  let start = addDays(asOf, -rng.int(3, 20));
  const out: CycleRecord[] = [];
  for (let i = 0; i < count; i++) {
    const len = rng.int(lo, hi);
    start = addDays(start, -len);
    out.unshift({ startDate: start, lengthDays: len, source });
  }
  return out;
}

/** One withdrawn category for every 10th patient, rotating so no single vector is wiped out. */
export const WITHDRAWAL_ROTATION: ConsentCategory[] = ["CYCLES", "METABOLIC", "HORMONES_SEMEN", "LIFESTYLE", "HISTORY", "PLANS"];

function withdrawnCategoryFor(index: number): ConsentCategory | null {
  return index % 10 === 3 ? WITHDRAWAL_ROTATION[Math.floor(index / 10) % WITHDRAWAL_ROTATION.length] : null;
}

function setConsent(record: ReproRecord, category: ConsentCategory, permit: boolean, reason: string, at: string) {
  Object.assign(record.consent.provision.find((x) => x.category === category)!, { type: permit ? "permit" : "deny", updatedAt: at, reason });
  record.activity.push({
    id: `${record.patientId}-act-${record.activity.length + 1}`,
    at,
    by: SYSTEM_ACTOR,
    action: "CONSENT_CHANGED",
    detail: `${permit ? "Granted" : "Withdrawn"}: ${reason}`,
    category,
  });
}

/** 1–4 distinct reading dates within the last 24 months, oldest first. */
function timePoints(asOf: string, rng: Rng): string[] {
  const count = rng.int(1, 4);
  const months = new Set<number>();
  while (months.size < count) months.add(rng.int(0, 23));
  return Array.from(months)
    .sort((a, b) => b - a)
    .map((m) => addDays(addMonths(asOf, -m), -rng.int(0, 20)));
}

function generatePatient(index: number, asOf: string, at: string, seed: number): ReproRecord {
  const rng = createRng(`${seed}:${index}`);
  const id = `SYN-${String(index + 1).padStart(4, "0")}`;
  const female = rng.chance(0.7);
  const archetype: Archetype = female
    ? rng.weighted<Archetype>([["NORMAL_AGEING", 70], ["PCOS_PATTERN", 12], ["HISTORY_RISK", 18]])
    : rng.weighted<Archetype>([["MALE_NORMAL", 68], ["MALE_FACTOR", 32]]);
  const age = archetype === "PCOS_PATTERN" ? rng.int(20, 35) : rng.int(20, 44);
  const birthDate = addMonths(asOf, -(age * 12 + rng.int(0, 11)));
  const language = rng.weighted<Language>([["en", 55], ["ar", 45]]);
  const clinic = rng.weighted<(typeof CLINICS)[number]>([["Clinic A", 33], ["Clinic B", 31], ["Clinic C", 32], ["Clinic D", 4]]);

  const record = newRecord(id, { sex: female ? "female" : "male", birthDate, language, clinic, label: `Synthetic ${index + 1}`, archetype }, at, SYSTEM_ACTOR, true);
  const dates = timePoints(asOf, rng);
  const observations: Observation[] = [];
  let n = 0;
  const obs = (key: Parameters<typeof makeObservation>[1], value: number, unit: string, date: string) =>
    observations.push(makeObservation(`${id}-o${++n}`, key, value, unit, date, "DEMO"));

  // BMI at every time point.
  const [bmiLo, bmiHi] =
    archetype === "PCOS_PATTERN"
      ? rng.weighted<[number, number]>([[[24, 30], 55], [[30, 35], 45]])
      : rng.weighted<[number, number]>([[[17.6, 18.4], 2], [[19.5, 25.5], 66], [[25.5, 29.6], 24], [[30, 34], 8]]);
  let bmi = rng.range(bmiLo, bmiHi);
  for (const d of dates) {
    obs("BMI", bmi, "kg/m2", d);
    bmi = Math.round((bmi + rng.range(-0.6, 0.4)) * 10) / 10;
  }

  // HbA1c for about half.
  if (rng.chance(0.4)) {
    let a1c = rng.chance(0.8) ? rng.range(4.9, 5.5) : rng.range(5.6, 6.1);
    const drift = rng.pick([-0.15, -0.1, 0, 0, 0, 0.05, 0.1]);
    for (const d of dates) {
      obs("HBA1C", Math.max(4.6, Math.round(a1c * 10) / 10), "%", d);
      a1c += drift + rng.range(-0.05, 0.05, 2);
    }
  }

  const history: HistoryItems = {};
  if (female) {
    const band = findAmhBand(age);
    if (band) {
      const lowReserve = archetype === "NORMAL_AGEING" && rng.chance(0.05);
      let amh =
        archetype === "PCOS_PATTERN"
          ? band.high * (rng.chance(0.85) ? rng.range(1.05, 1.6, 2) : rng.range(0.75, 0.95, 2))
          : lowReserve || (archetype === "HISTORY_RISK" && rng.chance(0.25))
            ? band.low * rng.range(0.4, 0.95, 2)
            : band.low + (band.high - band.low) * rng.range(0.1, 0.6, 2);
      for (const d of dates) {
        if (rng.chance(0.7)) obs("AMH", Math.round(amh * 100) / 100, "ng/mL", d);
        amh *= rng.range(0.9, 0.99, 2);
      }
    }
    if (rng.chance(0.8)) {
      const source = rng.chance(0.3) ? "WEARABLE" : "ENTERED";
      record.cycles =
        archetype === "PCOS_PATTERN" ? cyclesFrom(asOf, rng, rng.int(3, 5), 38, 62, source) : cyclesFrom(asOf, rng, rng.int(3, 7), 26, 31, source);
      // They opted in to wearables when connecting the device.
      if (source === "WEARABLE") setConsent(record, "WEARABLES", true, "Synthetic: opted in when connecting a cycle-tracking device", at);
    }
    if (archetype === "PCOS_PATTERN" && rng.chance(0.3)) history.pcos = true;
    if (archetype === "HISTORY_RISK") history[rng.pick(FEMALE_HISTORY_RISKS)] = true;
    if (rng.chance(0.25)) record.reproductive.tryingSince = addMonths(asOf, -rng.int(2, 20));
    else if (rng.chance(0.25)) record.reproductive.planningPregnancy = true;
    if (rng.chance(0.3)) record.reproductive.rubellaStatus = rng.pick(["immune", "unknown"] as const);
  } else {
    const semenDates = archetype === "MALE_FACTOR" ? dates.slice(-rng.int(0, 2)) : rng.chance(0.6) ? dates.slice(-1) : [];
    for (const d of semenDates) {
      const values = semenValues(rng, archetype === "MALE_FACTOR" && rng.chance(0.75) ? LOW_SEMEN : NORMAL_SEMEN);
      observations.push(makeSemenObservation(`${id}-o${++n}`, d, values, "DEMO"));
    }
    if (archetype === "MALE_FACTOR" && rng.chance(0.1)) history.undescendedTestes = true;
    if (rng.chance(0.2)) record.reproductive.planningPregnancy = true;
  }
  record.observations = observations;

  record.lifestyle = {
    smoking: rng.chance(archetype === "MALE_FACTOR" ? 0.25 : female ? 0.05 : 0.12) ? "current" : rng.pick(["never", "former"] as const),
    alcoholUnitsPerWeek: rng.chance(0.2) ? rng.int(1, 14) : 0,
    heatExposure: archetype === "MALE_FACTOR" ? rng.chance(0.4) : false,
    hazardousOccupation: rng.chance(0.05),
  };
  if (rng.chance(0.75) || archetype === "HISTORY_RISK") {
    record.historyCompleted = true;
    record.conditions = conditionsFromHistory(id, history, dates[0]);
  }

  const withdrawn = withdrawnCategoryFor(index);
  if (withdrawn) setConsent(record, withdrawn, false, "Synthetic: person withdrew this category", at);

  // Care events for the population metrics: counselling and referrals.
  const attentionLikely = archetype !== "NORMAL_AGEING" && archetype !== "MALE_NORMAL";
  if (rng.chance(attentionLikely ? 0.6 : 0.15)) {
    const date = addDays(dates[0], rng.int(5, 150));
    if (date <= asOf) record.counselling.push({ id: `${id}-c1`, date });
  }
  if (attentionLikely && rng.chance(0.4)) {
    const authoredOn = addDays(dates[0], rng.int(10, 120));
    if (authoredOn <= asOf) {
      const completedOn = rng.chance(0.75) ? addDays(authoredOn, rng.int(7, 150)) : undefined;
      record.serviceRequests.push({
        resourceType: "ServiceRequest",
        id: `${id}-sr1`,
        status: completedOn && completedOn <= asOf ? "completed" : "active",
        intent: "proposal",
        pathway: archetype === "HISTORY_RISK" ? "P4" : "P5",
        reasonRuleIds: [],
        authoredOn,
        ...(completedOn && completedOn <= asOf ? { completedOn } : {}),
      });
    }
  }
  return record;
}

/** 200 synthetic patients with linked couples. Same seed and date → identical output. */
export function generatePopulation(asOf: string, at: string, count = POPULATION_SIZE, seed = POPULATION_SEED): ReproRecord[] {
  const people = Array.from({ length: count }, (_, i) => generatePatient(i, asOf, at, seed));
  const women = people.filter((p) => p.profile.sex === "female");
  const men = people.filter((p) => p.profile.sex === "male");
  const rng = createRng(`${seed}:couples`);
  // About 15 % of people are in a linked couple.
  const pairs = Math.min(Math.round(count * 0.075), men.length, women.length);
  for (let i = 0; i < pairs; i++) {
    const [w, m] = [women[i], men[i]];
    const share = (): ConsentCategory[] => ["PROFILE", ...ALL_CATEGORIES.filter((c) => c !== "PROFILE" && rng.chance(0.5))];
    w.partner = { partnerId: m.patientId, selfConsented: true, partnerConsented: true, sharedCategories: share(), linkedAt: at };
    m.partner = { partnerId: w.patientId, selfConsented: true, partnerConsented: true, sharedCategories: share(), linkedAt: at };
    for (const r of [w, m]) r.consent.provision.find((p) => p.category === "PARTNER_SHARING")!.type = "permit";
  }
  return people;
}

/**
 * "Advance 6 months": seeded follow-up readings for a demo record at the new evaluation date.
 * Never called for real patients' records.
 */
export function addFollowUp(record: ReproRecord, newAsOf: string): ReproRecord {
  if (!record.isDemo) return record;
  const rng = createRng(`${record.patientId}:${newAsOf}`);
  const date = addDays(newAsOf, -7);
  const last = (key: Observation["code"]["key"]) =>
    record.observations.filter((o) => o.code.key === key && o.valueQuantity).sort((a, b) => a.effectiveDateTime.localeCompare(b.effectiveDateTime));
  const added: Observation[] = [];
  let n = record.observations.length;
  const obs = (key: Parameters<typeof makeObservation>[1], value: number, unit: string) =>
    added.push(makeObservation(`${record.patientId}-f${++n}`, key, value, unit, date, "DEMO"));

  const a1c = last("HBA1C");
  if (a1c.length) {
    const v = a1c.map((o) => o.valueQuantity!.value);
    const step = v.length > 1 ? (v[v.length - 1] - v[v.length - 2]) * 0.5 : 0;
    obs("HBA1C", Math.min(7.5, Math.max(4.6, Math.round((v[v.length - 1] + step + rng.range(-0.05, 0.05, 2)) * 10) / 10)), "%");
  }
  const bmi = last("BMI");
  if (bmi.length) obs("BMI", Math.round((bmi[bmi.length - 1].valueQuantity!.value + rng.range(-0.6, 0.3)) * 10) / 10, "kg/m2");
  const amh = last("AMH");
  if (amh.length) {
    const prev = amh[amh.length - 1].valueQuantity!;
    obs("AMH", Math.round(prev.value * rng.range(0.9, 0.98, 2) * 100) / 100, prev.unit);
  }
  const semen = record.observations.filter((o) => o.code.key === "SEMEN_ANALYSIS").slice(-1)[0];
  if (semen?.component) {
    const values = Object.fromEntries(semen.component.map((c) => [c.code.key, Math.round(c.valueQuantity.value * rng.range(0.9, 1.15, 2) * 10) / 10]));
    added.push(makeSemenObservation(`${record.patientId}-f${++n}`, date, values, "DEMO"));
  }

  const cycles = [...record.cycles];
  if (cycles.length) {
    const lengths = cycles.map((c) => c.lengthDays ?? 28);
    const lo = Math.min(...lengths);
    const hi = Math.max(...lengths);
    let start = cycles[cycles.length - 1].startDate;
    let len = cycles[cycles.length - 1].lengthDays ?? 28;
    while (addDays(start, len) < newAsOf) {
      start = addDays(start, len);
      len = rng.int(lo, hi);
      cycles.push({ startDate: start, lengthDays: len, source: "DEMO" });
    }
  }
  return { ...record, observations: [...record.observations, ...added], cycles };
}
