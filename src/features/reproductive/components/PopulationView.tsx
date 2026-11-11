import React, { useEffect, useMemo, useState } from "react";
import { BarChart3, EyeOff, Users } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { NAV_PERMISSION_RULES } from "../../../services/constants";
import type { VectorId } from "../engine/types";
import { demoRepository } from "../data/demoRepository";
import type { ReproRepository } from "../data/repository";
import { canAccessReproductive } from "../guardrails/accessPolicy";
import { t } from "../i18n";
import { MIN_GROUP_SIZE, REFERRAL_WINDOW_DAYS, SPLITS, STATE_BUCKETS, type PopulationAggregates, type PopulationGroup, type Split, type StateBucket } from "../services/population.service";
import { Card, Chip, SectionTitle, SegmentedControl } from "./ui";

const BUCKET_STYLE: Record<StateBucket, { bar: string; label: string }> = {
  NEEDS_ATTENTION: { bar: "bg-amber-400", label: "Needs attention" },
  IMPROVING: { bar: "bg-emerald-500", label: "Improving" },
  STABLE: { bar: "bg-sky-400", label: "Stable / in line with age" },
  NOT_ENOUGH_DATA: { bar: "bg-slate-300", label: "Not enough data" },
  DATA_WITHDRAWN: { bar: "bg-slate-500", label: "Data withdrawn" },
};
const VECTORS: VectorId[] = ["V1", "V2", "V3", "V4", "V5"];

const StateBar: React.FC<{ shown: number; counts: Record<StateBucket, number> }> = ({ shown, counts }) => (
  <div>
    <div className="flex h-3 w-full rounded-full overflow-hidden bg-slate-100" role="img" aria-label={STATE_BUCKETS.map((b) => `${BUCKET_STYLE[b].label} ${counts[b]}`).join(", ") + ` of ${shown}`}>
      {STATE_BUCKETS.map((b) =>
        counts[b] ? <div key={b} className={BUCKET_STYLE[b].bar} style={{ width: `${(counts[b] / shown) * 100}%` }} title={`${BUCKET_STYLE[b].label}: ${counts[b]} of ${shown}`} /> : null,
      )}
    </div>
    <p className="text-[10px] text-slate-500 mt-0.5">
      {counts.NEEDS_ATTENTION} of {shown} need attention
    </p>
  </div>
);

const Suppressed: React.FC<{ n: number }> = ({ n }) => (
  <span className="inline-flex items-center gap-1 text-xs text-slate-500 italic">
    <EyeOff size={12} /> Group too small to show ({n < MIN_GROUP_SIZE ? `under ${MIN_GROUP_SIZE}` : n})
  </span>
);

const fraction = (x?: { count: number; of: number }) => (x ? `${x.count} of ${x.of}` : "—");

/** Population view: groups only, never individual rows, no export. Groups under 50 people are hidden. */
export const PopulationView: React.FC<{ repo: ReproRepository; synthetic: boolean }> = ({ repo, synthetic }) => {
  const [split, setSplit] = useState<Split>("overall");
  const [data, setData] = useState<PopulationAggregates | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setData(null);
    repo
      .getPopulationAggregates(split)
      .then((d) => live && setData(d))
      .catch((e) => live && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      live = false;
    };
  }, [repo, split]);

  const groups = data?.groups ?? [];
  const shownGroups = useMemo(() => groups.filter((g) => !g.suppressed), [groups]);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <Card className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <BarChart3 size={20} className="text-brand-primary" /> Reproductive Insights
          </h3>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {synthetic && <Chip tone="brand">Synthetic population{data ? ` (${data.populationSize})` : ""}</Chip>}
            {data && <Chip>As of {data.asOf}</Chip>}
            <Chip tone="indigo">Groups under {MIN_GROUP_SIZE} people hidden</Chip>
            <Chip>No individual rows · no export</Chip>
          </div>
        </div>
        <SegmentedControl label="Split by" value={split} onChange={setSplit} options={SPLITS.map((s) => ({ id: s.id, label: s.label }))} />
      </Card>

      {error && <Card className="p-4 text-sm text-red-700">Could not load the population view: {error}</Card>}
      {!data && !error && (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" aria-label="Loading" />
        </div>
      )}

      {data && (
        <>
          <Card className="p-4 overflow-x-auto">
            <SectionTitle icon={<Users size={16} className="text-brand-primary" />}>Trajectory states</SectionTitle>
            <table className="w-full text-xs min-w-[760px]">
              <thead>
                <tr className="text-[10px] font-black text-slate-500 uppercase tracking-wider text-left">
                  <th className="py-2 pr-3">Group</th>
                  <th className="py-2 pr-3">People</th>
                  {VECTORS.map((v) => (
                    <th key={v} className="py-2 pr-3">
                      {v} {t("en", `vector.${v}.title`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {groups.map((g) => (
                  <tr key={g.key} className="align-top">
                    <td className="py-2.5 pr-3 font-bold text-slate-800">{g.key}</td>
                    <td className="py-2.5 pr-3 text-slate-600">{g.suppressed ? "—" : g.n}</td>
                    {g.suppressed ? (
                      <td colSpan={VECTORS.length} className="py-2.5">
                        <Suppressed n={g.n} />
                      </td>
                    ) : (
                      VECTORS.map((v) => (
                        <td key={v} className="py-2.5 pr-3 w-[16%]">
                          {g.vectorStates![v].shown ? <StateBar {...g.vectorStates![v]} /> : <span className="text-slate-500">Not shown</span>}
                        </td>
                      ))
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex flex-wrap gap-3 mt-3 text-[11px] text-slate-600">
              {STATE_BUCKETS.map((b) => (
                <span key={b} className="inline-flex items-center gap-1.5">
                  <span className={`h-2.5 w-2.5 rounded-sm ${BUCKET_STYLE[b].bar}`} aria-hidden /> {BUCKET_STYLE[b].label}
                </span>
              ))}
            </div>
          </Card>

          <Card className="p-4 overflow-x-auto">
            <SectionTitle>Care measures</SectionTitle>
            <table className="w-full text-xs min-w-[760px]">
              <thead>
                <tr className="text-[10px] font-black text-slate-500 uppercase tracking-wider text-left">
                  <th className="py-2 pr-3">Group</th>
                  <th className="py-2 pr-3">Care gaps</th>
                  <th className="py-2 pr-3">Male engagement</th>
                  <th className="py-2 pr-3">Median days to counselling</th>
                  <th className="py-2 pr-3">Referrals completed within {REFERRAL_WINDOW_DAYS} days</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {groups.map((g: PopulationGroup) => (
                  <tr key={g.key}>
                    <td className="py-2.5 pr-3 font-bold text-slate-800">{g.key}</td>
                    {g.suppressed ? (
                      <td colSpan={4} className="py-2.5">
                        <Suppressed n={g.n} />
                      </td>
                    ) : (
                      <>
                        <td className="py-2.5 pr-3 text-slate-700">{fraction(g.careGaps)} needing attention</td>
                        <td className="py-2.5 pr-3 text-slate-700">{g.maleEngagement!.of ? `${fraction(g.maleEngagement)} men` : "No men in group"}</td>
                        <td className="py-2.5 pr-3 text-slate-700">
                          {g.daysToCounselling!.median === null ? "No counselling yet" : `${g.daysToCounselling!.median} days (${g.daysToCounselling!.people} people)`}
                        </td>
                        <td className="py-2.5 pr-3 text-slate-700">
                          {g.referralCompletion!.eligible ? `${g.referralCompletion!.completed} of ${g.referralCompletion!.eligible}` : "No referrals old enough"}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {shownGroups.length === 0 && <p className="text-xs text-slate-500 mt-2">Every group in this split is under {MIN_GROUP_SIZE} people.</p>}
          </Card>

          <Card className="p-4 text-[11px] text-slate-600 space-y-1">
            <p className="font-bold text-slate-700">Definitions</p>
            <p><strong>Care gaps:</strong> people with at least one card needing attention and no counselling recorded.</p>
            <p><strong>Male engagement:</strong> men with at least one semen analysis recorded.</p>
            <p><strong>Days to counselling:</strong> from the first date a card needed attention to the first counselling on or after it.</p>
            <p>
              <strong>Referral completion:</strong> referrals created at least {REFERRAL_WINDOW_DAYS} days ago that were completed within {REFERRAL_WINDOW_DAYS} days.
            </p>
            <p>Each person's own consent is applied before counting. {synthetic ? "Synthetic data only; the proportions are illustrative, not epidemiological." : ""}</p>
          </Card>
        </>
      )}
    </div>
  );
};

/** /emr/reproductive-population. Insurer, employer and payer roles are refused. */
const ReproductivePopulationPage: React.FC = () => {
  const { roles, hasAnyPermission } = useAuth();
  if (!canAccessReproductive(roles, hasAnyPermission(NAV_PERMISSION_RULES.emr)).allowed) {
    return <Card className="p-6 text-sm text-slate-600">Reproductive health data is not available for this account.</Card>;
  }
  return <PopulationView repo={demoRepository} synthetic />;
};

export default ReproductivePopulationPage;
