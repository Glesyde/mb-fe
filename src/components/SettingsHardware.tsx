
import React, { useState } from 'react';
import { Printer, Monitor, CheckCircle2, Cpu, Settings2 } from 'lucide-react';
import { i18n } from "../i18n";

const SettingsHardware: React.FC = () => {
  const [zebraFormat, setZebraFormat] = useState('ZPL');

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h3 className="text-xl font-black text-slate-800">{i18n.t("Hardware & Peripheral Configuration")}</h3>
        <p className="text-sm font-medium text-slate-500">{i18n.t("Configure network connectivity for hospital-wide clinical devices.")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Receipt Printer */}
        <div className="bg-slate-50 border border-slate-200 rounded-[40px] p-8 space-y-6 group hover:border-slate-400 transition-all">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-white text-brand-primary rounded-2xl shadow-sm border border-brand-active group-hover:bg-brand-primary group-hover:text-white transition-all">
              <Printer size={24} />
            </div>
            <div>
              <h4 className="font-black text-slate-800 uppercase tracking-widest text-xs">{i18n.t("Receipt Printer")}</h4>
              <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{i18n.t("Invoices & Billing")}</p>
            </div>
          </div>
          <div className="space-y-1.5">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ms-1">{i18n.t("Network IP Address")}</label>
             <input type="text" defaultValue="192.168.1.102" className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-mono font-bold outline-none focus:border-slate-900 transition-all" />
          </div>
          <div className="space-y-1.5">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ms-1">{i18n.t("Printer Model Driver")}</label>
             <select className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none appearance-none">
                <option>{i18n.t("Epson TM-T88VI (Thermal)")}</option>
                <option>{i18n.t("Star Micronics mC-Print3")}</option>
                <option>{i18n.t("Zebra ZD421 (Labels)")}</option>
             </select>
          </div>
          <button className="w-full py-4 bg-white hover:bg-slate-100 hover:text-brand-primary text-slate-500 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-slate-200 shadow-sm">
            <Monitor size={16} />{" "}{i18n.t("Test Connection")}</button>
        </div>

        {/* Wristband Printer */}
        <div className="bg-slate-50 border border-slate-200 rounded-[40px] p-8 space-y-6 group hover:border-slate-400 transition-all">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-white text-teal-600 rounded-2xl shadow-sm border border-teal-50 group-hover:bg-teal-600 group-hover:text-white transition-all">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h4 className="font-black text-slate-800 uppercase tracking-widest text-xs">{i18n.t("Admissions Wristband")}</h4>
              <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{i18n.t("Patient Identification")}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-1.5">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ms-1">{i18n.t("Network IP Address")}</label>
               <input type="text" defaultValue="192.168.1.105" className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-mono font-bold outline-none focus:border-slate-900 transition-all" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ms-1">{i18n.t("Device Driver")}</label>
                 <select className="w-full px-4 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none appearance-none">
                    <option>{i18n.t("Zebra HC100")}</option>
                    <option>{i18n.t("Zebra ZD510-HC")}</option>
                    <option>{i18n.t("Citizen CL-E300")}</option>
                 </select>
              </div>
              <div className="space-y-1.5">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ms-1 flex items-center gap-1">
                   <Settings2 size={10} />{" "}{i18n.t("Zebra Format")}</label>
                 <select 
                    value={zebraFormat}
                    onChange={(e) => setZebraFormat(e.target.value)}
                    className="w-full px-4 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none appearance-none text-teal-600"
                 >
                    <option value="ZPL">{i18n.t("ZPL (Direct)")}</option>
                    <option value="Graphics">{i18n.t("Graphics (BMP)")}</option>
                 </select>
              </div>
            </div>
          </div>

          <button className="w-full py-4 bg-white hover:bg-slate-100 hover:text-teal-600 text-slate-500 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-slate-200 shadow-sm">
            <CheckCircle2 size={16} />{" "}{i18n.t("Print Calibration Test")}</button>
        </div>
      </div>
    </div>
  );
};

export default SettingsHardware;
