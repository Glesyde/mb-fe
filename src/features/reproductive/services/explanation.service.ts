// Explanation (stage 7) and Safety Guardrail output check (stage 8).
// Standard (template) wording by default. AI wording only when VITE_REPRO_EXPLAIN_URL is set, and
// only the engine's structured JSON is sent (no names, no MRN, no free text). No model key here.
// Template wording is shown, with "Standard wording shown", when the URL is unset, the call fails,
// takes longer than 2.5 s, or the text fails the output check.

import { EXPLAIN_TIMEOUT_MS } from "../engine/config";
import { STAGES, type TraceEntry } from "../engine/trace";
import type { EngineResult, Language } from "../engine/types";
import { checkOutput } from "../guardrails/outputCheck";
import { templateSummary } from "./templateExplainer";

export interface ExplainOptions {
  /** Defaults to VITE_REPRO_EXPLAIN_URL. */
  url?: string;
  fetchImpl?: (url: string, init: { method: string; headers: Record<string, string>; body: string; signal: AbortSignal }) => Promise<{ ok: boolean; json(): Promise<unknown> }>;
  timeoutMs?: number;
  clock?: () => number;
}

export interface Explanation {
  /** Text per language. AI wording replaces only the requested language. */
  text: Record<Language, string>;
  source: "TEMPLATE" | "AI";
  /** "explain.standardWording" when template text is shown. */
  noteKey: "explain.standardWording" | null;
  fallbackReason: "NOT_CONFIGURED" | "FAILED" | "TIMEOUT" | "OUTPUT_CHECK" | null;
  violations: string[];
  trace: [TraceEntry, TraceEntry];
}

/** What the AI endpoint receives: structure, keys and numbers only. */
export function explainPayload(result: EngineResult, lang: Language) {
  return {
    language: lang,
    vectors: result.vectors.map((v) => ({
      vector: v.vector,
      state: v.state,
      density: v.density,
      dataWithdrawn: v.dataWithdrawn,
      reasons: v.reasons.map((r) => r.key),
      gaps: v.gaps.map((g) => g.key),
      ruleIds: v.ruleIds,
      series: v.series.map((s) => ({ key: s.key, points: s.points.map((p) => ({ value: p.value, unit: p.unit })) })),
      referenceBand: v.referenceBand ? { low: v.referenceBand.low, high: v.referenceBand.high, unit: v.referenceBand.unit } : undefined,
    })),
    nextSteps: result.nextSteps.map((s) => ({ pathway: s.pathway, urgency: s.urgency, messageKeys: s.items.map((i) => i.messageKey) })),
    rules: result.firedRules.map((r) => ({ id: r.id, citation: `${r.citation.source} ${r.citation.ref}`.trim() })),
  };
}

const stageMeta = (id: "EXPLANATION" | "OUTPUT_CHECK") => STAGES.find((s) => s.id === id)!;

function envUrl(): string | undefined {
  const url = (import.meta as any).env?.VITE_REPRO_EXPLAIN_URL;
  return typeof url === "string" && url.trim() ? url.trim() : undefined;
}

export async function explain(result: EngineResult, lang: Language, options: ExplainOptions = {}): Promise<Explanation> {
  const clock = options.clock;
  const start = clock ? clock() : 0;
  const elapsed = () => (clock ? Math.round((clock() - start) * 100) / 100 : 0);
  const template: Record<Language, string> = { en: templateSummary(result, "en").text, ar: templateSummary(result, "ar").text };
  const url = options.url ?? envUrl();

  const finish = (
    source: Explanation["source"],
    text: Record<Language, string>,
    fallbackReason: Explanation["fallbackReason"],
    violations: string[],
    explainMs: number,
    checkMs: number,
  ): Explanation => {
    const explanationEntry: TraceEntry = {
      ...stageMeta("EXPLANATION"),
      input: `${result.vectors.length} card(s), ${result.nextSteps.length} next step(s); language ${lang}`,
      output: source === "AI" ? "AI wording received" : "Standard template wording (EN and AR)",
      decision:
        fallbackReason === null
          ? source === "AI"
            ? "AI wording used"
            : "Standard wording"
          : {
              NOT_CONFIGURED: "AI wording not enabled; standard wording shown",
              FAILED: "AI call failed (offline or error); standard wording shown",
              TIMEOUT: `AI call took longer than ${(options.timeoutMs ?? EXPLAIN_TIMEOUT_MS) / 1000} s; standard wording shown`,
              OUTPUT_CHECK: "AI wording failed the output check; standard wording shown",
            }[fallbackReason],
      ruleIds: [],
      durationMs: explainMs,
      status: "done",
    };
    const ran = fallbackReason === "OUTPUT_CHECK" || source === "AI";
    const checkEntry: TraceEntry = {
      ...stageMeta("OUTPUT_CHECK"),
      input: ran ? "AI wording" : "Standard wording from the reviewed catalogue",
      output: ran ? (violations.length ? `Rejected: ${violations.join(", ")}` : "Passed") : "Not needed",
      decision: ran ? (violations.length ? "Blocked; standard wording shown" : "AI wording, checked") : "Catalogue text is scanned by the wording tests",
      ruleIds: [],
      durationMs: checkMs,
      status: "done",
    };
    return {
      text,
      source,
      noteKey: source === "TEMPLATE" ? "explain.standardWording" : null,
      fallbackReason,
      violations,
      trace: [explanationEntry, checkEntry],
    };
  };

  if (result.halted || !url) return finish("TEMPLATE", template, result.halted ? null : "NOT_CONFIGURED", [], elapsed(), 0);

  const payload = explainPayload(result, lang);
  const fetchImpl = options.fetchImpl ?? ((u, init) => fetch(u, init));
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<"TIMEOUT">((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve("TIMEOUT");
    }, options.timeoutMs ?? EXPLAIN_TIMEOUT_MS);
  });

  let text: string | null = null;
  try {
    const outcome = await Promise.race([
      fetchImpl(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      }).then(async (res) => {
        if (!res.ok) return "FAILED" as const;
        const body = (await res.json()) as { text?: unknown };
        return typeof body?.text === "string" ? body.text : ("FAILED" as const);
      }),
      timeout,
    ]);
    if (outcome === "TIMEOUT") return finish("TEMPLATE", template, "TIMEOUT", [], elapsed(), 0);
    if (outcome === "FAILED") return finish("TEMPLATE", template, "FAILED", [], elapsed(), 0);
    text = outcome;
  } catch {
    return finish("TEMPLATE", template, "FAILED", [], elapsed(), 0);
  } finally {
    clearTimeout(timer);
  }

  const explainMs = elapsed();
  const check = checkOutput(text, payload);
  const checkMs = Math.max(0, elapsed() - explainMs);
  if (!check.ok) return finish("TEMPLATE", template, "OUTPUT_CHECK", check.violations, explainMs, checkMs);
  return finish("AI", { ...template, [lang]: text }, null, [], explainMs, checkMs);
}
