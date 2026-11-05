import React, { useState, useEffect } from "react";
import {
  FlaskConical,
  Pill,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Filter,
  ChevronRight,
  ClipboardCheck,
  Loader,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import apiClient from "../api/client";


const GrowthBadge = ({ value }: { value: string }) => {
  const isNeg = value.includes("-");
  return (
    <span className={`text-xs font-black px-2 py-1 rounded ${isNeg ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}>
      {isNeg ? <TrendingDown size={12} className="inline mr-1" /> : <TrendingUp size={12} className="inline mr-1" />}
      {value}
    </span>
  );
};

const UsageReports: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const resp = await apiClient.get("/dashboard-summary");
        setData(resp.data?.data?.activity_snapshot || null);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const lab = data?.department_growth?.lab || {};
  const pharmacy = data?.department_growth?.pharmacy || {};

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      {/* Top Demand Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-indigo-600 rounded-[40px] p-8 text-white flex items-center justify-between shadow-xl shadow-indigo-100">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-white/10 rounded-3xl backdrop-blur-md">
              <FlaskConical size={32} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200 mb-1">
                Lab Investigations
              </p>
              {loading ? (
                <Loader size={24} className="animate-spin text-white/60" />
              ) : (
                <>
                  <h3 className="text-3xl font-black">{lab.total ?? 0}</h3>
                  <p className="text-xs font-bold text-indigo-100/70 mt-1 flex items-center gap-1">
                    <TrendingUp size={12} /> Growth: {lab.growth || "+0%"}
                  </p>
                </>
              )}
            </div>
          </div>
          <ChevronRight className="text-indigo-300" size={24} />
        </div>

        <div className="bg-teal-600 rounded-[40px] p-8 text-white flex items-center justify-between shadow-xl shadow-teal-100">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-white/10 rounded-3xl backdrop-blur-md">
              <Pill size={32} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-200 mb-1">
                Pharmacy Units
              </p>
              {loading ? (
                <Loader size={24} className="animate-spin text-white/60" />
              ) : (
                <>
                  <h3 className="text-3xl font-black">{pharmacy.total_units ?? 0}</h3>
                  <p className="text-xs font-bold text-teal-100/70 mt-1 flex items-center gap-1">
                    <TrendingUp size={12} /> Growth: {pharmacy.growth || "+0%"}
                  </p>
                </>
              )}
            </div>
          </div>
          <ChevronRight className="text-teal-300" size={24} />
        </div>
      </div>

      {/* Monthly breakdown */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm">
            <h3 className="text-base font-black text-slate-800 flex items-center gap-2 mb-6">
              <FlaskConical size={18} className="text-indigo-600" /> Lab Monthly Breakdown
            </h3>
            <div className="space-y-4">
              {[
                { label: "Total (All Time)", value: lab.total ?? 0 },
                { label: "This Month", value: lab.this_month ?? 0 },
                { label: "Last Month", value: lab.last_month ?? 0 },
              ].map(r => (
                <div key={r.label} className="flex items-center justify-between border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{r.label}</span>
                  <span className="text-lg font-black text-slate-800">{r.value}</span>
                </div>
              ))}
              <div className="pt-2">
                <GrowthBadge value={lab.growth || "+0%"} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm">
            <h3 className="text-base font-black text-slate-800 flex items-center gap-2 mb-6">
              <Pill size={18} className="text-teal-600" /> Pharmacy Monthly Breakdown
            </h3>
            <div className="space-y-4">
              {[
                { label: "Total Units (All Time)", value: pharmacy.total_units ?? 0 },
                { label: "This Month", value: pharmacy.this_month ?? 0 },
                { label: "Last Month", value: pharmacy.last_month ?? 0 },
              ].map(r => (
                <div key={r.label} className="flex items-center justify-between border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{r.label}</span>
                  <span className="text-lg font-black text-slate-800">{r.value}</span>
                </div>
              ))}
              <div className="pt-2">
                <GrowthBadge value={pharmacy.growth || "+0%"} />
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Strategic Insight */}
      <div className="bg-slate-900 rounded-[44px] p-10 text-white relative overflow-hidden group shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="max-w-2xl">
            <h4 className="text-2xl font-black tracking-tight mb-4">
              Demand Planning Insight
            </h4>
            <p className="text-slate-400 text-sm leading-relaxed font-medium">
              Monitor lab and pharmacy demand trends above to plan reagent and drug stock adequately. Use the growth rate indicators to identify departments with increasing or declining throughput.
            </p>
          </div>
          <div className="p-8 bg-white/5 rounded-[40px] border border-white/10 flex items-center justify-center backdrop-blur-sm">
            <ClipboardCheck size={64} className="text-indigo-400 animate-pulse" />
          </div>
        </div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700" />
      </div>
    </div>
  );
};

export default UsageReports;
