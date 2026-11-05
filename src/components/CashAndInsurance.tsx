
import React, { useState } from 'react';
import { 
  Coins, 
  Banknote, 
  CreditCard, 
  Smartphone, 
  ShieldCheck, 
  ArrowUpRight, 
  Search, 
  Filter, 
  FileText, 
  Send,
  CheckCircle2,
  Calendar,
  ChevronRight,
  TrendingUp,
  Receipt
} from 'lucide-react';

interface CashTransaction {
  id: string;
  time: string;
  patient: string;
  mode: 'Cash' | 'POS' | 'Transfer';
  amount: number;
}

interface InsuranceClaim {
  id: string;
  patient: string;
  hmo: string;
  amount: number;
  status: 'Ready' | 'Submitted';
}

const MOCK_CASH: CashTransaction[] = [
  { id: 'RC-101', time: '14:20 PM', patient: 'Alexander Thompson', mode: 'POS', amount: 15500 },
  { id: 'RC-100', time: '13:45 PM', patient: 'Sarah Miller', mode: 'Cash', amount: 5000 },
  { id: 'RC-099', time: '12:10 PM', patient: 'James Wilson', mode: 'Transfer', amount: 22000 },
];

const MOCK_CLAIMS: InsuranceClaim[] = [
  { id: 'CLM-882', patient: 'Lily Evans', hmo: 'Reliance Health', amount: 12000, status: 'Ready' },
  { id: 'CLM-881', patient: 'John Doe', hmo: 'AXA Mansard', amount: 45000, status: 'Submitted' },
  { id: 'CLM-880', patient: 'Robert Brown', hmo: 'Hygeia HMO', amount: 8500, status: 'Ready' },
];

const CashAndInsurance: React.FC = () => {
  const [view, setView] = useState<'cash' | 'insurance'>('cash');

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
             <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Coins size={28} />
            </div>
            Cash & Insurance Reconciliation
          </h1>
          <p className="text-slate-500 font-medium">Monitor liquid collection and verify HMO claim batches.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-2xl">
          <button 
            onClick={() => setView('cash')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${view === 'cash' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
          >
            Daily Cash Report
          </button>
          <button 
            onClick={() => setView('insurance')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${view === 'insurance' ? 'bg-white text-brand-primary shadow-sm' : 'text-slate-500'}`}
          >
            Insurance Claims
          </button>
        </div>
      </div>

      {view === 'cash' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom-4">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200 rounded-[40px] shadow-sm overflow-hidden">
               <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <h3 className="text-lg font-black text-slate-800">Daily Collection Ledger</h3>
                  <button className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2 hover:underline">
                    <TrendingUp size={14} /> Full Analytics
                  </button>
               </div>
               <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-white border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <th className="px-8 py-5">Receipt & Time</th>
                        <th className="px-8 py-5">Patient Name</th>
                        <th className="px-8 py-5">Mode</th>
                        <th className="px-8 py-5 text-right">Amount Collected</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {MOCK_CASH.map(tx => (
                        <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-8 py-5 font-mono text-xs font-bold text-brand-primary uppercase">{tx.id} <span className="text-slate-300 font-normal ml-2">{tx.time}</span></td>
                          <td className="px-8 py-5 text-sm font-black text-slate-800">{tx.patient}</td>
                          <td className="px-8 py-5">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border
                              ${tx.mode === 'POS' ? 'bg-brand-active text-brand-primary border-brand-active' : tx.mode === 'Cash' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-purple-50 text-purple-600 border-purple-100'}
                            `}>
                              {tx.mode === 'POS' ? <CreditCard size={12}/> : tx.mode === 'Cash' ? <Banknote size={12}/> : <Smartphone size={12}/>}
                              {tx.mode}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-right font-black text-slate-900 text-base">₦{tx.amount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
               </div>
            </div>
          </div>

          <div className="space-y-6">
             <div className="bg-slate-900 rounded-[40px] p-8 text-white shadow-xl flex flex-col h-full">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-8">Daily Reconciliation</h3>
                <div className="space-y-6 flex-1">
                   <div className="p-5 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <div className="p-2 bg-emerald-500 rounded-xl"><Banknote size={18} className="text-slate-900" /></div>
                         <span className="text-xs font-bold text-slate-400">Total Cash</span>
                      </div>
                      <span className="font-black">₦42,500</span>
                   </div>
                   <div className="p-5 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <div className="p-2 bg-brand-active0 rounded-xl"><CreditCard size={18} className="text-slate-900" /></div>
                         <span className="text-xs font-bold text-slate-400">Total POS</span>
                      </div>
                      <span className="font-black">₦128,000</span>
                   </div>
                   <div className="p-5 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <div className="p-2 bg-purple-500 rounded-xl"><Smartphone size={18} className="text-slate-900" /></div>
                         <span className="text-xs font-bold text-slate-400">Total Transfer</span>
                      </div>
                      <span className="font-black">₦15,000</span>
                   </div>
                </div>

                <div className="mt-10 pt-8 border-t border-slate-800">
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Grand Collection Total</p>
                   <p className="text-4xl font-black text-white">₦185,500</p>
                </div>

                <button className="w-full mt-10 py-4 bg-emerald-600 hover:bg-emerald-700 rounded-2xl font-black uppercase text-xs shadow-lg active:scale-95 transition-all">
                  Close Daily Account
                </button>
             </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in slide-in-from-right-4">
           <div className="bg-white border border-slate-200 rounded-[40px] shadow-sm overflow-hidden">
             <div className="p-8 border-b border-slate-100 bg-brand-active/30 flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-800">Pending HMO Submission Queue</h3>
                <button className="bg-brand-primary text-white px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-brand-primary transition-all">
                   <Send size={16} /> Batch Submit Claims
                </button>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                   <thead>
                      <tr className="bg-white border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                         <th className="px-8 py-5">Claim Reference</th>
                         <th className="px-8 py-5">Patient Details</th>
                         <th className="px-8 py-5">HMO Provider</th>
                         <th className="px-8 py-5">Claim Amount</th>
                         <th className="px-8 py-5 text-right">Action</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                      {MOCK_CLAIMS.map(claim => (
                        <tr key={claim.id} className="hover:bg-slate-50/50 transition-colors">
                           <td className="px-8 py-5 font-mono text-xs font-bold text-brand-primary">{claim.id}</td>
                           <td className="px-8 py-5 text-sm font-black text-slate-800">{claim.patient}</td>
                           <td className="px-8 py-5">
                              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">{claim.hmo}</span>
                           </td>
                           <td className="px-8 py-5 font-black text-slate-900">₦{claim.amount.toLocaleString()}</td>
                           <td className="px-8 py-5 text-right">
                              {claim.status === 'Ready' ? (
                                <button className="text-[10px] font-black text-brand-primary uppercase tracking-widest hover:underline">Ready to Post</button>
                              ) : (
                                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center justify-end gap-1"><CheckCircle2 size={14}/> Submitted</span>
                              )}
                           </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default CashAndInsurance;
