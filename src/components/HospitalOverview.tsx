import React, { useState, useEffect } from "react";
import {
  Users,
  Bed,
  Clock,
  TrendingUp,
  AlertCircle,
  CalendarCheck,
  ClipboardList,
  Loader,
  Activity,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import apiClient from "../api/client";



const StatCard = ({ icon: Icon, label, value, sub, color }: any) => (
  <div className="bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm hover:shadow-md transition-all">
    <div className="flex items-center gap-4 mb-4">
      <div className={`p-3 rounded-xl bg-${color}-50 text-${color}-600`}>
        <Icon size={22} />
      </div>
      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{label}</p>
    </div>
    <p className="text-3xl font-black text-slate-800">{value}</p>
    {sub && <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">{sub}</p>}
  </div>
);

const HospitalOverview: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const resp = await apiClient.get("/dashboard-summary");
        setData(resp.data?.data?.activity_snapshot || null);
      } catch (e) {
        setError("Failed to load overview data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <Loader className="animate-spin text-brand-primary" size={40} />
          <p className="text-slate-500 text-sm font-semibold">Loading overview...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4 bg-red-50 p-8 rounded-2xl border border-red-200">
          <AlertCircle className="text-red-600" size={40} />
          <p className="text-red-600 font-semibold text-center">{error || "No data available."}</p>
        </div>
      </div>
    );
  }

  const ha = data.hospital_activity || {};
  const visits = data.visits || {};

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <Activity size={24} className="text-brand-primary" />
            Hospital Overview
          </h1>
          <p className="text-slate-500 text-sm mt-1">Real-time facility status and inflow analytics.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600 bg-white border border-slate-200 px-4 py-2 rounded-xl">
          <Clock size={16} />
          Last updated: {new Date().toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Users}
          label="Total Admissions"
          value={ha.total_admissions ?? "—"}
          color="blue"
        />
        <StatCard
          icon={Bed}
          label="Bed Occupancy"
          value={ha.occupancy_rate ?? "—"}
          sub={`${ha.occupied_beds ?? 0} of ${ha.total_beds ?? 0} beds occupied`}
          color="teal"
        />
        <StatCard
          icon={AlertCircle}
          label="ED Waiting"
          value={ha.er_waiting ?? "—"}
          sub="Patients in emergency queue"
          color="red"
        />
        <StatCard
          icon={CalendarCheck}
          label="Consultations Today"
          value={ha.today_consultations ?? "—"}
          color="indigo"
        />
      </div>

      {/* Visits */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-[36px] border border-slate-200 shadow-sm flex flex-col gap-6">
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <ClipboardList size={20} className="text-brand-primary" />
            Visit Summary
          </h2>
          {[
            { label: "Total Visits Today", value: visits.total_today ?? 0, color: "text-slate-800" },
            { label: "New Patients", value: visits.new ?? 0, color: "text-brand-primary" },
            { label: "Returning Patients", value: visits.returning ?? 0, color: "text-emerald-600" },
            { label: "Avg Wait Time", value: `${visits.avg_wait_time_minutes ?? 0}m`, color: "text-amber-600" },
          ].map(s => (
            <div key={s.label} className="flex items-center justify-between border-b border-slate-50 pb-4 last:border-0 last:pb-0">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{s.label}</span>
              <span className={`text-2xl font-black ${s.color}`}>{s.value}</span>
            </div>
          ))}
          <div className="mt-auto pt-4 border-t border-slate-100">
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1">
              <TrendingUp size={12} /> {data.growth_forecast?.expected_growth || "+0%"} projected growth
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HospitalOverview;
