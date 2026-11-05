import React, { useState, useEffect, useRef } from "react";
import { CheckCircle, Loader2, Printer, AlertCircle, Save } from "lucide-react";
import { consentService, ConsentTemplate } from "../../services/consent.service";
import SignaturePad from "../SignaturePad";
import { useAuth } from "../../context/AuthContext";
import { useNotification } from "../../context/NotificationContext";
import { OTSurgery } from "../../services/ot.service";
import { BASE_URL } from "../../api/client";
import apiClient from "../../api/client";
import { patientService } from "../../services/patient.service";
import { formDraftService } from "../../services/session-restore.service";

export interface CsDeliveryConsentFormProps {
  surgery?: OTSurgery;
  orderId?: number;
  patientName?: string;
  mrn?: string;
  initialData?: any;
  draftId?: number | null;
  onSuccess?: (formData?: any) => void;
  onCancel: () => void;
  onPrint?: () => void;
  readOnly?: boolean;
  viewData?: any;
}

const CsDeliveryConsentForm: React.FC<CsDeliveryConsentFormProps> = ({
  surgery,
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

  const targetOrderId = orderId || surgery?.order_id || surgery?.id || 0;
  const targetMrn = mrn || surgery?.mrn || "";
  const initialMotherName = patientName || surgery?.patient_name || "";

  // Strip trailing slashes and redundant /api or /api/v1 prefixes for media assets
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

  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [formData, setFormData] = useState<any>(
    viewData || initialData || {
      // Type of CS
      planned_type: "",
      rcog_category: "",

      // Part A - Mother Identification
      mother_name: initialMotherName,
      dob: "",
      mrn: targetMrn,
      gestation: "",
      gravida_para: "",
      blood_group: "",
      consultant: surgery?.doctor_name || "",
      ward: "",

      // Indication
      indication_reason: surgery?.diagnosis || "",

      // Part B - Description (Ring 1)
      plain_terms: "",
      core_understanding: false,

      // Part D - Intended Benefits
      intended_benefits: "",

      // Part F - Alternatives
      alternatives_discussed: "",

      // Part G - Individualised Risks (Ring 3)
      individual_risks: "",
      procedure_blood: false,
      procedure_surgery: false,
      procedure_hysterectomy: false,
      procedures_declined: "",

      // Part H - Anaesthesia
      anaesthesia_type: "",

      // Part I - Language & Interpretation
      interpreter_name: "",
      interpreter_signature: null,
      interpreter_date: new Date().toISOString().split("T")[0],

      // Part J - Clinician Declaration
      clinician_notes: "",
      obstetrician_name: surgery?.doctor_name || user?.full_name || "",
      obstetrician_signature: null,
      second_clinician_name: "",
      second_clinician_signature: null,

      // Part K - Mother's Consent
      read_understood: false,
      risks_explained: false,
      individual_risks_accepted: false,
      modify_approach: false,
      anaesthesia_consent: false,
      additional_procedures_ack: false,
      mother_signature: null,
      witness_signature: null,

      // Part L - Emergency Authorisation
      emergency_situation: "",
      nok_name: "",
      nok_relationship: "",
      emergency_obstetrician_signature: null,
      emergency_witness_signature: null,

      // Part M - Confirmation & Withdrawal
      confirmation_clinician_signature: null,
      withdrawal_reason: "",
      withdrawal_mother_signature: null,
      withdrawal_clinician_signature: null,
    }
  );

  useEffect(() => {
    if (viewData || initialData) {
      setFormData((prev: any) => ({ ...prev, ...(viewData || initialData) }));
    }
  }, [viewData, initialData]);

  const isPartComplete = (fields: string[]) => {
    return fields.every((field) => {
      const val = formData[field];
      if (typeof val === "boolean") return val;
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

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  // 1. Fetch Template
  const fetchTemplate = async () => {
    setLoading(true);
    try {
      const data = await consentService.getTemplate("cs-delivery-gsh-t6");
      setTemplate(data);
    } catch (error) {
      console.warn("Falling back to local schema definitions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!readOnly) fetchTemplate();
  }, [readOnly]);

  // 2. Pre-fill and Draft Restoration
  useEffect(() => {
    if (!readOnly && targetMrn && !viewData && !initialData) {
      const localDraftKey = `consent_cs_delivery_${targetOrderId || targetMrn}`;
      const savedDraft = user?.id ? formDraftService.loadDraft<any>(user.id, localDraftKey) : null;

      if (savedDraft) {
        setFormData(savedDraft);
        notify("Restored unsaved changes from your previous session", "success");
        return;
      }

      const fetchPrefillData = async () => {
        try {
          const patient = await patientService.getPatientByMrn(targetMrn);

          let wardUnit = "";
          try {
            const admissionRes = await apiClient.get("/ipd/admission/list");
            const admissions = admissionRes.data?.data?.results || [];
            const activeAdmission = admissions.find(
              (a: any) => a.mrn === targetMrn && a.status === "ACTIVE"
            );
            if (activeAdmission) {
              wardUnit = [
                activeAdmission.ward_name,
                activeAdmission.room_number,
                activeAdmission.bed_number,
              ]
                .filter(Boolean)
                .join(" / ");
            }
          } catch (admError) {
            console.warn("Could not prefill admission details:", admError);
          }

          if (patient) {
            const fullName = `${patient.demographics?.first_name || ""} ${patient.demographics?.last_name || ""}`.trim();
            setFormData((prev: any) => ({
              ...prev,
              mother_name: prev.mother_name || fullName || initialMotherName,
              mrn: targetMrn,
              dob: prev.dob || patient.demographics?.date_of_birth || "",
              blood_group: prev.blood_group || patient.medical_profile?.blood_group || "",
              ward: prev.ward || wardUnit,
              consultant: prev.consultant || surgery?.doctor_name || "",
              indication_reason: prev.indication_reason || surgery?.diagnosis || "",
            }));
          }
        } catch (err) {
          console.error("Failed to prefill patient clinical details", err);
        }
      };

      fetchPrefillData();
    }
  }, [targetMrn, targetOrderId, readOnly, viewData, initialData, user?.id]);

  // 3. Local Auto-Save Loop
  useEffect(() => {
    if (readOnly || !targetOrderId || !user?.id) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(() => {
      const localDraftKey = `consent_cs_delivery_${targetOrderId || targetMrn}`;
      formDraftService.saveDraft(user.id!, localDraftKey, formData);
    }, 1500);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [formData, targetOrderId, targetMrn, user?.id, readOnly]);

  // 4. Save Backend Draft
  const handleSaveDraft = async () => {
    setSubmitting(true);
    try {
      await consentService.createConsent({
        order_id: targetOrderId,
        template_slug: "cs-delivery-gsh-t6",
        witness_user_id: user?.id || 1,
        form_data: {
          ...formData,
          clinician_signature: formData.obstetrician_signature,
          patient_signature: formData.mother_signature || formData.emergency_obstetrician_signature,
        },
        is_draft: true,
        consent_id: draftId,
      });

      notify("Draft saved successfully to the system", "success");
      if (user?.id) {
        formDraftService.clearDraft(user.id, `consent_cs_delivery_${targetOrderId || targetMrn}`);
      }
      onCancel();
    } catch (error: any) {
      notify(error.response?.data?.message || error.message || "Failed to save draft", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // 5. Final Submit
  const handleSubmit = async () => {
    if (!formData.planned_type) {
      notify("Please select the Type of Caesarean Birth", "error");
      return;
    }
    if (
      !formData.mother_name ||
      !formData.dob ||
      !formData.mrn ||
      !formData.gestation ||
      !formData.consultant ||
      !formData.ward ||
      !formData.indication_reason
    ) {
      notify("Please complete all required fields in Part A and Indication", "error");
      return;
    }
    if (!formData.obstetrician_name || !formData.obstetrician_signature) {
      notify("Consenting Obstetrician name and signature are required in Part J", "error");
      return;
    }

    const isEmergency = Boolean(formData.emergency_situation || formData.emergency_obstetrician_signature);

    if (!isEmergency) {
      if (!formData.core_understanding) {
        notify("Please confirm core understanding in Part B", "error");
        return;
      }
      if (
        !formData.read_understood ||
        !formData.risks_explained ||
        !formData.individual_risks_accepted ||
        !formData.modify_approach ||
        !formData.anaesthesia_consent ||
        !formData.additional_procedures_ack
      ) {
        notify("Please check all required declaration items in Part K (Mother's Consent)", "error");
        return;
      }
      if (!formData.mother_signature) {
        notify("Mother's signature is required (or complete Part L for emergency authorisation)", "error");
        return;
      }
    } else {
      if (!formData.emergency_situation) {
        notify("Clinical situation details are required for Emergency Authorisation", "error");
        return;
      }
      if (!formData.emergency_obstetrician_signature) {
        notify("Responsible Obstetrician signature is required for Emergency Authorisation", "error");
        return;
      }
    }

    setSubmitting(true);
    try {
      const payloadFormData = {
        ...formData,
        clinician_signature: formData.obstetrician_signature,
        patient_signature: formData.mother_signature || formData.emergency_obstetrician_signature,
        nurse_signature:
          formData.witness_signature ||
          formData.emergency_witness_signature ||
          formData.second_clinician_signature ||
          null,
      };

      const payload = {
        order_id: targetOrderId,
        template_slug: "cs-delivery-gsh-t6",
        workflow_stage: "SIGNED_AND_CHECKED",
        witness_user_id: user?.id || 1,
        form_data: payloadFormData,
        consent_id: draftId,
      };

      await consentService.createConsent(payload);
      notify("Caesarean Section consent submitted successfully", "success");

      if (user?.id) {
        formDraftService.clearDraft(user.id, `consent_cs_delivery_${targetOrderId || targetMrn}`);
      }

      if (onSuccess) onSuccess(payloadFormData);
      if (onPrint) onPrint();
      else setIsPrintOpen(true);
    } catch (error: any) {
      notify(error.response?.data?.message || error.message || "Failed to submit consent", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Helper for signature rendering
  const renderSignatureBox = (id: string, label: string) => {
    const hasSignature = formData[id] && typeof formData[id] === "string" && formData[id].length > 0;

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
            type="button"
            onClick={() => handleInputChange(id, null)}
            className="absolute top-2 right-2 bg-red-100 text-red-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase hover:bg-red-200 transition-colors opacity-0 group-hover:opacity-100 shadow-sm"
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl shadow-xl mx-auto max-w-4xl">
        <Loader2 className="animate-spin text-[#3B309A] mb-4" size={48} />
        <p className="text-slate-500 font-bold uppercase tracking-widest animate-pulse">
          Loading CS Consent Template...
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col max-w-6xl mx-auto w-[90vw]">
      {/* Header */}
      <div className="bg-[#1e1b4b] text-white p-10 flex justify-between items-center relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
        <div className="z-10">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
              <img src="/assets/login-bg.jpeg" alt="Logo" className="w-10 h-10 object-contain" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter">Procedure Consent Form</h1>
              <p className="text-indigo-300 font-bold text-sm uppercase tracking-widest">
                Caesarean Section Delivery
              </p>
            </div>
          </div>
          <p className="text-xs text-indigo-200/60 font-medium">
            Form Ref: GSH-CONSENT-CS-001 • Policy Ref: GSH-T6 • Version 1.0 • Multi-Stage Consent
          </p>
        </div>
        <div className="text-right z-10 flex flex-col items-end gap-3">
          <div className="hidden md:block text-right">
            <p className="text-[10px] text-indigo-200 font-bold leading-tight uppercase tracking-wider">
              Medbookie
            </p>
            <p className="text-[10px] text-indigo-200">+234 705 648 2776 • admin@Medbookiehospitals.com</p>
          </div>
          <button
            type="button"
            onClick={onPrint || (() => window.print())}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/20 transition-all"
          >
            <Printer size={14} /> Print Blank Form
          </button>
        </div>
      </div>

      {/* Main Form Body */}
      <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar bg-white">
        {/* Patient Rights */}
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-amber-200/50 px-4 py-1 rounded-bl-xl text-[10px] font-black text-amber-800 uppercase tracking-wider">
            Patient Rights
          </div>
          <p className="text-sm text-amber-900 font-medium leading-relaxed italic">
            "You have the right to make decisions about your medical care and to refuse any procedure. If you wish
            to withdraw consent at any time before the procedure begins, you may do so. Signing this form does not
            remove your legal rights. This form complies with the National Health Act 2014 (Nigeria) and Medbookie
            Hospitals Consent Policy (GSH-T6)."
          </p>
        </div>

        {/* Layered Consent Framework Notice */}
        <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-6 relative">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-2">
            How this form works — concentric (layered) consent
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            Information is layered in rings from the essential <strong>CORE</strong> outward. The ring labels inside
            Parts B, C, E, and G show the layer of disclosure: <strong>Ring 1</strong> (core every woman must understand),
            <strong>Ring 2</strong> (common & serious risks and alternatives), <strong>Ring 3</strong> (individualised
            factors), and <strong>Ring 4</strong> (practical & after-care). The clinician records what was discussed at
            each depth.
          </p>
        </div>

        {/* Type of Caesarean Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Type of Caesarean Birth *
            </label>
            <div className="grid grid-cols-1 gap-2 p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl">
              {[
                "Planned (elective) LSCS",
                "Unplanned LSCS (within ~72 h)",
                "Emergency LSCS (≤ 30 min)",
              ].map((type) => (
                <label key={type} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="planned_type"
                    checked={formData.planned_type === type}
                    onChange={() => handleInputChange("planned_type", type)}
                    disabled={readOnly}
                    className="w-4 h-4 text-[#1e1b4b]"
                  />
                  <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-900 transition-colors">
                    {type}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
              RCOG Category
            </label>
            <div className="grid grid-cols-1 gap-2 p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl">
              {[
                "1 (immediate threat to life)",
                "2 (compromise, not immediately life-threatening)",
                "3 (early birth needed, no compromise)",
                "4 (elective)",
              ].map((category) => (
                <label key={category} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="rcog_category"
                    checked={formData.rcog_category === category}
                    onChange={() => handleInputChange("rcog_category", category)}
                    disabled={readOnly}
                    className="w-4 h-4 text-[#1e1b4b]"
                  />
                  <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-900 transition-colors">
                    {category}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Part A — Mother Identification */}
        <section>
          <div className="bg-[#1e1b4b] text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">
            Part A — Mother Identification
          </div>
          <div className="border-4 border-slate-900 rounded-3xl p-8 grid grid-cols-1 md:grid-cols-4 gap-6 shadow-inner bg-slate-50 relative">
            <PartWarning fields={["mother_name", "dob", "mrn", "gestation", "consultant", "ward"]} />
            <div className="md:col-span-2 space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Mother's Full Name *
              </label>
              <input
                type="text"
                value={formData.mother_name}
                onChange={(e) => handleInputChange("mother_name", e.target.value)}
                readOnly={readOnly}
                className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${
                  readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e1b4b]"
                }`}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Date of Birth *
              </label>
              <input
                type="date"
                value={formData.dob}
                onChange={(e) => handleInputChange("dob", e.target.value)}
                readOnly={readOnly}
                className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${
                  readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e1b4b]"
                }`}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                MRN *
              </label>
              <input
                type="text"
                value={formData.mrn}
                readOnly
                className="w-full bg-slate-100 border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-500"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Gestation (Weeks) *
              </label>
              <input
                type="text"
                value={formData.gestation}
                onChange={(e) => handleInputChange("gestation", e.target.value)}
                readOnly={readOnly}
                placeholder="e.g. 38 + 4"
                className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${
                  readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e1b4b]"
                }`}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Gravida / Para
              </label>
              <input
                type="text"
                value={formData.gravida_para}
                onChange={(e) => handleInputChange("gravida_para", e.target.value)}
                readOnly={readOnly}
                placeholder="e.g. G2 P1"
                className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${
                  readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e1b4b]"
                }`}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Blood Group / RH
              </label>
              <input
                type="text"
                value={formData.blood_group}
                onChange={(e) => handleInputChange("blood_group", e.target.value)}
                readOnly={readOnly}
                placeholder="e.g. O Positive"
                className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${
                  readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e1b4b]"
                }`}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Ward / Unit *
              </label>
              <input
                type="text"
                value={formData.ward}
                onChange={(e) => handleInputChange("ward", e.target.value)}
                readOnly={readOnly}
                className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${
                  readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e1b4b]"
                }`}
              />
            </div>
            <div className="md:col-span-4 space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Consultant Obstetrician *
              </label>
              <input
                type="text"
                value={formData.consultant}
                onChange={(e) => handleInputChange("consultant", e.target.value)}
                readOnly={readOnly}
                className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${
                  readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e1b4b]"
                }`}
              />
            </div>
            <div className="md:col-span-4 space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Indication for Caesarean Section *
              </label>
              <textarea
                rows={2}
                value={formData.indication_reason}
                onChange={(e) => handleInputChange("indication_reason", e.target.value)}
                placeholder="e.g. previous CS with failed VBAC; breech presentation; fetal compromise"
                readOnly={readOnly}
                className={`w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 transition-all outline-none resize-none ${
                  readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e1b4b]"
                }`}
              />
            </div>
          </div>
        </section>

        {/* Part B & Part C */}
        <div className="grid grid-cols-1 gap-8">
          <section>
            <div className="bg-[#334155] text-white px-4 py-1 inline-block rounded-t-xl text-[10px] font-black uppercase tracking-widest mb-0 ml-4">
              Part B — Description of the Procedure (Ring 1: Core)
            </div>
            <div className="border-4 border-slate-900 rounded-3xl p-6 bg-slate-50 space-y-4 relative">
              <PartWarning fields={["plain_terms", "core_understanding"]} />
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Why a caesarean is recommended for you (plain terms)
                </label>
                <textarea
                  rows={3}
                  value={formData.plain_terms}
                  onChange={(e) => handleInputChange("plain_terms", e.target.value)}
                  readOnly={readOnly}
                  className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none resize-none ${
                    readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e1b4b]"
                  }`}
                />
              </div>
              <label className="flex items-start gap-3 p-4 bg-white border-2 border-slate-200 rounded-2xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.core_understanding}
                  onChange={(e) => handleInputChange("core_understanding", e.target.checked)}
                  disabled={readOnly}
                  className="mt-1 w-5 h-5 text-[#1e1b4b] rounded"
                />
                <span className="text-xs font-bold text-slate-700 leading-relaxed">
                  The mother understands what a CS is, why it is recommended, and the core risks (heavy
                  bleeding, infection, clots, organ injury, future pregnancy impacts). *
                </span>
              </label>
            </div>
          </section>

          <section>
            <div className="bg-[#334155] text-white px-4 py-1 inline-block rounded-t-xl text-[10px] font-black uppercase tracking-widest mb-0 ml-4">
              Part C — What to Expect (Ring 4: Practical Detail & After-care)
            </div>
            <div className="border-4 border-slate-900 rounded-3xl p-6 bg-slate-50 space-y-2">
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                <strong>Before:</strong> fasting, IV access, bladder catheter, antacid and antibiotics.{" "}
                <strong>Anaesthesia:</strong> usually spinal/epidural so you are awake.{" "}
                <strong>During:</strong> low 'bikini-line' incision, baby delivered, placenta removed.{" "}
                <strong>Baby:</strong> skin-to-skin and early breastfeeding supported.{" "}
                <strong>After:</strong> pain relief, clot prevention, early mobilisation.
              </p>
            </div>
          </section>
        </div>

        {/* Part D — Intended Benefits */}
        <section>
          <div className="bg-[#1e293b] text-white px-4 py-1 inline-block rounded-t-xl text-[10px] font-black uppercase tracking-widest mb-0 ml-4">
            Part D — Intended Benefits
          </div>
          <div className="border-4 border-slate-900 rounded-3xl p-6 bg-slate-50 relative">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Expected outcome for mother and baby
            </label>
            <textarea
              rows={2}
              value={formData.intended_benefits}
              onChange={(e) => handleInputChange("intended_benefits", e.target.value)}
              readOnly={readOnly}
              placeholder="e.g. Safe birth of baby avoiding obstructed labour and fetal hypoxia"
              className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none resize-none ${
                readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e1b4b]"
              }`}
            />
          </div>
        </section>

        {/* Part E — Risks & Complications Table */}
        <section>
          <div className="bg-[#be123c] text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">
            Part E — Risks & Complications (Ring 2)
          </div>
          <div className="border-4 border-slate-900 rounded-3xl overflow-hidden shadow-xl">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest border-r border-slate-700 w-1/4">
                    Frequency
                  </th>
                  <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest border-r border-slate-700 w-2/5">
                    Risk / Complication
                  </th>
                  <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest">
                    Additional Detail
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {[
                  [
                    "COMMON",
                    "Persistent wound/abdominal discomfort; infection; bleeding",
                    "Managed with analgesia, antibiotics and wound care.",
                  ],
                  [
                    "COMMON (baby)",
                    "Transient fast breathing (tachypnoea)",
                    "Usually settles; paediatric support available.",
                  ],
                  [
                    "UNCOMMON",
                    "Heavy bleeding (haemorrhage) needing transfusion/surgery; Blood clots (DVT/PE)",
                    "Transfusion, surgical measures, clot-prevention.",
                  ],
                  [
                    "RARE",
                    "Injury to bladder, ureter or bowel; Admission to ICU",
                    "May require repair and specialist input.",
                  ],
                  [
                    "RARE (baby)",
                    "Accidental surgical cut (laceration) at delivery",
                    "Usually minor; heals well.",
                  ],
                  [
                    "VERY RARE",
                    "Emergency hysterectomy as life-saving last resort; death",
                    "Resuscitation and senior teams available.",
                  ],
                  [
                    "FUTURE PREGNANCY",
                    "Higher chance of repeat CS, uterine-scar problems, placenta praevia/accreta",
                    "Relevant to planning future births.",
                  ],
                ].map((row, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="px-6 py-3.5 font-black text-[#be123c] border-r border-slate-200">{row[0]}</td>
                    <td className="px-6 py-3.5 font-bold text-slate-700 border-r border-slate-200">{row[1]}</td>
                    <td className="px-6 py-3.5 font-medium text-slate-500 italic">{row[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Part F — Alternatives */}
        <section>
          <div className="bg-[#ea580c] text-white px-4 py-1 inline-block rounded-t-xl text-[10px] font-black uppercase tracking-widest mb-0 ml-4">
            Part F — Alternatives to Caesarean Section
          </div>
          <div className="border-4 border-slate-900 rounded-3xl p-6 bg-slate-50 relative">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Alternatives discussed with this mother (VBAC, Induction, Expectant, None) and what happens if no CS is performed
            </label>
            <textarea
              rows={2}
              value={formData.alternatives_discussed}
              onChange={(e) => handleInputChange("alternatives_discussed", e.target.value)}
              readOnly={readOnly}
              className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none resize-none ${
                readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e1b4b]"
              }`}
            />
          </div>
        </section>

        {/* Part G — Individualised Risks */}
        <section>
          <div className="bg-[#475569] text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">
            Part G — Individualised Risks & Procedures (Ring 3)
          </div>
          <div className="border-4 border-slate-900 rounded-3xl p-8 grid grid-cols-1 md:grid-cols-2 gap-6 shadow-inner bg-slate-50 relative">
            <div className="md:col-span-2 space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Risks/factors specific to THIS mother (e.g. anaemia, high BMI, previous CS, fibroids)
              </label>
              <textarea
                rows={2}
                value={formData.individual_risks}
                onChange={(e) => handleInputChange("individual_risks", e.target.value)}
                readOnly={readOnly}
                className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none resize-none ${
                  readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e1b4b]"
                }`}
              />
            </div>
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { id: "procedure_blood", label: "Blood transfusion if required" },
                { id: "procedure_surgery", label: "Additional surgery to control bleeding" },
                { id: "procedure_hysterectomy", label: "Hysterectomy as life-saving last resort" },
              ].map((item) => (
                <label key={item.id} className="flex items-start gap-3 p-4 bg-white border-2 border-slate-200 rounded-2xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData[item.id]}
                    onChange={(e) => handleInputChange(item.id, e.target.checked)}
                    disabled={readOnly}
                    className="mt-1 w-5 h-5 text-[#1e1b4b] rounded"
                  />
                  <span className="text-xs font-bold text-slate-700 leading-tight">{item.label}</span>
                </label>
              ))}
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Procedures the mother does NOT wish carried out under any circumstances
              </label>
              <textarea
                rows={2}
                value={formData.procedures_declined}
                onChange={(e) => handleInputChange("procedures_declined", e.target.value)}
                readOnly={readOnly}
                className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none resize-none ${
                  readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e1b4b]"
                }`}
              />
            </div>
          </div>
        </section>

        {/* Part H & Part I */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section>
            <div className="bg-[#475569] text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">
              Part H — Anaesthesia & Sedation
            </div>
            <div className="border-4 border-slate-900 rounded-3xl p-6 bg-slate-50 space-y-4 relative h-[calc(100%-2rem)]">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Planned Anaesthesia Type
              </label>
              <div className="grid grid-cols-1 gap-3">
                {[
                  "Regional (spinal / epidural)",
                  "General anaesthesia",
                  "Combined / converting if needed",
                ].map((type) => (
                  <label key={type} className="flex items-center gap-3 p-3 bg-white border-2 border-slate-200 rounded-xl cursor-pointer">
                    <input
                      type="radio"
                      name="anaesthesia_type"
                      checked={formData.anaesthesia_type === type}
                      onChange={() => handleInputChange("anaesthesia_type", type)}
                      disabled={readOnly}
                      className="w-5 h-5 text-[#1e1b4b]"
                    />
                    <span className="text-xs font-bold text-slate-700">{type}</span>
                  </label>
                ))}
              </div>
            </div>
          </section>

          <section>
            <div className="bg-[#475569] text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">
              Part I — Language & Interpretation
            </div>
            <div className="border-4 border-slate-900 rounded-3xl p-6 bg-slate-50 space-y-4 relative flex flex-col justify-between">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Interpreter Full Name
                </label>
                <input
                  type="text"
                  value={formData.interpreter_name}
                  onChange={(e) => handleInputChange("interpreter_name", e.target.value)}
                  readOnly={readOnly}
                  className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${
                    readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e1b4b]"
                  }`}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Interpreter Signature
                </label>
                <div className="h-32 border-2 border-dashed border-slate-300 rounded-xl bg-white overflow-hidden">
                  {renderSignatureBox("interpreter_signature", "Interpreter Signature")}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Declarations & Signatures Section */}
        <section className="space-y-12 bg-slate-900 p-10 rounded-[3rem] shadow-2xl">
          <h3 className="text-center text-white font-black uppercase tracking-[0.5em] text-xl mb-8">
            Final Declarations & Signatures
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Part J — Consenting Obstetrician */}
            <div className="bg-white rounded-3xl p-6 shadow-xl border-t-8 border-[#1e1b4b] relative flex flex-col justify-between">
              <PartWarning fields={["obstetrician_name", "obstetrician_signature"]} />
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-[#1e1b4b] font-black">
                    J
                  </div>
                  <h4 className="font-black text-slate-800 uppercase tracking-wider text-xs">
                    PART J — Declaration of Consenting Obstetrician
                  </h4>
                </div>
                <div className="space-y-2 mb-4">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Additional Clinician Notes
                  </label>
                  <textarea
                    rows={2}
                    value={formData.clinician_notes}
                    onChange={(e) => handleInputChange("clinician_notes", e.target.value)}
                    readOnly={readOnly}
                    className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none resize-none ${
                      readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e1b4b]"
                    }`}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Obstetrician Signature *
                  </label>
                  <div className="h-44 border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
                    {renderSignatureBox("obstetrician_signature", "Obstetrician Signature")}
                  </div>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest text-center">
                  Obstetrician Full Name *
                </p>
                <input
                  type="text"
                  value={formData.obstetrician_name}
                  onChange={(e) => handleInputChange("obstetrician_name", e.target.value)}
                  readOnly={readOnly}
                  className={`w-full border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-center outline-none ${
                    readOnly ? "bg-slate-100" : "bg-slate-50 focus:border-[#1e1b4b]"
                  }`}
                />
              </div>
            </div>

            {/* Part K — Mother's Consent Declaration */}
            <div className="bg-white rounded-3xl p-6 shadow-xl border-t-8 border-pink-500 relative flex flex-col justify-between">
              <PartWarning
                fields={[
                  "mother_signature",
                  "read_understood",
                  "risks_explained",
                  "individual_risks_accepted",
                  "modify_approach",
                  "anaesthesia_consent",
                  "additional_procedures_ack",
                ]}
              />
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center text-pink-600 font-black">
                    K
                  </div>
                  <h4 className="font-black text-slate-800 uppercase tracking-wider text-xs">
                    PART K — Mother's Consent Declaration
                  </h4>
                </div>
                <div className="space-y-2 mb-4">
                  {[
                    { id: "read_understood", label: "I have read/understood Parts A to J" },
                    { id: "risks_explained", label: "Benefits, risks and alternatives explained" },
                    { id: "individual_risks_accepted", label: "I accept individualised risks" },
                    { id: "modify_approach", label: "Team may modify approach if clinically necessary" },
                    { id: "anaesthesia_consent", label: "I consent to anaesthesia described in Part H" },
                    {
                      id: "additional_procedures_ack",
                      label: "Additional procedures done only to save my life",
                    },
                  ].map((item) => (
                    <label key={item.id} className="flex items-center gap-2 p-1.5 bg-pink-50/50 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData[item.id]}
                        onChange={(e) => handleInputChange(item.id, e.target.checked)}
                        disabled={readOnly}
                        className="w-4 h-4 text-pink-600 rounded"
                      />
                      <span className="text-[11px] font-bold text-pink-950">{item.label} *</span>
                    </label>
                  ))}
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Mother's Signature *
                  </label>
                  <div className="h-44 border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
                    {renderSignatureBox("mother_signature", "Mother Signature")}
                  </div>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest text-center">
                  Witness Signature (If mother unable to sign)
                </p>
                <div className="h-20 border-2 border-dashed border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                  {renderSignatureBox("witness_signature", "Witness Signature")}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Part L — Emergency Authorisation */}
        <section className="bg-red-50 border-4 border-red-200 p-8 rounded-3xl relative">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="text-red-600" />
            <h4 className="font-black text-red-900 uppercase tracking-widest text-sm">
              Part L — Emergency Authorisation (Mother Unable to Consent)
            </h4>
          </div>
          <p className="text-xs text-red-700 font-medium mb-6">
            Complete this section <strong>ONLY</strong> if the mother lacks capacity to consent and immediate delivery is required in the best interests of mother or baby.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2 space-y-2">
              <label className="block text-[10px] font-black text-red-500 uppercase tracking-widest">
                Clinical situation and why immediate caesarean is in patient's best interests
              </label>
              <textarea
                rows={2}
                value={formData.emergency_situation}
                onChange={(e) => handleInputChange("emergency_situation", e.target.value)}
                readOnly={readOnly}
                className={`w-full border-2 border-red-200 rounded-xl px-4 py-2 font-bold text-red-900 transition-all outline-none resize-none ${
                  readOnly ? "bg-red-100" : "bg-white focus:border-red-500"
                }`}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-red-500 uppercase tracking-widest">
                Next of Kin / Representative Name
              </label>
              <input
                type="text"
                value={formData.nok_name}
                onChange={(e) => handleInputChange("nok_name", e.target.value)}
                readOnly={readOnly}
                className={`w-full border-2 border-red-200 rounded-xl px-4 py-2 font-bold text-red-900 transition-all outline-none ${
                  readOnly ? "bg-red-100" : "bg-white focus:border-red-500"
                }`}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-red-500 uppercase tracking-widest">
                Relationship to Patient
              </label>
              <input
                type="text"
                value={formData.nok_relationship}
                onChange={(e) => handleInputChange("nok_relationship", e.target.value)}
                readOnly={readOnly}
                className={`w-full border-2 border-red-200 rounded-xl px-4 py-2 font-bold text-red-900 transition-all outline-none ${
                  readOnly ? "bg-red-100" : "bg-white focus:border-red-500"
                }`}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-red-500 uppercase tracking-widest">
                Responsible Obstetrician Signature
              </label>
              <div className="h-32 border-2 border-dashed border-red-200 rounded-xl bg-white overflow-hidden">
                {renderSignatureBox("emergency_obstetrician_signature", "Emergency Obstetrician")}
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-red-500 uppercase tracking-widest">
                Second Senior Clinician Witness Signature
              </label>
              <div className="h-32 border-2 border-dashed border-red-200 rounded-xl bg-white overflow-hidden">
                {renderSignatureBox("emergency_witness_signature", "Second Senior Clinician Witness")}
              </div>
            </div>
          </div>
        </section>

        {/* Part M — Confirmation & Withdrawal */}
        <section>
          <div className="bg-[#475569] text-white px-4 py-1 inline-block rounded-t-xl text-[10px] font-black uppercase tracking-widest mb-0 ml-4">
            Part M — Confirmation & Withdrawal
          </div>
          <div className="border-4 border-slate-900 rounded-3xl p-8 bg-slate-50 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Confirming Clinician (Immediately before op)
              </label>
              <div className="h-36 border-2 border-dashed border-slate-200 rounded-2xl bg-white overflow-hidden">
                {renderSignatureBox("confirmation_clinician_signature", "Confirming Clinician Signature")}
              </div>
            </div>
            <div className="space-y-3">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Withdrawal Notes (If applicable)
              </label>
              <textarea
                rows={2}
                value={formData.withdrawal_reason}
                onChange={(e) => handleInputChange("withdrawal_reason", e.target.value)}
                readOnly={readOnly}
                placeholder="Reason if mother revokes consent before commencement"
                className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none resize-none ${
                  readOnly ? "bg-slate-100" : "bg-white focus:border-[#1e1b4b]"
                }`}
              />
              <div className="grid grid-cols-2 gap-4">
                <div className="h-24 border-2 border-dashed border-slate-200 rounded-xl bg-white overflow-hidden">
                  {renderSignatureBox("withdrawal_mother_signature", "Mother Withdrawal Sig")}
                </div>
                <div className="h-24 border-2 border-dashed border-slate-200 rounded-xl bg-white overflow-hidden">
                  {renderSignatureBox("withdrawal_clinician_signature", "Clinician Ack Sig")}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Footer Controls */}
      <div className="bg-slate-100 border-t-4 border-slate-200 p-6 flex justify-between items-center shrink-0">
        <button
          type="button"
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
                type="button"
                onClick={handleSaveDraft}
                disabled={submitting}
                className="bg-amber-500 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-[0.1em] text-sm shadow-xl hover:bg-amber-600 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                {submitting ? "Saving..." : "Save Draft"}
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-[#1e1b4b] text-white px-10 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-2xl shadow-indigo-950/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50 disabled:grayscale disabled:scale-100"
              >
                {submitting ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                {submitting ? "Finalizing..." : "Submit & Print Consent"}
              </button>
            </>
          )}
          {readOnly && (
            <button
              type="button"
              onClick={onPrint || (() => window.print())}
              className="bg-[#1e1b4b] text-white px-10 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-2xl transition-all flex items-center gap-3"
            >
              <Printer size={20} /> View Full PDF / Print
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CsDeliveryConsentForm;

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
// import { formDraftService } from "../../services/session-restore.service";

// interface GeneralConsentFormProps {
//   surgery: OTSurgery;
//   initialData?: any;
//   draftId?: number | null;
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

//   // FIX: Properly strip /api or /api/v1 from BASE_URL to point to the public root for uploads
//   const getSigUrl = (path: string | undefined | null) => {
//     if (!path) return "";
//     if (path.startsWith("data:")) return path;
//     const normalizedBaseUrl = BASE_URL.replace(/\/api(\/v\d+)?\/?$/, "").replace(/\/$/, "");
//     return path.startsWith("/") ? `${normalizedBaseUrl}${path}` : `${normalizedBaseUrl}/${path}`;
//   };

//   const [template, setTemplate] = useState<ConsentTemplate | null>(null);
//   const [loading, setLoading] = useState(!readOnly);
//   const [submitting, setSubmitting] = useState(false);
//   const [isPrintOpen, setIsPrintOpen] = useState(false);
  
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

//   // FIX: Ensure viewData or initialData syncs properly into state on Read-Only views
//   useEffect(() => {
//     if (viewData || initialData) {
//       setFormData((prev: any) => ({ ...prev, ...(viewData || initialData) }));
//     }
//   }, [viewData, initialData]);

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
//           const patient = await patientService.getPatientByMrn(surgery.mrn);

//           let wardUnit = "";
//           try {
//             const admissionRes = await apiClient.get("/ipd/admission/list");
//             const admissions = admissionRes.data?.data?.results || [];
            
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
//       }, 1500);
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
      
//       if (user?.id) formDraftService.clearDraft(user.id, `consent_general_${surgery.order_id || surgery.id}`);

//       if (onSuccess) onSuccess();
//       setIsPrintOpen(true);
//     } catch (error: any) {
//       notify(error.response?.data?.message || error.message || "Failed to submit consent", "error");
//     } finally {
//       setSubmitting(false);
//     }
//   };

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
//                       {renderSignatureBox("interpreter_signature", "Interpreter Signature")}
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
//                     {renderSignatureBox("clinician_signature", "Clinician Signature")}
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
//                     {renderSignatureBox("patient_signature", "Patient Signature")}
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
//                     {renderSignatureBox("nurse_signature", "Nurse Signature")}
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
//                   {renderSignatureBox("representative_signature", "Representative Signature")}
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
//                   {renderSignatureBox("withdrawal_signature", "Patient / Representative Signature")}
//                 </div>
//               </div>
//               <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Clinician Signature</label>
//                 <div className="h-32 border-2 border-dashed border-slate-300 rounded-xl bg-white overflow-hidden">
//                   {renderSignatureBox("clinician_withdrawal_signature", "Clinician Signature")}
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


// import React, { useState, useEffect, useRef } from "react";
// import { FileText, CheckCircle, Loader2, Printer, AlertCircle, Save } from "lucide-react";
// import { consentService, ConsentTemplate } from "../../services/consent.service";
// import SignaturePad from "../SignaturePad";
// import { useAuth } from "../../context/AuthContext";
// import { useNotification } from "../../context/NotificationContext";
// import { BASE_URL } from "../../api/client";
// import { patientService } from "../../services/patient.service";
// import { formDraftService } from "../../services/session-restore.service"; // <-- ADDED IMPORT

// export interface CsDeliveryConsentFormProps {
//   orderId: number;
//   patientName: string;
//   mrn: string;
//   initialData?: any;           // <-- ADDED
//   draftId?: number | null;     // <-- ADDED
//   onSuccess: (formData: any) => void;
//   onCancel: () => void;
//   onPrint: () => void;
//   readOnly?: boolean;
//   viewData?: any;
// }

// const CsDeliveryConsentForm: React.FC<CsDeliveryConsentFormProps> = ({
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

//   // Ref for the local auto-save timer
//   const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
//     planned_type: "",
//     rcog_category: "",
//     mother_name: patientName,
//     dob: "",
//     mrn: mrn,
//     gestation: "",
//     gravida_para: "",
//     blood_group: "",
//     consultant: "",
//     ward: "",
//     indication_reason: "",
//     plain_terms: "",
//     core_understanding: false,
//     intended_benefits: "",
//     alternatives_discussed: "",
//     individual_risks: "",
//     procedure_blood: false,
//     procedure_surgery: false,
//     procedure_hysterectomy: false,
//     procedures_declined: "",
//     anaesthesia_type: "",
//     interpreter_name: "",
//     interpreter_signature: null,
//     interpreter_date: "",
//     clinician_notes: "",
//     obstetrician_name: "",
//     obstetrician_signature: null,
//     second_clinician_name: "",
//     second_clinician_signature: null,
//     read_understood: false,
//     risks_explained: false,
//     individual_risks_accepted: false,
//     modify_approach: false,
//     anaesthesia_consent: false,
//     additional_procedures_ack: false,
//     mother_signature: null,
//     witness_signature: null,
//     emergency_situation: "",
//     nok_name: "",
//     nok_relationship: "",
//     emergency_obstetrician_signature: null,
//     emergency_witness_signature: null,
//     confirmation_clinician_signature: null,
//     withdrawal_reason: "",
//     withdrawal_mother_signature: null,
//     withdrawal_clinician_signature: null,
//   });

//   // 1. Initial Data Fetch & Local Draft Restoration
//   useEffect(() => {
//     if (!readOnly && mrn && !viewData && !initialData) {
//       const localDraftId = `consent_cs_delivery_${orderId}`;
//       const savedDraft = user?.id ? formDraftService.loadDraft<any>(user.id, localDraftId) : null;
      
//       if (savedDraft) {
//         setFormData(savedDraft);
//         notify("Restored unsaved changes from your previous session", "success");
//       } else {
//         fetchPatientDetails();
//       }
//     }
    
//     if (!readOnly) fetchTemplate();
//   }, [mrn, readOnly, viewData, initialData, orderId, user?.id]);

//   const fetchPatientDetails = async () => {
//     try {
//       const patient = await patientService.getPatientByMrn(mrn);
//       if (patient) {
//         setFormData((prev: any) => ({
//           ...prev,
//           dob: patient.demographics?.date_of_birth || prev.dob,
//           blood_group: patient.medical_profile?.blood_group || prev.blood_group,
//         }));
//       }
//     } catch (err) {
//       console.error("Failed to fetch patient details for consent pre-fill", err);
//     }
//   };

//   const fetchTemplate = async () => {
//     try {
//       const data = await consentService.getTemplate("cs-delivery-gsh-t6");
//       setTemplate(data);
//     } catch (error) {
//       notify("Failed to load consent template", "error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // 2. Local Auto-Save Loop
//   useEffect(() => {
//     if (readOnly || !orderId || !user?.id) return;
    
//     if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    
//     autoSaveTimerRef.current = setTimeout(() => {
//       const localDraftId = `consent_cs_delivery_${orderId}`;
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
//         template_slug: "cs-delivery-gsh-t6",
//         witness_user_id: user?.id || 0,
//         form_data: formData,
//         is_draft: true,
//         consent_id: draftId,
//       });
//       notify("Draft saved successfully to the system", "success");
      
//       // Clear local storage draft
//       if (user?.id) formDraftService.clearDraft(user.id, `consent_cs_delivery_${orderId}`);
      
//       onCancel(); 
//     } catch (error: any) {
//       notify(error.response?.data?.message || error.message || "Failed to save draft", "error");
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   // 4. Finalizing and Submitting Consent Handler
//   const handleSubmit = async () => {
//     if (!formData.dob) {
//       notify("Date of Birth is required", "error");
//       return;
//     }
//     if (!formData.obstetrician_name) {
//       notify("Obstetrician name is required", "error");
//       return;
//     }
//     if (!formData.obstetrician_signature) {
//       notify("Obstetrician signature is required", "error");
//       return;
//     }
//     if (!formData.mother_signature && !formData.emergency_obstetrician_signature) {
//       notify("Mother's signature or Emergency Authorisation is required", "error");
//       return;
//     }

//     setSubmitting(true);
//     try {
//       const payloadFormData = {
//         ...formData,
//         clinician_signature: formData.obstetrician_signature,
//         patient_signature: formData.mother_signature || formData.emergency_obstetrician_signature,
//         nurse_signature: formData.witness_signature || formData.emergency_witness_signature || "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
//       };

//       const payload = {
//         order_id: orderId,
//         template_slug: "cs-delivery-gsh-t6",
//         workflow_stage: "SIGNED_AND_CHECKED",
//         witness_user_id: user?.id || 0,
//         form_data: payloadFormData,
//         consent_id: draftId, // Passes draft ID so backend overwrites the draft into a final record
//       };
      
//       await consentService.createConsent(payload);
//       notify("Consent form submitted successfully", "success");
      
//       // Clear local storage draft since it is now completed
//       if (user?.id) formDraftService.clearDraft(user.id, `consent_cs_delivery_${orderId}`);

//       onSuccess(formData);
//     } catch (error: any) {
//       notify(error.response?.data?.message || error.message || "Failed to submit consent", "error");
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   if (loading) {
//     return (
//       <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl shadow-xl">
//         <Loader2 className="animate-spin text-[#3B309A] mb-4" size={48} />
//         <p className="text-slate-500 font-bold uppercase tracking-widest animate-pulse">Loading Procedure Template...</p>
//       </div>
//     );
//   }

//   return (
//     <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col max-w-6xl mx-auto">
//       {/* Header - High Fidelity Replica */}
//       <div className="bg-[#3B309A] text-white p-10 flex justify-between items-center relative overflow-hidden shrink-0">
//         <div className="absolute top-0 right-0 w-64 h-64 bg-[#3B309A]/30 rounded-full -mr-32 -mt-32 blur-3xl"></div>
//         <div className="z-10">
//           <div className="flex items-center gap-4 mb-2">
//             <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
//               <img src="/assets/login-bg.jpeg" alt="Medbookie" className="w-10 h-10 object-contain" />
//             </div>
//             <div>
//               <h1 className="text-3xl font-black tracking-tighter">Procedure Consent Form</h1>
//               <p className="text-[#bfb8ff] font-bold text-sm">Caesarean Section Delivery</p>
//             </div>
//           </div>
//           <p className="text-xs text-[#bfb8ff]/80 font-medium">Form Ref: GSH-CONSENT-CS-001 • Policy Ref: GSH-T6 • Version 1.0</p>
//         </div>
//         <div className="text-right z-10 flex flex-col items-end gap-3">
//           <div className="hidden md:block text-right">
//             <p className="text-[10px] text-[#bfb8ff] font-bold leading-tight uppercase tracking-wider">Medbookie</p>
//             <p className="text-[10px] text-[#bfb8ff]">+234 705 648 2776 • admin@Medbookiehospitals.com</p>
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
//         <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 relative overflow-hidden">
//           <div className="absolute top-0 right-0 bg-amber-200/50 px-4 py-1 rounded-bl-xl text-[10px] font-black text-amber-800 uppercase tracking-wider">Patient Rights</div>
//           <p className="text-sm text-amber-900 font-medium leading-relaxed italic">
//             "You have the right to make decisions about your medical care and to refuse any procedure. If you wish to withdraw consent at any time before the procedure begins, you may do so. Signing this form does not remove your legal rights. This form complies with the National Health Act 2014 (Nigeria) and Medbookie Consent Policy (GSH-T6)."
//           </p>
//         </div>

//         {/* Banner Details */}
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
//             <div className="space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Type of Caesarean Birth</label>
//               <div className="grid grid-cols-1 gap-2 p-3 bg-white border-2 border-slate-200 rounded-xl">
//                 {["Planned (elective) LSCS", "Unplanned LSCS (within ~72 h)", "Emergency LSCS (≤ 30 min)"].map(type => (
//                   <label key={type} className="flex items-center gap-2 cursor-pointer group">
//                     <input 
//                       type="radio" 
//                       name="planned_type" 
//                       checked={formData.planned_type === type} 
//                       onChange={() => handleInputChange("planned_type", type)}
//                       disabled={readOnly}
//                       className="w-4 h-4 text-[#3B309A] focus:ring-[#3B309A]"
//                     />
//                     <span className="text-xs font-bold text-slate-600 group-hover:text-[#3B309A] transition-colors">{type}</span>
//                   </label>
//                 ))}
//               </div>
//             </div>
//             <div className="space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">RCOG Category</label>
//               <div className="grid grid-cols-1 gap-2 p-3 bg-white border-2 border-slate-200 rounded-xl">
//                 {["1 (immediate threat to life)", "2 (compromise, not immediately life-threatening)", "3 (early birth needed, no compromise)", "4 (elective)"].map(type => (
//                   <label key={type} className="flex items-center gap-2 cursor-pointer group">
//                     <input 
//                       type="radio" 
//                       name="rcog_category" 
//                       checked={formData.rcog_category === type} 
//                       onChange={() => handleInputChange("rcog_category", type)}
//                       disabled={readOnly}
//                       className="w-4 h-4 text-[#3B309A] focus:ring-[#3B309A]"
//                     />
//                     <span className="text-[11px] font-bold text-slate-600 group-hover:text-[#3B309A] transition-colors">{type}</span>
//                   </label>
//                 ))}
//               </div>
//             </div>
//         </div>

//         {/* Part A - Mother Identification */}
//         <section>
//           <div className="bg-[#3B309A] text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part A — Mother Identification</div>
//           <div className="border-4 border-slate-900 rounded-3xl p-8 grid grid-cols-1 md:grid-cols-4 gap-8 shadow-inner bg-slate-50 relative">
//             <PartWarning fields={["mother_name", "dob", "mrn", "gestation", "ward", "consultant", "indication_reason"]} />
//             <div className="md:col-span-2 space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Mother's Full Name *</label>
//               <input 
//                 type="text" 
//                 value={formData.mother_name} 
//                 onChange={(e) => handleInputChange("mother_name", e.target.value)}
//                 readOnly={readOnly}
//                 className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#3B309A] focus:ring-4 focus:ring-[#3B309A]/10"}`}
//               />
//             </div>
//             <div className="space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Date of Birth *</label>
//               <input 
//                 type="date" 
//                 value={formData.dob} 
//                 onChange={(e) => handleInputChange("dob", e.target.value)}
//                 readOnly={readOnly}
//                 className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#3B309A]"}`}
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
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Gestation (Weeks) *</label>
//               <input 
//                 type="text" 
//                 value={formData.gestation} 
//                 onChange={(e) => handleInputChange("gestation", e.target.value)}
//                 readOnly={readOnly}
//                 className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#3B309A]"}`}
//               />
//             </div>
//             <div className="space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Gravida / Para</label>
//               <input 
//                 type="text" 
//                 value={formData.gravida_para} 
//                 onChange={(e) => handleInputChange("gravida_para", e.target.value)}
//                 readOnly={readOnly}
//                 className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#3B309A]"}`}
//               />
//             </div>
//             <div className="space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Blood Group / RH</label>
//               <input 
//                 type="text" 
//                 value={formData.blood_group} 
//                 onChange={(e) => handleInputChange("blood_group", e.target.value)}
//                 readOnly={readOnly}
//                 className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#3B309A]"}`}
//               />
//             </div>
//             <div className="space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Ward / Unit *</label>
//               <input 
//                 type="text" 
//                 value={formData.ward} 
//                 onChange={(e) => handleInputChange("ward", e.target.value)}
//                 readOnly={readOnly}
//                 className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#3B309A]"}`}
//               />
//             </div>
//             <div className="md:col-span-2 space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Consultant Obstetrician *</label>
//               <input 
//                 type="text" 
//                 value={formData.consultant} 
//                 onChange={(e) => handleInputChange("consultant", e.target.value)}
//                 readOnly={readOnly}
//                 className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#3B309A]"}`}
//               />
//             </div>
//             <div className="md:col-span-4 space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Indication for Caesarean Section *</label>
//               <textarea 
//                 rows={2}
//                 value={formData.indication_reason}
//                 onChange={(e) => handleInputChange("indication_reason", e.target.value)}
//                 placeholder="e.g. previous CS with failed VBAC; breech presentation; fetal compromise"
//                 readOnly={readOnly}
//                 className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#3B309A]"}`}
//               />
//             </div>
//           </div>
//         </section>

//         {/* Part B & C */}
//         <div className="grid grid-cols-1 gap-8">
//             <section>
//               <div className="bg-[#334155] text-white px-4 py-1 inline-block rounded-t-xl text-[10px] font-black uppercase tracking-widest mb-0 ml-4">Part B — Description (Ring 1)</div>
//               <div className="border-4 border-slate-900 rounded-3xl p-6 bg-slate-50 space-y-4 relative">
//                  <PartWarning fields={["plain_terms", "core_understanding"]} />
//                  <div className="space-y-2">
//                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Why a caesarean is recommended (plain terms)</label>
//                    <textarea 
//                      rows={3}
//                      value={formData.plain_terms}
//                      onChange={(e) => handleInputChange("plain_terms", e.target.value)}
//                      readOnly={readOnly}
//                      className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#3B309A]"}`}
//                    />
//                  </div>
//                  <label className="flex items-start gap-3 p-3 bg-white border-2 border-slate-200 rounded-xl cursor-pointer">
//                     <input 
//                       type="checkbox" 
//                       checked={formData.core_understanding} 
//                       onChange={(e) => handleInputChange("core_understanding", e.target.checked)}
//                       disabled={readOnly}
//                       className="mt-1 w-5 h-5 text-[#3B309A] rounded"
//                     />
//                     <span className="text-[11px] font-bold text-slate-700">The mother understands what a CS is, why it is recommended, and the core risks.</span>
//                   </label>
//               </div>
//             </section>

//             <section>
//               <div className="bg-[#334155] text-white px-4 py-1 inline-block rounded-t-xl text-[10px] font-black uppercase tracking-widest mb-0 ml-4">Part C — What to Expect (Ring 4)</div>
//               <div className="border-4 border-slate-900 rounded-3xl p-6 bg-slate-50 space-y-4 flex flex-col justify-center relative">
//                  <p className="text-sm text-slate-700 font-medium leading-relaxed">
//                    Before: fasting, IV access, bladder catheter, antacid and antibiotics. Anaesthesia: usually spinal/epidural so you are awake. During: low bikini-line incision, baby delivered, placenta removed. Baby: skin-to-skin and early breastfeeding supported. After: pain relief, clot prevention, early mobilisation.
//                  </p>
//               </div>
//             </section>
//         </div>

//         {/* Part D */}
//         <section>
//           <div className="bg-[#1e293b] text-white px-4 py-1 inline-block rounded-t-xl text-[10px] font-black uppercase tracking-widest mb-0 ml-4">Part D — Intended Benefits</div>
//           <div className="border-4 border-slate-900 rounded-3xl p-6 bg-slate-50 relative">
//              <PartWarning fields={["intended_benefits"]} />
//              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Expected outcome for mother and baby</label>
//              <textarea 
//                rows={3}
//                value={formData.intended_benefits}
//                onChange={(e) => handleInputChange("intended_benefits", e.target.value)}
//                readOnly={readOnly}
//                className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#3B309A]"}`}
//              />
//           </div>
//         </section>

//         {/* Part E - Risks Table */}
//         <section>
//           <div className="bg-[#be123c] text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part E — Risks & Complications (Ring 2)</div>
//           <div className="border-4 border-slate-900 rounded-3xl overflow-hidden shadow-xl">
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
//                   ["COMMON", "Persistent wound/abdominal discomfort; infection; bleeding", "Managed with analgesia, antibiotics and wound care."],
//                   ["COMMON (baby)", "Transient fast breathing (tachypnoea)", "Usually settles; paediatric support available."],
//                   ["UNCOMMON", "Heavy bleeding (haemorrhage) needing transfusion/surgery; Blood clots (DVT/PE)", "Transfusion, surgical measures, clot-prevention."],
//                   ["RARE", "Injury to bladder, ureter or bowel; Admission to ICU", "May require repair and specialist input."],
//                   ["VERY RARE", "Emergency hysterectomy as life-saving last resort; death", "Resuscitation and senior teams available."],
//                   ["FUTURE PREGNANCY", "Higher chance of repeat CS, uterine-scar problems, placenta praevia/accreta", "Relevant to planning future births."]
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
//         </section>

//         {/* Part F */}
//         <section>
//           <div className="bg-[#ea580c] text-white px-4 py-1 inline-block rounded-t-xl text-[10px] font-black uppercase tracking-widest mb-0 ml-4">Part F — Alternatives to Caesarean Section</div>
//           <div className="border-4 border-slate-900 rounded-3xl p-6 bg-slate-50 relative">
//              <PartWarning fields={["alternatives_discussed"]} />
//              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Alternatives discussed with this mother and what happens if no CS is performed</label>
//              <textarea 
//                rows={3}
//                value={formData.alternatives_discussed}
//                onChange={(e) => handleInputChange("alternatives_discussed", e.target.value)}
//                readOnly={readOnly}
//                className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#3B309A]"}`}
//              />
//           </div>
//         </section>
        
//         {/* Part G */}
//         <section>
//           <div className="bg-[#475569] text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part G — Individualised Risks & Procedures (Ring 3)</div>
//           <div className="border-4 border-slate-900 rounded-3xl p-8 grid grid-cols-1 md:grid-cols-2 gap-8 shadow-inner bg-slate-50 relative">
//              <PartWarning fields={["individual_risks", "procedures_declined"]} />
//              <div className="md:col-span-2 space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Risks/factors specific to THIS mother</label>
//                 <textarea 
//                   rows={2}
//                   value={formData.individual_risks}
//                   onChange={(e) => handleInputChange("individual_risks", e.target.value)}
//                   readOnly={readOnly}
//                   className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#3B309A]"}`}
//                 />
//              </div>
//              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
//                {[
//                  { id: "procedure_blood", label: "Blood transfusion if required" },
//                  { id: "procedure_surgery", label: "Additional surgery to control bleeding" },
//                  { id: "procedure_hysterectomy", label: "Hysterectomy as life-saving last resort" }
//                ].map(item => (
//                   <label key={item.id} className="flex items-start gap-3 p-4 bg-white border-2 border-slate-200 rounded-2xl cursor-pointer">
//                     <input 
//                       type="checkbox" 
//                       checked={formData[item.id]} 
//                       onChange={(e) => handleInputChange(item.id, e.target.checked)}
//                       disabled={readOnly}
//                       className="mt-1 w-5 h-5 text-[#3B309A] rounded focus:ring-[#3B309A]"
//                     />
//                     <span className="text-xs font-bold text-slate-700 leading-tight">{item.label}</span>
//                   </label>
//                ))}
//              </div>
//              <div className="md:col-span-2 space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Procedures the mother does NOT wish carried out under any circumstances</label>
//                 <textarea 
//                   rows={2}
//                   value={formData.procedures_declined}
//                   onChange={(e) => handleInputChange("procedures_declined", e.target.value)}
//                   readOnly={readOnly}
//                   className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#3B309A]"}`}
//                 />
//              </div>
//           </div>
//         </section>

//         {/* Part H & I */}
//         <div className="grid grid-cols-1 gap-8">
//             <section>
//                <div className="bg-[#475569] text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part H — Anaesthesia</div>
//                <div className="border-4 border-slate-900 rounded-3xl p-6 bg-slate-50 space-y-4 relative">
//                   <PartWarning fields={["anaesthesia_type"]} />
//                   <div className="space-y-4">
//                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</label>
//                     <div className="grid grid-cols-1 gap-3">
//                       {["Regional (spinal / epidural)", "General anaesthesia", "Combined / converting if needed"].map(type => (
//                         <label key={type} className="flex items-center gap-3 p-3 bg-white border-2 border-slate-200 rounded-xl cursor-pointer group">
//                           <input 
//                             type="radio" 
//                             name="anaesthesia_type" 
//                             checked={formData.anaesthesia_type === type} 
//                             onChange={() => handleInputChange("anaesthesia_type", type)}
//                             disabled={readOnly}
//                             className="w-5 h-5 text-[#3B309A] focus:ring-[#3B309A]"
//                           />
//                           <span className="text-sm font-bold text-slate-600 group-hover:text-[#3B309A] transition-colors">{type}</span>
//                         </label>
//                       ))}
//                     </div>
//                   </div>
//                </div>
//             </section>
//             <section>
//                <div className="bg-[#475569] text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part I — Interpretation</div>
//                <div className="border-4 border-slate-900 rounded-3xl p-6 bg-slate-50 space-y-4 relative">
//                   <PartWarning fields={["interpreter_name", "interpreter_signature"]} />
//                   <div className="space-y-2">
//                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Interpreter Name</label>
//                      <input 
//                        type="text" 
//                        value={formData.interpreter_name} 
//                        onChange={(e) => handleInputChange("interpreter_name", e.target.value)}
//                        readOnly={readOnly}
//                        className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#3B309A]"}`}
//                      />
//                   </div>
//                   <div className="space-y-2 flex-grow flex flex-col">
//                     <div className="flex-grow min-h-[250px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-white">
//                       {readOnly ? (
//                         <div className="h-full w-full flex items-center justify-center p-2">
//                           {formData.interpreter_signature ? (
//                             <img src={getSigUrl(formData.interpreter_signature)} alt="Interpreter Signature" className="max-h-full max-w-full object-contain" />
//                           ) : (
//                             <span className="text-slate-300 font-bold uppercase text-xs">No Signature</span>
//                           )}
//                         </div>
//                       ) : (
//                         <SignaturePad 
//                           onEnd={(data) => handleInputChange("interpreter_signature", data)}
//                           onClear={() => handleInputChange("interpreter_signature", null)}
//                           className="h-full w-full"
//                         />
//                       )}
//                     </div>
//                     <p className="text-[10px] text-slate-400 font-bold italic text-center">Interpreter Signature</p>
//                   </div>
//                </div>
//             </section>
//         </div>

//         {/* Signatures */}
//         <section className="space-y-12 bg-slate-900 p-10 rounded-[3rem] shadow-2xl">
//           <h3 className="text-center text-white font-black uppercase tracking-[0.5em] text-xl mb-12">Final Declarations & Signatures</h3>
          
//           <div className="grid grid-cols-1 gap-8">
//             {/* Clinician Signature */}
//             <div className="bg-white rounded-3xl p-6 shadow-xl border-t-8 border-[#3B309A] relative flex flex-col h-full">
//               <PartWarning fields={["obstetrician_signature", "obstetrician_name"]} />
//               <div className="flex items-center gap-3 mb-6">
//                 <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-[#3B309A] font-black">J</div>
//                 <h4 className="font-black text-slate-800 uppercase tracking-wider text-[10px]">Declaration of Clinician</h4>
//               </div>
//               <div className="space-y-4 mb-6">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Additional Clinician Notes</label>
//                 <textarea 
//                   rows={2}
//                   value={formData.clinician_notes}
//                   onChange={(e) => handleInputChange("clinician_notes", e.target.value)}
//                   readOnly={readOnly}
//                   className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#3B309A]"}`}
//                 />
//               </div>
//               <div className="space-y-2 flex-grow flex flex-col">
//                 <div className="flex-grow min-h-[250px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
//                   {readOnly ? (
//                     <div className="h-full w-full flex items-center justify-center p-2">
//                       {formData.obstetrician_signature ? (
//                         <img src={getSigUrl(formData.obstetrician_signature)} alt="Clinician Signature" className="max-h-full max-w-full object-contain" />
//                       ) : (
//                         <span className="text-slate-300 font-bold uppercase text-xs">No Signature</span>
//                       )}
//                     </div>
//                   ) : (
//                     <SignaturePad 
//                       onEnd={(data) => handleInputChange("obstetrician_signature", data)}
//                       onClear={() => handleInputChange("obstetrician_signature", null)}
//                       className="h-full w-full"
//                     />
//                   )}
//                 </div>
//                 <div className="mt-4 space-y-3">
//                    <div className="space-y-1">
//                       <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest text-center">Obstetrician Name *</p>
//                       <input type="text" placeholder="Enter Name" value={formData.obstetrician_name} onChange={(e) => handleInputChange("obstetrician_name", e.target.value)} readOnly={readOnly} className={`w-full border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-center outline-none transition-all placeholder:text-slate-300 ${readOnly ? "bg-slate-100" : "bg-slate-50 focus:border-[#3B309A] focus:ring-2 focus:ring-[#3B309A]/20"}`} />
//                    </div>
//                 </div>
//               </div>
//             </div>

//             {/* Mother Signature */}
//             <div className="bg-white rounded-3xl p-6 shadow-xl border-t-8 border-[#ec4899] relative flex flex-col h-full">
//               <PartWarning fields={["mother_signature", "read_understood", "risks_explained", "individual_risks_accepted", "modify_approach", "anaesthesia_consent"]} />
//               <div className="flex items-center gap-3 mb-6">
//                 <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center text-[#ec4899] font-black">K</div>
//                 <h4 className="font-black text-slate-800 uppercase tracking-wider text-[10px]">Mother's Consent</h4>
//               </div>
//               <div className="space-y-3 mb-6">
//                  {[
//                    { id: "read_understood", label: "I have read/understood Parts A to J" },
//                    { id: "risks_explained", label: "Benefits, risks and alternatives explained" },
//                    { id: "individual_risks_accepted", label: "I accept the risks described, including individual risks" },
//                    { id: "modify_approach", label: "Team may modify approach if clinically necessary" },
//                    { id: "anaesthesia_consent", label: "I consent to the anaesthesia described" },
//                    { id: "additional_procedures_ack", label: "Additional procedures will only be done if necessary to save my life" }
//                  ].map(item => (
//                    <label key={item.id} className="flex items-start gap-2 p-2 bg-pink-50/50 rounded-xl cursor-pointer">
//                       <input 
//                         type="checkbox" 
//                         checked={formData[item.id]} 
//                         onChange={(e) => handleInputChange(item.id, e.target.checked)}
//                         disabled={readOnly}
//                         className="mt-1 w-4 h-4 text-[#ec4899] rounded"
//                       />
//                       <span className="text-[10px] font-bold text-pink-900">{item.label}</span>
//                    </label>
//                  ))}
//               </div>
//               <div className="space-y-2 flex-grow flex flex-col">
//                 <div className="flex-grow min-h-[250px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
//                   {readOnly ? (
//                     <div className="h-full w-full flex items-center justify-center p-2">
//                       {formData.mother_signature ? (
//                         <img src={getSigUrl(formData.mother_signature)} alt="Mother Signature" className="max-h-full max-w-full object-contain" />
//                       ) : (
//                         <span className="text-slate-300 font-bold uppercase text-xs">No Signature</span>
//                       )}
//                     </div>
//                   ) : (
//                     <SignaturePad 
//                       onEnd={(data) => handleInputChange("mother_signature", data)}
//                       onClear={() => handleInputChange("mother_signature", null)}
//                       className="h-full w-full"
//                     />
//                   )}
//                 </div>
//                 <p className="text-[10px] text-slate-400 font-bold italic text-center mt-2">Mother's Signature</p>
//               </div>
//             </div>
//           </div>
//         </section>

//         {/* Emergency Section */}
//         <section className="bg-red-50 border-4 border-red-200 p-8 rounded-3xl relative">
//            <PartWarning fields={["emergency_situation", "nok_name", "nok_relationship", "emergency_obstetrician_signature", "emergency_witness_signature"]} />
//            <div className="flex items-center gap-2 mb-4">
//               <AlertCircle className="text-red-600" />
//               <h4 className="font-black text-red-900 uppercase tracking-widest text-sm">Part L — Emergency Authorisation</h4>
//            </div>
//            <p className="text-xs text-red-700 font-medium mb-6">Complete this section ONLY if the mother is unable to consent and immediate delivery is required.</p>
           
//            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//              <div className="md:col-span-2 space-y-2">
//                 <label className="block text-[10px] font-black text-red-400 uppercase tracking-widest">Clinical situation</label>
//                 <textarea 
//                   rows={2}
//                   value={formData.emergency_situation}
//                   onChange={(e) => handleInputChange("emergency_situation", e.target.value)}
//                   readOnly={readOnly}
//                   className={`w-full border-2 border-red-200 rounded-xl px-4 py-2 font-bold text-red-900 transition-all outline-none resize-none ${readOnly ? "bg-red-100" : "bg-white focus:border-red-400"}`}
//                 />
//              </div>
             
//              <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-red-400 uppercase tracking-widest">Next of Kin / Rep Name</label>
//                 <input 
//                   type="text" 
//                   value={formData.nok_name} 
//                   onChange={(e) => handleInputChange("nok_name", e.target.value)}
//                   readOnly={readOnly}
//                   className={`w-full border-2 border-red-200 rounded-xl px-4 py-2 font-bold text-red-900 transition-all outline-none ${readOnly ? "bg-red-100" : "bg-white focus:border-red-400"}`}
//                 />
//              </div>

//              <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-red-400 uppercase tracking-widest">Relationship</label>
//                 <input 
//                   type="text" 
//                   value={formData.nok_relationship} 
//                   onChange={(e) => handleInputChange("nok_relationship", e.target.value)}
//                   readOnly={readOnly}
//                   className={`w-full border-2 border-red-200 rounded-xl px-4 py-2 font-bold text-red-900 transition-all outline-none ${readOnly ? "bg-red-100" : "bg-white focus:border-red-400"}`}
//                 />
//              </div>
             
//              <div className="space-y-2 flex-grow flex flex-col">
//                <div className="flex-grow min-h-[250px] border-4 border-dashed border-red-200 rounded-2xl overflow-hidden bg-white">
//                  {readOnly ? (
//                    <div className="h-full w-full flex items-center justify-center p-2">
//                      {formData.emergency_obstetrician_signature ? (
//                        <img src={getSigUrl(formData.emergency_obstetrician_signature)} alt="Signature" className="max-h-full max-w-full object-contain" />
//                      ) : (
//                        <span className="text-red-300 font-bold uppercase text-xs">No Signature</span>
//                      )}
//                    </div>
//                  ) : (
//                    <SignaturePad 
//                      onEnd={(data) => handleInputChange("emergency_obstetrician_signature", data)}
//                      onClear={() => handleInputChange("emergency_obstetrician_signature", null)}
//                      className="h-full w-full"
//                    />
//                  )}
//                </div>
//                <p className="text-[10px] text-red-400 font-bold italic text-center">Obstetrician Signature</p>
//              </div>

//              <div className="space-y-2 flex-grow flex flex-col">
//                <div className="flex-grow min-h-[250px] border-4 border-dashed border-red-200 rounded-2xl overflow-hidden bg-white">
//                  {readOnly ? (
//                    <div className="h-full w-full flex items-center justify-center p-2">
//                      {formData.emergency_witness_signature ? (
//                        <img src={getSigUrl(formData.emergency_witness_signature)} alt="Signature" className="max-h-full max-w-full object-contain" />
//                      ) : (
//                        <span className="text-red-300 font-bold uppercase text-xs">No Signature</span>
//                      )}
//                    </div>
//                  ) : (
//                    <SignaturePad 
//                      onEnd={(data) => handleInputChange("emergency_witness_signature", data)}
//                      onClear={() => handleInputChange("emergency_witness_signature", null)}
//                      className="h-full w-full"
//                    />
//                  )}
//                </div>
//                <p className="text-[10px] text-red-400 font-bold italic text-center">Second Senior Clinician Witness</p>
//              </div>
//            </div>
//         </section>

//         {/* Part M - Confirmation & Withdrawal */}
//         <section>
//           <div className="bg-[#475569] text-white px-4 py-1 inline-block rounded-t-xl text-[10px] font-black uppercase tracking-widest mb-0 ml-4">Part M — Confirmation & Withdrawal</div>
//           <div className="border-4 border-slate-900 rounded-3xl p-8 bg-slate-50 relative">
//              <PartWarning fields={[]} />
//              <div className="grid grid-cols-1 gap-8">
//                <div className="space-y-2 flex-grow flex flex-col">
//                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Confirming Clinician (Immediately before op)</label>
//                  <div className="flex-grow min-h-[250px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-white">
//                    {readOnly ? (
//                      <div className="h-full w-full flex items-center justify-center p-2">
//                        {formData.confirmation_clinician_signature ? <img src={getSigUrl(formData.confirmation_clinician_signature)} alt="Signature" className="max-h-full max-w-full object-contain" /> : <span className="text-slate-300 font-bold uppercase text-xs">No Signature</span>}
//                      </div>
//                    ) : (
//                      <SignaturePad onEnd={(data) => handleInputChange("confirmation_clinician_signature", data)} onClear={() => handleInputChange("confirmation_clinician_signature", null)} className="h-full w-full" />
//                    )}
//                  </div>
//                </div>
               
//                <div className="space-y-4">
//                  <div className="space-y-2">
//                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Withdrawal Notes (If applicable)</label>
//                    <textarea 
//                      rows={2}
//                      value={formData.withdrawal_reason}
//                      onChange={(e) => handleInputChange("withdrawal_reason", e.target.value)}
//                      readOnly={readOnly}
//                      className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#3B309A]"}`}
//                    />
//                  </div>
                 
//                  <div className="grid grid-cols-1 gap-4">
//                    <div className="space-y-2 flex-grow flex flex-col">
//                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Mother's Sig (Withdrawal)</label>
//                      <div className="flex-grow min-h-[250px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-white">
//                        {readOnly ? (
//                          <div className="h-full w-full flex items-center justify-center p-2">
//                            {formData.withdrawal_mother_signature ? <img src={getSigUrl(formData.withdrawal_mother_signature)} alt="Signature" className="max-h-full max-w-full object-contain" /> : <span className="text-slate-300 font-bold uppercase text-[8px]">None</span>}
//                          </div>
//                        ) : (
//                          <SignaturePad onEnd={(data) => handleInputChange("withdrawal_mother_signature", data)} onClear={() => handleInputChange("withdrawal_mother_signature", null)} className="h-full w-full" />
//                        )}
//                      </div>
//                    </div>
//                    <div className="space-y-2 flex-grow flex flex-col">
//                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Clinician Ack</label>
//                      <div className="flex-grow min-h-[250px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-white">
//                        {readOnly ? (
//                          <div className="h-full w-full flex items-center justify-center p-2">
//                            {formData.withdrawal_clinician_signature ? <img src={getSigUrl(formData.withdrawal_clinician_signature)} alt="Signature" className="max-h-full max-w-full object-contain" /> : <span className="text-slate-300 font-bold uppercase text-[8px]">None</span>}
//                          </div>
//                        ) : (
//                          <SignaturePad onEnd={(data) => handleInputChange("withdrawal_clinician_signature", data)} onClear={() => handleInputChange("withdrawal_clinician_signature", null)} className="h-full w-full" />
//                        )}
//                      </div>
//                    </div>
//                  </div>
//                </div>
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
//                 disabled={submitting || !formData.obstetrician_signature || (!formData.mother_signature && !formData.emergency_obstetrician_signature)}
//                 className="bg-[#3B309A] text-white px-10 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-2xl shadow-[#3B309A]/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50 disabled:grayscale disabled:scale-100"
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
//               className="bg-brand-primary text-white px-10 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-2xl transition-all flex items-center gap-3"
//             >
//               <Printer size={20} /> View Full PDF
//             </button>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default CsDeliveryConsentForm;

// import React, { useState, useEffect } from "react";
// import { FileText, CheckCircle, Loader2, Printer, AlertCircle } from "lucide-react";
// import { consentService, ConsentTemplate } from "../../services/consent.service";
// import SignaturePad from "../SignaturePad";
// import { useAuth } from "../../context/AuthContext";
// import { useNotification } from "../../context/NotificationContext";
// import { BASE_URL } from "../../api/client";
// import { patientService } from "../../services/patient.service";

// interface CsDeliveryConsentFormProps {
//   orderId: number;
//   patientName: string;
//   mrn: string;
//   onSuccess: (formData: any) => void;
//   onCancel: () => void;
//   onPrint: () => void;
//   readOnly?: boolean;
//   viewData?: any;
// }

// const CsDeliveryConsentForm: React.FC<CsDeliveryConsentFormProps> = ({
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
//     planned_type: "",
//     rcog_category: "",
//     mother_name: patientName,
//     dob: "",
//     mrn: mrn,
//     gestation: "",
//     gravida_para: "",
//     blood_group: "",
//     consultant: "",
//     ward: "",
//     indication_reason: "",
//     plain_terms: "",
//     core_understanding: false,
//     intended_benefits: "",
//     alternatives_discussed: "",
//     individual_risks: "",
//     procedure_blood: false,
//     procedure_surgery: false,
//     procedure_hysterectomy: false,
//     procedures_declined: "",
//     anaesthesia_type: "",
//     interpreter_name: "",
//     interpreter_signature: null,
//     interpreter_date: "",
//     clinician_notes: "",
//     obstetrician_name: "",
//     obstetrician_signature: null,
//     second_clinician_name: "",
//     second_clinician_signature: null,
//     read_understood: false,
//     risks_explained: false,
//     individual_risks_accepted: false,
//     modify_approach: false,
//     anaesthesia_consent: false,
//     additional_procedures_ack: false,
//     mother_signature: null,
//     witness_signature: null,
//     emergency_situation: "",
//     nok_name: "",
//     nok_relationship: "",
//     emergency_obstetrician_signature: null,
//     emergency_witness_signature: null,
//     confirmation_clinician_signature: null,
//     withdrawal_reason: "",
//     withdrawal_mother_signature: null,
//     withdrawal_clinician_signature: null,
//   });

//   useEffect(() => {
//     if (!readOnly) {
//       fetchTemplate();
//       if (mrn) fetchPatientDetails();
//     }
//   }, []);

//   const fetchPatientDetails = async () => {
//     try {
//       const patient = await patientService.getPatientByMrn(mrn);
//       if (patient) {
//         setFormData((prev: any) => ({
//           ...prev,
//           dob: patient.demographics?.date_of_birth || prev.dob,
//           blood_group: patient.medical_profile?.blood_group || prev.blood_group,
//         }));
//       }
//     } catch (err) {
//       console.error("Failed to fetch patient details for consent pre-fill", err);
//     }
//   };

//   const fetchTemplate = async () => {
//     try {
//       const data = await consentService.getTemplate("cs-delivery-gsh-t6");
//       setTemplate(data);
//     } catch (error) {
//       notify("Failed to load consent template", "error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleInputChange = (field: string, value: any) => {
//     setFormData((prev: any) => ({ ...prev, [field]: value }));
//   };

//   const handleSubmit = async () => {
//     if (!formData.dob) {
//       notify("Date of Birth is required", "error");
//       return;
//     }
//     if (!formData.obstetrician_name) {
//       notify("Obstetrician name is required", "error");
//       return;
//     }
//     if (!formData.obstetrician_signature) {
//       notify("Obstetrician signature is required", "error");
//       return;
//     }
//     if (!formData.mother_signature && !formData.emergency_obstetrician_signature) {
//       notify("Mother's signature or Emergency Authorisation is required", "error");
//       return;
//     }

//     setSubmitting(true);
//     try {
//       // The backend strictly expects these keys
//       const payloadFormData = {
//         ...formData,
//         clinician_signature: formData.obstetrician_signature,
//         patient_signature: formData.mother_signature || formData.emergency_obstetrician_signature,
//         nurse_signature: formData.witness_signature || formData.emergency_witness_signature || "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
//       };

//       const payload = {
//         order_id: orderId,
//         template_slug: "cs-delivery-gsh-t6",
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

//   if (loading) {
//     return (
//       <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl shadow-xl">
//         <Loader2 className="animate-spin text-[#3B309A] mb-4" size={48} />
//         <p className="text-slate-500 font-bold uppercase tracking-widest animate-pulse">Loading Procedure Template...</p>
//       </div>
//     );
//   }

//   return (
//     <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col max-w-6xl mx-auto">
//       {/* Header - High Fidelity Replica */}
//       <div className="bg-[#3B309A] text-white p-10 flex justify-between items-center relative overflow-hidden shrink-0">
//         <div className="absolute top-0 right-0 w-64 h-64 bg-[#3B309A]/30 rounded-full -mr-32 -mt-32 blur-3xl"></div>
//         <div className="z-10">
//           <div className="flex items-center gap-4 mb-2">
//             <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
//               <img src="/assets/login-bg.jpeg" alt="Medbookie" className="w-10 h-10 object-contain" />
//             </div>
//             <div>
//               <h1 className="text-3xl font-black tracking-tighter">Procedure Consent Form</h1>
//               <p className="text-[#bfb8ff] font-bold text-sm">Caesarean Section Delivery</p>
//             </div>
//           </div>
//           <p className="text-xs text-[#bfb8ff]/80 font-medium">Form Ref: GSH-CONSENT-CS-001 • Policy Ref: GSH-T6 • Version 1.0</p>
//         </div>
//         <div className="text-right z-10 flex flex-col items-end gap-3">
//           <div className="hidden md:block text-right">
//             <p className="text-[10px] text-[#bfb8ff] font-bold leading-tight uppercase tracking-wider">Medbookie</p>
//             <p className="text-[10px] text-[#bfb8ff]">+234 705 648 2776 • admin@Medbookiehospitals.com</p>
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
//         <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 relative overflow-hidden">
//           <div className="absolute top-0 right-0 bg-amber-200/50 px-4 py-1 rounded-bl-xl text-[10px] font-black text-amber-800 uppercase tracking-wider">Patient Rights</div>
//           <p className="text-sm text-amber-900 font-medium leading-relaxed italic">
//             "You have the right to make decisions about your medical care and to refuse any procedure. If you wish to withdraw consent at any time before the procedure begins, you may do so. Signing this form does not remove your legal rights. This form complies with the National Health Act 2014 (Nigeria) and Medbookie Consent Policy (GSH-T6)."
//           </p>
//         </div>

//         {/* Banner Details */}
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
//             <div className="space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Type of Caesarean Birth</label>
//               <div className="grid grid-cols-1 gap-2 p-3 bg-white border-2 border-slate-200 rounded-xl">
//                 {["Planned (elective) LSCS", "Unplanned LSCS (within ~72 h)", "Emergency LSCS (≤ 30 min)"].map(type => (
//                   <label key={type} className="flex items-center gap-2 cursor-pointer group">
//                     <input 
//                       type="radio" 
//                       name="planned_type" 
//                       checked={formData.planned_type === type} 
//                       onChange={() => handleInputChange("planned_type", type)}
//                       disabled={readOnly}
//                       className="w-4 h-4 text-[#3B309A] focus:ring-[#3B309A]"
//                     />
//                     <span className="text-xs font-bold text-slate-600 group-hover:text-[#3B309A] transition-colors">{type}</span>
//                   </label>
//                 ))}
//               </div>
//             </div>
//             <div className="space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">RCOG Category</label>
//               <div className="grid grid-cols-1 gap-2 p-3 bg-white border-2 border-slate-200 rounded-xl">
//                 {["1 (immediate threat to life)", "2 (compromise, not immediately life-threatening)", "3 (early birth needed, no compromise)", "4 (elective)"].map(type => (
//                   <label key={type} className="flex items-center gap-2 cursor-pointer group">
//                     <input 
//                       type="radio" 
//                       name="rcog_category" 
//                       checked={formData.rcog_category === type} 
//                       onChange={() => handleInputChange("rcog_category", type)}
//                       disabled={readOnly}
//                       className="w-4 h-4 text-[#3B309A] focus:ring-[#3B309A]"
//                     />
//                     <span className="text-[11px] font-bold text-slate-600 group-hover:text-[#3B309A] transition-colors">{type}</span>
//                   </label>
//                 ))}
//               </div>
//             </div>
//         </div>

//         {/* Part A - Mother Identification */}
//         <section>
//           <div className="bg-[#3B309A] text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part A — Mother Identification</div>
//           <div className="border-4 border-slate-900 rounded-3xl p-8 grid grid-cols-1 md:grid-cols-4 gap-8 shadow-inner bg-slate-50 relative">
//             <PartWarning fields={["mother_name", "dob", "mrn", "gestation", "ward", "consultant", "indication_reason"]} />
//             <div className="md:col-span-2 space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Mother's Full Name *</label>
//               <input 
//                 type="text" 
//                 value={formData.mother_name} 
//                 onChange={(e) => handleInputChange("mother_name", e.target.value)}
//                 readOnly={readOnly}
//                 className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#3B309A] focus:ring-4 focus:ring-[#3B309A]/10"}`}
//               />
//             </div>
//             <div className="space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Date of Birth *</label>
//               <input 
//                 type="date" 
//                 value={formData.dob} 
//                 onChange={(e) => handleInputChange("dob", e.target.value)}
//                 readOnly={readOnly}
//                 className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#3B309A]"}`}
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
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Gestation (Weeks) *</label>
//               <input 
//                 type="text" 
//                 value={formData.gestation} 
//                 onChange={(e) => handleInputChange("gestation", e.target.value)}
//                 readOnly={readOnly}
//                 className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#3B309A]"}`}
//               />
//             </div>
//             <div className="space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Gravida / Para</label>
//               <input 
//                 type="text" 
//                 value={formData.gravida_para} 
//                 onChange={(e) => handleInputChange("gravida_para", e.target.value)}
//                 readOnly={readOnly}
//                 className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#3B309A]"}`}
//               />
//             </div>
//             <div className="space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Blood Group / RH</label>
//               <input 
//                 type="text" 
//                 value={formData.blood_group} 
//                 onChange={(e) => handleInputChange("blood_group", e.target.value)}
//                 readOnly={readOnly}
//                 className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#3B309A]"}`}
//               />
//             </div>
//             <div className="space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Ward / Unit *</label>
//               <input 
//                 type="text" 
//                 value={formData.ward} 
//                 onChange={(e) => handleInputChange("ward", e.target.value)}
//                 readOnly={readOnly}
//                 className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#3B309A]"}`}
//               />
//             </div>
//             <div className="md:col-span-2 space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Consultant Obstetrician *</label>
//               <input 
//                 type="text" 
//                 value={formData.consultant} 
//                 onChange={(e) => handleInputChange("consultant", e.target.value)}
//                 readOnly={readOnly}
//                 className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#3B309A]"}`}
//               />
//             </div>
//             <div className="md:col-span-4 space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Indication for Caesarean Section *</label>
//               <textarea 
//                 rows={2}
//                 value={formData.indication_reason}
//                 onChange={(e) => handleInputChange("indication_reason", e.target.value)}
//                 placeholder="e.g. previous CS with failed VBAC; breech presentation; fetal compromise"
//                 readOnly={readOnly}
//                 className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#3B309A]"}`}
//               />
//             </div>
//           </div>
//         </section>

//         {/* Part B & C */}
//         <div className="grid grid-cols-1 gap-8">
//             <section>
//               <div className="bg-[#334155] text-white px-4 py-1 inline-block rounded-t-xl text-[10px] font-black uppercase tracking-widest mb-0 ml-4">Part B — Description (Ring 1)</div>
//               <div className="border-4 border-slate-900 rounded-3xl p-6 bg-slate-50 space-y-4 relative">
//                  <PartWarning fields={["plain_terms", "core_understanding"]} />
//                  <div className="space-y-2">
//                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Why a caesarean is recommended (plain terms)</label>
//                    <textarea 
//                      rows={3}
//                      value={formData.plain_terms}
//                      onChange={(e) => handleInputChange("plain_terms", e.target.value)}
//                      readOnly={readOnly}
//                      className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#3B309A]"}`}
//                    />
//                  </div>
//                  <label className="flex items-start gap-3 p-3 bg-white border-2 border-slate-200 rounded-xl cursor-pointer">
//                     <input 
//                       type="checkbox" 
//                       checked={formData.core_understanding} 
//                       onChange={(e) => handleInputChange("core_understanding", e.target.checked)}
//                       disabled={readOnly}
//                       className="mt-1 w-5 h-5 text-[#3B309A] rounded"
//                     />
//                     <span className="text-[11px] font-bold text-slate-700">The mother understands what a CS is, why it is recommended, and the core risks.</span>
//                   </label>
//               </div>
//             </section>

//             <section>
//               <div className="bg-[#334155] text-white px-4 py-1 inline-block rounded-t-xl text-[10px] font-black uppercase tracking-widest mb-0 ml-4">Part C — What to Expect (Ring 4)</div>
//               <div className="border-4 border-slate-900 rounded-3xl p-6 bg-slate-50 space-y-4 flex flex-col justify-center relative">
//                  <p className="text-sm text-slate-700 font-medium leading-relaxed">
//                    Before: fasting, IV access, bladder catheter, antacid and antibiotics. Anaesthesia: usually spinal/epidural so you are awake. During: low bikini-line incision, baby delivered, placenta removed. Baby: skin-to-skin and early breastfeeding supported. After: pain relief, clot prevention, early mobilisation.
//                  </p>
//               </div>
//             </section>
//         </div>

//         {/* Part D */}
//         <section>
//           <div className="bg-[#1e293b] text-white px-4 py-1 inline-block rounded-t-xl text-[10px] font-black uppercase tracking-widest mb-0 ml-4">Part D — Intended Benefits</div>
//           <div className="border-4 border-slate-900 rounded-3xl p-6 bg-slate-50 relative">
//              <PartWarning fields={["intended_benefits"]} />
//              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Expected outcome for mother and baby</label>
//              <textarea 
//                rows={3}
//                value={formData.intended_benefits}
//                onChange={(e) => handleInputChange("intended_benefits", e.target.value)}
//                readOnly={readOnly}
//                className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#3B309A]"}`}
//              />
//           </div>
//         </section>

//         {/* Part E - Risks Table */}
//         <section>
//           <div className="bg-[#be123c] text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part E — Risks & Complications (Ring 2)</div>
//           <div className="border-4 border-slate-900 rounded-3xl overflow-hidden shadow-xl">
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
//                   ["COMMON", "Persistent wound/abdominal discomfort; infection; bleeding", "Managed with analgesia, antibiotics and wound care."],
//                   ["COMMON (baby)", "Transient fast breathing (tachypnoea)", "Usually settles; paediatric support available."],
//                   ["UNCOMMON", "Heavy bleeding (haemorrhage) needing transfusion/surgery; Blood clots (DVT/PE)", "Transfusion, surgical measures, clot-prevention."],
//                   ["RARE", "Injury to bladder, ureter or bowel; Admission to ICU", "May require repair and specialist input."],
//                   ["VERY RARE", "Emergency hysterectomy as life-saving last resort; death", "Resuscitation and senior teams available."],
//                   ["FUTURE PREGNANCY", "Higher chance of repeat CS, uterine-scar problems, placenta praevia/accreta", "Relevant to planning future births."]
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
//         </section>

//         {/* Part F */}
//         <section>
//           <div className="bg-[#ea580c] text-white px-4 py-1 inline-block rounded-t-xl text-[10px] font-black uppercase tracking-widest mb-0 ml-4">Part F — Alternatives to Caesarean Section</div>
//           <div className="border-4 border-slate-900 rounded-3xl p-6 bg-slate-50 relative">
//              <PartWarning fields={["alternatives_discussed"]} />
//              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Alternatives discussed with this mother and what happens if no CS is performed</label>
//              <textarea 
//                rows={3}
//                value={formData.alternatives_discussed}
//                onChange={(e) => handleInputChange("alternatives_discussed", e.target.value)}
//                readOnly={readOnly}
//                className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#3B309A]"}`}
//              />
//           </div>
//         </section>
//         {/* Part G */}
//         <section>
//           <div className="bg-[#475569] text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part G — Individualised Risks & Procedures (Ring 3)</div>
//           <div className="border-4 border-slate-900 rounded-3xl p-8 grid grid-cols-1 md:grid-cols-2 gap-8 shadow-inner bg-slate-50 relative">
//              <PartWarning fields={["individual_risks", "procedures_declined"]} />
//              <div className="md:col-span-2 space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Risks/factors specific to THIS mother</label>
//                 <textarea 
//                   rows={2}
//                   value={formData.individual_risks}
//                   onChange={(e) => handleInputChange("individual_risks", e.target.value)}
//                   readOnly={readOnly}
//                   className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#3B309A]"}`}
//                 />
//              </div>
//              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
//                {[
//                  { id: "procedure_blood", label: "Blood transfusion if required" },
//                  { id: "procedure_surgery", label: "Additional surgery to control bleeding" },
//                  { id: "procedure_hysterectomy", label: "Hysterectomy as life-saving last resort" }
//                ].map(item => (
//                   <label key={item.id} className="flex items-start gap-3 p-4 bg-white border-2 border-slate-200 rounded-2xl cursor-pointer">
//                     <input 
//                       type="checkbox" 
//                       checked={formData[item.id]} 
//                       onChange={(e) => handleInputChange(item.id, e.target.checked)}
//                       disabled={readOnly}
//                       className="mt-1 w-5 h-5 text-[#3B309A] rounded focus:ring-[#3B309A]"
//                     />
//                     <span className="text-xs font-bold text-slate-700 leading-tight">{item.label}</span>
//                   </label>
//                ))}
//              </div>
//              <div className="md:col-span-2 space-y-2">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Procedures the mother does NOT wish carried out under any circumstances</label>
//                 <textarea 
//                   rows={2}
//                   value={formData.procedures_declined}
//                   onChange={(e) => handleInputChange("procedures_declined", e.target.value)}
//                   readOnly={readOnly}
//                   className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#3B309A]"}`}
//                 />
//              </div>
//           </div>
//         </section>

//         {/* Part H & I */}
//         <div className="grid grid-cols-1 gap-8">
//             <section>
//                <div className="bg-[#475569] text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part H — Anaesthesia</div>
//                <div className="border-4 border-slate-900 rounded-3xl p-6 bg-slate-50 space-y-4 relative">
//                   <PartWarning fields={["anaesthesia_type"]} />
//                   <div className="space-y-4">
//                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</label>
//                     <div className="grid grid-cols-1 gap-3">
//                       {["Regional (spinal / epidural)", "General anaesthesia", "Combined / converting if needed"].map(type => (
//                         <label key={type} className="flex items-center gap-3 p-3 bg-white border-2 border-slate-200 rounded-xl cursor-pointer group">
//                           <input 
//                             type="radio" 
//                             name="anaesthesia_type" 
//                             checked={formData.anaesthesia_type === type} 
//                             onChange={() => handleInputChange("anaesthesia_type", type)}
//                             disabled={readOnly}
//                             className="w-5 h-5 text-[#3B309A] focus:ring-[#3B309A]"
//                           />
//                           <span className="text-sm font-bold text-slate-600 group-hover:text-[#3B309A] transition-colors">{type}</span>
//                         </label>
//                       ))}
//                     </div>
//                   </div>
//                </div>
//             </section>
//             <section>
//                <div className="bg-[#475569] text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part I — Interpretation</div>
//                <div className="border-4 border-slate-900 rounded-3xl p-6 bg-slate-50 space-y-4 relative">
//                   <PartWarning fields={["interpreter_name", "interpreter_signature"]} />
//                   <div className="space-y-2">
//                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Interpreter Name</label>
//                      <input 
//                        type="text" 
//                        value={formData.interpreter_name} 
//                        onChange={(e) => handleInputChange("interpreter_name", e.target.value)}
//                        readOnly={readOnly}
//                        className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#3B309A]"}`}
//                      />
//                   </div>
//                   <div className="space-y-2 flex-grow flex flex-col">
//                     <div className="flex-grow min-h-[250px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-white">
//                       {readOnly ? (
//                         <div className="h-full w-full flex items-center justify-center p-2">
//                           {formData.interpreter_signature ? (
//                             <img src={getSigUrl(formData.interpreter_signature)} alt="Interpreter Signature" className="max-h-full max-w-full object-contain" />
//                           ) : (
//                             <span className="text-slate-300 font-bold uppercase text-xs">No Signature</span>
//                           )}
//                         </div>
//                       ) : (
//                         <SignaturePad 
//                           onEnd={(data) => handleInputChange("interpreter_signature", data)}
//                           onClear={() => handleInputChange("interpreter_signature", null)}
//                           className="h-full w-full"
//                         />
//                       )}
//                     </div>
//                     <p className="text-[10px] text-slate-400 font-bold italic text-center">Interpreter Signature</p>
//                   </div>
//                </div>
//             </section>
//         </div>

//         {/* Signatures */}
//         <section className="space-y-12 bg-slate-900 p-10 rounded-[3rem] shadow-2xl">
//           <h3 className="text-center text-white font-black uppercase tracking-[0.5em] text-xl mb-12">Final Declarations & Signatures</h3>
          
//           <div className="grid grid-cols-1 gap-8">
//             {/* Clinician Signature */}
//             <div className="bg-white rounded-3xl p-6 shadow-xl border-t-8 border-[#3B309A] relative flex flex-col h-full">
//               <PartWarning fields={["obstetrician_signature", "obstetrician_name"]} />
//               <div className="flex items-center gap-3 mb-6">
//                 <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-[#3B309A] font-black">J</div>
//                 <h4 className="font-black text-slate-800 uppercase tracking-wider text-[10px]">Declaration of Clinician</h4>
//               </div>
//               <div className="space-y-4 mb-6">
//                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Additional Clinician Notes</label>
//                 <textarea 
//                   rows={2}
//                   value={formData.clinician_notes}
//                   onChange={(e) => handleInputChange("clinician_notes", e.target.value)}
//                   readOnly={readOnly}
//                   className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#3B309A]"}`}
//                 />
//               </div>
//               <div className="space-y-2 flex-grow flex flex-col">
//                 <div className="flex-grow min-h-[250px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
//                   {readOnly ? (
//                     <div className="h-full w-full flex items-center justify-center p-2">
//                       {formData.obstetrician_signature ? (
//                         <img src={getSigUrl(formData.obstetrician_signature)} alt="Clinician Signature" className="max-h-full max-w-full object-contain" />
//                       ) : (
//                         <span className="text-slate-300 font-bold uppercase text-xs">No Signature</span>
//                       )}
//                     </div>
//                   ) : (
//                     <SignaturePad 
//                       onEnd={(data) => handleInputChange("obstetrician_signature", data)}
//                       onClear={() => handleInputChange("obstetrician_signature", null)}
//                       className="h-full w-full"
//                     />
//                   )}
//                 </div>
//                 <div className="mt-4 space-y-3">
//                    <div className="space-y-1">
//                       <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest text-center">Obstetrician Name *</p>
//                       <input type="text" placeholder="Enter Name" value={formData.obstetrician_name} onChange={(e) => handleInputChange("obstetrician_name", e.target.value)} readOnly={readOnly} className={`w-full border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-center outline-none transition-all placeholder:text-slate-300 ${readOnly ? "bg-slate-100" : "bg-slate-50 focus:border-[#3B309A] focus:ring-2 focus:ring-[#3B309A]/20"}`} />
//                    </div>
//                 </div>
//               </div>
//             </div>

//             {/* Mother Signature */}
//             <div className="bg-white rounded-3xl p-6 shadow-xl border-t-8 border-[#ec4899] relative flex flex-col h-full">
//               <PartWarning fields={["mother_signature", "read_understood", "risks_explained", "individual_risks_accepted", "modify_approach", "anaesthesia_consent"]} />
//               <div className="flex items-center gap-3 mb-6">
//                 <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center text-[#ec4899] font-black">K</div>
//                 <h4 className="font-black text-slate-800 uppercase tracking-wider text-[10px]">Mother's Consent</h4>
//               </div>
//               <div className="space-y-3 mb-6">
//                  {[
//                    { id: "read_understood", label: "I have read/understood Parts A to J" },
//                    { id: "risks_explained", label: "Benefits, risks and alternatives explained" },
//                    { id: "individual_risks_accepted", label: "I accept the risks described, including individual risks" },
//                    { id: "modify_approach", label: "Team may modify approach if clinically necessary" },
//                    { id: "anaesthesia_consent", label: "I consent to the anaesthesia described" },
//                    { id: "additional_procedures_ack", label: "Additional procedures will only be done if necessary to save my life" }
//                  ].map(item => (
//                    <label key={item.id} className="flex items-start gap-2 p-2 bg-pink-50/50 rounded-xl cursor-pointer">
//                       <input 
//                         type="checkbox" 
//                         checked={formData[item.id]} 
//                         onChange={(e) => handleInputChange(item.id, e.target.checked)}
//                         disabled={readOnly}
//                         className="mt-1 w-4 h-4 text-[#ec4899] rounded"
//                       />
//                       <span className="text-[10px] font-bold text-pink-900">{item.label}</span>
//                    </label>
//                  ))}
//               </div>
//               <div className="space-y-2 flex-grow flex flex-col">
//                 <div className="flex-grow min-h-[250px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
//                   {readOnly ? (
//                     <div className="h-full w-full flex items-center justify-center p-2">
//                       {formData.mother_signature ? (
//                         <img src={getSigUrl(formData.mother_signature)} alt="Mother Signature" className="max-h-full max-w-full object-contain" />
//                       ) : (
//                         <span className="text-slate-300 font-bold uppercase text-xs">No Signature</span>
//                       )}
//                     </div>
//                   ) : (
//                     <SignaturePad 
//                       onEnd={(data) => handleInputChange("mother_signature", data)}
//                       onClear={() => handleInputChange("mother_signature", null)}
//                       className="h-full w-full"
//                     />
//                   )}
//                 </div>
//                 <p className="text-[10px] text-slate-400 font-bold italic text-center mt-2">Mother's Signature</p>
//               </div>
//             </div>
//           </div>
//         </section>

//         {/* Emergency Section */}
//         <section className="bg-red-50 border-4 border-red-200 p-8 rounded-3xl relative">
//            <PartWarning fields={["emergency_situation", "nok_name", "nok_relationship", "emergency_obstetrician_signature", "emergency_witness_signature"]} />
//            <div className="flex items-center gap-2 mb-4">
//               <AlertCircle className="text-red-600" />
//               <h4 className="font-black text-red-900 uppercase tracking-widest text-sm">Part L — Emergency Authorisation</h4>
//            </div>
//            <p className="text-xs text-red-700 font-medium mb-6">Complete this section ONLY if the mother is unable to consent and immediate delivery is required.</p>
           
//            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//              <div className="md:col-span-2 space-y-2">
//                 <label className="block text-[10px] font-black text-red-400 uppercase tracking-widest">Clinical situation</label>
//                 <textarea 
//                   rows={2}
//                   value={formData.emergency_situation}
//                   onChange={(e) => handleInputChange("emergency_situation", e.target.value)}
//                   readOnly={readOnly}
//                   className={`w-full border-2 border-red-200 rounded-xl px-4 py-2 font-bold text-red-900 transition-all outline-none resize-none ${readOnly ? "bg-red-100" : "bg-white focus:border-red-400"}`}
//                 />
//              </div>
             
//              <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-red-400 uppercase tracking-widest">Next of Kin / Rep Name</label>
//                 <input 
//                   type="text" 
//                   value={formData.nok_name} 
//                   onChange={(e) => handleInputChange("nok_name", e.target.value)}
//                   readOnly={readOnly}
//                   className={`w-full border-2 border-red-200 rounded-xl px-4 py-2 font-bold text-red-900 transition-all outline-none ${readOnly ? "bg-red-100" : "bg-white focus:border-red-400"}`}
//                 />
//              </div>

//              <div className="space-y-2">
//                 <label className="block text-[10px] font-black text-red-400 uppercase tracking-widest">Relationship</label>
//                 <input 
//                   type="text" 
//                   value={formData.nok_relationship} 
//                   onChange={(e) => handleInputChange("nok_relationship", e.target.value)}
//                   readOnly={readOnly}
//                   className={`w-full border-2 border-red-200 rounded-xl px-4 py-2 font-bold text-red-900 transition-all outline-none ${readOnly ? "bg-red-100" : "bg-white focus:border-red-400"}`}
//                 />
//              </div>
             
//              <div className="space-y-2 flex-grow flex flex-col">
//                <div className="flex-grow min-h-[250px] border-4 border-dashed border-red-200 rounded-2xl overflow-hidden bg-white">
//                  {readOnly ? (
//                    <div className="h-full w-full flex items-center justify-center p-2">
//                      {formData.emergency_obstetrician_signature ? (
//                        <img src={getSigUrl(formData.emergency_obstetrician_signature)} alt="Signature" className="max-h-full max-w-full object-contain" />
//                      ) : (
//                        <span className="text-red-300 font-bold uppercase text-xs">No Signature</span>
//                      )}
//                    </div>
//                  ) : (
//                    <SignaturePad 
//                      onEnd={(data) => handleInputChange("emergency_obstetrician_signature", data)}
//                      onClear={() => handleInputChange("emergency_obstetrician_signature", null)}
//                      className="h-full w-full"
//                    />
//                  )}
//                </div>
//                <p className="text-[10px] text-red-400 font-bold italic text-center">Obstetrician Signature</p>
//              </div>

//              <div className="space-y-2 flex-grow flex flex-col">
//                <div className="flex-grow min-h-[250px] border-4 border-dashed border-red-200 rounded-2xl overflow-hidden bg-white">
//                  {readOnly ? (
//                    <div className="h-full w-full flex items-center justify-center p-2">
//                      {formData.emergency_witness_signature ? (
//                        <img src={getSigUrl(formData.emergency_witness_signature)} alt="Signature" className="max-h-full max-w-full object-contain" />
//                      ) : (
//                        <span className="text-red-300 font-bold uppercase text-xs">No Signature</span>
//                      )}
//                    </div>
//                  ) : (
//                    <SignaturePad 
//                      onEnd={(data) => handleInputChange("emergency_witness_signature", data)}
//                      onClear={() => handleInputChange("emergency_witness_signature", null)}
//                      className="h-full w-full"
//                    />
//                  )}
//                </div>
//                <p className="text-[10px] text-red-400 font-bold italic text-center">Second Senior Clinician Witness</p>
//              </div>
//            </div>
//         </section>

//         {/* Part M - Confirmation & Withdrawal */}
//         <section>
//           <div className="bg-[#475569] text-white px-4 py-1 inline-block rounded-t-xl text-[10px] font-black uppercase tracking-widest mb-0 ml-4">Part M — Confirmation & Withdrawal</div>
//           <div className="border-4 border-slate-900 rounded-3xl p-8 bg-slate-50 relative">
//              <PartWarning fields={[]} />
//              <div className="grid grid-cols-1 gap-8">
//                <div className="space-y-2 flex-grow flex flex-col">
//                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Confirming Clinician (Immediately before op)</label>
//                  <div className="flex-grow min-h-[250px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-white">
//                    {readOnly ? (
//                      <div className="h-full w-full flex items-center justify-center p-2">
//                        {formData.confirmation_clinician_signature ? <img src={getSigUrl(formData.confirmation_clinician_signature)} alt="Signature" className="max-h-full max-w-full object-contain" /> : <span className="text-slate-300 font-bold uppercase text-xs">No Signature</span>}
//                      </div>
//                    ) : (
//                      <SignaturePad onEnd={(data) => handleInputChange("confirmation_clinician_signature", data)} onClear={() => handleInputChange("confirmation_clinician_signature", null)} className="h-full w-full" />
//                    )}
//                  </div>
//                </div>
               
//                <div className="space-y-4">
//                  <div className="space-y-2">
//                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Withdrawal Notes (If applicable)</label>
//                    <textarea 
//                      rows={2}
//                      value={formData.withdrawal_reason}
//                      onChange={(e) => handleInputChange("withdrawal_reason", e.target.value)}
//                      readOnly={readOnly}
//                      className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-[#3B309A]"}`}
//                    />
//                  </div>
                 
//                  <div className="grid grid-cols-1 gap-4">
//                    <div className="space-y-2 flex-grow flex flex-col">
//                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Mother's Sig (Withdrawal)</label>
//                      <div className="flex-grow min-h-[250px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-white">
//                        {readOnly ? (
//                          <div className="h-full w-full flex items-center justify-center p-2">
//                            {formData.withdrawal_mother_signature ? <img src={getSigUrl(formData.withdrawal_mother_signature)} alt="Signature" className="max-h-full max-w-full object-contain" /> : <span className="text-slate-300 font-bold uppercase text-[8px]">None</span>}
//                          </div>
//                        ) : (
//                          <SignaturePad onEnd={(data) => handleInputChange("withdrawal_mother_signature", data)} onClear={() => handleInputChange("withdrawal_mother_signature", null)} className="h-full w-full" />
//                        )}
//                      </div>
//                    </div>
//                    <div className="space-y-2 flex-grow flex flex-col">
//                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Clinician Ack</label>
//                      <div className="flex-grow min-h-[250px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-white">
//                        {readOnly ? (
//                          <div className="h-full w-full flex items-center justify-center p-2">
//                            {formData.withdrawal_clinician_signature ? <img src={getSigUrl(formData.withdrawal_clinician_signature)} alt="Signature" className="max-h-full max-w-full object-contain" /> : <span className="text-slate-300 font-bold uppercase text-[8px]">None</span>}
//                          </div>
//                        ) : (
//                          <SignaturePad onEnd={(data) => handleInputChange("withdrawal_clinician_signature", data)} onClear={() => handleInputChange("withdrawal_clinician_signature", null)} className="h-full w-full" />
//                        )}
//                      </div>
//                    </div>
//                  </div>
//                </div>
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
//               disabled={submitting || !formData.obstetrician_signature || (!formData.mother_signature && !formData.emergency_obstetrician_signature)}
//               className="bg-[#3B309A] text-white px-10 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-2xl shadow-[#3B309A]/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50 disabled:grayscale disabled:scale-100"
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
//               className="bg-brand-primary text-white px-10 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-2xl transition-all flex items-center gap-3"
//             >
//               <Printer size={20} /> View Full PDF
//             </button>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default CsDeliveryConsentForm;
