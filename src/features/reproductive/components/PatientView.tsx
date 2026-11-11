import React, { useState } from "react";
import { HelpCircle, Phone, Sparkles, Stethoscope, Users } from "lucide-react";
import type { FiredRule, Language, PathwayId, VectorResult } from "../engine/types";
import { AR_TEXT_ATTRS, hasKey, stateLabel, t, tm } from "../i18n";
import type { RunOutcome } from "../services/reproductive.service";
import { Card, Chip, formatCitation, GlossaryText, Modal, STATE_TONE } from "./ui";

type Ready = Extract<RunOutcome, { status: "READY" }>;

/** Things the person can do themselves first (P1, P3), then what the doctor may suggest. */
const YOU_CAN_DO: PathwayId[] = ["P1", "P3"];
const DOCTOR_MAY: PathwayId[] = ["P6", "P4", "P5", "P2"];

/** Removes "(NICE NG257 1.18.3)"-style citations: in the patient view they appear only under "Why?". */
function withoutCitation(text: string): string {
  return text.replace(/\s*\((NICE|ESHRE|Steiner)[^)]*\)/g, "");
}

/** Patient wording for a rule; falls back to the clinician text without its citation. */
function patientText(lang: Language, rule: { id: string; messageKey: string }): string {
  const key = `patient.rule.${rule.id}`;
  return hasKey(lang, key) ? t(lang, key) : withoutCitation(t(lang, rule.messageKey));
}

const PatientWhy: React.FC<{ v: VectorResult; lang: Language; onClose: () => void }> = ({ v, lang, onClose }) => (
  <Modal title={`${t(lang, `patient.vector.${v.vector}`)} – ${stateLabel(v, lang)}`} onClose={onClose}>
    <div className="space-y-3 text-base text-slate-700" {...(lang === "ar" ? AR_TEXT_ATTRS : {})}>
      {v.reasons
        .filter((r) => !r.key.startsWith("history.") || v.vector === "V5")
        .map((r, i) => (
          <p key={i}>
            <GlossaryText text={tm(lang, r)} lang={lang} />
          </p>
        ))}
      {v.gaps.map((g, i) => (
        <p key={`g${i}`} className="text-slate-500">
          {tm(lang, g)}
        </p>
      ))}
      <h3 className="text-sm font-black text-slate-800 pt-2">{t(lang, "patient.sources")}</h3>
      <ul className="list-disc ms-5 text-sm text-slate-500" dir="ltr">
        {v.citations.map((c, i) => (
          <li key={i}>{formatCitation(c)}</li>
        ))}
      </ul>
      <p className="font-bold">{t(lang, "common.doctorDecides")}</p>
    </div>
  </Modal>
);

const StepList: React.FC<{ items: FiredRule[]; lang: Language }> = ({ items, lang }) => (
  <ul className="space-y-3">
    {items.map((f) => (
      <li key={f.id} className="text-lg leading-relaxed text-slate-800 flex gap-3">
        <span className="mt-2.5 h-2 w-2 rounded-full bg-brand-primary shrink-0" aria-hidden />
        <span>
          <GlossaryText text={patientText(lang, f)} lang={lang} />
        </span>
      </li>
    ))}
  </ul>
);

/**
 * Patient-facing, read-only view of the same results (same engine, same consent): simpler words,
 * no rule IDs, no clinician actions, large text, "What you can do" first. English and Arabic.
 */
export const PatientView: React.FC<{ outcome: Ready; lang: Language }> = ({ outcome, lang }) => {
  const [why, setWhy] = useState<VectorResult | null>(null);
  const { result, record } = outcome;
  const dir = lang === "ar" ? AR_TEXT_ATTRS : { dir: "ltr" as const, lang: "en" };
  /** Rules for these pathways, in pathway order, each once (R10 is both P2 and P5). */
  const byPathway = (paths: PathwayId[]) => {
    const out: FiredRule[] = [];
    for (const p of paths) for (const f of result.firedRules) if (f.pathways.includes(p) && !out.includes(f)) out.push(f);
    return out;
  };

  if (result.halted) {
    return (
      <section role="alert" className="rounded-2xl bg-red-600 text-white p-6 space-y-3" {...dir}>
        <p className="text-2xl font-black">{t(lang, "common.emergency")}</p>
        <p className="text-lg font-bold">{t(lang, "patient.tellTeam")}</p>
        <a href="tel:998" className="inline-flex items-center gap-2 bg-white text-red-700 font-black px-5 py-3 rounded-xl text-xl">
          <Phone size={22} /> 998
        </a>
      </section>
    );
  }

  const youCanDo = byPathway(YOU_CAN_DO);
  const doctorMay = byPathway(DOCTOR_MAY);
  return (
    <div className="space-y-5" {...dir}>
      <div>
        <h3 className="text-2xl font-black text-slate-800">{t(lang, "patient.title")}</h3>
        <p className="text-base text-slate-600 mt-1">{t(lang, "patient.intro")}</p>
        {record.isDemo && <p className="text-sm font-bold text-brand-active mt-1">{t(lang, "brief.synthetic")}</p>}
      </div>

      <Card className="p-5">
        <h4 className="text-xl font-black text-slate-800 flex items-center gap-2 mb-3">
          <Sparkles size={20} className="text-brand-primary" /> {t(lang, "patient.whatYouCanDo")}
        </h4>
        {youCanDo.length ? <StepList items={youCanDo} lang={lang} /> : <p className="text-lg text-slate-700">{t(lang, "patient.nothingToChange")}</p>}
      </Card>

      <Card className="p-5">
        <h4 className="text-xl font-black text-slate-800 flex items-center gap-2 mb-3">
          <Stethoscope size={20} className="text-brand-primary" /> {t(lang, "patient.doctorMaySuggest")}
        </h4>
        {doctorMay.length ? <StepList items={doctorMay} lang={lang} /> : <p className="text-lg text-slate-700">{t(lang, "patient.nothingToSuggest")}</p>}
      </Card>

      {result.partnerSteps.some((f) => f.pathways.length) && (
        <Card className="p-5">
          <h4 className="text-xl font-black text-slate-800 flex items-center gap-2 mb-1">
            <Users size={20} className="text-brand-primary" /> {t(lang, "nextSteps.partnerGroup")}
          </h4>
          <p className="text-sm text-slate-500 mb-3">{t(lang, "nextSteps.partnerNote")}</p>
          <StepList items={result.partnerSteps.filter((f) => f.pathways.length)} lang={lang} />
        </Card>
      )}

      <section>
        <h4 className="text-xl font-black text-slate-800 mb-3">{t(lang, "patient.yourResults")}</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {result.vectors.map((v) => (
            <Card key={v.vector} className="p-5 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-lg font-black text-slate-800">{t(lang, `patient.vector.${v.vector}`)}</p>
                <Chip tone={v.dataWithdrawn && v.state === "NOT_ENOUGH_DATA" ? "slate" : STATE_TONE[v.state]}>{stateLabel(v, lang)}</Chip>
              </div>
              {v.reasons[0] && (
                <p className="text-base text-slate-700 leading-relaxed">
                  <GlossaryText text={withoutCitation(tm(lang, v.reasons[0]))} lang={lang} />
                </p>
              )}
              {v.density === "BASELINE_ONLY" && v.ruleIds.includes("R39") && <p className="text-sm text-slate-500">{t(lang, "patient.oneResult")}</p>}
              <button
                type="button"
                onClick={() => setWhy(v)}
                aria-label={`${t(lang, "patient.why")} ${t(lang, `patient.vector.${v.vector}`)}`}
                className="mt-auto self-start inline-flex items-center gap-1.5 text-sm font-bold text-brand-active hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded"
              >
                <HelpCircle size={16} /> {t(lang, "patient.why")}
              </button>
            </Card>
          ))}
        </div>
      </section>

      <p className="text-base text-slate-600">
        {t(lang, "patient.readOnly")} <strong>{t(lang, "common.doctorDecides")}</strong>
      </p>
      {why && <PatientWhy v={why} lang={lang} onClose={() => setWhy(null)} />}
    </div>
  );
};
