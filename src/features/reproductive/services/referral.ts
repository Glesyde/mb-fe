// Pre-filled text for a referral sent to the HIS. The clinician can change both fields before
// sending; nothing is sent without their confirmation.

import type { NextStep, PathwayId, Sex } from "../engine/types";
import { t } from "../i18n";

/** Suggested receiving specialty per pathway. ASSUMPTION: names to be aligned with the HIS list. */
export function defaultSpecialty(pathway: PathwayId, sex: Sex | null): string {
  switch (pathway) {
    case "P1":
      return "Primary Care (Health Optimisation)";
    case "P2":
      return "Primary Care (Targeted Testing)";
    case "P3":
      return "Preconception Counselling";
    case "P4":
      return "Fertility Preservation Specialist";
    case "P5":
      return sex === "male" ? "Andrology & Reproductive Endocrinology Specialist" : "Reproductive Medicine Specialist";
    case "P6":
      return "Emergency Care";
  }
}

/** "<Pathway>: <rule wording> (<citation>; rule id)" for each item of the step. English only. */
export function referralReason(step: NextStep): string {
  const items = step.items.map((i) => {
    const cite = `${i.citation.source}${i.citation.ref ? ` ${i.citation.ref}` : ""}`;
    return `${t("en", i.messageKey)} (${cite}; ${i.ruleId})`;
  });
  return `${t("en", `pathway.${step.pathway}`)}: ${items.join(" ")}`;
}
