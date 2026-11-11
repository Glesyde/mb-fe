// Reproductive Health engine entry point. Pure and deterministic: same input, same output.
// Stages 1–6: consent filter → Safety Guardrail input check → data mapping → vectors → rules → pathways.
// Stages 7–9 (explanation, output check, brief assembly) run in services/reproductive.service.ts.

import { checkInput } from "../guardrails/inputCheck";
import { uniqueCitations } from "./citations";
import { applyConsent } from "./consent";
import { deriveFacts, type Facts } from "./facts";
import { buildNextSteps, PATHWAY_PRIORITY } from "./pathways";
import { RULES, RULES_BY_ID, type Rule, type RuleContext } from "./rules";
import { listCategories, skippedEntry, summariseInput, summariseVectors, traced, type TraceEntry } from "./trace";
import type {
  EngineInput,
  EngineResult,
  EvaluateOptions,
  FiredRule,
  MessageRef,
  PartnerShare,
  VectorId,
} from "./types";
import { computeV1, computeV2, computeV3, computeV4, computeV5, visibleVectors, type ComputedVector } from "./vectors";

const toFired = (rule: Rule): FiredRule => ({
  id: rule.id,
  messageKey: rule.output.messageKey,
  pathways: [...rule.output.pathways],
  urgency: rule.output.urgency,
  citation: rule.citation,
});

function attachRules(fired: Rule[], ctx: RuleContext, computed: Partial<Record<VectorId, ComputedVector>>) {
  for (const rule of fired) {
    for (const v of rule.vectors) {
      const c = computed[v];
      if (!c || (rule.appliesToVector && !rule.appliesToVector(ctx, v))) continue;
      c.result.ruleIds.push(rule.id);
      c.result.citations.push(rule.citation);
    }
  }
  for (const c of Object.values(computed)) {
    if (!c) continue;
    const reasonCitations = [...c.result.reasons, ...c.result.gaps].flatMap((r) => (r.citation ? [r.citation] : []));
    c.result.citations = uniqueCitations([...reasonCitations, ...c.result.citations]);
  }
}

function computeVector(v: VectorId, facts: Facts, input: EngineInput, withdrawn: RuleContext["withdrawn"]) {
  switch (v) {
    case "V1":
      return computeV1(facts, withdrawn);
    case "V2":
      return computeV2(facts, withdrawn);
    case "V3":
      return computeV3(facts, withdrawn);
    case "V4":
      return computeV4(facts, withdrawn);
    case "V5":
      return computeV5(facts, input.history, withdrawn);
  }
}

/** Partner rules that never become a "For your partner" step (age context, red flags, density, consent notes). */
const NOT_PARTNER_STEPS = ["R04", "R35", "R36", "R39", "R40"];

/** Pathway rules first in priority order (P6 → P1), then information-only rules; ties by rule ID. */
function byPathwayPriority(a: FiredRule, b: FiredRule): number {
  const rank = (f: FiredRule) => (f.pathways.length ? Math.min(...f.pathways.map((p) => PATHWAY_PRIORITY.indexOf(p))) : PATHWAY_PRIORITY.length);
  return rank(a) - rank(b) || a.id.localeCompare(b.id);
}

/**
 * V4 for a woman, and the partner's own next steps, built only from a linked male partner's
 * shared categories.
 */
function partnerView(share: PartnerShare): { v4: ComputedVector; steps: FiredRule[] } | null {
  if (share.input.consent.PARTNER_SHARING !== true || share.input.subject.sex !== "male") return null;
  const { input, excluded } = applyConsent(share.input, share.sharedCategories);
  const facts = deriveFacts(input, { r35: false, r36: false });
  const v4 = computeV4(facts, excluded);
  v4.result.fromPartner = true;
  // For a partner, missing categories were not shared with this person (not withdrawn).
  v4.result.reasons = v4.result.reasons.map((r) => (r.key === "common.dataWithdrawn" ? { key: "v4.partnerNotShared" } : r));
  v4.result.gaps = v4.result.gaps.map((g) =>
    g.key.startsWith("gap.withdrawn.") ? { key: g.key.replace("gap.withdrawn.", "gap.partnerNotShared.") } : g,
  );
  v4.result.reasons.push({ key: "v4.fromPartner" });
  const ctx: RuleContext = { input, facts, vectors: { V4: v4 }, withdrawn: excluded };
  const fired = RULES.filter((r) => r.applies(ctx));
  attachRules(
    fired.filter((r) => r.vectors.includes("V4")),
    ctx,
    { V4: v4 },
  );
  const steps = fired.filter((r) => !NOT_PARTNER_STEPS.includes(r.id)).map(toFired).sort(byPathwayPriority);
  return { v4, steps };
}

export function evaluate(input: EngineInput, options: EvaluateOptions = {}): EngineResult {
  const clock = options.clock;
  const trace: TraceEntry[] = [];

  // 1. Consent filter: withdrawn data leaves the input before any calculation.
  const consent = traced(
    "CONSENT_FILTER",
    clock,
    () => applyConsent(input),
    ({ input: filtered, withdrawn }) => ({
      input: summariseInput(input),
      output: summariseInput(filtered),
      decision: withdrawn.length ? `Not shared, so excluded: ${listCategories(withdrawn)}` : "Every data category is shared",
      ruleIds: withdrawn.length ? ["R40"] : [],
    }),
  );
  trace.push(consent.entry);
  const { input: filtered, withdrawn } = consent.value;

  // 2. Safety Guardrail input check. Symptoms are not consent-gated: the check always runs.
  const check = traced(
    "INPUT_CHECK",
    clock,
    () => {
      const text = checkInput(input.symptoms.freeText ?? "");
      const s = input.symptoms;
      const open = input.openRedFlags ?? [];
      const r35 =
        open.includes("R35") ||
        text.redFlags.includes("R35") ||
        (s.severeOneSidedPelvicPain === true && (s.missedPeriod === true || s.positivePregnancyTest === true || s.fainting === true));
      const r36 =
        open.includes("R36") || text.redFlags.includes("R36") || s.bleedingAfterSex === true || s.bleedingBetweenPeriods === true;
      return { r35, r36, halt: r35 || (r36 && options.haltOnAnyRedFlag === true) };
    },
    ({ r35, r36, halt }) => {
      const flags = [...(r35 ? ["R35"] : []), ...(r36 ? ["R36"] : [])];
      return {
        input: `Symptom text: ${input.symptoms.freeText ? "checked, not stored" : "none"}; open red flags: ${(input.openRedFlags ?? []).length}`,
        output: flags.length ? `Red flags: ${flags.join(", ")}` : "No red flags",
        decision: halt ? "Emergency panel shown; normal processing stopped" : flags.length ? "Urgent step added; processing continues" : "Continue",
        ruleIds: flags,
        status: halt ? "stopped" : "done",
      };
    },
  );
  trace.push(check.entry);
  const { r35, r36, halt } = check.value;

  if (halt) {
    const fired = [...(r35 ? [RULES_BY_ID.R35] : []), ...(r36 ? [RULES_BY_ID.R36] : [])].map(toFired);
    for (const id of ["DATA_MAPPING", "VECTORS", "RULES", "PATHWAYS"] as const) trace.push(skippedEntry(id, "Stopped at stage 2: emergency panel"));
    return {
      asOf: input.asOf,
      emergency: r35,
      halted: true,
      redFlags: fired.map((f) => f.id),
      vectors: [],
      nextSteps: buildNextSteps(fired),
      partnerSteps: [],
      firedRules: fired,
      withdrawnCategories: withdrawn,
      placeholderReferenceInUse: false,
      gaps: [],
      trace,
    };
  }

  // 3. Data mapping: units, dates, cycle lengths. Missing data stays missing.
  const mapping = traced(
    "DATA_MAPPING",
    clock,
    () => deriveFacts(filtered, { r35, r36 }),
    (f) => ({
      input: `${filtered.observations.length} result(s), ${filtered.cycles.length} cycle record(s)${options.mappingSummary ? `; ${options.mappingSummary}` : ""}`,
      output: `AMH ${f.amh.length} (ng/mL), AFC ${f.afc.length}, FSH ${f.fsh.length}, HbA1c ${f.hba1c.length}, BMI ${f.bmi.length}, BP ${f.bp.length}, semen analyses ${f.semen.length}, cycle lengths ${f.cycleLengths.length}`,
      decision: "Units converted; no values estimated",
      ruleIds: [],
    }),
  );
  trace.push(mapping.entry);
  const facts = mapping.value;

  // 4. Vectors.
  const vectorStage = traced(
    "VECTORS",
    clock,
    () => {
      const partner = facts.isFemale && options.partner ? partnerView(options.partner) : null;
      const visible = visibleVectors(facts, partner !== null);
      const computed: Partial<Record<VectorId, ComputedVector>> = {};
      for (const v of visible) computed[v] = v === "V4" && partner ? partner.v4 : computeVector(v, facts, filtered, withdrawn);
      return { partner, visible, computed };
    },
    ({ visible, computed }) => {
      const hidden = (["V1", "V2", "V3", "V4", "V5"] as VectorId[]).filter((v) => !visible.includes(v));
      return {
        input: `sex ${facts.sex ?? "not recorded"}, age ${facts.age ?? "not recorded"}`,
        output: summariseVectors(visible.map((v) => computed[v]!.result)),
        decision: `${visible.length} card(s) shown${hidden.length ? `; hidden: ${hidden.join(", ")}` : ""}`,
        ruleIds: [],
      };
    },
  );
  trace.push(vectorStage.entry);
  const { partner, visible, computed } = vectorStage.value;

  // 5. Rules and citations (a partner card already carries its own rule IDs).
  const rulesStage = traced(
    "RULES",
    clock,
    () => {
      const ownVectors = { ...computed };
      if (partner) delete ownVectors.V4;
      const ctx: RuleContext = { input: filtered, facts, vectors: ownVectors, withdrawn };
      const fired = RULES.filter((r) => r.applies(ctx));
      attachRules(fired, ctx, ownVectors);
      const own = fired.map(toFired);
      // A partner step that also fired for this person is shown once, in her own steps.
      const partnerSteps = (partner?.steps ?? []).filter((p) => !own.some((o) => o.id === p.id));
      return { own, partnerSteps };
    },
    ({ own, partnerSteps }) => {
      const toVerify = own.filter((f) => !f.citation.verified).length;
      return {
        input: `${RULES.length} rules${partner ? "; linked partner's shared data" : ""}`,
        output: `${own.length} rule(s) fired; ${own.length - toVerify} citation(s) verified, ${toVerify} to verify${partner ? `; ${partnerSteps.length} partner step(s)` : ""}`,
        decision: own.length ? "Citations attached to every result" : "No rule applies",
        ruleIds: [...own.map((f) => f.id), ...partnerSteps.map((f) => `partner:${f.id}`)],
      };
    },
  );
  trace.push(rulesStage.entry);
  const { own: firedRules, partnerSteps } = rulesStage.value;

  // 6. Pathway selection.
  const pathwayStage = traced(
    "PATHWAYS",
    clock,
    () => buildNextSteps(firedRules),
    (steps) => ({
      input: `${firedRules.filter((f) => f.pathways.length).length} rule(s) with a pathway`,
      output: steps.length ? steps.map((s) => s.pathway).join(" > ") : "No pathway",
      decision: steps.length ? `First: ${steps[0].pathway} (${steps[0].urgency})` : "Nothing to refer or test; no medication, no booking",
      ruleIds: steps.flatMap((s) => s.items.map((i) => i.ruleId)),
    }),
  );
  trace.push(pathwayStage.entry);

  const gaps: MessageRef[] = [];
  if (facts.sex === null) gaps.push({ key: "gap.noSex" });
  if (facts.age === null) gaps.push({ key: "gap.noAge" });
  const vectors = visible.map((v) => computed[v]!.result);
  return {
    asOf: input.asOf,
    emergency: false,
    halted: false,
    redFlags: r36 ? ["R36"] : [],
    vectors,
    nextSteps: pathwayStage.value,
    partnerSteps,
    firedRules,
    withdrawnCategories: withdrawn,
    placeholderReferenceInUse: vectors.some((v) => v.referenceBand?.placeholder === true),
    gaps,
    trace,
  };
}

export { applyConsent } from "./consent";
export { PATHWAY_PRIORITY, buildNextSteps } from "./pathways";
export { RULES, RULES_BY_ID } from "./rules";
export { AMH_REFERENCE_BANDS, AMH_PMOL_PER_NG, convertAmh, findAmhBand, isPlaceholderBand } from "./amhReference";
export * from "./types";
export { STAGES, type StageId, type TraceEntry } from "./trace";
