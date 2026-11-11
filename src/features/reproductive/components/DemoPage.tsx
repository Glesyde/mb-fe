import React, { useState } from "react";
import { BarChart3, FlaskConical, HeartPulse } from "lucide-react";
import { demoRepository } from "../data/demoRepository";
import type { Actor } from "../data/repository";
import { SCENARIOS } from "../data/synthetic/scenarios";
import { PopulationView } from "./PopulationView";
import { ReproductiveView } from "./ReproductiveTab";
import { Chip, SegmentedControl } from "./ui";

const VISITOR: Actor = { id: "demo-visitor", name: "Demo visitor" };

/**
 * /repro-demo: the same Reproductive Health view and population view on synthetic data only,
 * with no login and no API calls. Rendered outside AuthProvider (see App.tsx).
 */
const DemoPage: React.FC = () => {
  const [view, setView] = useState<"patient" | "population">("patient");
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id);

  return (
    <div className="h-screen overflow-y-auto bg-slate-50">
      <header className="bg-brand-dark text-white">
        <div className="max-w-[1280px] mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-black flex items-center gap-2">
              <HeartPulse size={22} className="text-brand-primary" /> Reproductive Health – public demo
            </h1>
            <p className="text-xs text-white/70 mt-0.5">Decision support and education only. No login, synthetic data only, nothing is sent to a server.</p>
          </div>
          <div className="flex items-center gap-2">
            <Chip tone="brand">
              <FlaskConical size={12} /> Demo – synthetic data
            </Chip>
            <SegmentedControl
              dark
              label="View"
              value={view}
              onChange={setView}
              options={[
                { id: "patient", label: <><HeartPulse size={14} /> Patient</> },
                { id: "population", label: <><BarChart3 size={14} /> Population</> },
              ]}
            />
          </div>
        </div>
      </header>

      <main className="max-w-[1280px] mx-auto px-4 py-5 space-y-4">
        {view === "patient" ? (
          <>
            <nav aria-label="Demo scenarios" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {SCENARIOS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={scenarioId === s.id}
                  onClick={() => setScenarioId(s.id)}
                  className={`text-left rounded-xl border p-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
                    scenarioId === s.id ? "border-brand-primary bg-orange-50" : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <p className="text-xs font-black text-slate-800">{s.name}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{s.description}</p>
                </button>
              ))}
            </nav>
            <ReproductiveView key={scenarioId} repo={demoRepository} patientId={scenarioId} actor={VISITOR} publicDemo />
          </>
        ) : (
          <PopulationView repo={demoRepository} synthetic />
        )}
      </main>
    </div>
  );
};

export default DemoPage;
