import React from "react";
import { ListChecks, Users } from "lucide-react";
import type { FiredRule, Language, NextStep } from "../engine/types";
import { AR_TEXT_ATTRS, t } from "../i18n";
import { Card, Chip, CitationText, GlossaryText, SectionTitle, URGENCY_TONE } from "./ui";

/**
 * Next steps in pathway priority order (P6 first), then "For your partner": steps from a linked
 * partner's shared data only. None prescribes medication or books an appointment.
 */
export const NextSteps: React.FC<{ steps: NextStep[]; partnerSteps: FiredRule[]; lang: Language }> = ({ steps, partnerSteps, lang }) => (
  <Card className="p-4" {...(lang === "ar" ? AR_TEXT_ATTRS : {})}>
    <SectionTitle icon={<ListChecks size={16} className="text-brand-primary" />}>Next steps</SectionTitle>
    {steps.length === 0 && <p className="text-xs text-slate-500">No referral, test or discussion is suggested by the rules today.</p>}
    <ol className="space-y-3">
      {steps.map((s) => (
        <li key={s.pathway} className="border-s-4 border-brand-primary/60 ps-3">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-black text-slate-800">
              {s.pathway} · {t(lang, `pathway.${s.pathway}`)}
            </span>
            <Chip tone={URGENCY_TONE[s.urgency]}>{t(lang, `urgency.${s.urgency}`)}</Chip>
          </div>
          <ul className="space-y-1.5">
            {s.items.map((i) => (
              <li key={i.ruleId} className="text-xs text-slate-700 leading-snug">
                <GlossaryText text={t(lang, i.messageKey)} lang={lang} />{" "}
                <span className="whitespace-nowrap">
                  <Chip>{i.ruleId}</Chip> <CitationText citation={i.citation} />
                </span>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>

    {partnerSteps.length > 0 && (
      <section className="mt-4 pt-3 border-t border-slate-100" aria-label={t("en", "nextSteps.partnerGroup")}>
        <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
          <Users size={14} className="text-brand-primary" /> {t(lang, "nextSteps.partnerGroup")}
        </h4>
        <p className="text-[11px] text-slate-500 mb-2">{t(lang, "nextSteps.partnerNote")}</p>
        <ul className="space-y-2">
          {partnerSteps.map((f) => (
            <li key={f.id} className="text-xs text-slate-700 leading-snug border-s-4 border-orange-200 ps-3">
              <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                {f.pathways.length ? (
                  f.pathways.map((p) => (
                    <span key={p} className="font-black text-slate-800">
                      {p} · {t(lang, `pathway.${p}`)}
                    </span>
                  ))
                ) : (
                  <span className="font-black text-slate-500">{t(lang, "urgency.INFO")}</span>
                )}
                <Chip tone={URGENCY_TONE[f.urgency]}>{t(lang, `urgency.${f.urgency}`)}</Chip>
              </div>
              <GlossaryText text={t(lang, f.messageKey)} lang={lang} />{" "}
              <span className="whitespace-nowrap">
                <Chip>{f.id}</Chip> <CitationText citation={f.citation} />
              </span>
            </li>
          ))}
        </ul>
      </section>
    )}
    <p className="text-[11px] text-slate-500 mt-3">
      Decision support only: no step prescribes medication or books an appointment. {t(lang, "common.doctorDecides")}
    </p>
  </Card>
);
