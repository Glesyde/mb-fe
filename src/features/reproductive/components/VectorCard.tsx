import React from "react";
import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { HelpCircle } from "lucide-react";
import { BMI, CYCLE, HBA1C, SEMEN_REFERENCE } from "../engine/config";
import type { Language, SeriesPoint, VectorResult } from "../engine/types";
import { AR_TEXT_ATTRS, stateLabel, t, tm } from "../i18n";
import { formatMonth, yDomain, yTicks, type Band } from "./chartScale";
import { Button, Card, Chip, GlossaryText, STATE_TONE } from "./ui";

const SERIES_LABEL: Record<string, string> = {
  AMH: "AMH (ng/mL)",
  AFC: "AFC",
  CYCLE_LENGTH: "Cycle length (days)",
  HBA1C: "HbA1c (%)",
  BMI: "BMI (kg/m²)",
  FASTING_GLUCOSE: "Fasting glucose",
  SPERM_CONCENTRATION: "Sperm concentration (10⁶/mL)",
  PROGRESSIVE_MOTILITY: "Progressive motility (%)",
  TOTAL_MOTILITY: "Total motility (%)",
  SEMEN_VOLUME: "Semen volume (mL)",
};

/** The series a card plots, and its shaded reference band (from config, never hard-coded here). */
function chartFor(v: VectorResult): { key: string; points: SeriesPoint[]; band: Band | null } | null {
  const pick = (key: string) => v.series.find((s) => s.key === key);
  const s =
    v.vector === "V3" ? pick("HBA1C") ?? pick("BMI") ?? v.series[0] : v.vector === "V4" ? pick("SPERM_CONCENTRATION") ?? v.series[0] : v.series[0];
  if (!s || !s.points.length) return null;
  let band: Band | null = null;
  if (s.key === "AMH" && v.referenceBand) band = { low: v.referenceBand.low, high: v.referenceBand.high };
  if (s.key === "CYCLE_LENGTH") band = { low: CYCLE.minDays, high: CYCLE.maxDays };
  if (s.key === "HBA1C") band = { high: HBA1C.prediabetesMin };
  if (s.key === "BMI") band = { low: BMI.low, high: BMI.high };
  if (s.key === "SPERM_CONCENTRATION") band = { low: SEMEN_REFERENCE.SPERM_CONCENTRATION.lowerLimit };
  return { key: s.key, points: s.points, band };
}

const MiniChart: React.FC<{ v: VectorResult; lang: Language }> = ({ v, lang }) => {
  const chart = chartFor(v);
  if (!chart) return <div className="h-[92px] flex items-center justify-center text-[11px] text-slate-500 italic">{t(lang, "card.noReadings")}</div>;
  // One reading: a dashed baseline marker. Several readings less than 6 months apart: points, no line (no direction).
  const single = chart.points.length === 1;
  const noDirection = v.density === "BASELINE_ONLY";
  const domain = yDomain(
    chart.points.map((p) => p.value),
    chart.band,
  );
  const data = chart.points.map((p) => ({ date: p.date, value: p.value, calculated: p.derivation === "calculated" }));
  return (
    <div className="h-[92px]" dir="ltr" aria-label={`${SERIES_LABEL[chart.key] ?? chart.key}: ${data.map((d) => `${d.value} on ${d.date}`).join(", ")}`} role="img">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#94a3b8" }} tickFormatter={(d: string) => formatMonth(d, lang)} interval="preserveStartEnd" />
          <YAxis
            type="number"
            domain={domain}
            ticks={yTicks(domain)}
            allowDataOverflow
            tick={{ fontSize: 9, fill: "#94a3b8" }}
            width={44}
            tickFormatter={(n: number) => String(Math.round(n * 10) / 10)}
          />
          {chart.band && (
            <ReferenceArea y1={chart.band.low ?? domain[0]} y2={chart.band.high ?? domain[1]} fill="#0ea5e9" fillOpacity={0.08} stroke="none" />
          )}
          {single && <ReferenceLine y={data[0].value} stroke="#64748b" strokeDasharray="4 3" />}
          <Tooltip
            contentStyle={{ fontSize: 11, borderRadius: 8 }}
            labelFormatter={(d: unknown) => (typeof d === "string" ? formatMonth(d, lang) : String(d))}
            formatter={(value: unknown, _n: unknown, item: any) => [`${value}${item?.payload?.calculated ? " (calculated)" : ""}`, SERIES_LABEL[chart.key] ?? chart.key]}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={noDirection ? "transparent" : "#F28C0F"}
            strokeWidth={2}
            dot={{ r: 3.5, fill: "#F28C0F", stroke: "#fff", strokeWidth: 1 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export const VectorCard: React.FC<{ v: VectorResult; lang: Language; onWhy: () => void }> = ({ v, lang, onWhy }) => {
  const withdrawnEmpty = v.dataWithdrawn && v.state === "NOT_ENOUGH_DATA";
  const chart = chartFor(v);
  return (
    <Card className="p-4 flex flex-col gap-2" {...(lang === "ar" ? AR_TEXT_ATTRS : {})}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{v.vector}</p>
          <h4 className="text-sm font-black text-slate-800 leading-tight">
            <GlossaryText text={t(lang, `vector.${v.vector}.title`)} lang={lang} />
          </h4>
        </div>
        <Chip tone={withdrawnEmpty ? "slate" : STATE_TONE[v.state]}>{stateLabel(v, lang)}</Chip>
      </div>

      <div className="flex flex-wrap gap-1">
        <Chip tone="indigo" title="Data density">{t(lang, `density.${v.density}`)}</Chip>
        {v.fromPartner && <Chip tone="brand">{t(lang, "card.partnerData")}</Chip>}
        {v.dataWithdrawn && !withdrawnEmpty && <Chip>{t(lang, "card.someWithdrawn")}</Chip>}
        {v.series.some((s) => s.points.some((p) => p.derivation === "calculated")) && <Chip>{t(lang, "card.bmiCalculated")}</Chip>}
      </div>

      {withdrawnEmpty ? (
        <div className="h-[92px] flex items-center justify-center text-xs font-bold text-slate-500 bg-slate-50 rounded-xl">{t(lang, "state.DATA_WITHDRAWN")}</div>
      ) : v.vector === "V5" ? (
        !v.reasons.some((r) => r.key.startsWith("history.")) ? null : <ul className="min-h-[60px] text-xs text-slate-700 space-y-1 bg-slate-50 rounded-xl p-3">
          {v.reasons.filter((r) => r.key.startsWith("history.")).map((r) => (
            <li key={r.key}>• <GlossaryText text={tm(lang, r)} lang={lang} /></li>
          ))}
        </ul>
      ) : (
        <>
          <MiniChart v={v} lang={lang} />
          {chart && (
            <p className="text-[10px] text-slate-500 -mt-1">
              {SERIES_LABEL[chart.key] ?? chart.key}
              {chart.band ? ` · ${t(lang, "card.shaded")}` : ""}
              {v.density === "BASELINE_ONLY" ? ` · ${t(lang, chart.points.length === 1 ? "card.dashed" : "card.underSixMonths")}` : ""}
            </p>
          )}
        </>
      )}

      {v.reasons[0] && (
        <p className="text-xs text-slate-600 leading-snug">
          <GlossaryText text={tm(lang, v.reasons[0])} lang={lang} />
        </p>
      )}
      {v.gaps.length > 0 && (
        <p className="text-[11px] text-slate-500 italic">
          {v.gaps.map((g) => tm(lang, g)).join(" ")}
        </p>
      )}

      <div className="mt-auto pt-1">
        <Button variant="ghost" icon={<HelpCircle size={14} />} onClick={onWhy} className="!px-2 !py-1" aria-label={`${t(lang, "patient.why")} ${t(lang, `vector.${v.vector}.title`)}`}>
          {t(lang, "patient.why")}
        </Button>
      </div>
    </Card>
  );
};
