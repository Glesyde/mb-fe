// Demo implementation of ReproRepository. Everything lives in this browser under one versioned
// localStorage key. If storage is unavailable (private mode, blocked, quota), data is kept in
// memory for this session. No network calls, ever.
// The 1,000 synthetic patients are not stored: they are regenerated from the fixed seed, the
// generation date and the "Advance" dates. Only scenarios, real records and synthetic records
// that were actually changed are persisted, which keeps storage well under browser limits.

import { addMonths } from "../engine/dates";
import type { ConsentCategory, CycleRecord, HistoryItems, Lifestyle, Observation, RedFlag, ReproductiveContext, Symptoms } from "../engine/types";
import { checkInput } from "../guardrails/inputCheck";
import { aggregateSplit, computePeople, type PersonFacts } from "../services/population.service";
import { conditionsFromHistory, CONSENT_STATEMENT, CONSENT_STEP_CATEGORIES, isPermitted, newRecord } from "./records";
import type { ActivityEntry, Actor, ReproProfile, ReproRecord, ReproRepository, ServiceRequestResource } from "./repository";
import { addFollowUp, generatePopulation } from "./synthetic/generator";
import { buildScenario, SCENARIOS } from "./synthetic/scenarios";

export const STORAGE_KEY = "medbookie.repro.demo";
const STORAGE_VERSION = 3;

/**
 * The demo date is never stored as a date: it is today plus the months "Advance 6 months" added.
 * So it never runs ahead of today unless advanced, and "Reset demo data" brings it back to today.
 */
interface DemoState {
  version: typeof STORAGE_VERSION;
  /** Date the synthetic population was generated from. */
  seededOn: string;
  advancedMonths: number;
  /** Evaluation dates of each "Advance" press, so synthetic follow-ups can be regenerated. */
  advances: string[];
  /** In memory: every record. In storage: everything except unchanged synthetic patients. */
  records: Record<string, ReproRecord>;
}

const isSynthetic = (patientId: string) => patientId.startsWith("SYN-");

/** The synthetic population as it stands after the recorded "Advance" presses. Deterministic. */
function syntheticPopulation(seededOn: string, advances: string[]): ReproRecord[] {
  let people = generatePopulation(seededOn, `${seededOn}T00:00:00.000Z`);
  for (const date of advances) people = people.map((p) => addFollowUp(p, date));
  return people;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface DemoRepositoryOptions {
  /** Defaults to window.localStorage when usable. `null` = memory only. */
  storage?: StorageLike | null;
  /** Wall clock for audit entries. */
  now?: () => string;
  /** Today's date (YYYY-MM-DD). Defaults to the wall clock; tests fix it. */
  today?: string;
}

function browserStorage(): StorageLike | null {
  try {
    const s = (globalThis as { localStorage?: StorageLike }).localStorage;
    if (!s) return null;
    const probe = `${STORAGE_KEY}.probe`;
    s.setItem(probe, "1");
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

export function createDemoRepository(options: DemoRepositoryOptions = {}): ReproRepository {
  const now = options.now ?? (() => new Date().toISOString());
  const today = () => options.today ?? now().slice(0, 10);
  let storage: StorageLike | null = options.storage === undefined ? browserStorage() : options.storage;
  let state: DemoState | null = null;
  /** Per-person population facts for one evaluation date; cleared on every change. */
  let populationCache: { asOf: string; people: PersonFacts[] } | null = null;

  const read = (): DemoState | null => {
    if (!storage) return null;
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const stored = JSON.parse(raw) as DemoState;
      if (stored?.version !== STORAGE_VERSION || !stored.records) return null;
      const records: Record<string, ReproRecord> = {};
      for (const r of syntheticPopulation(stored.seededOn, stored.advances)) records[r.patientId] = r;
      return { ...stored, records: Object.assign(records, stored.records) };
    } catch {
      storage = null;
      return null;
    }
  };

  const write = () => {
    populationCache = null;
    if (!storage || !state) return;
    // A synthetic record is stored only once something changed it (every logged action moves updatedAt).
    const kept = Object.fromEntries(Object.entries(state.records).filter(([id, r]) => !isSynthetic(id) || r.updatedAt !== r.createdAt));
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify({ ...state, records: kept }));
    } catch {
      // Quota or blocked storage: keep going in memory for this session.
      storage = null;
    }
  };

  const seed = (keep: ReproRecord[] = []): DemoState => {
    const at = now();
    const seededOn = today();
    const records: Record<string, ReproRecord> = {};
    for (const r of syntheticPopulation(seededOn, [])) records[r.patientId] = r;
    for (const s of SCENARIOS) records[s.id] = buildScenario(s.id, s.id, seededOn, at, { id: "system", name: "System" });
    for (const r of keep) records[r.patientId] = r;
    return { version: STORAGE_VERSION, seededOn, advancedMonths: 0, advances: [], records };
  };

  const load = (): DemoState => {
    if (!state) {
      state = read() ?? seed();
      write();
    }
    return state;
  };

  const demoAsOf = () => addMonths(today(), load().advancedMonths);

  const copy = <T>(value: T): T => structuredClone(value);

  const log = (record: ReproRecord, actor: Actor, action: ActivityEntry["action"], detail: string, category?: ConsentCategory) => {
    const at = now();
    record.activity.push({ id: `${record.patientId}-act-${record.activity.length + 1}`, at, by: actor, action, detail, ...(category ? { category } : {}) });
    record.updatedAt = at;
  };

  const mutate = async (patientId: string, fn: (r: ReproRecord) => void): Promise<ReproRecord> => {
    const record = load().records[patientId];
    if (!record) throw new Error(`No reproductive record for ${patientId}`);
    fn(record);
    write();
    return copy(record);
  };

  /** Only categories this person has consented to can be shared; symptoms never are. */
  const shareable = (r: ReproRecord, wanted: ConsentCategory[]) =>
    Array.from(new Set(wanted)).filter((c) => c !== "PARTNER_SHARING" && c !== "CLINICIAN_SHARING" && isPermitted(r, c));

  const hasData = (r: ReproRecord) =>
    r.observations.length > 0 || r.cycles.length > 0 || r.historyCompleted || r.lifestyle !== null || Object.keys(r.reproductive).length > 0;

  return {
    kind: "demo",
    isPersistent: () => {
      load();
      return storage !== null;
    },
    getAsOf: async () => demoAsOf(),
    getToday: async () => today(),

    getRecord: async (patientId) => {
      const r = load().records[patientId];
      return r ? copy(r) : null;
    },

    createRecord: async (patientId, profile: ReproProfile, actor, permitted) => {
      const s = load();
      if (!s.records[patientId]) {
        const at = now();
        const record = newRecord(patientId, profile, at, actor, false, permitted);
        const agreed = CONSENT_STEP_CATEGORIES.filter((c) => permitted.includes(c));
        log(record, actor, "CONSENT_CAPTURED", `${CONSENT_STATEMENT} ${["PROFILE", ...agreed].join(", ")} (confirmed ${at.slice(0, 10)})`);
        s.records[patientId] = record;
        write();
      }
      return copy(s.records[patientId]);
    },

    addObservations: (patientId, observations: Observation[], actor) =>
      mutate(patientId, (r) => {
        const start = r.observations.length;
        r.observations.push(...observations.map((o, i) => ({ ...o, id: `${patientId}-e${start + i + 1}` })));
        log(r, actor, "DATA_ADDED", `${observations.length} result(s) added: ${observations.map((o) => o.code.key).join(", ")}`);
      }),

    addCycles: (patientId, cycles: CycleRecord[], actor) =>
      mutate(patientId, (r) => {
        r.cycles = [...r.cycles, ...cycles].sort((a, b) => a.startDate.localeCompare(b.startDate));
        log(r, actor, "DATA_ADDED", `${cycles.length} cycle record(s) added`);
      }),

    setHistory: (patientId, items: HistoryItems, actor) =>
      mutate(patientId, (r) => {
        r.historyCompleted = true;
        r.conditions = conditionsFromHistory(patientId, items, now().slice(0, 10));
        log(r, actor, "HISTORY_UPDATED", "History updated");
      }),

    setLifestyle: (patientId, lifestyle: Lifestyle, actor) =>
      mutate(patientId, (r) => {
        r.lifestyle = lifestyle;
        log(r, actor, "LIFESTYLE_UPDATED", "Lifestyle updated");
      }),

    setReproductiveContext: (patientId, context: ReproductiveContext, actor) =>
      mutate(patientId, (r) => {
        r.reproductive = context;
        log(r, actor, "PLANS_UPDATED", "Plans and questions updated");
      }),

    setConsent: (patientId, category, granted, reason, actor) => {
      if (category === "PROFILE" && !granted) {
        return Promise.reject(new Error("Age and sex (PROFILE) are required and cannot be withdrawn"));
      }
      if (!reason.trim()) return Promise.reject(new Error("A reason is required for every consent change"));
      return mutate(patientId, (r) => {
        const p = r.consent.provision.find((x) => x.category === category)!;
        Object.assign(p, { type: granted ? "permit" : "deny", updatedAt: now(), updatedBy: actor, reason: reason.trim() });
        log(r, actor, "CONSENT_CHANGED", `${granted ? "Granted" : "Withdrawn"}: ${reason.trim()}`, category);
      });
    },

    submitSymptoms: async (patientId, symptoms: Symptoms, actor) => {
      // Runs whatever the consent settings. The text is checked here and then dropped.
      const check = checkInput(symptoms.freeText ?? "");
      const flags = new Set<RedFlag>(check.redFlags);
      if (symptoms.severeOneSidedPelvicPain && (symptoms.missedPeriod || symptoms.positivePregnancyTest || symptoms.fainting)) flags.add("R35");
      if (symptoms.bleedingAfterSex || symptoms.bleedingBetweenPeriods) flags.add("R36");
      const record = await mutate(patientId, (r) => {
        for (const ruleId of flags) {
          if (r.redFlags.some((e) => e.ruleId === ruleId && e.status === "OPEN")) continue;
          r.redFlags.push({
            id: `${patientId}-rf-${r.redFlags.length + 1}`,
            ruleId,
            detectedAt: now(),
            source: check.redFlags.includes(ruleId) ? "FREE_TEXT" : "STRUCTURED",
            status: "OPEN",
          });
          log(r, actor, "RED_FLAG_RAISED", `${ruleId} red flag found at entry (symptom text not stored)`);
        }
      });
      return { check, record };
    },

    resolveRedFlag: (patientId, eventId, resolution, actor) =>
      mutate(patientId, (r) => {
        const e = r.redFlags.find((x) => x.id === eventId);
        if (!e) throw new Error(`No red flag ${eventId}`);
        if (e.status !== "OPEN") throw new Error(`Red flag ${eventId} is already resolved`);
        Object.assign(e, { status: resolution, resolvedAt: now(), resolvedBy: actor });
        log(r, actor, "RED_FLAG_RESOLVED", `${e.ruleId}: ${resolution === "ACKNOWLEDGED_REFERRED" ? "Acknowledged and referred" : "Not present (dismissed)"}`);
      }),

    recordCounselling: (patientId, date, actor) =>
      mutate(patientId, (r) => {
        r.counselling.push({ id: `${patientId}-c${r.counselling.length + 1}`, date });
        log(r, actor, "COUNSELLING_RECORDED", `Counselling recorded for ${date}`);
      }),

    getActivity: async (patientId) => copy([...(load().records[patientId]?.activity ?? [])].reverse()),

    requestPartnerLink: async (patientId, partnerId, sharedCategories, actor) => {
      const s = load();
      const self = s.records[patientId];
      const other = s.records[partnerId.trim()];
      if (!self) throw new Error(`No reproductive record for ${patientId}`);
      if (partnerId.trim() === patientId) throw new Error("A person cannot be linked to themselves.");
      if (!other) throw new Error(`No Reproductive Health record for ${partnerId}. The partner's own consent step must be completed first.`);
      if (self.isDemo !== other.isDemo) throw new Error("Demo records can only be linked to demo records, and real records to real records.");
      if (self.partner || other.partner) throw new Error("One of these records is already linked to a partner. End that link first.");
      if (!isPermitted(self, "PARTNER_SHARING")) throw new Error("Turn on Partner sharing consent for this patient first.");
      const at = now();
      const share = shareable(self, sharedCategories);
      self.partner = { partnerId: other.patientId, selfConsented: true, partnerConsented: false, sharedCategories: share, linkedAt: at };
      other.partner = { partnerId: self.patientId, selfConsented: false, partnerConsented: true, sharedCategories: [], linkedAt: at };
      log(self, actor, "PARTNER_LINK_REQUESTED", `Link requested with ${other.patientId}; shares: ${share.join(", ") || "nothing yet"}`);
      log(other, actor, "PARTNER_LINK_REQUESTED", `Link requested by ${self.patientId}; waiting for this patient's consent`);
      write();
      return copy(self);
    },

    respondPartnerLink: async (patientId, accept, sharedCategories, actor) => {
      const s = load();
      const self = s.records[patientId];
      const link = self?.partner;
      if (!self || !link || link.selfConsented) throw new Error("There is no link request waiting for this patient.");
      const other = s.records[link.partnerId];
      if (!accept) {
        delete self.partner;
        if (other) delete other.partner;
        log(self, actor, "PARTNER_LINK_DECLINED", `Link with ${link.partnerId} declined`);
        if (other) log(other, actor, "PARTNER_LINK_DECLINED", `${patientId} declined the link`);
      } else {
        if (!isPermitted(self, "PARTNER_SHARING")) throw new Error("Turn on Partner sharing consent for this patient first.");
        const share = shareable(self, sharedCategories);
        Object.assign(link, { selfConsented: true, sharedCategories: share, linkedAt: now() });
        if (other?.partner) other.partner.partnerConsented = true;
        log(self, actor, "PARTNER_LINK_ACCEPTED", `Link with ${link.partnerId} accepted; shares: ${share.join(", ") || "nothing"}`);
        if (other) log(other, actor, "PARTNER_LINK_ACCEPTED", `${patientId} accepted the link`);
      }
      write();
      return copy(self);
    },

    setPartnerSharing: (patientId, sharedCategories, actor) =>
      mutate(patientId, (r) => {
        if (!r.partner) throw new Error("No linked partner.");
        r.partner.sharedCategories = shareable(r, sharedCategories);
        log(r, actor, "PARTNER_SHARING_CHANGED", `Now shares with partner: ${r.partner.sharedCategories.join(", ") || "nothing"}`);
      }),

    unlinkPartner: async (patientId, actor) => {
      const s = load();
      const self = s.records[patientId];
      if (!self?.partner) throw new Error("No linked partner.");
      const other = s.records[self.partner.partnerId];
      log(self, actor, "PARTNER_LINK_ENDED", `Link with ${self.partner.partnerId} ended`);
      if (other?.partner?.partnerId === patientId) {
        delete other.partner;
        log(other, actor, "PARTNER_LINK_ENDED", `Link with ${patientId} ended by the other side`);
      }
      delete self.partner;
      write();
      return copy(self);
    },

    logPartnerDataRead: async (viewerId, partnerId, categories, outcome, actor) => {
      const s = load();
      const result = { LOADED: "loaded", NOT_FOUND: "partner not found in the HIS", FAILED: "load failed" }[outcome];
      const cats = categories.join(", ") || "none";
      const viewer = s.records[viewerId];
      const partner = s.records[partnerId];
      if (viewer) log(viewer, actor, "PARTNER_DATA_READ", `Linked partner ${partnerId}'s EMR history read in this chart; shared categories read: ${cats} (${result})`);
      if (partner) log(partner, actor, "PARTNER_DATA_READ", `EMR history read from the chart of linked partner ${viewerId}; shared categories read: ${cats} (${result})`);
      write();
    },

    createReferral: async (patientId, pathway, reasonRuleIds, actor) => {
      let referral: ServiceRequestResource | undefined;
      const record = await mutate(patientId, (r) => {
        if (!isPermitted(r, "CLINICIAN_SHARING")) throw new Error("Clinician sharing consent is off, so a referral summary cannot be created.");
        referral = {
          resourceType: "ServiceRequest",
          id: `${patientId}-sr${r.serviceRequests.length + 1}`,
          status: "active",
          intent: "proposal",
          pathway,
          reasonRuleIds,
          authoredOn: now(),
        };
        r.serviceRequests.push(referral);
        log(r, actor, "REFERRAL_CREATED", `Referral summary created: ${pathway} (${reasonRuleIds.join(", ")})`);
      });
      return { record, referral: copy(referral!) };
    },

    completeReferral: (patientId, referralId, actor) =>
      mutate(patientId, (r) => {
        const sr = r.serviceRequests.find((x) => x.id === referralId);
        if (!sr) throw new Error(`No referral ${referralId}`);
        Object.assign(sr, { status: "completed", completedOn: now() });
        log(r, actor, "REFERRAL_COMPLETED", `Referral ${referralId} marked completed`);
      }),

    getPopulationAggregates: async (split) => {
      // The synthetic population only: demo scenarios and real records are not counted.
      const asOf = demoAsOf();
      if (populationCache?.asOf !== asOf) {
        const synthetic = Object.values(load().records).filter((r) => r.isDemo && isSynthetic(r.patientId));
        populationCache = { asOf, people: computePeople(synthetic, asOf) };
      }
      return aggregateSplit(populationCache.people, asOf, split);
    },

    listScenarios: async () => copy(SCENARIOS),

    loadScenario: async (patientId, scenarioId, actor) => {
      const s = load();
      const existing = s.records[patientId];
      if (existing && !existing.isDemo && hasData(existing)) {
        throw new Error("This record already has real data. Demo data is only loaded onto an empty record.");
      }
      const record = buildScenario(scenarioId, patientId, demoAsOf(), now(), actor);
      if (existing) {
        record.activity = [...existing.activity, ...record.activity.slice(1)].map((a, i) => ({ ...a, id: `${patientId}-act-${i + 1}` }));
      }
      s.records[patientId] = record;
      write();
      return copy(record);
    },

    resetDemo: async () => {
      const s = load();
      const keep = Object.values(s.records).filter((r) => !r.isDemo);
      try {
        storage?.removeItem(STORAGE_KEY);
      } catch {
        storage = null;
      }
      state = seed(keep);
      write();
    },

    advanceDemo: async (months, actor) => {
      const s = load();
      const newAsOf = addMonths(today(), s.advancedMonths + months);
      for (const [id, r] of Object.entries(s.records)) {
        if (!r.isDemo) continue;
        const next = addFollowUp(r, newAsOf);
        if (!isSynthetic(id)) log(next, actor, "DEMO_ADVANCED", `Demo clock moved to ${newAsOf}; seeded follow-up readings added`);
        s.records[id] = next;
      }
      s.advancedMonths += months;
      s.advances.push(newAsOf);
      write();
      return newAsOf;
    },
  };
}

/** The repository the UI uses. Swap for an API-backed one later. */
export const demoRepository: ReproRepository = createDemoRepository();
