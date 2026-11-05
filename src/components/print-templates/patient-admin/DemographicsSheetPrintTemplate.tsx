import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { patientService } from '../../../services/patient.service';
import { Loader2, AlertTriangle, Printer } from 'lucide-react';

const DemographicsSheetPrintTemplate: React.FC = () => {
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

  const FormField = ({ label, value, colSpan = 1 }: { label: string; value?: string; colSpan?: number }) => (
    <div className={`col-span-${colSpan} mb-3`}>
      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
        {label}
      </p>
      <div className="w-full min-h-[36px] border border-slate-200 bg-slate-50/50 rounded flex items-center px-2 shadow-sm py-1">
        <span className="text-sm font-bold text-slate-800 uppercase">{value || 'N/A'}</span>
      </div>
    </div>
  );

  const SectionHeader = ({ char, title }: { char: string; title: string }) => (
    <div className="w-full bg-[#3B309A] flex items-center mb-5 mt-6 rounded-sm">
      <div className="w-12 h-8 flex items-center justify-center text-white font-extrabold text-sm border-r border-[#4c3fbf]">
        {char}
      </div>
      <div className="pl-4 text-white font-extrabold text-[12px] uppercase tracking-widest">
        {title}
      </div>
    </div>
  );

  const nok = data?.emergency_contacts?.find((c: any) => c.is_primary === 1) || data?.emergency_contacts?.[0];
  const ref = data?.referral || {};
  const consent = data?.disclosure_consent || {};

  return (
    <div
      className="fixed inset-0 bg-slate-100 overflow-y-auto px-4 py-20 print:static print:bg-white print:p-0"
      style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
    >
      <div className="fixed top-0 left-0 right-0 h-16 bg-slate-900 text-white flex items-center justify-between px-8 print:hidden z-[100] shadow-md">
        <p className="font-bold text-sm">Demographics Sheet Preview</p>
        <button onClick={() => window.print()} className="bg-[#2d258a] hover:bg-brand-primary text-white px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all">
          <Printer size={16} /> Print Sheet
        </button>
      </div>

      <div className="w-[210mm] min-h-[297mm] bg-white p-12 shadow-2xl print:shadow-none print:m-0 print:border-none border border-slate-200 mx-auto transform-gpu transition-all">
        {/* Header Block */}
        <div className="w-full bg-[#3B309A] flex items-center p-4 min-h-[28mm]">
          <div className="w-[25%] flex items-center justify-center border-r-[1.5px] border-[#4c3fbf] pr-4 h-full">
            <img src="/assets/login-bg.jpeg" alt="Logo" className="w-[20mm] object-contain" />
          </div>
          <div className="w-[75%] pl-6 flex flex-col justify-center">
            <h1 className="text-white text-3xl font-extrabold leading-none tracking-tight mb-2">Patient Demographics Summary</h1>
            <p className="text-brand-active text-[10px] leading-tight">Complete detailed compilation of patient identity, address, and medical records. Authorized medical utility only.</p>
          </div>
        </div>

        {/* Address Bar */}
        <div className="w-full text-center py-2 border-b border-slate-200 mb-6">
          <p className="text-[8px] text-slate-500 font-medium">Head Office: Plot 3, Block 32, Ajayi Apata Estate, Sangotedo, Lekki, Lagos. &nbsp;•&nbsp; +234 705 648 2776 &nbsp;•&nbsp; info@Medbookiehospital.com</p>
        </div>

        {/* Patient Section */}
        <SectionHeader char="A" title="PERSONAL IDENTITY" />
        <div className="grid grid-cols-4 gap-x-4 mb-2">
          <FormField label="MRN" colSpan={1} value={data.mrn} />
          <FormField label="FIRST NAME" colSpan={1} value={data.demographics?.first_name} />
          <FormField label="MIDDLE NAME" colSpan={1} value={data.demographics?.middle_name} />
          <FormField label="LAST NAME" colSpan={1} value={data.demographics?.last_name} />
          
          <FormField label="DATE OF BIRTH" colSpan={1} value={data.demographics?.date_of_birth} />
          <FormField label="GENDER" colSpan={1} value={data.demographics?.gender} />
          <FormField label="AGE" colSpan={1} value={data.display_age || (data.age ? `${data.age}Y` : 'N/A')} />
          <FormField label="MARITAL STATUS" colSpan={1} value={data.demographics?.marital_status} />
          
          <FormField label="NATIONALITY" colSpan={1} value={data.demographics?.nationality} />
          <FormField label="STATE OF ORIGIN" colSpan={1} value={data.demographics?.state_of_origin} />
          <FormField label="LGA OF ORIGIN" colSpan={2} value={data.demographics?.lga} />
        </div>

        {/* Contact Section */}
        <SectionHeader char="B" title="COMMUNICATIONS & ADDRESS" />
        <div className="grid grid-cols-4 gap-x-4 mb-2">
          <FormField label="MOBILE CONTACT" colSpan={2} value={data.demographics?.phone} />
          <FormField label="EMAIL ADDRESS" colSpan={2} value={data.demographics?.email} />
          <FormField label="RESIDENTIAL ADDRESS" colSpan={4} value={data.demographics?.address} />
        </div>

        {/* Medical Section */}
        <SectionHeader char="C" title="MEDICAL PROFILE" />
        <div className="grid grid-cols-4 gap-x-4 mb-2">
          <FormField label="BLOOD GROUP" colSpan={1} value={data.medical_profile?.blood_group} />
          <FormField label="GENOTYPE" colSpan={1} value={data.medical_profile?.genotype} />
          <FormField label="KNOWN ALLERGIES" colSpan={2} value={data.medical_profile?.known_allergies || 'NONE RECORDED'} />
          <FormField label="CHRONIC CONDITIONS" colSpan={2} value={data.medical_profile?.chronic_conditions || 'NONE RECORDED'} />
          <FormField label="SPECIAL MEDICAL ALERTS" colSpan={2} value={data.medical_profile?.special_alerts || 'NO ACTIVE ALERTS'} />
        </div>

        {/* Payer & Referral Section */}
        <SectionHeader char="D" title="BILLING, INSURANCE & REFERRAL" />
        <div className="grid grid-cols-4 gap-x-4 mb-2">
          <FormField label="PAYER TYPE" colSpan={1} value={data.payer?.payer_type} />
          <FormField label="PAYER / PROVIDER NAME" colSpan={2} value={data.payer?.payer_name} />
          <FormField label="POLICY NUMBER" colSpan={1} value={data.payer?.policy_number} />
          
          <FormField label="REFERRAL CHANNEL" colSpan={1} value={ref.referral_source_id ? `CODE: ${ref.referral_source_id}` : 'WALK_IN'} />
          <FormField label="REFERRING CLINIC / DOCTOR" colSpan={2} value={ref.referring_doctor_name || ref.referring_facility_name} />
          <FormField label="CAMPAIGN CODE" colSpan={1} value={ref.campaign_code} />
        </div>

        {/* Emergency & Next of Kin */}
        <SectionHeader char="E" title="EMERGENCY CONTACT / NEXT OF KIN" />
        <div className="grid grid-cols-4 gap-x-4 mb-2">
          <FormField label="CONTACT FULL NAME" colSpan={2} value={nok?.full_name} />
          <FormField label="RELATIONSHIP" colSpan={1} value={nok?.relationship} />
          <FormField label="PRIMARY PHONE" colSpan={1} value={nok?.phone} />
        </div>

        {/* NDPA Information Sharing Consent */}
        <SectionHeader char="F" title="NDPA INFORMATION SHARING CONSENT" />
        <div className="grid grid-cols-4 gap-x-4 mb-4">
           {/* Disclosure Preferences */}
           <div className="col-span-4 mb-3 border border-slate-200 bg-slate-50/50 rounded p-3">
               <p className="text-[9px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Disclosure Preferences</p>
               <div className="flex flex-wrap gap-4 text-[10px] font-bold text-slate-800">
                    {(consent.pref_do_not_share == 1 || consent.pref_do_not_share === true) && <span>☑ DO NOT SHARE</span>}
                    {(consent.pref_share_listed == 1 || consent.pref_share_listed === true) && <span>☑ SHARE WITH LISTED</span>}
                    {(consent.pref_share_family == 1 || consent.pref_share_family === true) && <span>☑ SHARE WITH FAMILY</span>}
                    {(consent.pref_share_caregiver == 1 || consent.pref_share_caregiver === true) && <span>☑ SHARE WITH CAREGIVER</span>}
                    {(consent.pref_discuss_present == 1 || consent.pref_discuss_present === true) && <span>☑ DISCUSS WHEN PRESENT</span>}
               </div>
           </div>
           
           {/* Authorised Persons */}
           <div className="col-span-4 mb-4">
               <p className="text-[9px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Authorised Persons</p>
               {data.authorized_persons && data.authorized_persons.length > 0 ? data.authorized_persons.map((p: any, i: number) => (
                   <div key={i} className="flex gap-4 text-[10px] font-bold text-slate-800 mb-1 border-b border-slate-100 pb-1">
                       <span className="w-1/3">{i+1}. {p.full_name}</span>
                       <span className="w-1/3">RELATIONSHIP: {p.relationship || 'N/A'}</span>
                       <span className="w-1/3">TEL: {p.phone || 'N/A'}</span>
                   </div>
               )) : <span className="text-[10px] text-slate-400">NONE LISTED</span>}
           </div>

           {/* Signatures */}
           <div className="col-span-2">
               <p className="text-[9px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Patient Signature</p>
               {consent.patient_signature_data ? (
                   <img src={consent.patient_signature_data} className="h-12 object-contain" alt="Patient Signature" />
               ) : <div className="h-12 border-b border-slate-300 w-3/4"></div>}
               <p className="text-[8px] mt-1 font-semibold text-slate-500">Date: {consent.patient_signature_date || '_________'} </p>
           </div>
           
           <div className="col-span-2">
               <p className="text-[9px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Witness / Staff Signature</p>
               {consent.witness_signature_data ? (
                   <img src={consent.witness_signature_data} className="h-12 object-contain" alt="Witness Signature" />
               ) : <div className="h-12 border-b border-slate-300 w-3/4"></div>}
               <p className="text-[8px] mt-1 font-semibold text-slate-500">Date: {consent.witness_signature_date || '_________'} </p>
           </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center border-t border-dashed border-slate-300 pt-4">
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Confidential Medical Document • NDPA 2023 Compliant • Unauthorized Access Prohibited</p>
        </div>
      </div>
    </div>
  );
};

export default DemographicsSheetPrintTemplate;

// import React, { useEffect, useState } from 'react';
// import { useParams } from 'react-router-dom';
// import { patientService } from '../../../services/patient.service';
// import { Loader2, AlertTriangle, Printer, MapPin, Phone, User, Activity, CreditCard } from 'lucide-react';

// const DemographicsSheetPrintTemplate: React.FC = () => {
//   const { mrn } = useParams<{ mrn: string }>();
//   const [data, setData] = useState<any>(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState('');

//   useEffect(() => {
//     const fetchData = async () => {
//       try {
//         if (!mrn) throw new Error("No MRN provided");
//         const result = await patientService.getPatientByMrn(mrn);
//         if (result) {
//           setData(result);
//           setTimeout(() => window.print(), 1000);
//         } else {
//           setError('Patient not found.');
//         }
//       } catch (err) {
//         setError('Could not load patient data.');
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchData();
//   }, [mrn]);

//   if (loading) {
//     return (
//       <div className="flex items-center justify-center min-h-screen bg-slate-50">
//         <Loader2 size={48} className="animate-spin text-[#2d258a]" />
//       </div>
//     );
//   }

//   if (error || !data) {
//     return (
//       <div className="flex items-center justify-center min-h-screen bg-slate-50">
//         <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md">
//           <AlertTriangle size={32} className="text-red-600 mx-auto mb-4" />
//           <p className="text-slate-500">{error}</p>
//         </div>
//       </div>
//     );
//   }

//   const FormField = ({ label, value, colSpan = 1 }: { label: string; value?: string; colSpan?: number }) => (
//     <div className={`col-span-${colSpan} mb-3`}>
//       <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
//         {label}
//       </p>
//       <div className="w-full h-9 border border-slate-200 bg-slate-50/50 rounded flex items-center px-2 shadow-sm">
//         <span className="text-sm font-bold text-slate-800 uppercase">{value || ''}</span>
//       </div>
//     </div>
//   );

//   const SectionHeader = ({ char, title }: { char: string; title: string }) => (
//     <div className="w-full bg-[#3B309A] flex items-center mb-6 mt-8 rounded-sm">
//       <div className="w-12 h-8 flex items-center justify-center text-white font-extrabold text-sm border-r border-[#4c3fbf]">
//         {char}
//       </div>
//       <div className="pl-4 text-white font-extrabold text-[12px] uppercase tracking-widest">
//         {title}
//       </div>
//     </div>
//   );

//   const nok = data?.emergency_contacts?.find((c: any) => c.is_primary === 1) || data?.emergency_contacts?.[0];

//   return (
//     <div
//       className="fixed inset-0 bg-slate-100 overflow-y-auto px-4 py-20 print:static print:bg-white print:p-0"
//       style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
//     >
//       <div className="fixed top-0 left-0 right-0 h-16 bg-slate-900 text-white flex items-center justify-between px-8 print:hidden z-[100] shadow-md">
//         <p className="font-bold text-sm">Demographics Sheet Preview</p>
//         <button onClick={() => window.print()} className="bg-[#2d258a] hover:bg-brand-primary text-white px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all">
//           <Printer size={16} /> Print Sheet
//         </button>
//       </div>

//       <div className="w-[210mm] min-h-[297mm] bg-white p-12 shadow-2xl print:shadow-none print:m-0 print:border-none border border-slate-200 mx-auto transform-gpu transition-all">
//         {/* Header Block */}
//         <div className="w-full bg-[#3B309A] flex items-center p-4 min-h-[28mm]">
//           <div className="w-[25%] flex items-center justify-center border-r-[1.5px] border-[#4c3fbf] pr-4 h-full">
//             <img src="/assets/login-bg.jpeg" alt="Logo" className="w-[20mm] object-contain" />
//           </div>
//           <div className="w-[75%] pl-6 flex flex-col justify-center">
//             <h1 className="text-white text-3xl font-extrabold leading-none tracking-tight mb-2">Patient Demographics Summary</h1>
//             <p className="text-brand-active text-[10px] leading-tight">Complete detailed compilation of patient identity, address, and medical records. Authorized medical utility only.</p>
//           </div>
//         </div>

//         {/* Address Bar */}
//         <div className="w-full text-center py-2 border-b border-slate-200 mb-8">
//           <p className="text-[8px] text-slate-500 font-medium">Head Office: Medbookie Limited Plot 3, Block 32, Ajayi Apata Estate, Sangotedo, Lekki, Lagos, Nigeria Lagos State, Nigeria. &nbsp;•&nbsp; +234 705 648 2776 &nbsp;•&nbsp; info@Medbookiehospital.com</p>
//         </div>

//         {/* Patient Section */}
//         <SectionHeader char="A" title="PERSONAL IDENTITY" />
//         <div className="grid grid-cols-4 gap-x-4 mb-4">
//           <FormField label="FIRST NAME" colSpan={1} value={data.demographics?.first_name} />
//           <FormField label="MIDDLE NAME" colSpan={1} value={data.demographics?.middle_name} />
//           <FormField label="LAST NAME" colSpan={2} value={data.demographics?.last_name} />
          
//           <FormField label="DATE OF BIRTH" colSpan={1} value={data.demographics?.date_of_birth} />
//           <FormField label="GENDER" colSpan={1} value={data.demographics?.gender} />
//           <FormField label="AGE" colSpan={1} value={data.display_age || (data.age ? `${data.age}Y` : 'N/A')} />
//           <FormField label="MARITAL STATUS" colSpan={1} value={data.demographics?.marital_status} />
          
//           <FormField label="NATIONALITY" colSpan={1} value={data.demographics?.nationality} />
//           <FormField label="STATE OF ORIGIN" colSpan={1} value={data.demographics?.state_of_origin} />
//           <FormField label="LGA OF ORIGIN" colSpan={2} value={data.demographics?.lga} />
//         </div>

//         {/* Contact Section */}
//         <SectionHeader char="B" title="COMMUNICATIONS & ADDRESS" />
//         <div className="grid grid-cols-4 gap-x-4 mb-4">
//           <FormField label="MOBILE CONTACT" colSpan={2} value={data.demographics?.phone} />
//           <FormField label="EMAIL ADDRESS" colSpan={2} value={data.demographics?.email} />
//           <FormField label="RESIDENTIAL ADDRESS" colSpan={4} value={data.demographics?.address} />
//         </div>

//         {/* Medical Section */}
//         <SectionHeader char="C" title="MEDICAL PROFILE" />
//         <div className="grid grid-cols-4 gap-x-4 mb-4">
//           <FormField label="BLOOD GROUP" colSpan={1} value={data.medical_profile?.blood_group} />
//           <FormField label="GENOTYPE" colSpan={1} value={data.medical_profile?.genotype} />
//           <FormField label="KNOWN ALLERGIES" colSpan={2} value={data.medical_profile?.known_allergies || 'NONE RECORDED'} />
          
//           <FormField label="CHRONIC CONDITIONS" colSpan={2} value={data.medical_profile?.chronic_conditions || 'NONE RECORDED'} />
//           <FormField label="SPECIAL MEDICAL ALERTS" colSpan={2} value={data.medical_profile?.special_alerts || 'NO ACTIVE ALERTS'} />
//         </div>

//         {/* Payer Section */}
//         <SectionHeader char="D" title="BILLING & INSURANCE" />
//         <div className="grid grid-cols-4 gap-x-4 mb-4">
//           <FormField label="PAYER TYPE" colSpan={1} value={data.payer?.payer_type} />
//           <FormField label="PAYER / PROVIDER NAME" colSpan={2} value={data.payer?.payer_name} />
//           <FormField label="POLICY NUMBER" colSpan={1} value={data.payer?.policy_number || 'N/A'} />
//         </div>

//         {/* Emergency & Next of Kin */}
//         <SectionHeader char="E" title="EMERGENCY CONTACT / NEXT OF KIN" />
//         <div className="grid grid-cols-4 gap-x-4 mb-4">
//           <FormField label="CONTACT FULL NAME" colSpan={2} value={nok?.full_name} />
//           <FormField label="RELATIONSHIP" colSpan={1} value={nok?.relationship} />
//           <FormField label="PRIMARY PHONE" colSpan={1} value={nok?.phone} />
//           <FormField label="CONTACT ADDRESS" colSpan={4} value={nok?.address} />
//         </div>

//         {/* Footer */}
//         <div className="mt-16 text-center border-t-2 border-dashed border-slate-300 pt-6">
//           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Confidential Medical Document • Unauthorized Access Prohibited</p>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default DemographicsSheetPrintTemplate;
