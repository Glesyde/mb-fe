import React, { useState } from "react";
import { Download } from "lucide-react";
import type { Language } from "../engine/types";
import { AR_TEXT_ATTRS, stateLabel, t, tm } from "../i18n";
import type { PdfContext } from "../services/pdf";
import { Button, downloadBlob, FieldError, LANGUAGE_OPTIONS, Modal, SegmentedControl } from "./ui";

/** Printable discussion brief: preview in EN or AR, and a PDF with both. */
export const DiscussionBrief: React.FC<{ ctx: Omit<PdfContext, "arabicFontBase64">; onClose: () => void }> = ({ ctx, onClose }) => {
  const [lang, setLang] = useState<Language>("en");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const { brief, result, record } = ctx;
  const own = brief.discussionPoints.filter((d) => !d.forPartner);
  const partner = brief.discussionPoints.filter((d) => d.forPartner);
  const missing = Array.from(new Set(brief.missingTests.map((g) => tm(lang, g))));

  const download = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const pdf = await import("../services/pdf");
      let font: string | undefined;
      try {
        font = await pdf.loadArabicFont();
      } catch {
        setError("The Arabic font could not be loaded, so this PDF is in English only.");
      }
      const doc = pdf.buildBriefPdf({ ...ctx, arabicFontBase64: font });
      downloadBlob(doc.output("blob"), `discussion-brief-${record.isDemo ? "demo" : record.patientId}-${brief.asOf}.pdf`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const h = (key: string) => <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mt-4 mb-1.5">{t(lang, key)}</h3>;

  return (
    <Modal title="Discussion brief" onClose={onClose} wide>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <SegmentedControl label="Preview language" value={lang} onChange={setLang} options={LANGUAGE_OPTIONS} />
        <Button variant="primary" icon={<Download size={14} />} disabled={busy} onClick={download}>
          Download PDF (English + Arabic)
        </Button>
      </div>
      <FieldError message={error} />

      <article className="border border-slate-200 rounded-xl p-5 text-sm text-slate-700 bg-white" {...(lang === "ar" ? AR_TEXT_ATTRS : { dir: "ltr", lang: "en" })}>
        <h2 className="text-lg font-black text-slate-800">{t(lang, "brief.title")}</h2>
        {record.isDemo && <p className="text-xs font-bold text-brand-active">{t(lang, "brief.synthetic")}</p>}
        <p className="text-xs text-slate-500">{t(lang, "brief.date", { date: brief.asOf })}</p>

        {h("brief.summary")}
        {ctx.summary[lang].split("\n").map((l, i) => (
          <p key={i} className="mb-1">
            {l}
          </p>
        ))}

        {h("brief.trends")}
        <ul className="list-disc ms-5 space-y-0.5">
          {result.vectors.map((v) => {
            const trend = brief.trends.find((x) => x.vector === v.vector);
            return (
              <li key={v.vector}>
                {t(lang, `vector.${v.vector}.title`)}: {stateLabel(v, lang)} ({t(lang, `density.${v.density}`)}).{" "}
                {trend?.latest && t(lang, "brief.latest", { value: trend.latest.value, unit: trend.latest.unit, date: trend.latest.date })}
              </li>
            );
          })}
        </ul>

        {h("brief.discussion")}
        {own.length === 0 && partner.length === 0 && <p>{t(lang, "brief.noDiscussion")}</p>}
        <ul className="list-disc ms-5 space-y-0.5">
          {own.map((d) => (
            <li key={d.ruleId}>
              {d.pathway && <strong>{t(lang, `pathway.${d.pathway}`)}: </strong>}
              {t(lang, d.messageKey)} <span className="text-slate-500">[{d.ruleId}]</span>
            </li>
          ))}
        </ul>
        {partner.length > 0 && (
          <>
            <p className="font-bold mt-2">
              {t(lang, "nextSteps.partnerGroup")} <span className="font-normal text-slate-500">– {t(lang, "nextSteps.partnerNote")}</span>
            </p>
            <ul className="list-disc ms-5 space-y-0.5">
              {partner.map((d) => (
                <li key={d.ruleId}>
                  {t(lang, d.messageKey)} <span className="text-slate-500">[{d.ruleId}]</span>
                </li>
              ))}
            </ul>
          </>
        )}

        {h("brief.missing")}
        {missing.length ? (
          <ul className="list-disc ms-5">
            {missing.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        ) : (
          <p>{t(lang, "brief.noneMissing")}</p>
        )}

        {h("brief.citations")}
        <ul className="list-disc ms-5 text-xs text-slate-500" dir="ltr">
          {brief.citations.map((c, i) => (
            <li key={i}>
              {c.source}
              {c.ref ? ` ${c.ref}` : ""}
            </li>
          ))}
        </ul>
        <p className="mt-5 pt-3 border-t border-slate-100 text-[11px] text-slate-500">{t(lang, "brief.footer")}</p>
      </article>
    </Modal>
  );
};
