
import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, 
  Search, 
  Calendar, 
  History, 
  ArrowUpRight, 
  Filter, 
  Trash2, 
  ShieldAlert,
  Clock,
  Activity,
  Loader2,
  Layers,
  ChevronRight,
  // Added missing CheckCircle2 import to fix error on line 158
  CheckCircle2
} from 'lucide-react';
import { inventoryService } from '../services/inventory.service';
import { useNotification } from '../context/NotificationContext';

const PharmacyExpiry: React.FC = () => {
  const { notify } = useNotification();
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const data = await inventoryService.searchBatches();
      // Only include those with expiry dates for this view
      setBatches(data.filter((b: any) => b.expiry_date));
    } catch (err) {
      notify('Failed to load batch registry', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const getRiskLevel = (expiryDateStr: string) => {
    const expiryDate = new Date(expiryDateStr);
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return { label: 'Expired', color: 'bg-red-50 text-red-600 border-red-100', priority: 1 };
    if (diffDays <= 30) return { label: 'Critical (30d)', color: 'bg-orange-50 text-orange-600 border-orange-100 animate-pulse', priority: 2 };
    if (diffDays <= 90) return { label: 'Warning (90d)', color: 'bg-amber-50 text-amber-600 border-amber-100', priority: 3 };
    return { label: 'Stable', color: 'bg-teal-50 text-teal-600 border-teal-100', priority: 4 };
  };

  const filtered = batches.filter(b => 
    b.batch_number.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => {
    const riskA = getRiskLevel(a.expiry_date).priority;
    const riskB = getRiskLevel(b.expiry_date).priority;
    return riskA - riskB;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="bg-rose-600 rounded-[48px] p-12 text-white shadow-xl shadow-rose-100 relative overflow-hidden group">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
           <div className="max-w-xl">
              <h2 className="text-3xl font-black tracking-tight leading-tight">Pharmacological Safety & Expiry Tracker</h2>
              <p className="text-rose-100 font-medium mt-2">Automated monitoring of batch viability across the hospital network.</p>
           </div>
           <div className="flex items-center gap-4">
              <div className="text-right">
                 <p className="text-[10px] font-black uppercase tracking-widest text-rose-200">Flagged Batches</p>
                 <p className="text-4xl font-black">{batches.length}</p>
              </div>
              <div className="p-5 bg-white/10 rounded-[32px] backdrop-blur border border-white/20">
                 <ShieldAlert size={40} />
              </div>
           </div>
        </div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-[40px] shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl shadow-sm">
                     <Clock size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight">Risk Horizon Ledger</h3>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">High-Priority Maintenance</p>
                  </div>
               </div>
               <div className="relative w-full md:w-64">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search batch ID..." 
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-rose-500/5 transition-all"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
               </div>
            </div>

            <div className="overflow-x-auto">
               <table className="w-full text-left">
                  <thead>
                    <tr className="bg-white border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                       <th className="px-8 py-5">Batch Reference</th>
                       <th className="px-8 py-5">Expiry Date</th>
                       <th className="px-8 py-5 text-right">Risk Level</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {loading ? (
                      <tr>
                        <td colSpan={3} className="py-20 text-center">
                          <Loader2 size={40} className="animate-spin mx-auto text-brand-primary mb-4" />
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Scanning Registry...</p>
                        </td>
                      </tr>
                    ) : filtered.map((row) => {
                      const risk = getRiskLevel(row.expiry_date);
                      return (
                        <tr key={row.id} className="hover:bg-rose-50/20 transition-all group">
                          <td className="px-8 py-6">
                             <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-100 rounded-lg text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all">
                                   <Layers size={14} />
                                </div>
                                <div>
                                   <p className="text-[10px] font-black text-slate-400 uppercase">Item ID: {row.item_id}</p>
                                   <p className="text-sm font-black text-slate-800 font-mono tracking-tighter">{row.batch_number}</p>
                                </div>
                             </div>
                          </td>
                          <td className="px-8 py-6">
                             <p className={`text-xs font-bold ${risk.priority <= 2 ? 'text-rose-600' : 'text-slate-500'}`}>{row.expiry_date}</p>
                          </td>
                          <td className="px-8 py-6 text-right">
                             <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${risk.color}`}>
                                <AlertCircle size={12} />
                                {risk.label}
                             </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
               </table>
               {!loading && filtered.length === 0 && (
                 <div className="py-20 text-center opacity-30">
                    <CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-4" />
                    <p className="text-xs font-black uppercase tracking-widest">Safety Scan Clear</p>
                 </div>
               )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
           <div className="bg-white border border-slate-200 rounded-[44px] p-8 shadow-sm flex flex-col">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2">
                <History size={16} /> Regulatory Disposal
              </h3>
              
              <div className="space-y-4 flex-1">
                 <button className="w-full group p-5 bg-slate-50 hover:bg-rose-600 border border-slate-100 rounded-[28px] transition-all flex items-center justify-between text-left">
                    <div className="flex items-center gap-4">
                       <div className="p-3 bg-white text-slate-400 rounded-2xl shadow-sm group-hover:text-rose-600 transition-colors">
                          <Trash2 size={20} />
                       </div>
                       <div>
                          <p className="text-sm font-black text-slate-800 group-hover:text-white">Batch write-off</p>
                          <p className="text-[10px] font-bold text-slate-400 group-hover:text-rose-100">Certify disposal</p>
                       </div>
                    </div>
                 </button>

                 <button className="w-full group p-5 bg-slate-50 hover:bg-teal-600 border border-slate-100 rounded-[28px] transition-all flex items-center justify-between text-left">
                    <div className="flex items-center gap-4">
                       <div className="p-3 bg-white text-slate-400 rounded-2xl shadow-sm group-hover:text-teal-600 transition-colors">
                          <History size={20} />
                       </div>
                       <div>
                          <p className="text-sm font-black text-slate-800 group-hover:text-white">Vendor Return</p>
                          <p className="text-[10px] font-bold text-slate-400 group-hover:text-teal-100">Exchange / Credit</p>
                       </div>
                    </div>
                 </button>
              </div>

              <div className="mt-8 pt-8 border-t border-slate-50">
                 <div className="bg-brand-active border border-brand-active p-6 rounded-[32px] flex items-start gap-4">
                    <Activity className="text-brand-primary flex-shrink-0" size={20} />
                    <p className="text-[10px] text-brand-primary font-bold leading-relaxed uppercase">
                      Compliance Enforcement: Batches within 14 days of expiry are automatically locked from dispensing.
                    </p>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default PharmacyExpiry;
