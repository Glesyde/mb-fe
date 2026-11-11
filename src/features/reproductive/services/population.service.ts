// Population aggregates for "Reproductive Insights". Groups only: no individual rows ever leave
// this function, and any group under MIN_GROUP_SIZE people is suppressed (no figures at all).
// Definitions marked ASSUMPTION are listed in docs/reproductive/RULES.md.

import { evaluate } from "../engine";
import { daysBetween } from "../engine/dates";
import type { VectorId, VectorState } from "../engine/types";
import { toEngineInput } from "../data/mappers";
import { ageAt } from "../data/records";
import type { ReproRecord } from "../data/repository";

export const MIN_GROUP_SIZE = 50;
export const REFERRAL_WINDOW_DAYS = 90;

export type Split = "overall" | "ageBand" | "sex" | "language" | "clinic";
export const SPLITS: { id: Split; label: string }[] = [
  { id: "overall", label: "Overall" },
  { id: "ageBand", label: "Age band" },
  { id: "sex", label: "Sex" },
  { id: "language", label: "Language" },
  { id: "clinic", label: "Clinic" },
];

export type StateBucket = VectorState | "DATA_WITHDRAWN";
export const STATE_BUCKETS: StateBucket[] = ["NEEDS_ATTENTION", "IMPROVING", "STABLE", "NOT_ENOUGH_DATA", "DATA_WITHDRAWN"];

export interface PopulationGroup {
  key: string;
  n: number;
  /** True when n < MIN_GROUP_SIZE. A suppressed group carries no other figures. */
  suppressed: boolean;
  /** Per vector: how many people the card is shown for, and how many are in each state. */
  vectorStates?: Record<VectorId, { shown: number; counts: Record<StateBucket, number> }>;
  /** People with any card needing attention and no counselling recorded. */
  careGaps?: { count: number; of: number };
  /** ASSUMPTION: men with at least one semen analysis recorded. */
  maleEngagement?: { count: number; of: number };
  /** Median days from first "needs attention" to the first counselling on or after it. */
  daysToCounselling?: { median: number | null; people: number };
  /** ASSUMPTION: referrals created at least 90 days ago that were completed within 90 days. */
  referralCompletion?: { completed: number; eligible: number };
}

export interface PopulationAggregates {
  asOf: string;
  split: Split;
  minimumGroupSize: number;
  populationSize: number;
  groups: PopulationGroup[];
}

/** Age bands for the equity split. */
function ageBandOf(age: number | null): string {
  if (age === null) return "Age not recorded";
  if (age < 30) return "20–29";
  if (age < 35) return "30–34";
  if (age < 40) return "35–39";
  return "40–44";
}

export interface PersonFacts {
  groupKeys: Record<Split, string>;
  states: Partial<Record<VectorId, StateBucket>>;
  needsAttention: boolean;
  hadCounselling: boolean;
  isMale: boolean;
  semenRecorded: boolean;
  daysToCounselling: number | null;
  referrals: { eligible: boolean; completedInWindow: boolean }[];
}

/** First evaluation date (walking the person's own reading dates) on which any card needed attention. */
function firstNeedsAttention(record: ReproRecord, asOf: string): string | null {
  const dates = Array.from(
    new Set([...record.observations.map((o) => o.effectiveDateTime.slice(0, 10)), ...record.cycles.map((c) => c.startDate)].filter((d) => d <= asOf)),
  ).sort();
  for (const d of dates) {
    if (evaluate(toEngineInput(record, d)).vectors.some((v) => v.state === "NEEDS_ATTENTION")) return d;
  }
  // Attention from history or lifestyle alone (no dated readings): from when the record began.
  return evaluate(toEngineInput(record, asOf)).vectors.some((v) => v.state === "NEEDS_ATTENTION") ? record.createdAt.slice(0, 10) : null;
}

function personFacts(record: ReproRecord, asOf: string): PersonFacts {
  const result = evaluate(toEngineInput(record, asOf));
  const states: PersonFacts["states"] = {};
  for (const v of result.vectors) states[v.vector] = v.dataWithdrawn && v.state === "NOT_ENOUGH_DATA" ? "DATA_WITHDRAWN" : v.state;
  const needsAttention = result.vectors.some((v) => v.state === "NEEDS_ATTENTION");
  const age = record.profile.birthDate ? ageAt(record.profile.birthDate, asOf) : null;

  let daysToCounselling: number | null = null;
  if (needsAttention) {
    const first = firstNeedsAttention(record, asOf);
    const counselling = record.counselling.map((c) => c.date).filter((d) => first && d >= first && d <= asOf).sort()[0];
    if (first && counselling) daysToCounselling = daysBetween(first, counselling);
  }

  return {
    groupKeys: {
      overall: "All",
      ageBand: ageBandOf(age),
      sex: record.profile.sex === "female" ? "Female" : record.profile.sex === "male" ? "Male" : "Sex not recorded",
      language: record.profile.language === "ar" ? "Arabic" : "English",
      clinic: record.profile.clinic ?? "Clinic not recorded",
    },
    states,
    needsAttention,
    hadCounselling: record.counselling.some((c) => c.date <= asOf),
    isMale: record.profile.sex === "male",
    semenRecorded: record.observations.some((o) => o.code.key === "SEMEN_ANALYSIS"),
    daysToCounselling,
    referrals: record.serviceRequests.map((sr) => {
      const created = sr.authoredOn.slice(0, 10);
      const eligible = daysBetween(created, asOf) >= REFERRAL_WINDOW_DAYS;
      const completedInWindow = !!sr.completedOn && daysBetween(created, sr.completedOn.slice(0, 10)) <= REFERRAL_WINDOW_DAYS;
      return { eligible, completedInWindow };
    }),
  };
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

function aggregate(key: string, people: PersonFacts[]): PopulationGroup {
  const n = people.length;
  if (n < MIN_GROUP_SIZE) return { key, n, suppressed: true };
  const vectorStates = {} as NonNullable<PopulationGroup["vectorStates"]>;
  for (const v of ["V1", "V2", "V3", "V4", "V5"] as VectorId[]) {
    const counts = Object.fromEntries(STATE_BUCKETS.map((b) => [b, 0])) as Record<StateBucket, number>;
    let shown = 0;
    for (const p of people) {
      const s = p.states[v];
      if (!s) continue;
      shown++;
      counts[s]++;
    }
    vectorStates[v] = { shown, counts };
  }
  const attention = people.filter((p) => p.needsAttention);
  const men = people.filter((p) => p.isMale);
  const referrals = people.flatMap((p) => p.referrals).filter((r) => r.eligible);
  const days = people.flatMap((p) => (p.daysToCounselling === null ? [] : [p.daysToCounselling]));
  return {
    key,
    n,
    suppressed: false,
    vectorStates,
    careGaps: { count: attention.filter((p) => !p.hadCounselling).length, of: attention.length },
    maleEngagement: { count: men.filter((p) => p.semenRecorded).length, of: men.length },
    daysToCounselling: { median: median(days), people: days.length },
    referralCompletion: { completed: referrals.filter((r) => r.completedInWindow).length, eligible: referrals.length },
  };
}

/** Per-person facts (each record evaluated with its own consent). The slow part; callers may cache it. */
export function computePeople(records: ReproRecord[], asOf: string): PersonFacts[] {
  return records.map((r) => personFacts(r, asOf));
}

export function aggregateSplit(people: PersonFacts[], asOf: string, split: Split): PopulationAggregates {
  const keys = Array.from(new Set(people.map((p) => p.groupKeys[split]))).sort();
  return {
    asOf,
    split,
    minimumGroupSize: MIN_GROUP_SIZE,
    populationSize: people.length,
    groups: keys.map((k) => aggregate(k, people.filter((p) => p.groupKeys[split] === k))),
  };
}

/** Aggregates for one split. */
export function computePopulation(records: ReproRecord[], asOf: string, split: Split): PopulationAggregates {
  return aggregateSplit(computePeople(records, asOf), asOf, split);
}
