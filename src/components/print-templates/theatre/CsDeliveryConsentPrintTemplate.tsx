import React, { useEffect, useState } from 'react';
import { Loader2, AlertTriangle, Printer } from 'lucide-react';
import { BASE_URL } from "../../../api/client";

interface CsDeliveryConsentPrintTemplateProps {
  formData?: any;
}

const CsDeliveryConsentPrintTemplate: React.FC<CsDeliveryConsentPrintTemplateProps> = ({ formData: propFormData }) => {
  const [formData, setFormData] = useState<any>(propFormData || null);
  const [loading, setLoading] = useState(!propFormData);
  const [error, setError] = useState('');

  useEffect(() => {
    if (propFormData) {
      setFormData(propFormData);
      setLoading(false);
      return;
    }
    setLoading(false);
  }, [propFormData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 size={48} className="animate-spin text-[#7c3aed]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md">
          <AlertTriangle size={32} className="text-red-600 mx-auto mb-4" />
          <p className="text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  // FIX: Properly strip /api or /api/v1 from BASE_URL to point to the public root for uploads
  const getSigUrl = (path: string | undefined | null) => {
    if (!path) return "";
    if (path.startsWith("data:")) return path;
    const normalizedBaseUrl = BASE_URL.replace(/\/api(\/v\d+)?\/?$/, "").replace(/\/$/, "");
    return path.startsWith("/") ? `${normalizedBaseUrl}${path}` : `${normalizedBaseUrl}/${path}`;
  };

  const Checkbox = ({ checked, label }: { checked?: boolean; label?: string }) => (
    <div className="flex items-start gap-2 mb-1">
      <div className={`w-4 h-4 border-2 ${checked ? 'bg-black border-black' : 'border-gray-400 bg-white'} mt-0.5 flex-shrink-0 flex items-center justify-center`}>
        {checked && <span className="text-white text-xs font-bold">✓</span>}
      </div>
      {label && <span className="text-[10px] text-gray-800 leading-tight">{label}</span>}
    </div>
  );

  // FIX: Added 'break-words whitespace-pre-wrap' to ensure long text wraps naturally
  const FormField = ({ label, value, colSpan = 1, underline = false }: { label: string; value?: string; colSpan?: number; underline?: boolean }) => (
    <div className={`col-span-${colSpan} mb-2`}>
      <p className="text-[9px] font-bold text-gray-600 uppercase tracking-wide mb-1">{label}</p>
      {underline ? (
        <div className="border-b border-gray-400 pb-1 min-h-[20px] break-words whitespace-pre-wrap">
          <span className="text-[11px] text-gray-800">{value || ''}</span>
        </div>
      ) : (
        <div className="border border-gray-300 bg-gray-50 px-2 py-1 min-h-[24px] break-words whitespace-pre-wrap">
          <span className="text-[11px] text-gray-800">{value || ''}</span>
        </div>
      )}
    </div>
  );

  const SignatureBlock = ({ title, signature, name, designation, date, time }: { title: string; signature?: string; name?: string; designation?: string; date?: string; time?: string }) => (
    <div className="border border-gray-300 p-3 bg-gray-50 break-inside-avoid">
      <p className="text-[9px] font-bold text-gray-700 uppercase tracking-wide mb-2 text-center">{title}</p>
      <div className="mb-2">
        {signature ? (
          <img src={getSigUrl(signature)} alt="Signature" className="h-12 w-full object-contain" />
        ) : (
          <div className="border-b border-gray-400 h-12"></div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-[8px] text-gray-500 uppercase">Full Name (print)</p>
          <div className="border-b border-gray-400 h-5 mt-1">
            <span className="text-[9px] text-gray-800">{name || ''}</span>
          </div>
        </div>
        <div>
          <p className="text-[8px] text-gray-500 uppercase">Date</p>
          <div className="border-b border-gray-400 h-5 mt-1">
            <span className="text-[9px] text-gray-800">{date || ''}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const data = formData || {};

  return (
    <div
      className="fixed inset-0 bg-slate-100 overflow-y-auto px-4 py-20 print:static print:bg-white print:p-0"
      style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
    >
      <div className="fixed top-0 left-0 right-0 h-16 bg-slate-900 text-white flex items-center justify-between px-8 print:hidden z-[100] shadow-md">
        <p className="font-bold text-sm">Caesarean Section Consent Form Preview</p>
        <button onClick={() => window.print()} className="bg-[#3B309A] hover:bg-brand-primary text-white px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all">
          <Printer size={16} /> Print Form
        </button>
      </div>

      <div className="w-[210mm] bg-white p-8 shadow-2xl print:shadow-none print:m-0 print:border-none border border-slate-200 mx-auto text-[11px]">
        {/* Header */}
        <div className="w-full bg-[#3B309A] flex items-center p-4 min-h-[28mm] mb-1">
          <div className="w-[25%] flex items-center justify-center border-r-[1.5px] border-[#4c3fbf] pr-4 h-full">
            <img src="/assets/login-bg.jpeg" alt="Logo" className="w-[20mm] object-contain" />
          </div>
          <div className="w-[75%] pl-6 flex flex-col justify-center">
            <h1 className="text-white text-2xl font-extrabold leading-none tracking-tight mb-2 uppercase italic">Procedure Consent Form</h1>
            <p className="text-[#bfb8ff] text-[10px] leading-tight font-bold uppercase">Caesarean Section Delivery</p>
            <p className="text-[#bfb8ff]/70 text-[8px] mt-1">Form Ref: GSH-CONSENT-CS-001 • Policy Ref: GSH-T6 • Version 1.0</p>
          </div>
        </div>

        {/* Address Bar */}
        <div className="w-full text-center py-2 border-b border-slate-200 mb-6">
          <p className="text-[8px] text-slate-500 font-medium italic">Head Office: Medbookie Limited Plot 3, Block 32, Ajayi Apata Estate, Sangotedo, Lekki, Lagos, Nigeria Lagos State, Nigeria. &nbsp;•&nbsp; +234 705 648 2776 &nbsp;•&nbsp; info@Medbookiehospital.com</p>
        </div>

        {/* Banner Details */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <FormField label="Type of Caesarean Birth" value={data.planned_type} />
          <FormField label="RCOG Category" value={data.rcog_category} />
        </div>

        {/* Part A */}
        <div className="mb-4">
          <div className="bg-[#3B309A] text-white px-3 py-1 inline-block text-[10px] font-bold uppercase tracking-widest mb-1">Part A — Mother Identification</div>
          <div className="border border-slate-400 p-4 grid grid-cols-4 gap-4">
            <FormField label="Mother's Full Name" value={data.mother_name} colSpan={2} underline />
            <FormField label="Date of Birth" value={data.dob} underline />
            <FormField label="MRN" value={data.mrn} underline />
            <FormField label="Gestation (Weeks)" value={data.gestation} underline />
            <FormField label="Gravida / Para" value={data.gravida_para} underline />
            <FormField label="Blood Group / RH" value={data.blood_group} underline />
            <FormField label="Ward / Unit" value={data.ward} underline />
            <FormField label="Consultant Obstetrician" value={data.consultant} colSpan={2} underline />
            <div className="col-span-4 mt-2">
              <FormField label="Indication for Caesarean Section" value={data.indication_reason} underline />
            </div>
          </div>
        </div>

        {/* Part B & C */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
             <div className="bg-[#334155] text-white px-3 py-1 inline-block text-[10px] font-bold uppercase tracking-widest mb-1">Part B — Procedure (Ring 1)</div>
             <div className="border border-slate-400 p-4 h-[120px]">
               <FormField label="Why a caesarean is recommended" value={data.plain_terms} />
               <Checkbox checked={data.core_understanding} label="The mother understands what a CS is, why it is recommended, and the core risks." />
             </div>
          </div>
          <div>
             <div className="bg-[#334155] text-white px-3 py-1 inline-block text-[10px] font-bold uppercase tracking-widest mb-1">Part C — What to Expect (Ring 4)</div>
             <div className="border border-slate-400 p-4 h-[120px] text-[10px] text-gray-700">
                <p>Before: fasting, IV access, bladder catheter, antacid and antibiotics. Anaesthesia: usually spinal/epidural so you are awake. During: low bikini-line incision, baby delivered, placenta removed. Baby: skin-to-skin and early breastfeeding supported. After: pain relief, clot prevention, early mobilisation.</p>
             </div>
          </div>
        </div>
        <div className="mb-4">
           <div className="bg-[#1e293b] text-white px-3 py-1 inline-block text-[10px] font-bold uppercase tracking-widest mb-1">Part D — Intended Benefits</div>
           <div className="border border-slate-400 p-4">
             <FormField label="Expected outcome for mother and baby" value={data.intended_benefits} />
           </div>
        </div>

        {/* Part E & F */}
        <div className="mb-4">
           <div className="bg-[#be123c] text-white px-3 py-1 inline-block text-[10px] font-bold uppercase tracking-widest mb-1">Part E — Risks & Complications (Ring 2)</div>
           <div className="border border-slate-400">
             <table className="w-full text-left">
               <thead className="bg-slate-100 border-b border-slate-400">
                 <tr>
                   <th className="p-2 text-[9px] font-bold uppercase w-1/4">Frequency</th>
                   <th className="p-2 text-[9px] font-bold uppercase w-1/2">Risk / Complication</th>
                   <th className="p-2 text-[9px] font-bold uppercase w-1/4">Explanation</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-300">
                 <tr>
                   <td className="p-2 text-[9px] font-bold text-[#be123c]">COMMON</td>
                   <td className="p-2 text-[10px]">Persistent wound/abdominal discomfort; infection; bleeding</td>
                   <td className="p-2 text-[9px] text-gray-600">Managed with analgesia, antibiotics and wound care.</td>
                 </tr>
                 <tr>
                   <td className="p-2 text-[9px] font-bold text-[#be123c]">COMMON (baby)</td>
                   <td className="p-2 text-[10px]">Transient fast breathing (tachypnoea)</td>
                   <td className="p-2 text-[9px] text-gray-600">Usually settles; paediatric support available.</td>
                 </tr>
                 <tr>
                   <td className="p-2 text-[9px] font-bold text-[#be123c]">UNCOMMON</td>
                   <td className="p-2 text-[10px]">Heavy bleeding (haemorrhage) needing transfusion/surgery; Blood clots (DVT/PE)</td>
                   <td className="p-2 text-[9px] text-gray-600">Transfusion, surgical measures, clot-prevention.</td>
                 </tr>
                 <tr>
                   <td className="p-2 text-[9px] font-bold text-[#be123c]">RARE</td>
                   <td className="p-2 text-[10px]">Injury to bladder, ureter or bowel; Admission to ICU</td>
                   <td className="p-2 text-[9px] text-gray-600">May require repair and specialist input.</td>
                 </tr>
                 <tr>
                   <td className="p-2 text-[9px] font-bold text-[#be123c]">VERY RARE</td>
                   <td className="p-2 text-[10px]">Emergency hysterectomy as life-saving last resort; death</td>
                   <td className="p-2 text-[9px] text-gray-600">Resuscitation and senior teams available.</td>
                 </tr>
                 <tr>
                   <td className="p-2 text-[9px] font-bold text-[#be123c]">FUTURE PREGNANCY</td>
                   <td className="p-2 text-[10px]">Higher chance of repeat CS, uterine-scar problems, placenta praevia/accreta</td>
                   <td className="p-2 text-[9px] text-gray-600">Relevant to planning future births.</td>
                 </tr>
               </tbody>
             </table>
           </div>
        </div>
         <div className="mb-4">
           <div className="bg-[#ea580c] text-white px-3 py-1 inline-block text-[10px] font-bold uppercase tracking-widest mb-1">Part F — Alternatives to Caesarean Section</div>
           <div className="border border-slate-400 p-4">
             <FormField label="Alternatives discussed with this mother and what happens if no CS is performed" value={data.alternatives_discussed} />
           </div>
        </div>
        <div className="page-break" style={{ pageBreakAfter: 'always' }} />

        {/* Part G */}
        <div className="mb-4">
          <div className="bg-[#475569] text-white px-3 py-1 inline-block text-[10px] font-bold uppercase tracking-widest mb-1">Part G — Individualised Risks & Consented Procedures (Ring 3)</div>
          <div className="border border-slate-400 p-4">
             <FormField label="Risks/factors specific to THIS mother" value={data.individual_risks} />
             <div className="grid grid-cols-3 gap-2 mt-2 mb-2">
               <Checkbox checked={data.procedure_blood} label="Blood transfusion if required" />
               <Checkbox checked={data.procedure_surgery} label="Additional surgery to control bleeding" />
               <Checkbox checked={data.procedure_hysterectomy} label="Hysterectomy as life-saving last resort" />
             </div>
             <FormField label="Procedures the mother does NOT wish carried out under any circumstances" value={data.procedures_declined} />
          </div>
        </div>

        {/* Part H & I */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="bg-[#475569] text-white px-3 py-1 inline-block text-[10px] font-bold uppercase tracking-widest mb-1">Part H — Anaesthesia & Sedation</div>
            <div className="border border-slate-400 p-4">
               <FormField label="Type" value={data.anaesthesia_type} />
            </div>
          </div>
          <div>
            <div className="bg-[#475569] text-white px-3 py-1 inline-block text-[10px] font-bold uppercase tracking-widest mb-1">Part I — Interpretation (if needed)</div>
            <div className="border border-slate-400 p-4">
               <FormField label="Interpreter Name" value={data.interpreter_name} />
               <SignatureBlock title="Interpreter Signature" signature={data.interpreter_signature} date={data.interpreter_date} />
            </div>
          </div>
        </div>

        {/* Part J & K - Signatures */}
        <div className="grid grid-cols-2 gap-4 mb-4">
           <div>
             <div className="bg-[#1e293b] text-white px-3 py-1 inline-block text-[10px] font-bold uppercase tracking-widest mb-1">Part J — Clinician Declaration</div>
             <div className="border border-slate-400 p-4">
                <FormField label="Additional Clinician Notes" value={data.clinician_notes} />
                <SignatureBlock title="Obstetrician Signature" signature={data.obstetrician_signature} name={data.obstetrician_name} />
                <div className="mt-4">
                   <SignatureBlock title="Second Clinician (If Applicable)" signature={data.second_clinician_signature} name={data.second_clinician_name} />
                </div>
             </div>
           </div>
           <div>
             <div className="bg-[#1e293b] text-white px-3 py-1 inline-block text-[10px] font-bold uppercase tracking-widest mb-1">Part K — Mother's Consent</div>
             <div className="border border-slate-400 p-4">
                <Checkbox checked={data.read_understood} label="I have read/understood Parts A to J" />
                <Checkbox checked={data.risks_explained} label="Benefits, risks and alternatives explained" />
                <Checkbox checked={data.individual_risks_accepted} label="I accept the risks described, including individual risks" />
                <Checkbox checked={data.modify_approach} label="Team may modify approach if clinically necessary" />
                <Checkbox checked={data.anaesthesia_consent} label="I consent to the anaesthesia described" />
                <Checkbox checked={data.additional_procedures_ack} label="Additional procedures will only be done if necessary to save my life" />
                <div className="mt-4">
                   <SignatureBlock title="Mother's Signature" signature={data.mother_signature} name={data.mother_name} />
                </div>
                <div className="mt-4">
                   <SignatureBlock title="Witness (if unable to sign)" signature={data.witness_signature} />
                </div>
             </div>
           </div>
        </div>

        <div className="page-break" style={{ pageBreakAfter: 'always' }} />

        {/* Part L */}
        <div className="mb-4">
           <div className="bg-[#dc2626] text-white px-3 py-1 inline-block text-[10px] font-bold uppercase tracking-widest mb-1">Part L — Emergency Authorisation (Mother Unable to Consent)</div>
           <div className="border-2 border-red-500 p-4">
              <FormField label="Clinical situation and why immediate caesarean is in the patient's best interests" value={data.emergency_situation} />
              <div className="grid grid-cols-2 gap-4 mt-2 mb-2">
                 <FormField label="Next of Kin / Rep Name" value={data.nok_name} />
                 <FormField label="Relationship" value={data.nok_relationship} />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                 <SignatureBlock title="Responsible Obstetrician Signature" signature={data.emergency_obstetrician_signature} />
                 <SignatureBlock title="Second Senior Clinician Witness" signature={data.emergency_witness_signature} />
              </div>
           </div>
        </div>

        {/* Part M */}
        <div className="mb-4">
           <div className="bg-[#475569] text-white px-3 py-1 inline-block text-[10px] font-bold uppercase tracking-widest mb-1">Part M — Confirmation & Withdrawal</div>
           <div className="border border-slate-400 p-4 grid grid-cols-2 gap-4">
              <SignatureBlock title="Confirming Clinician Signature (Immediately before operation)" signature={data.confirmation_clinician_signature} />
              <div>
                <FormField label="Withdrawal Notes (If applicable)" value={data.withdrawal_reason} />
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <SignatureBlock title="Mother's Signature (Withdrawal)" signature={data.withdrawal_mother_signature} />
                  <SignatureBlock title="Clinician Acknowledging Withdrawal" signature={data.withdrawal_clinician_signature} />
                </div>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};

export default CsDeliveryConsentPrintTemplate;

// import React, { useEffect, useState } from 'react';
// import { Loader2, AlertTriangle, Printer } from 'lucide-react';
// import { BASE_URL } from "../../../api/client";

// interface CsDeliveryConsentPrintTemplateProps {
//   formData?: any;
// }

// const CsDeliveryConsentPrintTemplate: React.FC<CsDeliveryConsentPrintTemplateProps> = ({ formData: propFormData }) => {
//   const [formData, setFormData] = useState<any>(propFormData || null);
//   const [loading, setLoading] = useState(!propFormData);
//   const [error, setError] = useState('');

//   useEffect(() => {
//     if (propFormData) {
//       setFormData(propFormData);
//       setLoading(false);
//       return;
//     }
//     setLoading(false);
//   }, [propFormData]);

//   if (loading) {
//     return (
//       <div className="flex items-center justify-center min-h-screen bg-slate-50">
//         <Loader2 size={48} className="animate-spin text-[#7c3aed]" />
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="flex items-center justify-center min-h-screen bg-slate-50">
//         <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md">
//           <AlertTriangle size={32} className="text-red-600 mx-auto mb-4" />
//           <p className="text-slate-500">{error}</p>
//         </div>
//       </div>
//     );
//   }

//   const getSigUrl = (path: string | undefined | null) => {
//     if (!path) return "";
//     if (path.startsWith("data:")) return path;
//     const normalizedBaseUrl = BASE_URL.replace(/\/$/, "");
//     return path.startsWith("/") ? `${normalizedBaseUrl}${path}` : `${normalizedBaseUrl}/${path}`;
//   };

//   const Checkbox = ({ checked, label }: { checked?: boolean; label?: string }) => (
//     <div className="flex items-start gap-2 mb-1">
//       <div className={`w-4 h-4 border-2 ${checked ? 'bg-black border-black' : 'border-gray-400 bg-white'} mt-0.5 flex-shrink-0 flex items-center justify-center`}>
//         {checked && <span className="text-white text-xs font-bold">✓</span>}
//       </div>
//       {label && <span className="text-[10px] text-gray-800 leading-tight">{label}</span>}
//     </div>
//   );

//   const FormField = ({ label, value, colSpan = 1, underline = false }: { label: string; value?: string; colSpan?: number; underline?: boolean }) => (
//     <div className={`col-span-${colSpan} mb-2`}>
//       <p className="text-[9px] font-bold text-gray-600 uppercase tracking-wide mb-1">{label}</p>
//       {underline ? (
//         <div className="border-b border-gray-400 pb-1 min-h-[20px]">
//           <span className="text-[11px] text-gray-800">{value || ''}</span>
//         </div>
//       ) : (
//         <div className="border border-gray-300 bg-gray-50 px-2 py-1 min-h-[24px]">
//           <span className="text-[11px] text-gray-800">{value || ''}</span>
//         </div>
//       )}
//     </div>
//   );

//   const SignatureBlock = ({ title, signature, name, designation, date, time }: { title: string; signature?: string; name?: string; designation?: string; date?: string; time?: string }) => (
//     <div className="border border-gray-300 p-3 bg-gray-50">
//       <p className="text-[9px] font-bold text-gray-700 uppercase tracking-wide mb-2 text-center">{title}</p>
//       <div className="mb-2">
//         {signature ? (
//           <img src={getSigUrl(signature)} alt="Signature" className="h-12 w-full object-contain" />
//         ) : (
//           <div className="border-b border-gray-400 h-12"></div>
//         )}
//       </div>
//       <div className="grid grid-cols-2 gap-2">
//         <div>
//           <p className="text-[8px] text-gray-500 uppercase">Full Name (print)</p>
//           <div className="border-b border-gray-400 h-5 mt-1">
//             <span className="text-[9px] text-gray-800">{name || ''}</span>
//           </div>
//         </div>
//         <div>
//           <p className="text-[8px] text-gray-500 uppercase">Date</p>
//           <div className="border-b border-gray-400 h-5 mt-1">
//             <span className="text-[9px] text-gray-800">{date || ''}</span>
//           </div>
//         </div>
//       </div>
//     </div>
//   );

//   const data = formData || {};

//   return (
//     <div
//       className="fixed inset-0 bg-slate-100 overflow-y-auto px-4 py-20 print:static print:bg-white print:p-0"
//       style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
//     >
//       <div className="fixed top-0 left-0 right-0 h-16 bg-slate-900 text-white flex items-center justify-between px-8 print:hidden z-[100] shadow-md">
//         <p className="font-bold text-sm">Caesarean Section Consent Form Preview</p>
//         <button onClick={() => window.print()} className="bg-[#3B309A] hover:bg-brand-primary text-white px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all">
//           <Printer size={16} /> Print Form
//         </button>
//       </div>

//       <div className="w-[210mm] bg-white p-8 shadow-2xl print:shadow-none print:m-0 print:border-none border border-slate-200 mx-auto text-[11px]">
//         {/* Header */}
//         <div className="w-full bg-[#3B309A] flex items-center p-4 min-h-[28mm] mb-1">
//           <div className="w-[25%] flex items-center justify-center border-r-[1.5px] border-[#4c3fbf] pr-4 h-full">
//             <img src="/assets/login-bg.jpeg" alt="Logo" className="w-[20mm] object-contain" />
//           </div>
//           <div className="w-[75%] pl-6 flex flex-col justify-center">
//             <h1 className="text-white text-2xl font-extrabold leading-none tracking-tight mb-2 uppercase italic">Procedure Consent Form</h1>
//             <p className="text-[#bfb8ff] text-[10px] leading-tight font-bold uppercase">Caesarean Section Delivery</p>
//             <p className="text-[#bfb8ff]/70 text-[8px] mt-1">Form Ref: GSH-CONSENT-CS-001 • Policy Ref: GSH-T6 • Version 1.0</p>
//           </div>
//         </div>

//         {/* Address Bar */}
//         <div className="w-full text-center py-2 border-b border-slate-200 mb-6">
//           <p className="text-[8px] text-slate-500 font-medium italic">Head Office: Medbookie Limited Plot 3, Block 32, Ajayi Apata Estate, Sangotedo, Lekki, Lagos, Nigeria Lagos State, Nigeria. &nbsp;•&nbsp; +234 705 648 2776 &nbsp;•&nbsp; info@Medbookiehospital.com</p>
//         </div>

//         {/* Banner Details */}
//         <div className="grid grid-cols-2 gap-4 mb-4">
//           <FormField label="Type of Caesarean Birth" value={data.planned_type} />
//           <FormField label="RCOG Category" value={data.rcog_category} />
//         </div>

//         {/* Part A */}
//         <div className="mb-4">
//           <div className="bg-[#3B309A] text-white px-3 py-1 inline-block text-[10px] font-bold uppercase tracking-widest mb-1">Part A — Mother Identification</div>
//           <div className="border border-slate-400 p-4 grid grid-cols-4 gap-4">
//             <FormField label="Mother's Full Name" value={data.mother_name} colSpan={2} underline />
//             <FormField label="Date of Birth" value={data.dob} underline />
//             <FormField label="MRN" value={data.mrn} underline />
//             <FormField label="Gestation (Weeks)" value={data.gestation} underline />
//             <FormField label="Gravida / Para" value={data.gravida_para} underline />
//             <FormField label="Blood Group / RH" value={data.blood_group} underline />
//             <FormField label="Ward / Unit" value={data.ward} underline />
//             <FormField label="Consultant Obstetrician" value={data.consultant} colSpan={2} underline />
//             <div className="col-span-4 mt-2">
//               <FormField label="Indication for Caesarean Section" value={data.indication_reason} underline />
//             </div>
//           </div>
//         </div>

//         {/* Part B & C */}
//         <div className="grid grid-cols-2 gap-4 mb-4">
//           <div>
//              <div className="bg-[#334155] text-white px-3 py-1 inline-block text-[10px] font-bold uppercase tracking-widest mb-1">Part B — Procedure (Ring 1)</div>
//              <div className="border border-slate-400 p-4 h-[120px]">
//                <FormField label="Why a caesarean is recommended" value={data.plain_terms} />
//                <Checkbox checked={data.core_understanding} label="The mother understands what a CS is, why it is recommended, and the core risks." />
//              </div>
//           </div>
//           <div>
//              <div className="bg-[#334155] text-white px-3 py-1 inline-block text-[10px] font-bold uppercase tracking-widest mb-1">Part C — What to Expect (Ring 4)</div>
//              <div className="border border-slate-400 p-4 h-[120px] text-[10px] text-gray-700">
//                 <p>Before: fasting, IV access, bladder catheter, antacid and antibiotics. Anaesthesia: usually spinal/epidural so you are awake. During: low bikini-line incision, baby delivered, placenta removed. Baby: skin-to-skin and early breastfeeding supported. After: pain relief, clot prevention, early mobilisation.</p>
//              </div>
//           </div>
//         </div>
//         <div className="mb-4">
//            <div className="bg-[#1e293b] text-white px-3 py-1 inline-block text-[10px] font-bold uppercase tracking-widest mb-1">Part D — Intended Benefits</div>
//            <div className="border border-slate-400 p-4">
//              <FormField label="Expected outcome for mother and baby" value={data.intended_benefits} />
//            </div>
//         </div>

//         {/* Part E & F */}
//         <div className="mb-4">
//            <div className="bg-[#be123c] text-white px-3 py-1 inline-block text-[10px] font-bold uppercase tracking-widest mb-1">Part E — Risks & Complications (Ring 2)</div>
//            <div className="border border-slate-400">
//              <table className="w-full text-left">
//                <thead className="bg-slate-100 border-b border-slate-400">
//                  <tr>
//                    <th className="p-2 text-[9px] font-bold uppercase w-1/4">Frequency</th>
//                    <th className="p-2 text-[9px] font-bold uppercase w-1/2">Risk / Complication</th>
//                    <th className="p-2 text-[9px] font-bold uppercase w-1/4">Explanation</th>
//                  </tr>
//                </thead>
//                <tbody className="divide-y divide-slate-300">
//                  <tr>
//                    <td className="p-2 text-[9px] font-bold text-[#be123c]">COMMON</td>
//                    <td className="p-2 text-[10px]">Persistent wound/abdominal discomfort; infection; bleeding</td>
//                    <td className="p-2 text-[9px] text-gray-600">Managed with analgesia, antibiotics and wound care.</td>
//                  </tr>
//                  <tr>
//                    <td className="p-2 text-[9px] font-bold text-[#be123c]">COMMON (baby)</td>
//                    <td className="p-2 text-[10px]">Transient fast breathing (tachypnoea)</td>
//                    <td className="p-2 text-[9px] text-gray-600">Usually settles; paediatric support available.</td>
//                  </tr>
//                  <tr>
//                    <td className="p-2 text-[9px] font-bold text-[#be123c]">UNCOMMON</td>
//                    <td className="p-2 text-[10px]">Heavy bleeding (haemorrhage) needing transfusion/surgery; Blood clots (DVT/PE)</td>
//                    <td className="p-2 text-[9px] text-gray-600">Transfusion, surgical measures, clot-prevention.</td>
//                  </tr>
//                  <tr>
//                    <td className="p-2 text-[9px] font-bold text-[#be123c]">RARE</td>
//                    <td className="p-2 text-[10px]">Injury to bladder, ureter or bowel; Admission to ICU</td>
//                    <td className="p-2 text-[9px] text-gray-600">May require repair and specialist input.</td>
//                  </tr>
//                  <tr>
//                    <td className="p-2 text-[9px] font-bold text-[#be123c]">VERY RARE</td>
//                    <td className="p-2 text-[10px]">Emergency hysterectomy as life-saving last resort; death</td>
//                    <td className="p-2 text-[9px] text-gray-600">Resuscitation and senior teams available.</td>
//                  </tr>
//                  <tr>
//                    <td className="p-2 text-[9px] font-bold text-[#be123c]">FUTURE PREGNANCY</td>
//                    <td className="p-2 text-[10px]">Higher chance of repeat CS, uterine-scar problems, placenta praevia/accreta</td>
//                    <td className="p-2 text-[9px] text-gray-600">Relevant to planning future births.</td>
//                  </tr>
//                </tbody>
//              </table>
//            </div>
//         </div>
//          <div className="mb-4">
//            <div className="bg-[#ea580c] text-white px-3 py-1 inline-block text-[10px] font-bold uppercase tracking-widest mb-1">Part F — Alternatives to Caesarean Section</div>
//            <div className="border border-slate-400 p-4">
//              <FormField label="Alternatives discussed with this mother and what happens if no CS is performed" value={data.alternatives_discussed} />
//            </div>
//         </div>
//         <div className="page-break" style={{ pageBreakAfter: 'always' }} />

//         {/* Part G */}
//         <div className="mb-4">
//           <div className="bg-[#475569] text-white px-3 py-1 inline-block text-[10px] font-bold uppercase tracking-widest mb-1">Part G — Individualised Risks & Consented Procedures (Ring 3)</div>
//           <div className="border border-slate-400 p-4">
//              <FormField label="Risks/factors specific to THIS mother" value={data.individual_risks} />
//              <div className="grid grid-cols-3 gap-2 mt-2 mb-2">
//                <Checkbox checked={data.procedure_blood} label="Blood transfusion if required" />
//                <Checkbox checked={data.procedure_surgery} label="Additional surgery to control bleeding" />
//                <Checkbox checked={data.procedure_hysterectomy} label="Hysterectomy as life-saving last resort" />
//              </div>
//              <FormField label="Procedures the mother does NOT wish carried out under any circumstances" value={data.procedures_declined} />
//           </div>
//         </div>

//         {/* Part H & I */}
//         <div className="grid grid-cols-2 gap-4 mb-4">
//           <div>
//             <div className="bg-[#475569] text-white px-3 py-1 inline-block text-[10px] font-bold uppercase tracking-widest mb-1">Part H — Anaesthesia & Sedation</div>
//             <div className="border border-slate-400 p-4">
//                <FormField label="Type" value={data.anaesthesia_type} />
//             </div>
//           </div>
//           <div>
//             <div className="bg-[#475569] text-white px-3 py-1 inline-block text-[10px] font-bold uppercase tracking-widest mb-1">Part I — Interpretation (if needed)</div>
//             <div className="border border-slate-400 p-4">
//                <FormField label="Interpreter Name" value={data.interpreter_name} />
//                <SignatureBlock title="Interpreter Signature" signature={data.interpreter_signature} date={data.interpreter_date} />
//             </div>
//           </div>
//         </div>

//         {/* Part J & K - Signatures */}
//         <div className="grid grid-cols-2 gap-4 mb-4">
//            <div>
//              <div className="bg-[#1e293b] text-white px-3 py-1 inline-block text-[10px] font-bold uppercase tracking-widest mb-1">Part J — Clinician Declaration</div>
//              <div className="border border-slate-400 p-4">
//                 <FormField label="Additional Clinician Notes" value={data.clinician_notes} />
//                 <SignatureBlock title="Obstetrician Signature" signature={data.obstetrician_signature} name={data.obstetrician_name} />
//                 <div className="mt-4">
//                    <SignatureBlock title="Second Clinician (If Applicable)" signature={data.second_clinician_signature} name={data.second_clinician_name} />
//                 </div>
//              </div>
//            </div>
//            <div>
//              <div className="bg-[#1e293b] text-white px-3 py-1 inline-block text-[10px] font-bold uppercase tracking-widest mb-1">Part K — Mother's Consent</div>
//              <div className="border border-slate-400 p-4">
//                 <Checkbox checked={data.read_understood} label="I have read/understood Parts A to J" />
//                 <Checkbox checked={data.risks_explained} label="Benefits, risks and alternatives explained" />
//                 <Checkbox checked={data.individual_risks_accepted} label="I accept the risks described, including individual risks" />
//                 <Checkbox checked={data.modify_approach} label="Team may modify approach if clinically necessary" />
//                 <Checkbox checked={data.anaesthesia_consent} label="I consent to the anaesthesia described" />
//                 <Checkbox checked={data.additional_procedures_ack} label="Additional procedures will only be done if necessary to save my life" />
//                 <div className="mt-4">
//                    <SignatureBlock title="Mother's Signature" signature={data.mother_signature} name={data.mother_name} />
//                 </div>
//                 <div className="mt-4">
//                    <SignatureBlock title="Witness (if unable to sign)" signature={data.witness_signature} />
//                 </div>
//              </div>
//            </div>
//         </div>

//         <div className="page-break" style={{ pageBreakAfter: 'always' }} />

//         {/* Part L */}
//         <div className="mb-4">
//            <div className="bg-[#dc2626] text-white px-3 py-1 inline-block text-[10px] font-bold uppercase tracking-widest mb-1">Part L — Emergency Authorisation (Mother Unable to Consent)</div>
//            <div className="border-2 border-red-500 p-4">
//               <FormField label="Clinical situation and why immediate caesarean is in the patient's best interests" value={data.emergency_situation} />
//               <div className="grid grid-cols-2 gap-4 mt-2 mb-2">
//                  <FormField label="Next of Kin / Rep Name" value={data.nok_name} />
//                  <FormField label="Relationship" value={data.nok_relationship} />
//               </div>
//               <div className="grid grid-cols-2 gap-4 mt-4">
//                  <SignatureBlock title="Responsible Obstetrician Signature" signature={data.emergency_obstetrician_signature} />
//                  <SignatureBlock title="Second Senior Clinician Witness" signature={data.emergency_witness_signature} />
//               </div>
//            </div>
//         </div>

//         {/* Part M */}
//         <div className="mb-4">
//            <div className="bg-[#475569] text-white px-3 py-1 inline-block text-[10px] font-bold uppercase tracking-widest mb-1">Part M — Confirmation & Withdrawal</div>
//            <div className="border border-slate-400 p-4 grid grid-cols-2 gap-4">
//               <SignatureBlock title="Confirming Clinician Signature (Immediately before operation)" signature={data.confirmation_clinician_signature} />
//               <div>
//                 <FormField label="Withdrawal Notes (If applicable)" value={data.withdrawal_reason} />
//                 <div className="mt-2 grid grid-cols-2 gap-2">
//                   <SignatureBlock title="Mother's Signature (Withdrawal)" signature={data.withdrawal_mother_signature} />
//                   <SignatureBlock title="Clinician Acknowledging Withdrawal" signature={data.withdrawal_clinician_signature} />
//                 </div>
//               </div>
//            </div>
//         </div>

//       </div>
//     </div>
//   );
// };

// export default CsDeliveryConsentPrintTemplate;
