import React, { useState } from "react";
import { CheckCircle2, Download, Send } from "lucide-react";
import type { PathwayId } from "../engine/types";
import { isPermitted } from "../data/records";
import type { Actor, ReproRepository, ServiceRequestResource } from "../data/repository";
import { t } from "../i18n";
import type { PdfContext } from "../services/pdf";
import { Button, Chip, CitationText, downloadBlob, FieldError, formatTimestamp, inputClass, Label, Modal } from "./ui";

/**
 * Referral summary: a FHIR-shaped ServiceRequest (JSON) and a PDF for the receiving clinician.
 * Records the created time for "time to counselling". Never books an appointment.
 */
export const ReferralSummary: React.FC<{
  repo: ReproRepository;
  ctx: Omit<PdfContext, "arabicFontBase64">;
  today: string;
  actor: Actor;
  onChanged: (message: string) => void;
  onClose: () => void;
}> = ({ repo, ctx, today, actor, onChanged, onClose }) => {
  const { record, result } = ctx;
  const steps = result.nextSteps;
  const [pathway, setPathway] = useState<PathwayId | "">(steps[0]?.pathway ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const clinicianSharing = isPermitted(record, "CLINICIAN_SHARING");
  const step = steps.find((s) => s.pathway === pathway);

  const act = async (fn: () => Promise<unknown>, message: string) => {
    setBusy(true);
    setError(undefined);
    try {
      await fn();
      onChanged(message);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const download = async (sr: ServiceRequestResource, kind: "pdf" | "json") => {
    const pdf = await import("../services/pdf");
    const base = `referral-${record.isDemo ? "demo" : record.patientId}-${sr.id.split("-").pop()}`;
    if (kind === "json") downloadBlob(new Blob([JSON.stringify(pdf.referralJson(sr, record, result), null, 2)], { type: "application/json" }), `${base}.json`);
    else downloadBlob(pdf.buildReferralPdf(ctx, sr).output("blob"), `${base}.pdf`);
  };

  return (
    <Modal title="Referral summary" onClose={onClose} wide>
      <div className="space-y-4">
        <p className="text-xs text-slate-600">{t("en", "referral.notBooking")}</p>
        {!clinicianSharing ? (
          <p className="text-sm font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
            Clinician sharing consent is off for this patient, so a referral summary cannot be created. Change it in Manage consent if the patient agrees.
          </p>
        ) : steps.length === 0 ? (
          <p className="text-sm text-slate-600">The rules suggest no pathway today, so there is nothing to refer.</p>
        ) : (
          <div className="space-y-3">
            <div>
              <Label htmlFor="ref-pathway">Pathway</Label>
              <select id="ref-pathway" className={`${inputClass} !w-auto`} value={pathway} onChange={(e) => setPathway(e.target.value as PathwayId)}>
                {steps.map((s) => (
                  <option key={s.pathway} value={s.pathway}>
                    {s.pathway} · {t("en", `pathway.${s.pathway}`)} ({t("en", `urgency.${s.urgency}`)})
                  </option>
                ))}
              </select>
            </div>
            {step && (
              <ul className="space-y-1.5">
                {step.items.map((i) => (
                  <li key={i.ruleId} className="text-xs text-slate-700">
                    <Chip>{i.ruleId}</Chip> {t("en", i.messageKey)} <CitationText citation={i.citation} />
                  </li>
                ))}
              </ul>
            )}
            <FieldError message={error} />
            <Button
              variant="primary"
              icon={<Send size={14} />}
              disabled={busy || !step}
              onClick={() => act(() => repo.createReferral(record.patientId, step!.pathway, step!.items.map((i) => i.ruleId), actor), "Referral summary created")}
            >
              Create referral summary
            </Button>
          </div>
        )}

        <section>
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Referral summaries for this patient</h3>
          {record.serviceRequests.length === 0 && <p className="text-xs text-slate-500">None yet.</p>}
          <ul className="divide-y divide-slate-100 border border-slate-100 rounded-xl">
            {[...record.serviceRequests].reverse().map((sr) => (
              <li key={sr.id} className="p-3 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
                <div>
                  <p className="font-bold text-slate-800">
                    {sr.pathway} · {t("en", `pathway.${sr.pathway}`)} <Chip tone={sr.status === "completed" ? "emerald" : "sky"}>{sr.status}</Chip>
                  </p>
                  <p className="text-slate-500">
                    Created {formatTimestamp(sr.authoredOn)}
                    {sr.completedOn ? ` · completed ${formatTimestamp(sr.completedOn)}` : ""} · {sr.reasonRuleIds.join(", ")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button icon={<Download size={14} />} onClick={() => download(sr, "pdf")}>
                    PDF
                  </Button>
                  <Button icon={<Download size={14} />} onClick={() => download(sr, "json")}>
                    JSON
                  </Button>
                  {sr.status === "active" && (
                    <Button icon={<CheckCircle2 size={14} />} disabled={busy} onClick={() => act(() => repo.completeReferral(record.patientId, sr.id, actor), "Referral marked completed")}>
                      Mark completed
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <p className="text-xs text-slate-600">
            Counselling recorded: {record.counselling.length ? record.counselling.map((c) => c.date).join(", ") : "none"}
          </p>
          <Button disabled={busy} onClick={() => act(() => repo.recordCounselling(record.patientId, today, actor), "Counselling recorded for today")}>
            Record counselling today
          </Button>
        </section>
      </div>
    </Modal>
  );
};
