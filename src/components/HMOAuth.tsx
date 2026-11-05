
import React from 'react';
import { ShieldCheck, Search, DollarSign, Send } from 'lucide-react';

const HMOAuth: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white border border-slate-200 rounded-[40px] p-8 shadow-sm">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-brand-active text-brand-primary rounded-xl">
            <ShieldCheck size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Pre-Authorization Request</h2>
            <p className="text-slate-500 font-medium">Request coverage approval from HMO providers for specific treatments.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Patient</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Search patient name or MRN..."
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:border-brand-active0 outline-none transition-all"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Diagnosis / ICD-10</label>
            <input 
              type="text" 
              placeholder="e.g. Typhoid Fever (A01.0)"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:border-brand-active0 outline-none transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Proposed Treatment</label>
            <input 
              type="text" 
              placeholder="e.g. Inpatient Admission, IV Fluids"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:border-brand-active0 outline-none transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estimated Cost (₦)</label>
            <div className="relative">
              <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="number" 
                placeholder="0.00"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:border-brand-active0 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        <div className="space-y-1.5 mb-8">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Clinical Justification</label>
          <textarea 
            rows={4}
            placeholder="Explain why this procedure is necessary for the patient's recovery..."
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:border-brand-active0 outline-none transition-all resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
          <button className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">Save as Draft</button>
          <button className="bg-brand-primary text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-brand-primary shadow-lg shadow-brand-active transition-all active:scale-95">
            <Send size={18} /> Submit for Approval
          </button>
        </div>
      </div>
    </div>
  );
};

export default HMOAuth;
