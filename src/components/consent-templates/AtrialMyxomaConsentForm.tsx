import React, { useState, useEffect, useRef } from "react";
import { CheckCircle, Loader2, Printer, Save } from "lucide-react";
import { consentService } from "../../services/consent.service";
import SignaturePad from "../SignaturePad";
import { useAuth } from "../../context/AuthContext";
import { useNotification } from "../../context/NotificationContext";
import { BASE_URL } from "../../api/client";
import apiClient from "../../api/client";
import { patientService } from "../../services/patient.service";
import { formDraftService } from "../../services/session-restore.service";

export interface AtrialMyxomaConsentFormProps {
  orderId: number;
  patientName: string;
  mrn: string;
  initialData?: any;
  draftId?: number | null;
  onSuccess: (formData: any) => void;
  onCancel: () => void;
  onPrint: () => void;
  readOnly?: boolean;
  viewData?: any;
}

// Strict schema string definitions for backend validation
const PATCH_OPTIONS = {
  A: "A - PERICARDIAL PATCH (planned). A patch cut from your own pericardium.",
  B: "B - PROSTHETIC PATCH (only if needed). A man-made patch used only if your own tissue is unsuitable.",
  C: "C - I do NOT agree to a prosthetic patch."
};

const PHOTO_OPTIONS = {
  CLINICAL: "Consents — clinical record",
  ANONYMISED: "Consents — anonymised teaching / training / audit",
  DECLINES: "Declines"
};

const AtrialMyxomaConsentForm: React.FC<AtrialMyxomaConsentFormProps> = ({
  orderId,
  patientName,
  mrn,
  initialData,
  draftId,
  onSuccess,
  onCancel,
  onPrint,
  readOnly = false,
  viewData,
}) => {
  const { user } = useAuth();
  const { notify } = useNotification();

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<any>(viewData || initialData || { patient_name: patientName, mrn });

  // Ref for the local auto-save timer
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getSigUrl = (path: string | undefined | null) => {
    if (!path) return "";
    if (path.startsWith("data:")) return path;
    const normalizedBaseUrl = BASE_URL.replace(/\/$/, "");
    return path.startsWith("/") ? `${normalizedBaseUrl}${path}` : `${normalizedBaseUrl}/${path}`;
  };

  // 1. Initial Data Fetch & Local Draft Restoration
  useEffect(() => {
    // Only attempt to restore/fetch if we are dealing with a fresh form 
    // (i.e., not viewing a completed consent or a loaded backend draft)
    if (!readOnly && mrn && !viewData && !initialData) {
      
      const localDraftId = `consent_atrial_myxoma_${orderId}`;
      const savedDraft = user?.id ? formDraftService.loadDraft<any>(user.id, localDraftId) : null;
      
      // If a local draft exists (e.g. they logged out accidentally while typing), restore it!
      if (savedDraft) {
        setFormData(savedDraft);
        notify("Restored unsaved changes from your previous session", "success");
        return; 
      }

      // Otherwise, fetch fresh clinical defaults from the database
      const fetchPrefillData = async () => {
        setLoading(true);
        try {
          const patient = await patientService.getPatientByMrn(mrn);
          let wardUnit = "";
          try {
            const admissionRes = await apiClient.get("/ipd/admission/list");
            const activeAdmission = (admissionRes.data?.data?.results || []).find(
              (a: any) => a.mrn === mrn && a.status === "ACTIVE"
            );
            if (activeAdmission) {
              wardUnit = [activeAdmission.ward_name, activeAdmission.room_number, activeAdmission.bed_number].filter(Boolean).join(" / ");
            }
          } catch (e) {
            console.warn("Could not fetch admission data for pre-fill", e);
          }

          if (patient) {
            setFormData((prev: any) => ({
              ...prev,
              patient_full_name: prev.patient_full_name || `${patient.demographics?.first_name || ""} ${patient.demographics?.last_name || ""}`.trim(),
              dob: prev.dob || patient.demographics?.date_of_birth || "",
              age_sex: prev.age_sex || `${patient.demographics?.age || ""} / ${patient.demographics?.gender || ""}`,
              ward_unit: prev.ward_unit || wardUnit,
            }));
          }
        } catch (error) {
          console.error("Failed to prefill patient data", error);
        } finally {
          setLoading(false);
        }
      };
      fetchPrefillData();
    }
  }, [mrn, readOnly, viewData, initialData, orderId, user?.id]);

  // 2. Local Auto-Save Loop
  useEffect(() => {
    if (readOnly || !orderId || !user?.id) return;
    
    // Clear the existing timer
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    
    // Set a new timer to save the draft locally after 1.5s of no typing
    autoSaveTimerRef.current = setTimeout(() => {
      const localDraftId = `consent_atrial_myxoma_${orderId}`;
      formDraftService.saveDraft(user.id!, localDraftId, formData);
    }, 1500);
    
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
  }, [formData, orderId, user?.id, readOnly]);

  const handleInputChange = (id: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [id]: value }));
  };

  // 3. Save as Backend Draft Handler
  const handleSaveDraft = async () => {
    setSubmitting(true);
    try {
      await consentService.createConsent({
        order_id: orderId,
        template_slug: "Atrial_Myxoma_Excision",
        witness_user_id: user?.id || 0,
        form_data: formData,
        is_draft: true,
        consent_id: draftId,
      });
      notify("Draft saved successfully to the system", "success");
      
      // Clear the local storage draft since it is now securely saved on the backend
      if (user?.id) formDraftService.clearDraft(user.id, `consent_atrial_myxoma_${orderId}`);
      
      onCancel(); 
    } catch (error: any) {
      notify(error.response?.data?.message || error.message || "Failed to save draft", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Finalizing and Submitting Consent Handler
  const handleSubmit = async () => {
    if (!formData.surgeon_signature || (!formData.patient_signature && !formData.parent_signature)) {
      notify("Both clinician and patient/guardian signatures are required", "error");
      return;
    }

    setSubmitting(true);
    try {
      await consentService.createConsent({
        order_id: orderId,
        template_slug: "Atrial_Myxoma_Excision",
        workflow_stage: "SIGNED_AND_CHECKED",
        witness_user_id: user?.id || 0,
        form_data: formData,
        consent_id: draftId, // Passes draft ID so backend overwrites the draft into a final record
      });
      notify("Consent form submitted successfully", "success");
      
      // Clear the local storage draft since it is now completed
      if (user?.id) formDraftService.clearDraft(user.id, `consent_atrial_myxoma_${orderId}`);
      
      onSuccess(formData);
    } catch (error: any) {
      notify(error.response?.data?.message || error.message || "Failed to submit consent", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl shadow-2xl p-16 flex items-center justify-center">
        <Loader2 className="animate-spin text-[#1e40af]" size={48} />
      </div>
    );
  }

  // UI Helpers
  const renderTextInput = (id: string, label: string, colSpan = "md:col-span-1", required = false) => (
    <div className={`space-y-2 ${colSpan}`}>
      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}{required && " *"}</label>
      <input
        type={id.includes("date") || id === "dob" ? "date" : "text"}
        value={formData[id] || ""}
        onChange={(e) => handleInputChange(id, e.target.value)}
        readOnly={readOnly || id === "mrn"}
        className={`w-full border-2 rounded-xl px-4 py-2 font-bold transition-all outline-none ${readOnly ? "bg-slate-100 border-slate-200 text-slate-800" : "bg-white border-slate-200 focus:border-blue-500 text-slate-800"}`}
      />
    </div>
  );

  const renderTextarea = (id: string, label: string, colSpan = "md:col-span-4", required = false) => (
    <div className={`space-y-2 ${colSpan}`}>
      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}{required && " *"}</label>
      <textarea
        rows={2}
        value={formData[id] || ""}
        onChange={(e) => handleInputChange(id, e.target.value)}
        readOnly={readOnly}
        className={`w-full border-2 rounded-xl px-4 py-2 font-bold transition-all outline-none resize-none ${readOnly ? "bg-slate-100 border-slate-200 text-slate-800" : "bg-white border-slate-200 focus:border-blue-500 text-slate-800"}`}
      />
    </div>
  );

  const renderCheckbox = (id: string, label: string, colSpan = "md:col-span-4", required = false) => (
    <label className={`flex items-start gap-3 p-3 bg-white border-2 border-slate-200 rounded-xl cursor-pointer ${colSpan}`}>
      <input
        type="checkbox"
        checked={!!formData[id]}
        onChange={(e) => handleInputChange(id, e.target.checked)}
        disabled={readOnly}
        className="mt-1 w-5 h-5 rounded text-[#1e40af]"
      />
      <span className="text-xs font-bold text-slate-700 leading-tight">{label}{required && " *"}</span>
    </label>
  );

  const renderSignature = (id: string, label: string, colSpan = "md:col-span-2") => (
    <div className={`space-y-2 flex flex-col ${colSpan}`}>
      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
      <div className="flex-grow min-h-[150px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
        {readOnly ? (
          <div className="h-full w-full flex items-center justify-center p-2">
            {formData[id] ? (
              <img src={getSigUrl(formData[id])} alt={label} className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="text-slate-300 font-bold uppercase text-xs">No Signature</span>
            )}
          </div>
        ) : (
          <SignaturePad
            onEnd={(data) => handleInputChange(id, data)}
            onClear={() => handleInputChange(id, null)}
            className="h-full w-full"
          />
        )}
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="bg-[#1e40af] text-white p-8 flex justify-between items-center relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#1e40af]/30 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="z-10">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-1">
              <img src="/assets/login-bg.jpeg" alt="GSH Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter">Procedure Consent Form</h1>
              <p className="text-[#93c5fd] font-bold text-sm uppercase">Atrial Myxoma Excision</p>
            </div>
          </div>
          <p className="text-xs text-[#93c5fd]/80 font-medium">Policy Ref: GSH-T6</p>
        </div>
        <button
          onClick={onPrint}
          className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/20 transition-all z-10"
        >
          <Printer size={14} /> {readOnly ? "Print Record" : "Print Blank Form"}
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar bg-slate-50">
        
        {/* Intro */}
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 bg-amber-200/50 px-4 py-1 rounded-bl-xl text-[10px] font-black text-amber-800 uppercase tracking-wider">Patient Rights</div>
          <p className="text-xs text-amber-900 font-medium leading-relaxed italic mb-4">
            You have the right to make decisions about your medical care and to refuse any procedure. If you wish to withdraw consent at any time before the procedure begins, you may do so. Signing this form does not remove your legal rights. This form complies with the National Health Act 2014 (Nigeria) and Gracespring Hospitals Consent Policy (GSH-T6).
          </p>
          <h4 className="font-black text-amber-900 uppercase text-xs mb-1">About this operation</h4>
          <p className="text-xs text-amber-900 font-medium leading-relaxed italic">
            Surgical removal of a myxoma — a non-cancerous (benign) tumour growing inside an upper chamber of the heart (an atrium) — using open-heart surgery with the heart–lung (cardiopulmonary bypass) machine. A myxoma can shed fragments that travel in the blood (embolism) and can obstruct a heart valve; removal is the recommended treatment.
          </p>
        </div>

        {/* Site of Tumour */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
          <div className="bg-slate-700 text-white px-4 py-1 inline-block rounded-t-xl text-[10px] font-black uppercase tracking-widest -mt-10 ml-4">SITE OF TUMOUR</div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-4">
            <div className="md:col-span-4 flex flex-wrap gap-4 items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="tumour_site" checked={formData.tumour_site === 'LEFT atrium'} onChange={() => handleInputChange('tumour_site', 'LEFT atrium')} disabled={readOnly} className="w-5 h-5 text-[#1e40af]" />
                <span className="text-xs font-bold text-slate-700">LEFT atrium</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="tumour_site" checked={formData.tumour_site === 'RIGHT atrium'} onChange={() => handleInputChange('tumour_site', 'RIGHT atrium')} disabled={readOnly} className="w-5 h-5 text-[#1e40af]" />
                <span className="text-xs font-bold text-slate-700">RIGHT atrium</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="tumour_site" checked={formData.tumour_site === 'Other'} onChange={() => handleInputChange('tumour_site', 'Other')} disabled={readOnly} className="w-5 h-5 text-[#1e40af]" />
                <span className="text-xs font-bold text-slate-700">Other</span>
              </label>
              {formData.tumour_site === 'Other' && (
                <input type="text" value={formData.tumour_site_other || ""} onChange={(e) => handleInputChange('tumour_site_other', e.target.value)} disabled={readOnly} className="border-b-2 border-slate-300 outline-none bg-transparent px-2 text-sm font-bold text-slate-800" placeholder="Specify..." />
              )}
            </div>
            {renderTextInput("attachment_site", "Attachment site (e.g. atrial septum, valve, wall)", "md:col-span-2")}
            {renderTextInput("approx_size", "Approx. size / mobility / obstruction noted", "md:col-span-2")}
          </div>
        </div>

        {/* PART A */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#1e40af] border-t-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-6 rounded-full bg-[#1e40af] text-white flex items-center justify-center text-xs font-black">A</span>
            <h4 className="font-black text-slate-800 uppercase tracking-widest text-[11px]">Patient Identification</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {renderTextInput("patient_full_name", "Patient Full Name", "md:col-span-2", true)}
            {renderTextInput("dob", "Date of Birth", "md:col-span-1", true)}
            {renderTextInput("mrn", "MRN", "md:col-span-1", true)}
            {renderTextInput("age_sex", "Age / Sex", "md:col-span-1")}
            {renderTextInput("responsible_surgeon", "Consultant / Responsible Surgeon", "md:col-span-2", true)}
            {renderTextInput("ward_unit", "Ward / Unit", "md:col-span-1", true)}
            {renderTextInput("anaesthetist", "Anaesthetist", "md:col-span-2")}
            {renderTextInput("planned_surgery_date", "Planned Date of Surgery", "md:col-span-2", true)}
            {renderTextarea("primary_diagnosis", "Primary Diagnosis / Indication (e.g. left atrial myxoma with embolic events)", "md:col-span-4")}
          </div>
        </div>

        {/* PART B & C */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-3xl p-6 shadow-sm border-t-8 border-slate-700">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-6 h-6 rounded-full bg-slate-700 text-white flex items-center justify-center text-xs font-black">B</span>
              <h4 className="font-black text-slate-800 uppercase tracking-widest text-[11px]">Description of Procedure</h4>
            </div>
            <p className="text-xs text-slate-600 mb-3"><strong className="text-slate-800">What it involves:</strong> The myxoma is removed through open-heart surgery. A left atrial tumour is usually reached through the right atrium and the atrial septum. The tumour is removed whole with its stalk/base to reduce recurrence.</p>
            <p className="text-xs text-slate-600 mb-6"><strong className="text-slate-800">How it is performed:</strong> General anaesthetic; median sternotomy. The heart is stopped and blood circulated by the cardiopulmonary bypass machine. The atrium is opened, tumour excised, nearby heart valve inspected, and any septal defect closed with a patch.</p>
            {renderTextarea("surgeons_notes", "Surgeon's notes on this patient's tumour", "md:col-span-2")}
          </div>
          
          <div className="bg-white rounded-3xl p-6 shadow-sm border-t-8 border-[#1e40af]">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-6 h-6 rounded-full bg-[#1e40af] text-white flex items-center justify-center text-xs font-black">C</span>
              <h4 className="font-black text-slate-800 uppercase tracking-widest text-[11px]">Intended Benefits</h4>
            </div>
            <p className="text-xs text-slate-600 mb-6">Removing the myxoma eliminates the source of fragments that can travel to the brain (stroke), limbs or organs, relieves or prevents obstruction of the nearby heart valve, and removes the risk of sudden death from the tumour. It establishes the diagnosis on laboratory examination.</p>
            {renderTextarea("specific_goals", "Specific goals / expected outcome discussed", "md:col-span-2")}
          </div>
        </div>

        {/* PART D - Risks */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border-t-8 border-[#be123c]">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-6 rounded-full bg-[#be123c] text-white flex items-center justify-center text-xs font-black">D</span>
            <h4 className="font-black text-slate-800 uppercase tracking-widest text-[11px]">Risks & Complications</h4>
          </div>
          <p className="text-xs text-slate-500 italic mb-4">Montgomery standard: the patient (or parent/guardian) must be told of any risk a reasonable person in their position would consider significant, and any risk significant to this particular patient.</p>
          
          <div className="overflow-x-auto mb-6 border-4 border-slate-900 rounded-3xl shadow-sm">
            <table className="w-full text-left border-collapse bg-white">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest w-1/4">Frequency</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest w-1/3">Complication</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest">Management</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr><td className="px-4 py-3 text-xs font-black text-emerald-600">COMMON</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Irregular heartbeat; chest/wound discomfort; pericardial fluid.</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Usually managed with medicine / routine care.</td></tr>
                <tr className="bg-slate-50"><td className="px-4 py-3 text-xs font-black text-emerald-600">COMMON</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Temporary confusion or poor concentration after bypass.</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Usually settles; occasionally longer-lasting.</td></tr>
                <tr><td className="px-4 py-3 text-xs font-black text-amber-600">UNCOMMON</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Bleeding needing transfusion or return to theatre.</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Managed by transfusion or re-operation.</td></tr>
                <tr className="bg-slate-50"><td className="px-4 py-3 text-xs font-black text-amber-600">UNCOMMON</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Heart block needing temporary pacing or permanent pacemaker.</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Pacing wires placed at surgery; pacemaker if persistent.</td></tr>
                <tr><td className="px-4 py-3 text-xs font-black text-rose-600">RARE</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Stroke or embolism — fragments of tumour or clot to the brain, limbs, kidneys or gut.</td><td className="px-4 py-3 text-xs font-medium text-slate-600">May be permanent; specialist care needed.</td></tr>
                <tr className="bg-slate-50"><td className="px-4 py-3 text-xs font-black text-rose-600">RARE</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Injury to a nearby heart valve needing repair or replacement.</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Repaired or replaced at surgery.</td></tr>
                <tr><td className="px-4 py-3 text-xs font-black text-red-700">VERY RARE</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Life-threatening complication or death.</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Mitigated by specialist care.</td></tr>
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderTextarea("figures_discussed", "Figures discussed with this patient (e.g. overall risk)", "md:col-span-1")}
            {renderTextarea("specific_risks", "Risks specific to THIS patient (comorbidities, etc.)", "md:col-span-1")}
          </div>
        </div>

        {/* PART E & F */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-3xl p-6 shadow-sm border-t-8 border-[#ea580c]">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-6 h-6 rounded-full bg-[#ea580c] text-white flex items-center justify-center text-xs font-black">E</span>
              <h4 className="font-black text-slate-800 uppercase tracking-widest text-[11px]">Alternatives</h4>
            </div>
            <ul className="text-xs text-slate-600 list-disc pl-4 mb-4 space-y-1">
              <li><strong>No surgery:</strong> Risks of stroke, heart failure continue.</li>
              <li><strong>Medical management:</strong> Treats symptoms only.</li>
              <li><strong>Delay:</strong> Increases risk of embolism/obstruction.</li>
            </ul>
            {renderTextarea("alternatives_discussed", "Alternatives discussed with this patient", "md:col-span-2")}
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border-t-8 border-slate-700">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-6 h-6 rounded-full bg-slate-700 text-white flex items-center justify-center text-xs font-black">F</span>
              <h4 className="font-black text-slate-800 uppercase tracking-widest text-[11px]">Patch to close the heart wall</h4>
            </div>
            <p className="text-xs text-slate-600 mb-4">Removing the tumour may leave a hole. The surgeon plans to close it with a patch of your own tissue.</p>
            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="radio" name="patch_consent" checked={formData.patch_consent === PATCH_OPTIONS.A} onChange={() => handleInputChange('patch_consent', PATCH_OPTIONS.A)} disabled={readOnly} className="mt-1 w-5 h-5 text-[#1e40af]" />
                <span className="text-xs font-bold text-slate-700">A - PERICARDIAL PATCH (planned). A patch cut from your own pericardium.</span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="radio" name="patch_consent" checked={formData.patch_consent === PATCH_OPTIONS.B} onChange={() => handleInputChange('patch_consent', PATCH_OPTIONS.B)} disabled={readOnly} className="mt-1 w-5 h-5 text-[#1e40af]" />
                <span className="text-xs font-bold text-slate-700">B - PROSTHETIC PATCH (only if needed). Used if own tissue is unsuitable.</span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="radio" name="patch_consent" checked={formData.patch_consent === PATCH_OPTIONS.C} onChange={() => handleInputChange('patch_consent', PATCH_OPTIONS.C)} disabled={readOnly} className="mt-1 w-5 h-5 text-[#1e40af]" />
                <span className="text-xs font-bold text-slate-700">C - I do NOT agree to a prosthetic patch.</span>
              </label>
            </div>
          </div>
        </div>

        {/* PART G & H */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-3xl p-6 shadow-sm border-t-8 border-slate-700">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-6 h-6 rounded-full bg-slate-700 text-white flex items-center justify-center text-xs font-black">G</span>
              <h4 className="font-black text-slate-800 uppercase tracking-widest text-[11px]">Heart Valve Injury/Repair</h4>
            </div>
            <p className="text-xs text-slate-600 mb-4">The tumour sits close to a heart valve. Both valves are inspected. If damaged, repair or replacement may be needed.</p>
            <div className="space-y-3">
              {renderCheckbox("valve_repair_consent", "D - I consent to REPAIR of the heart valve if damage is found.", "col-span-1")}
              {renderCheckbox("valve_replacement_consent", "E - I consent to valve REPLACEMENT if repair is not possible.", "col-span-1")}
              
              {formData.valve_replacement_consent && (
                <div className="pl-8 flex flex-col gap-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Intended Valve Type:</span>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="preferred_valve_type" checked={formData.preferred_valve_type === 'Mechanical'} onChange={() => handleInputChange('preferred_valve_type', 'Mechanical')} disabled={readOnly} />
                      <span className="text-xs font-bold text-slate-600">Mechanical</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="preferred_valve_type" checked={formData.preferred_valve_type === 'Tissue (biological)'} onChange={() => handleInputChange('preferred_valve_type', 'Tissue (biological)')} disabled={readOnly} />
                      <span className="text-xs font-bold text-slate-600">Tissue</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="preferred_valve_type" checked={formData.preferred_valve_type === 'Leave to surgeon'} onChange={() => handleInputChange('preferred_valve_type', 'Leave to surgeon')} disabled={readOnly} />
                      <span className="text-xs font-bold text-slate-600">Leave to surgeon</span>
                    </label>
                  </div>
                </div>
              )}
              {renderCheckbox("no_valve_replacement_consent", "F - I do NOT consent to valve replacement.", "col-span-1")}
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border-t-8 border-slate-700">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-6 h-6 rounded-full bg-slate-700 text-white flex items-center justify-center text-xs font-black">H</span>
              <h4 className="font-black text-slate-800 uppercase tracking-widest text-[11px]">Other Necessary Procedures</h4>
            </div>
            <p className="text-xs text-slate-600 mb-4">The surgeon will do these only if needed to complete the operation safely or to treat a danger to life.</p>
            <div className="space-y-3">
              {renderCheckbox("cabg_consent", "G - Coronary artery bypass graft (CABG) if found to need it.", "col-span-1")}
              {renderCheckbox("pacing_wires_consent", "H - Temporary pacing wires / permanent pacemaker.", "col-span-1")}
              {renderCheckbox("return_to_theatre_consent", "I - Return to theatre to treat bleeding or leak.", "col-span-1")}
              {renderCheckbox("emergency_bypass_consent", "J - Femoral cannulation or emergency bypass.", "col-span-1")}
            </div>
          </div>
        </div>

        {/* PART J */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-6 rounded-full bg-slate-700 text-white flex items-center justify-center text-xs font-black">J</span>
            <h4 className="font-black text-slate-800 uppercase tracking-widest text-[11px]">Additional Procedures, Blood & Tissue</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {renderTextarea("additional_procedures_consented", "Additional procedures consented to if needed", "md:col-span-1")}
            {renderTextarea("procedures_declined", "Procedures NOT to be carried out under any circumstances", "md:col-span-1")}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Blood Transfusion Consent:</span>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="blood_transfusion" checked={formData.blood_transfusion === 'Consents'} onChange={() => handleInputChange('blood_transfusion', 'Consents')} disabled={readOnly} />
                  <span className="text-xs font-bold text-slate-600">Consents</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="blood_transfusion" checked={formData.blood_transfusion === 'Declines'} onChange={() => handleInputChange('blood_transfusion', 'Declines')} disabled={readOnly} />
                  <span className="text-xs font-bold text-slate-600">Declines</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="blood_transfusion" checked={formData.blood_transfusion === 'Discuss'} onChange={() => handleInputChange('blood_transfusion', 'Discuss')} disabled={readOnly} />
                  <span className="text-xs font-bold text-slate-600">Discuss</span>
                </label>
              </div>
              {renderCheckbox("tissue_specimens_consent", "Consent to tissue/specimens retained for audit/teaching.", "md:col-span-2")}
              {renderTextInput("implants_brand_consent", "Implants (Patch/Valve Brand) - Consents", "md:col-span-2")}
            </div>
            <div className="space-y-3">
              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Clinical Photography & Video:</span>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="clinical_photography_consent" checked={formData.clinical_photography_consent === PHOTO_OPTIONS.CLINICAL} onChange={() => handleInputChange('clinical_photography_consent', PHOTO_OPTIONS.CLINICAL)} disabled={readOnly} />
                  <span className="text-xs font-bold text-slate-600">{PHOTO_OPTIONS.CLINICAL}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="clinical_photography_consent" checked={formData.clinical_photography_consent === PHOTO_OPTIONS.ANONYMISED} onChange={() => handleInputChange('clinical_photography_consent', PHOTO_OPTIONS.ANONYMISED)} disabled={readOnly} />
                  <span className="text-xs font-bold text-slate-600">{PHOTO_OPTIONS.ANONYMISED}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="clinical_photography_consent" checked={formData.clinical_photography_consent === PHOTO_OPTIONS.DECLINES} onChange={() => handleInputChange('clinical_photography_consent', PHOTO_OPTIONS.DECLINES)} disabled={readOnly} />
                  <span className="text-xs font-bold text-slate-600">{PHOTO_OPTIONS.DECLINES}</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* SIGNATURE BLOCK SECTION (Dark Box) */}
        <section className="space-y-8 bg-slate-900 p-10 rounded-[3rem] shadow-2xl">
          <h3 className="text-center text-white font-black uppercase tracking-[0.3em] text-lg mb-6">Final Declarations & Signatures</h3>
          
          {/* PART K */}
          <div className="bg-white rounded-3xl p-6 shadow-xl border-t-8 border-emerald-500 relative">
            <h4 className="font-black text-slate-800 uppercase tracking-wider text-[10px] mb-4">PART K — Language & Interpreter</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {renderTextInput("discussion_language", "Language of Discussion", "md:col-span-2")}
              <div className="md:col-span-2 space-y-2">
                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Interpreter Used?</span>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="interpreter_used" checked={formData.interpreter_used === 'Yes'} onChange={() => handleInputChange('interpreter_used', 'Yes')} disabled={readOnly} />
                    <span className="text-xs font-bold text-slate-600">Yes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="interpreter_used" checked={formData.interpreter_used === 'No'} onChange={() => handleInputChange('interpreter_used', 'No')} disabled={readOnly} />
                    <span className="text-xs font-bold text-slate-600">No</span>
                  </label>
                </div>
              </div>
              {formData.interpreter_used === 'Yes' && (
                <>
                  {renderTextInput("interpreter_name", "Interpreter Full Name", "md:col-span-2")}
                  {renderSignature("interpreter_signature", "Interpreter Signature", "md:col-span-2")}
                </>
              )}
            </div>
          </div>

          {/* PART L */}
          <div className="bg-purple-50 rounded-3xl p-8 shadow-xl border-4 border-purple-200 relative">
            <h4 className="font-black text-purple-900 uppercase tracking-wider text-[10px] mb-4">PART L — DECLARATION OF CONSENTING CLINICIAN</h4>
            <p className="text-xs text-slate-600 font-bold mb-6 italic border-l-4 border-slate-300 pl-4">
              I confirm I have explained the procedure and its purpose, the intended benefits, the material risks... and I am satisfied the patient (or parent/guardian) has capacity and consents voluntarily.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {renderTextInput("surgeon_name", "Surgeon Full Name", "md:col-span-2")}
              {renderTextInput("surgeon_designation", "Designation", "md:col-span-2")}
              {renderSignature("surgeon_signature", "Surgeon Signature", "md:col-span-2")}
              {renderTextInput("surgeon_signature_date", "Date", "md:col-span-2")}
            </div>
          </div>

          {/* PART M */}
          <div className="bg-white rounded-3xl p-6 shadow-xl border-t-8 border-slate-900 relative">
            <h4 className="font-black text-slate-800 uppercase tracking-wider text-[10px] mb-4">PART M — PATIENT CONSENT DECLARATION</h4>
            <div className="space-y-3 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              {renderCheckbox("chk_understood", "I have read, or had read to me, and I understand the information in Parts A to L.", "col-span-1", true)}
              {renderCheckbox("chk_risks", "The benefits, risks and alternatives have been explained and I have had the opportunity to ask questions.", "col-span-1", true)}
              {renderCheckbox("chk_accept", "I understand and accept the risks described, including those relevant to my individual circumstances.", "col-span-1", true)}
              {renderCheckbox("chk_site", "I confirm the SITE of the tumour ticked at the top of this form is the site I have been told about.", "col-span-1", true)}
              {renderCheckbox("chk_modify", "I understand the team will use the planned approach but may modify it if clinically necessary.", "col-span-1", true)}
              {renderCheckbox("chk_withdraw", "I understand no guarantee of a particular result has been given, and I may withdraw consent at any time.", "col-span-1", true)}
              {renderCheckbox("chk_additional", "I consent to additional procedures judged immediately necessary.", "col-span-1", true)}
            </div>
            <p className="font-black text-[#1e40af] text-sm uppercase text-center mb-6">I GIVE MY INFORMED CONSENT to proceed with excision of atrial myxoma.</p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {renderTextInput("patient_signature_name", "Patient Full Name", "md:col-span-2")}
              {renderTextInput("patient_signature_date", "Date", "md:col-span-2")}
              {renderSignature("patient_signature", "Patient Signature", "md:col-span-2")}
              {renderSignature("witness_signature", "Witness Signature (If patient unable to sign)", "md:col-span-2")}
            </div>
          </div>

          {/* PART N */}
          <div className="bg-white rounded-3xl p-6 shadow-xl border-t-8 border-purple-600 relative">
            <h4 className="font-black text-slate-800 uppercase tracking-wider text-[10px] mb-4">PART N — CONSENT BY PARENT / GUARDIAN (If lacking capacity)</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              {renderTextInput("parent_guardian_name", "Name of Parent / Guardian", "md:col-span-2")}
              {renderTextInput("relationship_to_patient", "Relationship to Patient", "md:col-span-2")}
              <div className="md:col-span-4 space-y-2">
                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Legal Basis</span>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="legal_basis" checked={formData.legal_basis === 'Parental responsibility'} onChange={() => handleInputChange('legal_basis', 'Parental responsibility')} disabled={readOnly} />
                    <span className="text-xs font-bold text-slate-600">Parental responsibility</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="legal_basis" checked={formData.legal_basis === 'Legal guardian'} onChange={() => handleInputChange('legal_basis', 'Legal guardian')} disabled={readOnly} />
                    <span className="text-xs font-bold text-slate-600">Legal guardian</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="legal_basis" checked={formData.legal_basis === 'Court order'} onChange={() => handleInputChange('legal_basis', 'Court order')} disabled={readOnly} />
                    <span className="text-xs font-bold text-slate-600">Court order</span>
                  </label>
                </div>
              </div>
              {renderTextInput("reason_cannot_consent", "Reason patient cannot consent", "md:col-span-4")}
              {renderSignature("parent_signature", "Parent / Guardian Signature", "md:col-span-2")}
              {renderSignature("clinician_confirming_signature", "Clinician Confirming Best Interests", "md:col-span-2")}
            </div>
          </div>
        </section>
      </div>

      {/* Footer / Actions */}
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
              {/* NEW SAVE DRAFT BUTTON */}
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
                disabled={submitting}
                className="bg-[#1e40af] text-white px-10 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50 disabled:grayscale disabled:scale-100"
              >
                {submitting ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                {submitting ? "Finalizing..." : "Submit Consent"}
              </button>
            </>
          )}
          {readOnly && (
            <button
              onClick={onPrint}
              className="bg-[#1e40af] text-white px-10 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-2xl transition-all flex items-center gap-3"
            >
              <Printer size={20} /> View Full PDF
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AtrialMyxomaConsentForm;


// import React, { useState, useEffect } from "react";
// import { CheckCircle, Loader2, Printer } from "lucide-react";
// import { consentService } from "../../services/consent.service";
// import SignaturePad from "../SignaturePad";
// import { useAuth } from "../../context/AuthContext";
// import { useNotification } from "../../context/NotificationContext";
// import { BASE_URL } from "../../api/client";
// import apiClient from "../../api/client";
// import { patientService } from "../../services/patient.service";

// interface AtrialMyxomaConsentFormProps {
//   orderId: number;
//   patientName: string;
//   mrn: string;
//   onSuccess: (formData: any) => void;
//   onCancel: () => void;
//   onPrint: () => void;
//   readOnly?: boolean;
//   viewData?: any;
// }

// // Strict schema string definitions for backend validation
// const PATCH_OPTIONS = {
//   A: "A - PERICARDIAL PATCH (planned). A patch cut from your own pericardium.",
//   B: "B - PROSTHETIC PATCH (only if needed). A man-made patch used only if your own tissue is unsuitable.",
//   C: "C - I do NOT agree to a prosthetic patch."
// };

// const PHOTO_OPTIONS = {
//   CLINICAL: "Consents — clinical record",
//   ANONYMISED: "Consents — anonymised teaching / training / audit",
//   DECLINES: "Declines"
// };

// const AtrialMyxomaConsentForm: React.FC<AtrialMyxomaConsentFormProps> = ({
//   orderId,
//   patientName,
//   mrn,
//   onSuccess,
//   onCancel,
//   onPrint,
//   readOnly = false,
//   viewData,
// }) => {
//   const { user } = useAuth();
//   const { notify } = useNotification();

//   const [loading, setLoading] = useState(false);
//   const [submitting, setSubmitting] = useState(false);
//   const [formData, setFormData] = useState<any>(viewData || { patient_name: patientName, mrn });

//   const getSigUrl = (path: string | undefined | null) => {
//     if (!path) return "";
//     if (path.startsWith("data:")) return path;
//     const normalizedBaseUrl = BASE_URL.replace(/\/$/, "");
//     return path.startsWith("/") ? `${normalizedBaseUrl}${path}` : `${normalizedBaseUrl}/${path}`;
//   };

//   useEffect(() => {
//     if (!readOnly && mrn && !viewData) {
//       const fetchPrefillData = async () => {
//         setLoading(true);
//         try {
//           const patient = await patientService.getPatientByMrn(mrn);
//           let wardUnit = "";
//           try {
//             const admissionRes = await apiClient.get("/ipd/admission/list");
//             const activeAdmission = (admissionRes.data?.data?.results || []).find(
//               (a: any) => a.mrn === mrn && a.status === "ACTIVE"
//             );
//             if (activeAdmission) {
//               wardUnit = [activeAdmission.ward_name, activeAdmission.room_number, activeAdmission.bed_number].filter(Boolean).join(" / ");
//             }
//           } catch (e) {
//             console.warn("Could not fetch admission data for pre-fill", e);
//           }

//           if (patient) {
//             setFormData((prev: any) => ({
//               ...prev,
//               patient_full_name: prev.patient_full_name || `${patient.demographics?.first_name || ""} ${patient.demographics?.last_name || ""}`.trim(),
//               dob: prev.dob || patient.demographics?.date_of_birth || "",
//               age_sex: prev.age_sex || `${patient.demographics?.age || ""} / ${patient.demographics?.gender || ""}`,
//               ward_unit: prev.ward_unit || wardUnit,
//             }));
//           }
//         } catch (error) {
//           console.error("Failed to prefill patient data", error);
//         } finally {
//           setLoading(false);
//         }
//       };
//       fetchPrefillData();
//     }
//   }, [mrn, readOnly, viewData]);

//   const handleInputChange = (id: string, value: any) => {
//     setFormData((prev: any) => ({ ...prev, [id]: value }));
//   };

//   const handleSubmit = async () => {
//     if (!formData.surgeon_signature || (!formData.patient_signature && !formData.parent_signature)) {
//       notify("Both clinician and patient/guardian signatures are required", "error");
//       return;
//     }

//     setSubmitting(true);
//     try {
//       await consentService.createConsent({
//         order_id: orderId,
//         template_slug: "Atrial_Myxoma_Excision",
//         workflow_stage: "SIGNED_AND_CHECKED",
//         witness_user_id: user?.id || 0,
//         form_data: formData,
//       });
//       notify("Consent form submitted successfully", "success");
//       onSuccess(formData);
//     } catch (error: any) {
//       notify(error.response?.data?.message || error.message || "Failed to submit consent", "error");
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   if (loading) {
//     return (
//       <div className="bg-white rounded-3xl shadow-2xl p-16 flex items-center justify-center">
//         <Loader2 className="animate-spin text-[#1e40af]" size={48} />
//       </div>
//     );
//   }

//   // UI Helpers
//   const renderTextInput = (id: string, label: string, colSpan = "md:col-span-1", required = false) => (
//     <div className={`space-y-2 ${colSpan}`}>
//       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}{required && " *"}</label>
//       <input
//         type={id.includes("date") || id === "dob" ? "date" : "text"}
//         value={formData[id] || ""}
//         onChange={(e) => handleInputChange(id, e.target.value)}
//         readOnly={readOnly || id === "mrn"}
//         className={`w-full border-2 rounded-xl px-4 py-2 font-bold transition-all outline-none ${readOnly ? "bg-slate-100 border-slate-200 text-slate-800" : "bg-white border-slate-200 focus:border-blue-500 text-slate-800"}`}
//       />
//     </div>
//   );

//   const renderTextarea = (id: string, label: string, colSpan = "md:col-span-4", required = false) => (
//     <div className={`space-y-2 ${colSpan}`}>
//       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}{required && " *"}</label>
//       <textarea
//         rows={2}
//         value={formData[id] || ""}
//         onChange={(e) => handleInputChange(id, e.target.value)}
//         readOnly={readOnly}
//         className={`w-full border-2 rounded-xl px-4 py-2 font-bold transition-all outline-none resize-none ${readOnly ? "bg-slate-100 border-slate-200 text-slate-800" : "bg-white border-slate-200 focus:border-blue-500 text-slate-800"}`}
//       />
//     </div>
//   );

//   const renderCheckbox = (id: string, label: string, colSpan = "md:col-span-4", required = false) => (
//     <label className={`flex items-start gap-3 p-3 bg-white border-2 border-slate-200 rounded-xl cursor-pointer ${colSpan}`}>
//       <input
//         type="checkbox"
//         checked={!!formData[id]}
//         onChange={(e) => handleInputChange(id, e.target.checked)}
//         disabled={readOnly}
//         className="mt-1 w-5 h-5 rounded text-[#1e40af]"
//       />
//       <span className="text-xs font-bold text-slate-700 leading-tight">{label}{required && " *"}</span>
//     </label>
//   );

//   const renderSignature = (id: string, label: string, colSpan = "md:col-span-2") => (
//     <div className={`space-y-2 flex flex-col ${colSpan}`}>
//       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
//       <div className="flex-grow min-h-[150px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
//         {readOnly ? (
//           <div className="h-full w-full flex items-center justify-center p-2">
//             {formData[id] ? (
//               <img src={getSigUrl(formData[id])} alt={label} className="max-h-full max-w-full object-contain" />
//             ) : (
//               <span className="text-slate-300 font-bold uppercase text-xs">No Signature</span>
//             )}
//           </div>
//         ) : (
//           <SignaturePad
//             onEnd={(data) => handleInputChange(id, data)}
//             onClear={() => handleInputChange(id, null)}
//             className="h-full w-full"
//           />
//         )}
//       </div>
//     </div>
//   );

//   return (
//     <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col max-w-5xl mx-auto w-full">
//       {/* Header */}
//       <div className="bg-[#1e40af] text-white p-8 flex justify-between items-center relative overflow-hidden shrink-0">
//         <div className="absolute top-0 right-0 w-64 h-64 bg-[#1e40af]/30 rounded-full -mr-32 -mt-32 blur-3xl"></div>
//         <div className="z-10">
//           <div className="flex items-center gap-4 mb-2">
//             <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-1">
//               <img src="/assets/login-bg.jpeg" alt="GSH Logo" className="w-full h-full object-contain" />
//             </div>
//             <div>
//               <h1 className="text-2xl font-black tracking-tighter">Procedure Consent Form</h1>
//               <p className="text-[#93c5fd] font-bold text-sm uppercase">Atrial Myxoma Excision</p>
//             </div>
//           </div>
//           <p className="text-xs text-[#93c5fd]/80 font-medium">Policy Ref: GSH-T6</p>
//         </div>
//         <button
//           onClick={onPrint}
//           className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/20 transition-all z-10"
//         >
//           <Printer size={14} /> {readOnly ? "Print Record" : "Print Blank Form"}
//         </button>
//       </div>

//       {/* Main Content */}
//       <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar bg-slate-50">
        
//         {/* Intro */}
//         <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 relative overflow-hidden shadow-sm">
//           <div className="absolute top-0 right-0 bg-amber-200/50 px-4 py-1 rounded-bl-xl text-[10px] font-black text-amber-800 uppercase tracking-wider">Patient Rights</div>
//           <p className="text-xs text-amber-900 font-medium leading-relaxed italic mb-4">
//             You have the right to make decisions about your medical care and to refuse any procedure. If you wish to withdraw consent at any time before the procedure begins, you may do so. Signing this form does not remove your legal rights. This form complies with the National Health Act 2014 (Nigeria) and Gracespring Hospitals Consent Policy (GSH-T6).
//           </p>
//           <h4 className="font-black text-amber-900 uppercase text-xs mb-1">About this operation</h4>
//           <p className="text-xs text-amber-900 font-medium leading-relaxed italic">
//             Surgical removal of a myxoma — a non-cancerous (benign) tumour growing inside an upper chamber of the heart (an atrium) — using open-heart surgery with the heart–lung (cardiopulmonary bypass) machine. A myxoma can shed fragments that travel in the blood (embolism) and can obstruct a heart valve; removal is the recommended treatment.
//           </p>
//         </div>

//         {/* Site of Tumour */}
//         <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
//           <div className="bg-slate-700 text-white px-4 py-1 inline-block rounded-t-xl text-[10px] font-black uppercase tracking-widest -mt-10 ml-4">SITE OF TUMOUR</div>
//           <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-4">
//             <div className="md:col-span-4 flex flex-wrap gap-4 items-center">
//               <label className="flex items-center gap-2 cursor-pointer">
//                 <input type="radio" name="tumour_site" checked={formData.tumour_site === 'LEFT atrium'} onChange={() => handleInputChange('tumour_site', 'LEFT atrium')} disabled={readOnly} className="w-5 h-5 text-[#1e40af]" />
//                 <span className="text-xs font-bold text-slate-700">LEFT atrium</span>
//               </label>
//               <label className="flex items-center gap-2 cursor-pointer">
//                 <input type="radio" name="tumour_site" checked={formData.tumour_site === 'RIGHT atrium'} onChange={() => handleInputChange('tumour_site', 'RIGHT atrium')} disabled={readOnly} className="w-5 h-5 text-[#1e40af]" />
//                 <span className="text-xs font-bold text-slate-700">RIGHT atrium</span>
//               </label>
//               <label className="flex items-center gap-2 cursor-pointer">
//                 <input type="radio" name="tumour_site" checked={formData.tumour_site === 'Other'} onChange={() => handleInputChange('tumour_site', 'Other')} disabled={readOnly} className="w-5 h-5 text-[#1e40af]" />
//                 <span className="text-xs font-bold text-slate-700">Other</span>
//               </label>
//               {formData.tumour_site === 'Other' && (
//                 <input type="text" value={formData.tumour_site_other || ""} onChange={(e) => handleInputChange('tumour_site_other', e.target.value)} disabled={readOnly} className="border-b-2 border-slate-300 outline-none bg-transparent px-2 text-sm font-bold text-slate-800" placeholder="Specify..." />
//               )}
//             </div>
//             {renderTextInput("attachment_site", "Attachment site (e.g. atrial septum, valve, wall)", "md:col-span-2")}
//             {renderTextInput("approx_size", "Approx. size / mobility / obstruction noted", "md:col-span-2")}
//           </div>
//         </div>

//         {/* PART A */}
//         <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#1e40af] border-t-8">
//           <div className="flex items-center gap-2 mb-4">
//             <span className="w-6 h-6 rounded-full bg-[#1e40af] text-white flex items-center justify-center text-xs font-black">A</span>
//             <h4 className="font-black text-slate-800 uppercase tracking-widest text-[11px]">Patient Identification</h4>
//           </div>
//           <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
//             {renderTextInput("patient_full_name", "Patient Full Name", "md:col-span-2", true)}
//             {renderTextInput("dob", "Date of Birth", "md:col-span-1", true)}
//             {renderTextInput("mrn", "MRN", "md:col-span-1", true)}
//             {renderTextInput("age_sex", "Age / Sex", "md:col-span-1")}
//             {renderTextInput("responsible_surgeon", "Consultant / Responsible Surgeon", "md:col-span-2", true)}
//             {renderTextInput("ward_unit", "Ward / Unit", "md:col-span-1", true)}
//             {renderTextInput("anaesthetist", "Anaesthetist", "md:col-span-2")}
//             {renderTextInput("planned_surgery_date", "Planned Date of Surgery", "md:col-span-2", true)}
//             {renderTextarea("primary_diagnosis", "Primary Diagnosis / Indication (e.g. left atrial myxoma with embolic events)", "md:col-span-4")}
//           </div>
//         </div>

//         {/* PART B & C */}
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
//           <div className="bg-white rounded-3xl p-6 shadow-sm border-t-8 border-slate-700">
//             <div className="flex items-center gap-2 mb-4">
//               <span className="w-6 h-6 rounded-full bg-slate-700 text-white flex items-center justify-center text-xs font-black">B</span>
//               <h4 className="font-black text-slate-800 uppercase tracking-widest text-[11px]">Description of Procedure</h4>
//             </div>
//             <p className="text-xs text-slate-600 mb-3"><strong className="text-slate-800">What it involves:</strong> The myxoma is removed through open-heart surgery. A left atrial tumour is usually reached through the right atrium and the atrial septum. The tumour is removed whole with its stalk/base to reduce recurrence.</p>
//             <p className="text-xs text-slate-600 mb-6"><strong className="text-slate-800">How it is performed:</strong> General anaesthetic; median sternotomy. The heart is stopped and blood circulated by the cardiopulmonary bypass machine. The atrium is opened, tumour excised, nearby heart valve inspected, and any septal defect closed with a patch.</p>
//             {renderTextarea("surgeons_notes", "Surgeon's notes on this patient's tumour", "md:col-span-2")}
//           </div>
          
//           <div className="bg-white rounded-3xl p-6 shadow-sm border-t-8 border-[#1e40af]">
//             <div className="flex items-center gap-2 mb-4">
//               <span className="w-6 h-6 rounded-full bg-[#1e40af] text-white flex items-center justify-center text-xs font-black">C</span>
//               <h4 className="font-black text-slate-800 uppercase tracking-widest text-[11px]">Intended Benefits</h4>
//             </div>
//             <p className="text-xs text-slate-600 mb-6">Removing the myxoma eliminates the source of fragments that can travel to the brain (stroke), limbs or organs, relieves or prevents obstruction of the nearby heart valve, and removes the risk of sudden death from the tumour. It establishes the diagnosis on laboratory examination.</p>
//             {renderTextarea("specific_goals", "Specific goals / expected outcome discussed", "md:col-span-2")}
//           </div>
//         </div>

//         {/* PART D - Risks */}
//         <div className="bg-white rounded-3xl p-6 shadow-sm border-t-8 border-[#be123c]">
//           <div className="flex items-center gap-2 mb-4">
//             <span className="w-6 h-6 rounded-full bg-[#be123c] text-white flex items-center justify-center text-xs font-black">D</span>
//             <h4 className="font-black text-slate-800 uppercase tracking-widest text-[11px]">Risks & Complications</h4>
//           </div>
//           <p className="text-xs text-slate-500 italic mb-4">Montgomery standard: the patient (or parent/guardian) must be told of any risk a reasonable person in their position would consider significant, and any risk significant to this particular patient.</p>
          
//           <div className="overflow-x-auto mb-6 border-4 border-slate-900 rounded-3xl shadow-sm">
//             <table className="w-full text-left border-collapse bg-white">
//               <thead className="bg-slate-900 text-white">
//                 <tr>
//                   <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest w-1/4">Frequency</th>
//                   <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest w-1/3">Complication</th>
//                   <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest">Management</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-200">
//                 <tr><td className="px-4 py-3 text-xs font-black text-emerald-600">COMMON</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Irregular heartbeat; chest/wound discomfort; pericardial fluid.</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Usually managed with medicine / routine care.</td></tr>
//                 <tr className="bg-slate-50"><td className="px-4 py-3 text-xs font-black text-emerald-600">COMMON</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Temporary confusion or poor concentration after bypass.</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Usually settles; occasionally longer-lasting.</td></tr>
//                 <tr><td className="px-4 py-3 text-xs font-black text-amber-600">UNCOMMON</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Bleeding needing transfusion or return to theatre.</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Managed by transfusion or re-operation.</td></tr>
//                 <tr className="bg-slate-50"><td className="px-4 py-3 text-xs font-black text-amber-600">UNCOMMON</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Heart block needing temporary pacing or permanent pacemaker.</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Pacing wires placed at surgery; pacemaker if persistent.</td></tr>
//                 <tr><td className="px-4 py-3 text-xs font-black text-rose-600">RARE</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Stroke or embolism — fragments of tumour or clot to the brain, limbs, kidneys or gut.</td><td className="px-4 py-3 text-xs font-medium text-slate-600">May be permanent; specialist care needed.</td></tr>
//                 <tr className="bg-slate-50"><td className="px-4 py-3 text-xs font-black text-rose-600">RARE</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Injury to a nearby heart valve needing repair or replacement.</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Repaired or replaced at surgery.</td></tr>
//                 <tr><td className="px-4 py-3 text-xs font-black text-red-700">VERY RARE</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Life-threatening complication or death.</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Mitigated by specialist care.</td></tr>
//               </tbody>
//             </table>
//           </div>

//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//             {renderTextarea("figures_discussed", "Figures discussed with this patient (e.g. overall risk)", "md:col-span-1")}
//             {renderTextarea("specific_risks", "Risks specific to THIS patient (comorbidities, etc.)", "md:col-span-1")}
//           </div>
//         </div>

//         {/* PART E & F */}
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
//           <div className="bg-white rounded-3xl p-6 shadow-sm border-t-8 border-[#ea580c]">
//             <div className="flex items-center gap-2 mb-4">
//               <span className="w-6 h-6 rounded-full bg-[#ea580c] text-white flex items-center justify-center text-xs font-black">E</span>
//               <h4 className="font-black text-slate-800 uppercase tracking-widest text-[11px]">Alternatives</h4>
//             </div>
//             <ul className="text-xs text-slate-600 list-disc pl-4 mb-4 space-y-1">
//               <li><strong>No surgery:</strong> Risks of stroke, heart failure continue.</li>
//               <li><strong>Medical management:</strong> Treats symptoms only.</li>
//               <li><strong>Delay:</strong> Increases risk of embolism/obstruction.</li>
//             </ul>
//             {renderTextarea("alternatives_discussed", "Alternatives discussed with this patient", "md:col-span-2")}
//           </div>

//           <div className="bg-white rounded-3xl p-6 shadow-sm border-t-8 border-slate-700">
//             <div className="flex items-center gap-2 mb-4">
//               <span className="w-6 h-6 rounded-full bg-slate-700 text-white flex items-center justify-center text-xs font-black">F</span>
//               <h4 className="font-black text-slate-800 uppercase tracking-widest text-[11px]">Patch to close the heart wall</h4>
//             </div>
//             <p className="text-xs text-slate-600 mb-4">Removing the tumour may leave a hole. The surgeon plans to close it with a patch of your own tissue.</p>
//             <div className="space-y-3">
//               <label className="flex items-start gap-3 cursor-pointer">
//                 <input type="radio" name="patch_consent" checked={formData.patch_consent === PATCH_OPTIONS.A} onChange={() => handleInputChange('patch_consent', PATCH_OPTIONS.A)} disabled={readOnly} className="mt-1 w-5 h-5 text-[#1e40af]" />
//                 <span className="text-xs font-bold text-slate-700">A - PERICARDIAL PATCH (planned). A patch cut from your own pericardium.</span>
//               </label>
//               <label className="flex items-start gap-3 cursor-pointer">
//                 <input type="radio" name="patch_consent" checked={formData.patch_consent === PATCH_OPTIONS.B} onChange={() => handleInputChange('patch_consent', PATCH_OPTIONS.B)} disabled={readOnly} className="mt-1 w-5 h-5 text-[#1e40af]" />
//                 <span className="text-xs font-bold text-slate-700">B - PROSTHETIC PATCH (only if needed). Used if own tissue is unsuitable.</span>
//               </label>
//               <label className="flex items-start gap-3 cursor-pointer">
//                 <input type="radio" name="patch_consent" checked={formData.patch_consent === PATCH_OPTIONS.C} onChange={() => handleInputChange('patch_consent', PATCH_OPTIONS.C)} disabled={readOnly} className="mt-1 w-5 h-5 text-[#1e40af]" />
//                 <span className="text-xs font-bold text-slate-700">C - I do NOT agree to a prosthetic patch.</span>
//               </label>
//             </div>
//           </div>
//         </div>

//         {/* PART G & H */}
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
//           <div className="bg-white rounded-3xl p-6 shadow-sm border-t-8 border-slate-700">
//             <div className="flex items-center gap-2 mb-4">
//               <span className="w-6 h-6 rounded-full bg-slate-700 text-white flex items-center justify-center text-xs font-black">G</span>
//               <h4 className="font-black text-slate-800 uppercase tracking-widest text-[11px]">Heart Valve Injury/Repair</h4>
//             </div>
//             <p className="text-xs text-slate-600 mb-4">The tumour sits close to a heart valve. Both valves are inspected. If damaged, repair or replacement may be needed.</p>
//             <div className="space-y-3">
//               {renderCheckbox("valve_repair_consent", "D - I consent to REPAIR of the heart valve if damage is found.", "col-span-1")}
//               {renderCheckbox("valve_replacement_consent", "E - I consent to valve REPLACEMENT if repair is not possible.", "col-span-1")}
              
//               {formData.valve_replacement_consent && (
//                 <div className="pl-8 flex flex-col gap-2">
//                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Intended Valve Type:</span>
//                   <div className="flex gap-4">
//                     <label className="flex items-center gap-2 cursor-pointer">
//                       <input type="radio" name="preferred_valve_type" checked={formData.preferred_valve_type === 'Mechanical'} onChange={() => handleInputChange('preferred_valve_type', 'Mechanical')} disabled={readOnly} />
//                       <span className="text-xs font-bold text-slate-600">Mechanical</span>
//                     </label>
//                     <label className="flex items-center gap-2 cursor-pointer">
//                       <input type="radio" name="preferred_valve_type" checked={formData.preferred_valve_type === 'Tissue (biological)'} onChange={() => handleInputChange('preferred_valve_type', 'Tissue (biological)')} disabled={readOnly} />
//                       <span className="text-xs font-bold text-slate-600">Tissue</span>
//                     </label>
//                     <label className="flex items-center gap-2 cursor-pointer">
//                       <input type="radio" name="preferred_valve_type" checked={formData.preferred_valve_type === 'Leave to surgeon'} onChange={() => handleInputChange('preferred_valve_type', 'Leave to surgeon')} disabled={readOnly} />
//                       <span className="text-xs font-bold text-slate-600">Leave to surgeon</span>
//                     </label>
//                   </div>
//                 </div>
//               )}
//               {renderCheckbox("no_valve_replacement_consent", "F - I do NOT consent to valve replacement.", "col-span-1")}
//             </div>
//           </div>

//           <div className="bg-white rounded-3xl p-6 shadow-sm border-t-8 border-slate-700">
//             <div className="flex items-center gap-2 mb-4">
//               <span className="w-6 h-6 rounded-full bg-slate-700 text-white flex items-center justify-center text-xs font-black">H</span>
//               <h4 className="font-black text-slate-800 uppercase tracking-widest text-[11px]">Other Necessary Procedures</h4>
//             </div>
//             <p className="text-xs text-slate-600 mb-4">The surgeon will do these only if needed to complete the operation safely or to treat a danger to life.</p>
//             <div className="space-y-3">
//               {renderCheckbox("cabg_consent", "G - Coronary artery bypass graft (CABG) if found to need it.", "col-span-1")}
//               {renderCheckbox("pacing_wires_consent", "H - Temporary pacing wires / permanent pacemaker.", "col-span-1")}
//               {renderCheckbox("return_to_theatre_consent", "I - Return to theatre to treat bleeding or leak.", "col-span-1")}
//               {renderCheckbox("emergency_bypass_consent", "J - Femoral cannulation or emergency bypass.", "col-span-1")}
//             </div>
//           </div>
//         </div>

//         {/* PART J */}
//         <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
//           <div className="flex items-center gap-2 mb-4">
//             <span className="w-6 h-6 rounded-full bg-slate-700 text-white flex items-center justify-center text-xs font-black">J</span>
//             <h4 className="font-black text-slate-800 uppercase tracking-widest text-[11px]">Additional Procedures, Blood & Tissue</h4>
//           </div>
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
//             {renderTextarea("additional_procedures_consented", "Additional procedures consented to if needed", "md:col-span-1")}
//             {renderTextarea("procedures_declined", "Procedures NOT to be carried out under any circumstances", "md:col-span-1")}
//           </div>
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//             <div className="space-y-3">
//               <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Blood Transfusion Consent:</span>
//               <div className="flex gap-4">
//                 <label className="flex items-center gap-2 cursor-pointer">
//                   <input type="radio" name="blood_transfusion" checked={formData.blood_transfusion === 'Consents'} onChange={() => handleInputChange('blood_transfusion', 'Consents')} disabled={readOnly} />
//                   <span className="text-xs font-bold text-slate-600">Consents</span>
//                 </label>
//                 <label className="flex items-center gap-2 cursor-pointer">
//                   <input type="radio" name="blood_transfusion" checked={formData.blood_transfusion === 'Declines'} onChange={() => handleInputChange('blood_transfusion', 'Declines')} disabled={readOnly} />
//                   <span className="text-xs font-bold text-slate-600">Declines</span>
//                 </label>
//                 <label className="flex items-center gap-2 cursor-pointer">
//                   <input type="radio" name="blood_transfusion" checked={formData.blood_transfusion === 'Discuss'} onChange={() => handleInputChange('blood_transfusion', 'Discuss')} disabled={readOnly} />
//                   <span className="text-xs font-bold text-slate-600">Discuss</span>
//                 </label>
//               </div>
//               {renderCheckbox("tissue_specimens_consent", "Consent to tissue/specimens retained for audit/teaching.", "md:col-span-2")}
//               {renderTextInput("implants_brand_consent", "Implants (Patch/Valve Brand) - Consents", "md:col-span-2")}
//             </div>
//             <div className="space-y-3">
//               <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Clinical Photography & Video:</span>
//               <div className="flex flex-col gap-2">
//                 <label className="flex items-center gap-2 cursor-pointer">
//                   <input type="radio" name="clinical_photography_consent" checked={formData.clinical_photography_consent === PHOTO_OPTIONS.CLINICAL} onChange={() => handleInputChange('clinical_photography_consent', PHOTO_OPTIONS.CLINICAL)} disabled={readOnly} />
//                   <span className="text-xs font-bold text-slate-600">{PHOTO_OPTIONS.CLINICAL}</span>
//                 </label>
//                 <label className="flex items-center gap-2 cursor-pointer">
//                   <input type="radio" name="clinical_photography_consent" checked={formData.clinical_photography_consent === PHOTO_OPTIONS.ANONYMISED} onChange={() => handleInputChange('clinical_photography_consent', PHOTO_OPTIONS.ANONYMISED)} disabled={readOnly} />
//                   <span className="text-xs font-bold text-slate-600">{PHOTO_OPTIONS.ANONYMISED}</span>
//                 </label>
//                 <label className="flex items-center gap-2 cursor-pointer">
//                   <input type="radio" name="clinical_photography_consent" checked={formData.clinical_photography_consent === PHOTO_OPTIONS.DECLINES} onChange={() => handleInputChange('clinical_photography_consent', PHOTO_OPTIONS.DECLINES)} disabled={readOnly} />
//                   <span className="text-xs font-bold text-slate-600">{PHOTO_OPTIONS.DECLINES}</span>
//                 </label>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* SIGNATURE BLOCK SECTION (Dark Box) */}
//         <section className="space-y-8 bg-slate-900 p-10 rounded-[3rem] shadow-2xl">
//           <h3 className="text-center text-white font-black uppercase tracking-[0.3em] text-lg mb-6">Final Declarations & Signatures</h3>
          
//           {/* PART K */}
//           <div className="bg-white rounded-3xl p-6 shadow-xl border-t-8 border-emerald-500 relative">
//             <h4 className="font-black text-slate-800 uppercase tracking-wider text-[10px] mb-4">PART K — Language & Interpreter</h4>
//             <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
//               {renderTextInput("discussion_language", "Language of Discussion", "md:col-span-2")}
//               <div className="md:col-span-2 space-y-2">
//                 <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Interpreter Used?</span>
//                 <div className="flex gap-4">
//                   <label className="flex items-center gap-2 cursor-pointer">
//                     <input type="radio" name="interpreter_used" checked={formData.interpreter_used === 'Yes'} onChange={() => handleInputChange('interpreter_used', 'Yes')} disabled={readOnly} />
//                     <span className="text-xs font-bold text-slate-600">Yes</span>
//                   </label>
//                   <label className="flex items-center gap-2 cursor-pointer">
//                     <input type="radio" name="interpreter_used" checked={formData.interpreter_used === 'No'} onChange={() => handleInputChange('interpreter_used', 'No')} disabled={readOnly} />
//                     <span className="text-xs font-bold text-slate-600">No</span>
//                   </label>
//                 </div>
//               </div>
//               {formData.interpreter_used === 'Yes' && (
//                 <>
//                   {renderTextInput("interpreter_name", "Interpreter Full Name", "md:col-span-2")}
//                   {renderSignature("interpreter_signature", "Interpreter Signature", "md:col-span-2")}
//                 </>
//               )}
//             </div>
//           </div>

//           {/* PART L */}
//           <div className="bg-purple-50 rounded-3xl p-8 shadow-xl border-4 border-purple-200 relative">
//             <h4 className="font-black text-purple-900 uppercase tracking-wider text-[10px] mb-4">PART L — DECLARATION OF CONSENTING CLINICIAN</h4>
//             <p className="text-xs text-slate-600 font-bold mb-6 italic border-l-4 border-slate-300 pl-4">
//               I confirm I have explained the procedure and its purpose, the intended benefits, the material risks... and I am satisfied the patient (or parent/guardian) has capacity and consents voluntarily.
//             </p>
//             <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
//               {renderTextInput("surgeon_name", "Surgeon Full Name", "md:col-span-2")}
//               {renderTextInput("surgeon_designation", "Designation", "md:col-span-2")}
//               {renderSignature("surgeon_signature", "Surgeon Signature", "md:col-span-2")}
//               {renderTextInput("surgeon_signature_date", "Date", "md:col-span-2")}
//             </div>
//           </div>

//           {/* PART M */}
//           <div className="bg-white rounded-3xl p-6 shadow-xl border-t-8 border-slate-900 relative">
//             <h4 className="font-black text-slate-800 uppercase tracking-wider text-[10px] mb-4">PART M — PATIENT CONSENT DECLARATION</h4>
//             <div className="space-y-3 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-200">
//               {renderCheckbox("chk_understood", "I have read, or had read to me, and I understand the information in Parts A to L.", "col-span-1", true)}
//               {renderCheckbox("chk_risks", "The benefits, risks and alternatives have been explained and I have had the opportunity to ask questions.", "col-span-1", true)}
//               {renderCheckbox("chk_accept", "I understand and accept the risks described, including those relevant to my individual circumstances.", "col-span-1", true)}
//               {renderCheckbox("chk_site", "I confirm the SITE of the tumour ticked at the top of this form is the site I have been told about.", "col-span-1", true)}
//               {renderCheckbox("chk_modify", "I understand the team will use the planned approach but may modify it if clinically necessary.", "col-span-1", true)}
//               {renderCheckbox("chk_withdraw", "I understand no guarantee of a particular result has been given, and I may withdraw consent at any time.", "col-span-1", true)}
//               {renderCheckbox("chk_additional", "I consent to additional procedures judged immediately necessary.", "col-span-1", true)}
//             </div>
//             <p className="font-black text-[#1e40af] text-sm uppercase text-center mb-6">I GIVE MY INFORMED CONSENT to proceed with excision of atrial myxoma.</p>
//             <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
//               {renderTextInput("patient_signature_name", "Patient Full Name", "md:col-span-2")}
//               {renderTextInput("patient_signature_date", "Date", "md:col-span-2")}
//               {renderSignature("patient_signature", "Patient Signature", "md:col-span-2")}
//               {renderSignature("witness_signature", "Witness Signature (If patient unable to sign)", "md:col-span-2")}
//             </div>
//           </div>

//           {/* PART N */}
//           <div className="bg-white rounded-3xl p-6 shadow-xl border-t-8 border-purple-600 relative">
//             <h4 className="font-black text-slate-800 uppercase tracking-wider text-[10px] mb-4">PART N — CONSENT BY PARENT / GUARDIAN (If lacking capacity)</h4>
//             <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
//               {renderTextInput("parent_guardian_name", "Name of Parent / Guardian", "md:col-span-2")}
//               {renderTextInput("relationship_to_patient", "Relationship to Patient", "md:col-span-2")}
//               <div className="md:col-span-4 space-y-2">
//                 <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Legal Basis</span>
//                 <div className="flex gap-4">
//                   <label className="flex items-center gap-2 cursor-pointer">
//                     <input type="radio" name="legal_basis" checked={formData.legal_basis === 'Parental responsibility'} onChange={() => handleInputChange('legal_basis', 'Parental responsibility')} disabled={readOnly} />
//                     <span className="text-xs font-bold text-slate-600">Parental responsibility</span>
//                   </label>
//                   <label className="flex items-center gap-2 cursor-pointer">
//                     <input type="radio" name="legal_basis" checked={formData.legal_basis === 'Legal guardian'} onChange={() => handleInputChange('legal_basis', 'Legal guardian')} disabled={readOnly} />
//                     <span className="text-xs font-bold text-slate-600">Legal guardian</span>
//                   </label>
//                   <label className="flex items-center gap-2 cursor-pointer">
//                     <input type="radio" name="legal_basis" checked={formData.legal_basis === 'Court order'} onChange={() => handleInputChange('legal_basis', 'Court order')} disabled={readOnly} />
//                     <span className="text-xs font-bold text-slate-600">Court order</span>
//                   </label>
//                 </div>
//               </div>
//               {renderTextInput("reason_cannot_consent", "Reason patient cannot consent", "md:col-span-4")}
//               {renderSignature("parent_signature", "Parent / Guardian Signature", "md:col-span-2")}
//               {renderSignature("clinician_confirming_signature", "Clinician Confirming Best Interests", "md:col-span-2")}
//             </div>
//           </div>
//         </section>
//       </div>

//       {/* Footer / Actions */}
//       <div className="bg-slate-100 border-t-4 border-slate-200 p-6 flex justify-between items-center shrink-0">
//         <button
//           onClick={onCancel}
//           disabled={submitting}
//           className="px-8 py-3 rounded-2xl font-black text-slate-500 hover:bg-slate-200 transition-all uppercase tracking-widest text-sm"
//         >
//           {readOnly ? "Close" : "Discard Form"}
//         </button>
//         <div className="flex gap-4">
//           {!readOnly && (
//             <button
//               onClick={handleSubmit}
//               disabled={submitting}
//               className="bg-[#1e40af] text-white px-10 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50 disabled:grayscale disabled:scale-100"
//             >
//               {submitting ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
//               {submitting ? "Finalizing..." : "Submit Consent"}
//             </button>
//           )}
//           {readOnly && (
//             <button
//               onClick={onPrint}
//               className="bg-[#1e40af] text-white px-10 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-2xl transition-all flex items-center gap-3"
//             >
//               <Printer size={20} /> View Full PDF
//             </button>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default AtrialMyxomaConsentForm;
