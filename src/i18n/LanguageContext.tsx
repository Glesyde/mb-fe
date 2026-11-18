// App-wide language (English / Arabic).
//
// Text is keyed by its English wording, so untranslated text falls back to English:
//   const { t, tv } = useLanguage();
//   t("Patient Search")            -> UI text from src/i18n/ar/ui.ts or ar/pages.ts
//   t("Results ({count})", { count: 3 })
//   tv(order.status)               -> backend value ("IN_PROGRESS", "female", "nurse_manager")
//                                     from src/i18n/ar/values.ts; unknown values are shown as sent.
//
// Only translate at display time. Never write translated text back into data sent to the API.

import React, { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState } from "react";
import { AR_UI } from "./ar/ui";
import { AR_VALUES } from "./ar/values";
import { AR_PAGES } from "./ar/pages";

export type Lang = "en" | "ar";

const STORAGE_KEY = "his.lang";

/** Intl locales. Arabic keeps Western digits so doses, IDs and lab values read the same in both languages. */
const LOCALES: Record<Lang, string> = { en: "en-NG", ar: "ar-u-nu-latn" };

function readStoredLang(): Lang {
  try {
    return localStorage.getItem(STORAGE_KEY) === "ar" ? "ar" : "en";
  } catch {
    return "en";
  }
}

// Module-level copy so code outside React (services, helpers) can call t()/tv().
// Those calls don't re-render on a language switch; components should use useLanguage().
let currentLang: Lang = readStoredLang();
export const getLang = (): Lang => currentLang;

const missing = new Set<string>();
function noteMissing(kind: "ui" | "value", text: string) {
  if (!(import.meta as any).env?.DEV || missing.has(`${kind}:${text}`)) return;
  missing.add(`${kind}:${text}`);
  // Inspect in the browser console with: [...window.__i18nMissing]
  (window as any).__i18nMissing = missing;
}

function fill(text: string, params?: Record<string, string | number>): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (m, p: string) => (params[p] !== undefined ? String(params[p]) : m));
}

/** "IN_PROGRESS", "In-Progress", " in progress " -> "in progress" */
export function normalizeValue(value: string): string {
  return value.trim().toLowerCase().replace(/[_\-]+/g, " ").replace(/\s+/g, " ");
}

// "First Name:", "FIRST NAME", "First name *" all share the entry for "first name".
const SUFFIX_RE = /\s*(:|\*|\.\.\.|…)+\s*$/;
const coreKey = (text: string) => text.replace(SUFFIX_RE, "").trim().toLowerCase();

let coreIndex: Record<string, string> | null = null;
function getCoreIndex(): Record<string, string> {
  if (coreIndex) return coreIndex;
  coreIndex = { ...AR_PAGES };
  for (const [en, ar] of Object.entries(AR_UI)) coreIndex[coreKey(en)] ??= ar.replace(SUFFIX_RE, "").trim();
  return coreIndex;
}

function lookupArabic(text: string): string | undefined {
  const exact = AR_UI[text];
  if (exact !== undefined) return exact;
  const ar = getCoreIndex()[coreKey(text)];
  if (ar === undefined) return undefined;
  const suffix = text.match(SUFFIX_RE)?.[0].trim() ?? "";
  return suffix ? `${ar}${suffix.startsWith("*") ? " " : ""}${suffix}` : ar;
}

export function translate(lang: Lang, text: string, params?: Record<string, string | number>): string {
  if (lang === "en" || !text) return fill(text, params);
  const ar = lookupArabic(text);
  if (ar === undefined) noteMissing("ui", text);
  return fill(ar ?? text, params);
}

export function translateValue(lang: Lang, value: unknown): string {
  if (value === null || value === undefined) return "";
  const raw = String(value);
  if (lang === "en" || !raw.trim()) return raw;
  const ar = AR_VALUES[normalizeValue(raw)];
  if (ar === undefined) noteMissing("value", raw);
  return ar ?? raw;
}

/** Non-reactive helpers for code outside components. */
export const t = (text: string, params?: Record<string, string | number>) => translate(currentLang, text, params);
export const tv = (value: unknown) => translateValue(currentLang, value);

/**
 * Helpers used across the page components (added by the i18n conversion). They read the current
 * language at render time; LanguageRoot re-renders the app on a switch, so pages update.
 *   i18n.t("Save")      interface text
 *   i18n.tv(x.status)   backend value; anything that isn't a string is returned unchanged
 *   i18n.tx(item.label) label from a data list; anything that isn't a string is returned unchanged
 */
export const i18n = {
  t,
  tv: <T,>(value: T): T | string => (typeof value === "string" ? translateValue(currentLang, value) : value),
  tx: <T,>(value: T): T | string => (typeof value === "string" ? translate(currentLang, value) : value),
};

interface LanguageContextValue {
  lang: Lang;
  dir: "ltr" | "rtl";
  isRTL: boolean;
  /** Locale for toLocaleDateString / Intl. */
  locale: string;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  t: (text: string, params?: Record<string, string | number>) => string;
  tv: (value: unknown) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>(currentLang);

  const setLang = useCallback((next: Lang) => {
    currentLang = next;
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* private mode: the choice just isn't remembered */
    }
  }, []);

  useLayoutEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      lang,
      dir: lang === "ar" ? "rtl" : "ltr",
      isRTL: lang === "ar",
      locale: LOCALES[lang],
      setLang,
      toggleLang: () => setLang(lang === "ar" ? "en" : "ar"),
      t: (text, params) => translate(lang, text, params),
      tv: (v) => translateValue(lang, v),
    }),
    [lang, setLang],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

/**
 * Re-renders (doesn't remount) everything below it when the language changes, so pages that use
 * i18n.t() update without losing what's been typed into forms.
 */
export const LanguageRoot: React.FC<{ render: () => React.ReactNode }> = ({ render }) => {
  useLanguage();
  return <>{render()}</>;
};

/** Falls back to English outside the provider (e.g. isolated tests or harnesses). */
export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (ctx) return ctx;
  return {
    lang: "en",
    dir: "ltr",
    isRTL: false,
    locale: LOCALES.en,
    setLang: () => {},
    toggleLang: () => {},
    t: (text, params) => translate("en", text, params),
    tv: (v) => translateValue("en", v),
  };
}
