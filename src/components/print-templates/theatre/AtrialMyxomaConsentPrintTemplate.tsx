import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, AlertTriangle, Printer } from 'lucide-react';
import { BASE_URL } from "../../../api/client";

interface AtrialMyxomaConsentPrintTemplateProps {
  formData?: any;
}

const AtrialMyxomaConsentPrintTemplate: React.FC<AtrialMyxomaConsentPrintTemplateProps> = ({ formData: propFormData }) => {
  const { orderId } = useParams<{ orderId: string }>();
  const [formData, setFormData] = useState<any>(propFormData || null);
  const [loading, setLoading] = useState(!propFormData);
  const [error, setError] = useState('');

  useEffect(() => {
    if (propFormData) {
      setFormData(propFormData);
      setLoading(false);
    }
  }, [propFormData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 size={48} className="animate-spin text-[#1e40af]" />
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
          <p className="text-[8px] text-gray-500 uppercase">Name (print)</p>
          <div className="border-b border-gray-400 h-5 mt-1">
            <span className="text-[9px] text-gray-800">{name || ''}</span>
          </div>
        </div>
        <div>
          <p className="text-[8px] text-gray-500 uppercase">Designation/Role</p>
          <div className="border-b border-gray-400 h-5 mt-1">
            <span className="text-[9px] text-gray-800">{designation || ''}</span>
          </div>
        </div>
        <div className="col-span-2 grid grid-cols-2 gap-2">
            <div>
                <p className="text-[8px] text-gray-500 uppercase">Date</p>
                <div className="border-b border-gray-400 h-5 mt-1">
                <span className="text-[9px] text-gray-800">{date || ''}</span>
                </div>
            </div>
            <div>
                <p className="text-[8px] text-gray-500 uppercase">Time</p>
                <div className="border-b border-gray-400 h-5 mt-1">
                <span className="text-[9px] text-gray-800">{time || ''}</span>
                </div>
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
        <p className="font-bold text-sm">Atrial Myxoma Excision Preview</p>
        <button onClick={() => window.print()} className="bg-[#1e40af] hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all">
          <Printer size={16} /> Print Form
        </button>
      </div>

      <div className="w-[210mm] bg-white p-8 shadow-2xl print:shadow-none print:m-0 print:border-none border border-slate-200 mx-auto text-[11px]">
        {/* Header */}
        <div className="w-full bg-[#1e40af] flex items-center p-4 min-h-[28mm] mb-1">
          <div className="w-[25%] flex items-center justify-center border-r-[1.5px] border-[#3b82f6] pr-4 h-full">
            <img src="/assets/login-bg.jpeg" alt="Logo" className="w-[20mm] object-contain" />
          </div>
          <div className="w-[75%] pl-6 flex flex-col justify-center">
            <h1 className="text-white text-2xl font-extrabold leading-none tracking-tight mb-2 uppercase italic">Procedure Consent Form</h1>
            <p className="text-[#bfdbfe] text-[10px] leading-tight font-bold uppercase">Surgical Removal of Atrial Myxoma</p>
            <p className="text-[#bfdbfe]/80 text-[8px] mt-1">Form Ref: GSH-CONSENT-MYX-001 • Policy Ref: GSH-T6</p>
          </div>
        </div>

        {/* Introduction */}
        <div className="border border-gray-300 p-4 mb-4 bg-blue-50/50 rounded-sm italic">
          <p className="text-[10px] font-bold text-gray-700 uppercase tracking-wide mb-1">Patient Rights</p>
          <p className="text-[9px] text-gray-600 leading-relaxed mb-2">
            You have the right to make decisions about your medical care and to refuse any procedure. If you wish to withdraw consent at any time before the procedure begins, you may do so. Signing this form does not remove your legal rights. This form complies with the National Health Act 2014 (Nigeria) and Gracespring Hospitals Consent Policy (GSH-T6).
          </p>
          <p className="text-[10px] font-bold text-gray-700 uppercase tracking-wide mb-1 mt-3">About this operation</p>
          <p className="text-[9px] text-gray-600 leading-relaxed">
            Surgical removal of a myxoma — a non-cancerous (benign) tumour growing inside an upper chamber of the heart (an atrium) — using open-heart surgery with the heart–lung (cardiopulmonary bypass) machine. A myxoma can shed fragments that travel in the blood (embolism) and can obstruct a heart valve; removal is the recommended treatment.
          </p>
        </div>

        {/* Site of Tumour */}
        <div className="mb-6 border border-gray-300 p-4">
          <p className="text-[10px] font-bold text-gray-700 uppercase tracking-wide mb-3">Site of Tumour</p>
          <div className="flex gap-6 mb-3">
            <Checkbox checked={data.tumour_site === 'LEFT atrium'} label="LEFT atrium" />
            <Checkbox checked={data.tumour_site === 'RIGHT atrium'} label="RIGHT atrium" />
            <div className="flex items-center gap-2">
              <Checkbox checked={data.tumour_site === 'Other'} label="Other:" />
              {data.tumour_site === 'Other' && <span className="border-b border-gray-400 w-32 inline-block px-1">{data.tumour_site_other}</span>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <FormField label="Attachment site (e.g. atrial septum, valve, wall)" value={data.attachment_site} underline />
            <FormField label="Approx. size / mobility / obstruction noted" value={data.approx_size} underline />
          </div>
        </div>

        {/* Part A - Patient ID */}
        <div className="mb-6">
          <div className="bg-[#1e40af] text-white px-3 py-2 flex items-center mb-3">
            <span className="font-bold text-sm mr-3">A</span>
            <span className="font-bold text-xs uppercase tracking-wide">Patient Identification</span>
          </div>
          <div className="border border-gray-300 p-4 grid grid-cols-4 gap-3">
            <FormField label="Patient Full Name" value={data.patient_name || data.patient_full_name} colSpan={2} />
            <FormField label="Date of Birth" value={data.dob} colSpan={1} />
            <FormField label="MRN" value={data.mrn} colSpan={1} />
            <FormField label="Age / Sex" value={data.age_sex} colSpan={1} />
            <FormField label="Consultant / Surgeon" value={data.responsible_surgeon || data.consultant} colSpan={1} />
            <FormField label="Ward / Unit" value={data.ward_unit || data.ward} colSpan={1} />
            <FormField label="Anaesthetist" value={data.anaesthetist} colSpan={1} />
            <FormField label="Planned Date of Surgery" value={data.planned_surgery_date} colSpan={1} />
            <FormField label="Primary Diagnosis / Indication" value={data.primary_diagnosis} colSpan={3} underline />
          </div>
        </div>

        {/* Part B & C */}
        <div className="mb-6 grid grid-cols-2 gap-4">
          <div>
            <div className="bg-[#334155] text-white px-3 py-2 flex items-center mb-3">
              <span className="font-bold text-sm mr-3">B</span>
              <span className="font-bold text-xs uppercase tracking-wide">Procedure Description</span>
            </div>
            <div className="border border-gray-300 p-4 h-[240px] flex flex-col">
              <p className="text-[8px] text-gray-700 leading-tight mb-2"><span className="font-bold">WHAT IT INVOLVES:</span> The myxoma is removed through open-heart surgery. A left atrial tumour is usually reached through the right atrium and the atrial septum. The tumour is removed whole with its stalk/base to reduce recurrence.</p>
              <p className="text-[8px] text-gray-700 leading-tight mb-2"><span className="font-bold">HOW IT IS PERFORMED:</span> General anaesthetic; median sternotomy. The heart is stopped and blood circulated by the cardiopulmonary bypass machine. The atrium is opened, tumour excised, nearby heart valve inspected, and any septal defect closed with a patch.</p>
              <div className="mt-auto">
                <FormField label="Surgeon's notes on this patient's tumour" value={data.surgeons_notes} colSpan={1} underline />
              </div>
            </div>
          </div>
          <div>
            <div className="bg-[#334155] text-white px-3 py-2 flex items-center mb-3">
              <span className="font-bold text-sm mr-3">C</span>
              <span className="font-bold text-xs uppercase tracking-wide">Intended Benefits</span>
            </div>
            <div className="border border-gray-300 p-4 h-[240px] flex flex-col">
              <p className="text-[9px] text-gray-700 leading-relaxed mb-3">Removing the myxoma eliminates the source of fragments that can travel to the brain (stroke), limbs or organs, relieves or prevents obstruction of the nearby heart valve, and removes the risk of sudden death from the tumour. It establishes the diagnosis on laboratory examination.</p>
              <div className="mt-auto">
                <FormField label="Specific goals / expected outcome discussed" value={data.specific_goals} colSpan={1} underline />
              </div>
            </div>
          </div>
        </div>

        {/* Part D - Risks */}
        <div className="mb-6 page-break-before">
          <div className="bg-[#be123c] text-white px-3 py-2 flex items-center mb-3">
            <span className="font-bold text-sm mr-3">D</span>
            <span className="font-bold text-xs uppercase tracking-wide">Risks & Complications</span>
          </div>
          <div className="border border-gray-300 p-4">
            <table className="w-full text-[8.5px] mb-4">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-300">
                  <th className="text-left py-1.5 px-2 font-bold text-gray-700 w-1/4">FREQUENCY</th>
                  <th className="text-left py-1.5 px-2 font-bold text-gray-700">COMPLICATION</th>
                  <th className="text-left py-1.5 px-2 font-bold text-gray-700 w-1/3">MANAGEMENT</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="py-1.5 px-2 font-semibold">COMMON</td>
                  <td className="py-1.5 px-2">Irregular heartbeat; chest/wound discomfort; pericardial fluid.</td>
                  <td className="py-1.5 px-2">Usually managed with medicine / routine care.</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-1.5 px-2 font-semibold">COMMON</td>
                  <td className="py-1.5 px-2">Temporary confusion or poor concentration after bypass.</td>
                  <td className="py-1.5 px-2">Usually settles; occasionally longer-lasting.</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-1.5 px-2 font-semibold">UNCOMMON</td>
                  <td className="py-1.5 px-2">Bleeding needing transfusion or return to theatre.</td>
                  <td className="py-1.5 px-2">Managed by transfusion or re-operation.</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-1.5 px-2 font-semibold">UNCOMMON</td>
                  <td className="py-1.5 px-2">Heart block needing temporary pacing or permanent pacemaker.</td>
                  <td className="py-1.5 px-2">Pacing wires placed at surgery; pacemaker if persistent.</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-1.5 px-2 font-semibold text-[#be123c]">RARE</td>
                  <td className="py-1.5 px-2">Stroke or embolism — fragments of tumour or clot.</td>
                  <td className="py-1.5 px-2">May be permanent; specialist care needed.</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-1.5 px-2 font-semibold text-[#be123c]">RARE</td>
                  <td className="py-1.5 px-2">Injury to a nearby heart valve needing repair or replacement.</td>
                  <td className="py-1.5 px-2">Repaired or replaced at surgery.</td>
                </tr>
                <tr>
                  <td className="py-1.5 px-2 font-semibold text-[#be123c]">VERY RARE</td>
                  <td className="py-1.5 px-2">Life-threatening complication or death.</td>
                  <td className="py-1.5 px-2">Mitigated by specialist care.</td>
                </tr>
              </tbody>
            </table>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Figures discussed with patient (e.g. overall risk of death/stroke)" value={data.figures_discussed} underline />
              <FormField label="Risks specific to THIS patient (comorbidities, etc.)" value={data.specific_risks} underline />
            </div>
          </div>
        </div>

        {/* Part F & G - Patch and Valve */}
        <div className="mb-6 grid grid-cols-2 gap-4">
          <div>
            <div className="bg-[#475569] text-white px-3 py-2 flex items-center mb-3">
              <span className="font-bold text-sm mr-3">F</span>
              <span className="font-bold text-xs uppercase tracking-wide">Heart Wall Patch</span>
            </div>
            <div className="border border-gray-300 p-4 h-full">
              <p className="text-[8.5px] text-gray-700 mb-3">Removing the tumour may leave a hole. The surgeon plans to close it with a patch.</p>
              <div className="space-y-2">
                <Checkbox checked={data.patch_consent?.includes('PERICARDIAL PATCH') || data.patch_consent === 'A'} label="A - PERICARDIAL PATCH (planned). Your own tissue." />
                <Checkbox checked={data.patch_consent?.includes('PROSTHETIC PATCH') || data.patch_consent === 'B'} label="B - PROSTHETIC PATCH (only if needed). Man-made." />
                <Checkbox checked={data.patch_consent?.includes('do NOT agree') || data.patch_consent === 'C'} label="C - I do NOT agree to a prosthetic patch." />
              </div>
            </div>
          </div>
          <div>
            <div className="bg-[#475569] text-white px-3 py-2 flex items-center mb-3">
              <span className="font-bold text-sm mr-3">G</span>
              <span className="font-bold text-xs uppercase tracking-wide">Heart Valve Action</span>
            </div>
            <div className="border border-gray-300 p-4 h-full">
              <div className="space-y-2">
                <Checkbox checked={data.valve_repair_consent} label="D - I consent to REPAIR of the heart valve if damage is found." />
                <Checkbox checked={data.valve_replacement_consent} label="E - I consent to valve REPLACEMENT if repair is not possible." />
                {data.valve_replacement_consent && (
                  <div className="pl-6 flex gap-3 my-2">
                    <span className="text-[9px] font-bold">Type:</span>
                    <Checkbox checked={data.preferred_valve_type === 'Mechanical'} label="Mechanical" />
                    <Checkbox checked={data.preferred_valve_type === 'Tissue (biological)'} label="Tissue" />
                    <Checkbox checked={data.preferred_valve_type === 'Leave to surgeon'} label="Leave to surgeon" />
                  </div>
                )}
                <Checkbox checked={data.no_valve_replacement_consent} label="F - I do NOT consent to valve replacement." />
              </div>
            </div>
          </div>
        </div>

        {/* Part H - Other Procedures */}
        <div className="mb-6">
          <div className="bg-[#ea580c] text-white px-3 py-2 flex items-center mb-3">
            <span className="font-bold text-sm mr-3">H</span>
            <span className="font-bold text-xs uppercase tracking-wide">Other Procedures That May Become Necessary</span>
          </div>
          <div className="border border-gray-300 p-4 grid grid-cols-2 gap-2">
            <Checkbox checked={data.cabg_consent} label="G - Coronary artery bypass graft (CABG)" />
            <Checkbox checked={data.pacing_wires_consent} label="H - Temporary pacing wires / permanent pacemaker" />
            <Checkbox checked={data.return_to_theatre_consent} label="I - Return to theatre to treat bleeding or leak" />
            <Checkbox checked={data.emergency_bypass_consent} label="J - Femoral cannulation or emergency bypass" />
          </div>
        </div>

        {/* Clinician Declaration & Patient Consent */}
        <div className="mb-6 page-break-before">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="bg-[#1e40af] text-white px-3 py-2 flex items-center mb-3">
                <span className="font-bold text-sm mr-3">L</span>
                <span className="font-bold text-xs uppercase tracking-wide">Clinician Declaration</span>
              </div>
              <div className="border border-gray-300 p-4">
                <SignatureBlock 
                  title="Consenting Clinician (Surgeon)"
                  signature={data.surgeon_signature}
                  name={data.surgeon_name}
                  designation={data.surgeon_designation}
                  date={data.surgeon_signature_date}
                />
              </div>
            </div>
            <div>
              <div className="bg-emerald-600 text-white px-3 py-2 flex items-center mb-3">
                <span className="font-bold text-sm mr-3">M</span>
                <span className="font-bold text-xs uppercase tracking-wide">Patient Consent</span>
              </div>
              <div className="border border-gray-300 p-4">
                <SignatureBlock 
                  title="Patient Signature"
                  signature={data.patient_signature}
                  name={data.patient_signature_name}
                  designation="Patient"
                  date={data.patient_signature_date}
                />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AtrialMyxomaConsentPrintTemplate;


// import React, { useEffect, useState } from 'react';
// import { useParams } from 'react-router-dom';
// import { Loader2, AlertTriangle, Printer } from 'lucide-react';
// import { BASE_URL } from "../../../api/client";

// interface AtrialMyxomaConsentPrintTemplateProps {
//   formData?: any;
// }

// const AtrialMyxomaConsentPrintTemplate: React.FC<AtrialMyxomaConsentPrintTemplateProps> = ({ formData: propFormData }) => {
//   const { orderId } = useParams<{ orderId: string }>();
//   const [formData, setFormData] = useState<any>(propFormData || null);
//   const [loading, setLoading] = useState(!propFormData);
//   const [error, setError] = useState('');

//   useEffect(() => {
//     if (propFormData) {
//       setFormData(propFormData);
//       setLoading(false);
//     }
//   }, [propFormData]);

//   if (loading) {
//     return (
//       <div className="flex items-center justify-center min-h-screen bg-slate-50">
//         <Loader2 size={48} className="animate-spin text-[#1e40af]" />
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

//   const SignatureBlock = ({ title, signature, name, designation, date }: { title: string; signature?: string; name?: string; designation?: string; date?: string }) => (
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
//           <p className="text-[8px] text-gray-500 uppercase">Name (print)</p>
//           <div className="border-b border-gray-400 h-5 mt-1">
//             <span className="text-[9px] text-gray-800">{name || ''}</span>
//           </div>
//         </div>
//         <div>
//           <p className="text-[8px] text-gray-500 uppercase">Designation/Role</p>
//           <div className="border-b border-gray-400 h-5 mt-1">
//             <span className="text-[9px] text-gray-800">{designation || ''}</span>
//           </div>
//         </div>
//         <div className="col-span-2">
//           <p className="text-[8px] text-gray-500 uppercase">Date & Time</p>
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
//         <p className="font-bold text-sm">Atrial Myxoma Excision Preview</p>
//         <button onClick={() => window.print()} className="bg-[#1e40af] hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all">
//           <Printer size={16} /> Print Form
//         </button>
//       </div>

//       <div className="w-[210mm] bg-white p-8 shadow-2xl print:shadow-none print:m-0 print:border-none border border-slate-200 mx-auto text-[11px]">
//         {/* Header */}
//         <div className="w-full bg-[#1e40af] flex items-center p-4 min-h-[28mm] mb-1">
//           <div className="w-[25%] flex items-center justify-center border-r-[1.5px] border-[#3b82f6] pr-4 h-full">
//             <img src="/assets/login-bg.jpeg" alt="Logo" className="w-[20mm] object-contain" />
//           </div>
//           <div className="w-[75%] pl-6 flex flex-col justify-center">
//             <h1 className="text-white text-2xl font-extrabold leading-none tracking-tight mb-2 uppercase italic">Procedure Consent Form</h1>
//             <p className="text-[#bfdbfe] text-[10px] leading-tight font-bold uppercase">Surgical Removal of Atrial Myxoma</p>
//             <p className="text-[#bfdbfe]/80 text-[8px] mt-1">Form Ref: GSH-CONSENT-MYX-001 • Policy Ref: GSH-T6</p>
//           </div>
//         </div>

//         {/* Introduction */}
//         <div className="border border-gray-300 p-4 mb-4 bg-blue-50/50 rounded-sm italic">
//           <p className="text-[10px] font-bold text-gray-700 uppercase tracking-wide mb-1">Patient Rights</p>
//           <p className="text-[9px] text-gray-600 leading-relaxed mb-2">
//             You have the right to make decisions about your medical care and to refuse any procedure. If you wish to withdraw consent at any time before the procedure begins, you may do so. Signing this form does not remove your legal rights. This form complies with the National Health Act 2014 (Nigeria) and Gracespring Hospitals Consent Policy (GSH-T6).
//           </p>
//           <p className="text-[10px] font-bold text-gray-700 uppercase tracking-wide mb-1 mt-3">About this operation</p>
//           <p className="text-[9px] text-gray-600 leading-relaxed">
//             Surgical removal of a myxoma — a non-cancerous (benign) tumour growing inside an upper chamber of the heart (an atrium) — using open-heart surgery with the heart–lung (cardiopulmonary bypass) machine. A myxoma can shed fragments that travel in the blood (embolism) and can obstruct a heart valve; removal is the recommended treatment.
//           </p>
//         </div>

//         {/* Site of Tumour */}
//         <div className="mb-6 border border-gray-300 p-4">
//           <p className="text-[10px] font-bold text-gray-700 uppercase tracking-wide mb-3">Site of Tumour</p>
//           <div className="flex gap-6 mb-3">
//             <Checkbox checked={data.tumour_site === 'LEFT atrium'} label="LEFT atrium" />
//             <Checkbox checked={data.tumour_site === 'RIGHT atrium'} label="RIGHT atrium" />
//             <div className="flex items-center gap-2">
//               <Checkbox checked={data.tumour_site === 'Other'} label="Other:" />
//               {data.tumour_site === 'Other' && <span className="border-b border-gray-400 w-32 inline-block px-1">{data.tumour_site_other}</span>}
//             </div>
//           </div>
//           <div className="grid grid-cols-2 gap-4 mt-2">
//             <FormField label="Attachment site (e.g. atrial septum, valve, wall)" value={data.attachment_site} underline />
//             <FormField label="Approx. size / mobility / obstruction noted" value={data.approx_size} underline />
//           </div>
//         </div>

//         {/* Part A - Patient ID */}
//         <div className="mb-6">
//           <div className="bg-[#1e40af] text-white px-3 py-2 flex items-center mb-3">
//             <span className="font-bold text-sm mr-3">A</span>
//             <span className="font-bold text-xs uppercase tracking-wide">Patient Identification</span>
//           </div>
//           <div className="border border-gray-300 p-4 grid grid-cols-4 gap-3">
//             <FormField label="Patient Full Name" value={data.patient_name || data.patient_full_name} colSpan={2} />
//             <FormField label="Date of Birth" value={data.dob} colSpan={1} />
//             <FormField label="MRN" value={data.mrn} colSpan={1} />
//             <FormField label="Age / Sex" value={data.age_sex} colSpan={1} />
//             <FormField label="Consultant / Surgeon" value={data.responsible_surgeon || data.consultant} colSpan={1} />
//             <FormField label="Ward / Unit" value={data.ward_unit || data.ward} colSpan={1} />
//             <FormField label="Anaesthetist" value={data.anaesthetist} colSpan={1} />
//             <FormField label="Planned Date of Surgery" value={data.planned_surgery_date} colSpan={1} />
//             <FormField label="Primary Diagnosis / Indication" value={data.primary_diagnosis} colSpan={3} underline />
//           </div>
//         </div>

//         {/* Part B & C */}
//         <div className="mb-6 grid grid-cols-2 gap-4">
//           <div>
//             <div className="bg-[#334155] text-white px-3 py-2 flex items-center mb-3">
//               <span className="font-bold text-sm mr-3">B</span>
//               <span className="font-bold text-xs uppercase tracking-wide">Procedure Description</span>
//             </div>
//             <div className="border border-gray-300 p-4 h-[240px] overflow-hidden">
//               <p className="text-[8px] text-gray-700 leading-tight mb-2"><span className="font-bold">WHAT IT INVOLVES:</span> The myxoma is removed through open-heart surgery. A left atrial tumour is usually reached through the right atrium and the atrial septum. The tumour is removed whole with its stalk/base to reduce recurrence.</p>
//               <p className="text-[8px] text-gray-700 leading-tight mb-2"><span className="font-bold">HOW IT IS PERFORMED:</span> General anaesthetic; median sternotomy. The heart is stopped and blood circulated by the cardiopulmonary bypass machine. The atrium is opened, tumour excised, nearby heart valve inspected, and any septal defect closed with a patch.</p>
//               <FormField label="Surgeon's notes on this patient's tumour" value={data.surgeons_notes} colSpan={1} underline />
//             </div>
//           </div>
//           <div>
//             <div className="bg-[#334155] text-white px-3 py-2 flex items-center mb-3">
//               <span className="font-bold text-sm mr-3">C</span>
//               <span className="font-bold text-xs uppercase tracking-wide">Intended Benefits</span>
//             </div>
//             <div className="border border-gray-300 p-4 h-[240px]">
//               <p className="text-[9px] text-gray-700 leading-relaxed mb-3">Removing the myxoma eliminates the source of fragments that can travel to the brain (stroke), limbs or organs, relieves or prevents obstruction of the nearby heart valve, and removes the risk of sudden death from the tumour. It establishes the diagnosis on laboratory examination.</p>
//               <FormField label="Specific goals / expected outcome discussed" value={data.specific_goals} colSpan={1} underline />
//             </div>
//           </div>
//         </div>

//         {/* Part D - Risks */}
//         <div className="mb-6 page-break-before">
//           <div className="bg-[#be123c] text-white px-3 py-2 flex items-center mb-3">
//             <span className="font-bold text-sm mr-3">D</span>
//             <span className="font-bold text-xs uppercase tracking-wide">Risks & Complications</span>
//           </div>
//           <div className="border border-gray-300 p-4">
//             <table className="w-full text-[8.5px] mb-4">
//               <thead>
//                 <tr className="bg-gray-100 border-b border-gray-300">
//                   <th className="text-left py-1.5 px-2 font-bold text-gray-700 w-1/4">FREQUENCY</th>
//                   <th className="text-left py-1.5 px-2 font-bold text-gray-700">COMPLICATION</th>
//                   <th className="text-left py-1.5 px-2 font-bold text-gray-700 w-1/3">MANAGEMENT</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 <tr className="border-b border-gray-200">
//                   <td className="py-1.5 px-2 font-semibold">COMMON</td>
//                   <td className="py-1.5 px-2">Irregular heartbeat; chest/wound discomfort; pericardial fluid.</td>
//                   <td className="py-1.5 px-2">Usually managed with medicine / routine care.</td>
//                 </tr>
//                 <tr className="border-b border-gray-200">
//                   <td className="py-1.5 px-2 font-semibold">COMMON</td>
//                   <td className="py-1.5 px-2">Temporary confusion or poor concentration after bypass.</td>
//                   <td className="py-1.5 px-2">Usually settles; occasionally longer-lasting.</td>
//                 </tr>
//                 <tr className="border-b border-gray-200">
//                   <td className="py-1.5 px-2 font-semibold">UNCOMMON</td>
//                   <td className="py-1.5 px-2">Bleeding needing transfusion or return to theatre.</td>
//                   <td className="py-1.5 px-2">Managed by transfusion or re-operation.</td>
//                 </tr>
//                 <tr className="border-b border-gray-200">
//                   <td className="py-1.5 px-2 font-semibold">UNCOMMON</td>
//                   <td className="py-1.5 px-2">Heart block needing temporary pacing or permanent pacemaker.</td>
//                   <td className="py-1.5 px-2">Pacing wires placed at surgery; pacemaker if persistent.</td>
//                 </tr>
//                 <tr className="border-b border-gray-200">
//                   <td className="py-1.5 px-2 font-semibold text-[#be123c]">RARE</td>
//                   <td className="py-1.5 px-2">Stroke or embolism — fragments of tumour or clot.</td>
//                   <td className="py-1.5 px-2">May be permanent; specialist care needed.</td>
//                 </tr>
//                 <tr className="border-b border-gray-200">
//                   <td className="py-1.5 px-2 font-semibold text-[#be123c]">RARE</td>
//                   <td className="py-1.5 px-2">Injury to a nearby heart valve needing repair or replacement.</td>
//                   <td className="py-1.5 px-2">Repaired or replaced at surgery.</td>
//                 </tr>
//                 <tr>
//                   <td className="py-1.5 px-2 font-semibold text-[#be123c]">VERY RARE</td>
//                   <td className="py-1.5 px-2">Life-threatening complication or death.</td>
//                   <td className="py-1.5 px-2">Mitigated by specialist care.</td>
//                 </tr>
//               </tbody>
//             </table>
//             <div className="grid grid-cols-2 gap-4">
//               <FormField label="Figures discussed with patient (e.g. overall risk of death/stroke)" value={data.figures_discussed} underline />
//               <FormField label="Risks specific to THIS patient (comorbidities, etc.)" value={data.specific_risks} underline />
//             </div>
//           </div>
//         </div>

//         {/* Part F & G - Patch and Valve */}
//         <div className="mb-6 grid grid-cols-2 gap-4">
//           <div>
//             <div className="bg-[#475569] text-white px-3 py-2 flex items-center mb-3">
//               <span className="font-bold text-sm mr-3">F</span>
//               <span className="font-bold text-xs uppercase tracking-wide">Heart Wall Patch</span>
//             </div>
//             <div className="border border-gray-300 p-4 h-full">
//               <p className="text-[8.5px] text-gray-700 mb-3">Removing the tumour may leave a hole. The surgeon plans to close it with a patch.</p>
//               <div className="space-y-2">
//                 <Checkbox checked={data.patch_consent?.includes('PERICARDIAL PATCH') || data.patch_consent === 'A'} label="A - PERICARDIAL PATCH (planned). Your own tissue." />
//                 <Checkbox checked={data.patch_consent?.includes('PROSTHETIC PATCH') || data.patch_consent === 'B'} label="B - PROSTHETIC PATCH (only if needed). Man-made." />
//                 <Checkbox checked={data.patch_consent?.includes('do NOT agree') || data.patch_consent === 'C'} label="C - I do NOT agree to a prosthetic patch." />
//               </div>
//             </div>
//           </div>
//           <div>
//             <div className="bg-[#475569] text-white px-3 py-2 flex items-center mb-3">
//               <span className="font-bold text-sm mr-3">G</span>
//               <span className="font-bold text-xs uppercase tracking-wide">Heart Valve Action</span>
//             </div>
//             <div className="border border-gray-300 p-4 h-full">
//               <div className="space-y-2">
//                 <Checkbox checked={data.valve_repair_consent} label="D - I consent to REPAIR of the heart valve if damage is found." />
//                 <Checkbox checked={data.valve_replacement_consent} label="E - I consent to valve REPLACEMENT if repair is not possible." />
//                 {data.valve_replacement_consent && (
//                   <div className="pl-6 flex gap-3 my-2">
//                     <span className="text-[9px] font-bold">Type:</span>
//                     <Checkbox checked={data.preferred_valve_type === 'Mechanical'} label="Mechanical" />
//                     <Checkbox checked={data.preferred_valve_type === 'Tissue (biological)'} label="Tissue" />
//                     <Checkbox checked={data.preferred_valve_type === 'Leave to surgeon'} label="Leave to surgeon" />
//                   </div>
//                 )}
//                 <Checkbox checked={data.no_valve_replacement_consent} label="F - I do NOT consent to valve replacement." />
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Part H - Other Procedures */}
//         <div className="mb-6">
//           <div className="bg-[#ea580c] text-white px-3 py-2 flex items-center mb-3">
//             <span className="font-bold text-sm mr-3">H</span>
//             <span className="font-bold text-xs uppercase tracking-wide">Other Procedures That May Become Necessary</span>
//           </div>
//           <div className="border border-gray-300 p-4 grid grid-cols-2 gap-2">
//             <Checkbox checked={data.cabg_consent} label="G - Coronary artery bypass graft (CABG)" />
//             <Checkbox checked={data.pacing_wires_consent} label="H - Temporary pacing wires / permanent pacemaker" />
//             <Checkbox checked={data.return_to_theatre_consent} label="I - Return to theatre to treat bleeding or leak" />
//             <Checkbox checked={data.emergency_bypass_consent} label="J - Femoral cannulation or emergency bypass" />
//           </div>
//         </div>

//         {/* Clinician Declaration & Patient Consent */}
//         <div className="mb-6 page-break-before">
//           <div className="grid grid-cols-2 gap-4">
//             <div>
//               <div className="bg-[#1e40af] text-white px-3 py-2 flex items-center mb-3">
//                 <span className="font-bold text-sm mr-3">L</span>
//                 <span className="font-bold text-xs uppercase tracking-wide">Clinician Declaration</span>
//               </div>
//               <div className="border border-gray-300 p-4">
//                 <SignatureBlock 
//                   title="Consenting Clinician (Surgeon)"
//                   signature={data.surgeon_signature}
//                   name={data.surgeon_name}
//                   designation={data.surgeon_designation}
//                   date={data.surgeon_signature_date}
//                 />
//               </div>
//             </div>
//             <div>
//               <div className="bg-emerald-600 text-white px-3 py-2 flex items-center mb-3">
//                 <span className="font-bold text-sm mr-3">M</span>
//                 <span className="font-bold text-xs uppercase tracking-wide">Patient Consent</span>
//               </div>
//               <div className="border border-gray-300 p-4">
//                 <SignatureBlock 
//                   title="Patient Signature"
//                   signature={data.patient_signature}
//                   name={data.patient_signature_name}
//                   designation="Patient"
//                   date={data.patient_signature_date}
//                 />
//               </div>
//             </div>
//           </div>
//         </div>

//       </div>
//     </div>
//   );
// };

// export default AtrialMyxomaConsentPrintTemplate;