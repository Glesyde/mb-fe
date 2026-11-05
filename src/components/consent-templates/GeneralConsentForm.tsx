import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { CheckCircle, Loader2, Printer, AlertCircle, Save } from "lucide-react";
import { consentService, ConsentTemplate } from "../../services/consent.service";
import SignaturePad from "../SignaturePad";
import { useAuth } from "../../context/AuthContext";
import { useNotification } from "../../context/NotificationContext";
import GeneralConsentPrintTemplate from "../print-templates/theatre/GeneralConsentPrintTemplate";
import { OTSurgery } from "../../services/ot.service";
import { BASE_URL } from "../../api/client";
import apiClient from "../../api/client";
import { patientService } from "../../services/patient.service";
import { formDraftService } from "../../services/session-restore.service";

interface GeneralConsentFormProps {
  surgery: OTSurgery;
  initialData?: any;
  draftId?: number | null;
  onSuccess?: () => void;
  onCancel: () => void;
  readOnly?: boolean;
  viewData?: any;
}

const GeneralConsentForm: React.FC<GeneralConsentFormProps> = ({
  surgery,
  initialData,
  draftId,
  onSuccess,
  onCancel,
  readOnly = false,
  viewData,
}) => {
  const { user } = useAuth();
  const { notify } = useNotification();

  // FIX: Properly strip /api or /api/v1 from BASE_URL to point to the public root for uploads
  const getSigUrl = (path: string | undefined | null) => {
    if (!path) return "";
    if (path.startsWith("data:")) return path;
    const normalizedBaseUrl = BASE_URL.replace(/\/api(\/v\d+)?\/?$/, "").replace(/\/$/, "");
    return path.startsWith("/") ? `${normalizedBaseUrl}${path}` : `${normalizedBaseUrl}/${path}`;
  };

  const [template, setTemplate] = useState<ConsentTemplate | null>(null);
  const [loading, setLoading] = useState(!readOnly);
  const [submitting, setSubmitting] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  
  // Ref for the local auto-save timer
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [formData, setFormData] = useState<any>(viewData || initialData || {
    patient_full_name: "",
    patient_name: "",
    mrn: "",
    date_of_birth: "",
    sex_at_birth: "",
    ward_unit: "",
    consultant: "",
    primary_diagnosis: "",
    procedure_name: "",
    procedure_code: "",
    procedure_site: "",
    planned_date: "",
    urgency: "",
    planned_anaesthesia: [],
    procedure_description: "",
    expected_benefits: "",
    risks_discussed: "",
    patient_specific_risks: "",
    alternatives_discussed: "",
    consequences_no_treatment: "",
    anaesthesia_type: "",
    additional_procedures_allowed: "",
    procedures_not_allowed: "",
    blood_consent: "",
    decline_reason: "",
    implant_details: "",
    tissue_consent: false,
    clinical_photo: "",
    language: "",
    interpreter_used: false,
    interpreter_name: "",
    interpreter_signature: null,
    patient_questions: "",
    consent_statement: "I hereby give my consent for the surgery/procedure described above. I understand the risks and benefits explained to me by the doctor.",
    consent_date: new Date().toISOString().split("T")[0],
    doctor_declaration: false,
    doctor_name: "",
    doctor_designation: "",
    doctor_date: new Date().toISOString().split("T")[0],
    doctor_time: "",
    patient_declarations: [],
    patient_date: new Date().toISOString().split("T")[0],
    patient_time: "",
    nurse_name: "",
    nurse_date: new Date().toISOString().split("T")[0],
    clinician_signature: null,
    patient_signature: null,
    nurse_signature: null,
    representative_name: "",
    relationship: "",
    legal_basis: "",
    representative_signature: null,
    withdrawal_reason: "",
    withdrawal_signature: null,
    clinician_withdrawal_signature: null,
    clinician_confirm: false,
    patient_confirm: false,
  });

  // FIX: Ensure viewData or initialData syncs properly into state on Read-Only views
  useEffect(() => {
    if (viewData || initialData) {
      setFormData((prev: any) => ({ ...prev, ...(viewData || initialData) }));
    }
  }, [viewData, initialData]);

  const isPartComplete = (fields: string[]) => {
    return fields.every(field => {
      const val = formData[field];
      if (typeof val === 'boolean') return val;
      if (Array.isArray(val)) return val.length > 0;
      return val !== null && val !== undefined && val !== "";
    });
  };

  const PartWarning = ({ fields }: { fields: string[] }) => {
    if (isPartComplete(fields) || readOnly) return null;
    return (
      <div className="absolute top-4 right-6 flex items-center gap-1 text-amber-500 bg-amber-50 px-3 py-1 rounded-full text-[10px] font-bold border border-amber-200 shadow-sm animate-pulse">
        <AlertCircle size={12} /> Incomplete
      </div>
    );
  };

  const handleCheckboxGroupChange = (field: string, value: string) => {
    setFormData((prev: any) => {
      const current = prev[field] || [];
      if (current.includes(value)) {
        return { ...prev, [field]: current.filter((v: string) => v !== value) };
      }
      return { ...prev, [field]: [...current, value] };
    });
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const fetchTemplate = async () => {
    setLoading(true);
    try {
      const data = await consentService.getTemplate("general-procedure-consent");
      setTemplate(data);
    } catch (error) {
      console.error("Failed to load template:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!readOnly) fetchTemplate();
  }, [readOnly]);

  // =========================================================================
  // PRE-FILL HOOK & LOCAL DRAFT RESTORE
  // =========================================================================
  useEffect(() => {
    if (!readOnly && surgery?.mrn && !viewData && !initialData) {
      
      const localDraftId = `consent_general_${surgery.order_id || surgery.id}`;
      const savedDraft = user?.id ? formDraftService.loadDraft<any>(user.id, localDraftId) : null;
      
      if (savedDraft) {
        setFormData(savedDraft);
        notify("Restored unsaved changes from your previous session", "success");
        return;
      }

      const fetchPrefillData = async () => {
        try {
          // 1. Fetch Patient Demographics
          const patient = await patientService.getPatientByMrn(surgery.mrn);

          // 2. Fetch Active Admission to get Ward/Unit
          let wardUnit = "";
          try {
            const admissionRes = await apiClient.get("/ipd/admission/list");
            const admissions = admissionRes.data?.data?.results || [];
            
            // Find active admission for THIS specific patient
            const activeAdmission = admissions.find(
              (a: any) => a.mrn === surgery.mrn && a.status === "ACTIVE"
            );
            
            if (activeAdmission) {
              wardUnit = [
                activeAdmission.ward_name, 
                activeAdmission.room_number, 
                activeAdmission.bed_number
              ].filter(Boolean).join(" / ");
            }
          } catch (admError) {
            console.warn("Could not fetch admission data for pre-fill", admError);
          }

          // 3. Inject data into formData
          if (patient) {
            setFormData((prev: any) => {
              const firstName = patient.demographics?.first_name || "";
              const lastName = patient.demographics?.last_name || "";
              const fullName = `${firstName} ${lastName}`.trim();

              return {
                ...prev,
                patient_full_name: prev.patient_full_name || fullName,
                patient_name: prev.patient_name || fullName,
                mrn: surgery.mrn,
                procedure_name: surgery.surgery_name,
                procedure_code: surgery.ot_case_number,
                date_of_birth: prev.date_of_birth || patient.demographics?.date_of_birth || "",
                sex_at_birth: prev.sex_at_birth || patient.demographics?.gender || "",
                ward_unit: prev.ward_unit || wardUnit,
              };
            });
          }
        } catch (error) {
          console.error("Failed to prefill patient data", error);
        }
      };

      fetchPrefillData();
    }
  }, [surgery?.mrn, readOnly, viewData, initialData, surgery, user?.id]);

  // 2. Local Auto-Save Loop
  useEffect(() => {
    if (readOnly || !surgery || !user?.id) return;
    
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    
    autoSaveTimerRef.current = setTimeout(() => {
      const localDraftId = `consent_general_${surgery.order_id || surgery.id}`;
      formDraftService.saveDraft(user.id!, localDraftId, formData);
    }, 1500);
    
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
  }, [formData, surgery, user?.id, readOnly]);

  useEffect(() => {
    if (isPrintOpen && formData) {
      const timer = setTimeout(() => {
        const printContent = document.getElementById('general-print-content');
        if (printContent) {
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            printWindow.document.write(`
              <html>
                <head>
                  <title>General Procedure Consent - Print</title>
                  <script src="https://cdn.tailwindcss.com"></script>
                  <style>
                    @media print {
                      body { -webkit-print-color-adjust: exact; }
                      .page-break { page-break-after: always; }
                    }
                  </style>
                </head>
                <body>${printContent.innerHTML}</body>
                <script>
                  window.onload = () => { 
                    setTimeout(() => {
                      window.print(); 
                    }, 500);
                  }
                </script>
              </html>
            `);
            printWindow.document.close();
          }
        }
        setIsPrintOpen(false);
      }, 1500); // Give time for portal to render
      return () => clearTimeout(timer);
    }
  }, [isPrintOpen, formData]);

  // Helper for rendering signatures properly across Draft / ReadOnly / Edit modes
  const renderSignatureBox = (id: string, label: string) => {
    const hasSignature = formData[id] && typeof formData[id] === 'string' && formData[id].length > 0;
    
    if (readOnly) {
      return (
        <div className="h-full w-full flex items-center justify-center p-2">
          {hasSignature ? (
            <img src={getSigUrl(formData[id])} alt={label} className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="text-slate-300 font-bold uppercase text-xs">No Signature</span>
          )}
        </div>
      );
    }

    if (hasSignature) {
      return (
        <div className="h-full w-full flex items-center justify-center p-2 relative group">
          <img src={getSigUrl(formData[id])} alt={label} className="max-h-full max-w-full object-contain" />
          <button 
            onClick={() => handleInputChange(id, null)} 
            className="absolute top-2 right-2 bg-red-100 text-red-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase hover:bg-red-200 transition-colors opacity-0 group-hover:opacity-100 shadow-sm"
            title="Clear Signature"
          >
            Clear
          </button>
        </div>
      );
    }

    return (
      <SignaturePad
        onEnd={(data) => handleInputChange(id, data)}
        onClear={() => handleInputChange(id, null)}
        className="h-full w-full"
      />
    );
  };

  // 3. Save as Backend Draft Handler
  const handleSaveDraft = async () => {
    setSubmitting(true);
    try {
      const cleanedFormData = { ...formData };
      await consentService.createConsent({
        order_id: surgery.order_id || surgery.id,
        template_slug: "general-procedure-consent",
        witness_user_id: user?.id || 1,
        form_data: cleanedFormData,
        is_draft: true,
        consent_id: draftId,
      });
      notify("Draft saved successfully to the system", "success");
      
      // Clear local storage draft
      if (user?.id) formDraftService.clearDraft(user.id, `consent_general_${surgery.order_id || surgery.id}`);
      
      onCancel(); 
    } catch (error: any) {
      notify(error.response?.data?.message || error.message || "Failed to save draft", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Finalizing and Submitting Consent Handler
  const handleSubmit = async () => {
    if (!formData.clinician_signature || !formData.patient_signature) {
      notify("Both Clinician and Patient signatures are required", "error");
      return;
    }

    setSubmitting(true);
    try {
      const cleanedFormData = { ...formData };
      const payload = {
        template_slug: "general-procedure-consent",
        order_id: surgery.order_id || surgery.id,
        witness_user_id: user?.id || 1,
        form_data: cleanedFormData,
        consent_id: draftId,
      };
      
      await consentService.createConsent(payload);
      notify("Consent form submitted successfully", "success");
      
      // Clear local storage draft
      if (user?.id) formDraftService.clearDraft(user.id, `consent_general_${surgery.order_id || surgery.id}`);

      if (onSuccess) onSuccess();
      setIsPrintOpen(true);
    } catch (error: any) {
      notify(error.response?.data?.message || error.message || "Failed to submit consent", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl shadow-xl mx-auto max-w-4xl">
        <Loader2 className="animate-spin text-brand-primary mb-4" size={48} />
        <p className="text-slate-500 font-bold uppercase tracking-widest animate-pulse">Loading Procedure Template...</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col max-w-6xl mx-auto w-[90vw]">
        {/* Header */}
        <div className="bg-[#1e1b4b] text-white p-10 flex justify-between items-center relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-active/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
          <div className="z-10">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                <img src="/assets/login-bg.jpeg" alt="Logo" className="w-10 h-10 object-contain" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tighter">Procedure Consent Form</h1>
                <p className="text-brand-primary font-bold text-sm uppercase tracking-widest">General Surgery & Clinical Intervention</p>
              </div>
            </div>
            <p className="text-xs text-brand-active/60 font-medium">Form Ref: GSH-CONSENT-GEN-021 • Policy Ref: GSH-T6 • Version 1.0</p>
          </div>
          <div className="text-right z-10 flex flex-col items-end gap-3">
             <div className="hidden md:block text-right">
                <p className="text-[10px] text-brand-active font-bold leading-tight uppercase tracking-wider">Medbookie</p>
                <p className="text-[10px] text-brand-active">+234 705 648 2776 • admin@Medbookiehospitals.com</p>
             </div>
             <button 
               onClick={() => setIsPrintOpen(true)}
               className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/20 transition-all"
             >
               <Printer size={14} /> Print Blank Form
             </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar bg-white">
          
          {/* Patient Rights */}
          <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-amber-200/50 px-4 py-1 rounded-bl-xl text-[10px] font-black text-amber-800 uppercase tracking-wider">Patient Rights</div>
            <p className="text-sm text-amber-900 font-medium leading-relaxed italic">
              "You have the right to make decisions about your medical care and to refuse any procedure. If you wish to withdraw consent at any time before the procedure begins, you may do so. Signing this form does not remove your legal rights. This form complies with the National Health Act 2014 (Nigeria) and Medbookie Consent Policy (GSH-T6)."
            </p>
          </div>

          {/* Part A - Patient Identification */}
          <section>
            <div className="bg-brand-primary text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part A — Patient Identification</div>
            <div className="border-4 border-slate-900 rounded-3xl p-8 grid grid-cols-1 md:grid-cols-3 gap-8 shadow-inner bg-slate-50 relative">
              <PartWarning fields={["patient_full_name", "mrn", "procedure_name", "consent_statement"]} />
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient Full Name *</label>
                <input type="text" value={formData.patient_full_name} onChange={(e) => handleInputChange("patient_full_name", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Date of Birth</label>
                <input type="date" value={formData.date_of_birth} onChange={(e) => handleInputChange("date_of_birth", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Sex at Birth</label>
                <select value={formData.sex_at_birth} onChange={(e) => handleInputChange("sex_at_birth", e.target.value)} disabled={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`}>
                  <option value="">Select...</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">MRN (Medical Record Number) *</label>
                <input type="text" value={formData.mrn} className="w-full bg-slate-100 border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-500" readOnly />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Ward / Unit</label>
                <input type="text" value={formData.ward_unit} onChange={(e) => handleInputChange("ward_unit", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Consultant / Responsible Surgeon</label>
                <input type="text" value={formData.consultant} onChange={(e) => handleInputChange("consultant", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
              </div>
              <div className="md:col-span-3 space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Primary Diagnosis / Indication for Procedure</label>
                <textarea rows={2} value={formData.primary_diagnosis} onChange={(e) => handleInputChange("primary_diagnosis", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Proposed Procedure Name *</label>
                <input type="text" value={formData.procedure_name} onChange={(e) => handleInputChange("procedure_name", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Site / Side</label>
                <select value={formData.procedure_site} onChange={(e) => handleInputChange("procedure_site", e.target.value)} disabled={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`}>
                  <option value="">Select...</option>
                  <option value="Left">Left</option>
                  <option value="Right">Right</option>
                  <option value="N/A">N/A</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Planned Date</label>
                <input type="date" value={formData.planned_date} onChange={(e) => handleInputChange("planned_date", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Urgency</label>
                <select value={formData.urgency} onChange={(e) => handleInputChange("urgency", e.target.value)} disabled={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`}>
                  <option value="">Select...</option>
                  <option value="Elective">Elective</option>
                  <option value="Urgent">Urgent</option>
                  <option value="Emergency">Emergency</option>
                  <option value="Life-saving">Life-saving</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Planned Anaesthesia</label>
                <div className="flex gap-4 mt-2">
                  {['General', 'Regional', 'Local', 'Sedation'].map(type => (
                    <label key={type} className="flex items-center gap-2">
                      <input type="checkbox" checked={formData.planned_anaesthesia?.includes(type)} onChange={() => handleCheckboxGroupChange("planned_anaesthesia", type)} disabled={readOnly} className="w-4 h-4 text-brand-primary rounded" />
                      <span className="text-sm font-bold text-slate-700">{type}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="md:col-span-3 space-y-2 mt-4">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Consent Statement / Declaration *</label>
                <textarea rows={3} value={formData.consent_statement} onChange={(e) => handleInputChange("consent_statement", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 transition-all outline-none resize-none leading-relaxed ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
              </div>
            </div>
          </section>

          {/* Additional Clinical Details */}
          <section>
            <div className="bg-brand-primary text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part B-J — Clinical Details & Risks</div>
            <div className="border-4 border-slate-900 rounded-3xl p-8 grid grid-cols-1 md:grid-cols-2 gap-8 shadow-inner bg-slate-50 relative">
              <div className="space-y-2 md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Description of the Procedure</label>
                <textarea rows={3} value={formData.procedure_description} onChange={(e) => handleInputChange("procedure_description", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Expected Benefits</label>
                <textarea rows={2} value={formData.expected_benefits} onChange={(e) => handleInputChange("expected_benefits", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Risks Discussed</label>
                <textarea rows={2} value={formData.risks_discussed} onChange={(e) => handleInputChange("risks_discussed", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Alternatives Discussed</label>
                <textarea rows={2} value={formData.alternatives_discussed} onChange={(e) => handleInputChange("alternatives_discussed", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Consequences of No Treatment</label>
                <textarea rows={2} value={formData.consequences_no_treatment} onChange={(e) => handleInputChange("consequences_no_treatment", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
              </div>
            </div>
          </section>

          {/* Part F-J */}
          <section>
            <div className="bg-brand-primary text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part F-J — Anaesthesia & Additional Consents</div>
            <div className="border-4 border-slate-900 rounded-3xl p-8 grid grid-cols-1 md:grid-cols-2 gap-8 shadow-inner bg-slate-50 relative">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Anaesthesia Type</label>
                <select value={formData.anaesthesia_type} onChange={(e) => handleInputChange("anaesthesia_type", e.target.value)} disabled={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`}>
                  <option value="">Select...</option>
                  <option value="General">General</option>
                  <option value="Regional">Regional</option>
                  <option value="Local">Local</option>
                  <option value="Conscious Sedation">Conscious Sedation</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Blood Consent</label>
                <select value={formData.blood_consent} onChange={(e) => handleInputChange("blood_consent", e.target.value)} disabled={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`}>
                  <option value="">Select...</option>
                  <option value="Consents">Consents</option>
                  <option value="Declines">Declines</option>
                  <option value="Discuss Further">Discuss Further</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Clinical Photo</label>
                <select value={formData.clinical_photo} onChange={(e) => handleInputChange("clinical_photo", e.target.value)} disabled={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`}>
                  <option value="">Select...</option>
                  <option value="Clinical Record">Clinical Record</option>
                  <option value="Teaching">Teaching</option>
                  <option value="Declines">Declines</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Consent to Tissue Examination</label>
                <div className="flex items-center gap-3 pt-2">
                  <input type="checkbox" checked={formData.tissue_consent} onChange={(e) => handleInputChange("tissue_consent", e.target.checked)} disabled={readOnly} className="w-5 h-5 text-brand-primary rounded" />
                  <span className="text-sm font-bold text-slate-700">Yes, I consent</span>
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Decline Reason</label>
                <textarea rows={2} value={formData.decline_reason} onChange={(e) => handleInputChange("decline_reason", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Implant Details</label>
                <textarea rows={2} value={formData.implant_details} onChange={(e) => handleInputChange("implant_details", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Additional Procedures Allowed</label>
                <textarea rows={2} value={formData.additional_procedures_allowed} onChange={(e) => handleInputChange("additional_procedures_allowed", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Procedures Not Allowed</label>
                <textarea rows={2} value={formData.procedures_not_allowed} onChange={(e) => handleInputChange("procedures_not_allowed", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient Questions</label>
                <textarea rows={2} value={formData.patient_questions} onChange={(e) => handleInputChange("patient_questions", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
              </div>
            </div>
          </section>

          {/* Part I - Language & Capacity */}
          <section>
            <div className="bg-brand-primary text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part I — Language & Capacity</div>
            <div className="border-4 border-slate-900 rounded-3xl p-8 grid grid-cols-1 md:grid-cols-2 gap-8 shadow-inner bg-slate-50 relative">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Language</label>
                <input type="text" value={formData.language} onChange={(e) => handleInputChange("language", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
              </div>
              <div className="space-y-2 flex items-center">
                <label className="flex items-center gap-3 mt-4">
                  <input type="checkbox" checked={formData.interpreter_used} onChange={(e) => handleInputChange("interpreter_used", e.target.checked)} disabled={readOnly} className="w-5 h-5 text-brand-primary rounded" />
                  <span className="text-sm font-bold text-slate-700">Interpreter Used</span>
                </label>
              </div>
              {formData.interpreter_used && (
                <>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Interpreter Name</label>
                    <input type="text" value={formData.interpreter_name} onChange={(e) => handleInputChange("interpreter_name", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Interpreter Signature</label>
                    <div className="h-32 border-2 border-dashed border-slate-300 rounded-xl bg-white overflow-hidden">
                      {renderSignatureBox("interpreter_signature", "Interpreter Signature")}
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Part B - Multiple Signatures Workflow - Exact IVC Replica */}
          <section className="space-y-12 bg-slate-900 p-10 rounded-[3rem] shadow-2xl">
            <h3 className="text-center text-white font-black uppercase tracking-[0.5em] text-xl mb-12">Final Declarations & Signatures</h3>
            
            <div className="grid grid-cols-1 gap-8">
              {/* Clinician Signature */}
              <div className="bg-white rounded-3xl p-6 shadow-xl border-t-8 border-brand-active relative flex flex-col h-full">
                <PartWarning fields={["clinician_signature", "doctor_name", "clinician_confirm"]} />
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-brand-active/10 rounded-lg flex items-center justify-center text-brand-primary font-black">J</div>
                  <h4 className="font-black text-slate-800 uppercase tracking-wider text-[10px]">Declaration of Clinician</h4>
                </div>
                <div className="space-y-4 mb-6">
                  <label className="flex items-start gap-3 p-3 bg-brand-active/5 rounded-xl cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formData.clinician_confirm} 
                      onChange={(e) => handleInputChange("clinician_confirm", e.target.checked)}
                      disabled={readOnly}
                      className="mt-1 w-5 h-5 text-brand-primary rounded"
                    />
                    <span className="text-[10px] font-bold text-brand-primary">I confirm that I have explained the nature, purpose, benefits and risks.</span>
                  </label>
                </div>
                <div className="space-y-2 flex-grow flex flex-col">
                  <div className="flex-grow min-h-[250px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
                    {renderSignatureBox("clinician_signature", "Clinician Signature")}
                  </div>
                  <div className="mt-4 space-y-3">
                     <div className="space-y-1">
                        <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest text-center">Clinician Name *</p>
                        <input type="text" placeholder="Enter Clinician Name" value={formData.doctor_name} onChange={(e) => handleInputChange("doctor_name", e.target.value)} readOnly={readOnly} className={`w-full border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-center outline-none transition-all placeholder:text-slate-300 ${readOnly ? "bg-slate-100" : "bg-slate-50 focus:border-brand-active focus:ring-2 focus:ring-brand-active/20"}`} />
                     </div>
                     <div className="flex justify-center">
                        <div className="relative">
                           <input type="date" value={formData.doctor_date} onChange={(e) => handleInputChange("doctor_date", e.target.value)} readOnly={readOnly} className={`border border-slate-200 rounded-lg py-1.5 px-3 text-[10px] font-bold text-center outline-none transition-all ${readOnly ? "bg-slate-100" : "bg-slate-50 focus:border-brand-active"}`} />
                        </div>
                     </div>
                  </div>
                </div>
              </div>

              {/* Patient Signature */}
              <div className="bg-white rounded-3xl p-6 shadow-xl border-t-8 border-emerald-500 relative flex flex-col h-full">
                <PartWarning fields={["patient_signature", "patient_name", "patient_confirm"]} />
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 font-black">K</div>
                  <h4 className="font-black text-slate-800 uppercase tracking-wider text-[10px]">Patient Consent</h4>
                </div>
                <div className="space-y-4 mb-6">
                  <label className="flex items-start gap-3 p-3 bg-emerald-50 rounded-xl cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formData.patient_confirm} 
                      onChange={(e) => handleInputChange("patient_confirm", e.target.checked)}
                      disabled={readOnly}
                      className="mt-1 w-5 h-5 text-emerald-600 rounded"
                    />
                    <span className="text-[10px] font-bold text-emerald-900">I give my informed consent to proceed with the procedure.</span>
                  </label>
                </div>
                <div className="space-y-2 flex-grow flex flex-col">
                  <div className="flex-grow min-h-[250px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
                    {renderSignatureBox("patient_signature", "Patient Signature")}
                  </div>
                  <div className="mt-4 space-y-3">
                     <div className="space-y-1">
                        <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest text-center">Patient Name (Print) *</p>
                        <input type="text" placeholder="Enter Patient Name" value={formData.patient_name} onChange={(e) => handleInputChange("patient_name", e.target.value)} readOnly={readOnly} className={`w-full border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-center outline-none transition-all placeholder:text-slate-300 ${readOnly ? "bg-slate-100" : "bg-slate-50 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"}`} />
                     </div>
                     <div className="flex justify-center">
                        <div className="relative">
                           <input type="date" value={formData.patient_date} onChange={(e) => handleInputChange("patient_date", e.target.value)} readOnly={readOnly} className={`border border-slate-200 rounded-lg py-1.5 px-3 text-[10px] font-bold text-center outline-none transition-all ${readOnly ? "bg-slate-100" : "bg-slate-50 focus:border-emerald-500"}`} />
                        </div>
                     </div>
                  </div>
                </div>
              </div>

              {/* Nurse Signature */}
              <div className="bg-white rounded-3xl p-6 shadow-xl border-t-8 border-purple-500 relative flex flex-col h-full">
                <PartWarning fields={["nurse_signature", "nurse_name"]} />
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 font-black">N</div>
                  <h4 className="font-black text-slate-800 uppercase tracking-wider text-[10px]">Nurse Verification</h4>
                </div>
                <div className="space-y-4 mb-6">
                  <div className="p-3 bg-purple-50 rounded-xl">
                    <p className="text-[10px] font-bold text-purple-900">I verify that the patient identity has been confirmed and the consent has been signed in my presence.</p>
                  </div>
                </div>
                <div className="space-y-2 flex-grow flex flex-col">
                  <div className="flex-grow min-h-[250px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
                    {renderSignatureBox("nurse_signature", "Nurse Signature")}
                  </div>
                  <div className="mt-4 space-y-3">
                     <div className="space-y-1">
                        <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest text-center">Nurse Name *</p>
                        <input type="text" placeholder="Enter Nurse Name" value={formData.nurse_name} onChange={(e) => handleInputChange("nurse_name", e.target.value)} readOnly={readOnly} className={`w-full border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-center outline-none transition-all placeholder:text-slate-300 ${readOnly ? "bg-slate-100" : "bg-slate-50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"}`} />
                     </div>
                     <div className="flex justify-center">
                        <div className="relative">
                           <input type="date" value={formData.nurse_date} onChange={(e) => handleInputChange("nurse_date", e.target.value)} readOnly={readOnly} className={`border border-slate-200 rounded-lg py-1.5 px-3 text-[10px] font-bold text-center outline-none transition-all ${readOnly ? "bg-slate-100" : "bg-slate-50 focus:border-purple-500"}`} />
                        </div>
                     </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Part M - Consent on Behalf of Patient */}
          <section>
            <div className="bg-brand-primary text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part M — Consent on Behalf of Patient</div>
            <div className="border-4 border-slate-900 rounded-3xl p-8 grid grid-cols-1 md:grid-cols-2 gap-8 shadow-inner bg-slate-50 relative">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Representative Name</label>
                <input type="text" value={formData.representative_name} onChange={(e) => handleInputChange("representative_name", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Relationship</label>
                <input type="text" value={formData.relationship} onChange={(e) => handleInputChange("relationship", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Legal Basis</label>
                <select value={formData.legal_basis} onChange={(e) => handleInputChange("legal_basis", e.target.value)} disabled={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`}>
                  <option value="">Select...</option>
                  <option value="Next of Kin">Next of Kin</option>
                  <option value="Court-appointed Guardian">Court-appointed Guardian</option>
                  <option value="Power of Attorney">Power of Attorney</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Representative Signature</label>
                <div className="h-32 border-2 border-dashed border-slate-300 rounded-xl bg-white overflow-hidden">
                  {renderSignatureBox("representative_signature", "Representative Signature")}
                </div>
              </div>
            </div>
          </section>

          {/* Part N - Withdrawal of Consent */}
          <section>
            <div className="bg-red-600 text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part N — Withdrawal of Consent</div>
            <div className="border-4 border-red-200 rounded-3xl p-8 grid grid-cols-1 md:grid-cols-2 gap-8 shadow-inner bg-red-50 relative">
              <div className="space-y-2 md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Withdrawal Reason</label>
                <textarea rows={2} value={formData.withdrawal_reason} onChange={(e) => handleInputChange("withdrawal_reason", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-red-500"}`} />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient / Representative Signature</label>
                <div className="h-32 border-2 border-dashed border-slate-300 rounded-xl bg-white overflow-hidden">
                  {renderSignatureBox("withdrawal_signature", "Patient / Representative Signature")}
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Clinician Signature</label>
                <div className="h-32 border-2 border-dashed border-slate-300 rounded-xl bg-white overflow-hidden">
                  {renderSignatureBox("clinician_withdrawal_signature", "Clinician Signature")}
                </div>
              </div>
            </div>
          </section>

        </div>

        {/* Footer / Actions - Exact Replica */}
        <div className="bg-slate-100 border-t-4 border-slate-200 p-6 flex justify-between items-center shrink-0">
          <button 
            onClick={onCancel}
            disabled={submitting}
            className="px-8 py-3 rounded-2xl font-black text-slate-500 hover:bg-slate-200 transition-all uppercase tracking-widest text-sm"
          >
            {readOnly ? "Close" : "Discard Form"}
          </button>
          <div className="flex gap-4">
            {!readOnly && (
              <>
                <button
                  onClick={handleSaveDraft}
                  disabled={submitting}
                  className="bg-amber-500 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-[0.1em] text-sm shadow-xl hover:bg-amber-600 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                  {submitting ? "Saving..." : "Save Draft"}
                </button>

                <button 
                  onClick={handleSubmit}
                  disabled={submitting || !formData.clinician_signature || !formData.patient_signature}
                  className="bg-[#1e1b4b] text-white px-10 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-2xl shadow-brand-primary/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50 disabled:grayscale disabled:scale-100"
                >
                  {submitting ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <CheckCircle size={20} />
                  )}
                  {submitting ? "Finalizing..." : "Submit & Print Consent"}
                </button>
              </>
            )}
            {readOnly && (
              <button 
                onClick={() => setIsPrintOpen(true)}
                className="bg-brand-active text-white px-10 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-2xl transition-all flex items-center gap-3"
              >
                <Printer size={20} /> View Full PDF
              </button>
            )}
          </div>
        </div>
      </div>

      {isPrintOpen && formData && createPortal(
        <div className="hidden">
          <div id="general-print-content">
             <GeneralConsentPrintTemplate isOpen={true} onClose={() => {}} data={formData} />
          </div>
        </div>,
        document.body
      )}
      {isPrintOpen && (
         <div className="fixed inset-0 z-[60] bg-white/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
            <div className="relative">
              <Loader2 className="animate-spin text-[#3B309A] mb-4" size={64} />
              <div className="absolute inset-0 flex items-center justify-center">
                <Printer className="text-[#3B309A] animate-pulse" size={24} />
              </div>
            </div>
            <h2 className="text-2xl font-black text-[#3B309A] tracking-tighter uppercase italic">Generating Document</h2>
            <p className="text-slate-500 font-bold mt-2 animate-pulse">Preparing for print...</p>
         </div>
      )}
    </>
  );
};

export default GeneralConsentForm;





// import React, { useState, useEffect, useRef } from "react";
// import { createPortal } from "react-dom";
// import { CheckCircle, Loader2, Printer, AlertCircle, Save } from "lucide-react";
// import { consentService, ConsentTemplate } from "../../services/consent.service";
// import SignaturePad from "../SignaturePad";
// import { useAuth } from "../../context/AuthContext";
// import { useNotification } from "../../context/NotificationContext";
// import GeneralConsentPrintTemplate from "../print-templates/theatre/GeneralConsentPrintTemplate";
// import { OTSurgery } from "../../services/ot.service";
// import { BASE_URL } from "../../api/client";
// import apiClient from "../../api/client";
// import { patientService } from "../../services/patient.service";
// import { formDraftService } from "../../services/session-restore.service"; // <-- ADDED IMPORT

// interface GeneralConsentFormProps {
//   surgery: OTSurgery;
//   initialData?: any;           // <-- ADDED
//   draftId?: number | null;     // <-- ADDED
//   onSuccess?: () => void;
//   onCancel: () => void;
//   readOnly?: boolean;
//   viewData?: any;
// }

// const GeneralConsentForm: React.FC<GeneralConsentFormProps> = ({
//   surgery,
//   initialData,
//   draftId,
//   onSuccess,
//   onCancel,
//   readOnly = false,
//   viewData,
// }) => {
//   const { user } = useAuth();
//   const { notify } = useNotification();

//   // Helper to ensure signature path is valid URL
//   const getSigUrl = (path: string | undefined | null) => {
//     if (!path) return "";
//     if (path.startsWith("data:")) return path;
//     const normalizedBaseUrl = BASE_URL.replace(/\/$/, "");
//     return path.startsWith("/") ? `${normalizedBaseUrl}${path}` : `${normalizedBaseUrl}/${path}`;
//   };

//   const [template, setTemplate] = useState<ConsentTemplate | null>(null);
//   const [loading, setLoading] = useState(!readOnly);
//   const [submitting, setSubmitting] = useState(false);
//   const [isPrintOpen, setIsPrintOpen] = useState(false);
  
//   // Ref for the local auto-save timer
//   const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

//   const [formData, setFormData] = useState<any>(viewData || initialData || {
//     patient_full_name: "",
//     patient_name: "",
//     mrn: "",
//     date_of_birth: "",
//     sex_at_birth: "",
//     ward_unit: "",
//     consultant: "",
//     primary_diagnosis: "",
//     procedure_name: "",
//     procedure_code: "",
//     procedure_site: "",
//     planned_date: "",
//     urgency: "",
//     planned_anaesthesia: [],
//     procedure_description: "",
//     expected_benefits: "",
//     risks_discussed: "",
//     patient_specific_risks: "",
//     alternatives_discussed: "",
//     consequences_no_treatment: "",
//     anaesthesia_type: "",
//     additional_procedures_allowed: "",
//     procedures_not_allowed: "",
//     blood_consent: "",
//     decline_reason: "",
//     implant_details: "",
//     tissue_consent: false,
//     clinical_photo: "",
//     language: "",
//     interpreter_used: false,
//     interpreter_name: "",
//     interpreter_signature: null,
//     patient_questions: "",
//     consent_statement: "I hereby give my consent for the surgery/procedure described above. I understand the risks and benefits explained to me by the doctor.",
//     consent_date: new Date().toISOString().split("T")[0],
//     doctor_declaration: false,
//     doctor_name: "",
//     doctor_designation: "",
//     doctor_date: new Date().toISOString().split("T")[0],
//     doctor_time: "",
//     patient_declarations: [],
//     patient_date: new Date().toISOString().split("T")[0],
//     patient_time: "",
//     nurse_name: "",
//     nurse_date: new Date().toISOString().split("T")[0],
//     clinician_signature: null,
//     patient_signature: null,
//     nurse_signature: null,
//     representative_name: "",
//     relationship: "",
//     legal_basis: "",
//     representative_signature: null,
//     withdrawal_reason: "",
//     withdrawal_signature: null,
//     clinician_withdrawal_signature: null,
//     clinician_confirm: false,
//     patient_confirm: false,
//   });

//   const isPartComplete = (fields: string[]) => {
//     return fields.every(field => {
//       const val = formData[field];
//       if (typeof val === 'boolean') return val;
//       if (Array.isArray(val)) return val.length > 0;
//       return val !== null && val !== undefined && val !== "";
//     });
//   };

//   const PartWarning = ({ fields }: { fields: string[] }) => {
//     if (isPartComplete(fields) || readOnly) return null;
//     return (
//       <div className="absolute top-4 right-6 flex items-center gap-1 text-amber-500 bg-amber-50 px-3 py-1 rounded-full text-[10px] font-bold border border-amber-200 shadow-sm animate-pulse">
//         <AlertCircle size={12} /> Incomplete
//       </div>
//     );
//   };

//   const handleCheckboxGroupChange = (field: string, value: string) => {
//     setFormData((prev: any) => {
//       const current = prev[field] || [];
//       if (current.includes(value)) {
//         return { ...prev, [field]: current.filter((v: string) => v !== value) };
//       }
//       return { ...prev, [field]: [...current, value] };
//     });
//   };

//   const handleInputChange = (field: string, value: any) => {
//     setFormData((prev: any) => ({ ...prev, [field]: value }));
//   };

//   const fetchTemplate = async () => {
//     setLoading(true);
//     try {
//       const data = await consentService.getTemplate("general-procedure-consent");
//       setTemplate(data);
//     } catch (error) {
//       console.error("Failed to load template:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     if (!readOnly) fetchTemplate();
//   }, [readOnly]);

//   // =========================================================================
//   // PRE-FILL HOOK & LOCAL DRAFT RESTORE
//   // =========================================================================
//   useEffect(() => {
//     if (!readOnly && surgery?.mrn && !viewData && !initialData) {
      
//       const localDraftId = `consent_general_${surgery.order_id || surgery.id}`;
//       const savedDraft = user?.id ? formDraftService.loadDraft<any>(user.id, localDraftId) : null;
      
//       if (savedDraft) {
//         setFormData(savedDraft);
//         notify("Restored unsaved changes from your previous session", "success");
//         return;
//       }

//       const fetchPrefillData = async () => {
//         try {
//           // 1. Fetch Patient Demographics
//           const patient = await patientService.getPatientByMrn(surgery.mrn);

//           // 2. Fetch Active Admission to get Ward/Unit
//           let wardUnit = "";
//           try {
//             const admissionRes = await apiClient.get("/ipd/admission/list");
//             const admissions = admissionRes.data?.data?.results || [];
            
//             // Find active admission for THIS specific patient
//             const activeAdmission = admissions.find(
//               (a: any) => a.mrn === surgery.mrn && a.status === "ACTIVE"
//             );
            
//             if (activeAdmission) {
//               wardUnit = [
//                 activeAdmission.ward_name, 
//                 activeAdmission.room_number, 
//                 activeAdmission.bed_number
//               ].filter(Boolean).join(" / ");
//             }
//           } catch (admError) {
//             console.warn("Could not fetch admission data for pre-fill", admError);
//           }

//           // 3. Inject data into formData
//           if (patient) {
//             setFormData((prev: any) => {
//               const firstName = patient.demographics?.first_name || "";
//               const lastName = patient.demographics?.last_name || "";
//               const fullName = `${firstName} ${lastName}`.trim();

//               return {
//                 ...prev,
//                 patient_full_name: prev.patient_full_name || fullName,
//                 patient_name: prev.patient_name || fullName,
//                 mrn: surgery.mrn,
//                 procedure_name: surgery.surgery_name,
//                 procedure_code: surgery.ot_case_number,
//                 date_of_birth: prev.date_of_birth || patient.demographics?.date_of_birth || "",
//                 sex_at_birth: prev.sex_at_birth || patient.demographics?.gender || "",
//                 ward_unit: prev.ward_unit || wardUnit,
//               };
//             });
//           }
//         } catch (error) {
//           console.error("Failed to prefill patient data", error);
//         }
//       };

//       fetchPrefillData();
//     }
//   }, [surgery?.mrn, readOnly, viewData, initialData, surgery, user?.id]);

//   // 2. Local Auto-Save Loop
//   useEffect(() => {
//     if (readOnly || !surgery || !user?.id) return;
    
//     if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    
//     autoSaveTimerRef.current = setTimeout(() => {
//       const localDraftId = `consent_general_${surgery.order_id || surgery.id}`;
//       formDraftService.saveDraft(user.id!, localDraftId, formData);
//     }, 1500);
    
//     return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
//   }, [formData, surgery, user?.id, readOnly]);

//   useEffect(() => {
//     if (isPrintOpen && formData) {
//       const timer = setTimeout(() => {
//         const printContent = document.getElementById('general-print-content');
//         if (printContent) {
//           const printWindow = window.open('', '_blank');
//           if (printWindow) {
//             printWindow.document.write(`
//               <html>
//                 <head>
//                   <title>General Procedure Consent - Print</title>
//                   <script src="https://cdn.tailwindcss.com"></script>
//                   <style>
//                     @media print {
//                       body { -webkit-print-color-adjust: exact; }
//                       .page-break { page-break-after: always; }
//                     }
//                   </style>
//                 </head>
//                 <body>${printContent.innerHTML}</body>
//                 <script>
//                   window.onload = () => { 
//                     setTimeout(() => {
//                       window.print(); 
//                     }, 500);
//                   }
//                 </script>
//               </html>
//             `);
//             printWindow.document.close();
//           }
//         }
//         setIsPrintOpen(false);
//       }, 1500); // Give time for portal to render
//       return () => clearTimeout(timer);
//     }
//   }, [isPrintOpen, formData]);

//   // 3. Save as Backend Draft Handler
//   const handleSaveDraft = async () => {
//     setSubmitting(true);
//     try {
//       const cleanedFormData = { ...formData };
//       await consentService.createConsent({
//         order_id: surgery.order_id || surgery.id,
//         template_slug: "general-procedure-consent",
//         witness_user_id: user?.id || 1,
//         form_data: cleanedFormData,
//         is_draft: true,
//         consent_id: draftId,
//       });
//       notify("Draft saved successfully to the system", "success");
      
//       // Clear local storage draft
//       if (user?.id) formDraftService.clearDraft(user.id, `consent_general_${surgery.order_id || surgery.id}`);
      
//       onCancel(); 
//     } catch (error: any) {
//       notify(error.response?.data?.message || error.message || "Failed to save draft", "error");
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   // 4. Finalizing and Submitting Consent Handler
//   const handleSubmit = async () => {
//     if (!formData.clinician_signature || !formData.patient_signature) {
//       notify("Both Clinician and Patient signatures are required", "error");
//       return;
//     }

//     setSubmitting(true);
//     try {
//       const cleanedFormData = { ...formData };
//       const payload = {
//         template_slug: "general-procedure-consent",
//         order_id: surgery.order_id || surgery.id,
//         witness_user_id: user?.id || 1,
//         form_data: cleanedFormData,
//         consent_id: draftId,
//       };
      
//       await consentService.createConsent(payload);
//       notify("Consent form submitted successfully", "success");
      
//       // Clear local storage draft
//       if (user?.id) formDraftService.clearDraft(user.id, `consent_general_${surgery.order_id || surgery.id}`);

//       if (onSuccess) onSuccess();
//       setIsPrintOpen(true);
//     } catch (error: any) {
//       notify(error.response?.data?.message || error.message || "Failed to submit consent", "error");
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   if (loading) {
//     return (
//       <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl shadow-xl mx-auto max-w-4xl">
//         <Loader2 className="animate-spin text-brand-primary mb-4" size={48} />
//         <p className="text-slate-500 font-bold uppercase tracking-widest animate-pulse">Loading Procedure Template...</p>
//       </div>
//     );
//   }

//   return (
//     <>
//       <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col max-w-6xl mx-auto w-[90vw]">
//         {/* Header */}
//         <div className="bg-[#1e1b4b] text-white p-10 flex justify-between items-center relative overflow-hidden shrink-0">
//           <div className="absolute top-0 right-0 w-64 h-64 bg-brand-active/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
//           <div className="z-10">
//             <div className="flex items-center gap-4 mb-2">
//               <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
//                 <img src="/assets/login-bg.jpeg" alt="Logo" className="w-10 h-10 object-contain" />
//               </div>
//               <div>
//                 <h1 className="text-3xl font-black tracking-tighter">Procedure Consent Form</h1>
//                 <p className="text-brand-primary font-bold text-sm uppercase tracking-widest">General Surgery & Clinical Intervention</p>
//               </div>
//             </div>
//             <p className="text-xs text-brand-active/60 font-medium">Form Ref: GSH-CONSENT-GEN-021 • Policy Ref: GSH-T6 • Version 1.0</p>
//           </div>
//           <div className="text-right z-10 flex flex-col items-end gap-3">
//              <div className="hidden md:block text-right">
//                 <p className="text-[10px] text-brand-active font-bold leading-tight uppercase tracking-wider">Medbookie</p>
//                 <p className="text-[10px] text-brand-active">+234 705 648 2776 • admin@Medbookiehospitals.com</p>
//              </div>
//              <button 
//                onClick={() => setIsPrintOpen(true)}
//                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/20 transition-all"
//              >
//                <Printer size={14} /> Print Blank Form
//              </button>
//           </div>
//         </div>

//         {/* Main Content */}
//         <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar bg-white">
          
//           {/* Patient Rights */}
//           <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 relative overflow-hidden">
//             <div className="absolute top-0 right-0 bg-amber-200/50 px-4 py-1 rounded-bl-xl text-[10px] font-black text-amber-800 uppercase tracking-wider">Patient Rights</div>
//             <p className="text-sm text-amber-900 font-medium leading-relaxed italic">
//               "You have the right to make decisions about your medical care and to refuse any procedure. If you wish to withdraw consent at any time before the procedure begins, you may do so. Signing this form does not remove your legal rights. This form complies with the National Health Act 2014 (Nigeria) and Medbookie Consent Policy (GSH-T6)."
//             </p>
//           </div>

//           {/* Part A - Patient Identification */}
//           <section>
//             <div className="bg-brand-primary text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part A — Patient Identification</div>
//             <div className="border-4 border-slate-900 rounded-3xl p-8 grid grid-cols-1 md:grid-cols-3 gap-8 shadow-inner bg-slate-50 relative">
//               <PartWarning fields={["patient_full_name", "mrn", "procedure_name", "consent_statement"]} />
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient Full Name *</label>
//                 <input type="text" value={formData.patient_full_name} onChange={(e) => handleInputChange("patient_full_name", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Date of Birth</label>
//                 <input type="date" value={formData.date_of_birth} onChange={(e) => handleInputChange("date_of_birth", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Sex at Birth</label>
//                 <select value={formData.sex_at_birth} onChange={(e) => handleInputChange("sex_at_birth", e.target.value)} disabled={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`}>
//                   <option value="">Select...</option>
//                   <option value="Male">Male</option>
//                   <option value="Female">Female</option>
//                   <option value="Other">Other</option>
//                 </select>
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">MRN (Medical Record Number) *</label>
//                 <input type="text" value={formData.mrn} className="w-full bg-slate-100 border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-500" readOnly />
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Ward / Unit</label>
//                 <input type="text" value={formData.ward_unit} onChange={(e) => handleInputChange("ward_unit", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Consultant / Responsible Surgeon</label>
//                 <input type="text" value={formData.consultant} onChange={(e) => handleInputChange("consultant", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//               <div className="md:col-span-3 space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Primary Diagnosis / Indication for Procedure</label>
//                 <textarea rows={2} value={formData.primary_diagnosis} onChange={(e) => handleInputChange("primary_diagnosis", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//               <div className="md:col-span-2 space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Proposed Procedure Name *</label>
//                 <input type="text" value={formData.procedure_name} onChange={(e) => handleInputChange("procedure_name", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Site / Side</label>
//                 <select value={formData.procedure_site} onChange={(e) => handleInputChange("procedure_site", e.target.value)} disabled={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`}>
//                   <option value="">Select...</option>
//                   <option value="Left">Left</option>
//                   <option value="Right">Right</option>
//                   <option value="N/A">N/A</option>
//                 </select>
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Planned Date</label>
//                 <input type="date" value={formData.planned_date} onChange={(e) => handleInputChange("planned_date", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Urgency</label>
//                 <select value={formData.urgency} onChange={(e) => handleInputChange("urgency", e.target.value)} disabled={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`}>
//                   <option value="">Select...</option>
//                   <option value="Elective">Elective</option>
//                   <option value="Urgent">Urgent</option>
//                   <option value="Emergency">Emergency</option>
//                   <option value="Life-saving">Life-saving</option>
//                 </select>
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Planned Anaesthesia</label>
//                 <div className="flex gap-4 mt-2">
//                   {['General', 'Regional', 'Local', 'Sedation'].map(type => (
//                     <label key={type} className="flex items-center gap-2">
//                       <input type="checkbox" checked={formData.planned_anaesthesia?.includes(type)} onChange={() => handleCheckboxGroupChange("planned_anaesthesia", type)} disabled={readOnly} className="w-4 h-4 text-brand-primary rounded" />
//                       <span className="text-sm font-bold text-slate-700">{type}</span>
//                     </label>
//                   ))}
//                 </div>
//               </div>
//               <div className="md:col-span-3 space-y-2 mt-4">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Consent Statement / Declaration *</label>
//                 <textarea rows={3} value={formData.consent_statement} onChange={(e) => handleInputChange("consent_statement", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 transition-all outline-none resize-none leading-relaxed ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//             </div>
//           </section>

//           {/* Additional Clinical Details */}
//           <section>
//             <div className="bg-brand-primary text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part B-J — Clinical Details & Risks</div>
//             <div className="border-4 border-slate-900 rounded-3xl p-8 grid grid-cols-1 md:grid-cols-2 gap-8 shadow-inner bg-slate-50 relative">
//               <div className="space-y-2 md:col-span-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Description of the Procedure</label>
//                 <textarea rows={3} value={formData.procedure_description} onChange={(e) => handleInputChange("procedure_description", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Expected Benefits</label>
//                 <textarea rows={2} value={formData.expected_benefits} onChange={(e) => handleInputChange("expected_benefits", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Risks Discussed</label>
//                 <textarea rows={2} value={formData.risks_discussed} onChange={(e) => handleInputChange("risks_discussed", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Alternatives Discussed</label>
//                 <textarea rows={2} value={formData.alternatives_discussed} onChange={(e) => handleInputChange("alternatives_discussed", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Consequences of No Treatment</label>
//                 <textarea rows={2} value={formData.consequences_no_treatment} onChange={(e) => handleInputChange("consequences_no_treatment", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//             </div>
//           </section>

//           {/* Part F-J */}
//           <section>
//             <div className="bg-brand-primary text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part F-J — Anaesthesia & Additional Consents</div>
//             <div className="border-4 border-slate-900 rounded-3xl p-8 grid grid-cols-1 md:grid-cols-2 gap-8 shadow-inner bg-slate-50 relative">
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Anaesthesia Type</label>
//                 <select value={formData.anaesthesia_type} onChange={(e) => handleInputChange("anaesthesia_type", e.target.value)} disabled={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`}>
//                   <option value="">Select...</option>
//                   <option value="General">General</option>
//                   <option value="Regional">Regional</option>
//                   <option value="Local">Local</option>
//                   <option value="Conscious Sedation">Conscious Sedation</option>
//                 </select>
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Blood Consent</label>
//                 <select value={formData.blood_consent} onChange={(e) => handleInputChange("blood_consent", e.target.value)} disabled={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`}>
//                   <option value="">Select...</option>
//                   <option value="Consents">Consents</option>
//                   <option value="Declines">Declines</option>
//                   <option value="Discuss Further">Discuss Further</option>
//                 </select>
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Clinical Photo</label>
//                 <select value={formData.clinical_photo} onChange={(e) => handleInputChange("clinical_photo", e.target.value)} disabled={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`}>
//                   <option value="">Select...</option>
//                   <option value="Clinical Record">Clinical Record</option>
//                   <option value="Teaching">Teaching</option>
//                   <option value="Declines">Declines</option>
//                 </select>
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Consent to Tissue Examination</label>
//                 <div className="flex items-center gap-3 pt-2">
//                   <input type="checkbox" checked={formData.tissue_consent} onChange={(e) => handleInputChange("tissue_consent", e.target.checked)} disabled={readOnly} className="w-5 h-5 text-brand-primary rounded" />
//                   <span className="text-sm font-bold text-slate-700">Yes, I consent</span>
//                 </div>
//               </div>
//               <div className="space-y-2 md:col-span-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Decline Reason</label>
//                 <textarea rows={2} value={formData.decline_reason} onChange={(e) => handleInputChange("decline_reason", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//               <div className="space-y-2 md:col-span-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Implant Details</label>
//                 <textarea rows={2} value={formData.implant_details} onChange={(e) => handleInputChange("implant_details", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Additional Procedures Allowed</label>
//                 <textarea rows={2} value={formData.additional_procedures_allowed} onChange={(e) => handleInputChange("additional_procedures_allowed", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Procedures Not Allowed</label>
//                 <textarea rows={2} value={formData.procedures_not_allowed} onChange={(e) => handleInputChange("procedures_not_allowed", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//               <div className="space-y-2 md:col-span-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient Questions</label>
//                 <textarea rows={2} value={formData.patient_questions} onChange={(e) => handleInputChange("patient_questions", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//             </div>
//           </section>

//           {/* Part I - Language & Capacity */}
//           <section>
//             <div className="bg-brand-primary text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part I — Language & Capacity</div>
//             <div className="border-4 border-slate-900 rounded-3xl p-8 grid grid-cols-1 md:grid-cols-2 gap-8 shadow-inner bg-slate-50 relative">
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Language</label>
//                 <input type="text" value={formData.language} onChange={(e) => handleInputChange("language", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//               <div className="space-y-2 flex items-center">
//                 <label className="flex items-center gap-3 mt-4">
//                   <input type="checkbox" checked={formData.interpreter_used} onChange={(e) => handleInputChange("interpreter_used", e.target.checked)} disabled={readOnly} className="w-5 h-5 text-brand-primary rounded" />
//                   <span className="text-sm font-bold text-slate-700">Interpreter Used</span>
//                 </label>
//               </div>
//               {formData.interpreter_used && (
//                 <>
//                   <div className="space-y-2">
//                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Interpreter Name</label>
//                     <input type="text" value={formData.interpreter_name} onChange={(e) => handleInputChange("interpreter_name", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//                   </div>
//                   <div className="space-y-2">
//                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Interpreter Signature</label>
//                     <div className="h-32 border-2 border-dashed border-slate-300 rounded-xl bg-white overflow-hidden">
//                       {readOnly ? (
//                         <div className="h-full w-full flex items-center justify-center">
//                           {formData.interpreter_signature ? <img src={getSigUrl(formData.interpreter_signature)} className="max-h-full" /> : <span className="text-slate-300">No Signature</span>}
//                         </div>
//                       ) : (
//                         <SignaturePad onEnd={(data) => handleInputChange("interpreter_signature", data)} onClear={() => handleInputChange("interpreter_signature", null)} className="h-full w-full" />
//                       )}
//                     </div>
//                   </div>
//                 </>
//               )}
//             </div>
//           </section>

//           {/* Part B - Multiple Signatures Workflow - Exact IVC Replica */}
//           <section className="space-y-12 bg-slate-900 p-10 rounded-[3rem] shadow-2xl">
//             <h3 className="text-center text-white font-black uppercase tracking-[0.5em] text-xl mb-12">Final Declarations & Signatures</h3>
            
//             <div className="grid grid-cols-1 gap-8">
//               {/* Clinician Signature */}
//               <div className="bg-white rounded-3xl p-6 shadow-xl border-t-8 border-brand-active relative flex flex-col h-full">
//                 <PartWarning fields={["clinician_signature", "doctor_name", "clinician_confirm"]} />
//                 <div className="flex items-center gap-3 mb-6">
//                   <div className="w-8 h-8 bg-brand-active/10 rounded-lg flex items-center justify-center text-brand-primary font-black">J</div>
//                   <h4 className="font-black text-slate-800 uppercase tracking-wider text-[10px]">Declaration of Clinician</h4>
//                 </div>
//                 <div className="space-y-4 mb-6">
//                   <label className="flex items-start gap-3 p-3 bg-brand-active/5 rounded-xl cursor-pointer">
//                     <input 
//                       type="checkbox" 
//                       checked={formData.clinician_confirm} 
//                       onChange={(e) => handleInputChange("clinician_confirm", e.target.checked)}
//                       disabled={readOnly}
//                       className="mt-1 w-5 h-5 text-brand-primary rounded"
//                     />
//                     <span className="text-[10px] font-bold text-brand-primary">I confirm that I have explained the nature, purpose, benefits and risks.</span>
//                   </label>
//                 </div>
//                 <div className="space-y-2 flex-grow flex flex-col">
//                   <div className="flex-grow min-h-[250px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
//                     {readOnly ? (
//                       <div className="h-full w-full flex items-center justify-center p-2">
//                         {formData.clinician_signature ? (
//                           <img src={getSigUrl(formData.clinician_signature)} alt="Clinician Signature" className="max-h-full max-w-full object-contain" />
//                         ) : (
//                           <span className="text-slate-300 font-bold uppercase text-xs">No Signature</span>
//                         )}
//                       </div>
//                     ) : (
//                       <SignaturePad 
//                         onEnd={(data) => handleInputChange("clinician_signature", data)}
//                         onClear={() => handleInputChange("clinician_signature", null)}
//                         className="h-full w-full"
//                       />
//                     )}
//                   </div>
//                   <div className="mt-4 space-y-3">
//                      <div className="space-y-1">
//                         <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest text-center">Clinician Name *</p>
//                         <input type="text" placeholder="Enter Clinician Name" value={formData.doctor_name} onChange={(e) => handleInputChange("doctor_name", e.target.value)} readOnly={readOnly} className={`w-full border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-center outline-none transition-all placeholder:text-slate-300 ${readOnly ? "bg-slate-100" : "bg-slate-50 focus:border-brand-active focus:ring-2 focus:ring-brand-active/20"}`} />
//                      </div>
//                      <div className="flex justify-center">
//                         <div className="relative">
//                            <input type="date" value={formData.doctor_date} onChange={(e) => handleInputChange("doctor_date", e.target.value)} readOnly={readOnly} className={`border border-slate-200 rounded-lg py-1.5 px-3 text-[10px] font-bold text-center outline-none transition-all ${readOnly ? "bg-slate-100" : "bg-slate-50 focus:border-brand-active"}`} />
//                         </div>
//                      </div>
//                   </div>
//                 </div>
//               </div>

//               {/* Patient Signature */}
//               <div className="bg-white rounded-3xl p-6 shadow-xl border-t-8 border-emerald-500 relative flex flex-col h-full">
//                 <PartWarning fields={["patient_signature", "patient_name", "patient_confirm"]} />
//                 <div className="flex items-center gap-3 mb-6">
//                   <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 font-black">K</div>
//                   <h4 className="font-black text-slate-800 uppercase tracking-wider text-[10px]">Patient Consent</h4>
//                 </div>
//                 <div className="space-y-4 mb-6">
//                   <label className="flex items-start gap-3 p-3 bg-emerald-50 rounded-xl cursor-pointer">
//                     <input 
//                       type="checkbox" 
//                       checked={formData.patient_confirm} 
//                       onChange={(e) => handleInputChange("patient_confirm", e.target.checked)}
//                       disabled={readOnly}
//                       className="mt-1 w-5 h-5 text-emerald-600 rounded"
//                     />
//                     <span className="text-[10px] font-bold text-emerald-900">I give my informed consent to proceed with the procedure.</span>
//                   </label>
//                 </div>
//                 <div className="space-y-2 flex-grow flex flex-col">
//                   <div className="flex-grow min-h-[250px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
//                     {readOnly ? (
//                       <div className="h-full w-full flex items-center justify-center p-2">
//                         {formData.patient_signature ? (
//                           <img src={getSigUrl(formData.patient_signature)} alt="Patient Signature" className="max-h-full max-w-full object-contain" />
//                         ) : (
//                           <span className="text-slate-300 font-bold uppercase text-xs">No Signature</span>
//                         )}
//                       </div>
//                     ) : (
//                       <SignaturePad 
//                         onEnd={(data) => handleInputChange("patient_signature", data)}
//                         onClear={() => handleInputChange("patient_signature", null)}
//                         className="h-full w-full"
//                       />
//                     )}
//                   </div>
//                   <div className="mt-4 space-y-3">
//                      <div className="space-y-1">
//                         <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest text-center">Patient Name (Print) *</p>
//                         <input type="text" placeholder="Enter Patient Name" value={formData.patient_name} onChange={(e) => handleInputChange("patient_name", e.target.value)} readOnly={readOnly} className={`w-full border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-center outline-none transition-all placeholder:text-slate-300 ${readOnly ? "bg-slate-100" : "bg-slate-50 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"}`} />
//                      </div>
//                      <div className="flex justify-center">
//                         <div className="relative">
//                            <input type="date" value={formData.patient_date} onChange={(e) => handleInputChange("patient_date", e.target.value)} readOnly={readOnly} className={`border border-slate-200 rounded-lg py-1.5 px-3 text-[10px] font-bold text-center outline-none transition-all ${readOnly ? "bg-slate-100" : "bg-slate-50 focus:border-emerald-500"}`} />
//                         </div>
//                      </div>
//                   </div>
//                 </div>
//               </div>

//               {/* Nurse Signature */}
//               <div className="bg-white rounded-3xl p-6 shadow-xl border-t-8 border-purple-500 relative flex flex-col h-full">
//                 <PartWarning fields={["nurse_signature", "nurse_name"]} />
//                 <div className="flex items-center gap-3 mb-6">
//                   <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 font-black">N</div>
//                   <h4 className="font-black text-slate-800 uppercase tracking-wider text-[10px]">Nurse Verification</h4>
//                 </div>
//                 <div className="space-y-4 mb-6">
//                   <div className="p-3 bg-purple-50 rounded-xl">
//                     <p className="text-[10px] font-bold text-purple-900">I verify that the patient identity has been confirmed and the consent has been signed in my presence.</p>
//                   </div>
//                 </div>
//                 <div className="space-y-2 flex-grow flex flex-col">
//                   <div className="flex-grow min-h-[250px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
//                     {readOnly ? (
//                       <div className="h-full w-full flex items-center justify-center p-2">
//                         {formData.nurse_signature ? (
//                           <img src={getSigUrl(formData.nurse_signature)} alt="Nurse Signature" className="max-h-full max-w-full object-contain" />
//                         ) : (
//                           <span className="text-slate-300 font-bold uppercase text-xs">No Signature</span>
//                         )}
//                       </div>
//                     ) : (
//                       <SignaturePad 
//                         onEnd={(data) => handleInputChange("nurse_signature", data)}
//                         onClear={() => handleInputChange("nurse_signature", null)}
//                         className="h-full w-full"
//                       />
//                     )}
//                   </div>
//                   <div className="mt-4 space-y-3">
//                      <div className="space-y-1">
//                         <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest text-center">Nurse Name *</p>
//                         <input type="text" placeholder="Enter Nurse Name" value={formData.nurse_name} onChange={(e) => handleInputChange("nurse_name", e.target.value)} readOnly={readOnly} className={`w-full border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-center outline-none transition-all placeholder:text-slate-300 ${readOnly ? "bg-slate-100" : "bg-slate-50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"}`} />
//                      </div>
//                      <div className="flex justify-center">
//                         <div className="relative">
//                            <input type="date" value={formData.nurse_date} onChange={(e) => handleInputChange("nurse_date", e.target.value)} readOnly={readOnly} className={`border border-slate-200 rounded-lg py-1.5 px-3 text-[10px] font-bold text-center outline-none transition-all ${readOnly ? "bg-slate-100" : "bg-slate-50 focus:border-purple-500"}`} />
//                         </div>
//                      </div>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </section>

//           {/* Part M - Consent on Behalf of Patient */}
//           <section>
//             <div className="bg-brand-primary text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part M — Consent on Behalf of Patient</div>
//             <div className="border-4 border-slate-900 rounded-3xl p-8 grid grid-cols-1 md:grid-cols-2 gap-8 shadow-inner bg-slate-50 relative">
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Representative Name</label>
//                 <input type="text" value={formData.representative_name} onChange={(e) => handleInputChange("representative_name", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Relationship</label>
//                 <input type="text" value={formData.relationship} onChange={(e) => handleInputChange("relationship", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Legal Basis</label>
//                 <select value={formData.legal_basis} onChange={(e) => handleInputChange("legal_basis", e.target.value)} disabled={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`}>
//                   <option value="">Select...</option>
//                   <option value="Next of Kin">Next of Kin</option>
//                   <option value="Court-appointed Guardian">Court-appointed Guardian</option>
//                   <option value="Power of Attorney">Power of Attorney</option>
//                 </select>
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Representative Signature</label>
//                 <div className="h-32 border-2 border-dashed border-slate-300 rounded-xl bg-white overflow-hidden">
//                   {readOnly ? (
//                     <div className="h-full w-full flex items-center justify-center">
//                       {formData.representative_signature ? <img src={getSigUrl(formData.representative_signature)} className="max-h-full" /> : <span className="text-slate-300">No Signature</span>}
//                     </div>
//                   ) : (
//                     <SignaturePad onEnd={(data) => handleInputChange("representative_signature", data)} onClear={() => handleInputChange("representative_signature", null)} className="h-full w-full" />
//                   )}
//                 </div>
//               </div>
//             </div>
//           </section>

//           {/* Part N - Withdrawal of Consent */}
//           <section>
//             <div className="bg-red-600 text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part N — Withdrawal of Consent</div>
//             <div className="border-4 border-red-200 rounded-3xl p-8 grid grid-cols-1 md:grid-cols-2 gap-8 shadow-inner bg-red-50 relative">
//               <div className="space-y-2 md:col-span-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Withdrawal Reason</label>
//                 <textarea rows={2} value={formData.withdrawal_reason} onChange={(e) => handleInputChange("withdrawal_reason", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-red-500"}`} />
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient / Representative Signature</label>
//                 <div className="h-32 border-2 border-dashed border-slate-300 rounded-xl bg-white overflow-hidden">
//                   {readOnly ? (
//                     <div className="h-full w-full flex items-center justify-center">
//                       {formData.withdrawal_signature ? <img src={getSigUrl(formData.withdrawal_signature)} className="max-h-full" /> : <span className="text-slate-300">No Signature</span>}
//                     </div>
//                   ) : (
//                     <SignaturePad onEnd={(data) => handleInputChange("withdrawal_signature", data)} onClear={() => handleInputChange("withdrawal_signature", null)} className="h-full w-full" />
//                   )}
//                 </div>
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Clinician Signature</label>
//                 <div className="h-32 border-2 border-dashed border-slate-300 rounded-xl bg-white overflow-hidden">
//                   {readOnly ? (
//                     <div className="h-full w-full flex items-center justify-center">
//                       {formData.clinician_withdrawal_signature ? <img src={getSigUrl(formData.clinician_withdrawal_signature)} className="max-h-full" /> : <span className="text-slate-300">No Signature</span>}
//                     </div>
//                   ) : (
//                     <SignaturePad onEnd={(data) => handleInputChange("clinician_withdrawal_signature", data)} onClear={() => handleInputChange("clinician_withdrawal_signature", null)} className="h-full w-full" />
//                   )}
//                 </div>
//               </div>
//             </div>
//           </section>

//         </div>

//         {/* Footer / Actions - Exact Replica */}
//         <div className="bg-slate-100 border-t-4 border-slate-200 p-6 flex justify-between items-center shrink-0">
//           <button 
//             onClick={onCancel}
//             disabled={submitting}
//             className="px-8 py-3 rounded-2xl font-black text-slate-500 hover:bg-slate-200 transition-all uppercase tracking-widest text-sm"
//           >
//             {readOnly ? "Close" : "Discard Form"}
//           </button>
//           <div className="flex gap-4">
//             {!readOnly && (
//               <>
//                 {/* NEW SAVE DRAFT BUTTON */}
//                 <button
//                   onClick={handleSaveDraft}
//                   disabled={submitting}
//                   className="bg-amber-500 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-[0.1em] text-sm shadow-xl hover:bg-amber-600 transition-all flex items-center gap-2 disabled:opacity-50"
//                 >
//                   {submitting ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
//                   {submitting ? "Saving..." : "Save Draft"}
//                 </button>

//                 <button 
//                   onClick={handleSubmit}
//                   disabled={submitting || !formData.clinician_signature || !formData.patient_signature}
//                   className="bg-[#1e1b4b] text-white px-10 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-2xl shadow-brand-primary/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50 disabled:grayscale disabled:scale-100"
//                 >
//                   {submitting ? (
//                     <Loader2 className="animate-spin" size={20} />
//                   ) : (
//                     <CheckCircle size={20} />
//                   )}
//                   {submitting ? "Finalizing..." : "Submit & Print Consent"}
//                 </button>
//               </>
//             )}
//             {readOnly && (
//               <button 
//                 onClick={() => setIsPrintOpen(true)}
//                 className="bg-brand-active text-white px-10 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-2xl transition-all flex items-center gap-3"
//               >
//                 <Printer size={20} /> View Full PDF
//               </button>
//             )}
//           </div>
//         </div>
//       </div>

//       {isPrintOpen && formData && createPortal(
//         <div className="hidden">
//           <div id="general-print-content">
//              <GeneralConsentPrintTemplate isOpen={true} onClose={() => {}} data={formData} />
//           </div>
//         </div>,
//         document.body
//       )}
//       {isPrintOpen && (
//          <div className="fixed inset-0 z-[60] bg-white/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
//             <div className="relative">
//               <Loader2 className="animate-spin text-[#3B309A] mb-4" size={64} />
//               <div className="absolute inset-0 flex items-center justify-center">
//                 <Printer className="text-[#3B309A] animate-pulse" size={24} />
//               </div>
//             </div>
//             <h2 className="text-2xl font-black text-[#3B309A] tracking-tighter uppercase italic">Generating Document</h2>
//             <p className="text-slate-500 font-bold mt-2 animate-pulse">Preparing for print...</p>
//          </div>
//       )}
//     </>
//   );
// };

// export default GeneralConsentForm;




// import React, { useState, useEffect } from "react";
// import { createPortal } from "react-dom";
// import { CheckCircle, Loader2, Printer, AlertCircle } from "lucide-react";
// import { consentService, ConsentTemplate } from "../../services/consent.service";
// import SignaturePad from "../SignaturePad";
// import { useAuth } from "../../context/AuthContext";
// import { useNotification } from "../../context/NotificationContext";
// import GeneralConsentPrintTemplate from "../print-templates/theatre/GeneralConsentPrintTemplate";
// import { OTSurgery } from "../../services/ot.service";
// import { BASE_URL } from "../../api/client";
// import apiClient from "../../api/client";
// import { patientService } from "../../services/patient.service";

// interface GeneralConsentFormProps {
//   surgery: OTSurgery;
//   onSuccess?: () => void;
//   onCancel: () => void;
//   readOnly?: boolean;
//   viewData?: any;
// }

// const GeneralConsentForm: React.FC<GeneralConsentFormProps> = ({
//   surgery,
//   onSuccess,
//   onCancel,
//   readOnly = false,
//   viewData,
// }) => {
//   const { user } = useAuth();
//   const { notify } = useNotification();

//   // Helper to ensure signature path is valid URL
//   const getSigUrl = (path: string | undefined | null) => {
//     if (!path) return "";
//     if (path.startsWith("data:")) return path;
//     const normalizedBaseUrl = BASE_URL.replace(/\/$/, "");
//     return path.startsWith("/") ? `${normalizedBaseUrl}${path}` : `${normalizedBaseUrl}/${path}`;
//   };

//   const [template, setTemplate] = useState<ConsentTemplate | null>(null);
//   const [loading, setLoading] = useState(!readOnly);
//   const [submitting, setSubmitting] = useState(false);
//   const [isPrintOpen, setIsPrintOpen] = useState(false);

//   const [formData, setFormData] = useState<any>(viewData || {
//     patient_full_name: "",
//     patient_name: "",
//     mrn: "",
//     date_of_birth: "",
//     sex_at_birth: "",
//     ward_unit: "",
//     consultant: "",
//     primary_diagnosis: "",
//     procedure_name: "",
//     procedure_code: "",
//     procedure_site: "",
//     planned_date: "",
//     urgency: "",
//     planned_anaesthesia: [],
//     procedure_description: "",
//     expected_benefits: "",
//     risks_discussed: "",
//     patient_specific_risks: "",
//     alternatives_discussed: "",
//     consequences_no_treatment: "",
//     anaesthesia_type: "",
//     additional_procedures_allowed: "",
//     procedures_not_allowed: "",
//     blood_consent: "",
//     decline_reason: "",
//     implant_details: "",
//     tissue_consent: false,
//     clinical_photo: "",
//     language: "",
//     interpreter_used: false,
//     interpreter_name: "",
//     interpreter_signature: null,
//     patient_questions: "",
//     consent_statement: "I hereby give my consent for the surgery/procedure described above. I understand the risks and benefits explained to me by the doctor.",
//     consent_date: new Date().toISOString().split("T")[0],
//     doctor_declaration: false,
//     doctor_name: "",
//     doctor_designation: "",
//     doctor_date: new Date().toISOString().split("T")[0],
//     doctor_time: "",
//     patient_declarations: [],
//     patient_date: new Date().toISOString().split("T")[0],
//     patient_time: "",
//     nurse_name: "",
//     nurse_date: new Date().toISOString().split("T")[0],
//     clinician_signature: null,
//     patient_signature: null,
//     nurse_signature: null,
//     representative_name: "",
//     relationship: "",
//     legal_basis: "",
//     representative_signature: null,
//     withdrawal_reason: "",
//     withdrawal_signature: null,
//     clinician_withdrawal_signature: null,
//     clinician_confirm: false,
//     patient_confirm: false,
//   });

//   const isPartComplete = (fields: string[]) => {
//     return fields.every(field => {
//       const val = formData[field];
//       if (typeof val === 'boolean') return val;
//       if (Array.isArray(val)) return val.length > 0;
//       return val !== null && val !== undefined && val !== "";
//     });
//   };

//   const PartWarning = ({ fields }: { fields: string[] }) => {
//     if (isPartComplete(fields) || readOnly) return null;
//     return (
//       <div className="absolute top-4 right-6 flex items-center gap-1 text-amber-500 bg-amber-50 px-3 py-1 rounded-full text-[10px] font-bold border border-amber-200 shadow-sm animate-pulse">
//         <AlertCircle size={12} /> Incomplete
//       </div>
//     );
//   };

//   const handleCheckboxGroupChange = (field: string, value: string) => {
//     setFormData((prev: any) => {
//       const current = prev[field] || [];
//       if (current.includes(value)) {
//         return { ...prev, [field]: current.filter((v: string) => v !== value) };
//       }
//       return { ...prev, [field]: [...current, value] };
//     });
//   };

//   const handleInputChange = (field: string, value: any) => {
//     setFormData((prev: any) => ({ ...prev, [field]: value }));
//   };

//   const fetchTemplate = async () => {
//     setLoading(true);
//     try {
//       const data = await consentService.getTemplate("general-procedure-consent");
//       setTemplate(data);
//     } catch (error) {
//       console.error("Failed to load template:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     if (!readOnly) fetchTemplate();
//     if (surgery && !viewData) {
//       setFormData((prev: any) => ({
//         ...prev,
//         patient_full_name: `${surgery.first_name} ${surgery.last_name}`,
//         patient_name: `${surgery.first_name} ${surgery.last_name}`,
//         mrn: surgery.mrn,
//         procedure_name: surgery.surgery_name,
//         procedure_code: surgery.ot_case_number,
//       }));
//     }
//   }, [surgery, readOnly, viewData]);

//   // =========================================================================
//   // PRE-FILL HOOK: Must be here, before any early returns!
//   // =========================================================================
//   useEffect(() => {
//     if (!readOnly && surgery?.mrn && !viewData) {
//       const fetchPrefillData = async () => {
//         try {
//           // 1. Fetch Patient Demographics
//           const patient = await patientService.getPatientByMrn(surgery.mrn);

//           // 2. Fetch Active Admission to get Ward/Unit
//           let wardUnit = "";
//           try {
//             const admissionRes = await apiClient.get("/ipd/admission/list");
//             const admissions = admissionRes.data?.data?.results || [];
            
//             // Find active admission for THIS specific patient
//             const activeAdmission = admissions.find(
//               (a: any) => a.mrn === surgery.mrn && a.status === "ACTIVE"
//             );
            
//             if (activeAdmission) {
//               wardUnit = [
//                 activeAdmission.ward_name, 
//                 activeAdmission.room_number, 
//                 activeAdmission.bed_number
//               ].filter(Boolean).join(" / ");
//             }
//           } catch (admError) {
//             console.warn("Could not fetch admission data for pre-fill", admError);
//           }

//           // 3. Inject data into formData
//           if (patient) {
//             setFormData((prev: any) => {
//               const firstName = patient.demographics?.first_name || "";
//               const lastName = patient.demographics?.last_name || "";
//               const fullName = `${firstName} ${lastName}`.trim();

//               return {
//                 ...prev,
//                 patient_full_name: prev.patient_full_name || fullName,
//                 date_of_birth: prev.date_of_birth || patient.demographics?.date_of_birth || "",
//                 sex_at_birth: prev.sex_at_birth || patient.demographics?.gender || "",
//                 ward_unit: prev.ward_unit || wardUnit,
//               };
//             });
//           }
//         } catch (error) {
//           console.error("Failed to prefill patient data", error);
//         }
//       };

//       fetchPrefillData();
//     }
//   }, [surgery?.mrn, readOnly, viewData]);

//   useEffect(() => {
//     if (isPrintOpen && formData) {
//       const timer = setTimeout(() => {
//         const printContent = document.getElementById('general-print-content');
//         if (printContent) {
//           const printWindow = window.open('', '_blank');
//           if (printWindow) {
//             printWindow.document.write(`
//               <html>
//                 <head>
//                   <title>General Procedure Consent - Print</title>
//                   <script src="https://cdn.tailwindcss.com"></script>
//                   <style>
//                     @media print {
//                       body { -webkit-print-color-adjust: exact; }
//                       .page-break { page-break-after: always; }
//                     }
//                   </style>
//                 </head>
//                 <body>${printContent.innerHTML}</body>
//                 <script>
//                   window.onload = () => { 
//                     setTimeout(() => {
//                       window.print(); 
//                     }, 500);
//                   }
//                 </script>
//               </html>
//             `);
//             printWindow.document.close();
//           }
//         }
//         setIsPrintOpen(false);
//       }, 1500); // Give time for portal to render
//       return () => clearTimeout(timer);
//     }
//   }, [isPrintOpen, formData]);

//   const handleSubmit = async () => {
//     if (!formData.clinician_signature || !formData.patient_signature) {
//       notify("Both Clinician and Patient signatures are required", "error");
//       return;
//     }

//     setSubmitting(true);
//     try {
//       const cleanedFormData = { ...formData };
//       const payload = {
//         template_slug: "general-procedure-consent",
//         order_id: surgery.order_id || surgery.id,
//         witness_user_id: user?.id || 1,
//         form_data: cleanedFormData,
//       };
      
//       await consentService.createConsent(payload);
//       notify("Consent form submitted successfully", "success");
//       if (onSuccess) onSuccess();
//       setIsPrintOpen(true);
//     } catch (error: any) {
//       notify(error.response?.data?.message || error.message || "Failed to submit consent", "error");
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   // =========================================================================
//   // EARLY RETURNS MUST COME AFTER ALL HOOKS
//   // =========================================================================
//   if (loading) {
//     return (
//       <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl shadow-xl mx-auto max-w-4xl">
//         <Loader2 className="animate-spin text-brand-primary mb-4" size={48} />
//         <p className="text-slate-500 font-bold uppercase tracking-widest animate-pulse">Loading Procedure Template...</p>
//       </div>
//     );
//   }

//   return (
//     <>
//       <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col max-w-6xl mx-auto w-[90vw]">
//         {/* Header */}
//         <div className="bg-[#1e1b4b] text-white p-10 flex justify-between items-center relative overflow-hidden shrink-0">
//           <div className="absolute top-0 right-0 w-64 h-64 bg-brand-active/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
//           <div className="z-10">
//             <div className="flex items-center gap-4 mb-2">
//               <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
//                 <img src="/assets/login-bg.jpeg" alt="Logo" className="w-10 h-10 object-contain" />
//               </div>
//               <div>
//                 <h1 className="text-3xl font-black tracking-tighter">Procedure Consent Form</h1>
//                 <p className="text-brand-primary font-bold text-sm uppercase tracking-widest">General Surgery & Clinical Intervention</p>
//               </div>
//             </div>
//             <p className="text-xs text-brand-active/60 font-medium">Form Ref: GSH-CONSENT-GEN-021 • Policy Ref: GSH-T6 • Version 1.0</p>
//           </div>
//           <div className="text-right z-10 flex flex-col items-end gap-3">
//              <div className="hidden md:block text-right">
//                 <p className="text-[10px] text-brand-active font-bold leading-tight uppercase tracking-wider">Medbookie</p>
//                 <p className="text-[10px] text-brand-active">+234 705 648 2776 • admin@Medbookiehospitals.com</p>
//              </div>
//              <button 
//                onClick={() => setIsPrintOpen(true)}
//                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/20 transition-all"
//              >
//                <Printer size={14} /> Print Blank Form
//              </button>
//           </div>
//         </div>

//         {/* Main Content */}
//         <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar bg-white">
          
//           {/* Patient Rights */}
//           <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 relative overflow-hidden">
//             <div className="absolute top-0 right-0 bg-amber-200/50 px-4 py-1 rounded-bl-xl text-[10px] font-black text-amber-800 uppercase tracking-wider">Patient Rights</div>
//             <p className="text-sm text-amber-900 font-medium leading-relaxed italic">
//               "You have the right to make decisions about your medical care and to refuse any procedure. If you wish to withdraw consent at any time before the procedure begins, you may do so. Signing this form does not remove your legal rights. This form complies with the National Health Act 2014 (Nigeria) and Medbookie Consent Policy (GSH-T6)."
//             </p>
//           </div>

//           {/* Part A - Patient Identification */}
//           <section>
//             <div className="bg-brand-primary text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part A — Patient Identification</div>
//             <div className="border-4 border-slate-900 rounded-3xl p-8 grid grid-cols-1 md:grid-cols-3 gap-8 shadow-inner bg-slate-50 relative">
//               <PartWarning fields={["patient_full_name", "mrn", "procedure_name", "consent_statement"]} />
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient Full Name *</label>
//                 <input type="text" value={formData.patient_full_name} onChange={(e) => handleInputChange("patient_full_name", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Date of Birth</label>
//                 <input type="date" value={formData.date_of_birth} onChange={(e) => handleInputChange("date_of_birth", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Sex at Birth</label>
//                 <select value={formData.sex_at_birth} onChange={(e) => handleInputChange("sex_at_birth", e.target.value)} disabled={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`}>
//                   <option value="">Select...</option>
//                   <option value="Male">Male</option>
//                   <option value="Female">Female</option>
//                   <option value="Other">Other</option>
//                 </select>
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">MRN (Medical Record Number) *</label>
//                 <input type="text" value={formData.mrn} className="w-full bg-slate-100 border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-500" readOnly />
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Ward / Unit</label>
//                 <input type="text" value={formData.ward_unit} onChange={(e) => handleInputChange("ward_unit", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Consultant / Responsible Surgeon</label>
//                 <input type="text" value={formData.consultant} onChange={(e) => handleInputChange("consultant", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//               <div className="md:col-span-3 space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Primary Diagnosis / Indication for Procedure</label>
//                 <textarea rows={2} value={formData.primary_diagnosis} onChange={(e) => handleInputChange("primary_diagnosis", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//               <div className="md:col-span-2 space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Proposed Procedure Name *</label>
//                 <input type="text" value={formData.procedure_name} onChange={(e) => handleInputChange("procedure_name", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Site / Side</label>
//                 <select value={formData.procedure_site} onChange={(e) => handleInputChange("procedure_site", e.target.value)} disabled={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`}>
//                   <option value="">Select...</option>
//                   <option value="Left">Left</option>
//                   <option value="Right">Right</option>
//                   <option value="N/A">N/A</option>
//                 </select>
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Planned Date</label>
//                 <input type="date" value={formData.planned_date} onChange={(e) => handleInputChange("planned_date", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Urgency</label>
//                 <select value={formData.urgency} onChange={(e) => handleInputChange("urgency", e.target.value)} disabled={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`}>
//                   <option value="">Select...</option>
//                   <option value="Elective">Elective</option>
//                   <option value="Urgent">Urgent</option>
//                   <option value="Emergency">Emergency</option>
//                   <option value="Life-saving">Life-saving</option>
//                 </select>
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Planned Anaesthesia</label>
//                 <div className="flex gap-4 mt-2">
//                   {['General', 'Regional', 'Local', 'Sedation'].map(type => (
//                     <label key={type} className="flex items-center gap-2">
//                       <input type="checkbox" checked={formData.planned_anaesthesia?.includes(type)} onChange={() => handleCheckboxGroupChange("planned_anaesthesia", type)} disabled={readOnly} className="w-4 h-4 text-brand-primary rounded" />
//                       <span className="text-sm font-bold text-slate-700">{type}</span>
//                     </label>
//                   ))}
//                 </div>
//               </div>
//               <div className="md:col-span-3 space-y-2 mt-4">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Consent Statement / Declaration *</label>
//                 <textarea rows={3} value={formData.consent_statement} onChange={(e) => handleInputChange("consent_statement", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 transition-all outline-none resize-none leading-relaxed ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//             </div>
//           </section>

//           {/* Additional Clinical Details */}
//           <section>
//             <div className="bg-brand-primary text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part B-J — Clinical Details & Risks</div>
//             <div className="border-4 border-slate-900 rounded-3xl p-8 grid grid-cols-1 md:grid-cols-2 gap-8 shadow-inner bg-slate-50 relative">
//               <div className="space-y-2 md:col-span-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Description of the Procedure</label>
//                 <textarea rows={3} value={formData.procedure_description} onChange={(e) => handleInputChange("procedure_description", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Expected Benefits</label>
//                 <textarea rows={2} value={formData.expected_benefits} onChange={(e) => handleInputChange("expected_benefits", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Risks Discussed</label>
//                 <textarea rows={2} value={formData.risks_discussed} onChange={(e) => handleInputChange("risks_discussed", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Alternatives Discussed</label>
//                 <textarea rows={2} value={formData.alternatives_discussed} onChange={(e) => handleInputChange("alternatives_discussed", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Consequences of No Treatment</label>
//                 <textarea rows={2} value={formData.consequences_no_treatment} onChange={(e) => handleInputChange("consequences_no_treatment", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//             </div>
//           </section>

//           {/* Part F-J */}
//           <section>
//             <div className="bg-brand-primary text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part F-J — Anaesthesia & Additional Consents</div>
//             <div className="border-4 border-slate-900 rounded-3xl p-8 grid grid-cols-1 md:grid-cols-2 gap-8 shadow-inner bg-slate-50 relative">
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Anaesthesia Type</label>
//                 <select value={formData.anaesthesia_type} onChange={(e) => handleInputChange("anaesthesia_type", e.target.value)} disabled={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`}>
//                   <option value="">Select...</option>
//                   <option value="General">General</option>
//                   <option value="Regional">Regional</option>
//                   <option value="Local">Local</option>
//                   <option value="Conscious Sedation">Conscious Sedation</option>
//                 </select>
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Blood Consent</label>
//                 <select value={formData.blood_consent} onChange={(e) => handleInputChange("blood_consent", e.target.value)} disabled={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`}>
//                   <option value="">Select...</option>
//                   <option value="Consents">Consents</option>
//                   <option value="Declines">Declines</option>
//                   <option value="Discuss Further">Discuss Further</option>
//                 </select>
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Clinical Photo</label>
//                 <select value={formData.clinical_photo} onChange={(e) => handleInputChange("clinical_photo", e.target.value)} disabled={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`}>
//                   <option value="">Select...</option>
//                   <option value="Clinical Record">Clinical Record</option>
//                   <option value="Teaching">Teaching</option>
//                   <option value="Declines">Declines</option>
//                 </select>
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Consent to Tissue Examination</label>
//                 <div className="flex items-center gap-3 pt-2">
//                   <input type="checkbox" checked={formData.tissue_consent} onChange={(e) => handleInputChange("tissue_consent", e.target.checked)} disabled={readOnly} className="w-5 h-5 text-brand-primary rounded" />
//                   <span className="text-sm font-bold text-slate-700">Yes, I consent</span>
//                 </div>
//               </div>
//               <div className="space-y-2 md:col-span-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Decline Reason</label>
//                 <textarea rows={2} value={formData.decline_reason} onChange={(e) => handleInputChange("decline_reason", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//               <div className="space-y-2 md:col-span-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Implant Details</label>
//                 <textarea rows={2} value={formData.implant_details} onChange={(e) => handleInputChange("implant_details", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Additional Procedures Allowed</label>
//                 <textarea rows={2} value={formData.additional_procedures_allowed} onChange={(e) => handleInputChange("additional_procedures_allowed", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Procedures Not Allowed</label>
//                 <textarea rows={2} value={formData.procedures_not_allowed} onChange={(e) => handleInputChange("procedures_not_allowed", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//               <div className="space-y-2 md:col-span-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient Questions</label>
//                 <textarea rows={2} value={formData.patient_questions} onChange={(e) => handleInputChange("patient_questions", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//             </div>
//           </section>

//           {/* Part I - Language & Capacity */}
//           <section>
//             <div className="bg-brand-primary text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part I — Language & Capacity</div>
//             <div className="border-4 border-slate-900 rounded-3xl p-8 grid grid-cols-1 md:grid-cols-2 gap-8 shadow-inner bg-slate-50 relative">
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Language</label>
//                 <input type="text" value={formData.language} onChange={(e) => handleInputChange("language", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//               <div className="space-y-2 flex items-center">
//                 <label className="flex items-center gap-3 mt-4">
//                   <input type="checkbox" checked={formData.interpreter_used} onChange={(e) => handleInputChange("interpreter_used", e.target.checked)} disabled={readOnly} className="w-5 h-5 text-brand-primary rounded" />
//                   <span className="text-sm font-bold text-slate-700">Interpreter Used</span>
//                 </label>
//               </div>
//               {formData.interpreter_used && (
//                 <>
//                   <div className="space-y-2">
//                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Interpreter Name</label>
//                     <input type="text" value={formData.interpreter_name} onChange={(e) => handleInputChange("interpreter_name", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//                   </div>
//                   <div className="space-y-2">
//                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Interpreter Signature</label>
//                     <div className="h-32 border-2 border-dashed border-slate-300 rounded-xl bg-white overflow-hidden">
//                       {readOnly ? (
//                         <div className="h-full w-full flex items-center justify-center">
//                           {formData.interpreter_signature ? <img src={getSigUrl(formData.interpreter_signature)} className="max-h-full" /> : <span className="text-slate-300">No Signature</span>}
//                         </div>
//                       ) : (
//                         <SignaturePad onEnd={(data) => handleInputChange("interpreter_signature", data)} onClear={() => handleInputChange("interpreter_signature", null)} className="h-full w-full" />
//                       )}
//                     </div>
//                   </div>
//                 </>
//               )}
//             </div>
//           </section>

//           {/* Part B - Multiple Signatures Workflow - Exact IVC Replica */}
//           <section className="space-y-12 bg-slate-900 p-10 rounded-[3rem] shadow-2xl">
//             <h3 className="text-center text-white font-black uppercase tracking-[0.5em] text-xl mb-12">Final Declarations & Signatures</h3>
            
//             <div className="grid grid-cols-1 gap-8">
//               {/* Clinician Signature */}
//               <div className="bg-white rounded-3xl p-6 shadow-xl border-t-8 border-brand-active relative flex flex-col h-full">
//                 <PartWarning fields={["clinician_signature", "doctor_name", "clinician_confirm"]} />
//                 <div className="flex items-center gap-3 mb-6">
//                   <div className="w-8 h-8 bg-brand-active/10 rounded-lg flex items-center justify-center text-brand-primary font-black">J</div>
//                   <h4 className="font-black text-slate-800 uppercase tracking-wider text-[10px]">Declaration of Clinician</h4>
//                 </div>
//                 <div className="space-y-4 mb-6">
//                   <label className="flex items-start gap-3 p-3 bg-brand-active/5 rounded-xl cursor-pointer">
//                     <input 
//                       type="checkbox" 
//                       checked={formData.clinician_confirm} 
//                       onChange={(e) => handleInputChange("clinician_confirm", e.target.checked)}
//                       disabled={readOnly}
//                       className="mt-1 w-5 h-5 text-brand-primary rounded"
//                     />
//                     <span className="text-[10px] font-bold text-brand-primary">I confirm that I have explained the nature, purpose, benefits and risks.</span>
//                   </label>
//                 </div>
//                 <div className="space-y-2 flex-grow flex flex-col">
//                   <div className="flex-grow min-h-[250px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
//                     {readOnly ? (
//                       <div className="h-full w-full flex items-center justify-center p-2">
//                         {formData.clinician_signature ? (
//                           <img src={getSigUrl(formData.clinician_signature)} alt="Clinician Signature" className="max-h-full max-w-full object-contain" />
//                         ) : (
//                           <span className="text-slate-300 font-bold uppercase text-xs">No Signature</span>
//                         )}
//                       </div>
//                     ) : (
//                       <SignaturePad 
//                         onEnd={(data) => handleInputChange("clinician_signature", data)}
//                         onClear={() => handleInputChange("clinician_signature", null)}
//                         className="h-full w-full"
//                       />
//                     )}
//                   </div>
//                   <div className="mt-4 space-y-3">
//                      <div className="space-y-1">
//                         <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest text-center">Clinician Name *</p>
//                         <input type="text" placeholder="Enter Clinician Name" value={formData.doctor_name} onChange={(e) => handleInputChange("doctor_name", e.target.value)} readOnly={readOnly} className={`w-full border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-center outline-none transition-all placeholder:text-slate-300 ${readOnly ? "bg-slate-100" : "bg-slate-50 focus:border-brand-active focus:ring-2 focus:ring-brand-active/20"}`} />
//                      </div>
//                      <div className="flex justify-center">
//                         <div className="relative">
//                            <input type="date" value={formData.doctor_date} onChange={(e) => handleInputChange("doctor_date", e.target.value)} readOnly={readOnly} className={`border border-slate-200 rounded-lg py-1.5 px-3 text-[10px] font-bold text-center outline-none transition-all ${readOnly ? "bg-slate-100" : "bg-slate-50 focus:border-brand-active"}`} />
//                         </div>
//                      </div>
//                   </div>
//                 </div>
//               </div>

//               {/* Patient Signature */}
//               <div className="bg-white rounded-3xl p-6 shadow-xl border-t-8 border-emerald-500 relative flex flex-col h-full">
//                 <PartWarning fields={["patient_signature", "patient_name", "patient_confirm"]} />
//                 <div className="flex items-center gap-3 mb-6">
//                   <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 font-black">K</div>
//                   <h4 className="font-black text-slate-800 uppercase tracking-wider text-[10px]">Patient Consent</h4>
//                 </div>
//                 <div className="space-y-4 mb-6">
//                   <label className="flex items-start gap-3 p-3 bg-emerald-50 rounded-xl cursor-pointer">
//                     <input 
//                       type="checkbox" 
//                       checked={formData.patient_confirm} 
//                       onChange={(e) => handleInputChange("patient_confirm", e.target.checked)}
//                       disabled={readOnly}
//                       className="mt-1 w-5 h-5 text-emerald-600 rounded"
//                     />
//                     <span className="text-[10px] font-bold text-emerald-900">I give my informed consent to proceed with the procedure.</span>
//                   </label>
//                 </div>
//                 <div className="space-y-2 flex-grow flex flex-col">
//                   <div className="flex-grow min-h-[250px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
//                     {readOnly ? (
//                       <div className="h-full w-full flex items-center justify-center p-2">
//                         {formData.patient_signature ? (
//                           <img src={getSigUrl(formData.patient_signature)} alt="Patient Signature" className="max-h-full max-w-full object-contain" />
//                         ) : (
//                           <span className="text-slate-300 font-bold uppercase text-xs">No Signature</span>
//                         )}
//                       </div>
//                     ) : (
//                       <SignaturePad 
//                         onEnd={(data) => handleInputChange("patient_signature", data)}
//                         onClear={() => handleInputChange("patient_signature", null)}
//                         className="h-full w-full"
//                       />
//                     )}
//                   </div>
//                   <div className="mt-4 space-y-3">
//                      <div className="space-y-1">
//                         <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest text-center">Patient Name (Print) *</p>
//                         <input type="text" placeholder="Enter Patient Name" value={formData.patient_name} onChange={(e) => handleInputChange("patient_name", e.target.value)} readOnly={readOnly} className={`w-full border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-center outline-none transition-all placeholder:text-slate-300 ${readOnly ? "bg-slate-100" : "bg-slate-50 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"}`} />
//                      </div>
//                      <div className="flex justify-center">
//                         <div className="relative">
//                            <input type="date" value={formData.patient_date} onChange={(e) => handleInputChange("patient_date", e.target.value)} readOnly={readOnly} className={`border border-slate-200 rounded-lg py-1.5 px-3 text-[10px] font-bold text-center outline-none transition-all ${readOnly ? "bg-slate-100" : "bg-slate-50 focus:border-emerald-500"}`} />
//                         </div>
//                      </div>
//                   </div>
//                 </div>
//               </div>

//               {/* Nurse Signature */}
//               <div className="bg-white rounded-3xl p-6 shadow-xl border-t-8 border-purple-500 relative flex flex-col h-full">
//                 <PartWarning fields={["nurse_signature", "nurse_name"]} />
//                 <div className="flex items-center gap-3 mb-6">
//                   <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 font-black">N</div>
//                   <h4 className="font-black text-slate-800 uppercase tracking-wider text-[10px]">Nurse Verification</h4>
//                 </div>
//                 <div className="space-y-4 mb-6">
//                   <div className="p-3 bg-purple-50 rounded-xl">
//                     <p className="text-[10px] font-bold text-purple-900">I verify that the patient identity has been confirmed and the consent has been signed in my presence.</p>
//                   </div>
//                 </div>
//                 <div className="space-y-2 flex-grow flex flex-col">
//                   <div className="flex-grow min-h-[250px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
//                     {readOnly ? (
//                       <div className="h-full w-full flex items-center justify-center p-2">
//                         {formData.nurse_signature ? (
//                           <img src={getSigUrl(formData.nurse_signature)} alt="Nurse Signature" className="max-h-full max-w-full object-contain" />
//                         ) : (
//                           <span className="text-slate-300 font-bold uppercase text-xs">No Signature</span>
//                         )}
//                       </div>
//                     ) : (
//                       <SignaturePad 
//                         onEnd={(data) => handleInputChange("nurse_signature", data)}
//                         onClear={() => handleInputChange("nurse_signature", null)}
//                         className="h-full w-full"
//                       />
//                     )}
//                   </div>
//                   <div className="mt-4 space-y-3">
//                      <div className="space-y-1">
//                         <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest text-center">Nurse Name *</p>
//                         <input type="text" placeholder="Enter Nurse Name" value={formData.nurse_name} onChange={(e) => handleInputChange("nurse_name", e.target.value)} readOnly={readOnly} className={`w-full border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-center outline-none transition-all placeholder:text-slate-300 ${readOnly ? "bg-slate-100" : "bg-slate-50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"}`} />
//                      </div>
//                      <div className="flex justify-center">
//                         <div className="relative">
//                            <input type="date" value={formData.nurse_date} onChange={(e) => handleInputChange("nurse_date", e.target.value)} readOnly={readOnly} className={`border border-slate-200 rounded-lg py-1.5 px-3 text-[10px] font-bold text-center outline-none transition-all ${readOnly ? "bg-slate-100" : "bg-slate-50 focus:border-purple-500"}`} />
//                         </div>
//                      </div>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </section>

//           {/* Part M - Consent on Behalf of Patient */}
//           <section>
//             <div className="bg-brand-primary text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part M — Consent on Behalf of Patient</div>
//             <div className="border-4 border-slate-900 rounded-3xl p-8 grid grid-cols-1 md:grid-cols-2 gap-8 shadow-inner bg-slate-50 relative">
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Representative Name</label>
//                 <input type="text" value={formData.representative_name} onChange={(e) => handleInputChange("representative_name", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Relationship</label>
//                 <input type="text" value={formData.relationship} onChange={(e) => handleInputChange("relationship", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Legal Basis</label>
//                 <select value={formData.legal_basis} onChange={(e) => handleInputChange("legal_basis", e.target.value)} disabled={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`}>
//                   <option value="">Select...</option>
//                   <option value="Next of Kin">Next of Kin</option>
//                   <option value="Court-appointed Guardian">Court-appointed Guardian</option>
//                   <option value="Power of Attorney">Power of Attorney</option>
//                 </select>
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Representative Signature</label>
//                 <div className="h-32 border-2 border-dashed border-slate-300 rounded-xl bg-white overflow-hidden">
//                   {readOnly ? (
//                     <div className="h-full w-full flex items-center justify-center">
//                       {formData.representative_signature ? <img src={getSigUrl(formData.representative_signature)} className="max-h-full" /> : <span className="text-slate-300">No Signature</span>}
//                     </div>
//                   ) : (
//                     <SignaturePad onEnd={(data) => handleInputChange("representative_signature", data)} onClear={() => handleInputChange("representative_signature", null)} className="h-full w-full" />
//                   )}
//                 </div>
//               </div>
//             </div>
//           </section>

//           {/* Part N - Withdrawal of Consent */}
//           <section>
//             <div className="bg-red-600 text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part N — Withdrawal of Consent</div>
//             <div className="border-4 border-red-200 rounded-3xl p-8 grid grid-cols-1 md:grid-cols-2 gap-8 shadow-inner bg-red-50 relative">
//               <div className="space-y-2 md:col-span-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Withdrawal Reason</label>
//                 <textarea rows={2} value={formData.withdrawal_reason} onChange={(e) => handleInputChange("withdrawal_reason", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-red-500"}`} />
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient / Representative Signature</label>
//                 <div className="h-32 border-2 border-dashed border-slate-300 rounded-xl bg-white overflow-hidden">
//                   {readOnly ? (
//                     <div className="h-full w-full flex items-center justify-center">
//                       {formData.withdrawal_signature ? <img src={getSigUrl(formData.withdrawal_signature)} className="max-h-full" /> : <span className="text-slate-300">No Signature</span>}
//                     </div>
//                   ) : (
//                     <SignaturePad onEnd={(data) => handleInputChange("withdrawal_signature", data)} onClear={() => handleInputChange("withdrawal_signature", null)} className="h-full w-full" />
//                   )}
//                 </div>
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Clinician Signature</label>
//                 <div className="h-32 border-2 border-dashed border-slate-300 rounded-xl bg-white overflow-hidden">
//                   {readOnly ? (
//                     <div className="h-full w-full flex items-center justify-center">
//                       {formData.clinician_withdrawal_signature ? <img src={getSigUrl(formData.clinician_withdrawal_signature)} className="max-h-full" /> : <span className="text-slate-300">No Signature</span>}
//                     </div>
//                   ) : (
//                     <SignaturePad onEnd={(data) => handleInputChange("clinician_withdrawal_signature", data)} onClear={() => handleInputChange("clinician_withdrawal_signature", null)} className="h-full w-full" />
//                   )}
//                 </div>
//               </div>
//             </div>
//           </section>

//         </div>

//         {/* Footer / Actions - Exact Replica */}
//         <div className="bg-slate-100 border-t-4 border-slate-200 p-6 flex justify-between items-center shrink-0">
//           <button 
//             onClick={onCancel}
//             disabled={submitting}
//             className="px-8 py-3 rounded-2xl font-black text-slate-500 hover:bg-slate-200 transition-all uppercase tracking-widest text-sm"
//           >
//             {readOnly ? "Close" : "Discard Form"}
//           </button>
//           <div className="flex gap-4">
//             {!readOnly && (
//               <button 
//                 onClick={handleSubmit}
//                 disabled={submitting || !formData.clinician_signature || !formData.patient_signature}
//                 className="bg-[#1e1b4b] text-white px-10 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-2xl shadow-brand-primary/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50 disabled:grayscale disabled:scale-100"
//               >
//                 {submitting ? (
//                   <Loader2 className="animate-spin" size={20} />
//                 ) : (
//                   <CheckCircle size={20} />
//                 )}
//                 {submitting ? "Finalizing..." : "Submit & Print Consent"}
//               </button>
//             )}
//             {readOnly && (
//               <button 
//                 onClick={() => setIsPrintOpen(true)}
//                 className="bg-brand-active text-white px-10 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-2xl transition-all flex items-center gap-3"
//               >
//                 <Printer size={20} /> View Full PDF
//               </button>
//             )}
//           </div>
//         </div>
//       </div>

//       {isPrintOpen && formData && createPortal(
//         <div className="hidden">
//           <div id="general-print-content">
//              <GeneralConsentPrintTemplate isOpen={true} onClose={() => {}} data={formData} />
//           </div>
//         </div>,
//         document.body
//       )}
//       {isPrintOpen && (
//          <div className="fixed inset-0 z-[60] bg-white/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
//             <div className="relative">
//               <Loader2 className="animate-spin text-[#3B309A] mb-4" size={64} />
//               <div className="absolute inset-0 flex items-center justify-center">
//                 <Printer className="text-[#3B309A] animate-pulse" size={24} />
//               </div>
//             </div>
//             <h2 className="text-2xl font-black text-[#3B309A] tracking-tighter uppercase italic">Generating Document</h2>
//             <p className="text-slate-500 font-bold mt-2 animate-pulse">Preparing for print...</p>
//          </div>
//       )}
//     </>
//   );
// };

// export default GeneralConsentForm;

// import React, { useState, useEffect } from "react";
// import { createPortal } from "react-dom";
// import { FileText, CheckCircle, Loader2, Printer, AlertCircle } from "lucide-react";
// import { consentService, ConsentTemplate } from "../../services/consent.service";
// import SignaturePad from "../SignaturePad";
// import { useAuth } from "../../context/AuthContext";
// import { useNotification } from "../../context/NotificationContext";
// import GeneralConsentPrintTemplate from "../print-templates/theatre/GeneralConsentPrintTemplate";
// import { OTSurgery } from "../../services/ot.service";
// import { BASE_URL } from "../../api/client";

// interface GeneralConsentFormProps {
//   surgery: OTSurgery;
//   onSuccess?: () => void;
//   onCancel: () => void;
//   readOnly?: boolean;
//   viewData?: any;
// }

// const GeneralConsentForm: React.FC<GeneralConsentFormProps> = ({
//   surgery,
//   onSuccess,
//   onCancel,
//   readOnly = false,
//   viewData,
// }) => {
//   const { user } = useAuth();
//   const { notify } = useNotification();

//   // Helper to ensure signature path is valid URL
//   const getSigUrl = (path: string | undefined | null) => {
//     if (!path) return "";
//     if (path.startsWith("data:")) return path;
//     const normalizedBaseUrl = BASE_URL.replace(/\/$/, "");
//     return path.startsWith("/") ? `${normalizedBaseUrl}${path}` : `${normalizedBaseUrl}/${path}`;
//   };

//   const [template, setTemplate] = useState<ConsentTemplate | null>(null);
//   const [loading, setLoading] = useState(!readOnly);
//   const [submitting, setSubmitting] = useState(false);
//   const [isPrintOpen, setIsPrintOpen] = useState(false);

//   const isPartComplete = (fields: string[]) => {
//     return fields.every(field => {
//       const val = formData[field];
//       if (typeof val === 'boolean') return val;
//       if (Array.isArray(val)) return val.length > 0;
//       return val !== null && val !== undefined && val !== "";
//     });
//   };

//   const PartWarning = ({ fields }: { fields: string[] }) => {
//     if (isPartComplete(fields) || readOnly) return null;
//     return (
//       <div className="absolute top-4 right-6 flex items-center gap-1 text-amber-500 bg-amber-50 px-3 py-1 rounded-full text-[10px] font-bold border border-amber-200 shadow-sm animate-pulse">
//         <AlertCircle size={12} /> Incomplete
//       </div>
//     );
//   };
  
//   const [formData, setFormData] = useState<any>(viewData || {
//     patient_full_name: "",
//     patient_name: "",
//     mrn: "",
//     date_of_birth: "",
//     sex_at_birth: "",
//     ward_unit: "",
//     consultant: "",
//     primary_diagnosis: "",
//     procedure_name: "",
//     procedure_code: "",
//     procedure_site: "",
//     planned_date: "",
//     urgency: "",
//     planned_anaesthesia: [],
//     procedure_description: "",
//     expected_benefits: "",
//     risks_discussed: "",
//     patient_specific_risks: "",
//     alternatives_discussed: "",
//     consequences_no_treatment: "",
//     anaesthesia_type: "",
//     additional_procedures_allowed: "",
//     procedures_not_allowed: "",
//     blood_consent: "",
//     decline_reason: "",
//     implant_details: "",
//     tissue_consent: false,
//     clinical_photo: "",
//     language: "",
//     interpreter_used: false,
//     interpreter_name: "",
//     interpreter_signature: null,
//     patient_questions: "",
//     consent_statement: "I hereby give my consent for the surgery/procedure described above. I understand the risks and benefits explained to me by the doctor.",
//     consent_date: new Date().toISOString().split("T")[0],
//     doctor_declaration: false,
//     doctor_name: "",
//     doctor_designation: "",
//     doctor_date: new Date().toISOString().split("T")[0],
//     doctor_time: "",
//     patient_declarations: [],
//     patient_date: new Date().toISOString().split("T")[0],
//     patient_time: "",
//     nurse_name: "",
//     nurse_date: new Date().toISOString().split("T")[0],
//     clinician_signature: null,
//     patient_signature: null,
//     nurse_signature: null,
//     representative_name: "",
//     relationship: "",
//     legal_basis: "",
//     representative_signature: null,
//     withdrawal_reason: "",
//     withdrawal_signature: null,
//     clinician_withdrawal_signature: null,
//     clinician_confirm: false,
//     patient_confirm: false,
//   });

//   const handleCheckboxGroupChange = (field: string, value: string) => {
//     setFormData((prev: any) => {
//       const current = prev[field] || [];
//       if (current.includes(value)) {
//         return { ...prev, [field]: current.filter((v: string) => v !== value) };
//       }
//       return { ...prev, [field]: [...current, value] };
//     });
//   };

//   useEffect(() => {
//     if (!readOnly) fetchTemplate();
//     if (surgery && !viewData) {
//       setFormData((prev: any) => ({
//         ...prev,
//         patient_full_name: `${surgery.first_name} ${surgery.last_name}`,
//         patient_name: `${surgery.first_name} ${surgery.last_name}`,
//         mrn: surgery.mrn,
//         procedure_name: surgery.surgery_name,
//         procedure_code: surgery.ot_case_number,
//       }));
//     }
//   }, [surgery]);

//   const fetchTemplate = async () => {
//     setLoading(true);
//     try {
//       const data = await consentService.getTemplate("general-procedure-consent");
//       setTemplate(data);
//     } catch (error) {
//       console.error("Failed to load template:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     if (isPrintOpen && formData) {
//       const timer = setTimeout(() => {
//         const printContent = document.getElementById('general-print-content');
//         if (printContent) {
//           const printWindow = window.open('', '_blank');
//           if (printWindow) {
//             printWindow.document.write(`
//               <html>
//                 <head>
//                   <title>General Procedure Consent - Print</title>
//                   <script src="https://cdn.tailwindcss.com"></script>
//                   <style>
//                     @media print {
//                       body { -webkit-print-color-adjust: exact; }
//                       .page-break { page-break-after: always; }
//                     }
//                   </style>
//                 </head>
//                 <body>${printContent.innerHTML}</body>
//                 <script>
//                   window.onload = () => { 
//                     setTimeout(() => {
//                       window.print(); 
//                     }, 500);
//                   }
//                 </script>
//               </html>
//             `);
//             printWindow.document.close();
//           }
//         }
//         setIsPrintOpen(false);
//       }, 1500); // Give time for portal to render
//       return () => clearTimeout(timer);
//     }
//   }, [isPrintOpen, formData]);

//   const handleInputChange = (field: string, value: any) => {
//     setFormData((prev: any) => ({ ...prev, [field]: value }));
//   };

//   const handleSubmit = async () => {
//     if (!formData.clinician_signature || !formData.patient_signature) {
//       notify("Both Clinician and Patient signatures are required", "error");
//       return;
//     }

//     setSubmitting(true);
//     try {
//       // Only submit fields expected by the schema
//       const cleanedFormData = {
//         ...formData,
//       };

//       const payload = {
//         template_slug: "general-procedure-consent",
//         order_id: surgery.order_id || surgery.id,
//         witness_user_id: user?.id || 1,
//         form_data: cleanedFormData,
//       };
      
//       await consentService.createConsent(payload);
//       notify("Consent form submitted successfully", "success");
//       if (onSuccess) onSuccess();
//       setIsPrintOpen(true);
//     } catch (error: any) {
//       notify(error.response?.data?.message || error.message || "Failed to submit consent", "error");
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   if (loading) {
//     return (
//       <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl shadow-xl mx-auto max-w-4xl">
//         <Loader2 className="animate-spin text-brand-primary mb-4" size={48} />
//         <p className="text-slate-500 font-bold uppercase tracking-widest animate-pulse">Loading Procedure Template...</p>
//       </div>
//     );
//   }

//   return (
//     <>
//       <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col max-w-6xl mx-auto">
//         {/* Header - Exact IVC Filter Replica */}
//         <div className="bg-[#1e1b4b] text-white p-10 flex justify-between items-center relative overflow-hidden shrink-0">
//           <div className="absolute top-0 right-0 w-64 h-64 bg-brand-active/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
//           <div className="z-10">
//             <div className="flex items-center gap-4 mb-2">
//               <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
//                 <img src="/assets/login-bg.jpeg" alt="Logo" className="w-10 h-10 object-contain" />
//               </div>
//               <div>
//                 <h1 className="text-3xl font-black tracking-tighter">Procedure Consent Form</h1>
//                 <p className="text-brand-primary font-bold text-sm uppercase tracking-widest">General Surgery & Clinical Intervention</p>
//               </div>
//             </div>
//             <p className="text-xs text-brand-active/60 font-medium">Form Ref: GSH-CONSENT-GEN-021 • Policy Ref: GSH-T6 • Version 1.0</p>
//           </div>
//           <div className="text-right z-10 flex flex-col items-end gap-3">
//              <div className="hidden md:block text-right">
//                 <p className="text-[10px] text-brand-active font-bold leading-tight uppercase tracking-wider">Medbookie</p>
//                 <p className="text-[10px] text-brand-active">+234 705 648 2776 • admin@Medbookiehospitals.com</p>
//              </div>
//              <button 
//                onClick={() => setIsPrintOpen(true)}
//                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/20 transition-all"
//              >
//                <Printer size={14} /> Print Blank Form
//              </button>
//           </div>
//         </div>

//         {/* Main Content */}
//         <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar bg-white">
          
//           {/* Patient Rights */}
//           <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 relative overflow-hidden">
//             <div className="absolute top-0 right-0 bg-amber-200/50 px-4 py-1 rounded-bl-xl text-[10px] font-black text-amber-800 uppercase tracking-wider">Patient Rights</div>
//             <p className="text-sm text-amber-900 font-medium leading-relaxed italic">
//               "You have the right to make decisions about your medical care and to refuse any procedure. If you wish to withdraw consent at any time before the procedure begins, you may do so. Signing this form does not remove your legal rights. This form complies with the National Health Act 2014 (Nigeria) and Medbookie Consent Policy (GSH-T6)."
//             </p>
//           </div>

//           {/* Part A - Patient Identification */}
//           <section>
//             <div className="bg-brand-primary text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part A — Patient Identification</div>
//             <div className="border-4 border-slate-900 rounded-3xl p-8 grid grid-cols-1 md:grid-cols-3 gap-8 shadow-inner bg-slate-50 relative">
//               <PartWarning fields={["patient_full_name", "mrn", "procedure_name", "consent_statement"]} />
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient Full Name *</label>
//                 <input type="text" value={formData.patient_full_name} onChange={(e) => handleInputChange("patient_full_name", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Date of Birth</label>
//                 <input type="date" value={formData.date_of_birth} onChange={(e) => handleInputChange("date_of_birth", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Sex at Birth</label>
//                 <select value={formData.sex_at_birth} onChange={(e) => handleInputChange("sex_at_birth", e.target.value)} disabled={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`}>
//                   <option value="">Select...</option>
//                   <option value="Male">Male</option>
//                   <option value="Female">Female</option>
//                   <option value="Other">Other</option>
//                 </select>
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">MRN (Medical Record Number) *</label>
//                 <input type="text" value={formData.mrn} className="w-full bg-slate-100 border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-500" readOnly />
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Ward / Unit</label>
//                 <input type="text" value={formData.ward_unit} onChange={(e) => handleInputChange("ward_unit", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Consultant / Responsible Surgeon</label>
//                 <input type="text" value={formData.consultant} onChange={(e) => handleInputChange("consultant", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//               <div className="md:col-span-3 space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Primary Diagnosis / Indication for Procedure</label>
//                 <textarea rows={2} value={formData.primary_diagnosis} onChange={(e) => handleInputChange("primary_diagnosis", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//               <div className="md:col-span-2 space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Proposed Procedure Name *</label>
//                 <input type="text" value={formData.procedure_name} onChange={(e) => handleInputChange("procedure_name", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Site / Side</label>
//                 <select value={formData.procedure_site} onChange={(e) => handleInputChange("procedure_site", e.target.value)} disabled={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`}>
//                   <option value="">Select...</option>
//                   <option value="Left">Left</option>
//                   <option value="Right">Right</option>
//                   <option value="N/A">N/A</option>
//                 </select>
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Planned Date</label>
//                 <input type="date" value={formData.planned_date} onChange={(e) => handleInputChange("planned_date", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Urgency</label>
//                 <select value={formData.urgency} onChange={(e) => handleInputChange("urgency", e.target.value)} disabled={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`}>
//                   <option value="">Select...</option>
//                   <option value="Elective">Elective</option>
//                   <option value="Urgent">Urgent</option>
//                   <option value="Emergency">Emergency</option>
//                   <option value="Life-saving">Life-saving</option>
//                 </select>
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Planned Anaesthesia</label>
//                 <div className="flex gap-4 mt-2">
//                   {['General', 'Regional', 'Local', 'Sedation'].map(type => (
//                     <label key={type} className="flex items-center gap-2">
//                       <input type="checkbox" checked={formData.planned_anaesthesia?.includes(type)} onChange={() => handleCheckboxGroupChange("planned_anaesthesia", type)} disabled={readOnly} className="w-4 h-4 text-brand-primary rounded" />
//                       <span className="text-sm font-bold text-slate-700">{type}</span>
//                     </label>
//                   ))}
//                 </div>
//               </div>
//               <div className="md:col-span-3 space-y-2 mt-4">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Consent Statement / Declaration *</label>
//                 <textarea rows={3} value={formData.consent_statement} onChange={(e) => handleInputChange("consent_statement", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 transition-all outline-none resize-none leading-relaxed ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//             </div>
//           </section>

//           {/* Additional Clinical Details */}
//           <section>
//             <div className="bg-brand-primary text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part B-J — Clinical Details & Risks</div>
//             <div className="border-4 border-slate-900 rounded-3xl p-8 grid grid-cols-1 md:grid-cols-2 gap-8 shadow-inner bg-slate-50 relative">
//               <div className="space-y-2 md:col-span-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Description of the Procedure</label>
//                 <textarea rows={3} value={formData.procedure_description} onChange={(e) => handleInputChange("procedure_description", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Expected Benefits</label>
//                 <textarea rows={2} value={formData.expected_benefits} onChange={(e) => handleInputChange("expected_benefits", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Risks Discussed</label>
//                 <textarea rows={2} value={formData.risks_discussed} onChange={(e) => handleInputChange("risks_discussed", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Alternatives Discussed</label>
//                 <textarea rows={2} value={formData.alternatives_discussed} onChange={(e) => handleInputChange("alternatives_discussed", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Consequences of No Treatment</label>
//                 <textarea rows={2} value={formData.consequences_no_treatment} onChange={(e) => handleInputChange("consequences_no_treatment", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//             </div>
//           </section>

//           {/* Part F-J */}
//           <section>
//             <div className="bg-brand-primary text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part F-J — Anaesthesia & Additional Consents</div>
//             <div className="border-4 border-slate-900 rounded-3xl p-8 grid grid-cols-1 md:grid-cols-2 gap-8 shadow-inner bg-slate-50 relative">
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Anaesthesia Type</label>
//                 <select value={formData.anaesthesia_type} onChange={(e) => handleInputChange("anaesthesia_type", e.target.value)} disabled={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`}>
//                   <option value="">Select...</option>
//                   <option value="General">General</option>
//                   <option value="Regional">Regional</option>
//                   <option value="Local">Local</option>
//                   <option value="Conscious Sedation">Conscious Sedation</option>
//                 </select>
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Blood Consent</label>
//                 <select value={formData.blood_consent} onChange={(e) => handleInputChange("blood_consent", e.target.value)} disabled={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`}>
//                   <option value="">Select...</option>
//                   <option value="Consents">Consents</option>
//                   <option value="Declines">Declines</option>
//                   <option value="Discuss Further">Discuss Further</option>
//                 </select>
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Clinical Photo</label>
//                 <select value={formData.clinical_photo} onChange={(e) => handleInputChange("clinical_photo", e.target.value)} disabled={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`}>
//                   <option value="">Select...</option>
//                   <option value="Clinical Record">Clinical Record</option>
//                   <option value="Teaching">Teaching</option>
//                   <option value="Declines">Declines</option>
//                 </select>
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Consent to Tissue Examination</label>
//                 <div className="flex items-center gap-3 pt-2">
//                   <input type="checkbox" checked={formData.tissue_consent} onChange={(e) => handleInputChange("tissue_consent", e.target.checked)} disabled={readOnly} className="w-5 h-5 text-brand-primary rounded" />
//                   <span className="text-sm font-bold text-slate-700">Yes, I consent</span>
//                 </div>
//               </div>
//               <div className="space-y-2 md:col-span-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Decline Reason</label>
//                 <textarea rows={2} value={formData.decline_reason} onChange={(e) => handleInputChange("decline_reason", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//               <div className="space-y-2 md:col-span-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Implant Details</label>
//                 <textarea rows={2} value={formData.implant_details} onChange={(e) => handleInputChange("implant_details", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Additional Procedures Allowed</label>
//                 <textarea rows={2} value={formData.additional_procedures_allowed} onChange={(e) => handleInputChange("additional_procedures_allowed", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Procedures Not Allowed</label>
//                 <textarea rows={2} value={formData.procedures_not_allowed} onChange={(e) => handleInputChange("procedures_not_allowed", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//               <div className="space-y-2 md:col-span-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient Questions</label>
//                 <textarea rows={2} value={formData.patient_questions} onChange={(e) => handleInputChange("patient_questions", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//             </div>
//           </section>

//           {/* Part I - Language & Capacity */}
//           <section>
//             <div className="bg-brand-primary text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part I — Language & Capacity</div>
//             <div className="border-4 border-slate-900 rounded-3xl p-8 grid grid-cols-1 md:grid-cols-2 gap-8 shadow-inner bg-slate-50 relative">
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Language</label>
//                 <input type="text" value={formData.language} onChange={(e) => handleInputChange("language", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//               <div className="space-y-2 flex items-center">
//                 <label className="flex items-center gap-3 mt-4">
//                   <input type="checkbox" checked={formData.interpreter_used} onChange={(e) => handleInputChange("interpreter_used", e.target.checked)} disabled={readOnly} className="w-5 h-5 text-brand-primary rounded" />
//                   <span className="text-sm font-bold text-slate-700">Interpreter Used</span>
//                 </label>
//               </div>
//               {formData.interpreter_used && (
//                 <>
//                   <div className="space-y-2">
//                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Interpreter Name</label>
//                     <input type="text" value={formData.interpreter_name} onChange={(e) => handleInputChange("interpreter_name", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//                   </div>
//                   <div className="space-y-2">
//                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Interpreter Signature</label>
//                     <div className="h-32 border-2 border-dashed border-slate-300 rounded-xl bg-white overflow-hidden">
//                       {readOnly ? (
//                         <div className="h-full w-full flex items-center justify-center">
//                           {formData.interpreter_signature ? <img src={getSigUrl(formData.interpreter_signature)} className="max-h-full" /> : <span className="text-slate-300">No Signature</span>}
//                         </div>
//                       ) : (
//                         <SignaturePad onEnd={(data) => handleInputChange("interpreter_signature", data)} onClear={() => handleInputChange("interpreter_signature", null)} className="h-full w-full" />
//                       )}
//                     </div>
//                   </div>
//                 </>
//               )}
//             </div>
//           </section>

//           {/* Part B - Multiple Signatures Workflow - Exact IVC Replica */}
//           <section className="space-y-12 bg-slate-900 p-10 rounded-[3rem] shadow-2xl">
//             <h3 className="text-center text-white font-black uppercase tracking-[0.5em] text-xl mb-12">Final Declarations & Signatures</h3>
            
//             <div className="grid grid-cols-1 gap-8">
//               {/* Clinician Signature */}
//               <div className="bg-white rounded-3xl p-6 shadow-xl border-t-8 border-brand-active relative flex flex-col h-full">
//                 <PartWarning fields={["clinician_signature", "doctor_name", "clinician_confirm"]} />
//                 <div className="flex items-center gap-3 mb-6">
//                   <div className="w-8 h-8 bg-brand-active/10 rounded-lg flex items-center justify-center text-brand-primary font-black">J</div>
//                   <h4 className="font-black text-slate-800 uppercase tracking-wider text-[10px]">Declaration of Clinician</h4>
//                 </div>
//                 <div className="space-y-4 mb-6">
//                   <label className="flex items-start gap-3 p-3 bg-brand-active/5 rounded-xl cursor-pointer">
//                     <input 
//                       type="checkbox" 
//                       checked={formData.clinician_confirm} 
//                       onChange={(e) => handleInputChange("clinician_confirm", e.target.checked)}
//                       disabled={readOnly}
//                       className="mt-1 w-5 h-5 text-brand-primary rounded"
//                     />
//                     <span className="text-[10px] font-bold text-brand-primary">I confirm that I have explained the nature, purpose, benefits and risks.</span>
//                   </label>
//                 </div>
//                 <div className="space-y-2 flex-grow flex flex-col">
//                   <div className="flex-grow min-h-[250px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
//                     {readOnly ? (
//                       <div className="h-full w-full flex items-center justify-center p-2">
//                         {formData.clinician_signature ? (
//                           <img src={getSigUrl(formData.clinician_signature)} alt="Clinician Signature" className="max-h-full max-w-full object-contain" />
//                         ) : (
//                           <span className="text-slate-300 font-bold uppercase text-xs">No Signature</span>
//                         )}
//                       </div>
//                     ) : (
//                       <SignaturePad 
//                         onEnd={(data) => handleInputChange("clinician_signature", data)}
//                         onClear={() => handleInputChange("clinician_signature", null)}
//                         className="h-full w-full"
//                       />
//                     )}
//                   </div>
//                   <div className="mt-4 space-y-3">
//                      <div className="space-y-1">
//                         <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest text-center">Clinician Name *</p>
//                         <input type="text" placeholder="Enter Clinician Name" value={formData.doctor_name} onChange={(e) => handleInputChange("doctor_name", e.target.value)} readOnly={readOnly} className={`w-full border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-center outline-none transition-all placeholder:text-slate-300 ${readOnly ? "bg-slate-100" : "bg-slate-50 focus:border-brand-active focus:ring-2 focus:ring-brand-active/20"}`} />
//                      </div>
//                      <div className="flex justify-center">
//                         <div className="relative">
//                            <input type="date" value={formData.doctor_date} onChange={(e) => handleInputChange("doctor_date", e.target.value)} readOnly={readOnly} className={`border border-slate-200 rounded-lg py-1.5 px-3 text-[10px] font-bold text-center outline-none transition-all ${readOnly ? "bg-slate-100" : "bg-slate-50 focus:border-brand-active"}`} />
//                         </div>
//                      </div>
//                   </div>
//                 </div>
//               </div>

//               {/* Patient Signature */}
//               <div className="bg-white rounded-3xl p-6 shadow-xl border-t-8 border-emerald-500 relative flex flex-col h-full">
//                 <PartWarning fields={["patient_signature", "patient_name", "patient_confirm"]} />
//                 <div className="flex items-center gap-3 mb-6">
//                   <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 font-black">K</div>
//                   <h4 className="font-black text-slate-800 uppercase tracking-wider text-[10px]">Patient Consent</h4>
//                 </div>
//                 <div className="space-y-4 mb-6">
//                   <label className="flex items-start gap-3 p-3 bg-emerald-50 rounded-xl cursor-pointer">
//                     <input 
//                       type="checkbox" 
//                       checked={formData.patient_confirm} 
//                       onChange={(e) => handleInputChange("patient_confirm", e.target.checked)}
//                       disabled={readOnly}
//                       className="mt-1 w-5 h-5 text-emerald-600 rounded"
//                     />
//                     <span className="text-[10px] font-bold text-emerald-900">I give my informed consent to proceed with the procedure.</span>
//                   </label>
//                 </div>
//                 <div className="space-y-2 flex-grow flex flex-col">
//                   <div className="flex-grow min-h-[250px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
//                     {readOnly ? (
//                       <div className="h-full w-full flex items-center justify-center p-2">
//                         {formData.patient_signature ? (
//                           <img src={getSigUrl(formData.patient_signature)} alt="Patient Signature" className="max-h-full max-w-full object-contain" />
//                         ) : (
//                           <span className="text-slate-300 font-bold uppercase text-xs">No Signature</span>
//                         )}
//                       </div>
//                     ) : (
//                       <SignaturePad 
//                         onEnd={(data) => handleInputChange("patient_signature", data)}
//                         onClear={() => handleInputChange("patient_signature", null)}
//                         className="h-full w-full"
//                       />
//                     )}
//                   </div>
//                   <div className="mt-4 space-y-3">
//                      <div className="space-y-1">
//                         <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest text-center">Patient Name (Print) *</p>
//                         <input type="text" placeholder="Enter Patient Name" value={formData.patient_name} onChange={(e) => handleInputChange("patient_name", e.target.value)} readOnly={readOnly} className={`w-full border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-center outline-none transition-all placeholder:text-slate-300 ${readOnly ? "bg-slate-100" : "bg-slate-50 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"}`} />
//                      </div>
//                      <div className="flex justify-center">
//                         <div className="relative">
//                            <input type="date" value={formData.patient_date} onChange={(e) => handleInputChange("patient_date", e.target.value)} readOnly={readOnly} className={`border border-slate-200 rounded-lg py-1.5 px-3 text-[10px] font-bold text-center outline-none transition-all ${readOnly ? "bg-slate-100" : "bg-slate-50 focus:border-emerald-500"}`} />
//                         </div>
//                      </div>
//                   </div>
//                 </div>
//               </div>

//               {/* Nurse Signature */}
//               <div className="bg-white rounded-3xl p-6 shadow-xl border-t-8 border-purple-500 relative flex flex-col h-full">
//                 <PartWarning fields={["nurse_signature", "nurse_name"]} />
//                 <div className="flex items-center gap-3 mb-6">
//                   <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 font-black">N</div>
//                   <h4 className="font-black text-slate-800 uppercase tracking-wider text-[10px]">Nurse Verification</h4>
//                 </div>
//                 <div className="space-y-4 mb-6">
//                   <div className="p-3 bg-purple-50 rounded-xl">
//                     <p className="text-[10px] font-bold text-purple-900">I verify that the patient identity has been confirmed and the consent has been signed in my presence.</p>
//                   </div>
//                 </div>
//                 <div className="space-y-2 flex-grow flex flex-col">
//                   <div className="flex-grow min-h-[250px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
//                     {readOnly ? (
//                       <div className="h-full w-full flex items-center justify-center p-2">
//                         {formData.nurse_signature ? (
//                           <img src={getSigUrl(formData.nurse_signature)} alt="Nurse Signature" className="max-h-full max-w-full object-contain" />
//                         ) : (
//                           <span className="text-slate-300 font-bold uppercase text-xs">No Signature</span>
//                         )}
//                       </div>
//                     ) : (
//                       <SignaturePad 
//                         onEnd={(data) => handleInputChange("nurse_signature", data)}
//                         onClear={() => handleInputChange("nurse_signature", null)}
//                         className="h-full w-full"
//                       />
//                     )}
//                   </div>
//                   <div className="mt-4 space-y-3">
//                      <div className="space-y-1">
//                         <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest text-center">Nurse Name *</p>
//                         <input type="text" placeholder="Enter Nurse Name" value={formData.nurse_name} onChange={(e) => handleInputChange("nurse_name", e.target.value)} readOnly={readOnly} className={`w-full border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-center outline-none transition-all placeholder:text-slate-300 ${readOnly ? "bg-slate-100" : "bg-slate-50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"}`} />
//                      </div>
//                      <div className="flex justify-center">
//                         <div className="relative">
//                            <input type="date" value={formData.nurse_date} onChange={(e) => handleInputChange("nurse_date", e.target.value)} readOnly={readOnly} className={`border border-slate-200 rounded-lg py-1.5 px-3 text-[10px] font-bold text-center outline-none transition-all ${readOnly ? "bg-slate-100" : "bg-slate-50 focus:border-purple-500"}`} />
//                         </div>
//                      </div>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </section>

//           {/* Part M - Consent on Behalf of Patient */}
//           <section>
//             <div className="bg-brand-primary text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part M — Consent on Behalf of Patient</div>
//             <div className="border-4 border-slate-900 rounded-3xl p-8 grid grid-cols-1 md:grid-cols-2 gap-8 shadow-inner bg-slate-50 relative">
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Representative Name</label>
//                 <input type="text" value={formData.representative_name} onChange={(e) => handleInputChange("representative_name", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Relationship</label>
//                 <input type="text" value={formData.relationship} onChange={(e) => handleInputChange("relationship", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`} />
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Legal Basis</label>
//                 <select value={formData.legal_basis} onChange={(e) => handleInputChange("legal_basis", e.target.value)} disabled={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active"}`}>
//                   <option value="">Select...</option>
//                   <option value="Next of Kin">Next of Kin</option>
//                   <option value="Court-appointed Guardian">Court-appointed Guardian</option>
//                   <option value="Power of Attorney">Power of Attorney</option>
//                 </select>
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Representative Signature</label>
//                 <div className="h-32 border-2 border-dashed border-slate-300 rounded-xl bg-white overflow-hidden">
//                   {readOnly ? (
//                     <div className="h-full w-full flex items-center justify-center">
//                       {formData.representative_signature ? <img src={getSigUrl(formData.representative_signature)} className="max-h-full" /> : <span className="text-slate-300">No Signature</span>}
//                     </div>
//                   ) : (
//                     <SignaturePad onEnd={(data) => handleInputChange("representative_signature", data)} onClear={() => handleInputChange("representative_signature", null)} className="h-full w-full" />
//                   )}
//                 </div>
//               </div>
//             </div>
//           </section>

//           {/* Part N - Withdrawal of Consent */}
//           <section>
//             <div className="bg-red-600 text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part N — Withdrawal of Consent</div>
//             <div className="border-4 border-red-200 rounded-3xl p-8 grid grid-cols-1 md:grid-cols-2 gap-8 shadow-inner bg-red-50 relative">
//               <div className="space-y-2 md:col-span-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Withdrawal Reason</label>
//                 <textarea rows={2} value={formData.withdrawal_reason} onChange={(e) => handleInputChange("withdrawal_reason", e.target.value)} readOnly={readOnly} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-red-500"}`} />
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient / Representative Signature</label>
//                 <div className="h-32 border-2 border-dashed border-slate-300 rounded-xl bg-white overflow-hidden">
//                   {readOnly ? (
//                     <div className="h-full w-full flex items-center justify-center">
//                       {formData.withdrawal_signature ? <img src={getSigUrl(formData.withdrawal_signature)} className="max-h-full" /> : <span className="text-slate-300">No Signature</span>}
//                     </div>
//                   ) : (
//                     <SignaturePad onEnd={(data) => handleInputChange("withdrawal_signature", data)} onClear={() => handleInputChange("withdrawal_signature", null)} className="h-full w-full" />
//                   )}
//                 </div>
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Clinician Signature</label>
//                 <div className="h-32 border-2 border-dashed border-slate-300 rounded-xl bg-white overflow-hidden">
//                   {readOnly ? (
//                     <div className="h-full w-full flex items-center justify-center">
//                       {formData.clinician_withdrawal_signature ? <img src={getSigUrl(formData.clinician_withdrawal_signature)} className="max-h-full" /> : <span className="text-slate-300">No Signature</span>}
//                     </div>
//                   ) : (
//                     <SignaturePad onEnd={(data) => handleInputChange("clinician_withdrawal_signature", data)} onClear={() => handleInputChange("clinician_withdrawal_signature", null)} className="h-full w-full" />
//                   )}
//                 </div>
//               </div>
//             </div>
//           </section>

//         </div>

//         {/* Footer / Actions - Exact Replica */}
//         <div className="bg-slate-100 border-t-4 border-slate-200 p-6 flex justify-between items-center shrink-0">
//           <button 
//             onClick={onCancel}
//             disabled={submitting}
//             className="px-8 py-3 rounded-2xl font-black text-slate-500 hover:bg-slate-200 transition-all uppercase tracking-widest text-sm"
//           >
//             {readOnly ? "Close" : "Discard Form"}
//           </button>
//           <div className="flex gap-4">
//             {!readOnly && (
//               <button 
//                 onClick={handleSubmit}
//                 disabled={submitting || !formData.clinician_signature || !formData.patient_signature}
//                 className="bg-[#1e1b4b] text-white px-10 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-2xl shadow-brand-primary/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50 disabled:grayscale disabled:scale-100"
//               >
//                 {submitting ? (
//                   <Loader2 className="animate-spin" size={20} />
//                 ) : (
//                   <CheckCircle size={20} />
//                 )}
//                 {submitting ? "Finalizing..." : "Submit & Print Consent"}
//               </button>
//             )}
//             {readOnly && (
//               <button 
//                 onClick={() => setIsPrintOpen(true)}
//                 className="bg-brand-active text-white px-10 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-2xl transition-all flex items-center gap-3"
//               >
//                 <Printer size={20} /> View Full PDF
//               </button>
//             )}
//           </div>
//         </div>
//       </div>

//       {isPrintOpen && formData && createPortal(
//         <div className="hidden">
//           <div id="general-print-content">
//              <GeneralConsentPrintTemplate isOpen={true} onClose={() => {}} data={formData} />
//           </div>
//         </div>,
//         document.body
//       )}
//       {isPrintOpen && (
//          <div className="fixed inset-0 z-[60] bg-white/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
//             <div className="relative">
//               <Loader2 className="animate-spin text-[#3B309A] mb-4" size={64} />
//               <div className="absolute inset-0 flex items-center justify-center">
//                 <Printer className="text-[#3B309A] animate-pulse" size={24} />
//               </div>
//             </div>
//             <h2 className="text-2xl font-black text-[#3B309A] tracking-tighter uppercase italic">Generating Document</h2>
//             <p className="text-slate-500 font-bold mt-2 animate-pulse">Preparing for print...</p>
//          </div>
//       )}
//     </>
//   );
// };

// export default GeneralConsentForm;
