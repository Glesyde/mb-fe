// Runs one evaluation for the tab: record + EMR data → engine (stages 1–6) → explanation (7) →
// output check (8) → brief assembly (9). The only place the UI calls into the engine.

import { evaluate } from "../engine";
import { VECTOR_CATEGORIES } from "../engine/config";
import { applyConsent } from "../engine/consent";
import { uniqueCitations } from "../engine/citations";
import { STAGES, type TraceEntry } from "../engine/trace";
import type {
  Citation,
  ConsentCategory,
  EngineInput,
  EngineResult,
  Language,
  MessageRef,
  PartnerShare,
  PathwayId,
  Sex,
  Urgency,
  VectorId,
  VectorResult,
  VectorState,
} from "../engine/types";
import { mapEmrData, mapVitals, toEngineInput, type MappedEmr } from "../data/mappers";
import { mapTrajectory, type MappedTrajectory } from "../data/trajectoryMapper";
import { conditionsFromHistory, consentState, isPermitted } from "../data/records";
import type { Actor, ReproRecord, ReproRepository } from "../data/repository";
import { explain, type ExplainOptions, type Explanation } from "./explanation.service";

export interface EmrSource {
  patient: unknown;
  vitals: unknown[];
  history: unknown[];
}

/** Everything the discussion brief and referral summary need (PDFs are built in Phase 4). */
export interface BriefPayload {
  asOf: string;
  trends: { vector: VectorId; state: VectorState; dataWithdrawn: boolean; readings: number; latest: { value: number; unit: string; date: string; key: string } | null }[];
  discussionPoints: { pathway: PathwayId | null; urgency: Urgency; ruleId: string; messageKey: string; forPartner: boolean }[];
  missingTests: MessageRef[];
  citations: Citation[];
}

/** The partner panel: link status, what each side shares, and the partner's cards from shared categories only. */
export interface PartnerSummary {
  status: "PENDING_THEM" | "PENDING_YOU" | "LINKED";
  partnerId: string;
  youShare: ConsentCategory[];
  theyShare: ConsentCategory[];
  partnerSex: Sex | null;
  /** Built only from what the partner shared; never their symptoms or red flags. V4 is omitted for a woman (it is her own card). */
  sharedVectors: VectorResult[];
}

export type RunOutcome =
  | { status: "CONSENT_REQUIRED"; asOf: string }
  | {
      status: "READY";
      asOf: string;
      today: string;
      record: ReproRecord;
      emr: MappedEmr | null;
      input: EngineInput;
      result: EngineResult;
      explanation: Explanation;
      brief: BriefPayload | null;
      trace: TraceEntry[];
      elapsedMs: number;
      hasData: boolean;
      partner: PartnerSummary | null;
      /**
       * Only while an emergency stop is on: the cards and summary as they would be without the open
       * red flags, shown under the emergency panel for reference. Never used for actions.
       */
      reference: { result: EngineResult; explanation: Explanation } | null;
      /** Set when the data came from the HIS trajectory endpoint (VITE_REPRO_BACKEND=true). */
      his: MappedTrajectory | null;
    };

export interface RunOptions {
  repo: ReproRepository;
  patientId: string;
  /** Real patients only: what EMRChart already holds. */
  emr?: EmrSource;
  lang: Language;
  explain?: ExplainOptions;
  clock?: () => number;
  /**
   * Real chart only: load a linked partner's own EMR data by MRN (then limited to the categories
   * the partner shared). Every load is audited on both records as `actor`. Omitted in demo mode,
   * so no API call is made there.
   */
  partnerEmr?: { load: (mrn: string) => Promise<EmrSource | null>; actor: Actor };
  /**
   * Real chart with VITE_REPRO_BACKEND=true: loads GET /clinical/trajectory for this MRN. Labs, age,
   * sex and consent then come from the HIS; BMI and blood pressure still come from the chart's
   * vitals. Never called for demo records.
   */
  backend?: {
    load: () => Promise<unknown>;
    /** Loads a linked partner's trajectory by MRN; only the categories they share are used. */
    loadPartner?: (mrn: string) => Promise<unknown>;
  };
}

/**
 * Partner panel from the HIS link. When linked, the partner's own trajectory is loaded and only
 * the categories they share (and only if their PARTNER_SHARING consent is on) reach the engine.
 * Never their symptoms or red flags. A failed partner load leaves the panel without their cards.
 */
async function hisPartnerContext(record: ReproRecord, his: MappedTrajectory, asOf: string, loadPartner?: (mrn: string) => Promise<unknown>) {
  const link = his.partner;
  if (!link) return { share: undefined, summary: null };
  const summary: PartnerSummary = { status: link.status, partnerId: link.partnerId, youShare: link.youShare, theyShare: link.theyShare, partnerSex: null, sharedVectors: [] };
  if (link.status !== "LINKED" || !link.theyShare.length || !loadPartner) return { share: undefined, summary };
  let other: MappedTrajectory;
  try {
    other = mapTrajectory(await loadPartner(link.partnerId), asOf);
  } catch {
    return { share: undefined, summary };
  }
  summary.partnerSex = other.profile.sex;
  const otherConsent = consentState(other.consent.resource);
  if (!other.consent.confirmed || !otherConsent.PARTNER_SHARING) return { share: undefined, summary: { ...summary, theyShare: [] } };
  const input: EngineInput = {
    asOf,
    subject: { sex: other.profile.sex, ageYears: other.profile.ageYears },
    observations: other.observations.filter((o) => o.effectiveDateTime.slice(0, 10) <= asOf),
    cycles: other.cycles ?? [],
    lifestyle: other.lifestyle,
    history: other.history?.completed ? other.history.items : null,
    reproductive: other.plans ?? {},
    symptoms: {},
    openRedFlags: [],
    consent: otherConsent,
  };
  const shared = evaluate(applyConsent(input, link.theyShare).input);
  summary.sharedVectors = shared.vectors.filter(
    (v) =>
      (VECTOR_CATEGORIES[v.vector] as readonly ConsentCategory[]).some((c) => link.theyShare.includes(c)) &&
      !(record.profile.sex === "female" && v.vector === "V4") &&
      !(his.profile.sex === "female" && v.vector === "V4"),
  );
  return { share: { input, sharedCategories: link.theyShare } as PartnerShare, summary };
}

/**
 * Entered sections from the HIS replace the browser copy when the HIS has them. Until the tab saves
 * a section to the HIS, a section the HIS has not filled in keeps the browser copy. Open red flags
 * from both are shown, so a danger sign is never hidden.
 */
function withHisSections(record: ReproRecord, his: MappedTrajectory): ReproRecord {
  const next = { ...record };
  if (his.lifestyle) next.lifestyle = his.lifestyle;
  if (his.history?.completed) {
    next.historyCompleted = true;
    next.conditions = conditionsFromHistory(record.patientId, his.history.items, (his.history.updatedAt ?? record.updatedAt).slice(0, 10));
  }
  if (his.plans) next.reproductive = his.plans;
  if (his.cycles?.length) next.cycles = his.cycles;
  if (his.redFlags) next.redFlags = [...record.redFlags.filter((r) => r.status === "OPEN"), ...his.redFlags];
  return next;
}

/** Labs and profile from the HIS response; BMI and blood pressure from the chart's vitals rows. */
function backendEmr(his: MappedTrajectory, source: EmrSource | undefined): MappedEmr {
  const historyVitals = ((source?.history ?? []) as any[]).flatMap((e) => (Array.isArray(e?.vitals) ? e.vitals : []));
  const vitals = mapVitals([...((source?.vitals ?? []) as any[]), ...historyVitals]);
  const hisHasBmi = his.observations.some((o) => o.code.key === "BMI");
  return {
    profile: his.profile,
    observations: [...vitals.observations.filter((o) => !(hisHasBmi && o.code.key === "BMI")), ...his.observations],
    matchedLabParameters: his.matched,
    skipped: [...vitals.skipped, ...his.skipped],
  };
}

function assembleBrief(result: EngineResult): BriefPayload {
  return {
    asOf: result.asOf,
    trends: result.vectors.map((v) => {
      const main = v.series[0];
      const last = main?.points[main.points.length - 1];
      return {
        vector: v.vector,
        state: v.state,
        dataWithdrawn: v.dataWithdrawn,
        readings: main?.points.length ?? 0,
        latest: last ? { value: last.value, unit: last.unit, date: last.date, key: main.key } : null,
      };
    }),
    discussionPoints: [
      ...result.nextSteps.flatMap((s) => s.items.map((i) => ({ pathway: s.pathway, urgency: s.urgency, ruleId: i.ruleId, messageKey: i.messageKey, forPartner: false }))),
      ...result.partnerSteps.map((f) => ({ pathway: f.pathways[0] ?? null, urgency: f.urgency, ruleId: f.id, messageKey: f.messageKey, forPartner: true })),
    ],
    missingTests: result.vectors.flatMap((v) => v.gaps),
    citations: uniqueCitations([
      ...result.firedRules.map((r) => r.citation),
      ...result.partnerSteps.map((r) => r.citation),
      ...result.vectors.flatMap((v) => v.citations),
    ]),
  };
}

/** Categories that come from a partner's EMR (demographics, vitals, labs). */
const EMR_CATEGORIES: ConsentCategory[] = ["PROFILE", "METABOLIC", "HORMONES_SEMEN"];

/** The linked partner's engine input: their record plus, for a real partner, their own EMR data (audited). */
async function partnerInput(
  repo: ReproRepository,
  viewerId: string,
  partner: ReproRecord,
  theyShare: ConsentCategory[],
  partnerEmr: RunOptions["partnerEmr"],
): Promise<EngineInput> {
  const asOf = partner.isDemo ? await repo.getAsOf() : await repo.getToday();
  const read = EMR_CATEGORIES.filter((c) => theyShare.includes(c));
  // No API call when nothing from the partner's EMR would be used, and never for demo partners.
  if (partner.isDemo || !partnerEmr || !read.some((c) => c !== "PROFILE")) return toEngineInput(partner, asOf);
  let source: EmrSource | null = null;
  let outcome: "LOADED" | "NOT_FOUND" | "FAILED" = "LOADED";
  try {
    source = await partnerEmr.load(partner.patientId);
    if (!source) outcome = "NOT_FOUND";
  } catch {
    outcome = "FAILED";
  }
  await repo.logPartnerDataRead(viewerId, partner.patientId, read, outcome, partnerEmr.actor);
  const emr = source ? mapEmrData({ patient: source.patient, vitals: source.vitals as any[], history: source.history as any[], asOf }) : undefined;
  return toEngineInput(partner, asOf, emr);
}

async function partnerContext(repo: ReproRepository, record: ReproRecord, partnerEmr: RunOptions["partnerEmr"]) {
  const link = record.partner;
  if (!link) return { share: undefined, summary: null };
  const status: PartnerSummary["status"] = !link.selfConsented ? "PENDING_YOU" : !link.partnerConsented ? "PENDING_THEM" : "LINKED";
  const other = await repo.getRecord(link.partnerId);
  const otherLink = other?.partner?.partnerId === record.patientId ? other.partner : undefined;
  const otherConsents = !!other && isPermitted(other, "PARTNER_SHARING");
  const theyShare = status === "LINKED" && otherLink && otherConsents ? otherLink.sharedCategories : [];
  const summary: PartnerSummary = {
    status,
    partnerId: link.partnerId,
    youShare: link.sharedCategories,
    theyShare,
    partnerSex: other?.profile.sex ?? null,
    sharedVectors: [],
  };
  if (!other || status !== "LINKED" || !otherLink) return { share: undefined, summary };

  // Only what the partner shared ever leaves their record; never their symptoms or red flags.
  const input = await partnerInput(repo, record.patientId, other, theyShare, partnerEmr);
  if (theyShare.length) {
    const shared = evaluate(applyConsent(input, theyShare).input);
    summary.sharedVectors = shared.vectors.filter(
      (v) =>
        (VECTOR_CATEGORIES[v.vector] as readonly ConsentCategory[]).some((c) => theyShare.includes(c)) &&
        !(record.profile.sex === "female" && v.vector === "V4"),
    );
  }
  return { share: { input, sharedCategories: otherLink.sharedCategories } as PartnerShare, summary };
}

export async function runEvaluation(options: RunOptions): Promise<RunOutcome> {
  const { repo, patientId, lang, clock } = options;
  const t0 = clock ? clock() : 0;
  let record = await repo.getRecord(patientId);
  let his: MappedTrajectory | null = null;
  if (options.backend && !record?.isDemo) {
    his = mapTrajectory(await options.backend.load(), await repo.getToday());
    // The HIS is the record of consent: without its confirmation, the consent step is shown,
    // whatever this browser holds.
    if (!his.consent.confirmed) return { status: "CONSENT_REQUIRED", asOf: await repo.getToday() };
    {
      // Entered data (cycles, history, plans…) still lives in this browser until the HIS has
      // endpoints for it, so a local record is kept with the consent the HIS recorded.
      if (!record) {
        const by = his.consent.recordedBy ?? { id: "unknown", name: "HIS" };
        await repo.createRecord(patientId, { sex: his.profile.sex, language: "en" }, by, his.consent.consented);
        record = await repo.getRecord(patientId);
      }
      // The HIS consent always wins over the browser copy.
      if (record) record = withHisSections({ ...record, consentMode: "CLINICIAN_CONFIRMED", consent: his.consent.resource }, his);
    }
  }
  // A real patient is never evaluated before the clinician has confirmed consent.
  if (!record) return { status: "CONSENT_REQUIRED", asOf: await repo.getToday() };
  // Demo records follow the demo date; real patients are always evaluated at today.
  const asOf = record.isDemo ? await repo.getAsOf() : await repo.getToday();

  const emr = his
    ? backendEmr(his, options.emr)
    : options.emr && !record.isDemo
      ? mapEmrData({ ...options.emr, history: options.emr.history as any[], vitals: options.emr.vitals as any[], asOf }) : null;
  const input = toEngineInput(record, asOf, emr ?? undefined);
  const mappingSummary = his
    ? `HIS trajectory: ${emr!.observations.length} value(s) read, ${his.matched.length} lab name(s) matched, ${emr!.skipped.length} skipped`
    : emr
    ? `EMR: ${emr.observations.length} value(s) read, ${emr.matchedLabParameters.length} lab name(s) matched, ${emr.skipped.length} skipped`
    : record.isDemo
      ? "Demo data only"
      : undefined;
  // With the HIS connected, the partner link comes from the HIS only (never this browser's copy).
  const partner = his ? await hisPartnerContext(record, his, asOf, options.backend?.loadPartner) : await partnerContext(repo, record, options.partnerEmr);
  const result = evaluate(input, { haltOnAnyRedFlag: true, clock, mappingSummary, partner: partner.share });
  const explanation = await explain(result, lang, { ...options.explain, clock });
  let reference: { result: EngineResult; explanation: Explanation } | null = null;
  if (result.halted) {
    const refResult = evaluate({ ...input, openRedFlags: [] }, { partner: partner.share });
    reference = { result: refResult, explanation: await explain(refResult, lang, options.explain) };
  }

  const s9 = clock ? clock() : 0;
  const brief = result.halted ? null : assembleBrief(result);
  const meta = STAGES.find((s) => s.id === "ASSEMBLY")!;
  const assembly: TraceEntry = brief
    ? {
        ...meta,
        input: `${result.vectors.length} card(s), ${result.nextSteps.length} next step(s)`,
        output: `${brief.trends.length} trend(s), ${brief.discussionPoints.length} discussion point(s), ${brief.missingTests.length} missing item(s), ${brief.citations.length} citation(s)`,
        decision: "Ready for the discussion brief and referral summary",
        ruleIds: [],
        durationMs: clock ? Math.round((clock() - s9) * 100) / 100 : 0,
        status: "done",
      }
    : { ...meta, input: "—", output: "—", decision: "Stopped at stage 2: emergency panel", ruleIds: [], durationMs: 0, status: "skipped" };

  const hasData =
    input.observations.length > 0 ||
    input.cycles.length > 0 ||
    input.history !== null ||
    input.lifestyle !== null ||
    Object.keys(input.reproductive).length > 0 ||
    (input.openRedFlags ?? []).length > 0;

  return {
    status: "READY",
    asOf,
    today: await repo.getToday(),
    record,
    emr,
    input,
    result,
    explanation,
    brief,
    trace: [...result.trace, ...(result.halted ? explanation.trace.map((e) => ({ ...e, status: "skipped" as const, decision: "Stopped at stage 2: emergency panel" })) : explanation.trace), assembly],
    elapsedMs: clock ? Math.round((clock() - t0) * 100) / 100 : 0,
    hasData,
    partner: partner.summary,
    reference,
    his,
  };
}
