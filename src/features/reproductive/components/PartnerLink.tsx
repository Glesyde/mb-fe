import React, { useState } from "react";
import { Link2, Unlink } from "lucide-react";
import type { ConsentCategory } from "../engine/types";
import { isPermitted } from "../data/records";
import type { Actor, ReproRecord, ReproRepository } from "../data/repository";
import { stateLabel, t } from "../i18n";
import type { PartnerSummary } from "../services/reproductive.service";
import { Button, Chip, FieldError, inputClass, Label, Modal } from "./ui";

const label = (c: ConsentCategory) => t("en", `consent.category.${c}`);
/** Categories a person can choose to share with a partner: only what they consented to. Never symptoms. */
const shareOptions = (r: ReproRecord): ConsentCategory[] =>
  ["PROFILE", "CYCLES", "METABOLIC", "HORMONES_SEMEN", "HISTORY", "LIFESTYLE", "PLANS", "WEARABLES"].filter((c) => isPermitted(r, c as ConsentCategory)) as ConsentCategory[];

const ShareBoxes: React.FC<{ record: ReproRecord; value: ConsentCategory[]; onChange: (v: ConsentCategory[]) => void }> = ({ record, value, onChange }) => (
  <fieldset className="grid sm:grid-cols-2 gap-2">
    <legend className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1 mb-1">What this patient shares with the partner</legend>
    {shareOptions(record).map((c) => (
      <label key={c} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
        <input
          type="checkbox"
          className="h-4 w-4 accent-brand-primary"
          checked={value.includes(c)}
          onChange={(e) => onChange(e.target.checked ? [...value, c] : value.filter((x) => x !== c))}
        />
        {label(c)}
      </label>
    ))}
  </fieldset>
);

/**
 * Partner link: search by MRN, both sides must consent in their own chart, and each side
 * chooses what they share. The partner's symptoms and red flags are never shared.
 */
export const PartnerLink: React.FC<{
  repo: ReproRepository;
  record: ReproRecord;
  partner: PartnerSummary | null;
  actor: Actor;
  onChanged: (message: string) => void;
  onClose: () => void;
}> = ({ repo, record, partner, actor, onChanged, onClose }) => {
  const [mrn, setMrn] = useState("");
  const [share, setShare] = useState<ConsentCategory[]>(partner?.youShare ?? ["PROFILE"]);
  const [agree, setAgree] = useState(isPermitted(record, "PARTNER_SHARING"));
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const id = record.patientId;
  const needsConsent = !isPermitted(record, "PARTNER_SHARING");

  const run = async (fn: () => Promise<unknown>, message: string) => {
    setBusy(true);
    setError(undefined);
    try {
      if (needsConsent && agree) await repo.setConsent(id, "PARTNER_SHARING", true, "Patient agreed to share with their partner", actor);
      await fn();
      onChanged(message);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const consentBox = needsConsent && (
    <label className="flex items-start gap-2 text-sm text-slate-700 bg-amber-50 border border-amber-200 rounded-xl p-3 cursor-pointer">
      <input type="checkbox" className="h-4 w-4 mt-0.5 accent-brand-primary" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
      The patient agrees to share with their partner (turns on Partner sharing consent; logged with your name and the date).
    </label>
  );

  return (
    <Modal title="Partner link" onClose={onClose} wide>
      <div className="space-y-4">
        <p className="text-xs text-slate-600">
          Both partners must agree, each in their own chart, and each chooses what to share. Symptoms and red flags are never shared. Either side
          can end the link at any time.
        </p>

        {!partner && (
          <>
            <div>
              <Label htmlFor="partner-mrn">Partner's MRN</Label>
              <input id="partner-mrn" className={inputClass} value={mrn} onChange={(e) => setMrn(e.target.value)} placeholder="e.g. 100005" />
              <p className="text-[11px] text-slate-500 mt-1 ml-1">The partner needs their own Reproductive Health record (consent step done in their chart).</p>
            </div>
            <ShareBoxes record={record} value={share} onChange={setShare} />
            {consentBox}
            <FieldError message={error} />
            <Button
              variant="primary"
              icon={<Link2 size={14} />}
              disabled={busy || !mrn.trim() || (needsConsent && !agree)}
              onClick={() => run(() => repo.requestPartnerLink(id, mrn.trim(), share, actor), "Link request sent; the partner must accept in their own chart")}
            >
              Send link request
            </Button>
          </>
        )}

        {partner?.status === "PENDING_THEM" && (
          <>
            <p className="text-sm font-bold text-slate-800">Waiting for {partner.partnerId} to accept in their own chart.</p>
            <p className="text-xs text-slate-600">Will share: {partner.youShare.map(label).join(", ") || "nothing"}</p>
            <FieldError message={error} />
            <Button icon={<Unlink size={14} />} disabled={busy} onClick={() => run(() => repo.unlinkPartner(id, actor), "Link request cancelled")}>
              Cancel request
            </Button>
          </>
        )}

        {partner?.status === "PENDING_YOU" && (
          <>
            <p className="text-sm font-bold text-slate-800">{partner.partnerId} asked to link with this patient.</p>
            <ShareBoxes record={record} value={share} onChange={setShare} />
            {consentBox}
            <FieldError message={error} />
            <div className="flex gap-2">
              <Button
                variant="primary"
                disabled={busy || (needsConsent && !agree)}
                onClick={() => run(() => repo.respondPartnerLink(id, true, share, actor), "Partner link accepted")}
              >
                Accept
              </Button>
              <Button disabled={busy} onClick={() => run(() => repo.respondPartnerLink(id, false, [], actor), "Partner link declined")}>
                Decline
              </Button>
            </div>
          </>
        )}

        {partner?.status === "LINKED" && (
          <>
            <p className="text-sm font-bold text-slate-800">Linked with {partner.partnerId}.</p>
            <section>
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Shared by the partner</h3>
              <div className="flex flex-wrap gap-1 mb-2">
                {partner.theyShare.length ? partner.theyShare.map((c) => <Chip key={c} tone="emerald">{label(c)}</Chip>) : <span className="text-xs text-slate-500">Nothing shared</span>}
              </div>
              <ul className="space-y-1">
                {partner.sharedVectors.map((v) => (
                  <li key={v.vector} className="text-xs text-slate-700 flex items-center gap-2">
                    <span className="font-bold">{t("en", `vector.${v.vector}.title`)}</span>
                    <Chip>{stateLabel(v, "en")}</Chip>
                    <Chip tone="indigo">{t("en", `density.${v.density}`)}</Chip>
                  </li>
                ))}
              </ul>
            </section>
            <ShareBoxes record={record} value={share} onChange={setShare} />
            <FieldError message={error} />
            <div className="flex gap-2">
              <Button variant="primary" disabled={busy} onClick={() => run(() => repo.setPartnerSharing(id, share, actor), "Sharing updated")}>
                Save what this patient shares
              </Button>
              <Button icon={<Unlink size={14} />} disabled={busy} onClick={() => run(() => repo.unlinkPartner(id, actor), "Partner link ended")}>
                End link
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
