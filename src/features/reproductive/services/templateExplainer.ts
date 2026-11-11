// Deterministic template explainer: the default wording and the production fallback.
// Built only from the engine result and the message catalogue. Works offline.

import type { EngineResult, Language } from "../engine/types";
import { stateLabel, t, tm } from "../i18n";

export interface TemplateSummary {
  lines: string[];
  text: string;
}

export function templateSummary(result: EngineResult, lang: Language): TemplateSummary {
  const lines: string[] = [];
  if (result.halted) {
    lines.push(t(lang, result.emergency ? "common.emergency" : "rule.R36"));
  } else {
    lines.push(t(lang, "common.decisionSupport"));
    for (const v of result.vectors) {
      const reason = v.reasons[0] ? ` ${tm(lang, v.reasons[0])}` : "";
      const gaps = v.gaps.length ? ` ${v.gaps.map((g) => tm(lang, g)).join(" ")}` : "";
      lines.push(`${t(lang, `vector.${v.vector}.title`)}: ${stateLabel(v, lang)}.${reason}${gaps}`);
    }
    if (result.vectors.some((v) => v.density === "BASELINE_ONLY" && v.ruleIds.includes("R39"))) lines.push(t(lang, "common.trendNeedsTwo"));
    for (const step of result.nextSteps) {
      lines.push(`${t(lang, `pathway.${step.pathway}`)}: ${step.items.map((i) => t(lang, i.messageKey)).join(" ")}`);
    }
    if (result.partnerSteps.length) {
      lines.push(`${t(lang, "nextSteps.partnerGroup")}: ${result.partnerSteps.map((f) => t(lang, f.messageKey)).join(" ")}`);
    }
  }
  lines.push(t(lang, "common.doctorDecides"));
  return { lines, text: lines.join("\n") };
}
