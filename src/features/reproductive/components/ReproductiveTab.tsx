import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FilePlus2, FileText, HeartPulse, Info, Languages, Link2, Send, ShieldCheck, Users } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { NAV_PERMISSION_RULES } from "../../../services/constants";
import { emrService } from "../../../services/emr.service";
import { patientService } from "../../../services/patient.service";
import type { ConsentCategory, Language, VectorId } from "../engine/types";
import { demoRepository } from "../data/demoRepository";
import { mapPatientProfile } from "../data/mappers";
import type { ActivityEntry, Actor, ReproRepository } from "../data/repository";
import { SCENARIOS } from "../data/synthetic/scenarios";
import { canAccessReproductive } from "../guardrails/accessPolicy";
import { AR_TEXT_ATTRS, stateLabel, t, tm } from "../i18n";
import { runEvaluation, type EmrSource, type RunOutcome } from "../services/reproductive.service";
import { ConsentChips, ConsentManager, ConsentStep } from "./ConsentPanel";
import { DataEntryForms } from "./DataEntryForms";
import { DemoControls } from "./DemoControls";
import { DiscussionBrief } from "./DiscussionBrief";
import { EmergencyPanel } from "./EmergencyPanel";
import { EvidenceDrawer } from "./EvidenceDrawer";
import { NextSteps } from "./NextSteps";
import { PartnerLink } from "./PartnerLink";
import { PatientView } from "./PatientView";
import { ReferralSummary } from "./ReferralSummary";
import { TracePanel } from "./TracePanel";
import { Button, Card, Chip, GlossaryText, inputClass, LANGUAGE_OPTIONS, SectionTitle, SegmentedControl } from "./ui";
import { VectorCard } from "./VectorCard";

type Ready = Extract<RunOutcome, { status: "READY" }>;

const SummaryBlock: React.FC<{ outcome: Ready; lang: Language }> = ({ outcome, lang }) => {
  const { explanation } = outcome;
  const aiHere = explanation.source === "AI" && lang === "en";
  return (
    <Card className="p-4">
      <SectionTitle icon={<FileText size={16} className="text-brand-primary" />}>Plain-language summary</SectionTitle>
      <div className="space-y-1.5 text-sm text-slate-700 leading-relaxed" {...(lang === "ar" ? AR_TEXT_ATTRS : { dir: "ltr", lang: "en" })}>
        {explanation.text[lang].split("\n").map((line, i) => (
          <p key={i}>
            <GlossaryText text={line} lang={lang} />
          </p>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-slate-500 flex items-center gap-1.5">
        <Languages size={12} />
        {aiHere ? "AI wording, checked by the Safety Guardrail Layer" : `${t("en", "explain.templateLabel")} · ${t("en", "explain.standardWording")}`}
      </p>
    </Card>
  );
};

export interface ReproductiveViewProps {
  repo: ReproRepository;
  patientId: string;
  /** Real patients: what the chart already holds. Omitted on the public demo page. */
  emr?: EmrSource;
  actor: Actor;
  /** Public demo page: scenario picking happens outside this view. */
  publicDemo?: boolean;
  /** Real chart only: loads a linked partner's EMR data by MRN. */
  loadPartnerEmr?: (mrn: string) => Promise<EmrSource | null>;
}

/** The Reproductive Health screen for one patient (real or synthetic). */
export const ReproductiveView: React.FC<ReproductiveViewProps> = ({ repo, patientId, emr, actor, publicDemo = false, loadPartnerEmr }) => {
  const [outcome, setOutcome] = useState<RunOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [lang, setLang] = useState<Language>("en");
  const [audience, setAudience] = useState<"clinician" | "patient">("clinician");
  const [modal, setModal] = useState<null | "add" | "consent" | "partner" | "brief" | "referral" | VectorId>(null);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [scenarioChoice, setScenarioChoice] = useState("");

  const refresh = useCallback(async () => {
    try {
      setError(null);
      setOutcome(
        await runEvaluation({
          repo,
          patientId,
          emr,
          lang: "en",
          clock: () => performance.now(),
          partnerEmr: loadPartnerEmr ? { load: loadPartnerEmr, actor } : undefined,
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    // The actor object is recreated on every render; only its id and name matter here.
  }, [repo, patientId, emr, loadPartnerEmr, actor.id, actor.name]);

  useEffect(() => {
    setOutcome(null);
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [message]);

  const act = (fn: () => Promise<unknown>, done?: string) => async () => {
    try {
      await fn();
      if (done) setMessage(done);
      await refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    }
  };

  const openConsent = async () => {
    setActivity(await repo.getActivity(patientId));
    setModal("consent");
  };

  if (error) return <Card className="p-6 text-sm text-red-700">Could not load reproductive health data: {error}</Card>;
  if (!outcome)
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" aria-label="Loading" />
      </div>
    );

  if (outcome.status === "CONSENT_REQUIRED") {
    const sex = emr ? mapPatientProfile(emr.patient, outcome.asOf).sex : null;
    return (
      <ConsentStep
        actor={actor}
        today={new Date().toISOString().slice(0, 10)}
        onConfirm={async (permitted: ConsentCategory[]) => {
          await repo.createRecord(patientId, { sex, language: "en" }, actor, permitted);
          await refresh();
        }}
      />
    );
  }

  const { record, result, input } = outcome;
  const demo = record.isDemo;
  const openFlags = record.redFlags.filter((r) => r.status === "OPEN");
  const subject = input.subject;
  const source = demo ? "Demo – synthetic data" : (outcome.emr?.observations.length ?? 0) > 0 ? "HIS data + entered data" : "Entered data";
  const why = result.vectors.find((v) => v.vector === modal);
  const pdfCtx = outcome.brief ? { record, result, brief: outcome.brief, summary: outcome.explanation.text, subject } : null;
  const blocked = result.halted ? "Resolve the red flag first" : undefined;
  const partnerLabel = outcome.partner
    ? { LINKED: "Partner linked", PENDING_THEM: "Partner request sent", PENDING_YOU: "Partner request waiting" }[outcome.partner.status]
    : "Link partner";

  const header = (
    <Card className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
      <div className="min-w-0">
        <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
          <HeartPulse size={20} className="text-brand-primary" /> Reproductive Health
        </h3>
        <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs font-bold text-slate-600">
          <span>{subject.sex ? (subject.sex === "female" ? "Female" : "Male") : "Sex not recorded"}</span>
          <span aria-hidden>·</span>
          <span>{subject.ageYears !== null ? `${subject.ageYears} years` : "Age not recorded"}</span>
          <Chip tone={demo ? "brand" : "indigo"}>{source}</Chip>
          {record.scenarioId && <Chip tone="brand">{SCENARIOS.find((s) => s.id === record.scenarioId)?.name}</Chip>}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <SegmentedControl
          label="Who is reading"
          value={audience}
          onChange={setAudience}
          options={[
            { id: "clinician", label: "Clinician view" },
            { id: "patient", label: "Patient view" },
          ]}
        />
        <SegmentedControl label="Language for cards and summary" value={lang} onChange={setLang} options={LANGUAGE_OPTIONS} />
        {audience === "clinician" && (
          <>
            <Button variant="primary" icon={<FilePlus2 size={14} />} onClick={() => setModal("add")}>
              Add data
            </Button>
            <Button icon={<ShieldCheck size={14} />} onClick={openConsent}>
              Manage consent
            </Button>
            <Button icon={<Link2 size={14} />} disabled={!!blocked} title={blocked} onClick={() => setModal("partner")}>
              {partnerLabel}
            </Button>
            <Button icon={<FileText size={14} />} disabled={!pdfCtx || !outcome.hasData} title={blocked} onClick={() => setModal("brief")}>
              Discussion brief
            </Button>
            <Button icon={<Send size={14} />} disabled={!pdfCtx || !outcome.hasData} title={blocked} onClick={() => setModal("referral")}>
              Create referral summary
            </Button>
          </>
        )}
      </div>
    </Card>
  );

  // Patient view: same engine result and consent, read-only, no clinician actions or trace.
  if (audience === "patient") {
    return (
      <div className="space-y-4 animate-in fade-in duration-300">
        {header}
        <PatientView outcome={outcome} lang={lang} />
      </div>
    );
  }

  const trace = (
    <TracePanel
      trace={outcome.trace}
      rulesFired={result.firedRules.length}
      elapsedMs={outcome.elapsedMs}
      explanationSource={outcome.explanation.source}
      demo={demo}
      runRecord={() => ({
        synthetic: true,
        scenarioId: record.scenarioId ?? record.profile.archetype ?? null,
        asOf: outcome.asOf,
        input: outcome.input,
        result: outcome.result,
        explanation: { source: outcome.explanation.source, fallbackReason: outcome.explanation.fallbackReason },
        trace: outcome.trace,
      })}
    />
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {header}
      {demo && (
        <DemoControls
          scenarioId={record.scenarioId}
          asOf={outcome.asOf}
          today={outcome.today}
          showPicker={!publicDemo}
          onLoad={(id) => act(() => repo.loadScenario(patientId, id, actor), "Demo scenario loaded")()}
          onReset={act(() => repo.resetDemo(), "Demo data reset")}
          onAdvance={act(() => repo.advanceDemo(6, actor), "Moved forward 6 months")}
        />
      )}
      <ConsentChips record={record} />
      {message && (
        <p role="status" className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded-xl px-3 py-2">
          {message}
        </p>
      )}

      {result.halted ? (
        <>
          <EmergencyPanel
            events={openFlags}
            onResolve={async (id, resolution) =>
              act(() => repo.resolveRedFlag(patientId, id, resolution, actor), resolution === "DISMISSED" ? "Red flag dismissed (recorded)" : "Acknowledged and referred (recorded)")()
            }
          />
          {trace}
        </>
      ) : !outcome.hasData ? (
        <Card className="p-8 text-center space-y-4">
          <p className="text-sm font-bold text-slate-700">No reproductive health data yet.</p>
          <p className="text-xs text-slate-500">Nothing is estimated: cards appear as data is added. Lab results and BMI already in the HIS are read automatically.</p>
          <div className="flex flex-wrap justify-center gap-2 items-center">
            <Button variant="primary" icon={<FilePlus2 size={14} />} onClick={() => setModal("add")}>
              Add data
            </Button>
            <label htmlFor="empty-scenario" className="sr-only">
              Demo scenario
            </label>
            <select id="empty-scenario" className={`${inputClass} !w-auto max-w-full`} value={scenarioChoice} onChange={(e) => setScenarioChoice(e.target.value)}>
              <option value="">Choose a demo scenario…</option>
              {SCENARIOS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.sex === "female" ? "woman" : "man"}, {s.age})
                </option>
              ))}
            </select>
            <Button disabled={!scenarioChoice} onClick={act(() => repo.loadScenario(patientId, scenarioChoice, actor), "Demo scenario loaded (synthetic data)")}>
              Load a demo scenario
            </Button>
          </div>
          <p className="text-[11px] text-slate-500">A demo scenario is clearly labelled as synthetic data and never mixed with this patient's HIS data.</p>
        </Card>
      ) : (
        <>
          {result.placeholderReferenceInUse && (
            <p className="flex items-center gap-2 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              <Info size={14} /> {t("en", "common.referencePending")}
            </p>
          )}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 content-start">
              {result.vectors.map((v) => (
                <VectorCard key={v.vector} v={v} lang={lang} onWhy={() => setModal(v.vector)} />
              ))}
            </div>
            <div className="space-y-4">
              <NextSteps steps={result.nextSteps} partnerSteps={result.partnerSteps} lang={lang} />
              {outcome.partner && (
                <Card className="p-4">
                  <SectionTitle
                    icon={<Users size={16} className="text-brand-primary" />}
                    right={
                      <Button variant="ghost" className="!px-2 !py-1" onClick={() => setModal("partner")}>
                        Manage
                      </Button>
                    }
                  >
                    Partner
                  </SectionTitle>
                  <p className="text-xs text-slate-700 mb-2">
                    {outcome.partner.status === "LINKED"
                      ? `Linked with ${outcome.partner.partnerId}. Shows only what each partner chose to share.`
                      : outcome.partner.status === "PENDING_THEM"
                        ? `Waiting for ${outcome.partner.partnerId} to accept in their own chart.`
                        : `${outcome.partner.partnerId} asked to link. Open Manage to accept or decline.`}
                  </p>
                  {outcome.partner.sharedVectors.length > 0 && (
                    <ul className="space-y-1">
                      {outcome.partner.sharedVectors.map((v) => (
                        <li key={v.vector} className="text-xs flex items-center justify-between gap-2">
                          <span className="text-slate-700">{t(lang, `vector.${v.vector}.title`)}</span>
                          <Chip>{stateLabel(v, lang)}</Chip>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              )}
              <SummaryBlock outcome={outcome} lang={lang} />
            </div>
          </div>
          {result.gaps.length > 0 && <p className="text-xs text-slate-500">{result.gaps.map((g) => tm("en", g)).join(" ")}</p>}
          {trace}
        </>
      )}

      <p className="text-[11px] text-slate-500">
        {t("en", "common.decisionSupport")} {t("en", "common.noSingleNumber")} No insurer or employer access. {t("en", "common.doctorDecides")}
      </p>

      {modal === "add" && (
        <DataEntryForms
          repo={repo}
          record={record}
          sex={subject.sex}
          asOf={outcome.asOf}
          actor={actor}
          onClose={() => setModal(null)}
          onSaved={(m) => {
            setModal(null);
            setMessage(m);
            void refresh();
          }}
        />
      )}
      {modal === "consent" && (
        <ConsentManager
          record={record}
          activity={activity}
          onClose={() => setModal(null)}
          onChange={async (category, granted, reason) => {
            await repo.setConsent(patientId, category, granted, reason, actor);
            setActivity(await repo.getActivity(patientId));
            await refresh();
          }}
        />
      )}
      {why && <EvidenceDrawer v={why} onClose={() => setModal(null)} />}
      {modal === "partner" && (
        <PartnerLink
          repo={repo}
          record={record}
          partner={outcome.partner}
          actor={actor}
          onClose={() => setModal(null)}
          onChanged={(m) => {
            setModal(null);
            setMessage(m);
            void refresh();
          }}
        />
      )}
      {modal === "brief" && pdfCtx && <DiscussionBrief ctx={pdfCtx} onClose={() => setModal(null)} />}
      {modal === "referral" && pdfCtx && (
        <ReferralSummary
          repo={repo}
          ctx={pdfCtx}
          today={outcome.today}
          actor={actor}
          onClose={() => setModal(null)}
          onChanged={(m) => {
            setMessage(m);
            void refresh();
          }}
        />
      )}
    </div>
  );
};

export interface ReproductiveTabProps {
  patient: any;
  encounterNumber?: string;
  history: any[];
  vitals: any[];
}

/** A linked partner's EMR data, read with the HIS services the chart already uses. */
async function loadPartnerEmr(mrn: string): Promise<EmrSource | null> {
  const patient = await patientService.getPatientByMrn(mrn);
  if (!patient) return null;
  const res = await emrService.getComprehensivePatientHistory(mrn);
  const history = (res?.data || res)?.encounters ?? [];
  return { patient, vitals: [], history };
}

/** Patient-chart tab. Shown to anyone who can open the EMR chart; insurer/employer roles are refused. */
const ReproductiveTab: React.FC<ReproductiveTabProps> = ({ patient, history, vitals }) => {
  const { user, roles, hasAnyPermission } = useAuth();
  const emr = useMemo<EmrSource>(() => ({ patient, vitals: vitals ?? [], history: history ?? [] }), [patient, vitals, history]);
  const access = canAccessReproductive(roles, hasAnyPermission(NAV_PERMISSION_RULES.emr));

  if (!access.allowed) {
    return <Card className="p-6 text-sm text-slate-600">Reproductive health data is not available for this account.</Card>;
  }
  if (!patient?.mrn) return <Card className="p-6 text-sm text-slate-600">Open a patient to see reproductive health.</Card>;

  const actor: Actor = { id: String(user?.id ?? "unknown"), name: user?.full_name || user?.name || "Clinician" };
  return <ReproductiveView repo={demoRepository} patientId={patient.mrn} emr={emr} actor={actor} loadPartnerEmr={loadPartnerEmr} />;
};

export default ReproductiveTab;
