import React from "react";
import { RULES_BY_ID } from "../engine";
import type { VectorResult } from "../engine/types";
import { stateLabel, t, tm } from "../i18n";
import { Chip, CitationText, GlossaryText, Modal } from "./ui";

/** "Why?": inputs used, reasons, gaps, and every rule that fired for this card with its citation. */
export const EvidenceDrawer: React.FC<{ v: VectorResult; onClose: () => void }> = ({ v, onClose }) => (
  <Modal side title={`Why: ${t("en", `vector.${v.vector}.title`)} – ${stateLabel(v, "en")}`} onClose={onClose}>
    <div className="space-y-5 text-sm">
      <section>
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Inputs used</h3>
        <div className="flex flex-wrap gap-1">
          {v.inputsUsed.length ? v.inputsUsed.map((i) => <Chip key={i}>{t("en", `input.${i}`)}</Chip>) : <span className="text-xs text-slate-500">None</span>}
          <Chip tone="indigo">{t("en", `density.${v.density}`)}</Chip>
        </div>
      </section>

      <section>
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Reasons</h3>
        <ul className="space-y-2">
          {v.reasons.map((r, i) => (
            <li key={i} className="text-slate-700 leading-snug">
              <GlossaryText text={tm("en", r)} lang="en" />
              {r.citation && (
                <div>
                  <CitationText citation={r.citation} />
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      {v.gaps.length > 0 && (
        <section>
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Missing or withdrawn</h3>
          <ul className="list-disc ml-5 text-slate-600">
            {v.gaps.map((g, i) => (
              <li key={i}>{tm("en", g)}</li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Rules fired</h3>
        {v.ruleIds.length === 0 && <p className="text-xs text-slate-500">No rule fired for this card.</p>}
        <ul className="space-y-3">
          {v.ruleIds.map((id) => {
            const rule = RULES_BY_ID[id];
            return (
              <li key={id} className="border border-slate-100 rounded-xl p-3 bg-slate-50/50">
                <div className="flex items-center gap-2 mb-1">
                  <Chip tone="slate">{id}</Chip>
                  <span className="text-[11px] text-slate-500">{rule.description}</span>
                </div>
                <p className="text-slate-700 leading-snug">
                  <GlossaryText text={t("en", rule.output.messageKey)} lang="en" />
                </p>
                <CitationText citation={rule.citation} />
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">All citations for this card</h3>
        <ul className="space-y-1">
          {v.citations.map((c, i) => (
            <li key={i}>
              <CitationText citation={c} />
            </li>
          ))}
        </ul>
      </section>
      <p className="text-xs text-slate-500">{t("en", "common.decisionSupport")} {t("en", "common.doctorDecides")}</p>
    </div>
  </Modal>
);
