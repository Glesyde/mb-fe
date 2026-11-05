import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, AlertTriangle, Printer } from 'lucide-react';
import { BASE_URL } from "../../../api/client";

interface ChemicalPleurodesisPrintTemplateProps {
  formData?: any;
  templateData?: any;
}

const ChemicalPleurodesisPrintTemplate: React.FC<ChemicalPleurodesisPrintTemplateProps> = ({ formData: propFormData, templateData: propTemplateData }) => {
  const { orderId } = useParams<{ orderId: string }>();
  const [formData, setFormData] = useState<any>(propFormData || null);
  const [templateData, setTemplateData] = useState<any>(propTemplateData || null);
  const [loading, setLoading] = useState(!propFormData && !propTemplateData);
  const [error, setError] = useState('');

  useEffect(() => {
    if (propFormData && propTemplateData) {
      setFormData(propFormData);
      setTemplateData(propTemplateData);
      setLoading(false);
      return;
    }
    setLoading(false);
  }, [propFormData, propTemplateData]);

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
        <p className="font-bold text-sm">Chemical Pleurodesis Consent Form Preview</p>
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
            <p className="text-[#bfdbfe] text-[10px] leading-tight font-bold uppercase">Chest-Tube Chemical Pleurodesis</p>
            <p className="text-[#bfdbfe]/80 text-[8px] mt-1">Form Ref: GSH-CONSENT-PLEU-001 • Policy Ref: GSH-T6 • Version 1.0</p>
          </div>
        </div>

        {/* Address Bar */}
        <div className="w-full text-center py-2 border-b border-slate-200 mb-6">
          <p className="text-[8px] text-slate-500 font-medium italic">Head Office: Gracespring Hospitals Limited Plot 3, Block 32, Ajayi Apata Estate, Sangotedo, Lekki, Lagos, Nigeria Lagos State, Nigeria. &nbsp;•&nbsp; +234 705 648 2776 &nbsp;•&nbsp; info@gracespringhospital.com</p>
        </div>

        {/* Patient Rights */}
        <div className="border border-gray-300 p-4 mb-6 bg-blue-50/50 rounded-sm italic">
          <p className="text-[10px] font-bold text-gray-700 uppercase tracking-wide mb-1">Patient Rights</p>
          <p className="text-[9px] text-gray-600 leading-relaxed">
            You have the right to make decisions about your medical care and to refuse any procedure. If you wish to withdraw consent at any time before the procedure begins, you may do so. Signing this form does not remove your legal rights. This form complies with the National Health Act 2014 (Nigeria) and Gracespring Hospitals Consent Policy (GSH-T6).
          </p>
        </div>

        {/* Part A - Patient Identification */}
        <div className="mb-6">
          <div className="bg-[#1e40af] text-white px-3 py-2 flex items-center mb-3">
            <span className="font-bold text-sm mr-3">A</span>
            <span className="font-bold text-xs uppercase tracking-wide">Patient Identification</span>
          </div>
          <div className="border border-gray-300 p-4">
            <div className="grid grid-cols-4 gap-3">
              <FormField label="Patient Full Name" value={data.patient_name} colSpan={2} />
              <FormField label="Date of Birth" value={data.dob} colSpan={1} />
              <FormField label="MRN" value={data.mrn} colSpan={1} />
              <FormField label="Age / Sex" value={data.age_sex} colSpan={1} />
              <FormField label="Consultant / Responsible Surgeon" value={data.consultant} colSpan={2} />
              <FormField label="Ward / Unit" value={data.ward} colSpan={1} />
              <FormField label="Primary Diagnosis / Indication" value={data.primary_diagnosis} colSpan={4} underline />
              
              <div className="col-span-2 mt-2">
                <p className="text-[9px] font-bold text-gray-600 uppercase tracking-wide mb-2">Planned Surgical Approach</p>
                <div className="flex gap-4">
                  <Checkbox checked={data.planned_approach === 'Via existing chest drain'} label="Via existing chest drain" />
                  <Checkbox checked={data.planned_approach === 'Chest drain inserted for the procedure'} label="Chest drain inserted" />
                  <Checkbox checked={data.planned_approach === 'Decision at the bedside'} label="Decision at bedside" />
                </div>
              </div>
              <div className="col-span-1 mt-2">
                <p className="text-[9px] font-bold text-gray-600 uppercase tracking-wide mb-2">Site / Side</p>
                <div className="flex gap-4">
                  <Checkbox checked={data.site_side === 'Left'} label="Left" />
                  <Checkbox checked={data.site_side === 'Right'} label="Right" />
                  <Checkbox checked={data.site_side === 'N/A'} label="N/A" />
                </div>
              </div>
              <FormField label="Planned Date" value={data.planned_date} colSpan={1} />
            </div>
          </div>
        </div>

        {/* Part B & C */}
        <div className="mb-6 grid grid-cols-2 gap-4">
          <div>
            <div className="bg-[#334155] text-white px-3 py-2 flex items-center mb-3">
              <span className="font-bold text-sm mr-3">B</span>
              <span className="font-bold text-xs uppercase tracking-wide">Description</span>
            </div>
            <div className="border border-gray-300 p-4 h-[180px]">
              <p className="text-[9px] text-gray-700 leading-relaxed mb-2"><span className="font-bold uppercase">What the procedure involves:</span> Instillation of a sclerosing agent through a chest drain to make the lung lining stick to the chest wall, preventing repeated build-up of fluid or repeated lung collapse.</p>
              <p className="text-[9px] text-gray-700 leading-relaxed"><span className="font-bold uppercase">How it is performed:</span> Drain position confirmed. Local anaesthetic instilled to reduce discomfort. Sclerosing agent mixed with saline instilled. Drain clamped for a period, patient repositioned, then unclamped.</p>
            </div>
          </div>
          <div>
            <div className="bg-[#334155] text-white px-3 py-2 flex items-center mb-3">
              <span className="font-bold text-sm mr-3">C</span>
              <span className="font-bold text-xs uppercase tracking-wide">Intended Benefits & Goals</span>
            </div>
            <div className="border border-gray-300 p-4 h-[180px]">
              <p className="text-[9px] text-gray-700 leading-relaxed mb-3">Successful pleurodesis prevents repeated fluid build-up or lung collapse, relieves breathlessness, and reduces the need for repeated drainage.</p>
              <FormField label="Specific goals / expected outcome discussed with this patient" value={data.expected_outcomes} colSpan={1} underline />
            </div>
          </div>
        </div>

        {/* Part D - Risks */}
        <div className="mb-6">
          <div className="bg-[#be123c] text-white px-3 py-2 flex items-center mb-3">
            <span className="font-bold text-sm mr-3">D</span>
            <span className="font-bold text-xs uppercase tracking-wide">Risks & Complications</span>
          </div>
          <div className="border border-gray-300 p-4">
            <table className="w-full text-[9px] mb-4">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-300">
                  <th className="text-left py-2 px-2 font-bold text-gray-700 uppercase">Frequency</th>
                  <th className="text-left py-2 px-2 font-bold text-gray-700 uppercase">Risk / Complication</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="py-2 px-2 font-semibold text-[#be123c]">VERY COMMON / COMMON</td>
                  <td className="py-2 px-2">Chest pain and discomfort during and after instillation; fever and flu-like symptoms for 24–48 hours.</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-2 px-2 font-semibold text-[#be123c]">COMMON</td>
                  <td className="py-2 px-2">Incomplete or failed pleurodesis needing a repeat procedure or an alternative; drain-site discomfort.</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-2 px-2 font-semibold">UNCOMMON</td>
                  <td className="py-2 px-2">Wound or pleural infection (empyema); drain blockage or displacement; localised skin reaction.</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-2 px-2 font-semibold">UNCOMMON</td>
                  <td className="py-2 px-2">Breathlessness from fluid shifts; low blood pressure during the procedure.</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-2 px-2 font-semibold">RARE</td>
                  <td className="py-2 px-2">Re-expansion pulmonary oedema; injury to the lung; significant bleeding (haemothorax); acute respiratory distress (ARDS) – more associated with talc than other agents.</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-2 px-2 font-semibold">VERY RARE</td>
                  <td className="py-2 px-2">Life-threatening complication or death.</td>
                </tr>
              </tbody>
            </table>
            <FormField label="Risks specific to THIS patient" value={data.individual_risks} colSpan={1} underline />
          </div>
        </div>

        {/* Part E / E2 / E3 */}
        <div className="mb-6 page-break-before">
          <div className="bg-[#ea580c] text-white px-3 py-2 flex items-center mb-3">
            <span className="font-bold text-sm mr-3">E</span>
            <span className="font-bold text-xs uppercase tracking-wide">Alternatives, Sclerosant & Pain Relief</span>
          </div>
          <div className="border border-gray-300 p-4">
            <div className="grid grid-cols-2 gap-6 mb-4">
              <div>
                <p className="text-[9px] font-bold text-gray-700 uppercase mb-2">Alternatives to the procedure</p>
                <ul className="text-[9px] text-gray-700 list-disc pl-4 mb-2">
                  <li>Repeated drainage (as needed)</li>
                  <li>Indwelling pleural catheter (IPC)</li>
                  <li>Thoracoscopic (VATS) pleurodesis / poudrage</li>
                  <li>Different sclerosing agent</li>
                  <li>No treatment</li>
                </ul>
                <FormField label="Alternatives discussed with this patient" value={data.alternatives_discussed} colSpan={1} underline />
              </div>
              <div>
                <p className="text-[9px] font-bold text-gray-700 uppercase mb-2">Sclerosant Details (Part E2)</p>
                <div className="space-y-2">
                  <FormField label="Sclerosant / Agent" value={data.sclerosant_agent} colSpan={1} />
                  <FormField label="Dose / Concentration" value={data.dose_concentration} colSpan={1} />
                  <FormField label="Diluent & Volume" value={data.diluent_volume} colSpan={1} />
                  <FormField label="Intrapleural Local Anaesthetic" value={data.intrapleural_anaesthetic_dose} colSpan={1} />
                  <FormField label="Agent-specific risks discussed" value={data.agent_specific_risks} colSpan={1} underline />
                </div>
              </div>
            </div>
            
            <div className="border-t border-gray-300 pt-4">
              <p className="text-[9px] font-bold text-gray-700 uppercase mb-2">Pain Relief & Discussion (Part E3)</p>
              <div className="flex gap-6 mb-3">
                <Checkbox checked={data.intrapleural_explained} label="Intrapleural local anaesthetic explained" />
                <Checkbox checked={data.repeat_explained} label="Possibility of repeat pleurodesis explained" />
                <Checkbox checked={data.alternatives_explained} label="Alternative agents/approaches explained" />
              </div>
              <FormField label="Discussion notes (agent choice, pain relief, likelihood of success)" value={data.discussion_notes} colSpan={1} underline />
            </div>
          </div>
        </div>

        {/* Part F & G */}
        <div className="mb-6 grid grid-cols-2 gap-4">
          <div>
            <div className="bg-[#475569] text-white px-3 py-2 flex items-center mb-3">
              <span className="font-bold text-sm mr-3">F</span>
              <span className="font-bold text-xs uppercase tracking-wide">Anaesthesia</span>
            </div>
            <div className="border border-gray-300 p-4 h-full">
              <p className="text-[9px] font-bold text-gray-700 uppercase mb-2">Planned Anaesthesia / Sedation</p>
              <div className="space-y-2">
                <Checkbox checked={data.anaesthesia_type === 'Local anaesthesia (intrapleural + drain site)'} label="Local anaesthesia (intrapleural + drain site)" />
                <Checkbox checked={data.anaesthesia_type === 'Local anaesthesia with sedation'} label="Local anaesthesia with sedation" />
                <Checkbox checked={data.anaesthesia_type === 'Systemic analgesia / pre-medication'} label="Systemic analgesia / pre-medication" />
              </div>
            </div>
          </div>
          <div>
            <div className="bg-[#475569] text-white px-3 py-2 flex items-center mb-3">
              <span className="font-bold text-sm mr-3">G</span>
              <span className="font-bold text-xs uppercase tracking-wide">Additional Options</span>
            </div>
            <div className="border border-gray-300 p-4 h-full">
              <FormField label="Additional procedures consented to" value={data.additional_procedures_consented} colSpan={1} underline />
              <FormField label="Procedures NOT to be carried out" value={data.procedures_declined} colSpan={1} underline />
              <div className="mt-2 space-y-2">
                <div className="flex gap-4">
                  <p className="text-[9px] font-bold text-gray-700 uppercase w-24">Blood Transfusion:</p>
                  <Checkbox checked={data.blood_transfusion === 'Consents'} label="Consents" />
                  <Checkbox checked={data.blood_transfusion === 'Declines (record reason / advance directive)'} label="Declines" />
                </div>
                <div className="flex gap-4">
                  <p className="text-[9px] font-bold text-gray-700 uppercase w-24">Photography:</p>
                  <Checkbox checked={data.clinical_photography === 'Consents – for clinical record'} label="Consents" />
                  <Checkbox checked={data.clinical_photography === 'Declines'} label="Declines" />
                </div>
                <Checkbox checked={data.tissue_specimens} label="Consents to removed tissue handled per policy" />
              </div>
            </div>
          </div>
        </div>

        {/* Part H - Interpreter */}
        <div className="mb-6">
          <div className="bg-[#475569] text-white px-3 py-2 flex items-center mb-3">
            <span className="font-bold text-sm mr-3">H</span>
            <span className="font-bold text-xs uppercase tracking-wide">Interpreter & Language</span>
          </div>
          <div className="border border-gray-300 p-4">
            <div className="grid grid-cols-4 gap-4">
              <FormField label="Language of discussion" value={data.discussion_language} colSpan={1} />
              <div className="col-span-1">
                <p className="text-[9px] font-bold text-gray-600 uppercase tracking-wide mb-1">Interpreter used?</p>
                <div className="flex gap-4">
                  <Checkbox checked={data.interpreter_used === 'Yes'} label="Yes" />
                  <Checkbox checked={data.interpreter_used === 'No'} label="No" />
                </div>
              </div>
              <div className="col-span-2">
                {data.interpreter_used === 'Yes' && (
                  <SignatureBlock 
                    title="Interpreter Signature"
                    signature={data.interpreter_signature}
                    name={data.interpreter_name}
                    designation={data.interpreter_designation}
                    date={data.interpreter_date}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Part I & J - Clinician Declaration */}
        <div className="mb-6 page-break-before">
          <div className="bg-[#1e40af] text-white px-3 py-2 flex items-center mb-3">
            <span className="font-bold text-sm mr-3">I & J</span>
            <span className="font-bold text-xs uppercase tracking-wide">Declaration of Consenting Clinician</span>
          </div>
          <div className="border border-gray-300 p-4">
            <p className="text-[9px] text-gray-700 font-bold mb-3 italic">
              I confirm I have explained the procedure and its purpose, the intended benefits, the material risks (serious and frequent), the risks specific to this patient, and the reasonable alternatives including no treatment. I have answered questions honestly, provided any relevant leaflet, and I am satisfied the patient (or parent/guardian) has capacity and consents voluntarily. I have appropriate knowledge of this procedure.
            </p>
            <FormField label="Additional Clinician Notes (Part J)" value={data.additional_clinician_notes} colSpan={1} underline />
            
            <div className="grid grid-cols-2 gap-4 mt-4">
              <SignatureBlock 
                title="Consenting Clinician"
                signature={data.clinician_signature}
                name={data.clinician_name}
                designation={data.clinician_designation}
                date={data.clinician_date}
              />
              <SignatureBlock 
                title="Second Clinician (if applicable)"
                signature={data.second_clinician_signature}
                name={data.second_clinician_name}
                designation={data.second_clinician_designation}
                date={data.clinician_date}
              />
            </div>
          </div>
        </div>

        {/* Part K - Patient Consent */}
        <div className="mb-6">
          <div className="bg-emerald-600 text-white px-3 py-2 flex items-center mb-3">
            <span className="font-bold text-sm mr-3">K</span>
            <span className="font-bold text-xs uppercase tracking-wide">Patient Consent Declaration</span>
          </div>
          <div className="border border-gray-300 p-4">
            <div className="space-y-1 mb-4">
              <Checkbox checked={data.read_understood} label="I have read, or had read to me, and I understand the information in Parts A to J of this form." />
              <Checkbox checked={data.risks_explained} label="The benefits, risks and alternatives have been explained and I have had the opportunity to ask questions." />
              <Checkbox checked={data.individual_risks_accepted} label="I understand and accept the risks described, including those relevant to my individual circumstances." />
              <Checkbox checked={data.modify_approach} label="I understand the team will use the planned approach but may modify it if clinically necessary during the procedure." />
              <Checkbox checked={data.anaesthesia_consent} label="I consent to the anaesthesia / sedation described in Part F." />
              <Checkbox checked={data.withdraw_consent_ack} label="I understand I may withdraw my consent at any time before the procedure begins." />
              <Checkbox checked={data.additional_procedures_ack} label="I consent to additional procedures judged immediately necessary to deal with an unexpected situation that cannot safely be deferred." />
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <SignatureBlock 
                title="Patient Signature"
                signature={data.patient_signature}
                name={data.patient_name}
                designation="Patient"
                date={data.patient_date}
              />
              <SignatureBlock 
                title="Witness Signature (If patient unable to sign)"
                signature={data.witness_signature}
                name={data.witness_name}
                designation="Witness"
                date={data.patient_date}
              />
            </div>
          </div>
        </div>

        {/* Part L - Parent / Guardian */}
        <div className="mb-6">
          <div className="bg-purple-600 text-white px-3 py-2 flex items-center mb-3">
            <span className="font-bold text-sm mr-3">L</span>
            <span className="font-bold text-xs uppercase tracking-wide">Consent by Parent / Guardian (If under 18 or lacking capacity)</span>
          </div>
          <div className="border border-gray-300 p-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <FormField label="Name of Parent / Guardian" value={data.parent_guardian_name} colSpan={1} />
              <FormField label="Relationship to Patient" value={data.relationship} colSpan={1} />
              <div className="col-span-2">
                <p className="text-[9px] font-bold text-gray-600 uppercase tracking-wide mb-1">Legal Basis</p>
                <div className="flex gap-4">
                  <Checkbox checked={data.legal_basis === 'Parental responsibility'} label="Parental responsibility" />
                  <Checkbox checked={data.legal_basis === 'Legal guardian'} label="Legal guardian" />
                  <Checkbox checked={data.legal_basis === 'Court order'} label="Court order" />
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <SignatureBlock 
                title="Parent / Guardian Signature"
                signature={data.parent_signature}
                name={data.parent_guardian_name}
                designation="Parent / Guardian"
                date={data.parent_date}
              />
              <SignatureBlock 
                title="Consenting Clinician (Confirming best interests)"
                signature={data.clinician_confirming_signature}
                name=""
                designation="Clinician"
                date={data.parent_date}
              />
            </div>
          </div>
        </div>

        {/* Part M - Confirmation & Withdrawal */}
        <div className="mb-6">
          <div className="bg-slate-800 text-white px-3 py-2 flex items-center mb-3">
            <span className="font-bold text-sm mr-3">M</span>
            <span className="font-bold text-xs uppercase tracking-wide">Confirmation & Withdrawal of Consent</span>
          </div>
          <div className="border border-gray-300 p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[9px] font-bold text-gray-700 uppercase mb-2">Confirmation immediately before procedure</p>
                <SignatureBlock 
                  title="Confirming Clinician"
                  signature={data.confirming_clinician_signature}
                  name={data.confirming_clinician_name}
                  designation="Clinician"
                />
              </div>
              <div>
                <p className="text-[9px] font-bold text-gray-700 uppercase mb-2">Withdrawal of Consent</p>
                <SignatureBlock 
                  title="Patient / Parent Withdrawal Signature"
                  signature={data.withdrawal_patient_signature}
                  name={data.withdrawal_patient_name}
                  designation="Patient / Parent"
                />
                <div className="mt-2">
                  <SignatureBlock 
                    title="Clinician Acknowledging Withdrawal"
                    signature={data.withdrawal_clinician_signature}
                    name={data.withdrawal_clinician_name}
                    designation="Clinician"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ChemicalPleurodesisPrintTemplate;


// import React, { useEffect, useState } from 'react';
// import { useParams } from 'react-router-dom';
// import { Loader2, AlertTriangle, Printer } from 'lucide-react';
// import { BASE_URL } from "../../../api/client";

// interface ChemicalPleurodesisPrintTemplateProps {
//   formData?: any;
//   templateData?: any;
// }

// const ChemicalPleurodesisPrintTemplate: React.FC<ChemicalPleurodesisPrintTemplateProps> = ({ formData: propFormData, templateData: propTemplateData }) => {
//   const { orderId } = useParams<{ orderId: string }>();
//   const [formData, setFormData] = useState<any>(propFormData || null);
//   const [templateData, setTemplateData] = useState<any>(propTemplateData || null);
//   const [loading, setLoading] = useState(!propFormData && !propTemplateData);
//   const [error, setError] = useState('');

//   useEffect(() => {
//     if (propFormData && propTemplateData) {
//       setFormData(propFormData);
//       setTemplateData(propTemplateData);
//       setLoading(false);
//       return;
//     }
//     setLoading(false);
//   }, [propFormData, propTemplateData]);

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
//         <p className="font-bold text-sm">Chemical Pleurodesis Consent Form Preview</p>
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
//             <p className="text-[#bfdbfe] text-[10px] leading-tight font-bold uppercase">Chest-Tube Chemical Pleurodesis</p>
//             <p className="text-[#bfdbfe]/80 text-[8px] mt-1">Form Ref: GSH-CONSENT-PLEU-001 • Policy Ref: GSH-T6 • Version 1.0</p>
//           </div>
//         </div>

//         {/* Address Bar */}
//         <div className="w-full text-center py-2 border-b border-slate-200 mb-6">
//           <p className="text-[8px] text-slate-500 font-medium italic">Head Office: Gracespring Hospitals Limited Plot 3, Block 32, Ajayi Apata Estate, Sangotedo, Lekki, Lagos, Nigeria Lagos State, Nigeria. &nbsp;•&nbsp; +234 705 648 2776 &nbsp;•&nbsp; info@gracespringhospital.com</p>
//         </div>

//         {/* Patient Rights */}
//         <div className="border border-gray-300 p-4 mb-6 bg-blue-50/50 rounded-sm italic">
//           <p className="text-[10px] font-bold text-gray-700 uppercase tracking-wide mb-1">Patient Rights</p>
//           <p className="text-[9px] text-gray-600 leading-relaxed">
//             You have the right to make decisions about your medical care and to refuse any procedure. If you wish to withdraw consent at any time before the procedure begins, you may do so. Signing this form does not remove your legal rights. This form complies with the National Health Act 2014 (Nigeria) and Gracespring Hospitals Consent Policy (GSH-T6).
//           </p>
//         </div>

//         {/* Part A - Patient Identification */}
//         <div className="mb-6">
//           <div className="bg-[#1e40af] text-white px-3 py-2 flex items-center mb-3">
//             <span className="font-bold text-sm mr-3">A</span>
//             <span className="font-bold text-xs uppercase tracking-wide">Patient Identification</span>
//           </div>
//           <div className="border border-gray-300 p-4">
//             <div className="grid grid-cols-4 gap-3">
//               <FormField label="Patient Full Name" value={data.patient_name} colSpan={2} />
//               <FormField label="Date of Birth" value={data.dob} colSpan={1} />
//               <FormField label="MRN" value={data.mrn} colSpan={1} />
//               <FormField label="Age / Sex" value={data.age_sex} colSpan={1} />
//               <FormField label="Consultant / Responsible Surgeon" value={data.consultant} colSpan={2} />
//               <FormField label="Ward / Unit" value={data.ward} colSpan={1} />
//               <FormField label="Primary Diagnosis / Indication" value={data.primary_diagnosis} colSpan={4} underline />
              
//               <div className="col-span-2 mt-2">
//                 <p className="text-[9px] font-bold text-gray-600 uppercase tracking-wide mb-2">Planned Surgical Approach</p>
//                 <div className="flex gap-4">
//                   <Checkbox checked={data.planned_approach === 'Via existing chest drain'} label="Via existing chest drain" />
//                   <Checkbox checked={data.planned_approach === 'Chest drain inserted for the procedure'} label="Chest drain inserted" />
//                   <Checkbox checked={data.planned_approach === 'Decision at the bedside'} label="Decision at bedside" />
//                 </div>
//               </div>
//               <div className="col-span-1 mt-2">
//                 <p className="text-[9px] font-bold text-gray-600 uppercase tracking-wide mb-2">Site / Side</p>
//                 <div className="flex gap-4">
//                   <Checkbox checked={data.site_side === 'Left'} label="Left" />
//                   <Checkbox checked={data.site_side === 'Right'} label="Right" />
//                   <Checkbox checked={data.site_side === 'N/A'} label="N/A" />
//                 </div>
//               </div>
//               <FormField label="Planned Date" value={data.planned_date} colSpan={1} />
//             </div>
//           </div>
//         </div>

//         {/* Part B & C */}
//         <div className="mb-6 grid grid-cols-2 gap-4">
//           <div>
//             <div className="bg-[#334155] text-white px-3 py-2 flex items-center mb-3">
//               <span className="font-bold text-sm mr-3">B</span>
//               <span className="font-bold text-xs uppercase tracking-wide">Description</span>
//             </div>
//             <div className="border border-gray-300 p-4 h-[180px]">
//               <p className="text-[9px] text-gray-700 leading-relaxed mb-2"><span className="font-bold uppercase">What the procedure involves:</span> Instillation of a sclerosing agent through a chest drain to make the lung lining stick to the chest wall, preventing repeated build-up of fluid or repeated lung collapse.</p>
//               <p className="text-[9px] text-gray-700 leading-relaxed"><span className="font-bold uppercase">How it is performed:</span> Drain position confirmed. Local anaesthetic instilled to reduce discomfort. Sclerosing agent mixed with saline instilled. Drain clamped for a period, patient repositioned, then unclamped.</p>
//             </div>
//           </div>
//           <div>
//             <div className="bg-[#334155] text-white px-3 py-2 flex items-center mb-3">
//               <span className="font-bold text-sm mr-3">C</span>
//               <span className="font-bold text-xs uppercase tracking-wide">Intended Benefits & Goals</span>
//             </div>
//             <div className="border border-gray-300 p-4 h-[180px]">
//               <p className="text-[9px] text-gray-700 leading-relaxed mb-3">Successful pleurodesis prevents repeated fluid build-up or lung collapse, relieves breathlessness, and reduces the need for repeated drainage.</p>
//               <FormField label="Specific goals / expected outcome discussed with this patient" value={data.expected_outcomes} colSpan={1} underline />
//             </div>
//           </div>
//         </div>

//         {/* Part D - Risks */}
//         <div className="mb-6">
//           <div className="bg-[#be123c] text-white px-3 py-2 flex items-center mb-3">
//             <span className="font-bold text-sm mr-3">D</span>
//             <span className="font-bold text-xs uppercase tracking-wide">Risks & Complications</span>
//           </div>
//           <div className="border border-gray-300 p-4">
//             <table className="w-full text-[9px] mb-4">
//               <thead>
//                 <tr className="bg-gray-100 border-b border-gray-300">
//                   <th className="text-left py-2 px-2 font-bold text-gray-700 uppercase">Frequency</th>
//                   <th className="text-left py-2 px-2 font-bold text-gray-700 uppercase">Risk / Complication</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 <tr className="border-b border-gray-200">
//                   <td className="py-2 px-2 font-semibold text-[#be123c]">VERY COMMON / COMMON</td>
//                   <td className="py-2 px-2">Chest pain and discomfort during and after instillation; fever and flu-like symptoms for 24–48 hours.</td>
//                 </tr>
//                 <tr className="border-b border-gray-200">
//                   <td className="py-2 px-2 font-semibold text-[#be123c]">COMMON</td>
//                   <td className="py-2 px-2">Incomplete or failed pleurodesis needing a repeat procedure or an alternative; drain-site discomfort.</td>
//                 </tr>
//                 <tr className="border-b border-gray-200">
//                   <td className="py-2 px-2 font-semibold">UNCOMMON</td>
//                   <td className="py-2 px-2">Wound or pleural infection (empyema); drain blockage or displacement; localised skin reaction.</td>
//                 </tr>
//                 <tr className="border-b border-gray-200">
//                   <td className="py-2 px-2 font-semibold">UNCOMMON</td>
//                   <td className="py-2 px-2">Breathlessness from fluid shifts; low blood pressure during the procedure.</td>
//                 </tr>
//                 <tr className="border-b border-gray-200">
//                   <td className="py-2 px-2 font-semibold">RARE</td>
//                   <td className="py-2 px-2">Re-expansion pulmonary oedema; injury to the lung; significant bleeding (haemothorax); acute respiratory distress (ARDS) – more associated with talc than other agents.</td>
//                 </tr>
//                 <tr className="border-b border-gray-200">
//                   <td className="py-2 px-2 font-semibold">VERY RARE</td>
//                   <td className="py-2 px-2">Life-threatening complication or death.</td>
//                 </tr>
//               </tbody>
//             </table>
//             <FormField label="Risks specific to THIS patient" value={data.individual_risks} colSpan={1} underline />
//           </div>
//         </div>

//         {/* Part E / E2 / E3 */}
//         <div className="mb-6 page-break-before">
//           <div className="bg-[#ea580c] text-white px-3 py-2 flex items-center mb-3">
//             <span className="font-bold text-sm mr-3">E</span>
//             <span className="font-bold text-xs uppercase tracking-wide">Alternatives, Sclerosant & Pain Relief</span>
//           </div>
//           <div className="border border-gray-300 p-4">
//             <div className="grid grid-cols-2 gap-6 mb-4">
//               <div>
//                 <p className="text-[9px] font-bold text-gray-700 uppercase mb-2">Alternatives to the procedure</p>
//                 <ul className="text-[9px] text-gray-700 list-disc pl-4 mb-2">
//                   <li>Repeated drainage (as needed)</li>
//                   <li>Indwelling pleural catheter (IPC)</li>
//                   <li>Thoracoscopic (VATS) pleurodesis / poudrage</li>
//                   <li>Different sclerosing agent</li>
//                   <li>No treatment</li>
//                 </ul>
//                 <FormField label="Alternatives discussed with this patient" value={data.alternatives_discussed} colSpan={1} underline />
//               </div>
//               <div>
//                 <p className="text-[9px] font-bold text-gray-700 uppercase mb-2">Sclerosant Details (Part E2)</p>
//                 <div className="space-y-2">
//                   <FormField label="Sclerosant / Agent" value={data.sclerosant_agent} colSpan={1} />
//                   <FormField label="Dose / Concentration" value={data.dose_concentration} colSpan={1} />
//                   <FormField label="Diluent & Volume" value={data.diluent_volume} colSpan={1} />
//                   <FormField label="Intrapleural Local Anaesthetic" value={data.intrapleural_anaesthetic_dose} colSpan={1} />
//                   <FormField label="Agent-specific risks discussed" value={data.agent_specific_risks} colSpan={1} underline />
//                 </div>
//               </div>
//             </div>
            
//             <div className="border-t border-gray-300 pt-4">
//               <p className="text-[9px] font-bold text-gray-700 uppercase mb-2">Pain Relief & Discussion (Part E3)</p>
//               <div className="flex gap-6 mb-3">
//                 <Checkbox checked={data.intrapleural_explained} label="Intrapleural local anaesthetic explained" />
//                 <Checkbox checked={data.repeat_explained} label="Possibility of repeat pleurodesis explained" />
//                 <Checkbox checked={data.alternatives_explained} label="Alternative agents/approaches explained" />
//               </div>
//               <FormField label="Discussion notes (agent choice, pain relief, likelihood of success)" value={data.discussion_notes} colSpan={1} underline />
//             </div>
//           </div>
//         </div>

//         {/* Part F & G */}
//         <div className="mb-6 grid grid-cols-2 gap-4">
//           <div>
//             <div className="bg-[#475569] text-white px-3 py-2 flex items-center mb-3">
//               <span className="font-bold text-sm mr-3">F</span>
//               <span className="font-bold text-xs uppercase tracking-wide">Anaesthesia</span>
//             </div>
//             <div className="border border-gray-300 p-4 h-full">
//               <p className="text-[9px] font-bold text-gray-700 uppercase mb-2">Planned Anaesthesia / Sedation</p>
//               <div className="space-y-2">
//                 <Checkbox checked={data.anaesthesia_type === 'Local anaesthesia (intrapleural + drain site)'} label="Local anaesthesia (intrapleural + drain site)" />
//                 <Checkbox checked={data.anaesthesia_type === 'Local anaesthesia with sedation'} label="Local anaesthesia with sedation" />
//                 <Checkbox checked={data.anaesthesia_type === 'Systemic analgesia / pre-medication'} label="Systemic analgesia / pre-medication" />
//               </div>
//             </div>
//           </div>
//           <div>
//             <div className="bg-[#475569] text-white px-3 py-2 flex items-center mb-3">
//               <span className="font-bold text-sm mr-3">G</span>
//               <span className="font-bold text-xs uppercase tracking-wide">Additional Options</span>
//             </div>
//             <div className="border border-gray-300 p-4 h-full">
//               <FormField label="Additional procedures consented to" value={data.additional_procedures_consented} colSpan={1} underline />
//               <FormField label="Procedures NOT to be carried out" value={data.procedures_declined} colSpan={1} underline />
//               <div className="mt-2 space-y-2">
//                 <div className="flex gap-4">
//                   <p className="text-[9px] font-bold text-gray-700 uppercase w-24">Blood Transfusion:</p>
//                   <Checkbox checked={data.blood_transfusion === 'Consents'} label="Consents" />
//                   <Checkbox checked={data.blood_transfusion === 'Declines (record reason / advance directive)'} label="Declines" />
//                 </div>
//                 <div className="flex gap-4">
//                   <p className="text-[9px] font-bold text-gray-700 uppercase w-24">Photography:</p>
//                   <Checkbox checked={data.clinical_photography === 'Consents – for clinical record'} label="Consents" />
//                   <Checkbox checked={data.clinical_photography === 'Declines'} label="Declines" />
//                 </div>
//                 <Checkbox checked={data.tissue_specimens} label="Consents to removed tissue handled per policy" />
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Part H - Interpreter */}
//         <div className="mb-6">
//           <div className="bg-[#475569] text-white px-3 py-2 flex items-center mb-3">
//             <span className="font-bold text-sm mr-3">H</span>
//             <span className="font-bold text-xs uppercase tracking-wide">Interpreter & Language</span>
//           </div>
//           <div className="border border-gray-300 p-4">
//             <div className="grid grid-cols-4 gap-4">
//               <FormField label="Language of discussion" value={data.discussion_language} colSpan={1} />
//               <div className="col-span-1">
//                 <p className="text-[9px] font-bold text-gray-600 uppercase tracking-wide mb-1">Interpreter used?</p>
//                 <div className="flex gap-4">
//                   <Checkbox checked={data.interpreter_used === 'Yes'} label="Yes" />
//                   <Checkbox checked={data.interpreter_used === 'No'} label="No" />
//                 </div>
//               </div>
//               <div className="col-span-2">
//                 {data.interpreter_used === 'Yes' && (
//                   <SignatureBlock 
//                     title="Interpreter Signature"
//                     signature={data.interpreter_signature}
//                     name={data.interpreter_name}
//                     designation={data.interpreter_designation}
//                     date={data.interpreter_date}
//                   />
//                 )}
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Part I & J - Clinician Declaration */}
//         <div className="mb-6 page-break-before">
//           <div className="bg-[#1e40af] text-white px-3 py-2 flex items-center mb-3">
//             <span className="font-bold text-sm mr-3">I & J</span>
//             <span className="font-bold text-xs uppercase tracking-wide">Declaration of Consenting Clinician</span>
//           </div>
//           <div className="border border-gray-300 p-4">
//             <p className="text-[9px] text-gray-700 font-bold mb-3 italic">
//               I confirm I have explained the procedure and its purpose, the intended benefits, the material risks (serious and frequent), the risks specific to this patient, and the reasonable alternatives including no treatment. I have answered questions honestly, provided any relevant leaflet, and I am satisfied the patient (or parent/guardian) has capacity and consents voluntarily. I have appropriate knowledge of this procedure.
//             </p>
//             <FormField label="Additional Clinician Notes (Part J)" value={data.additional_clinician_notes} colSpan={1} underline />
            
//             <div className="grid grid-cols-2 gap-4 mt-4">
//               <SignatureBlock 
//                 title="Consenting Clinician"
//                 signature={data.clinician_signature}
//                 name={data.clinician_name}
//                 designation={data.clinician_designation}
//                 date={data.clinician_date}
//               />
//               <SignatureBlock 
//                 title="Second Clinician (if applicable)"
//                 signature={data.second_clinician_signature}
//                 name={data.second_clinician_name}
//                 designation={data.second_clinician_designation}
//                 date={data.clinician_date}
//               />
//             </div>
//           </div>
//         </div>

//         {/* Part K - Patient Consent */}
//         <div className="mb-6">
//           <div className="bg-emerald-600 text-white px-3 py-2 flex items-center mb-3">
//             <span className="font-bold text-sm mr-3">K</span>
//             <span className="font-bold text-xs uppercase tracking-wide">Patient Consent Declaration</span>
//           </div>
//           <div className="border border-gray-300 p-4">
//             <div className="space-y-1 mb-4">
//               <Checkbox checked={data.read_understood} label="I have read, or had read to me, and I understand the information in Parts A to J of this form." />
//               <Checkbox checked={data.risks_explained} label="The benefits, risks and alternatives have been explained and I have had the opportunity to ask questions." />
//               <Checkbox checked={data.individual_risks_accepted} label="I understand and accept the risks described, including those relevant to my individual circumstances." />
//               <Checkbox checked={data.modify_approach} label="I understand the team will use the planned approach but may modify it if clinically necessary during the procedure." />
//               <Checkbox checked={data.anaesthesia_consent} label="I consent to the anaesthesia / sedation described in Part F." />
//               <Checkbox checked={data.withdraw_consent_ack} label="I understand I may withdraw my consent at any time before the procedure begins." />
//               <Checkbox checked={data.additional_procedures_ack} label="I consent to additional procedures judged immediately necessary to deal with an unexpected situation that cannot safely be deferred." />
//             </div>

//             <div className="grid grid-cols-2 gap-4 mt-4">
//               <SignatureBlock 
//                 title="Patient Signature"
//                 signature={data.patient_signature}
//                 name={data.patient_name}
//                 designation="Patient"
//                 date={data.patient_date}
//               />
//               <SignatureBlock 
//                 title="Witness Signature (If patient unable to sign)"
//                 signature={data.witness_signature}
//                 name={data.witness_name}
//                 designation="Witness"
//                 date={data.patient_date}
//               />
//             </div>
//           </div>
//         </div>

//         {/* Part L - Parent / Guardian */}
//         <div className="mb-6">
//           <div className="bg-purple-600 text-white px-3 py-2 flex items-center mb-3">
//             <span className="font-bold text-sm mr-3">L</span>
//             <span className="font-bold text-xs uppercase tracking-wide">Consent by Parent / Guardian (If under 18 or lacking capacity)</span>
//           </div>
//           <div className="border border-gray-300 p-4">
//             <div className="grid grid-cols-2 gap-4 mb-4">
//               <FormField label="Name of Parent / Guardian" value={data.parent_guardian_name} colSpan={1} />
//               <FormField label="Relationship to Patient" value={data.relationship} colSpan={1} />
//               <div className="col-span-2">
//                 <p className="text-[9px] font-bold text-gray-600 uppercase tracking-wide mb-1">Legal Basis</p>
//                 <div className="flex gap-4">
//                   <Checkbox checked={data.legal_basis === 'Parental responsibility'} label="Parental responsibility" />
//                   <Checkbox checked={data.legal_basis === 'Legal guardian'} label="Legal guardian" />
//                   <Checkbox checked={data.legal_basis === 'Court order'} label="Court order" />
//                 </div>
//               </div>
//             </div>
            
//             <div className="grid grid-cols-2 gap-4">
//               <SignatureBlock 
//                 title="Parent / Guardian Signature"
//                 signature={data.parent_signature}
//                 name={data.parent_guardian_name}
//                 designation="Parent / Guardian"
//                 date={data.parent_date}
//               />
//               <SignatureBlock 
//                 title="Consenting Clinician (Confirming best interests)"
//                 signature={data.clinician_confirming_signature}
//                 name=""
//                 designation="Clinician"
//                 date={data.parent_date}
//               />
//             </div>
//           </div>
//         </div>

//         {/* Part M - Confirmation & Withdrawal */}
//         <div className="mb-6">
//           <div className="bg-slate-800 text-white px-3 py-2 flex items-center mb-3">
//             <span className="font-bold text-sm mr-3">M</span>
//             <span className="font-bold text-xs uppercase tracking-wide">Confirmation & Withdrawal of Consent</span>
//           </div>
//           <div className="border border-gray-300 p-4">
//             <div className="grid grid-cols-2 gap-4">
//               <div>
//                 <p className="text-[9px] font-bold text-gray-700 uppercase mb-2">Confirmation immediately before procedure</p>
//                 <SignatureBlock 
//                   title="Confirming Clinician"
//                   signature={data.confirming_clinician_signature}
//                   name={data.confirming_clinician_name}
//                   designation="Clinician"
//                 />
//               </div>
//               <div>
//                 <p className="text-[9px] font-bold text-gray-700 uppercase mb-2">Withdrawal of Consent</p>
//                 <SignatureBlock 
//                   title="Patient / Parent Withdrawal Signature"
//                   signature={data.withdrawal_patient_signature}
//                   name={data.withdrawal_patient_name}
//                   designation="Patient / Parent"
//                 />
//                 <div className="mt-2">
//                   <SignatureBlock 
//                     title="Clinician Acknowledging Withdrawal"
//                     signature={data.withdrawal_clinician_signature}
//                     name={data.withdrawal_clinician_name}
//                     designation="Clinician"
//                   />
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>

//       </div>
//     </div>
//   );
// };

// export default ChemicalPleurodesisPrintTemplate;
