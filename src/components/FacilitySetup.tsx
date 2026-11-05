
import React from 'react';
import { Mail, Phone, Globe, Upload, Edit2, Save, MapPin, Building2 } from 'lucide-react';

const FacilitySetup: React.FC = () => {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-6 mb-8">
        <div className="relative group">
          <div className="w-28 h-28 rounded-[32px] bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300 group-hover:border-brand-primary group-hover:bg-brand-active group-hover:text-brand-active0 transition-all cursor-pointer overflow-hidden shadow-inner">
            <Upload size={32} />
          </div>
          <button className="absolute -bottom-2 -right-2 bg-white p-2 rounded-xl border border-slate-200 shadow-lg text-brand-primary hover:scale-110 transition-transform">
            <Edit2 size={16} />
          </button>
        </div>
        <div>
          <h3 className="text-2xl font-black text-slate-800 tracking-tight">Hospital Brand Identity</h3>
          <p className="text-sm font-medium text-slate-500 mt-1">Configure global facility identifiers and public contact nodes.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Hospital Legal Name</label>
          <div className="relative group">
            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors" size={18} />
            <input type="text" defaultValue="Gracespring Specialist Hospital" className="w-full pl-11 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:bg-white focus:ring-8 focus:ring-brand-active0/5 focus:border-brand-active0 transition-all" />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Public Enquiry Email</label>
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors" size={18} />
            <input type="email" defaultValue="admin@Gracespring.his" className="w-full pl-11 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:bg-white focus:ring-8 focus:ring-brand-active0/5 focus:border-brand-active0 transition-all" />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Primary Reception Line</label>
          <div className="relative group">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors" size={18} />
            <input type="tel" defaultValue="+234 800 MED CORE" className="w-full pl-11 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:bg-white focus:ring-8 focus:ring-brand-active0/5 focus:border-brand-active0 transition-all" />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Official Website</label>
          <div className="relative group">
            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors" size={18} />
            <input type="text" defaultValue="www.Gracespring-hospital.com" className="w-full pl-11 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:bg-white focus:ring-8 focus:ring-brand-active0/5 focus:border-brand-active0 transition-all" />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
          <MapPin size={12} /> Physical Location & Address
        </label>
        <textarea
          rows={4}
          defaultValue="15 Medical Plaza, Healthcare District, Victoria Island, Lagos State, Nigeria."
          className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-[32px] text-sm font-bold text-slate-800 outline-none focus:bg-white focus:ring-8 focus:ring-brand-active0/5 focus:border-brand-active0 transition-all resize-none leading-relaxed"
        />
      </div>

      <div className="flex justify-end pt-8 border-t border-slate-100">
        <button className="bg-slate-900 text-white px-12 py-5 rounded-[24px] font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-slate-200 hover:bg-brand-primary active:scale-95 transition-all flex items-center gap-3">
          <Save size={20} /> Update System Profile
        </button>
      </div>
    </div>
  );
};

export default FacilitySetup;
