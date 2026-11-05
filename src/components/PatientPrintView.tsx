import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { patientService } from '../services/patient.service';
import PrintTemplate from './PrintTemplate';
import { Loader2, AlertTriangle, Printer, User, Phone, MapPin, ShieldCheck, Calendar, Droplets } from 'lucide-react';

const PatientPrintView: React.FC = () => {
  const { mrn } = useParams<{ mrn: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!mrn) return;
      try {
        const result = await patientService.getPatientByMrn(mrn);
        if (result) {
            setData(result);
            setTimeout(() => {
               window.print();
            }, 1000);
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
        <Loader2 size={48} className="animate-spin text-[#3B309A]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
         <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md">
            <AlertTriangle size={32} className="text-red-600 mx-auto mb-4" />
            <p className="text-slate-500">{error || 'Data unavailable.'}</p>
         </div>
      </div>
    );
  }

  const FormField = ({ label, value, colSpan = 1 }: { label: string; value?: string; colSpan?: number }) => (
    <div className={`col-span-${colSpan} mb-3`}>
      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
        {label}
      </p>
      <div className="w-full h-9 border border-slate-200 bg-slate-50/50 rounded flex items-center px-2 shadow-sm">
        <span className="text-sm font-bold text-slate-800 uppercase">{value || ''}</span>
      </div>
    </div>
  );

  const SectionHeader = ({ char, title }: { char: string; title: string }) => (
    <div className="w-full bg-[#3B309A] flex items-center mb-6 mt-8 rounded-sm">
      <div className="w-12 h-8 flex items-center justify-center text-white font-extrabold text-sm border-r border-[#4c3fbf]">
        {char}
      </div>
      <div className="pl-4 text-white font-extrabold text-[12px] uppercase tracking-widest">
        {title}
      </div>
    </div>
  );

  return (
    <div className="bg-slate-100 min-h-screen w-full overflow-y-auto print:bg-white print:h-auto print:overflow-visible">
      <div className="fixed top-0 left-0 right-0 h-16 bg-slate-900 text-white flex items-center justify-between px-8 print:hidden z-50 shadow-md">
         <p className="font-bold text-sm">Patient Summary Preview</p>
         <button onClick={() => window.print()} className="bg-[#3B309A] hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all">
           <Printer size={16} /> Print Now
         </button>
      </div>

      <div className="pt-20 pb-10 print:pt-0 print:pb-0">
        <div className="w-[210mm] min-h-[297mm] bg-white p-12 shadow-2xl print:shadow-none print:m-0 print:border-none border border-slate-200 mx-auto transform-gpu transition-all">
          {/* Header Block */}
          <div className="w-full bg-[#3B309A] flex items-center p-4 min-h-[28mm]">
            <div className="w-[25%] flex items-center justify-center border-r-[1.5px] border-[#4c3fbf] pr-4 h-full">
              <img src="/assets/login-bg.jpeg" alt="Logo" className="w-[20mm] object-contain" />
            </div>
            <div className="w-[75%] pl-6 flex flex-col justify-center">
              <h1 className="text-white text-3xl font-extrabold leading-none tracking-tight mb-2 uppercase">Patient Registration Summary</h1>
              <p className="text-brand-active text-[10px] leading-tight">Patient identity profile and enrollment data summary. Authorized medical record utility only.</p>
            </div>
          </div>

          {/* Address Bar */}
          <div className="w-full text-center py-2 border-b border-slate-200 mb-8">
            <p className="text-[8px] text-slate-500 font-medium">Head Office: Gracespring Hospitals Limited Plot 3, Block 32, Ajayi Apata Estate, Sangotedo, Lekki, Lagos, Nigeria Lagos State, Nigeria. &nbsp;•&nbsp; +234 705 648 2776 &nbsp;•&nbsp; info@gracespringhospital.com</p>
          </div>

          {/* Patient Identity */}
          <SectionHeader char="A" title="PATIENT IDENTITY" />
          <div className="flex gap-6 mb-4">
             <div className="w-32 h-40 bg-slate-100 rounded-xl border border-slate-200 shrink-0 overflow-hidden shadow-sm">
                {data.demographics?.photo_url ? (
                  <img src={data.demographics.photo_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-50">
                    <User size={48} />
                  </div>
                )}
             </div>
             <div className="flex-1 grid grid-cols-3 gap-x-4">
                <FormField label="FIRST NAME" colSpan={1} value={data.demographics?.first_name} />
                <FormField label="MIDDLE NAME" colSpan={1} value={data.demographics?.middle_name} />
                <FormField label="LAST NAME" colSpan={1} value={data.demographics?.last_name} />
                
                <FormField label="MRN" colSpan={1} value={data.mrn} />
                <FormField label="GENDER" colSpan={1} value={data.demographics?.gender} />
                <FormField label="DATE OF BIRTH" colSpan={1} value={data.demographics?.date_of_birth} />
                
                <FormField label="PHONE NUMBER" colSpan={1} value={data.demographics?.phone} />
                <FormField label="EMAIL ADDRESS" colSpan={2} value={data.demographics?.email} />
             </div>
          </div>

          {/* Location & Contact */}
          <SectionHeader char="B" title="COMMUNICATION & ORIGIN" />
          <div className="grid grid-cols-4 gap-x-4 mb-4">
             <FormField label="NATIONALITY" colSpan={1} value={data.demographics?.nationality} />
             <FormField label="STATE OF ORIGIN" colSpan={1} value={data.demographics?.state_of_origin} />
             <FormField label="LGA OF ORIGIN" colSpan={2} value={data.demographics?.lga} />
             <FormField label="RESIDENTIAL ADDRESS" colSpan={4} value={data.demographics?.address} />
          </div>

          {/* Medical & Payer */}
          <SectionHeader char="C" title="MEDICAL PROFILE & BILLING" />
          <div className="grid grid-cols-4 gap-x-4 mb-4">
             <FormField label="BLOOD GROUP" colSpan={1} value={data.medical_profile?.blood_group} />
             <FormField label="GENOTYPE" colSpan={1} value={data.medical_profile?.genotype} />
             <FormField label="KNOWN ALLERGIES" colSpan={2} value={data.medical_profile?.known_allergies || 'NONE'} />
             
             <FormField label="PAYER TYPE" colSpan={1} value={data.payer?.payer_type} />
             <FormField label="PAYER NAME" colSpan={2} value={data.payer?.payer_name} />
             <FormField label="POLICY NO" colSpan={1} value={data.payer?.policy_number || 'N/A'} />
          </div>

          {/* Emergency Contact */}
          <SectionHeader char="D" title="EMERGENCY CONTACT" />
          {data.emergency_contacts?.[0] ? (
            <div className="grid grid-cols-4 gap-x-4 mb-4">
               <FormField label="FULL NAME" colSpan={2} value={data.emergency_contacts[0].full_name} />
               <FormField label="RELATIONSHIP" colSpan={1} value={data.emergency_contacts[0].relationship} />
               <FormField label="PHONE" colSpan={1} value={data.emergency_contacts[0].phone} />
               <FormField label="ADDRESS" colSpan={4} value={data.emergency_contacts[0].address} />
            </div>
          ) : (
            <div className="p-4 border border-dashed border-slate-200 rounded text-center text-slate-400 text-xs font-bold uppercase tracking-widest">No Emergency Contact Data Available</div>
          )}

          {/* Footer */}
          <div className="mt-auto pt-16 text-center border-t border-slate-200">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Confidential Medical Summary • Gracespring Hospital • {new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientPrintView;
