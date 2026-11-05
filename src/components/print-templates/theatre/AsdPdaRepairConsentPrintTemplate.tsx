import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, AlertTriangle, Printer } from 'lucide-react';
import { BASE_URL } from "../../../api/client";

interface AsdPdaRepairConsentPrintTemplateProps {
  formData?: any;
}

const AsdPdaRepairConsentPrintTemplate: React.FC<AsdPdaRepairConsentPrintTemplateProps> = ({ formData: propFormData }) => {
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
        <p className="font-bold text-sm">ASD & PDA Repair Preview</p>
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
            <h1 className="text-white text-2xl font-extrabold leading-none tracking-tight mb-2 uppercase italic">Consent: ASD Repair + PDA Closure</h1>
            <p className="text-[#bfdbfe] text-[10px] leading-tight font-bold uppercase">Repair of Atrial Septal Defect(s) & Closure of Patent Ductus Arteriosus</p>
            <p className="text-[#bfdbfe]/80 text-[8px] mt-1">Form Ref: GSH-CONSENT-CTS-025 • Policy Ref: GSH-T6</p>
          </div>
        </div>

        {/* Introduction */}
        <div className="border border-gray-300 p-4 mb-4 bg-blue-50/50 rounded-sm italic">
          <p className="text-[10px] font-bold text-gray-700 uppercase tracking-wide mb-1">Patient Rights</p>
          <p className="text-[9px] text-gray-600 leading-relaxed mb-2">
            You (or your child's parent/guardian) have the right to make decisions about medical care and to refuse any procedure. You may withdraw consent at any time before the procedure begins. Signing this form does not remove your legal rights. This form complies with the National Health Act 2014 (Nigeria) and Gracespring Hospitals Consent Policy (GSH-T6).
          </p>
          <p className="text-[10px] font-bold text-gray-700 uppercase tracking-wide mb-1 mt-3">About this operation</p>
          <p className="text-[9px] text-gray-600 leading-relaxed">
            open-heart surgery, using the heart-lung (cardiopulmonary bypass) machine, to close one or more holes between the two upper chambers of the heart (atrial septal defects, ASDs) and to close a persistent blood vessel between the two great arteries (patent ductus arteriosus, PDA). Both are corrected during the same operation.
          </p>
        </div>

        {/* Paediatric Note */}
        <div className="border border-gray-300 p-4 mb-4 bg-blue-100/50 rounded-sm italic">
          <p className="text-[10px] font-bold text-gray-700 uppercase tracking-wide mb-1">Paediatric / Small-Infant Note</p>
          <p className="text-[9px] text-gray-600 leading-relaxed mb-2">
            For infants and small children, consent is given by a parent or legal guardian. Weight-based prescribing, fluid and blood volumes are calculated and double-checked for the child's weight on the GSH Paediatric Weight-Based Calculation & Safety Worksheet, which is completed and counter-signed by the cardiac anaesthetist / intensivist before surgery.
          </p>
          <div className="flex flex-wrap gap-4 mt-2">
            <Checkbox checked={data.adult_patient} label="Adult patient" />
            <Checkbox checked={data.paediatric_patient} label="Paediatric patient" />
            <Checkbox checked={data.neonate_infant} label="Neonate / small infant" />
            <Checkbox checked={data.readiness_checklist} label="Readiness checklist completed" />
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
            <FormField label="Weight (kg)" value={data.weight} colSpan={1} />
            <FormField label="Ward / Unit" value={data.ward_unit || data.ward} colSpan={2} />
            
            <FormField label="Consultant / Surgeon" value={data.consultant} colSpan={2} />
            <FormField label="Anaesthetist" value={data.anaesthetist} colSpan={2} />
            
            <FormField label="Planned Date of Surgery" value={data.planned_surgery_date} colSpan={2} />
            <div className="col-span-2">
                <p className="text-[9px] font-bold text-gray-600 uppercase tracking-wide mb-1">Paediatric Worksheet Completed?</p>
                <div className="flex gap-4">
                    <Checkbox checked={data.paediatric_worksheet_completed === 'Y'} label="Y" />
                    <Checkbox checked={data.paediatric_worksheet_completed === 'N'} label="N" />
                    <Checkbox checked={data.paediatric_worksheet_completed === 'NA'} label="NA" />
                </div>
            </div>

            <FormField label="Primary Diagnosis / Indication" value={data.primary_diagnosis} colSpan={4} underline />
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
              <p className="text-[8px] text-gray-700 leading-tight mb-2"><span className="font-bold">WHAT IT INVOLVES:</span> Through an opening in the chest, on the heart-lung (bypass) machine, the surgeon closes each hole in the wall between the upper chambers (one or more ASDs) and closes the persistent vessel (PDA). Small or multiple defects may be closed with stitches alone; larger defects are closed with a patch. The PDA is tied and/or clipped, usually at the start of bypass through the same chest opening.</p>
              <div className="mt-auto">
                <FormField label="Surgeon's notes on this patient" value={data.surgeons_notes} colSpan={1} underline />
              </div>
            </div>
          </div>
          <div>
            <div className="bg-[#334155] text-white px-3 py-2 flex items-center mb-3">
              <span className="font-bold text-sm mr-3">C</span>
              <span className="font-bold text-xs uppercase tracking-wide">Intended Benefits</span>
            </div>
            <div className="border border-gray-300 p-4 h-[240px] flex flex-col">
              <p className="text-[9px] text-gray-700 leading-relaxed mb-3">Closing the ASDs and the PDA removes the extra blood flow overloading the right heart and lungs, improves growth, feeding and exercise tolerance, and reduces the long-term risks of heart rhythm problems, raised lung-artery pressure (pulmonary hypertension), heart failure, stroke from clots crossing a defect, and infection of the heart or vessel.</p>
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
                  <td className="py-1.5 px-2">Temporary irregular heartbeat; chest/wound discomfort; pericardial fluid; need for a chest drain.</td>
                  <td className="py-1.5 px-2">Usually settle with routine post-operative care.</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-1.5 px-2 font-semibold">COMMON</td>
                  <td className="py-1.5 px-2">Need for blood transfusion.</td>
                  <td className="py-1.5 px-2">Cross-matched blood available; cell salvage / ultrafiltration used.</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-1.5 px-2 font-semibold">UNCOMMON</td>
                  <td className="py-1.5 px-2">Bleeding needing a return to theatre; wound, chest or urinary infection.</td>
                  <td className="py-1.5 px-2">Managed by re-operation or antibiotics; diabetes/obesity increase risk.</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-1.5 px-2 font-semibold">UNCOMMON</td>
                  <td className="py-1.5 px-2">Residual (remaining) shunt through an ASD, or a patch leak.</td>
                  <td className="py-1.5 px-2">Small shunts often need no action; larger may need a further procedure.</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-1.5 px-2 font-semibold">UNCOMMON</td>
                  <td className="py-1.5 px-2">Heart block needing temporary pacing and, rarely, a permanent pacemaker.</td>
                  <td className="py-1.5 px-2">Pacing wires placed at surgery; pacemaker if it does not recover.</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-1.5 px-2 font-semibold">UNCOMMON</td>
                  <td className="py-1.5 px-2">PDA: hoarse voice or weak cry; raised diaphragm from phrenic nerve injury.</td>
                  <td className="py-1.5 px-2">Often temporary; speech/feeding support if needed.</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-1.5 px-2 font-semibold text-[#be123c]">RARE</td>
                  <td className="py-1.5 px-2">Stroke or air/clot embolism; temporary confusion after bypass.</td>
                  <td className="py-1.5 px-2">Careful de-airing; usually recovers, occasionally lasting.</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-1.5 px-2 font-semibold text-[#be123c]">RARE</td>
                  <td className="py-1.5 px-2">Injury to a heart valve near a defect, needing repair.</td>
                  <td className="py-1.5 px-2">Repaired at surgery; may show only on follow-up.</td>
                </tr>
                <tr>
                  <td className="py-1.5 px-2 font-semibold text-[#be123c]">VERY RARE</td>
                  <td className="py-1.5 px-2">Life-threatening complication or death.</td>
                  <td className="py-1.5 px-2">Mitigated by specialist care.</td>
                </tr>
              </tbody>
            </table>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Figures discussed with patient/family" value={data.figures_discussed} underline />
              <FormField label="Risks specific to THIS patient (weight/age, etc.)" value={data.specific_risks} underline />
            </div>
          </div>
        </div>

        {/* Part E & F - Alternatives and Patch */}
        <div className="mb-6 grid grid-cols-2 gap-4">
          <div>
            <div className="bg-[#ea580c] text-white px-3 py-2 flex items-center mb-3">
              <span className="font-bold text-sm mr-3">E</span>
              <span className="font-bold text-xs uppercase tracking-wide">Alternatives</span>
            </div>
            <div className="border border-gray-300 p-4 h-full flex flex-col">
              <p className="text-[8px] text-gray-700 leading-tight mb-2"><span className="font-bold">Medical Management:</span> Treats symptoms, does not close defects.</p>
              <p className="text-[8px] text-gray-700 leading-tight mb-2"><span className="font-bold">No Treatment:</span> Risk of progressive heart/lung effects.</p>
              <div className="mt-auto">
                <FormField label="Alternatives discussed" value={data.alternatives_discussed} colSpan={1} underline />
              </div>
            </div>
          </div>
          <div>
            <div className="bg-[#475569] text-white px-3 py-2 flex items-center mb-3">
              <span className="font-bold text-sm mr-3">F</span>
              <span className="font-bold text-xs uppercase tracking-wide">Method of Closing Defect(s)</span>
            </div>
            <div className="border border-gray-300 p-4 h-full">
              <div className="space-y-2">
                <Checkbox checked={data.method_a} label="A - DIRECT SUTURE (own tissue, no patch)." />
                <Checkbox checked={data.method_b} label="B - AUTOLOGOUS PATCH (your own tissue)." />
                <Checkbox checked={data.method_c} label="C - PROSTHETIC PATCH (man-made)." />
                <Checkbox checked={data.method_d} label="D - I do NOT agree to a prosthetic patch." />
              </div>
            </div>
          </div>
        </div>

        {/* Part G, H & I */}
        <div className="mb-6 page-break-before">
          <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="bg-[#1e40af] text-white px-3 py-2 flex items-center mb-3">
                  <span className="font-bold text-sm mr-3">G</span>
                  <span className="font-bold text-xs uppercase tracking-wide">Closure of PDA</span>
                </div>
                <div className="border border-gray-300 p-4">
                  <Checkbox checked={data.consent_pda} label="E - I consent to closure of the PDA by ligation and/or clips during the operation." />
                </div>
              </div>
              
              <div>
                <div className="bg-[#475569] text-white px-3 py-2 flex items-center mb-3">
                  <span className="font-bold text-sm mr-3">H</span>
                  <span className="font-bold text-xs uppercase tracking-wide">Other Procedures</span>
                </div>
                <div className="border border-gray-300 p-4">
                  <div className="space-y-2">
                    <Checkbox checked={data.proc_f} label="F - Repair of a heart valve near a defect" />
                    <Checkbox checked={data.proc_g} label="G - Temporary pacing wires / permanent pacemaker" />
                    <Checkbox checked={data.proc_h} label="H - Return to theatre to treat bleeding or leak" />
                    <Checkbox checked={data.proc_i} label="I - Femoral cannulation or emergency bypass" />
                  </div>
                </div>
              </div>
          </div>
        </div>

        {/* Part J */}
        <div className="mb-6">
          <div className="bg-[#334155] text-white px-3 py-2 flex items-center mb-3">
            <span className="font-bold text-sm mr-3">J</span>
            <span className="font-bold text-xs uppercase tracking-wide">Additional Procedures, Blood & Tissue</span>
          </div>
          <div className="border border-gray-300 p-4 grid grid-cols-2 gap-4">
             <FormField label="Additional procedures consented to if needed" value={data.additional_procedures_consented} underline />
             <FormField label="Procedures NOT to be carried out" value={data.procedures_declined} underline />
             <div>
                <p className="text-[9px] font-bold text-gray-600 uppercase tracking-wide mb-1">Blood transfusion consent:</p>
                <div className="flex gap-4">
                    <Checkbox checked={data.blood_transfusion === 'Consents'} label="Consents" />
                    <Checkbox checked={data.blood_transfusion === 'Declines'} label="Declines" />
                    <Checkbox checked={data.blood_transfusion === 'Discuss'} label="Discuss" />
                </div>
             </div>
             <div>
                <p className="text-[9px] font-bold text-gray-600 uppercase tracking-wide mb-1">Clinical photography & video:</p>
                <div className="flex gap-4">
                    <Checkbox checked={data.photo_clinical_record} label="Clinical record" />
                    <Checkbox checked={data.photo_teaching_audit} label="Teaching / audit" />
                    <Checkbox checked={data.photo_declines} label="Declines" />
                </div>
             </div>
          </div>
        </div>

        {/* Declarations (L & M) */}
        <div className="mb-6 page-break-before">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="bg-[#1e40af] text-white px-3 py-2 flex items-center mb-3">
                <span className="font-bold text-sm mr-3">L</span>
                <span className="font-bold text-xs uppercase tracking-wide">Clinician Declaration</span>
              </div>
              <div className="border border-gray-300 p-4 space-y-4">
                <SignatureBlock 
                  title="Consenting Clinician (Surgeon)"
                  signature={data.clinician_signature}
                  name={data.clinician_name}
                  designation={data.clinician_designation}
                  date={data.clinician_date}
                  time={data.clinician_time}
                />
                <SignatureBlock 
                  title="Second Clinician / Assistant (if applicable)"
                  signature={data.second_clinician_signature}
                  name={data.second_clinician_name}
                  designation={data.second_clinician_designation}
                  date={data.second_clinician_date}
                  time={data.second_clinician_time}
                />
              </div>
            </div>
            
            <div>
              <div className="bg-emerald-600 text-white px-3 py-2 flex items-center mb-3">
                <span className="font-bold text-sm mr-3">M</span>
                <span className="font-bold text-xs uppercase tracking-wide">Patient Consent (Adult)</span>
              </div>
              <div className="border border-gray-300 p-4 space-y-4">
                <SignatureBlock 
                  title="Patient Signature"
                  signature={data.patient_signature}
                  name={data.patient_signature_name}
                  designation="Patient"
                  date={data.patient_date}
                  time={data.patient_time}
                />
                <SignatureBlock 
                  title="Witness Signature"
                  signature={data.witness_signature}
                  name={data.witness_name}
                  designation={data.witness_designation}
                  date={data.witness_date}
                  time={data.witness_time}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Parent / Guardian (N) & Re-confirmation (O) */}
        <div className="mb-6 grid grid-cols-2 gap-4">
            <div>
              <div className="bg-purple-700 text-white px-3 py-2 flex items-center mb-3">
                <span className="font-bold text-sm mr-3">N</span>
                <span className="font-bold text-xs uppercase tracking-wide">Parent / Guardian (If Minor/Lacking Capacity)</span>
              </div>
              <div className="border border-gray-300 p-4 space-y-4">
                <SignatureBlock 
                  title="Parent / Guardian Signature"
                  signature={data.parent_signature}
                  name={data.parent_name_print || data.parent_name}
                  designation={data.relationship}
                  date={data.parent_date}
                  time={data.parent_time}
                />
                <SignatureBlock 
                  title="Confirming Clinician (Best Interests)"
                  signature={data.confirming_clinician_signature}
                  name={data.confirming_clinician_name}
                  designation={data.confirming_clinician_designation}
                  date={data.confirming_clinician_date}
                  time={data.confirming_clinician_time}
                />
              </div>
            </div>

            <div>
              <div className="bg-orange-500 text-white px-3 py-2 flex items-center mb-3">
                <span className="font-bold text-sm mr-3">O</span>
                <span className="font-bold text-xs uppercase tracking-wide">Re-confirmation (Day of Surgery)</span>
              </div>
              <div className="border border-gray-300 p-4">
                  <div className="space-y-2 mb-3">
                    <p className="text-[9px] font-bold text-gray-600 uppercase tracking-wide mb-1">Consent is unchanged:</p>
                    <div className="flex gap-4">
                        <Checkbox checked={data.consent_unchanged === 'Yes'} label="Yes" />
                        <Checkbox checked={data.consent_unchanged === 'Changes made'} label="Changes made" />
                    </div>
                  </div>
                  <div className="space-y-2 mb-3">
                    <p className="text-[9px] font-bold text-gray-600 uppercase tracking-wide mb-1">Weight re-checked (if child):</p>
                    <div className="flex gap-4">
                        <Checkbox checked={data.weight_rechecked === 'Yes'} label="Yes" />
                        <Checkbox checked={data.weight_rechecked === 'N/A'} label="N/A" />
                    </div>
                  </div>
                  <FormField label="Changes to wishes, if any" value={data.changes_to_wishes} underline />
                  <FormField label="Confirming surgeon (name / signature / date)" value={data.confirming_surgeon_details} underline />
              </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default AsdPdaRepairConsentPrintTemplate;


// import React, { useEffect, useState } from 'react';
// import { useParams } from 'react-router-dom';
// import { Loader2, AlertTriangle, Printer } from 'lucide-react';
// import { BASE_URL } from "../../../api/client";

// interface AsdPdaRepairConsentPrintTemplateProps {
//   formData?: any;
// }

// const AsdPdaRepairConsentPrintTemplate: React.FC<AsdPdaRepairConsentPrintTemplateProps> = ({ formData: propFormData }) => {
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
//     const normalizedBaseUrl = BASE_URL.replace(/\/\$/, "");
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
//         <div className="col-span-2 grid grid-cols-2 gap-2">
//             <div>
//                 <p className="text-[8px] text-gray-500 uppercase">Date</p>
//                 <div className="border-b border-gray-400 h-5 mt-1">
//                 <span className="text-[9px] text-gray-800">{date || ''}</span>
//                 </div>
//             </div>
//             <div>
//                 <p className="text-[8px] text-gray-500 uppercase">Time</p>
//                 <div className="border-b border-gray-400 h-5 mt-1">
//                 <span className="text-[9px] text-gray-800">{time || ''}</span>
//                 </div>
//             </div>
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
//         <p className="font-bold text-sm">ASD & PDA Repair Preview</p>
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
//             <h1 className="text-white text-2xl font-extrabold leading-none tracking-tight mb-2 uppercase italic">Consent: ASD Repair + PDA Closure</h1>
//             <p className="text-[#bfdbfe] text-[10px] leading-tight font-bold uppercase">Repair of Atrial Septal Defect(s) & Closure of Patent Ductus Arteriosus</p>
//             <p className="text-[#bfdbfe]/80 text-[8px] mt-1">Form Ref: GSH-CONSENT-CTS-025 • Policy Ref: GSH-T6</p>
//           </div>
//         </div>

//         {/* Introduction */}
//         <div className="border border-gray-300 p-4 mb-4 bg-blue-50/50 rounded-sm italic">
//           <p className="text-[10px] font-bold text-gray-700 uppercase tracking-wide mb-1">Patient Rights</p>
//           <p className="text-[9px] text-gray-600 leading-relaxed mb-2">
//             You (or your child's parent/guardian) have the right to make decisions about medical care and to refuse any procedure. You may withdraw consent at any time before the procedure begins. Signing this form does not remove your legal rights. This form complies with the National Health Act 2014 (Nigeria) and Gracespring Hospitals Consent Policy (GSH-T6).
//           </p>
//           <p className="text-[10px] font-bold text-gray-700 uppercase tracking-wide mb-1 mt-3">About this operation</p>
//           <p className="text-[9px] text-gray-600 leading-relaxed">
//             open-heart surgery, using the heart-lung (cardiopulmonary bypass) machine, to close one or more holes between the two upper chambers of the heart (atrial septal defects, ASDs) and to close a persistent blood vessel between the two great arteries (patent ductus arteriosus, PDA). Both are corrected during the same operation.
//           </p>
//         </div>

//         {/* Paediatric Note */}
//         <div className="border border-gray-300 p-4 mb-4 bg-blue-100/50 rounded-sm italic">
//           <p className="text-[10px] font-bold text-gray-700 uppercase tracking-wide mb-1">Paediatric / Small-Infant Note</p>
//           <p className="text-[9px] text-gray-600 leading-relaxed mb-2">
//             For infants and small children, consent is given by a parent or legal guardian. Weight-based prescribing, fluid and blood volumes are calculated and double-checked for the child's weight on the GSH Paediatric Weight-Based Calculation & Safety Worksheet, which is completed and counter-signed by the cardiac anaesthetist / intensivist before surgery.
//           </p>
//           <div className="flex flex-wrap gap-4 mt-2">
//             <Checkbox checked={data.adult_patient} label="Adult patient" />
//             <Checkbox checked={data.paediatric_patient} label="Paediatric patient" />
//             <Checkbox checked={data.neonate_infant} label="Neonate / small infant" />
//             <Checkbox checked={data.readiness_checklist} label="Readiness checklist completed" />
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
//             <FormField label="Weight (kg)" value={data.weight} colSpan={1} />
//             <FormField label="Ward / Unit" value={data.ward_unit || data.ward} colSpan={2} />
            
//             <FormField label="Consultant / Surgeon" value={data.consultant} colSpan={2} />
//             <FormField label="Anaesthetist" value={data.anaesthetist} colSpan={2} />
            
//             <FormField label="Planned Date of Surgery" value={data.planned_surgery_date} colSpan={2} />
//             <div className="col-span-2">
//                 <p className="text-[9px] font-bold text-gray-600 uppercase tracking-wide mb-1">Paediatric Worksheet Completed?</p>
//                 <div className="flex gap-4">
//                     <Checkbox checked={data.paediatric_worksheet_completed === 'Y'} label="Y" />
//                     <Checkbox checked={data.paediatric_worksheet_completed === 'N'} label="N" />
//                     <Checkbox checked={data.paediatric_worksheet_completed === 'NA'} label="NA" />
//                 </div>
//             </div>

//             <FormField label="Primary Diagnosis / Indication" value={data.primary_diagnosis} colSpan={4} underline />
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
//               <p className="text-[8px] text-gray-700 leading-tight mb-2"><span className="font-bold">WHAT IT INVOLVES:</span> Through an opening in the chest, on the heart-lung (bypass) machine, the surgeon closes each hole in the wall between the upper chambers (one or more ASDs) and closes the persistent vessel (PDA). Small or multiple defects may be closed with stitches alone; larger defects are closed with a patch. The PDA is tied and/or clipped, usually at the start of bypass through the same chest opening.</p>
//               <FormField label="Surgeon's notes on this patient" value={data.surgeons_notes} colSpan={1} underline />
//             </div>
//           </div>
//           <div>
//             <div className="bg-[#334155] text-white px-3 py-2 flex items-center mb-3">
//               <span className="font-bold text-sm mr-3">C</span>
//               <span className="font-bold text-xs uppercase tracking-wide">Intended Benefits</span>
//             </div>
//             <div className="border border-gray-300 p-4 h-[240px]">
//               <p className="text-[9px] text-gray-700 leading-relaxed mb-3">Closing the ASDs and the PDA removes the extra blood flow overloading the right heart and lungs, improves growth, feeding and exercise tolerance, and reduces the long-term risks of heart rhythm problems, raised lung-artery pressure (pulmonary hypertension), heart failure, stroke from clots crossing a defect, and infection of the heart or vessel.</p>
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
//                   <td className="py-1.5 px-2">Temporary irregular heartbeat; chest/wound discomfort; pericardial fluid; need for a chest drain.</td>
//                   <td className="py-1.5 px-2">Usually settle with routine post-operative care.</td>
//                 </tr>
//                 <tr className="border-b border-gray-200">
//                   <td className="py-1.5 px-2 font-semibold">COMMON</td>
//                   <td className="py-1.5 px-2">Need for blood transfusion.</td>
//                   <td className="py-1.5 px-2">Cross-matched blood available; cell salvage / ultrafiltration used.</td>
//                 </tr>
//                 <tr className="border-b border-gray-200">
//                   <td className="py-1.5 px-2 font-semibold">UNCOMMON</td>
//                   <td className="py-1.5 px-2">Bleeding needing a return to theatre; wound, chest or urinary infection.</td>
//                   <td className="py-1.5 px-2">Managed by re-operation or antibiotics; diabetes/obesity increase risk.</td>
//                 </tr>
//                 <tr className="border-b border-gray-200">
//                   <td className="py-1.5 px-2 font-semibold">UNCOMMON</td>
//                   <td className="py-1.5 px-2">Residual (remaining) shunt through an ASD, or a patch leak.</td>
//                   <td className="py-1.5 px-2">Small shunts often need no action; larger may need a further procedure.</td>
//                 </tr>
//                 <tr className="border-b border-gray-200">
//                   <td className="py-1.5 px-2 font-semibold">UNCOMMON</td>
//                   <td className="py-1.5 px-2">Heart block needing temporary pacing and, rarely, a permanent pacemaker.</td>
//                   <td className="py-1.5 px-2">Pacing wires placed at surgery; pacemaker if it does not recover.</td>
//                 </tr>
//                 <tr className="border-b border-gray-200">
//                   <td className="py-1.5 px-2 font-semibold">UNCOMMON</td>
//                   <td className="py-1.5 px-2">PDA: hoarse voice or weak cry; raised diaphragm from phrenic nerve injury.</td>
//                   <td className="py-1.5 px-2">Often temporary; speech/feeding support if needed.</td>
//                 </tr>
//                 <tr className="border-b border-gray-200">
//                   <td className="py-1.5 px-2 font-semibold text-[#be123c]">RARE</td>
//                   <td className="py-1.5 px-2">Stroke or air/clot embolism; temporary confusion after bypass.</td>
//                   <td className="py-1.5 px-2">Careful de-airing; usually recovers, occasionally lasting.</td>
//                 </tr>
//                 <tr className="border-b border-gray-200">
//                   <td className="py-1.5 px-2 font-semibold text-[#be123c]">RARE</td>
//                   <td className="py-1.5 px-2">Injury to a heart valve near a defect, needing repair.</td>
//                   <td className="py-1.5 px-2">Repaired at surgery; may show only on follow-up.</td>
//                 </tr>
//                 <tr>
//                   <td className="py-1.5 px-2 font-semibold text-[#be123c]">VERY RARE</td>
//                   <td className="py-1.5 px-2">Life-threatening complication or death.</td>
//                   <td className="py-1.5 px-2">Mitigated by specialist care.</td>
//                 </tr>
//               </tbody>
//             </table>
//             <div className="grid grid-cols-2 gap-4">
//               <FormField label="Figures discussed with patient/family" value={data.figures_discussed} underline />
//               <FormField label="Risks specific to THIS patient (weight/age, etc.)" value={data.specific_risks} underline />
//             </div>
//           </div>
//         </div>

//         {/* Part E & F - Alternatives and Patch */}
//         <div className="mb-6 grid grid-cols-2 gap-4">
//           <div>
//             <div className="bg-[#ea580c] text-white px-3 py-2 flex items-center mb-3">
//               <span className="font-bold text-sm mr-3">E</span>
//               <span className="font-bold text-xs uppercase tracking-wide">Alternatives</span>
//             </div>
//             <div className="border border-gray-300 p-4 h-full">
//               <p className="text-[8px] text-gray-700 leading-tight mb-2"><span className="font-bold">Medical Management:</span> Treats symptoms, does not close defects.</p>
//               <p className="text-[8px] text-gray-700 leading-tight mb-2"><span className="font-bold">No Treatment:</span> Risk of progressive heart/lung effects.</p>
//               <FormField label="Alternatives discussed" value={data.alternatives_discussed} colSpan={1} underline />
//             </div>
//           </div>
//           <div>
//             <div className="bg-[#475569] text-white px-3 py-2 flex items-center mb-3">
//               <span className="font-bold text-sm mr-3">F</span>
//               <span className="font-bold text-xs uppercase tracking-wide">Method of Closing Defect(s)</span>
//             </div>
//             <div className="border border-gray-300 p-4 h-full">
//               <div className="space-y-2">
//                 <Checkbox checked={data.method_a} label="A - DIRECT SUTURE (own tissue, no patch)." />
//                 <Checkbox checked={data.method_b} label="B - AUTOLOGOUS PATCH (your own tissue)." />
//                 <Checkbox checked={data.method_c} label="C - PROSTHETIC PATCH (man-made)." />
//                 <Checkbox checked={data.method_d} label="D - I do NOT agree to a prosthetic patch." />
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Part G, H & I */}
//         <div className="mb-6 page-break-before">
//           <div className="grid grid-cols-2 gap-4">
//               <div>
//                 <div className="bg-[#1e40af] text-white px-3 py-2 flex items-center mb-3">
//                   <span className="font-bold text-sm mr-3">G</span>
//                   <span className="font-bold text-xs uppercase tracking-wide">Closure of PDA</span>
//                 </div>
//                 <div className="border border-gray-300 p-4">
//                   <Checkbox checked={data.consent_pda} label="E - I consent to closure of the PDA by ligation and/or clips during the operation." />
//                 </div>
//               </div>
              
//               <div>
//                 <div className="bg-[#475569] text-white px-3 py-2 flex items-center mb-3">
//                   <span className="font-bold text-sm mr-3">H</span>
//                   <span className="font-bold text-xs uppercase tracking-wide">Other Procedures</span>
//                 </div>
//                 <div className="border border-gray-300 p-4">
//                   <div className="space-y-2">
//                     <Checkbox checked={data.proc_f} label="F - Repair of a heart valve near a defect" />
//                     <Checkbox checked={data.proc_g} label="G - Temporary pacing wires / permanent pacemaker" />
//                     <Checkbox checked={data.proc_h} label="H - Return to theatre to treat bleeding or leak" />
//                     <Checkbox checked={data.proc_i} label="I - Femoral cannulation or emergency bypass" />
//                   </div>
//                 </div>
//               </div>
//           </div>
//         </div>

//         {/* Part J */}
//         <div className="mb-6">
//           <div className="bg-[#334155] text-white px-3 py-2 flex items-center mb-3">
//             <span className="font-bold text-sm mr-3">J</span>
//             <span className="font-bold text-xs uppercase tracking-wide">Additional Procedures, Blood & Tissue</span>
//           </div>
//           <div className="border border-gray-300 p-4 grid grid-cols-2 gap-4">
//              <FormField label="Additional procedures consented to if needed" value={data.additional_procedures_consented} underline />
//              <FormField label="Procedures NOT to be carried out" value={data.procedures_declined} underline />
//              <div>
//                 <p className="text-[9px] font-bold text-gray-600 uppercase tracking-wide mb-1">Blood transfusion consent:</p>
//                 <div className="flex gap-4">
//                     <Checkbox checked={data.blood_transfusion === 'Consents'} label="Consents" />
//                     <Checkbox checked={data.blood_transfusion === 'Declines'} label="Declines" />
//                     <Checkbox checked={data.blood_transfusion === 'Discuss'} label="Discuss" />
//                 </div>
//              </div>
//              <div>
//                 <p className="text-[9px] font-bold text-gray-600 uppercase tracking-wide mb-1">Clinical photography & video:</p>
//                 <div className="flex gap-4">
//                     <Checkbox checked={data.photo_clinical_record} label="Clinical record" />
//                     <Checkbox checked={data.photo_teaching_audit} label="Teaching / audit" />
//                     <Checkbox checked={data.photo_declines} label="Declines" />
//                 </div>
//              </div>
//           </div>
//         </div>

//         {/* Declarations (L & M) */}
//         <div className="mb-6 page-break-before">
//           <div className="grid grid-cols-2 gap-4">
//             <div>
//               <div className="bg-[#1e40af] text-white px-3 py-2 flex items-center mb-3">
//                 <span className="font-bold text-sm mr-3">L</span>
//                 <span className="font-bold text-xs uppercase tracking-wide">Clinician Declaration</span>
//               </div>
//               <div className="border border-gray-300 p-4 space-y-4">
//                 <SignatureBlock 
//                   title="Consenting Clinician (Surgeon)"
//                   signature={data.clinician_signature}
//                   name={data.clinician_name}
//                   designation={data.clinician_designation}
//                   date={data.clinician_date}
//                   time={data.clinician_time}
//                 />
//                 <SignatureBlock 
//                   title="Second Clinician / Assistant (if applicable)"
//                   signature={data.second_clinician_signature}
//                   name={data.second_clinician_name}
//                   designation={data.second_clinician_designation}
//                   date={data.second_clinician_date}
//                   time={data.second_clinician_time}
//                 />
//               </div>
//             </div>
            
//             <div>
//               <div className="bg-emerald-600 text-white px-3 py-2 flex items-center mb-3">
//                 <span className="font-bold text-sm mr-3">M</span>
//                 <span className="font-bold text-xs uppercase tracking-wide">Patient Consent (Adult)</span>
//               </div>
//               <div className="border border-gray-300 p-4 space-y-4">
//                 <SignatureBlock 
//                   title="Patient Signature"
//                   signature={data.patient_signature}
//                   name={data.patient_signature_name}
//                   designation="Patient"
//                   date={data.patient_date}
//                   time={data.patient_time}
//                 />
//                 <SignatureBlock 
//                   title="Witness Signature"
//                   signature={data.witness_signature}
//                   name={data.witness_name}
//                   designation={data.witness_designation}
//                   date={data.witness_date}
//                   time={data.witness_time}
//                 />
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Parent / Guardian (N) & Re-confirmation (O) */}
//         <div className="mb-6 grid grid-cols-2 gap-4">
//             <div>
//               <div className="bg-purple-700 text-white px-3 py-2 flex items-center mb-3">
//                 <span className="font-bold text-sm mr-3">N</span>
//                 <span className="font-bold text-xs uppercase tracking-wide">Parent / Guardian (If Minor/Lacking Capacity)</span>
//               </div>
//               <div className="border border-gray-300 p-4 space-y-4">
//                 <SignatureBlock 
//                   title="Parent / Guardian Signature"
//                   signature={data.parent_signature}
//                   name={data.parent_name_print || data.parent_name}
//                   designation={data.relationship}
//                   date={data.parent_date}
//                   time={data.parent_time}
//                 />
//                 <SignatureBlock 
//                   title="Confirming Clinician (Best Interests)"
//                   signature={data.confirming_clinician_signature}
//                   name={data.confirming_clinician_name}
//                   designation={data.confirming_clinician_designation}
//                   date={data.confirming_clinician_date}
//                   time={data.confirming_clinician_time}
//                 />
//               </div>
//             </div>

//             <div>
//               <div className="bg-orange-500 text-white px-3 py-2 flex items-center mb-3">
//                 <span className="font-bold text-sm mr-3">O</span>
//                 <span className="font-bold text-xs uppercase tracking-wide">Re-confirmation (Day of Surgery)</span>
//               </div>
//               <div className="border border-gray-300 p-4">
//                   <div className="space-y-2 mb-3">
//                     <p className="text-[9px] font-bold text-gray-600 uppercase tracking-wide mb-1">Consent is unchanged:</p>
//                     <div className="flex gap-4">
//                         <Checkbox checked={data.consent_unchanged === 'Yes'} label="Yes" />
//                         <Checkbox checked={data.consent_unchanged === 'Changes made'} label="Changes made" />
//                     </div>
//                   </div>
//                   <div className="space-y-2 mb-3">
//                     <p className="text-[9px] font-bold text-gray-600 uppercase tracking-wide mb-1">Weight re-checked (if child):</p>
//                     <div className="flex gap-4">
//                         <Checkbox checked={data.weight_rechecked === 'Yes'} label="Yes" />
//                         <Checkbox checked={data.weight_rechecked === 'N/A'} label="N/A" />
//                     </div>
//                   </div>
//                   <FormField label="Changes to wishes, if any" value={data.changes_to_wishes} underline />
//                   <FormField label="Confirming surgeon (name / signature / date)" value={data.confirming_surgeon_details} underline />
//               </div>
//             </div>
//         </div>

//       </div>
//     </div>
//   );
// };

// export default AsdPdaRepairConsentPrintTemplate;