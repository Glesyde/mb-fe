// "How this result was reached": one trace entry per stage. Summaries hold counts and
// categories only, never names, MRN or free text. There is no diagnosis stage.

import type { ConsentCategory, EngineInput, VectorResult } from "./types";

export type StageId =
  | "CONSENT_FILTER"
  | "INPUT_CHECK"
  | "DATA_MAPPING"
  | "VECTORS"
  | "RULES"
  | "PATHWAYS"
  | "EXPLANATION"
  | "OUTPUT_CHECK"
  | "ASSEMBLY";

export const STAGES: { stage: number; id: StageId; name: string; description: string }[] = [
  { stage: 1, id: "CONSENT_FILTER", name: "Consent filter", description: "Removes every data category the person has not agreed to share." },
  { stage: 2, id: "INPUT_CHECK", name: "Safety Guardrail input check", description: "Checks symptoms for red flags before anything else; stops on an emergency." },
  { stage: 3, id: "DATA_MAPPING", name: "Data mapping", description: "Reads results, converts units and orders readings by date. Nothing is estimated." },
  { stage: 4, id: "VECTORS", name: "Vector evaluation (V1–V5)", description: "Gives each trajectory a state and a data-density badge." },
  { stage: 5, id: "RULES", name: "Rules and citations", description: "Runs the deterministic rules and attaches their citations." },
  { stage: 6, id: "PATHWAYS", name: "Pathway selection", description: "Orders next steps by pathway priority (P6 first)." },
  { stage: 7, id: "EXPLANATION", name: "Explanation", description: "Builds the plain-language summary (standard wording, or AI wording when enabled)." },
  { stage: 8, id: "OUTPUT_CHECK", name: "Safety Guardrail output check", description: "Rejects AI wording with scores, percentages, diagnoses, prescribing or unknown numbers." },
  { stage: 9, id: "ASSEMBLY", name: "Brief/referral assembly", description: "Collects trends, discussion points, missing tests and citations for the brief." },
];

export interface TraceEntry {
  stage: number;
  id: StageId;
  name: string;
  description: string;
  input: string;
  output: string;
  decision: string;
  ruleIds: string[];
  durationMs: number;
  /** stopped = the run ended here (emergency); skipped = not run because an earlier stage stopped. */
  status: "done" | "stopped" | "skipped";
}

export type Clock = () => number;

/** Times `fn` and returns its value plus a trace entry. Without a clock, durations are 0 (deterministic). */
export function traced<T>(
  id: StageId,
  clock: Clock | undefined,
  fn: () => T,
  describe: (value: T) => Omit<TraceEntry, "stage" | "id" | "name" | "description" | "durationMs" | "status"> & { status?: TraceEntry["status"] },
): { value: T; entry: TraceEntry } {
  const start = clock ? clock() : 0;
  const value = fn();
  const durationMs = clock ? Math.round((clock() - start) * 100) / 100 : 0;
  const meta = STAGES.find((s) => s.id === id)!;
  const { status = "done", ...rest } = describe(value);
  return { value, entry: { ...meta, ...rest, durationMs, status } };
}

export function skippedEntry(id: StageId, reason: string): TraceEntry {
  const meta = STAGES.find((s) => s.id === id)!;
  return { ...meta, input: "—", output: "—", decision: reason, ruleIds: [], durationMs: 0, status: "skipped" };
}

export function summariseInput(input: EngineInput): string {
  const byKey = new Map<string, number>();
  for (const o of input.observations) byKey.set(o.code.key, (byKey.get(o.code.key) ?? 0) + 1);
  const obs = Array.from(byKey.entries())
    .map(([k, n]) => `${k} ${n}`)
    .join(", ");
  const parts = [
    `${input.observations.length} result(s)${obs ? ` (${obs})` : ""}`,
    `${input.cycles.length} cycle record(s)`,
    input.history ? "history filled in" : "no history",
    input.lifestyle ? "lifestyle recorded" : "no lifestyle",
    `${Object.keys(input.reproductive).length} plan field(s)`,
  ];
  return parts.join("; ");
}

export function summariseVectors(vectors: VectorResult[]): string {
  return vectors.map((v) => `${v.vector} ${v.state}${v.dataWithdrawn ? " (data withdrawn)" : ""} [${v.density}]`).join(", ") || "none";
}

export function listCategories(c: ConsentCategory[]): string {
  return c.length ? c.join(", ") : "none";
}
