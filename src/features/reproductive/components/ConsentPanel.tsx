import React, { useState } from "react";
import { ShieldCheck } from "lucide-react";
import type { ConsentCategory } from "../engine/types";
import { ALL_CATEGORIES, CONSENT_STATEMENT, CONSENT_STEP_CATEGORIES, DEFAULT_PERMITTED } from "../data/records";
import type { ActivityEntry, Actor, ReproRecord } from "../data/repository";
import { t } from "../i18n";
import { Button, Card, Chip, FieldError, formatTimestamp, inputClass, Modal } from "./ui";

const label = (c: ConsentCategory) => t("en", `consent.category.${c}`);

/** Shown in "Consent activity": consent changes, partner links, and every read of a partner's EMR data. */
const CONSENT_LOG_ACTIONS: ActivityEntry["action"][] = [
  "CONSENT_CAPTURED",
  "CONSENT_CHANGED",
  "PARTNER_LINK_REQUESTED",
  "PARTNER_LINK_ACCEPTED",
  "PARTNER_LINK_DECLINED",
  "PARTNER_LINK_ENDED",
  "PARTNER_SHARING_CHANGED",
  "PARTNER_DATA_READ",
];

/** Consent summary chip row: how many categories are shared, and each one that is not. */
export const ConsentChips: React.FC<{ record: ReproRecord }> = ({ record }) => {
  const provisions = record.consent.provision.filter((p) => ALL_CATEGORIES.includes(p.category));
  const shared = provisions.filter((p) => p.type === "permit");
  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label="Consent by category">
      {record.consentMode === "DEMO" && <Chip tone="brand">Demo consent</Chip>}
      <Chip tone="emerald" title={shared.map((p) => label(p.category)).join(", ")}>
        ✓ {shared.length} of {provisions.length} categories shared
      </Chip>
      {provisions
        .filter((p) => p.type === "deny")
        .map((p) => (
          <Chip key={p.category} title={p.reason}>
            ✕ {label(p.category)}
          </Chip>
        ))}
    </div>
  );
};

/** First time the tab opens for a real MRN. Nothing is evaluated until this is confirmed. */
export const ConsentStep: React.FC<{ actor: Actor; today: string; onConfirm: (permitted: ConsentCategory[]) => Promise<void> }> = ({
  actor,
  today,
  onConfirm,
}) => {
  const [ticked, setTicked] = useState<ConsentCategory[]>(CONSENT_STEP_CATEGORIES.filter((c) => DEFAULT_PERMITTED.includes(c)));
  const [busy, setBusy] = useState(false);
  const toggle = (c: ConsentCategory) => setTicked((t) => (t.includes(c) ? t.filter((x) => x !== c) : [...t, c]));
  return (
    <Card className="p-6 max-w-2xl">
      <h3 className="text-base font-black text-slate-800 flex items-center gap-2 mb-1">
        <ShieldCheck size={18} className="text-brand-primary" /> Reproductive Health: consent
      </h3>
      <p className="text-xs text-slate-500 mb-4">Decision support and education only. No score, no diagnosis, no prescribing. Nothing is evaluated until you confirm.</p>
      <p className="text-sm font-bold text-slate-800 mb-3">{CONSENT_STATEMENT}</p>
      <fieldset className="grid sm:grid-cols-2 gap-2 mb-4">
        <legend className="sr-only">Data categories</legend>
        <label className="flex items-center gap-2 text-sm text-slate-500">
          <input type="checkbox" checked disabled className="h-4 w-4 accent-brand-primary" /> {label("PROFILE")} (required)
        </label>
        {CONSENT_STEP_CATEGORIES.map((c) => (
          <label key={c} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input type="checkbox" checked={ticked.includes(c)} onChange={() => toggle(c)} className="h-4 w-4 accent-brand-primary" />
            {label(c)}
          </label>
        ))}
      </fieldset>
      <p className="text-[11px] text-slate-500 mb-4">
        Recorded in the consent log as {actor.name} (user {actor.id}) on {today}. The patient can withdraw any category later. No insurer or employer
        access.
      </p>
      <Button
        variant="primary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await onConfirm(["PROFILE", ...ticked]);
          } finally {
            setBusy(false);
          }
        }}
      >
        Confirm consent
      </Button>
    </Card>
  );
};

/** Manage consent: a switch per category; every change needs a reason and is logged. */
export const ConsentManager: React.FC<{
  record: ReproRecord;
  activity: ActivityEntry[];
  onChange: (category: ConsentCategory, granted: boolean, reason: string) => Promise<void>;
  onClose: () => void;
}> = ({ record, activity, onChange, onClose }) => {
  const [pending, setPending] = useState<{ category: ConsentCategory; granted: boolean } | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string>();
  const consentLog = activity.filter((a) => CONSENT_LOG_ACTIONS.includes(a.action));

  return (
    <Modal title="Manage consent" onClose={onClose} wide>
      {record.consentMode === "DEMO" && <p className="text-xs text-brand-active font-bold mb-3">Demo consent: synthetic record.</p>}
      <ul className="divide-y divide-slate-100 mb-5">
        {record.consent.provision.map((p) => {
          const on = p.type === "permit";
          const locked = p.category === "PROFILE";
          return (
            <li key={p.category} className="py-2.5 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-800">{label(p.category)}</p>
                <p className="text-[11px] text-slate-500">
                  {locked ? "Required, cannot be withdrawn" : `${on ? "Shared" : "Not shared"} since ${p.updatedAt.slice(0, 10)}${p.reason ? ` · ${p.reason}` : ""}`}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={`${label(p.category)}: ${on ? "shared" : "not shared"}`}
                disabled={locked}
                onClick={() => {
                  setPending({ category: p.category, granted: !on });
                  setReason("");
                  setError(undefined);
                }}
                className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary disabled:opacity-50 ${on ? "bg-emerald-500" : "bg-slate-300"}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
              </button>
            </li>
          );
        })}
      </ul>

      {pending && (
        <div className="border border-amber-200 bg-amber-50/60 rounded-xl p-4 mb-5">
          <p className="text-sm font-bold text-slate-800 mb-2">
            {pending.granted ? "Share" : "Withdraw"} {label(pending.category)}?{" "}
            {!pending.granted && <span className="font-normal text-slate-600">This data leaves every calculation immediately.</span>}
          </p>
          <label htmlFor="consent-reason" className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
            Reason (required)
          </label>
          <input id="consent-reason" className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Patient asked to stop sharing" />
          <FieldError message={error} />
          <div className="flex gap-2 mt-3">
            <Button
              variant="primary"
              onClick={async () => {
                if (!reason.trim()) return setError("Enter a reason.");
                try {
                  await onChange(pending.category, pending.granted, reason);
                  setPending(null);
                } catch (e) {
                  setError(e instanceof Error ? e.message : String(e));
                }
              }}
            >
              Confirm
            </Button>
            <Button onClick={() => setPending(null)}>Cancel</Button>
          </div>
        </div>
      )}

      <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Consent activity</h3>
      <ul className="space-y-1.5 text-xs">
        {consentLog.length === 0 && <li className="text-slate-500">No changes yet.</li>}
        {consentLog.map((a) => (
          <li key={a.id} className="flex gap-2">
            <span className="font-mono text-slate-500 shrink-0">{formatTimestamp(a.at)}</span>
            <span className="text-slate-700">
              {a.category && <strong>{label(a.category)}: </strong>}
              {a.detail} <span className="text-slate-500">({a.by.name}, user {a.by.id})</span>
            </span>
          </li>
        ))}
      </ul>
    </Modal>
  );
};
