// Runs the 50 JSON fixtures in ./cases. `npm run test:report` also writes docs/reproductive/TEST_REPORT.md,
// with a benchmark summary and, for every failing case, the first pipeline stage that went wrong.

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";
import { evaluate, STAGES } from "../engine";
import type { ConsentCategory, ConsentState, EngineInput, EngineResult, HistoryItems, Lifestyle, ReproductiveContext, SemenComponentKey, Sex, Symptoms } from "../engine/types";
import { canAccessReproductive } from "../guardrails/accessPolicy";
import { checkInput } from "../guardrails/inputCheck";
import { checkOutput } from "../guardrails/outputCheck";
import { messagesAr } from "../i18n/messages.ar";
import { explain } from "../services/explanation.service";
import { cycles, obs, person, semen } from "./helpers";

// --- Fixture format ---------------------------------------------------------------------------
interface CompactInput {
  sex: Sex | null;
  age: number | null;
  observations?: { key: string; value: number; unit: string; date: string; hormonalContraception?: boolean }[];
  semen?: { date: string; values: Partial<Record<SemenComponentKey, number>> }[];
  cycleLengths?: number[];
  lifestyle?: Lifestyle;
  history?: HistoryItems;
  reproductive?: ReproductiveContext;
  symptoms?: Symptoms;
  consent?: Partial<ConsentState>;
}

interface Expected {
  emergency?: boolean;
  vectors?: Record<string, string>;
  density?: Record<string, string>;
  dataWithdrawn?: string[];
  reasons?: Record<string, string[]>;
  gaps?: Record<string, string[]>;
  vectorRules?: Record<string, string[]>;
  pathways?: string[];
  urgency?: Record<string, string>;
  rulesInclude?: string[];
  rulesExclude?: string[];
  /** Exact "For your partner" rule IDs, in display order. */
  partnerSteps?: string[];
  blocked?: string[];
  redFlags?: string[];
  outputRejected?: boolean;
  allowed?: boolean;
  source?: string;
  fallbackReason?: string;
  note?: string;
}

interface Fixture {
  id: string;
  title: string;
  kind: "engine" | "catalogue" | "inputCheck" | "access" | "explain";
  language: "en" | "ar";
  input?: CompactInput;
  partner?: { input: CompactInput; sharedCategories: ConsentCategory[] };
  text?: string;
  roleSets?: string[][];
  hasEmrAccess?: boolean;
  explain?: { mode: "delay" | "offline"; delayMs?: number; text?: string };
  expected: Expected;
}

const CASES_DIR = resolve(process.cwd(), "src/features/reproductive/__tests__/cases");
const REPORT_PATH = resolve(process.cwd(), "docs/reproductive/TEST_REPORT.md");

const fixtures: Fixture[] = readdirSync(CASES_DIR)
  .filter((f) => f.endsWith(".json"))
  .sort()
  .map((f) => JSON.parse(readFileSync(resolve(CASES_DIR, f), "utf8")));

export function expand(c: CompactInput): EngineInput {
  return person(c.sex, c.age, {
    observations: [
      ...(c.observations ?? []).map((o) =>
        obs(o.key as never, o.value, o.unit, o.date, o.hormonalContraception ? { context: { hormonalContraception: true } } : {}),
      ),
      ...(c.semen ?? []).map((s) => semen(s.date, s.values)),
    ],
    cycles: c.cycleLengths ? cycles(c.cycleLengths) : [],
    lifestyle: c.lifestyle ?? null,
    history: c.history ?? null,
    reproductive: c.reproductive ?? {},
    symptoms: c.symptoms ?? {},
    consent: c.consent,
  });
}

// --- Checking -----------------------------------------------------------------------------------
/** A failure, tagged with the pipeline stage whose output it concerns (0 = outside the pipeline). */
interface Failure {
  stage: number;
  message: string;
}

interface Bench {
  expectedP6?: boolean;
  actualP6?: boolean;
  pathwaysChecked?: boolean;
  pathwaysMatch?: boolean;
  vectors?: Record<string, { expected: string; actual: string | undefined }>;
  outputShouldBlock?: boolean;
  outputBlocked?: boolean;
  consentCase?: boolean;
}

interface Outcome {
  status: "PASS" | "FAIL";
  expected: string;
  actual: string;
  failures: Failure[];
  bench: Bench;
}

const fmtVectors = (v: Record<string, string>) => Object.entries(v).map(([k, s]) => `${k} ${s}`).join(", ") || "none";
const fmtPathways = (p: string[]) => (p.length ? p.join(" > ") : "none");
const stageName = (n: number) => (n === 0 ? "Access policy (outside the pipeline)" : `${n} ${STAGES.find((s) => s.stage === n)!.name}`);

function checkEngine(f: Fixture, r: EngineResult): Failure[] {
  const e = f.expected;
  const fails: Failure[] = [];
  const fail = (stage: number, message: string) => fails.push({ stage, message });
  const fired = r.firedRules.map((x) => x.id);
  const byId = Object.fromEntries(r.vectors.map((v) => [v.vector, v]));
  const actualVectors = Object.fromEntries(r.vectors.map((v) => [v.vector, v.state]));

  for (const v of e.dataWithdrawn ?? []) if (!byId[v]?.dataWithdrawn) fail(1, `${v} not marked withdrawn`);
  if (e.emergency !== undefined && r.emergency !== e.emergency) fail(2, `emergency ${r.emergency}`);
  if (e.vectors && JSON.stringify(actualVectors) !== JSON.stringify(e.vectors)) fail(4, `vectors ${fmtVectors(actualVectors)}`);
  for (const [v, d] of Object.entries(e.density ?? {})) if (byId[v]?.density !== d) fail(4, `${v} density ${byId[v]?.density}`);
  for (const [v, keys] of Object.entries(e.reasons ?? {}))
    for (const k of keys) if (!byId[v]?.reasons.some((x) => x.key === k)) fail(4, `${v} missing reason ${k}`);
  for (const [v, keys] of Object.entries(e.gaps ?? {}))
    for (const k of keys) if (!byId[v]?.gaps.some((x) => x.key === k)) fail(4, `${v} missing gap ${k}`);
  for (const [v, ids] of Object.entries(e.vectorRules ?? {}))
    for (const id of ids) if (!byId[v]?.ruleIds.includes(id)) fail(5, `${v} missing rule ${id}`);
  for (const id of e.rulesInclude ?? []) if (!fired.includes(id)) fail(5, `${id} did not fire`);
  for (const id of e.rulesExclude ?? []) if (fired.includes(id)) fail(5, `${id} fired`);
  const partner = r.partnerSteps.map((p) => p.id);
  if (e.partnerSteps && JSON.stringify(partner) !== JSON.stringify(e.partnerSteps)) fail(5, `partner steps ${partner.join(", ") || "none"}`);
  const pathways = r.nextSteps.map((s) => s.pathway);
  if (e.pathways && JSON.stringify(pathways) !== JSON.stringify(e.pathways)) fail(6, `pathways ${fmtPathways(pathways)}`);
  for (const [p, u] of Object.entries(e.urgency ?? {}))
    if (r.nextSteps.find((s) => s.pathway === p)?.urgency !== u) fail(6, `${p} urgency`);
  return fails;
}

function allMessageKeys(r: EngineResult): string[] {
  return [
    ...r.firedRules.map((x) => x.messageKey),
    ...r.nextSteps.flatMap((s) => [`pathway.${s.pathway}`, `urgency.${s.urgency}`, ...s.items.map((i) => i.messageKey)]),
    ...r.vectors.flatMap((v) => [
      `vector.${v.vector}.title`,
      `density.${v.density}`,
      ...v.reasons.map((x) => x.key),
      ...v.gaps.map((x) => x.key),
      ...v.inputsUsed.map((i) => `input.${i}`),
    ]),
    ...r.gaps.map((g) => g.key),
  ];
}

const outcome = (failures: Failure[], expected: string, actual: string, bench: Bench): Outcome => ({
  status: failures.length ? "FAIL" : "PASS",
  expected,
  actual,
  failures: failures.sort((a, b) => a.stage - b.stage),
  bench,
});

async function run(f: Fixture): Promise<Outcome> {
  const e = f.expected;
  switch (f.kind) {
    case "inputCheck": {
      const r = checkInput(f.text!);
      const out = checkOutput(f.text!, {});
      const fails: Failure[] = [];
      if (JSON.stringify(r.redFlags) !== JSON.stringify(e.redFlags)) fails.push({ stage: 2, message: `redFlags ${r.redFlags.join(",") || "none"}` });
      if (JSON.stringify(r.blocked) !== JSON.stringify(e.blocked)) fails.push({ stage: 2, message: `blocked ${r.blocked.join(",") || "none"}` });
      if (e.outputRejected !== undefined && out.ok === e.outputRejected) fails.push({ stage: 8, message: `output check ok=${out.ok}` });
      return outcome(
        fails,
        `blocked ${e.blocked?.join(", ") || "none"}; red flags ${e.redFlags?.join(", ") || "none"}; output check rejects`,
        `blocked ${r.blocked.join(", ") || "none"}; red flags ${r.redFlags.join(", ") || "none"}; output check ${out.ok ? "accepts" : `rejects (${out.violations.join(", ")})`}`,
        { outputShouldBlock: e.outputRejected === true, outputBlocked: !out.ok, expectedP6: false, actualP6: r.redFlags.length > 0 },
      );
    }

    case "access": {
      const results = f.roleSets!.map((roles) => ({ roles, d: canAccessReproductive(roles, f.hasEmrAccess ?? true) }));
      const fails = results.filter((x) => x.d.allowed !== e.allowed).map((x) => ({ stage: 0, message: `${x.roles.join("+")} allowed=${x.d.allowed}` }));
      return outcome(
        fails,
        `${f.roleSets!.map((r) => r.join("+")).join(", ")}: ${e.allowed ? "allowed" : "no access"}`,
        results.map((x) => `${x.roles.join("+")}: ${x.d.allowed ? "allowed" : `no access (${x.d.reason})`}`).join(", "),
        {},
      );
    }

    case "explain": {
      const result = evaluate(expand(f.input!));
      const cfg = f.explain!;
      vi.useFakeTimers();
      try {
        const fetchImpl = () =>
          cfg.mode === "offline"
            ? Promise.reject(new TypeError("Failed to fetch"))
            : new Promise<{ ok: boolean; json(): Promise<unknown> }>((ok) =>
                setTimeout(() => ok({ ok: true, json: async () => ({ text: cfg.text }) }), cfg.delayMs ?? 0),
              );
        const pending = explain(result, f.language, { url: "https://explain.example.test", fetchImpl });
        await vi.advanceTimersByTimeAsync((cfg.delayMs ?? 0) + 100);
        const x = await pending;
        const fails: Failure[] = [];
        if (x.source !== e.source) fails.push({ stage: 7, message: `source ${x.source}` });
        if (x.fallbackReason !== e.fallbackReason) fails.push({ stage: 7, message: `fallback ${x.fallbackReason}` });
        if (x.noteKey !== e.note) fails.push({ stage: 7, message: `note ${x.noteKey}` });
        if (!x.text[f.language].endsWith(f.language === "en" ? "Your doctor decides." : "طبيبك هو من يقرر.")) fails.push({ stage: 7, message: "template text incomplete" });
        return outcome(
          fails,
          `${e.source} wording (${e.fallbackReason}), note "Standard wording shown"`,
          `${x.source} wording (${x.fallbackReason})${x.noteKey ? ', note "Standard wording shown"' : ""}`,
          {},
        );
      } finally {
        vi.useRealTimers();
      }
    }

    case "engine":
    case "catalogue": {
      const partner = f.partner ? { input: expand(f.partner.input), sharedCategories: f.partner.sharedCategories } : undefined;
      const r = evaluate(expand(f.input!), { partner });
      const fails = checkEngine(f, r);
      if (f.kind === "catalogue" || f.language === "ar") {
        const missing = allMessageKeys(r).filter((k) => !(messagesAr as Record<string, string>)[k]);
        if (missing.length) fails.push({ stage: 7, message: `Arabic missing ${missing.join(", ")}` });
      }
      const actualVectors = Object.fromEntries(r.vectors.map((v) => [v.vector, v.state]));
      const pathways = r.nextSteps.map((s) => s.pathway);
      const ruleText = [...(e.rulesInclude ?? []).map((x) => `+${x}`), ...(e.rulesExclude ?? []).map((x) => `−${x}`)].join(" ");
      return outcome(
        fails,
        `${e.emergency ? "EMERGENCY; " : ""}${fmtVectors(e.vectors ?? {})}; pathways ${fmtPathways(e.pathways ?? [])}; rules ${ruleText}`,
        `${r.emergency ? "EMERGENCY; " : ""}${fmtVectors(actualVectors)}; pathways ${fmtPathways(pathways)}; fired ${r.firedRules.map((x) => x.id).join(" ")}`,
        {
          expectedP6: e.emergency === true || (e.pathways ?? []).includes("P6"),
          actualP6: pathways.includes("P6"),
          pathwaysChecked: e.pathways !== undefined,
          pathwaysMatch: JSON.stringify(pathways) === JSON.stringify(e.pathways),
          vectors: Object.fromEntries(Object.entries(e.vectors ?? {}).map(([v, s]) => [v, { expected: s, actual: actualVectors[v] }])),
          consentCase: f.input!.consent !== undefined || f.partner !== undefined,
        },
      );
    }
  }
}

// --- Subgroups ----------------------------------------------------------------------------------
function ageBand(age: number | null | undefined): string {
  if (age === null || age === undefined) return "n/a";
  if (age < 25) return "under 25";
  if (age < 30) return "25–29";
  if (age < 35) return "30–34";
  if (age < 40) return "35–39";
  return "40+";
}

/** Edge cases covered by unit tests outside the 50 fixtures. Each line names where it is tested. */
const EDGE_CASES: [string, string][] = [
  ["One reading: \"Baseline only\", no direction shown", "engine.test.ts, C28"],
  ["Two readings under 6 months apart stay \"Baseline only\"; the same day counts once", "engine.test.ts"],
  ["AMH in pmol/L converted with the single factor; age outside every AMH band", "engine.test.ts"],
  ["AFC without AMH, or no age: not enough data (never estimated)", "engine.test.ts"],
  ["AMH measured on hormonal contraception: confounder note", "C37"],
  ["Cycle lengths worked out from start dates only", "engine.test.ts"],
  ["Cycle records only, nothing else", "C29"],
  ["Sex not recorded: only V3 and V5, and the gap is named", "engine.test.ts"],
  ["Men never see V1/V2; women see V4 only through a linked partner", "engine.test.ts"],
  ["Each consent category withdrawn, including wearable-only data", "engine.test.ts, C31"],
  ["Age and sex cannot be withdrawn; a consent change without a reason is refused", "repository.test.ts"],
  ["Red flags still found with every data category withdrawn; symptom text never stored", "engine.test.ts, repository.test.ts"],
  ["Red flags in Arabic free text", "guardrails.test.ts"],
  ["Partner shares nothing, changes what they share, or withdraws partner sharing", "partner.test.ts"],
  ["A step that fired for both partners is shown once", "engine.test.ts"],
  ["Partner EMR load fails or finds nothing: still audited on both records", "partner.test.ts"],
  ["AI wording: not configured, times out (3.5 s), offline, server error, fails the output check", "C35, C44, services.test.ts"],
  ["AI wording with Arabic-Indic digits; \"%\" allowed only after a number recorded with unit %", "guardrails.test.ts"],
  ["Lab values like \"<0.03\", HbA1c in mmol/mol, and unfinished labs are skipped and listed", "mappers.test.ts"],
  ["BMI calculated only from weight and height on the same reading", "mappers.test.ts"],
  ["Lab results in the older order-list shape", "mappers.test.ts"],
  ["Demo data never mixed with a real patient's EMR data", "mappers.test.ts"],
  ["Loading a demo scenario over real data is refused", "repository.test.ts"],
  ["Browser storage missing, throwing, or from an older version", "repository.test.ts"],
  ["Demo date on a new day, after Advance, after Reset; real patients always at today", "repository.test.ts"],
  ["1,000 synthetic patients regenerated after a reload, keeping advances and changes", "repository.test.ts"],
  ["Population groups under 50 people show no figures; no identifiers in aggregates", "population.test.ts"],
  ["Insurer, employer, HMO or payer role refused even alongside a clinical role", "guardrails.test.ts, C43"],
  ["Public demo page makes no API call; every control has an accessible name", "demoPage.test.tsx"],
  ["Dates that do not exist, are in the future, or use the wrong format", "services.test.ts"],
];

const results: { f: Fixture; o: Outcome }[] = [];

describe("50 JSON test cases", () => {
  it("there are exactly 50", () => expect(fixtures).toHaveLength(50));

  for (const f of fixtures) {
    it(`${f.id} ${f.title}`, async () => {
      const o = await run(f);
      results.push({ f, o });
      expect(o.failures.map((x) => `[stage ${stageName(x.stage)}] ${x.message}`)).toEqual([]);
    });
  }
});

afterAll(() => {
  if ((import.meta as any).env?.MODE !== "report") return;
  results.sort((a, b) => a.f.id.localeCompare(b.f.id));

  const row = (cells: string[]) => `| ${cells.map((c) => c.replace(/\|/g, "\\|")).join(" | ")} |`;
  const header = (...cells: string[]) => [row(cells), row(cells.map(() => "---"))];
  const totals = (key: (f: Fixture) => string) => {
    const groups = new Map<string, { pass: number; fail: number }>();
    for (const { f, o } of results) {
      const g = groups.get(key(f)) ?? { pass: 0, fail: 0 };
      if (o.status === "PASS") g.pass++;
      else g.fail++;
      groups.set(key(f), g);
    }
    return [
      ...header("Group", "Pass", "Fail", "Total"),
      ...Array.from(groups.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([g, t]) => row([g, String(t.pass), String(t.fail), String(t.pass + t.fail)])),
    ].join("\n");
  };
  const count = (s: Outcome["status"]) => results.filter((r) => r.o.status === s).length;
  const b = results.map((r) => r.o.bench);

  // Benchmark summary for the decision-making stages.
  const p6Cases = b.filter((x) => x.expectedP6);
  const p6Caught = p6Cases.filter((x) => x.actualP6).length;
  const falseAlarms = b.filter((x) => x.expectedP6 === false && x.actualP6).length;
  const pathwayCases = b.filter((x) => x.pathwaysChecked);
  const shouldBlock = b.filter((x) => x.outputShouldBlock);
  const consentCases = results.filter((r) => r.o.bench.consentCase);
  const vectorRows = ["V1", "V2", "V3", "V4", "V5"].map((v) => {
    const cases = b.flatMap((x) => (x.vectors?.[v] ? [x.vectors[v]] : []));
    const ok = cases.filter((c) => c.expected === c.actual).length;
    return row([v, String(cases.length), String(ok), String(cases.length - ok)]);
  });

  const md = [
    "# Reproductive Health engine – test report",
    "",
    "Generated by `npm run test:report` from the JSON fixtures in `src/features/reproductive/__tests__/cases/`.",
    "**All cases are synthetic.** Evaluation date for every case: 2026-11-01.",
    "",
    `**Totals:** ${count("PASS")} pass, ${count("FAIL")} fail, ${results.length} cases.`,
    "",
    "## Benchmark summary (decision-making stages)",
    "",
    ...header("Measure", "Result", "Counts"),
    row(["Red-flag detection (stage 2)", `${p6Caught} of ${p6Cases.length} P6 cases caught`, `false alarms: ${falseAlarms}`]),
    row(["Pathway selection (stage 6)", `${pathwayCases.filter((x) => x.pathwaysMatch).length} of ${pathwayCases.length} cases with the exact expected pathways`, ""]),
    row(["Safety Guardrail output check (stage 8)", `${shouldBlock.filter((x) => x.outputBlocked).length} of ${shouldBlock.length} outputs that should be blocked were blocked`, ""]),
    row(["Consent exclusion (stage 1)", `${consentCases.filter((r) => r.o.status === "PASS").length} of ${consentCases.length} consent cases passed`, consentCases.map((r) => r.f.id).join(", ")]),
    "",
    "Vector states (stage 4), expected vs actual:",
    "",
    ...header("Vector", "Cases", "Match", "Mismatch"),
    ...vectorRows,
    "",
    "## Edge cases tested",
    "",
    "Beyond the 50 cases, these edge cases have their own unit tests (file in `src/features/reproductive/__tests__/`):",
    "",
    ...header("Edge case", "Tested in"),
    ...EDGE_CASES.map(([c, where]) => row([c, where])),
    "",
    "## Totals by age band",
    "",
    totals((f) => ageBand(f.input?.age)),
    "",
    "## Totals by sex",
    "",
    totals((f) => f.input?.sex ?? "n/a"),
    "",
    "## Totals by language",
    "",
    totals((f) => f.language),
    "",
    "## Cases",
    "",
    "For a failing case, **Error source** is the first pipeline stage whose output differs from the expected value.",
    "",
    ...header("ID", "Case", "Kind", "Age band", "Sex", "Lang", "Expected", "Actual", "Result", "Error source"),
    ...results.map(({ f, o }) =>
      row([
        f.id,
        f.title,
        f.kind,
        ageBand(f.input?.age),
        f.input?.sex ?? "n/a",
        f.language,
        o.expected,
        o.failures.length ? `${o.actual} — ${o.failures.map((x) => x.message).join("; ")}` : o.actual,
        o.status,
        o.failures.length ? stageName(o.failures[0].stage) : "",
      ]),
    ),
    "",
  ].join("\n");

  mkdirSync(dirname(REPORT_PATH), { recursive: true });
  writeFileSync(REPORT_PATH, md, "utf8");
});
