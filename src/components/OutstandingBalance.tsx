
import React, { useState } from 'react';
import { 
  UserMinus, 
  Search, 
  Filter, 
  AlertCircle, 
  Mail, 
  Phone, 
  ArrowUpRight, 
  Wallet, 
  Clock, 
  ShieldAlert,
  ChevronRight,
  MoreVertical,
  Banknote,
  Send
} from 'lucide-react';

interface Debtor {
  id: string;
  name: string;
  mrn: string;
  lastVisit: string;
  amount: number;
  daysOverdue: number;
}

const MOCK_DEBTORS: Debtor[] = [
  { id: 'D1', name: 'Robert Jenkins', mrn: 'MRN-4421', lastVisit: '15 May 2025', amount: 85200, daysOverdue: 42 },
  { id: 'D2', name: 'Elena Rodriguez', mrn: 'MRN-0042', lastVisit: '10 May 2025', amount: 12500, daysOverdue: 12 },
  { id: 'D3', name: 'Jane Smith', mrn: 'MRN-9912', lastVisit: '02 April 2025', amount: 312000, daysOverdue: 85 },
  { id: 'D4', name: 'Unknown Male (Trauma)', mrn: 'TEMP-881', lastVisit: 'Yesterday', amount: 55000, daysOverdue: 1 },
];

const OutstandingBalance: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'critical'>('all');

  const getAgingColor = (days: number) => {
    if (days > 60) return 'bg-red-50 text-red-600 border-red-100 shadow-sm shadow-red-100';
    if (days > 30) return 'bg-amber-50 text-amber-600 border-amber-100';
    return 'bg-emerald-50 text-emerald-600 border-emerald-100';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
             <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <UserMinus size={28} />
            </div>
            Outstanding Balances & Recovery
          </h1>
          <p className="text-slate-500 font-medium">Manage aging patient debts and coordinate recovery workflows.</p>
        </div>
        <div className="flex items-center gap-3">
           <button className="px-6 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm">
             <Filter size={18} /> Aging Analysis
          </button>
           <button className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">
             <Mail size={18} /> Batch Notifications
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm relative overflow-hidden group">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Patient Debt</p>
           <p className="text-4xl font-black text-slate-900 mt-2">₦464,900</p>
           <div className="mt-6 flex items-center gap-1.5 text-xs font-bold text-red-500">
              <ShieldAlert size={14} /> Action Required
           </div>
           <div className="absolute top-8 right-8 text-slate-100 transition-transform group-hover:scale-110"><Wallet size={64}/></div>
        </div>
        <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm flex flex-col justify-between">
           <div>
             {/* Fixed the ">" symbol here */}
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Critical (&gt; 60 Days)</p>
             <p className="text-4xl font-black text-red-600 mt-2">₦312,000</p>
           </div>
           <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
             <div className="h-full bg-red-500 rounded-full" style={{ width: '67%' }} />
           </div>
        </div>
        <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm flex flex-col justify-between">
           <div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recovered (Month)</p>
             <p className="text-4xl font-black text-emerald-600 mt-2">₦2.4M</p>
           </div>
           <div className="mt-6 flex items-center gap-1 text-xs font-bold text-emerald-500">
              <ArrowUpRight size={14} /> +12% from last month
           </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[40px] shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
           <h3 className="text-lg font-black text-slate-800">Aging Debtor List</h3>
           <div className="flex bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
              <button 
                onClick={() => setActiveFilter('all')}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeFilter === 'all' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400'}`}
              >
                All Debtors
              </button>
              <button 
                onClick={() => setActiveFilter('critical')}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeFilter === 'critical' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-400'}`}
              >
                High Risk Only
              </button>
           </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="px-8 py-5">Patient Index</th>
                <th className="px-8 py-5">Days Overdue</th>
                <th className="px-8 py-5">Last Encounter</th>
                <th className="px-8 py-5">Total Debt</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {MOCK_DEBTORS.filter(d => activeFilter === 'all' || d.daysOverdue > 60).map(debtor => (
                <tr key={debtor.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <p className="text-sm font-black text-slate-800">{debtor.name}</p>
                    <p className="text-[10px] font-mono font-bold text-brand-primary mt-1 uppercase">{debtor.mrn}</p>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${getAgingColor(debtor.daysOverdue)}`}>
                       <Clock size={12}/> {debtor.daysOverdue} Days
                    </span>
                  </td>
                  <td className="px-8 py-5 text-sm font-bold text-slate-500">
                    {debtor.lastVisit}
                  </td>
                  <td className="px-8 py-5 font-black text-slate-900 text-base">
                    ₦{debtor.amount.toLocaleString()}
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                       <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all shadow-sm" title="Settle Account">
                        <Banknote size={16} />
                       </button>
                       <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-brand-primary hover:bg-brand-active transition-all shadow-sm" title="Remind">
                        <Send size={16} />
                       </button>
                       <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-600 transition-all shadow-sm">
                        <MoreVertical size={16} />
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-brand-active border border-brand-active p-8 rounded-[40px] flex items-start gap-4">
         <div className="p-3 bg-white text-brand-primary rounded-2xl shadow-sm border border-brand-active flex-shrink-0">
            <AlertCircle size={24} />
         </div>
         <div>
            <h4 className="text-lg font-black text-brand-primary tracking-tight">Collection Guidelines</h4>
            <p className="text-sm text-brand-primary/80 leading-relaxed font-medium mt-1">
              Outstanding balances over 90 days are automatically escalated to the Legal Department for external recovery. Patients with active debt are restricted from further non-emergency credit services.
            </p>
         </div>
      </div>
    </div>
  );
};

export default OutstandingBalance;
