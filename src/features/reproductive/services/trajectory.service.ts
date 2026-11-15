// The HIS endpoints for the Reproductive Health tab. Uses the HIS HTTP client (login cookie,
// session refresh), so nothing new is configured here. Never used by /repro-demo.

import apiClient from "../../../api/client";
import type { ConsentCategory, Symptoms } from "../engine/types";
import type { Actor } from "../data/repository";

/** One test in POST /clinical/trajectory-order-diagnostics. */
export interface DiagnosticOrder {
  test_name: string;
  loinc: string;
  source: string;
  reason: string;
}

/** On when VITE_REPRO_BACKEND=true. Off: the tab reads the chart's own data, as before. */
export function reproBackendEnabled(): boolean {
  return (import.meta as any).env?.VITE_REPRO_BACKEND === "true";
}

/** The wording recorded with the consent step, matching what the HIS already stores. */
export const CONSENT_STEP_REASON = "I have explained this tool to the patient and they agree to use the selected categories.";

/** What the tab needs from the HIS. Injected so tests can replace it. */
export interface TrajectoryApi {
  load(mrn: string): Promise<unknown>;
  /** Consent step: the full list of categories the patient agreed to. */
  confirmConsent(mrn: string, actor: Actor, consented: ConsentCategory[], reason: string): Promise<void>;
  /** Share or withdraw one category, with the reason. */
  setConsent(mrn: string, actor: Actor, category: ConsentCategory, granted: boolean, reason: string): Promise<void>;
  /** Orders the tests the clinician ticked and confirmed. Never called automatically. */
  orderDiagnostics(mrn: string, encounterId: number, actor: Actor, diagnostics: DiagnosticOrder[]): Promise<void>;
  /** Sends a referral the clinician wrote and confirmed. Never books an appointment. */
  createReferral(mrn: string, actor: Actor, targetSpecialty: string, clinicalReason: string): Promise<void>;
  /** Clinician's answer to an open red flag in the HIS. */
  resolveRedFlag(mrn: string, redFlagId: number, resolution: "ACKNOWLEDGED_REFERRED" | "DISMISSED", actor: Actor, note: string): Promise<void>;
  /** Create or update one entered section. `body` comes from services/hisSections.ts. */
  saveSection(mrn: string, section: "lifestyle" | "history" | "plans", actor: Actor, body: Record<string, unknown>): Promise<void>;
  /** The HIS runs the red-flag check, keeps any red flag and discards the free text. */
  submitSymptoms(mrn: string, actor: Actor, symptoms: Symptoms): Promise<void>;
  /** REQUEST a link (with what this patient shares), ACCEPT one (with what they share), or CANCEL. */
  partner(mrn: string, actor: Actor, action: "REQUEST" | "ACCEPT" | "CANCEL", options?: { partnerMrn?: string; shared?: ConsentCategory[] }): Promise<void>;
}

const SECTION_URL = { lifestyle: "/clinical/trajectory-lifestyle", history: "/clinical/trajectory-history", plans: "/clinical/trajectory-plans" } as const;
const SECTION_NAME = { lifestyle: "Lifestyle", history: "History", plans: "Plans and questions" } as const;

/** The HIS user id is numeric; send it as a number when it is one. */
const userId = (actor: Actor): number | string => (/^\d+$/.test(actor.id) ? Number(actor.id) : actor.id);

/**
 * HTTP errors already throw (axios). A 2xx body that carries a `status` other than "success"
 * is also treated as a failure, using the HIS message if it sent one.
 */
function ensureSuccess(body: unknown, what: string): void {
  const b = body as { status?: unknown; message?: unknown } | null;
  if (!b || typeof b !== "object" || b.status === undefined || b.status === "success") return;
  const message = typeof b.message === "string" && b.message.trim() ? b.message.trim() : `status "${String(b.status)}"`;
  throw new Error(`${what} was not saved: ${message}`);
}

/** POST and check the answer. An HTTP error keeps the HIS message when it sent one. */
async function post(url: string, body: object, what: string): Promise<void> {
  let data: unknown;
  try {
    data = (await apiClient.post(url, body)).data;
  } catch (e: any) {
    const message = e?.response?.data?.message;
    throw new Error(`${what} was not saved: ${typeof message === "string" && message.trim() ? message.trim() : e?.message ?? String(e)}`);
  }
  ensureSuccess(data, what);
}

export const trajectoryApi: TrajectoryApi = {
  /** GET /clinical/trajectory?patient_id=<MRN>. Returns the raw response body. */
  async load(mrn) {
    const res = await apiClient.get("/clinical/trajectory", { params: { patient_id: mrn } });
    return res.data;
  },

  /** POST /clinical/trajectory-consent with the full list. */
  async confirmConsent(mrn, actor, consented, reason) {
    await post(
      "/clinical/trajectory-consent",
      {
        patient_id: mrn,
        user_id: userId(actor),
        user_name: actor.name,
        reason,
        consented_categories: Array.from(new Set<ConsentCategory>(["PROFILE", ...consented])),
      },
      "Consent",
    );
  },

  /** POST /clinical/trajectory-consent for one category. PROFILE (age and sex) cannot be withdrawn. */
  async setConsent(mrn, actor, category, granted, reason) {
    if (category === "PROFILE" && !granted) throw new Error("Age and sex are required and cannot be withdrawn.");
    if (!reason.trim()) throw new Error("Enter a reason.");
    await post(
      "/clinical/trajectory-consent",
      { patient_id: mrn, user_id: userId(actor), user_name: actor.name, category, granted, reason: reason.trim() },
      "The consent change",
    );
  },

  /** POST /clinical/trajectory-order-diagnostics. */
  async orderDiagnostics(mrn, encounterId, actor, diagnostics) {
    if (!diagnostics.length) throw new Error("Tick at least one test.");
    await post(
      "/clinical/trajectory-order-diagnostics",
      { patient_id: mrn, encounter_id: encounterId, ordered_by: userId(actor), diagnostics },
      diagnostics.length === 1 ? "The order" : "The orders",
    );
  },

  /** POST /clinical/trajectory-referral. The referring doctor is the logged-in clinician. */
  async createReferral(mrn, actor, targetSpecialty, clinicalReason) {
    if (!targetSpecialty.trim()) throw new Error("Enter the specialty to refer to.");
    if (!clinicalReason.trim()) throw new Error("Enter the clinical reason.");
    await post(
      "/clinical/trajectory-referral",
      { patient_id: mrn, doctor_name: actor.name, target_specialty: targetSpecialty.trim(), clinical_reason: clinicalReason.trim() },
      "The referral",
    );
  },

  /** POST /clinical/trajectory-red-flag-resolve. */
  async resolveRedFlag(mrn, redFlagId, resolution, actor, note) {
    await post(
      "/clinical/trajectory-red-flag-resolve",
      { patient_id: mrn, red_flag_id: redFlagId, resolution, user_id: userId(actor), user_name: actor.name, note },
      "The red flag decision",
    );
  },

  /** POST /clinical/trajectory-lifestyle | -history | -plans. History items go under `items`. */
  async saveSection(mrn, section, actor, body) {
    const who = { patient_id: mrn, user_id: userId(actor), user_name: actor.name };
    await post(SECTION_URL[section], section === "history" ? { ...who, items: body } : { ...body, ...who }, SECTION_NAME[section]);
  },

  /** POST /clinical/trajectory-symptoms. Every tick box is sent as true/false. */
  async submitSymptoms(mrn, actor, s) {
    await post(
      "/clinical/trajectory-symptoms",
      {
        patient_id: mrn,
        user_id: userId(actor),
        user_name: actor.name,
        freeText: s.freeText ?? "",
        severeOneSidedPelvicPain: s.severeOneSidedPelvicPain === true,
        missedPeriod: s.missedPeriod === true,
        positivePregnancyTest: s.positivePregnancyTest === true,
        fainting: s.fainting === true,
        bleedingAfterSex: s.bleedingAfterSex === true,
        bleedingBetweenPeriods: s.bleedingBetweenPeriods === true,
      },
      "The symptom check",
    );
  },

  /** POST /clinical/trajectory-partner. Symptoms and red flags are never shareable. */
  async partner(mrn, actor, action, options = {}) {
    if (action === "REQUEST" && !options.partnerMrn?.trim()) throw new Error("Enter the partner's MRN.");
    if (action === "REQUEST" && options.partnerMrn?.trim() === mrn) throw new Error("A patient cannot be linked to themselves.");
    const body: Record<string, unknown> = { patient_id: mrn, action, user_id: userId(actor), user_name: actor.name };
    if (action === "REQUEST") body.partner_mrn = options.partnerMrn!.trim();
    if (action !== "CANCEL") body.shared_categories = Array.from(new Set(options.shared ?? []));
    await post("/clinical/trajectory-partner", body, action === "CANCEL" ? "The change to the partner link" : "The partner link");
  },
};
