// Pathway ordering. P6 always first; the others co-exist in this priority order.
// No pathway prescribes medication or books an appointment.

import type { FiredRule, NextStep, PathwayId, Urgency } from "./types";

export const PATHWAY_PRIORITY: PathwayId[] = ["P6", "P4", "P5", "P2", "P3", "P1"];

const URGENCY_ORDER: Urgency[] = ["INFO", "ROUTINE", "URGENT", "EMERGENCY"];

function maxUrgency(a: Urgency, b: Urgency): Urgency {
  return URGENCY_ORDER.indexOf(a) >= URGENCY_ORDER.indexOf(b) ? a : b;
}

/** Group fired rules into next steps, one per pathway, in priority order. Items keep rule order. */
export function buildNextSteps(fired: FiredRule[]): NextStep[] {
  const steps: NextStep[] = [];
  for (const pathway of PATHWAY_PRIORITY) {
    const rules = fired.filter((r) => r.pathways.includes(pathway));
    if (!rules.length) continue;
    steps.push({
      pathway,
      urgency: rules.reduce<Urgency>((u, r) => maxUrgency(u, r.urgency), "ROUTINE"),
      items: rules.map((r) => ({ ruleId: r.id, messageKey: r.messageKey, citation: r.citation })),
    });
  }
  return steps;
}
