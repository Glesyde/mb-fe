import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  RefreshCcw,
  Filter,
  FileSpreadsheet,
  Download,
  ChevronDown,
  Info,
  Wallet,
  Coins,
  Loader,
  AlertCircle,
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



const RevenueReports: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const resp = await apiClient.get("/dashboard-summary");
        setData(resp.data?.data?.activity_snapshot || null);
      } catch {
        // silently fall through — values will show "—"
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const revenue = data?.revenue || {};

  const handleExport = (type: "pdf" | "excel") => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      alert(`Exporting Revenue Report as ${type.toUpperCase()}...`);
    }, 1500);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-bottom-4 duration-500">
      {/* Main Analytics Content */}
      <div className="lg:col-span-12 space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex flex-col justify-between h-44">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Total Revenue Today
              </p>
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <TrendingUp size={16} />
              </div>
            </div>
            {loading ? (
              <Loader size={20} className="animate-spin text-indigo-400" />
            ) : (
              <p className="text-3xl font-black text-indigo-600">
                {revenue.total_today || "₦0.00"}
              </p>
            )}
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-500">
              <TrendingUp size={12} /> {revenue.trend || "+0%"} from yesterday
            </div>
          </div>

          <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex flex-col justify-between h-44">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Cash Collections
              </p>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <Coins size={16} />
              </div>
            </div>
            {loading ? (
              <Loader size={20} className="animate-spin text-emerald-400" />
            ) : (
              <p className="text-3xl font-black text-slate-800">
                {revenue.cash || "₦0.00"}
              </p>
            )}
            <p className="text-[10px] font-bold text-slate-400 uppercase">
              Direct cash received today
            </p>
          </div>

          <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex flex-col justify-between h-44">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                HMO / Insurance
              </p>
              <div className="p-2 bg-brand-active text-brand-primary rounded-xl">
                <Wallet size={16} />
              </div>
            </div>
            {loading ? (
              <Loader size={20} className="animate-spin text-brand-primary" />
            ) : (
              <p className="text-3xl font-black text-slate-800">—</p>
            )}
            <p className="text-[10px] font-bold text-slate-400 uppercase">
              Pending reconciliation
            </p>
          </div>
        </div>


      </div>

      {/* Right Pane: Export */}
      {/* <div className="lg:col-span-4 space-y-6">
        <div className="bg-slate-900 rounded-[40px] p-8 text-white shadow-xl flex flex-col">
          <h3 className="text-xl font-black tracking-tight mb-8">Export Dataset</h3>
          <div className="space-y-6 flex-1">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                Report Period
              </label>
              <div className="grid grid-cols-1 gap-2">
                <input type="date" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-indigo-500 transition-all" />
                <input type="date" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-indigo-500 transition-all" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                Output Format
              </label>
              <div className="relative">
                <select className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none appearance-none cursor-pointer">
                  <option className="bg-slate-900">Summary CSV</option>
                  <option className="bg-slate-900">Detailed Transaction Log</option>
                  <option className="bg-slate-900">HMO Utilization Ledger</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
              </div>
            </div>
            <div className="pt-8 space-y-3">
              <button onClick={() => handleExport("excel")} disabled={isGenerating} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50">
                <FileSpreadsheet size={18} />
                {isGenerating ? "Compiling..." : "Generate Excel"}
              </button>
              <button onClick={() => handleExport("pdf")} disabled={isGenerating} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50">
                <Download size={18} />
                {isGenerating ? "Rendering..." : "Generate PDF"}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-brand-active border border-brand-active p-6 rounded-[32px] flex items-start gap-4">
          <Info size={20} className="text-brand-primary flex-shrink-0" />
          <p className="text-[10px] text-brand-primary font-bold leading-relaxed uppercase">
            Revenue reports are updated in real-time as bills are finalized. Refunded transactions are automatically deducted.
          </p>
        </div>
      </div> */}
    </div>
  );
};

export default RevenueReports;
