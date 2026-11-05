import React, { useState, useEffect, useRef } from "react";
import { FileText, CheckCircle, Loader2, Printer, AlertCircle, Save } from "lucide-react";
import { consentService, ConsentTemplate } from "../../services/consent.service";
import SignaturePad from "../SignaturePad";
import { useAuth } from "../../context/AuthContext";
import { useNotification } from "../../context/NotificationContext";
import { BASE_URL } from "../../api/client";
import { formDraftService } from "../../services/session-restore.service";

interface IvcFilterConsentFormProps {
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

const IvcFilterConsentForm: React.FC<IvcFilterConsentFormProps> = ({
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

  const getSigUrl = (path: string | undefined | null) => {
    if (!path) return "";
    if (path.startsWith("data:")) return path;
    const normalizedBaseUrl = BASE_URL.replace(/\/api(\/v\d+)?\/?$/, "").replace(/\/$/, "");
    return path.startsWith("/") ? `${normalizedBaseUrl}${path}` : `${normalizedBaseUrl}/${path}`;
  };

  const [template, setTemplate] = useState<ConsentTemplate | null>(null);
  const [loading, setLoading] = useState(!readOnly);
  const [submitting, setSubmitting] = useState(false);
  
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    patient_name: patientName,
    mrn: mrn,
    dob: "",
    sex: "",
    ward: "",
    consultant: "",
    diagnosis: "",
    access_site: [],
    contrast_ack: false,
    contrast_allergy: "",
    renal_check: false,
    pregnancy_status: "",
    radiation_ack: false,
    retrieval_ack: false,
    retrieval_not_guaranteed: false,
    permanent_if_needed: false,
    anaesthesia_type: "",
    drug_allergies: "",
    anticoagulation: "",
    questions: "",
    answers: "",
    clinician_confirm: false,
    patient_confirm: false,
    clinician_signature: null,
    patient_signature: null,
    nurse_signature: null,
  });

  useEffect(() => {
    if (viewData || initialData) {
      setFormData((prev: any) => ({ ...prev, ...(viewData || initialData) }));
    }
  }, [viewData, initialData]);

  // 1. Initial Data Fetch & Local Draft Restoration
  useEffect(() => {
    if (!readOnly && mrn && !viewData && !initialData) {
      const localDraftId = `consent_ivc_${orderId}`;
      const savedDraft = user?.id ? formDraftService.loadDraft<any>(user.id, localDraftId) : null;
      
      if (savedDraft) {
        setFormData(savedDraft);
        notify("Restored unsaved changes from your previous session", "success");
      }
    }
    
    if (!readOnly && !viewData && !initialData) fetchTemplate();
    else setLoading(false);
  }, [mrn, readOnly, viewData, initialData, orderId, user?.id]);

  const fetchTemplate = async () => {
    try {
      const data = await consentService.getTemplate("ivc-filter-gsh-t6");
      setTemplate(data);
    } catch (error) {
      notify("Failed to load consent template", "error");
    } finally {
      setLoading(false);
    }
  };

  // 2. Local Auto-Save Loop
  useEffect(() => {
    if (readOnly || !orderId || !user?.id) return;
    
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    
    autoSaveTimerRef.current = setTimeout(() => {
      const localDraftId = `consent_ivc_${orderId}`;
      formDraftService.saveDraft(user.id!, localDraftId, formData);
    }, 1500);
    
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
  }, [formData, orderId, user?.id, readOnly]);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleCheckboxChange = (field: string, value: string) => {
    setFormData((prev: any) => {
      const current = prev[field] || [];
      if (current.includes(value)) {
        return { ...prev, [field]: current.filter((v: string) => v !== value) };
      } else {
        return { ...prev, [field]: [...current, value] };
      }
    });
  };

  // 3. Save as Backend Draft Handler
  const handleSaveDraft = async () => {
    setSubmitting(true);
    try {
      await consentService.createConsent({
        order_id: orderId,
        template_slug: "ivc-filter-gsh-t6",
        witness_user_id: user?.id || 0,
        form_data: formData,
        is_draft: true,
        consent_id: draftId,
      });
      notify("Draft saved successfully to the system", "success");
      
      if (user?.id) formDraftService.clearDraft(user.id, `consent_ivc_${orderId}`);
      
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
      const payload = {
        order_id: orderId,
        template_slug: "ivc-filter-gsh-t6",
        workflow_stage: "SIGNED_AND_CHECKED",
        witness_user_id: user?.id || 0,
        form_data: formData,
        consent_id: draftId,
      };
      
      await consentService.createConsent(payload);
      notify("Consent form submitted successfully", "success");
      
      if (user?.id) formDraftService.clearDraft(user.id, `consent_ivc_${orderId}`);
      
      onSuccess(formData);
    } catch (error: any) {
      notify(error.response?.data?.message || error.message || "Failed to submit consent", "error");
    } finally {
      setSubmitting(false);
    }
  };

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
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl shadow-xl">
        <Loader2 className="animate-spin text-brand-primary mb-4" size={48} />
        <p className="text-slate-500 font-bold uppercase tracking-widest animate-pulse">Loading Procedure Template...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col max-w-6xl mx-auto">
      {/* Header - High Fidelity Replica */}
      <div className="bg-[#1e1b4b] text-white p-10 flex justify-between items-center relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-active0/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="z-10">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
              <img src="/assets/login-bg.jpeg" alt="Gracespring Hospitals" className="w-10 h-10 object-contain" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter">Procedure Consent Form</h1>
              <p className="text-brand-primary font-bold text-sm">C-Arm Guided Inferior Vena Cava (IVC) Filter Insertion</p>
            </div>
          </div>
          <p className="text-xs text-brand-active/60 font-medium">Form Ref: GSH-CONSENT-IVC-001 • Policy Ref: GSH-T6 • Version 1.0</p>
        </div>
        <div className="text-right z-10 flex flex-col items-end gap-3">
          <div className="hidden md:block text-right">
            <p className="text-[10px] text-brand-active font-bold leading-tight uppercase tracking-wider">Gracespring Hospitals</p>
            <p className="text-[10px] text-brand-active">+234 705 648 2776 • admin@gracespringhospitals.com</p>
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
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-amber-200/50 px-4 py-1 rounded-bl-xl text-[10px] font-black text-amber-800 uppercase tracking-wider">Patient Rights</div>
          <p className="text-sm text-amber-900 font-medium leading-relaxed italic">
            "You have the right to make decisions about your medical care and to refuse any procedure. If you wish to withdraw consent at any time before the procedure begins, you may do so. Signing this form does not remove your legal rights. This form complies with the National Health Act 2014 (Nigeria) and Gracespring Hospitals Consent Policy (GSH-T6)."
          </p>
        </div>

        {/* Part A - Patient Identification */}
        <section>
          <div className="bg-brand-primary text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part A — Patient Identification</div>
          <div className="border-4 border-slate-900 rounded-3xl p-8 grid grid-cols-1 md:grid-cols-3 gap-8 shadow-inner bg-slate-50 relative">
            <PartWarning fields={["patient_name", "dob", "sex", "mrn", "ward", "consultant", "diagnosis", "access_site"]} />
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient Full Name *</label>
              <input 
                type="text" 
                value={formData.patient_name} 
                onChange={(e) => handleInputChange("patient_name", e.target.value)}
                readOnly={readOnly}
                className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active0 focus:ring-4 focus:ring-brand-active0/10"}`}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Date of Birth *</label>
              <input 
                type="date" 
                value={formData.dob} 
                onChange={(e) => handleInputChange("dob", e.target.value)}
                readOnly={readOnly}
                className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active0"}`}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Sex at Birth</label>
              <div className="flex gap-4 p-2 bg-white border-2 border-slate-200 rounded-xl">
                {["Male", "Female", "Other"].map(s => (
                  <label key={s} className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="radio" 
                      name="sex" 
                      checked={formData.sex === s} 
                      onChange={() => handleInputChange("sex", s)}
                      disabled={readOnly}
                      className="w-4 h-4 text-brand-primary focus:ring-brand-active0"
                    />
                    <span className="text-xs font-bold text-slate-600 group-hover:text-brand-primary transition-colors">{s}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">MRN (Medical Record Number) *</label>
              <input 
                type="text" 
                value={formData.mrn} 
                className="w-full bg-slate-100 border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-500"
                readOnly
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Ward / Unit</label>
              <input 
                type="text" 
                value={formData.ward} 
                onChange={(e) => handleInputChange("ward", e.target.value)}
                readOnly={readOnly}
                className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active0"}`}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Consultant Vascular Surgeon / Interventionist *</label>
              <input 
                type="text" 
                value={formData.consultant} 
                onChange={(e) => handleInputChange("consultant", e.target.value)}
                readOnly={readOnly}
                className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active0"}`}
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Primary Diagnosis / Indication for IVC Filter *</label>
              <textarea 
                rows={2}
                value={formData.diagnosis}
                onChange={(e) => handleInputChange("diagnosis", e.target.value)}
                placeholder="e.g. DVT with contraindication to anticoagulation; recurrent PE on anticoagulation..."
                readOnly={readOnly}
                className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active0"}`}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Procedure Side / Venous Access Site</label>
              <div className="grid grid-cols-2 gap-2 p-2 bg-white border-2 border-slate-200 rounded-xl">
                {["Right femoral", "Left femoral", "Right jugular", "Left jugular", "Antecubital"].map(site => (
                  <label key={site} className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={(formData.access_site || []).includes(site)} 
                      onChange={() => handleCheckboxChange("access_site", site)}
                      disabled={readOnly}
                      className="w-4 h-4 text-brand-primary rounded focus:ring-brand-active0"
                    />
                    <span className="text-[10px] font-bold text-slate-600 group-hover:text-brand-primary transition-colors">{site}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Part B - Description */}
        <section>
          <div className="bg-brand-primary text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part B — Description of the Procedure</div>
          <div className="border-4 border-slate-900 rounded-3xl p-8 bg-slate-50 space-y-4">
            <h4 className="font-black text-slate-900 uppercase tracking-widest text-sm">What is an IVC Filter?</h4>
            <p className="text-sm text-slate-700 leading-relaxed font-medium">
              An Inferior Vena Cava (IVC) filter is a small, cage-like medical device made of metal (usually nitinol or stainless steel) that is inserted into the inferior vena cava — the large vein that carries blood from the lower body back to the heart. Its purpose is to catch blood clots (thrombus) that break away from the deep veins of the legs or pelvis before they can travel to the lungs and cause a potentially fatal pulmonary embolism (PE).
            </p>
            <h4 className="font-black text-slate-900 uppercase tracking-widest text-sm">How is it performed at Gracespring Hospitals?</h4>
            <p className="text-sm text-slate-700 leading-relaxed font-medium">
              The procedure is performed using C-arm fluoroscopic (real-time X-ray) guidance in the Interventional Radiology / Vascular Suite under local anaesthesia with or without conscious sedation. You will be awake or lightly sedated and will not require a general anaesthetic for this procedure. The procedure typically takes 30–60 minutes.
            </p>
          </div>
        </section>

        {/* Part C - Contrast & Radiation */}
        <section>
          <div className="bg-brand-primary text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part C — Contrast Agent & Radiation Disclosure</div>
          <div className="border-4 border-slate-900 rounded-3xl p-8 bg-slate-50 space-y-6 relative">
            <PartWarning fields={["contrast_ack", "radiation_ack", "contrast_allergy", "pregnancy_status"]} />
            <div className="bg-amber-100 border-2 border-amber-200 p-3 rounded-xl flex items-center gap-3">
              <AlertCircle className="text-amber-600" size={20} />
              <p className="text-xs font-black text-amber-800">C-arm guided procedures use ionising radiation (X-rays) and require the injection of iodinated contrast dye. You must read and acknowledge the following disclosures.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 bg-white border-2 border-slate-200 rounded-2xl">
                  <input 
                    type="checkbox" 
                    id="contrast_ack"
                    checked={formData.contrast_ack}
                    onChange={(e) => handleInputChange("contrast_ack", e.target.checked)}
                    disabled={readOnly}
                    className="mt-1 w-6 h-6 text-brand-primary rounded-lg focus:ring-brand-active0"
                  />
                  <label htmlFor="contrast_ack" className="text-xs font-bold text-slate-700 leading-tight cursor-pointer">
                    I have been informed about the use of contrast dye and its risks (flush sensation, nausea, allergic reactions).
                  </label>
                </div>
                <div className="flex items-start gap-4 p-4 bg-white border-2 border-slate-200 rounded-2xl">
                  <input 
                    type="checkbox" 
                    id="radiation_ack"
                    checked={formData.radiation_ack}
                    onChange={(e) => handleInputChange("radiation_ack", e.target.checked)}
                    disabled={readOnly}
                    className="mt-1 w-6 h-6 text-brand-primary rounded-lg focus:ring-brand-active0"
                  />
                  <label htmlFor="radiation_ack" className="text-xs font-bold text-slate-700 leading-tight cursor-pointer">
                    I have been informed about the use of ionising radiation during this procedure.
                  </label>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Known Contrast Allergy?</label>
                  <div className="flex gap-4 p-3 bg-white border-2 border-slate-200 rounded-xl">
                    {["Known", "None"].map(o => (
                      <label key={o} className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="radio" 
                          name="contrast_allergy" 
                          checked={formData.contrast_allergy === o} 
                          onChange={() => handleInputChange("contrast_allergy", o)}
                          disabled={readOnly}
                          className="w-4 h-4 text-brand-primary focus:ring-brand-active0"
                        />
                        <span className="text-xs font-bold text-slate-600">{o}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Pregnancy Status / Confirmation</label>
                  <input 
                    type="text" 
                    value={formData.pregnancy_status} 
                    onChange={(e) => handleInputChange("pregnancy_status", e.target.value)}
                    placeholder="e.g. N/A or Date of last menstrual period"
                    readOnly={readOnly}
                    className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active0"}`}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Part E - Risks Table (High Fidelity) */}
        <section>
          <div className="bg-brand-primary text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part E — Risks & Complications</div>
          <div className="border-4 border-slate-900 rounded-3xl overflow-hidden shadow-xl">
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
                  ["COMMON (>1 in 10)", "Access site pain, bruising and haematoma", "Expected at the venepuncture site; usually resolves within 1–2 weeks"],
                  ["COMMON", "Temporary vasovagal reaction", "Related to venepuncture or contrast; managed with IV fluids"],
                  ["UNCOMMON", "IVC thrombosis (the filter itself causing clot)", "Reported incidence 2–10%; managed with anticoagulation"],
                  ["RARE", "Moderate to severe allergic reaction to contrast", "Approximately 0.04% incidence; treated with adrenaline/resuscitation"],
                  ["VERY RARE", "Death directly related to the procedure", "Estimated procedural mortality <0.1%"]
                ].map((row, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="px-6 py-4 text-xs font-black text-brand-primary border-r border-slate-200">{row[0]}</td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-700 border-r border-slate-200">{row[1]}</td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-500 italic">{row[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Part J, K, N - Multiple Signatures Workflow */}
        <section className="space-y-12 bg-slate-900 p-10 rounded-[3rem] shadow-2xl">
          <h3 className="text-center text-white font-black uppercase tracking-[0.5em] text-xl mb-12">Final Declarations & Signatures</h3>
          
          <div className="grid grid-cols-1 gap-8">
            {/* Clinician Signature */}
            <div className="bg-white rounded-3xl p-6 shadow-xl border-t-8 border-brand-active0 relative flex flex-col h-full">
              <PartWarning fields={["clinician_signature", "clinician_confirm"]} />
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-brand-active rounded-lg flex items-center justify-center text-brand-primary font-black">J</div>
                <h4 className="font-black text-slate-800 uppercase tracking-wider text-[10px]">Declaration of Clinician</h4>
              </div>
              <div className="space-y-4 mb-6">
                <label className="flex items-start gap-3 p-3 bg-brand-active rounded-xl cursor-pointer">
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
                <p className="text-[10px] text-slate-400 font-bold italic text-center">Clinician Signature</p>
              </div>
            </div>

            {/* Patient Signature */}
            <div className="bg-white rounded-3xl p-6 shadow-xl border-t-8 border-emerald-500 relative flex flex-col h-full">
              <PartWarning fields={["patient_signature", "patient_confirm"]} />
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
                  <span className="text-[10px] font-bold text-emerald-900">I give my informed consent to proceed with IVC Filter Insertion.</span>
                </label>
              </div>
              <div className="space-y-2 flex-grow flex flex-col">
                <div className="flex-grow min-h-[250px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
                  {renderSignatureBox("patient_signature", "Patient Signature")}
                </div>
                <p className="text-[10px] text-slate-400 font-bold italic text-center">Patient Signature</p>
              </div>
            </div>

            {/* Nurse Signature */}
            <div className="bg-white rounded-3xl p-6 shadow-xl border-t-8 border-purple-500 relative flex flex-col h-full">
              <PartWarning fields={["nurse_signature"]} />
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
                <p className="text-[10px] text-slate-400 font-bold italic text-center">Witnessing Nurse Signature</p>
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
              onClick={onPrint}
              className="bg-brand-active0 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-2xl transition-all flex items-center gap-3"
            >
              <Printer size={20} /> View Full PDF
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default IvcFilterConsentForm;





// import React, { useState, useEffect, useRef } from "react";
// import { FileText, CheckCircle, Loader2, Printer, AlertCircle, Save } from "lucide-react";
// import { consentService, ConsentTemplate } from "../../services/consent.service";
// import SignaturePad from "../SignaturePad";
// import { useAuth } from "../../context/AuthContext";
// import { useNotification } from "../../context/NotificationContext";
// import { BASE_URL } from "../../api/client";
// import { formDraftService } from "../../services/session-restore.service"; // <-- ADDED IMPORT

// interface IvcFilterConsentFormProps {
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

// const IvcFilterConsentForm: React.FC<IvcFilterConsentFormProps> = ({
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
//     const normalizedBaseUrl = BASE_URL.replace(/\/\$/, "");
//     return path.startsWith("/") ? `${normalizedBaseUrl}${path}` : `${normalizedBaseUrl}/${path}`;
//   };

//   const [template, setTemplate] = useState<ConsentTemplate | null>(null);
//   const [loading, setLoading] = useState(!readOnly);
//   const [submitting, setSubmitting] = useState(false);
  
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
//     patient_name: patientName,
//     mrn: mrn,
//     dob: "",
//     sex: "",
//     ward: "",
//     consultant: "",
//     diagnosis: "",
//     access_site: [],
//     contrast_ack: false,
//     contrast_allergy: "",
//     renal_check: false,
//     pregnancy_status: "",
//     radiation_ack: false,
//     retrieval_ack: false,
//     retrieval_not_guaranteed: false,
//     permanent_if_needed: false,
//     anaesthesia_type: "",
//     drug_allergies: "",
//     anticoagulation: "",
//     questions: "",
//     answers: "",
//     clinician_confirm: false,
//     patient_confirm: false,
//     clinician_signature: null,
//     patient_signature: null,
//     nurse_signature: null,
//   });

//   // 1. Initial Data Fetch & Local Draft Restoration
//   useEffect(() => {
//     if (!readOnly && mrn && !viewData && !initialData) {
//       const localDraftId = `consent_ivc_${orderId}`;
//       const savedDraft = user?.id ? formDraftService.loadDraft<any>(user.id, localDraftId) : null;
      
//       if (savedDraft) {
//         setFormData(savedDraft);
//         notify("Restored unsaved changes from your previous session", "success");
//       }
//     }
    
//     if (!readOnly) fetchTemplate();
//   }, [mrn, readOnly, viewData, initialData, orderId, user?.id]);

//   const fetchTemplate = async () => {
//     try {
//       const data = await consentService.getTemplate("ivc-filter-gsh-t6");
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
//       const localDraftId = `consent_ivc_${orderId}`;
//       formDraftService.saveDraft(user.id!, localDraftId, formData);
//     }, 1500);
    
//     return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
//   }, [formData, orderId, user?.id, readOnly]);

//   const handleInputChange = (field: string, value: any) => {
//     setFormData((prev: any) => ({ ...prev, [field]: value }));
//   };

//   const handleCheckboxChange = (field: string, value: string) => {
//     setFormData((prev: any) => {
//       const current = prev[field] || [];
//       if (current.includes(value)) {
//         return { ...prev, [field]: current.filter((v: string) => v !== value) };
//       } else {
//         return { ...prev, [field]: [...current, value] };
//       }
//     });
//   };

//   // 3. Save as Backend Draft Handler
//   const handleSaveDraft = async () => {
//     setSubmitting(true);
//     try {
//       await consentService.createConsent({
//         order_id: orderId,
//         template_slug: "ivc-filter-gsh-t6",
//         witness_user_id: user?.id || 0,
//         form_data: formData,
//         is_draft: true,
//         consent_id: draftId,
//       });
//       notify("Draft saved successfully to the system", "success");
      
//       // Clear local storage draft since it is now securely saved on backend
//       if (user?.id) formDraftService.clearDraft(user.id, `consent_ivc_${orderId}`);
      
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
//       const payload = {
//         order_id: orderId,
//         template_slug: "ivc-filter-gsh-t6",
//         workflow_stage: "SIGNED_AND_CHECKED",
//         witness_user_id: user?.id || 0,
//         form_data: formData,
//         consent_id: draftId, // Passes draft ID so backend overwrites the draft into a final record
//       };
      
//       await consentService.createConsent(payload);
//       notify("Consent form submitted successfully", "success");
      
//       // Clear local storage draft since it is now completed
//       if (user?.id) formDraftService.clearDraft(user.id, `consent_ivc_${orderId}`);
      
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
//         <Loader2 className="animate-spin text-brand-primary mb-4" size={48} />
//         <p className="text-slate-500 font-bold uppercase tracking-widest animate-pulse">Loading Procedure Template...</p>
//       </div>
//     );
//   }

//   return (
//     <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col max-w-6xl mx-auto">
//       {/* Header - High Fidelity Replica */}
//       <div className="bg-[#1e1b4b] text-white p-10 flex justify-between items-center relative overflow-hidden shrink-0">
//         <div className="absolute top-0 right-0 w-64 h-64 bg-brand-active0/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
//         <div className="z-10">
//           <div className="flex items-center gap-4 mb-2">
//             <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
//               <img src="/assets/login-bg.jpeg" alt="Gracespring Hospitals" className="w-10 h-10 object-contain" />
//             </div>
//             <div>
//               <h1 className="text-3xl font-black tracking-tighter">Procedure Consent Form</h1>
//               <p className="text-brand-primary font-bold text-sm">C-Arm Guided Inferior Vena Cava (IVC) Filter Insertion</p>
//             </div>
//           </div>
//           <p className="text-xs text-brand-active/60 font-medium">Form Ref: GSH-CONSENT-IVC-001 • Policy Ref: GSH-T6 • Version 1.0</p>
//         </div>
//         <div className="text-right z-10 flex flex-col items-end gap-3">
//           <div className="hidden md:block text-right">
//             <p className="text-[10px] text-brand-active font-bold leading-tight uppercase tracking-wider">Gracespring Hospitals</p>
//             <p className="text-[10px] text-brand-active">+234 705 648 2776 • admin@gracespringhospitals.com</p>
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
//             "You have the right to make decisions about your medical care and to refuse any procedure. If you wish to withdraw consent at any time before the procedure begins, you may do so. Signing this form does not remove your legal rights. This form complies with the National Health Act 2014 (Nigeria) and Gracespring Hospitals Consent Policy (GSH-T6)."
//           </p>
//         </div>

//         {/* Part A - Patient Identification */}
//         <section>
//           <div className="bg-brand-primary text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part A — Patient Identification</div>
//           <div className="border-4 border-slate-900 rounded-3xl p-8 grid grid-cols-1 md:grid-cols-3 gap-8 shadow-inner bg-slate-50 relative">
//             <PartWarning fields={["patient_name", "dob", "sex", "mrn", "ward", "consultant", "diagnosis", "access_site"]} />
//             <div className="space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient Full Name *</label>
//               <input 
//                 type="text" 
//                 value={formData.patient_name} 
//                 onChange={(e) => handleInputChange("patient_name", e.target.value)}
//                 readOnly={readOnly}
//                 className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active0 focus:ring-4 focus:ring-brand-active0/10"}`}
//               />
//             </div>
//             <div className="space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Date of Birth *</label>
//               <input 
//                 type="date" 
//                 value={formData.dob} 
//                 onChange={(e) => handleInputChange("dob", e.target.value)}
//                 readOnly={readOnly}
//                 className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active0"}`}
//               />
//             </div>
//             <div className="space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Sex at Birth</label>
//               <div className="flex gap-4 p-2 bg-white border-2 border-slate-200 rounded-xl">
//                 {["Male", "Female", "Other"].map(s => (
//                   <label key={s} className="flex items-center gap-2 cursor-pointer group">
//                     <input 
//                       type="radio" 
//                       name="sex" 
//                       checked={formData.sex === s} 
//                       onChange={() => handleInputChange("sex", s)}
//                       disabled={readOnly}
//                       className="w-4 h-4 text-brand-primary focus:ring-brand-active0"
//                     />
//                     <span className="text-xs font-bold text-slate-600 group-hover:text-brand-primary transition-colors">{s}</span>
//                   </label>
//                 ))}
//               </div>
//             </div>
//             <div className="space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">MRN (Medical Record Number) *</label>
//               <input 
//                 type="text" 
//                 value={formData.mrn} 
//                 className="w-full bg-slate-100 border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-500"
//                 readOnly
//               />
//             </div>
//             <div className="space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Ward / Unit</label>
//               <input 
//                 type="text" 
//                 value={formData.ward} 
//                 onChange={(e) => handleInputChange("ward", e.target.value)}
//                 readOnly={readOnly}
//                 className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active0"}`}
//               />
//             </div>
//             <div className="space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Consultant Vascular Surgeon / Interventionist *</label>
//               <input 
//                 type="text" 
//                 value={formData.consultant} 
//                 onChange={(e) => handleInputChange("consultant", e.target.value)}
//                 readOnly={readOnly}
//                 className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active0"}`}
//               />
//             </div>
//             <div className="md:col-span-2 space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Primary Diagnosis / Indication for IVC Filter *</label>
//               <textarea 
//                 rows={2}
//                 value={formData.diagnosis}
//                 onChange={(e) => handleInputChange("diagnosis", e.target.value)}
//                 placeholder="e.g. DVT with contraindication to anticoagulation; recurrent PE on anticoagulation..."
//                 readOnly={readOnly}
//                 className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active0"}`}
//               />
//             </div>
//             <div className="space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Procedure Side / Venous Access Site</label>
//               <div className="grid grid-cols-2 gap-2 p-2 bg-white border-2 border-slate-200 rounded-xl">
//                 {["Right femoral", "Left femoral", "Right jugular", "Left jugular", "Antecubital"].map(site => (
//                   <label key={site} className="flex items-center gap-2 cursor-pointer group">
//                     <input 
//                       type="checkbox" 
//                       checked={(formData.access_site || []).includes(site)} 
//                       onChange={() => handleCheckboxChange("access_site", site)}
//                       disabled={readOnly}
//                       className="w-4 h-4 text-brand-primary rounded focus:ring-brand-active0"
//                     />
//                     <span className="text-[10px] font-bold text-slate-600 group-hover:text-brand-primary transition-colors">{site}</span>
//                   </label>
//                 ))}
//               </div>
//             </div>
//           </div>
//         </section>

//         {/* Part B - Description */}
//         <section>
//           <div className="bg-brand-primary text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part B — Description of the Procedure</div>
//           <div className="border-4 border-slate-900 rounded-3xl p-8 bg-slate-50 space-y-4">
//             <h4 className="font-black text-slate-900 uppercase tracking-widest text-sm">What is an IVC Filter?</h4>
//             <p className="text-sm text-slate-700 leading-relaxed font-medium">
//               An Inferior Vena Cava (IVC) filter is a small, cage-like medical device made of metal (usually nitinol or stainless steel) that is inserted into the inferior vena cava — the large vein that carries blood from the lower body back to the heart. Its purpose is to catch blood clots (thrombus) that break away from the deep veins of the legs or pelvis before they can travel to the lungs and cause a potentially fatal pulmonary embolism (PE).
//             </p>
//             <h4 className="font-black text-slate-900 uppercase tracking-widest text-sm">How is it performed at Gracespring Hospitals?</h4>
//             <p className="text-sm text-slate-700 leading-relaxed font-medium">
//               The procedure is performed using C-arm fluoroscopic (real-time X-ray) guidance in the Interventional Radiology / Vascular Suite under local anaesthesia with or without conscious sedation. You will be awake or lightly sedated and will not require a general anaesthetic for this procedure. The procedure typically takes 30–60 minutes.
//             </p>
//           </div>
//         </section>

//         {/* Part C - Contrast & Radiation */}
//         <section>
//           <div className="bg-brand-primary text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part C — Contrast Agent & Radiation Disclosure</div>
//           <div className="border-4 border-slate-900 rounded-3xl p-8 bg-slate-50 space-y-6 relative">
//             <PartWarning fields={["contrast_ack", "radiation_ack", "contrast_allergy", "pregnancy_status"]} />
//             <div className="bg-amber-100 border-2 border-amber-200 p-3 rounded-xl flex items-center gap-3">
//               <AlertCircle className="text-amber-600" size={20} />
//               <p className="text-xs font-black text-amber-800">C-arm guided procedures use ionising radiation (X-rays) and require the injection of iodinated contrast dye. You must read and acknowledge the following disclosures.</p>
//             </div>
            
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
//               <div className="space-y-4">
//                 <div className="flex items-start gap-4 p-4 bg-white border-2 border-slate-200 rounded-2xl">
//                   <input 
//                     type="checkbox" 
//                     id="contrast_ack"
//                     checked={formData.contrast_ack}
//                     onChange={(e) => handleInputChange("contrast_ack", e.target.checked)}
//                     disabled={readOnly}
//                     className="mt-1 w-6 h-6 text-brand-primary rounded-lg focus:ring-brand-active0"
//                   />
//                   <label htmlFor="contrast_ack" className="text-xs font-bold text-slate-700 leading-tight cursor-pointer">
//                     I have been informed about the use of contrast dye and its risks (flush sensation, nausea, allergic reactions).
//                   </label>
//                 </div>
//                 <div className="flex items-start gap-4 p-4 bg-white border-2 border-slate-200 rounded-2xl">
//                   <input 
//                     type="checkbox" 
//                     id="radiation_ack"
//                     checked={formData.radiation_ack}
//                     onChange={(e) => handleInputChange("radiation_ack", e.target.checked)}
//                     disabled={readOnly}
//                     className="mt-1 w-6 h-6 text-brand-primary rounded-lg focus:ring-brand-active0"
//                   />
//                   <label htmlFor="radiation_ack" className="text-xs font-bold text-slate-700 leading-tight cursor-pointer">
//                     I have been informed about the use of ionising radiation during this procedure.
//                   </label>
//                 </div>
//               </div>
              
//               <div className="space-y-4">
//                 <div className="space-y-2">
//                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Known Contrast Allergy?</label>
//                   <div className="flex gap-4 p-3 bg-white border-2 border-slate-200 rounded-xl">
//                     {["Known", "None"].map(o => (
//                       <label key={o} className="flex items-center gap-2 cursor-pointer">
//                         <input 
//                           type="radio" 
//                           name="contrast_allergy" 
//                           checked={formData.contrast_allergy === o} 
//                           onChange={() => handleInputChange("contrast_allergy", o)}
//                           disabled={readOnly}
//                           className="w-4 h-4 text-brand-primary focus:ring-brand-active0"
//                         />
//                         <span className="text-xs font-bold text-slate-600">{o}</span>
//                       </label>
//                     ))}
//                   </div>
//                 </div>
//                 <div className="space-y-2">
//                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Pregnancy Status / Confirmation</label>
//                   <input 
//                     type="text" 
//                     value={formData.pregnancy_status} 
//                     onChange={(e) => handleInputChange("pregnancy_status", e.target.value)}
//                     placeholder="e.g. N/A or Date of last menstrual period"
//                     readOnly={readOnly}
//                     className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active0"}`}
//                   />
//                 </div>
//               </div>
//             </div>
//           </div>
//         </section>

//         {/* Part E - Risks Table (High Fidelity) */}
//         <section>
//           <div className="bg-brand-primary text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part E — Risks & Complications</div>
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
//                   ["COMMON (>1 in 10)", "Access site pain, bruising and haematoma", "Expected at the venepuncture site; usually resolves within 1–2 weeks"],
//                   ["COMMON", "Temporary vasovagal reaction", "Related to venepuncture or contrast; managed with IV fluids"],
//                   ["UNCOMMON", "IVC thrombosis (the filter itself causing clot)", "Reported incidence 2–10%; managed with anticoagulation"],
//                   ["RARE", "Moderate to severe allergic reaction to contrast", "Approximately 0.04% incidence; treated with adrenaline/resuscitation"],
//                   ["VERY RARE", "Death directly related to the procedure", "Estimated procedural mortality <0.1%"]
//                 ].map((row, idx) => (
//                   <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
//                     <td className="px-6 py-4 text-xs font-black text-brand-primary border-r border-slate-200">{row[0]}</td>
//                     <td className="px-6 py-4 text-xs font-bold text-slate-700 border-r border-slate-200">{row[1]}</td>
//                     <td className="px-6 py-4 text-xs font-medium text-slate-500 italic">{row[2]}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </section>

//         {/* Part J, K, N - Multiple Signatures Workflow */}
//         <section className="space-y-12 bg-slate-900 p-10 rounded-[3rem] shadow-2xl">
//           <h3 className="text-center text-white font-black uppercase tracking-[0.5em] text-xl mb-12">Final Declarations & Signatures</h3>
          
//           <div className="grid grid-cols-1 gap-8">
//             {/* Clinician Signature */}
//             <div className="bg-white rounded-3xl p-6 shadow-xl border-t-8 border-brand-active0 relative flex flex-col h-full">
//               <PartWarning fields={["clinician_signature", "clinician_confirm"]} />
//               <div className="flex items-center gap-3 mb-6">
//                 <div className="w-8 h-8 bg-brand-active rounded-lg flex items-center justify-center text-brand-primary font-black">J</div>
//                 <h4 className="font-black text-slate-800 uppercase tracking-wider text-[10px]">Declaration of Clinician</h4>
//               </div>
//               <div className="space-y-4 mb-6">
//                 <label className="flex items-start gap-3 p-3 bg-brand-active rounded-xl cursor-pointer">
//                   <input 
//                     type="checkbox" 
//                     checked={formData.clinician_confirm} 
//                     onChange={(e) => handleInputChange("clinician_confirm", e.target.checked)}
//                     disabled={readOnly}
//                     className="mt-1 w-5 h-5 text-brand-primary rounded"
//                   />
//                   <span className="text-[10px] font-bold text-brand-primary">I confirm that I have explained the nature, purpose, benefits and risks.</span>
//                 </label>
//               </div>
//               <div className="space-y-2 flex-grow flex flex-col">
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
//                 <p className="text-[10px] text-slate-400 font-bold italic text-center">Clinician Signature</p>
//               </div>
//             </div>

//             {/* Patient Signature */}
//             <div className="bg-white rounded-3xl p-6 shadow-xl border-t-8 border-emerald-500 relative flex flex-col h-full">
//               <PartWarning fields={["patient_signature", "patient_confirm"]} />
//               <div className="flex items-center gap-3 mb-6">
//                 <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 font-black">K</div>
//                 <h4 className="font-black text-slate-800 uppercase tracking-wider text-[10px]">Patient Consent</h4>
//               </div>
//               <div className="space-y-4 mb-6">
//                 <label className="flex items-start gap-3 p-3 bg-emerald-50 rounded-xl cursor-pointer">
//                   <input 
//                     type="checkbox" 
//                     checked={formData.patient_confirm} 
//                     onChange={(e) => handleInputChange("patient_confirm", e.target.checked)}
//                     disabled={readOnly}
//                     className="mt-1 w-5 h-5 text-emerald-600 rounded"
//                   />
//                   <span className="text-[10px] font-bold text-emerald-900">I give my informed consent to proceed with IVC Filter Insertion.</span>
//                 </label>
//               </div>
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
//                 <p className="text-[10px] text-slate-400 font-bold italic text-center">Patient Signature</p>
//               </div>
//             </div>

//             {/* Nurse Signature */}
//             <div className="bg-white rounded-3xl p-6 shadow-xl border-t-8 border-purple-500 relative flex flex-col h-full">
//               <PartWarning fields={["nurse_signature"]} />
//               <div className="flex items-center gap-3 mb-6">
//                 <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 font-black">N</div>
//                 <h4 className="font-black text-slate-800 uppercase tracking-wider text-[10px]">Nurse Verification</h4>
//               </div>
//               <div className="space-y-4 mb-6">
//                 <div className="p-3 bg-purple-50 rounded-xl">
//                   <p className="text-[10px] font-bold text-purple-900">I verify that the patient identity has been confirmed and the consent has been signed in my presence.</p>
//                 </div>
//               </div>
//               <div className="space-y-2 flex-grow flex flex-col">
//                 <div className="flex-grow min-h-[250px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
//                   {readOnly ? (
//                     <div className="h-full w-full flex items-center justify-center p-2">
//                       {formData.nurse_signature ? (
//                         <img src={getSigUrl(formData.nurse_signature)} alt="Nurse Signature" className="max-h-full max-w-full object-contain" />
//                       ) : (
//                         <span className="text-slate-300 font-bold uppercase text-xs">No Signature</span>
//                       )}
//                     </div>
//                   ) : (
//                     <SignaturePad 
//                       onEnd={(data) => handleInputChange("nurse_signature", data)}
//                       onClear={() => handleInputChange("nurse_signature", null)}
//                       className="h-full w-full"
//                     />
//                   )}
//                 </div>
//                 <p className="text-[10px] text-slate-400 font-bold italic text-center">Witnessing Nurse Signature</p>
//               </div>
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
//             </>
//           )}
//           {readOnly && (
//             <button 
//               onClick={onPrint}
//               className="bg-brand-active0 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-2xl transition-all flex items-center gap-3"
//             >
//               <Printer size={20} /> View Full PDF
//             </button>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default IvcFilterConsentForm;

// import React, { useState, useEffect } from "react";
// import { FileText, CheckCircle, Loader2, Printer, AlertCircle } from "lucide-react";
// import { consentService, ConsentTemplate } from "../../services/consent.service";
// import SignaturePad from "../SignaturePad";
// import { useAuth } from "../../context/AuthContext";
// import { useNotification } from "../../context/NotificationContext";
// import { BASE_URL } from "../../api/client";

// interface IvcFilterConsentFormProps {
//   orderId: number;
//   patientName: string;
//   mrn: string;
//   onSuccess: (formData: any) => void;
//   onCancel: () => void;
//   onPrint: () => void;
//   readOnly?: boolean;
//   viewData?: any;
// }

// const IvcFilterConsentForm: React.FC<IvcFilterConsentFormProps> = ({
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
//     patient_name: patientName,
//     mrn: mrn,
//     dob: "",
//     sex: "",
//     ward: "",
//     consultant: "",
//     diagnosis: "",
//     access_site: [],
//     contrast_ack: false,
//     contrast_allergy: "",
//     renal_check: false,
//     pregnancy_status: "",
//     radiation_ack: false,
//     retrieval_ack: false,
//     retrieval_not_guaranteed: false,
//     permanent_if_needed: false,
//     anaesthesia_type: "",
//     drug_allergies: "",
//     anticoagulation: "",
//     questions: "",
//     answers: "",
//     clinician_confirm: false,
//     patient_confirm: false,
//     clinician_signature: null,
//     patient_signature: null,
//     nurse_signature: null,
//   });

//   useEffect(() => {
//     if (!readOnly) fetchTemplate();
//   }, []);

//   const fetchTemplate = async () => {
//     try {
//       const data = await consentService.getTemplate("ivc-filter-gsh-t6");
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

//   const handleCheckboxChange = (field: string, value: string) => {
//     setFormData((prev: any) => {
//       const current = prev[field] || [];
//       if (current.includes(value)) {
//         return { ...prev, [field]: current.filter((v: string) => v !== value) };
//       } else {
//         return { ...prev, [field]: [...current, value] };
//       }
//     });
//   };

//   const handleSubmit = async () => {
//     if (!formData.clinician_signature || !formData.patient_signature) {
//       notify("Both Clinician and Patient signatures are required", "error");
//       return;
//     }

//     setSubmitting(true);
//     try {
//       const payload = {
//         order_id: orderId,
//         template_slug: "ivc-filter-gsh-t6",
//         workflow_stage: "SIGNED_AND_CHECKED",
//         witness_user_id: user?.id || 0,
//         form_data: formData,
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
//         <Loader2 className="animate-spin text-brand-primary mb-4" size={48} />
//         <p className="text-slate-500 font-bold uppercase tracking-widest animate-pulse">Loading Procedure Template...</p>
//       </div>
//     );
//   }

//   return (
//     <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col max-w-6xl mx-auto">
//       {/* Header - High Fidelity Replica */}
//       <div className="bg-[#1e1b4b] text-white p-10 flex justify-between items-center relative overflow-hidden shrink-0">
//         <div className="absolute top-0 right-0 w-64 h-64 bg-brand-active0/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
//         <div className="z-10">
//           <div className="flex items-center gap-4 mb-2">
//             <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
//               <img src="/assets/login-bg.jpeg" alt="Gracespring Hospitals" className="w-10 h-10 object-contain" />
//             </div>
//             <div>
//               <h1 className="text-3xl font-black tracking-tighter">Procedure Consent Form</h1>
//               <p className="text-brand-primary font-bold text-sm">C-Arm Guided Inferior Vena Cava (IVC) Filter Insertion</p>
//             </div>
//           </div>
//           <p className="text-xs text-brand-active/60 font-medium">Form Ref: GSH-CONSENT-IVC-001 • Policy Ref: GSH-T6 • Version 1.0</p>
//         </div>
//         <div className="text-right z-10 flex flex-col items-end gap-3">
//           <div className="hidden md:block text-right">
//             <p className="text-[10px] text-brand-active font-bold leading-tight uppercase tracking-wider">Gracespring Hospitals</p>
//             <p className="text-[10px] text-brand-active">+234 705 648 2776 • admin@gracespringhospitals.com</p>
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
//             "You have the right to make decisions about your medical care and to refuse any procedure. If you wish to withdraw consent at any time before the procedure begins, you may do so. Signing this form does not remove your legal rights. This form complies with the National Health Act 2014 (Nigeria) and Gracespring Hospitals Consent Policy (GSH-T6)."
//           </p>
//         </div>

//         {/* Part A - Patient Identification */}
//         <section>
//           <div className="bg-brand-primary text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part A — Patient Identification</div>
//           <div className="border-4 border-slate-900 rounded-3xl p-8 grid grid-cols-1 md:grid-cols-3 gap-8 shadow-inner bg-slate-50 relative">
//             <PartWarning fields={["patient_name", "dob", "sex", "mrn", "ward", "consultant", "diagnosis", "access_site"]} />
//             <div className="space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient Full Name *</label>
//               <input 
//                 type="text" 
//                 value={formData.patient_name} 
//                 onChange={(e) => handleInputChange("patient_name", e.target.value)}
//                 readOnly={readOnly}
//                 className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active0 focus:ring-4 focus:ring-brand-active0/10"}`}
//               />
//             </div>
//             <div className="space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Date of Birth *</label>
//               <input 
//                 type="date" 
//                 value={formData.dob} 
//                 onChange={(e) => handleInputChange("dob", e.target.value)}
//                 readOnly={readOnly}
//                 className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active0"}`}
//               />
//             </div>
//             <div className="space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Sex at Birth</label>
//               <div className="flex gap-4 p-2 bg-white border-2 border-slate-200 rounded-xl">
//                 {["Male", "Female", "Other"].map(s => (
//                   <label key={s} className="flex items-center gap-2 cursor-pointer group">
//                     <input 
//                       type="radio" 
//                       name="sex" 
//                       checked={formData.sex === s} 
//                       onChange={() => handleInputChange("sex", s)}
//                       disabled={readOnly}
//                       className="w-4 h-4 text-brand-primary focus:ring-brand-active0"
//                     />
//                     <span className="text-xs font-bold text-slate-600 group-hover:text-brand-primary transition-colors">{s}</span>
//                   </label>
//                 ))}
//               </div>
//             </div>
//             <div className="space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">MRN (Medical Record Number) *</label>
//               <input 
//                 type="text" 
//                 value={formData.mrn} 
//                 className="w-full bg-slate-100 border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-500"
//                 readOnly
//               />
//             </div>
//             <div className="space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Ward / Unit</label>
//               <input 
//                 type="text" 
//                 value={formData.ward} 
//                 onChange={(e) => handleInputChange("ward", e.target.value)}
//                 readOnly={readOnly}
//                 className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active0"}`}
//               />
//             </div>
//             <div className="space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Consultant Vascular Surgeon / Interventionist *</label>
//               <input 
//                 type="text" 
//                 value={formData.consultant} 
//                 onChange={(e) => handleInputChange("consultant", e.target.value)}
//                 readOnly={readOnly}
//                 className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active0"}`}
//               />
//             </div>
//             <div className="md:col-span-2 space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Primary Diagnosis / Indication for IVC Filter *</label>
//               <textarea 
//                 rows={2}
//                 value={formData.diagnosis}
//                 onChange={(e) => handleInputChange("diagnosis", e.target.value)}
//                 placeholder="e.g. DVT with contraindication to anticoagulation; recurrent PE on anticoagulation..."
//                 readOnly={readOnly}
//                 className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none resize-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active0"}`}
//               />
//             </div>
//             <div className="space-y-2">
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Procedure Side / Venous Access Site</label>
//               <div className="grid grid-cols-2 gap-2 p-2 bg-white border-2 border-slate-200 rounded-xl">
//                 {["Right femoral", "Left femoral", "Right jugular", "Left jugular", "Antecubital"].map(site => (
//                   <label key={site} className="flex items-center gap-2 cursor-pointer group">
//                     <input 
//                       type="checkbox" 
//                       checked={(formData.access_site || []).includes(site)} 
//                       onChange={() => handleCheckboxChange("access_site", site)}
//                       disabled={readOnly}
//                       className="w-4 h-4 text-brand-primary rounded focus:ring-brand-active0"
//                     />
//                     <span className="text-[10px] font-bold text-slate-600 group-hover:text-brand-primary transition-colors">{site}</span>
//                   </label>
//                 ))}
//               </div>
//             </div>
//           </div>
//         </section>

//         {/* Part B - Description */}
//         <section>
//           <div className="bg-brand-primary text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part B — Description of the Procedure</div>
//           <div className="border-4 border-slate-900 rounded-3xl p-8 bg-slate-50 space-y-4">
//             <h4 className="font-black text-slate-900 uppercase tracking-widest text-sm">What is an IVC Filter?</h4>
//             <p className="text-sm text-slate-700 leading-relaxed font-medium">
//               An Inferior Vena Cava (IVC) filter is a small, cage-like medical device made of metal (usually nitinol or stainless steel) that is inserted into the inferior vena cava — the large vein that carries blood from the lower body back to the heart. Its purpose is to catch blood clots (thrombus) that break away from the deep veins of the legs or pelvis before they can travel to the lungs and cause a potentially fatal pulmonary embolism (PE).
//             </p>
//             <h4 className="font-black text-slate-900 uppercase tracking-widest text-sm">How is it performed at Gracespring Hospitals?</h4>
//             <p className="text-sm text-slate-700 leading-relaxed font-medium">
//               The procedure is performed using C-arm fluoroscopic (real-time X-ray) guidance in the Interventional Radiology / Vascular Suite under local anaesthesia with or without conscious sedation. You will be awake or lightly sedated and will not require a general anaesthetic for this procedure. The procedure typically takes 30–60 minutes.
//             </p>
//           </div>
//         </section>

//         {/* Part C - Contrast & Radiation */}
//         <section>
//           <div className="bg-brand-primary text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part C — Contrast Agent & Radiation Disclosure</div>
//           <div className="border-4 border-slate-900 rounded-3xl p-8 bg-slate-50 space-y-6 relative">
//             <PartWarning fields={["contrast_ack", "radiation_ack", "contrast_allergy", "pregnancy_status"]} />
//             <div className="bg-amber-100 border-2 border-amber-200 p-3 rounded-xl flex items-center gap-3">
//               <AlertCircle className="text-amber-600" size={20} />
//               <p className="text-xs font-black text-amber-800">C-arm guided procedures use ionising radiation (X-rays) and require the injection of iodinated contrast dye. You must read and acknowledge the following disclosures.</p>
//             </div>
            
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
//               <div className="space-y-4">
//                 <div className="flex items-start gap-4 p-4 bg-white border-2 border-slate-200 rounded-2xl">
//                   <input 
//                     type="checkbox" 
//                     id="contrast_ack"
//                     checked={formData.contrast_ack}
//                     onChange={(e) => handleInputChange("contrast_ack", e.target.checked)}
//                     disabled={readOnly}
//                     className="mt-1 w-6 h-6 text-brand-primary rounded-lg focus:ring-brand-active0"
//                   />
//                   <label htmlFor="contrast_ack" className="text-xs font-bold text-slate-700 leading-tight cursor-pointer">
//                     I have been informed about the use of contrast dye and its risks (flush sensation, nausea, allergic reactions).
//                   </label>
//                 </div>
//                 <div className="flex items-start gap-4 p-4 bg-white border-2 border-slate-200 rounded-2xl">
//                   <input 
//                     type="checkbox" 
//                     id="radiation_ack"
//                     checked={formData.radiation_ack}
//                     onChange={(e) => handleInputChange("radiation_ack", e.target.checked)}
//                     disabled={readOnly}
//                     className="mt-1 w-6 h-6 text-brand-primary rounded-lg focus:ring-brand-active0"
//                   />
//                   <label htmlFor="radiation_ack" className="text-xs font-bold text-slate-700 leading-tight cursor-pointer">
//                     I have been informed about the use of ionising radiation during this procedure.
//                   </label>
//                 </div>
//               </div>
              
//               <div className="space-y-4">
//                 <div className="space-y-2">
//                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Known Contrast Allergy?</label>
//                   <div className="flex gap-4 p-3 bg-white border-2 border-slate-200 rounded-xl">
//                     {["Known", "None"].map(o => (
//                       <label key={o} className="flex items-center gap-2 cursor-pointer">
//                         <input 
//                           type="radio" 
//                           name="contrast_allergy" 
//                           checked={formData.contrast_allergy === o} 
//                           onChange={() => handleInputChange("contrast_allergy", o)}
//                           disabled={readOnly}
//                           className="w-4 h-4 text-brand-primary focus:ring-brand-active0"
//                         />
//                         <span className="text-xs font-bold text-slate-600">{o}</span>
//                       </label>
//                     ))}
//                   </div>
//                 </div>
//                 <div className="space-y-2">
//                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Pregnancy Status / Confirmation</label>
//                   <input 
//                     type="text" 
//                     value={formData.pregnancy_status} 
//                     onChange={(e) => handleInputChange("pregnancy_status", e.target.value)}
//                     placeholder="e.g. N/A or Date of last menstrual period"
//                     readOnly={readOnly}
//                     className={`w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 transition-all outline-none ${readOnly ? "bg-slate-100" : "bg-white focus:border-brand-active0"}`}
//                   />
//                 </div>
//               </div>
//             </div>
//           </div>
//         </section>

//         {/* Part E - Risks Table (High Fidelity) */}
//         <section>
//           <div className="bg-brand-primary text-white px-4 py-1 inline-block rounded-t-xl text-xs font-black uppercase tracking-widest mb-0 ml-4">Part E — Risks & Complications</div>
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
//                   ["COMMON (>1 in 10)", "Access site pain, bruising and haematoma", "Expected at the venepuncture site; usually resolves within 1–2 weeks"],
//                   ["COMMON", "Temporary vasovagal reaction", "Related to venepuncture or contrast; managed with IV fluids"],
//                   ["UNCOMMON", "IVC thrombosis (the filter itself causing clot)", "Reported incidence 2–10%; managed with anticoagulation"],
//                   ["RARE", "Moderate to severe allergic reaction to contrast", "Approximately 0.04% incidence; treated with adrenaline/resuscitation"],
//                   ["VERY RARE", "Death directly related to the procedure", "Estimated procedural mortality <0.1%"]
//                 ].map((row, idx) => (
//                   <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
//                     <td className="px-6 py-4 text-xs font-black text-brand-primary border-r border-slate-200">{row[0]}</td>
//                     <td className="px-6 py-4 text-xs font-bold text-slate-700 border-r border-slate-200">{row[1]}</td>
//                     <td className="px-6 py-4 text-xs font-medium text-slate-500 italic">{row[2]}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </section>

//         {/* Part J, K, N - Multiple Signatures Workflow */}
//         <section className="space-y-12 bg-slate-900 p-10 rounded-[3rem] shadow-2xl">
//           <h3 className="text-center text-white font-black uppercase tracking-[0.5em] text-xl mb-12">Final Declarations & Signatures</h3>
          
//           <div className="grid grid-cols-1 gap-8">
//             {/* Clinician Signature */}
//             <div className="bg-white rounded-3xl p-6 shadow-xl border-t-8 border-brand-active0 relative flex flex-col h-full">
//               <PartWarning fields={["clinician_signature", "clinician_confirm"]} />
//               <div className="flex items-center gap-3 mb-6">
//                 <div className="w-8 h-8 bg-brand-active rounded-lg flex items-center justify-center text-brand-primary font-black">J</div>
//                 <h4 className="font-black text-slate-800 uppercase tracking-wider text-[10px]">Declaration of Clinician</h4>
//               </div>
//               <div className="space-y-4 mb-6">
//                 <label className="flex items-start gap-3 p-3 bg-brand-active rounded-xl cursor-pointer">
//                   <input 
//                     type="checkbox" 
//                     checked={formData.clinician_confirm} 
//                     onChange={(e) => handleInputChange("clinician_confirm", e.target.checked)}
//                     disabled={readOnly}
//                     className="mt-1 w-5 h-5 text-brand-primary rounded"
//                   />
//                   <span className="text-[10px] font-bold text-brand-primary">I confirm that I have explained the nature, purpose, benefits and risks.</span>
//                 </label>
//               </div>
//               <div className="space-y-2 flex-grow flex flex-col">
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
//                 <p className="text-[10px] text-slate-400 font-bold italic text-center">Clinician Signature</p>
//               </div>
//             </div>

//             {/* Patient Signature */}
//             <div className="bg-white rounded-3xl p-6 shadow-xl border-t-8 border-emerald-500 relative flex flex-col h-full">
//               <PartWarning fields={["patient_signature", "patient_confirm"]} />
//               <div className="flex items-center gap-3 mb-6">
//                 <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 font-black">K</div>
//                 <h4 className="font-black text-slate-800 uppercase tracking-wider text-[10px]">Patient Consent</h4>
//               </div>
//               <div className="space-y-4 mb-6">
//                 <label className="flex items-start gap-3 p-3 bg-emerald-50 rounded-xl cursor-pointer">
//                   <input 
//                     type="checkbox" 
//                     checked={formData.patient_confirm} 
//                     onChange={(e) => handleInputChange("patient_confirm", e.target.checked)}
//                     disabled={readOnly}
//                     className="mt-1 w-5 h-5 text-emerald-600 rounded"
//                   />
//                   <span className="text-[10px] font-bold text-emerald-900">I give my informed consent to proceed with IVC Filter Insertion.</span>
//                 </label>
//               </div>
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
//                 <p className="text-[10px] text-slate-400 font-bold italic text-center">Patient Signature</p>
//               </div>
//             </div>

//             {/* Nurse Signature */}
//             <div className="bg-white rounded-3xl p-6 shadow-xl border-t-8 border-purple-500 relative flex flex-col h-full">
//               <PartWarning fields={["nurse_signature"]} />
//               <div className="flex items-center gap-3 mb-6">
//                 <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 font-black">N</div>
//                 <h4 className="font-black text-slate-800 uppercase tracking-wider text-[10px]">Nurse Verification</h4>
//               </div>
//               <div className="space-y-4 mb-6">
//                 <div className="p-3 bg-purple-50 rounded-xl">
//                   <p className="text-[10px] font-bold text-purple-900">I verify that the patient identity has been confirmed and the consent has been signed in my presence.</p>
//                 </div>
//               </div>
//               <div className="space-y-2 flex-grow flex flex-col">
//                 <div className="flex-grow min-h-[250px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
//                   {readOnly ? (
//                     <div className="h-full w-full flex items-center justify-center p-2">
//                       {formData.nurse_signature ? (
//                         <img src={getSigUrl(formData.nurse_signature)} alt="Nurse Signature" className="max-h-full max-w-full object-contain" />
//                       ) : (
//                         <span className="text-slate-300 font-bold uppercase text-xs">No Signature</span>
//                       )}
//                     </div>
//                   ) : (
//                     <SignaturePad 
//                       onEnd={(data) => handleInputChange("nurse_signature", data)}
//                       onClear={() => handleInputChange("nurse_signature", null)}
//                       className="h-full w-full"
//                     />
//                   )}
//                 </div>
//                 <p className="text-[10px] text-slate-400 font-bold italic text-center">Witnessing Nurse Signature</p>
//               </div>
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
//               disabled={submitting || !formData.clinician_signature || !formData.patient_signature}
//               className="bg-[#1e1b4b] text-white px-10 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-2xl shadow-brand-primary/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50 disabled:grayscale disabled:scale-100"
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
//               className="bg-brand-active0 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-2xl transition-all flex items-center gap-3"
//             >
//               <Printer size={20} /> View Full PDF
//             </button>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default IvcFilterConsentForm;
