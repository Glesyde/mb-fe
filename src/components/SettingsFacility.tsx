
import React from 'react';
import { Mail, Phone, Globe, Upload, Edit2, Save } from 'lucide-react';

const SettingsFacility: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-6 mb-8">
        <div className="relative group">
          <div className="w-24 h-24 rounded-3xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 group-hover:border-brand-primary group-hover:bg-brand-active transition-all cursor-pointer overflow-hidden">
            <Upload size={32} />
          </div>
          <button className="absolute -bottom-2 -right-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm text-brand-primary hover:text-brand-primary">
            <Edit2 size={14} />
          </button>
        </div>
        <div>
          <h3 className="text-xl font-black text-slate-800">Hospital Brand Identity</h3>
          <p className="text-sm font-medium text-slate-500">Update your hospital logo and contact details.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hospital Name</label>
          <input type="text" defaultValue="Medbookie Specialist Hospital" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all" />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Official Email</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input type="email" defaultValue="admin@medcore.his" className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all" />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Phone</label>
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input type="tel" defaultValue="+234 800 MED CORE" className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all" />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Website</label>
          <div className="relative">
            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input type="text" defaultValue="www.medcore-hospital.com" className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all" />
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Physical Address</label>
        <textarea rows={3} defaultValue="15 Medical Plaza, Healthcare District, VI, Lagos." className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-3xl text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all resize-none" />
      </div>

      <div className="flex justify-end pt-8 border-t border-slate-50">
        <button className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all flex items-center gap-3">
          <Save size={18} /> Update Facility Profile
        </button>
      </div>
    </div>
  );
};

export default SettingsFacility;
