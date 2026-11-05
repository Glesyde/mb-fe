
import React from 'react';
import { Coins, Percent, Landmark, ShieldCheck, AlertCircle } from 'lucide-react';

const SettingsFinance: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h3 className="text-xl font-black text-slate-800">Financial Control & Currency</h3>
        <p className="text-sm font-medium text-slate-500">Manage tax rates, default currency, and fiscal year parameters.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-slate-50 border border-slate-200 rounded-[40px] p-8 space-y-6">
          <div className="flex items-center gap-4">
             <div className="p-3 bg-white text-emerald-600 rounded-2xl shadow-sm border border-emerald-50">
                <Coins size={24} />
             </div>
             <h4 className="font-black text-slate-800 uppercase tracking-widest text-xs">Standard Currency</h4>
          </div>
          <div className="space-y-2">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Primary Display Currency</label>
             <select className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-black outline-none appearance-none cursor-pointer">
                <option>Nigerian Naira (NGN - ₦)</option>
                <option>US Dollar (USD - $)</option>
                <option>British Pound (GBP - £)</option>
             </select>
          </div>
          <div className="space-y-2">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rounding Rule</label>
             <select className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-black outline-none appearance-none cursor-pointer">
                <option>No Rounding (Precision)</option>
                <option>Round to Nearest Whole Unit</option>
                <option>Round to Nearest 10</option>
             </select>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-[40px] p-8 space-y-6">
          <div className="flex items-center gap-4">
             <div className="p-3 bg-white text-indigo-600 rounded-2xl shadow-sm border border-indigo-50">
                <Percent size={24} />
             </div>
             <h4 className="font-black text-slate-800 uppercase tracking-widest text-xs">Taxation Policies</h4>
          </div>
          <div className="space-y-2">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Standard Value Added Tax (%)</label>
             <div className="relative group">
                <input type="number" defaultValue="7.5" className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl text-xl font-black text-slate-800 outline-none focus:ring-8 focus:ring-indigo-500/5 transition-all" />
                <span className="absolute right-5 top-1/2 -translate-y-1/2 font-black text-slate-300">%</span>
             </div>
          </div>
          <label className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-2xl cursor-pointer group">
             <input type="checkbox" defaultChecked className="w-5 h-5 rounded-lg border-slate-300 text-slate-900 focus:ring-slate-900/10 cursor-pointer" />
             <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900 transition-colors">Apply Tax to all Service Items automatically</span>
          </label>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[40px] p-10 flex items-center justify-between shadow-sm">
         <div className="flex items-center gap-6">
            <div className="p-4 bg-slate-50 text-slate-400 rounded-3xl border border-slate-100">
               <Landmark size={32} />
            </div>
            <div>
               <h4 className="text-lg font-black text-slate-800 tracking-tight uppercase">Fiscal Accountability</h4>
               <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-md mt-1">
                 All financial parameter changes are logged in the secure forensic audit trail and will be reflected in the next generated Daily Liquidity Report.
               </p>
            </div>
         </div>
         <button className="bg-slate-900 text-white px-10 py-4 rounded-[20px] font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all flex items-center gap-2">
            <ShieldCheck size={18} /> Authorize Changes
         </button>
      </div>

      <div className="bg-amber-50 border border-amber-100 p-6 rounded-[32px] flex items-start gap-4">
         <AlertCircle className="text-amber-600 flex-shrink-0" size={24} />
         <p className="text-[10px] text-amber-700 font-black uppercase leading-relaxed tracking-tight">
           Caution: Modifying currency or tax baseline will trigger an automatic recalculation of all active (unfinalized) invoices in the Billing department.
         </p>
      </div>
    </div>
  );
};

export default SettingsFinance;
