// Message lookup. The engine returns keys; this turns them into text in one language.

import type { Language, MessageRef, VectorResult } from "../engine/types";
import { messagesAr } from "./messages.ar";
import { messagesEn, type MessageKey } from "./messages.en";

export { AR_TEXT_ATTRS } from "./messages.ar";
export type { MessageKey };

const CATALOGUES: Record<Language, Record<string, string>> = { en: messagesEn, ar: messagesAr };

/** Text for `key`, with {placeholders} filled. Unknown keys return the key itself (and fail tests). */
export function t(lang: Language, key: string, params?: Record<string, string | number>): string {
  const text = CATALOGUES[lang][key] ?? key;
  return params ? text.replace(/\{(\w+)\}/g, (m, p: string) => (params[p] !== undefined ? String(params[p]) : m)) : text;
}

export const tm = (lang: Language, ref: MessageRef) => t(lang, ref.key, ref.params);

export function hasKey(lang: Language, key: string): boolean {
  return key in CATALOGUES[lang];
}

/** Card state word. "Data withdrawn" when nothing is left to show; "In line with age" for V1. */
export function stateLabel(v: VectorResult, lang: Language): string {
  if (v.dataWithdrawn && v.state === "NOT_ENOUGH_DATA") return t(lang, "state.DATA_WITHDRAWN");
  if (v.vector === "V1" && v.state === "STABLE") return t(lang, "state.V1.STABLE");
  return t(lang, `state.${v.state}`);
}
