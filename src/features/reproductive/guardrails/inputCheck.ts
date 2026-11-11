// Safety Guardrail Layer, input check. Runs on free text before anything else.
// Red flags (R35, R36) open the emergency panel. Requests the tool must not answer
// (a fertility number, a diagnosis, a prescription) get a fixed safe message instead.
// ASSUMPTION: patterns pending clinical lead sign-off. They favour false alarms over misses,
// so negated phrases ("no bleeding after sex") still match.

import { MEDICINE_BLOCKLIST } from "../engine/config";
import type { RedFlag } from "../engine/types";

export type { RedFlag };
export type BlockedRequest = "FERTILITY_SCORE" | "DIAGNOSIS" | "PRESCRIBING";

export interface InputCheckResult {
  redFlags: RedFlag[];
  blocked: BlockedRequest[];
  /** Message keys to show, red flags first. */
  messageKeys: string[];
}

const any = (text: string, patterns: RegExp[]) => patterns.some((p) => p.test(text));

// --- R35: severe sudden one-sided pelvic pain + missed period / positive test / fainting ---------
const R35_PAIN = [/\b(pain|pains|cramp|cramps|cramping|ache)\b/i, /ألم|آلام|وجع|مغص/];
const R35_SEVERE = [
  /\b(severe|severely|sudden|suddenly|sharp|intense|terrible|unbearable|excruciating|stabbing)\b/i,
  /شديد|مفاجئ|فجأة|حاد/, // ARABIC: pending native clinician review
];
const R35_ONE_SIDED = [
  /\b(one[- ]sided|one side|left|right)\b/i,
  /جانب\s+واحد|الأيمن|الأيسر|اليمين|اليسار|الجهة\s+اليمنى|الجهة\s+اليسرى/, // ARABIC: pending native clinician review
];
const R35_PELVIC = [
  /\b(pelvi\w*|lower\s+(abdomen|abdominal|belly|tummy|stomach)|groin|abdom\w*|belly|tummy)\b/i,
  /الحوض|أسفل\s+البطن|البطن/, // ARABIC: pending native clinician review
];
const R35_ASSOCIATED = [
  /\bmissed\s+(my\s+|a\s+|her\s+)?period\b|\b(late|no)\s+period\b|\bperiod\s+(is|was)\s+(late|missing)\b/i,
  /\bpositive\s+(pregnancy\s+)?test\b|\bpregnancy\s+test\s+(is|was)\s+positive\b/i,
  /\b(faint|fainted|fainting|passed\s+out|collapsed|nearly\s+fainted)\b/i,
  /تأخر(ت)?\s+(ال)?دورة|انقطاع\s+(ال)?دورة|لم\s+تأت\s+(ال)?دورة|اختبار\s+(ال)?حمل\s+إيجابي|إغماء|أغمي|فقدت\s+الوعي/, // ARABIC: pending native clinician review
];

// --- R36: bleeding after sex or between periods ---------------------------------------------------
const R36_PATTERNS = [
  /\b(bleed\w*|spotting)\b[^.]{0,30}\b(after|following|during)\s+(sex|intercourse)\b/i,
  /\bpost[- ]?coital\s+bleed\w*/i,
  /\b(bleed\w*|spotting)\b[^.]{0,30}\bbetween\s+(my\s+|her\s+)?periods\b/i,
  /\bintermenstrual\s+bleed\w*/i,
  /(نزيف|نزف)\s+بعد\s+الجماع|(نزيف|نزف)\s+بين\s+(ال)?دورات|(نزيف|نزف)\s+بين\s+(ال)?دورتين/, // ARABIC: pending native clinician review
];

// --- Requests the tool must not answer ----------------------------------------------------------
const FERTILITY_SCORE_PATTERNS = [
  /\bpercent(age)?\s+fertile\b|%\s*fertile\b/i,
  /\bfertility\s+(score|percentage|rating|number)\b/i,
  /\bhow\s+fertile\s+(am\s+i|is\s+she|are\s+we)\b/i,
  /\b(chance|chances|odds|probability|likelihood)\s+of\s+(getting\s+|becoming\s+)?(pregnan|conceiv)/i,
  /(نسبة|درجة)\s+(ال)?خصوب|(فرصة|احتمال)\s+(ال)?حمل|كم\s+(نسبة|احتمال)/, // ARABIC: pending native clinician review
];
const DIAGNOSIS_PATTERNS = [
  /\bdiagnos\w*/i,
  /\bdo\s+i\s+have\s+(pcos|endometriosis|cancer|poi|a\s+fertility\s+problem)\b/i,
  /شخّص|شخص\s+(لي|حالتي)|تشخيص|هل\s+لدي\s+(تكيس|بطانة)/, // ARABIC: pending native clinician review
];
const PRESCRIBING_PATTERNS = [
  /\bprescri\w*/i,
  /\bwhat\s+(medicine|medication|drug|pill|tablet)s?\s+should\b/i,
  /\bshould\s+i\s+(take|start)\b/i,
  /وصفة|اكتب\s+لي\s+دواء|ما\s+(هو\s+)?الدواء|أي\s+دواء/, // ARABIC: pending native clinician review
];

function mentionsMedicine(text: string): boolean {
  const lower = text.toLowerCase();
  return MEDICINE_BLOCKLIST.some((m) =>
    /^[a-z]/.test(m) ? new RegExp(`\\b${m}\\b`, "i").test(lower) : lower.includes(m),
  );
}

export function checkInput(text: string): InputCheckResult {
  const redFlags: RedFlag[] = [];
  const blocked: BlockedRequest[] = [];
  if (text.trim()) {
    if (any(text, R35_PAIN) && any(text, R35_SEVERE) && any(text, R35_ONE_SIDED) && any(text, R35_PELVIC) && any(text, R35_ASSOCIATED)) {
      redFlags.push("R35");
    }
    if (any(text, R36_PATTERNS)) redFlags.push("R36");
    if (any(text, FERTILITY_SCORE_PATTERNS)) blocked.push("FERTILITY_SCORE");
    if (any(text, DIAGNOSIS_PATTERNS)) blocked.push("DIAGNOSIS");
    if (any(text, PRESCRIBING_PATTERNS) || mentionsMedicine(text)) blocked.push("PRESCRIBING");
  }
  const messageKeys = [
    ...redFlags.map((f) => (f === "R35" ? "common.emergency" : "rule.R36")),
    ...blocked.map((b) => `guardrail.blocked.${b}`),
  ];
  return { redFlags, blocked, messageKeys };
}
