
/**
 * OT Checklist Modal - Main Orchestrator
 * Manages 5-stage workflow: Ward Check 1 → Ward Check 2 → Sign In → Time Out → Sign Out
 */

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Printer,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Maximize2,
  Minimize2,
  CheckCircle2,
  Circle,
  ShieldCheck,
  Save,
  Check
} from "lucide-react";
import { useNotification } from "../context/NotificationContext";
import { useAuth } from "../context/AuthContext";
import { otChecklistService } from "../services/ot-checklist.service";
import {
  ChecklistData,
  WardCheck1Data,
  WardCheck2Data,
  SignInData,
  TimeOutData,
  SignOutData,
} from "../types/ot-checklist.types";

// Stage Components
import OTChecklistWardCheck1 from "./OTChecklistWardCheck1";
import OTChecklistWardCheck2 from "./OTChecklistWardCheck2";
import OTChecklistSignIn from "./OTChecklistSignIn";
import OTChecklistTimeOut from "./OTChecklistTimeOut";
import OTChecklistSignOut from "./OTChecklistSignOut";
import OTChecklistPrintView from "./OTChecklistPrintView";

const STAGES = [
  { id: 0, name: "Ward Check 1", shortName: "WC1", color: "bg-blue-600", border: "border-blue-200" },
  { id: 1, name: "Ward Check 2", shortName: "WC2", color: "bg-teal-600", border: "border-teal-200" },
  { id: 2, name: "Sign In", shortName: "Sign In", color: "bg-orange-500", border: "border-orange-200" },
  { id: 3, name: "Time Out ", shortName: "Time Out", color: "bg-pink-600", border: "border-pink-200" },
  { id: 4, name: "Sign Out", shortName: "Sign Out", color: "bg-violet-600", border: "border-violet-200" },
];

export interface OTChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  ot_case_id: number;
  ot_case_number: string;
  surgery?: any; 
  encounterData?: any; 
  onComplete?: (checklistData: ChecklistData) => void;
  onBackToActions?: () => void;
}

const OTChecklistModal: React.FC<OTChecklistModalProps> = ({
  isOpen,
  onClose,
  ot_case_id,
  ot_case_number,
  surgery,
  encounterData,
  onComplete,
  onBackToActions,
}) => {
  const { notify } = useNotification();
  const { user } = useAuth();

  // DOM & UI State
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Workflow State Management
  const [currentStage, setCurrentStage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPrintView, setShowPrintView] = useState(false);
  const [forceEditMode, setForceEditMode] = useState(false);
  const [completedStages, setCompletedStages] = useState<boolean[]>([
    false, false, false, false, false,
  ]);

  // Form data for all 5 stages
  const [formData, setFormData] = useState({
    ward1: {} as Partial<WardCheck1Data>,
    ward2: {} as Partial<WardCheck2Data>,
    sign_in: {} as Partial<SignInData>,
    time_out: {} as Partial<TimeOutData>,
    sign_out: {} as Partial<SignOutData>,
  });

  // Validation errors & loaded data
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [checklistData, setChecklistData] = useState<ChecklistData | null>(null);

  // =========================================================================
  // FIX: Safely extract data PRIORITIZING the newly expanded `checklistData` 
  // from the API response, then falling back to props if API is still loading.
  // =========================================================================
  const patientName = checklistData?.patient_name 
    || (surgery?.first_name ? `${surgery.first_name} ${surgery.last_name}` : null) 
    || encounterData?.patient_name 
    || 'Unknown Patient';
    
  const patientMRN = checklistData?.mrn || surgery?.mrn || encounterData?.mrn || 'N/A';
  const patientGender = checklistData?.gender || surgery?.gender || encounterData?.gender || 'N/A';
  const patientAge = checklistData?.age || surgery?.age || encounterData?.age || 'N/A';
  const procedureName = checklistData?.procedure_name || checklistData?.surgery_name || surgery?.surgery_name || encounterData?.procedure_name || encounterData?.surgery_name || 'N/A';
    const scheduleDate = checklistData?.scheduled_date || checklistData?.scheduled_date || surgery?.scheduled_date || encounterData?.scheduled_date || encounterData?.scheduled_date || 'N/A';
      const scheduleTime = checklistData?.scheduled_time || checklistData?.scheduled_time || surgery?.scheduled_time || encounterData?.scheduled_time || encounterData?.scheduled_time || 'N/A';
  const roomName = checklistData?.room_name || encounterData?.room_name || 'N/A';
  const displayCaseNumber = checklistData?.ot_case_number || ot_case_number || encounterData?.ot_case_number || 'N/A';
  // =========================================================================

  useEffect(() => {
    if (isOpen) {
      loadChecklistData();
    }
  }, [isOpen, ot_case_id]);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  };

  const loadChecklistData = async () => {
    setIsLoading(true);
    try {
      const data = await otChecklistService.getChecklist(ot_case_id);

      if (data) {
        setChecklistData(data);
        const completed = otChecklistService.getCompletedStages(data);
        setCompletedStages(completed);
        prefillFormData(data);

        // Jump to first incomplete stage
        const firstIncompleteIdx = completed.findIndex((done) => !done);
        if (firstIncompleteIdx >= 0) {
          setCurrentStage(firstIncompleteIdx);
        } else {
          setCurrentStage(4); // All done, show last stage
        }
      }
    } catch (error) {
      console.debug("No existing checklist found - creating new one");
    } finally {
      setIsLoading(false);
    }
  };

  const prefillFormData = (data: ChecklistData) => {
    setFormData({
      ward1: {
        stage: "ward1",
        ot_case_id,
        identity: data.wc1_identity_confirmed,
        documents: data.wc1_documents_checked,
        site_confirmed: data.wc1_site_confirmed,
        site_marked: data.wc1_site_marked,
        not_applicable: data.wc1_not_applicable,
        name: data.wc1_signed_name,
        designation: data.wc1_designation,
      },
      ward2: {
        stage: "ward2",
        ot_case_id,
        details_correct: data.wc2_patient_details_correct,
        site_checked: data.wc2_site_checked,
        not_applicable: data.wc2_not_applicable,
        name: data.wc2_signed_name,
        designation: data.wc2_designation,
      },
      sign_in: {
        stage: "sign_in",
        ot_case_id,
        identity: data.si_identity_confirmed,
        site_marked: data.si_site_marked,
        anaesthesia: data.si_anaesthesia_check,
        airway_risk: data.si_airway_risk,
        airway_prepared: data.si_airway_prepared,
        has_allergy: data.si_has_allergy,
        allergies: data.si_allergies_json ? JSON.parse(data.si_allergies_json as string) : null,
        has_implant: data.si_has_implant,
        implant_details: data.si_implant_details,
        blood_risk: data.si_blood_loss_risk,
        blood_prepared: data.si_blood_prepared,
      },
      time_out: {
        stage: "time_out",
        ot_case_id,
        patient_confirmed: data.to_patient_confirmed,
        procedure_confirmed: data.to_procedure_confirmed,
        surgeon_notes: data.to_surgeon_notes ? JSON.parse(data.to_surgeon_notes as string) : {},
        anaesthesia_notes: data.to_anaesthesia_notes ? JSON.parse(data.to_anaesthesia_notes as string) : {},
        nurse_notes: data.to_nurse_notes ? JSON.parse(data.to_nurse_notes as string) : {},
        antibiotic: data.to_antibiotic_given,
        warming: data.to_warming_done,
        hair: data.to_hair_removed,
        glycaemic: data.to_glycaemic_checked,
        vte: data.to_vte_prophylaxis,
        imaging: data.to_imaging_available,
      },
      sign_out: {
        stage: "sign_out",
        ot_case_id,
        procedure_recorded: data.so_procedure_recorded,
        counts_complete: data.so_counts_complete,
        specimen_labelled: data.so_specimen_labelled,
        equipment_issues: data.so_equipment_issues,
        recovery_concerns: data.so_recovery_concerns,
        imaging: data.so_imaging_displayed,
        surgeon_id: data.so_signed_by_surgeon,
        anaesthetist_id: data.so_signed_by_anaesthetist,
        nurse_id: data.so_signed_by_nurse,
      },
    });
  };

  const validateCurrentStage = (): boolean => {
    const newErrors: Record<string, string> = {};
    const stageData = [
      formData.ward1, formData.ward2, formData.sign_in, formData.time_out, formData.sign_out,
    ][currentStage] as any;

    if (currentStage === 0) {
      if (!stageData.identity && !stageData.not_applicable) newErrors.identity = "Required";
      if (!stageData.documents && !stageData.not_applicable) newErrors.documents = "Required";
      if (!stageData.site_confirmed && !stageData.not_applicable) newErrors.site_confirmed = "Required";
      if (!stageData.site_marked && !stageData.not_applicable) newErrors.site_marked = "Required";
      if (!stageData.name) newErrors.name = "Required";
      if (!stageData.designation) newErrors.designation = "Required";
    } else if (currentStage === 1) {
      if (!stageData.details_correct && !stageData.not_applicable) newErrors.details_correct = "Required";
      if (!stageData.site_checked && !stageData.not_applicable) newErrors.site_checked = "Required";
      if (!stageData.name) newErrors.name = "Required";
      if (!stageData.designation) newErrors.designation = "Required";
    } else if (currentStage === 2) {
      if (!stageData.identity) newErrors.identity = "Required";
      if (!stageData.site_marked) newErrors.site_marked = "Required";
      if (!stageData.anaesthesia) newErrors.anaesthesia = "Required";
      if (!stageData.airway_risk) newErrors.airway_risk = "Required";
      if (stageData.has_allergy === 1 && (!stageData.allergies || stageData.allergies.length === 0)) newErrors.allergies = "Add allergy details";
    } else if (currentStage === 3) {
      if (!stageData.patient_confirmed) newErrors.patient_confirmed = "Required";
      if (!stageData.procedure_confirmed) newErrors.procedure_confirmed = "Required";
    } else if (currentStage === 4) {
      if (!stageData.procedure_recorded) newErrors.procedure_recorded = "Required";
      if (!stageData.counts_complete) newErrors.counts_complete = "Required";
      if (!stageData.surgeon_id) newErrors.surgeon_id = "Required";
      if (!stageData.anaesthetist_id) newErrors.anaesthetist_id = "Required";
      if (!stageData.nurse_id) newErrors.nurse_id = "Required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const normalizeStageData = (stageKey: string, stageData: any) => {
    const normalized = { ...stageData };
    const booleanFields: Record<string, string[]> = {
      ward1: ["identity", "documents", "site_confirmed", "site_marked", "not_applicable"],
      ward2: ["details_correct", "site_checked", "not_applicable"],
      sign_in: ["identity", "site_marked", "anaesthesia", "airway_prepared", "has_allergy", "has_implant", "blood_risk", "blood_prepared"],
      time_out: ["patient_confirmed", "procedure_confirmed", "antibiotic", "warming", "hair", "glycaemic", "vte", "imaging"],
      sign_out: ["procedure_recorded", "counts_complete", "specimen_labelled", "imaging"],
    };

    const fieldsForStage = booleanFields[stageKey] || [];
    fieldsForStage.forEach((field) => {
      if (normalized[field] === undefined || normalized[field] === null) {
        normalized[field] = 0;
      }
    });
    return normalized;
  };

  const saveCurrentStage = async () => {
    if (!validateCurrentStage()) {
      notify("Please complete all required fields", "error");
      return false;
    }

    setIsSaving(true);
    try {
      const stageKey = ["ward1", "ward2", "sign_in", "time_out", "sign_out"][currentStage] as keyof typeof formData;
      let stageData = formData[stageKey];
      stageData = normalizeStageData(stageKey as string, stageData);

      const payload = { ...stageData, ot_case_id, stage: stageKey } as any;
      const response = await otChecklistService.saveStage(payload);

      if (response.status === "success") {
        const newCompleted = [...completedStages];
        newCompleted[currentStage] = true;
        setCompletedStages(newCompleted);
        notify(`${STAGES[currentStage].name} saved successfully`, "success");
        return true;
      }
    } catch (error: any) {
      notify(error.response?.data?.message || error.message || "Failed to save stage", "error");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    const stageKey = ["ward1", "ward2", "sign_in", "time_out", "sign_out"][currentStage] as keyof typeof formData;
    setFormData((prev) => ({
      ...prev,
      [stageKey]: { ...prev[stageKey], [fieldName]: value },
    }));

    if (errors[fieldName]) {
      const newErrors = { ...errors };
      delete newErrors[fieldName];
      setErrors(newErrors);
    }
  };

  const handleNext = async () => {
    const saved = await saveCurrentStage();
    if (saved && currentStage < 4) {
      setCurrentStage(currentStage + 1);
      setForceEditMode(false);
    }
  };

  const handleComplete = async () => {
    const saved = await saveCurrentStage();
    if (saved && completedStages.every((done, idx) => idx <= currentStage || done)) {
      notify("WHO Surgical Safety Checklist completed successfully!", "success");
      const finalData = await otChecklistService.getChecklist(ot_case_id);
      if (finalData && onComplete) onComplete(finalData);
      setTimeout(() => onClose(), 1500);
    }
  };

  // Prevent accessing future uncompleted stages via sidebar to enforce workflow
  const navigateToStage = (idx: number) => {
    if (idx === currentStage) return;
    // Allow navigation to any completed stage or the next immediate pending stage
    const firstIncompleteIdx = completedStages.findIndex((done) => !done);
    const maxAllowed = firstIncompleteIdx === -1 ? 4 : firstIncompleteIdx;
    
    if (idx <= maxAllowed) {
        setCurrentStage(idx);
        setForceEditMode(false);
    } else {
        notify("Please complete previous stages first.", "warning");
    }
  };

  if (!isOpen) return null;

  const stageComponents = [OTChecklistWardCheck1, OTChecklistWardCheck2, OTChecklistSignIn, OTChecklistTimeOut, OTChecklistSignOut];
  const CurrentStageComponent = stageComponents[currentStage];
  const stageKey = ["ward1", "ward2", "sign_in", "time_out", "sign_out"][currentStage] as keyof typeof formData;
  const currentData = formData[stageKey];
  const isStageCompleted = completedStages[currentStage];
  const isDisabled = isStageCompleted && checklistData && !forceEditMode;

  return (
    <>
      {showPrintView && checklistData && (
        <OTChecklistPrintView checklistData={checklistData} isOpen={showPrintView} onClose={() => setShowPrintView(false)} />
      )}

      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
        <div ref={containerRef} className="bg-slate-50 rounded-xl shadow-2xl w-[98vw] max-w-[1600px] h-[95vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
          
          {/* Header - Professional Dark Theme Banner */}
          <div className="bg-[#2A157c] px-6 py-3 border-b border-[#312e81] flex justify-between items-center shrink-0">
            <div className="flex items-center gap-4">
              {onBackToActions && (
                <button onClick={onBackToActions} className="p-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors" title="Back to Actions">
                  <ArrowLeft size={20} />
                </button>
              )}
              {/* Refined Info Block Using Mapped Variables */}
              <div className="border-l border-indigo-800 pl-4">
                <h2 className="text-white font-bold text-lg flex items-center gap-2 tracking-wide">
                  <ShieldCheck size={20} className="text-emerald-400" /> WHO Surgical Safety Checklist (T1)
                </h2>
                <div className="text-indigo-200 text-xs mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
                  <span><strong className="text-indigo-100">MRN:</strong> {patientMRN}</span>|
                  <span><strong className="text-indigo-100">PATIENT:</strong> {patientName}</span>|
                  <span><strong className="text-indigo-100">GENDER:</strong> {patientGender}</span>|
                  <span><strong className="text-indigo-100">AGE:</strong> {patientAge}</span>|
                  <span><strong className="text-indigo-100">SURGERY:</strong> {procedureName}</span>|
                  <span><strong className="text-indigo-100">SCHEDULE DATE:</strong> {scheduleDate}</span>|
                  <span><strong className="text-indigo-100">SCHEDULE TIME:</strong> {scheduleTime}</span>|
                  <span><strong className="text-indigo-100">ROOM:</strong> {roomName}</span>|
                  <span><strong className="text-indigo-100">CASE NO:</strong> {displayCaseNumber}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {checklistData && (
                <button onClick={() => setShowPrintView(true)} disabled={isSaving} className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded flex items-center gap-2 text-sm font-bold transition-colors">
                  <Printer size={16} /> Print
                </button>
              )}
              <div className="h-8 w-px bg-indigo-800 mx-2"></div>
              <button onClick={toggleFullscreen} className="p-2 text-indigo-200 hover:text-white hover:bg-white/10 rounded transition-colors">
                {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
              </button>
              <button onClick={onClose} className="p-2 text-indigo-200 hover:text-red-400 hover:bg-white/10 rounded transition-colors">
                <X size={24} />
              </button>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden bg-white relative">
            {isLoading && (
              <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-white/70 backdrop-blur-sm transition-all">
                <Loader2 size={64} className="animate-spin text-[#2A157c] mb-4" />
                <h3 className="text-2xl font-black text-[#2A157c] tracking-tight animate-pulse">Loading Checklist...</h3>
                <p className="text-slate-600 font-medium mt-2">Retrieving patient safety records, please wait.</p>
              </div>
            )}

            {/* Sidebar Navigation */}
            <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto">
              <div className="p-5 border-b border-slate-200 bg-slate-100 text-slate-800">
                <h3 className="font-black tracking-tight text-lg flex items-center gap-2">Surgical Safety Stages</h3>
                <p className="text-xs text-slate-500 mt-1">Complete in sequential order</p>
              </div>
              <nav className="p-3 space-y-2">
                {STAGES.map((stage, idx) => {
                  const isCompleted = completedStages[idx];
                  const isActive = currentStage === idx;
                  const firstIncompleteIdx = completedStages.findIndex(d => !d);
                  const isLocked = !isCompleted && idx > (firstIncompleteIdx === -1 ? 4 : firstIncompleteIdx);

                  return (
                    <button
                      key={stage.id}
                      onClick={() => navigateToStage(idx)}
                      disabled={isLocked}
                      className={`w-full text-left px-4 py-3 rounded-lg text-sm font-bold transition-all flex items-center gap-3 border ${
                        isActive
                          ? "bg-white shadow-md border-indigo-200 text-indigo-800"
                          : isLocked
                          ? "bg-transparent text-slate-400 border-transparent cursor-not-allowed"
                          : "bg-transparent text-slate-600 hover:bg-slate-100 border-transparent"
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                      ) : (
                        <Circle size={18} className={isActive ? "text-indigo-500 shrink-0" : "text-slate-300 shrink-0"} />
                      )}
                      
                      <div className="flex-1">
                        <div className="leading-tight">{stage.name}</div>
                        {isActive && <div className="text-[10px] font-normal text-indigo-500 mt-0.5">Currently Active</div>}
                      </div>
                    </button>
                  );
                })}
              </nav>

              <div className="mt-auto p-4 border-t border-slate-200 bg-slate-100/50">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
                      <span>Completion</span>
                      <span>{completedStages.filter(Boolean).length} / 5</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5">
                      <div 
                        className="bg-emerald-500 h-1.5 rounded-full transition-all" 
                        style={{ width: `${(completedStages.filter(Boolean).length / 5) * 100}%` }}
                      />
                  </div>
              </div>
            </div>

            {/* Main Stage Content */}
            <div className="flex-1 overflow-hidden flex flex-col relative bg-slate-50/50">
              {/* Stage Title Bar */}
              <div className={`px-8 py-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0`}>
                  <div className="flex items-center gap-3">
                      <div className={`${STAGES[currentStage].color} text-white px-3 py-1 rounded font-black text-sm shadow-sm`}>
                          Stage {currentStage + 1}
                      </div>
                      <h3 className="font-bold text-xl text-slate-800">{STAGES[currentStage].name}</h3>
                  </div>
              </div>

              {/* Form Content */}
              <div className="flex-1 overflow-y-auto p-8 relative">
                <div className="max-w-4xl mx-auto space-y-6">
                  {isStageCompleted && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 shadow-sm">
                      <CheckCircle2 className="text-emerald-600 mt-0.5 flex-shrink-0" size={20} />
                      <div className="flex-1">
                        <p className="font-bold text-emerald-800">Stage Completed Successfully</p>
                        <p className="text-sm text-emerald-700 mt-1">
                          This stage has been signed off and is locked.
                          {!forceEditMode ? " Click edit to make modifications." : " You are now in edit mode."}
                        </p>
                      </div>
                      {!forceEditMode ? (
                        <button onClick={() => setForceEditMode(true)} className="px-4 py-1.5 bg-white border border-emerald-300 text-emerald-700 text-sm font-bold rounded shadow-sm hover:bg-emerald-100 transition-colors">
                          Edit
                        </button>
                      ) : (
                        <button onClick={() => setForceEditMode(false)} className="px-4 py-1.5 bg-slate-500 text-white text-sm font-bold rounded shadow-sm hover:bg-slate-600 transition-colors">
                          Lock Form
                        </button>
                      )}
                    </div>
                  )}

                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <CurrentStageComponent
                      data={currentData}
                      onChange={handleFieldChange}
                      errors={errors}
                      disabled={isDisabled}
                    />
                  </div>
                </div>
              </div>

              {/* Sticky Action Footer */}
              <div className="bg-white px-8 py-4 border-t border-slate-200 flex items-center justify-between shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <button
                  onClick={() => navigateToStage(currentStage - 1)}
                  disabled={currentStage === 0 || isSaving}
                  className="flex items-center gap-2 px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-bold transition-colors"
                >
                  <ChevronLeft size={18} /> Previous Stage
                </button>

                <div className="flex gap-3">
                  {currentStage === 4 ? (
                    <button
                      onClick={handleComplete}
                      disabled={isSaving || (isStageCompleted && !forceEditMode)}
                      className="flex items-center gap-2 px-8 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-bold shadow-md transition-all"
                    >
                      {isSaving ? (
                        <><Loader2 size={18} className="animate-spin" /> Finalizing...</>
                      ) : (
                        <><Check size={18} /> Complete Checklist</>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={handleNext}
                      disabled={isSaving || (isStageCompleted && !forceEditMode)}
                      className="flex items-center gap-2 px-8 py-2.5 bg-[#2A157c] text-white rounded-lg hover:bg-[#201060] disabled:opacity-50 font-bold shadow-md transition-all"
                    >
                      {isSaving ? (
                        <><Loader2 size={18} className="animate-spin" /> Saving...</>
                      ) : (
                        <><Save size={18} /> Save & Next <ChevronRight size={18} /></>
                      )}
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default OTChecklistModal;


// /**
//  * OT Checklist Modal - Main Orchestrator
//  * Manages 5-stage workflow: Ward Check 1 → Ward Check 2 → Sign In → Time Out → Sign Out
//  */

// import React, { useState, useEffect, useRef } from "react";
// import {
//   X,
//   ChevronLeft,
//   ChevronRight,
//   Printer,
//   AlertCircle,
//   Loader2,
//   ArrowLeft,
//   Maximize2,
//   Minimize2,
//   CheckCircle2,
//   Circle,
//   ShieldCheck,
//   Save,
//   Check
// } from "lucide-react";
// import { useNotification } from "../context/NotificationContext";
// import { useAuth } from "../context/AuthContext";
// import { otChecklistService } from "../services/ot-checklist.service";
// import {
//   ChecklistData,
//   WardCheck1Data,
//   WardCheck2Data,
//   SignInData,
//   TimeOutData,
//   SignOutData,
// } from "../types/ot-checklist.types";

// // Stage Components
// import OTChecklistWardCheck1 from "./OTChecklistWardCheck1";
// import OTChecklistWardCheck2 from "./OTChecklistWardCheck2";
// import OTChecklistSignIn from "./OTChecklistSignIn";
// import OTChecklistTimeOut from "./OTChecklistTimeOut";
// import OTChecklistSignOut from "./OTChecklistSignOut";
// import OTChecklistPrintView from "./OTChecklistPrintView";

// const STAGES = [
//   { id: 0, name: "Ward Check 1", shortName: "WC1", color: "bg-blue-600", border: "border-blue-200" },
//   { id: 1, name: "Ward Check 2", shortName: "WC2", color: "bg-teal-600", border: "border-teal-200" },
//   { id: 2, name: "Sign In", shortName: "Sign In", color: "bg-orange-500", border: "border-orange-200" },
//   { id: 3, name: "Time Out ", shortName: "Time Out", color: "bg-pink-600", border: "border-pink-200" },
//   { id: 4, name: "Sign Out", shortName: "Sign Out", color: "bg-violet-600", border: "border-violet-200" },
// ];

// export interface OTChecklistModalProps {
//   isOpen: boolean;
//   onClose: () => void;
//   ot_case_id: number;
//   ot_case_number: string;
//   // We now accept BOTH to ensure compatibility with your parent component
//   surgery?: any; 
//   encounterData?: any; 
//   onComplete?: (checklistData: ChecklistData) => void;
//   onBackToActions?: () => void;
// }

// const OTChecklistModal: React.FC<OTChecklistModalProps> = ({
//   isOpen,
//   onClose,
//   ot_case_id,
//   ot_case_number,
//   surgery,
//   encounterData,
//   onComplete,
//   onBackToActions,
// }) => {
//   const { notify } = useNotification();
//   const { user } = useAuth();

//   // Safely extract data from whichever prop is provided by the parent
//   const patientName = surgery?.first_name 
//     ? `${surgery.first_name} ${surgery.last_name}` 
//     : (encounterData?.patient_name || 'Unknown Patient');
    
//   const patientMRN = surgery?.mrn || encounterData?.mrn || 'N/A';
//   const patientGender = surgery?.gender || encounterData?.gender || 'N/A';
//   const patientAge = surgery?.age || encounterData?.age || 'N/A';
//   const procedureName = surgery?.surgery_name || encounterData?.procedure_name || encounterData?.surgery_name || 'N/A';
//   const roomName = encounterData?.room_name || 'N/A';
//   const displayCaseNumber = ot_case_number || encounterData?.ot_case_number || 'N/A';

//   // DOM & UI State
//   const [isFullscreen, setIsFullscreen] = useState(false);
//   const containerRef = useRef<HTMLDivElement>(null);

//   // Workflow State Management
//   const [currentStage, setCurrentStage] = useState(0);
//   const [isLoading, setIsLoading] = useState(false);
//   const [isSaving, setIsSaving] = useState(false);
//   const [showPrintView, setShowPrintView] = useState(false);
//   const [forceEditMode, setForceEditMode] = useState(false);
//   const [completedStages, setCompletedStages] = useState<boolean[]>([
//     false, false, false, false, false,
//   ]);

//   // Form data for all 5 stages
//   const [formData, setFormData] = useState({
//     ward1: {} as Partial<WardCheck1Data>,
//     ward2: {} as Partial<WardCheck2Data>,
//     sign_in: {} as Partial<SignInData>,
//     time_out: {} as Partial<TimeOutData>,
//     sign_out: {} as Partial<SignOutData>,
//   });

//   // Validation errors & loaded data
//   const [errors, setErrors] = useState<Record<string, string>>({});
//   const [checklistData, setChecklistData] = useState<ChecklistData | null>(null);

//   useEffect(() => {
//     if (isOpen) {
//       loadChecklistData();
//     }
//   }, [isOpen, ot_case_id]);

//   useEffect(() => {
//     const handler = () => setIsFullscreen(!!document.fullscreenElement);
//     document.addEventListener("fullscreenchange", handler);
//     return () => document.removeEventListener("fullscreenchange", handler);
//   }, []);

//   const toggleFullscreen = () => {
//     if (!document.fullscreenElement) {
//       containerRef.current?.requestFullscreen().catch(() => {});
//     } else {
//       document.exitFullscreen();
//     }
//   };

//   const loadChecklistData = async () => {
//     setIsLoading(true);
//     try {
//       const data = await otChecklistService.getChecklist(ot_case_id);

//       if (data) {
//         setChecklistData(data);
//         const completed = otChecklistService.getCompletedStages(data);
//         setCompletedStages(completed);
//         prefillFormData(data);

//         // Jump to first incomplete stage
//         const firstIncompleteIdx = completed.findIndex((done) => !done);
//         if (firstIncompleteIdx >= 0) {
//           setCurrentStage(firstIncompleteIdx);
//         } else {
//           setCurrentStage(4); // All done, show last stage
//         }
//       }
//     } catch (error) {
//       console.debug("No existing checklist found - creating new one");
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const prefillFormData = (data: ChecklistData) => {
//     setFormData({
//       ward1: {
//         stage: "ward1",
//         ot_case_id,
//         identity: data.wc1_identity_confirmed,
//         documents: data.wc1_documents_checked,
//         site_confirmed: data.wc1_site_confirmed,
//         site_marked: data.wc1_site_marked,
//         not_applicable: data.wc1_not_applicable,
//         name: data.wc1_signed_name,
//         designation: data.wc1_designation,
//       },
//       ward2: {
//         stage: "ward2",
//         ot_case_id,
//         details_correct: data.wc2_patient_details_correct,
//         site_checked: data.wc2_site_checked,
//         not_applicable: data.wc2_not_applicable,
//         name: data.wc2_signed_name,
//         designation: data.wc2_designation,
//       },
//       sign_in: {
//         stage: "sign_in",
//         ot_case_id,
//         identity: data.si_identity_confirmed,
//         site_marked: data.si_site_marked,
//         anaesthesia: data.si_anaesthesia_check,
//         airway_risk: data.si_airway_risk,
//         airway_prepared: data.si_airway_prepared,
//         has_allergy: data.si_has_allergy,
//         allergies: data.si_allergies_json ? JSON.parse(data.si_allergies_json as string) : null,
//         has_implant: data.si_has_implant,
//         implant_details: data.si_implant_details,
//         blood_risk: data.si_blood_loss_risk,
//         blood_prepared: data.si_blood_prepared,
//       },
//       time_out: {
//         stage: "time_out",
//         ot_case_id,
//         patient_confirmed: data.to_patient_confirmed,
//         procedure_confirmed: data.to_procedure_confirmed,
//         surgeon_notes: data.to_surgeon_notes ? JSON.parse(data.to_surgeon_notes as string) : {},
//         anaesthesia_notes: data.to_anaesthesia_notes ? JSON.parse(data.to_anaesthesia_notes as string) : {},
//         nurse_notes: data.to_nurse_notes ? JSON.parse(data.to_nurse_notes as string) : {},
//         antibiotic: data.to_antibiotic_given,
//         warming: data.to_warming_done,
//         hair: data.to_hair_removed,
//         glycaemic: data.to_glycaemic_checked,
//         vte: data.to_vte_prophylaxis,
//         imaging: data.to_imaging_available,
//       },
//       sign_out: {
//         stage: "sign_out",
//         ot_case_id,
//         procedure_recorded: data.so_procedure_recorded,
//         counts_complete: data.so_counts_complete,
//         specimen_labelled: data.so_specimen_labelled,
//         equipment_issues: data.so_equipment_issues,
//         recovery_concerns: data.so_recovery_concerns,
//         imaging: data.so_imaging_displayed,
//         surgeon_id: data.so_signed_by_surgeon,
//         anaesthetist_id: data.so_signed_by_anaesthetist,
//         nurse_id: data.so_signed_by_nurse,
//       },
//     });
//   };

//   const validateCurrentStage = (): boolean => {
//     const newErrors: Record<string, string> = {};
//     const stageData = [
//       formData.ward1, formData.ward2, formData.sign_in, formData.time_out, formData.sign_out,
//     ][currentStage] as any;

//     if (currentStage === 0) {
//       if (!stageData.identity && !stageData.not_applicable) newErrors.identity = "Required";
//       if (!stageData.documents && !stageData.not_applicable) newErrors.documents = "Required";
//       if (!stageData.site_confirmed && !stageData.not_applicable) newErrors.site_confirmed = "Required";
//       if (!stageData.site_marked && !stageData.not_applicable) newErrors.site_marked = "Required";
//       if (!stageData.name) newErrors.name = "Required";
//       if (!stageData.designation) newErrors.designation = "Required";
//     } else if (currentStage === 1) {
//       if (!stageData.details_correct && !stageData.not_applicable) newErrors.details_correct = "Required";
//       if (!stageData.site_checked && !stageData.not_applicable) newErrors.site_checked = "Required";
//       if (!stageData.name) newErrors.name = "Required";
//       if (!stageData.designation) newErrors.designation = "Required";
//     } else if (currentStage === 2) {
//       if (!stageData.identity) newErrors.identity = "Required";
//       if (!stageData.site_marked) newErrors.site_marked = "Required";
//       if (!stageData.anaesthesia) newErrors.anaesthesia = "Required";
//       if (!stageData.airway_risk) newErrors.airway_risk = "Required";
//       if (stageData.has_allergy === 1 && (!stageData.allergies || stageData.allergies.length === 0)) newErrors.allergies = "Add allergy details";
//     } else if (currentStage === 3) {
//       if (!stageData.patient_confirmed) newErrors.patient_confirmed = "Required";
//       if (!stageData.procedure_confirmed) newErrors.procedure_confirmed = "Required";
//     } else if (currentStage === 4) {
//       if (!stageData.procedure_recorded) newErrors.procedure_recorded = "Required";
//       if (!stageData.counts_complete) newErrors.counts_complete = "Required";
//       if (!stageData.surgeon_id) newErrors.surgeon_id = "Required";
//       if (!stageData.anaesthetist_id) newErrors.anaesthetist_id = "Required";
//       if (!stageData.nurse_id) newErrors.nurse_id = "Required";
//     }

//     setErrors(newErrors);
//     return Object.keys(newErrors).length === 0;
//   };

//   const normalizeStageData = (stageKey: string, stageData: any) => {
//     const normalized = { ...stageData };
//     const booleanFields: Record<string, string[]> = {
//       ward1: ["identity", "documents", "site_confirmed", "site_marked", "not_applicable"],
//       ward2: ["details_correct", "site_checked", "not_applicable"],
//       sign_in: ["identity", "site_marked", "anaesthesia", "airway_prepared", "has_allergy", "has_implant", "blood_risk", "blood_prepared"],
//       time_out: ["patient_confirmed", "procedure_confirmed", "antibiotic", "warming", "hair", "glycaemic", "vte", "imaging"],
//       sign_out: ["procedure_recorded", "counts_complete", "specimen_labelled", "imaging"],
//     };

//     const fieldsForStage = booleanFields[stageKey] || [];
//     fieldsForStage.forEach((field) => {
//       if (normalized[field] === undefined || normalized[field] === null) {
//         normalized[field] = 0;
//       }
//     });
//     return normalized;
//   };

//   const saveCurrentStage = async () => {
//     if (!validateCurrentStage()) {
//       notify("Please complete all required fields", "error");
//       return false;
//     }

//     setIsSaving(true);
//     try {
//       const stageKey = ["ward1", "ward2", "sign_in", "time_out", "sign_out"][currentStage] as keyof typeof formData;
//       let stageData = formData[stageKey];
//       stageData = normalizeStageData(stageKey as string, stageData);

//       const payload = { ...stageData, ot_case_id, stage: stageKey } as any;
//       const response = await otChecklistService.saveStage(payload);

//       if (response.status === "success") {
//         const newCompleted = [...completedStages];
//         newCompleted[currentStage] = true;
//         setCompletedStages(newCompleted);
//         notify(`${STAGES[currentStage].name} saved successfully`, "success");
//         return true;
//       }
//     } catch (error: any) {
//       notify(error.response?.data?.message || error.message || "Failed to save stage", "error");
//       return false;
//     } finally {
//       setIsSaving(false);
//     }
//   };

//   const handleFieldChange = (fieldName: string, value: any) => {
//     const stageKey = ["ward1", "ward2", "sign_in", "time_out", "sign_out"][currentStage] as keyof typeof formData;
//     setFormData((prev) => ({
//       ...prev,
//       [stageKey]: { ...prev[stageKey], [fieldName]: value },
//     }));

//     if (errors[fieldName]) {
//       const newErrors = { ...errors };
//       delete newErrors[fieldName];
//       setErrors(newErrors);
//     }
//   };

//   const handleNext = async () => {
//     const saved = await saveCurrentStage();
//     if (saved && currentStage < 4) {
//       setCurrentStage(currentStage + 1);
//       setForceEditMode(false);
//     }
//   };

//   const handleComplete = async () => {
//     const saved = await saveCurrentStage();
//     if (saved && completedStages.every((done, idx) => idx <= currentStage || done)) {
//       notify("WHO Surgical Safety Checklist completed successfully!", "success");
//       const finalData = await otChecklistService.getChecklist(ot_case_id);
//       if (finalData && onComplete) onComplete(finalData);
//       setTimeout(() => onClose(), 1500);
//     }
//   };

//   // Prevent accessing future uncompleted stages via sidebar to enforce workflow
//   const navigateToStage = (idx: number) => {
//     if (idx === currentStage) return;
//     // Allow navigation to any completed stage or the next immediate pending stage
//     const firstIncompleteIdx = completedStages.findIndex((done) => !done);
//     const maxAllowed = firstIncompleteIdx === -1 ? 4 : firstIncompleteIdx;
    
//     if (idx <= maxAllowed) {
//         setCurrentStage(idx);
//         setForceEditMode(false);
//     } else {
//         notify("Please complete previous stages first.", "warning");
//     }
//   };

//   if (!isOpen) return null;

//   const stageComponents = [OTChecklistWardCheck1, OTChecklistWardCheck2, OTChecklistSignIn, OTChecklistTimeOut, OTChecklistSignOut];
//   const CurrentStageComponent = stageComponents[currentStage];
//   const stageKey = ["ward1", "ward2", "sign_in", "time_out", "sign_out"][currentStage] as keyof typeof formData;
//   const currentData = formData[stageKey];
//   const isStageCompleted = completedStages[currentStage];
//   const isDisabled = isStageCompleted && checklistData && !forceEditMode;

//   return (
//     <>
//       {showPrintView && checklistData && (
//         <OTChecklistPrintView checklistData={checklistData} isOpen={showPrintView} onClose={() => setShowPrintView(false)} />
//       )}

//       <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
//         <div ref={containerRef} className="bg-slate-50 rounded-xl shadow-2xl w-[98vw] max-w-[1600px] h-[95vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
          
//           {/* Header - Professional Dark Theme Banner */}
//           <div className="bg-[#2A157c] px-6 py-3 border-b border-[#312e81] flex justify-between items-center shrink-0">
//             <div className="flex items-center gap-4">
//               {onBackToActions && (
//                 <button onClick={onBackToActions} className="p-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors" title="Back to Actions">
//                   <ArrowLeft size={20} />
//                 </button>
//               )}
//               {/* Refined Info Block Using Mapped Variables */}
//               <div className="border-l border-indigo-800 pl-4">
//                 <h2 className="text-white font-bold text-lg flex items-center gap-2 tracking-wide">
//                   <ShieldCheck size={20} className="text-emerald-400" /> WHO Surgical Safety Checklist (T1)
//                 </h2>
//                 <div className="text-indigo-200 text-xs mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
//                   <span><strong className="text-indigo-100">MRN:</strong> {patientMRN}</span>|
//                   <span><strong className="text-indigo-100">PATIENT:</strong> {patientName}</span>|
//                   <span><strong className="text-indigo-100">GENDER:</strong> {patientGender}</span>|
//                   <span><strong className="text-indigo-100">AGE:</strong> {patientAge}</span>|
//                   <span><strong className="text-indigo-100">SURGERY:</strong> {procedureName}</span>|
//                   <span><strong className="text-indigo-100">ROOM:</strong> {roomName}</span>|
//                   <span><strong className="text-indigo-100">CASE NO:</strong> {displayCaseNumber}</span>
//                 </div>
//               </div>
//             </div>
            
//             <div className="flex items-center gap-3">
//               {checklistData && (
//                 <button onClick={() => setShowPrintView(true)} disabled={isSaving} className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded flex items-center gap-2 text-sm font-bold transition-colors">
//                   <Printer size={16} /> Print
//                 </button>
//               )}
//               <div className="h-8 w-px bg-indigo-800 mx-2"></div>
//               <button onClick={toggleFullscreen} className="p-2 text-indigo-200 hover:text-white hover:bg-white/10 rounded transition-colors">
//                 {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
//               </button>
//               <button onClick={onClose} className="p-2 text-indigo-200 hover:text-red-400 hover:bg-white/10 rounded transition-colors">
//                 <X size={24} />
//               </button>
//             </div>
//           </div>

//           <div className="flex flex-1 overflow-hidden bg-white relative">
//             {isLoading && (
//               <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-white/70 backdrop-blur-sm transition-all">
//                 <Loader2 size={64} className="animate-spin text-[#2A157c] mb-4" />
//                 <h3 className="text-2xl font-black text-[#2A157c] tracking-tight animate-pulse">Loading Checklist...</h3>
//                 <p className="text-slate-600 font-medium mt-2">Retrieving patient safety records, please wait.</p>
//               </div>
//             )}

//             {/* Sidebar Navigation */}
//             <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto">
//               <div className="p-5 border-b border-slate-200 bg-slate-100 text-slate-800">
//                 <h3 className="font-black tracking-tight text-lg flex items-center gap-2">Surgical Safety Stages</h3>
//                 <p className="text-xs text-slate-500 mt-1">Complete in sequential order</p>
//               </div>
//               <nav className="p-3 space-y-2">
//                 {STAGES.map((stage, idx) => {
//                   const isCompleted = completedStages[idx];
//                   const isActive = currentStage === idx;
//                   const firstIncompleteIdx = completedStages.findIndex(d => !d);
//                   const isLocked = !isCompleted && idx > (firstIncompleteIdx === -1 ? 4 : firstIncompleteIdx);

//                   return (
//                     <button
//                       key={stage.id}
//                       onClick={() => navigateToStage(idx)}
//                       disabled={isLocked}
//                       className={`w-full text-left px-4 py-3 rounded-lg text-sm font-bold transition-all flex items-center gap-3 border ${
//                         isActive
//                           ? "bg-white shadow-md border-indigo-200 text-indigo-800"
//                           : isLocked
//                           ? "bg-transparent text-slate-400 border-transparent cursor-not-allowed"
//                           : "bg-transparent text-slate-600 hover:bg-slate-100 border-transparent"
//                       }`}
//                     >
//                       {isCompleted ? (
//                         <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
//                       ) : (
//                         <Circle size={18} className={isActive ? "text-indigo-500 shrink-0" : "text-slate-300 shrink-0"} />
//                       )}
                      
//                       <div className="flex-1">
//                         <div className="leading-tight">{stage.name}</div>
//                         {isActive && <div className="text-[10px] font-normal text-indigo-500 mt-0.5">Currently Active</div>}
//                       </div>
//                     </button>
//                   );
//                 })}
//               </nav>

//               <div className="mt-auto p-4 border-t border-slate-200 bg-slate-100/50">
//                   <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
//                       <span>Completion</span>
//                       <span>{completedStages.filter(Boolean).length} / 5</span>
//                   </div>
//                   <div className="w-full bg-slate-200 rounded-full h-1.5">
//                       <div 
//                         className="bg-emerald-500 h-1.5 rounded-full transition-all" 
//                         style={{ width: `${(completedStages.filter(Boolean).length / 5) * 100}%` }}
//                       />
//                   </div>
//               </div>
//             </div>

//             {/* Main Stage Content */}
//             <div className="flex-1 overflow-hidden flex flex-col relative bg-slate-50/50">
//               {/* Stage Title Bar */}
//               <div className={`px-8 py-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0`}>
//                   <div className="flex items-center gap-3">
//                       <div className={`${STAGES[currentStage].color} text-white px-3 py-1 rounded font-black text-sm shadow-sm`}>
//                           Stage {currentStage + 1}
//                       </div>
//                       <h3 className="font-bold text-xl text-slate-800">{STAGES[currentStage].name}</h3>
//                   </div>
//               </div>

//               {/* Form Content */}
//               <div className="flex-1 overflow-y-auto p-8 relative">
//                 <div className="max-w-4xl mx-auto space-y-6">
//                   {isStageCompleted && (
//                     <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 shadow-sm">
//                       <CheckCircle2 className="text-emerald-600 mt-0.5 flex-shrink-0" size={20} />
//                       <div className="flex-1">
//                         <p className="font-bold text-emerald-800">Stage Completed Successfully</p>
//                         <p className="text-sm text-emerald-700 mt-1">
//                           This stage has been signed off and is locked.
//                           {!forceEditMode ? " Click edit to make modifications." : " You are now in edit mode."}
//                         </p>
//                       </div>
//                       {!forceEditMode ? (
//                         <button onClick={() => setForceEditMode(true)} className="px-4 py-1.5 bg-white border border-emerald-300 text-emerald-700 text-sm font-bold rounded shadow-sm hover:bg-emerald-100 transition-colors">
//                           Edit
//                         </button>
//                       ) : (
//                         <button onClick={() => setForceEditMode(false)} className="px-4 py-1.5 bg-slate-500 text-white text-sm font-bold rounded shadow-sm hover:bg-slate-600 transition-colors">
//                           Lock Form
//                         </button>
//                       )}
//                     </div>
//                   )}

//                   <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
//                     <CurrentStageComponent
//                       data={currentData}
//                       onChange={handleFieldChange}
//                       errors={errors}
//                       disabled={isDisabled}
//                     />
//                   </div>
//                 </div>
//               </div>

//               {/* Sticky Action Footer */}
//               <div className="bg-white px-8 py-4 border-t border-slate-200 flex items-center justify-between shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
//                 <button
//                   onClick={() => navigateToStage(currentStage - 1)}
//                   disabled={currentStage === 0 || isSaving}
//                   className="flex items-center gap-2 px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-bold transition-colors"
//                 >
//                   <ChevronLeft size={18} /> Previous Stage
//                 </button>

//                 <div className="flex gap-3">
//                   {currentStage === 4 ? (
//                     <button
//                       onClick={handleComplete}
//                       disabled={isSaving || (isStageCompleted && !forceEditMode)}
//                       className="flex items-center gap-2 px-8 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-bold shadow-md transition-all"
//                     >
//                       {isSaving ? (
//                         <><Loader2 size={18} className="animate-spin" /> Finalizing...</>
//                       ) : (
//                         <><Check size={18} /> Complete Checklist</>
//                       )}
//                     </button>
//                   ) : (
//                     <button
//                       onClick={handleNext}
//                       disabled={isSaving || (isStageCompleted && !forceEditMode)}
//                       className="flex items-center gap-2 px-8 py-2.5 bg-[#2A157c] text-white rounded-lg hover:bg-[#201060] disabled:opacity-50 font-bold shadow-md transition-all"
//                     >
//                       {isSaving ? (
//                         <><Loader2 size={18} className="animate-spin" /> Saving...</>
//                       ) : (
//                         <><Save size={18} /> Save & Next <ChevronRight size={18} /></>
//                       )}
//                     </button>
//                   )}
//                 </div>
//               </div>

//             </div>
//           </div>
//         </div>
//       </div>
//     </>
//   );
// };

// export default OTChecklistModal;



// /**
//  * OT Checklist Modal - Main Orchestrator
//  * Manages 5-stage workflow: Ward Check 1 → Ward Check 2 → Sign In → Time Out → Sign Out
//  */

// import React, { useState, useEffect, useRef } from "react";
// import {
//   X,
//   ChevronLeft,
//   ChevronRight,
//   Printer,
//   AlertCircle,
//   Loader2,
//   ArrowLeft,
//   Maximize2,
//   Minimize2,
//   CheckCircle2,
//   Circle,
//   ShieldCheck,
//   Save,
//   Check
// } from "lucide-react";
// import { useNotification } from "../context/NotificationContext";
// import { useAuth } from "../context/AuthContext";
// import { otChecklistService } from "../services/ot-checklist.service";
// import {
//   ChecklistData,
//   WardCheck1Data,
//   WardCheck2Data,
//   SignInData,
//   TimeOutData,
//   SignOutData,
// } from "../types/ot-checklist.types";

// // Stage Components
// import OTChecklistWardCheck1 from "./OTChecklistWardCheck1";
// import OTChecklistWardCheck2 from "./OTChecklistWardCheck2";
// import OTChecklistSignIn from "./OTChecklistSignIn";
// import OTChecklistTimeOut from "./OTChecklistTimeOut";
// import OTChecklistSignOut from "./OTChecklistSignOut";
// import OTChecklistPrintView from "./OTChecklistPrintView";

// const STAGES = [
//   { id: 0, name: "Ward Check 1", shortName: "WC1", color: "bg-blue-600", border: "border-blue-200" },
//   { id: 1, name: "Ward Check 2", shortName: "WC2", color: "bg-teal-600", border: "border-teal-200" },
//   { id: 2, name: "Sign In", shortName: "Sign In", color: "bg-orange-500", border: "border-orange-200" },
//   { id: 3, name: "Time Out", shortName: "Time Out", color: "bg-pink-600", border: "border-pink-200" },
//   { id: 4, name: "Sign Out", shortName: "Sign Out", color: "bg-violet-600", border: "border-violet-200" },
// ];

// export interface OTChecklistModalProps {
//   isOpen: boolean;
//   onClose: () => void;
//   ot_case_id: number;
//   ot_case_number: string;
//   surgery: any; // Using the provided JSON payload structure
//   onComplete?: (checklistData: ChecklistData) => void;
//   onBackToActions?: () => void;
// }

// const OTChecklistModal: React.FC<OTChecklistModalProps> = ({
//   isOpen,
//   onClose,
//   ot_case_id,
//   ot_case_number,
//   surgery,
//   onComplete,
//   onBackToActions,
// }) => {
//   const { notify } = useNotification();
//   const { user } = useAuth();

//   // DOM & UI State
//   const [isFullscreen, setIsFullscreen] = useState(false);
//   const containerRef = useRef<HTMLDivElement>(null);

//   // Workflow State Management
//   const [currentStage, setCurrentStage] = useState(0);
//   const [isLoading, setIsLoading] = useState(false);
//   const [isSaving, setIsSaving] = useState(false);
//   const [showPrintView, setShowPrintView] = useState(false);
//   const [forceEditMode, setForceEditMode] = useState(false);
//   const [completedStages, setCompletedStages] = useState<boolean[]>([
//     false, false, false, false, false,
//   ]);

//   // Form data for all 5 stages
//   const [formData, setFormData] = useState({
//     ward1: {} as Partial<WardCheck1Data>,
//     ward2: {} as Partial<WardCheck2Data>,
//     sign_in: {} as Partial<SignInData>,
//     time_out: {} as Partial<TimeOutData>,
//     sign_out: {} as Partial<SignOutData>,
//   });

//   // Validation errors & loaded data
//   const [errors, setErrors] = useState<Record<string, string>>({});
//   const [checklistData, setChecklistData] = useState<ChecklistData | null>(null);

//   /**
//    * Load existing checklist on mount
//    */
//   useEffect(() => {
//     if (isOpen) {
//       loadChecklistData();
//     }
//   }, [isOpen, ot_case_id]);

//   /**
//    * Handle Fullscreen toggling
//    */
//   useEffect(() => {
//     const handler = () => setIsFullscreen(!!document.fullscreenElement);
//     document.addEventListener("fullscreenchange", handler);
//     return () => document.removeEventListener("fullscreenchange", handler);
//   }, []);

//   const toggleFullscreen = () => {
//     if (!document.fullscreenElement) {
//       containerRef.current?.requestFullscreen().catch(() => {});
//     } else {
//       document.exitFullscreen();
//     }
//   };

//   const loadChecklistData = async () => {
//     setIsLoading(true);
//     try {
//       const data = await otChecklistService.getChecklist(ot_case_id);

//       if (data) {
//         setChecklistData(data);
//         const completed = otChecklistService.getCompletedStages(data);
//         setCompletedStages(completed);
//         prefillFormData(data);

//         // Jump to first incomplete stage
//         const firstIncompleteIdx = completed.findIndex((done) => !done);
//         if (firstIncompleteIdx >= 0) {
//           setCurrentStage(firstIncompleteIdx);
//         } else {
//           setCurrentStage(4); // All done, show last stage
//         }
//       }
//     } catch (error) {
//       console.debug("No existing checklist found - creating new one");
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const prefillFormData = (data: ChecklistData) => {
//     setFormData({
//       ward1: {
//         stage: "ward1",
//         ot_case_id,
//         identity: data.wc1_identity_confirmed,
//         documents: data.wc1_documents_checked,
//         site_confirmed: data.wc1_site_confirmed,
//         site_marked: data.wc1_site_marked,
//         not_applicable: data.wc1_not_applicable,
//         name: data.wc1_signed_name,
//         designation: data.wc1_designation,
//       },
//       ward2: {
//         stage: "ward2",
//         ot_case_id,
//         details_correct: data.wc2_patient_details_correct,
//         site_checked: data.wc2_site_checked,
//         not_applicable: data.wc2_not_applicable,
//         name: data.wc2_signed_name,
//         designation: data.wc2_designation,
//       },
//       sign_in: {
//         stage: "sign_in",
//         ot_case_id,
//         identity: data.si_identity_confirmed,
//         site_marked: data.si_site_marked,
//         anaesthesia: data.si_anaesthesia_check,
//         airway_risk: data.si_airway_risk,
//         airway_prepared: data.si_airway_prepared,
//         has_allergy: data.si_has_allergy,
//         allergies: data.si_allergies_json ? JSON.parse(data.si_allergies_json as string) : null,
//         has_implant: data.si_has_implant,
//         implant_details: data.si_implant_details,
//         blood_risk: data.si_blood_loss_risk,
//         blood_prepared: data.si_blood_prepared,
//       },
//       time_out: {
//         stage: "time_out",
//         ot_case_id,
//         patient_confirmed: data.to_patient_confirmed,
//         procedure_confirmed: data.to_procedure_confirmed,
//         surgeon_notes: data.to_surgeon_notes ? JSON.parse(data.to_surgeon_notes as string) : {},
//         anaesthesia_notes: data.to_anaesthesia_notes ? JSON.parse(data.to_anaesthesia_notes as string) : {},
//         nurse_notes: data.to_nurse_notes ? JSON.parse(data.to_nurse_notes as string) : {},
//         antibiotic: data.to_antibiotic_given,
//         warming: data.to_warming_done,
//         hair: data.to_hair_removed,
//         glycaemic: data.to_glycaemic_checked,
//         vte: data.to_vte_prophylaxis,
//         imaging: data.to_imaging_available,
//       },
//       sign_out: {
//         stage: "sign_out",
//         ot_case_id,
//         procedure_recorded: data.so_procedure_recorded,
//         counts_complete: data.so_counts_complete,
//         specimen_labelled: data.so_specimen_labelled,
//         equipment_issues: data.so_equipment_issues,
//         recovery_concerns: data.so_recovery_concerns,
//         imaging: data.so_imaging_displayed,
//         surgeon_id: data.so_signed_by_surgeon,
//         anaesthetist_id: data.so_signed_by_anaesthetist,
//         nurse_id: data.so_signed_by_nurse,
//       },
//     });
//   };

//   const validateCurrentStage = (): boolean => {
//     const newErrors: Record<string, string> = {};
//     const stageData = [
//       formData.ward1, formData.ward2, formData.sign_in, formData.time_out, formData.sign_out,
//     ][currentStage] as any;

//     if (currentStage === 0) {
//       if (!stageData.identity && !stageData.not_applicable) newErrors.identity = "Required";
//       if (!stageData.documents && !stageData.not_applicable) newErrors.documents = "Required";
//       if (!stageData.site_confirmed && !stageData.not_applicable) newErrors.site_confirmed = "Required";
//       if (!stageData.site_marked && !stageData.not_applicable) newErrors.site_marked = "Required";
//       if (!stageData.name) newErrors.name = "Required";
//       if (!stageData.designation) newErrors.designation = "Required";
//     } else if (currentStage === 1) {
//       if (!stageData.details_correct && !stageData.not_applicable) newErrors.details_correct = "Required";
//       if (!stageData.site_checked && !stageData.not_applicable) newErrors.site_checked = "Required";
//       if (!stageData.name) newErrors.name = "Required";
//       if (!stageData.designation) newErrors.designation = "Required";
//     } else if (currentStage === 2) {
//       if (!stageData.identity) newErrors.identity = "Required";
//       if (!stageData.site_marked) newErrors.site_marked = "Required";
//       if (!stageData.anaesthesia) newErrors.anaesthesia = "Required";
//       if (!stageData.airway_risk) newErrors.airway_risk = "Required";
//       if (stageData.has_allergy === 1 && (!stageData.allergies || stageData.allergies.length === 0)) newErrors.allergies = "Add allergy details";
//     } else if (currentStage === 3) {
//       if (!stageData.patient_confirmed) newErrors.patient_confirmed = "Required";
//       if (!stageData.procedure_confirmed) newErrors.procedure_confirmed = "Required";
//     } else if (currentStage === 4) {
//       if (!stageData.procedure_recorded) newErrors.procedure_recorded = "Required";
//       if (!stageData.counts_complete) newErrors.counts_complete = "Required";
//       if (!stageData.surgeon_id) newErrors.surgeon_id = "Required";
//       if (!stageData.anaesthetist_id) newErrors.anaesthetist_id = "Required";
//       if (!stageData.nurse_id) newErrors.nurse_id = "Required";
//     }

//     setErrors(newErrors);
//     return Object.keys(newErrors).length === 0;
//   };

//   const normalizeStageData = (stageKey: string, stageData: any) => {
//     const normalized = { ...stageData };
//     const booleanFields: Record<string, string[]> = {
//       ward1: ["identity", "documents", "site_confirmed", "site_marked", "not_applicable"],
//       ward2: ["details_correct", "site_checked", "not_applicable"],
//       sign_in: ["identity", "site_marked", "anaesthesia", "airway_prepared", "has_allergy", "has_implant", "blood_risk", "blood_prepared"],
//       time_out: ["patient_confirmed", "procedure_confirmed", "antibiotic", "warming", "hair", "glycaemic", "vte", "imaging"],
//       sign_out: ["procedure_recorded", "counts_complete", "specimen_labelled", "imaging"],
//     };

//     const fieldsForStage = booleanFields[stageKey] || [];
//     fieldsForStage.forEach((field) => {
//       if (normalized[field] === undefined || normalized[field] === null) {
//         normalized[field] = 0;
//       }
//     });
//     return normalized;
//   };

//   const saveCurrentStage = async () => {
//     if (!validateCurrentStage()) {
//       notify("Please complete all required fields", "error");
//       return false;
//     }

//     setIsSaving(true);
//     try {
//       const stageKey = ["ward1", "ward2", "sign_in", "time_out", "sign_out"][currentStage] as keyof typeof formData;
//       let stageData = formData[stageKey];
//       stageData = normalizeStageData(stageKey as string, stageData);

//       const payload = { ...stageData, ot_case_id, stage: stageKey } as any;
//       const response = await otChecklistService.saveStage(payload);

//       if (response.status === "success") {
//         const newCompleted = [...completedStages];
//         newCompleted[currentStage] = true;
//         setCompletedStages(newCompleted);
//         notify(`${STAGES[currentStage].name} saved successfully`, "success");
//         return true;
//       }
//     } catch (error: any) {
//       notify(error.response?.data?.message || error.message || "Failed to save stage", "error");
//       return false;
//     } finally {
//       setIsSaving(false);
//     }
//   };

//   const handleFieldChange = (fieldName: string, value: any) => {
//     const stageKey = ["ward1", "ward2", "sign_in", "time_out", "sign_out"][currentStage] as keyof typeof formData;
//     setFormData((prev) => ({
//       ...prev,
//       [stageKey]: { ...prev[stageKey], [fieldName]: value },
//     }));

//     if (errors[fieldName]) {
//       const newErrors = { ...errors };
//       delete newErrors[fieldName];
//       setErrors(newErrors);
//     }
//   };

//   const handleNext = async () => {
//     const saved = await saveCurrentStage();
//     if (saved && currentStage < 4) {
//       setCurrentStage(currentStage + 1);
//       setForceEditMode(false);
//     }
//   };

//   const handleComplete = async () => {
//     const saved = await saveCurrentStage();
//     if (saved && completedStages.every((done, idx) => idx <= currentStage || done)) {
//       notify("WHO Surgical Safety Checklist completed successfully!", "success");
//       const finalData = await otChecklistService.getChecklist(ot_case_id);
//       if (finalData && onComplete) onComplete(finalData);
//       setTimeout(() => onClose(), 1500);
//     }
//   };

//   // Prevent accessing future uncompleted stages via sidebar to enforce workflow
//   const navigateToStage = (idx: number) => {
//     if (idx === currentStage) return;
//     // Allow navigation to any completed stage or the next immediate pending stage
//     const firstIncompleteIdx = completedStages.findIndex((done) => !done);
//     const maxAllowed = firstIncompleteIdx === -1 ? 4 : firstIncompleteIdx;
    
//     if (idx <= maxAllowed) {
//         setCurrentStage(idx);
//         setForceEditMode(false);
//     } else {
//         notify("Please complete previous stages first.", "warning");
//     }
//   };

//   if (!isOpen) return null;

//   const stageComponents = [OTChecklistWardCheck1, OTChecklistWardCheck2, OTChecklistSignIn, OTChecklistTimeOut, OTChecklistSignOut];
//   const CurrentStageComponent = stageComponents[currentStage];
//   const stageKey = ["ward1", "ward2", "sign_in", "time_out", "sign_out"][currentStage] as keyof typeof formData;
//   const currentData = formData[stageKey];
//   const isStageCompleted = completedStages[currentStage];
//   const isDisabled = isStageCompleted && checklistData && !forceEditMode;

//   return (
//     <>
//       {showPrintView && checklistData && (
//         <OTChecklistPrintView checklistData={checklistData} isOpen={showPrintView} onClose={() => setShowPrintView(false)} />
//       )}

//       <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
//         <div ref={containerRef} className="bg-slate-50 rounded-xl shadow-2xl w-[98vw] max-w-[1600px] h-[95vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
          
//           {/* Header - Professional Dark Theme Banner */}
//           <div className="bg-[#2A157c] px-6 py-3 border-b border-[#312e81] flex justify-between items-center shrink-0">
//             <div className="flex items-center gap-4">
//               {onBackToActions && (
//                 <button onClick={onBackToActions} className="p-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors" title="Back to Actions">
//                   <ArrowLeft size={20} />
//                 </button>
//               )}
//               {/* Optional Logo Block */}
//               <div className="border-l border-indigo-800 pl-4">
//                 <h2 className="text-white font-bold text-lg flex items-center gap-2 tracking-wide">
//                   <ShieldCheck size={20} className="text-emerald-400" /> WHO Surgical Safety Checklist (T1)
//                 </h2>
//                 <div className="text-indigo-200 text-xs mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
//                   <span><strong className="text-indigo-100">MRN:</strong> {surgery?.mrn || 'N/A'}</span>|
//                   <span><strong className="text-indigo-100">PATIENT:</strong> {surgery?.first_name} {surgery?.last_name}</span>|
//                   <span><strong className="text-indigo-100">GENDER:</strong> {surgery?.gender}</span>|
//                   <span><strong className="text-indigo-100">AGE:</strong> {surgery?.age}</span>|
//                   <span><strong className="text-indigo-100">SURGERY:</strong> {surgery?.surgery_name}</span>|
//                   <span><strong className="text-indigo-100">CASE NO:</strong> {ot_case_number}</span>
//                 </div>
//               </div>
//             </div>
            
//             <div className="flex items-center gap-3">
//               {checklistData && (
//                 <button onClick={() => setShowPrintView(true)} disabled={isSaving} className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded flex items-center gap-2 text-sm font-bold transition-colors">
//                   <Printer size={16} /> Print
//                 </button>
//               )}
//               <div className="h-8 w-px bg-indigo-800 mx-2"></div>
//               <button onClick={toggleFullscreen} className="p-2 text-indigo-200 hover:text-white hover:bg-white/10 rounded transition-colors">
//                 {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
//               </button>
//               <button onClick={onClose} className="p-2 text-indigo-200 hover:text-red-400 hover:bg-white/10 rounded transition-colors">
//                 <X size={24} />
//               </button>
//             </div>
//           </div>

//           <div className="flex flex-1 overflow-hidden bg-white relative">
//             {isLoading && (
//               <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-white/70 backdrop-blur-sm transition-all">
//                 <Loader2 size={64} className="animate-spin text-[#2A157c] mb-4" />
//                 <h3 className="text-2xl font-black text-[#2A157c] tracking-tight animate-pulse">Loading Checklist...</h3>
//                 <p className="text-slate-600 font-medium mt-2">Retrieving patient safety records, please wait.</p>
//               </div>
//             )}

//             {/* Sidebar Navigation */}
//             <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto">
//               <div className="p-5 border-b border-slate-200 bg-slate-100 text-slate-800">
//                 <h3 className="font-black tracking-tight text-lg flex items-center gap-2">Workflow Stages</h3>
//                 <p className="text-xs text-slate-500 mt-1">Complete in sequential order</p>
//               </div>
//               <nav className="p-3 space-y-2">
//                 {STAGES.map((stage, idx) => {
//                   const isCompleted = completedStages[idx];
//                   const isActive = currentStage === idx;
//                   const firstIncompleteIdx = completedStages.findIndex(d => !d);
//                   const isLocked = !isCompleted && idx > (firstIncompleteIdx === -1 ? 4 : firstIncompleteIdx);

//                   return (
//                     <button
//                       key={stage.id}
//                       onClick={() => navigateToStage(idx)}
//                       disabled={isLocked}
//                       className={`w-full text-left px-4 py-3 rounded-lg text-sm font-bold transition-all flex items-center gap-3 border ${
//                         isActive
//                           ? "bg-white shadow-md border-indigo-200 text-indigo-800"
//                           : isLocked
//                           ? "bg-transparent text-slate-400 border-transparent cursor-not-allowed"
//                           : "bg-transparent text-slate-600 hover:bg-slate-100 border-transparent"
//                       }`}
//                     >
//                       {isCompleted ? (
//                         <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
//                       ) : (
//                         <Circle size={18} className={isActive ? "text-indigo-500 shrink-0" : "text-slate-300 shrink-0"} />
//                       )}
                      
//                       <div className="flex-1">
//                         <div className="leading-tight">{stage.name}</div>
//                         {isActive && <div className="text-[10px] font-normal text-indigo-500 mt-0.5">Currently Active</div>}
//                       </div>
//                     </button>
//                   );
//                 })}
//               </nav>

//               <div className="mt-auto p-4 border-t border-slate-200 bg-slate-100/50">
//                   <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
//                       <span>Completion</span>
//                       <span>{completedStages.filter(Boolean).length} / 5</span>
//                   </div>
//                   <div className="w-full bg-slate-200 rounded-full h-1.5">
//                       <div 
//                         className="bg-emerald-500 h-1.5 rounded-full transition-all" 
//                         style={{ width: `${(completedStages.filter(Boolean).length / 5) * 100}%` }}
//                       />
//                   </div>
//               </div>
//             </div>

//             {/* Main Stage Content */}
//             <div className="flex-1 overflow-hidden flex flex-col relative bg-slate-50/50">
//               {/* Stage Title Bar */}
//               <div className={`px-8 py-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0`}>
//                   <div className="flex items-center gap-3">
//                       <div className={`${STAGES[currentStage].color} text-white px-3 py-1 rounded font-black text-sm shadow-sm`}>
//                           Stage {currentStage + 1}
//                       </div>
//                       <h3 className="font-bold text-xl text-slate-800">{STAGES[currentStage].name}</h3>
//                   </div>
//               </div>

//               {/* Form Content */}
//               <div className="flex-1 overflow-y-auto p-8 relative">
//                 <div className="max-w-4xl mx-auto space-y-6">
//                   {isStageCompleted && (
//                     <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 shadow-sm">
//                       <CheckCircle2 className="text-emerald-600 mt-0.5 flex-shrink-0" size={20} />
//                       <div className="flex-1">
//                         <p className="font-bold text-emerald-800">Stage Completed Successfully</p>
//                         <p className="text-sm text-emerald-700 mt-1">
//                           This stage has been signed off and is locked.
//                           {!forceEditMode ? " Click edit to make modifications." : " You are now in edit mode."}
//                         </p>
//                       </div>
//                       {!forceEditMode ? (
//                         <button onClick={() => setForceEditMode(true)} className="px-4 py-1.5 bg-white border border-emerald-300 text-emerald-700 text-sm font-bold rounded shadow-sm hover:bg-emerald-100 transition-colors">
//                           Edit
//                         </button>
//                       ) : (
//                         <button onClick={() => setForceEditMode(false)} className="px-4 py-1.5 bg-slate-500 text-white text-sm font-bold rounded shadow-sm hover:bg-slate-600 transition-colors">
//                           Lock Form
//                         </button>
//                       )}
//                     </div>
//                   )}

//                   <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
//                     <CurrentStageComponent
//                       data={currentData}
//                       onChange={handleFieldChange}
//                       errors={errors}
//                       disabled={isDisabled}
//                     />
//                   </div>
//                 </div>
//               </div>

//               {/* Sticky Action Footer */}
//               <div className="bg-white px-8 py-4 border-t border-slate-200 flex items-center justify-between shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
//                 <button
//                   onClick={() => navigateToStage(currentStage - 1)}
//                   disabled={currentStage === 0 || isSaving}
//                   className="flex items-center gap-2 px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-bold transition-colors"
//                 >
//                   <ChevronLeft size={18} /> Previous Stage
//                 </button>

//                 <div className="flex gap-3">
//                   {currentStage === 4 ? (
//                     <button
//                       onClick={handleComplete}
//                       disabled={isSaving || (isStageCompleted && !forceEditMode)}
//                       className="flex items-center gap-2 px-8 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-bold shadow-md transition-all"
//                     >
//                       {isSaving ? (
//                         <><Loader2 size={18} className="animate-spin" /> Finalizing...</>
//                       ) : (
//                         <><Check size={18} /> Complete Checklist</>
//                       )}
//                     </button>
//                   ) : (
//                     <button
//                       onClick={handleNext}
//                       disabled={isSaving || (isStageCompleted && !forceEditMode)}
//                       className="flex items-center gap-2 px-8 py-2.5 bg-[#2A157c] text-white rounded-lg hover:bg-[#201060] disabled:opacity-50 font-bold shadow-md transition-all"
//                     >
//                       {isSaving ? (
//                         <><Loader2 size={18} className="animate-spin" /> Saving...</>
//                       ) : (
//                         <><Save size={18} /> Save & Next <ChevronRight size={18} /></>
//                       )}
//                     </button>
//                   )}
//                 </div>
//               </div>

//             </div>
//           </div>
//         </div>
//       </div>
//     </>
//   );
// };

// export default OTChecklistModal;
// // /**
// //  * OT Checklist Modal - Main Orchestrator
// //  * Manages 5-stage workflow: Ward Check 1 → Ward Check 2 → Sign In → Time Out → Sign Out
// //  */

// // import React, { useState, useEffect } from "react";
// // import {
// //   X,
// //   ChevronLeft,
// //   ChevronRight,
// //   Printer,
// //   AlertCircle,
// //   Loader,
// //   ArrowLeft,
// // } from "lucide-react";
// // import { useNotification } from "../context/NotificationContext";
// // import { useAuth } from "../context/AuthContext";
// // import { otChecklistService } from "../services/ot-checklist.service";
// // import {
// //   ChecklistData,
// //   OTChecklistModalProps,
// //   WardCheck1Data,
// //   WardCheck2Data,
// //   SignInData,
// //   TimeOutData,
// //   SignOutData,
// // } from "../types/ot-checklist.types";

// // // Stage Components
// // import OTChecklistWardCheck1 from "./OTChecklistWardCheck1";
// // import OTChecklistWardCheck2 from "./OTChecklistWardCheck2";
// // import OTChecklistSignIn from "./OTChecklistSignIn";
// // import OTChecklistTimeOut from "./OTChecklistTimeOut";
// // import OTChecklistSignOut from "./OTChecklistSignOut";
// // import OTChecklistPrintView from "./OTChecklistPrintView";

// // const STAGES = [
// //   { name: "Ward Check 1", shortName: "WC1", color: "bg-brand-active0" },
// //   { name: "Ward Check 2", shortName: "WC2", color: "bg-green-500" },
// //   { name: "Sign In", shortName: "Sign In", color: "bg-orange-500" },
// //   { name: "Time Out", shortName: "Time Out", color: "bg-pink-500" },
// //   { name: "Sign Out", shortName: "Sign Out", color: "bg-violet-500" },
// // ];

// // const OTChecklistModal: React.FC<OTChecklistModalProps> = ({
// //   isOpen,
// //   onClose,
// //   ot_case_id,
// //   ot_case_number,
// //   encounterData,
// //   onComplete,
// //   onBackToActions,
// // }) => {
// //   const { notify } = useNotification();
// //   const { user } = useAuth();

// //   // State Management
// //   const [currentStage, setCurrentStage] = useState(0);
// //   const [isLoading, setIsLoading] = useState(false);
// //   const [isSaving, setIsSaving] = useState(false);
// //   const [showPrintView, setShowPrintView] = useState(false);
// //   const [forceEditMode, setForceEditMode] = useState(false);
// //   const [completedStages, setCompletedStages] = useState<boolean[]>([
// //     false,
// //     false,
// //     false,
// //     false,
// //     false,
// //   ]);

// //   // Form data for all 5 stages
// //   const [formData, setFormData] = useState({
// //     ward1: {} as Partial<WardCheck1Data>,
// //     ward2: {} as Partial<WardCheck2Data>,
// //     sign_in: {} as Partial<SignInData>,
// //     time_out: {} as Partial<TimeOutData>,
// //     sign_out: {} as Partial<SignOutData>,
// //   });

// //   // Validation errors
// //   const [errors, setErrors] = useState<Record<string, string>>({});

// //   // Loaded checklist data (for reference and read-only past stages)
// //   const [checklistData, setChecklistData] = useState<ChecklistData | null>(
// //     null,
// //   );

// //   /**
// //    * Load existing checklist on mount
// //    */
// //   useEffect(() => {
// //     if (isOpen) {
// //       loadChecklistData();
// //     }
// //   }, [isOpen, ot_case_id]);

// //   const loadChecklistData = async () => {
// //     setIsLoading(true);
// //     try {
// //       const data = await otChecklistService.getChecklist(ot_case_id);

// //       if (data) {
// //         setChecklistData(data);
// //         const completed = otChecklistService.getCompletedStages(data);
// //         setCompletedStages(completed);

// //         // Pre-fill form with existing data
// //         prefillFormData(data);

// //         // Jump to first incomplete stage
// //         const firstIncompleteIdx = completed.findIndex((done) => !done);
// //         if (firstIncompleteIdx >= 0) {
// //           setCurrentStage(firstIncompleteIdx);
// //         }
// //       }
// //     } catch (error) {
// //       console.debug("No existing checklist found - creating new one");
// //       // This is OK - new checklist
// //     } finally {
// //       setIsLoading(false);
// //     }
// //   };

// //   /**
// //    * Pre-fill form data from existing checklist
// //    */
// //   const prefillFormData = (data: ChecklistData) => {
// //     setFormData({
// //       ward1: {
// //         stage: "ward1",
// //         ot_case_id,
// //         identity: data.wc1_identity_confirmed,
// //         documents: data.wc1_documents_checked,
// //         site_confirmed: data.wc1_site_confirmed,
// //         site_marked: data.wc1_site_marked,
// //         not_applicable: data.wc1_not_applicable,
// //         name: data.wc1_signed_name,
// //         designation: data.wc1_designation,
// //       },
// //       ward2: {
// //         stage: "ward2",
// //         ot_case_id,
// //         details_correct: data.wc2_patient_details_correct,
// //         site_checked: data.wc2_site_checked,
// //         not_applicable: data.wc2_not_applicable,
// //         name: data.wc2_signed_name,
// //         designation: data.wc2_designation,
// //       },
// //       sign_in: {
// //         stage: "sign_in",
// //         ot_case_id,
// //         identity: data.si_identity_confirmed,
// //         site_marked: data.si_site_marked,
// //         anaesthesia: data.si_anaesthesia_check,
// //         airway_risk: data.si_airway_risk,
// //         airway_prepared: data.si_airway_prepared,
// //         has_allergy: data.si_has_allergy,
// //         allergies: data.si_allergies_json
// //           ? JSON.parse(data.si_allergies_json as string)
// //           : null,
// //         has_implant: data.si_has_implant,
// //         implant_details: data.si_implant_details,
// //         blood_risk: data.si_blood_loss_risk,
// //         blood_prepared: data.si_blood_prepared,
// //       },
// //       time_out: {
// //         stage: "time_out",
// //         ot_case_id,
// //         patient_confirmed: data.to_patient_confirmed,
// //         procedure_confirmed: data.to_procedure_confirmed,
// //         surgeon_notes: data.to_surgeon_notes
// //           ? JSON.parse(data.to_surgeon_notes as string)
// //           : {},
// //         anaesthesia_notes: data.to_anaesthesia_notes
// //           ? JSON.parse(data.to_anaesthesia_notes as string)
// //           : {},
// //         nurse_notes: data.to_nurse_notes
// //           ? JSON.parse(data.to_nurse_notes as string)
// //           : {},
// //         antibiotic: data.to_antibiotic_given,
// //         warming: data.to_warming_done,
// //         hair: data.to_hair_removed,
// //         glycaemic: data.to_glycaemic_checked,
// //         vte: data.to_vte_prophylaxis,
// //         imaging: data.to_imaging_available,
// //       },
// //       sign_out: {
// //         stage: "sign_out",
// //         ot_case_id,
// //         procedure_recorded: data.so_procedure_recorded,
// //         counts_complete: data.so_counts_complete,
// //         specimen_labelled: data.so_specimen_labelled,
// //         equipment_issues: data.so_equipment_issues,
// //         recovery_concerns: data.so_recovery_concerns,
// //         imaging: data.so_imaging_displayed,
// //         surgeon_id: data.so_signed_by_surgeon,
// //         anaesthetist_id: data.so_signed_by_anaesthetist,
// //         nurse_id: data.so_signed_by_nurse,
// //       },
// //     });
// //   };

// //   /**
// //    * Validate current stage
// //    */
// //   const validateCurrentStage = (): boolean => {
// //     const newErrors: Record<string, string> = {};

// //     const stageData = [
// //       formData.ward1,
// //       formData.ward2,
// //       formData.sign_in,
// //       formData.time_out,
// //       formData.sign_out,
// //     ][currentStage] as any;

// //     // Required fields per stage
// //     if (currentStage === 0) {
// //       // Ward Check 1
// //       if (!stageData.identity && !stageData.not_applicable)
// //         newErrors.identity = "Identity check is required";
// //       if (!stageData.documents && !stageData.not_applicable)
// //         newErrors.documents = "Documents check is required";
// //       if (!stageData.site_confirmed && !stageData.not_applicable)
// //         newErrors.site_confirmed = "Site confirmation is required";
// //       if (!stageData.site_marked && !stageData.not_applicable)
// //         newErrors.site_marked = "Site marking is required";
// //       if (!stageData.name) newErrors.name = "Surgeon name is required";
// //       if (!stageData.designation)
// //         newErrors.designation = "Surgeon designation is required";
// //     } else if (currentStage === 1) {
// //       // Ward Check 2
// //       if (!stageData.details_correct && !stageData.not_applicable)
// //         newErrors.details_correct = "Patient details confirmation is required";
// //       if (!stageData.site_checked && !stageData.not_applicable)
// //         newErrors.site_checked = "Site check is required";
// //       if (!stageData.name) newErrors.name = "Nurse name is required";
// //       if (!stageData.designation)
// //         newErrors.designation = "Nurse designation is required";
// //     } else if (currentStage === 2) {
// //       // Sign In
// //       if (!stageData.identity)
// //         newErrors.identity = "Patient identity confirmation is required";
// //       if (!stageData.site_marked)
// //         newErrors.site_marked = "Site marking confirmation is required";
// //       if (!stageData.anaesthesia)
// //         newErrors.anaesthesia = "Anaesthesia check is required";
// //       if (!stageData.airway_risk)
// //         newErrors.airway_risk = "Airway risk assessment is required";
// //       // If allergy checkbox is checked, at least one allergy must be added
// //       if (stageData.has_allergy === 1) {
// //         if (!stageData.allergies || stageData.allergies.length === 0)
// //           newErrors.allergies = "At least one allergy must be added";
// //       }
// //     } else if (currentStage === 3) {
// //       // Time Out
// //       if (!stageData.patient_confirmed)
// //         newErrors.patient_confirmed = "Patient confirmation is required";
// //       if (!stageData.procedure_confirmed)
// //         newErrors.procedure_confirmed = "Procedure confirmation is required";
// //     } else if (currentStage === 4) {
// //       // Sign Out
// //       if (!stageData.procedure_recorded)
// //         newErrors.procedure_recorded = "Procedure recording is required";
// //       if (!stageData.counts_complete)
// //         newErrors.counts_complete = "Count completion is required";
// //       if (!stageData.surgeon_id)
// //         newErrors.surgeon_id = "Surgeon ID is required";
// //       if (!stageData.anaesthetist_id)
// //         newErrors.anaesthetist_id = "Anaesthetist ID is required";
// //       if (!stageData.nurse_id) newErrors.nurse_id = "Nurse ID is required";
// //     }

// //     setErrors(newErrors);
// //     return Object.keys(newErrors).length === 0;
// //   };

// //   /**
// //    * Normalize stage data to ensure unchecked fields send 0 instead of being omitted
// //    */
// //   const normalizeStageData = (stageKey: string, stageData: any) => {
// //     const normalized = { ...stageData };

// //     // Define all boolean fields for each stage
// //     const booleanFields: Record<string, string[]> = {
// //       ward1: [
// //         "identity",
// //         "documents",
// //         "site_confirmed",
// //         "site_marked",
// //         "not_applicable",
// //       ],
// //       ward2: ["details_correct", "site_checked", "not_applicable"],
// //       sign_in: [
// //         "identity",
// //         "site_marked",
// //         "anaesthesia",
// //         "airway_prepared",
// //         "has_allergy",
// //         "has_implant",
// //         "blood_risk",
// //         "blood_prepared",
// //       ],
// //       time_out: [
// //         "patient_confirmed",
// //         "procedure_confirmed",
// //         "antibiotic",
// //         "warming",
// //         "hair",
// //         "glycaemic",
// //         "vte",
// //         "imaging",
// //       ],
// //       sign_out: [
// //         "procedure_recorded",
// //         "counts_complete",
// //         "specimen_labelled",
// //         "imaging",
// //       ],
// //     };

// //     // Ensure all boolean fields are set to 0 if not provided
// //     const fieldsForStage = booleanFields[stageKey] || [];
// //     fieldsForStage.forEach((field) => {
// //       if (normalized[field] === undefined || normalized[field] === null) {
// //         normalized[field] = 0;
// //       }
// //     });

// //     return normalized;
// //   };

// //   /**
// //    * Save current stage to backend
// //    */
// //   const saveCurrentStage = async () => {
// //     if (!validateCurrentStage()) {
// //       notify("Please complete all required fields", "error");
// //       return false;
// //     }

// //     setIsSaving(true);
// //     try {
// //       const stageKey = ["ward1", "ward2", "sign_in", "time_out", "sign_out"][
// //         currentStage
// //       ] as keyof typeof formData;
// //       let stageData = formData[stageKey];

// //       // Normalize stage data - ensure unchecked fields send 0 instead of being omitted
// //       stageData = normalizeStageData(stageKey as string, stageData);

// //       // Prepare payload based on stage
// //       const payload = {
// //         ...stageData,
// //         ot_case_id,
// //         stage: stageKey,
// //       } as any;

// //       console.log(payload);

// //       const response = await otChecklistService.saveStage(payload);

// //       if (response.status === "success") {
// //         // Mark stage as completed
// //         const newCompleted = [...completedStages];
// //         newCompleted[currentStage] = true;
// //         setCompletedStages(newCompleted);

// //         notify(`${STAGES[currentStage].name} saved successfully`, "success");
// //         return true;
// //       }
// //     } catch (error: any) {
// //       const errorMsg = error.response?.data?.message || error.message || "Failed to save stage";
// //       notify(errorMsg, "error");
// //       return false;
// //     } finally {
// //       setIsSaving(false);
// //     }
// //   };

// //   /**
// //    * Handle field changes
// //    */
// //   const handleFieldChange = (fieldName: string, value: any) => {
// //     const stageKey = ["ward1", "ward2", "sign_in", "time_out", "sign_out"][
// //       currentStage
// //     ] as keyof typeof formData;

// //     setFormData((prev) => ({
// //       ...prev,
// //       [stageKey]: {
// //         ...prev[stageKey],
// //         [fieldName]: value,
// //       },
// //     }));

// //     // Clear field error on change
// //     if (errors[fieldName]) {
// //       const newErrors = { ...errors };
// //       delete newErrors[fieldName];
// //       setErrors(newErrors);
// //     }
// //   };

// //   /**
// //    * Handle pagination
// //    */
// //   const handleNext = async () => {
// //     const saved = await saveCurrentStage();
// //     if (saved && currentStage < 4) {
// //       setCurrentStage(currentStage + 1);
// //       setForceEditMode(false);
// //     }
// //   };

// //   const handlePrevious = () => {
// //     if (currentStage > 0) {
// //       setCurrentStage(currentStage - 1);
// //       setForceEditMode(false);
// //     }
// //   };

// //   /**
// //    * Handle form completion
// //    */
// //   const handleComplete = async () => {
// //     const saved = await saveCurrentStage();
// //     if (
// //       saved &&
// //       completedStages.every((done, idx) => idx <= currentStage || done)
// //     ) {
// //       notify(
// //         "WHO Surgical Safety Checklist completed successfully!",
// //         "success",
// //       );

// //       // Reload checklist to get final data
// //       const finalData = await otChecklistService.getChecklist(ot_case_id);
// //       if (finalData && onComplete) {
// //         onComplete(finalData);
// //       }

// //       setTimeout(() => onClose(), 1500);
// //     }
// //   };

// //   const handlePrint = () => {
// //     if (checklistData) {
// //       setShowPrintView(true);
// //     }
// //   };

// //   if (!isOpen) return null;

// //   // Get current stage data
// //   const stageComponents = [
// //     OTChecklistWardCheck1,
// //     OTChecklistWardCheck2,
// //     OTChecklistSignIn,
// //     OTChecklistTimeOut,
// //     OTChecklistSignOut,
// //   ];

// //   const CurrentStageComponent = stageComponents[currentStage];
// //   const stageKey = ["ward1", "ward2", "sign_in", "time_out", "sign_out"][
// //     currentStage
// //   ] as keyof typeof formData;
// //   const currentData = formData[stageKey];
// //   const isStageCompleted = completedStages[currentStage];
// //   const isDisabled = isStageCompleted && checklistData && !forceEditMode; // Disable if stage is already completed (unless force edit mode is on)

// //   return (
// //     <>
// //       {/* Print View Modal */}
// //       {showPrintView && checklistData && (
// //         <OTChecklistPrintView
// //           checklistData={checklistData}
// //           isOpen={showPrintView}
// //           onClose={() => setShowPrintView(false)}
// //         />
// //       )}

// //       {/* Main Modal */}
// //       <div className="fixed inset-0 z-50 overflow-y-auto">
// //         {/* Backdrop */}
// //         <div
// //           className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
// //           onClick={onClose}
// //         />

// //         {/* Modal Content */}
// //         <div className="relative mx-auto my-8 max-w-4xl">
// //           <div className="bg-white rounded-lg shadow-xl overflow-hidden">
// //             {/* Header */}
// //             <div className="bg-gradient-to-r from-slate-900 to-slate-700 px-6 py-4 text-white flex items-center justify-between">
// //               <div className="flex items-center gap-3">
// //                 {onBackToActions && (
// //                   <button
// //                     onClick={onBackToActions}
// //                     className="p-1.5 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
// //                     title="Back to Actions"
// //                   >
// //                     <ArrowLeft size={18} />
// //                   </button>
// //                 )}
// //                 <div>
// //                   <h2 className="text-2xl font-bold">
// //                     WHO Surgical Safety Checklist - T1
// //                   </h2>
// //                   <p className="text-slate-300 text-sm mt-1">
// //                     Case: {ot_case_id}
// //                     {encounterData?.patient_name &&
// //                       ` • ${encounterData.patient_name}`}
// //                   </p>
                  
                  
// //                   <p className="text-slate-300 text-sm mt-1">
// //                     Case: {ot_case_number}
// //                     {encounterData?.ot_case_number &&
// //                       ` • ${encounterData.surgery_name}`}
// //                   </p>
// //                 </div>
// //               </div>
// //               <button
// //                 onClick={onClose}
// //                 disabled={isSaving}
// //                 className="text-white hover:bg-slate-700 p-2 rounded-lg disabled:opacity-50"
// //               >
// //                 <X size={24} />
// //               </button>
// //             </div>

// //             {/* Loading State */}
// //             {isLoading ? (
// //               <div className="flex items-center justify-center py-20">
// //                 <Loader className="animate-spin mr-3" size={24} />
// //                 <span>Loading checklist...</span>
// //               </div>
// //             ) : (
// //               <>
// //                 {/* Progress Bar */}
// //                 <div className="bg-slate-100 px-6 py-4">
// //                   <div className="flex items-center justify-between mb-3">
// //                     <h3 className="font-bold text-gray-900">Progress</h3>
// //                     <span className="text-sm text-gray-600">
// //                       Stage {currentStage + 1} of 5
// //                     </span>
// //                   </div>

// //                   <div className="flex gap-2">
// //                     {STAGES.map((stage, idx) => (
// //                       <div key={idx} className="flex-1">
// //                         <div
// //                           className={`h-2 rounded-full transition-colors ${
// //                             idx === currentStage
// //                               ? stage.color
// //                               : completedStages[idx]
// //                                 ? "bg-green-500"
// //                                 : "bg-gray-300"
// //                           }`}
// //                         />
// //                         <p className="text-xs text-center mt-1 font-semibold text-gray-700">
// //                           {stage.shortName}
// //                         </p>
// //                       </div>
// //                     ))}
// //                   </div>

// //                   {/* Status Summary */}
// //                   <div className="mt-4 grid grid-cols-5 gap-2 text-xs">
// //                     {STAGES.map((stage, idx) => (
// //                       <div
// //                         key={idx}
// //                         className={`text-center py-2 rounded ${
// //                           completedStages[idx]
// //                             ? "bg-green-100 text-green-700 font-semibold"
// //                             : "bg-gray-100 text-gray-600"
// //                         }`}
// //                       >
// //                         {completedStages[idx] ? "✓ Done" : "Pending"}
// //                       </div>
// //                     ))}
// //                   </div>
// //                 </div>

// //                 {/* Form Content */}
// //                 <div className="px-6 py-6 max-h-[60vh] overflow-y-auto">
// //                   {isStageCompleted && (
// //                     <div className="mb-4 p-4 bg-brand-active border border-brand-active rounded-lg flex items-start gap-3">
// //                       <AlertCircle
// //                         className="text-brand-primary mt-0.5 flex-shrink-0"
// //                         size={20}
// //                       />
// //                       <div className="flex-1">
// //                         <p className="font-semibold text-brand-primary">
// //                           Stage Completed
// //                         </p>
// //                         <p className="text-sm text-brand-primary">
// //                           This stage is already completed.
// //                           {!forceEditMode
// //                             ? " You can edit it using the button below."
// //                             : " Now in edit mode."}
// //                         </p>
// //                       </div>
// //                       {!forceEditMode ? (
// //                         <button
// //                           onClick={() => setForceEditMode(true)}
// //                           className="ml-2 px-3 py-1 bg-brand-primary text-white text-sm rounded hover:bg-brand-primary transition-colors whitespace-nowrap"
// //                         >
// //                           Edit
// //                         </button>
// //                       ) : (
// //                         <button
// //                           onClick={() => setForceEditMode(false)}
// //                           className="ml-2 px-3 py-1 bg-slate-400 text-white text-sm rounded hover:bg-slate-500 transition-colors whitespace-nowrap"
// //                         >
// //                           Lock
// //                         </button>
// //                       )}
// //                     </div>
// //                   )}

// //                   <CurrentStageComponent
// //                     data={currentData}
// //                     onChange={handleFieldChange}
// //                     errors={errors}
// //                     disabled={isDisabled}
// //                   />
// //                 </div>

// //                 {/* Footer / Actions */}
// //                 <div className="bg-slate-50 px-6 py-4 flex items-center justify-between border-t">
// //                   <button
// //                     onClick={handlePrevious}
// //                     disabled={currentStage === 0 || isSaving}
// //                     className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
// //                   >
// //                     <ChevronLeft size={18} /> Previous
// //                   </button>

// //                   <div className="flex gap-2">
// //                     {checklistData && (
// //                       <button
// //                         onClick={handlePrint}
// //                         disabled={isSaving}
// //                         className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary disabled:opacity-50 font-semibold"
// //                       >
// //                         <Printer size={18} /> Print
// //                       </button>
// //                     )}

// //                     {currentStage === 4 ? (
// //                       <button
// //                         onClick={handleComplete}
// //                         disabled={isSaving}
// //                         className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-semibold"
// //                       >
// //                         {isSaving ? (
// //                           <>
// //                             <Loader size={18} className="animate-spin" />{" "}
// //                             Completing...
// //                           </>
// //                         ) : (
// //                           "Complete Checklist"
// //                         )}
// //                       </button>
// //                     ) : (
// //                       <button
// //                         onClick={handleNext}
// //                         disabled={isSaving}
// //                         className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 font-semibold"
// //                       >
// //                         {isSaving ? (
// //                           <>
// //                             <Loader size={18} className="animate-spin" />{" "}
// //                             Saving...
// //                           </>
// //                         ) : (
// //                           <>
// //                             Next <ChevronRight size={18} />
// //                           </>
// //                         )}
// //                       </button>
// //                     )}
// //                   </div>
// //                 </div>
// //               </>
// //             )}
// //           </div>
// //         </div>
// //       </div>
// //     </>
// //   );
// // };

// // export default OTChecklistModal;
