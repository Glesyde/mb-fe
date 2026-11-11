// Fixed glossary. Terms found in on-screen text get a hover/tap definition from the catalogues.
// No free-text question box.

import type { Language } from "../engine/types";

export type GlossaryId =
  | "AMH"
  | "AFC"
  | "FSH"
  | "SEMEN_ANALYSIS"
  | "OVARIAN_RESERVE"
  | "PCOS"
  | "HBA1C"
  | "BMI"
  | "ENDOMETRIOSIS"
  | "OVULATION"
  | "MID_LUTEAL_PROGESTERONE"
  | "WHO_REFERENCE"
  | "FERTILITY_PRESERVATION"
  | "POI"
  | "PREDIABETES";

/** Longest phrases first so "mid-luteal progesterone" wins over shorter matches. */
const GLOSSARY_PATTERNS: Record<Language, { id: GlossaryId; pattern: RegExp }[]> = {
  en: [
    { id: "MID_LUTEAL_PROGESTERONE", pattern: /mid-luteal progesterone/i },
    { id: "WHO_REFERENCE", pattern: /WHO reference values/i },
    { id: "FERTILITY_PRESERVATION", pattern: /fertility[- ]preservation/i },
    { id: "POI", pattern: /premature ovarian insufficiency/i },
    { id: "SEMEN_ANALYSIS", pattern: /semen analys[ei]s/i },
    { id: "OVARIAN_RESERVE", pattern: /ovarian reserve|\breserve\b/i },
    { id: "ENDOMETRIOSIS", pattern: /endometriosis/i },
    { id: "PREDIABETES", pattern: /prediabetes/i },
    { id: "OVULATION", pattern: /ovulation/i },
    { id: "PCOS", pattern: /\bPCOS\b/ },
    { id: "HBA1C", pattern: /\bHbA1c\b/ },
    { id: "AMH", pattern: /\bAMH\b/ },
    { id: "AFC", pattern: /\bAFC\b/ },
    { id: "FSH", pattern: /\bFSH\b/ },
    { id: "BMI", pattern: /\bBMI\b/ },
  ],
  ar: [
    { id: "SEMEN_ANALYSIS", pattern: /تحليل (لل)?السائل المنوي/ }, // ARABIC: pending native clinician review
    { id: "ENDOMETRIOSIS", pattern: /بطانة الرحم المهاجرة/ }, // ARABIC: pending native clinician review
    { id: "POI", pattern: /قصور المبيض المبكر/ }, // ARABIC: pending native clinician review
    { id: "FERTILITY_PRESERVATION", pattern: /الحفاظ على الخصوبة/ }, // ARABIC: pending native clinician review
    { id: "PREDIABETES", pattern: /ما قبل السكري/ }, // ARABIC: pending native clinician review
    { id: "BMI", pattern: /مؤشر كتلة الجسم/ }, // ARABIC: pending native clinician review
    { id: "OVULATION", pattern: /الإباضة/ }, // ARABIC: pending native clinician review
    { id: "HBA1C", pattern: /HbA1c/ },
    { id: "AMH", pattern: /AMH/ },
    { id: "AFC", pattern: /AFC/ },
    { id: "FSH", pattern: /FSH/ },
  ],
};

export interface TextPart {
  text: string;
  term?: GlossaryId;
}

/** Splits text so the first occurrence of each glossary term can be wrapped with its definition. */
export function splitGlossary(text: string, lang: Language): TextPart[] {
  let parts: TextPart[] = [{ text }];
  for (const { id, pattern } of GLOSSARY_PATTERNS[lang]) {
    let done = false;
    parts = parts.flatMap((part) => {
      if (done || part.term) return [part];
      const m = pattern.exec(part.text);
      if (!m) return [part];
      done = true;
      const before = part.text.slice(0, m.index);
      const after = part.text.slice(m.index + m[0].length);
      return [...(before ? [{ text: before }] : []), { text: m[0], term: id }, ...(after ? [{ text: after }] : [])];
    });
  }
  return parts;
}
