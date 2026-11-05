import React, { useState, useEffect, useRef } from "react";
import { FileText, CheckCircle, Loader2, Printer, AlertCircle, Save } from "lucide-react";
import { consentService, ConsentTemplate } from "../../services/consent.service";
import SignaturePad from "../SignaturePad";
import { useAuth } from "../../context/AuthContext";
import { useNotification } from "../../context/NotificationContext";
import { BASE_URL } from "../../api/client";
import { patientService } from "../../services/patient.service";
import { createPortal } from "react-dom";
import { formDraftService } from "../../services/session-restore.service";

interface ChemicalPleurodesisConsentFormProps {
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
  templateSlug?: string;
}

const ChemicalPleurodesisConsentForm: React.FC<ChemicalPleurodesisConsentFormProps> = ({
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
  templateSlug = "chemical_pleurodesis",
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

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getInputClass = (fieldName: string, isTextarea = false) => {
    const baseClass = isTextarea 
      ? `w-full border-2 rounded-xl px-4 py-2 font-bold transition-all outline-none resize-none`
      : `w-full border-2 rounded-xl px-4 py-2 font-bold transition-all outline-none`;
      
    if (readOnly) {
      return `${baseClass} bg-slate-100 border-slate-200 text-slate-800`;
    }
    
    if (formErrors.includes(fieldName)) {
      return `${baseClass} bg-red-50 border-red-500 text-red-900 focus:border-red-600 focus:ring-1 focus:ring-red-500`;
    }
    
    return `${baseClass} bg-white border-slate-200 text-slate-800 focus:border-[#1e40af]`;
  };

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

  const [formData, setFormData] = useState<any>(viewData || initialData || {
    // Part A
    patient_name: patientName,
    dob: "",
    mrn: mrn,
    age_sex: "",
    consultant: "",
    ward: "",
    primary_diagnosis: "",
    planned_approach: "",
    site_side: "",
    planned_date: "",
    // Part C
    expected_outcomes: "",
    // Part D
    individual_risks: "",
    // Part E
    alternatives_discussed: "",
    // Part E2
    sclerosant_agent: "",
    dose_concentration: "",
    diluent_volume: "",
    intrapleural_anaesthetic_dose: "",
    agent_specific_risks: "",
    // Part E3
    intrapleural_explained: false,
    repeat_explained: false,
    alternatives_explained: false,
    discussion_notes: "",
    // Part F
    anaesthesia_type: "",
    // Part G
    additional_procedures_consented: "",
    procedures_declined: "",
    blood_transfusion: "",
    tissue_specimens: false,
    clinical_photography: "",
    // Part H
    discussion_language: "",
    interpreter_used: "",
    interpreter_name: "",
    interpreter_designation: "",
    interpreter_signature: null,
    interpreter_date: "",
    // Part I
    clinician_name: "",
    clinician_designation: "",
    clinician_signature: null,
    clinician_date: "",
    second_clinician_name: "",
    second_clinician_designation: "",
    second_clinician_signature: null,
    // Part J
    additional_clinician_notes: "",
    // Part K
    read_understood: false,
    risks_explained: false,
    individual_risks_accepted: false,
    modify_approach: false,
    anaesthesia_consent: false,
    withdraw_consent_ack: false,
    additional_procedures_ack: false,
    patient_signature: null,
    patient_date: "",
    witness_name: "",
    witness_signature: null,
    // Part L
    parent_guardian_name: "",
    relationship: "",
    legal_basis: "",
    parent_signature: null,
    parent_date: "",
    clinician_confirming_signature: null,
    // Part M
    confirming_clinician_name: "",
    confirming_clinician_signature: null,
    withdrawal_patient_signature: null,
    withdrawal_patient_name: "",
    withdrawal_clinician_name: "",
    withdrawal_clinician_signature: null,
  });

  // FIX: Ensure viewData or initialData syncs properly into state on Read-Only views
  useEffect(() => {
    if (viewData || initialData) {
      setFormData((prev: any) => ({ ...prev, ...(viewData || initialData) }));
    }
  }, [viewData, initialData]);

  // 1. Initial Data Fetch & Local Draft Restoration
  useEffect(() => {
    if (!readOnly && mrn && !viewData && !initialData) {
      
      const localDraftId = `consent_chemical_pleurodesis_${orderId}`;
      const savedDraft = user?.id ? formDraftService.loadDraft<any>(user.id, localDraftId) : null;
      
      if (savedDraft) {
        setFormData(savedDraft);
        notify("Restored unsaved changes from your previous session", "success");
        return; 
      }

      const fetchPatientDetails = async () => {
        setLoading(true);
        try {
          const patient = await patientService.getPatientByMrn(mrn);
          if (patient) {
            setFormData((prev: any) => ({
              ...prev,
              dob: patient.demographics?.date_of_birth || prev.dob,
              age_sex: `${patient.demographics?.age || ""} / ${patient.demographics?.gender || ""}`,
            }));
          }
        } catch (err) {
          console.error("Failed to fetch patient details for consent pre-fill", err);
        } finally {
          setLoading(false);
        }
      };
      
      fetchPatientDetails();
    }
  }, [mrn, readOnly, viewData, initialData, orderId, user?.id]);

  // 2. Local Auto-Save Loop
  useEffect(() => {
    if (readOnly || !orderId || !user?.id) return;
    
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    
    autoSaveTimerRef.current = setTimeout(() => {
      const localDraftId = `consent_chemical_pleurodesis_${orderId}`;
      formDraftService.saveDraft(user.id!, localDraftId, formData);
    }, 1500);
    
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
  }, [formData, orderId, user?.id, readOnly]);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  // 3. Save as Backend Draft Handler
  const handleSaveDraft = async () => {
    setSubmitting(true);
    try {
      await consentService.createConsent({
        order_id: orderId,
        template_slug: templateSlug,
        witness_user_id: user?.id || 0,
        form_data: formData,
        is_draft: true,
        consent_id: draftId,
      });
      notify("Draft saved successfully to the system", "success");
      
      if (user?.id) formDraftService.clearDraft(user.id, `consent_chemical_pleurodesis_${orderId}`);
      
      onCancel(); 
    } catch (error: any) {
      notify(error.response?.data?.message || error.message || "Failed to save draft", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Finalizing and Submitting Consent Handler
  const handleSubmit = async () => {
    const requiredFields = [
      { key: "patient_name", label: "Patient Full Name" },
      { key: "dob", label: "Date of Birth" },
      { key: "consultant", label: "Consultant / Responsible Surgeon" },
      { key: "ward", label: "Ward / Unit" },
      { key: "primary_diagnosis", label: "Primary Diagnosis / Indication" },
      { key: "sclerosant_agent", label: "Sclerosant / Agent to be used" },
    ];

    let missingKeys = requiredFields.filter(f => !formData[f.key]).map(f => f.key);
    let missingLabels = requiredFields.filter(f => !formData[f.key]).map(f => f.label);

    if (!formData.clinician_name || !formData.clinician_signature) {
      if (!formData.clinician_name) { missingKeys.push("clinician_name"); missingLabels.push("Clinician Name"); }
      if (!formData.clinician_signature) { missingKeys.push("clinician_signature"); missingLabels.push("Clinician Signature"); }
    }
    
    if (!formData.patient_signature && !formData.parent_signature) {
      missingKeys.push("patient_signature");
      missingLabels.push("Patient/Parent Signature");
    }

    if (missingKeys.length > 0) {
      setFormErrors(missingKeys);
      notify(`Please fill in required fields: ${missingLabels.join(', ')}`, "error");
      
      setTimeout(() => {
        const firstErrorEl = document.querySelector('.border-red-500');
        if (firstErrorEl) {
          firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return;
    }
    
    setFormErrors([]);
    setSubmitting(true);
    try {
      const payloadFormData = {
        ...formData,
        clinician_signature: formData.clinician_signature,
        patient_signature: formData.patient_signature || formData.parent_signature,
        nurse_signature: formData.witness_signature || "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
      };

      const payload = {
        order_id: orderId,
        template_slug: templateSlug,
        workflow_stage: "SIGNED_AND_CHECKED",
        witness_user_id: user?.id || 0,
        form_data: payloadFormData,
        consent_id: draftId,
      };
      
      await consentService.createConsent(payload);
      notify("Consent form submitted successfully", "success");
      
      if (user?.id) formDraftService.clearDraft(user.id, `consent_chemical_pleurodesis_${orderId}`);

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

  return (
    <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-[#1e40af] text-white p-10 flex justify-between items-center relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#1e40af]/30 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="z-10">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
              <img src="/assets/login-bg.jpeg" alt="Gracespring Hospitals" className="w-10 h-10 object-contain" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter">Procedure Consent Form</h1>
              <p className="text-[#93c5fd] font-bold text-sm">Chest-Tube Chemical Pleurodesis</p>
            </div>
          </div>
          <p className="text-xs text-[#93c5fd]/80 font-medium">Form Ref: GSH-CONSENT-PLEU-001 • Policy Ref: GSH-T6 • Version 1.0</p>
        </div>
        <div className="text-right z-10 flex flex-col items-end gap-3">
          <div className="hidden md:block text-right">
            <p className="text-[10px] text-[#93c5fd] font-bold leading-tight uppercase tracking-wider">Gracespring Hospitals</p>
            <p className="text-[10px] text-[#93c5fd]">+234 705 648 2776 • admin@gracespringhospitals.com</p>
          </div>
          <button 
            onClick={onPrint}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/20 transition-all"
          >
            <Printer size={14} /> Print Blank Form
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar bg-white">
        
        {/* Patient Rights */}
        <section>
          <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-amber-200/50 px-4 py-1 rounded-bl-xl text-[10px] font-black text-amber-800 uppercase tracking-wider">Patient Rights</div>
            <p className="text-sm text-amber-900 font-medium leading-relaxed italic">
              "You have the right to make decisions about your medical care and to refuse any procedure. If you wish to withdraw consent at any time before the procedure begins, you may do so. Signing this form does not remove your legal rights. This form complies with the National Health Act 2014 (Nigeria) and Gracespring Hospitals Consent Policy (GSH-T6)."
            </p>
          </div>
        </section>

        {/* Part A - Patient Identification */}
        <section>
          <div className="bg-[#1e40af] text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part A — Patient Identification</div>
          <div className="border-4 border-slate-900 rounded-3xl p-8 grid grid-cols-1 md:grid-cols-4 gap-8 shadow-inner bg-slate-50 relative">
            <PartWarning fields={["patient_name", "dob", "mrn", "consultant", "ward", "primary_diagnosis"]} />
            <div className="md:col-span-2 space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient Full Name *</label>
              <input 
                type="text" 
                value={formData.patient_name} 
                onChange={(e) => { handleInputChange("patient_name", e.target.value); setFormErrors(prev => prev.filter(f => f !== "patient_name")); }}
                readOnly={readOnly}
                className={getInputClass("patient_name")}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Date of Birth *</label>
              <input 
                type="date" 
                value={formData.dob} 
                onChange={(e) => { handleInputChange("dob", e.target.value); setFormErrors(prev => prev.filter(f => f !== "dob")); }}
                readOnly={readOnly}
                className={getInputClass("dob")}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">MRN *</label>
              <input 
                type="text" 
                value={formData.mrn} 
                className="w-full bg-slate-100 border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-500"
                readOnly
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Age / Sex</label>
              <input 
                type="text" 
                value={formData.age_sex} 
                onChange={(e) => handleInputChange("age_sex", e.target.value)}
                readOnly={readOnly}
                className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Consultant / Responsible Surgeon *</label>
              <input 
                type="text" 
                value={formData.consultant} 
                onChange={(e) => { handleInputChange("consultant", e.target.value); setFormErrors(prev => prev.filter(f => f !== "consultant")); }}
                readOnly={readOnly}
                className={getInputClass("consultant")}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Ward / Unit *</label>
              <input 
                type="text" 
                value={formData.ward} 
                onChange={(e) => { handleInputChange("ward", e.target.value); setFormErrors(prev => prev.filter(f => f !== "ward")); }}
                readOnly={readOnly}
                className={getInputClass("ward")}
              />
            </div>
            <div className="md:col-span-4 space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Primary Diagnosis / Indication *</label>
              <textarea 
                rows={2}
                value={formData.primary_diagnosis}
                onChange={(e) => { handleInputChange("primary_diagnosis", e.target.value); setFormErrors(prev => prev.filter(f => f !== "primary_diagnosis")); }}
                placeholder="e.g. recurrent / malignant pleural effusion; recurrent or persistent pneumothorax; symptomatic re-accumulation despite drainage"
                readOnly={readOnly}
                className={getInputClass("primary_diagnosis", true)}
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Planned Surgical Approach</label>
              <div className="grid grid-cols-1 gap-2 p-3 bg-white border-2 border-slate-200 rounded-xl">
                {["Via existing chest drain", "Chest drain inserted for the procedure", "Decision at the bedside"].map(type => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="radio" 
                      name="planned_approach" 
                      checked={formData.planned_approach === type} 
                      onChange={() => handleInputChange("planned_approach", type)}
                      disabled={readOnly}
                      className="w-4 h-4 text-[#1e40af] focus:ring-[#1e40af]"
                    />
                    <span className="text-xs font-bold text-slate-600 group-hover:text-[#1e40af] transition-colors">{type}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Site / Side</label>
              <div className="grid grid-cols-1 gap-2 p-3 bg-white border-2 border-slate-200 rounded-xl">
                {["Left", "Right", "N/A"].map(type => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="radio" 
                      name="site_side" 
                      checked={formData.site_side === type} 
                      onChange={() => handleInputChange("site_side", type)}
                      disabled={readOnly}
                      className="w-4 h-4 text-[#1e40af] focus:ring-[#1e40af]"
                    />
                    <span className="text-xs font-bold text-slate-600 group-hover:text-[#1e40af] transition-colors">{type}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Planned Date</label>
              <input 
                type="date" 
                value={formData.planned_date} 
                onChange={(e) => handleInputChange("planned_date", e.target.value)}
                readOnly={readOnly}
                className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
              />
            </div>
          </div>
        </section>

        {/* Part B */}
        <section>
          <div className="bg-[#334155] text-white px-4 py-1 inline-block rounded-t-xl text-[10px] font-black uppercase tracking-widest mb-0 ml-4">Part B — Description of the Procedure</div>
          <div className="border-4 border-slate-900 rounded-3xl p-6 bg-slate-50 space-y-4 relative">
             <h4 className="font-black text-slate-900 uppercase tracking-widest text-sm">WHAT THE PROCEDURE INVOLVES</h4>
             <p className="text-sm text-slate-700 font-medium leading-relaxed">
               Through a chest drain, local anaesthetic is first instilled into the pleural space to reduce pain, followed by the sclerosing agent mixed with saline. This deliberately irritates and inflames the two layers of the lung lining (pleura) so that they stick together and seal the space, stopping fluid or air from re-accumulating.
             </p>
             <h4 className="font-black text-slate-900 uppercase tracking-widest text-sm">HOW IT IS PERFORMED AT GRACESPRING HOSPITALS</h4>
             <p className="text-sm text-slate-700 font-medium leading-relaxed">
               A chest drain is confirmed to be correctly positioned (or is inserted first), and a chest X-ray confirms the lung has re-expanded. Local anaesthetic (e.g. lidocaine) is instilled through the drain into the pleural space to reduce discomfort. The sclerosing agent mixed with saline is instilled through the drain. The drain is clamped for a period and the patient may be repositioned to spread the agent across the pleural surfaces. The drain is unclamped and left on drainage/suction; it is removed once output is low and a chest X-ray is satisfactory.
             </p>
          </div>
        </section>

        {/* Part C */}
        <section>
          <div className="bg-[#1e293b] text-white px-4 py-1 inline-block rounded-t-xl text-[10px] font-black uppercase tracking-widest mb-0 ml-4">Part C — Intended Benefits & Goals</div>
          <div className="border-4 border-slate-900 rounded-3xl p-6 bg-slate-50 relative">
             <PartWarning fields={["expected_outcomes"]} />
             <p className="text-sm text-slate-700 font-medium leading-relaxed mb-4">
               Successful pleurodesis prevents repeated fluid build-up or lung collapse, relieves breathlessness, reduces the need for repeated drainage procedures and hospital admissions, and improves quality of life — particularly important in recurrent or malignant effusions.
             </p>
             <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Specific goals / expected outcome discussed with this patient</label>
             <textarea 
               rows={3}
               value={formData.expected_outcomes}
               onChange={(e) => handleInputChange("expected_outcomes", e.target.value)}
               readOnly={readOnly}
               className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
             />
          </div>
        </section>

        {/* Part D */}
        <section>
          <div className="bg-[#be123c] text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part D — Risks & Complications</div>
          <div className="border-4 border-slate-900 rounded-3xl overflow-hidden shadow-xl mb-4">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest border-r border-slate-700">Frequency</th>
                  <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest border-r border-slate-700">Risk / Complication</th>
                  <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest">Additional Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {[
                  ["VERY COMMON / COMMON", "Chest pain and discomfort during and after instillation; fever and flu-like symptoms for 24–48 hours.", "Pre-medication, local anaesthetic and analgesia; fever usually settles."],
                  ["COMMON", "Incomplete or failed pleurodesis needing a repeat procedure or an alternative; drain-site discomfort.", "May repeat pleurodesis or consider other options."],
                  ["UNCOMMON", "Wound or pleural infection (empyema); drain blockage or displacement; localised skin reaction.", "Antibiotics; drain re-siting as needed."],
                  ["UNCOMMON", "Breathlessness from fluid shifts; low blood pressure during the procedure.", "Monitoring and supportive management."],
                  ["RARE", "Re-expansion pulmonary oedema; injury to the lung; significant bleeding (haemothorax); acute respiratory distress (ARDS) – more associated with talc than other agents.", "Careful technique and monitoring; managed actively if it occurs."],
                  ["RARE", "Allergic reaction to the sclerosing agent or local anaesthetic.", "Emergency treatment available."],
                  ["VERY RARE", "Life-threatening complication or death.", "Mitigated by careful technique and monitoring."]
                ].map((row, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="px-6 py-4 text-xs font-black text-[#be123c] border-r border-slate-200">{row[0]}</td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-700 border-r border-slate-200">{row[1]}</td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-500 italic">{row[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-4 border-slate-900 rounded-3xl p-6 bg-slate-50 relative">
             <PartWarning fields={["individual_risks"]} />
             <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Risks specific to THIS patient (e.g. comorbidities, age/weight, anticoagulation, sickle-cell status, pregnancy, prior surgery, malignant vs benign effusion, lung re-expansion status, frailty, renal/hepatic function):</label>
             <textarea 
               rows={3}
               value={formData.individual_risks}
               onChange={(e) => handleInputChange("individual_risks", e.target.value)}
               readOnly={readOnly}
               className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
             />
          </div>
        </section>

        {/* Part E */}
        <section>
          <div className="bg-[#ea580c] text-white px-4 py-1 inline-block rounded-t-xl text-[10px] font-black uppercase tracking-widest mb-0 ml-4">Part E — Alternatives to the Proposed Procedure</div>
          <div className="border-4 border-slate-900 rounded-3xl overflow-hidden shadow-xl mb-4">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest border-r border-slate-700">Alternative Option</th>
                  <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest border-r border-slate-700">Description</th>
                  <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest">Limitations / Why it may not suit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {[
                  ["Repeated drainage (as needed)", "Draining fluid/air each time it re-accumulates.", "Temporary; repeated procedures; does not prevent recurrence."],
                  ["Indwelling pleural catheter (IPC)", "A tunnelled catheter for ongoing home drainage, especially for malignant effusions.", "Long-term catheter care; infection risk; does not always cause pleurodesis."],
                  ["Thoracoscopic (VATS) pleurodesis / poudrage", "Surgical pleurodesis under anaesthetic.", "More invasive; reserved for selected patients; own risks."],
                  ["Different sclerosing agent", "An alternative agent instilled via the drain.", "Choice individualised; each agent has its own risk profile (e.g. talc – ARDS)."],
                  ["No treatment", "Declining pleurodesis.", "Recurrent effusion / pneumothorax with ongoing breathlessness and repeated procedures."]
                ].map((row, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="px-6 py-4 text-xs font-black text-[#ea580c] border-r border-slate-200">{row[0]}</td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-700 border-r border-slate-200">{row[1]}</td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-500 italic">{row[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-4 border-slate-900 rounded-3xl p-6 bg-slate-50 relative">
             <PartWarning fields={["alternatives_discussed"]} />
             <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Alternatives discussed with this patient and what is likely to happen with no treatment:</label>
             <textarea 
               rows={3}
               value={formData.alternatives_discussed}
               onChange={(e) => handleInputChange("alternatives_discussed", e.target.value)}
               readOnly={readOnly}
               className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
             />
          </div>
        </section>

        {/* Part E2 */}
        <section>
          <div className="bg-[#ea580c] text-white px-4 py-1 inline-block rounded-t-xl text-[10px] font-black uppercase tracking-widest mb-0 ml-4">Part E2 — Sclerosant (Pleurodesis Agent)</div>
          <div className="border-4 border-slate-900 rounded-3xl p-8 grid grid-cols-1 md:grid-cols-2 gap-8 shadow-inner bg-slate-50 relative">
             <PartWarning fields={["sclerosant_agent"]} />
             <div className="space-y-2">
               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Sclerosant / Agent to be used *</label>
               <input 
                 type="text" 
                 value={formData.sclerosant_agent} 
                 onChange={(e) => { handleInputChange("sclerosant_agent", e.target.value); setFormErrors(prev => prev.filter(f => f !== "sclerosant_agent")); }}
                 readOnly={readOnly}
                 className={getInputClass("sclerosant_agent")}
               />
             </div>
             <div className="space-y-2">
               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Dose / Concentration</label>
               <input 
                 type="text" 
                 value={formData.dose_concentration} 
                 onChange={(e) => handleInputChange("dose_concentration", e.target.value)}
                 readOnly={readOnly}
                 className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
               />
             </div>
             <div className="space-y-2">
               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Diluent & Volume (e.g. saline)</label>
               <input 
                 type="text" 
                 value={formData.diluent_volume} 
                 onChange={(e) => handleInputChange("diluent_volume", e.target.value)}
                 readOnly={readOnly}
                 className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
               />
             </div>
             <div className="space-y-2">
               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Intrapleural Local Anaesthetic (Drug & Dose)</label>
               <input 
                 type="text" 
                 value={formData.intrapleural_anaesthetic_dose} 
                 onChange={(e) => handleInputChange("intrapleural_anaesthetic_dose", e.target.value)}
                 readOnly={readOnly}
                 className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
               />
             </div>
             <div className="md:col-span-2 space-y-2">
               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Agent-specific risks discussed with the patient (e.g. talc – higher ARDS risk; bleomycin – systemic effects):</label>
               <textarea 
                 rows={2}
                 value={formData.agent_specific_risks}
                 onChange={(e) => handleInputChange("agent_specific_risks", e.target.value)}
                 readOnly={readOnly}
                 className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
               />
             </div>
          </div>
        </section>

        {/* Part E3 */}
        <section>
          <div className="bg-[#ea580c] text-white px-4 py-1 inline-block rounded-t-xl text-[10px] font-black uppercase tracking-widest mb-0 ml-4">Part E3 — Pain Relief & Repeat Pleurodesis</div>
          <div className="border-4 border-slate-900 rounded-3xl p-6 bg-slate-50 relative">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
               {[
                 { id: "intrapleural_explained", label: "Intrapleural local anaesthetic explained" },
                 { id: "repeat_explained", label: "Possibility of repeat pleurodesis explained" },
                 { id: "alternatives_explained", label: "Alternative agents/approaches explained" }
               ].map(item => (
                 <label key={item.id} className="flex items-start gap-3 p-4 bg-white border-2 border-slate-200 rounded-2xl cursor-pointer">
                   <input 
                     type="checkbox" 
                     checked={formData[item.id]} 
                     onChange={(e) => handleInputChange(item.id, e.target.checked)}
                     disabled={readOnly}
                     className="mt-1 w-5 h-5 text-[#ea580c] rounded focus:ring-[#ea580c]"
                   />
                   <span className="text-xs font-bold text-slate-700 leading-tight">{item.label}</span>
                 </label>
               ))}
             </div>
             <div className="space-y-2">
               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Discussion about agent choice, pain relief and likelihood of success:</label>
               <textarea 
                 rows={3}
                 value={formData.discussion_notes}
                 onChange={(e) => handleInputChange("discussion_notes", e.target.value)}
                 readOnly={readOnly}
                 className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
               />
             </div>
          </div>
        </section>

        {/* Part F */}
        <section>
           <div className="bg-[#475569] text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part F — Anaesthesia & Sedation</div>
           <div className="border-4 border-slate-900 rounded-3xl p-6 bg-slate-50 space-y-4 relative">
              <PartWarning fields={["anaesthesia_type"]} />
              <p className="text-xs font-bold text-slate-500 mb-4">Anaesthesia will be discussed and provided by the anaesthetist. Planned for this procedure:</p>
              <div className="grid grid-cols-1 gap-3">
                {["Local anaesthesia (intrapleural + drain site)", "Local anaesthesia with sedation", "Systemic analgesia / pre-medication"].map(type => (
                  <label key={type} className="flex items-center gap-3 p-3 bg-white border-2 border-slate-200 rounded-xl cursor-pointer group">
                    <input 
                      type="radio" 
                      name="anaesthesia_type" 
                      checked={formData.anaesthesia_type === type} 
                      onChange={() => handleInputChange("anaesthesia_type", type)}
                      disabled={readOnly}
                      className="w-5 h-5 text-[#1e40af] focus:ring-[#1e40af]"
                    />
                    <span className="text-sm font-bold text-slate-600 group-hover:text-[#1e40af] transition-colors">{type}</span>
                  </label>
                ))}
              </div>
           </div>
        </section>

        {/* Part G */}
        <section>
          <div className="bg-[#475569] text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part G — Additional Procedures, Blood & Tissue</div>
          <div className="border-4 border-slate-900 rounded-3xl p-8 grid grid-cols-1 md:grid-cols-2 gap-8 shadow-inner bg-slate-50 relative">
             <p className="text-xs font-bold text-slate-500 col-span-1 md:col-span-2">During the procedure the team may find conditions needing additional or different procedures not foreseen at consent. These will only be done if necessary to save life or prevent serious harm, in the patient's best interests.</p>
             <div className="md:col-span-2 space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Additional procedures consented to if needed (write ‘none’ if not applicable):</label>
                <textarea 
                  rows={2}
                  value={formData.additional_procedures_consented}
                  onChange={(e) => handleInputChange("additional_procedures_consented", e.target.value)}
                  readOnly={readOnly}
                  className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
                />
             </div>
             <div className="md:col-span-2 space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Procedures NOT to be carried out under any circumstances:</label>
                <textarea 
                  rows={2}
                  value={formData.procedures_declined}
                  onChange={(e) => handleInputChange("procedures_declined", e.target.value)}
                  readOnly={readOnly}
                  className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
                />
             </div>
             <div className="space-y-2">
               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Consent to transfusion of blood / blood products if clinically required</label>
               <div className="grid grid-cols-1 gap-2 p-3 bg-white border-2 border-slate-200 rounded-xl">
                 {["Consents", "Declines (record reason / advance directive)", "Discuss"].map(type => (
                   <label key={type} className="flex items-center gap-2 cursor-pointer group">
                     <input 
                       type="radio" 
                       name="blood_transfusion" 
                       checked={formData.blood_transfusion === type} 
                       onChange={() => handleInputChange("blood_transfusion", type)}
                       disabled={readOnly}
                       className="w-4 h-4 text-[#1e40af] focus:ring-[#1e40af]"
                     />
                     <span className="text-[11px] font-bold text-slate-600 group-hover:text-[#1e40af] transition-colors">{type}</span>
                   </label>
                 ))}
               </div>
             </div>
             <div className="space-y-2">
               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Clinical photography & video</label>
               <div className="grid grid-cols-1 gap-2 p-3 bg-white border-2 border-slate-200 rounded-xl">
                 {["Consents – for clinical record", "Consents – anonymised teaching / training / audit", "Declines"].map(type => (
                   <label key={type} className="flex items-center gap-2 cursor-pointer group">
                     <input 
                       type="radio" 
                       name="clinical_photography" 
                       checked={formData.clinical_photography === type} 
                       onChange={() => handleInputChange("clinical_photography", type)}
                       disabled={readOnly}
                       className="w-4 h-4 text-[#1e40af] focus:ring-[#1e40af]"
                     />
                     <span className="text-[11px] font-bold text-slate-600 group-hover:text-[#1e40af] transition-colors">{type}</span>
                   </label>
                 ))}
               </div>
             </div>
             <div className="col-span-1 md:col-span-2">
                <label className="flex items-start gap-3 p-4 bg-white border-2 border-slate-200 rounded-2xl cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formData.tissue_specimens} 
                    onChange={(e) => handleInputChange("tissue_specimens", e.target.checked)}
                    disabled={readOnly}
                    className="mt-1 w-5 h-5 text-[#1e40af] rounded focus:ring-[#1e40af]"
                  />
                  <span className="text-xs font-bold text-slate-700 leading-tight">Consents to removed tissue handled per policy; device/brand & NAFDAC Reg. No.</span>
                </label>
             </div>
          </div>
        </section>

        {/* Part H */}
        <section>
           <div className="bg-[#475569] text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part H — Language, Interpretation & Capacity</div>
           <div className="border-4 border-slate-900 rounded-3xl p-6 bg-slate-50 space-y-4 relative">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Language of discussion</label>
                   <input 
                     type="text" 
                     value={formData.discussion_language} 
                     onChange={(e) => handleInputChange("discussion_language", e.target.value)}
                     readOnly={readOnly}
                     className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
                   />
                </div>
                <div className="space-y-2">
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Interpreter used?</label>
                   <div className="flex gap-4 p-3 bg-white border-2 border-slate-200 rounded-xl">
                     {["No", "Yes"].map(type => (
                       <label key={type} className="flex items-center gap-2 cursor-pointer group">
                         <input 
                           type="radio" 
                           name="interpreter_used" 
                           checked={formData.interpreter_used === type} 
                           onChange={() => handleInputChange("interpreter_used", type)}
                           disabled={readOnly}
                           className="w-4 h-4 text-[#1e40af] focus:ring-[#1e40af]"
                         />
                         <span className="text-[11px] font-bold text-slate-600 group-hover:text-[#1e40af] transition-colors">{type}</span>
                       </label>
                     ))}
                   </div>
                </div>
                <div className="space-y-2">
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Interpreter Full Name</label>
                   <input 
                     type="text" 
                     value={formData.interpreter_name} 
                     onChange={(e) => handleInputChange("interpreter_name", e.target.value)}
                     readOnly={readOnly}
                     className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
                   />
                </div>
                <div className="space-y-2">
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Designation / Bleep</label>
                   <input 
                     type="text" 
                     value={formData.interpreter_designation} 
                     onChange={(e) => handleInputChange("interpreter_designation", e.target.value)}
                     readOnly={readOnly}
                     className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
                   />
                </div>
                <div className="space-y-2 flex-grow flex flex-col">
                  <div className="flex-grow min-h-[250px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-white">
                    {readOnly ? (
                      <div className="h-full w-full flex items-center justify-center p-2">
                        {formData.interpreter_signature ? (
                          <img src={getSigUrl(formData.interpreter_signature)} alt="Interpreter Signature" className="max-h-full max-w-full object-contain" />
                        ) : (
                          <span className="text-slate-300 font-bold uppercase text-xs">No Signature</span>
                        )}
                      </div>
                    ) : (
                      <SignaturePad 
                        onEnd={(data) => handleInputChange("interpreter_signature", data)}
                        onClear={() => handleInputChange("interpreter_signature", null)}
                        className="h-full w-full"
                      />
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold italic text-center mt-2">Interpreter Signature</p>
                </div>
                <div className="space-y-2">
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Date / Time</label>
                   <input 
                     type="datetime-local" 
                     value={formData.interpreter_date} 
                     onChange={(e) => handleInputChange("interpreter_date", e.target.value)}
                     readOnly={readOnly}
                     className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
                   />
                </div>
              </div>
           </div>
        </section>

        {/* Part I & J */}
        <section className="space-y-12 bg-slate-900 p-10 rounded-[3rem] shadow-2xl">
          <h3 className="text-center text-white font-black uppercase tracking-[0.5em] text-xl mb-12">Final Declarations & Signatures</h3>
          
          {/* Clinician Declaration */}
          <div className="bg-white rounded-3xl p-6 shadow-xl border-t-8 border-[#1e40af] relative flex flex-col">
            <PartWarning fields={["clinician_signature", "clinician_name"]} />
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-[#1e40af] font-black">I</div>
              <h4 className="font-black text-slate-800 uppercase tracking-wider text-[10px]">Declaration of Consenting Clinician</h4>
            </div>
            <p className="text-xs text-slate-600 font-bold mb-6 italic border-l-4 border-blue-300 pl-4">
              I confirm I have explained the procedure and its purpose, the intended benefits, the material risks (serious and frequent), the risks specific to this patient, and the reasonable alternatives including no treatment. I have answered questions honestly, provided any relevant leaflet, and I am satisfied the patient (or parent/guardian) has capacity and consents voluntarily. I have appropriate knowledge of this procedure.
            </p>
            <div className="space-y-4 mb-6">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Part J — Additional Clinician Notes</label>
              <textarea 
                rows={2}
                value={formData.additional_clinician_notes}
                onChange={(e) => handleInputChange("additional_clinician_notes", e.target.value)}
                readOnly={readOnly}
                className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2 flex flex-col">
                <div className="flex-grow min-h-[250px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
                  {readOnly ? (
                    <div className="h-full w-full flex items-center justify-center p-2">
                      {formData.clinician_signature ? (
                        <img src={getSigUrl(formData.clinician_signature)} alt="Clinician Signature" className="max-h-full max-w-full object-contain" />
                      ) : (
                        <span className="text-slate-300 font-bold uppercase text-xs">No Signature</span>
                      )}
                    </div>
                  ) : (
                    <SignaturePad 
                      onEnd={(data) => handleInputChange("clinician_signature", data)}
                      onClear={() => handleInputChange("clinician_signature", null)}
                      className="h-full w-full"
                    />
                  )}
                </div>
                <div className="mt-4 space-y-3">
                   <div className="space-y-1">
                      <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest text-center">Consenting Clinician Name *</p>
                      <input type="text" value={formData.clinician_name} onChange={(e) => handleInputChange("clinician_name", e.target.value)} readOnly={readOnly} className={`w-full border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-center outline-none transition-all ${readOnly ? "bg-slate-100" : "bg-slate-50 focus:border-[#1e40af]"}`} />
                   </div>
                   <div className="space-y-1">
                      <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest text-center">Designation / Bleep</p>
                      <input type="text" value={formData.clinician_designation} onChange={(e) => handleInputChange("clinician_designation", e.target.value)} readOnly={readOnly} className={`w-full border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-center outline-none transition-all ${readOnly ? "bg-slate-100" : "bg-slate-50 focus:border-[#1e40af]"}`} />
                   </div>
                   <div className="space-y-1">
                      <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest text-center">Date / Time</p>
                      <input type="datetime-local" value={formData.clinician_date} onChange={(e) => handleInputChange("clinician_date", e.target.value)} readOnly={readOnly} className={`w-full border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-center outline-none transition-all ${readOnly ? "bg-slate-100" : "bg-slate-50 focus:border-[#1e40af]"}`} />
                   </div>
                </div>
              </div>

              <div className="space-y-2 flex flex-col">
                <div className="flex-grow min-h-[250px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
                  {readOnly ? (
                    <div className="h-full w-full flex items-center justify-center p-2">
                      {formData.second_clinician_signature ? (
                        <img src={getSigUrl(formData.second_clinician_signature)} alt="Second Clinician Signature" className="max-h-full max-w-full object-contain" />
                      ) : (
                        <span className="text-slate-300 font-bold uppercase text-xs">No Signature</span>
                      )}
                    </div>
                  ) : (
                    <SignaturePad 
                      onEnd={(data) => handleInputChange("second_clinician_signature", data)}
                      onClear={() => handleInputChange("second_clinician_signature", null)}
                      className="h-full w-full"
                    />
                  )}
                </div>
                <div className="mt-4 space-y-3">
                   <div className="space-y-1">
                      <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest text-center">Second Clinician Name</p>
                      <input type="text" value={formData.second_clinician_name} onChange={(e) => handleInputChange("second_clinician_name", e.target.value)} readOnly={readOnly} className={`w-full border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-center outline-none transition-all ${readOnly ? "bg-slate-100" : "bg-slate-50 focus:border-[#1e40af]"}`} />
                   </div>
                   <div className="space-y-1">
                      <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest text-center">Designation / Bleep</p>
                      <input type="text" value={formData.second_clinician_designation} onChange={(e) => handleInputChange("second_clinician_designation", e.target.value)} readOnly={readOnly} className={`w-full border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-center outline-none transition-all ${readOnly ? "bg-slate-100" : "bg-slate-50 focus:border-[#1e40af]"}`} />
                   </div>
                </div>
              </div>
            </div>
          </div>

          {/* Part K - Patient Consent */}
          <div className="bg-white rounded-3xl p-6 shadow-xl border-t-8 border-emerald-500 relative flex flex-col mt-8">
            <PartWarning fields={["patient_signature", "read_understood", "risks_explained", "individual_risks_accepted", "modify_approach", "anaesthesia_consent", "withdraw_consent_ack", "additional_procedures_ack"]} />
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 font-black">K</div>
              <h4 className="font-black text-slate-800 uppercase tracking-wider text-[10px]">Patient Consent Declaration (Adult with capacity)</h4>
            </div>
            <div className="space-y-3 mb-6">
               {[
                 { id: "read_understood", label: "I have read, or had read to me, and I understand the information in Parts A to J of this form." },
                 { id: "risks_explained", label: "The benefits, risks and alternatives have been explained and I have had the opportunity to ask questions." },
                 { id: "individual_risks_accepted", label: "I understand and accept the risks described, including those relevant to my individual circumstances." },
                 { id: "modify_approach", label: "I understand the team will use the planned approach but may modify it if clinically necessary during the procedure." },
                 { id: "anaesthesia_consent", label: "I consent to the anaesthesia / sedation described in Part F." },
                 { id: "withdraw_consent_ack", label: "I understand I may withdraw my consent at any time before the procedure begins." },
                 { id: "additional_procedures_ack", label: "I consent to additional procedures judged immediately necessary to deal with an unexpected situation that cannot safely be deferred." }
               ].map(item => (
                 <label key={item.id} className="flex items-start gap-2 p-2 bg-emerald-50/50 rounded-xl cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formData[item.id]} 
                      onChange={(e) => handleInputChange(item.id, e.target.checked)}
                      disabled={readOnly}
                      className="mt-1 w-4 h-4 text-emerald-600 rounded"
                    />
                    <span className="text-[10px] font-bold text-emerald-900">{item.label}</span>
                 </label>
               ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2 flex-grow flex flex-col">
                <div className="flex-grow min-h-[250px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
                  {readOnly ? (
                    <div className="h-full w-full flex items-center justify-center p-2">
                      {formData.patient_signature ? (
                        <img src={getSigUrl(formData.patient_signature)} alt="Patient Signature" className="max-h-full max-w-full object-contain" />
                      ) : (
                        <span className="text-slate-300 font-bold uppercase text-xs">No Signature</span>
                      )}
                    </div>
                  ) : (
                    <SignaturePad 
                      onEnd={(data) => handleInputChange("patient_signature", data)}
                      onClear={() => handleInputChange("patient_signature", null)}
                      className="h-full w-full"
                    />
                  )}
                </div>
                <div className="mt-4 space-y-3">
                   <div className="space-y-1">
                      <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest text-center">Patient Name *</p>
                      <input type="text" value={formData.patient_name} onChange={(e) => handleInputChange("patient_name", e.target.value)} readOnly={readOnly} className={`w-full border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-center outline-none transition-all ${readOnly ? "bg-slate-100" : "bg-slate-50 focus:border-emerald-500"}`} />
                   </div>
                   <div className="space-y-1">
                      <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest text-center">Date / Time</p>
                      <input type="datetime-local" value={formData.patient_date} onChange={(e) => handleInputChange("patient_date", e.target.value)} readOnly={readOnly} className={`w-full border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-center outline-none transition-all ${readOnly ? "bg-slate-100" : "bg-slate-50 focus:border-emerald-500"}`} />
                   </div>
                </div>
              </div>
              <div className="space-y-2 flex-grow flex flex-col">
                <div className="flex-grow min-h-[250px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
                  {readOnly ? (
                    <div className="h-full w-full flex items-center justify-center p-2">
                      {formData.witness_signature ? (
                        <img src={getSigUrl(formData.witness_signature)} alt="Witness Signature" className="max-h-full max-w-full object-contain" />
                      ) : (
                        <span className="text-slate-300 font-bold uppercase text-xs">No Signature</span>
                      )}
                    </div>
                  ) : (
                    <SignaturePad 
                      onEnd={(data) => handleInputChange("witness_signature", data)}
                      onClear={() => handleInputChange("witness_signature", null)}
                      className="h-full w-full"
                    />
                  )}
                </div>
                <div className="mt-4 space-y-3">
                   <div className="space-y-1">
                      <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest text-center">Witness Name (If unable to sign)</p>
                      <input type="text" value={formData.witness_name} onChange={(e) => handleInputChange("witness_name", e.target.value)} readOnly={readOnly} className={`w-full border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-center outline-none transition-all ${readOnly ? "bg-slate-100" : "bg-slate-50 focus:border-emerald-500"}`} />
                   </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Part L - Parent / Guardian */}
          <div className="bg-purple-50 border-4 border-purple-200 p-8 rounded-3xl relative mt-8">
             <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-purple-200 rounded-lg flex items-center justify-center text-purple-700 font-black">L</div>
                <h4 className="font-black text-purple-900 uppercase tracking-widest text-[10px]">Consent by Parent / Guardian</h4>
             </div>
             <p className="text-xs text-purple-700 font-medium mb-6">Complete for a patient under 18, or who otherwise cannot consent for themselves. Consent is given by a person with parental responsibility or legal guardian, in the patient's best interests.</p>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-2">
                  <label className="block text-[10px] font-black text-purple-400 uppercase tracking-widest">Name of Parent / Guardian</label>
                  <input 
                    type="text" 
                    value={formData.parent_guardian_name} 
                    onChange={(e) => handleInputChange("parent_guardian_name", e.target.value)}
                    readOnly={readOnly}
                    className={`w-full border-2 border-purple-200 rounded-xl px-4 py-2 font-bold text-purple-900 transition-all outline-none ${readOnly ? "bg-purple-100" : "bg-white focus:border-purple-400"}`}
                  />
               </div>
               
               <div className="space-y-2">
                  <label className="block text-[10px] font-black text-purple-400 uppercase tracking-widest">Relationship to Patient</label>
                  <input 
                    type="text" 
                    value={formData.relationship} 
                    onChange={(e) => handleInputChange("relationship", e.target.value)}
                    readOnly={readOnly}
                    className={`w-full border-2 border-purple-200 rounded-xl px-4 py-2 font-bold text-purple-900 transition-all outline-none ${readOnly ? "bg-purple-100" : "bg-white focus:border-purple-400"}`}
                  />
               </div>

               <div className="space-y-2 md:col-span-2">
                 <label className="block text-[10px] font-black text-purple-400 uppercase tracking-widest">Legal Basis (If not a parent)</label>
                 <div className="flex gap-4 p-3 bg-white border-2 border-purple-200 rounded-xl">
                   {["Parental responsibility", "Legal guardian", "Court order"].map(type => (
                     <label key={type} className="flex items-center gap-2 cursor-pointer group">
                       <input 
                         type="radio" 
                         name="legal_basis" 
                         checked={formData.legal_basis === type} 
                         onChange={() => handleInputChange("legal_basis", type)}
                         disabled={readOnly}
                         className="w-4 h-4 text-purple-600 focus:ring-purple-600"
                       />
                       <span className="text-[11px] font-bold text-purple-900 group-hover:text-purple-600 transition-colors">{type}</span>
                     </label>
                   ))}
                 </div>
               </div>
               
               <div className="space-y-2 flex-grow flex flex-col">
                 <div className="flex-grow min-h-[250px] border-4 border-dashed border-purple-200 rounded-2xl overflow-hidden bg-white">
                   {readOnly ? (
                     <div className="h-full w-full flex items-center justify-center p-2">
                       {formData.parent_signature ? (
                         <img src={getSigUrl(formData.parent_signature)} alt="Signature" className="max-h-full max-w-full object-contain" />
                       ) : (
                         <span className="text-purple-300 font-bold uppercase text-xs">No Signature</span>
                       )}
                     </div>
                   ) : (
                     <SignaturePad 
                       onEnd={(data) => handleInputChange("parent_signature", data)}
                       onClear={() => handleInputChange("parent_signature", null)}
                       className="h-full w-full"
                     />
                   )}
                 </div>
                 <p className="text-[10px] text-purple-400 font-bold italic text-center mt-2">Parent / Guardian Signature</p>
                 <input type="datetime-local" value={formData.parent_date} onChange={(e) => handleInputChange("parent_date", e.target.value)} readOnly={readOnly} className={`w-full border border-purple-200 rounded-lg py-2 px-3 text-xs font-bold text-center outline-none transition-all ${readOnly ? "bg-purple-100" : "bg-white focus:border-purple-400"}`} />
               </div>

               <div className="space-y-2 flex-grow flex flex-col">
                 <div className="flex-grow min-h-[250px] border-4 border-dashed border-purple-200 rounded-2xl overflow-hidden bg-white">
                   {readOnly ? (
                     <div className="h-full w-full flex items-center justify-center p-2">
                       {formData.clinician_confirming_signature ? (
                         <img src={getSigUrl(formData.clinician_confirming_signature)} alt="Signature" className="max-h-full max-w-full object-contain" />
                       ) : (
                         <span className="text-purple-300 font-bold uppercase text-xs">No Signature</span>
                       )}
                     </div>
                   ) : (
                     <SignaturePad 
                       onEnd={(data) => handleInputChange("clinician_confirming_signature", data)}
                       onClear={() => handleInputChange("clinician_confirming_signature", null)}
                       className="h-full w-full"
                     />
                   )}
                 </div>
                 <p className="text-[10px] text-purple-400 font-bold italic text-center mt-2">Consenting Clinician (Confirming best interests)</p>
               </div>
             </div>
          </div>
          
          {/* Part M - Confirmation & Withdrawal */}
          <div className="bg-slate-800 border-4 border-slate-700 p-8 rounded-3xl relative mt-8">
             <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center text-white font-black">M</div>
                <h4 className="font-black text-white uppercase tracking-widest text-[10px]">Confirmation & Withdrawal of Consent</h4>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2 flex-grow flex flex-col">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Confirmation immediately before the procedure</label>
                  <div className="flex-grow min-h-[250px] border-4 border-dashed border-slate-300 rounded-2xl overflow-hidden bg-slate-50">
                    {readOnly ? (
                      <div className="h-full w-full flex items-center justify-center p-2">
                        {formData.confirming_clinician_signature ? (
                          <img src={getSigUrl(formData.confirming_clinician_signature)} alt="Signature" className="max-h-full max-w-full object-contain" />
                        ) : (
                          <span className="text-slate-500 font-bold uppercase text-xs">No Signature</span>
                        )}
                      </div>
                    ) : (
                      <SignaturePad 
                        onEnd={(data) => handleInputChange("confirming_clinician_signature", data)}
                        onClear={() => handleInputChange("confirming_clinician_signature", null)}
                        className="h-full w-full"
                      />
                    )}
                  </div>
                  <input type="text" placeholder="Confirming Clinician Name" value={formData.confirming_clinician_name} onChange={(e) => handleInputChange("confirming_clinician_name", e.target.value)} readOnly={readOnly} className={`w-full border border-slate-600 rounded-lg py-2 px-3 text-xs font-bold text-center text-white outline-none transition-all ${readOnly ? "bg-slate-700" : "bg-slate-800 focus:border-slate-400"}`} />
                </div>
                
                <div className="space-y-2 flex-grow flex flex-col">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Withdrawal of Consent</label>
                  <div className="flex-grow min-h-[250px] border-4 border-dashed border-slate-300 rounded-2xl overflow-hidden bg-slate-50">
                    {readOnly ? (
                      <div className="h-full w-full flex items-center justify-center p-2">
                        {formData.withdrawal_patient_signature ? (
                          <img src={getSigUrl(formData.withdrawal_patient_signature)} alt="Signature" className="max-h-full max-w-full object-contain" />
                        ) : (
                          <span className="text-slate-500 font-bold uppercase text-xs">No Signature</span>
                        )}
                      </div>
                    ) : (
                      <SignaturePad 
                        onEnd={(data) => handleInputChange("withdrawal_patient_signature", data)}
                        onClear={() => handleInputChange("withdrawal_patient_signature", null)}
                        className="h-full w-full"
                      />
                    )}
                  </div>
                  <input type="text" placeholder="Patient / Parent Name" value={formData.withdrawal_patient_name} onChange={(e) => handleInputChange("withdrawal_patient_name", e.target.value)} readOnly={readOnly} className={`w-full border border-slate-600 rounded-lg py-2 px-3 text-xs font-bold text-center text-white outline-none transition-all ${readOnly ? "bg-slate-700" : "bg-slate-800 focus:border-slate-400"}`} />
                </div>
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

export default ChemicalPleurodesisConsentForm;






// import React, { useState, useEffect, useRef } from "react";
// import { FileText, CheckCircle, Loader2, Printer, AlertCircle, Save } from "lucide-react";
// import { consentService, ConsentTemplate } from "../../services/consent.service";
// import SignaturePad from "../SignaturePad";
// import { useAuth } from "../../context/AuthContext";
// import { useNotification } from "../../context/NotificationContext";
// import { BASE_URL } from "../../api/client";
// import { patientService } from "../../services/patient.service";
// import { createPortal } from "react-dom";
// import { formDraftService } from "../../services/session-restore.service";

// interface ChemicalPleurodesisConsentFormProps {
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
//   templateSlug?: string;
// }

// const ChemicalPleurodesisConsentForm: React.FC<ChemicalPleurodesisConsentFormProps> = ({
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
//   templateSlug = "chemical_pleurodesis",
// }) => {
//   const { user } = useAuth();
//   const { notify } = useNotification();

//   const getSigUrl = (path: string | undefined | null) => {
//     if (!path) return "";
//     if (path.startsWith("data:")) return path;
//     const normalizedBaseUrl = BASE_URL.replace(/\/$/, "");
//     return path.startsWith("/") ? `${normalizedBaseUrl}${path}` : `${normalizedBaseUrl}/${path}`;
//   };

//   const [loading, setLoading] = useState(false);
//   const [submitting, setSubmitting] = useState(false);
//   const [formErrors, setFormErrors] = useState<string[]>([]);

//   const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

//   const getInputClass = (fieldName: string, isTextarea = false) => {
//     const baseClass = isTextarea 
//       ? `w-full border-2 rounded-xl px-4 py-2 font-bold transition-all outline-none resize-none`
//       : `w-full border-2 rounded-xl px-4 py-2 font-bold transition-all outline-none`;
      
//     if (readOnly) {
//       return `${baseClass} bg-slate-100 border-slate-200 text-slate-800`;
//     }
    
//     if (formErrors.includes(fieldName)) {
//       return `${baseClass} bg-red-50 border-red-500 text-red-900 focus:border-red-600 focus:ring-1 focus:ring-red-500`;
//     }
    
//     return `${baseClass} bg-white border-slate-200 text-slate-800 focus:border-[#1e40af]`;
//   };

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

//   const [formData, setFormData] = useState<any>(viewData || initialData || {
//     patient_name: patientName,
//     dob: "",
//     mrn: mrn,
//     age_sex: "",
//     consultant: "",
//     ward: "",
//     primary_diagnosis: "",
//     planned_approach: "",
//     site_side: "",
//     planned_date: "",
//     expected_outcomes: "",
//     individual_risks: "",
//     alternatives_discussed: "",
//     sclerosant_agent: "",
//     dose_concentration: "",
//     diluent_volume: "",
//     intrapleural_anaesthetic_dose: "",
//     agent_specific_risks: "",
//     intrapleural_explained: false,
//     repeat_explained: false,
//     alternatives_explained: false,
//     discussion_notes: "",
//     anaesthesia_type: "",
//     additional_procedures_consented: "",
//     procedures_declined: "",
//     blood_transfusion: "",
//     tissue_specimens: false,
//     clinical_photography: "",
//     discussion_language: "",
//     interpreter_used: "",
//     interpreter_name: "",
//     interpreter_designation: "",
//     interpreter_signature: null,
//     interpreter_date: "",
//     clinician_name: "",
//     clinician_designation: "",
//     clinician_signature: null,
//     clinician_date: "",
//     second_clinician_name: "",
//     second_clinician_designation: "",
//     second_clinician_signature: null,
//     additional_clinician_notes: "",
//     read_understood: false,
//     risks_explained: false,
//     individual_risks_accepted: false,
//     modify_approach: false,
//     anaesthesia_consent: false,
//     withdraw_consent_ack: false,
//     additional_procedures_ack: false,
//     patient_signature: null,
//     patient_date: "",
//     witness_name: "",
//     witness_signature: null,
//     parent_guardian_name: "",
//     relationship: "",
//     legal_basis: "",
//     parent_signature: null,
//     parent_date: "",
//     clinician_confirming_signature: null,
//     confirming_clinician_name: "",
//     confirming_clinician_signature: null,
//     withdrawal_patient_signature: null,
//     withdrawal_patient_name: "",
//     withdrawal_clinician_name: "",
//     withdrawal_clinician_signature: null,
//   });

//   useEffect(() => {
//     if (!readOnly && mrn && !viewData && !initialData) {
      
//       const localDraftId = `consent_chemical_pleurodesis_${orderId}`;
//       const savedDraft = user?.id ? formDraftService.loadDraft<any>(user.id, localDraftId) : null;
      
//       if (savedDraft) {
//         setFormData(savedDraft);
//         notify("Restored unsaved changes from your previous session", "success");
//         return; 
//       }

//       const fetchPatientDetails = async () => {
//         setLoading(true);
//         try {
//           const patient = await patientService.getPatientByMrn(mrn);
//           if (patient) {
//             setFormData((prev: any) => ({
//               ...prev,
//               dob: patient.demographics?.date_of_birth || prev.dob,
//               age_sex: `${patient.demographics?.age || ""} / ${patient.demographics?.gender || ""}`,
//             }));
//           }
//         } catch (err) {
//           console.error("Failed to fetch patient details for consent pre-fill", err);
//         } finally {
//           setLoading(false);
//         }
//       };
      
//       fetchPatientDetails();
//     }
//   }, [mrn, readOnly, viewData, initialData, orderId, user?.id]);

//   useEffect(() => {
//     if (readOnly || !orderId || !user?.id) return;
    
//     if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    
//     autoSaveTimerRef.current = setTimeout(() => {
//       const localDraftId = `consent_chemical_pleurodesis_${orderId}`;
//       formDraftService.saveDraft(user.id!, localDraftId, formData);
//     }, 1500);
    
//     return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
//   }, [formData, orderId, user?.id, readOnly]);

//   const handleInputChange = (field: string, value: any) => {
//     setFormData((prev: any) => ({ ...prev, [field]: value }));
//   };

//   const handleSaveDraft = async () => {
//     setSubmitting(true);
//     try {
//       await consentService.createConsent({
//         order_id: orderId,
//         template_slug: templateSlug,
//         witness_user_id: user?.id || 0,
//         form_data: formData,
//         is_draft: true,
//         consent_id: draftId,
//       });
//       notify("Draft saved successfully to the system", "success");
      
//       if (user?.id) formDraftService.clearDraft(user.id, `consent_chemical_pleurodesis_${orderId}`);
      
//       onCancel(); 
//     } catch (error: any) {
//       notify(error.response?.data?.message || error.message || "Failed to save draft", "error");
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   const handleSubmit = async () => {
//     const requiredFields = [
//       { key: "patient_name", label: "Patient Full Name" },
//       { key: "dob", label: "Date of Birth" },
//       { key: "consultant", label: "Consultant / Responsible Surgeon" },
//       { key: "ward", label: "Ward / Unit" },
//       { key: "primary_diagnosis", label: "Primary Diagnosis / Indication" },
//       { key: "sclerosant_agent", label: "Sclerosant / Agent to be used" },
//     ];

//     let missingKeys = requiredFields.filter(f => !formData[f.key]).map(f => f.key);
//     let missingLabels = requiredFields.filter(f => !formData[f.key]).map(f => f.label);

//     if (!formData.clinician_name || !formData.clinician_signature) {
//       if (!formData.clinician_name) { missingKeys.push("clinician_name"); missingLabels.push("Clinician Name"); }
//       if (!formData.clinician_signature) { missingKeys.push("clinician_signature"); missingLabels.push("Clinician Signature"); }
//     }
    
//     if (!formData.patient_signature && !formData.parent_signature) {
//       missingKeys.push("patient_signature");
//       missingLabels.push("Patient/Parent Signature");
//     }

//     if (missingKeys.length > 0) {
//       setFormErrors(missingKeys);
//       notify(`Please fill in required fields: ${missingLabels.join(', ')}`, "error");
      
//       setTimeout(() => {
//         const firstErrorEl = document.querySelector('.border-red-500');
//         if (firstErrorEl) {
//           firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
//         }
//       }, 100);
//       return;
//     }
    
//     setFormErrors([]);
//     setSubmitting(true);
//     try {
//       const payloadFormData = {
//         ...formData,
//         clinician_signature: formData.clinician_signature,
//         patient_signature: formData.patient_signature || formData.parent_signature,
//         nurse_signature: formData.witness_signature || "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
//       };

//       const payload = {
//         order_id: orderId,
//         template_slug: templateSlug,
//         workflow_stage: "SIGNED_AND_CHECKED",
//         witness_user_id: user?.id || 0,
//         form_data: payloadFormData,
//         consent_id: draftId,
//       };
      
//       await consentService.createConsent(payload);
//       notify("Consent form submitted successfully", "success");
      
//       if (user?.id) formDraftService.clearDraft(user.id, `consent_chemical_pleurodesis_${orderId}`);

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

//   return (
//     <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col max-w-6xl mx-auto">
//       {/* Header */}
//       <div className="bg-[#1e40af] text-white p-10 flex justify-between items-center relative overflow-hidden shrink-0">
//         <div className="absolute top-0 right-0 w-64 h-64 bg-[#1e40af]/30 rounded-full -mr-32 -mt-32 blur-3xl"></div>
//         <div className="z-10">
//           <div className="flex items-center gap-4 mb-2">
//             <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
//               <img src="/assets/login-bg.jpeg" alt="Gracespring Hospitals" className="w-10 h-10 object-contain" />
//             </div>
//             <div>
//               <h1 className="text-3xl font-black tracking-tighter">Procedure Consent Form</h1>
//               <p className="text-[#93c5fd] font-bold text-sm">Chest-Tube Chemical Pleurodesis</p>
//             </div>
//           </div>
//           <p className="text-xs text-[#93c5fd]/80 font-medium">Form Ref: GSH-CONSENT-PLEU-001 • Policy Ref: GSH-T6 • Version 1.0</p>
//         </div>
//         <div className="text-right z-10 flex flex-col items-end gap-3">
//           <div className="hidden md:block text-right">
//             <p className="text-[10px] text-[#93c5fd] font-bold leading-tight uppercase tracking-wider">Gracespring Hospitals</p>
//             <p className="text-[10px] text-[#93c5fd]">+234 705 648 2776 • admin@gracespringhospitals.com</p>
//           </div>
//           <button 
//             onClick={onPrint}
//             className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/20 transition-all"
//           >
//             <Printer size={14} /> Print Blank Form
//           </button>
//         </div>
//       </div>

//       {/* Main Content */}
//       <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar bg-white">
        
//         {/* Patient Rights */}
//         <section>
//           <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 relative overflow-hidden">
//             <div className="absolute top-0 right-0 bg-amber-200/50 px-4 py-1 rounded-bl-xl text-[10px] font-black text-amber-800 uppercase tracking-wider">Patient Rights</div>
//             <p className="text-sm text-amber-900 font-medium leading-relaxed italic">
//               "You have the right to make decisions about your medical care and to refuse any procedure. If you wish to withdraw consent at any time before the procedure begins, you may do so. Signing this form does not remove your legal rights. This form complies with the National Health Act 2014 (Nigeria) and Gracespring Hospitals Consent Policy (GSH-T6)."
//             </p>
//           </div>
//         </section>

//         {/* Part A - Patient Identification */}
//         <section>
//           <div className="bg-[#1e40af] text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part A — Patient Identification</div>
//           <div className="border-4 border-slate-900 rounded-3xl p-8 grid grid-cols-1 md:grid-cols-4 gap-8 shadow-inner bg-slate-50 relative">
//             <PartWarning fields={["patient_name", "dob", "mrn", "consultant", "ward", "primary_diagnosis"]} />
//             <div className="md:col-span-2 space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient Full Name *</label>
//               <input 
//                 type="text" 
//                 value={formData.patient_name} 
//                 onChange={(e) => { handleInputChange("patient_name", e.target.value); setFormErrors(prev => prev.filter(f => f !== "patient_name")); }}
//                 readOnly={readOnly}
//                 className={getInputClass("patient_name")}
//               />
//             </div>
//             <div className="space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Date of Birth *</label>
//               <input 
//                 type="date" 
//                 value={formData.dob} 
//                 onChange={(e) => { handleInputChange("dob", e.target.value); setFormErrors(prev => prev.filter(f => f !== "dob")); }}
//                 readOnly={readOnly}
//                 className={getInputClass("dob")}
//               />
//             </div>
//             <div className="space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">MRN *</label>
//               <input 
//                 type="text" 
//                 value={formData.mrn} 
//                 className="w-full bg-slate-100 border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-500"
//                 readOnly
//               />
//             </div>
//             <div className="space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Age / Sex</label>
//               <input 
//                 type="text" 
//                 value={formData.age_sex} 
//                 onChange={(e) => handleInputChange("age_sex", e.target.value)}
//                 readOnly={readOnly}
//                 className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
//               />
//             </div>
//             <div className="space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Consultant / Responsible Surgeon *</label>
//               <input 
//                 type="text" 
//                 value={formData.consultant} 
//                 onChange={(e) => { handleInputChange("consultant", e.target.value); setFormErrors(prev => prev.filter(f => f !== "consultant")); }}
//                 readOnly={readOnly}
//                 className={getInputClass("consultant")}
//               />
//             </div>
//             <div className="space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Ward / Unit *</label>
//               <input 
//                 type="text" 
//                 value={formData.ward} 
//                 onChange={(e) => { handleInputChange("ward", e.target.value); setFormErrors(prev => prev.filter(f => f !== "ward")); }}
//                 readOnly={readOnly}
//                 className={getInputClass("ward")}
//               />
//             </div>
//             <div className="md:col-span-4 space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Primary Diagnosis / Indication *</label>
//               <textarea 
//                 rows={2}
//                 value={formData.primary_diagnosis}
//                 onChange={(e) => { handleInputChange("primary_diagnosis", e.target.value); setFormErrors(prev => prev.filter(f => f !== "primary_diagnosis")); }}
//                 placeholder="e.g. recurrent / malignant pleural effusion; recurrent or persistent pneumothorax; symptomatic re-accumulation despite drainage"
//                 readOnly={readOnly}
//                 className={getInputClass("primary_diagnosis", true)}
//               />
//             </div>
//             <div className="md:col-span-2 space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Planned Surgical Approach</label>
//               <div className="grid grid-cols-1 gap-2 p-3 bg-white border-2 border-slate-200 rounded-xl">
//                 {["Via existing chest drain", "Chest drain inserted for the procedure", "Decision at the bedside"].map(type => (
//                   <label key={type} className="flex items-center gap-2 cursor-pointer group">
//                     <input 
//                       type="radio" 
//                       name="planned_approach" 
//                       checked={formData.planned_approach === type} 
//                       onChange={() => handleInputChange("planned_approach", type)}
//                       disabled={readOnly}
//                       className="w-4 h-4 text-[#1e40af] focus:ring-[#1e40af]"
//                     />
//                     <span className="text-xs font-bold text-slate-600 group-hover:text-[#1e40af] transition-colors">{type}</span>
//                   </label>
//                 ))}
//               </div>
//             </div>
//             <div className="space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Site / Side</label>
//               <div className="grid grid-cols-1 gap-2 p-3 bg-white border-2 border-slate-200 rounded-xl">
//                 {["Left", "Right", "N/A"].map(type => (
//                   <label key={type} className="flex items-center gap-2 cursor-pointer group">
//                     <input 
//                       type="radio" 
//                       name="site_side" 
//                       checked={formData.site_side === type} 
//                       onChange={() => handleInputChange("site_side", type)}
//                       disabled={readOnly}
//                       className="w-4 h-4 text-[#1e40af] focus:ring-[#1e40af]"
//                     />
//                     <span className="text-xs font-bold text-slate-600 group-hover:text-[#1e40af] transition-colors">{type}</span>
//                   </label>
//                 ))}
//               </div>
//             </div>
//             <div className="space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Planned Date</label>
//               <input 
//                 type="date" 
//                 value={formData.planned_date} 
//                 onChange={(e) => handleInputChange("planned_date", e.target.value)}
//                 readOnly={readOnly}
//                 className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
//               />
//             </div>
//           </div>
//         </section>

//         {/* Part B */}
//         <section>
//           <div className="bg-[#334155] text-white px-4 py-1 inline-block rounded-t-xl text-[10px] font-black uppercase tracking-widest mb-0 ml-4">Part B — Description of the Procedure</div>
//           <div className="border-4 border-slate-900 rounded-3xl p-6 bg-slate-50 space-y-4 relative">
//              <h4 className="font-black text-slate-900 uppercase tracking-widest text-sm">WHAT THE PROCEDURE INVOLVES</h4>
//              <p className="text-sm text-slate-700 font-medium leading-relaxed">
//                Through a chest drain, local anaesthetic is first instilled into the pleural space to reduce pain, followed by the sclerosing agent mixed with saline. This deliberately irritates and inflames the two layers of the lung lining (pleura) so that they stick together and seal the space, stopping fluid or air from re-accumulating.
//              </p>
//              <h4 className="font-black text-slate-900 uppercase tracking-widest text-sm">HOW IT IS PERFORMED AT GRACESPRING HOSPITALS</h4>
//              <p className="text-sm text-slate-700 font-medium leading-relaxed">
//                A chest drain is confirmed to be correctly positioned (or is inserted first), and a chest X-ray confirms the lung has re-expanded. Local anaesthetic (e.g. lidocaine) is instilled through the drain into the pleural space to reduce discomfort. The sclerosing agent mixed with saline is instilled through the drain. The drain is clamped for a period and the patient may be repositioned to spread the agent across the pleural surfaces. The drain is unclamped and left on drainage/suction; it is removed once output is low and a chest X-ray is satisfactory.
//              </p>
//           </div>
//         </section>

//         {/* Part C */}
//         <section>
//           <div className="bg-[#1e293b] text-white px-4 py-1 inline-block rounded-t-xl text-[10px] font-black uppercase tracking-widest mb-0 ml-4">Part C — Intended Benefits & Goals</div>
//           <div className="border-4 border-slate-900 rounded-3xl p-6 bg-slate-50 relative">
//              <PartWarning fields={["expected_outcomes"]} />
//              <p className="text-sm text-slate-700 font-medium leading-relaxed mb-4">
//                Successful pleurodesis prevents repeated fluid build-up or lung collapse, relieves breathlessness, reduces the need for repeated drainage procedures and hospital admissions, and improves quality of life — particularly important in recurrent or malignant effusions.
//              </p>
//              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Specific goals / expected outcome discussed with this patient</label>
//              <textarea 
//                rows={3}
//                value={formData.expected_outcomes}
//                onChange={(e) => handleInputChange("expected_outcomes", e.target.value)}
//                readOnly={readOnly}
//                className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
//              />
//           </div>
//         </section>

//         {/* Part D */}
//         <section>
//           <div className="bg-[#be123c] text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part D — Risks & Complications</div>
//           <div className="border-4 border-slate-900 rounded-3xl overflow-hidden shadow-xl mb-4">
//             <table className="w-full text-left border-collapse">
//               <thead className="bg-slate-900 text-white">
//                 <tr>
//                   <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest border-r border-slate-700">Frequency</th>
//                   <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest border-r border-slate-700">Risk / Complication</th>
//                   <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest">Additional Detail</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-200">
//                 {[
//                   ["VERY COMMON / COMMON", "Chest pain and discomfort during and after instillation; fever and flu-like symptoms for 24–48 hours.", "Pre-medication, local anaesthetic and analgesia; fever usually settles."],
//                   ["COMMON", "Incomplete or failed pleurodesis needing a repeat procedure or an alternative; drain-site discomfort.", "May repeat pleurodesis or consider other options."],
//                   ["UNCOMMON", "Wound or pleural infection (empyema); drain blockage or displacement; localised skin reaction.", "Antibiotics; drain re-siting as needed."],
//                   ["UNCOMMON", "Breathlessness from fluid shifts; low blood pressure during the procedure.", "Monitoring and supportive management."],
//                   ["RARE", "Re-expansion pulmonary oedema; injury to the lung; significant bleeding (haemothorax); acute respiratory distress (ARDS) – more associated with talc than other agents.", "Careful technique and monitoring; managed actively if it occurs."],
//                   ["RARE", "Allergic reaction to the sclerosing agent or local anaesthetic.", "Emergency treatment available."],
//                   ["VERY RARE", "Life-threatening complication or death.", "Mitigated by careful technique and monitoring."]
//                 ].map((row, idx) => (
//                   <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
//                     <td className="px-6 py-4 text-xs font-black text-[#be123c] border-r border-slate-200">{row[0]}</td>
//                     <td className="px-6 py-4 text-xs font-bold text-slate-700 border-r border-slate-200">{row[1]}</td>
//                     <td className="px-6 py-4 text-xs font-medium text-slate-500 italic">{row[2]}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//           <div className="border-4 border-slate-900 rounded-3xl p-6 bg-slate-50 relative">
//              <PartWarning fields={["individual_risks"]} />
//              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Risks specific to THIS patient (e.g. comorbidities, age/weight, anticoagulation, sickle-cell status, pregnancy, prior surgery, malignant vs benign effusion, lung re-expansion status, frailty, renal/hepatic function):</label>
//              <textarea 
//                rows={3}
//                value={formData.individual_risks}
//                onChange={(e) => handleInputChange("individual_risks", e.target.value)}
//                readOnly={readOnly}
//                className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
//              />
//           </div>
//         </section>

//         {/* Part E */}
//         <section>
//           <div className="bg-[#ea580c] text-white px-4 py-1 inline-block rounded-t-xl text-[10px] font-black uppercase tracking-widest mb-0 ml-4">Part E — Alternatives to the Proposed Procedure</div>
//           <div className="border-4 border-slate-900 rounded-3xl overflow-hidden shadow-xl mb-4">
//             <table className="w-full text-left border-collapse">
//               <thead className="bg-slate-900 text-white">
//                 <tr>
//                   <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest border-r border-slate-700">Alternative Option</th>
//                   <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest border-r border-slate-700">Description</th>
//                   <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest">Limitations / Why it may not suit</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-200">
//                 {[
//                   ["Repeated drainage (as needed)", "Draining fluid/air each time it re-accumulates.", "Temporary; repeated procedures; does not prevent recurrence."],
//                   ["Indwelling pleural catheter (IPC)", "A tunnelled catheter for ongoing home drainage, especially for malignant effusions.", "Long-term catheter care; infection risk; does not always cause pleurodesis."],
//                   ["Thoracoscopic (VATS) pleurodesis / poudrage", "Surgical pleurodesis under anaesthetic.", "More invasive; reserved for selected patients; own risks."],
//                   ["Different sclerosing agent", "An alternative agent instilled via the drain.", "Choice individualised; each agent has its own risk profile (e.g. talc – ARDS)."],
//                   ["No treatment", "Declining pleurodesis.", "Recurrent effusion / pneumothorax with ongoing breathlessness and repeated procedures."]
//                 ].map((row, idx) => (
//                   <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
//                     <td className="px-6 py-4 text-xs font-black text-[#ea580c] border-r border-slate-200">{row[0]}</td>
//                     <td className="px-6 py-4 text-xs font-bold text-slate-700 border-r border-slate-200">{row[1]}</td>
//                     <td className="px-6 py-4 text-xs font-medium text-slate-500 italic">{row[2]}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//           <div className="border-4 border-slate-900 rounded-3xl p-6 bg-slate-50 relative">
//              <PartWarning fields={["alternatives_discussed"]} />
//              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Alternatives discussed with this patient and what is likely to happen with no treatment:</label>
//              <textarea 
//                rows={3}
//                value={formData.alternatives_discussed}
//                onChange={(e) => handleInputChange("alternatives_discussed", e.target.value)}
//                readOnly={readOnly}
//                className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
//              />
//           </div>
//         </section>

//         {/* Part E2 */}
//         <section>
//           <div className="bg-[#ea580c] text-white px-4 py-1 inline-block rounded-t-xl text-[10px] font-black uppercase tracking-widest mb-0 ml-4">Part E2 — Sclerosant (Pleurodesis Agent)</div>
//           <div className="border-4 border-slate-900 rounded-3xl p-8 grid grid-cols-1 md:grid-cols-2 gap-8 shadow-inner bg-slate-50 relative">
//              <PartWarning fields={["sclerosant_agent"]} />
//              <div className="space-y-2">
//                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Sclerosant / Agent to be used *</label>
//                <input 
//                  type="text" 
//                  value={formData.sclerosant_agent} 
//                  onChange={(e) => { handleInputChange("sclerosant_agent", e.target.value); setFormErrors(prev => prev.filter(f => f !== "sclerosant_agent")); }}
//                  readOnly={readOnly}
//                  className={getInputClass("sclerosant_agent")}
//                />
//              </div>
//              <div className="space-y-2">
//                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Dose / Concentration</label>
//                <input 
//                  type="text" 
//                  value={formData.dose_concentration} 
//                  onChange={(e) => handleInputChange("dose_concentration", e.target.value)}
//                  readOnly={readOnly}
//                  className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
//                />
//              </div>
//              <div className="space-y-2">
//                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Diluent & Volume (e.g. saline)</label>
//                <input 
//                  type="text" 
//                  value={formData.diluent_volume} 
//                  onChange={(e) => handleInputChange("diluent_volume", e.target.value)}
//                  readOnly={readOnly}
//                  className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
//                />
//              </div>
//              <div className="space-y-2">
//                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Intrapleural Local Anaesthetic (Drug & Dose)</label>
//                <input 
//                  type="text" 
//                  value={formData.intrapleural_anaesthetic_dose} 
//                  onChange={(e) => handleInputChange("intrapleural_anaesthetic_dose", e.target.value)}
//                  readOnly={readOnly}
//                  className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
//                />
//              </div>
//              <div className="md:col-span-2 space-y-2">
//                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Agent-specific risks discussed with the patient (e.g. talc – higher ARDS risk; bleomycin – systemic effects):</label>
//                <textarea 
//                  rows={2}
//                  value={formData.agent_specific_risks}
//                  onChange={(e) => handleInputChange("agent_specific_risks", e.target.value)}
//                  readOnly={readOnly}
//                  className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
//                />
//              </div>
//           </div>
//         </section>

//         {/* Part E3 */}
//         <section>
//           <div className="bg-[#ea580c] text-white px-4 py-1 inline-block rounded-t-xl text-[10px] font-black uppercase tracking-widest mb-0 ml-4">Part E3 — Pain Relief & Repeat Pleurodesis</div>
//           <div className="border-4 border-slate-900 rounded-3xl p-6 bg-slate-50 relative">
//              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
//                {[
//                  { id: "intrapleural_explained", label: "Intrapleural local anaesthetic explained" },
//                  { id: "repeat_explained", label: "Possibility of repeat pleurodesis explained" },
//                  { id: "alternatives_explained", label: "Alternative agents/approaches explained" }
//                ].map(item => (
//                  <label key={item.id} className="flex items-start gap-3 p-4 bg-white border-2 border-slate-200 rounded-2xl cursor-pointer">
//                    <input 
//                      type="checkbox" 
//                      checked={formData[item.id]} 
//                      onChange={(e) => handleInputChange(item.id, e.target.checked)}
//                      disabled={readOnly}
//                      className="mt-1 w-5 h-5 text-[#ea580c] rounded focus:ring-[#ea580c]"
//                    />
//                    <span className="text-xs font-bold text-slate-700 leading-tight">{item.label}</span>
//                  </label>
//                ))}
//              </div>
//              <div className="space-y-2">
//                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Discussion about agent choice, pain relief and likelihood of success:</label>
//                <textarea 
//                  rows={3}
//                  value={formData.discussion_notes}
//                  onChange={(e) => handleInputChange("discussion_notes", e.target.value)}
//                  readOnly={readOnly}
//                  className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
//                />
//              </div>
//           </div>
//         </section>

//         {/* Part F */}
//         <section>
//            <div className="bg-[#475569] text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part F — Anaesthesia & Sedation</div>
//            <div className="border-4 border-slate-900 rounded-3xl p-6 bg-slate-50 space-y-4 relative">
//               <PartWarning fields={["anaesthesia_type"]} />
//               <p className="text-xs font-bold text-slate-500 mb-4">Anaesthesia will be discussed and provided by the anaesthetist. Planned for this procedure:</p>
//               <div className="grid grid-cols-1 gap-3">
//                 {["Local anaesthesia (intrapleural + drain site)", "Local anaesthesia with sedation", "Systemic analgesia / pre-medication"].map(type => (
//                   <label key={type} className="flex items-center gap-3 p-3 bg-white border-2 border-slate-200 rounded-xl cursor-pointer group">
//                     <input 
//                       type="radio" 
//                       name="anaesthesia_type" 
//                       checked={formData.anaesthesia_type === type} 
//                       onChange={() => handleInputChange("anaesthesia_type", type)}
//                       disabled={readOnly}
//                       className="w-5 h-5 text-[#1e40af] focus:ring-[#1e40af]"
//                     />
//                     <span className="text-sm font-bold text-slate-600 group-hover:text-[#1e40af] transition-colors">{type}</span>
//                   </label>
//                 ))}
//               </div>
//            </div>
//         </section>

//         {/* Part G */}
//         <section>
//           <div className="bg-[#475569] text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part G — Additional Procedures, Blood & Tissue</div>
//           <div className="border-4 border-slate-900 rounded-3xl p-8 grid grid-cols-1 md:grid-cols-2 gap-8 shadow-inner bg-slate-50 relative">
//              <p className="text-xs font-bold text-slate-500 col-span-1 md:col-span-2">During the procedure the team may find conditions needing additional or different procedures not foreseen at consent. These will only be done if necessary to save life or prevent serious harm, in the patient's best interests.</p>
//              <div className="md:col-span-2 space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Additional procedures consented to if needed (write ‘none’ if not applicable):</label>
//                 <textarea 
//                   rows={2}
//                   value={formData.additional_procedures_consented}
//                   onChange={(e) => handleInputChange("additional_procedures_consented", e.target.value)}
//                   readOnly={readOnly}
//                   className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
//                 />
//              </div>
//              <div className="md:col-span-2 space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Procedures NOT to be carried out under any circumstances:</label>
//                 <textarea 
//                   rows={2}
//                   value={formData.procedures_declined}
//                   onChange={(e) => handleInputChange("procedures_declined", e.target.value)}
//                   readOnly={readOnly}
//                   className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
//                 />
//              </div>
//              <div className="space-y-2">
//                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Consent to transfusion of blood / blood products if clinically required</label>
//                <div className="grid grid-cols-1 gap-2 p-3 bg-white border-2 border-slate-200 rounded-xl">
//                  {["Consents", "Declines (record reason / advance directive)", "Discuss"].map(type => (
//                    <label key={type} className="flex items-center gap-2 cursor-pointer group">
//                      <input 
//                        type="radio" 
//                        name="blood_transfusion" 
//                        checked={formData.blood_transfusion === type} 
//                        onChange={() => handleInputChange("blood_transfusion", type)}
//                        disabled={readOnly}
//                        className="w-4 h-4 text-[#1e40af] focus:ring-[#1e40af]"
//                      />
//                      <span className="text-[11px] font-bold text-slate-600 group-hover:text-[#1e40af] transition-colors">{type}</span>
//                    </label>
//                  ))}
//                </div>
//              </div>
//              <div className="space-y-2">
//                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Clinical photography & video</label>
//                <div className="grid grid-cols-1 gap-2 p-3 bg-white border-2 border-slate-200 rounded-xl">
//                  {["Consents – for clinical record", "Consents – anonymised teaching / training / audit", "Declines"].map(type => (
//                    <label key={type} className="flex items-center gap-2 cursor-pointer group">
//                      <input 
//                        type="radio" 
//                        name="clinical_photography" 
//                        checked={formData.clinical_photography === type} 
//                        onChange={() => handleInputChange("clinical_photography", type)}
//                        disabled={readOnly}
//                        className="w-4 h-4 text-[#1e40af] focus:ring-[#1e40af]"
//                      />
//                      <span className="text-[11px] font-bold text-slate-600 group-hover:text-[#1e40af] transition-colors">{type}</span>
//                    </label>
//                  ))}
//                </div>
//              </div>
//              <div className="col-span-1 md:col-span-2">
//                 <label className="flex items-start gap-3 p-4 bg-white border-2 border-slate-200 rounded-2xl cursor-pointer">
//                   <input 
//                     type="checkbox" 
//                     checked={formData.tissue_specimens} 
//                     onChange={(e) => handleInputChange("tissue_specimens", e.target.checked)}
//                     disabled={readOnly}
//                     className="mt-1 w-5 h-5 text-[#1e40af] rounded focus:ring-[#1e40af]"
//                   />
//                   <span className="text-xs font-bold text-slate-700 leading-tight">Consents to removed tissue handled per policy; device/brand & NAFDAC Reg. No.</span>
//                 </label>
//              </div>
//           </div>
//         </section>

//         {/* Part H */}
//         <section>
//            <div className="bg-[#475569] text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part H — Language, Interpretation & Capacity</div>
//            <div className="border-4 border-slate-900 rounded-3xl p-6 bg-slate-50 space-y-4 relative">
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                 <div className="space-y-2">
//                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Language of discussion</label>
//                    <input 
//                      type="text" 
//                      value={formData.discussion_language} 
//                      onChange={(e) => handleInputChange("discussion_language", e.target.value)}
//                      readOnly={readOnly}
//                      className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
//                    />
//                 </div>
//                 <div className="space-y-2">
//                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Interpreter used?</label>
//                    <div className="flex gap-4 p-3 bg-white border-2 border-slate-200 rounded-xl">
//                      {["No", "Yes"].map(type => (
//                        <label key={type} className="flex items-center gap-2 cursor-pointer group">
//                          <input 
//                            type="radio" 
//                            name="interpreter_used" 
//                            checked={formData.interpreter_used === type} 
//                            onChange={() => handleInputChange("interpreter_used", type)}
//                            disabled={readOnly}
//                            className="w-4 h-4 text-[#1e40af] focus:ring-[#1e40af]"
//                          />
//                          <span className="text-[11px] font-bold text-slate-600 group-hover:text-[#1e40af] transition-colors">{type}</span>
//                        </label>
//                      ))}
//                    </div>
//                 </div>
//                 <div className="space-y-2">
//                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Interpreter Full Name</label>
//                    <input 
//                      type="text" 
//                      value={formData.interpreter_name} 
//                      onChange={(e) => handleInputChange("interpreter_name", e.target.value)}
//                      readOnly={readOnly}
//                      className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
//                    />
//                 </div>
//                 <div className="space-y-2">
//                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Designation / Bleep</label>
//                    <input 
//                      type="text" 
//                      value={formData.interpreter_designation} 
//                      onChange={(e) => handleInputChange("interpreter_designation", e.target.value)}
//                      readOnly={readOnly}
//                      className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
//                    />
//                 </div>
//                 <div className="space-y-2 flex-grow flex flex-col">
//                   <div className="flex-grow min-h-[250px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-white">
//                     {readOnly ? (
//                       <div className="h-full w-full flex items-center justify-center p-2">
//                         {formData.interpreter_signature ? (
//                           <img src={getSigUrl(formData.interpreter_signature)} alt="Interpreter Signature" className="max-h-full max-w-full object-contain" />
//                         ) : (
//                           <span className="text-slate-300 font-bold uppercase text-xs">No Signature</span>
//                         )}
//                       </div>
//                     ) : (
//                       <SignaturePad 
//                         onEnd={(data) => handleInputChange("interpreter_signature", data)}
//                         onClear={() => handleInputChange("interpreter_signature", null)}
//                         className="h-full w-full"
//                       />
//                     )}
//                   </div>
//                   <p className="text-[10px] text-slate-400 font-bold italic text-center mt-2">Interpreter Signature</p>
//                 </div>
//                 <div className="space-y-2">
//                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Date / Time</label>
//                    <input 
//                      type="datetime-local" 
//                      value={formData.interpreter_date} 
//                      onChange={(e) => handleInputChange("interpreter_date", e.target.value)}
//                      readOnly={readOnly}
//                      className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
//                    />
//                 </div>
//               </div>
//            </div>
//         </section>

//         {/* Part I & J */}
//         <section className="space-y-12 bg-slate-900 p-10 rounded-[3rem] shadow-2xl">
//           <h3 className="text-center text-white font-black uppercase tracking-[0.5em] text-xl mb-12">Final Declarations & Signatures</h3>
          
//           {/* Clinician Declaration */}
//           <div className="bg-white rounded-3xl p-6 shadow-xl border-t-8 border-[#1e40af] relative flex flex-col">
//             <PartWarning fields={["clinician_signature", "clinician_name"]} />
//             <div className="flex items-center gap-3 mb-6">
//               <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-[#1e40af] font-black">I</div>
//               <h4 className="font-black text-slate-800 uppercase tracking-wider text-[10px]">Declaration of Consenting Clinician</h4>
//             </div>
//             <p className="text-xs text-slate-600 font-bold mb-6 italic border-l-4 border-blue-300 pl-4">
//               I confirm I have explained the procedure and its purpose, the intended benefits, the material risks (serious and frequent), the risks specific to this patient, and the reasonable alternatives including no treatment. I have answered questions honestly, provided any relevant leaflet, and I am satisfied the patient (or parent/guardian) has capacity and consents voluntarily. I have appropriate knowledge of this procedure.
//             </p>
//             <div className="space-y-4 mb-6">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Part J — Additional Clinician Notes</label>
//               <textarea 
//                 rows={2}
//                 value={formData.additional_clinician_notes}
//                 onChange={(e) => handleInputChange("additional_clinician_notes", e.target.value)}
//                 readOnly={readOnly}
//                 className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
//               />
//             </div>
            
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
//               <div className="space-y-2 flex flex-col">
//                 <div className="flex-grow min-h-[250px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
//                   {readOnly ? (
//                     <div className="h-full w-full flex items-center justify-center p-2">
//                       {formData.clinician_signature ? (
//                         <img src={getSigUrl(formData.clinician_signature)} alt="Clinician Signature" className="max-h-full max-w-full object-contain" />
//                       ) : (
//                         <span className="text-slate-300 font-bold uppercase text-xs">No Signature</span>
//                       )}
//                     </div>
//                   ) : (
//                     <SignaturePad 
//                       onEnd={(data) => handleInputChange("clinician_signature", data)}
//                       onClear={() => handleInputChange("clinician_signature", null)}
//                       className="h-full w-full"
//                     />
//                   )}
//                 </div>
//                 <div className="mt-4 space-y-3">
//                    <div className="space-y-1">
//                       <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest text-center">Consenting Clinician Name *</p>
//                       <input type="text" value={formData.clinician_name} onChange={(e) => handleInputChange("clinician_name", e.target.value)} readOnly={readOnly} className={`w-full border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-center outline-none transition-all ${readOnly ? "bg-slate-100" : "bg-slate-50 focus:border-[#1e40af]"}`} />
//                    </div>
//                    <div className="space-y-1">
//                       <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest text-center">Designation / Bleep</p>
//                       <input type="text" value={formData.clinician_designation} onChange={(e) => handleInputChange("clinician_designation", e.target.value)} readOnly={readOnly} className={`w-full border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-center outline-none transition-all ${readOnly ? "bg-slate-100" : "bg-slate-50 focus:border-[#1e40af]"}`} />
//                    </div>
//                    <div className="space-y-1">
//                       <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest text-center">Date / Time</p>
//                       <input type="datetime-local" value={formData.clinician_date} onChange={(e) => handleInputChange("clinician_date", e.target.value)} readOnly={readOnly} className={`w-full border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-center outline-none transition-all ${readOnly ? "bg-slate-100" : "bg-slate-50 focus:border-[#1e40af]"}`} />
//                    </div>
//                 </div>
//               </div>

//               <div className="space-y-2 flex flex-col">
//                 <div className="flex-grow min-h-[250px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
//                   {readOnly ? (
//                     <div className="h-full w-full flex items-center justify-center p-2">
//                       {formData.second_clinician_signature ? (
//                         <img src={getSigUrl(formData.second_clinician_signature)} alt="Second Clinician Signature" className="max-h-full max-w-full object-contain" />
//                       ) : (
//                         <span className="text-slate-300 font-bold uppercase text-xs">No Signature</span>
//                       )}
//                     </div>
//                   ) : (
//                     <SignaturePad 
//                       onEnd={(data) => handleInputChange("second_clinician_signature", data)}
//                       onClear={() => handleInputChange("second_clinician_signature", null)}
//                       className="h-full w-full"
//                     />
//                   )}
//                 </div>
//                 <div className="mt-4 space-y-3">
//                    <div className="space-y-1">
//                       <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest text-center">Second Clinician Name</p>
//                       <input type="text" value={formData.second_clinician_name} onChange={(e) => handleInputChange("second_clinician_name", e.target.value)} readOnly={readOnly} className={`w-full border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-center outline-none transition-all ${readOnly ? "bg-slate-100" : "bg-slate-50 focus:border-[#1e40af]"}`} />
//                    </div>
//                    <div className="space-y-1">
//                       <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest text-center">Designation / Bleep</p>
//                       <input type="text" value={formData.second_clinician_designation} onChange={(e) => handleInputChange("second_clinician_designation", e.target.value)} readOnly={readOnly} className={`w-full border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-center outline-none transition-all ${readOnly ? "bg-slate-100" : "bg-slate-50 focus:border-[#1e40af]"}`} />
//                    </div>
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* Part K - Patient Consent */}
//           <div className="bg-white rounded-3xl p-6 shadow-xl border-t-8 border-emerald-500 relative flex flex-col mt-8">
//             <PartWarning fields={["patient_signature", "read_understood", "risks_explained", "individual_risks_accepted", "modify_approach", "anaesthesia_consent", "withdraw_consent_ack", "additional_procedures_ack"]} />
//             <div className="flex items-center gap-3 mb-6">
//               <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 font-black">K</div>
//               <h4 className="font-black text-slate-800 uppercase tracking-wider text-[10px]">Patient Consent Declaration (Adult with capacity)</h4>
//             </div>
//             <div className="space-y-3 mb-6">
//                {[
//                  { id: "read_understood", label: "I have read, or had read to me, and I understand the information in Parts A to J of this form." },
//                  { id: "risks_explained", label: "The benefits, risks and alternatives have been explained and I have had the opportunity to ask questions." },
//                  { id: "individual_risks_accepted", label: "I understand and accept the risks described, including those relevant to my individual circumstances." },
//                  { id: "modify_approach", label: "I understand the team will use the planned approach but may modify it if clinically necessary during the procedure." },
//                  { id: "anaesthesia_consent", label: "I consent to the anaesthesia / sedation described in Part F." },
//                  { id: "withdraw_consent_ack", label: "I understand I may withdraw my consent at any time before the procedure begins." },
//                  { id: "additional_procedures_ack", label: "I consent to additional procedures judged immediately necessary to deal with an unexpected situation that cannot safely be deferred." }
//                ].map(item => (
//                  <label key={item.id} className="flex items-start gap-2 p-2 bg-emerald-50/50 rounded-xl cursor-pointer">
//                     <input 
//                       type="checkbox" 
//                       checked={formData[item.id]} 
//                       onChange={(e) => handleInputChange(item.id, e.target.checked)}
//                       disabled={readOnly}
//                       className="mt-1 w-4 h-4 text-emerald-600 rounded"
//                     />
//                     <span className="text-[10px] font-bold text-emerald-900">{item.label}</span>
//                  </label>
//                ))}
//             </div>
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
//               <div className="space-y-2 flex-grow flex flex-col">
//                 <div className="flex-grow min-h-[250px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
//                   {readOnly ? (
//                     <div className="h-full w-full flex items-center justify-center p-2">
//                       {formData.patient_signature ? (
//                         <img src={getSigUrl(formData.patient_signature)} alt="Patient Signature" className="max-h-full max-w-full object-contain" />
//                       ) : (
//                         <span className="text-slate-300 font-bold uppercase text-xs">No Signature</span>
//                       )}
//                     </div>
//                   ) : (
//                     <SignaturePad 
//                       onEnd={(data) => handleInputChange("patient_signature", data)}
//                       onClear={() => handleInputChange("patient_signature", null)}
//                       className="h-full w-full"
//                     />
//                   )}
//                 </div>
//                 <div className="mt-4 space-y-3">
//                    <div className="space-y-1">
//                       <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest text-center">Patient Name *</p>
//                       <input type="text" value={formData.patient_name} onChange={(e) => handleInputChange("patient_name", e.target.value)} readOnly={readOnly} className={`w-full border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-center outline-none transition-all ${readOnly ? "bg-slate-100" : "bg-slate-50 focus:border-emerald-500"}`} />
//                    </div>
//                    <div className="space-y-1">
//                       <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest text-center">Date / Time</p>
//                       <input type="datetime-local" value={formData.patient_date} onChange={(e) => handleInputChange("patient_date", e.target.value)} readOnly={readOnly} className={`w-full border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-center outline-none transition-all ${readOnly ? "bg-slate-100" : "bg-slate-50 focus:border-emerald-500"}`} />
//                    </div>
//                 </div>
//               </div>
//               <div className="space-y-2 flex-grow flex flex-col">
//                 <div className="flex-grow min-h-[250px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
//                   {readOnly ? (
//                     <div className="h-full w-full flex items-center justify-center p-2">
//                       {formData.witness_signature ? (
//                         <img src={getSigUrl(formData.witness_signature)} alt="Witness Signature" className="max-h-full max-w-full object-contain" />
//                       ) : (
//                         <span className="text-slate-300 font-bold uppercase text-xs">No Signature</span>
//                       )}
//                     </div>
//                   ) : (
//                     <SignaturePad 
//                       onEnd={(data) => handleInputChange("witness_signature", data)}
//                       onClear={() => handleInputChange("witness_signature", null)}
//                       className="h-full w-full"
//                     />
//                   )}
//                 </div>
//                 <div className="mt-4 space-y-3">
//                    <div className="space-y-1">
//                       <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest text-center">Witness Name (If unable to sign)</p>
//                       <input type="text" value={formData.witness_name} onChange={(e) => handleInputChange("witness_name", e.target.value)} readOnly={readOnly} className={`w-full border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-center outline-none transition-all ${readOnly ? "bg-slate-100" : "bg-slate-50 focus:border-emerald-500"}`} />
//                    </div>
//                 </div>
//               </div>
//             </div>
//           </div>
          
//           {/* Part L - Parent / Guardian */}
//           <div className="bg-purple-50 border-4 border-purple-200 p-8 rounded-3xl relative mt-8">
//              <div className="flex items-center gap-3 mb-4">
//                 <div className="w-8 h-8 bg-purple-200 rounded-lg flex items-center justify-center text-purple-700 font-black">L</div>
//                 <h4 className="font-black text-purple-900 uppercase tracking-widest text-[10px]">Consent by Parent / Guardian</h4>
//              </div>
//              <p className="text-xs text-purple-700 font-medium mb-6">Complete for a patient under 18, or who otherwise cannot consent for themselves. Consent is given by a person with parental responsibility or legal guardian, in the patient's best interests.</p>
             
//              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                <div className="space-y-2">
//                   <label className="block text-[10px] font-black text-purple-400 uppercase tracking-widest">Name of Parent / Guardian</label>
//                   <input 
//                     type="text" 
//                     value={formData.parent_guardian_name} 
//                     onChange={(e) => handleInputChange("parent_guardian_name", e.target.value)}
//                     readOnly={readOnly}
//                     className={`w-full border-2 border-purple-200 rounded-xl px-4 py-2 font-bold text-purple-900 transition-all outline-none ${readOnly ? "bg-purple-100" : "bg-white focus:border-purple-400"}`}
//                   />
//                </div>
               
//                <div className="space-y-2">
//                   <label className="block text-[10px] font-black text-purple-400 uppercase tracking-widest">Relationship to Patient</label>
//                   <input 
//                     type="text" 
//                     value={formData.relationship} 
//                     onChange={(e) => handleInputChange("relationship", e.target.value)}
//                     readOnly={readOnly}
//                     className={`w-full border-2 border-purple-200 rounded-xl px-4 py-2 font-bold text-purple-900 transition-all outline-none ${readOnly ? "bg-purple-100" : "bg-white focus:border-purple-400"}`}
//                   />
//                </div>

//                <div className="space-y-2 md:col-span-2">
//                  <label className="block text-[10px] font-black text-purple-400 uppercase tracking-widest">Legal Basis (If not a parent)</label>
//                  <div className="flex gap-4 p-3 bg-white border-2 border-purple-200 rounded-xl">
//                    {["Parental responsibility", "Legal guardian", "Court order"].map(type => (
//                      <label key={type} className="flex items-center gap-2 cursor-pointer group">
//                        <input 
//                          type="radio" 
//                          name="legal_basis" 
//                          checked={formData.legal_basis === type} 
//                          onChange={() => handleInputChange("legal_basis", type)}
//                          disabled={readOnly}
//                          className="w-4 h-4 text-purple-600 focus:ring-purple-600"
//                        />
//                        <span className="text-[11px] font-bold text-purple-900 group-hover:text-purple-600 transition-colors">{type}</span>
//                      </label>
//                    ))}
//                  </div>
//                </div>
               
//                <div className="space-y-2 flex-grow flex flex-col">
//                  <div className="flex-grow min-h-[250px] border-4 border-dashed border-purple-200 rounded-2xl overflow-hidden bg-white">
//                    {readOnly ? (
//                      <div className="h-full w-full flex items-center justify-center p-2">
//                        {formData.parent_signature ? (
//                          <img src={getSigUrl(formData.parent_signature)} alt="Signature" className="max-h-full max-w-full object-contain" />
//                        ) : (
//                          <span className="text-purple-300 font-bold uppercase text-xs">No Signature</span>
//                        )}
//                      </div>
//                    ) : (
//                      <SignaturePad 
//                        onEnd={(data) => handleInputChange("parent_signature", data)}
//                        onClear={() => handleInputChange("parent_signature", null)}
//                        className="h-full w-full"
//                      />
//                    )}
//                  </div>
//                  <p className="text-[10px] text-purple-400 font-bold italic text-center mt-2">Parent / Guardian Signature</p>
//                  <input type="datetime-local" value={formData.parent_date} onChange={(e) => handleInputChange("parent_date", e.target.value)} readOnly={readOnly} className={`w-full border border-purple-200 rounded-lg py-2 px-3 text-xs font-bold text-center outline-none transition-all ${readOnly ? "bg-purple-100" : "bg-white focus:border-purple-400"}`} />
//                </div>

//                <div className="space-y-2 flex-grow flex flex-col">
//                  <div className="flex-grow min-h-[250px] border-4 border-dashed border-purple-200 rounded-2xl overflow-hidden bg-white">
//                    {readOnly ? (
//                      <div className="h-full w-full flex items-center justify-center p-2">
//                        {formData.clinician_confirming_signature ? (
//                          <img src={getSigUrl(formData.clinician_confirming_signature)} alt="Signature" className="max-h-full max-w-full object-contain" />
//                        ) : (
//                          <span className="text-purple-300 font-bold uppercase text-xs">No Signature</span>
//                        )}
//                      </div>
//                    ) : (
//                      <SignaturePad 
//                        onEnd={(data) => handleInputChange("clinician_confirming_signature", data)}
//                        onClear={() => handleInputChange("clinician_confirming_signature", null)}
//                        className="h-full w-full"
//                      />
//                    )}
//                  </div>
//                  <p className="text-[10px] text-purple-400 font-bold italic text-center mt-2">Consenting Clinician (Confirming best interests)</p>
//                </div>
//              </div>
//           </div>
          
//           {/* Part M - Confirmation & Withdrawal */}
//           <div className="bg-slate-800 border-4 border-slate-700 p-8 rounded-3xl relative mt-8">
//              <div className="flex items-center gap-3 mb-4">
//                 <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center text-white font-black">M</div>
//                 <h4 className="font-black text-white uppercase tracking-widest text-[10px]">Confirmation & Withdrawal of Consent</h4>
//              </div>
             
//              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
//                 <div className="space-y-2 flex-grow flex flex-col">
//                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Confirmation immediately before the procedure</label>
//                   <div className="flex-grow min-h-[250px] border-4 border-dashed border-slate-300 rounded-2xl overflow-hidden bg-slate-50">
//                     {readOnly ? (
//                       <div className="h-full w-full flex items-center justify-center p-2">
//                         {formData.confirming_clinician_signature ? (
//                           <img src={getSigUrl(formData.confirming_clinician_signature)} alt="Signature" className="max-h-full max-w-full object-contain" />
//                         ) : (
//                           <span className="text-slate-500 font-bold uppercase text-xs">No Signature</span>
//                         )}
//                       </div>
//                     ) : (
//                       <SignaturePad 
//                         onEnd={(data) => handleInputChange("confirming_clinician_signature", data)}
//                         onClear={() => handleInputChange("confirming_clinician_signature", null)}
//                         className="h-full w-full"
//                       />
//                     )}
//                   </div>
//                   <input type="text" placeholder="Confirming Clinician Name" value={formData.confirming_clinician_name} onChange={(e) => handleInputChange("confirming_clinician_name", e.target.value)} readOnly={readOnly} className={`w-full border border-slate-600 rounded-lg py-2 px-3 text-xs font-bold text-center text-white outline-none transition-all ${readOnly ? "bg-slate-700" : "bg-slate-800 focus:border-slate-400"}`} />
//                 </div>
                
//                 <div className="space-y-2 flex-grow flex flex-col">
//                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Withdrawal of Consent</label>
//                   <div className="flex-grow min-h-[250px] border-4 border-dashed border-slate-300 rounded-2xl overflow-hidden bg-slate-50">
//                     {readOnly ? (
//                       <div className="h-full w-full flex items-center justify-center p-2">
//                         {formData.withdrawal_patient_signature ? (
//                           <img src={getSigUrl(formData.withdrawal_patient_signature)} alt="Signature" className="max-h-full max-w-full object-contain" />
//                         ) : (
//                           <span className="text-slate-500 font-bold uppercase text-xs">No Signature</span>
//                         )}
//                       </div>
//                     ) : (
//                       <SignaturePad 
//                         onEnd={(data) => handleInputChange("withdrawal_patient_signature", data)}
//                         onClear={() => handleInputChange("withdrawal_patient_signature", null)}
//                         className="h-full w-full"
//                       />
//                     )}
//                   </div>
//                   <input type="text" placeholder="Patient / Parent Name" value={formData.withdrawal_patient_name} onChange={(e) => handleInputChange("withdrawal_patient_name", e.target.value)} readOnly={readOnly} className={`w-full border border-slate-600 rounded-lg py-2 px-3 text-xs font-bold text-center text-white outline-none transition-all ${readOnly ? "bg-slate-700" : "bg-slate-800 focus:border-slate-400"}`} />
//                 </div>
//              </div>
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
//               {/* NEW SAVE DRAFT BUTTON */}
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
//                 {submitting ? (
//                   <Loader2 className="animate-spin" size={20} />
//                 ) : (
//                   <CheckCircle size={20} />
//                 )}
//                 {submitting ? "Finalizing..." : "Submit & Print Consent"}
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

// export default ChemicalPleurodesisConsentForm;


// import React, { useState, useEffect, useRef } from "react";
// import { FileText, CheckCircle, Loader2, Printer, AlertCircle, Save } from "lucide-react";
// import { consentService, ConsentTemplate } from "../../services/consent.service";
// import SignaturePad from "../SignaturePad";
// import { useAuth } from "../../context/AuthContext";
// import { useNotification } from "../../context/NotificationContext";
// import { BASE_URL } from "../../api/client";
// import { patientService } from "../../services/patient.service";
// import { createPortal } from "react-dom";
// import { formDraftService } from "../../services/session-restore.service"; // <-- ADDED IMPORT

// interface ChemicalPleurodesisConsentFormProps {
//   orderId: number;
//   patientName: string;
//   mrn: string;
//   initialData?: any;           // <--- ADDED
//   draftId?: number | null;     // <--- ADDED
//   onSuccess: (formData: any) => void;
//   onCancel: () => void;
//   onPrint: () => void;
//   readOnly?: boolean;
//   viewData?: any;
//   templateSlug?: string;
// }

// const ChemicalPleurodesisConsentForm: React.FC<ChemicalPleurodesisConsentFormProps> = ({
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
//   templateSlug = "chemical_pleurodesis",
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

//   const [loading, setLoading] = useState(false);
//   const [submitting, setSubmitting] = useState(false);
//   const [formErrors, setFormErrors] = useState<string[]>([]);

//   const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

//   const getInputClass = (fieldName: string, isTextarea = false) => {
//     const baseClass = isTextarea 
//       ? `w-full border-2 rounded-xl px-4 py-2 font-bold transition-all outline-none resize-none`
//       : `w-full border-2 rounded-xl px-4 py-2 font-bold transition-all outline-none`;
      
//     if (readOnly) {
//       return `${baseClass} bg-slate-100 border-slate-200 text-slate-800`;
//     }
    
//     if (formErrors.includes(fieldName)) {
//       return `${baseClass} bg-red-50 border-red-500 text-red-900 focus:border-red-600 focus:ring-1 focus:ring-red-500`;
//     }
    
//     return `${baseClass} bg-white border-slate-200 text-slate-800 focus:border-[#1e40af]`;
//   };

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

//   const [formData, setFormData] = useState<any>(viewData || initialData || {
//     // Part A
//     patient_name: patientName,
//     dob: "",
//     mrn: mrn,
//     age_sex: "",
//     consultant: "",
//     ward: "",
//     primary_diagnosis: "",
//     planned_approach: "",
//     site_side: "",
//     planned_date: "",
//     // Part C
//     expected_outcomes: "",
//     // Part D
//     individual_risks: "",
//     // Part E
//     alternatives_discussed: "",
//     // Part E2
//     sclerosant_agent: "",
//     dose_concentration: "",
//     diluent_volume: "",
//     intrapleural_anaesthetic_dose: "",
//     agent_specific_risks: "",
//     // Part E3
//     intrapleural_explained: false,
//     repeat_explained: false,
//     alternatives_explained: false,
//     discussion_notes: "",
//     // Part F
//     anaesthesia_type: "",
//     // Part G
//     additional_procedures_consented: "",
//     procedures_declined: "",
//     blood_transfusion: "",
//     tissue_specimens: false,
//     clinical_photography: "",
//     // Part H
//     discussion_language: "",
//     interpreter_used: "",
//     interpreter_name: "",
//     interpreter_designation: "",
//     interpreter_signature: null,
//     interpreter_date: "",
//     // Part I
//     clinician_name: "",
//     clinician_designation: "",
//     clinician_signature: null,
//     clinician_date: "",
//     second_clinician_name: "",
//     second_clinician_designation: "",
//     second_clinician_signature: null,
//     // Part J
//     additional_clinician_notes: "",
//     // Part K
//     read_understood: false,
//     risks_explained: false,
//     individual_risks_accepted: false,
//     modify_approach: false,
//     anaesthesia_consent: false,
//     withdraw_consent_ack: false,
//     additional_procedures_ack: false,
//     patient_signature: null,
//     patient_date: "",
//     witness_name: "",
//     witness_signature: null,
//     // Part L
//     parent_guardian_name: "",
//     relationship: "",
//     legal_basis: "",
//     parent_signature: null,
//     parent_date: "",
//     clinician_confirming_signature: null,
//     // Part M
//     confirming_clinician_name: "",
//     confirming_clinician_signature: null,
//     withdrawal_patient_signature: null,
//     withdrawal_patient_name: "",
//     withdrawal_clinician_name: "",
//     withdrawal_clinician_signature: null,
//   });

//   // 1. Initial Data Fetch & Local Draft Restoration
//   useEffect(() => {
//     if (!readOnly && mrn && !viewData && !initialData) {
      
//       const localDraftId = `consent_chemical_pleurodesis_${orderId}`;
//       const savedDraft = user?.id ? formDraftService.loadDraft<any>(user.id, localDraftId) : null;
      
//       if (savedDraft) {
//         setFormData(savedDraft);
//         notify("Restored unsaved changes from your previous session", "success");
//         return; 
//       }

//       fetchPatientDetails();
//     }
//   }, [mrn, readOnly, viewData, initialData, orderId, user?.id]);

//   const fetchPatientDetails = async () => {
//     setLoading(true);
//     try {
//       const patient = await patientService.getPatientByMrn(mrn);
//       if (patient) {
//         setFormData((prev: any) => ({
//           ...prev,
//           dob: patient.demographics?.date_of_birth || prev.dob,
//           age_sex: `${patient.demographics?.age || ""} / ${patient.demographics?.gender || ""}`,
//         }));
//       }
//     } catch (err) {
//       console.error("Failed to fetch patient details for consent pre-fill", err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // 2. Local Auto-Save Loop
//   useEffect(() => {
//     if (readOnly || !orderId || !user?.id) return;
    
//     if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    
//     autoSaveTimerRef.current = setTimeout(() => {
//       const localDraftId = `consent_chemical_pleurodesis_${orderId}`;
//       formDraftService.saveDraft(user.id!, localDraftId, formData);
//     }, 1500);
    
//     return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
//   }, [formData, orderId, user?.id, readOnly]);

//   const handleInputChange = (field: string, value: any) => {
//     setFormData((prev: any) => ({ ...prev, [field]: value }));
//   };

//   // 3. Save as Backend Draft Handler
//   const handleSaveDraft = async () => {
//     setSubmitting(true);
//     try {
//       await consentService.createConsent({
//         order_id: orderId,
//         template_slug: templateSlug,
//         witness_user_id: user?.id || 0,
//         form_data: formData,
//         is_draft: true,
//         consent_id: draftId,
//       });
//       notify("Draft saved successfully to the system", "success");
      
//       // Clear local storage draft
//       if (user?.id) formDraftService.clearDraft(user.id, `consent_chemical_pleurodesis_${orderId}`);
      
//       onCancel(); 
//     } catch (error: any) {
//       notify(error.response?.data?.message || error.message || "Failed to save draft", "error");
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   // 4. Finalizing and Submitting Consent Handler
//   const handleSubmit = async () => {
//     const requiredFields = [
//       { key: "patient_name", label: "Patient Full Name" },
//       { key: "dob", label: "Date of Birth" },
//       { key: "consultant", label: "Consultant / Responsible Surgeon" },
//       { key: "ward", label: "Ward / Unit" },
//       { key: "primary_diagnosis", label: "Primary Diagnosis / Indication" },
//       { key: "sclerosant_agent", label: "Sclerosant / Agent to be used" },
//     ];

//     let missingKeys = requiredFields.filter(f => !formData[f.key]).map(f => f.key);
//     let missingLabels = requiredFields.filter(f => !formData[f.key]).map(f => f.label);

//     if (!formData.clinician_name || !formData.clinician_signature) {
//       if (!formData.clinician_name) { missingKeys.push("clinician_name"); missingLabels.push("Clinician Name"); }
//       if (!formData.clinician_signature) { missingKeys.push("clinician_signature"); missingLabels.push("Clinician Signature"); }
//     }
    
//     if (!formData.patient_signature && !formData.parent_signature) {
//       missingKeys.push("patient_signature");
//       missingLabels.push("Patient/Parent Signature");
//     }

//     if (missingKeys.length > 0) {
//       setFormErrors(missingKeys);
//       notify(`Please fill in required fields: ${missingLabels.join(', ')}`, "error");
      
//       // Scroll to first error
//       setTimeout(() => {
//         const firstErrorEl = document.querySelector('.border-red-500');
//         if (firstErrorEl) {
//           firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
//         }
//       }, 100);
//       return;
//     }
    
//     setFormErrors([]);
//     setSubmitting(true);
//     try {
//       const payloadFormData = {
//         ...formData,
//         clinician_signature: formData.clinician_signature,
//         patient_signature: formData.patient_signature || formData.parent_signature,
//         nurse_signature: formData.witness_signature || "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
//       };

//       const payload = {
//         order_id: orderId,
//         template_slug: templateSlug,
//         workflow_stage: "SIGNED_AND_CHECKED",
//         witness_user_id: user?.id || 0,
//         form_data: payloadFormData,
//         consent_id: draftId, // Passing draftId to overwrite existing draft
//       };
      
//       await consentService.createConsent(payload);
//       notify("Consent form submitted successfully", "success");
      
//       // Clear local storage draft
//       if (user?.id) formDraftService.clearDraft(user.id, `consent_chemical_pleurodesis_${orderId}`);

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

//   return (
//     <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col max-w-6xl mx-auto">
//       {/* Header */}
//       <div className="bg-[#1e40af] text-white p-10 flex justify-between items-center relative overflow-hidden shrink-0">
//         <div className="absolute top-0 right-0 w-64 h-64 bg-[#1e40af]/30 rounded-full -mr-32 -mt-32 blur-3xl"></div>
//         <div className="z-10">
//           <div className="flex items-center gap-4 mb-2">
//             <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
//               <img src="/assets/login-bg.jpeg" alt="Gracespring Hospitals" className="w-10 h-10 object-contain" />
//             </div>
//             <div>
//               <h1 className="text-3xl font-black tracking-tighter">Procedure Consent Form</h1>
//               <p className="text-[#93c5fd] font-bold text-sm">Chest-Tube Chemical Pleurodesis</p>
//             </div>
//           </div>
//           <p className="text-xs text-[#93c5fd]/80 font-medium">Form Ref: GSH-CONSENT-PLEU-001 • Policy Ref: GSH-T6 • Version 1.0</p>
//         </div>
//         <div className="text-right z-10 flex flex-col items-end gap-3">
//           <div className="hidden md:block text-right">
//             <p className="text-[10px] text-[#93c5fd] font-bold leading-tight uppercase tracking-wider">Gracespring Hospitals</p>
//             <p className="text-[10px] text-[#93c5fd]">+234 705 648 2776 • admin@gracespringhospitals.com</p>
//           </div>
//           <button 
//             onClick={onPrint}
//             className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/20 transition-all"
//           >
//             <Printer size={14} /> Print Blank Form
//           </button>
//         </div>
//       </div>

//       {/* Main Content */}
//       <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar bg-white">
        
//         {/* Patient Rights */}
//         <section>
//           <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 relative overflow-hidden">
//             <div className="absolute top-0 right-0 bg-amber-200/50 px-4 py-1 rounded-bl-xl text-[10px] font-black text-amber-800 uppercase tracking-wider">Patient Rights</div>
//             <p className="text-sm text-amber-900 font-medium leading-relaxed italic">
//               "You have the right to make decisions about your medical care and to refuse any procedure. If you wish to withdraw consent at any time before the procedure begins, you may do so. Signing this form does not remove your legal rights. This form complies with the National Health Act 2014 (Nigeria) and Gracespring Hospitals Consent Policy (GSH-T6)."
//             </p>
//           </div>
//         </section>

//         {/* Part A - Patient Identification */}
//         <section>
//           <div className="bg-[#1e40af] text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part A — Patient Identification</div>
//           <div className="border-4 border-slate-900 rounded-3xl p-8 grid grid-cols-1 md:grid-cols-4 gap-8 shadow-inner bg-slate-50 relative">
//             <PartWarning fields={["patient_name", "dob", "mrn", "consultant", "ward", "primary_diagnosis"]} />
//             <div className="md:col-span-2 space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient Full Name *</label>
//               <input 
//                 type="text" 
//                 value={formData.patient_name} 
//                 onChange={(e) => { handleInputChange("patient_name", e.target.value); setFormErrors(prev => prev.filter(f => f !== "patient_name")); }}
//                 readOnly={readOnly}
//                 className={getInputClass("patient_name")}
//               />
//             </div>
//             <div className="space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Date of Birth *</label>
//               <input 
//                 type="date" 
//                 value={formData.dob} 
//                 onChange={(e) => { handleInputChange("dob", e.target.value); setFormErrors(prev => prev.filter(f => f !== "dob")); }}
//                 readOnly={readOnly}
//                 className={getInputClass("dob")}
//               />
//             </div>
//             <div className="space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">MRN *</label>
//               <input 
//                 type="text" 
//                 value={formData.mrn} 
//                 className="w-full bg-slate-100 border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-500"
//                 readOnly
//               />
//             </div>
//             <div className="space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Age / Sex</label>
//               <input 
//                 type="text" 
//                 value={formData.age_sex} 
//                 onChange={(e) => handleInputChange("age_sex", e.target.value)}
//                 readOnly={readOnly}
//                 className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
//               />
//             </div>
//             <div className="space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Consultant / Responsible Surgeon *</label>
//               <input 
//                 type="text" 
//                 value={formData.consultant} 
//                 onChange={(e) => { handleInputChange("consultant", e.target.value); setFormErrors(prev => prev.filter(f => f !== "consultant")); }}
//                 readOnly={readOnly}
//                 className={getInputClass("consultant")}
//               />
//             </div>
//             <div className="space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Ward / Unit *</label>
//               <input 
//                 type="text" 
//                 value={formData.ward} 
//                 onChange={(e) => { handleInputChange("ward", e.target.value); setFormErrors(prev => prev.filter(f => f !== "ward")); }}
//                 readOnly={readOnly}
//                 className={getInputClass("ward")}
//               />
//             </div>
//             <div className="md:col-span-4 space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Primary Diagnosis / Indication *</label>
//               <textarea 
//                 rows={2}
//                 value={formData.primary_diagnosis}
//                 onChange={(e) => { handleInputChange("primary_diagnosis", e.target.value); setFormErrors(prev => prev.filter(f => f !== "primary_diagnosis")); }}
//                 placeholder="e.g. recurrent / malignant pleural effusion; recurrent or persistent pneumothorax; symptomatic re-accumulation despite drainage"
//                 readOnly={readOnly}
//                 className={getInputClass("primary_diagnosis", true)}
//               />
//             </div>
//             <div className="md:col-span-2 space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Planned Surgical Approach</label>
//               <div className="grid grid-cols-1 gap-2 p-3 bg-white border-2 border-slate-200 rounded-xl">
//                 {["Via existing chest drain", "Chest drain inserted for the procedure", "Decision at the bedside"].map(type => (
//                   <label key={type} className="flex items-center gap-2 cursor-pointer group">
//                     <input 
//                       type="radio" 
//                       name="planned_approach" 
//                       checked={formData.planned_approach === type} 
//                       onChange={() => handleInputChange("planned_approach", type)}
//                       disabled={readOnly}
//                       className="w-4 h-4 text-[#1e40af] focus:ring-[#1e40af]"
//                     />
//                     <span className="text-xs font-bold text-slate-600 group-hover:text-[#1e40af] transition-colors">{type}</span>
//                   </label>
//                 ))}
//               </div>
//             </div>
//             <div className="space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Site / Side</label>
//               <div className="grid grid-cols-1 gap-2 p-3 bg-white border-2 border-slate-200 rounded-xl">
//                 {["Left", "Right", "N/A"].map(type => (
//                   <label key={type} className="flex items-center gap-2 cursor-pointer group">
//                     <input 
//                       type="radio" 
//                       name="site_side" 
//                       checked={formData.site_side === type} 
//                       onChange={() => handleInputChange("site_side", type)}
//                       disabled={readOnly}
//                       className="w-4 h-4 text-[#1e40af] focus:ring-[#1e40af]"
//                     />
//                     <span className="text-xs font-bold text-slate-600 group-hover:text-[#1e40af] transition-colors">{type}</span>
//                   </label>
//                 ))}
//               </div>
//             </div>
//             <div className="space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Planned Date</label>
//               <input 
//                 type="date" 
//                 value={formData.planned_date} 
//                 onChange={(e) => handleInputChange("planned_date", e.target.value)}
//                 readOnly={readOnly}
//                 className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
//               />
//             </div>
//           </div>
//         </section>

//         {/* Part B */}
//         <section>
//           <div className="bg-[#334155] text-white px-4 py-1 inline-block rounded-t-xl text-[10px] font-black uppercase tracking-widest mb-0 ml-4">Part B — Description of the Procedure</div>
//           <div className="border-4 border-slate-900 rounded-3xl p-6 bg-slate-50 space-y-4 relative">
//              <h4 className="font-black text-slate-900 uppercase tracking-widest text-sm">WHAT THE PROCEDURE INVOLVES</h4>
//              <p className="text-sm text-slate-700 font-medium leading-relaxed">
//                Through a chest drain, local anaesthetic is first instilled into the pleural space to reduce pain, followed by the sclerosing agent mixed with saline. This deliberately irritates and inflames the two layers of the lung lining (pleura) so that they stick together and seal the space, stopping fluid or air from re-accumulating.
//              </p>
//              <h4 className="font-black text-slate-900 uppercase tracking-widest text-sm">HOW IT IS PERFORMED AT GRACESPRING HOSPITALS</h4>
//              <p className="text-sm text-slate-700 font-medium leading-relaxed">
//                A chest drain is confirmed to be correctly positioned (or is inserted first), and a chest X-ray confirms the lung has re-expanded. Local anaesthetic (e.g. lidocaine) is instilled through the drain into the pleural space to reduce discomfort. The sclerosing agent mixed with saline is instilled through the drain. The drain is clamped for a period and the patient may be repositioned to spread the agent across the pleural surfaces. The drain is unclamped and left on drainage/suction; it is removed once output is low and a chest X-ray is satisfactory.
//              </p>
//           </div>
//         </section>

//         {/* Part C */}
//         <section>
//           <div className="bg-[#1e293b] text-white px-4 py-1 inline-block rounded-t-xl text-[10px] font-black uppercase tracking-widest mb-0 ml-4">Part C — Intended Benefits & Goals</div>
//           <div className="border-4 border-slate-900 rounded-3xl p-6 bg-slate-50 relative">
//              <PartWarning fields={["expected_outcomes"]} />
//              <p className="text-sm text-slate-700 font-medium leading-relaxed mb-4">
//                Successful pleurodesis prevents repeated fluid build-up or lung collapse, relieves breathlessness, reduces the need for repeated drainage procedures and hospital admissions, and improves quality of life — particularly important in recurrent or malignant effusions.
//              </p>
//              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Specific goals / expected outcome discussed with this patient</label>
//              <textarea 
//                rows={3}
//                value={formData.expected_outcomes}
//                onChange={(e) => handleInputChange("expected_outcomes", e.target.value)}
//                readOnly={readOnly}
//                className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
//              />
//           </div>
//         </section>

//         {/* Part D */}
//         <section>
//           <div className="bg-[#be123c] text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part D — Risks & Complications</div>
//           <div className="border-4 border-slate-900 rounded-3xl overflow-hidden shadow-xl mb-4">
//             <table className="w-full text-left border-collapse">
//               <thead className="bg-slate-900 text-white">
//                 <tr>
//                   <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest border-r border-slate-700">Frequency</th>
//                   <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest border-r border-slate-700">Risk / Complication</th>
//                   <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest">Additional Detail</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-200">
//                 {[
//                   ["VERY COMMON / COMMON", "Chest pain and discomfort during and after instillation; fever and flu-like symptoms for 24–48 hours.", "Pre-medication, local anaesthetic and analgesia; fever usually settles."],
//                   ["COMMON", "Incomplete or failed pleurodesis needing a repeat procedure or an alternative; drain-site discomfort.", "May repeat pleurodesis or consider other options."],
//                   ["UNCOMMON", "Wound or pleural infection (empyema); drain blockage or displacement; localised skin reaction.", "Antibiotics; drain re-siting as needed."],
//                   ["UNCOMMON", "Breathlessness from fluid shifts; low blood pressure during the procedure.", "Monitoring and supportive management."],
//                   ["RARE", "Re-expansion pulmonary oedema; injury to the lung; significant bleeding (haemothorax); acute respiratory distress (ARDS) – more associated with talc than other agents.", "Careful technique and monitoring; managed actively if it occurs."],
//                   ["RARE", "Allergic reaction to the sclerosing agent or local anaesthetic.", "Emergency treatment available."],
//                   ["VERY RARE", "Life-threatening complication or death.", "Mitigated by careful technique and monitoring."]
//                 ].map((row, idx) => (
//                   <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
//                     <td className="px-6 py-4 text-xs font-black text-[#be123c] border-r border-slate-200">{row[0]}</td>
//                     <td className="px-6 py-4 text-xs font-bold text-slate-700 border-r border-slate-200">{row[1]}</td>
//                     <td className="px-6 py-4 text-xs font-medium text-slate-500 italic">{row[2]}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//           <div className="border-4 border-slate-900 rounded-3xl p-6 bg-slate-50 relative">
//              <PartWarning fields={["individual_risks"]} />
//              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Risks specific to THIS patient (e.g. comorbidities, age/weight, anticoagulation, sickle-cell status, pregnancy, prior surgery, malignant vs benign effusion, lung re-expansion status, frailty, renal/hepatic function):</label>
//              <textarea 
//                rows={3}
//                value={formData.individual_risks}
//                onChange={(e) => handleInputChange("individual_risks", e.target.value)}
//                readOnly={readOnly}
//                className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
//              />
//           </div>
//         </section>

//         {/* Part E */}
//         <section>
//           <div className="bg-[#ea580c] text-white px-4 py-1 inline-block rounded-t-xl text-[10px] font-black uppercase tracking-widest mb-0 ml-4">Part E — Alternatives to the Proposed Procedure</div>
//           <div className="border-4 border-slate-900 rounded-3xl overflow-hidden shadow-xl mb-4">
//             <table className="w-full text-left border-collapse">
//               <thead className="bg-slate-900 text-white">
//                 <tr>
//                   <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest border-r border-slate-700">Alternative Option</th>
//                   <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest border-r border-slate-700">Description</th>
//                   <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest">Limitations / Why it may not suit</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-200">
//                 {[
//                   ["Repeated drainage (as needed)", "Draining fluid/air each time it re-accumulates.", "Temporary; repeated procedures; does not prevent recurrence."],
//                   ["Indwelling pleural catheter (IPC)", "A tunnelled catheter for ongoing home drainage, especially for malignant effusions.", "Long-term catheter care; infection risk; does not always cause pleurodesis."],
//                   ["Thoracoscopic (VATS) pleurodesis / poudrage", "Surgical pleurodesis under anaesthetic.", "More invasive; reserved for selected patients; own risks."],
//                   ["Different sclerosing agent", "An alternative agent instilled via the drain.", "Choice individualised; each agent has its own risk profile (e.g. talc – ARDS)."],
//                   ["No treatment", "Declining pleurodesis.", "Recurrent effusion / pneumothorax with ongoing breathlessness and repeated procedures."]
//                 ].map((row, idx) => (
//                   <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
//                     <td className="px-6 py-4 text-xs font-black text-[#ea580c] border-r border-slate-200">{row[0]}</td>
//                     <td className="px-6 py-4 text-xs font-bold text-slate-700 border-r border-slate-200">{row[1]}</td>
//                     <td className="px-6 py-4 text-xs font-medium text-slate-500 italic">{row[2]}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//           <div className="border-4 border-slate-900 rounded-3xl p-6 bg-slate-50 relative">
//              <PartWarning fields={["alternatives_discussed"]} />
//              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Alternatives discussed with this patient and what is likely to happen with no treatment:</label>
//              <textarea 
//                rows={3}
//                value={formData.alternatives_discussed}
//                onChange={(e) => handleInputChange("alternatives_discussed", e.target.value)}
//                readOnly={readOnly}
//                className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
//              />
//           </div>
//         </section>

//         {/* Part E2 */}
//         <section>
//           <div className="bg-[#ea580c] text-white px-4 py-1 inline-block rounded-t-xl text-[10px] font-black uppercase tracking-widest mb-0 ml-4">Part E2 — Sclerosant (Pleurodesis Agent)</div>
//           <div className="border-4 border-slate-900 rounded-3xl p-8 grid grid-cols-1 md:grid-cols-2 gap-8 shadow-inner bg-slate-50 relative">
//              <PartWarning fields={["sclerosant_agent"]} />
//              <div className="space-y-2">
//                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Sclerosant / Agent to be used *</label>
//                <input 
//                  type="text" 
//                  value={formData.sclerosant_agent} 
//                  onChange={(e) => { handleInputChange("sclerosant_agent", e.target.value); setFormErrors(prev => prev.filter(f => f !== "sclerosant_agent")); }}
//                  readOnly={readOnly}
//                  className={getInputClass("sclerosant_agent")}
//                />
//              </div>
//              <div className="space-y-2">
//                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Dose / Concentration</label>
//                <input 
//                  type="text" 
//                  value={formData.dose_concentration} 
//                  onChange={(e) => handleInputChange("dose_concentration", e.target.value)}
//                  readOnly={readOnly}
//                  className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
//                />
//              </div>
//              <div className="space-y-2">
//                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Diluent & Volume (e.g. saline)</label>
//                <input 
//                  type="text" 
//                  value={formData.diluent_volume} 
//                  onChange={(e) => handleInputChange("diluent_volume", e.target.value)}
//                  readOnly={readOnly}
//                  className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
//                />
//              </div>
//              <div className="space-y-2">
//                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Intrapleural Local Anaesthetic (Drug & Dose)</label>
//                <input 
//                  type="text" 
//                  value={formData.intrapleural_anaesthetic_dose} 
//                  onChange={(e) => handleInputChange("intrapleural_anaesthetic_dose", e.target.value)}
//                  readOnly={readOnly}
//                  className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
//                />
//              </div>
//              <div className="md:col-span-2 space-y-2">
//                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Agent-specific risks discussed with the patient (e.g. talc – higher ARDS risk; bleomycin – systemic effects):</label>
//                <textarea 
//                  rows={2}
//                  value={formData.agent_specific_risks}
//                  onChange={(e) => handleInputChange("agent_specific_risks", e.target.value)}
//                  readOnly={readOnly}
//                  className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
//                />
//              </div>
//           </div>
//         </section>

//         {/* Part E3 */}
//         <section>
//           <div className="bg-[#ea580c] text-white px-4 py-1 inline-block rounded-t-xl text-[10px] font-black uppercase tracking-widest mb-0 ml-4">Part E3 — Pain Relief & Repeat Pleurodesis</div>
//           <div className="border-4 border-slate-900 rounded-3xl p-6 bg-slate-50 relative">
//              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
//                {[
//                  { id: "intrapleural_explained", label: "Intrapleural local anaesthetic explained" },
//                  { id: "repeat_explained", label: "Possibility of repeat pleurodesis explained" },
//                  { id: "alternatives_explained", label: "Alternative agents/approaches explained" }
//                ].map(item => (
//                  <label key={item.id} className="flex items-start gap-3 p-4 bg-white border-2 border-slate-200 rounded-2xl cursor-pointer">
//                    <input 
//                      type="checkbox" 
//                      checked={formData[item.id]} 
//                      onChange={(e) => handleInputChange(item.id, e.target.checked)}
//                      disabled={readOnly}
//                      className="mt-1 w-5 h-5 text-[#ea580c] rounded focus:ring-[#ea580c]"
//                    />
//                    <span className="text-xs font-bold text-slate-700 leading-tight">{item.label}</span>
//                  </label>
//                ))}
//              </div>
//              <div className="space-y-2">
//                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Discussion about agent choice, pain relief and likelihood of success:</label>
//                <textarea 
//                  rows={3}
//                  value={formData.discussion_notes}
//                  onChange={(e) => handleInputChange("discussion_notes", e.target.value)}
//                  readOnly={readOnly}
//                  className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
//                />
//              </div>
//           </div>
//         </section>

//         {/* Part F */}
//         <section>
//            <div className="bg-[#475569] text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part F — Anaesthesia & Sedation</div>
//            <div className="border-4 border-slate-900 rounded-3xl p-6 bg-slate-50 space-y-4 relative">
//               <PartWarning fields={["anaesthesia_type"]} />
//               <p className="text-xs font-bold text-slate-500 mb-4">Anaesthesia will be discussed and provided by the anaesthetist. Planned for this procedure:</p>
//               <div className="grid grid-cols-1 gap-3">
//                 {["Local anaesthesia (intrapleural + drain site)", "Local anaesthesia with sedation", "Systemic analgesia / pre-medication"].map(type => (
//                   <label key={type} className="flex items-center gap-3 p-3 bg-white border-2 border-slate-200 rounded-xl cursor-pointer group">
//                     <input 
//                       type="radio" 
//                       name="anaesthesia_type" 
//                       checked={formData.anaesthesia_type === type} 
//                       onChange={() => handleInputChange("anaesthesia_type", type)}
//                       disabled={readOnly}
//                       className="w-5 h-5 text-[#1e40af] focus:ring-[#1e40af]"
//                     />
//                     <span className="text-sm font-bold text-slate-600 group-hover:text-[#1e40af] transition-colors">{type}</span>
//                   </label>
//                 ))}
//               </div>
//            </div>
//         </section>

//         {/* Part G */}
//         <section>
//           <div className="bg-[#475569] text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part G — Additional Procedures, Blood & Tissue</div>
//           <div className="border-4 border-slate-900 rounded-3xl p-8 grid grid-cols-1 md:grid-cols-2 gap-8 shadow-inner bg-slate-50 relative">
//              <p className="text-xs font-bold text-slate-500 col-span-1 md:col-span-2">During the procedure the team may find conditions needing additional or different procedures not foreseen at consent. These will only be done if necessary to save life or prevent serious harm, in the patient's best interests.</p>
//              <div className="md:col-span-2 space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Additional procedures consented to if needed (write ‘none’ if not applicable):</label>
//                 <textarea 
//                   rows={2}
//                   value={formData.additional_procedures_consented}
//                   onChange={(e) => handleInputChange("additional_procedures_consented", e.target.value)}
//                   readOnly={readOnly}
//                   className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
//                 />
//              </div>
//              <div className="md:col-span-2 space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Procedures NOT to be carried out under any circumstances:</label>
//                 <textarea 
//                   rows={2}
//                   value={formData.procedures_declined}
//                   onChange={(e) => handleInputChange("procedures_declined", e.target.value)}
//                   readOnly={readOnly}
//                   className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
//                 />
//              </div>
//              <div className="space-y-2">
//                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Consent to transfusion of blood / blood products if clinically required</label>
//                <div className="grid grid-cols-1 gap-2 p-3 bg-white border-2 border-slate-200 rounded-xl">
//                  {["Consents", "Declines (record reason / advance directive)", "Discuss"].map(type => (
//                    <label key={type} className="flex items-center gap-2 cursor-pointer group">
//                      <input 
//                        type="radio" 
//                        name="blood_transfusion" 
//                        checked={formData.blood_transfusion === type} 
//                        onChange={() => handleInputChange("blood_transfusion", type)}
//                        disabled={readOnly}
//                        className="w-4 h-4 text-[#1e40af] focus:ring-[#1e40af]"
//                      />
//                      <span className="text-[11px] font-bold text-slate-600 group-hover:text-[#1e40af] transition-colors">{type}</span>
//                    </label>
//                  ))}
//                </div>
//              </div>
//              <div className="space-y-2">
//                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Clinical photography & video</label>
//                <div className="grid grid-cols-1 gap-2 p-3 bg-white border-2 border-slate-200 rounded-xl">
//                  {["Consents – for clinical record", "Consents – anonymised teaching / training / audit", "Declines"].map(type => (
//                    <label key={type} className="flex items-center gap-2 cursor-pointer group">
//                      <input 
//                        type="radio" 
//                        name="clinical_photography" 
//                        checked={formData.clinical_photography === type} 
//                        onChange={() => handleInputChange("clinical_photography", type)}
//                        disabled={readOnly}
//                        className="w-4 h-4 text-[#1e40af] focus:ring-[#1e40af]"
//                      />
//                      <span className="text-[11px] font-bold text-slate-600 group-hover:text-[#1e40af] transition-colors">{type}</span>
//                    </label>
//                  ))}
//                </div>
//              </div>
//              <div className="col-span-1 md:col-span-2">
//                 <label className="flex items-start gap-3 p-4 bg-white border-2 border-slate-200 rounded-2xl cursor-pointer">
//                   <input 
//                     type="checkbox" 
//                     checked={formData.tissue_specimens} 
//                     onChange={(e) => handleInputChange("tissue_specimens", e.target.checked)}
//                     disabled={readOnly}
//                     className="mt-1 w-5 h-5 text-[#1e40af] rounded focus:ring-[#1e40af]"
//                   />
//                   <span className="text-xs font-bold text-slate-700 leading-tight">Consents to removed tissue handled per policy; device/brand & NAFDAC Reg. No.</span>
//                 </label>
//              </div>
//           </div>
//         </section>

//         {/* Part H */}
//         <section>
//            <div className="bg-[#475569] text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part H — Language, Interpretation & Capacity</div>
//            <div className="border-4 border-slate-900 rounded-3xl p-6 bg-slate-50 space-y-4 relative">
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                 <div className="space-y-2">
//                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Language of discussion</label>
//                    <input 
//                      type="text" 
//                      value={formData.discussion_language} 
//                      onChange={(e) => handleInputChange("discussion_language", e.target.value)}
//                      readOnly={readOnly}
//                      className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
//                    />
//                 </div>
//                 <div className="space-y-2">
//                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Interpreter used?</label>
//                    <div className="flex gap-4 p-3 bg-white border-2 border-slate-200 rounded-xl">
//                      {["No", "Yes"].map(type => (
//                        <label key={type} className="flex items-center gap-2 cursor-pointer group">
//                          <input 
//                            type="radio" 
//                            name="interpreter_used" 
//                            checked={formData.interpreter_used === type} 
//                            onChange={() => handleInputChange("interpreter_used", type)}
//                            disabled={readOnly}
//                            className="w-4 h-4 text-[#1e40af] focus:ring-[#1e40af]"
//                          />
//                          <span className="text-[11px] font-bold text-slate-600 group-hover:text-[#1e40af] transition-colors">{type}</span>
//                        </label>
//                      ))}
//                    </div>
//                 </div>
//                 <div className="space-y-2">
//                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Interpreter Full Name</label>
//                    <input 
//                      type="text" 
//                      value={formData.interpreter_name} 
//                      onChange={(e) => handleInputChange("interpreter_name", e.target.value)}
//                      readOnly={readOnly}
//                      className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
//                    />
//                 </div>
//                 <div className="space-y-2">
//                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Designation / Bleep</label>
//                    <input 
//                      type="text" 
//                      value={formData.interpreter_designation} 
//                      onChange={(e) => handleInputChange("interpreter_designation", e.target.value)}
//                      readOnly={readOnly}
//                      className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
//                    />
//                 </div>
//                 <div className="space-y-2 flex-grow flex flex-col">
//                   <div className="flex-grow min-h-[250px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-white">
//                     {readOnly ? (
//                       <div className="h-full w-full flex items-center justify-center p-2">
//                         {formData.interpreter_signature ? (
//                           <img src={getSigUrl(formData.interpreter_signature)} alt="Interpreter Signature" className="max-h-full max-w-full object-contain" />
//                         ) : (
//                           <span className="text-slate-300 font-bold uppercase text-xs">No Signature</span>
//                         )}
//                       </div>
//                     ) : (
//                       <SignaturePad 
//                         onEnd={(data) => handleInputChange("interpreter_signature", data)}
//                         onClear={() => handleInputChange("interpreter_signature", null)}
//                         className="h-full w-full"
//                       />
//                     )}
//                   </div>
//                   <p className="text-[10px] text-slate-400 font-bold italic text-center mt-2">Interpreter Signature</p>
//                 </div>
//                 <div className="space-y-2">
//                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Date / Time</label>
//                    <input 
//                      type="datetime-local" 
//                      value={formData.interpreter_date} 
//                      onChange={(e) => handleInputChange("interpreter_date", e.target.value)}
//                      readOnly={readOnly}
//                      className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
//                    />
//                 </div>
//               </div>
//            </div>
//         </section>

//         {/* Part I & J */}
//         <section className="space-y-12 bg-slate-900 p-10 rounded-[3rem] shadow-2xl">
//           <h3 className="text-center text-white font-black uppercase tracking-[0.5em] text-xl mb-12">Final Declarations & Signatures</h3>
          
//           {/* Clinician Declaration */}
//           <div className="bg-white rounded-3xl p-6 shadow-xl border-t-8 border-[#1e40af] relative flex flex-col">
//             <PartWarning fields={["clinician_signature", "clinician_name"]} />
//             <div className="flex items-center gap-3 mb-6">
//               <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-[#1e40af] font-black">I</div>
//               <h4 className="font-black text-slate-800 uppercase tracking-wider text-[10px]">Declaration of Consenting Clinician</h4>
//             </div>
//             <p className="text-xs text-slate-600 font-bold mb-6 italic border-l-4 border-blue-300 pl-4">
//               I confirm I have explained the procedure and its purpose, the intended benefits, the material risks (serious and frequent), the risks specific to this patient, and the reasonable alternatives including no treatment. I have answered questions honestly, provided any relevant leaflet, and I am satisfied the patient (or parent/guardian) has capacity and consents voluntarily. I have appropriate knowledge of this procedure.
//             </p>
//             <div className="space-y-4 mb-6">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Part J — Additional Clinician Notes</label>
//               <textarea 
//                 rows={2}
//                 value={formData.additional_clinician_notes}
//                 onChange={(e) => handleInputChange("additional_clinician_notes", e.target.value)}
//                 readOnly={readOnly}
//                 className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
//               />
//             </div>
            
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
//               <div className="space-y-2 flex flex-col">
//                 <div className="flex-grow min-h-[250px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
//                   {readOnly ? (
//                     <div className="h-full w-full flex items-center justify-center p-2">
//                       {formData.clinician_signature ? (
//                         <img src={getSigUrl(formData.clinician_signature)} alt="Clinician Signature" className="max-h-full max-w-full object-contain" />
//                       ) : (
//                         <span className="text-slate-300 font-bold uppercase text-xs">No Signature</span>
//                       )}
//                     </div>
//                   ) : (
//                     <SignaturePad 
//                       onEnd={(data) => handleInputChange("clinician_signature", data)}
//                       onClear={() => handleInputChange("clinician_signature", null)}
//                       className="h-full w-full"
//                     />
//                   )}
//                 </div>
//                 <div className="mt-4 space-y-3">
//                    <div className="space-y-1">
//                       <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest text-center">Consenting Clinician Name *</p>
//                       <input type="text" value={formData.clinician_name} onChange={(e) => handleInputChange("clinician_name", e.target.value)} readOnly={readOnly} className={`w-full border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-center outline-none transition-all ${readOnly ? "bg-slate-100" : "bg-slate-50 focus:border-[#1e40af]"}`} />
//                    </div>
//                    <div className="space-y-1">
//                       <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest text-center">Designation / Bleep</p>
//                       <input type="text" value={formData.clinician_designation} onChange={(e) => handleInputChange("clinician_designation", e.target.value)} readOnly={readOnly} className={`w-full border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-center outline-none transition-all ${readOnly ? "bg-slate-100" : "bg-slate-50 focus:border-[#1e40af]"}`} />
//                    </div>
//                    <div className="space-y-1">
//                       <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest text-center">Date / Time</p>
//                       <input type="datetime-local" value={formData.clinician_date} onChange={(e) => handleInputChange("clinician_date", e.target.value)} readOnly={readOnly} className={`w-full border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-center outline-none transition-all ${readOnly ? "bg-slate-100" : "bg-slate-50 focus:border-[#1e40af]"}`} />
//                    </div>
//                 </div>
//               </div>

//               <div className="space-y-2 flex flex-col">
//                 <div className="flex-grow min-h-[250px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
//                   {readOnly ? (
//                     <div className="h-full w-full flex items-center justify-center p-2">
//                       {formData.second_clinician_signature ? (
//                         <img src={getSigUrl(formData.second_clinician_signature)} alt="Second Clinician Signature" className="max-h-full max-w-full object-contain" />
//                       ) : (
//                         <span className="text-slate-300 font-bold uppercase text-xs">No Signature</span>
//                       )}
//                     </div>
//                   ) : (
//                     <SignaturePad 
//                       onEnd={(data) => handleInputChange("second_clinician_signature", data)}
//                       onClear={() => handleInputChange("second_clinician_signature", null)}
//                       className="h-full w-full"
//                     />
//                   )}
//                 </div>
//                 <div className="mt-4 space-y-3">
//                    <div className="space-y-1">
//                       <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest text-center">Second Clinician Name</p>
//                       <input type="text" value={formData.second_clinician_name} onChange={(e) => handleInputChange("second_clinician_name", e.target.value)} readOnly={readOnly} className={`w-full border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-center outline-none transition-all ${readOnly ? "bg-slate-100" : "bg-slate-50 focus:border-[#1e40af]"}`} />
//                    </div>
//                    <div className="space-y-1">
//                       <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest text-center">Designation / Bleep</p>
//                       <input type="text" value={formData.second_clinician_designation} onChange={(e) => handleInputChange("second_clinician_designation", e.target.value)} readOnly={readOnly} className={`w-full border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-center outline-none transition-all ${readOnly ? "bg-slate-100" : "bg-slate-50 focus:border-[#1e40af]"}`} />
//                    </div>
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* Part K - Patient Consent */}
//           <div className="bg-white rounded-3xl p-6 shadow-xl border-t-8 border-emerald-500 relative flex flex-col mt-8">
//             <PartWarning fields={["patient_signature", "read_understood", "risks_explained", "individual_risks_accepted", "modify_approach", "anaesthesia_consent", "withdraw_consent_ack", "additional_procedures_ack"]} />
//             <div className="flex items-center gap-3 mb-6">
//               <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 font-black">K</div>
//               <h4 className="font-black text-slate-800 uppercase tracking-wider text-[10px]">Patient Consent Declaration (Adult with capacity)</h4>
//             </div>
//             <div className="space-y-3 mb-6">
//                {[
//                  { id: "read_understood", label: "I have read, or had read to me, and I understand the information in Parts A to J of this form." },
//                  { id: "risks_explained", label: "The benefits, risks and alternatives have been explained and I have had the opportunity to ask questions." },
//                  { id: "individual_risks_accepted", label: "I understand and accept the risks described, including those relevant to my individual circumstances." },
//                  { id: "modify_approach", label: "I understand the team will use the planned approach but may modify it if clinically necessary during the procedure." },
//                  { id: "anaesthesia_consent", label: "I consent to the anaesthesia / sedation described in Part F." },
//                  { id: "withdraw_consent_ack", label: "I understand I may withdraw my consent at any time before the procedure begins." },
//                  { id: "additional_procedures_ack", label: "I consent to additional procedures judged immediately necessary to deal with an unexpected situation that cannot safely be deferred." }
//                ].map(item => (
//                  <label key={item.id} className="flex items-start gap-2 p-2 bg-emerald-50/50 rounded-xl cursor-pointer">
//                     <input 
//                       type="checkbox" 
//                       checked={formData[item.id]} 
//                       onChange={(e) => handleInputChange(item.id, e.target.checked)}
//                       disabled={readOnly}
//                       className="mt-1 w-4 h-4 text-emerald-600 rounded"
//                     />
//                     <span className="text-[10px] font-bold text-emerald-900">{item.label}</span>
//                  </label>
//                ))}
//             </div>
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
//               <div className="space-y-2 flex-grow flex flex-col">
//                 <div className="flex-grow min-h-[250px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
//                   {readOnly ? (
//                     <div className="h-full w-full flex items-center justify-center p-2">
//                       {formData.patient_signature ? (
//                         <img src={getSigUrl(formData.patient_signature)} alt="Patient Signature" className="max-h-full max-w-full object-contain" />
//                       ) : (
//                         <span className="text-slate-300 font-bold uppercase text-xs">No Signature</span>
//                       )}
//                     </div>
//                   ) : (
//                     <SignaturePad 
//                       onEnd={(data) => handleInputChange("patient_signature", data)}
//                       onClear={() => handleInputChange("patient_signature", null)}
//                       className="h-full w-full"
//                     />
//                   )}
//                 </div>
//                 <div className="mt-4 space-y-3">
//                    <div className="space-y-1">
//                       <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest text-center">Patient Name *</p>
//                       <input type="text" value={formData.patient_name} onChange={(e) => handleInputChange("patient_name", e.target.value)} readOnly={readOnly} className={`w-full border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-center outline-none transition-all ${readOnly ? "bg-slate-100" : "bg-slate-50 focus:border-emerald-500"}`} />
//                    </div>
//                    <div className="space-y-1">
//                       <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest text-center">Date / Time</p>
//                       <input type="datetime-local" value={formData.patient_date} onChange={(e) => handleInputChange("patient_date", e.target.value)} readOnly={readOnly} className={`w-full border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-center outline-none transition-all ${readOnly ? "bg-slate-100" : "bg-slate-50 focus:border-emerald-500"}`} />
//                    </div>
//                 </div>
//               </div>
//               <div className="space-y-2 flex-grow flex flex-col">
//                 <div className="flex-grow min-h-[250px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
//                   {readOnly ? (
//                     <div className="h-full w-full flex items-center justify-center p-2">
//                       {formData.witness_signature ? (
//                         <img src={getSigUrl(formData.witness_signature)} alt="Witness Signature" className="max-h-full max-w-full object-contain" />
//                       ) : (
//                         <span className="text-slate-300 font-bold uppercase text-xs">No Signature</span>
//                       )}
//                     </div>
//                   ) : (
//                     <SignaturePad 
//                       onEnd={(data) => handleInputChange("witness_signature", data)}
//                       onClear={() => handleInputChange("witness_signature", null)}
//                       className="h-full w-full"
//                     />
//                   )}
//                 </div>
//                 <div className="mt-4 space-y-3">
//                    <div className="space-y-1">
//                       <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest text-center">Witness Name (If unable to sign)</p>
//                       <input type="text" value={formData.witness_name} onChange={(e) => handleInputChange("witness_name", e.target.value)} readOnly={readOnly} className={`w-full border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-center outline-none transition-all ${readOnly ? "bg-slate-100" : "bg-slate-50 focus:border-emerald-500"}`} />
//                    </div>
//                 </div>
//               </div>
//             </div>
//           </div>
          
//           {/* Part L - Parent / Guardian */}
//           <div className="bg-purple-50 border-4 border-purple-200 p-8 rounded-3xl relative mt-8">
//              <div className="flex items-center gap-3 mb-4">
//                 <div className="w-8 h-8 bg-purple-200 rounded-lg flex items-center justify-center text-purple-700 font-black">L</div>
//                 <h4 className="font-black text-purple-900 uppercase tracking-widest text-[10px]">Consent by Parent / Guardian</h4>
//              </div>
//              <p className="text-xs text-purple-700 font-medium mb-6">Complete for a patient under 18, or who otherwise cannot consent for themselves. Consent is given by a person with parental responsibility or legal guardian, in the patient's best interests.</p>
             
//              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                <div className="space-y-2">
//                   <label className="block text-[10px] font-black text-purple-400 uppercase tracking-widest">Name of Parent / Guardian</label>
//                   <input 
//                     type="text" 
//                     value={formData.parent_guardian_name} 
//                     onChange={(e) => handleInputChange("parent_guardian_name", e.target.value)}
//                     readOnly={readOnly}
//                     className={`w-full border-2 border-purple-200 rounded-xl px-4 py-2 font-bold text-purple-900 transition-all outline-none ${readOnly ? "bg-purple-100" : "bg-white focus:border-purple-400"}`}
//                   />
//                </div>
               
//                <div className="space-y-2">
//                   <label className="block text-[10px] font-black text-purple-400 uppercase tracking-widest">Relationship to Patient</label>
//                   <input 
//                     type="text" 
//                     value={formData.relationship} 
//                     onChange={(e) => handleInputChange("relationship", e.target.value)}
//                     readOnly={readOnly}
//                     className={`w-full border-2 border-purple-200 rounded-xl px-4 py-2 font-bold text-purple-900 transition-all outline-none ${readOnly ? "bg-purple-100" : "bg-white focus:border-purple-400"}`}
//                   />
//                </div>

//                <div className="space-y-2 md:col-span-2">
//                  <label className="block text-[10px] font-black text-purple-400 uppercase tracking-widest">Legal Basis (If not a parent)</label>
//                  <div className="flex gap-4 p-3 bg-white border-2 border-purple-200 rounded-xl">
//                    {["Parental responsibility", "Legal guardian", "Court order"].map(type => (
//                      <label key={type} className="flex items-center gap-2 cursor-pointer group">
//                        <input 
//                          type="radio" 
//                          name="legal_basis" 
//                          checked={formData.legal_basis === type} 
//                          onChange={() => handleInputChange("legal_basis", type)}
//                          disabled={readOnly}
//                          className="w-4 h-4 text-purple-600 focus:ring-purple-600"
//                        />
//                        <span className="text-[11px] font-bold text-purple-900 group-hover:text-purple-600 transition-colors">{type}</span>
//                      </label>
//                    ))}
//                  </div>
//                </div>
               
//                <div className="space-y-2 flex-grow flex flex-col">
//                  <div className="flex-grow min-h-[250px] border-4 border-dashed border-purple-200 rounded-2xl overflow-hidden bg-white">
//                    {readOnly ? (
//                      <div className="h-full w-full flex items-center justify-center p-2">
//                        {formData.parent_signature ? (
//                          <img src={getSigUrl(formData.parent_signature)} alt="Signature" className="max-h-full max-w-full object-contain" />
//                        ) : (
//                          <span className="text-purple-300 font-bold uppercase text-xs">No Signature</span>
//                        )}
//                      </div>
//                    ) : (
//                      <SignaturePad 
//                        onEnd={(data) => handleInputChange("parent_signature", data)}
//                        onClear={() => handleInputChange("parent_signature", null)}
//                        className="h-full w-full"
//                      />
//                    )}
//                  </div>
//                  <p className="text-[10px] text-purple-400 font-bold italic text-center mt-2">Parent / Guardian Signature</p>
//                  <input type="datetime-local" value={formData.parent_date} onChange={(e) => handleInputChange("parent_date", e.target.value)} readOnly={readOnly} className={`w-full border border-purple-200 rounded-lg py-2 px-3 text-xs font-bold text-center outline-none transition-all ${readOnly ? "bg-purple-100" : "bg-white focus:border-purple-400"}`} />
//                </div>

//                <div className="space-y-2 flex-grow flex flex-col">
//                  <div className="flex-grow min-h-[250px] border-4 border-dashed border-purple-200 rounded-2xl overflow-hidden bg-white">
//                    {readOnly ? (
//                      <div className="h-full w-full flex items-center justify-center p-2">
//                        {formData.clinician_confirming_signature ? (
//                          <img src={getSigUrl(formData.clinician_confirming_signature)} alt="Signature" className="max-h-full max-w-full object-contain" />
//                        ) : (
//                          <span className="text-purple-300 font-bold uppercase text-xs">No Signature</span>
//                        )}
//                      </div>
//                    ) : (
//                      <SignaturePad 
//                        onEnd={(data) => handleInputChange("clinician_confirming_signature", data)}
//                        onClear={() => handleInputChange("clinician_confirming_signature", null)}
//                        className="h-full w-full"
//                      />
//                    )}
//                  </div>
//                  <p className="text-[10px] text-purple-400 font-bold italic text-center mt-2">Consenting Clinician (Confirming best interests)</p>
//                </div>
//              </div>
//           </div>
          
//           {/* Part M - Confirmation & Withdrawal */}
//           <div className="bg-slate-800 border-4 border-slate-700 p-8 rounded-3xl relative mt-8">
//              <div className="flex items-center gap-3 mb-4">
//                 <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center text-white font-black">M</div>
//                 <h4 className="font-black text-white uppercase tracking-widest text-[10px]">Confirmation & Withdrawal of Consent</h4>
//              </div>
             
//              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
//                 <div className="space-y-2 flex-grow flex flex-col">
//                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Confirmation immediately before the procedure</label>
//                   <div className="flex-grow min-h-[250px] border-4 border-dashed border-slate-300 rounded-2xl overflow-hidden bg-slate-50">
//                     {readOnly ? (
//                       <div className="h-full w-full flex items-center justify-center p-2">
//                         {formData.confirming_clinician_signature ? (
//                           <img src={getSigUrl(formData.confirming_clinician_signature)} alt="Signature" className="max-h-full max-w-full object-contain" />
//                         ) : (
//                           <span className="text-slate-500 font-bold uppercase text-xs">No Signature</span>
//                         )}
//                       </div>
//                     ) : (
//                       <SignaturePad 
//                         onEnd={(data) => handleInputChange("confirming_clinician_signature", data)}
//                         onClear={() => handleInputChange("confirming_clinician_signature", null)}
//                         className="h-full w-full"
//                       />
//                     )}
//                   </div>
//                   <input type="text" placeholder="Confirming Clinician Name" value={formData.confirming_clinician_name} onChange={(e) => handleInputChange("confirming_clinician_name", e.target.value)} readOnly={readOnly} className={`w-full border border-slate-600 rounded-lg py-2 px-3 text-xs font-bold text-center text-white outline-none transition-all ${readOnly ? "bg-slate-700" : "bg-slate-800 focus:border-slate-400"}`} />
//                 </div>
                
//                 <div className="space-y-2 flex-grow flex flex-col">
//                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Withdrawal of Consent</label>
//                   <div className="flex-grow min-h-[250px] border-4 border-dashed border-slate-300 rounded-2xl overflow-hidden bg-slate-50">
//                     {readOnly ? (
//                       <div className="h-full w-full flex items-center justify-center p-2">
//                         {formData.withdrawal_patient_signature ? (
//                           <img src={getSigUrl(formData.withdrawal_patient_signature)} alt="Signature" className="max-h-full max-w-full object-contain" />
//                         ) : (
//                           <span className="text-slate-500 font-bold uppercase text-xs">No Signature</span>
//                         )}
//                       </div>
//                     ) : (
//                       <SignaturePad 
//                         onEnd={(data) => handleInputChange("withdrawal_patient_signature", data)}
//                         onClear={() => handleInputChange("withdrawal_patient_signature", null)}
//                         className="h-full w-full"
//                       />
//                     )}
//                   </div>
//                   <input type="text" placeholder="Patient / Parent Name" value={formData.withdrawal_patient_name} onChange={(e) => handleInputChange("withdrawal_patient_name", e.target.value)} readOnly={readOnly} className={`w-full border border-slate-600 rounded-lg py-2 px-3 text-xs font-bold text-center text-white outline-none transition-all ${readOnly ? "bg-slate-700" : "bg-slate-800 focus:border-slate-400"}`} />
//                 </div>
//              </div>
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
//               {/* NEW SAVE DRAFT BUTTON */}
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
//                 {submitting ? (
//                   <Loader2 className="animate-spin" size={20} />
//                 ) : (
//                   <CheckCircle size={20} />
//                 )}
//                 {submitting ? "Finalizing..." : "Submit & Print Consent"}
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

// export default ChemicalPleurodesisConsentForm;



// import React, { useState, useEffect } from "react";
// import { FileText, CheckCircle, Loader2, Printer, AlertCircle } from "lucide-react";
// import { consentService, ConsentTemplate } from "../../services/consent.service";
// import SignaturePad from "../SignaturePad";
// import { useAuth } from "../../context/AuthContext";
// import { useNotification } from "../../context/NotificationContext";
// import { BASE_URL } from "../../api/client";
// import { patientService } from "../../services/patient.service";
// import { createPortal } from "react-dom";

// interface ChemicalPleurodesisConsentFormProps {
//   orderId: number;
//   patientName: string;
//   mrn: string;
//   onSuccess: (formData: any) => void;
//   onCancel: () => void;
//   onPrint: () => void;
//   readOnly?: boolean;
//   viewData?: any;
//   templateSlug?: string;
// }

// const ChemicalPleurodesisConsentForm: React.FC<ChemicalPleurodesisConsentFormProps> = ({
//   orderId,
//   patientName,
//   mrn,
//   onSuccess,
//   onCancel,
//   onPrint,
//   readOnly = false,
//   viewData,
//   templateSlug = "chemical_pleurodesis",
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

//   const [loading, setLoading] = useState(false);
//   const [submitting, setSubmitting] = useState(false);
//   const [formErrors, setFormErrors] = useState<string[]>([]);

//   const getInputClass = (fieldName: string, isTextarea = false) => {
//     const baseClass = isTextarea 
//       ? `w-full border-2 rounded-xl px-4 py-2 font-bold transition-all outline-none resize-none`
//       : `w-full border-2 rounded-xl px-4 py-2 font-bold transition-all outline-none`;
      
//     if (readOnly) {
//       return `${baseClass} bg-slate-100 border-slate-200 text-slate-800`;
//     }
    
//     if (formErrors.includes(fieldName)) {
//       return `${baseClass} bg-red-50 border-red-500 text-red-900 focus:border-red-600 focus:ring-1 focus:ring-red-500`;
//     }
    
//     return `${baseClass} bg-white border-slate-200 text-slate-800 focus:border-[#1e40af]`;
//   };

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
//     // Part A
//     patient_name: patientName,
//     dob: "",
//     mrn: mrn,
//     age_sex: "",
//     consultant: "",
//     ward: "",
//     primary_diagnosis: "",
//     planned_approach: "",
//     site_side: "",
//     planned_date: "",
//     // Part C
//     expected_outcomes: "",
//     // Part D
//     individual_risks: "",
//     // Part E
//     alternatives_discussed: "",
//     // Part E2
//     sclerosant_agent: "",
//     dose_concentration: "",
//     diluent_volume: "",
//     intrapleural_anaesthetic_dose: "",
//     agent_specific_risks: "",
//     // Part E3
//     intrapleural_explained: false,
//     repeat_explained: false,
//     alternatives_explained: false,
//     discussion_notes: "",
//     // Part F
//     anaesthesia_type: "",
//     // Part G
//     additional_procedures_consented: "",
//     procedures_declined: "",
//     blood_transfusion: "",
//     tissue_specimens: false,
//     clinical_photography: "",
//     // Part H
//     discussion_language: "",
//     interpreter_used: "",
//     interpreter_name: "",
//     interpreter_designation: "",
//     interpreter_signature: null,
//     interpreter_date: "",
//     // Part I
//     clinician_name: "",
//     clinician_designation: "",
//     clinician_signature: null,
//     clinician_date: "",
//     second_clinician_name: "",
//     second_clinician_designation: "",
//     second_clinician_signature: null,
//     // Part J
//     additional_clinician_notes: "",
//     // Part K
//     read_understood: false,
//     risks_explained: false,
//     individual_risks_accepted: false,
//     modify_approach: false,
//     anaesthesia_consent: false,
//     withdraw_consent_ack: false,
//     additional_procedures_ack: false,
//     patient_signature: null,
//     patient_date: "",
//     witness_name: "",
//     witness_signature: null,
//     // Part L
//     parent_guardian_name: "",
//     relationship: "",
//     legal_basis: "",
//     parent_signature: null,
//     parent_date: "",
//     clinician_confirming_signature: null,
//     // Part M
//     confirming_clinician_name: "",
//     confirming_clinician_signature: null,
//     withdrawal_patient_signature: null,
//     withdrawal_patient_name: "",
//     withdrawal_clinician_name: "",
//     withdrawal_clinician_signature: null,
//   });

//   useEffect(() => {
//     if (!readOnly && mrn) {
//       fetchPatientDetails();
//     }
//   }, []);

//   const fetchPatientDetails = async () => {
//     try {
//       const patient = await patientService.getPatientByMrn(mrn);
//       if (patient) {
//         setFormData((prev: any) => ({
//           ...prev,
//           dob: patient.demographics?.date_of_birth || prev.dob,
//           age_sex: `${patient.demographics?.age || ""} / ${patient.demographics?.gender || ""}`,
//         }));
//       }
//     } catch (err) {
//       console.error("Failed to fetch patient details for consent pre-fill", err);
//     }
//   };

//   const handleInputChange = (field: string, value: any) => {
//     setFormData((prev: any) => ({ ...prev, [field]: value }));
//   };

//   const handleSubmit = async () => {
//     const requiredFields = [
//       { key: "patient_name", label: "Patient Full Name" },
//       { key: "dob", label: "Date of Birth" },
//       { key: "consultant", label: "Consultant / Responsible Surgeon" },
//       { key: "ward", label: "Ward / Unit" },
//       { key: "primary_diagnosis", label: "Primary Diagnosis / Indication" },
//       { key: "sclerosant_agent", label: "Sclerosant / Agent to be used" },
//     ];

//     let missingKeys = requiredFields.filter(f => !formData[f.key]).map(f => f.key);
//     let missingLabels = requiredFields.filter(f => !formData[f.key]).map(f => f.label);

//     if (!formData.clinician_name || !formData.clinician_signature) {
//       if (!formData.clinician_name) { missingKeys.push("clinician_name"); missingLabels.push("Clinician Name"); }
//       if (!formData.clinician_signature) { missingKeys.push("clinician_signature"); missingLabels.push("Clinician Signature"); }
//     }
    
//     if (!formData.patient_signature && !formData.parent_signature) {
//       missingKeys.push("patient_signature");
//       missingLabels.push("Patient/Parent Signature");
//     }

//     if (missingKeys.length > 0) {
//       setFormErrors(missingKeys);
//       notify(`Please fill in required fields: ${missingLabels.join(', ')}`, "error");
      
//       // Scroll to first error
//       setTimeout(() => {
//         const firstErrorEl = document.querySelector('.border-red-500');
//         if (firstErrorEl) {
//           firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
//         }
//       }, 100);
//       return;
//     }
    
//     setFormErrors([]);
//     setSubmitting(true);
//     try {
//       const payloadFormData = {
//         ...formData,
//         clinician_signature: formData.clinician_signature,
//         patient_signature: formData.patient_signature || formData.parent_signature,
//         nurse_signature: formData.witness_signature || "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
//       };

//       const payload = {
//         order_id: orderId,
//         template_slug: templateSlug,
//         workflow_stage: "SIGNED_AND_CHECKED",
//         witness_user_id: user?.id || 0,
//         form_data: payloadFormData,
//       };
      
//       await consentService.createConsent(payload);
//       notify("Consent form submitted successfully", "success");
//       onSuccess(formData);
//     } catch (error: any) {
//       notify(error.response?.data?.message || error.message || "Failed to submit consent", "error");
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   return (
//     <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col max-w-6xl mx-auto">
//       {/* Header */}
//       <div className="bg-[#1e40af] text-white p-10 flex justify-between items-center relative overflow-hidden shrink-0">
//         <div className="absolute top-0 right-0 w-64 h-64 bg-[#1e40af]/30 rounded-full -mr-32 -mt-32 blur-3xl"></div>
//         <div className="z-10">
//           <div className="flex items-center gap-4 mb-2">
//             <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
//               <img src="/assets/login-bg.jpeg" alt="Gracespring Hospitals" className="w-10 h-10 object-contain" />
//             </div>
//             <div>
//               <h1 className="text-3xl font-black tracking-tighter">Procedure Consent Form</h1>
//               <p className="text-[#93c5fd] font-bold text-sm">Chest-Tube Chemical Pleurodesis</p>
//             </div>
//           </div>
//           <p className="text-xs text-[#93c5fd]/80 font-medium">Form Ref: GSH-CONSENT-PLEU-001 • Policy Ref: GSH-T6 • Version 1.0</p>
//         </div>
//         <div className="text-right z-10 flex flex-col items-end gap-3">
//           <div className="hidden md:block text-right">
//             <p className="text-[10px] text-[#93c5fd] font-bold leading-tight uppercase tracking-wider">Gracespring Hospitals</p>
//             <p className="text-[10px] text-[#93c5fd]">+234 705 648 2776 • admin@gracespringhospitals.com</p>
//           </div>
//           <button 
//             onClick={onPrint}
//             className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/20 transition-all"
//           >
//             <Printer size={14} /> Print Blank Form
//           </button>
//         </div>
//       </div>

//       {/* Main Content */}
//       <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar bg-white">
        
//         {/* Patient Rights */}
//         <section>
//           <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 relative overflow-hidden">
//             <div className="absolute top-0 right-0 bg-amber-200/50 px-4 py-1 rounded-bl-xl text-[10px] font-black text-amber-800 uppercase tracking-wider">Patient Rights</div>
//             <p className="text-sm text-amber-900 font-medium leading-relaxed italic">
//               "You have the right to make decisions about your medical care and to refuse any procedure. If you wish to withdraw consent at any time before the procedure begins, you may do so. Signing this form does not remove your legal rights. This form complies with the National Health Act 2014 (Nigeria) and Gracespring Hospitals Consent Policy (GSH-T6)."
//             </p>
//           </div>
//         </section>

//         {/* Part A - Patient Identification */}
//         <section>
//           <div className="bg-[#1e40af] text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part A — Patient Identification</div>
//           <div className="border-4 border-slate-900 rounded-3xl p-8 grid grid-cols-1 md:grid-cols-4 gap-8 shadow-inner bg-slate-50 relative">
//             <PartWarning fields={["patient_name", "dob", "mrn", "consultant", "ward", "primary_diagnosis"]} />
//             <div className="md:col-span-2 space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient Full Name *</label>
//               <input 
//                 type="text" 
//                 value={formData.patient_name} 
//                 onChange={(e) => { handleInputChange("patient_name", e.target.value); setFormErrors(prev => prev.filter(f => f !== "patient_name")); }}
//                 readOnly={readOnly}
//                 className={getInputClass("patient_name")}
//               />
//             </div>
//             <div className="space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Date of Birth *</label>
//               <input 
//                 type="date" 
//                 value={formData.dob} 
//                 onChange={(e) => { handleInputChange("dob", e.target.value); setFormErrors(prev => prev.filter(f => f !== "dob")); }}
//                 readOnly={readOnly}
//                 className={getInputClass("dob")}
//               />
//             </div>
//             <div className="space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">MRN *</label>
//               <input 
//                 type="text" 
//                 value={formData.mrn} 
//                 className="w-full bg-slate-100 border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-500"
//                 readOnly
//               />
//             </div>
//             <div className="space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Age / Sex</label>
//               <input 
//                 type="text" 
//                 value={formData.age_sex} 
//                 onChange={(e) => handleInputChange("age_sex", e.target.value)}
//                 readOnly={readOnly}
//                 className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
//               />
//             </div>
//             <div className="space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Consultant / Responsible Surgeon *</label>
//               <input 
//                 type="text" 
//                 value={formData.consultant} 
//                 onChange={(e) => { handleInputChange("consultant", e.target.value); setFormErrors(prev => prev.filter(f => f !== "consultant")); }}
//                 readOnly={readOnly}
//                 className={getInputClass("consultant")}
//               />
//             </div>
//             <div className="space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Ward / Unit *</label>
//               <input 
//                 type="text" 
//                 value={formData.ward} 
//                 onChange={(e) => { handleInputChange("ward", e.target.value); setFormErrors(prev => prev.filter(f => f !== "ward")); }}
//                 readOnly={readOnly}
//                 className={getInputClass("ward")}
//               />
//             </div>
//             <div className="md:col-span-4 space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Primary Diagnosis / Indication *</label>
//               <textarea 
//                 rows={2}
//                 value={formData.primary_diagnosis}
//                 onChange={(e) => { handleInputChange("primary_diagnosis", e.target.value); setFormErrors(prev => prev.filter(f => f !== "primary_diagnosis")); }}
//                 placeholder="e.g. recurrent / malignant pleural effusion; recurrent or persistent pneumothorax; symptomatic re-accumulation despite drainage"
//                 readOnly={readOnly}
//                 className={getInputClass("primary_diagnosis", true)}
//               />
//             </div>
//             <div className="md:col-span-2 space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Planned Surgical Approach</label>
//               <div className="grid grid-cols-1 gap-2 p-3 bg-white border-2 border-slate-200 rounded-xl">
//                 {["Via existing chest drain", "Chest drain inserted for the procedure", "Decision at the bedside"].map(type => (
//                   <label key={type} className="flex items-center gap-2 cursor-pointer group">
//                     <input 
//                       type="radio" 
//                       name="planned_approach" 
//                       checked={formData.planned_approach === type} 
//                       onChange={() => handleInputChange("planned_approach", type)}
//                       disabled={readOnly}
//                       className="w-4 h-4 text-[#1e40af] focus:ring-[#1e40af]"
//                     />
//                     <span className="text-xs font-bold text-slate-600 group-hover:text-[#1e40af] transition-colors">{type}</span>
//                   </label>
//                 ))}
//               </div>
//             </div>
//             <div className="space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Site / Side</label>
//               <div className="grid grid-cols-1 gap-2 p-3 bg-white border-2 border-slate-200 rounded-xl">
//                 {["Left", "Right", "N/A"].map(type => (
//                   <label key={type} className="flex items-center gap-2 cursor-pointer group">
//                     <input 
//                       type="radio" 
//                       name="site_side" 
//                       checked={formData.site_side === type} 
//                       onChange={() => handleInputChange("site_side", type)}
//                       disabled={readOnly}
//                       className="w-4 h-4 text-[#1e40af] focus:ring-[#1e40af]"
//                     />
//                     <span className="text-xs font-bold text-slate-600 group-hover:text-[#1e40af] transition-colors">{type}</span>
//                   </label>
//                 ))}
//               </div>
//             </div>
//             <div className="space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Planned Date</label>
//               <input 
//                 type="date" 
//                 value={formData.planned_date} 
//                 onChange={(e) => handleInputChange("planned_date", e.target.value)}
//                 readOnly={readOnly}
//                 className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
//               />
//             </div>
//           </div>
//         </section>

//         {/* Part B */}
//         <section>
//           <div className="bg-[#334155] text-white px-4 py-1 inline-block rounded-t-xl text-[10px] font-black uppercase tracking-widest mb-0 ml-4">Part B — Description of the Procedure</div>
//           <div className="border-4 border-slate-900 rounded-3xl p-6 bg-slate-50 space-y-4 relative">
//              <h4 className="font-black text-slate-900 uppercase tracking-widest text-sm">WHAT THE PROCEDURE INVOLVES</h4>
//              <p className="text-sm text-slate-700 font-medium leading-relaxed">
//                Through a chest drain, local anaesthetic is first instilled into the pleural space to reduce pain, followed by the sclerosing agent mixed with saline. This deliberately irritates and inflames the two layers of the lung lining (pleura) so that they stick together and seal the space, stopping fluid or air from re-accumulating.
//              </p>
//              <h4 className="font-black text-slate-900 uppercase tracking-widest text-sm">HOW IT IS PERFORMED AT GRACESPRING HOSPITALS</h4>
//              <p className="text-sm text-slate-700 font-medium leading-relaxed">
//                A chest drain is confirmed to be correctly positioned (or is inserted first), and a chest X-ray confirms the lung has re-expanded. Local anaesthetic (e.g. lidocaine) is instilled through the drain into the pleural space to reduce discomfort. The sclerosing agent mixed with saline is instilled through the drain. The drain is clamped for a period and the patient may be repositioned to spread the agent across the pleural surfaces. The drain is unclamped and left on drainage/suction; it is removed once output is low and a chest X-ray is satisfactory.
//              </p>
//           </div>
//         </section>

//         {/* Part C */}
//         <section>
//           <div className="bg-[#1e293b] text-white px-4 py-1 inline-block rounded-t-xl text-[10px] font-black uppercase tracking-widest mb-0 ml-4">Part C — Intended Benefits & Goals</div>
//           <div className="border-4 border-slate-900 rounded-3xl p-6 bg-slate-50 relative">
//              <PartWarning fields={["expected_outcomes"]} />
//              <p className="text-sm text-slate-700 font-medium leading-relaxed mb-4">
//                Successful pleurodesis prevents repeated fluid build-up or lung collapse, relieves breathlessness, reduces the need for repeated drainage procedures and hospital admissions, and improves quality of life — particularly important in recurrent or malignant effusions.
//              </p>
//              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Specific goals / expected outcome discussed with this patient</label>
//              <textarea 
//                rows={3}
//                value={formData.expected_outcomes}
//                onChange={(e) => handleInputChange("expected_outcomes", e.target.value)}
//                readOnly={readOnly}
//                className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
//              />
//           </div>
//         </section>

//         {/* Part D */}
//         <section>
//           <div className="bg-[#be123c] text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part D — Risks & Complications</div>
//           <div className="border-4 border-slate-900 rounded-3xl overflow-hidden shadow-xl mb-4">
//             <table className="w-full text-left border-collapse">
//               <thead className="bg-slate-900 text-white">
//                 <tr>
//                   <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest border-r border-slate-700">Frequency</th>
//                   <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest border-r border-slate-700">Risk / Complication</th>
//                   <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest">Additional Detail</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-200">
//                 {[
//                   ["VERY COMMON / COMMON", "Chest pain and discomfort during and after instillation; fever and flu-like symptoms for 24–48 hours.", "Pre-medication, local anaesthetic and analgesia; fever usually settles."],
//                   ["COMMON", "Incomplete or failed pleurodesis needing a repeat procedure or an alternative; drain-site discomfort.", "May repeat pleurodesis or consider other options."],
//                   ["UNCOMMON", "Wound or pleural infection (empyema); drain blockage or displacement; localised skin reaction.", "Antibiotics; drain re-siting as needed."],
//                   ["UNCOMMON", "Breathlessness from fluid shifts; low blood pressure during the procedure.", "Monitoring and supportive management."],
//                   ["RARE", "Re-expansion pulmonary oedema; injury to the lung; significant bleeding (haemothorax); acute respiratory distress (ARDS) – more associated with talc than other agents.", "Careful technique and monitoring; managed actively if it occurs."],
//                   ["RARE", "Allergic reaction to the sclerosing agent or local anaesthetic.", "Emergency treatment available."],
//                   ["VERY RARE", "Life-threatening complication or death.", "Mitigated by careful technique and monitoring."]
//                 ].map((row, idx) => (
//                   <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
//                     <td className="px-6 py-4 text-xs font-black text-[#be123c] border-r border-slate-200">{row[0]}</td>
//                     <td className="px-6 py-4 text-xs font-bold text-slate-700 border-r border-slate-200">{row[1]}</td>
//                     <td className="px-6 py-4 text-xs font-medium text-slate-500 italic">{row[2]}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//           <div className="border-4 border-slate-900 rounded-3xl p-6 bg-slate-50 relative">
//              <PartWarning fields={["individual_risks"]} />
//              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Risks specific to THIS patient (e.g. comorbidities, age/weight, anticoagulation, sickle-cell status, pregnancy, prior surgery, malignant vs benign effusion, lung re-expansion status, frailty, renal/hepatic function):</label>
//              <textarea 
//                rows={3}
//                value={formData.individual_risks}
//                onChange={(e) => handleInputChange("individual_risks", e.target.value)}
//                readOnly={readOnly}
//                className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
//              />
//           </div>
//         </section>

//         {/* Part E */}
//         <section>
//           <div className="bg-[#ea580c] text-white px-4 py-1 inline-block rounded-t-xl text-[10px] font-black uppercase tracking-widest mb-0 ml-4">Part E — Alternatives to the Proposed Procedure</div>
//           <div className="border-4 border-slate-900 rounded-3xl overflow-hidden shadow-xl mb-4">
//             <table className="w-full text-left border-collapse">
//               <thead className="bg-slate-900 text-white">
//                 <tr>
//                   <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest border-r border-slate-700">Alternative Option</th>
//                   <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest border-r border-slate-700">Description</th>
//                   <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest">Limitations / Why it may not suit</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-200">
//                 {[
//                   ["Repeated drainage (as needed)", "Draining fluid/air each time it re-accumulates.", "Temporary; repeated procedures; does not prevent recurrence."],
//                   ["Indwelling pleural catheter (IPC)", "A tunnelled catheter for ongoing home drainage, especially for malignant effusions.", "Long-term catheter care; infection risk; does not always cause pleurodesis."],
//                   ["Thoracoscopic (VATS) pleurodesis / poudrage", "Surgical pleurodesis under anaesthetic.", "More invasive; reserved for selected patients; own risks."],
//                   ["Different sclerosing agent", "An alternative agent instilled via the drain.", "Choice individualised; each agent has its own risk profile (e.g. talc – ARDS)."],
//                   ["No treatment", "Declining pleurodesis.", "Recurrent effusion / pneumothorax with ongoing breathlessness and repeated procedures."]
//                 ].map((row, idx) => (
//                   <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
//                     <td className="px-6 py-4 text-xs font-black text-[#ea580c] border-r border-slate-200">{row[0]}</td>
//                     <td className="px-6 py-4 text-xs font-bold text-slate-700 border-r border-slate-200">{row[1]}</td>
//                     <td className="px-6 py-4 text-xs font-medium text-slate-500 italic">{row[2]}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//           <div className="border-4 border-slate-900 rounded-3xl p-6 bg-slate-50 relative">
//              <PartWarning fields={["alternatives_discussed"]} />
//              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Alternatives discussed with this patient and what is likely to happen with no treatment:</label>
//              <textarea 
//                rows={3}
//                value={formData.alternatives_discussed}
//                onChange={(e) => handleInputChange("alternatives_discussed", e.target.value)}
//                readOnly={readOnly}
//                className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
//              />
//           </div>
//         </section>

//         {/* Part E2 */}
//         <section>
//           <div className="bg-[#ea580c] text-white px-4 py-1 inline-block rounded-t-xl text-[10px] font-black uppercase tracking-widest mb-0 ml-4">Part E2 — Sclerosant (Pleurodesis Agent)</div>
//           <div className="border-4 border-slate-900 rounded-3xl p-8 grid grid-cols-1 md:grid-cols-2 gap-8 shadow-inner bg-slate-50 relative">
//              <PartWarning fields={["sclerosant_agent"]} />
//              <div className="space-y-2">
//                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Sclerosant / Agent to be used *</label>
//                <input 
//                  type="text" 
//                  value={formData.sclerosant_agent} 
//                  onChange={(e) => { handleInputChange("sclerosant_agent", e.target.value); setFormErrors(prev => prev.filter(f => f !== "sclerosant_agent")); }}
//                  readOnly={readOnly}
//                  className={getInputClass("sclerosant_agent")}
//                />
//              </div>
//              <div className="space-y-2">
//                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Dose / Concentration</label>
//                <input 
//                  type="text" 
//                  value={formData.dose_concentration} 
//                  onChange={(e) => handleInputChange("dose_concentration", e.target.value)}
//                  readOnly={readOnly}
//                  className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
//                />
//              </div>
//              <div className="space-y-2">
//                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Diluent & Volume (e.g. saline)</label>
//                <input 
//                  type="text" 
//                  value={formData.diluent_volume} 
//                  onChange={(e) => handleInputChange("diluent_volume", e.target.value)}
//                  readOnly={readOnly}
//                  className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
//                />
//              </div>
//              <div className="space-y-2">
//                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Intrapleural Local Anaesthetic (Drug & Dose)</label>
//                <input 
//                  type="text" 
//                  value={formData.intrapleural_anaesthetic_dose} 
//                  onChange={(e) => handleInputChange("intrapleural_anaesthetic_dose", e.target.value)}
//                  readOnly={readOnly}
//                  className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
//                />
//              </div>
//              <div className="md:col-span-2 space-y-2">
//                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Agent-specific risks discussed with the patient (e.g. talc – higher ARDS risk; bleomycin – systemic effects):</label>
//                <textarea 
//                  rows={2}
//                  value={formData.agent_specific_risks}
//                  onChange={(e) => handleInputChange("agent_specific_risks", e.target.value)}
//                  readOnly={readOnly}
//                  className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
//                />
//              </div>
//           </div>
//         </section>

//         {/* Part E3 */}
//         <section>
//           <div className="bg-[#ea580c] text-white px-4 py-1 inline-block rounded-t-xl text-[10px] font-black uppercase tracking-widest mb-0 ml-4">Part E3 — Pain Relief & Repeat Pleurodesis</div>
//           <div className="border-4 border-slate-900 rounded-3xl p-6 bg-slate-50 relative">
//              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
//                {[
//                  { id: "intrapleural_explained", label: "Intrapleural local anaesthetic explained" },
//                  { id: "repeat_explained", label: "Possibility of repeat pleurodesis explained" },
//                  { id: "alternatives_explained", label: "Alternative agents/approaches explained" }
//                ].map(item => (
//                   <label key={item.id} className="flex items-start gap-3 p-4 bg-white border-2 border-slate-200 rounded-2xl cursor-pointer">
//                     <input 
//                       type="checkbox" 
//                       checked={formData[item.id]} 
//                       onChange={(e) => handleInputChange(item.id, e.target.checked)}
//                       disabled={readOnly}
//                       className="mt-1 w-5 h-5 text-[#ea580c] rounded focus:ring-[#ea580c]"
//                     />
//                     <span className="text-xs font-bold text-slate-700 leading-tight">{item.label}</span>
//                   </label>
//                ))}
//              </div>
//              <div className="space-y-2">
//                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Discussion about agent choice, pain relief and likelihood of success:</label>
//                <textarea 
//                  rows={3}
//                  value={formData.discussion_notes}
//                  onChange={(e) => handleInputChange("discussion_notes", e.target.value)}
//                  readOnly={readOnly}
//                  className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
//                />
//              </div>
//           </div>
//         </section>

//         {/* Part F */}
//         <section>
//            <div className="bg-[#475569] text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part F — Anaesthesia & Sedation</div>
//            <div className="border-4 border-slate-900 rounded-3xl p-6 bg-slate-50 space-y-4 relative">
//               <PartWarning fields={["anaesthesia_type"]} />
//               <p className="text-xs font-bold text-slate-500 mb-4">Anaesthesia will be discussed and provided by the anaesthetist. Planned for this procedure:</p>
//               <div className="grid grid-cols-1 gap-3">
//                 {["Local anaesthesia (intrapleural + drain site)", "Local anaesthesia with sedation", "Systemic analgesia / pre-medication"].map(type => (
//                   <label key={type} className="flex items-center gap-3 p-3 bg-white border-2 border-slate-200 rounded-xl cursor-pointer group">
//                     <input 
//                       type="radio" 
//                       name="anaesthesia_type" 
//                       checked={formData.anaesthesia_type === type} 
//                       onChange={() => handleInputChange("anaesthesia_type", type)}
//                       disabled={readOnly}
//                       className="w-5 h-5 text-[#1e40af] focus:ring-[#1e40af]"
//                     />
//                     <span className="text-sm font-bold text-slate-600 group-hover:text-[#1e40af] transition-colors">{type}</span>
//                   </label>
//                 ))}
//               </div>
//            </div>
//         </section>

//         {/* Part G */}
//         <section>
//           <div className="bg-[#475569] text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part G — Additional Procedures, Blood & Tissue</div>
//           <div className="border-4 border-slate-900 rounded-3xl p-8 grid grid-cols-1 md:grid-cols-2 gap-8 shadow-inner bg-slate-50 relative">
//              <p className="text-xs font-bold text-slate-500 col-span-1 md:col-span-2">During the procedure the team may find conditions needing additional or different procedures not foreseen at consent. These will only be done if necessary to save life or prevent serious harm, in the patient's best interests.</p>
//              <div className="md:col-span-2 space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Additional procedures consented to if needed (write ‘none’ if not applicable):</label>
//                 <textarea 
//                   rows={2}
//                   value={formData.additional_procedures_consented}
//                   onChange={(e) => handleInputChange("additional_procedures_consented", e.target.value)}
//                   readOnly={readOnly}
//                   className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
//                 />
//              </div>
//              <div className="md:col-span-2 space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Procedures NOT to be carried out under any circumstances:</label>
//                 <textarea 
//                   rows={2}
//                   value={formData.procedures_declined}
//                   onChange={(e) => handleInputChange("procedures_declined", e.target.value)}
//                   readOnly={readOnly}
//                   className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
//                 />
//              </div>
//              <div className="space-y-2">
//                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Consent to transfusion of blood / blood products if clinically required</label>
//                <div className="grid grid-cols-1 gap-2 p-3 bg-white border-2 border-slate-200 rounded-xl">
//                  {["Consents", "Declines (record reason / advance directive)", "Discuss"].map(type => (
//                    <label key={type} className="flex items-center gap-2 cursor-pointer group">
//                      <input 
//                        type="radio" 
//                        name="blood_transfusion" 
//                        checked={formData.blood_transfusion === type} 
//                        onChange={() => handleInputChange("blood_transfusion", type)}
//                        disabled={readOnly}
//                        className="w-4 h-4 text-[#1e40af] focus:ring-[#1e40af]"
//                      />
//                      <span className="text-[11px] font-bold text-slate-600 group-hover:text-[#1e40af] transition-colors">{type}</span>
//                    </label>
//                  ))}
//                </div>
//              </div>
//              <div className="space-y-2">
//                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Clinical photography & video</label>
//                <div className="grid grid-cols-1 gap-2 p-3 bg-white border-2 border-slate-200 rounded-xl">
//                  {["Consents – for clinical record", "Consents – anonymised teaching / training / audit", "Declines"].map(type => (
//                    <label key={type} className="flex items-center gap-2 cursor-pointer group">
//                      <input 
//                        type="radio" 
//                        name="clinical_photography" 
//                        checked={formData.clinical_photography === type} 
//                        onChange={() => handleInputChange("clinical_photography", type)}
//                        disabled={readOnly}
//                        className="w-4 h-4 text-[#1e40af] focus:ring-[#1e40af]"
//                      />
//                      <span className="text-[11px] font-bold text-slate-600 group-hover:text-[#1e40af] transition-colors">{type}</span>
//                    </label>
//                  ))}
//                </div>
//              </div>
//              <div className="col-span-1 md:col-span-2">
//                 <label className="flex items-start gap-3 p-4 bg-white border-2 border-slate-200 rounded-2xl cursor-pointer">
//                   <input 
//                     type="checkbox" 
//                     checked={formData.tissue_specimens} 
//                     onChange={(e) => handleInputChange("tissue_specimens", e.target.checked)}
//                     disabled={readOnly}
//                     className="mt-1 w-5 h-5 text-[#1e40af] rounded focus:ring-[#1e40af]"
//                   />
//                   <span className="text-xs font-bold text-slate-700 leading-tight">Consents to removed tissue handled per policy; device/brand & NAFDAC Reg. No.</span>
//                 </label>
//              </div>
//           </div>
//         </section>

//         {/* Part H */}
//         <section>
//            <div className="bg-[#475569] text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part H — Language, Interpretation & Capacity</div>
//            <div className="border-4 border-slate-900 rounded-3xl p-6 bg-slate-50 space-y-4 relative">
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                 <div className="space-y-2">
//                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Language of discussion</label>
//                    <input 
//                      type="text" 
//                      value={formData.discussion_language} 
//                      onChange={(e) => handleInputChange("discussion_language", e.target.value)}
//                      readOnly={readOnly}
//                      className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
//                    />
//                 </div>
//                 <div className="space-y-2">
//                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Interpreter used?</label>
//                    <div className="flex gap-4 p-3 bg-white border-2 border-slate-200 rounded-xl">
//                      {["No", "Yes"].map(type => (
//                        <label key={type} className="flex items-center gap-2 cursor-pointer group">
//                          <input 
//                            type="radio" 
//                            name="interpreter_used" 
//                            checked={formData.interpreter_used === type} 
//                            onChange={() => handleInputChange("interpreter_used", type)}
//                            disabled={readOnly}
//                            className="w-4 h-4 text-[#1e40af] focus:ring-[#1e40af]"
//                          />
//                          <span className="text-[11px] font-bold text-slate-600 group-hover:text-[#1e40af] transition-colors">{type}</span>
//                        </label>
//                      ))}
//                    </div>
//                 </div>
//                 <div className="space-y-2">
//                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Interpreter Full Name</label>
//                    <input 
//                      type="text" 
//                      value={formData.interpreter_name} 
//                      onChange={(e) => handleInputChange("interpreter_name", e.target.value)}
//                      readOnly={readOnly}
//                      className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
//                    />
//                 </div>
//                 <div className="space-y-2">
//                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Designation / Bleep</label>
//                    <input 
//                      type="text" 
//                      value={formData.interpreter_designation} 
//                      onChange={(e) => handleInputChange("interpreter_designation", e.target.value)}
//                      readOnly={readOnly}
//                      className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
//                    />
//                 </div>
//                 <div className="space-y-2 flex-grow flex flex-col">
//                   <div className="flex-grow min-h-[250px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-white">
//                     {readOnly ? (
//                       <div className="h-full w-full flex items-center justify-center p-2">
//                         {formData.interpreter_signature ? (
//                           <img src={getSigUrl(formData.interpreter_signature)} alt="Interpreter Signature" className="max-h-full max-w-full object-contain" />
//                         ) : (
//                           <span className="text-slate-300 font-bold uppercase text-xs">No Signature</span>
//                         )}
//                       </div>
//                     ) : (
//                       <SignaturePad 
//                         onEnd={(data) => handleInputChange("interpreter_signature", data)}
//                         onClear={() => handleInputChange("interpreter_signature", null)}
//                         className="h-full w-full"
//                       />
//                     )}
//                   </div>
//                   <p className="text-[10px] text-slate-400 font-bold italic text-center mt-2">Interpreter Signature</p>
//                 </div>
//                 <div className="space-y-2">
//                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Date / Time</label>
//                    <input 
//                      type="datetime-local" 
//                      value={formData.interpreter_date} 
//                      onChange={(e) => handleInputChange("interpreter_date", e.target.value)}
//                      readOnly={readOnly}
//                      className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
//                    />
//                 </div>
//               </div>
//            </div>
//         </section>

//         {/* Part I & J */}
//         <section className="space-y-12 bg-slate-900 p-10 rounded-[3rem] shadow-2xl">
//           <h3 className="text-center text-white font-black uppercase tracking-[0.5em] text-xl mb-12">Final Declarations & Signatures</h3>
          
//           {/* Clinician Declaration */}
//           <div className="bg-white rounded-3xl p-6 shadow-xl border-t-8 border-[#1e40af] relative flex flex-col">
//             <PartWarning fields={["clinician_signature", "clinician_name"]} />
//             <div className="flex items-center gap-3 mb-6">
//               <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-[#1e40af] font-black">I</div>
//               <h4 className="font-black text-slate-800 uppercase tracking-wider text-[10px]">Declaration of Consenting Clinician</h4>
//             </div>
//             <p className="text-xs text-slate-600 font-bold mb-6 italic border-l-4 border-blue-300 pl-4">
//               I confirm I have explained the procedure and its purpose, the intended benefits, the material risks (serious and frequent), the risks specific to this patient, and the reasonable alternatives including no treatment. I have answered questions honestly, provided any relevant leaflet, and I am satisfied the patient (or parent/guardian) has capacity and consents voluntarily. I have appropriate knowledge of this procedure.
//             </p>
//             <div className="space-y-4 mb-6">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Part J — Additional Clinician Notes</label>
//               <textarea 
//                 rows={2}
//                 value={formData.additional_clinician_notes}
//                 onChange={(e) => handleInputChange("additional_clinician_notes", e.target.value)}
//                 readOnly={readOnly}
//                 className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e40af]"}`}
//               />
//             </div>
            
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
//               <div className="space-y-2 flex flex-col">
//                 <div className="flex-grow min-h-[250px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
//                   {readOnly ? (
//                     <div className="h-full w-full flex items-center justify-center p-2">
//                       {formData.clinician_signature ? (
//                         <img src={getSigUrl(formData.clinician_signature)} alt="Clinician Signature" className="max-h-full max-w-full object-contain" />
//                       ) : (
//                         <span className="text-slate-300 font-bold uppercase text-xs">No Signature</span>
//                       )}
//                     </div>
//                   ) : (
//                     <SignaturePad 
//                       onEnd={(data) => handleInputChange("clinician_signature", data)}
//                       onClear={() => handleInputChange("clinician_signature", null)}
//                       className="h-full w-full"
//                     />
//                   )}
//                 </div>
//                 <div className="mt-4 space-y-3">
//                    <div className="space-y-1">
//                       <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest text-center">Consenting Clinician Name *</p>
//                       <input type="text" value={formData.clinician_name} onChange={(e) => handleInputChange("clinician_name", e.target.value)} readOnly={readOnly} className={`w-full border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-center outline-none transition-all ${readOnly ? "bg-slate-100" : "bg-slate-50 focus:border-[#1e40af]"}`} />
//                    </div>
//                    <div className="space-y-1">
//                       <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest text-center">Designation / Bleep</p>
//                       <input type="text" value={formData.clinician_designation} onChange={(e) => handleInputChange("clinician_designation", e.target.value)} readOnly={readOnly} className={`w-full border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-center outline-none transition-all ${readOnly ? "bg-slate-100" : "bg-slate-50 focus:border-[#1e40af]"}`} />
//                    </div>
//                    <div className="space-y-1">
//                       <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest text-center">Date / Time</p>
//                       <input type="datetime-local" value={formData.clinician_date} onChange={(e) => handleInputChange("clinician_date", e.target.value)} readOnly={readOnly} className={`w-full border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-center outline-none transition-all ${readOnly ? "bg-slate-100" : "bg-slate-50 focus:border-[#1e40af]"}`} />
//                    </div>
//                 </div>
//               </div>

//               <div className="space-y-2 flex flex-col">
//                 <div className="flex-grow min-h-[250px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
//                   {readOnly ? (
//                     <div className="h-full w-full flex items-center justify-center p-2">
//                       {formData.second_clinician_signature ? (
//                         <img src={getSigUrl(formData.second_clinician_signature)} alt="Second Clinician Signature" className="max-h-full max-w-full object-contain" />
//                       ) : (
//                         <span className="text-slate-300 font-bold uppercase text-xs">No Signature</span>
//                       )}
//                     </div>
//                   ) : (
//                     <SignaturePad 
//                       onEnd={(data) => handleInputChange("second_clinician_signature", data)}
//                       onClear={() => handleInputChange("second_clinician_signature", null)}
//                       className="h-full w-full"
//                     />
//                   )}
//                 </div>
//                 <div className="mt-4 space-y-3">
//                    <div className="space-y-1">
//                       <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest text-center">Second Clinician Name</p>
//                       <input type="text" value={formData.second_clinician_name} onChange={(e) => handleInputChange("second_clinician_name", e.target.value)} readOnly={readOnly} className={`w-full border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-center outline-none transition-all ${readOnly ? "bg-slate-100" : "bg-slate-50 focus:border-[#1e40af]"}`} />
//                    </div>
//                    <div className="space-y-1">
//                       <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest text-center">Designation / Bleep</p>
//                       <input type="text" value={formData.second_clinician_designation} onChange={(e) => handleInputChange("second_clinician_designation", e.target.value)} readOnly={readOnly} className={`w-full border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-center outline-none transition-all ${readOnly ? "bg-slate-100" : "bg-slate-50 focus:border-[#1e40af]"}`} />
//                    </div>
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* Part K - Patient Consent */}
//           <div className="bg-white rounded-3xl p-6 shadow-xl border-t-8 border-emerald-500 relative flex flex-col mt-8">
//             <PartWarning fields={["patient_signature", "read_understood", "risks_explained", "individual_risks_accepted", "modify_approach", "anaesthesia_consent", "withdraw_consent_ack", "additional_procedures_ack"]} />
//             <div className="flex items-center gap-3 mb-6">
//               <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 font-black">K</div>
//               <h4 className="font-black text-slate-800 uppercase tracking-wider text-[10px]">Patient Consent Declaration (Adult with capacity)</h4>
//             </div>
//             <div className="space-y-3 mb-6">
//                {[
//                  { id: "read_understood", label: "I have read, or had read to me, and I understand the information in Parts A to J of this form." },
//                  { id: "risks_explained", label: "The benefits, risks and alternatives have been explained and I have had the opportunity to ask questions." },
//                  { id: "individual_risks_accepted", label: "I understand and accept the risks described, including those relevant to my individual circumstances." },
//                  { id: "modify_approach", label: "I understand the team will use the planned approach but may modify it if clinically necessary during the procedure." },
//                  { id: "anaesthesia_consent", label: "I consent to the anaesthesia / sedation described in Part F." },
//                  { id: "withdraw_consent_ack", label: "I understand I may withdraw my consent at any time before the procedure begins." },
//                  { id: "additional_procedures_ack", label: "I consent to additional procedures judged immediately necessary to deal with an unexpected situation that cannot safely be deferred." }
//                ].map(item => (
//                  <label key={item.id} className="flex items-start gap-2 p-2 bg-emerald-50/50 rounded-xl cursor-pointer">
//                     <input 
//                       type="checkbox" 
//                       checked={formData[item.id]} 
//                       onChange={(e) => handleInputChange(item.id, e.target.checked)}
//                       disabled={readOnly}
//                       className="mt-1 w-4 h-4 text-emerald-600 rounded"
//                     />
//                     <span className="text-[10px] font-bold text-emerald-900">{item.label}</span>
//                  </label>
//                ))}
//             </div>
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
//               <div className="space-y-2 flex-grow flex flex-col">
//                 <div className="flex-grow min-h-[250px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
//                   {readOnly ? (
//                     <div className="h-full w-full flex items-center justify-center p-2">
//                       {formData.patient_signature ? (
//                         <img src={getSigUrl(formData.patient_signature)} alt="Patient Signature" className="max-h-full max-w-full object-contain" />
//                       ) : (
//                         <span className="text-slate-300 font-bold uppercase text-xs">No Signature</span>
//                       )}
//                     </div>
//                   ) : (
//                     <SignaturePad 
//                       onEnd={(data) => handleInputChange("patient_signature", data)}
//                       onClear={() => handleInputChange("patient_signature", null)}
//                       className="h-full w-full"
//                     />
//                   )}
//                 </div>
//                 <div className="mt-4 space-y-3">
//                    <div className="space-y-1">
//                       <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest text-center">Patient Name *</p>
//                       <input type="text" value={formData.patient_name} onChange={(e) => handleInputChange("patient_name", e.target.value)} readOnly={readOnly} className={`w-full border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-center outline-none transition-all ${readOnly ? "bg-slate-100" : "bg-slate-50 focus:border-emerald-500"}`} />
//                    </div>
//                    <div className="space-y-1">
//                       <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest text-center">Date / Time</p>
//                       <input type="datetime-local" value={formData.patient_date} onChange={(e) => handleInputChange("patient_date", e.target.value)} readOnly={readOnly} className={`w-full border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-center outline-none transition-all ${readOnly ? "bg-slate-100" : "bg-slate-50 focus:border-emerald-500"}`} />
//                    </div>
//                 </div>
//               </div>
//               <div className="space-y-2 flex-grow flex flex-col">
//                 <div className="flex-grow min-h-[250px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
//                   {readOnly ? (
//                     <div className="h-full w-full flex items-center justify-center p-2">
//                       {formData.witness_signature ? (
//                         <img src={getSigUrl(formData.witness_signature)} alt="Witness Signature" className="max-h-full max-w-full object-contain" />
//                       ) : (
//                         <span className="text-slate-300 font-bold uppercase text-xs">No Signature</span>
//                       )}
//                     </div>
//                   ) : (
//                     <SignaturePad 
//                       onEnd={(data) => handleInputChange("witness_signature", data)}
//                       onClear={() => handleInputChange("witness_signature", null)}
//                       className="h-full w-full"
//                     />
//                   )}
//                 </div>
//                 <div className="mt-4 space-y-3">
//                    <div className="space-y-1">
//                       <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest text-center">Witness Name (If unable to sign)</p>
//                       <input type="text" value={formData.witness_name} onChange={(e) => handleInputChange("witness_name", e.target.value)} readOnly={readOnly} className={`w-full border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-center outline-none transition-all ${readOnly ? "bg-slate-100" : "bg-slate-50 focus:border-emerald-500"}`} />
//                    </div>
//                 </div>
//               </div>
//             </div>
//           </div>
          
//           {/* Part L - Parent / Guardian */}
//           <div className="bg-purple-50 border-4 border-purple-200 p-8 rounded-3xl relative mt-8">
//              <div className="flex items-center gap-3 mb-4">
//                 <div className="w-8 h-8 bg-purple-200 rounded-lg flex items-center justify-center text-purple-700 font-black">L</div>
//                 <h4 className="font-black text-purple-900 uppercase tracking-widest text-[10px]">Consent by Parent / Guardian</h4>
//              </div>
//              <p className="text-xs text-purple-700 font-medium mb-6">Complete for a patient under 18, or who otherwise cannot consent for themselves. Consent is given by a person with parental responsibility or legal guardian, in the patient's best interests.</p>
             
//              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                <div className="space-y-2">
//                   <label className="block text-[10px] font-black text-purple-400 uppercase tracking-widest">Name of Parent / Guardian</label>
//                   <input 
//                     type="text" 
//                     value={formData.parent_guardian_name} 
//                     onChange={(e) => handleInputChange("parent_guardian_name", e.target.value)}
//                     readOnly={readOnly}
//                     className={`w-full border-2 border-purple-200 rounded-xl px-4 py-2 font-bold text-purple-900 transition-all outline-none ${readOnly ? "bg-purple-100" : "bg-white focus:border-purple-400"}`}
//                   />
//                </div>
               
//                <div className="space-y-2">
//                   <label className="block text-[10px] font-black text-purple-400 uppercase tracking-widest">Relationship to Patient</label>
//                   <input 
//                     type="text" 
//                     value={formData.relationship} 
//                     onChange={(e) => handleInputChange("relationship", e.target.value)}
//                     readOnly={readOnly}
//                     className={`w-full border-2 border-purple-200 rounded-xl px-4 py-2 font-bold text-purple-900 transition-all outline-none ${readOnly ? "bg-purple-100" : "bg-white focus:border-purple-400"}`}
//                   />
//                </div>

//                <div className="space-y-2 md:col-span-2">
//                  <label className="block text-[10px] font-black text-purple-400 uppercase tracking-widest">Legal Basis (If not a parent)</label>
//                  <div className="flex gap-4 p-3 bg-white border-2 border-purple-200 rounded-xl">
//                    {["Parental responsibility", "Legal guardian", "Court order"].map(type => (
//                      <label key={type} className="flex items-center gap-2 cursor-pointer group">
//                        <input 
//                          type="radio" 
//                          name="legal_basis" 
//                          checked={formData.legal_basis === type} 
//                          onChange={() => handleInputChange("legal_basis", type)}
//                          disabled={readOnly}
//                          className="w-4 h-4 text-purple-600 focus:ring-purple-600"
//                        />
//                        <span className="text-[11px] font-bold text-purple-900 group-hover:text-purple-600 transition-colors">{type}</span>
//                      </label>
//                    ))}
//                  </div>
//                </div>
               
//                <div className="space-y-2 flex-grow flex flex-col">
//                  <div className="flex-grow min-h-[250px] border-4 border-dashed border-purple-200 rounded-2xl overflow-hidden bg-white">
//                    {readOnly ? (
//                      <div className="h-full w-full flex items-center justify-center p-2">
//                        {formData.parent_signature ? (
//                          <img src={getSigUrl(formData.parent_signature)} alt="Signature" className="max-h-full max-w-full object-contain" />
//                        ) : (
//                          <span className="text-purple-300 font-bold uppercase text-xs">No Signature</span>
//                        )}
//                      </div>
//                    ) : (
//                      <SignaturePad 
//                        onEnd={(data) => handleInputChange("parent_signature", data)}
//                        onClear={() => handleInputChange("parent_signature", null)}
//                        className="h-full w-full"
//                      />
//                    )}
//                  </div>
//                  <p className="text-[10px] text-purple-400 font-bold italic text-center">Parent / Guardian Signature</p>
//                  <input type="datetime-local" value={formData.parent_date} onChange={(e) => handleInputChange("parent_date", e.target.value)} readOnly={readOnly} className={`w-full border border-purple-200 rounded-lg py-2 px-3 text-xs font-bold text-center outline-none transition-all ${readOnly ? "bg-purple-100" : "bg-white focus:border-purple-400"}`} />
//                </div>

//                <div className="space-y-2 flex-grow flex flex-col">
//                  <div className="flex-grow min-h-[250px] border-4 border-dashed border-purple-200 rounded-2xl overflow-hidden bg-white">
//                    {readOnly ? (
//                      <div className="h-full w-full flex items-center justify-center p-2">
//                        {formData.clinician_confirming_signature ? (
//                          <img src={getSigUrl(formData.clinician_confirming_signature)} alt="Signature" className="max-h-full max-w-full object-contain" />
//                        ) : (
//                          <span className="text-purple-300 font-bold uppercase text-xs">No Signature</span>
//                        )}
//                      </div>
//                    ) : (
//                      <SignaturePad 
//                        onEnd={(data) => handleInputChange("clinician_confirming_signature", data)}
//                        onClear={() => handleInputChange("clinician_confirming_signature", null)}
//                        className="h-full w-full"
//                      />
//                    )}
//                  </div>
//                  <p className="text-[10px] text-purple-400 font-bold italic text-center">Consenting Clinician (Confirming best interests)</p>
//                </div>
//              </div>
//           </div>
          
//           {/* Part M - Confirmation & Withdrawal */}
//           <div className="bg-slate-800 border-4 border-slate-700 p-8 rounded-3xl relative mt-8">
//              <div className="flex items-center gap-3 mb-4">
//                 <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center text-white font-black">M</div>
//                 <h4 className="font-black text-white uppercase tracking-widest text-[10px]">Confirmation & Withdrawal of Consent</h4>
//              </div>
             
//              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
//                 <div className="space-y-2 flex-grow flex flex-col">
//                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Confirmation immediately before the procedure</label>
//                   <div className="flex-grow min-h-[250px] border-4 border-dashed border-slate-300 rounded-2xl overflow-hidden bg-slate-50">
//                     {readOnly ? (
//                       <div className="h-full w-full flex items-center justify-center p-2">
//                         {formData.confirming_clinician_signature ? (
//                           <img src={getSigUrl(formData.confirming_clinician_signature)} alt="Signature" className="max-h-full max-w-full object-contain" />
//                         ) : (
//                           <span className="text-slate-500 font-bold uppercase text-xs">No Signature</span>
//                         )}
//                       </div>
//                     ) : (
//                       <SignaturePad 
//                         onEnd={(data) => handleInputChange("confirming_clinician_signature", data)}
//                         onClear={() => handleInputChange("confirming_clinician_signature", null)}
//                         className="h-full w-full"
//                       />
//                     )}
//                   </div>
//                   <input type="text" placeholder="Confirming Clinician Name" value={formData.confirming_clinician_name} onChange={(e) => handleInputChange("confirming_clinician_name", e.target.value)} readOnly={readOnly} className={`w-full border border-slate-600 rounded-lg py-2 px-3 text-xs font-bold text-center text-white outline-none transition-all ${readOnly ? "bg-slate-700" : "bg-slate-800 focus:border-slate-400"}`} />
//                 </div>
                
//                 <div className="space-y-2 flex-grow flex flex-col">
//                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Withdrawal of Consent</label>
//                   <div className="flex-grow min-h-[250px] border-4 border-dashed border-slate-300 rounded-2xl overflow-hidden bg-slate-50">
//                     {readOnly ? (
//                       <div className="h-full w-full flex items-center justify-center p-2">
//                         {formData.withdrawal_patient_signature ? (
//                           <img src={getSigUrl(formData.withdrawal_patient_signature)} alt="Signature" className="max-h-full max-w-full object-contain" />
//                         ) : (
//                           <span className="text-slate-500 font-bold uppercase text-xs">No Signature</span>
//                         )}
//                       </div>
//                     ) : (
//                       <SignaturePad 
//                         onEnd={(data) => handleInputChange("withdrawal_patient_signature", data)}
//                         onClear={() => handleInputChange("withdrawal_patient_signature", null)}
//                         className="h-full w-full"
//                       />
//                     )}
//                   </div>
//                   <input type="text" placeholder="Patient / Parent Name" value={formData.withdrawal_patient_name} onChange={(e) => handleInputChange("withdrawal_patient_name", e.target.value)} readOnly={readOnly} className={`w-full border border-slate-600 rounded-lg py-2 px-3 text-xs font-bold text-center text-white outline-none transition-all ${readOnly ? "bg-slate-700" : "bg-slate-800 focus:border-slate-400"}`} />
//                 </div>
//              </div>
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
//               {submitting ? (
//                 <Loader2 className="animate-spin" size={20} />
//               ) : (
//                 <CheckCircle size={20} />
//               )}
//               {submitting ? "Finalizing..." : "Submit & Print Consent"}
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

// export default ChemicalPleurodesisConsentForm;
