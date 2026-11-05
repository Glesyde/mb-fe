import React, { useState, useEffect, useRef } from "react";
import { CheckCircle, Loader2, Printer, AlertCircle, Save } from "lucide-react";
import { consentService, ConsentTemplate } from "../../services/consent.service";
import SignaturePad from "../SignaturePad";
import { useAuth } from "../../context/AuthContext";
import { useNotification } from "../../context/NotificationContext";
import { BASE_URL } from "../../api/client";
import apiClient from "../../api/client";
import { patientService } from "../../services/patient.service";
import { formDraftService } from "../../services/session-restore.service";

interface DynamicConsentFormProps {
  slug: string;
  orderId: number;
  patientName: string;
  mrn: string;
  initialData?: any;
  draftId?: number | null;
  onSuccess: (formData: any, template: ConsentTemplate) => void;
  onCancel: () => void;
  onPrint: () => void;
  onTemplateLoaded?: (template: ConsentTemplate) => void;
  readOnly?: boolean;
  viewData?: any;
}

type SchemaField = {
  id?: string;
  type?: string;
  label?: string;
  content?: string;
  static?: string;
  required?: boolean;
  options?: string[];
};

type SchemaSection = {
  id: string;
  type: "static" | "form" | "table";
  title?: string;
  content?: string;
  role?: string;
  fields?: SchemaField[];
  columns?: string[];
  rows?: string[][];
};

const titleCase = (s: string) =>
  s
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

const ACCENTS: Record<string, { bar: string; border: string; focus: string; text: string }> = {
  blue: { bar: "bg-[#1e40af]", border: "border-[#1e40af]", focus: "focus:border-[#1e40af]", text: "text-[#1e40af]" },
  slate: { bar: "bg-slate-700", border: "border-slate-700", focus: "focus:border-slate-500", text: "text-slate-700" },
  dark: { bar: "bg-slate-900", border: "border-slate-900", focus: "focus:border-slate-700", text: "text-slate-900" },
  red: { bar: "bg-[#be123c]", border: "border-[#be123c]", focus: "focus:border-[#be123c]", text: "text-[#be123c]" },
  orange: { bar: "bg-[#ea580c]", border: "border-[#ea580c]", focus: "focus:border-[#ea580c]", text: "text-[#ea580c]" },
  emerald: { bar: "bg-emerald-600", border: "border-emerald-500", focus: "focus:border-emerald-500", text: "text-emerald-600" },
  purple: { bar: "bg-purple-600", border: "border-purple-200", focus: "focus:border-purple-400", text: "text-purple-700" },
};

const sectionAccent = (section: SchemaSection): keyof typeof ACCENTS => {
  const id = section.id.toLowerCase();
  if (id === "part_a") return "blue";
  if (id.startsWith("part_d")) return "red";
  if (id.startsWith("part_e")) return "orange";
  if (id === "part_k" || section.role === "patient") return "emerald";
  if (id === "part_l") return "purple";
  if (id === "part_m") return "dark";
  if (id === "part_i" || section.role === "doctor") return "blue";
  return "slate";
};

const severityColor = (text: string) => {
  const t = text.toUpperCase();
  if (t.includes("VERY RARE") || t.includes("VERY COMMON")) return "text-red-700";
  if (t.includes("RARE")) return "text-rose-600";
  if (t.includes("UNCOMMON")) return "text-amber-600";
  if (t.includes("COMMON")) return "text-emerald-600";
  return "text-slate-700";
};

const DynamicConsentForm: React.FC<DynamicConsentFormProps> = ({
  slug,
  orderId,
  patientName,
  mrn,
  initialData,
  draftId,
  onSuccess,
  onCancel,
  onPrint,
  onTemplateLoaded,
  readOnly = false,
  viewData,
}) => {
  const { user } = useAuth();
  const { notify } = useNotification();

  const [template, setTemplate] = useState<ConsentTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<any>(viewData || initialData || { patient_name: patientName, mrn });
  const [formErrors, setFormErrors] = useState<string[]>([]);

  // Ref for the local auto-save timer
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // FIX: Properly strip /api or /api/v1 from BASE_URL to point to the public root for uploads
  const getSigUrl = (path: string | undefined | null) => {
    if (!path) return "";
    if (path.startsWith("data:")) return path;
    const normalizedBaseUrl = BASE_URL.replace(/\/api(\/v\d+)?\/?$/, "").replace(/\/$/, "");
    return path.startsWith("/") ? `${normalizedBaseUrl}${path}` : `${normalizedBaseUrl}/${path}`;
  };

  // FIX: Ensure viewData or initialData syncs properly into state on Read-Only views
  useEffect(() => {
    if (viewData || initialData) {
      setFormData((prev: any) => ({ ...prev, ...(viewData || initialData) }));
    }
  }, [viewData, initialData]);

  useEffect(() => {
    if (!readOnly && !viewData && !initialData) {
        fetchTemplate();
    } else {
        // If readOnly, we still need the template schema to render the UI correctly
        fetchTemplateReadOnly();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, readOnly, viewData, initialData]);

  const fetchTemplateReadOnly = async () => {
    setLoading(true);
    try {
      const data = await consentService.getTemplate(slug);
      setTemplate(data);
      if (onTemplateLoaded) onTemplateLoaded(data);
    } catch (error) {
      console.error("Failed to fetch consent template", error);
      notify("Failed to load consent template", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplate = async () => {
    setLoading(true);
    try {
      const data = await consentService.getTemplate(slug);
      setTemplate(data);
      if (onTemplateLoaded) onTemplateLoaded(data);
      
      // Ensure all fields from the schema are safely initialized ONLY if not pre-filled
      setFormData((prev: any) => {
        const merged: any = { patient_name: patientName, mrn, ...prev };
        (data.form_schema.sections || []).forEach((section: SchemaSection) => {
          (section.fields || []).forEach((field) => {
            if (!field.id || field.id in merged) return;
            if (field.type === "checkbox") merged[field.id] = false;
            else if (field.type === "signature") merged[field.id] = null;
            else merged[field.id] = "";
          });
        });
        return merged;
      });
      
    } catch (error) {
      console.error("Failed to fetch consent template", error);
      notify("Failed to load consent template", "error");
    } finally {
      setLoading(false);
    }
  };

  // 1. Initial Data Fetch & Local Draft Restoration
  useEffect(() => {
    if (!readOnly && mrn && !viewData && !initialData) {
      
      const localDraftId = `consent_dynamic_${slug}_${orderId}`;
      const savedDraft = user?.id ? formDraftService.loadDraft<any>(user.id, localDraftId) : null;

      // Restore local draft if it exists
      if (savedDraft) {
        setFormData(savedDraft);
        notify("Restored unsaved changes from your previous session", "success");
        return;
      }

      // Otherwise fetch clinical defaults
      const fetchPrefillData = async () => {
        try {
          const patient = await patientService.getPatientByMrn(mrn);
          let wardUnit = "";
          try {
            const admissionRes = await apiClient.get("/ipd/admission/list");
            const admissions = admissionRes.data?.data?.results || [];
            const activeAdmission = admissions.find((a: any) => a.mrn === mrn && a.status === "ACTIVE");
            if (activeAdmission) {
              wardUnit = [activeAdmission.ward_name, activeAdmission.room_number, activeAdmission.bed_number].filter(Boolean).join(" / ");
            }
          } catch (admError) {
            console.warn("Could not fetch admission data for pre-fill", admError);
          }

          if (patient) {
            setFormData((prev: any) => {
              const firstName = patient.demographics?.first_name || "";
              const lastName = patient.demographics?.last_name || "";
              const fullName = `${firstName} ${lastName}`.trim();

              return {
                ...prev,
                patient_full_name: prev.patient_full_name || fullName,
                date_of_birth: prev.date_of_birth || patient.demographics?.date_of_birth || "",
                sex_at_birth: prev.sex_at_birth || patient.demographics?.gender || "",
                ward_unit: prev.ward_unit || wardUnit,
                dob: prev.dob || patient.demographics?.date_of_birth || "",
                age_sex: prev.age_sex || `${patient.demographics?.age || ""} / ${patient.demographics?.gender || ""}`,
              };
            });
          }
        } catch (error) {
          console.error("Failed to prefill patient data", error);
        }
      };

      fetchPrefillData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mrn, readOnly, viewData, initialData, orderId, slug, user?.id]);

  // 2. Local Auto-Save Loop
  useEffect(() => {
    if (readOnly || !orderId || !user?.id) return;
    
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    
    autoSaveTimerRef.current = setTimeout(() => {
      const localDraftId = `consent_dynamic_${slug}_${orderId}`;
      formDraftService.saveDraft(user.id!, localDraftId, formData);
    }, 1500);
    
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
  }, [formData, orderId, slug, user?.id, readOnly]);

  const handleInputChange = (id: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [id]: value }));
    setFormErrors((prev) => prev.filter((f) => f !== id));
  };

  const allFields = (): SchemaField[] => {
    if (!template) return [];
    const out: SchemaField[] = [];
    template.form_schema.sections.forEach((s: SchemaSection) => (s.fields || []).forEach((f) => f.id && out.push(f)));
    return out;
  };

  const buildSubmissionFormData = () => {
    const payload = { ...formData };
    if (!payload.patient_signature) payload.patient_signature = payload.parent_signature || null;
    if (!payload.nurse_signature) {
      payload.nurse_signature = payload.witness_signature || "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    }
    return payload;
  };

  // 3. Save as Backend Draft Handler
  const handleSaveDraft = async () => {
    if (!template) return;
    setSubmitting(true);
    try {
      const submissionData = buildSubmissionFormData();
      await consentService.createConsent({
        order_id: orderId,
        template_slug: slug,
        witness_user_id: user?.id || 0,
        form_data: submissionData,
        is_draft: true,
        consent_id: draftId,
      });
      notify("Draft saved successfully", "success");
      
      // Clear local storage draft
      if (user?.id) formDraftService.clearDraft(user.id, `consent_dynamic_${slug}_${orderId}`);

      onCancel(); 
    } catch (error: any) {
      notify(error.response?.data?.message || error.message || "Failed to save draft", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Finalizing and Submitting Consent Handler
  const handleSubmit = async () => {
    if (!template) return;
    const submissionData = buildSubmissionFormData();
    const requiredFields = allFields().filter((f) => f.required);
    const missingKeys = requiredFields.filter((f) => {
      const val = submissionData[f.id!];
      if (f.type === "checkbox") return !val;
      return val === null || val === undefined || val === "";
    });

    const hasAnySignature = allFields().some((f) => f.type === "signature" && f.id && submissionData[f.id]);
    if (!hasAnySignature) {
      notify("At least one signature is required", "error");
      return;
    }

    if (missingKeys.length > 0) {
      setFormErrors(missingKeys.map((f) => f.id!));
      notify(`Please fill in required fields: ${missingKeys.map((f) => f.label).join(", ")}`, "error");
      setTimeout(() => {
        const firstErrorEl = document.querySelector(".border-red-500");
        if (firstErrorEl) firstErrorEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
      return;
    }

    setFormErrors([]);
    setSubmitting(true);
    try {
      await consentService.createConsent({
        order_id: orderId,
        template_slug: slug,
        workflow_stage: "SIGNED_AND_CHECKED",
        witness_user_id: user?.id || 0,
        form_data: submissionData,
        consent_id: draftId,
      });
      notify("Consent form submitted successfully", "success");
      
      // Clear local storage draft
      if (user?.id) formDraftService.clearDraft(user.id, `consent_dynamic_${slug}_${orderId}`);

      onSuccess(submissionData, template);
    } catch (error: any) {
      notify(error.response?.data?.message || error.message || "Failed to submit consent", "error");
    } finally {
      setSubmitting(false);
    }
  };

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


  if (loading) {
    return (
      <div className="bg-white rounded-3xl shadow-2xl p-16 flex items-center justify-center">
        <Loader2 className="animate-spin text-[#1e40af]" size={48} />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="bg-white rounded-3xl shadow-2xl p-16 flex flex-col items-center gap-4">
        <AlertCircle className="text-red-500" size={40} />
        <p className="text-slate-600 font-bold">Failed to load consent template.</p>
        <button onClick={onCancel} className="px-6 py-2 bg-slate-100 rounded-xl font-bold text-slate-600">Close</button>
      </div>
    );
  }

  const sections = template.form_schema.sections as SchemaSection[];
  const blackBoxStartIdx = sections.findIndex((s) => s.id === "part_i" || s.role === "doctor");

  const getInputClass = (field: SchemaField, accent: keyof typeof ACCENTS, isTextarea = false) => {
    const base = `w-full border-2 rounded-xl px-4 py-2 font-bold transition-all outline-none ${isTextarea ? "resize-none" : ""}`;
    if (readOnly) return `${base} bg-slate-100 border-slate-200 text-slate-800`;
    if (field.id && formErrors.includes(field.id)) return `${base} bg-red-50 border-red-500 text-red-900`;
    return `${base} bg-white border-slate-200 text-slate-800 ${ACCENTS[accent].focus}`;
  };

  const renderField = (field: SchemaField, accent: keyof typeof ACCENTS) => {
    if (!field.type) {
      if (field.content) {
        return <p key={field.label || field.content} className="text-xs text-slate-600 font-medium italic md:col-span-4">{field.content}</p>;
      }
      if (field.label) {
        return <p key={field.id || field.label} className="text-[10px] font-black text-slate-500 uppercase tracking-widest md:col-span-4 mt-2">{field.label}</p>;
      }
      return null;
    }

    const id = field.id!;
    const label = field.label || "";

    if (field.type === "signature") {
      return (
        <div key={id} className="space-y-2 flex flex-col md:col-span-2">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
          <div className="flex-grow min-h-[180px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
            {renderSignatureBox(id, label)}
          </div>
        </div>
      );
    }

    if (field.type === "checkbox") {
      return (
        <label key={id} className="flex items-start gap-3 p-3 bg-white border-2 border-slate-200 rounded-xl cursor-pointer md:col-span-2">
          <input
            type="checkbox"
            checked={!!formData[id]}
            onChange={(e) => handleInputChange(id, e.target.checked)}
            disabled={readOnly}
            className={`mt-1 w-5 h-5 rounded ${ACCENTS[accent].text}`}
          />
          <span className="text-xs font-bold text-slate-700 leading-tight">{label}{field.required && " *"}</span>
        </label>
      );
    }

    if (field.type === "radio") {
      return (
        <div key={id} className="space-y-2 md:col-span-2">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
          <div className="flex flex-col gap-2 p-3 bg-white border-2 border-slate-200 rounded-xl">
            {(field.options || []).map((opt) => (
              <label key={opt} className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="radio"
                  name={id}
                  checked={formData[id] === opt}
                  onChange={() => handleInputChange(id, opt)}
                  disabled={readOnly}
                  className="w-4 h-4"
                />
                <span className="text-xs font-bold text-slate-600">{opt}</span>
              </label>
            ))}
          </div>
        </div>
      );
    }

    if (field.type === "textarea") {
      return (
        <div key={id} className="space-y-2 md:col-span-4">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}{field.required && " *"}</label>
          <textarea
            rows={2}
            value={formData[id] || ""}
            onChange={(e) => handleInputChange(id, e.target.value)}
            readOnly={readOnly}
            className={getInputClass(field, accent, true)}
          />
        </div>
      );
    }

    // text / date
    return (
      <div key={id} className="space-y-2 md:col-span-1">
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}{field.required && " *"}</label>
        <input
          type={field.type === "date" ? "date" : "text"}
          value={formData[id] || ""}
          onChange={(e) => handleInputChange(id, e.target.value)}
          readOnly={readOnly || (id === "mrn")}
          className={getInputClass(field, accent)}
        />
      </div>
    );
  };

  const renderSection = (section: SchemaSection) => {
    const accent = sectionAccent(section);

    if (section.id === "patient_rights") {
      return (
        <div key={section.id} className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-amber-200/50 px-4 py-1 rounded-bl-xl text-[10px] font-black text-amber-800 uppercase tracking-wider">Patient Rights</div>
          <p className="text-sm text-amber-900 font-medium leading-relaxed italic">"{section.content}"</p>
        </div>
      );
    }

    if (section.type === "static") {
      return (
        <div key={section.id}>
          {section.title && (
            <div className={`${ACCENTS[accent].bar} text-white px-4 py-1 inline-block rounded-t-xl text-[10px] font-black uppercase tracking-widest mb-0 ml-4`}>{section.title}</div>
          )}
          <div className="border-4 border-slate-900 rounded-3xl p-6 bg-slate-50">
            <p className="text-sm text-slate-700 font-medium leading-relaxed whitespace-pre-line">{section.content}</p>
          </div>
        </div>
      );
    }

    if (section.type === "table") {
      return (
        <div key={section.id}>
          {section.title && (
            <div className={`${ACCENTS[accent].bar} text-white px-4 py-1 inline-block rounded-t-xl text-[10px] font-black uppercase tracking-widest mb-0 ml-4`}>{section.title}</div>
          )}
          <div className="border-4 border-slate-900 rounded-3xl overflow-hidden shadow-xl">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-900 text-white">
                <tr>
                  {(section.columns || []).map((c) => (
                    <th key={c} className="px-6 py-3 text-[10px] font-black uppercase tracking-widest border-r border-slate-700 last:border-r-0">{titleCase(c)}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {(section.rows || []).map((row, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    {row.map((cell, ci) => (
                      <td key={ci} className={`px-6 py-4 text-xs border-r border-slate-200 last:border-r-0 ${ci === 0 ? `font-black \${severityColor(cell)}` : "font-medium text-slate-600"}`}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // "form" type
    return (
      <div key={section.id} className={section.id === "part_l" ? "bg-purple-50 border-4 border-purple-200 p-8 rounded-3xl" : "relative"}>
        {section.id !== "part_l" && section.title && (
          <div className={`${ACCENTS[accent].bar} text-white px-4 py-1 inline-block rounded-t-xl text-[10px] font-black uppercase tracking-widest mb-0 ml-4`}>{section.title}</div>
        )}
        {section.id === "part_l" && section.title && (
          <div className="flex items-center gap-3 mb-4">
            <h4 className="font-black text-purple-900 uppercase tracking-widest text-[10px]">{section.title}</h4>
          </div>
        )}
        <div className={section.id === "part_l" ? "grid grid-cols-1 md:grid-cols-4 gap-6" : "border-4 border-slate-900 rounded-3xl p-8 grid grid-cols-1 md:grid-cols-4 gap-6 bg-slate-50"}>
          {section.content && (
            <p className="text-xs text-slate-600 font-bold md:col-span-4 leading-relaxed">{section.content}</p>
          )}
          {(section.fields || []).map((field) => renderField(field, accent))}
        </div>
      </div>
    );
  };

  const preBlackBox = blackBoxStartIdx === -1 ? sections : sections.slice(0, blackBoxStartIdx);
  const blackBoxSections = blackBoxStartIdx === -1 ? [] : sections.slice(blackBoxStartIdx);

  return (
    <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="bg-[#1e40af] text-white p-10 flex justify-between items-center relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#1e40af]/30 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="z-10">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-1">
              <img src="/assets/login-bg.jpeg" alt="GSH Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter">Procedure Consent Form</h1>
              <p className="text-[#93c5fd] font-bold text-sm">{template.display_name}</p>
            </div>
          </div>
          <p className="text-xs text-[#93c5fd]/80 font-medium">Policy Ref: {template.form_schema?.metadata?.policy || "GSH-T6"} Version {template.version}</p>
        </div>
        <button
          onClick={onPrint}
          className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/20 transition-all z-10"
        >
          <Printer size={14} /> Print Blank Form
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar bg-slate-50">
        {preBlackBox.map(renderSection)}

        {blackBoxSections.length > 0 && (
          <section className="space-y-8 bg-slate-900 p-10 rounded-[3rem] shadow-2xl">
            <h3 className="text-center text-white font-black uppercase tracking-[0.3em] text-lg mb-6">Final Declarations & Signatures</h3>
            {blackBoxSections.map((section) => {
              const accent = sectionAccent(section);
              if (section.id === "part_l") {
                return <div key={section.id}>{renderSection(section)}</div>;
              }
              return (
                <div key={section.id} className={`bg-white rounded-3xl p-6 shadow-xl border-t-8 ${ACCENTS[accent].border} relative`}>
                  {section.title && (
                    <h4 className="font-black text-slate-800 uppercase tracking-wider text-[10px] mb-4">{section.title}</h4>
                  )}
                  {section.content && (
                    <p className="text-xs text-slate-600 font-bold mb-6 italic border-l-4 border-slate-200 pl-4">{section.content}</p>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {(section.fields || []).map((field) => renderField(field, accent))}
                  </div>
                </div>
              );
            })}
          </section>
        )}
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

export default DynamicConsentForm;

// import React, { useState, useEffect, useRef } from "react";
// import { CheckCircle, Loader2, Printer, AlertCircle, Save } from "lucide-react";
// import { consentService, ConsentTemplate } from "../../services/consent.service";
// import SignaturePad from "../SignaturePad";
// import { useAuth } from "../../context/AuthContext";
// import { useNotification } from "../../context/NotificationContext";
// import { BASE_URL } from "../../api/client";
// import apiClient from "../../api/client";
// import { patientService } from "../../services/patient.service";
// import { formDraftService } from "../../services/session-restore.service"; // <-- ADDED IMPORT

// interface DynamicConsentFormProps {
//   slug: string;
//   orderId: number;
//   patientName: string;
//   mrn: string;
//   initialData?: any;           // <-- ADDED
//   draftId?: number | null;     // <-- ADDED
//   onSuccess: (formData: any, template: ConsentTemplate) => void;
//   onCancel: () => void;
//   onPrint: () => void;
//   onTemplateLoaded?: (template: ConsentTemplate) => void;
//   readOnly?: boolean;
//   viewData?: any;
// }

// type SchemaField = {
//   id?: string;
//   type?: string;
//   label?: string;
//   content?: string;
//   static?: string;
//   required?: boolean;
//   options?: string[];
// };

// type SchemaSection = {
//   id: string;
//   type: "static" | "form" | "table";
//   title?: string;
//   content?: string;
//   role?: string;
//   fields?: SchemaField[];
//   columns?: string[];
//   rows?: string[][];
// };

// const titleCase = (s: string) =>
//   s
//     .replace(/_/g, " ")
//     .replace(/\b\w/g, (c) => c.toUpperCase());

// const ACCENTS: Record<string, { bar: string; border: string; focus: string; text: string }> = {
//   blue: { bar: "bg-[#1e40af]", border: "border-[#1e40af]", focus: "focus:border-[#1e40af]", text: "text-[#1e40af]" },
//   slate: { bar: "bg-slate-700", border: "border-slate-700", focus: "focus:border-slate-500", text: "text-slate-700" },
//   dark: { bar: "bg-slate-900", border: "border-slate-900", focus: "focus:border-slate-700", text: "text-slate-900" },
//   red: { bar: "bg-[#be123c]", border: "border-[#be123c]", focus: "focus:border-[#be123c]", text: "text-[#be123c]" },
//   orange: { bar: "bg-[#ea580c]", border: "border-[#ea580c]", focus: "focus:border-[#ea580c]", text: "text-[#ea580c]" },
//   emerald: { bar: "bg-emerald-600", border: "border-emerald-500", focus: "focus:border-emerald-500", text: "text-emerald-600" },
//   purple: { bar: "bg-purple-600", border: "border-purple-200", focus: "focus:border-purple-400", text: "text-purple-700" },
// };

// const sectionAccent = (section: SchemaSection): keyof typeof ACCENTS => {
//   const id = section.id.toLowerCase();
//   if (id === "part_a") return "blue";
//   if (id.startsWith("part_d")) return "red";
//   if (id.startsWith("part_e")) return "orange";
//   if (id === "part_k" || section.role === "patient") return "emerald";
//   if (id === "part_l") return "purple";
//   if (id === "part_m") return "dark";
//   if (id === "part_i" || section.role === "doctor") return "blue";
//   return "slate";
// };

// const severityColor = (text: string) => {
//   const t = text.toUpperCase();
//   if (t.includes("VERY RARE") || t.includes("VERY COMMON")) return "text-red-700";
//   if (t.includes("RARE")) return "text-rose-600";
//   if (t.includes("UNCOMMON")) return "text-amber-600";
//   if (t.includes("COMMON")) return "text-emerald-600";
//   return "text-slate-700";
// };

// const DynamicConsentForm: React.FC<DynamicConsentFormProps> = ({
//   slug,
//   orderId,
//   patientName,
//   mrn,
//   initialData,
//   draftId,
//   onSuccess,
//   onCancel,
//   onPrint,
//   onTemplateLoaded,
//   readOnly = false,
//   viewData,
// }) => {
//   const { user } = useAuth();
//   const { notify } = useNotification();

//   const [template, setTemplate] = useState<ConsentTemplate | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [submitting, setSubmitting] = useState(false);
//   const [formData, setFormData] = useState<any>(viewData || initialData || { patient_name: patientName, mrn });
//   const [formErrors, setFormErrors] = useState<string[]>([]);

//   // Ref for the local auto-save timer
//   const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

//   const getSigUrl = (path: string | undefined | null) => {
//     if (!path) return "";
//     if (path.startsWith("data:")) return path;
//     const normalizedBaseUrl = BASE_URL.replace(/\/\$/, "");
//     return path.startsWith("/") ? `${normalizedBaseUrl}${path}` : `${normalizedBaseUrl}/${path}`;
//   };

//   useEffect(() => {
//     fetchTemplate();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [slug]);

//   const fetchTemplate = async () => {
//     setLoading(true);
//     try {
//       const data = await consentService.getTemplate(slug);
//       setTemplate(data);
//       if (onTemplateLoaded) onTemplateLoaded(data);
      
//       // Ensure all fields from the schema are safely initialized
//       setFormData((prev: any) => {
//         const merged: any = { patient_name: patientName, mrn, ...prev };
//         (data.form_schema.sections || []).forEach((section: SchemaSection) => {
//           (section.fields || []).forEach((field) => {
//             if (!field.id || field.id in merged) return;
//             if (field.type === "checkbox") merged[field.id] = false;
//             else if (field.type === "signature") merged[field.id] = null;
//             else merged[field.id] = "";
//           });
//         });
//         return merged;
//       });
      
//     } catch (error) {
//       console.error("Failed to fetch consent template", error);
//       notify("Failed to load consent template", "error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // 1. Initial Data Fetch & Local Draft Restoration
//   useEffect(() => {
//     if (!readOnly && mrn && !viewData && !initialData) {
      
//       const localDraftId = `consent_dynamic_${slug}_${orderId}`;
//       const savedDraft = user?.id ? formDraftService.loadDraft<any>(user.id, localDraftId) : null;

//       // Restore local draft if it exists
//       if (savedDraft) {
//         setFormData(savedDraft);
//         notify("Restored unsaved changes from your previous session", "success");
//         return;
//       }

//       // Otherwise fetch clinical defaults
//       const fetchPrefillData = async () => {
//         try {
//           const patient = await patientService.getPatientByMrn(mrn);
//           let wardUnit = "";
//           try {
//             const admissionRes = await apiClient.get("/ipd/admission/list");
//             const admissions = admissionRes.data?.data?.results || [];
//             const activeAdmission = admissions.find((a: any) => a.mrn === mrn && a.status === "ACTIVE");
//             if (activeAdmission) {
//               wardUnit = [activeAdmission.ward_name, activeAdmission.room_number, activeAdmission.bed_number].filter(Boolean).join(" / ");
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
//                 date_of_birth: prev.date_of_birth || patient.demographics?.date_of_birth || "",
//                 sex_at_birth: prev.sex_at_birth || patient.demographics?.gender || "",
//                 ward_unit: prev.ward_unit || wardUnit,
//                 dob: prev.dob || patient.demographics?.date_of_birth || "",
//                 age_sex: prev.age_sex || `${patient.demographics?.age || ""} / ${patient.demographics?.gender || ""}`,
//               };
//             });
//           }
//         } catch (error) {
//           console.error("Failed to prefill patient data", error);
//         }
//       };

//       fetchPrefillData();
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [mrn, readOnly, viewData, initialData, orderId, slug, user?.id]);

//   // 2. Local Auto-Save Loop
//   useEffect(() => {
//     if (readOnly || !orderId || !user?.id) return;
    
//     if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    
//     autoSaveTimerRef.current = setTimeout(() => {
//       const localDraftId = `consent_dynamic_${slug}_${orderId}`;
//       formDraftService.saveDraft(user.id!, localDraftId, formData);
//     }, 1500);
    
//     return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
//   }, [formData, orderId, slug, user?.id, readOnly]);

//   const handleInputChange = (id: string, value: any) => {
//     setFormData((prev: any) => ({ ...prev, [id]: value }));
//     setFormErrors((prev) => prev.filter((f) => f !== id));
//   };

//   const allFields = (): SchemaField[] => {
//     if (!template) return [];
//     const out: SchemaField[] = [];
//     template.form_schema.sections.forEach((s: SchemaSection) => (s.fields || []).forEach((f) => f.id && out.push(f)));
//     return out;
//   };

//   const buildSubmissionFormData = () => {
//     const payload = { ...formData };
//     if (!payload.patient_signature) payload.patient_signature = payload.parent_signature || null;
//     if (!payload.nurse_signature) {
//       payload.nurse_signature = payload.witness_signature || "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
//     }
//     return payload;
//   };

//   // 3. Save as Backend Draft Handler
//   const handleSaveDraft = async () => {
//     if (!template) return;
//     setSubmitting(true);
//     try {
//       const submissionData = buildSubmissionFormData();
//       await consentService.createConsent({
//         order_id: orderId,
//         template_slug: slug,
//         witness_user_id: user?.id || 0,
//         form_data: submissionData,
//         is_draft: true,
//         consent_id: draftId,
//       });
//       notify("Draft saved successfully", "success");
      
//       // Clear local storage draft
//       if (user?.id) formDraftService.clearDraft(user.id, `consent_dynamic_${slug}_${orderId}`);

//       onCancel(); 
//     } catch (error: any) {
//       notify(error.response?.data?.message || error.message || "Failed to save draft", "error");
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   // 4. Finalizing and Submitting Consent Handler
//   const handleSubmit = async () => {
//     if (!template) return;
//     const submissionData = buildSubmissionFormData();
//     const requiredFields = allFields().filter((f) => f.required);
//     const missingKeys = requiredFields.filter((f) => {
//       const val = submissionData[f.id!];
//       if (f.type === "checkbox") return !val;
//       return val === null || val === undefined || val === "";
//     });

//     const hasAnySignature = allFields().some((f) => f.type === "signature" && f.id && submissionData[f.id]);
//     if (!hasAnySignature) {
//       notify("At least one signature is required", "error");
//       return;
//     }

//     if (missingKeys.length > 0) {
//       setFormErrors(missingKeys.map((f) => f.id!));
//       notify(`Please fill in required fields: ${missingKeys.map((f) => f.label).join(", ")}`, "error");
//       setTimeout(() => {
//         const firstErrorEl = document.querySelector(".border-red-500");
//         if (firstErrorEl) firstErrorEl.scrollIntoView({ behavior: "smooth", block: "center" });
//       }, 100);
//       return;
//     }

//     setFormErrors([]);
//     setSubmitting(true);
//     try {
//       await consentService.createConsent({
//         order_id: orderId,
//         template_slug: slug,
//         workflow_stage: "SIGNED_AND_CHECKED",
//         witness_user_id: user?.id || 0,
//         form_data: submissionData,
//         consent_id: draftId,
//       });
//       notify("Consent form submitted successfully", "success");
      
//       // Clear local storage draft
//       if (user?.id) formDraftService.clearDraft(user.id, `consent_dynamic_${slug}_${orderId}`);

//       onSuccess(submissionData, template);
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

//   if (!template) {
//     return (
//       <div className="bg-white rounded-3xl shadow-2xl p-16 flex flex-col items-center gap-4">
//         <AlertCircle className="text-red-500" size={40} />
//         <p className="text-slate-600 font-bold">Failed to load consent template.</p>
//         <button onClick={onCancel} className="px-6 py-2 bg-slate-100 rounded-xl font-bold text-slate-600">Close</button>
//       </div>
//     );
//   }

//   const sections = template.form_schema.sections as SchemaSection[];
//   const blackBoxStartIdx = sections.findIndex((s) => s.id === "part_i" || s.role === "doctor");

//   const getInputClass = (field: SchemaField, accent: keyof typeof ACCENTS, isTextarea = false) => {
//     const base = `w-full border-2 rounded-xl px-4 py-2 font-bold transition-all outline-none ${isTextarea ? "resize-none" : ""}`;
//     if (readOnly) return `${base} bg-slate-100 border-slate-200 text-slate-800`;
//     if (field.id && formErrors.includes(field.id)) return `${base} bg-red-50 border-red-500 text-red-900`;
//     return `${base} bg-white border-slate-200 text-slate-800 ${ACCENTS[accent].focus}`;
//   };

//   const renderField = (field: SchemaField, accent: keyof typeof ACCENTS) => {
//     if (!field.type) {
//       if (field.content) {
//         return <p key={field.label || field.content} className="text-xs text-slate-600 font-medium italic md:col-span-4">{field.content}</p>;
//       }
//       if (field.label) {
//         return <p key={field.id || field.label} className="text-[10px] font-black text-slate-500 uppercase tracking-widest md:col-span-4 mt-2">{field.label}</p>;
//       }
//       return null;
//     }

//     const id = field.id!;
//     const label = field.label || "";

//     if (field.type === "signature") {
//       return (
//         <div key={id} className="space-y-2 flex flex-col md:col-span-2">
//           <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
//           <div className="flex-grow min-h-[180px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
//             {readOnly ? (
//               <div className="h-full w-full flex items-center justify-center p-2">
//                 {formData[id] ? (
//                   <img src={getSigUrl(formData[id])} alt={label} className="max-h-full max-w-full object-contain" />
//                 ) : (
//                   <span className="text-slate-300 font-bold uppercase text-xs">No Signature</span>
//                 )}
//               </div>
//             ) : (
//               <SignaturePad
//                 onEnd={(data) => handleInputChange(id, data)}
//                 onClear={() => handleInputChange(id, null)}
//                 className="h-full w-full"
//               />
//             )}
//           </div>
//         </div>
//       );
//     }

//     if (field.type === "checkbox") {
//       return (
//         <label key={id} className="flex items-start gap-3 p-3 bg-white border-2 border-slate-200 rounded-xl cursor-pointer md:col-span-2">
//           <input
//             type="checkbox"
//             checked={!!formData[id]}
//             onChange={(e) => handleInputChange(id, e.target.checked)}
//             disabled={readOnly}
//             className={`mt-1 w-5 h-5 rounded ${ACCENTS[accent].text}`}
//           />
//           <span className="text-xs font-bold text-slate-700 leading-tight">{label}{field.required && " *"}</span>
//         </label>
//       );
//     }

//     if (field.type === "radio") {
//       return (
//         <div key={id} className="space-y-2 md:col-span-2">
//           <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
//           <div className="flex flex-col gap-2 p-3 bg-white border-2 border-slate-200 rounded-xl">
//             {(field.options || []).map((opt) => (
//               <label key={opt} className="flex items-center gap-2 cursor-pointer group">
//                 <input
//                   type="radio"
//                   name={id}
//                   checked={formData[id] === opt}
//                   onChange={() => handleInputChange(id, opt)}
//                   disabled={readOnly}
//                   className="w-4 h-4"
//                 />
//                 <span className="text-xs font-bold text-slate-600">{opt}</span>
//               </label>
//             ))}
//           </div>
//         </div>
//       );
//     }

//     if (field.type === "textarea") {
//       return (
//         <div key={id} className="space-y-2 md:col-span-4">
//           <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}{field.required && " *"}</label>
//           <textarea
//             rows={2}
//             value={formData[id] || ""}
//             onChange={(e) => handleInputChange(id, e.target.value)}
//             readOnly={readOnly}
//             className={getInputClass(field, accent, true)}
//           />
//         </div>
//       );
//     }

//     // text / date
//     return (
//       <div key={id} className="space-y-2 md:col-span-1">
//         <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}{field.required && " *"}</label>
//         <input
//           type={field.type === "date" ? "date" : "text"}
//           value={formData[id] || ""}
//           onChange={(e) => handleInputChange(id, e.target.value)}
//           readOnly={readOnly || (id === "mrn")}
//           className={getInputClass(field, accent)}
//         />
//       </div>
//     );
//   };

//   const renderSection = (section: SchemaSection) => {
//     const accent = sectionAccent(section);

//     if (section.id === "patient_rights") {
//       return (
//         <div key={section.id} className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 relative overflow-hidden">
//           <div className="absolute top-0 right-0 bg-amber-200/50 px-4 py-1 rounded-bl-xl text-[10px] font-black text-amber-800 uppercase tracking-wider">Patient Rights</div>
//           <p className="text-sm text-amber-900 font-medium leading-relaxed italic">"{section.content}"</p>
//         </div>
//       );
//     }

//     if (section.type === "static") {
//       return (
//         <div key={section.id}>
//           {section.title && (
//             <div className={`${ACCENTS[accent].bar} text-white px-4 py-1 inline-block rounded-t-xl text-[10px] font-black uppercase tracking-widest mb-0 ml-4`}>{section.title}</div>
//           )}
//           <div className="border-4 border-slate-900 rounded-3xl p-6 bg-slate-50">
//             <p className="text-sm text-slate-700 font-medium leading-relaxed whitespace-pre-line">{section.content}</p>
//           </div>
//         </div>
//       );
//     }

//     if (section.type === "table") {
//       return (
//         <div key={section.id}>
//           {section.title && (
//             <div className={`${ACCENTS[accent].bar} text-white px-4 py-1 inline-block rounded-t-xl text-[10px] font-black uppercase tracking-widest mb-0 ml-4`}>{section.title}</div>
//           )}
//           <div className="border-4 border-slate-900 rounded-3xl overflow-hidden shadow-xl">
//             <table className="w-full text-left border-collapse">
//               <thead className="bg-slate-900 text-white">
//                 <tr>
//                   {(section.columns || []).map((c) => (
//                     <th key={c} className="px-6 py-3 text-[10px] font-black uppercase tracking-widest border-r border-slate-700 last:border-r-0">{titleCase(c)}</th>
//                   ))}
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-200">
//                 {(section.rows || []).map((row, idx) => (
//                   <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
//                     {row.map((cell, ci) => (
//                       <td key={ci} className={`px-6 py-4 text-xs border-r border-slate-200 last:border-r-0 ${ci === 0 ? `font-black \${severityColor(cell)}` : "font-medium text-slate-600"}`}>{cell}</td>
//                     ))}
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       );
//     }

//     // "form" type
//     return (
//       <div key={section.id} className={section.id === "part_l" ? "bg-purple-50 border-4 border-purple-200 p-8 rounded-3xl" : "relative"}>
//         {section.id !== "part_l" && section.title && (
//           <div className={`${ACCENTS[accent].bar} text-white px-4 py-1 inline-block rounded-t-xl text-[10px] font-black uppercase tracking-widest mb-0 ml-4`}>{section.title}</div>
//         )}
//         {section.id === "part_l" && section.title && (
//           <div className="flex items-center gap-3 mb-4">
//             <h4 className="font-black text-purple-900 uppercase tracking-widest text-[10px]">{section.title}</h4>
//           </div>
//         )}
//         <div className={section.id === "part_l" ? "grid grid-cols-1 md:grid-cols-4 gap-6" : "border-4 border-slate-900 rounded-3xl p-8 grid grid-cols-1 md:grid-cols-4 gap-6 bg-slate-50"}>
//           {section.content && (
//             <p className="text-xs text-slate-600 font-bold md:col-span-4 leading-relaxed">{section.content}</p>
//           )}
//           {(section.fields || []).map((field) => renderField(field, accent))}
//         </div>
//       </div>
//     );
//   };

//   const preBlackBox = blackBoxStartIdx === -1 ? sections : sections.slice(0, blackBoxStartIdx);
//   const blackBoxSections = blackBoxStartIdx === -1 ? [] : sections.slice(blackBoxStartIdx);

//   return (
//     <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col max-w-6xl mx-auto w-full">
//       {/* Header */}
//       <div className="bg-[#1e40af] text-white p-10 flex justify-between items-center relative overflow-hidden shrink-0">
//         <div className="absolute top-0 right-0 w-64 h-64 bg-[#1e40af]/30 rounded-full -mr-32 -mt-32 blur-3xl"></div>
//         <div className="z-10">
//           <div className="flex items-center gap-4 mb-2">
//             <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-1">
//               <img src="/assets/login-bg.jpeg" alt="GSH Logo" className="w-full h-full object-contain" />
//             </div>
//             <div>
//               <h1 className="text-3xl font-black tracking-tighter">Procedure Consent Form</h1>
//               <p className="text-[#93c5fd] font-bold text-sm">{template.display_name}</p>
//             </div>
//           </div>
//           <p className="text-xs text-[#93c5fd]/80 font-medium">Policy Ref: {template.form_schema?.metadata?.policy || "GSH-T6"} • Version {template.version}</p>
//         </div>
//         <button
//           onClick={onPrint}
//           className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/20 transition-all z-10"
//         >
//           <Printer size={14} /> Print Blank Form
//         </button>
//       </div>

//       {/* Main Content */}
//       <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar bg-slate-50">
//         {preBlackBox.map(renderSection)}

//         {blackBoxSections.length > 0 && (
//           <section className="space-y-8 bg-slate-900 p-10 rounded-[3rem] shadow-2xl">
//             <h3 className="text-center text-white font-black uppercase tracking-[0.3em] text-lg mb-6">Final Declarations & Signatures</h3>
//             {blackBoxSections.map((section) => {
//               const accent = sectionAccent(section);
//               if (section.id === "part_l") {
//                 return <div key={section.id}>{renderSection(section)}</div>;
//               }
//               return (
//                 <div key={section.id} className={`bg-white rounded-3xl p-6 shadow-xl border-t-8 ${ACCENTS[accent].border} relative`}>
//                   {section.title && (
//                     <h4 className="font-black text-slate-800 uppercase tracking-wider text-[10px] mb-4">{section.title}</h4>
//                   )}
//                   {section.content && (
//                     <p className="text-xs text-slate-600 font-bold mb-6 italic border-l-4 border-slate-200 pl-4">{section.content}</p>
//                   )}
//                   <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
//                     {(section.fields || []).map((field) => renderField(field, accent))}
//                   </div>
//                 </div>
//               );
//             })}
//           </section>
//         )}
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

// export default DynamicConsentForm;


// import React, { useState, useEffect } from "react";
// import { CheckCircle, Loader2, Printer, AlertCircle } from "lucide-react";
// import { consentService, ConsentTemplate } from "../../services/consent.service";
// import SignaturePad from "../SignaturePad";
// import { useAuth } from "../../context/AuthContext";
// import { useNotification } from "../../context/NotificationContext";
// import { BASE_URL } from "../../api/client";
// import apiClient from "../../api/client";
// import { patientService } from "../../services/patient.service";

// interface DynamicConsentFormProps {
//   slug: string;
//   orderId: number;
//   patientName: string;
//   mrn: string;
//   onSuccess: (formData: any, template: ConsentTemplate) => void;
//   onCancel: () => void;
//   onPrint: () => void;
//   onTemplateLoaded?: (template: ConsentTemplate) => void;
//   readOnly?: boolean;
//   viewData?: any;
// }

// type SchemaField = {
//   id?: string;
//   type?: string;
//   label?: string;
//   content?: string;
//   static?: string;
//   required?: boolean;
//   options?: string[];
// };

// type SchemaSection = {
//   id: string;
//   type: "static" | "form" | "table";
//   title?: string;
//   content?: string;
//   role?: string;
//   fields?: SchemaField[];
//   columns?: string[];
//   rows?: string[][];
// };

// const titleCase = (s: string) =>
//   s
//     .replace(/_/g, " ")
//     .replace(/\b\w/g, (c) => c.toUpperCase());

// const ACCENTS: Record<string, { bar: string; border: string; focus: string; text: string }> = {
//   blue: { bar: "bg-[#1e40af]", border: "border-[#1e40af]", focus: "focus:border-[#1e40af]", text: "text-[#1e40af]" },
//   slate: { bar: "bg-slate-700", border: "border-slate-700", focus: "focus:border-slate-500", text: "text-slate-700" },
//   dark: { bar: "bg-slate-900", border: "border-slate-900", focus: "focus:border-slate-700", text: "text-slate-900" },
//   red: { bar: "bg-[#be123c]", border: "border-[#be123c]", focus: "focus:border-[#be123c]", text: "text-[#be123c]" },
//   orange: { bar: "bg-[#ea580c]", border: "border-[#ea580c]", focus: "focus:border-[#ea580c]", text: "text-[#ea580c]" },
//   emerald: { bar: "bg-emerald-600", border: "border-emerald-500", focus: "focus:border-emerald-500", text: "text-emerald-600" },
//   purple: { bar: "bg-purple-600", border: "border-purple-200", focus: "focus:border-purple-400", text: "text-purple-700" },
// };

// const sectionAccent = (section: SchemaSection): keyof typeof ACCENTS => {
//   const id = section.id.toLowerCase();
//   if (id === "part_a") return "blue";
//   if (id.startsWith("part_d")) return "red";
//   if (id.startsWith("part_e")) return "orange";
//   if (id === "part_k" || section.role === "patient") return "emerald";
//   if (id === "part_l") return "purple";
//   if (id === "part_m") return "dark";
//   if (id === "part_i" || section.role === "doctor") return "blue";
//   return "slate";
// };

// const severityColor = (text: string) => {
//   const t = text.toUpperCase();
//   if (t.includes("VERY RARE") || t.includes("VERY COMMON")) return "text-red-700";
//   if (t.includes("RARE")) return "text-rose-600";
//   if (t.includes("UNCOMMON")) return "text-amber-600";
//   if (t.includes("COMMON")) return "text-emerald-600";
//   return "text-slate-700";
// };

// const DynamicConsentForm: React.FC<DynamicConsentFormProps> = ({
//   slug,
//   orderId,
//   patientName,
//   mrn,
//   onSuccess,
//   onCancel,
//   onPrint,
//   onTemplateLoaded,
//   readOnly = false,
//   viewData,
// }) => {
//   const { user } = useAuth();
//   const { notify } = useNotification();

//   const [template, setTemplate] = useState<ConsentTemplate | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [submitting, setSubmitting] = useState(false);
//   const [formData, setFormData] = useState<any>(viewData || { patient_name: patientName, mrn });
//   const [formErrors, setFormErrors] = useState<string[]>([]);

//   const getSigUrl = (path: string | undefined | null) => {
//     if (!path) return "";
//     if (path.startsWith("data:")) return path;
//     const normalizedBaseUrl = BASE_URL.replace(/\/$/, "");
//     return path.startsWith("/") ? `${normalizedBaseUrl}${path}` : `${normalizedBaseUrl}/${path}`;
//   };

//   useEffect(() => {
//     fetchTemplate();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [slug]);

//   const fetchTemplate = async () => {
//     setLoading(true);
//     try {
//       const data = await consentService.getTemplate(slug);
//       setTemplate(data);
//       if (onTemplateLoaded) onTemplateLoaded(data);
//       if (!viewData) {
//         setFormData((prev: any) => {
//           const merged: any = { patient_name: patientName, mrn, ...prev };
//           (data.form_schema.sections || []).forEach((section: SchemaSection) => {
//             (section.fields || []).forEach((field) => {
//               if (!field.id || field.id in merged) return;
//               if (field.type === "checkbox") merged[field.id] = false;
//               else if (field.type === "signature") merged[field.id] = null;
//               else merged[field.id] = "";
//             });
//           });
//           return merged;
//         });
//       }
//     } catch (error) {
//       console.error("Failed to fetch consent template", error);
//       notify("Failed to load consent template", "error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     if (!readOnly && mrn) {
//       const fetchPrefillData = async () => {
//         try {
//           // 1. Fetch Patient Demographics
//           const patient = await patientService.getPatientByMrn(mrn);

//           // 2. Fetch Active Admission to get Ward/Unit
//           let wardUnit = "";
//           try {
//             const admissionRes = await apiClient.get("/ipd/admission/list");
//             const admissions = admissionRes.data?.data?.results || [];
            
//             // Find active admission for this specific patient
//             const activeAdmission = admissions.find(
//               (a: any) => a.mrn === mrn && a.status === "ACTIVE"
//             );
            
//             if (activeAdmission) {
//               // Gracefully join whatever location data is available
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
//                 // Pre-fill standard schema IDs
//                 patient_full_name: prev.patient_full_name || fullName,
//                 date_of_birth: prev.date_of_birth || patient.demographics?.date_of_birth || "",
//                 sex_at_birth: prev.sex_at_birth || patient.demographics?.gender || "",
//                 ward_unit: prev.ward_unit || wardUnit,

//                 // Fallbacks for older templates (to ensure nothing breaks)
//                 dob: prev.dob || patient.demographics?.date_of_birth || "",
//                 age_sex: prev.age_sex || `${patient.demographics?.age || ""} / ${patient.demographics?.gender || ""}`,
//               };
//             });
//           }
//         } catch (error) {
//           console.error("Failed to prefill patient data", error);
//         }
//       };

//       fetchPrefillData();
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [mrn, readOnly]);
  
//   // useEffect(() => {
//   //   if (!readOnly && mrn) {
//   //     patientService.getPatientByMrn(mrn).then((patient) => {
//   //       if (patient) {
//   //         setFormData((prev: any) => ({
//   //           ...prev,
//   //           dob: prev.dob || patient.demographics?.date_of_birth || "",
//   //           age_sex: prev.age_sex || `${patient.demographics?.age || ""} / ${patient.demographics?.gender || ""}`,
//   //         }));
//   //       }
//   //     }).catch(() => {});
//   //   }
//   //   // eslint-disable-next-line react-hooks/exhaustive-deps
//   // }, [mrn]);

//   const handleInputChange = (id: string, value: any) => {
//     setFormData((prev: any) => ({ ...prev, [id]: value }));
//     setFormErrors((prev) => prev.filter((f) => f !== id));
//   };

//   const allFields = (): SchemaField[] => {
//     if (!template) return [];
//     const out: SchemaField[] = [];
//     template.form_schema.sections.forEach((s: SchemaSection) => (s.fields || []).forEach((f) => f.id && out.push(f)));
//     return out;
//   };

//   // The backend requires these exact top-level keys regardless of which schema fields were
//   // actually filled (e.g. a guardian signing for a minor uses parent_signature, not
//   // patient_signature). Alias them the same way the hand-built forms (Pleurodesis/IVC/CS) do.
//   const buildSubmissionFormData = () => {
//     const payload = { ...formData };
//     if (!payload.patient_signature) payload.patient_signature = payload.parent_signature || null;
//     if (!payload.nurse_signature) {
//       payload.nurse_signature = payload.witness_signature
//         || "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
//     }
//     return payload;
//   };

//   const handleSubmit = async () => {
//     if (!template) return;
//     const submissionData = buildSubmissionFormData();
//     const requiredFields = allFields().filter((f) => f.required);
//     const missingKeys = requiredFields.filter((f) => {
//       const val = submissionData[f.id!];
//       if (f.type === "checkbox") return !val;
//       return val === null || val === undefined || val === "";
//     });

//     const hasAnySignature = allFields().some((f) => f.type === "signature" && f.id && submissionData[f.id]);
//     if (!hasAnySignature) {
//       notify("At least one signature is required", "error");
//       return;
//     }

//     if (missingKeys.length > 0) {
//       setFormErrors(missingKeys.map((f) => f.id!));
//       notify(`Please fill in required fields: ${missingKeys.map((f) => f.label).join(", ")}`, "error");
//       setTimeout(() => {
//         const firstErrorEl = document.querySelector(".border-red-500");
//         if (firstErrorEl) firstErrorEl.scrollIntoView({ behavior: "smooth", block: "center" });
//       }, 100);
//       return;
//     }

//     setFormErrors([]);
//     setSubmitting(true);
//     try {
//       await consentService.createConsent({
//         order_id: orderId,
//         template_slug: slug,
//         workflow_stage: "SIGNED_AND_CHECKED",
//         witness_user_id: user?.id || 0,
//         form_data: submissionData,
//       });
//       notify("Consent form submitted successfully", "success");
//       onSuccess(submissionData, template);
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

//   if (!template) {
//     return (
//       <div className="bg-white rounded-3xl shadow-2xl p-16 flex flex-col items-center gap-4">
//         <AlertCircle className="text-red-500" size={40} />
//         <p className="text-slate-600 font-bold">Failed to load consent template.</p>
//         <button onClick={onCancel} className="px-6 py-2 bg-slate-100 rounded-xl font-bold text-slate-600">Close</button>
//       </div>
//     );
//   }

//   const sections = template.form_schema.sections as SchemaSection[];
//   const blackBoxStartIdx = sections.findIndex((s) => s.id === "part_i" || s.role === "doctor");

//   const getInputClass = (field: SchemaField, accent: keyof typeof ACCENTS, isTextarea = false) => {
//     const base = `w-full border-2 rounded-xl px-4 py-2 font-bold transition-all outline-none ${isTextarea ? "resize-none" : ""}`;
//     if (readOnly) return `${base} bg-slate-100 border-slate-200 text-slate-800`;
//     if (field.id && formErrors.includes(field.id)) return `${base} bg-red-50 border-red-500 text-red-900`;
//     return `${base} bg-white border-slate-200 text-slate-800 ${ACCENTS[accent].focus}`;
//   };

//   const renderField = (field: SchemaField, accent: keyof typeof ACCENTS) => {
//     if (!field.type) {
//       if (field.content) {
//         return <p key={field.label || field.content} className="text-xs text-slate-600 font-medium italic md:col-span-4">{field.content}</p>;
//       }
//       if (field.label) {
//         return <p key={field.id || field.label} className="text-[10px] font-black text-slate-500 uppercase tracking-widest md:col-span-4 mt-2">{field.label}</p>;
//       }
//       return null;
//     }

//     const id = field.id!;
//     const label = field.label || "";

//     if (field.type === "signature") {
//       return (
//         <div key={id} className="space-y-2 flex flex-col md:col-span-2">
//           <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
//           <div className="flex-grow min-h-[180px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
//             {readOnly ? (
//               <div className="h-full w-full flex items-center justify-center p-2">
//                 {formData[id] ? (
//                   <img src={getSigUrl(formData[id])} alt={label} className="max-h-full max-w-full object-contain" />
//                 ) : (
//                   <span className="text-slate-300 font-bold uppercase text-xs">No Signature</span>
//                 )}
//               </div>
//             ) : (
//               <SignaturePad
//                 onEnd={(data) => handleInputChange(id, data)}
//                 onClear={() => handleInputChange(id, null)}
//                 className="h-full w-full"
//               />
//             )}
//           </div>
//         </div>
//       );
//     }

//     if (field.type === "checkbox") {
//       return (
//         <label key={id} className="flex items-start gap-3 p-3 bg-white border-2 border-slate-200 rounded-xl cursor-pointer md:col-span-2">
//           <input
//             type="checkbox"
//             checked={!!formData[id]}
//             onChange={(e) => handleInputChange(id, e.target.checked)}
//             disabled={readOnly}
//             className={`mt-1 w-5 h-5 rounded ${ACCENTS[accent].text}`}
//           />
//           <span className="text-xs font-bold text-slate-700 leading-tight">{label}{field.required && " *"}</span>
//         </label>
//       );
//     }

//     if (field.type === "radio") {
//       return (
//         <div key={id} className="space-y-2 md:col-span-2">
//           <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
//           <div className="flex flex-col gap-2 p-3 bg-white border-2 border-slate-200 rounded-xl">
//             {(field.options || []).map((opt) => (
//               <label key={opt} className="flex items-center gap-2 cursor-pointer group">
//                 <input
//                   type="radio"
//                   name={id}
//                   checked={formData[id] === opt}
//                   onChange={() => handleInputChange(id, opt)}
//                   disabled={readOnly}
//                   className="w-4 h-4"
//                 />
//                 <span className="text-xs font-bold text-slate-600">{opt}</span>
//               </label>
//             ))}
//           </div>
//         </div>
//       );
//     }

//     if (field.type === "textarea") {
//       return (
//         <div key={id} className="space-y-2 md:col-span-4">
//           <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}{field.required && " *"}</label>
//           <textarea
//             rows={2}
//             value={formData[id] || ""}
//             onChange={(e) => handleInputChange(id, e.target.value)}
//             readOnly={readOnly}
//             className={getInputClass(field, accent, true)}
//           />
//         </div>
//       );
//     }

//     // text / date
//     return (
//       <div key={id} className="space-y-2 md:col-span-1">
//         <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}{field.required && " *"}</label>
//         <input
//           type={field.type === "date" ? "date" : "text"}
//           value={formData[id] || ""}
//           onChange={(e) => handleInputChange(id, e.target.value)}
//           readOnly={readOnly || (id === "mrn")}
//           className={getInputClass(field, accent)}
//         />
//       </div>
//     );
//   };

//   const renderSection = (section: SchemaSection) => {
//     const accent = sectionAccent(section);

//     if (section.id === "patient_rights") {
//       return (
//         <div key={section.id} className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 relative overflow-hidden">
//           <div className="absolute top-0 right-0 bg-amber-200/50 px-4 py-1 rounded-bl-xl text-[10px] font-black text-amber-800 uppercase tracking-wider">Patient Rights</div>
//           <p className="text-sm text-amber-900 font-medium leading-relaxed italic">"{section.content}"</p>
//         </div>
//       );
//     }

//     if (section.type === "static") {
//       return (
//         <div key={section.id}>
//           {section.title && (
//             <div className={`${ACCENTS[accent].bar} text-white px-4 py-1 inline-block rounded-t-xl text-[10px] font-black uppercase tracking-widest mb-0 ml-4`}>{section.title}</div>
//           )}
//           <div className="border-4 border-slate-900 rounded-3xl p-6 bg-slate-50">
//             <p className="text-sm text-slate-700 font-medium leading-relaxed whitespace-pre-line">{section.content}</p>
//           </div>
//         </div>
//       );
//     }

//     if (section.type === "table") {
//       return (
//         <div key={section.id}>
//           {section.title && (
//             <div className={`${ACCENTS[accent].bar} text-white px-4 py-1 inline-block rounded-t-xl text-[10px] font-black uppercase tracking-widest mb-0 ml-4`}>{section.title}</div>
//           )}
//           <div className="border-4 border-slate-900 rounded-3xl overflow-hidden shadow-xl">
//             <table className="w-full text-left border-collapse">
//               <thead className="bg-slate-900 text-white">
//                 <tr>
//                   {(section.columns || []).map((c) => (
//                     <th key={c} className="px-6 py-3 text-[10px] font-black uppercase tracking-widest border-r border-slate-700 last:border-r-0">{titleCase(c)}</th>
//                   ))}
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-200">
//                 {(section.rows || []).map((row, idx) => (
//                   <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
//                     {row.map((cell, ci) => (
//                       <td key={ci} className={`px-6 py-4 text-xs border-r border-slate-200 last:border-r-0 ${ci === 0 ? `font-black ${severityColor(cell)}` : "font-medium text-slate-600"}`}>{cell}</td>
//                     ))}
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       );
//     }

//     // "form" type
//     return (
//       <div key={section.id} className={section.id === "part_l" ? "bg-purple-50 border-4 border-purple-200 p-8 rounded-3xl" : "relative"}>
//         {section.id !== "part_l" && section.title && (
//           <div className={`${ACCENTS[accent].bar} text-white px-4 py-1 inline-block rounded-t-xl text-[10px] font-black uppercase tracking-widest mb-0 ml-4`}>{section.title}</div>
//         )}
//         {section.id === "part_l" && section.title && (
//           <div className="flex items-center gap-3 mb-4">
//             <h4 className="font-black text-purple-900 uppercase tracking-widest text-[10px]">{section.title}</h4>
//           </div>
//         )}
//         <div className={section.id === "part_l" ? "grid grid-cols-1 md:grid-cols-4 gap-6" : "border-4 border-slate-900 rounded-3xl p-8 grid grid-cols-1 md:grid-cols-4 gap-6 bg-slate-50"}>
//           {section.content && (
//             <p className="text-xs text-slate-600 font-bold md:col-span-4 leading-relaxed">{section.content}</p>
//           )}
//           {(section.fields || []).map((field) => renderField(field, accent))}
//         </div>
//       </div>
//     );
//   };

//   const preBlackBox = blackBoxStartIdx === -1 ? sections : sections.slice(0, blackBoxStartIdx);
//   const blackBoxSections = blackBoxStartIdx === -1 ? [] : sections.slice(blackBoxStartIdx);

//   return (
//     <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col max-w-6xl mx-auto">
//       {/* Header */}
//       <div className="bg-[#1e40af] text-white p-10 flex justify-between items-center relative overflow-hidden shrink-0">
//         <div className="absolute top-0 right-0 w-64 h-64 bg-[#1e40af]/30 rounded-full -mr-32 -mt-32 blur-3xl"></div>
//         <div className="z-10">
//           <div className="flex items-center gap-4 mb-2">
//             <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
//               <img src="/assets/login-bg.jpeg" alt="Medbookie" className="w-10 h-10 object-contain" />
//             </div>
//             <div>
//               <h1 className="text-3xl font-black tracking-tighter">Procedure Consent Form</h1>
//               <p className="text-[#93c5fd] font-bold text-sm">{template.display_name}</p>
//             </div>
//           </div>
//           <p className="text-xs text-[#93c5fd]/80 font-medium">Policy Ref: {template.form_schema.metadata.policy} • Version {template.version}</p>
//         </div>
//         <button
//           onClick={onPrint}
//           className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/20 transition-all z-10"
//         >
//           <Printer size={14} /> Print Blank Form
//         </button>
//       </div>

//       {/* Main Content */}
//       <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar bg-white">
//         {preBlackBox.map(renderSection)}

//         {blackBoxSections.length > 0 && (
//           <section className="space-y-8 bg-slate-900 p-10 rounded-[3rem] shadow-2xl">
//             <h3 className="text-center text-white font-black uppercase tracking-[0.3em] text-lg mb-6">Final Declarations & Signatures</h3>
//             {blackBoxSections.map((section) => {
//               const accent = sectionAccent(section);
//               if (section.id === "part_l") {
//                 return <div key={section.id}>{renderSection(section)}</div>;
//               }
//               return (
//                 <div key={section.id} className={`bg-white rounded-3xl p-6 shadow-xl border-t-8 ${ACCENTS[accent].border} relative`}>
//                   {section.title && (
//                     <h4 className="font-black text-slate-800 uppercase tracking-wider text-[10px] mb-4">{section.title}</h4>
//                   )}
//                   {section.content && (
//                     <p className="text-xs text-slate-600 font-bold mb-6 italic border-l-4 border-slate-200 pl-4">{section.content}</p>
//                   )}
//                   <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
//                     {(section.fields || []).map((field) => renderField(field, accent))}
//                   </div>
//                 </div>
//               );
//             })}
//           </section>
//         )}
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

// export default DynamicConsentForm;
