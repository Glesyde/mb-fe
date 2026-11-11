import React, { useState } from "react";
import { PhoneCall, Siren } from "lucide-react";
import type { RedFlagEvent } from "../data/repository";
import { AR_TEXT_ATTRS, t } from "../i18n";
import { formatTimestamp } from "./ui";

const FLAG_LABEL = {
  R35: "Severe, sudden one-sided pelvic pain with a missed period, a positive pregnancy test or fainting",
  R36: "Bleeding after sex or between periods",
} as const;

/**
 * Full-width emergency panel. Normal rendering for this patient stops until a clinician
 * resolves every open red flag: "Acknowledge and refer" or "Not present (dismiss)", both logged.
 */
export const EmergencyPanel: React.FC<{
  events: RedFlagEvent[];
  onResolve: (eventId: string, resolution: "ACKNOWLEDGED_REFERRED" | "DISMISSED") => Promise<void>;
}> = ({ events, onResolve }) => {
  const [busy, setBusy] = useState<string | null>(null);
  const act = async (id: string, resolution: "ACKNOWLEDGED_REFERRED" | "DISMISSED") => {
    setBusy(id);
    try {
      await onResolve(id, resolution);
    } finally {
      setBusy(null);
    }
  };
  return (
    <section role="alert" aria-live="assertive" className="w-full rounded-2xl border-2 border-red-600 bg-red-600 text-white shadow-lg overflow-hidden">
      <div className="p-5 md:p-6 space-y-3">
        <h3 className="text-lg md:text-xl font-black flex items-center gap-2">
          <Siren size={24} /> Urgent: red-flag symptoms
        </h3>
        <p className="text-base font-bold">{t("en", "common.emergency")}</p>
        <p className="text-base font-bold" {...AR_TEXT_ATTRS}>
          {t("ar", "common.emergency")}
        </p>
        <a href="tel:998" className="inline-flex items-center gap-2 bg-white text-red-700 font-black px-4 py-2 rounded-xl text-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60">
          <PhoneCall size={20} /> Ambulance: 998
        </a>
      </div>
      <div className="bg-red-700/60 p-4 md:p-5 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-red-100">Clinician action required for each red flag</p>
        {events.map((e) => (
          <div key={e.id} className="bg-white text-slate-800 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black">
                {e.ruleId}: {FLAG_LABEL[e.ruleId]}
              </p>
              <p className="text-[11px] text-slate-500">
                Found at entry {formatTimestamp(e.detectedAt)} · {e.source === "FREE_TEXT" ? "from symptom text (text not stored)" : e.source === "STRUCTURED" ? "from symptom checklist" : "demo scenario"}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => act(e.id, "ACKNOWLEDGED_REFERRED")}
                className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
              >
                Acknowledge and refer
              </button>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => act(e.id, "DISMISSED")}
                className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-black disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                Not present (dismiss)
              </button>
            </div>
          </div>
        ))}
        <p className="text-[11px] text-red-100">Both actions are recorded in the activity log with the time and your user name.</p>
      </div>
    </section>
  );
};
