import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Save,
  Printer,
  CheckCircle,
  Loader2,
  FileText,
  Maximize2,
  Minimize2,
  Trash2,
  Activity,
  UserCircle,
  Stethoscope,
  Syringe,
  FileSignature
} from "lucide-react";
import { otService, OTSurgery } from "../services/ot.service";
import { useNotification } from "../context/NotificationContext";
import { formDraftService } from "../services/session-restore.service"; // ADDED
import SearchableDoctorSelect from "./shared/SearchableDoctorSelect";
import SearchableUserSelect from "./shared/SearchableUserSelect";
import SignaturePad from "./SignaturePad";

// 1. Extend OTSurgery to fix TypeScript missing property errors
interface OperativeNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  surgery: OTSurgery & {
    diagnosis?: string;
    weight?: string | number;
    height?: string | number;
    bmi?: string | number;
    known_allergies?: string;
    age?: string | number;
  };
  onComplete?: () => void;
  onBackToActions?: () => void;
}

// Added id, author_id, and created_by to track record ownership
const initialFormData = {
  id: null as number | null,
  author_id: null as string | number | null,
  created_by: null as string | number | null,
  surgeon_signed_by: null as string | number | null,

  operation_date: "",
  start_time: "",
  end_time: "",
  procedure_type: "Elective",
  anesthesia_type: "",
  anesthetic_drugs: "",

  surgeon_id: "0",
  assistant1_id: "0",
  assistant2_id: "0",
  anaesthetist1_id: "0",
  anaesthetist2_id: "0",
  scrub_practitioner_id: "0",
  anaesthetic_technician_id: "0",
  circulator_id: "0",
  supervised_by_id: "0",
  supervision_level: "Independent",

  procedures_performed: "",
  preop_diagnosis: "",
  postop_diagnosis: "",

  operative_indication: "",
  operative_findings: "",
  operative_procedure_steps: "",
  closure_technique: "",

  drains_present: false,
  drains_details: "",
  tourniquet_used: false,
  tourniquet_site: "",
  tourniquet_pressure: "",
  tourniquet_duration: "",
  estimated_blood_loss: "",
  fluids_given: "",
  blood_products: "",

  antibiotic_prophylaxis: false,
  antibiotic_agent: "",
  dvt_prophylaxis: "None",
  dvt_details: "",
  other_drugs: "",

  specimens: "",
  specimens_sent_to: "",
  specimen_description: "",

  outcome: "Uncomplicated",
  complications: "",
  patient_condition_leaving: "",

  transfer_to: "Recovery",
  destination_ward: "",
  postop_instructions: "",
  new_medications: "",
  discharge_instructions: "",
  followup_clinic_date: "",
  suture_removal_date: "",
  histology_followup: "",

  surgeon_signature: null,
};

const OperativeNoteModal: React.FC<OperativeNoteModalProps> = ({
  isOpen,
  onClose,
  surgery,
  onComplete,
  onBackToActions,
}) => {
  const { notify } = useNotification();
  const [formData, setFormData] = useState<any>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-save logic hooks (ADDED)
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showDraftBanner, setShowDraftBanner] = useState(false);


  // ==========================================
  // 2. Security Check: Determine if the user has edit rights
  // ==========================================
  
  // Safely extract the logged-in user's ID
  let activeUserId = localStorage.getItem("user_id") || localStorage.getItem("userId") || "";
  const activeUserString = localStorage.getItem("user");
  
  if (!activeUserId && activeUserString) {
    try {
      const parsedUser = JSON.parse(activeUserString);
      activeUserId = parsedUser?.id?.toString() || parsedUser?.user_id?.toString() || "";
    } catch (e) {
      console.warn("Failed to parse user from localStorage");
    }
  }
  activeUserId = activeUserId?.toString();


  // Retrieve current user ID to verify note ownership. 
  // let activeUserId = localStorage.getItem("user_id") || localStorage.getItem("userId") || "";
  // const activeUserString = localStorage.getItem("user");
  
  // if (!activeUserId && activeUserString) {
  //   try {
  //     const parsedUser = JSON.parse(activeUserString);
  //     activeUserId = parsedUser?.id?.toString() || parsedUser?.user_id?.toString() || "";
  //   } catch (e) {
  //     console.warn("Failed to parse user from localStorage");
  //   }
  // }
  // activeUserId = activeUserId?.toString();

  useEffect(() => {
    if (isOpen && surgery) {
      const today = new Date().toISOString().split("T")[0];
      setFormData((prev: any) => ({
        ...prev,
        operation_date: today,
        preop_diagnosis: surgery.diagnosis || "",
        procedures_performed: surgery.surgery_name || "",
      }));
      fetchExistingNote();
    }
  }, [isOpen, surgery]);

  // Handle restoring draft if it exists (ADDED)
  useEffect(() => {
    if (isOpen && surgery?.id && activeUserId) {
      const draftId = `operative_note_${surgery.id}`;
      const savedDraft = formDraftService.loadDraft<any>(activeUserId, draftId);

      if (!savedDraft.id || savedDraft.id === formData.id) {
          setFormData((prev: any) => ({ ...prev, ...savedDraft }));
          setShowDraftBanner(true);
          setTimeout(() => setShowDraftBanner(false), 5000);
      }
      
      // if (savedDraft && Object.keys(savedDraft).length > 0) {
      //   // We only restore draft if there is no existing note ID, 
      //   // OR if the draft belongs to the existing note
      //   if (!savedDraft.id || savedDraft.id === formData.id) {
      //       setFormData(prev => ({ ...prev, ...savedDraft }));
      //       setShowDraftBanner(true);
      //       setTimeout(() => setShowDraftBanner(false), 5000);
      //   }
      // }
    }
  }, [isOpen, surgery?.id, activeUserId, formData.id]);

  // Handle saving draft continuously (ADDED)
  useEffect(() => {
    if (isOpen && surgery?.id && activeUserId) {
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        
        autoSaveTimerRef.current = setTimeout(() => {
            const draftId = `operative_note_${surgery.id}`;
            formDraftService.saveDraft(activeUserId, draftId, formData);
        }, 1500);
    }
    return () => {
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [formData, isOpen, surgery?.id, activeUserId]);

  const fetchExistingNote = async () => {
    setLoading(true);
    try {
      const existingData = await otService.getOperativeNote(surgery.id);
      if (existingData && (existingData.ot_case_id || existingData.id)) {
        // Normalize IDs to strings for the dropdowns, preserving "0" for None
        const normalizedData = { ...existingData };
        const staffFields = [
          "surgeon_id", "assistant1_id", "assistant2_id",
          "anaesthetist1_id", "anaesthetist2_id",
          "scrub_practitioner_id", "anaesthetic_technician_id",
          "circulator_id", "supervised_by_id"
        ];
        staffFields.forEach(field => {
          if (normalizedData[field] !== null && normalizedData[field] !== undefined) {
            normalizedData[field] = normalizedData[field].toString();
          } else {
            normalizedData[field] = "0"; // Default to NONE=0
          }
        });
        setFormData({ ...initialFormData, ...normalizedData });
      }
    } catch (error) {
      console.warn("No existing operative note found.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev: any) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev: any) => ({ ...prev, [name]: value }));
    }
  };

  const handleClearStaff = (field: string) => {
    setFormData((prev: any) => ({ ...prev, [field]: "0" }));
  };

  const handleSave = async (complete: boolean = false) => {
    setSaving(true);
    try {
      const payload = {
        ...formData,
        ot_case_id: surgery.id,
      };

      if (complete && !payload.surgeon_signature) {
         notify("Surgeon signature is required to complete the note.", "error");
         setSaving(false);
         return;
      }

      if (formData.id || formData.ot_case_id) {
        await otService.updateOperativeNote(payload);
      } else {
        await otService.createOperativeNote(payload);
      }

      // Clear the draft once successfully saved to the server (ADDED)
      if (activeUserId) {
        formDraftService.clearDraft(activeUserId, `operative_note_${surgery.id}`);
      }

      notify(`Operative Note ${complete ? "completed" : "saved"} successfully`, "success");
      if (complete && onComplete) {
        onComplete();
        onClose();
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || "Failed to save operative note";
      notify(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen().catch(() => {});
    else document.exitFullscreen();
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  if (!isOpen) return null;

  // ==========================================
  // 2. Security Check: Determine if the user has edit rights
  // ==========================================
  const isExistingNote = Boolean(formData.id);

  // Safely convert all database IDs to strings for strict comparison
  const noteAuthor = formData.author_id ? String(formData.author_id) : null;
  const noteCreator = formData.created_by ? String(formData.created_by) : null;
  const noteSigner = formData.surgeon_signed_by ? String(formData.surgeon_signed_by) : null;

  // LOGIC: 
  // 1. If it's NOT an existing note (i.e., a new record), ANYONE can edit it.
  // 2. If we somehow can't determine the activeUserId, we assume they can edit to prevent UI locking.
  // 3. If it IS an existing note, the current user MUST match the author, creator, or signer.
  const canEdit = !isExistingNote || !activeUserId || (
    activeUserId !== "" && (
      activeUserId === noteAuthor || 
      activeUserId === noteCreator || 
      activeUserId === noteSigner
    )
  );

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
      <div ref={containerRef} className="bg-slate-50 rounded-xl shadow-2xl w-[98vw] max-w-[1920px] h-[95vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Modern Header matching Perfusion */}
        <div className="bg-[#2A157c] px-6 py-3 border-b border-[#312e81] flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="relative w-[150px] h-[40px] flex items-center px-2">
               <img src="/assets/logo-nobg.png" alt="Logo" className="object-contain w-full h-full" />
            </div>
            <div className="border-l border-indigo-800 pl-4">
              <h2 className="text-white font-bold text-lg flex items-center gap-2 tracking-wide">
                <FileText className="text-brand-primary" size={20} /> Operative Note
                {loading && <Loader2 size={16} className="animate-spin text-brand-primary" />}
              </h2>
              <p className="text-indigo-200 text-xs mt-0.5">
                MRN: {surgery.mrn} |  FULLNAME: {surgery.first_name} {surgery.last_name} |  GENDER: {surgery.gender} | AGE: {surgery.age} | {surgery.surgery_name}  |  WEIGHT: {surgery.weight} | HEIGHT: {surgery.height} |  BMI: {surgery.bmi}  |  ALLERGIES: {surgery.known_allergies} 
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             {/* DRAFT INDICATOR (ADDED) */}
             {showDraftBanner && (
                 <span className="text-amber-200 bg-amber-900/50 px-2 py-1 rounded text-xs font-bold mr-2 animate-pulse">
                     Unsaved draft restored
                 </span>
             )}
            <button
              onClick={() => window.open(`/print/operative-note/${surgery.id}`, '_blank')}
              className="px-4 py-2 text-xs rounded font-bold text-white bg-white/10 border border-white/20 hover:bg-white/20 transition-colors flex items-center gap-2"
            >
              <Printer size={16} /> Print
            </button>
            <div className="h-8 w-px bg-indigo-800 mx-1"></div>
            <button onClick={toggleFullscreen} className="p-2 text-indigo-200 hover:text-white hover:bg-white/10 rounded transition-colors">
              {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </button>
            <button onClick={onClose} className="p-2 text-indigo-200 hover:text-red-400 hover:bg-white/10 rounded transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Main Scrolling Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-slate-100/50 relative">
          {loading ? (
            <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-white/70 backdrop-blur-sm transition-all">
              <Loader2 size={64} className="animate-spin text-[#1e1b4b] mb-4" />
              <h3 className="text-2xl font-black text-[#1e1b4b] tracking-tight animate-pulse">Loading Operative Note...</h3>
            </div>
          ) : (
            <div className="max-w-6xl mx-auto space-y-8 pb-12">
              
              {/* Part 1: Operation Details */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b pb-3">
                  <div className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-black">1</div> 
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-sm flex items-center gap-2"><Activity size={16}/> Operation Details</h4>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Date of Operation</label>
                    <input type="date" disabled={!canEdit} name="operation_date" value={formData.operation_date} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Start Time</label>
                    <input type="time" disabled={!canEdit} name="start_time" value={formData.start_time} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">End Time</label>
                    <input type="time" disabled={!canEdit} name="end_time" value={formData.end_time} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Procedure Type</label>
                    <select name="procedure_type" disabled={!canEdit} value={formData.procedure_type} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium disabled:bg-slate-50 disabled:text-slate-500">
                      <option value="Elective">Elective</option>
                      <option value="Emergency">Emergency</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Anaesthesia Type</label>
                    <select name="anesthesia_type" disabled={!canEdit} value={formData.anesthesia_type} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-500">
                      <option value="">Select...</option>
                      <option value="General (GA)">General (GA)</option>
                      <option value="Local (LA)">Local (LA)</option>
                      <option value="Regional-Spinal">Regional - Spinal</option>
                      <option value="Regional-Epidural">Regional - Epidural</option>
                      <option value="Regional-Caudal">Regional - Caudal</option>
                      <option value="Combined Spinal & Epidural (CSE)">Combined Spinal & Epidural (CSE)</option>
                      <option value="Sedation-with-anaesthetist">Sedation - with anaesthetist</option>
                      <option value="Sedation-no-anaesthetist">Sedation - no anaesthetist</option>
                      <option value="No anaesthesia">No anaesthesia</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Local Anaesthetic / Drugs</label>
                    <input type="text" disabled={!canEdit} name="anesthetic_drugs" value={formData.anesthetic_drugs} onChange={handleChange} placeholder="Agent, concentration, volume, total dose" className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-500" />
                  </div>
                </div>
              </div>

              {/* Part 2: Performed By */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b pb-3">
                  <div className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-black">2</div> 
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-sm flex items-center gap-2"><UserCircle size={16}/> Performed By (Personnel)</h4>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  {[
                    { id: "surgeon_id", label: "Surgeon", Component: SearchableDoctorSelect },
                    { id: "assistant1_id", label: "Assistant 1", Component: SearchableDoctorSelect },
                    { id: "assistant2_id", label: "Assistant 2", Component: SearchableDoctorSelect },
                    { id: "anaesthetist1_id", label: "Anaesthetist 1", Component: SearchableUserSelect },
                    { id: "anaesthetist2_id", label: "Anaesthetist 2", Component: SearchableUserSelect },
                    { id: "scrub_practitioner_id", label: "Scrub Practitioner", Component: SearchableUserSelect },
                    { id: "anaesthetic_technician_id", label: "Anaesthetic Technician", Component: SearchableUserSelect },
                    { id: "circulator_id", label: "Circulator", Component: SearchableUserSelect },
                    { id: "supervised_by_id", label: "Supervised By", Component: SearchableUserSelect },
                  ].map((staff) => (
                    <div key={staff.id}>
                      <div className="flex justify-between items-end mb-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">{staff.label}</label>
                        {formData[staff.id] !== "0" && canEdit && (
                           <button type="button" onClick={() => handleClearStaff(staff.id)} className="text-[10px] font-bold text-red-500 hover:text-red-700 bg-red-50 px-1.5 py-0.5 rounded">Set to None</button>
                        )}
                      </div>

                        <staff.Component
                          value={formData[staff.id] === "0" ? "" : formData[staff.id]}
                          onChange={(val: any) => setFormData({ ...formData, [staff.id]: val || "0" })}
                          placeholder={`Select ${staff.label}`}
                        />
                    </div>
                  ))}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Supervision Level</label>
                    <select name="supervision_level" disabled={!canEdit} value={formData.supervision_level} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-500">
                      <option value="Independent">Independent</option>
                      <option value="Direct">Direct</option>
                      <option value="Indirect">Indirect</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Part 3: Procedure & Diagnosis */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b pb-3">
                  <div className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-black">3</div> 
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-sm flex items-center gap-2"><Stethoscope size={16}/> Procedure(s) & Operative Diagnosis</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Pre-Operative Diagnosis</label>
                    <input type="text" disabled={!canEdit} name="preop_diagnosis" value={formData.preop_diagnosis} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Operative Diagnosis (Post-Op)</label>
                    <input type="text" disabled={!canEdit} name="postop_diagnosis" value={formData.postop_diagnosis} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-500" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Procedure(s) Performed (List all; primary first)</label>
                    <textarea rows={3} disabled={!canEdit} name="procedures_performed" value={formData.procedures_performed} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-y disabled:bg-slate-50 disabled:text-slate-500" />
                  </div>
                </div>
              </div>

              {/* Part 4: Operative Narrative */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b pb-3">
                  <div className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-black">4</div> 
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-sm">Operative Narrative</h4>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Operative Indication</label>
                    <textarea rows={2} disabled={!canEdit} name="operative_indication" value={formData.operative_indication} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-y disabled:bg-slate-50 disabled:text-slate-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Operative Findings</label>
                    <textarea rows={3} disabled={!canEdit} name="operative_findings" value={formData.operative_findings} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-y disabled:bg-slate-50 disabled:text-slate-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Operative Procedure — Step by Step</label>
                    <textarea rows={6} disabled={!canEdit} name="operative_procedure_steps" value={formData.operative_procedure_steps} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-y disabled:bg-slate-50 disabled:text-slate-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Closure Technique (Layers, suture material, skin)</label>
                    <textarea rows={2} disabled={!canEdit} name="closure_technique" value={formData.closure_technique} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-y disabled:bg-slate-50 disabled:text-slate-500" />
                  </div>
                </div>
              </div>

              {/* Part 5: Intra-Op Adjuncts, Drugs & Specimens */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                <div className="flex items-center gap-2 border-b pb-3">
                  <div className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-black">5</div> 
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-sm flex items-center gap-2"><Syringe size={16}/> Intra-Operative Adjuncts, Drugs & Specimens</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  {/* Adjuncts Left Column */}
                  <div className="space-y-4">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" disabled={!canEdit} name="drains_present" checked={formData.drains_present} onChange={handleChange} className="w-4 h-4 accent-indigo-600 rounded disabled:opacity-50" />
                        <span className="text-sm font-bold text-slate-700">Drains Present</span>
                      </label>
                      {formData.drains_present && (
                        <input type="text" disabled={!canEdit} name="drains_details" value={formData.drains_details} onChange={handleChange} placeholder="Type, site & number" className="w-full mt-2 p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-500" />
                      )}
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" disabled={!canEdit} name="tourniquet_used" checked={formData.tourniquet_used} onChange={handleChange} className="w-4 h-4 accent-indigo-600 rounded disabled:opacity-50" />
                        <span className="text-sm font-bold text-slate-700">Tourniquet Used</span>
                      </label>
                      {formData.tourniquet_used && (
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          <div><label className="text-[9px] font-bold text-slate-400 uppercase">Site</label><input type="text" disabled={!canEdit} name="tourniquet_site" value={formData.tourniquet_site} onChange={handleChange} className="w-full p-1.5 border border-slate-300 rounded text-sm outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500" /></div>
                          <div><label className="text-[9px] font-bold text-slate-400 uppercase">Pressure</label><input type="number" disabled={!canEdit} name="tourniquet_pressure" value={formData.tourniquet_pressure} onChange={handleChange} className="w-full p-1.5 border border-slate-300 rounded text-sm outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500" /></div>
                          <div><label className="text-[9px] font-bold text-slate-400 uppercase">Duration (m)</label><input type="number" disabled={!canEdit} name="tourniquet_duration" value={formData.tourniquet_duration} onChange={handleChange} className="w-full p-1.5 border border-slate-300 rounded text-sm outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500" /></div>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Estimated Blood Loss (mL)</label>
                        <input type="number" disabled={!canEdit} name="estimated_blood_loss" value={formData.estimated_blood_loss} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-500" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Blood Products (Units)</label>
                        <input type="text" disabled={!canEdit} name="blood_products" value={formData.blood_products} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-500" />
                      </div>
                    </div>
                  </div>

                  {/* Drugs & Prophylaxis Right Column */}
                  <div className="space-y-4">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" disabled={!canEdit} name="antibiotic_prophylaxis" checked={formData.antibiotic_prophylaxis} onChange={handleChange} className="w-4 h-4 accent-indigo-600 rounded disabled:opacity-50" />
                        <span className="text-sm font-bold text-slate-700">Antibiotic Prophylaxis Given</span>
                      </label>
                      {formData.antibiotic_prophylaxis && (
                        <input type="text" disabled={!canEdit} name="antibiotic_agent" value={formData.antibiotic_agent} onChange={handleChange} placeholder="Agent, dose, route & time" className="w-full mt-2 p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-500" />
                      )}
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                       <label className="block text-[10px] font-bold text-slate-500 uppercase">DVT Prophylaxis</label>
                       <select name="dvt_prophylaxis" disabled={!canEdit} value={formData.dvt_prophylaxis} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-500">
                          <option value="None">None</option>
                          <option value="Mechanical">Mechanical</option>
                          <option value="Pharmacological">Pharmacological</option>
                          <option value="Both">Both</option>
                       </select>
                       {formData.dvt_prophylaxis !== "None" && (
                          <input type="text" disabled={!canEdit} name="dvt_details" value={formData.dvt_details} onChange={handleChange} placeholder="Details (TED stockings, LMWH dose, etc.)" className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-500" />
                       )}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Fluids Given (Type/Volume)</label>
                      <input type="text" disabled={!canEdit} name="fluids_given" value={formData.fluids_given} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-500" />
                    </div>
                  </div>
                  
                  {/* Specimens Span Full */}
                  <div className="col-span-1 md:col-span-2 p-4 bg-indigo-50 border border-indigo-100 rounded-lg">
                    <h5 className="font-bold text-indigo-900 text-xs mb-3 uppercase tracking-wide">Specimens</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Sent To</label>
                          <select name="specimens_sent_to" disabled={!canEdit} value={formData.specimens_sent_to} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white disabled:bg-slate-50 disabled:text-slate-500">
                            <option value="">Select...</option>
                            <option value="Histology">Histology</option>
                            <option value="Microbiology">Microbiology</option>
                            <option value="Cytology">Cytology</option>
                            <option value="Frozen section">Frozen section</option>
                            <option value="Disposed of">Disposed of</option>
                            <option value="Other">Other</option>
                          </select>
                       </div>
                       <div className="md:col-span-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Description & Labelling</label>
                          <input type="text" disabled={!canEdit} name="specimen_description" value={formData.specimen_description} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white disabled:bg-slate-50 disabled:text-slate-500" placeholder="Pots numbered, request form completed..." />
                       </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Part 6: Outcome & Post-Op */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b pb-3">
                  <div className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-black">6</div> 
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-sm">Outcome & Post-Operative Plan</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Outcome</label>
                    <select name="outcome" disabled={!canEdit} value={formData.outcome} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold disabled:bg-slate-50 disabled:text-slate-500">
                      <option value="Uncomplicated">Uncomplicated</option>
                      <option value="Complicated">Complicated</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Patient Condition Leaving Theatre</label>
                    <input type="text" disabled={!canEdit} name="patient_condition_leaving" value={formData.patient_condition_leaving} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-500" />
                  </div>
                  {formData.outcome === "Complicated" && (
                    <div className="md:col-span-2 bg-red-50 p-3 border border-red-200 rounded-lg">
                      <label className="block text-[10px] font-bold text-red-700 uppercase mb-1">Describe Complication, Actions & Persons Informed</label>
                      <textarea rows={2} disabled={!canEdit} name="complications" value={formData.complications} onChange={handleChange} className="w-full p-2 border border-red-300 rounded text-sm focus:ring-2 focus:ring-red-500 outline-none resize-y disabled:bg-red-50 disabled:text-slate-500" />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-slate-100">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Transfer To</label>
                    <select name="transfer_to" disabled={!canEdit} value={formData.transfer_to} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-500">
                      <option value="Recovery">Recovery / PACU</option>
                      <option value="HDU">HDU</option>
                      <option value="ICU">ICU</option>
                      <option value="Ward">Ward</option>
                      <option value="Day-case discharge">Day-case discharge</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Destination Ward / Unit</label>
                    <input type="text" disabled={!canEdit} name="destination_ward" value={formData.destination_ward} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-500" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Post-Operative Instructions (Observations, position, NBM/diet, drains)</label>
                    <textarea rows={3} disabled={!canEdit} name="postop_instructions" value={formData.postop_instructions} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-y disabled:bg-slate-50 disabled:text-slate-500" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">New Medications Requested (Drug, dose, route, duration)</label>
                    <textarea rows={2} disabled={!canEdit} name="new_medications" value={formData.new_medications} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-y disabled:bg-slate-50 disabled:text-slate-500" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Discharge Instructions (If applicable)</label>
                    <textarea rows={2} disabled={!canEdit} name="discharge_instructions" value={formData.discharge_instructions} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-y disabled:bg-slate-50 disabled:text-slate-500" />
                  </div>
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                     <div>
                       <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Follow-up Clinic Date</label>
                       <input type="date" disabled={!canEdit} name="followup_clinic_date" value={formData.followup_clinic_date} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-500" />
                     </div>
                     <div>
                       <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Suture/Staple Removal</label>
                       <input type="date" disabled={!canEdit} name="suture_removal_date" value={formData.suture_removal_date} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-500" />
                     </div>
                     <div>
                       <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Histology Follow-up Plan</label>
                       <input type="text" disabled={!canEdit} name="histology_followup" value={formData.histology_followup} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-500" />
                     </div>
                  </div>
                </div>
              </div>

              {/* Part 7: Signatures Block */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                <div className="flex items-center gap-2 border-b pb-3">
                  <div className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-black">7</div> 
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-sm flex items-center gap-2"><FileSignature size={16}/> Signatures & Certification</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="border border-slate-300 rounded-lg p-4 relative bg-slate-50/50">
                    <h5 className="text-xs font-bold text-slate-700 uppercase mb-4 border-b border-slate-200 pb-2">Primary Surgeon / Operator</h5>
                    <div className="h-40 bg-white border-2 border-dashed border-slate-300 rounded-lg mb-4 relative overflow-hidden flex items-center justify-center">
                      {formData.surgeon_signature ? (
                        <>
                          <img src={formData.surgeon_signature} alt="Primary Surgeon Signature" className="max-h-full max-w-full object-contain p-2" />
                          {canEdit && (
                            <button onClick={() => setFormData({...formData, surgeon_signature: null})} className="absolute top-2 right-2 p-1.5 bg-red-100 text-red-600 rounded shadow hover:bg-red-200 transition-colors"><Trash2 size={16}/></button>
                          )}
                        </>
                      ) : (
                        canEdit ? (
                          <SignaturePad onEnd={(d: any) => setFormData({...formData, surgeon_signature: d})} className="w-full h-full" />
                        ) : (
                          <span className="text-slate-400 font-bold uppercase text-xs">No Signature Available</span>
                        )
                      )}
                      {!formData.surgeon_signature && canEdit && <span className="absolute pointer-events-none text-slate-300 font-bold uppercase tracking-widest flex flex-col items-center gap-2"><FileSignature size={24}/> Sign Here</span>}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="bg-white px-6 py-4 border-t border-slate-200 flex justify-end gap-3 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <button onClick={onClose} disabled={saving} className="px-6 py-2.5 rounded-lg font-bold text-slate-600 hover:bg-slate-100 transition-colors">
            {canEdit ? "Cancel" : "Close"}
          </button>
          
          {/* Conditionally render save buttons based on authorization logic */}
          {canEdit && (
            <>
              <button onClick={() => handleSave(false)} disabled={saving} className="px-6 py-2.5 rounded-lg font-bold text-brand-primary bg-brand-primary/10 hover:bg-brand-primary/20 transition-all flex items-center gap-2">
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Save Draft
              </button>
              <button onClick={() => handleSave(true)} disabled={saving} className="px-8 py-2.5 rounded-lg font-bold text-white bg-brand-primary hover:bg-brand-active0 shadow-lg transition-all flex items-center gap-2 disabled:opacity-50">
                {saving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />} Sign & Complete Note
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
};

export default OperativeNoteModal;


// import React, { useState, useEffect, useRef } from "react";
// import {
//   X,
//   Save,
//   Printer,
//   CheckCircle,
//   Loader2,
//   FileText,
//   Maximize2,
//   Minimize2,
//   Trash2,
//   Activity,
//   UserCircle,
//   Stethoscope,
//   Syringe,
//   FileSignature
// } from "lucide-react";
// import { otService, OTSurgery } from "../services/ot.service";
// import { useNotification } from "../context/NotificationContext";
// import SearchableDoctorSelect from "./shared/SearchableDoctorSelect";
// import SearchableUserSelect from "./shared/SearchableUserSelect";
// import SignaturePad from "./SignaturePad";

// // 1. Extend OTSurgery to fix TypeScript missing property errors
// interface OperativeNoteModalProps {
//   isOpen: boolean;
//   onClose: () => void;
//   surgery: OTSurgery & {
//     diagnosis?: string;
//     weight?: string | number;
//     height?: string | number;
//     bmi?: string | number;
//     known_allergies?: string;
//     age?: string | number;
//   };
//   onComplete?: () => void;
//   onBackToActions?: () => void;
// }

// // Added id, author_id, and created_by to track record ownership
// const initialFormData = {
//   id: null as number | null,
//   author_id: null as string | number | null,
//   created_by: null as string | number | null,
//   surgeon_signed_by: null as string | number | null,

//   operation_date: "",
//   start_time: "",
//   end_time: "",
//   procedure_type: "Elective",
//   anesthesia_type: "",
//   anesthetic_drugs: "",

//   surgeon_id: "0",
//   assistant1_id: "0",
//   assistant2_id: "0",
//   anaesthetist1_id: "0",
//   anaesthetist2_id: "0",
//   scrub_practitioner_id: "0",
//   anaesthetic_technician_id: "0",
//   circulator_id: "0",
//   supervised_by_id: "0",
//   supervision_level: "Independent",

//   procedures_performed: "",
//   preop_diagnosis: "",
//   postop_diagnosis: "",

//   operative_indication: "",
//   operative_findings: "",
//   operative_procedure_steps: "",
//   closure_technique: "",

//   drains_present: false,
//   drains_details: "",
//   tourniquet_used: false,
//   tourniquet_site: "",
//   tourniquet_pressure: "",
//   tourniquet_duration: "",
//   estimated_blood_loss: "",
//   fluids_given: "",
//   blood_products: "",

//   antibiotic_prophylaxis: false,
//   antibiotic_agent: "",
//   dvt_prophylaxis: "None",
//   dvt_details: "",
//   other_drugs: "",

//   specimens: "",
//   specimens_sent_to: "",
//   specimen_description: "",

//   outcome: "Uncomplicated",
//   complications: "",
//   patient_condition_leaving: "",

//   transfer_to: "Recovery",
//   destination_ward: "",
//   postop_instructions: "",
//   new_medications: "",
//   discharge_instructions: "",
//   followup_clinic_date: "",
//   suture_removal_date: "",
//   histology_followup: "",

//   surgeon_signature: null,
// };

// const OperativeNoteModal: React.FC<OperativeNoteModalProps> = ({
//   isOpen,
//   onClose,
//   surgery,
//   onComplete,
//   onBackToActions,
// }) => {
//   const { notify } = useNotification();
//   const [formData, setFormData] = useState<any>(initialFormData);
//   const [loading, setLoading] = useState(false);
//   const [saving, setSaving] = useState(false);

//   const [isFullscreen, setIsFullscreen] = useState(false);
//   const containerRef = useRef<HTMLDivElement>(null);

//   // Retrieve current user ID to verify note ownership. 
//   // Update this to use your AuthContext if preferred: const { user } = useAuth();
//   const currentUserId = localStorage.getItem("user_id") || localStorage.getItem("userId") || "";

//   useEffect(() => {
//     if (isOpen && surgery) {
//       const today = new Date().toISOString().split("T")[0];
//       setFormData((prev: any) => ({
//         ...prev,
//         operation_date: today,
//         preop_diagnosis: surgery.diagnosis || "",
//         procedures_performed: surgery.surgery_name || "",
//       }));
//       fetchExistingNote();
//     }
//   }, [isOpen, surgery]);

//   const fetchExistingNote = async () => {
//     setLoading(true);
//     try {
//       const existingData = await otService.getOperativeNote(surgery.id);
//       if (existingData && (existingData.ot_case_id || existingData.id)) {
//         // Normalize IDs to strings for the dropdowns, preserving "0" for None
//         const normalizedData = { ...existingData };
//         const staffFields = [
//           "surgeon_id", "assistant1_id", "assistant2_id",
//           "anaesthetist1_id", "anaesthetist2_id",
//           "scrub_practitioner_id", "anaesthetic_technician_id",
//           "circulator_id", "supervised_by_id"
//         ];
//         staffFields.forEach(field => {
//           if (normalizedData[field] !== null && normalizedData[field] !== undefined) {
//             normalizedData[field] = normalizedData[field].toString();
//           } else {
//             normalizedData[field] = "0"; // Default to NONE=0
//           }
//         });
//         setFormData({ ...initialFormData, ...normalizedData });
//       }
//     } catch (error) {
//       console.warn("No existing operative note found.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleChange = (
//     e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
//   ) => {
//     const { name, value, type } = e.target;
//     if (type === "checkbox") {
//       const checked = (e.target as HTMLInputElement).checked;
//       setFormData((prev: any) => ({ ...prev, [name]: checked }));
//     } else {
//       setFormData((prev: any) => ({ ...prev, [name]: value }));
//     }
//   };

//   const handleClearStaff = (field: string) => {
//     setFormData((prev: any) => ({ ...prev, [field]: "0" }));
//   };

//   const handleSave = async (complete: boolean = false) => {
//     setSaving(true);
//     try {
//       const payload = {
//         ...formData,
//         ot_case_id: surgery.id,
//       };

//       if (complete && !payload.surgeon_signature) {
//          notify("Surgeon signature is required to complete the note.", "error");
//          setSaving(false);
//          return;
//       }

//       if (formData.id || formData.ot_case_id) {
//         await otService.updateOperativeNote(payload);
//       } else {
//         await otService.createOperativeNote(payload);
//       }

//       notify(`Operative Note ${complete ? "completed" : "saved"} successfully`, "success");
//       if (complete && onComplete) {
//         onComplete();
//         onClose();
//       }
//     } catch (error: any) {
//       const msg = error.response?.data?.message || error.message || "Failed to save operative note";
//       notify(msg, "error");
//     } finally {
//       setSaving(false);
//     }
//   };

//   const toggleFullscreen = () => {
//     if (!document.fullscreenElement) containerRef.current?.requestFullscreen().catch(() => {});
//     else document.exitFullscreen();
//   };

//   useEffect(() => {
//     const handler = () => setIsFullscreen(!!document.fullscreenElement);
//     document.addEventListener("fullscreenchange", handler);
//     return () => document.removeEventListener("fullscreenchange", handler);
//   }, []);

//   if (!isOpen) return null;

//   // ==========================================
//   // 2. Security Check: Determine if the user has edit rights
//   // ==========================================
  
//   // Safely extract the logged-in user's ID
//   let activeUserId = localStorage.getItem("user_id") || localStorage.getItem("userId") || "";
//   const activeUserString = localStorage.getItem("user");
  
//   if (!activeUserId && activeUserString) {
//     try {
//       const parsedUser = JSON.parse(activeUserString);
//       activeUserId = parsedUser?.id?.toString() || parsedUser?.user_id?.toString() || "";
//     } catch (e) {
//       console.warn("Failed to parse user from localStorage");
//     }
//   }
//   activeUserId = activeUserId?.toString();

//   const isExistingNote = Boolean(formData.id);
//   const noteAuthor = formData.author_id?.toString();
//   const noteCreator = formData.created_by?.toString();
//   const noteSigner = formData.surgeon_signed_by?.toString();
  
//   // Lock the form if it's an existing note AND the current user doesn't match the author, creator, or signer.
//   const canEdit = !isExistingNote || (
//     activeUserId !== "" && (
//       activeUserId === noteAuthor || 
//       activeUserId === noteCreator || 
//       activeUserId === noteSigner
//     )
//   );


//   // if (!isOpen) return null;

//   // // 2. Security Check: Determine if the user has edit rights
//   // const isExistingNote = !!formData.id;
//   // const isAuthor = isExistingNote && (
//   //   formData.created_by?.toString() === currentUserId || 
//   //   formData.author_id?.toString() === currentUserId
//   // );
//   // // Allow edit if it's a new note, OR if it exists and the current user is the author.
//   // const canEdit = !isExistingNote || isAuthor;

//   return (
//     <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
//       <div ref={containerRef} className="bg-slate-50 rounded-xl shadow-2xl w-[98vw] max-w-[1920px] h-[95vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
//         {/* Modern Header matching Perfusion */}
//         <div className="bg-[#2A157c] px-6 py-3 border-b border-[#312e81] flex justify-between items-center shrink-0">
//           <div className="flex items-center gap-4">
//             <div className="relative w-[150px] h-[40px] flex items-center px-2">
//                <img src="/assets/logo-nobg.png" alt="Logo" className="object-contain w-full h-full" />
//             </div>
//             <div className="border-l border-indigo-800 pl-4">
//               <h2 className="text-white font-bold text-lg flex items-center gap-2 tracking-wide">
//                 <FileText className="text-brand-primary" size={20} /> Operative Note
//                 {loading && <Loader2 size={16} className="animate-spin text-brand-primary" />}
//               </h2>
//               <p className="text-indigo-200 text-xs mt-0.5">
//                 MRN: {surgery.mrn} |  FULLNAME: {surgery.first_name} {surgery.last_name} |  GENDER: {surgery.gender} | AGE: {surgery.age} | {surgery.surgery_name}  |  WEIGHT: {surgery.weight} | HEIGHT: {surgery.height} |  BMI: {surgery.bmi}  |  ALLERGIES: {surgery.known_allergies} 
//               </p>
//             </div>
//           </div>
//           <div className="flex items-center gap-3">
//             <button
//               onClick={() => window.open(`/print/operative-note/${surgery.id}`, '_blank')}
//               className="px-4 py-2 text-xs rounded font-bold text-white bg-white/10 border border-white/20 hover:bg-white/20 transition-colors flex items-center gap-2"
//             >
//               <Printer size={16} /> Print
//             </button>
//             <div className="h-8 w-px bg-indigo-800 mx-1"></div>
//             <button onClick={toggleFullscreen} className="p-2 text-indigo-200 hover:text-white hover:bg-white/10 rounded transition-colors">
//               {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
//             </button>
//             <button onClick={onClose} className="p-2 text-indigo-200 hover:text-red-400 hover:bg-white/10 rounded transition-colors">
//               <X size={24} />
//             </button>
//           </div>
//         </div>

//         {/* Main Scrolling Body */}
//         <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-slate-100/50 relative">
//           {loading ? (
//             <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-white/70 backdrop-blur-sm transition-all">
//               <Loader2 size={64} className="animate-spin text-[#1e1b4b] mb-4" />
//               <h3 className="text-2xl font-black text-[#1e1b4b] tracking-tight animate-pulse">Loading Operative Note...</h3>
//             </div>
//           ) : (
//             <div className="max-w-6xl mx-auto space-y-8 pb-12">
              
//               {/* Part 1: Operation Details */}
//               <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
//                 <div className="flex items-center gap-2 border-b pb-3">
//                   <div className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-black">1</div> 
//                   <h4 className="font-bold text-slate-800 uppercase tracking-wider text-sm flex items-center gap-2"><Activity size={16}/> Operation Details</h4>
//                 </div>
//                 <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
//                   <div>
//                     <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Date of Operation</label>
//                     <input type="date" disabled={!canEdit} name="operation_date" value={formData.operation_date} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-500" />
//                   </div>
//                   <div>
//                     <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Start Time</label>
//                     <input type="time" disabled={!canEdit} name="start_time" value={formData.start_time} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-500" />
//                   </div>
//                   <div>
//                     <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">End Time</label>
//                     <input type="time" disabled={!canEdit} name="end_time" value={formData.end_time} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-500" />
//                   </div>
//                   <div>
//                     <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Procedure Type</label>
//                     <select name="procedure_type" disabled={!canEdit} value={formData.procedure_type} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium disabled:bg-slate-50 disabled:text-slate-500">
//                       <option value="Elective">Elective</option>
//                       <option value="Emergency">Emergency</option>
//                     </select>
//                   </div>
//                   <div className="col-span-2">
//                     <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Anaesthesia Type</label>
//                     <select name="anesthesia_type" disabled={!canEdit} value={formData.anesthesia_type} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-500">
//                       <option value="">Select...</option>
//                       <option value="General (GA)">General (GA)</option>
//                       <option value="Local (LA)">Local (LA)</option>
//                       <option value="Regional-Spinal">Regional - Spinal</option>
//                       <option value="Regional-Epidural">Regional - Epidural</option>
//                       <option value="Regional-Caudal">Regional - Caudal</option>
//                       <option value="Combined Spinal & Epidural (CSE)">Combined Spinal & Epidural (CSE)</option>
//                       <option value="Sedation-with-anaesthetist">Sedation - with anaesthetist</option>
//                       <option value="Sedation-no-anaesthetist">Sedation - no anaesthetist</option>
//                       <option value="No anaesthesia">No anaesthesia</option>
//                       <option value="Other">Other</option>
//                     </select>
//                   </div>
//                   <div className="col-span-2">
//                     <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Local Anaesthetic / Drugs</label>
//                     <input type="text" disabled={!canEdit} name="anesthetic_drugs" value={formData.anesthetic_drugs} onChange={handleChange} placeholder="Agent, concentration, volume, total dose" className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-500" />
//                   </div>
//                 </div>
//               </div>

//               {/* Part 2: Performed By */}
//               <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
//                 <div className="flex items-center gap-2 border-b pb-3">
//                   <div className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-black">2</div> 
//                   <h4 className="font-bold text-slate-800 uppercase tracking-wider text-sm flex items-center gap-2"><UserCircle size={16}/> Performed By (Personnel)</h4>
//                 </div>
//                 <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
//                   {[
//                     { id: "surgeon_id", label: "Surgeon", Component: SearchableDoctorSelect },
//                     { id: "assistant1_id", label: "Assistant 1", Component: SearchableDoctorSelect },
//                     { id: "assistant2_id", label: "Assistant 2", Component: SearchableDoctorSelect },
//                     { id: "anaesthetist1_id", label: "Anaesthetist 1", Component: SearchableUserSelect },
//                     { id: "anaesthetist2_id", label: "Anaesthetist 2", Component: SearchableUserSelect },
//                     { id: "scrub_practitioner_id", label: "Scrub Practitioner", Component: SearchableUserSelect },
//                     { id: "anaesthetic_technician_id", label: "Anaesthetic Technician", Component: SearchableUserSelect },
//                     { id: "circulator_id", label: "Circulator", Component: SearchableUserSelect },
//                     { id: "supervised_by_id", label: "Supervised By", Component: SearchableUserSelect },
//                   ].map((staff) => (
//                     <div key={staff.id}>
//                       <div className="flex justify-between items-end mb-1">
//                         <label className="block text-[10px] font-bold text-slate-500 uppercase">{staff.label}</label>
//                         {formData[staff.id] !== "0" && canEdit && (
//                            <button type="button" onClick={() => handleClearStaff(staff.id)} className="text-[10px] font-bold text-red-500 hover:text-red-700 bg-red-50 px-1.5 py-0.5 rounded">Set to None</button>
//                         )}
//                       </div>

//                         <staff.Component
//                           value={formData[staff.id] === "0" ? "" : formData[staff.id]}
//                           onChange={(val: any) => setFormData({ ...formData, [staff.id]: val || "0" })}
//                           placeholder={`Select ${staff.label}`}
//                         />
                        
//                       {/* <staff.Component
//                         disabled={!canEdit}
//                         value={formData[staff.id] === "0" ? "" : formData[staff.id]}
//                         onChange={(val: any) => setFormData({ ...formData, [staff.id]: val || "0" })}
//                         placeholder={`Select ${staff.label}`}
//                       /> */}
//                     </div>
//                   ))}
//                   <div>
//                     <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Supervision Level</label>
//                     <select name="supervision_level" disabled={!canEdit} value={formData.supervision_level} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-500">
//                       <option value="Independent">Independent</option>
//                       <option value="Direct">Direct</option>
//                       <option value="Indirect">Indirect</option>
//                     </select>
//                   </div>
//                 </div>
//               </div>

//               {/* Part 3: Procedure & Diagnosis */}
//               <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
//                 <div className="flex items-center gap-2 border-b pb-3">
//                   <div className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-black">3</div> 
//                   <h4 className="font-bold text-slate-800 uppercase tracking-wider text-sm flex items-center gap-2"><Stethoscope size={16}/> Procedure(s) & Operative Diagnosis</h4>
//                 </div>
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
//                   <div>
//                     <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Pre-Operative Diagnosis</label>
//                     <input type="text" disabled={!canEdit} name="preop_diagnosis" value={formData.preop_diagnosis} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-500" />
//                   </div>
//                   <div>
//                     <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Operative Diagnosis (Post-Op)</label>
//                     <input type="text" disabled={!canEdit} name="postop_diagnosis" value={formData.postop_diagnosis} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-500" />
//                   </div>
//                   <div className="md:col-span-2">
//                     <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Procedure(s) Performed (List all; primary first)</label>
//                     <textarea rows={3} disabled={!canEdit} name="procedures_performed" value={formData.procedures_performed} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-y disabled:bg-slate-50 disabled:text-slate-500" />
//                   </div>
//                 </div>
//               </div>

//               {/* Part 4: Operative Narrative */}
//               <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
//                 <div className="flex items-center gap-2 border-b pb-3">
//                   <div className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-black">4</div> 
//                   <h4 className="font-bold text-slate-800 uppercase tracking-wider text-sm">Operative Narrative</h4>
//                 </div>
//                 <div className="space-y-4">
//                   <div>
//                     <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Operative Indication</label>
//                     <textarea rows={2} disabled={!canEdit} name="operative_indication" value={formData.operative_indication} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-y disabled:bg-slate-50 disabled:text-slate-500" />
//                   </div>
//                   <div>
//                     <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Operative Findings</label>
//                     <textarea rows={3} disabled={!canEdit} name="operative_findings" value={formData.operative_findings} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-y disabled:bg-slate-50 disabled:text-slate-500" />
//                   </div>
//                   <div>
//                     <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Operative Procedure — Step by Step</label>
//                     <textarea rows={6} disabled={!canEdit} name="operative_procedure_steps" value={formData.operative_procedure_steps} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-y disabled:bg-slate-50 disabled:text-slate-500" />
//                   </div>
//                   <div>
//                     <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Closure Technique (Layers, suture material, skin)</label>
//                     <textarea rows={2} disabled={!canEdit} name="closure_technique" value={formData.closure_technique} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-y disabled:bg-slate-50 disabled:text-slate-500" />
//                   </div>
//                 </div>
//               </div>

//               {/* Part 5: Intra-Op Adjuncts, Drugs & Specimens */}
//               <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
//                 <div className="flex items-center gap-2 border-b pb-3">
//                   <div className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-black">5</div> 
//                   <h4 className="font-bold text-slate-800 uppercase tracking-wider text-sm flex items-center gap-2"><Syringe size={16}/> Intra-Operative Adjuncts, Drugs & Specimens</h4>
//                 </div>
                
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
//                   {/* Adjuncts Left Column */}
//                   <div className="space-y-4">
//                     <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
//                       <label className="flex items-center gap-3 cursor-pointer">
//                         <input type="checkbox" disabled={!canEdit} name="drains_present" checked={formData.drains_present} onChange={handleChange} className="w-4 h-4 accent-indigo-600 rounded disabled:opacity-50" />
//                         <span className="text-sm font-bold text-slate-700">Drains Present</span>
//                       </label>
//                       {formData.drains_present && (
//                         <input type="text" disabled={!canEdit} name="drains_details" value={formData.drains_details} onChange={handleChange} placeholder="Type, site & number" className="w-full mt-2 p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-500" />
//                       )}
//                     </div>
//                     <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
//                       <label className="flex items-center gap-3 cursor-pointer">
//                         <input type="checkbox" disabled={!canEdit} name="tourniquet_used" checked={formData.tourniquet_used} onChange={handleChange} className="w-4 h-4 accent-indigo-600 rounded disabled:opacity-50" />
//                         <span className="text-sm font-bold text-slate-700">Tourniquet Used</span>
//                       </label>
//                       {formData.tourniquet_used && (
//                         <div className="grid grid-cols-3 gap-2 mt-2">
//                           <div><label className="text-[9px] font-bold text-slate-400 uppercase">Site</label><input type="text" disabled={!canEdit} name="tourniquet_site" value={formData.tourniquet_site} onChange={handleChange} className="w-full p-1.5 border border-slate-300 rounded text-sm outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500" /></div>
//                           <div><label className="text-[9px] font-bold text-slate-400 uppercase">Pressure</label><input type="number" disabled={!canEdit} name="tourniquet_pressure" value={formData.tourniquet_pressure} onChange={handleChange} className="w-full p-1.5 border border-slate-300 rounded text-sm outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500" /></div>
//                           <div><label className="text-[9px] font-bold text-slate-400 uppercase">Duration (m)</label><input type="number" disabled={!canEdit} name="tourniquet_duration" value={formData.tourniquet_duration} onChange={handleChange} className="w-full p-1.5 border border-slate-300 rounded text-sm outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500" /></div>
//                         </div>
//                       )}
//                     </div>
//                     <div className="grid grid-cols-2 gap-4">
//                       <div>
//                         <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Estimated Blood Loss (mL)</label>
//                         <input type="number" disabled={!canEdit} name="estimated_blood_loss" value={formData.estimated_blood_loss} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-500" />
//                       </div>
//                       <div>
//                         <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Blood Products (Units)</label>
//                         <input type="text" disabled={!canEdit} name="blood_products" value={formData.blood_products} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-500" />
//                       </div>
//                     </div>
//                   </div>

//                   {/* Drugs & Prophylaxis Right Column */}
//                   <div className="space-y-4">
//                     <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
//                       <label className="flex items-center gap-3 cursor-pointer">
//                         <input type="checkbox" disabled={!canEdit} name="antibiotic_prophylaxis" checked={formData.antibiotic_prophylaxis} onChange={handleChange} className="w-4 h-4 accent-indigo-600 rounded disabled:opacity-50" />
//                         <span className="text-sm font-bold text-slate-700">Antibiotic Prophylaxis Given</span>
//                       </label>
//                       {formData.antibiotic_prophylaxis && (
//                         <input type="text" disabled={!canEdit} name="antibiotic_agent" value={formData.antibiotic_agent} onChange={handleChange} placeholder="Agent, dose, route & time" className="w-full mt-2 p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-500" />
//                       )}
//                     </div>
//                     <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
//                        <label className="block text-[10px] font-bold text-slate-500 uppercase">DVT Prophylaxis</label>
//                        <select name="dvt_prophylaxis" disabled={!canEdit} value={formData.dvt_prophylaxis} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-500">
//                           <option value="None">None</option>
//                           <option value="Mechanical">Mechanical</option>
//                           <option value="Pharmacological">Pharmacological</option>
//                           <option value="Both">Both</option>
//                        </select>
//                        {formData.dvt_prophylaxis !== "None" && (
//                           <input type="text" disabled={!canEdit} name="dvt_details" value={formData.dvt_details} onChange={handleChange} placeholder="Details (TED stockings, LMWH dose, etc.)" className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-500" />
//                        )}
//                     </div>
//                     <div>
//                       <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Fluids Given (Type/Volume)</label>
//                       <input type="text" disabled={!canEdit} name="fluids_given" value={formData.fluids_given} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-500" />
//                     </div>
//                   </div>
                  
//                   {/* Specimens Span Full */}
//                   <div className="col-span-1 md:col-span-2 p-4 bg-indigo-50 border border-indigo-100 rounded-lg">
//                     <h5 className="font-bold text-indigo-900 text-xs mb-3 uppercase tracking-wide">Specimens</h5>
//                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//                        <div>
//                           <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Sent To</label>
//                           <select name="specimens_sent_to" disabled={!canEdit} value={formData.specimens_sent_to} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white disabled:bg-slate-50 disabled:text-slate-500">
//                             <option value="">Select...</option>
//                             <option value="Histology">Histology</option>
//                             <option value="Microbiology">Microbiology</option>
//                             <option value="Cytology">Cytology</option>
//                             <option value="Frozen section">Frozen section</option>
//                             <option value="Disposed of">Disposed of</option>
//                             <option value="Other">Other</option>
//                           </select>
//                        </div>
//                        <div className="md:col-span-2">
//                           <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Description & Labelling</label>
//                           <input type="text" disabled={!canEdit} name="specimen_description" value={formData.specimen_description} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white disabled:bg-slate-50 disabled:text-slate-500" placeholder="Pots numbered, request form completed..." />
//                        </div>
//                     </div>
//                   </div>
//                 </div>
//               </div>

//               {/* Part 6: Outcome & Post-Op */}
//               <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
//                 <div className="flex items-center gap-2 border-b pb-3">
//                   <div className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-black">6</div> 
//                   <h4 className="font-bold text-slate-800 uppercase tracking-wider text-sm">Outcome & Post-Operative Plan</h4>
//                 </div>
                
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-4">
//                   <div>
//                     <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Outcome</label>
//                     <select name="outcome" disabled={!canEdit} value={formData.outcome} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold disabled:bg-slate-50 disabled:text-slate-500">
//                       <option value="Uncomplicated">Uncomplicated</option>
//                       <option value="Complicated">Complicated</option>
//                     </select>
//                   </div>
//                   <div>
//                     <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Patient Condition Leaving Theatre</label>
//                     <input type="text" disabled={!canEdit} name="patient_condition_leaving" value={formData.patient_condition_leaving} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-500" />
//                   </div>
//                   {formData.outcome === "Complicated" && (
//                     <div className="md:col-span-2 bg-red-50 p-3 border border-red-200 rounded-lg">
//                       <label className="block text-[10px] font-bold text-red-700 uppercase mb-1">Describe Complication, Actions & Persons Informed</label>
//                       <textarea rows={2} disabled={!canEdit} name="complications" value={formData.complications} onChange={handleChange} className="w-full p-2 border border-red-300 rounded text-sm focus:ring-2 focus:ring-red-500 outline-none resize-y disabled:bg-red-50 disabled:text-slate-500" />
//                     </div>
//                   )}
//                 </div>

//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-slate-100">
//                   <div>
//                     <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Transfer To</label>
//                     <select name="transfer_to" disabled={!canEdit} value={formData.transfer_to} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-500">
//                       <option value="Recovery">Recovery / PACU</option>
//                       <option value="HDU">HDU</option>
//                       <option value="ICU">ICU</option>
//                       <option value="Ward">Ward</option>
//                       <option value="Day-case discharge">Day-case discharge</option>
//                       <option value="Other">Other</option>
//                     </select>
//                   </div>
//                   <div>
//                     <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Destination Ward / Unit</label>
//                     <input type="text" disabled={!canEdit} name="destination_ward" value={formData.destination_ward} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-500" />
//                   </div>
//                   <div className="md:col-span-2">
//                     <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Post-Operative Instructions (Observations, position, NBM/diet, drains)</label>
//                     <textarea rows={3} disabled={!canEdit} name="postop_instructions" value={formData.postop_instructions} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-y disabled:bg-slate-50 disabled:text-slate-500" />
//                   </div>
//                   <div className="md:col-span-2">
//                     <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">New Medications Requested (Drug, dose, route, duration)</label>
//                     <textarea rows={2} disabled={!canEdit} name="new_medications" value={formData.new_medications} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-y disabled:bg-slate-50 disabled:text-slate-500" />
//                   </div>
//                   <div className="md:col-span-2">
//                     <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Discharge Instructions (If applicable)</label>
//                     <textarea rows={2} disabled={!canEdit} name="discharge_instructions" value={formData.discharge_instructions} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-y disabled:bg-slate-50 disabled:text-slate-500" />
//                   </div>
//                   <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
//                      <div>
//                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Follow-up Clinic Date</label>
//                        <input type="date" disabled={!canEdit} name="followup_clinic_date" value={formData.followup_clinic_date} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-500" />
//                      </div>
//                      <div>
//                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Suture/Staple Removal</label>
//                        <input type="date" disabled={!canEdit} name="suture_removal_date" value={formData.suture_removal_date} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-500" />
//                      </div>
//                      <div>
//                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Histology Follow-up Plan</label>
//                        <input type="text" disabled={!canEdit} name="histology_followup" value={formData.histology_followup} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-500" />
//                      </div>
//                   </div>
//                 </div>
//               </div>

//               {/* Part 7: Signatures Block */}
//               <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
//                 <div className="flex items-center gap-2 border-b pb-3">
//                   <div className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-black">7</div> 
//                   <h4 className="font-bold text-slate-800 uppercase tracking-wider text-sm flex items-center gap-2"><FileSignature size={16}/> Signatures & Certification</h4>
//                 </div>
                
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
//                   <div className="border border-slate-300 rounded-lg p-4 relative bg-slate-50/50">
//                     <h5 className="text-xs font-bold text-slate-700 uppercase mb-4 border-b border-slate-200 pb-2">Primary Surgeon / Operator</h5>
//                     <div className="h-40 bg-white border-2 border-dashed border-slate-300 rounded-lg mb-4 relative overflow-hidden flex items-center justify-center">
//                       {formData.surgeon_signature ? (
//                         <>
//                           <img src={formData.surgeon_signature} alt="Primary Surgeon Signature" className="max-h-full max-w-full object-contain p-2" />
//                           {canEdit && (
//                             <button onClick={() => setFormData({...formData, surgeon_signature: null})} className="absolute top-2 right-2 p-1.5 bg-red-100 text-red-600 rounded shadow hover:bg-red-200 transition-colors"><Trash2 size={16}/></button>
//                           )}
//                         </>
//                       ) : (
//                         canEdit ? (
//                           <SignaturePad onEnd={(d: any) => setFormData({...formData, surgeon_signature: d})} className="w-full h-full" />
//                         ) : (
//                           <span className="text-slate-400 font-bold uppercase text-xs">No Signature Available</span>
//                         )
//                       )}
//                       {!formData.surgeon_signature && canEdit && <span className="absolute pointer-events-none text-slate-300 font-bold uppercase tracking-widest flex flex-col items-center gap-2"><FileSignature size={24}/> Sign Here</span>}
//                     </div>
//                   </div>
//                 </div>
//               </div>

//             </div>
//           )}
//         </div>

//         {/* Action Footer */}
//         <div className="bg-white px-6 py-4 border-t border-slate-200 flex justify-end gap-3 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
//           <button onClick={onClose} disabled={saving} className="px-6 py-2.5 rounded-lg font-bold text-slate-600 hover:bg-slate-100 transition-colors">
//             {canEdit ? "Cancel" : "Close"}
//           </button>
          
//           {/* Conditionally render save buttons based on authorization logic */}
//           {canEdit && (
//             <>
//               <button onClick={() => handleSave(false)} disabled={saving} className="px-6 py-2.5 rounded-lg font-bold text-brand-primary bg-brand-primary/10 hover:bg-brand-primary/20 transition-all flex items-center gap-2">
//                 {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Save Draft
//               </button>
//               <button onClick={() => handleSave(true)} disabled={saving} className="px-8 py-2.5 rounded-lg font-bold text-white bg-brand-primary hover:bg-brand-active0 shadow-lg transition-all flex items-center gap-2 disabled:opacity-50">
//                 {saving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />} Sign & Complete Note
//               </button>
//             </>
//           )}
//         </div>

//       </div>
//     </div>
//   );
// };

// export default OperativeNoteModal;



// import React, { useState, useEffect, useRef } from "react";
// import {
//   X,
//   Save,
//   Printer,
//   CheckCircle,
//   Loader2,
//   FileText,
//   Maximize2,
//   Minimize2,
//   Trash2,
//   Activity,
//   UserCircle,
//   Stethoscope,
//   Syringe,
//   FileSignature
// } from "lucide-react";
// import { otService, OTSurgery } from "../services/ot.service";
// import { useNotification } from "../context/NotificationContext";
// import SearchableDoctorSelect from "./shared/SearchableDoctorSelect";
// import SearchableUserSelect from "./shared/SearchableUserSelect";
// import SignaturePad from "./SignaturePad";

// interface OperativeNoteModalProps {
//   isOpen: boolean;
//   onClose: () => void;
//   surgery: OTSurgery;
//   onComplete?: () => void;
//   onBackToActions?: () => void;
// }

// const initialFormData = {
//   operation_date: "",
//   start_time: "",
//   end_time: "",
//   procedure_type: "Elective",
//   anesthesia_type: "",
//   anesthetic_drugs: "",

//   surgeon_id: "0",
//   assistant1_id: "0",
//   assistant2_id: "0",
//   anaesthetist1_id: "0",
//   anaesthetist2_id: "0",
//   scrub_practitioner_id: "0",
//   anaesthetic_technician_id: "0",
//   circulator_id: "0",
//   supervised_by_id: "0",
//   supervision_level: "Independent",

//   procedures_performed: "",
//   preop_diagnosis: "",
//   postop_diagnosis: "",

//   operative_indication: "",
//   operative_findings: "",
//   operative_procedure_steps: "",
//   closure_technique: "",

//   drains_present: false,
//   drains_details: "",
//   tourniquet_used: false,
//   tourniquet_site: "",
//   tourniquet_pressure: "",
//   tourniquet_duration: "",
//   estimated_blood_loss: "",
//   fluids_given: "",
//   blood_products: "",

//   antibiotic_prophylaxis: false,
//   antibiotic_agent: "",
//   dvt_prophylaxis: "None",
//   dvt_details: "",
//   other_drugs: "",

//   specimens: "",
//   specimens_sent_to: "",
//   specimen_description: "",

//   outcome: "Uncomplicated",
//   complications: "",
//   patient_condition_leaving: "",

//   transfer_to: "Recovery",
//   destination_ward: "",
//   postop_instructions: "",
//   new_medications: "",
//   discharge_instructions: "",
//   followup_clinic_date: "",
//   suture_removal_date: "",
//   histology_followup: "",

//   surgeon_signature: null,
// };

// const OperativeNoteModal: React.FC<OperativeNoteModalProps> = ({
//   isOpen,
//   onClose,
//   surgery,
//   onComplete,
//   onBackToActions,
// }) => {
//   const { notify } = useNotification();
//   const [formData, setFormData] = useState<any>(initialFormData);
//   const [loading, setLoading] = useState(false);
//   const [saving, setSaving] = useState(false);

//   const [isFullscreen, setIsFullscreen] = useState(false);
//   const containerRef = useRef<HTMLDivElement>(null);

//   useEffect(() => {
//     if (isOpen && surgery) {
//       const today = new Date().toISOString().split("T")[0];
//       setFormData((prev: any) => ({
//         ...prev,
//         operation_date: today,
//         preop_diagnosis: surgery.diagnosis || "",
//         procedures_performed: surgery.surgery_name || "",
//       }));
//       fetchExistingNote();
//     }
//   }, [isOpen, surgery]);

//   const fetchExistingNote = async () => {
//     setLoading(true);
//     try {
//       const existingData = await otService.getOperativeNote(surgery.id);
//       if (existingData && (existingData.ot_case_id || existingData.id)) {
//         // Normalize IDs to strings for the dropdowns, preserving "0" for None
//         const normalizedData = { ...existingData };
//         const staffFields = [
//           "surgeon_id", "assistant1_id", "assistant2_id",
//           "anaesthetist1_id", "anaesthetist2_id",
//           "scrub_practitioner_id", "anaesthetic_technician_id",
//           "circulator_id", "supervised_by_id"
//         ];
//         staffFields.forEach(field => {
//           if (normalizedData[field] !== null && normalizedData[field] !== undefined) {
//             normalizedData[field] = normalizedData[field].toString();
//           } else {
//             normalizedData[field] = "0"; // Default to NONE=0
//           }
//         });
//         setFormData({ ...initialFormData, ...normalizedData });
//       }
//     } catch (error) {
//       console.warn("No existing operative note found.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleChange = (
//     e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
//   ) => {
//     const { name, value, type } = e.target;
//     if (type === "checkbox") {
//       const checked = (e.target as HTMLInputElement).checked;
//       setFormData((prev: any) => ({ ...prev, [name]: checked }));
//     } else {
//       setFormData((prev: any) => ({ ...prev, [name]: value }));
//     }
//   };

//   const handleClearStaff = (field: string) => {
//     setFormData((prev: any) => ({ ...prev, [field]: "0" }));
//   };

//   const handleSave = async (complete: boolean = false) => {
//     setSaving(true);
//     try {
//       const payload = {
//         ...formData,
//         ot_case_id: surgery.id,
//       };

//       if (complete && !payload.surgeon_signature) {
//          notify("Surgeon signature is required to complete the note.", "error");
//          setSaving(false);
//          return;
//       }

//       if (formData.id || formData.ot_case_id) {
//         await otService.updateOperativeNote(payload);
//       } else {
//         await otService.createOperativeNote(payload);
//       }

//       notify(`Operative Note ${complete ? "completed" : "saved"} successfully`, "success");
//       if (complete && onComplete) {
//         onComplete();
//         onClose();
//       }
//     } catch (error: any) {
//       const msg = error.response?.data?.message || error.message || "Failed to save operative note";
//       notify(msg, "error");
//     } finally {
//       setSaving(false);
//     }
//   };

//   const toggleFullscreen = () => {
//     if (!document.fullscreenElement) containerRef.current?.requestFullscreen().catch(() => {});
//     else document.exitFullscreen();
//   };

//   useEffect(() => {
//     const handler = () => setIsFullscreen(!!document.fullscreenElement);
//     document.addEventListener("fullscreenchange", handler);
//     return () => document.removeEventListener("fullscreenchange", handler);
//   }, []);

//   if (!isOpen) return null;

//   return (
//     <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
//       <div ref={containerRef} className="bg-slate-50 rounded-xl shadow-2xl w-[98vw] max-w-[1920px] h-[95vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
//         {/* Modern Header matching Perfusion */}
//         <div className="bg-[#2A157c] px-6 py-3 border-b border-[#312e81] flex justify-between items-center shrink-0">
//           <div className="flex items-center gap-4">
//             <div className="relative w-[150px] h-[40px] flex items-center px-2">
//                <img src="/assets/logo-nobg.png" alt="Logo" className="object-contain w-full h-full" />
//             </div>
//             <div className="border-l border-indigo-800 pl-4">
//               <h2 className="text-white font-bold text-lg flex items-center gap-2 tracking-wide">
//                 <FileText className="text-brand-primary" size={20} /> Operative Note
//                 {loading && <Loader2 size={16} className="animate-spin text-brand-primary" />}
//               </h2>
//               <p className="text-indigo-200 text-xs mt-0.5">
//                 MRN: {surgery.mrn} |  FULLNAME: {surgery.first_name} {surgery.last_name} |  GENDER: {surgery.gender} | AGE: {surgery.age} | {surgery.surgery_name}  |  WEIGHT: {surgery.weight} | HEIGHT: {surgery.height} |  BMI: {surgery.bmi}  |  ALLERGIES: {surgery.known_allergies} 
//               </p>
//             </div>
//           </div>
//           <div className="flex items-center gap-3">
//             <button
//               onClick={() => window.open(`/print/operative-note/${surgery.id}`, '_blank')}
//               className="px-4 py-2 text-xs rounded font-bold text-white bg-white/10 border border-white/20 hover:bg-white/20 transition-colors flex items-center gap-2"
//             >
//               <Printer size={16} /> Print
//             </button>
//             <div className="h-8 w-px bg-indigo-800 mx-1"></div>
//             <button onClick={toggleFullscreen} className="p-2 text-indigo-200 hover:text-white hover:bg-white/10 rounded transition-colors">
//               {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
//             </button>
//             <button onClick={onClose} className="p-2 text-indigo-200 hover:text-red-400 hover:bg-white/10 rounded transition-colors">
//               <X size={24} />
//             </button>
//           </div>
//         </div>

//         {/* Main Scrolling Body */}
//         <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-slate-100/50 relative">
//           {loading ? (
//             <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-white/70 backdrop-blur-sm transition-all">
//               <Loader2 size={64} className="animate-spin text-[#1e1b4b] mb-4" />
//               <h3 className="text-2xl font-black text-[#1e1b4b] tracking-tight animate-pulse">Loading Operative Note...</h3>
//             </div>
//           ) : (
//             <div className="max-w-6xl mx-auto space-y-8 pb-12">
              
//               {/* Part 1: Operation Details */}
//               <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
//                 <div className="flex items-center gap-2 border-b pb-3">
//                   <div className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-black">1</div> 
//                   <h4 className="font-bold text-slate-800 uppercase tracking-wider text-sm flex items-center gap-2"><Activity size={16}/> Operation Details</h4>
//                 </div>
//                 <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
//                   <div>
//                     <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Date of Operation</label>
//                     <input type="date" name="operation_date" value={formData.operation_date} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
//                   </div>
//                   <div>
//                     <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Start Time</label>
//                     <input type="time" name="start_time" value={formData.start_time} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
//                   </div>
//                   <div>
//                     <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">End Time</label>
//                     <input type="time" name="end_time" value={formData.end_time} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
//                   </div>
//                   <div>
//                     <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Procedure Type</label>
//                     <select name="procedure_type" value={formData.procedure_type} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium">
//                       <option value="Elective">Elective</option>
//                       <option value="Emergency">Emergency</option>
//                     </select>
//                   </div>
//                   <div className="col-span-2">
//                     <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Anaesthesia Type</label>
//                     <select name="anesthesia_type" value={formData.anesthesia_type} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
//                       <option value="">Select...</option>
//                       <option value="General (GA)">General (GA)</option>
//                       <option value="Local (LA)">Local (LA)</option>
//                       <option value="Regional-Spinal">Regional - Spinal</option>
//                       <option value="Regional-Epidural">Regional - Epidural</option>
//                       <option value="Regional-Caudal">Regional - Caudal</option>
//                       <option value="Combined Spinal & Epidural (CSE)">Combined Spinal & Epidural (CSE)</option>
//                       <option value="Sedation-with-anaesthetist">Sedation - with anaesthetist</option>
//                       <option value="Sedation-no-anaesthetist">Sedation - no anaesthetist</option>
//                       <option value="No anaesthesia">No anaesthesia</option>
//                       <option value="Other">Other</option>
//                     </select>
//                   </div>
//                   <div className="col-span-2">
//                     <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Local Anaesthetic / Drugs</label>
//                     <input type="text" name="anesthetic_drugs" value={formData.anesthetic_drugs} onChange={handleChange} placeholder="Agent, concentration, volume, total dose" className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
//                   </div>
//                 </div>
//               </div>

//               {/* Part 2: Performed By */}
//               <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
//                 <div className="flex items-center gap-2 border-b pb-3">
//                   <div className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-black">2</div> 
//                   <h4 className="font-bold text-slate-800 uppercase tracking-wider text-sm flex items-center gap-2"><UserCircle size={16}/> Performed By (Personnel)</h4>
//                 </div>
//                 <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
//                   {/* Mapping through Staff selection with quick Clear functionality */}
//                   {[
//                     { id: "surgeon_id", label: "Surgeon", Component: SearchableDoctorSelect },
//                     { id: "assistant1_id", label: "Assistant 1", Component: SearchableDoctorSelect },
//                     { id: "assistant2_id", label: "Assistant 2", Component: SearchableDoctorSelect },
//                     { id: "anaesthetist1_id", label: "Anaesthetist 1", Component: SearchableUserSelect },
//                     { id: "anaesthetist2_id", label: "Anaesthetist 2", Component: SearchableUserSelect },
//                     { id: "scrub_practitioner_id", label: "Scrub Practitioner", Component: SearchableUserSelect },
//                     { id: "anaesthetic_technician_id", label: "Anaesthetic Technician", Component: SearchableUserSelect },
//                     { id: "circulator_id", label: "Circulator", Component: SearchableUserSelect },
//                     { id: "supervised_by_id", label: "Supervised By", Component: SearchableUserSelect },
//                   ].map((staff) => (
//                     <div key={staff.id}>
//                       <div className="flex justify-between items-end mb-1">
//                         <label className="block text-[10px] font-bold text-slate-500 uppercase">{staff.label}</label>
//                         {formData[staff.id] !== "0" && (
//                            <button type="button" onClick={() => handleClearStaff(staff.id)} className="text-[10px] font-bold text-red-500 hover:text-red-700 bg-red-50 px-1.5 py-0.5 rounded">Set to None</button>
//                         )}
//                       </div>
//                       <staff.Component
//                         value={formData[staff.id] === "0" ? "" : formData[staff.id]}
//                         onChange={(val: any) => setFormData({ ...formData, [staff.id]: val || "0" })}
//                         placeholder={`Select ${staff.label}`}
//                       />
//                     </div>
//                   ))}
//                   <div>
//                     <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Supervision Level</label>
//                     <select name="supervision_level" value={formData.supervision_level} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
//                       <option value="Independent">Independent</option>
//                       <option value="Direct">Direct</option>
//                       <option value="Indirect">Indirect</option>
//                     </select>
//                   </div>
//                 </div>
//               </div>

//               {/* Part 3: Procedure & Diagnosis */}
//               <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
//                 <div className="flex items-center gap-2 border-b pb-3">
//                   <div className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-black">3</div> 
//                   <h4 className="font-bold text-slate-800 uppercase tracking-wider text-sm flex items-center gap-2"><Stethoscope size={16}/> Procedure(s) & Operative Diagnosis</h4>
//                 </div>
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
//                   <div>
//                     <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Pre-Operative Diagnosis</label>
//                     <input type="text" name="preop_diagnosis" value={formData.preop_diagnosis} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
//                   </div>
//                   <div>
//                     <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Operative Diagnosis (Post-Op)</label>
//                     <input type="text" name="postop_diagnosis" value={formData.postop_diagnosis} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
//                   </div>
//                   <div className="md:col-span-2">
//                     <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Procedure(s) Performed (List all; primary first)</label>
//                     <textarea rows={3} name="procedures_performed" value={formData.procedures_performed} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-y" />
//                   </div>
//                 </div>
//               </div>

//               {/* Part 4: Operative Narrative */}
//               <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
//                 <div className="flex items-center gap-2 border-b pb-3">
//                   <div className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-black">4</div> 
//                   <h4 className="font-bold text-slate-800 uppercase tracking-wider text-sm">Operative Narrative</h4>
//                 </div>
//                 <div className="space-y-4">
//                   <div>
//                     <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Operative Indication</label>
//                     <textarea rows={2} name="operative_indication" value={formData.operative_indication} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-y" />
//                   </div>
//                   <div>
//                     <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Operative Findings</label>
//                     <textarea rows={3} name="operative_findings" value={formData.operative_findings} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-y" />
//                   </div>
//                   <div>
//                     <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Operative Procedure — Step by Step</label>
//                     <textarea rows={6} name="operative_procedure_steps" value={formData.operative_procedure_steps} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-y" />
//                   </div>
//                   <div>
//                     <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Closure Technique (Layers, suture material, skin)</label>
//                     <textarea rows={2} name="closure_technique" value={formData.closure_technique} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-y" />
//                   </div>
//                 </div>
//               </div>

//               {/* Part 5: Intra-Op Adjuncts, Drugs & Specimens */}
//               <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
//                 <div className="flex items-center gap-2 border-b pb-3">
//                   <div className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-black">5</div> 
//                   <h4 className="font-bold text-slate-800 uppercase tracking-wider text-sm flex items-center gap-2"><Syringe size={16}/> Intra-Operative Adjuncts, Drugs & Specimens</h4>
//                 </div>
                
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
//                   {/* Adjuncts Left Column */}
//                   <div className="space-y-4">
//                     <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
//                       <label className="flex items-center gap-3 cursor-pointer">
//                         <input type="checkbox" name="drains_present" checked={formData.drains_present} onChange={handleChange} className="w-4 h-4 accent-indigo-600 rounded" />
//                         <span className="text-sm font-bold text-slate-700">Drains Present</span>
//                       </label>
//                       {formData.drains_present && (
//                         <input type="text" name="drains_details" value={formData.drains_details} onChange={handleChange} placeholder="Type, site & number" className="w-full mt-2 p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
//                       )}
//                     </div>
//                     <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
//                       <label className="flex items-center gap-3 cursor-pointer">
//                         <input type="checkbox" name="tourniquet_used" checked={formData.tourniquet_used} onChange={handleChange} className="w-4 h-4 accent-indigo-600 rounded" />
//                         <span className="text-sm font-bold text-slate-700">Tourniquet Used</span>
//                       </label>
//                       {formData.tourniquet_used && (
//                         <div className="grid grid-cols-3 gap-2 mt-2">
//                           <div><label className="text-[9px] font-bold text-slate-400 uppercase">Site</label><input type="text" name="tourniquet_site" value={formData.tourniquet_site} onChange={handleChange} className="w-full p-1.5 border border-slate-300 rounded text-sm outline-none focus:ring-1 focus:ring-indigo-500" /></div>
//                           <div><label className="text-[9px] font-bold text-slate-400 uppercase">Pressure</label><input type="number" name="tourniquet_pressure" value={formData.tourniquet_pressure} onChange={handleChange} className="w-full p-1.5 border border-slate-300 rounded text-sm outline-none focus:ring-1 focus:ring-indigo-500" /></div>
//                           <div><label className="text-[9px] font-bold text-slate-400 uppercase">Duration (m)</label><input type="number" name="tourniquet_duration" value={formData.tourniquet_duration} onChange={handleChange} className="w-full p-1.5 border border-slate-300 rounded text-sm outline-none focus:ring-1 focus:ring-indigo-500" /></div>
//                         </div>
//                       )}
//                     </div>
//                     <div className="grid grid-cols-2 gap-4">
//                       <div>
//                         <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Estimated Blood Loss (mL)</label>
//                         <input type="number" name="estimated_blood_loss" value={formData.estimated_blood_loss} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
//                       </div>
//                       <div>
//                         <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Blood Products (Units)</label>
//                         <input type="text" name="blood_products" value={formData.blood_products} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
//                       </div>
//                     </div>
//                   </div>

//                   {/* Drugs & Prophylaxis Right Column */}
//                   <div className="space-y-4">
//                     <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
//                       <label className="flex items-center gap-3 cursor-pointer">
//                         <input type="checkbox" name="antibiotic_prophylaxis" checked={formData.antibiotic_prophylaxis} onChange={handleChange} className="w-4 h-4 accent-indigo-600 rounded" />
//                         <span className="text-sm font-bold text-slate-700">Antibiotic Prophylaxis Given</span>
//                       </label>
//                       {formData.antibiotic_prophylaxis && (
//                         <input type="text" name="antibiotic_agent" value={formData.antibiotic_agent} onChange={handleChange} placeholder="Agent, dose, route & time" className="w-full mt-2 p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
//                       )}
//                     </div>
//                     <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
//                        <label className="block text-[10px] font-bold text-slate-500 uppercase">DVT Prophylaxis</label>
//                        <select name="dvt_prophylaxis" value={formData.dvt_prophylaxis} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
//                           <option value="None">None</option>
//                           <option value="Mechanical">Mechanical</option>
//                           <option value="Pharmacological">Pharmacological</option>
//                           <option value="Both">Both</option>
//                        </select>
//                        {formData.dvt_prophylaxis !== "None" && (
//                           <input type="text" name="dvt_details" value={formData.dvt_details} onChange={handleChange} placeholder="Details (TED stockings, LMWH dose, etc.)" className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
//                        )}
//                     </div>
//                     <div>
//                       <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Fluids Given (Type/Volume)</label>
//                       <input type="text" name="fluids_given" value={formData.fluids_given} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
//                     </div>
//                   </div>
                  
//                   {/* Specimens Span Full */}
//                   <div className="col-span-1 md:col-span-2 p-4 bg-indigo-50 border border-indigo-100 rounded-lg">
//                     <h5 className="font-bold text-indigo-900 text-xs mb-3 uppercase tracking-wide">Specimens</h5>
//                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//                        <div>
//                           <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Sent To</label>
//                           <select name="specimens_sent_to" value={formData.specimens_sent_to} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
//                             <option value="">Select...</option>
//                             <option value="Histology">Histology</option>
//                             <option value="Microbiology">Microbiology</option>
//                             <option value="Cytology">Cytology</option>
//                             <option value="Frozen section">Frozen section</option>
//                             <option value="Disposed of">Disposed of</option>
//                             <option value="Other">Other</option>
//                           </select>
//                        </div>
//                        <div className="md:col-span-2">
//                           <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Description & Labelling</label>
//                           <input type="text" name="specimen_description" value={formData.specimen_description} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white" placeholder="Pots numbered, request form completed..." />
//                        </div>
//                     </div>
//                   </div>
//                 </div>
//               </div>

//               {/* Part 6: Outcome & Post-Op */}
//               <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
//                 <div className="flex items-center gap-2 border-b pb-3">
//                   <div className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-black">6</div> 
//                   <h4 className="font-bold text-slate-800 uppercase tracking-wider text-sm">Outcome & Post-Operative Plan</h4>
//                 </div>
                
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-4">
//                   <div>
//                     <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Outcome</label>
//                     <select name="outcome" value={formData.outcome} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold">
//                       <option value="Uncomplicated">Uncomplicated</option>
//                       <option value="Complicated">Complicated</option>
//                     </select>
//                   </div>
//                   <div>
//                     <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Patient Condition Leaving Theatre</label>
//                     <input type="text" name="patient_condition_leaving" value={formData.patient_condition_leaving} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
//                   </div>
//                   {formData.outcome === "Complicated" && (
//                     <div className="md:col-span-2 bg-red-50 p-3 border border-red-200 rounded-lg">
//                       <label className="block text-[10px] font-bold text-red-700 uppercase mb-1">Describe Complication, Actions & Persons Informed</label>
//                       <textarea rows={2} name="complications" value={formData.complications} onChange={handleChange} className="w-full p-2 border border-red-300 rounded text-sm focus:ring-2 focus:ring-red-500 outline-none resize-y" />
//                     </div>
//                   )}
//                 </div>

//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-slate-100">
//                   <div>
//                     <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Transfer To</label>
//                     <select name="transfer_to" value={formData.transfer_to} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
//                       <option value="Recovery">Recovery / PACU</option>
//                       <option value="HDU">HDU</option>
//                       <option value="ICU">ICU</option>
//                       <option value="Ward">Ward</option>
//                       <option value="Day-case discharge">Day-case discharge</option>
//                       <option value="Other">Other</option>
//                     </select>
//                   </div>
//                   <div>
//                     <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Destination Ward / Unit</label>
//                     <input type="text" name="destination_ward" value={formData.destination_ward} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
//                   </div>
//                   <div className="md:col-span-2">
//                     <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Post-Operative Instructions (Observations, position, NBM/diet, drains)</label>
//                     <textarea rows={3} name="postop_instructions" value={formData.postop_instructions} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-y" />
//                   </div>
//                   <div className="md:col-span-2">
//                     <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">New Medications Requested (Drug, dose, route, duration)</label>
//                     <textarea rows={2} name="new_medications" value={formData.new_medications} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-y" />
//                   </div>
//                   <div className="md:col-span-2">
//                     <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Discharge Instructions (If applicable)</label>
//                     <textarea rows={2} name="discharge_instructions" value={formData.discharge_instructions} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-y" />
//                   </div>
//                   <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
//                      <div>
//                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Follow-up Clinic Date</label>
//                        <input type="date" name="followup_clinic_date" value={formData.followup_clinic_date} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
//                      </div>
//                      <div>
//                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Suture/Staple Removal</label>
//                        <input type="date" name="suture_removal_date" value={formData.suture_removal_date} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
//                      </div>
//                      <div>
//                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Histology Follow-up Plan</label>
//                        <input type="text" name="histology_followup" value={formData.histology_followup} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
//                      </div>
//                   </div>
//                 </div>
//               </div>

//               {/* Part 7: Signatures Block */}
//               <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
//                 <div className="flex items-center gap-2 border-b pb-3">
//                   <div className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-black">7</div> 
//                   <h4 className="font-bold text-slate-800 uppercase tracking-wider text-sm flex items-center gap-2"><FileSignature size={16}/> Signatures & Certification</h4>
//                 </div>
                
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
//                   <div className="border border-slate-300 rounded-lg p-4 relative bg-slate-50/50">
//                     <h5 className="text-xs font-bold text-slate-700 uppercase mb-4 border-b border-slate-200 pb-2">Primary Surgeon / Operator</h5>
//                     <div className="h-40 bg-white border-2 border-dashed border-slate-300 rounded-lg mb-4 relative overflow-hidden flex items-center justify-center">
//                       {formData.surgeon_signature ? (
//                         <>
//                           <img src={formData.surgeon_signature} alt="Primary Surgeon Signature" className="max-h-full max-w-full object-contain p-2" />
//                           <button onClick={() => setFormData({...formData, surgeon_signature: null})} className="absolute top-2 right-2 p-1.5 bg-red-100 text-red-600 rounded shadow hover:bg-red-200 transition-colors"><Trash2 size={16}/></button>
//                         </>
//                       ) : (
//                         <SignaturePad onEnd={(d: any) => setFormData({...formData, surgeon_signature: d})} className="w-full h-full" />
//                       )}
//                       {!formData.surgeon_signature && <span className="absolute pointer-events-none text-slate-300 font-bold uppercase tracking-widest flex flex-col items-center gap-2"><FileSignature size={24}/> Sign Here</span>}
//                     </div>
//                   </div>
//                 </div>
//               </div>

//             </div>
//           )}
//         </div>

//         {/* Action Footer */}
//         <div className="bg-white px-6 py-4 border-t border-slate-200 flex justify-end gap-3 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
//           <button onClick={onClose} disabled={saving} className="px-6 py-2.5 rounded-lg font-bold text-slate-600 hover:bg-slate-100 transition-colors">
//             Cancel
//           </button>
//           <button onClick={() => handleSave(false)} disabled={saving} className="px-6 py-2.5 rounded-lg font-bold text-brand-primary bg-brand-primary/10 hover:bg-brand-primary/20 transition-all flex items-center gap-2">
//             {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Save Draft
//           </button>
//           <button onClick={() => handleSave(true)} disabled={saving} className="px-8 py-2.5 rounded-lg font-bold text-white bg-brand-primary hover:bg-brand-active0 shadow-lg transition-all flex items-center gap-2 disabled:opacity-50">
//             {saving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />} Sign & Complete Note
//           </button>
//         </div>

//       </div>
//     </div>
//   );
// };

// export default OperativeNoteModal;

