// The one data interface the UI talks to. `demoRepository` implements it in the browser today;
// a future `apiRepository` (see docs/reproductive/API_CONTRACT.md) can replace it in one line.
// Records are shaped like FHIR R4 (Observation, Condition, Consent, ServiceRequest).

import type { InputCheckResult } from "../guardrails/inputCheck";
import type { PopulationAggregates, Split } from "../services/population.service";
import type {
  Coding,
  ConsentCategory,
  CycleRecord,
  HistoryItems,
  Language,
  Lifestyle,
  Observation,
  PathwayId,
  RedFlag,
  ReproductiveContext,
  Sex,
  Symptoms,
} from "../engine/types";

export interface Actor {
  id: string;
  name: string;
}

export type ActivityAction =
  | "RECORD_CREATED"
  | "CONSENT_CAPTURED"
  | "CONSENT_CHANGED"
  | "DATA_ADDED"
  | "HISTORY_UPDATED"
  | "LIFESTYLE_UPDATED"
  | "PLANS_UPDATED"
  | "RED_FLAG_RAISED"
  | "RED_FLAG_RESOLVED"
  | "COUNSELLING_RECORDED"
  | "PARTNER_LINK_REQUESTED"
  | "PARTNER_LINK_ACCEPTED"
  | "PARTNER_LINK_DECLINED"
  | "PARTNER_LINK_ENDED"
  | "PARTNER_SHARING_CHANGED"
  | "PARTNER_DATA_READ"
  | "REFERRAL_CREATED"
  | "REFERRAL_COMPLETED"
  | "SCENARIO_LOADED"
  | "DEMO_ADVANCED";

export interface ActivityEntry {
  id: string;
  /** Wall-clock time of the action (ISO). */
  at: string;
  by: Actor;
  action: ActivityAction;
  detail: string;
  category?: ConsentCategory;
}

/** FHIR Consent with one provision per category. */
export interface ConsentResource {
  resourceType: "Consent";
  id: string;
  status: "active";
  provision: { category: ConsentCategory; type: "permit" | "deny"; updatedAt: string; updatedBy: Actor; reason?: string }[];
}

export type HistoryKey = keyof HistoryItems;

/** FHIR Condition (history item). `code.key` is our internal code; SNOMED where one exists. */
export interface ConditionResource {
  resourceType: "Condition";
  id: string;
  code: { key: HistoryKey; coding?: Coding[] };
  clinicalStatus: "active";
  recordedDate: string;
}

/** FHIR ServiceRequest: a referral summary. Never books an appointment. */
export interface ServiceRequestResource {
  resourceType: "ServiceRequest";
  id: string;
  status: "active" | "completed" | "revoked";
  intent: "proposal";
  pathway: PathwayId;
  reasonRuleIds: string[];
  /** Created time (full ISO timestamp for new referrals); feeds "time to counselling". */
  authoredOn: string;
  completedOn?: string;
}

/** Red flag found at entry time. The symptom text itself is never stored. */
export interface RedFlagEvent {
  id: string;
  ruleId: RedFlag;
  detectedAt: string;
  source: "FREE_TEXT" | "STRUCTURED" | "SCENARIO";
  status: "OPEN" | "ACKNOWLEDGED_REFERRED" | "DISMISSED";
  resolvedAt?: string;
  resolvedBy?: Actor;
}

/** Used from Phase 4. Both sides must consent before anything is shared. */
export interface PartnerLink {
  partnerId: string;
  selfConsented: boolean;
  partnerConsented: boolean;
  /** What this person shares with the partner. */
  sharedCategories: ConsentCategory[];
  linkedAt: string;
}

export interface ReproProfile {
  sex: Sex | null;
  /** Synthetic records carry a birth date so age moves with the demo clock. */
  birthDate?: string;
  language: Language;
  clinic?: string;
  /** Synthetic records only. Never a real name. */
  label?: string;
  /** Synthetic records only: the generator pattern (normal ageing, PCOS pattern, …). */
  archetype?: string;
}

export interface ReproRecord {
  /** MRN for real patients; DEMO-n / SYN-nnnn for synthetic ones. */
  patientId: string;
  /** True for anything synthetic, including a scenario loaded onto a real MRN. */
  isDemo: boolean;
  /**
   * CLINICIAN_CONFIRMED: a clinician confirmed the patient's consent in the consent step.
   * DEMO: synthetic data; consent is simulated ("Demo consent").
   */
  consentMode: "CLINICIAN_CONFIRMED" | "DEMO";
  scenarioId?: string;
  profile: ReproProfile;
  observations: Observation[];
  cycles: CycleRecord[];
  /** False = history not filled in yet (V5 "not enough data"). */
  historyCompleted: boolean;
  conditions: ConditionResource[];
  lifestyle: Lifestyle | null;
  reproductive: ReproductiveContext;
  consent: ConsentResource;
  redFlags: RedFlagEvent[];
  counselling: { id: string; date: string }[];
  serviceRequests: ServiceRequestResource[];
  partner?: PartnerLink;
  activity: ActivityEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface ScenarioSummary {
  id: string;
  name: string;
  description: string;
  sex: Sex;
  age: number;
}

export interface ReproRepository {
  readonly kind: "demo" | "api";
  /** False when browser storage is unavailable and data lives in memory for this session only. */
  isPersistent(): boolean;
  /** Evaluation date for demo records: today, plus any months "Advance 6 months" added. */
  getAsOf(): Promise<string>;
  /** Today's date. Real patients are always evaluated at today. */
  getToday(): Promise<string>;

  getRecord(patientId: string): Promise<ReproRecord | null>;
  /**
   * Consent step for a real patient: the clinician confirms they explained the tool and the
   * patient agreed to `permitted`. Logged with user, date and categories. Nothing is evaluated
   * for a real patient until this record exists.
   */
  createRecord(patientId: string, profile: ReproProfile, actor: Actor, permitted: ConsentCategory[]): Promise<ReproRecord>;

  addObservations(patientId: string, observations: Observation[], actor: Actor): Promise<ReproRecord>;
  addCycles(patientId: string, cycles: CycleRecord[], actor: Actor): Promise<ReproRecord>;
  setHistory(patientId: string, items: HistoryItems, actor: Actor): Promise<ReproRecord>;
  setLifestyle(patientId: string, lifestyle: Lifestyle, actor: Actor): Promise<ReproRecord>;
  setReproductiveContext(patientId: string, context: ReproductiveContext, actor: Actor): Promise<ReproRecord>;

  /** PROFILE cannot be withdrawn. Every change is logged with time, user and reason. */
  setConsent(patientId: string, category: ConsentCategory, granted: boolean, reason: string, actor: Actor): Promise<ReproRecord>;

  /** Runs the red-flag check at entry time, whatever the consent. Stores red flags only, never the text. */
  submitSymptoms(patientId: string, symptoms: Symptoms, actor: Actor): Promise<{ check: InputCheckResult; record: ReproRecord }>;
  resolveRedFlag(
    patientId: string,
    eventId: string,
    resolution: "ACKNOWLEDGED_REFERRED" | "DISMISSED",
    actor: Actor,
  ): Promise<ReproRecord>;

  recordCounselling(patientId: string, date: string, actor: Actor): Promise<ReproRecord>;
  getActivity(patientId: string): Promise<ActivityEntry[]>;

  // --- Partner link: both sides must consent, and each chooses what they share ----------------
  /** This person asks to link with `partnerId`, sharing `sharedCategories`. The partner must accept in their own chart. */
  requestPartnerLink(patientId: string, partnerId: string, sharedCategories: ConsentCategory[], actor: Actor): Promise<ReproRecord>;
  /** The invited partner accepts (choosing what they share) or declines. */
  respondPartnerLink(patientId: string, accept: boolean, sharedCategories: ConsentCategory[], actor: Actor): Promise<ReproRecord>;
  /** Change what this person shares with their linked partner. */
  setPartnerSharing(patientId: string, sharedCategories: ConsentCategory[], actor: Actor): Promise<ReproRecord>;
  /** Either side can end the link at any time. */
  unlinkPartner(patientId: string, actor: Actor): Promise<ReproRecord>;
  /**
   * Audit: a linked partner's EMR history was read while viewing `viewerId`'s chart. Logged on
   * both records with the time, the clinician, the partner's MRN and the shared categories read.
   */
  logPartnerDataRead(
    viewerId: string,
    partnerId: string,
    categories: ConsentCategory[],
    outcome: "LOADED" | "NOT_FOUND" | "FAILED",
    actor: Actor,
  ): Promise<void>;

  // --- Referral summary (never books an appointment) -------------------------------------------
  /** Needs CLINICIAN_SHARING consent. Records the created time. */
  createReferral(patientId: string, pathway: PathwayId, reasonRuleIds: string[], actor: Actor): Promise<{ record: ReproRecord; referral: ServiceRequestResource }>;
  completeReferral(patientId: string, referralId: string, actor: Actor): Promise<ReproRecord>;

  /**
   * Population aggregates for one split (no individual rows; groups under 50 suppressed).
   * Demo: computed from the 200 synthetic patients. API: GET /repro/population.
   */
  getPopulationAggregates(split: Split): Promise<PopulationAggregates>;

  // --- Demo only -------------------------------------------------------------------------------
  listScenarios(): Promise<ScenarioSummary[]>;
  /** Copies a named scenario onto `patientId`, labelled as demo data. */
  loadScenario(patientId: string, scenarioId: string, actor: Actor): Promise<ReproRecord>;
  resetDemo(): Promise<void>;
  /** Moves the demo clock forward and adds seeded follow-up readings to demo records only. */
  advanceDemo(months: number, actor: Actor): Promise<string>;
}
