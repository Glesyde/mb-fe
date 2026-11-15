// Request bodies for saving lifestyle, history and plans to the HIS. Each POST creates or updates.
// A body starts from what the HIS already holds (`raw`), then overwrites only the fields the tab's
// forms edit, so other fields are never cleared by accident.

import type { HistoryItems, Lifestyle, ReproductiveContext } from "../engine/types";

/** Fields the HIS adds itself; never sent back. */
const READ_ONLY = new Set(["updated_at", "updated_by", "trying_months", "smoker", "smoking_still_existing", "alcohol_still_existing"]);
const editable = (raw: Record<string, unknown>) => Object.fromEntries(Object.entries(raw).filter(([k]) => !READ_ONLY.has(k)));

export function lifestyleBody(raw: Record<string, unknown>, l: Lifestyle): Record<string, unknown> {
  return {
    ...editable(raw),
    smoking_status: l.smoking ?? null,
    passive_smoke: l.passiveSmoke ?? false,
    alcohol_units_per_week: l.alcoholUnitsPerWeek ?? null,
    heat_exposure: l.heatExposure ?? false,
    occupation: l.occupation ?? null,
    hazardous_occupation: l.hazardousOccupation ?? false,
  };
}

/** The history items the tab's form shows. Any other item the HIS holds is sent back unchanged. */
export const FORM_HISTORY_KEYS: (keyof HistoryItems)[] = [
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

export function historyBody(rawItems: Record<string, unknown>, items: HistoryItems): Record<string, unknown> {
  const out: Record<string, unknown> = { ...rawItems };
  for (const k of FORM_HISTORY_KEYS) out[k] = items[k] === true;
  return out;
}

const RUBELLA: Record<NonNullable<ReproductiveContext["rubellaStatus"]>, string> = {
  immune: "IMMUNE",
  susceptible: "NON_IMMUNE",
  unknown: "NOT_RECORDED",
};

export function plansBody(raw: Record<string, unknown>, p: ReproductiveContext): Record<string, unknown> {
  const q = p.questions ?? [];
  return {
    ...editable(raw),
    trying_since: p.tryingSince ?? null,
    rubella_status: RUBELLA[p.rubellaStatus ?? "unknown"],
    planning_pregnancy: p.planningPregnancy === true,
    concerned_about_fertility: p.concerned === true,
    regular_intercourse: p.regularIntercourse === true,
    using_contraception: p.usingContraception === true,
    in_assisted_conception: p.assistedConception === true,
    considering_egg_freezing: p.eggFreezingConsidered === true,
    egg_freezing_for_age: p.eggFreezingForAge === true,
    periods_absent: p.periodsAbsent === true,
    thyroid_symptoms: p.thyroidSymptoms === true,
    asked_about_caffeine: q.includes("CAFFEINE"),
    asked_for_dna_fragmentation: q.includes("DNA_FRAGMENTATION"),
    wants_ovulation_check: q.includes("OVULATION_CHECK"),
    asked_about_egg_freezing: q.includes("EGG_FREEZING"),
  };
}
