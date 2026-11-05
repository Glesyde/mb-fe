
import React, { useState } from 'react';
import { ShieldCheck, Search, DollarSign, Send, CheckCircle2, UserCheck, Activity, AlertCircle, Loader2 } from 'lucide-react';

const HMOAuthorization: React.FC = () => {
  const [eligibilityStatus, setEligibilityStatus] = useState<'idle' | 'checking' | 'active' | 'inactive'>('idle');
  const [patientId, setPatientId] = useState('');

  const checkEligibility = () => {
    if (!patientId) return;
    setEligibilityStatus('checking');
    setTimeout(() => {
      // Simulate found patient logic
      setEligibilityStatus(patientId.includes('MRN') ? 'active' : 'inactive');
    }, 1200);
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white border border-slate-200 rounded-[48px] shadow-xl overflow-hidden">
        {/* Header Section */}
        <div className="p-10 pb-8 border-b border-slate-100 flex items-center gap-6 bg-slate-50/50">
          <div className="p-4 bg-brand-primary text-white rounded-[24px] shadow-lg shadow-brand-active">
            <ShieldCheck size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Coverage Pre-Authorization</h2>
            <p className="text-slate-500 font-medium">Verify patient eligibility and request treatment approval from providers.</p>
          </div>
        </div>

        <div className="p-10 space-y-10">
          {/* Eligibility Check Row */}
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Member Identification</label>
              {eligibilityStatus === 'active' && (
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 animate-in zoom-in-90">
                  <UserCheck size={12} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Active Coverage</span>
                </div>
              )}
              {eligibilityStatus === 'inactive' && (
                <div className="flex items-center gap-2 px-3 py-1 bg-red-50 text-red-600 rounded-full border border-red-100 animate-in zoom-in-90">
                  <AlertCircle size={12} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Invalid Member</span>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <div className="relative flex-1 group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-brand-primary transition-colors" />
                <input 
                  type="text" 
                  placeholder="Enter Patient MRN or HMO Policy ID..."
                  className="w-full pl-14 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-3xl text-sm font-bold text-slate-800 outline-none focus:bg-white focus:ring-8 focus:ring-brand-active0/5 focus:border-brand-active0 transition-all"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                />
              </div>
              <button 
                onClick={checkEligibility}
                disabled={!patientId || eligibilityStatus === 'checking'}
                className="bg-slate-900 text-white px-8 py-4 rounded-[24px] font-black text-xs uppercase tracking-widest hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center gap-2 shadow-lg"
              >
                {eligibilityStatus === 'checking' ? <Loader2 size={18} className="animate-spin" /> : <Activity size={18} />}
                Check Eligibility
              </button>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Diagnosis / Clinical ICD-10</label>
              <input 
                type="text" 
                placeholder="e.g. Acute Appendicitis (K35.8)"
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-[24px] text-sm font-bold outline-none focus:bg-white focus:border-brand-active0 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Proposed Treatment</label>
              <input 
                type="text" 
                placeholder="e.g. Inpatient Surgery & Post-Op"
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-[24px] text-sm font-bold outline-none focus:bg-white focus:border-brand-active0 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Facility Department</label>
              <select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-[24px] text-sm font-bold outline-none appearance-none">
                <option>Main Operating Theatre</option>
                <option>Inpatient Ward (General)</option>
                <option>Radiology Center</option>
                <option>Pharmacy - Specialty Drugs</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Est. Total Cost (₦)</label>
              <div className="relative group">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-slate-300">₦</span>
                <input 
                  type="number" 
                  placeholder="0.00"
                  className="w-full pl-10 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-[24px] text-sm font-bold outline-none focus:bg-white focus:border-brand-active0 transition-all"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Clinical Justification</label>
            <textarea 
              rows={4}
              placeholder="Provide a detailed clinical rationale for the requested services to expedite HMO approval..."
              className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-[32px] text-sm font-medium outline-none focus:bg-white transition-all resize-none leading-relaxed"
            />
          </div>

          <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-3 text-amber-600 bg-amber-50 px-5 py-3 rounded-2xl border border-amber-100">
               <AlertCircle size={20} />
               <p className="text-[10px] font-black uppercase tracking-tight">Requesting for Reliance Health Tariff Schedule</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="px-6 py-3 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-800 transition-colors">Save Draft</button>
              <button className="bg-brand-primary text-white px-10 py-4 rounded-[20px] font-black uppercase text-xs tracking-widest shadow-xl shadow-brand-active hover:bg-brand-primary transition-all active:scale-95 flex items-center gap-2">
                <Send size={16} /> Transmit Request
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HMOAuthorization;
