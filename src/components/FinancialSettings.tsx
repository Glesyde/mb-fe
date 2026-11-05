
import React, { useState } from 'react';
import { Coins, Percent, Landmark, ShieldCheck, AlertCircle, Save, CheckCircle2 } from 'lucide-react';

const FinancialSettings: React.FC = () => {
  const [currency, setCurrency] = useState('NGN');
  const [taxRate, setTaxRate] = useState(7.5);
  const [applyTaxByDefault, setApplyTaxByDefault] = useState(true);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-4">
        <div>
          <h3 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
             <div className="p-2 bg-brand-active text-brand-primary rounded-xl">
              <Landmark size={24} />
            </div>
            Financial Control & Currency
          </h3>
          <p className="text-sm font-medium text-slate-500 mt-1">Global fiscal parameters and taxation policies for billing reconciliation.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Currency Section */}
        <div className="bg-slate-50 border border-slate-200 rounded-[44px] p-10 space-y-8 shadow-inner">
          <div className="flex items-center gap-4">
             <div className="p-3 bg-white text-emerald-600 rounded-2xl shadow-sm border border-emerald-50">
                <Coins size={28} />
             </div>
             <div>
                <h4 className="font-black text-slate-800 uppercase tracking-widest text-xs">Standard Currency</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Default ledger display unit</p>
             </div>
          </div>
          
          <div className="space-y-3">
             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Primary Global Currency</label>
             <div className="relative group">
               <select 
                 className="w-full px-6 py-5 bg-white border-2 border-transparent rounded-[28px] text-lg font-black text-slate-800 outline-none appearance-none cursor-pointer focus:border-brand-active0 focus:ring-8 focus:ring-brand-active0/5 shadow-sm transition-all"
                 value={currency}
                 onChange={(e) => setCurrency(e.target.value)}
               >
                  <option value="NGN">Nigerian Naira (₦ - NGN)</option>
                  <option value="USD">US Dollar ($ - USD)</option>
                  <option value="GBP">British Pound (£ - GBP)</option>
               </select>
               <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                 <Coins size={20} />
               </div>
             </div>
          </div>

          <div className="p-6 bg-emerald-50/50 border border-emerald-100 rounded-[32px] flex items-center gap-4">
             <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-emerald-600 shadow-sm">
                <CheckCircle2 size={20} />
             </div>
             <p className="text-[10px] text-emerald-800 font-bold uppercase leading-relaxed tracking-tight">
               System baseline currency verified. Conversion rates for foreign settlements are pulled from Central Bank daily feeds.
             </p>
          </div>
        </div>

        {/* Taxation Section */}
        <div className="bg-slate-50 border border-slate-200 rounded-[44px] p-10 space-y-8 shadow-inner">
          <div className="flex items-center gap-4">
             <div className="p-3 bg-white text-indigo-600 rounded-2xl shadow-sm border border-indigo-50">
                <Percent size={28} />
             </div>
             <div>
                <h4 className="font-black text-slate-800 uppercase tracking-widest text-xs">Taxation Policies</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Value Added Tax (VAT) parameters</p>
             </div>
          </div>

          <div className="space-y-3">
             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Standard VAT Rate (%)</label>
             <div className="relative group">
                <input 
                  type="number" 
                  step="0.1" 
                  value={taxRate} 
                  onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-6 py-5 bg-white border-2 border-transparent rounded-[28px] text-3xl font-black text-slate-900 outline-none focus:border-brand-active0 focus:ring-8 focus:ring-brand-active0/5 shadow-sm transition-all" 
                />
                <span className="absolute right-8 top-1/2 -translate-y-1/2 font-black text-slate-300 text-xl">%</span>
             </div>
          </div>

          <div className="pt-4">
            <label className="flex items-center justify-between p-6 bg-white border border-slate-100 rounded-[32px] cursor-pointer group hover:border-brand-primary transition-all shadow-sm">
               <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${applyTaxByDefault ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-100 text-slate-400'}`}>
                    <Percent size={20} />
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-800 uppercase tracking-widest block">Apply Tax to All Invoices</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Toggle automatic VAT calculation</span>
                  </div>
               </div>
               <div className="relative">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={applyTaxByDefault}
                    onChange={() => setApplyTaxByDefault(!applyTaxByDefault)}
                  />
                  <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-7 peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
               </div>
            </label>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[48px] p-10 flex flex-col md:flex-row md:items-center justify-between shadow-sm gap-8">
         <div className="flex items-center gap-6">
            <div className="p-5 bg-slate-50 text-slate-400 rounded-3xl border border-slate-100">
               <ShieldCheck size={40} />
            </div>
            <div>
               <h4 className="text-xl font-black text-slate-800 tracking-tight uppercase">Audit & Governance Sync</h4>
               <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-lg mt-1">
                 Financial parameter changes are logged in the immutable forensic audit trail. Adjusting the tax baseline will trigger a re-calculation prompt for all active inpatient bills.
               </p>
            </div>
         </div>
         <button className="bg-slate-900 text-white px-12 py-5 rounded-[24px] font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-slate-200 hover:bg-brand-primary active:scale-95 transition-all flex items-center gap-3">
            <Save size={20} /> Authorize Changes
         </button>
      </div>

      <div className="bg-amber-50 border border-amber-100 p-8 rounded-[40px] flex items-start gap-4">
         <AlertCircle className="text-amber-600 flex-shrink-0" size={28} />
         <div>
            <h4 className="text-sm font-black text-amber-900 uppercase tracking-widest">Compliance Advisory</h4>
            <p className="text-xs text-amber-700 font-bold leading-relaxed uppercase mt-1">
              Warning: Modifying the standard currency or tax rate may impact historical revenue comparisons and departmental KPI reporting. Please verify with the hospital administration before finalizing.
            </p>
         </div>
      </div>
    </div>
  );
};

export default FinancialSettings;
