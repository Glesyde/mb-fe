// Safety Guardrail Layer, output check. Pure function applied to any AI wording before display.
// If it fails, the UI shows the template text and "Standard wording shown".

import { MEDICINE_BLOCKLIST } from "../engine/config";
import { findForbidden, PERCENT_PATTERN } from "./forbiddenPhrases";

export interface OutputCheckResult {
  ok: boolean;
  violations: string[];
}

const CHANCE = /\bchances?\b|فرص/i;
const PROBABILITY = /\bprobab\w*|\blikelihood\b|احتمال/i;
const DIAGNOSIS = /\bdiagnos\w*|تشخيص|يشخص|شخّص/i;
const PRESCRIBING = /\bprescri\w*|وصفة|أصف\s+لك|يصف\s+لك/i;

const ARABIC_DIGITS: Record<string, string> = {
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4", "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
  "٫": ".",
};

function westernDigits(text: string): string {
  return text.replace(/[٠-٩۰-۹٫]/g, (ch) => ARABIC_DIGITS[ch] ?? ch);
}

/** Numbers in a string, normalised (5.40 → "5.4"). "1.18.3" yields "1.18" and "3" on both sides. */
export function extractNumbers(text: string): string[] {
  return (westernDigits(text).match(/\d+(?:\.\d+)?/g) ?? []).map((n) => String(Number(n)));
}

/** Numbers recorded in the input with unit "%" (e.g. { value: 5.4, unit: "%" } for HbA1c). */
function percentNumbersInJson(value: unknown, out: Set<string>): Set<string> {
  if (Array.isArray(value)) value.forEach((v) => percentNumbersInJson(v, out));
  else if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    if (typeof o.value === "number" && typeof o.unit === "string" && o.unit.trim() === "%") out.add(String(o.value));
    Object.values(o).forEach((v) => percentNumbersInJson(v, out));
  }
  return out;
}

const NUMBER_PERCENT = /(\d+(?:\.\d+)?)\s*[%٪]/g;

/** Remove "5.4%" where 5.4 is recorded in the input with unit "%". Every other percentage stays. */
function stripInputPercentages(text: string, allowed: Set<string>): string {
  return westernDigits(text).replace(NUMBER_PERCENT, (match, n: string) => (allowed.has(String(Number(n))) ? n : match));
}

function numbersInJson(value: unknown, out: Set<string>): Set<string> {
  if (typeof value === "number" && Number.isFinite(value)) out.add(String(value));
  else if (typeof value === "string") extractNumbers(value).forEach((n) => out.add(n));
  else if (Array.isArray(value)) value.forEach((v) => numbersInJson(v, out));
  else if (value && typeof value === "object") Object.values(value).forEach((v) => numbersInJson(v, out));
  return out;
}

export function checkOutput(text: string, inputJson: unknown): OutputCheckResult {
  const violations: string[] = [];
  if (!text || !text.trim()) return { ok: false, violations: ["EMPTY"] };

  for (const id of findForbidden(text)) violations.push(`FORBIDDEN:${id}`);
  if (PERCENT_PATTERN.test(stripInputPercentages(text, percentNumbersInJson(inputJson, new Set())))) {
    violations.push("PERCENTAGE");
  }
  if (CHANCE.test(text)) violations.push("CHANCE");
  if (PROBABILITY.test(text)) violations.push("PROBABILITY");
  if (DIAGNOSIS.test(text)) violations.push("DIAGNOSIS");
  if (PRESCRIBING.test(text)) violations.push("PRESCRIBING");

  const lower = text.toLowerCase();
  for (const m of MEDICINE_BLOCKLIST) {
    const found = /^[a-z]/.test(m) ? new RegExp(`\\b${m}\\b`, "i").test(lower) : lower.includes(m);
    if (found) violations.push(`MEDICINE:${m}`);
  }

  const allowed = numbersInJson(inputJson, new Set());
  for (const n of new Set(extractNumbers(text))) {
    if (!allowed.has(n)) violations.push(`UNKNOWN_NUMBER:${n}`);
  }
  return { ok: violations.length === 0, violations };
}
