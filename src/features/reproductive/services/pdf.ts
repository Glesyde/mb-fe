// Discussion brief (EN + AR) and referral summary PDFs, built with jsPDF from the brief payload.
// Arabic uses the bundled Amiri font (SIL OFL); jsPDF shapes Arabic letters and reorders them RTL.
// No network: the font is a local asset, loaded only when a PDF is made.

import { jsPDF } from "jspdf";
import type { EngineResult, Language, Sex } from "../engine/types";
import type { ReproRecord, ServiceRequestResource } from "../data/repository";
import { stateLabel, t, tm } from "../i18n";
import type { BriefPayload } from "./reproductive.service";

const ARABIC_FONT = "Amiri";
const MARGIN = 16;
/** Logical Arabic in, visual order out, right-to-left paragraph. Checked visually; other combinations reverse letters or words. */
const RTL = { isInputVisual: false, isOutputVisual: true, isInputRtl: true, isOutputRtl: false } as const;
const LINE = 5.2;

export interface PdfContext {
  record: ReproRecord;
  result: EngineResult;
  brief: BriefPayload;
  /** Template text per language (stage 7). */
  summary: Record<Language, string>;
  subject: { sex: Sex | null; ageYears: number | null };
  /** Base64 TTF for Arabic. Without it the PDF is English only. */
  arabicFontBase64?: string;
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

/** Browser only: fetch the bundled font file (same origin, no API call). */
export async function loadArabicFont(): Promise<string> {
  const { default: url } = await import("../assets/fonts/Amiri-Regular.ttf?url");
  const res = await fetch(url);
  if (!res.ok) throw new Error("Arabic font could not be loaded");
  return toBase64(await res.arrayBuffer());
}

function registerArabic(doc: jsPDF, base64: string) {
  doc.addFileToVFS("Amiri-Regular.ttf", base64);
  doc.addFont("Amiri-Regular.ttf", ARABIC_FONT, "normal");
}

/** A tiny flowing-text writer: headings, paragraphs and bullets, with page breaks and a footer on every page. */
class Writer {
  y = MARGIN;
  constructor(
    private doc: jsPDF,
    private lang: Language,
  ) {
    this.useFont("normal");
  }

  private useFont(style: "normal" | "bold") {
    if (this.lang === "ar") this.doc.setFont(ARABIC_FONT, "normal");
    else this.doc.setFont("helvetica", style);
  }

  private get width() {
    return this.doc.internal.pageSize.getWidth() - MARGIN * 2;
  }

  private ensure(height: number) {
    if (this.y + height > this.doc.internal.pageSize.getHeight() - 22) {
      this.doc.addPage();
      this.y = MARGIN;
    }
  }

  private line(text: string, indent = 0) {
    const pageWidth = this.doc.internal.pageSize.getWidth();
    if (this.lang === "ar") {
      this.doc.text(text, pageWidth - MARGIN - indent, this.y, { align: "right", ...RTL });
    } else {
      this.doc.text(text, MARGIN + indent, this.y);
    }
  }

  heading(text: string, size = 13) {
    this.ensure(12);
    this.y += 3;
    this.doc.setFontSize(size);
    this.useFont("bold");
    this.line(text);
    this.y += LINE + 1.5;
    this.useFont("normal");
    this.doc.setFontSize(10);
  }

  para(text: string, { indent = 0, size = 10, color = 30 }: { indent?: number; size?: number; color?: number } = {}) {
    this.doc.setFontSize(size);
    this.doc.setTextColor(color);
    const lines: string[] = this.doc.splitTextToSize(text, this.width - indent);
    for (const l of lines) {
      this.ensure(LINE);
      this.line(l, indent);
      this.y += LINE * (size / 10);
    }
    this.doc.setTextColor(30);
    this.y += 1;
  }

  bullet(text: string) {
    this.para(`• ${text}`, { indent: 3 });
  }
}

function addFooters(doc: jsPDF, pageLangs: Language[]) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(90);
    doc.setFont("helvetica", "normal");
    doc.text(t("en", "brief.footer"), w / 2, h - 12, { align: "center", maxWidth: w - MARGIN * 2 });
    if (pageLangs[i - 1] === "ar") {
      doc.setFont(ARABIC_FONT, "normal");
      doc.text(t("ar", "brief.footer"), w / 2, h - 7, { align: "center", ...RTL });
    }
    doc.setTextColor(30);
  }
}

/** Arabic pages write dates as "7 نوفمبر 2026": ISO dates with hyphens get reordered in right-to-left text. */
export function pdfDate(isoDate: string, lang: Language): string {
  if (lang === "en") return isoDate.slice(0, 10);
  const [y, m, d] = isoDate.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("ar-AE-u-nu-latn", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
}

const sexLabel = (lang: Language, sex: Sex | null) => t(lang, sex ? `sex.${sex}` : "sex.unknown");
const ageLabel = (lang: Language, age: number | null) => (age === null ? t(lang, "age.unknown") : t(lang, "age.years", { age }));

function writeBriefLanguage(w: Writer, ctx: PdfContext, lang: Language) {
  const { record, result, brief, subject } = ctx;
  w.heading(t(lang, "brief.title"), 16);
  if (record.isDemo) w.para(t(lang, "brief.synthetic"), { color: 160 });
  w.para(`${t(lang, "brief.person", { sex: sexLabel(lang, subject.sex), age: ageLabel(lang, subject.ageYears) })} · ${t(lang, "brief.date", { date: pdfDate(brief.asOf, lang) })}`);

  w.heading(t(lang, "brief.summary"));
  for (const line of ctx.summary[lang].split("\n")) w.para(line);

  w.heading(t(lang, "brief.trends"));
  for (const v of result.vectors) {
    const trend = brief.trends.find((x) => x.vector === v.vector);
    const latest = trend?.latest ? ` ${t(lang, "brief.latest", { value: trend.latest.value, unit: trend.latest.unit, date: pdfDate(trend.latest.date, lang) })}` : "";
    w.bullet(`${t(lang, `vector.${v.vector}.title`)}: ${stateLabel(v, lang)} (${t(lang, `density.${v.density}`)}).${latest}`);
  }

  w.heading(t(lang, "brief.discussion"));
  const own = brief.discussionPoints.filter((d) => !d.forPartner);
  const partner = brief.discussionPoints.filter((d) => d.forPartner);
  if (!own.length && !partner.length) w.para(t(lang, "brief.noDiscussion"));
  for (const d of own) w.bullet(`${d.pathway ? `${d.pathway} ${t(lang, `pathway.${d.pathway}`)}: ` : ""}${t(lang, d.messageKey)} [${d.ruleId}]`);
  if (partner.length) {
    w.para(`${t(lang, "nextSteps.partnerGroup")} – ${t(lang, "nextSteps.partnerNote")}`);
    for (const d of partner) w.bullet(`${d.pathway ? `${d.pathway} ${t(lang, `pathway.${d.pathway}`)}: ` : ""}${t(lang, d.messageKey)} [${d.ruleId}]`);
  }

  w.heading(t(lang, "brief.missing"));
  const missing = Array.from(new Set(brief.missingTests.map((g) => tm(lang, g))));
  if (!missing.length) w.para(t(lang, "brief.noneMissing"));
  for (const m of missing) w.bullet(m);

  w.heading(t(lang, "brief.citations"));
  for (const c of brief.citations) w.bullet(`${c.source}${c.ref ? ` ${c.ref}` : ""}`);
}

/** Discussion brief: page(s) in English, then page(s) in Arabic. Footer on every page. */
export function buildBriefPdf(ctx: PdfContext): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageLangs: Language[] = [];
  writeBriefLanguage(new Writer(doc, "en"), ctx, "en");
  while (pageLangs.length < doc.getNumberOfPages()) pageLangs.push("en");
  if (ctx.arabicFontBase64) {
    registerArabic(doc, ctx.arabicFontBase64);
    doc.addPage();
    writeBriefLanguage(new Writer(doc, "ar"), ctx, "ar");
    while (pageLangs.length < doc.getNumberOfPages()) pageLangs.push("ar");
  }
  addFooters(doc, pageLangs);
  return doc;
}

/** FHIR-shaped ServiceRequest JSON for a referral summary. Rule IDs and citations as reasons; no booking. */
export function referralJson(referral: ServiceRequestResource, record: ReproRecord, result: EngineResult) {
  const reasons = result.firedRules.filter((r) => referral.reasonRuleIds.includes(r.id));
  return {
    resourceType: "ServiceRequest",
    id: referral.id,
    status: referral.status,
    intent: referral.intent,
    category: [{ text: t("en", `pathway.${referral.pathway}`) }],
    code: { coding: [{ system: "urn:medbookie:repro:pathway", code: referral.pathway }], text: t("en", `pathway.${referral.pathway}`) },
    subject: { reference: `Patient/${record.patientId}`, ...(record.isDemo ? { display: "Synthetic demo case" } : {}) },
    authoredOn: referral.authoredOn,
    ...(referral.completedOn ? { occurrenceDateTime: referral.completedOn } : {}),
    reasonCode: reasons.map((r) => ({
      coding: [{ system: "urn:medbookie:repro:rule", code: r.id }],
      text: `${t("en", r.messageKey)} (${r.citation.source}${r.citation.ref ? ` ${r.citation.ref}` : ""})`,
    })),
    note: [{ text: t("en", "referral.notBooking") }, { text: t("en", "common.doctorDecides") }],
  };
}

/** Referral summary PDF (English, for the receiving clinician). */
export function buildReferralPdf(ctx: PdfContext, referral: ServiceRequestResource): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const w = new Writer(doc, "en");
  const { record, result, subject } = ctx;
  w.heading(t("en", "referral.title"), 16);
  if (record.isDemo) w.para(t("en", "brief.synthetic"), { color: 160 });
  w.para(`${record.isDemo ? "Synthetic demo case" : `MRN ${record.patientId}`} · ${sexLabel("en", subject.sex)}, ${ageLabel("en", subject.ageYears)}`);
  w.para(t("en", "referral.pathway", { pathway: `${referral.pathway} ${t("en", `pathway.${referral.pathway}`)}` }));
  w.para(t("en", "referral.created", { time: referral.authoredOn.length > 10 ? `${referral.authoredOn.replace("T", " ").slice(0, 16)} UTC` : referral.authoredOn }));
  w.para(t("en", "referral.notBooking"), { color: 90 });

  w.heading(t("en", "referral.reasons"));
  for (const r of result.firedRules.filter((f) => referral.reasonRuleIds.includes(f.id))) {
    w.bullet(`${r.id}: ${t("en", r.messageKey)} (${r.citation.source}${r.citation.ref ? ` ${r.citation.ref}` : ""})`);
  }

  w.heading(t("en", "referral.context"));
  for (const v of result.vectors) w.bullet(`${t("en", `vector.${v.vector}.title`)}: ${stateLabel(v, "en")} (${t("en", `density.${v.density}`)})`);

  w.heading(t("en", "brief.missing"));
  const missing = Array.from(new Set(ctx.brief.missingTests.map((g) => tm("en", g))));
  if (!missing.length) w.para(t("en", "brief.noneMissing"));
  for (const m of missing) w.bullet(m);
  w.para(t("en", "common.doctorDecides"));
  addFooters(doc, Array(doc.getNumberOfPages()).fill("en"));
  return doc;
}
