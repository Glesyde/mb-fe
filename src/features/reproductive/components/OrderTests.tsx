import React, { useState } from "react";
import { FlaskConical } from "lucide-react";
import type { Actor } from "../data/repository";
import type { MappedTrajectory } from "../data/trajectoryMapper";
import type { SuggestedTest } from "../services/orders";
import type { TrajectoryApi } from "../services/trajectory.service";
import { Button, Chip, FieldError, formatTimestamp, Modal } from "./ui";

/**
 * Order suggested tests in the HIS. Nothing is ticked to start with and nothing is ordered until
 * the clinician confirms. Tests already open in the HIS cannot be ordered again from here.
 */
export const OrderTests: React.FC<{
  patientId: string;
  his: MappedTrajectory;
  tests: SuggestedTest[];
  backend: TrajectoryApi;
  actor: Actor;
  onOrdered: (message: string) => void;
  onClose: () => void;
}> = ({ patientId, his, tests, backend, actor, onOrdered, onClose }) => {
  const [ticked, setTicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const toggle = (loinc: string) => setTicked((t) => (t.includes(loinc) ? t.filter((x) => x !== loinc) : [...t, loinc]));
  const chosen = tests.filter((x) => ticked.includes(x.loinc) && !x.alreadyOrdered);

  const confirm = async () => {
    if (his.encounterId === null) return setError("The HIS sent no encounter for this patient, so tests cannot be ordered from here.");
    setBusy(true);
    setError(undefined);
    try {
      await backend.orderDiagnostics(
        patientId,
        his.encounterId,
        actor,
        chosen.map((x) => ({ test_name: x.testName, loinc: x.loinc, source: x.source, reason: x.reason })),
      );
      onOrdered(`${chosen.length} test${chosen.length === 1 ? "" : "s"} ordered in the HIS`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Order tests" onClose={onClose} wide>
      <p className="text-xs text-slate-500 mb-4">
        Suggested from the guideline rules that apply to this patient. Nothing is ordered until you tick a test and confirm. The doctor decides.
      </p>
      {tests.length === 0 ? (
        <p className="text-sm text-slate-600 mb-4">No tests are suggested for this patient right now.</p>
      ) : (
        <fieldset className="space-y-2 mb-4">
          <legend className="sr-only">Suggested tests</legend>
          {tests.map((x) => (
            <label
              key={x.loinc}
              className={`flex gap-3 items-start border border-slate-200 rounded-xl p-3 ${x.alreadyOrdered ? "opacity-60" : "cursor-pointer hover:bg-slate-50"}`}
            >
              <input
                type="checkbox"
                className="h-4 w-4 mt-0.5 accent-brand-primary"
                disabled={x.alreadyOrdered || busy}
                checked={ticked.includes(x.loinc) && !x.alreadyOrdered}
                onChange={() => toggle(x.loinc)}
              />
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-bold text-slate-800">{x.testName}</span>
                  <span className="text-[11px] text-slate-500 font-mono">LOINC {x.loinc}</span>
                  {x.alreadyOrdered && <Chip>Already ordered</Chip>}
                  {x.from === "HIS" && <Chip tone="indigo">Suggested by the HIS</Chip>}
                </span>
                <span className="block text-xs text-slate-700 mt-0.5">{x.reason}</span>
                <span className="block text-[11px] text-slate-500 mt-0.5">
                  {x.source}
                  {x.ruleIds.length > 0 && ` · ${x.ruleIds.join(", ")}`}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
      )}

      {his.pendingOrders.length > 0 && (
        <>
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Open orders in the HIS</h3>
          <ul className="space-y-1 text-xs mb-4">
            {his.pendingOrders.map((o) => (
              <li key={o.id || o.name} className="flex gap-2">
                <span className="font-mono text-slate-500 shrink-0">{o.orderedAt ? formatTimestamp(o.orderedAt.replace(" ", "T")) : "—"}</span>
                <span className="text-slate-700">
                  {o.name || o.code} <span className="text-slate-500">({o.status.toLowerCase().replace(/_/g, " ") || "open"})</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="text-[11px] text-slate-500 mb-3">
        Ordered as {actor.name} (user {actor.id}){his.encounterId !== null ? ` on encounter ${his.encounterId}` : ""}.
      </p>
      <div className="flex gap-2">
        <Button variant="primary" icon={<FlaskConical size={14} />} disabled={busy || chosen.length === 0} onClick={confirm}>
          {chosen.length ? `Order ${chosen.length} test${chosen.length === 1 ? "" : "s"}` : "Order tests"}
        </Button>
        <Button onClick={onClose}>Cancel</Button>
      </div>
      <FieldError message={error} />
    </Modal>
  );
};
