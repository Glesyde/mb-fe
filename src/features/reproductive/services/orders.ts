// Suggested tests for the "Order tests" dialog. Built from the rules that fired (each names the
// test its NICE recommendation suggests) plus any test the HIS itself suggests. Nothing here
// orders anything: the clinician ticks the tests and confirms.

import type { EngineResult } from "../engine/types";
import type { MappedTrajectory } from "../data/trajectoryMapper";
import { t } from "../i18n";

interface CatalogueTest {
  testName: string;
  /** LOINC. verify in LOINC browser before any real exchange. */
  loinc: string;
  /** Recognises the same test among the HIS's pending orders (by name). */
  match: RegExp;
}

const SEMEN: CatalogueTest = { testName: "Seminal Fluid Analysis", loinc: "6800-1", match: /semen|seminal/i };
const PROGESTERONE: CatalogueTest = { testName: "Progesterone (mid-luteal)", loinc: "2839-9", match: /progesterone/i };
const TESTOSTERONE: CatalogueTest = { testName: "Testosterone", loinc: "2986-8", match: /testosterone/i };
const FSH: CatalogueTest = { testName: "Follicle Stimulating Hormone (FSH)", loinc: "15067-2", match: /\bfsh\b|follicle[- ]stimulating/i };
const LH: CatalogueTest = { testName: "Luteinising Hormone (LH)", loinc: "10501-5", match: /\blh\b|luteini[sz]ing/i };
const TSH: CatalogueTest = { testName: "TSH", loinc: "3016-3", match: /\btsh\b|thyroid[- ]stimulating/i };
const RUBELLA: CatalogueTest = { testName: "Rubella IgG", loinc: "8014-3", match: /rubella/i };

/** Only rules whose recommendation is a specific test. Rules that suggest advice or a referral are not here. */
export const RULE_TESTS: Record<string, CatalogueTest[]> = {
  R09: [SEMEN], // earlier assessment and semen analysis
  R10: [PROGESTERONE], // ovulation tests
  R12: [PROGESTERONE], // mid-luteal progesterone
  R23: [SEMEN], // repeat semen analysis, ideally 3 months later
  R24: [TESTOSTERONE, FSH, LH], // consider testosterone and gonadotrophins
  R27: [TSH], // thyroid test when there are symptoms
  R28: [RUBELLA], // rubella status unknown
};

export interface SuggestedTest {
  testName: string;
  loinc: string;
  /** Guideline reference, e.g. "NICE NG257 1.17.3–1.17.4". */
  source: string;
  /** Why it is suggested (the rule's wording, or the HIS reason). */
  reason: string;
  ruleIds: string[];
  from: "RULE" | "HIS";
  /** A matching order is still open in the HIS. */
  alreadyOrdered: boolean;
}

export function suggestedTests(result: EngineResult, his: Pick<MappedTrajectory, "pendingOrders" | "recommended">): SuggestedTest[] {
  const byLoinc = new Map<string, SuggestedTest>();
  const pending = (test: { loinc: string; testName: string; match?: RegExp }) =>
    his.pendingOrders.some((o) => o.code === test.loinc || (test.match ? test.match.test(o.name) : o.name.toLowerCase() === test.testName.toLowerCase()));

  // Halted results suggest nothing: the emergency panel comes first.
  if (result.halted) return [];
  for (const rule of result.firedRules) {
    for (const test of RULE_TESTS[rule.id] ?? []) {
      const existing = byLoinc.get(test.loinc);
      if (existing) {
        existing.ruleIds.push(rule.id);
        continue;
      }
      byLoinc.set(test.loinc, {
        testName: test.testName,
        loinc: test.loinc,
        source: `${rule.citation.source}${rule.citation.ref ? ` ${rule.citation.ref}` : ""}`,
        reason: t("en", rule.messageKey),
        ruleIds: [rule.id],
        from: "RULE",
        alreadyOrdered: pending(test),
      });
    }
  }
  for (const r of his.recommended) {
    if (byLoinc.has(r.loinc)) continue;
    byLoinc.set(r.loinc, { testName: r.testName, loinc: r.loinc, source: r.source, reason: r.reason, ruleIds: [], from: "HIS", alreadyOrdered: pending(r) });
  }
  return Array.from(byLoinc.values());
}
