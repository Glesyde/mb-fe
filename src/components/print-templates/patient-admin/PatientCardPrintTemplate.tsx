import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { patientService } from '../../../services/patient.service';
import { Loader2, AlertTriangle, Printer } from 'lucide-react';

const PatientCardPrintTemplate: React.FC = () => {
  const { mrn } = useParams<{ mrn: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!mrn) throw new Error("No MRN provided");
        const result = await patientService.getPatientByMrn(mrn);
        if (result) {
          setData(result);
          setTimeout(() => window.print(), 1000);
        } else {
          setError('Patient not found.');
        }
      } catch (err) {
        setError('Could not load patient data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [mrn]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 size={48} className="animate-spin text-[#2d258a]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md">
          <AlertTriangle size={32} className="text-red-600 mx-auto mb-4" />
          <p className="text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  const nok = data?.emergency_contacts?.find((c: any) => c.is_primary === 1) || data?.emergency_contacts?.[0];

  return (
    <div
      className="fixed inset-0 bg-slate-100 overflow-y-auto px-4 py-20 print:static print:bg-white print:p-0 font-sans"
      style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
    >
      <div className="fixed top-0 left-0 right-0 h-16 bg-slate-900 text-white flex items-center justify-between px-8 print:hidden z-[100] shadow-md">
        <p className="font-bold text-sm">Patient ID Card Preview</p>
        <button onClick={() => window.print()} className="bg-[#2d258a] hover:bg-brand-primary text-white px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all">
          <Printer size={16} /> Print Card
        </button>
      </div>

      {/* Wrap cards for printing */}
      <div className="flex flex-col gap-12 print:gap-8 print:page-break-inside-avoid items-center">
        
        {/* FRONT OF CARD */}
        <div className="w-[85.6mm] h-[53.98mm] bg-white rounded-[20px] shadow-2xl overflow-hidden print:shadow-none border border-slate-200 relative transform-gpu hover:scale-105 transition-transform duration-500">
          {/* Top Branding Bar */}
          <div className="absolute top-0 right-0 left-0 h-[18mm] bg-[#3B309A] flex items-center justify-between px-5">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-1.5 shadow-lg border border-white/20">
                    <img src="/assets/login-bg.jpeg" alt="Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                   <h2 className="text-white font-black text-[11px] leading-none uppercase tracking-tighter">Gracespring</h2>
                   <p className="text-brand-active text-[7px] font-black uppercase tracking-[0.15em] mt-0.5">Medical Center</p>
                </div>
             </div>
             <div className="text-right">
                <p className="text-white/40 text-[6px] font-black uppercase tracking-widest">Medical Record No.</p>
                <p className="text-white font-mono text-[11px] font-black tracking-wider">{mrn}</p>
             </div>
          </div>

          {/* Main Content Body */}
          <div className="pt-[18mm] h-full flex p-5 gap-4">
             {/* Photo Placeholder */}
             <div className="w-[22mm] h-[28mm] bg-slate-100 rounded-2xl border-2 border-slate-200 shrink-0 overflow-hidden shadow-inner relative group">
                {data.demographics?.photo_url ? (
                   <img src={data.demographics.photo_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                   <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                      <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center mb-1">
                        <Printer size={16} />
                      </div>
                      <span className="text-[6px] font-black">NO IMAGE</span>
                   </div>
                )}
                <div className="absolute inset-x-0 bottom-0 h-1 bg-[#3B309A]/20"></div>
             </div>

             {/* Bio Info */}
             <div className="flex-1 flex flex-col justify-between py-0.5">
                <div>
                   <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Patient Full Name</p>
                   <p className="text-[12px] font-black text-slate-800 leading-tight uppercase truncate tracking-tight">{data.demographics?.last_name}, {data.demographics?.first_name} {data.demographics?.middle_name}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-auto">
                   <div>
                      <p className="text-[6px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Birth Date</p>
                      <p className="text-[9px] font-bold text-slate-700">{data.demographics?.date_of_birth}</p>
                   </div>
                   <div>
                      <p className="text-[6px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Gender</p>
                      <p className="text-[9px] font-bold text-slate-700">{data.demographics?.gender === 'Male' ? 'MALE' : 'FEMALE'}</p>
                   </div>
                </div>

                <div className="flex items-center gap-3 mt-1.5 pt-1.5 border-t border-slate-100">
                   <div className="flex items-center gap-1">
                      <span className="text-[6px] font-black text-slate-400 uppercase">Blood:</span>
                      <span className="text-[9px] font-black text-rose-600">{data.medical_profile?.blood_group || '--'}</span>
                   </div>
                   <div className="flex items-center gap-1">
                      <span className="text-[6px] font-black text-slate-400 uppercase">Genotype:</span>
                      <span className="text-[9px] font-black text-[#3B309A]">{data.medical_profile?.genotype || '--'}</span>
                   </div>
                </div>
             </div>
          </div>
          
          {/* Accent Decoration */}
          <div className="absolute right-[-10mm] bottom-[-10mm] w-20 h-20 bg-[#3B309A]/5 rounded-full blur-2xl"></div>
        </div>

        {/* BACK OF CARD */}
        <div className="w-[85.6mm] h-[53.98mm] bg-[#1a154d] rounded-[20px] shadow-2xl overflow-hidden print:shadow-none relative p-6 flex flex-col text-white">
           <div className="flex justify-between items-start mb-4">
              <div className="flex gap-1.5">
                 {[1, 2, 3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-brand-active/20"></div>)}
              </div>
              <p className="text-[7px] font-black text-brand-active uppercase tracking-[0.2em]">Safety & Emergency Record</p>
           </div>

           <div className="space-y-4 flex-1">
              {nok?.full_name ? (
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 backdrop-blur-sm">
                   <p className="text-[6px] font-black text-brand-active uppercase tracking-widest mb-1.5">Primary Emergency Contact</p>
                   <div className="flex justify-between items-end">
                      <div>
                         <p className="text-[10px] font-black uppercase truncate max-w-[40mm]">{nok.full_name}</p>
                         <p className="text-[7px] text-white/50 font-bold uppercase mt-0.5">{nok.relationship}</p>
                      </div>
                      <p className="text-[11px] font-black font-mono text-brand-active">{nok.phone}</p>
                   </div>
                </div>
              ) : (
                <div className="h-12 border border-dashed border-white/10 rounded-xl flex items-center justify-center">
                   <p className="text-[7px] text-white/30 uppercase font-black tracking-widest">No Emergency Contact Linked</p>
                </div>
              )}

              <div className="space-y-1.5">
                 <p className="text-[6px] text-white/40 leading-tight uppercase font-medium tracking-tight">
                    This document is property of Gracespring Hospital. If found, please return to any hospital branch or call +234 705 648 2776. Presentation of this card is mandatory for all clinical encounters.
                 </p>
                 <p className="text-[6px] text-brand-active/40 font-black uppercase tracking-widest italic pt-1">Medical Facility Utility Only • Rev 2.1</p>
              </div>
           </div>

           {/* QR / Barcode Mock */}
           <div className="mt-auto flex items-end justify-between">
              <div className="flex flex-col gap-0.5">
                 <p className="text-[5px] text-white/30 uppercase font-black">Authorized Signature</p>
                 <div className="w-24 h-4 border-b border-white/20 italic text-[7px] font-serif text-white/40 pt-1">Medical Admin</div>
              </div>
              <div className="w-24 h-6 bg-white rounded-sm p-1 flex gap-[0.5px]">
                 {[...Array(40)].map((_, i) => (
                    <div key={i} className={`h-full ${Math.random() > 0.5 ? 'bg-slate-900' : 'bg-transparent'}`} style={{ width: `${Math.random() * 2 + 1}px` }}></div>
                 ))}
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};

export default PatientCardPrintTemplate;
