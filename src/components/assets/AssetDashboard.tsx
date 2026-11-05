import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  BarChart2, 
  Box, 
  DollarSign, 
  Settings, 
  AlertTriangle,
  CheckCircle2,
  CalendarClock,
  Wrench,
  Info,
  ArrowRight,
  Filter
} from 'lucide-react';
import apiClient from '../../api/client';
import { useNotification } from '../../context/NotificationContext';
import LoadingAnimation from '../animations/LoadingAnimation';

interface DashboardData {
  organization: string;
  title: string;
  document_ref: string;
  generated_at: string;
  summary: {
    total_assets_registered: number;
    assets_in_use: number;
    total_asset_value: {
      amount: number;
      formatted: string;
      currency: string;
    };
  };
  servicing: {
    overdue: number;
    due_soon: number;
    ok: number;
    unscheduled: number;
  };
  condition: Array<{
    label: string;
    count: number;
  }>;
  note: string;
}

const AssetDashboard: React.FC = () => {
  const { notify } = useNotification();
  const [data, setData] = useState<DashboardData | null>(null);
  const [recentAssets, setRecentAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      const [dashRes, listRes] = await Promise.all([
        apiClient.get('/assets/dashboard'),
        apiClient.get('/assets/list').catch(() => ({ data: { data: [] } }))
      ]);
      setData(dashRes.data.data);
      // Get the 5 most recent assets, sorting by ID descending assuming higher ID = newer
      const sortedAssets = [...(listRes.data?.data || [])].sort((a, b) => b.id - a.id);
      setRecentAssets(sortedAssets.slice(0, 5));
    } catch (error: any) {
      console.error('Error fetching dashboard:', error);
      notify(error.response?.data?.message || 'Failed to fetch dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <LoadingAnimation />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">{data.title}</h2>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-sm font-bold text-slate-500">{data.organization}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
            <span className="text-sm font-semibold text-slate-400">Ref: {data.document_ref}</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Last Updated</p>
          <p className="text-sm font-bold text-slate-700">{data.generated_at}</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-50 rounded-full group-hover:scale-110 transition-transform duration-500 z-0"></div>
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total Assets</p>
              <h3 className="text-4xl font-black text-slate-800">{data.summary.total_assets_registered}</h3>
            </div>
            <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
              <Box size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-50 rounded-full group-hover:scale-110 transition-transform duration-500 z-0"></div>
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Assets In Use</p>
              <h3 className="text-4xl font-black text-slate-800">{data.summary.assets_in_use}</h3>
            </div>
            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl">
              <Activity size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-50 rounded-full group-hover:scale-110 transition-transform duration-500 z-0"></div>
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total Value</p>
              <h3 className="text-2xl font-black text-slate-800 mt-2">{data.summary.total_asset_value.formatted}</h3>
            </div>
            <div className="p-3 bg-purple-100 text-purple-600 rounded-2xl">
              <DollarSign size={24} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Servicing Overview */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-50 flex items-center gap-3">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Settings size={20} />
            </div>
            <h3 className="text-lg font-black text-slate-800">Servicing Overview</h3>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col items-center justify-center text-center hover:bg-red-50/50 transition-colors">
                <AlertTriangle size={20} className="text-red-500 mb-1.5" />
                <p className="text-xl font-black text-slate-800">{data.servicing.overdue}</p>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Overdue</p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col items-center justify-center text-center hover:bg-amber-50/50 transition-colors">
                <CalendarClock size={20} className="text-amber-500 mb-1.5" />
                <p className="text-xl font-black text-slate-800">{data.servicing.due_soon}</p>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Due Soon</p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col items-center justify-center text-center hover:bg-emerald-50/50 transition-colors">
                <CheckCircle2 size={20} className="text-emerald-500 mb-1.5" />
                <p className="text-xl font-black text-slate-800">{data.servicing.ok}</p>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">OK</p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col items-center justify-center text-center hover:bg-slate-100 transition-colors">
                <Wrench size={20} className="text-slate-400 mb-1.5" />
                <p className="text-xl font-black text-slate-800">{data.servicing.unscheduled}</p>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Unscheduled</p>
              </div>
            </div>
          </div>
        </div>

        {/* Condition Summary */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-50 flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <BarChart2 size={20} />
            </div>
            <h3 className="text-lg font-black text-slate-800">Condition Summary</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {data.condition.map((cond, idx) => {
                const total = data.summary.total_assets_registered || 1;
                const percentage = Math.round((cond.count / total) * 100);
                let barColor = 'bg-slate-200';
                if (cond.label === 'Good') barColor = 'bg-emerald-500';
                if (cond.label === 'Fair') barColor = 'bg-amber-500';
                if (cond.label === 'Poor') barColor = 'bg-orange-500';
                if (cond.label === 'Under Repair') barColor = 'bg-red-500';
                if (cond.label === 'Decommissioned') barColor = 'bg-slate-500';

                return (
                  <div key={idx} className="group">
                    <div className="flex justify-between items-end mb-1.5">
                      <span className="text-sm font-bold text-slate-700">{cond.label}</span>
                      <span className="text-xs font-bold text-slate-500">{cond.count} assets ({percentage}%)</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${barColor}`} 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Assets Table */}
      {recentAssets.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden mt-6">
          <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                <Box size={20} />
              </div>
              <h3 className="text-lg font-black text-slate-800">Recently Registered Assets</h3>
            </div>
            <a href="/assets/master" className="text-xs font-bold text-brand-primary hover:text-brand-secondary flex items-center gap-1 transition-colors">
              View Asset Master <ArrowRight size={14} />
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="p-4 font-black text-[10px] text-slate-500 uppercase tracking-wider">Asset Details</th>
                  <th className="p-4 font-black text-[10px] text-slate-500 uppercase tracking-wider">Location</th>
                  <th className="p-4 font-black text-[10px] text-slate-500 uppercase tracking-wider">Category</th>
                  <th className="p-4 font-black text-[10px] text-slate-500 uppercase tracking-wider">Status & Cond.</th>
                </tr>
              </thead>
              <tbody>
                {recentAssets.map(asset => (
                  <tr key={asset.id} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors bg-white">
                    <td className="p-4 align-top">
                      <p className="text-sm font-black text-slate-800">{asset.asset_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded border border-slate-200 text-slate-600 uppercase tracking-tight bg-white">
                          {asset.unique_id}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 align-top">
                      <p className="text-sm font-bold text-slate-700">{asset.location?.name || '-'}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{asset.wing?.name || '-'}</p>
                    </td>
                    <td className="p-4 align-top">
                      <p className="text-sm font-bold text-slate-700">{asset.category?.name || '-'}</p>
                    </td>
                    <td className="p-4 align-top">
                      <div className="flex flex-col gap-1.5 items-start">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-tighter uppercase ${asset.status?.name === 'In Use' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          {asset.status?.name || '-'}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-tighter uppercase ${asset.condition?.name === 'Good' ? 'bg-purple-50 text-purple-700 border border-purple-100' : asset.condition?.name === 'Fair' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                          {asset.condition?.name || '-'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};

export default AssetDashboard;
