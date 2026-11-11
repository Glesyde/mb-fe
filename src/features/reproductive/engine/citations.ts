// Citation constants. `verified: false` shows "[verify]" in development builds only.

import type { Citation } from "./types";

const nice = (ref: string, verified: boolean): Citation => ({ source: "NICE NG257", ref, verified });

export const CITE = {
  NICE_1_4_1: nice("1.4.1", true),
  NICE_1_4_3: nice("1.4.3", true),
  NICE_1_6: nice("section 1.6", false),
  NICE_1_7: nice("section 1.7", false),
  NICE_1_7_1: nice("1.7.1", true),
  NICE_1_8_1: nice("1.8.1", true),
  NICE_1_9_1: nice("1.9.1", true),
  NICE_1_9_2: nice("1.9.2", true),
  NICE_1_10_1: nice("1.10.1", false),
  NICE_1_11_1: nice("1.11.1", true),
  NICE_1_12_1: nice("1.12.1", true),
  NICE_1_15_1: nice("1.15.1", true),
  NICE_1_16: nice("section 1.16", false),
  NICE_1_16_8: nice("1.16.8", false),
  NICE_1_17: nice("section 1.17", false),
  NICE_1_17_1: nice("1.17.1", true),
  NICE_1_17_3_4: nice("1.17.3–1.17.4", false),
  NICE_1_17_5: nice("1.17.5", true),
  NICE_1_17_6: nice("1.17.6", true),
  NICE_1_18_3: nice("1.18.3", true),
  NICE_1_18_4: nice("1.18.4", true),
  NICE_1_18_5: nice("1.18.5", true),
  NICE_1_18_6: nice("1.18.6", true),
  NICE_1_18_6_AND_1_16: nice("1.18.6 + section 1.16", false),
  NICE_1_18_7: nice("1.18.7", false),
  NICE_1_18_12: nice("1.18.12", true),
  NICE_1_20_1_2: nice("1.20.1, 1.20.2", true),
  STEINER_2017: { source: "Steiner et al., JAMA 2017 (women 30–44)", ref: "JAMA 2017", verified: true },
  STEINER_AND_NICE_1_18_3: { source: "Steiner et al., JAMA 2017; NICE NG257", ref: "1.18.3", verified: true },
  NICE_1_18_3_AND_STEINER: { source: "NICE NG257; Steiner et al., JAMA 2017 (women 30–44)", ref: "1.18.3", verified: true },
  ESHRE_FP: { source: "ESHRE female fertility preservation guideline", ref: "", verified: false },
  DOH_RAI_3_1_6_1_3: { source: "DoH Responsible AI Standard", ref: "3.1.6.1.3", verified: true },
  ASSUMPTION_CLINICAL_LEAD: { source: "ASSUMPTION: clinical lead sign-off", ref: "", verified: false },
  ASSUMPTION: { source: "ASSUMPTION", ref: "", verified: false },
  ASSUMPTION_CONFIG: { source: "ASSUMPTION (thresholds in config)", ref: "", verified: false },
} as const satisfies Record<string, Citation>;

function citationKey(c: Citation): string {
  return `${c.source}|${c.ref}`;
}

export function uniqueCitations(list: Citation[]): Citation[] {
  const seen = new Map<string, Citation>();
  for (const c of list) if (!seen.has(citationKey(c))) seen.set(citationKey(c), c);
  return Array.from(seen.values());
}
