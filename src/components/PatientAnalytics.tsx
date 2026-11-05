import React, { useState, useEffect } from "react";
import {
  Users,
  UserCheck,
  Clock,
  Activity,
  PieChart as PieChartIcon,
  BarChart3,
  Filter,
  TrendingUp,
  ChevronRight,
  Loader,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from "recharts";
import apiClient from "../api/client";

const PatientAnalytics: React.FC = () => {
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

  const visits = data?.visits || {};
  const segments = data?.patient_segments || {};
  const clinicDist = data?.clinic_distribution || {};
  const growth = data?.growth_forecast || {};

  // Build pie data from API
  const DEMOGRAPHIC_DATA = [
    { name: "HMO Patients", value: segments.hmo || 0, color: "#4f46e5" },
    { name: "Private / Self", value: segments.private || 0, color: "#10b981" },
  ];

  // Build bar chart data from clinic distribution
  const DEPT_PERFORMANCE = Object.entries(clinicDist).map(([name, count]) => ({
    name,
    visits: count as number,
  }));

  return (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Total Visits Today
          </p>
          {loading ? (
            <Loader size={28} className="animate-spin text-indigo-400 mt-4" />
          ) : (
            <p className="text-4xl font-black text-slate-800 mt-2">
              {visits.total_today ?? 0}
            </p>
          )}
          <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-indigo-600">
            <TrendingUp size={14} /> {growth.expected_growth || "+0%"} projected
            growth
          </div>
        </div>

        <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            New vs Returning
          </p>
          {loading ? (
            <Loader size={28} className="animate-spin text-emerald-400 mt-4" />
          ) : (
            <div className="flex items-center gap-6 mt-2">
              <div>
                <p className="text-3xl font-black text-emerald-600">
                  {visits.new ?? 0}
                </p>
                <p className="text-[8px] font-bold text-slate-400 uppercase">
                  New
                </p>
              </div>
              <div className="h-8 w-px bg-slate-100" />
              <div>
                <p className="text-3xl font-black text-indigo-600">
                  {visits.returning ?? 0}
                </p>
                <p className="text-[8px] font-bold text-slate-400 uppercase">
                  Returning
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Avg Wait Time
          </p>
          {loading ? (
            <Loader size={28} className="animate-spin text-amber-400 mt-4" />
          ) : (
            <p className="text-4xl font-black text-amber-600 mt-2">
              {visits.avg_wait_time_minutes ?? 0}m
            </p>
          )}
          <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-emerald-500">
            <Activity size={14} /> Optimized Flow
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Visits per Clinic Chart */}
        <div className="bg-white p-10 rounded-[44px] border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                <BarChart3 size={24} className="text-indigo-600" /> Clinic
                Distribution
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Today's visits per clinical unit.
              </p>
            </div>
            <button className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-white hover:text-indigo-600 border border-transparent hover:border-slate-100 transition-all">
              <Filter size={18} />
            </button>
          </div>
          {loading ? (
            <div className="h-[350px] flex items-center justify-center">
              <Loader size={32} className="animate-spin text-indigo-400" />
            </div>
          ) : DEPT_PERFORMANCE.length > 0 ? (
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={DEPT_PERFORMANCE}
                  layout="vertical"
                  margin={{ left: -20 }}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 11, fontWeight: 700 }}
                    width={100}
                  />
                  <Tooltip
                    cursor={{ fill: "#f8fafc" }}
                    contentStyle={{
                      borderRadius: "16px",
                      border: "none",
                      boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Bar
                    dataKey="visits"
                    fill="#6366f1"
                    radius={[0, 12, 12, 0]}
                    barSize={24}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[350px] flex flex-col items-center justify-center text-slate-300">
              <BarChart3 size={48} className="opacity-30 mb-3" />
              <p className="text-xs font-bold uppercase tracking-widest">
                No clinic data yet today
              </p>
            </div>
          )}
        </div>

        {/* Patient Segments Pie Chart */}
        <div className="bg-white p-10 rounded-[44px] border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-xl font-black text-slate-800 tracking-tight mb-8 flex items-center gap-3">
            <PieChartIcon size={24} className="text-indigo-600" /> Patient
            Segments
          </h3>
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader size={32} className="animate-spin text-indigo-400" />
            </div>
          ) : (
            <div className="h-[280px] w-full flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={DEMOGRAPHIC_DATA}
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={10}
                    dataKey="value"
                  >
                    {DEMOGRAPHIC_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: "16px", border: "none" }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="mt-8 pt-8 border-t border-slate-50 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Growth Forecast
              </span>
              <span className="text-[10px] font-black text-emerald-600 uppercase">
                {growth.expected_growth || "+0%"} expected
              </span>
            </div>
            <button className="w-full py-4 bg-slate-50 hover:bg-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 transition-all flex items-center justify-center gap-2">
              Full Demographic Breakdown <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientAnalytics;
