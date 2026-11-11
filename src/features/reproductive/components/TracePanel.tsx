import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, Download, Play, Route, Siren } from "lucide-react";
import type { TraceEntry } from "../engine/trace";
import { Button, Card, Chip, downloadBlob } from "./ui";

const DOT = { done: "bg-emerald-500", stopped: "bg-red-600", skipped: "bg-slate-300" } as const;

/**
 * "How this result was reached": the stage chain, a branch to the emergency panel when a red flag
 * stops the run, and the trace entries. Replay and the run-record download are demo-only.
 */
export const TracePanel: React.FC<{
  trace: TraceEntry[];
  rulesFired: number;
  elapsedMs: number;
  explanationSource: "TEMPLATE" | "AI";
  demo: boolean;
  runRecord: () => unknown;
}> = ({ trace, rulesFired, elapsedMs, explanationSource, demo, runRecord }) => {
  const [open, setOpen] = useState(false);
  const [showEntries, setShowEntries] = useState(false);
  const [replayAt, setReplayAt] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const completed = trace.filter((t) => t.status !== "skipped").length;
  const stoppedAt = trace.find((t) => t.status === "stopped");

  useEffect(() => () => void (timer.current && clearInterval(timer.current)), []);

  const replay = () => {
    if (timer.current) clearInterval(timer.current);
    setReplayAt(0);
    timer.current = setInterval(() => {
      setReplayAt((i) => {
        if (i === null || i >= trace.length - 1) {
          if (timer.current) clearInterval(timer.current);
          return null;
        }
        return i + 1;
      });
    }, 400);
  };

  const download = () => downloadBlob(new Blob([JSON.stringify(runRecord(), null, 2)], { type: "application/json" }), "repro-run-record.json");

  return (
    <Card className="p-4">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded-lg"
      >
        <span className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <Route size={16} className="text-brand-primary" /> How this result was reached
        </span>
        <span className="flex flex-wrap items-center gap-1.5 justify-end">
          <Chip tone={stoppedAt ? "red" : "emerald"}>
            {completed}/{trace.length} stages
          </Chip>
          <Chip>{rulesFired} rules fired</Chip>
          <Chip>{elapsedMs} ms</Chip>
          <Chip tone="indigo">{explanationSource === "AI" ? "AI wording, checked" : "Standard wording"}</Chip>
          <ChevronDown size={16} className={`text-slate-500 transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          <ol className="relative flex items-stretch gap-1 overflow-x-auto pb-2" aria-label="Stages">
            {trace.map((t, i) => (
              <li key={t.id} className="flex items-center gap-1 shrink-0">
                <div
                  className={`w-[118px] rounded-xl border p-2 text-[10px] leading-tight transition-all ${
                    replayAt === i ? "border-brand-primary ring-2 ring-brand-primary/40 bg-orange-50" : t.status === "skipped" ? "border-slate-200 bg-slate-50 text-slate-500" : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`h-2 w-2 rounded-full ${DOT[t.status]}`} aria-hidden />
                    <span className="font-black text-slate-500">{t.stage}</span>
                    <span className="sr-only">{t.status}</span>
                  </div>
                  <p className="font-bold text-slate-700">{t.name}</p>
                </div>
                {i < trace.length - 1 && <span className="text-slate-300" aria-hidden>→</span>}
              </li>
            ))}
          </ol>
          {stoppedAt && (
            <div className="flex items-center gap-2 ml-[124px] text-xs font-bold text-red-700">
              <span aria-hidden>↳</span>
              <span className="inline-flex items-center gap-1.5 border-2 border-red-600 bg-red-50 rounded-xl px-3 py-1.5">
                <Siren size={14} /> Emergency panel (after stage {stoppedAt.stage}: {stoppedAt.ruleIds.join(", ")})
              </span>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setShowEntries((s) => !s)} aria-expanded={showEntries}>
              {showEntries ? "Hide" : "Show"} trace entries
            </Button>
            {demo && (
              <Button icon={<Play size={14} />} onClick={replay}>
                Replay
              </Button>
            )}
            <Button icon={<Download size={14} />} onClick={download} disabled={!demo} title={demo ? undefined : "Available for synthetic demo cases only"}>
              Download run record (JSON)
            </Button>
          </div>

          {showEntries && (
            <ul className="divide-y divide-slate-100 border border-slate-100 rounded-xl">
              {trace.map((t) => (
                <li key={t.id} className="p-3 text-xs grid md:grid-cols-[180px_1fr] gap-x-4 gap-y-1">
                  <div>
                    <p className="font-black text-slate-800 flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${DOT[t.status]}`} aria-hidden />
                      {t.stage}. {t.name}
                    </p>
                    <p className="text-slate-500">
                      {t.status} · {t.durationMs} ms
                    </p>
                  </div>
                  <dl className="grid grid-cols-[72px_1fr] gap-x-2 gap-y-0.5 text-slate-600">
                    <dt className="font-bold text-slate-500">What</dt>
                    <dd>{t.description}</dd>
                    <dt className="font-bold text-slate-500">Input</dt>
                    <dd>{t.input}</dd>
                    <dt className="font-bold text-slate-500">Output</dt>
                    <dd>{t.output}</dd>
                    <dt className="font-bold text-slate-500">Decision</dt>
                    <dd className="font-semibold text-slate-700">{t.decision}</dd>
                    {t.ruleIds.length > 0 && (
                      <>
                        <dt className="font-bold text-slate-500">Rules</dt>
                        <dd>{t.ruleIds.join(", ")}</dd>
                      </>
                    )}
                  </dl>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
};
