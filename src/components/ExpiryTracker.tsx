
import React, { useState } from 'react';
import { 
  AlertCircle, 
  Search, 
  Calendar, 
  Clock, 
  Filter, 
  Trash2, 
  ShieldAlert,
  Activity,
  History,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

interface ExpiryItem {
  id: string;
  name: string;
  batchNo: string;
  expiryDate: Date;
  quantity: number;
}

const MOCK_EXPIRY_DATA: ExpiryItem[] = [
  { id: 'E-001', name: 'Panadol Syrup 60ml', batchNo: 'B-8812', expiryDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), quantity: 12 }, // 2 days ago
  { id: 'E-002', name: 'Ciprofloxacin 500mg', batchNo: 'B-7721', expiryDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), quantity: 45 }, // in 4 days
  { id: 'E-003', name: 'Insulin Glargine', batchNo: 'B-0022', expiryDate: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000), quantity: 8 },  // in 22 days
  { id: 'E-004', name: 'Artemether Tabs', batchNo: 'B-4412', expiryDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), quantity: 120 }, // in 45 days
  { id: 'E-005', name: 'Cough Syrup Jr', batchNo: 'B-1102', expiryDate: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000), quantity: 15 },  // in 75 days
];

const ExpiryTracker: React.FC = () => {
  const [horizon, setHorizon] = useState<30 | 60 | 90>(30);
  const [searchTerm, setSearchTerm] = useState('');

  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const getStatus = (date: Date) => {
    if (date < now || date <= weekFromNow) return { label: 'CRITICAL', color: 'bg-red-50 text-red-600 border-red-100', urgency: 'high' };
    if (date <= monthFromNow) return { label: 'WARNING', color: 'bg-amber-50 text-amber-600 border-amber-100', urgency: 'medium' };
    return { label: 'STABLE', color: 'bg-teal-50 text-teal-600 border-teal-100', urgency: 'low' };
  };

  const horizonDate = new Date(now.getTime() + horizon * 24 * 60 * 60 * 1000);

  const filtered = MOCK_EXPIRY_DATA.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesHorizon = item.expiryDate <= horizonDate;
    return matchesSearch && matchesHorizon;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Urgent Alert Banner */}
      <div className="bg-slate-900 rounded-[48px] p-10 text-white shadow-xl shadow-slate-200 relative overflow-hidden group">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
           <div className="max-w-xl">
              <h2 className="text-3xl font-black tracking-tight leading-tight">Batch Viability Tracker</h2>
              <p className="text-slate-400 font-medium mt-2">Monitoring pharmacological integrity and enforcing disposal protocols for expiring substances.</p>
           </div>
           <div className="flex items-center gap-6">
              <div className="text-right">
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Items Expired/Week</p>
                 <p className="text-4xl font-black text-rose-500">02</p>
              </div>
              <div className="p-4 bg-white/5 rounded-[28px] border border-white/10 backdrop-blur-sm">
                 <ShieldAlert size={36} className="text-rose-500 animate-pulse" />
              </div>
           </div>
        </div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-brand-primary/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700" />
      </div>

      {/* Control Bar */}
      <div className="bg-white p-4 rounded-[32px] border border-slate-200 flex flex-col md:flex-row gap-4 items-center shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Search batches by product name..."
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl border border-slate-200">
           {[30, 60, 90].map(val => (
             <button 
               key={val}
               onClick={() => setHorizon(val as any)}
               className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${horizon === val ? 'bg-white text-teal-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
             >
               Next {val}d
             </button>
           ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Expiry Table */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200 rounded-[44px] shadow-sm overflow-hidden h-full flex flex-col">
            <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <Clock size={20} className="text-teal-600" /> Risk Horizon Log
              </h3>
              <span className="bg-teal-50 text-teal-600 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest">
                {filtered.length} Flagged
              </span>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-8 py-5">Product & Batch</th>
                    <th className="px-8 py-5">Expiry Date</th>
                    <th className="px-8 py-5 text-center">Batch Qty</th>
                    <th className="px-8 py-5 text-right">Risk Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map(item => {
                    const status = getStatus(item.expiryDate);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-8 py-6">
                           <p className="text-sm font-black text-slate-800">{item.name}</p>
                           <p className="text-[10px] font-mono font-bold text-slate-400 mt-0.5 uppercase tracking-tighter">Batch: {item.batchNo}</p>
                        </td>
                        <td className="px-8 py-6">
                           <p className={`text-xs font-bold ${status.urgency === 'high' ? 'text-rose-600' : 'text-slate-600'}`}>
                             {item.expiryDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                           </p>
                        </td>
                        <td className="px-8 py-6 text-center text-sm font-black text-slate-700">
                          {item.quantity}
                        </td>
                        <td className="px-8 py-6 text-right">
                           <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${status.color} ${status.urgency === 'high' ? 'animate-pulse' : ''}`}>
                             <AlertCircle size={12} />
                             {status.label}
                           </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="py-20 text-center opacity-30">
                  <ShieldCheck size={48} className="mx-auto text-teal-600 mb-4" />
                  <p className="text-xs font-black uppercase tracking-widest">No safety risks found in this horizon</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Protocols Sidebar */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-[44px] p-8 shadow-sm">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
              <History size={16} className="text-teal-600" /> Disposal Protocols
            </h3>
            
            <div className="space-y-4">
               <button className="w-full group p-5 bg-slate-50 hover:bg-rose-600 border border-slate-100 rounded-[28px] transition-all flex items-center justify-between text-left">
                  <div className="flex items-center gap-4">
                     <div className="p-3 bg-white text-rose-600 rounded-2xl shadow-sm border border-rose-50 group-hover:bg-rose-500 group-hover:text-white transition-all">
                        <Trash2 size={20} />
                     </div>
                     <div>
                        <p className="text-sm font-black text-slate-800 group-hover:text-white">Batch Disposal</p>
                        <p className="text-[10px] font-bold text-slate-400 group-hover:text-rose-100">Log incineration cert</p>
                     </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 group-hover:text-white" />
               </button>

               <button className="w-full group p-5 bg-slate-50 hover:bg-teal-600 border border-slate-100 rounded-[28px] transition-all flex items-center justify-between text-left">
                  <div className="flex items-center gap-4">
                     <div className="p-3 bg-white text-teal-600 rounded-2xl shadow-sm border border-teal-50 group-hover:bg-teal-500 group-hover:text-white transition-all">
                        <History size={20} />
                     </div>
                     <div>
                        <p className="text-sm font-black text-slate-800 group-hover:text-white">Return to Vendor</p>
                        <p className="text-[10px] font-bold text-slate-400 group-hover:text-teal-100">Claim credit/exchange</p>
                     </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 group-hover:text-white" />
               </button>
            </div>

            <div className="mt-8 pt-8 border-t border-slate-100">
               <div className="bg-brand-active border border-brand-active p-6 rounded-[32px] flex items-start gap-4">
                  <ShieldCheck className="text-brand-primary flex-shrink-0" size={24} />
                  <p className="text-[10px] text-brand-primary font-bold leading-relaxed uppercase">
                    Safety Enforcement: Inventory within 14 days of expiry is restricted from all clinical dispensing terminals.
                  </p>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpiryTracker;
