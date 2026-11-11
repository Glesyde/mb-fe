import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { findForbidden, PERCENT_PATTERN } from "../guardrails/forbiddenPhrases";
import { messagesAr } from "../i18n/messages.ar";
import { messagesEn, PERCENT_ALLOWED_KEYS, type MessageKey } from "../i18n/messages.en";

const catalogues = { en: messagesEn as Record<MessageKey, string>, ar: messagesAr };

describe("forbidden wording scan", () => {
  for (const [lang, catalogue] of Object.entries(catalogues)) {
    it(`${lang}: no forbidden phrase in any message`, () => {
      const hits = Object.entries(catalogue).flatMap(([key, text]) => findForbidden(text).map((id) => `${key}: ${id}`));
      expect(hits).toEqual([]);
    });

    it(`${lang}: no percentage outside the allow-listed NICE population figure`, () => {
      const hits = Object.entries(catalogue)
        .filter(([key, text]) => PERCENT_PATTERN.test(text) && !PERCENT_ALLOWED_KEYS.includes(key as MessageKey))
        .map(([key]) => key);
      expect(hits).toEqual([]);
    });

    it(`${lang}: the allow-listed figure is framed for couples in general and cites NICE NG257 1.4.1`, () => {
      const r05 = catalogue["rule.R05"];
      expect(r05).toContain("NICE NG257 1.4.1");
      expect(r05).toContain(lang === "en" ? "For couples in general, not a prediction for any one person" : "وليس توقعًا لأي شخص بعينه");
    });
  }

  it("the scan itself catches what it should", () => {
    expect(findForbidden("Your Fertility Score")).toContain("fertility score");
    expect(findForbidden("low AMH means you can't get pregnant")).toContain("low AMH means you can't get pregnant");
    expect(findForbidden("Your biological clock")).toContain("biological clock");
    expect(findForbidden("This is CRITICAL")).toContain("critical");
    expect(findForbidden("Alarming result")).toContain("alarming");
    expect(findForbidden("الساعة البيولوجية")).toContain("الساعة البيولوجية");
    expect(PERCENT_PATTERN.test("80٪")).toBe(true);
  });
});

describe("catalogue structure", () => {
  it("English and Arabic have the same keys", () => {
    expect(Object.keys(messagesAr).sort()).toEqual(Object.keys(messagesEn).sort());
  });
  it("no empty strings", () => {
    for (const c of Object.values(catalogues)) expect(Object.values(c).filter((t) => !t.trim())).toEqual([]);
  });
  it("emergency wording is exact", () => {
    expect(messagesEn["common.emergency"]).toBe(
      "These symptoms need urgent medical care. Call 998 for an ambulance or go to the nearest emergency department now.",
    );
    expect(messagesAr["common.emergency"]).toBe(
      "تحتاج هذه الأعراض إلى رعاية طبية عاجلة. اتصل بالرقم 998 للإسعاف أو توجّه الآن إلى أقرب قسم طوارئ.",
    );
  });
  it("every Arabic string carries the pending-review comment", () => {
    const source = readFileSync(resolve(process.cwd(), "src/features/reproductive/i18n/messages.ar.ts"), "utf8");
    const entries = source.split("\n").filter((line) => /^\s*"[^"]+":\s*"/.test(line));
    expect(entries.length).toBe(Object.keys(messagesAr).length);
    expect(entries.filter((line) => !line.includes("// ARABIC: pending native clinician review"))).toEqual([]);
  });
});
