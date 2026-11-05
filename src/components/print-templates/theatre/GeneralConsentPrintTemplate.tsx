import React from "react";
import { Printer } from "lucide-react";
import { BASE_URL } from "../../../api/client";

interface GeneralConsentPrintTemplateProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
}

const GeneralConsentPrintTemplate: React.FC<GeneralConsentPrintTemplateProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  if (!isOpen) return null;

  const formData = data.form_data || data;

  const getSigUrl = (path: string | undefined | null) => {
    if (!path) return "";
    if (path.startsWith("data:")) return path;
    const normalizedBaseUrl = BASE_URL.replace(/\/$/, "");
    return path.startsWith("/") ? `${normalizedBaseUrl}${path}` : `${normalizedBaseUrl}/${path}`;
  };

  const FormField = ({ label, value, colSpan = 1 }: { label: string; value?: string; colSpan?: number }) => (
    <div className={`col-span-${colSpan} mb-2`}>
      <p className="text-[9px] font-bold text-gray-600 uppercase tracking-wide mb-1">{label}</p>
      <div className="border border-gray-300 bg-gray-50 px-2 py-1 min-h-[24px]">
        <span className="text-[11px] text-gray-800">{value || "-"}</span>
      </div>
    </div>
  );

  const Checkbox = ({ checked, label }: { checked?: boolean; label?: string }) => (
    <div className="flex items-start gap-2 mb-1">
      <div className={`w-4 h-4 border-2 ${checked ? "bg-black border-black" : "border-gray-400 bg-white"} mt-0.5 flex-shrink-0 flex items-center justify-center`}>
        {checked && <span className="text-white text-xs font-bold">✓</span>}
      </div>
      {label && <span className="text-[10px] text-gray-800 leading-tight">{label}</span>}
    </div>
  );

  const SignatureBlock = ({ title, signature, name, designation, date, time }: { title: string; signature?: string; name?: string; designation?: string; date?: string; time?: string }) => (
    <div className="border border-gray-300 p-3 bg-gray-50">
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
            <span className="text-[9px] text-gray-800">{name || ""}</span>
          </div>
        </div>
        <div>
          <p className="text-[8px] text-gray-500 uppercase">{designation ? "Designation" : "Date"}</p>
          <div className="border-b border-gray-400 h-5 mt-1">
            <span className="text-[9px] text-gray-800">{designation || date || ""}</span>
          </div>
        </div>
      </div>
      {(designation && date) && (
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div>
            <p className="text-[8px] text-gray-500 uppercase">Date</p>
            <div className="border-b border-gray-400 h-5 mt-1">
              <span className="text-[9px] text-gray-800">{date}</span>
            </div>
          </div>
          {time && (
            <div>
              <p className="text-[8px] text-gray-500 uppercase">Time</p>
              <div className="border-b border-gray-400 h-5 mt-1">
                <span className="text-[9px] text-gray-800">{time}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const d = formData || {};

  return (
    <div
      className="fixed inset-0 bg-slate-100 overflow-y-auto px-4 py-20 print:static print:bg-white print:p-0 z-[200]"
      style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" } as any}
    >
      <div className="fixed top-0 left-0 right-0 h-16 bg-slate-900 text-white flex items-center justify-between px-8 print:hidden z-[210] shadow-md">
        <p className="font-bold text-sm">Procedure Consent Form Preview</p>
        <div className="flex items-center gap-4">
          <button onClick={() => window.print()} className="bg-[#3B309A] hover:bg-[#2d258a] text-white px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all">
            <Printer size={16} /> Print Form
          </button>
          <button onClick={onClose} className="text-white hover:text-gray-300 font-bold">
            Close
          </button>
        </div>
      </div>

      <div className="w-[210mm] bg-white p-8 shadow-2xl print:shadow-none print:m-0 print:border-none border border-slate-200 mx-auto text-[11px]">
        {/* Header Block */}
        <div className="w-full bg-[#3B309A] flex items-center p-4 min-h-[28mm] mb-1">
          <div className="w-[25%] flex items-center justify-center border-r-[1.5px] border-[#4c3fbf] pr-4 h-full">
            <img src="/assets/login-bg.jpeg" alt="Logo" className="w-[20mm] object-contain" />
          </div>
          <div className="w-[75%] pl-6 flex flex-col justify-center">
            <h1 className="text-white text-2xl font-extrabold leading-none tracking-tight mb-2 uppercase italic">
              Procedure Consent Form
            </h1>
            <p className="text-[#bfb8ff] text-[10px] leading-tight font-bold uppercase">
              {d.procedure_name || "General Surgery & Clinical Intervention"} {d.procedure_code}
            </p>
            <p className="text-[#bfb8ff]/70 text-[8px] mt-1">Form Ref: GSH-CONSENT-GEN-021 • Policy Ref: GSH-T6 • Version 1.0</p>
          </div>
        </div>

        {/* Address Bar */}
        <div className="w-full text-center py-2 border-b border-slate-200 mb-4">
          <p className="text-[8px] text-slate-500 font-medium italic">Head Office: Gracespring Hospitals Limited Plot 3, Block 32, Ajayi Apata Estate, Sangotedo, Lekki, Lagos, Nigeria &nbsp;•&nbsp; +234 705 648 2776 &nbsp;•&nbsp; info@gracespringhospital.com</p>
        </div>

        {/* Patient Rights */}
        <div className="mb-4 p-3 rounded bg-amber-50 border border-amber-200">
          <p className="text-[9px] leading-relaxed text-amber-800 text-justify">
            <span className="font-black">Patient Rights:</span> You have the right to make decisions about your medical care and to refuse any procedure. If you wish to withdraw consent at any time before the procedure begins, you may do so. Signing this form does not remove your legal rights. This form complies with the <span className="font-black">National Health Act 2014 (Nigeria)</span> and Gracespring Hospitals Consent Policy (GSH-T6).
          </p>
        </div>

        {/* Part A — Patient Identification */}
        <div className="mb-4">
          <div className="bg-[#3B309A] text-white px-3 py-1 inline-block text-[10px] font-bold uppercase tracking-widest mb-1">Part A — Patient Identification</div>
          <div className="border border-slate-400 p-4 grid grid-cols-4 gap-4">
            <FormField label="Patient Full Name" value={d.patient_full_name} colSpan={2} />
            <FormField label="Date of Birth" value={d.date_of_birth} />
            <FormField label="Sex at Birth" value={d.sex_at_birth} />
            <FormField label="MRN" value={d.mrn} />
            <FormField label="Ward / Unit" value={d.ward_unit} />
            <FormField label="Consultant / Responsible Surgeon" value={d.consultant} colSpan={2} />
            <div className="col-span-4">
              <FormField label="Primary Diagnosis / Indication for Procedure" value={d.primary_diagnosis} />
            </div>
            <FormField label="Proposed Procedure Name" value={d.procedure_name} colSpan={2} />
            <FormField label="Site / Side" value={d.procedure_site} />
            <FormField label="Urgency" value={d.urgency} />
            <FormField label="Planned Date" value={d.planned_date} />
            <div className="col-span-3">
              <p className="text-[9px] font-bold text-gray-600 uppercase tracking-wide mb-1">Planned Anaesthesia</p>
              <div className="flex gap-4 flex-wrap">
                {["General", "Regional", "Local", "Sedation"].map((type) => (
                  <Checkbox key={type} checked={Array.isArray(d.planned_anaesthesia) && d.planned_anaesthesia.includes(type)} label={type} />
                ))}
              </div>
            </div>
            <div className="col-span-4">
              <FormField label="Consent Statement / Declaration" value={d.consent_statement} />
            </div>
          </div>
        </div>

        {/* Part B-E — Procedure, Benefits, Risks, Alternatives */}
        <div className="mb-4">
          <div className="bg-[#334155] text-white px-3 py-1 inline-block text-[10px] font-bold uppercase tracking-widest mb-1">Part B-E — Procedure, Benefits, Risks & Alternatives</div>
          <div className="border border-slate-400 p-4 grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <FormField label="Description of the Procedure" value={d.procedure_description} />
            </div>
            <FormField label="Expected Benefits" value={d.expected_benefits} />
            <FormField label="Risks Discussed" value={d.risks_discussed} />
            {d.patient_specific_risks && <FormField label="Patient-specific Risks" value={d.patient_specific_risks} colSpan={2} />}
            <FormField label="Alternatives Discussed" value={d.alternatives_discussed} />
            <FormField label="Consequences of No Treatment" value={d.consequences_no_treatment} />
          </div>
        </div>

        <div className="page-break" style={{ pageBreakAfter: "always" }} />

        {/* Part F-H — Anaesthesia, Additional Procedures, Blood/Tissue/Implants */}
        <div className="mb-4">
          <div className="bg-[#334155] text-white px-3 py-1 inline-block text-[10px] font-bold uppercase tracking-widest mb-1">Part F-H — Anaesthesia, Additional Procedures & Blood/Tissue Consent</div>
          <div className="border border-slate-400 p-4 grid grid-cols-2 gap-4">
            <FormField label="Anaesthesia Type" value={d.anaesthesia_type} />
            <FormField label="Blood Consent" value={d.blood_consent} />
            {d.decline_reason && <FormField label="Decline Reason" value={d.decline_reason} colSpan={2} />}
            <FormField label="Additional Procedures Allowed" value={d.additional_procedures_allowed} />
            <FormField label="Procedures NOT Allowed" value={d.procedures_not_allowed} />
            {d.implant_details && <FormField label="Implant Details" value={d.implant_details} colSpan={2} />}
            <Checkbox checked={d.tissue_consent} label="Consent to Tissue Examination" />
            <FormField label="Clinical Photo" value={d.clinical_photo} />
          </div>
        </div>

        {/* Part I — Language & Capacity */}
        <div className="mb-4">
          <div className="bg-[#334155] text-white px-3 py-1 inline-block text-[10px] font-bold uppercase tracking-widest mb-1">Part I — Language & Capacity</div>
          <div className="border border-slate-400 p-4 grid grid-cols-2 gap-4">
            <FormField label="Language" value={d.language} />
            <Checkbox checked={d.interpreter_used} label="Interpreter Used" />
            {d.interpreter_used && (
              <>
                <FormField label="Interpreter Name" value={d.interpreter_name} />
                <SignatureBlock title="Interpreter Signature" signature={d.interpreter_signature} />
              </>
            )}
          </div>
        </div>

        {/* Patient Questions */}
        {d.patient_questions && (
          <div className="mb-4">
            <div className="bg-[#475569] text-white px-3 py-1 inline-block text-[10px] font-bold uppercase tracking-widest mb-1">Patient Questions</div>
            <div className="border border-slate-400 p-4">
              <FormField label="Questions Raised" value={d.patient_questions} />
            </div>
          </div>
        )}

        <div className="page-break" style={{ pageBreakAfter: "always" }} />

        {/* Final Declarations & Signatures */}
        <div className="mb-4">
          <div className="bg-[#1e1b4b] text-white px-3 py-1 inline-block text-[10px] font-bold uppercase tracking-widest mb-1">Final Declarations & Signatures</div>
          <div className="border border-slate-400 p-4 grid grid-cols-1 gap-4">
            <div>
              <Checkbox checked={d.clinician_confirm} label="I confirm that I have explained the nature, purpose, benefits and risks." />
              <SignatureBlock title="Declaration of Clinician" signature={d.clinician_signature} name={d.doctor_name} designation={d.doctor_designation} date={d.doctor_date} time={d.doctor_time} />
            </div>
            <div>
              <Checkbox checked={d.patient_confirm} label="I give my informed consent to proceed with the procedure." />
              <SignatureBlock title="Patient Consent" signature={d.patient_signature} name={d.patient_name} date={d.patient_date} time={d.patient_time} />
            </div>
            <div>
              <p className="text-[10px] text-gray-700 mb-2">I verify that the patient identity has been confirmed and the consent has been signed in my presence.</p>
              <SignatureBlock title="Nurse Verification" signature={d.nurse_signature} name={d.nurse_name} date={d.nurse_date} />
            </div>
          </div>
        </div>

        {/* Part M — Consent on Behalf of Patient */}
        {(d.representative_name || d.representative_signature) && (
          <div className="mb-4">
            <div className="bg-[#475569] text-white px-3 py-1 inline-block text-[10px] font-bold uppercase tracking-widest mb-1">Part M — Consent on Behalf of Patient</div>
            <div className="border border-slate-400 p-4 grid grid-cols-2 gap-4">
              <FormField label="Representative Name" value={d.representative_name} />
              <FormField label="Relationship" value={d.relationship} />
              <FormField label="Legal Basis" value={d.legal_basis} />
              <SignatureBlock title="Representative Signature" signature={d.representative_signature} />
            </div>
          </div>
        )}

        {/* Part N — Withdrawal of Consent */}
        <div className="mb-4">
          <div className="bg-[#dc2626] text-white px-3 py-1 inline-block text-[10px] font-bold uppercase tracking-widest mb-1">Part N — Withdrawal of Consent</div>
          <div className="border-2 border-red-500 p-4 grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <FormField label="Withdrawal Reason" value={d.withdrawal_reason} />
            </div>
            <SignatureBlock title="Patient / Representative Signature" signature={d.withdrawal_signature} />
            <SignatureBlock title="Clinician Signature" signature={d.clinician_withdrawal_signature} />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-200 flex justify-between items-center text-[8px] text-slate-400 font-bold uppercase tracking-widest">
          <span>Gracespring Hospitals - Clinical Documentation</span>
          <span>Form GSH-CONSENT-GEN-021 • v1.0</span>
        </div>
      </div>
    </div>
  );
};

export default GeneralConsentPrintTemplate;
