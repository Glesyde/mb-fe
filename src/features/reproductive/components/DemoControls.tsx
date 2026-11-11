import React, { useState } from "react";
import { FastForward, FlaskConical, RotateCcw } from "lucide-react";
import { SCENARIOS } from "../data/synthetic/scenarios";
import { Button, Chip, inputClass } from "./ui";

/** Demo mode only: scenario picker, reset, advance 6 months, and a permanent synthetic-data badge. */
export const DemoControls: React.FC<{
  scenarioId?: string;
  asOf: string;
  today: string;
  onLoad: (scenarioId: string) => Promise<void>;
  onReset: () => Promise<void>;
  onAdvance: () => Promise<void>;
  /** The public demo page picks scenarios itself and hides the picker here. */
  showPicker?: boolean;
}> = ({ scenarioId, asOf, today, onLoad, onReset, onAdvance, showPicker = true }) => {
  const [busy, setBusy] = useState(false);
  const run = (fn: () => Promise<void>) => async () => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-2 bg-orange-50 border border-orange-200 rounded-2xl px-3 py-2">
      <Chip tone="brand">
        <FlaskConical size={12} /> Demo – synthetic data
      </Chip>
      {asOf > today && (
        <Chip tone="amber" title="Moved forward with Advance 6 months; Reset demo data returns to today">
          Demo date {asOf}
        </Chip>
      )}
      {showPicker && (
        <>
          <label htmlFor="demo-scenario" className="sr-only">
            Demo scenario
          </label>
          <select id="demo-scenario" className={`${inputClass} !w-auto max-w-full !py-1.5 text-xs`} value={scenarioId ?? ""} disabled={busy} onChange={(e) => e.target.value && run(() => onLoad(e.target.value))()}>
            <option value="">Choose a scenario…</option>
            {SCENARIOS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.sex === "female" ? "woman" : "man"}, {s.age})
              </option>
            ))}
          </select>
        </>
      )}
      <Button icon={<FastForward size={14} />} disabled={busy} onClick={run(onAdvance)}>
        Advance 6 months
      </Button>
      <Button icon={<RotateCcw size={14} />} disabled={busy} onClick={run(onReset)}>
        Reset demo data
      </Button>
    </div>
  );
};
