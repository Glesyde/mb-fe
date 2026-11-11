// Safety Guardrail Layer: wording that must never appear, in English and Arabic.
// Used by the catalogue scan (tests) and by the output check on AI wording.

export interface PhrasePattern {
  id: string;
  pattern: RegExp;
}

const FORBIDDEN_EN: PhrasePattern[] = [
  { id: "fertility score", pattern: /fertility\s+(score|rating|index)/i },
  { id: "infertile", pattern: /\binfertil/i },
  { id: "biological clock", pattern: /biological\s+clock/i },
  { id: "critical", pattern: /\bcritical\b/i },
  { id: "alarming", pattern: /\balarming\b/i },
  {
    id: "low AMH means you can't get pregnant",
    pattern: /low\s+amh\s+means\s+(you|she|they)\s+(can'?t|cannot|can\s+not|won'?t|will\s+not)\b/i,
  },
  // Any mention of egg quality, other than saying AMH does not measure it.
  { id: "egg quality claim", pattern: /egg\s+quality/i },
  { id: "chance of pregnancy", pattern: /chances?\s+of\s+(a\s+)?(natural\s+)?(pregnan|conceiv|getting\s+pregnant)/i },
];

// ARABIC: pending native clinician review
const FORBIDDEN_AR: PhrasePattern[] = [
  { id: "درجة الخصوبة", pattern: /(درجة|نسبة|مؤشر)\s+الخصوبة/ }, // ARABIC: pending native clinician review
  { id: "عقم", pattern: /عقم|عقيم/ }, // ARABIC: pending native clinician review
  { id: "الساعة البيولوجية", pattern: /الساعة\s+البيولوجية/ }, // ARABIC: pending native clinician review
  { id: "حرج", pattern: /حرج/ }, // ARABIC: pending native clinician review
  { id: "مقلق", pattern: /مقلق|مثير\s+للقلق|مخيف/ }, // ARABIC: pending native clinician review
  { id: "جودة البويضات", pattern: /جودة\s+البويضات/ }, // ARABIC: pending native clinician review
  { id: "فرصة الحمل", pattern: /فرص(ة)?\s+(ال)?حمل/ }, // ARABIC: pending native clinician review
];

/** Phrases that are allowed even though they contain a forbidden fragment. Removed before scanning. */
const ALLOWED: RegExp[] = [
  /(does\s+not|doesn'?t|cannot|can\s+not)\s+measure\s+egg\s+quality/gi,
  /لا\s+يقيس\s+جودة\s+البويضات/g, // ARABIC: pending native clinician review
];

export const PERCENT_PATTERN = /%|٪|\bper\s?cent\b|\bpercentage\b|في\s+المئة|بالمئة|بالمائة/i;

function stripAllowed(text: string): string {
  return ALLOWED.reduce((t, re) => t.replace(re, " "), text);
}

/** Forbidden phrase IDs found in `text`. Percentages are reported separately via PERCENT_PATTERN. */
export function findForbidden(text: string): string[] {
  const t = stripAllowed(text);
  return [...FORBIDDEN_EN, ...FORBIDDEN_AR].filter((p) => p.pattern.test(t)).map((p) => p.id);
}
