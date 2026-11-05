import React, { useState, useEffect, useRef } from "react";
import { CheckCircle, Loader2, Printer, Save, AlertCircle } from "lucide-react";
import { consentService } from "../../services/consent.service";
import SignaturePad from "../SignaturePad";
import { useAuth } from "../../context/AuthContext";
import { useNotification } from "../../context/NotificationContext";
import { BASE_URL } from "../../api/client";
import apiClient from "../../api/client";
import { patientService } from "../../services/patient.service";
import { formDraftService } from "../../services/session-restore.service";

interface AsdPdaRepairConsentFormProps {
  orderId: number;
  patientName: string;
  mrn: string;
  initialData?: any;
  draftId?: number | null;
  onSuccess: (formData?: any) => void;
  onCancel: () => void;
  onPrint?: () => void;
  readOnly?: boolean;
  viewData?: any;
}

const AsdPdaRepairConsentForm: React.FC<AsdPdaRepairConsentFormProps> = ({
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
  
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getSigUrl = (path: string | undefined | null) => {
    if (!path) return "";
    if (path.startsWith("data:")) return path;
    const normalizedBaseUrl = BASE_URL.replace(/\/api(\/v\d+)?\/?$/, "").replace(/\/$/, "");
    return path.startsWith("/") ? `${normalizedBaseUrl}${path}` : `${normalizedBaseUrl}/${path}`;
  };

  const [formData, setFormData] = useState<any>(viewData || initialData || { patient_name: patientName, mrn });

  useEffect(() => {
    if (viewData || initialData) {
      setFormData((prev: any) => ({ ...prev, ...(viewData || initialData) }));
    }
  }, [viewData, initialData]);

  // 1. Initial Data Fetch & Local Draft Restoration
  useEffect(() => {
    if (!readOnly && mrn && !viewData && !initialData) {
      
      const localDraftId = `consent_asd_pda_${orderId}`;
      const savedDraft = user?.id ? formDraftService.loadDraft<any>(user.id, localDraftId) : null;
      
      if (savedDraft) {
        setFormData(savedDraft);
        notify("Restored unsaved changes from your previous session", "success");
        return; 
      }

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
              ward: prev.ward || wardUnit,
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
    
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    
    autoSaveTimerRef.current = setTimeout(() => {
      const localDraftId = `consent_asd_pda_${orderId}`;
      formDraftService.saveDraft(user.id!, localDraftId, formData);
    }, 1500);
    
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
  }, [formData, orderId, user?.id, readOnly]);

  const handleInputChange = (id: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [id]: value }));
  };

  // Helper to format payload types to satisfy strict backend schema checks
  const preparePayload = () => {
    const payload = { ...formData };
    
    // Enforce boolean for legal_basis but preserve the string text chosen
    if (typeof payload.legal_basis === 'string') {
      payload.legal_basis_type = payload.legal_basis;
    }
    payload.legal_basis = true; 

    // Convert booleans back to exact schema expected strings in case they were cached
    if (payload.guardianship_sighted === true) payload.guardianship_sighted = 'Yes (describe)';
    if (payload.guardianship_sighted === false) payload.guardianship_sighted = 'Pending (escalate before surgery)';
    
    if (payload.consent_unchanged === true) payload.consent_unchanged = 'Yes';
    if (payload.consent_unchanged === false) payload.consent_unchanged = 'Changes made (record below)';
    
    if (payload.weight_rechecked === true) payload.weight_rechecked = 'Yes';
    if (payload.weight_rechecked === false) payload.weight_rechecked = 'N/A';
    
    if (payload.interpreter_used === true) payload.interpreter_used = 'Yes';
    if (payload.interpreter_used === false) payload.interpreter_used = 'No';

    return payload;
  };

  // 3. Save as Backend Draft Handler
  const handleSaveDraft = async () => {
    setSubmitting(true);
    try {
      const cleanedFormData = preparePayload();
      await consentService.createConsent({
        order_id: orderId,
        template_slug: "ASD_Repair_+_PDA_Closure",
        witness_user_id: user?.id || 1, 
        form_data: cleanedFormData,
        is_draft: true,
        consent_id: draftId,
      });
      notify("Draft saved successfully to the system", "success");
      
      if (user?.id) formDraftService.clearDraft(user.id, `consent_asd_pda_${orderId}`);
      
      onCancel(); 
    } catch (error: any) {
      notify(error.response?.data?.message || error.message || "Failed to save draft", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Finalizing and Submitting Consent Handler
  const handleSubmit = async () => {
    if (!formData.clinician_signature || (!formData.patient_signature && !formData.parent_signature)) {
      notify("Both clinician and patient/guardian signatures are required to finalize", "error");
      return;
    }

    setSubmitting(true);
    try {
      const cleanedFormData = preparePayload();
      const payload = {
        template_slug: "ASD_Repair_+_PDA_Closure",
        order_id: orderId,
        witness_user_id: user?.id || 1, 
        form_data: cleanedFormData,
        consent_id: draftId,
      };
      
      await consentService.createConsent(payload);
      notify("Consent form submitted successfully", "success");
      
      if (user?.id) formDraftService.clearDraft(user.id, `consent_asd_pda_${orderId}`);

      onSuccess(cleanedFormData);
    } catch (error: any) {
      notify(error.response?.data?.message || error.message || "Failed to submit consent", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl shadow-xl mx-auto max-w-4xl">
        <Loader2 className="animate-spin text-[#1e1b4b] mb-4" size={48} />
        <p className="text-slate-500 font-bold uppercase tracking-widest animate-pulse">Loading Procedure Template...</p>
      </div>
    );
  }

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

  const renderTextInput = (id: string, label: string, colSpan = "md:col-span-1", required = false) => (
    <div className={`space-y-2 ${colSpan}`}>
      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}{required && " *"}</label>
      <input
        type={id.includes("date") || id === "dob" ? "date" : "text"}
        value={formData[id] || ""}
        onChange={(e) => handleInputChange(id, e.target.value)}
        readOnly={readOnly || id === "mrn"}
        className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e1b4b]"}`}
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
        className={`w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e1b4b]"}`}
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
        className="mt-1 w-5 h-5 rounded text-[#1e1b4b]"
      />
      <span className="text-xs font-bold text-slate-700 leading-tight">{label}{required && " *"}</span>
    </label>
  );

  return (
    <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col max-w-6xl mx-auto w-[90vw]">
      {/* Header - Aligned to General Consent Form UI */}
      <div className="bg-[#1e1b4b] text-white p-10 flex justify-between items-center relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="z-10">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-1">
              <img src="/assets/login-bg.jpeg" alt="Logo" className="w-10 h-10 object-contain" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter">Consent: ASD Repair + PDA Closure</h1>
              <p className="text-brand-primary text-[#a5b4fc] font-bold text-sm uppercase tracking-widest">Repair of Atrial Septal Defect(s) & Closure of Patent Ductus Arteriosus</p>
            </div>
          </div>
          <p className="text-xs text-white/60 font-medium">Form Ref: GSH-CONSENT-CTS-025 • Policy Ref: GSH-T6</p>
        </div>
        <div className="text-right z-10 flex flex-col items-end gap-3">
             <div className="hidden md:block text-right">
                <p className="text-[10px] text-[#a5b4fc] font-bold leading-tight uppercase tracking-wider">Medbookie</p>
                <p className="text-[10px] text-white/70">+234 705 648 2776 • admin@Medbookiehospitals.com</p>
             </div>
             {onPrint && (
               <button 
                 onClick={onPrint}
                 className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/20 transition-all"
               >
                 <Printer size={14} /> {readOnly ? "Print Record" : "Print Blank Form"}
               </button>
             )}
          </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar bg-white">
        
        {/* Intro */}
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-amber-200/50 px-4 py-1 rounded-bl-xl text-[10px] font-black text-amber-800 uppercase tracking-wider">Patient Rights</div>
          <p className="text-sm text-amber-900 font-medium leading-relaxed italic mb-4">
            "You (or your child's parent/guardian) have the right to make decisions about medical care and to refuse any procedure. You may withdraw consent at any time before the procedure begins. Signing this form does not remove your legal rights. This form complies with the National Health Act 2014 (Nigeria) and Medbookie Consent Policy (GSH-T6)."
          </p>
          <h4 className="font-black text-amber-900 uppercase text-xs mb-1">About this operation</h4>
          <p className="text-xs text-amber-900 font-medium leading-relaxed italic">
            open-heart surgery, using the heart-lung (cardiopulmonary bypass) machine, to close one or more holes between the two upper chambers of the heart (atrial septal defects, ASDs) and to close a persistent blood vessel between the two great arteries (patent ductus arteriosus, PDA). Both are corrected during the same operation.
          </p>
        </div>

        {/* Paediatric / Small-Infant Note */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 bg-blue-200/50 px-4 py-1 rounded-bl-xl text-[10px] font-black text-blue-800 uppercase tracking-wider">PAEDIATRIC / SMALL-INFANT NOTE</div>
          <p className="text-sm text-blue-900 font-medium leading-relaxed italic mb-4 mt-2">
            complete if the patient is a child. For infants and small children, consent is given by a parent or legal guardian (Part L). Weight-based prescribing, fluid and blood volumes are calculated and double-checked for the child's weight on the GSH Paediatric Weight-Based Calculation & Safety Worksheet, which is completed and counter-signed by the cardiac anaesthetist / intensivist before surgery.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {renderCheckbox("adult_patient", "Adult patient", "md:col-span-1")}
            {renderCheckbox("paediatric_patient", "Paediatric patient (weight: __ kg)", "md:col-span-1")}
            {renderCheckbox("neonate_infant", "Neonate / small infant (<10 kg | age: __)", "md:col-span-1")}
            {renderCheckbox("readiness_checklist", "Readiness checklist completed", "md:col-span-1")}
          </div>
        </div>

        {/* PART A */}
        <section>
          <div className="bg-[#1e1b4b] text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part A — Patient Identification</div>
          <div className="border-4 border-slate-900 rounded-3xl p-8 grid grid-cols-1 md:grid-cols-4 gap-8 shadow-inner bg-slate-50 relative">
            {renderTextInput("patient_full_name", "PATIENT FULL NAME*", "md:col-span-2", true)}
            {renderTextInput("dob", "DATE OF BIRTH*", "md:col-span-1", true)}
            {renderTextInput("mrn", "MRN (MEDICAL RECORD NUMBER)*", "md:col-span-1", true)}
            {renderTextInput("age_sex", "AGE / SEX", "md:col-span-1")}
            {renderTextInput("weight", "WEIGHT (KG)*", "md:col-span-1", true)}
            {renderTextInput("ward", "WARD / UNIT*", "md:col-span-1", true)}
            {renderTextInput("consultant", "CONSULTANT / RESPONSIBLE SURGEON*", "md:col-span-2", true)}
            {renderTextInput("anaesthetist", "ANAESTHETIST", "md:col-span-2")}
            {renderTextInput("planned_date", "PLANNED DATE OF SURGERY*", "md:col-span-2", true)}
            <div className="space-y-2 md:col-span-2">
               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">PAEDIATRIC WORKSHEET COMPLETED? (Y/N/NA)</label>
               <div className="flex gap-4">
                 <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="paediatric_worksheet_completed" checked={formData.paediatric_worksheet_completed === 'Y'} onChange={() => handleInputChange('paediatric_worksheet_completed', 'Y')} disabled={readOnly} className="w-4 h-4 text-[#1e1b4b]" /><span className="text-sm font-bold text-slate-700">Y</span></label>
                 <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="paediatric_worksheet_completed" checked={formData.paediatric_worksheet_completed === 'N'} onChange={() => handleInputChange('paediatric_worksheet_completed', 'N')} disabled={readOnly} className="w-4 h-4 text-[#1e1b4b]"/><span className="text-sm font-bold text-slate-700">N</span></label>
                 <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="paediatric_worksheet_completed" checked={formData.paediatric_worksheet_completed === 'NA'} onChange={() => handleInputChange('paediatric_worksheet_completed', 'NA')} disabled={readOnly} className="w-4 h-4 text-[#1e1b4b]"/><span className="text-sm font-bold text-slate-700">NA</span></label>
               </div>
            </div>
            {renderTextarea("primary_diagnosis", "PRIMARY DIAGNOSIS / INDICATION e.g. multiple secundum ASDs with left-to-right shunt and right heart volume overload; persistent PDA. Diagnosis / indication, number & type of ASDs, PDA size (write in):", "md:col-span-4")}
          </div>
        </section>

        {/* PART B & C */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section>
            <div className="bg-[#1e1b4b] text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part B — Procedure Description</div>
            <div className="border-4 border-slate-900 rounded-3xl p-8 shadow-inner bg-slate-50 relative h-full">
              <p className="text-sm text-slate-600 mb-3"><strong className="text-slate-800">WHAT THE PROCEDURE INVOLVES:</strong> Through an opening in the chest, on the heart-lung (bypass) machine, the surgeon closes each hole in the wall between the upper chambers (one or more ASDs) and closes the persistent vessel (PDA). Small or multiple defects may be closed with stitches alone; larger defects are closed with a patch. The PDA is tied and/or clipped, usually at the start of bypass through the same chest opening.</p>
              <ul className="text-sm text-slate-600 mb-6 list-disc pl-4 space-y-1">
                <li>General anaesthetic. The chest is opened down the middle, opening the breastbone (median sternotomy).</li>
                <li>The child/patient is placed on the heart-lung (cardiopulmonary bypass) machine.</li>
                <li>The PDA is identified and closed (tied and/or clipped).</li>
                <li>The right atrium is opened; each ASD is identified and closed by direct stitching for small or multiple defects, or with a patch for larger ones (Part F).</li>
                <li>The heart is checked for any remaining (residual) defect, de-aired, and the atrium closed; bypass is weaned.</li>
                <li>Echocardiography is used during and after surgery to confirm closure. Recovery is in Intensive Care.</li>
                <li>Typical hospital stay is about five to seven days.</li>
              </ul>
              {renderTextarea("surgeons_notes", "Surgeon's notes on this patient (number/type/size of ASDs, PDA size, associated lesions, intended closure method):", "md:col-span-2")}
            </div>
          </section>
          
          <section>
            <div className="bg-[#1e1b4b] text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part C — Intended Benefits</div>
            <div className="border-4 border-slate-900 rounded-3xl p-8 shadow-inner bg-slate-50 relative h-full">
              <p className="text-sm text-slate-600 mb-6">Closing the ASDs and the PDA removes the extra blood flow overloading the right heart and lungs, improves growth, feeding and exercise tolerance, and reduces the long-term risks of heart rhythm problems, raised lung-artery pressure (pulmonary hypertension), heart failure, stroke from clots crossing a defect, and infection of the heart or vessel.</p>
              {renderTextarea("specific_goals", "Specific goals / expected outcome discussed with this patient / family:", "md:col-span-2")}
            </div>
          </section>
        </div>

        {/* PART D - Risks */}
        <section>
          <div className="bg-red-600 text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part D — Risks & Complications</div>
          <div className="border-4 border-slate-900 rounded-3xl p-8 shadow-inner bg-slate-50 relative">
            <p className="text-sm text-slate-500 italic mb-4">Montgomery standard: the patient (or parent/guardian) must be told of any risk a reasonable person in their position would consider significant, and any risk significant to this particular patient. Frequencies below are general; the clinician records the risks actually discussed. Risks are generally higher in small infants.</p>
            
            <div className="overflow-x-auto mb-6 border-4 border-slate-200 rounded-2xl shadow-sm">
              <table className="w-full text-left border-collapse bg-white">
                <thead className="bg-[#1e1b4b] text-white">
                  <tr>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest w-1/4">FREQUENCY</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest w-1/3">COMPLICATION</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest">EXPLANATION / MANAGEMENT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr><td className="px-4 py-3 text-xs font-black text-emerald-600">COMMON</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Temporary irregular heartbeat; chest/wound discomfort; pericardial fluid; need for a chest drain.</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Usually settle with routine post-operative care.</td></tr>
                  <tr className="bg-slate-50"><td className="px-4 py-3 text-xs font-black text-emerald-600">COMMON</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Need for blood transfusion (more likely in small infants, whose blood volume is small relative to the bypass circuit).</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Cross-matched blood available; cell salvage / ultrafiltration used.</td></tr>
                  <tr><td className="px-4 py-3 text-xs font-black text-amber-600">UNCOMMON</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Bleeding needing a return to theatre; wound, chest or urinary infection.</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Managed by re-operation or antibiotics; diabetes/obesity increase risk.</td></tr>
                  <tr className="bg-slate-50"><td className="px-4 py-3 text-xs font-black text-amber-600">UNCOMMON</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Residual (remaining) shunt through an ASD, or a patch leak.</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Small shunts often need no action; larger may need a further procedure.</td></tr>
                  <tr><td className="px-4 py-3 text-xs font-black text-amber-600">UNCOMMON</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Heart block needing temporary pacing and, rarely, a permanent pacemaker.</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Pacing wires placed at surgery; pacemaker if it does not recover.</td></tr>
                  <tr className="bg-slate-50"><td className="px-4 py-3 text-xs font-black text-amber-600">UNCOMMON</td><td className="px-4 py-3 text-xs font-medium text-slate-600">PDA: hoarse voice or weak cry from recurrent laryngeal nerve irritation; raised diaphragm from phrenic nerve injury.</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Often temporary; speech/feeding support if needed.</td></tr>
                  <tr><td className="px-4 py-3 text-xs font-black text-rose-600">RARE</td><td className="px-4 py-3 text-xs font-medium text-slate-600">PDA: chyle leak (chylothorax) from thoracic-duct/lymphatic injury; recurrent ductal flow; accidental narrowing of the aorta or pulmonary artery.</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Chyle leak managed with special diet/drainage; further procedure if needed.</td></tr>
                  <tr className="bg-slate-50"><td className="px-4 py-3 text-xs font-black text-rose-600">RARE</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Stroke or air/clot embolism; temporary confusion after bypass.</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Careful de-airing; usually recovers, occasionally lasting.</td></tr>
                  <tr><td className="px-4 py-3 text-xs font-black text-rose-600">RARE</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Heart attack / low cardiac output needing drugs or support; prolonged ventilation; kidney injury needing dialysis.</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Intensive-care support; usually recovers.</td></tr>
                  <tr className="bg-slate-50"><td className="px-4 py-3 text-xs font-black text-rose-600">RARE</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Injury to a heart valve near a defect, needing repair.</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Repaired at surgery; may show only on follow-up.</td></tr>
                  <tr><td className="px-4 py-3 text-xs font-black text-red-700">VERY RARE</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Life-threatening complication or death.</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Higher in small infants, raised lung pressures, or other medical problems; mitigated by specialist care.</td></tr>
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              {renderTextarea("figures_discussed", "Figures discussed with this patient/family (e.g. overall risk of death, residual shunt, pacemaker, re-operation, transfusion):", "md:col-span-1")}
              {renderTextarea("specific_risks", "Risks specific to THIS patient (weight/age, prematurity, pulmonary pressures, number/position of defects, other lesions, comorbidities):", "md:col-span-1")}
            </div>
          </div>
        </section>

        {/* PART E & F */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section>
            <div className="bg-[#1e1b4b] text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part E — Alternatives</div>
            <div className="border-4 border-slate-900 rounded-3xl p-8 shadow-inner bg-slate-50 relative h-full">
              <div className="overflow-x-auto mb-6 border-2 border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse bg-white">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="px-3 py-2 text-[10px] font-black uppercase w-1/3 border-b">ALTERNATIVE</th>
                      <th className="px-3 py-2 text-[10px] font-black uppercase w-1/3 border-b border-l">DESCRIPTION</th>
                      <th className="px-3 py-2 text-[10px] font-black uppercase border-b border-l">LIMITATIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr><td className="px-3 py-2 text-xs font-bold border-r">Device closure (some ASDs / PDA)</td><td className="px-3 py-2 text-xs border-r">Catheter-delivered occluder via a groin vessel.</td><td className="px-3 py-2 text-xs">Suits only some single defects with adequate rims; not suitable for multiple defects.</td></tr>
                    <tr><td className="px-3 py-2 text-xs font-bold border-r">Staged / separate procedures</td><td className="px-3 py-2 text-xs border-r">Treating PDA and ASDs at different times.</td><td className="px-3 py-2 text-xs">Two anaesthetics and recoveries; not preferred when both can be safely corrected together.</td></tr>
                    <tr><td className="px-3 py-2 text-xs font-bold border-r">Medical management</td><td className="px-3 py-2 text-xs border-r">Treating symptoms/heart failure with medicine.</td><td className="px-3 py-2 text-xs">Does not close the defects; underlying shunt and long-term risks persist.</td></tr>
                    <tr><td className="px-3 py-2 text-xs font-bold border-r">No treatment</td><td className="px-3 py-2 text-xs border-r">Declining surgery.</td><td className="px-3 py-2 text-xs">Risk of progressive heart/lung effects, pulmonary hypertension, arrhythmia and, in time, inoperability.</td></tr>
                  </tbody>
                </table>
              </div>
              
              {renderTextarea("alternatives_discussed", "Alternatives discussed and what is likely to happen with no treatment:", "md:col-span-2")}
            </div>
          </section>

          <section>
            <div className="bg-[#1e1b4b] text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part F — Method of Closure</div>
            <div className="border-4 border-slate-900 rounded-3xl p-8 shadow-inner bg-slate-50 relative h-full">
              <p className="text-sm text-slate-600 mb-4">Each ASD may be closed in one of three ways. The surgeon chooses during the operation, based on the number, size and position of the defects and the quality of the surrounding tissue. Small or multiple defects are often closed by direct stitching; larger defects usually need a patch. Please tick the options you consent to.</p>
              <div className="space-y-3 mb-4">
                {renderCheckbox("method_a", "A: DIRECT SUTURE (own tissue, no patch). The hole is closed with stitches alone. Commonly used for small or multiple defects.", "md:col-span-1")}
                {renderCheckbox("method_b", "B: AUTOLOGOUS PATCH (your own tissue). A patch cut from your own pericardium — the thin sac around the heart. It is living tissue, needs no blood-thinning medicine for the patch, and has a low infection risk.", "md:col-span-1")}
                {renderCheckbox("method_c", "C: PROSTHETIC PATCH (man-made). A patch of man-made material (e.g. polyester or PTFE), used if own tissue is unsuitable, too small or too weak. Durable, but foreign material carries a small infection risk.", "md:col-span-1")}
                {renderCheckbox("method_d", "D: I do NOT agree to a prosthetic patch. The surgeon must then use only direct suture or my own tissue, and will explain the options if a problem arises during surgery.", "md:col-span-1")}
              </div>
              <p className="text-[10px] text-slate-400 font-bold italic border-t pt-2 mt-2">The surgeon will decide the method during the operation, based on what is found. More than one method may be used if there are several defects.</p>
            </div>
          </section>
        </div>

        {/* PART G & H */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section>
            <div className="bg-[#1e1b4b] text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part G — PDA Closure</div>
            <div className="border-4 border-slate-900 rounded-3xl p-8 shadow-inner bg-slate-50 relative h-full">
              <p className="text-sm text-slate-600 mb-4">The PDA is a persistent blood vessel between the two great arteries. In this combined operation it is closed during the same bypass procedure, by tying (ligation) and/or surgical clips, usually at the start of bypass through the same chest opening. The vessel lies close to the nerve to the voice box (recurrent laryngeal nerve), the nerve to the diaphragm (phrenic nerve) and the main lymph channel (thoracic duct); these are protected but can occasionally be injured (see Part D).</p>
              <div className="space-y-3 mb-4">
                {renderCheckbox("consent_pda", "E: I consent to closure of the PDA by ligation and/or clips during the operation.", "col-span-1")}
              </div>
              <p className="text-[10px] text-slate-400 font-bold italic border-t pt-2 mt-2">If the duct is unusually large, calcified or fragile, the surgeon may need to close it from inside the pulmonary artery on bypass; this will be done only if necessary and in the patient's best interests.</p>
            </div>
          </section>

          <section>
            <div className="bg-[#1e1b4b] text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part H — Other Procedures</div>
            <div className="border-4 border-slate-900 rounded-3xl p-8 shadow-inner bg-slate-50 relative h-full">
              <p className="text-sm text-slate-600 mb-4">The surgeon will do these only if needed to complete the operation safely or to treat a danger to life. Tick to agree.</p>
              <div className="space-y-3">
                {renderCheckbox("proc_f", "F: Repair of a heart valve near a defect, if it is found to leak.", "col-span-1")}
                {renderCheckbox("proc_g", "G: Temporary pacing wires, and a permanent pacemaker later if heart block does not recover.", "col-span-1")}
                {renderCheckbox("proc_h", "H: Return to the operating theatre to treat bleeding, a residual leak, or infection.", "col-span-1")}
                {renderCheckbox("proc_i", "I: Femoral (groin) or other cannulation, or emergency bypass, if the heart becomes unstable.", "col-span-1")}
              </div>
            </div>
          </section>
        </div>

        {/* PART I & J */}
        <section>
          <div className="bg-[#1e1b4b] text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part I-J — Anaesthesia & Additional Consents</div>
          <div className="border-4 border-slate-900 rounded-3xl p-8 shadow-inner bg-slate-50 relative">
              <div className="mb-6 border-b border-slate-200 pb-6">
                <p className="text-sm text-slate-600 italic border-l-4 border-slate-300 pl-4">Anaesthesia will be discussed and provided by the anaesthetist. General anaesthesia with cardiopulmonary bypass is planned. For children, drug doses and fluid/blood volumes are weight-based and are calculated and counter-signed on the GSH Paediatric Weight-Based Calculation & Safety Worksheet before surgery. Anaesthesia carries its own risks, explained by the anaesthetist, who obtains separate anaesthetic consent and records it separately.</p>
              </div>

            <p className="text-sm text-slate-600 mb-4">During the operation the team may find conditions needing additional or different procedures not foreseen at consent. These will only be done if necessary to save life or prevent serious harm, in the patient's best interests.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {renderTextarea("additional_procedures_consented", "Additional procedures consented to if needed (write 'none' if not applicable):", "md:col-span-1")}
              {renderTextarea("procedures_declined", "Procedures NOT to be carried out under any circumstances:", "md:col-span-1")}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Blood transfusion: consent to transfusion of blood / blood products if clinically required (commonly needed in small infants on bypass):</span>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="blood_transfusion" checked={formData.blood_transfusion === 'Consents'} onChange={() => handleInputChange('blood_transfusion', 'Consents')} disabled={readOnly} className="w-4 h-4 text-[#1e1b4b]" />
                    <span className="text-sm font-bold text-slate-600">Consents</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="blood_transfusion" checked={formData.blood_transfusion === 'Declines'} onChange={() => handleInputChange('blood_transfusion', 'Declines')} disabled={readOnly} className="w-4 h-4 text-[#1e1b4b]" />
                    <span className="text-sm font-bold text-slate-600">Declines (record reason / advance directive)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="blood_transfusion" checked={formData.blood_transfusion === 'Discuss Further'} onChange={() => handleInputChange('blood_transfusion', 'Discuss Further')} disabled={readOnly} className="w-4 h-4 text-[#1e1b4b]" />
                    <span className="text-sm font-bold text-slate-600">Discuss Further</span>
                  </label>
                </div>
                {renderTextInput("tissue_implants_brand", "Tissue / implants: patch / device brand & NAFDAC Reg. No. (if applicable):", "md:col-span-2")}
              </div>
              <div className="space-y-3">
                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Clinical photography & video: photographs and/or video recordings may be taken for clinical documentation, and anonymised for teaching, training and audit. Tick all that apply:</span>
                <div className="flex flex-col gap-2">
                  {renderCheckbox("photo_clinical_record", "Consents – clinical record", "md:col-span-2")}
                  {renderCheckbox("photo_teaching_audit", "Consents – anonymised teaching / training / audit", "md:col-span-2")}
                  {renderCheckbox("photo_declines", "Declines", "md:col-span-2")}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SIGNATURE BLOCK SECTION (Dark Box) */}
        <section className="space-y-8 bg-slate-900 p-10 rounded-[3rem] shadow-2xl">
          <h3 className="text-center text-white font-black uppercase tracking-[0.3em] text-lg mb-6">Final Declarations & Signatures</h3>
          
          {/* PART K */}
          <div className="bg-white rounded-3xl p-6 shadow-xl border-t-8 border-emerald-500 relative">
            <h4 className="font-black text-slate-800 uppercase tracking-wider text-[10px] mb-4">PART K — LANGUAGE, INTERPRETATION & CAPACITY</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {renderTextInput("discussion_language", "Language of discussion:", "md:col-span-2")}
              <div className="md:col-span-2 space-y-2">
                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Interpreter used?</span>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="interpreter_used" checked={formData.interpreter_used === 'No'} onChange={() => handleInputChange('interpreter_used', 'No')} disabled={readOnly} className="w-4 h-4 text-[#1e1b4b]" />
                    <span className="text-sm font-bold text-slate-600">No</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="interpreter_used" checked={formData.interpreter_used === 'Yes'} onChange={() => handleInputChange('interpreter_used', 'Yes')} disabled={readOnly} className="w-4 h-4 text-[#1e1b4b]" />
                    <span className="text-sm font-bold text-slate-600">Yes (sign below)</span>
                  </label>
                </div>
              </div>
              {(formData.interpreter_used === 'Yes' || formData.interpreter_used === true) && (
                <>
                  <div className="col-span-4"><p className="text-[10px] font-bold text-slate-500 italic">Interpreter declaration: I have accurately interpreted the information and consent discussion to the best of my ability, and conveyed questions and responses.</p></div>
                  {renderTextInput("interpreter_name", "Full name (print)", "md:col-span-2")}
                  {renderTextInput("interpreter_designation", "Designation / Reg. No.", "md:col-span-2")}
                  
                  <div className="space-y-2 flex flex-col md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Interpreter Signature</label>
                    <div className="flex-grow min-h-[150px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
                      {renderSignatureBox("interpreter_signature", "Interpreter Signature")}
                    </div>
                  </div>

                  {renderTextInput("interpreter_date", "Date", "md:col-span-1")}
                  {renderTextInput("interpreter_time", "Time", "md:col-span-1")}
                </>
              )}
            </div>
          </div>

          {/* PART L */}
          <div className="bg-purple-50 rounded-3xl p-8 shadow-xl border-4 border-purple-200 relative">
            <h4 className="font-black text-purple-900 uppercase tracking-wider text-[10px] mb-4">PART L — DECLARATION OF CONSENTING CLINICIAN</h4>
            <p className="text-sm text-slate-600 font-bold mb-6 italic border-l-4 border-slate-300 pl-4">
              I confirm I have explained the procedure and its purpose, the intended benefits, the material risks (serious and frequent), the risks specific to this patient, and the reasonable alternatives including no treatment. I have answered questions honestly, provided any relevant leaflet, and I am satisfied the patient (or parent/guardian) has capacity and consents voluntarily. I have appropriate knowledge of this procedure.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {renderTextInput("clinician_name", "CONSENTING CLINICIAN (Surgeon) Full name (print)", "md:col-span-2")}
              {renderTextInput("clinician_designation", "Designation / Reg. No.", "md:col-span-2")}
              
              <div className="space-y-2 flex flex-col md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Signature</label>
                <div className="flex-grow min-h-[150px] border-4 border-dashed border-purple-200 rounded-2xl overflow-hidden bg-white">
                  {renderSignatureBox("clinician_signature", "Clinician Signature")}
                </div>
              </div>

              {renderTextInput("clinician_date", "Date", "md:col-span-1")}
              {renderTextInput("clinician_time", "Time", "md:col-span-1")}

              {renderTextInput("second_clinician_name", "SECOND CLINICIAN / ASSISTANT (if applicable) Full name (print)", "md:col-span-2")}
              {renderTextInput("second_clinician_designation", "Designation / Reg. No.", "md:col-span-2")}
              
              <div className="space-y-2 flex flex-col md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Signature</label>
                <div className="flex-grow min-h-[150px] border-4 border-dashed border-purple-200 rounded-2xl overflow-hidden bg-white">
                  {renderSignatureBox("second_clinician_signature", "Second Clinician Signature")}
                </div>
              </div>

              {renderTextInput("second_clinician_date", "Date", "md:col-span-1")}
              {renderTextInput("second_clinician_time", "Time", "md:col-span-1")}
            </div>
          </div>

          {/* PART M */}
          <div className="bg-white rounded-3xl p-6 shadow-xl border-t-8 border-slate-900 relative">
            <h4 className="font-black text-slate-800 uppercase tracking-wider text-[10px] mb-4">PART M — PATIENT CONSENT DECLARATION (ADULT WITH CAPACITY)</h4>
            <p className="text-sm text-red-600 font-bold mb-4">For a child or a patient who cannot consent for themselves, do NOT complete this Part — go to Part N (Parent / Guardian).</p>
            <div className="space-y-3 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              {renderCheckbox("read_understood", "I have read, or had read to me, and I understand the information in Parts A to L of this form.", "col-span-1", true)}
              {renderCheckbox("risks_explained", "The benefits, risks and alternatives have been explained and I have had the opportunity to ask questions.", "col-span-1", true)}
              {renderCheckbox("individual_risks_accepted", "I understand and accept the risks described, including those relevant to my individual circumstances.", "col-span-1", true)}
              {renderCheckbox("modify_approach", "I understand the team will use the planned approach but may modify it if clinically necessary (including the method of closing each defect).", "col-span-1", true)}
              {renderCheckbox("withdraw_anytime", "I understand no guarantee of a particular result has been given, and I may withdraw consent at any time before the operation begins.", "col-span-1", true)}
              {renderCheckbox("additional_procedures_ack", "I consent to additional procedures judged immediately necessary to deal with an unexpected situation that cannot safely be deferred.", "col-span-1", true)}
            </div>
            <p className="font-black text-[#1e1b4b] text-sm uppercase text-center mb-6">I GIVE MY INFORMED CONSENT to proceed with repair of atrial septal defect(s) and closure of patent ductus arteriosus (open-heart surgery with cardiopulmonary bypass).</p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              
              <div className="space-y-2 flex flex-col md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">PATIENT SIGNATURE (or thumbprint)</label>
                <div className="flex-grow min-h-[150px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
                  {renderSignatureBox("patient_signature", "Patient Signature")}
                </div>
              </div>

              {renderTextInput("patient_date", "Date", "md:col-span-1")}
              {renderTextInput("patient_time", "Time", "md:col-span-1")}

              {renderTextInput("witness_name", "WITNESS (if patient unable to sign independently) Full name (print)", "md:col-span-2")}
              {renderTextInput("witness_designation", "Designation / Reg. No.", "md:col-span-2")}
              
              <div className="space-y-2 flex flex-col md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Signature</label>
                <div className="flex-grow min-h-[150px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
                  {renderSignatureBox("witness_signature", "Witness Signature")}
                </div>
              </div>

              {renderTextInput("witness_date", "Date", "md:col-span-1")}
              {renderTextInput("witness_time", "Time", "md:col-span-1")}
            </div>
          </div>

          {/* PART N */}
          <div className="bg-white rounded-3xl p-6 shadow-xl border-t-8 border-purple-600 relative">
            <h4 className="font-black text-slate-800 uppercase tracking-wider text-[10px] mb-4">PART N — CONSENT BY PARENT / GUARDIAN (PATIENT UNDER 18 OR LACKING CAPACITY)</h4>
            <p className="text-sm text-slate-600 italic mb-4">Complete this Part for every paediatric patient, and for any adult who cannot consent for themselves. Consent is given by a person with parental responsibility or a legal guardian, in the patient's best interests. A young person assessed as competent (Gillick) may also consent — record this in the notes.</p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              {renderTextInput("parent_name", "NAME OF PARENT / GUARDIAN*", "md:col-span-2", true)}
              {renderTextInput("relationship", "RELATIONSHIP TO PATIENT*", "md:col-span-2", true)}
              <div className="md:col-span-4 space-y-2">
                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Legal basis:</span>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="legal_basis_type" checked={formData.legal_basis_type === 'Parental responsibility'} onChange={() => handleInputChange('legal_basis_type', 'Parental responsibility')} disabled={readOnly} className="w-4 h-4 text-[#1e1b4b]" />
                    <span className="text-sm font-bold text-slate-600">Parental responsibility</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="legal_basis_type" checked={formData.legal_basis_type === 'Legal guardian'} onChange={() => handleInputChange('legal_basis_type', 'Legal guardian')} disabled={readOnly} className="w-4 h-4 text-[#1e1b4b]" />
                    <span className="text-sm font-bold text-slate-600">Legal guardian</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="legal_basis_type" checked={formData.legal_basis_type === 'Court order'} onChange={() => handleInputChange('legal_basis_type', 'Court order')} disabled={readOnly} className="w-4 h-4 text-[#1e1b4b]" />
                    <span className="text-sm font-bold text-slate-600">Court order (documentation sighted)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="legal_basis_type" checked={formData.legal_basis_type === 'Gillick'} onChange={() => handleInputChange('legal_basis_type', 'Gillick')} disabled={readOnly} className="w-4 h-4 text-[#1e1b4b]" />
                    <span className="text-sm font-bold text-slate-600">Gillick-competent young person (recorded in notes)</span>
                  </label>
                </div>
              </div>
              <div className="md:col-span-4 space-y-2">
                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">If not a parent — evidence of legal guardianship sighted:</span>
                <div className="flex gap-4">
                   <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="guardianship_sighted" checked={formData.guardianship_sighted === 'Yes (describe)'} onChange={() => handleInputChange('guardianship_sighted', 'Yes (describe)')} disabled={readOnly} className="w-4 h-4 text-[#1e1b4b]"/>
                    <span className="text-sm font-bold text-slate-600">Yes (describe)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="guardianship_sighted" checked={formData.guardianship_sighted === 'Pending (escalate before surgery)'} onChange={() => handleInputChange('guardianship_sighted', 'Pending (escalate before surgery)')} disabled={readOnly} className="w-4 h-4 text-[#1e1b4b]"/>
                    <span className="text-sm font-bold text-slate-600">Pending (escalate before surgery)</span>
                  </label>
                </div>
              </div>
              {renderTextInput("reason_cannot_consent", "Reason the patient cannot consent personally (age / clinical):", "md:col-span-4")}

              <div className="md:col-span-4 space-y-3 mb-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                {renderCheckbox("read_understood", "I have read, or had read to me, Parts A to L, and understand the benefits, risks and alternatives.", "col-span-1")}
                {renderCheckbox("risks_explained", "The benefits, risks and alternatives have been explained and I have had the opportunity to ask questions.", "col-span-1")}
                {renderCheckbox("individual_risks_accepted", "I understand and accept the risks described, including those relevant to my individual circumstances.", "col-span-1")}
                {renderCheckbox("modify_approach", "I understand the method of closing each defect (suture / autologous patch / prosthetic patch) and the PDA closure may be decided during the operation.", "col-span-1")}
                {renderCheckbox("withdraw_anytime", "I understand no guarantee of a particular result has been given, and I may withdraw consent at any time before the operation begins.", "col-span-1")}
                {renderCheckbox("additional_procedures_ack", "I consent to additional procedures judged immediately necessary to deal with an unexpected situation that cannot safely be deferred.", "col-span-1")}
              </div>

              <p className="md:col-span-4 font-black text-[#1e1b4b] text-sm uppercase text-center mb-2">I GIVE CONSENT on behalf of the patient, in their best interests, to the operation described.</p>

              <div className="space-y-2 flex flex-col md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">PARENT / GUARDIAN / LEGAL REPRESENTATIVE Signature</label>
                <div className="flex-grow min-h-[150px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
                  {renderSignatureBox("parent_signature", "Parent/Guardian Signature")}
                </div>
              </div>

              {renderTextInput("parent_name_print", "Full name (print)", "md:col-span-2")}
              {renderTextInput("parent_date", "Date", "md:col-span-1")}
              {renderTextInput("parent_time", "Time", "md:col-span-1")}

              <div className="space-y-2 flex flex-col md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">CONSENTING CLINICIAN (confirming best interests) Signature</label>
                <div className="flex-grow min-h-[150px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
                  {renderSignatureBox("confirming_clinician_signature", "Confirming Clinician Signature")}
                </div>
              </div>

              {renderTextInput("confirming_clinician_name", "Full name (print)", "md:col-span-2")}
              {renderTextInput("confirming_clinician_date", "Date", "md:col-span-1")}
              {renderTextInput("confirming_clinician_time", "Time", "md:col-span-1")}
            </div>
          </div>

          {/* PART O */}
          <div className="bg-white rounded-3xl p-6 shadow-xl border-t-8 border-orange-500 relative">
            <h4 className="font-black text-slate-800 uppercase tracking-wider text-[10px] mb-4">PART O — RE-CONFIRMATION ON THE DAY OF SURGERY</h4>
            <p className="text-sm text-slate-600 italic mb-4">To be completed by a member of the surgical team on the day of surgery, before the patient goes to theatre.</p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="md:col-span-2 space-y-2">
                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient/guardian confirms consent is unchanged:</span>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="consent_unchanged" checked={formData.consent_unchanged === 'Yes'} onChange={() => handleInputChange('consent_unchanged', 'Yes')} disabled={readOnly} className="w-4 h-4 text-[#1e1b4b]" />
                    <span className="text-sm font-bold text-slate-600">Yes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="consent_unchanged" checked={formData.consent_unchanged === 'Changes made (record below)'} onChange={() => handleInputChange('consent_unchanged', 'Changes made (record below)')} disabled={readOnly} className="w-4 h-4 text-[#1e1b4b]" />
                    <span className="text-sm font-bold text-slate-600">Changes made (record below)</span>
                  </label>
                </div>
              </div>
              <div className="md:col-span-2 space-y-2">
                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Weight re-checked and paediatric worksheet counter-signed (if child):</span>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="weight_rechecked" checked={formData.weight_rechecked === 'Yes'} onChange={() => handleInputChange('weight_rechecked', 'Yes')} disabled={readOnly} className="w-4 h-4 text-[#1e1b4b]"/>
                    <span className="text-sm font-bold text-slate-600">Yes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="weight_rechecked" checked={formData.weight_rechecked === 'N/A'} onChange={() => handleInputChange('weight_rechecked', 'N/A')} disabled={readOnly} className="w-4 h-4 text-[#1e1b4b]" />
                    <span className="text-sm font-bold text-slate-600">N/A</span>
                  </label>
                </div>
              </div>
              {renderTextarea("changes_to_wishes", "Changes to wishes, if any:", "md:col-span-4")}
              {renderTextInput("confirming_surgeon_details", "Confirming surgeon — name / signature / date / time:", "md:col-span-4")}
            </div>
          </div>
        </section>
      </div>

      {/* Footer / Actions - Exact Replica of General Consent */}
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
                disabled={submitting || !formData.clinician_signature || (!formData.patient_signature && !formData.parent_signature)}
                className="bg-[#1e1b4b] text-white px-10 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-2xl shadow-brand-primary/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50 disabled:grayscale disabled:scale-100"
              >
                {submitting ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <CheckCircle size={20} />
                )}
                {submitting ? "Finalizing..." : "Submit Consent"}
              </button>
            </>
          )}
          {readOnly && onPrint && (
            <button
              onClick={onPrint}
              className="bg-[#1e1b4b] text-white px-10 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-2xl transition-all flex items-center gap-3"
            >
              <Printer size={20} /> View Full PDF
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AsdPdaRepairConsentForm;

// import React, { useState, useEffect, useRef } from "react";
// import { CheckCircle, Loader2, Printer, Save, AlertCircle } from "lucide-react";
// import { consentService } from "../../services/consent.service";
// import SignaturePad from "../SignaturePad";
// import { useAuth } from "../../context/AuthContext";
// import { useNotification } from "../../context/NotificationContext";
// import { BASE_URL } from "../../api/client";
// import apiClient from "../../api/client";
// import { patientService } from "../../services/patient.service";
// import { formDraftService } from "../../services/session-restore.service";

// interface AsdPdaRepairConsentFormProps {
//   orderId: number;
//   patientName: string;
//   mrn: string;
//   initialData?: any;
//   draftId?: number | null;
//   onSuccess: (formData: any) => void;
//   onCancel: () => void;
//   onPrint: () => void;
//   readOnly?: boolean;
//   viewData?: any;
// }

// const AsdPdaRepairConsentForm: React.FC<AsdPdaRepairConsentFormProps> = ({
//   orderId,
//   patientName,
//   mrn,
//   initialData,
//   draftId,
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
  
//   const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

//   const getSigUrl = (path: string | undefined | null) => {
//     if (!path) return "";
//     if (path.startsWith("data:")) return path;
//     const normalizedBaseUrl = BASE_URL.replace(/\/api(\/v\d+)?\/?$/, "").replace(/\/$/, "");
//     return path.startsWith("/") ? `${normalizedBaseUrl}${path}` : `${normalizedBaseUrl}/${path}`;
//   };

//   const [formData, setFormData] = useState<any>(viewData || initialData || { patient_name: patientName, mrn });

//   useEffect(() => {
//     if (viewData || initialData) {
//       setFormData((prev: any) => ({ ...prev, ...(viewData || initialData) }));
//     }
//   }, [viewData, initialData]);

//   // 1. Initial Data Fetch & Local Draft Restoration
//   useEffect(() => {
//     if (!readOnly && mrn && !viewData && !initialData) {
      
//       const localDraftId = `consent_asd_pda_${orderId}`;
//       const savedDraft = user?.id ? formDraftService.loadDraft<any>(user.id, localDraftId) : null;
      
//       if (savedDraft) {
//         setFormData(savedDraft);
//         notify("Restored unsaved changes from your previous session", "success");
//         return; 
//       }

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
//               ward: prev.ward || wardUnit, // <--- FIXED KEY
//             }));
//           }
          
//           // if (patient) {
//           //   setFormData((prev: any) => ({
//           //     ...prev,
//           //     patient_full_name: prev.patient_full_name || `${patient.demographics?.first_name || ""} ${patient.demographics?.last_name || ""}`.trim(),
//           //     dob: prev.dob || patient.demographics?.date_of_birth || "",
//           //     age_sex: prev.age_sex || `${patient.demographics?.age || ""} / ${patient.demographics?.gender || ""}`,
//           //     ward_unit: prev.ward_unit || wardUnit,
//           //   }));
//           // }
//         } catch (error) {
//           console.error("Failed to prefill patient data", error);
//         } finally {
//           setLoading(false);
//         }
//       };
//       fetchPrefillData();
//     }
//   }, [mrn, readOnly, viewData, initialData, orderId, user?.id]);

//   // 2. Local Auto-Save Loop
//   useEffect(() => {
//     if (readOnly || !orderId || !user?.id) return;
    
//     if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    
//     autoSaveTimerRef.current = setTimeout(() => {
//       const localDraftId = `consent_asd_pda_${orderId}`;
//       formDraftService.saveDraft(user.id!, localDraftId, formData);
//     }, 1500);
    
//     return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
//   }, [formData, orderId, user?.id, readOnly]);

//   const handleInputChange = (id: string, value: any) => {
//     setFormData((prev: any) => ({ ...prev, [id]: value }));
//   };

//   // 3. Save as Backend Draft Handler
//   const handleSaveDraft = async () => {
//     setSubmitting(true);
//     try {
//       await consentService.createConsent({
//         order_id: orderId,
//         template_slug: "ASD_Repair_+_PDA_Closure",
//         witness_user_id: user?.id || 0,
//         form_data: formData,
//         is_draft: true,
//         consent_id: draftId,
//       });
//       notify("Draft saved successfully to the system", "success");
      
//       if (user?.id) formDraftService.clearDraft(user.id, `consent_asd_pda_${orderId}`);
      
//       onCancel(); 
//     } catch (error: any) {
//       notify(error.response?.data?.message || error.message || "Failed to save draft", "error");
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   const handleSubmit = async () => {
//     if (!formData.clinician_signature || (!formData.patient_signature && !formData.parent_signature)) {
//       notify("Both clinician and patient/guardian signatures are required to finalize", "error");
//       return;
//     }

//     setSubmitting(true);
//     try {
//       await consentService.createConsent({
//         order_id: orderId,
//         template_slug: "ASD_Repair_+_PDA_Closure",
//         workflow_stage: "SIGNED_AND_CHECKED",
//         witness_user_id: user?.id || 0,
//         form_data: formData,
//         consent_id: draftId,
//       });
//       notify("Consent form submitted successfully", "success");
      
//       if (user?.id) formDraftService.clearDraft(user.id, `consent_asd_pda_${orderId}`);

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

//   // Helper for rendering signatures properly across Draft / ReadOnly / Edit modes
//   const renderSignatureBox = (id: string, label: string) => {
//     const hasSignature = formData[id] && typeof formData[id] === 'string' && formData[id].length > 0;
    
//     if (readOnly) {
//       return (
//         <div className="h-full w-full flex items-center justify-center p-2">
//           {hasSignature ? (
//             <img src={getSigUrl(formData[id])} alt={label} className="max-h-full max-w-full object-contain" />
//           ) : (
//             <span className="text-slate-300 font-bold uppercase text-xs">No Signature</span>
//           )}
//         </div>
//       );
//     }

//     if (hasSignature) {
//       return (
//         <div className="h-full w-full flex items-center justify-center p-2 relative group">
//           <img src={getSigUrl(formData[id])} alt={label} className="max-h-full max-w-full object-contain" />
//           <button 
//             onClick={() => handleInputChange(id, null)} 
//             className="absolute top-2 right-2 bg-red-100 text-red-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase hover:bg-red-200 transition-colors opacity-0 group-hover:opacity-100 shadow-sm"
//             title="Clear Signature"
//           >
//             Clear
//           </button>
//         </div>
//       );
//     }

//     return (
//       <SignaturePad
//         onEnd={(data) => handleInputChange(id, data)}
//         onClear={() => handleInputChange(id, null)}
//         className="h-full w-full"
//       />
//     );
//   };

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
//         {renderSignatureBox(id, label)}
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
//               <h1 className="text-2xl font-black tracking-tighter">Consent: ASD Repair + PDA Closure</h1>
//               <p className="text-[#93c5fd] font-bold text-sm uppercase">Repair of Atrial Septal Defect(s) & Closure of Patent Ductus Arteriosus — Open-Heart Surgery</p>
//             </div>
//           </div>
//           <p className="text-xs text-[#93c5fd]/80 font-medium">Form Ref: GSH-CONSENT-CTS-025 • Policy Ref: GSH-T6</p>
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
//             You (or your child's parent/guardian) have the right to make decisions about medical care and to refuse any procedure. You may withdraw consent at any time before the procedure begins. Signing this form does not remove your legal rights. This form complies with the National Health Act 2014 (Nigeria) and Medbookie Consent Policy (GSH-T6).
//           </p>
//           <h4 className="font-black text-amber-900 uppercase text-xs mb-1">About this operation</h4>
//           <p className="text-xs text-amber-900 font-medium leading-relaxed italic">
//             open-heart surgery, using the heart-lung (cardiopulmonary bypass) machine, to close one or more holes between the two upper chambers of the heart (atrial septal defects, ASDs) and to close a persistent blood vessel between the two great arteries (patent ductus arteriosus, PDA). Both are corrected during the same operation.
//           </p>
//         </div>

//         {/* Paediatric / Small-Infant Note */}
//         <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 relative overflow-hidden shadow-sm">
//           <div className="absolute top-0 right-0 bg-blue-200/50 px-4 py-1 rounded-bl-xl text-[10px] font-black text-blue-800 uppercase tracking-wider">PAEDIATRIC / SMALL-INFANT NOTE</div>
//           <p className="text-xs text-blue-900 font-medium leading-relaxed italic mb-4 mt-2">
//             complete if the patient is a child. For infants and small children, consent is given by a parent or legal guardian (Part L). Weight-based prescribing, fluid and blood volumes are calculated and double-checked for the child's weight on the GSH Paediatric Weight-Based Calculation & Safety Worksheet, which is completed and counter-signed by the cardiac anaesthetist / intensivist before surgery.
//           </p>
//           <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
//             {renderCheckbox("adult_patient", "Adult patient", "md:col-span-1")}
//             {renderCheckbox("paediatric_patient", "Paediatric patient (weight: __ kg)", "md:col-span-1")}
//             {renderCheckbox("neonate_infant", "Neonate / small infant (<10 kg | age: __)", "md:col-span-1")}
//             {renderCheckbox("readiness_checklist", "Readiness checklist completed", "md:col-span-1")}
//           </div>
//         </div>

//         {/* PART A */}
//         <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#1e40af] border-t-8">
//           <div className="flex items-center gap-2 mb-4">
//             <span className="w-6 h-6 rounded-full bg-[#1e40af] text-white flex items-center justify-center text-xs font-black">A</span>
//             <h4 className="font-black text-slate-800 uppercase tracking-widest text-[11px]">PATIENT IDENTIFICATION</h4>
//           </div>
//           <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
//             {renderTextInput("patient_full_name", "PATIENT FULL NAME*", "md:col-span-2", true)}
//             {renderTextInput("dob", "DATE OF BIRTH*", "md:col-span-1", true)}
//             {renderTextInput("mrn", "MRN (MEDICAL RECORD NUMBER)*", "md:col-span-1", true)}
//             {renderTextInput("age_sex", "AGE / SEX", "md:col-span-1")}
//             {renderTextInput("weight", "WEIGHT (KG)*", "md:col-span-1", true)}
//             {renderTextInput("ward", "WARD / UNIT*", "md:col-span-1", true)}
//             {renderTextInput("consultant", "CONSULTANT / RESPONSIBLE SURGEON*", "md:col-span-2", true)}
//             {renderTextInput("anaesthetist", "ANAESTHETIST", "md:col-span-2")}
//             {renderTextInput("planned_date", "PLANNED DATE OF SURGERY*", "md:col-span-2", true)}
//             <div className="space-y-2 md:col-span-2">
//                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">PAEDIATRIC WORKSHEET COMPLETED? (Y/N/NA)</label>
//                <div className="flex gap-4">
//                  <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="paediatric_worksheet_completed" checked={formData.paediatric_worksheet_completed === 'Y'} onChange={() => handleInputChange('paediatric_worksheet_completed', 'Y')} disabled={readOnly} /><span className="text-xs font-bold">Y</span></label>
//                  <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="paediatric_worksheet_completed" checked={formData.paediatric_worksheet_completed === 'N'} onChange={() => handleInputChange('paediatric_worksheet_completed', 'N')} disabled={readOnly} /><span className="text-xs font-bold">N</span></label>
//                  <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="paediatric_worksheet_completed" checked={formData.paediatric_worksheet_completed === 'NA'} onChange={() => handleInputChange('paediatric_worksheet_completed', 'NA')} disabled={readOnly} /><span className="text-xs font-bold">NA</span></label>
//                </div>
//             </div>
//             {renderTextarea("primary_diagnosis", "PRIMARY DIAGNOSIS / INDICATION e.g. multiple secundum ASDs with left-to-right shunt and right heart volume overload; persistent PDA. Diagnosis / indication, number & type of ASDs, PDA size (write in):", "md:col-span-4")}
//           </div>
//         </div>

//         {/* PART B & C */}
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
//           <div className="bg-white rounded-3xl p-6 shadow-sm border-t-8 border-slate-700">
//             <div className="flex items-center gap-2 mb-4">
//               <span className="w-6 h-6 rounded-full bg-slate-700 text-white flex items-center justify-center text-xs font-black">B</span>
//               <h4 className="font-black text-slate-800 uppercase tracking-widest text-[11px]">DESCRIPTION OF THE PROCEDURE</h4>
//             </div>
//             <p className="text-xs text-slate-600 mb-3"><strong className="text-slate-800">WHAT THE PROCEDURE INVOLVES:</strong> Through an opening in the chest, on the heart-lung (bypass) machine, the surgeon closes each hole in the wall between the upper chambers (one or more ASDs) and closes the persistent vessel (PDA). Small or multiple defects may be closed with stitches alone; larger defects are closed with a patch. The PDA is tied and/or clipped, usually at the start of bypass through the same chest opening.</p>
//             <ul className="text-xs text-slate-600 mb-6 list-disc pl-4 space-y-1">
//               <li>General anaesthetic. The chest is opened down the middle, opening the breastbone (median sternotomy).</li>
//               <li>The child/patient is placed on the heart-lung (cardiopulmonary bypass) machine; tubes are placed into the heart and great vessels, and blood-thinning medicine is given while on bypass.</li>
//               <li>The PDA is identified and closed (tied and/or clipped), usually as bypass begins, to stop run-off into the lungs.</li>
//               <li>The right atrium is opened; each ASD is identified and closed by direct stitching for small or multiple defects, or with a patch for larger ones (Part F).</li>
//               <li>The heart is checked for any remaining (residual) defect, de-aired, and the atrium closed; bypass is weaned and the chest closed with drains and temporary pacing wires.</li>
//               <li>Echocardiography is used during and after surgery to confirm closure. Recovery is in Intensive Care.</li>
//               <li>Typical hospital stay is about five to seven days if there are no complications; small infants may stay longer.</li>
//             </ul>
//             {renderTextarea("surgeons_notes", "Surgeon's notes on this patient (number/type/size of ASDs, PDA size, associated lesions, intended closure method):", "md:col-span-2")}
//           </div>
          
//           <div className="bg-white rounded-3xl p-6 shadow-sm border-t-8 border-[#1e40af]">
//             <div className="flex items-center gap-2 mb-4">
//               <span className="w-6 h-6 rounded-full bg-[#1e40af] text-white flex items-center justify-center text-xs font-black">C</span>
//               <h4 className="font-black text-slate-800 uppercase tracking-widest text-[11px]">INTENDED BENEFITS</h4>
//             </div>
//             <p className="text-xs text-slate-600 mb-6">Closing the ASDs and the PDA removes the extra blood flow overloading the right heart and lungs, improves growth, feeding and exercise tolerance, and reduces the long-term risks of heart rhythm problems, raised lung-artery pressure (pulmonary hypertension), heart failure, stroke from clots crossing a defect, and infection of the heart or vessel.</p>
//             {renderTextarea("specific_goals", "Specific goals / expected outcome discussed with this patient / family:", "md:col-span-2")}
//           </div>
//         </div>

//         {/* PART D - Risks */}
//         <div className="bg-white rounded-3xl p-6 shadow-sm border-t-8 border-[#be123c]">
//           <div className="flex items-center gap-2 mb-4">
//             <span className="w-6 h-6 rounded-full bg-[#be123c] text-white flex items-center justify-center text-xs font-black">D</span>
//             <h4 className="font-black text-slate-800 uppercase tracking-widest text-[11px]">RISKS & COMPLICATIONS</h4>
//           </div>
//           <p className="text-xs text-slate-500 italic mb-4">Montgomery standard: the patient (or parent/guardian) must be told of any risk a reasonable person in their position would consider significant, and any risk significant to this particular patient. Frequencies below are general; the clinician records the risks actually discussed. Risks are generally higher in small infants.</p>
          
//           <div className="overflow-x-auto mb-6 border-4 border-slate-900 rounded-3xl shadow-sm">
//             <table className="w-full text-left border-collapse bg-white">
//               <thead className="bg-slate-900 text-white">
//                 <tr>
//                   <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest w-1/4">FREQUENCY</th>
//                   <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest w-1/3">COMPLICATION</th>
//                   <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest">EXPLANATION / MANAGEMENT</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-200">
//                 <tr><td className="px-4 py-3 text-xs font-black text-emerald-600">COMMON</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Temporary irregular heartbeat; chest/wound discomfort; pericardial fluid; need for a chest drain.</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Usually settle with routine post-operative care.</td></tr>
//                 <tr className="bg-slate-50"><td className="px-4 py-3 text-xs font-black text-emerald-600">COMMON</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Need for blood transfusion (more likely in small infants, whose blood volume is small relative to the bypass circuit).</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Cross-matched blood available; cell salvage / ultrafiltration used.</td></tr>
//                 <tr><td className="px-4 py-3 text-xs font-black text-amber-600">UNCOMMON</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Bleeding needing a return to theatre; wound, chest or urinary infection.</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Managed by re-operation or antibiotics; diabetes/obesity increase risk.</td></tr>
//                 <tr className="bg-slate-50"><td className="px-4 py-3 text-xs font-black text-amber-600">UNCOMMON</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Residual (remaining) shunt through an ASD, or a patch leak.</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Small shunts often need no action; larger may need a further procedure.</td></tr>
//                 <tr><td className="px-4 py-3 text-xs font-black text-amber-600">UNCOMMON</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Heart block needing temporary pacing and, rarely, a permanent pacemaker.</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Pacing wires placed at surgery; pacemaker if it does not recover.</td></tr>
//                 <tr className="bg-slate-50"><td className="px-4 py-3 text-xs font-black text-amber-600">UNCOMMON</td><td className="px-4 py-3 text-xs font-medium text-slate-600">PDA: hoarse voice or weak cry from recurrent laryngeal nerve irritation; raised diaphragm from phrenic nerve injury.</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Often temporary; speech/feeding support if needed.</td></tr>
//                 <tr><td className="px-4 py-3 text-xs font-black text-rose-600">RARE</td><td className="px-4 py-3 text-xs font-medium text-slate-600">PDA: chyle leak (chylothorax) from thoracic-duct/lymphatic injury; recurrent ductal flow (recanalisation); accidental narrowing of the aorta or pulmonary artery.</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Chyle leak managed with special diet/drainage; further procedure if needed.</td></tr>
//                 <tr className="bg-slate-50"><td className="px-4 py-3 text-xs font-black text-rose-600">RARE</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Stroke or air/clot embolism; temporary confusion after bypass.</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Careful de-airing; usually recovers, occasionally lasting.</td></tr>
//                 <tr><td className="px-4 py-3 text-xs font-black text-rose-600">RARE</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Heart attack / low cardiac output needing drugs or support; prolonged ventilation; kidney injury needing dialysis.</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Intensive-care support; usually recovers.</td></tr>
//                 <tr className="bg-slate-50"><td className="px-4 py-3 text-xs font-black text-rose-600">RARE</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Injury to a heart valve near a defect, needing repair.</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Repaired at surgery; may show only on follow-up.</td></tr>
//                 <tr><td className="px-4 py-3 text-xs font-black text-red-700">VERY RARE</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Life-threatening complication or death.</td><td className="px-4 py-3 text-xs font-medium text-slate-600">Higher in small infants, raised lung pressures, or other medical problems; mitigated by specialist care.</td></tr>
//               </tbody>
//             </table>
//           </div>

//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//             {renderTextarea("figures_discussed", "Figures discussed with this patient/family (e.g. overall risk of death, residual shunt, pacemaker, re-operation, transfusion):", "md:col-span-1")}
//             {renderTextarea("specific_risks", "Risks specific to THIS patient (weight/age, prematurity, pulmonary pressures, number/position of defects, other lesions, comorbidities):", "md:col-span-1")}
//           </div>
//         </div>

//         {/* PART E & F */}
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
//           <div className="bg-white rounded-3xl p-6 shadow-sm border-t-8 border-[#ea580c]">
//             <div className="flex items-center gap-2 mb-4">
//               <span className="w-6 h-6 rounded-full bg-[#ea580c] text-white flex items-center justify-center text-xs font-black">E</span>
//               <h4 className="font-black text-slate-800 uppercase tracking-widest text-[11px]">ALTERNATIVES TO THE PROPOSED PROCEDURE</h4>
//             </div>
            
//             <div className="overflow-x-auto mb-6 border-2 border-slate-200 rounded-xl">
//               <table className="w-full text-left border-collapse bg-white">
//                 <thead className="bg-slate-100 text-slate-700">
//                   <tr>
//                     <th className="px-3 py-2 text-[10px] font-black uppercase w-1/3 border-b">ALTERNATIVE</th>
//                     <th className="px-3 py-2 text-[10px] font-black uppercase w-1/3 border-b border-l">DESCRIPTION</th>
//                     <th className="px-3 py-2 text-[10px] font-black uppercase border-b border-l">LIMITATIONS</th>
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y divide-slate-200">
//                   <tr><td className="px-3 py-2 text-[10px] font-bold border-r">Device closure (some ASDs / PDA)</td><td className="px-3 py-2 text-[10px] border-r">Catheter-delivered occluder via a groin vessel.</td><td className="px-3 py-2 text-[10px]">Suits only some single defects with adequate rims; not suitable for multiple defects or where a surgical repair of both lesions is needed in one setting; size/weight limits in small infants.</td></tr>
//                   <tr><td className="px-3 py-2 text-[10px] font-bold border-r">Staged / separate procedures</td><td className="px-3 py-2 text-[10px] border-r">Treating PDA and ASDs at different times.</td><td className="px-3 py-2 text-[10px]">Two anaesthetics and recoveries; not preferred when both can be safely corrected together.</td></tr>
//                   <tr><td className="px-3 py-2 text-[10px] font-bold border-r">Medical management</td><td className="px-3 py-2 text-[10px] border-r">Treating symptoms/heart failure with medicine.</td><td className="px-3 py-2 text-[10px]">Does not close the defects; underlying shunt and long-term risks persist.</td></tr>
//                   <tr><td className="px-3 py-2 text-[10px] font-bold border-r">No treatment</td><td className="px-3 py-2 text-[10px] border-r">Declining surgery.</td><td className="px-3 py-2 text-[10px]">Risk of progressive heart/lung effects, pulmonary hypertension, arrhythmia and, in time, inoperability.</td></tr>
//                 </tbody>
//               </table>
//             </div>
            
//             {renderTextarea("alternatives_discussed", "Alternatives discussed and what is likely to happen with no treatment:", "md:col-span-2")}
//           </div>

//           <div className="bg-white rounded-3xl p-6 shadow-sm border-t-8 border-slate-700">
//             <div className="flex items-center gap-2 mb-4">
//               <span className="w-6 h-6 rounded-full bg-slate-700 text-white flex items-center justify-center text-xs font-black">F</span>
//               <h4 className="font-black text-slate-800 uppercase tracking-widest text-[11px]">METHOD OF CLOSING THE DEFECT(S)</h4>
//             </div>
//             <p className="text-xs text-slate-600 mb-4">Each ASD may be closed in one of three ways. The surgeon chooses during the operation, based on the number, size and position of the defects and the quality of the surrounding tissue. Small or multiple defects are often closed by direct stitching; larger defects usually need a patch. Please tick the options you consent to.</p>
//             <div className="space-y-3 mb-4">
//               {renderCheckbox("method_a", "A: DIRECT SUTURE (own tissue, no patch). The hole is closed with stitches alone. Commonly used for small or multiple defects.", "md:col-span-1")}
//               {renderCheckbox("method_b", "B: AUTOLOGOUS PATCH (your own tissue). A patch cut from your own pericardium — the thin sac around the heart. It is living tissue, needs no blood-thinning medicine for the patch, and has a low infection risk.", "md:col-span-1")}
//               {renderCheckbox("method_c", "C: PROSTHETIC PATCH (man-made). A patch of man-made material (e.g. polyester or PTFE), used if own tissue is unsuitable, too small or too weak. Durable, but foreign material carries a small infection risk and some patients need temporary blood-thinning medicine afterwards.", "md:col-span-1")}
//               {renderCheckbox("method_d", "D: I do NOT agree to a prosthetic patch. The surgeon must then use only direct suture or my own tissue, and will explain the options if a problem arises during surgery.", "md:col-span-1")}
//             </div>
//             <p className="text-[10px] text-slate-400 font-bold italic border-t pt-2 mt-2">The surgeon will decide the method during the operation, based on what is found. More than one method may be used if there are several defects.</p>
//           </div>
//         </div>

//         {/* PART G & H */}
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
//           <div className="bg-white rounded-3xl p-6 shadow-sm border-t-8 border-[#1e40af]">
//             <div className="flex items-center gap-2 mb-4">
//               <span className="w-6 h-6 rounded-full bg-[#1e40af] text-white flex items-center justify-center text-xs font-black">G</span>
//               <h4 className="font-black text-slate-800 uppercase tracking-widest text-[11px]">CLOSURE OF THE PATENT DUCTUS ARTERIOSUS (PDA)</h4>
//             </div>
//             <p className="text-xs text-slate-600 mb-4">The PDA is a persistent blood vessel between the two great arteries. In this combined operation it is closed during the same bypass procedure, by tying (ligation) and/or surgical clips, usually at the start of bypass through the same chest opening. The vessel lies close to the nerve to the voice box (recurrent laryngeal nerve), the nerve to the diaphragm (phrenic nerve) and the main lymph channel (thoracic duct); these are protected but can occasionally be injured (see Part D).</p>
//             <div className="space-y-3 mb-4">
//               {renderCheckbox("consent_pda", "E: I consent to closure of the PDA by ligation and/or clips during the operation.", "col-span-1")}
//             </div>
//             <p className="text-[10px] text-slate-400 font-bold italic border-t pt-2 mt-2">If the duct is unusually large, calcified or fragile, the surgeon may need to close it from inside the pulmonary artery on bypass; this will be done only if necessary and in the patient's best interests.</p>
//           </div>

//           <div className="bg-white rounded-3xl p-6 shadow-sm border-t-8 border-slate-700">
//             <div className="flex items-center gap-2 mb-4">
//               <span className="w-6 h-6 rounded-full bg-slate-700 text-white flex items-center justify-center text-xs font-black">H</span>
//               <h4 className="font-black text-slate-800 uppercase tracking-widest text-[11px]">OTHER PROCEDURES THAT MAY BECOME NECESSARY</h4>
//             </div>
//             <p className="text-xs text-slate-600 mb-4">The surgeon will do these only if needed to complete the operation safely or to treat a danger to life. Tick to agree.</p>
//             <div className="space-y-3">
//               {renderCheckbox("proc_f", "F: Repair of a heart valve near a defect, if it is found to leak.", "col-span-1")}
//               {renderCheckbox("proc_g", "G: Temporary pacing wires, and a permanent pacemaker later if heart block does not recover.", "col-span-1")}
//               {renderCheckbox("proc_h", "H: Return to the operating theatre to treat bleeding, a residual leak, or infection.", "col-span-1")}
//               {renderCheckbox("proc_i", "I: Femoral (groin) or other cannulation, or emergency bypass, if the heart becomes unstable.", "col-span-1")}
//             </div>
//           </div>
//         </div>

//         {/* PART I & J */}
//         <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
//             <div className="mb-6 border-b border-slate-200 pb-6">
//               <div className="flex items-center gap-2 mb-4">
//                 <span className="w-6 h-6 rounded-full bg-slate-700 text-white flex items-center justify-center text-xs font-black">I</span>
//                 <h4 className="font-black text-slate-800 uppercase tracking-widest text-[11px]">ANAESTHESIA</h4>
//               </div>
//               <p className="text-xs text-slate-600 italic border-l-4 border-slate-300 pl-4">Anaesthesia will be discussed and provided by the anaesthetist. General anaesthesia with cardiopulmonary bypass is planned. For children, drug doses and fluid/blood volumes are weight-based and are calculated and counter-signed on the GSH Paediatric Weight-Based Calculation & Safety Worksheet before surgery. Anaesthesia carries its own risks, explained by the anaesthetist, who obtains separate anaesthetic consent and records it separately.</p>
//             </div>

//           <div className="flex items-center gap-2 mb-4">
//             <span className="w-6 h-6 rounded-full bg-slate-700 text-white flex items-center justify-center text-xs font-black">J</span>
//             <h4 className="font-black text-slate-800 uppercase tracking-widest text-[11px]">ADDITIONAL PROCEDURES, BLOOD & TISSUE</h4>
//           </div>
//           <p className="text-xs text-slate-600 mb-4">During the operation the team may find conditions needing additional or different procedures not foreseen at consent. These will only be done if necessary to save life or prevent serious harm, in the patient's best interests.</p>
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
//             {renderTextarea("additional_procedures_consented", "Additional procedures consented to if needed (write 'none' if not applicable):", "md:col-span-1")}
//             {renderTextarea("procedures_declined", "Procedures NOT to be carried out under any circumstances:", "md:col-span-1")}
//           </div>
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//             <div className="space-y-3">
//               <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Blood transfusion: consent to transfusion of blood / blood products if clinically required (commonly needed in small infants on bypass):</span>
//               <div className="flex gap-4">
//                 <label className="flex items-center gap-2 cursor-pointer">
//                   <input type="radio" name="blood_transfusion" checked={formData.blood_transfusion === 'Consents'} onChange={() => handleInputChange('blood_transfusion', 'Consents')} disabled={readOnly} />
//                   <span className="text-xs font-bold text-slate-600">Consents</span>
//                 </label>
//                 <label className="flex items-center gap-2 cursor-pointer">
//                   <input type="radio" name="blood_transfusion" checked={formData.blood_transfusion === 'Declines'} onChange={() => handleInputChange('blood_transfusion', 'Declines')} disabled={readOnly} />
//                   <span className="text-xs font-bold text-slate-600">Declines (record reason / advance directive)</span>
//                 </label>
//                 <label className="flex items-center gap-2 cursor-pointer">
//                   <input type="radio" name="blood_transfusion" checked={formData.blood_transfusion === 'Discuss'} onChange={() => handleInputChange('blood_transfusion', 'Discuss')} disabled={readOnly} />
//                   <span className="text-xs font-bold text-slate-600">Discuss</span>
//                 </label>
//               </div>
//               {renderTextInput("tissue_implants_brand", "Tissue / implants: patch / device brand & NAFDAC Reg. No. (if applicable):", "md:col-span-2")}
//             </div>
//             <div className="space-y-3">
//               <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Clinical photography & video: photographs and/or video recordings may be taken for clinical documentation, and anonymised for teaching, training and audit. Tick all that apply:</span>
//               <div className="flex flex-col gap-2">
//                 {renderCheckbox("photo_clinical_record", "Consents – clinical record", "md:col-span-2")}
//                 {renderCheckbox("photo_teaching_audit", "Consents – anonymised teaching / training / audit", "md:col-span-2")}
//                 {renderCheckbox("photo_declines", "Declines", "md:col-span-2")}
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* SIGNATURE BLOCK SECTION (Dark Box) */}
//         <section className="space-y-8 bg-slate-900 p-10 rounded-[3rem] shadow-2xl">
//           <h3 className="text-center text-white font-black uppercase tracking-[0.3em] text-lg mb-6">Final Declarations & Signatures</h3>
          
//           {/* PART K */}
//           <div className="bg-white rounded-3xl p-6 shadow-xl border-t-8 border-emerald-500 relative">
//             <h4 className="font-black text-slate-800 uppercase tracking-wider text-[10px] mb-4">PART K — LANGUAGE, INTERPRETATION & CAPACITY</h4>
//             <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
//               {renderTextInput("discussion_language", "Language of discussion:", "md:col-span-2")}
//               <div className="md:col-span-2 space-y-2">
//                 <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Interpreter used?</span>
//                 <div className="flex gap-4">
//                   <label className="flex items-center gap-2 cursor-pointer">
//                     <input type="radio" name="interpreter_used" checked={formData.interpreter_used === 'No'} onChange={() => handleInputChange('interpreter_used', 'No')} disabled={readOnly} />
//                     <span className="text-xs font-bold text-slate-600">No</span>
//                   </label>
//                   <label className="flex items-center gap-2 cursor-pointer">
//                     <input type="radio" name="interpreter_used" checked={formData.interpreter_used === 'Yes'} onChange={() => handleInputChange('interpreter_used', 'Yes')} disabled={readOnly} />
//                     <span className="text-xs font-bold text-slate-600">Yes (sign below)</span>
//                   </label>
//                 </div>
//               </div>
//               {formData.interpreter_used === 'Yes' && (
//                 <>
//                   <div className="col-span-4"><p className="text-[10px] font-bold text-slate-500 italic">Interpreter declaration: I have accurately interpreted the information and consent discussion to the best of my ability, and conveyed questions and responses.</p></div>
//                   {renderTextInput("interpreter_name", "Full name (print)", "md:col-span-2")}
//                   {renderTextInput("interpreter_designation", "Designation / Reg. No.", "md:col-span-2")}
                  
//                   <div className="space-y-2 flex flex-col md:col-span-2">
//                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Interpreter Signature</label>
//                     <div className="flex-grow min-h-[150px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
//                       {renderSignatureBox("interpreter_signature", "Interpreter Signature")}
//                     </div>
//                   </div>

//                   {renderTextInput("interpreter_date", "Date", "md:col-span-1")}
//                   {renderTextInput("interpreter_time", "Time", "md:col-span-1")}
//                 </>
//               )}
//             </div>
//           </div>

//           {/* PART L */}
//           <div className="bg-purple-50 rounded-3xl p-8 shadow-xl border-4 border-purple-200 relative">
//             <h4 className="font-black text-purple-900 uppercase tracking-wider text-[10px] mb-4">PART L — DECLARATION OF CONSENTING CLINICIAN</h4>
//             <p className="text-xs text-slate-600 font-bold mb-6 italic border-l-4 border-slate-300 pl-4">
//               I confirm I have explained the procedure and its purpose, the intended benefits, the material risks (serious and frequent), the risks specific to this patient, and the reasonable alternatives including no treatment. I have answered questions honestly, provided any relevant leaflet, and I am satisfied the patient (or parent/guardian) has capacity and consents voluntarily. I have appropriate knowledge of this procedure.
//             </p>
//             <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
//               {renderTextInput("clinician_name", "CONSENTING CLINICIAN (Surgeon) Full name (print)", "md:col-span-2")}
//               {renderTextInput("clinician_designation", "Designation / Reg. No.", "md:col-span-2")}
              
//               <div className="space-y-2 flex flex-col md:col-span-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Signature</label>
//                 <div className="flex-grow min-h-[150px] border-4 border-dashed border-purple-200 rounded-2xl overflow-hidden bg-white">
//                   {renderSignatureBox("clinician_signature", "Clinician Signature")}
//                 </div>
//               </div>

//               {renderTextInput("clinician_date", "Date", "md:col-span-1")}
//               {renderTextInput("clinician_time", "Time", "md:col-span-1")}

//               {renderTextInput("second_clinician_name", "SECOND CLINICIAN / ASSISTANT (if applicable) Full name (print)", "md:col-span-2")}
//               {renderTextInput("second_clinician_designation", "Designation / Reg. No.", "md:col-span-2")}
              
//               <div className="space-y-2 flex flex-col md:col-span-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Signature</label>
//                 <div className="flex-grow min-h-[150px] border-4 border-dashed border-purple-200 rounded-2xl overflow-hidden bg-white">
//                   {renderSignatureBox("second_clinician_signature", "Second Clinician Signature")}
//                 </div>
//               </div>

//               {renderTextInput("second_clinician_date", "Date", "md:col-span-1")}
//               {renderTextInput("second_clinician_time", "Time", "md:col-span-1")}
//             </div>
//           </div>

//           {/* PART M */}
//           <div className="bg-white rounded-3xl p-6 shadow-xl border-t-8 border-slate-900 relative">
//             <h4 className="font-black text-slate-800 uppercase tracking-wider text-[10px] mb-4">PART M — PATIENT CONSENT DECLARATION (ADULT WITH CAPACITY)</h4>
//             <p className="text-xs text-red-600 font-bold mb-4">For a child or a patient who cannot consent for themselves, do NOT complete this Part — go to Part N (Parent / Guardian).</p>
//             <div className="space-y-3 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-200">
//               {renderCheckbox("read_understood", "I have read, or had read to me, and I understand the information in Parts A to L of this form.", "col-span-1", true)}
//               {renderCheckbox("risks_explained", "The benefits, risks and alternatives have been explained and I have had the opportunity to ask questions.", "col-span-1", true)}
//               {renderCheckbox("individual_risks_accepted", "I understand and accept the risks described, including those relevant to my individual circumstances.", "col-span-1", true)}
//               {renderCheckbox("modify_approach", "I understand the team will use the planned approach but may modify it if clinically necessary (including the method of closing each defect).", "col-span-1", true)}
//               {renderCheckbox("withdraw_anytime", "I understand no guarantee of a particular result has been given, and I may withdraw consent at any time before the operation begins.", "col-span-1", true)}
//               {renderCheckbox("additional_procedures_ack", "I consent to additional procedures judged immediately necessary to deal with an unexpected situation that cannot safely be deferred.", "col-span-1", true)}
//             </div>
//             <p className="font-black text-[#1e40af] text-sm uppercase text-center mb-6">I GIVE MY INFORMED CONSENT to proceed with repair of atrial septal defect(s) and closure of patent ductus arteriosus (open-heart surgery with cardiopulmonary bypass).</p>
//             <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              
//               <div className="space-y-2 flex flex-col md:col-span-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">PATIENT SIGNATURE (or thumbprint)</label>
//                 <div className="flex-grow min-h-[150px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
//                   {renderSignatureBox("patient_signature", "Patient Signature")}
//                 </div>
//               </div>

//               {renderTextInput("patient_date", "Date", "md:col-span-1")}
//               {renderTextInput("patient_time", "Time", "md:col-span-1")}

//               {renderTextInput("witness_name", "WITNESS (if patient unable to sign independently) Full name (print)", "md:col-span-2")}
//               {renderTextInput("witness_designation", "Designation / Reg. No.", "md:col-span-2")}
              
//               <div className="space-y-2 flex flex-col md:col-span-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Signature</label>
//                 <div className="flex-grow min-h-[150px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
//                   {renderSignatureBox("witness_signature", "Witness Signature")}
//                 </div>
//               </div>

//               {renderTextInput("witness_date", "Date", "md:col-span-1")}
//               {renderTextInput("witness_time", "Time", "md:col-span-1")}
//             </div>
//           </div>

//           {/* PART N */}
//           <div className="bg-white rounded-3xl p-6 shadow-xl border-t-8 border-purple-600 relative">
//             <h4 className="font-black text-slate-800 uppercase tracking-wider text-[10px] mb-4">PART N — CONSENT BY PARENT / GUARDIAN (PATIENT UNDER 18 OR LACKING CAPACITY)</h4>
//             <p className="text-xs text-slate-600 italic mb-4">Complete this Part for every paediatric patient, and for any adult who cannot consent for themselves. Consent is given by a person with parental responsibility or a legal guardian, in the patient's best interests. A young person assessed as competent (Gillick) may also consent — record this in the notes.</p>
//             <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
//               {renderTextInput("parent_name", "NAME OF PARENT / GUARDIAN*", "md:col-span-2", true)}
//               {renderTextInput("relationship", "RELATIONSHIP TO PATIENT*", "md:col-span-2", true)}
//               <div className="md:col-span-4 space-y-2">
//                 <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Legal basis:</span>
//                 <div className="flex flex-wrap gap-4">
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
//                     <span className="text-xs font-bold text-slate-600">Court order (documentation sighted)</span>
//                   </label>
//                   <label className="flex items-center gap-2 cursor-pointer">
//                     <input type="radio" name="legal_basis" checked={formData.legal_basis === 'Gillick'} onChange={() => handleInputChange('legal_basis', 'Gillick')} disabled={readOnly} />
//                     <span className="text-xs font-bold text-slate-600">Gillick-competent young person (recorded in notes)</span>
//                   </label>
//                 </div>
//               </div>
//               <div className="md:col-span-4 space-y-2">
//                 <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">If not a parent — evidence of legal guardianship sighted:</span>
//                 <div className="flex gap-4">
//                    <label className="flex items-center gap-2 cursor-pointer">
//                     <input type="radio" name="guardianship_sighted" checked={formData.guardianship_sighted === 'Yes'} onChange={() => handleInputChange('guardianship_sighted', 'Yes')} disabled={readOnly} />
//                     <span className="text-xs font-bold text-slate-600">Yes (describe)</span>
//                   </label>
//                   <label className="flex items-center gap-2 cursor-pointer">
//                     <input type="radio" name="guardianship_sighted" checked={formData.guardianship_sighted === 'Pending'} onChange={() => handleInputChange('guardianship_sighted', 'Pending')} disabled={readOnly} />
//                     <span className="text-xs font-bold text-slate-600">Pending (escalate before surgery)</span>
//                   </label>
//                 </div>
//               </div>
//               {renderTextInput("reason_cannot_consent", "Reason the patient cannot consent personally (age / clinical):", "md:col-span-4")}


//               <div className="md:col-span-4 space-y-3 mb-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
//                 {renderCheckbox("read_understood", "I have read, or had read to me, Parts A to L, and understand the benefits, risks and alternatives.", "col-span-1")}
//                 {renderCheckbox("risks_explained", "The benefits, risks and alternatives have been explained and I have had the opportunity to ask questions.", "col-span-1")}
//                 {renderCheckbox("individual_risks_accepted", "I understand and accept the risks described, including those relevant to my individual circumstances.", "col-span-1")}
//                 {renderCheckbox("modify_approach", "I understand the method of closing each defect (suture / autologous patch / prosthetic patch) and the PDA closure may be decided during the operation.", "col-span-1")}
//                 {renderCheckbox("withdraw_anytime", "I understand no guarantee of a particular result has been given, and I may withdraw consent at any time before the operation begins.", "col-span-1")}
//                 {renderCheckbox("additional_procedures_ack", "I consent to additional procedures judged immediately necessary to deal with an unexpected situation that cannot safely be deferred.", "col-span-1")}
//               </div>


//               {/* <div className="md:col-span-4 space-y-3 mb-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
//                 {renderCheckbox("read_understood_parent", "I have read, or had read to me, Parts A to L, and understand the benefits, risks and alternatives.", "col-span-1")}
//                 {renderCheckbox("questions_answered_parent", "I have had the opportunity to ask questions and understand no guarantee of result has been given.", "col-span-1")}
//                 {renderCheckbox("modify_approach_parent", "I understand the method of closing each defect (suture / autologous patch / prosthetic patch) and the PDA closure may be decided during the operation.", "col-span-1")}
//               </div> */}

//               <p className="md:col-span-4 font-black text-[#1e40af] text-sm uppercase text-center mb-2">I GIVE CONSENT on behalf of the patient, in their best interests, to the operation described.</p>

//               <div className="space-y-2 flex flex-col md:col-span-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">PARENT / GUARDIAN / LEGAL REPRESENTATIVE Signature</label>
//                 <div className="flex-grow min-h-[150px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
//                   {renderSignatureBox("parent_signature", "Parent/Guardian Signature")}
//                 </div>
//               </div>

//               {renderTextInput("parent_name_print", "Full name (print)", "md:col-span-2")}
//               {renderTextInput("parent_date", "Date", "md:col-span-1")}
//               {renderTextInput("parent_time", "Time", "md:col-span-1")}

//               <div className="space-y-2 flex flex-col md:col-span-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">CONSENTING CLINICIAN (confirming best interests) Signature</label>
//                 <div className="flex-grow min-h-[150px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
//                   {renderSignatureBox("confirming_clinician_signature", "Confirming Clinician Signature")}
//                 </div>
//               </div>

//               {renderTextInput("confirming_clinician_name", "Full name (print)", "md:col-span-2")}
//               {renderTextInput("confirming_clinician_date", "Date", "md:col-span-1")}
//               {renderTextInput("confirming_clinician_time", "Time", "md:col-span-1")}
//             </div>
//           </div>

//           {/* PART O */}
//           <div className="bg-white rounded-3xl p-6 shadow-xl border-t-8 border-orange-500 relative">
//             <h4 className="font-black text-slate-800 uppercase tracking-wider text-[10px] mb-4">PART O — RE-CONFIRMATION ON THE DAY OF SURGERY</h4>
//             <p className="text-xs text-slate-600 italic mb-4">To be completed by a member of the surgical team on the day of surgery, before the patient goes to theatre.</p>
//             <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
//               <div className="md:col-span-2 space-y-2">
//                 <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient/guardian confirms consent is unchanged:</span>
//                 <div className="flex gap-4">
//                   <label className="flex items-center gap-2 cursor-pointer">
//                     <input type="radio" name="consent_unchanged" checked={formData.consent_unchanged === 'Yes'} onChange={() => handleInputChange('consent_unchanged', 'Yes')} disabled={readOnly} />
//                     <span className="text-xs font-bold text-slate-600">Yes</span>
//                   </label>
//                   <label className="flex items-center gap-2 cursor-pointer">
//                     <input type="radio" name="consent_unchanged" checked={formData.consent_unchanged === 'No'} onChange={() => handleInputChange('consent_unchanged', 'No')} disabled={readOnly} />
//                     <span className="text-xs font-bold text-slate-600">Changes made (record below)</span>
//                     {/* <input type="radio" name="consent_unchanged" checked={formData.consent_unchanged === 'Changes made'} onChange={() => handleInputChange('consent_unchanged', 'Changes made')} disabled={readOnly} />
//                     <span className="text-xs font-bold text-slate-600">Changes made (record below)</span> */}
//                   </label>
//                 </div>
//               </div>
//               <div className="md:col-span-2 space-y-2">
//                 <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Weight re-checked and paediatric worksheet counter-signed (if child):</span>
//                 <div className="flex gap-4">
//                   <label className="flex items-center gap-2 cursor-pointer">
//                     <input type="radio" name="weight_rechecked" checked={formData.weight_rechecked === 'No'} onChange={() => handleInputChange('weight_rechecked', 'No')} disabled={readOnly} />
//                     <span className="text-xs font-bold text-slate-600">N/A</span>
//                     {/* <input type="radio" name="weight_rechecked" checked={formData.weight_rechecked === 'Yes'} onChange={() => handleInputChange('weight_rechecked', 'Yes')} disabled={readOnly} />
//                     <span className="text-xs font-bold text-slate-600">Yes</span> */}
//                   </label>
//                   <label className="flex items-center gap-2 cursor-pointer">
//                     <input type="radio" name="weight_rechecked" checked={formData.weight_rechecked === 'N/A'} onChange={() => handleInputChange('weight_rechecked', 'N/A')} disabled={readOnly} />
//                     <span className="text-xs font-bold text-slate-600">N/A</span>
//                   </label>
//                 </div>
//               </div>
//               {renderTextarea("changes_to_wishes", "Changes to wishes, if any:", "md:col-span-4")}
//               {renderTextInput("confirming_surgeon_details", "Confirming surgeon — name / signature / date / time:", "md:col-span-4")}
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
//             <>
//               <button
//                 onClick={handleSaveDraft}
//                 disabled={submitting}
//                 className="bg-amber-500 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-[0.1em] text-sm shadow-xl hover:bg-amber-600 transition-all flex items-center gap-2 disabled:opacity-50"
//               >
//                 {submitting ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
//                 {submitting ? "Saving..." : "Save Draft"}
//               </button>

//               <button
//                 onClick={handleSubmit}
//                 disabled={submitting}
//                 className="bg-[#1e40af] text-white px-10 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50 disabled:grayscale disabled:scale-100"
//               >
//                 {submitting ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
//                 {submitting ? "Finalizing..." : "Submit Consent"}
//               </button>
//             </>
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

// export default AsdPdaRepairConsentForm;
