// Consent filtering. Runs before any evaluation: withdrawn data never reaches a calculation (R40).

import { OBSERVATION_CATEGORY, REPRODUCTIVE_FIELD_CATEGORY, REQUIRED_CATEGORIES } from "./config";
import type { ConsentCategory, DataSource, EngineInput, ReproductiveContext } from "./types";

/** Categories that hold data and can be withdrawn. PROFILE (age, sex) is required. */
export const DATA_CATEGORIES: ConsentCategory[] = [
  "HISTORY",
  "LIFESTYLE",
  "PLANS",
  "CYCLES",
  "METABOLIC",
  "HORMONES_SEMEN",
  "WEARABLES",
];

export interface ConsentFilterResult {
  input: EngineInput;
  /** Data categories the person withdrew. */
  withdrawn: ConsentCategory[];
  /** Data categories removed for any reason (withdrawn, or not in a partner's share list). */
  excluded: ConsentCategory[];
}

/**
 * Remove every piece of data whose category is not consented. Symptoms never pass through:
 * the red-flag check has already run on them, and only open red flags are kept.
 * `shareAllowList` narrows further (used for a partner's shared view); PROFILE is only
 * removed when an allow-list is given and does not contain it.
 */
export function applyConsent(input: EngineInput, shareAllowList?: ConsentCategory[]): ConsentFilterResult {
  const withdrawn = DATA_CATEGORIES.filter((c) => !REQUIRED_CATEGORIES.includes(c) && input.consent[c] !== true);
  const notShared = shareAllowList
    ? (["PROFILE", ...DATA_CATEGORIES] as ConsentCategory[]).filter((c) => !shareAllowList.includes(c))
    : [];
  const excluded = Array.from(new Set([...withdrawn, ...notShared]));
  const allowed = (c: ConsentCategory) => !excluded.includes(c);
  const sourceAllowed = (s: DataSource) => s !== "WEARABLE" || allowed("WEARABLES");

  const reproductive: ReproductiveContext = {};
  for (const [field, value] of Object.entries(input.reproductive) as [keyof ReproductiveContext, never][]) {
    if (allowed(REPRODUCTIVE_FIELD_CATEGORY[field])) reproductive[field] = value;
  }

  const filtered: EngineInput = {
    ...input,
    subject: allowed("PROFILE") ? input.subject : { sex: input.subject.sex, ageYears: null },
    observations: input.observations.filter((o) => allowed(OBSERVATION_CATEGORY[o.code.key]) && sourceAllowed(o.source)),
    cycles: allowed("CYCLES") ? input.cycles.filter((c) => sourceAllowed(c.source)) : [],
    lifestyle: allowed("LIFESTYLE") ? input.lifestyle : null,
    history: allowed("HISTORY") ? input.history : null,
    reproductive,
    symptoms: {},
    // A partner's red flags are never shown in anyone else's view.
    openRedFlags: shareAllowList ? [] : input.openRedFlags ?? [],
  };

  return { input: filtered, withdrawn, excluded };
}
