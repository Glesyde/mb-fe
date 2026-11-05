/**
 * Preoperative Huddle Modal - Main Orchestrator
 * Manages 4-stage workflow: Surgeon → Anaesthetist → Scrub Nurse → Complete
 */

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
  Printer,
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
import { otPreopHuddleService } from "../services/ot-preop-huddle.service";
import {
  PreopHuddleSurgeonData,
  PreopHuddleAnaesthetistData,
  PreopHuddleScrubData,
  PreopHuddleCompleteData,
} from "../services/ot-preop-huddle.service";

// Stage Components
import PreopHuddleSurgeon from "./PreopHuddleSurgeon";
import PreopHuddleAnaesthetist from "./PreopHuddleAnaesthetist";
import PreopHuddleScrub from "./PreopHuddleScrub";
import PreopHuddleComplete from "./PreopHuddleComplete";
import PreopHuddlePrintView from "./PreopHuddlePrintView";

const STAGES = [
  { id: 0, name: "Surgeon", shortName: "S", color: "bg-blue-600", border: "border-blue-200" },
  { id: 1, name: "Anaesthetist", shortName: "A", color: "bg-teal-600", border: "border-teal-200" },
  { id: 2, name: "Scrub Nurse", shortName: "SN", color: "bg-orange-500", border: "border-orange-200" },
  { id: 3, name: "Complete", shortName: "C", color: "bg-green-600", border: "border-green-200" },
];

export interface PreopHuddleModalProps {
  isOpen: boolean;
  onClose: () => void;
  ot_case_id: number;
  ot_case_number?: string;
  surgery?: any; 
  encounterData?: any; 
  onComplete?: () => void;
  onBackToActions?: () => void;
}

const PreopHuddleModal: React.FC<PreopHuddleModalProps> = ({
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

  const [currentStage, setCurrentStage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [forceEditMode, setForceEditMode] = useState(false);
  const [showPrintView, setShowPrintView] = useState(false);
  const [completedStages, setCompletedStages] = useState<boolean[]>([
    false, false, false, false,
  ]);

  const [formData, setFormData] = useState({
    surgeon: {} as Partial<PreopHuddleSurgeonData>,
    anaesthetist: {} as Partial<PreopHuddleAnaesthetistData>,
    scrub: {} as Partial<PreopHuddleScrubData>,
    complete: {} as Partial<PreopHuddleCompleteData>,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [huddleData, setHuddleData] = useState<any>(null);

  // Safely extract data from API response first, then fall back to props
  const patientName = huddleData?.patient_name 
    || (surgery?.first_name ? `${surgery.first_name} ${surgery.last_name}` : null) 
    || encounterData?.patient_name 
    || 'Unknown Patient';
    
  const patientMRN = huddleData?.mrn || surgery?.mrn || encounterData?.mrn || 'N/A';
  const patientGender = huddleData?.gender || surgery?.gender || encounterData?.gender || 'N/A';
  const patientAge = huddleData?.age || surgery?.age || encounterData?.age || 'N/A';
  const procedureName = huddleData?.procedure_name || huddleData?.surgery_name || surgery?.surgery_name || encounterData?.procedure_name || encounterData?.surgery_name || 'N/A';
  const roomName = huddleData?.room_name || surgery?.room_name || encounterData?.room_name || 'N/A';
  const displayCaseNumber = huddleData?.ot_case_number || ot_case_number || surgery?.ot_case_number || encounterData?.ot_case_number || 'N/A';

  useEffect(() => {
    if (isOpen) {
      loadHuddleData();
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

  const loadHuddleData = async () => {
    setIsLoading(true);
    try {
      const data = await otPreopHuddleService.getHuddle(ot_case_id);
      if (data && !Array.isArray(data)) {
        setHuddleData(data);
        const completed = otPreopHuddleService.getCompletedStages(data);
        setCompletedStages(completed);

        prefillFormData(data);

        const firstIncompleteIdx = completed.findIndex((done) => !done);
        if (firstIncompleteIdx >= 0) {
          setCurrentStage(firstIncompleteIdx);
        } else {
          setCurrentStage(3); // Go to last stage if all completed
        }
      }
    } catch (err) {
      // If the API returns 404 or "Preop huddle not found", we just ignore it.
      // It simply means this is a brand new huddle.
      console.debug("No existing huddle found - creating new one");
    } finally {
      setIsLoading(false);
    }
  };

  const prefillFormData = (data: any) => {
    setFormData({
      surgeon: {
        stage: "surgeon",
        ot_case_id,
        identity_confirmed: data.identity_confirmed,
        procedure_position: data.procedure_position,
        equipment_discussed: data.equipment_discussed,
        blood_loss_risk: data.blood_loss_risk,
        blood_prepared: data.blood_prepared,
        imaging_reviewed: data.imaging_reviewed,
        special_equipment: data.special_equipment,
        critical_steps: data.critical_steps,
        patient_specific_concerns: data.patient_specific_concerns,
        surgeon_id: data.surgeon_id,
        surgeon_name: data.surgeon_name_resolved || data.surgeon_name,
        surgeon_designation: data.surgeon_designation,
      },
      anaesthetist: {
        stage: "anaesthetist",
        ot_case_id,
        airway_risk: data.airway_risk,
        airway_prepared: data.airway_prepared,
        has_allergy: data.has_allergy,
        allergies_json:
          typeof data.allergies_json === "string"
            ? JSON.parse(data.allergies_json)
            : data.allergies_json || [],
        asa_grade: data.asa_grade,
        risk_score: data.risk_score,
        monitoring_plan: data.monitoring_plan,
        anaesthetist_id: data.anaesthetist_id,
        anaesthetist_name: data.anaesthetist_name_resolved || data.anaesthetist_name,
        anaesthetist_designation: data.anaesthetist_designation,
      },
      scrub: {
        stage: "scrub",
        ot_case_id,
        instrument_sterility_confirmed: data.instrument_sterility_confirmed,
        equipment_ready_confirmed: data.equipment_ready_confirmed,
        equipment_issues_flag: data.equipment_issues_flag,
        equipment_issue_details: data.equipment_issue_details,
        team_introduced: data.team_introduced,
        imaging_displayed: data.imaging_displayed,
        nurse_id: data.nurse_id,
        nurse_name: data.nurse_name_resolved || data.nurse_name,
        nurse_designation: data.nurse_designation,
      },
      complete: {
        stage: "complete",
        ot_case_id,
        icu_required: data.icu_required,
        recovery_concerns: data.recovery_concerns,
        completed: data.completed,
      },
    });
  };

  const validateCurrentStage = (): boolean => {
    const stageKey = ["surgeon", "anaesthetist", "scrub", "complete"][currentStage] as keyof typeof formData;
    const stageData = formData[stageKey];
    const newErrors: Record<string, string> = {};

    if (currentStage === 0) {
      if (!stageData.identity_confirmed) newErrors.identity_confirmed = "Identity confirmation is required";
      if (!stageData.procedure_position) newErrors.procedure_position = "Procedure position is required";
      if (!stageData.surgeon_name) newErrors.surgeon_name = "Surgeon name is required";
    } else if (currentStage === 1) {
      if (!stageData.airway_risk) newErrors.airway_risk = "Airway risk assessment is required";
      if (!stageData.asa_grade) newErrors.asa_grade = "ASA grade is required";
      if (!stageData.anaesthetist_name) newErrors.anaesthetist_name = "Anaesthetist name is required";
    } else if (currentStage === 2) {
      if (!stageData.instrument_sterility_confirmed) newErrors.instrument_sterility_confirmed = "Sterility confirmation is required";
      if (!stageData.nurse_name) newErrors.nurse_name = "Nurse name is required";
    } else if (currentStage === 3) {
      if (!stageData.completed) newErrors.completed = "Huddle completion confirmation is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const saveCurrentStage = async () => {
    if (!validateCurrentStage()) {
      notify("Please complete all required fields", "error");
      return false;
    }

    setIsSaving(true);
    try {
      const stageKey = ["surgeon", "anaesthetist", "scrub", "complete"][currentStage] as string;
      let stageData = formData[stageKey as keyof typeof formData];

      if (stageKey === "anaesthetist" && (stageData as any).allergies_json) {
        stageData = { ...stageData, allergies_json: (stageData as any).allergies_json };
      }

      const payload = { ...stageData, ot_case_id, stage: stageKey } as any;
      const response = await otPreopHuddleService.saveStage(payload);

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
    const stageKey = ["surgeon", "anaesthetist", "scrub", "complete"][currentStage] as keyof typeof formData;
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
    if (saved && currentStage < 3) {
      setCurrentStage(currentStage + 1);
      setForceEditMode(false);
    }
  };

  const handleComplete = async () => {
    const saved = await saveCurrentStage();
    if (saved) {
      notify("Preoperative huddle completed successfully!", "success");
      onComplete?.();
      setTimeout(() => onClose(), 1500);
    }
  };

  // Prevent accessing future uncompleted stages via sidebar to enforce workflow
  const navigateToStage = (idx: number) => {
    if (idx === currentStage) return;
    const firstIncompleteIdx = completedStages.findIndex((done) => !done);
    const maxAllowed = firstIncompleteIdx === -1 ? 3 : firstIncompleteIdx;
    
    if (idx <= maxAllowed) {
        setCurrentStage(idx);
        setForceEditMode(false);
    } else {
        notify("Please complete previous stages first.", "warning");
    }
  };

  const getCurrentStageComponent = () => {
    const stageKey = ["surgeon", "anaesthetist", "scrub", "complete"][currentStage] as keyof typeof formData;
    const isStageCompleted = completedStages[currentStage];
    const isDisabled = isStageCompleted && huddleData && !forceEditMode;

    const props = {
      data: formData[stageKey] || {},
      onChange: handleFieldChange,
      errors,
      disabled: isDisabled,
    };

    switch (currentStage) {
      case 0: return <PreopHuddleSurgeon {...props} />;
      case 1: return <PreopHuddleAnaesthetist {...props} />;
      case 2: return <PreopHuddleScrub {...props} />;
      case 3: return <PreopHuddleComplete {...props} />;
      default: return null;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {showPrintView && huddleData && (
        <PreopHuddlePrintView huddleData={huddleData} isOpen={showPrintView} onClose={() => setShowPrintView(false)} />
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
                  <ShieldCheck size={20} className="text-emerald-400" /> Preoperative Team Huddle (T2)
                </h2>
                <div className="text-indigo-200 text-xs mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
                  <span><strong className="text-indigo-100">MRN:</strong> {patientMRN}</span>|
                  <span><strong className="text-indigo-100">PATIENT:</strong> {patientName}</span>|
                  <span><strong className="text-indigo-100">GENDER:</strong> {patientGender}</span>|
                  <span><strong className="text-indigo-100">AGE:</strong> {patientAge}</span>|
                  <span><strong className="text-indigo-100">SURGERY:</strong> {procedureName}</span>|
                  <span><strong className="text-indigo-100">ROOM:</strong> {roomName}</span>|
                  <span><strong className="text-indigo-100">CASE NO:</strong> {displayCaseNumber}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {huddleData && (
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
                <h3 className="text-2xl font-black text-[#2A157c] tracking-tight animate-pulse">Loading Huddle...</h3>
                <p className="text-slate-600 font-medium mt-2">Retrieving team safety records, please wait.</p>
              </div>
            )}

            {/* Sidebar Navigation */}
            <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto">
              <div className="p-5 border-b border-slate-200 bg-slate-100 text-slate-800">
                <h3 className="font-black tracking-tight text-lg flex items-center gap-2">Huddle Stages</h3>
                <p className="text-xs text-slate-500 mt-1">Complete in sequential order</p>
              </div>
              <nav className="p-3 space-y-2">
                {STAGES.map((stage, idx) => {
                  const isCompleted = completedStages[idx];
                  const isActive = currentStage === idx;
                  const firstIncompleteIdx = completedStages.findIndex(d => !d);
                  const isLocked = !isCompleted && idx > (firstIncompleteIdx === -1 ? 3 : firstIncompleteIdx);

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
                      <span>{completedStages.filter(Boolean).length} / 4</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5">
                      <div 
                        className="bg-emerald-500 h-1.5 rounded-full transition-all" 
                        style={{ width: `${(completedStages.filter(Boolean).length / 4) * 100}%` }}
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
                  {completedStages[currentStage] && (
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
                    {getCurrentStageComponent()}
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
                  {currentStage === 3 ? (
                    <button
                      onClick={handleComplete}
                      disabled={isSaving || (completedStages[currentStage] && !forceEditMode)}
                      className="flex items-center gap-2 px-8 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-bold shadow-md transition-all"
                    >
                      {isSaving ? (
                        <><Loader2 size={18} className="animate-spin" /> Finalizing...</>
                      ) : (
                        <><Check size={18} /> Complete Huddle</>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={handleNext}
                      disabled={isSaving || (completedStages[currentStage] && !forceEditMode)}
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

export { PreopHuddleModal };


// /**
//  * Preoperative Huddle Modal - Main Orchestrator
//  * Manages 4-stage workflow: Surgeon → Anaesthetist → Scrub Nurse → Complete
//  */

// import React, { useState, useEffect, useRef } from "react";
// import {
//   X,
//   ChevronLeft,
//   ChevronRight,
//   AlertCircle,
//   Loader2,
//   Printer,
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
// import { otPreopHuddleService } from "../services/ot-preop-huddle.service";
// import {
//   PreopHuddleSurgeonData,
//   PreopHuddleAnaesthetistData,
//   PreopHuddleScrubData,
//   PreopHuddleCompleteData,
// } from "../services/ot-preop-huddle.service";

// // Stage Components
// import PreopHuddleSurgeon from "./PreopHuddleSurgeon";
// import PreopHuddleAnaesthetist from "./PreopHuddleAnaesthetist";
// import PreopHuddleScrub from "./PreopHuddleScrub";
// import PreopHuddleComplete from "./PreopHuddleComplete";
// import PreopHuddlePrintView from "./PreopHuddlePrintView";

// const STAGES = [
//   { id: 0, name: "Surgeon", shortName: "S", color: "bg-blue-600", border: "border-blue-200" },
//   { id: 1, name: "Anaesthetist", shortName: "A", color: "bg-teal-600", border: "border-teal-200" },
//   { id: 2, name: "Scrub Nurse", shortName: "SN", color: "bg-orange-500", border: "border-orange-200" },
//   { id: 3, name: "Complete", shortName: "C", color: "bg-green-600", border: "border-green-200" },
// ];

// export interface PreopHuddleModalProps {
//   isOpen: boolean;
//   onClose: () => void;
//   ot_case_id: number;
//   ot_case_number?: string;
//   surgery?: any; 
//   encounterData?: any; 
//   onComplete?: () => void;
//   onBackToActions?: () => void;
// }

// const PreopHuddleModal: React.FC<PreopHuddleModalProps> = ({
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

//   // DOM & UI State
//   const [isFullscreen, setIsFullscreen] = useState(false);
//   const containerRef = useRef<HTMLDivElement>(null);

//   const [currentStage, setCurrentStage] = useState(0);
//   const [isLoading, setIsLoading] = useState(false);
//   const [isSaving, setIsSaving] = useState(false);
//   const [forceEditMode, setForceEditMode] = useState(false);
//   const [showPrintView, setShowPrintView] = useState(false);
//   const [completedStages, setCompletedStages] = useState<boolean[]>([
//     false, false, false, false,
//   ]);

//   const [formData, setFormData] = useState({
//     surgeon: {} as Partial<PreopHuddleSurgeonData>,
//     anaesthetist: {} as Partial<PreopHuddleAnaesthetistData>,
//     scrub: {} as Partial<PreopHuddleScrubData>,
//     complete: {} as Partial<PreopHuddleCompleteData>,
//   });

//   const [errors, setErrors] = useState<Record<string, string>>({});
//   const [huddleData, setHuddleData] = useState<any>(null);

//   // Safely extract data from API response first, then fall back to props
//   const patientName = huddleData?.patient_name 
//     || (surgery?.first_name ? `${surgery.first_name} ${surgery.last_name}` : null) 
//     || encounterData?.patient_name 
//     || 'Unknown Patient';
    
//   const patientMRN = huddleData?.mrn || surgery?.mrn || encounterData?.mrn || 'N/A';
//   const patientGender = huddleData?.gender || surgery?.gender || encounterData?.gender || 'N/A';
//   const patientAge = huddleData?.age || surgery?.age || encounterData?.age || 'N/A';
//   const procedureName = huddleData?.procedure_name || huddleData?.surgery_name || surgery?.surgery_name || encounterData?.procedure_name || encounterData?.surgery_name || 'N/A';
//   const roomName = huddleData?.room_name || encounterData?.room_name || 'N/A';
//   const displayCaseNumber = huddleData?.ot_case_number || ot_case_number || encounterData?.ot_case_number || 'N/A';

//   useEffect(() => {
//     if (isOpen) {
//       loadHuddleData();
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

//   const loadHuddleData = async () => {
//     setIsLoading(true);
//     try {
//       const data = await otPreopHuddleService.getHuddle(ot_case_id);
//       if (data) {
//         setHuddleData(data);
//         const completed = otPreopHuddleService.getCompletedStages(data);
//         setCompletedStages(completed);

//         prefillFormData(data);

//         const firstIncompleteIdx = completed.findIndex((done) => !done);
//         if (firstIncompleteIdx >= 0) {
//           setCurrentStage(firstIncompleteIdx);
//         } else {
//           setCurrentStage(3); // Go to last stage if all completed
//         }
//       }
//     } catch (err) {
//       console.error("Failed to load huddle data", err);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const prefillFormData = (data: any) => {
//     setFormData({
//       surgeon: {
//         stage: "surgeon",
//         ot_case_id,
//         identity_confirmed: data.identity_confirmed,
//         procedure_position: data.procedure_position,
//         equipment_discussed: data.equipment_discussed,
//         blood_loss_risk: data.blood_loss_risk,
//         blood_prepared: data.blood_prepared,
//         imaging_reviewed: data.imaging_reviewed,
//         special_equipment: data.special_equipment,
//         critical_steps: data.critical_steps,
//         patient_specific_concerns: data.patient_specific_concerns,
//         surgeon_id: data.surgeon_id,
//         surgeon_name: data.surgeon_name,
//         surgeon_designation: data.surgeon_designation,
//       },
//       anaesthetist: {
//         stage: "anaesthetist",
//         ot_case_id,
//         airway_risk: data.airway_risk,
//         airway_prepared: data.airway_prepared,
//         has_allergy: data.has_allergy,
//         allergies_json:
//           typeof data.allergies_json === "string"
//             ? JSON.parse(data.allergies_json)
//             : data.allergies_json || [],
//         asa_grade: data.asa_grade,
//         risk_score: data.risk_score,
//         monitoring_plan: data.monitoring_plan,
//         anaesthetist_id: data.anaesthetist_id,
//         anaesthetist_name: data.anaesthetist_name,
//         anaesthetist_designation: data.anaesthetist_designation,
//       },
//       scrub: {
//         stage: "scrub",
//         ot_case_id,
//         instrument_sterility_confirmed: data.instrument_sterility_confirmed,
//         equipment_ready_confirmed: data.equipment_ready_confirmed,
//         equipment_issues_flag: data.equipment_issues_flag,
//         equipment_issue_details: data.equipment_issue_details,
//         team_introduced: data.team_introduced,
//         imaging_displayed: data.imaging_displayed,
//         nurse_id: data.nurse_id,
//         nurse_name: data.nurse_name,
//         nurse_designation: data.nurse_designation,
//       },
//       complete: {
//         stage: "complete",
//         ot_case_id,
//         icu_required: data.icu_required,
//         recovery_concerns: data.recovery_concerns,
//         completed: data.completed,
//       },
//     });
//   };

//   const validateCurrentStage = (): boolean => {
//     const stageKey = ["surgeon", "anaesthetist", "scrub", "complete"][currentStage] as keyof typeof formData;
//     const stageData = formData[stageKey];
//     const newErrors: Record<string, string> = {};

//     if (currentStage === 0) {
//       if (!stageData.identity_confirmed) newErrors.identity_confirmed = "Identity confirmation is required";
//       if (!stageData.procedure_position) newErrors.procedure_position = "Procedure position is required";
//       if (!stageData.surgeon_name) newErrors.surgeon_name = "Surgeon name is required";
//     } else if (currentStage === 1) {
//       if (!stageData.airway_risk) newErrors.airway_risk = "Airway risk assessment is required";
//       if (!stageData.asa_grade) newErrors.asa_grade = "ASA grade is required";
//       if (!stageData.anaesthetist_name) newErrors.anaesthetist_name = "Anaesthetist name is required";
//     } else if (currentStage === 2) {
//       if (!stageData.instrument_sterility_confirmed) newErrors.instrument_sterility_confirmed = "Sterility confirmation is required";
//       if (!stageData.nurse_name) newErrors.nurse_name = "Nurse name is required";
//     } else if (currentStage === 3) {
//       if (!stageData.completed) newErrors.completed = "Huddle completion confirmation is required";
//     }

//     setErrors(newErrors);
//     return Object.keys(newErrors).length === 0;
//   };

//   const saveCurrentStage = async () => {
//     if (!validateCurrentStage()) {
//       notify("Please complete all required fields", "error");
//       return false;
//     }

//     setIsSaving(true);
//     try {
//       const stageKey = ["surgeon", "anaesthetist", "scrub", "complete"][currentStage] as string;
//       let stageData = formData[stageKey as keyof typeof formData];

//       if (stageKey === "anaesthetist" && (stageData as any).allergies_json) {
//         stageData = { ...stageData, allergies_json: (stageData as any).allergies_json };
//       }

//       const payload = { ...stageData, ot_case_id, stage: stageKey } as any;
//       const response = await otPreopHuddleService.saveStage(payload);

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
//     const stageKey = ["surgeon", "anaesthetist", "scrub", "complete"][currentStage] as keyof typeof formData;
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
//     if (saved && currentStage < 3) {
//       setCurrentStage(currentStage + 1);
//       setForceEditMode(false);
//     }
//   };

//   const handleComplete = async () => {
//     const saved = await saveCurrentStage();
//     if (saved) {
//       notify("Preoperative huddle completed successfully!", "success");
//       onComplete?.();
//       setTimeout(() => onClose(), 1500);
//     }
//   };

//   // Prevent accessing future uncompleted stages via sidebar to enforce workflow
//   const navigateToStage = (idx: number) => {
//     if (idx === currentStage) return;
//     const firstIncompleteIdx = completedStages.findIndex((done) => !done);
//     const maxAllowed = firstIncompleteIdx === -1 ? 3 : firstIncompleteIdx;
    
//     if (idx <= maxAllowed) {
//         setCurrentStage(idx);
//         setForceEditMode(false);
//     } else {
//         notify("Please complete previous stages first.", "warning");
//     }
//   };

//   const getCurrentStageComponent = () => {
//     const stageKey = ["surgeon", "anaesthetist", "scrub", "complete"][currentStage] as keyof typeof formData;
//     const isStageCompleted = completedStages[currentStage];
//     const isDisabled = isStageCompleted && huddleData && !forceEditMode;

//     const props = {
//       data: formData[stageKey] || {},
//       onChange: handleFieldChange,
//       errors,
//       disabled: isDisabled,
//     };

//     switch (currentStage) {
//       case 0: return <PreopHuddleSurgeon {...props} />;
//       case 1: return <PreopHuddleAnaesthetist {...props} />;
//       case 2: return <PreopHuddleScrub {...props} />;
//       case 3: return <PreopHuddleComplete {...props} />;
//       default: return null;
//     }
//   };

//   if (!isOpen) return null;

//   return (
//     <>
//       {showPrintView && huddleData && (
//         <PreopHuddlePrintView huddleData={huddleData} isOpen={showPrintView} onClose={() => setShowPrintView(false)} />
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
//                   <ShieldCheck size={20} className="text-emerald-400" /> Preoperative Team Huddle (T2)
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
//               {huddleData && (
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
//                 <h3 className="text-2xl font-black text-[#2A157c] tracking-tight animate-pulse">Loading Huddle...</h3>
//                 <p className="text-slate-600 font-medium mt-2">Retrieving team safety records, please wait.</p>
//               </div>
//             )}

//             {/* Sidebar Navigation */}
//             <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto">
//               <div className="p-5 border-b border-slate-200 bg-slate-100 text-slate-800">
//                 <h3 className="font-black tracking-tight text-lg flex items-center gap-2">Huddle Stages</h3>
//                 <p className="text-xs text-slate-500 mt-1">Complete in sequential order</p>
//               </div>
//               <nav className="p-3 space-y-2">
//                 {STAGES.map((stage, idx) => {
//                   const isCompleted = completedStages[idx];
//                   const isActive = currentStage === idx;
//                   const firstIncompleteIdx = completedStages.findIndex(d => !d);
//                   const isLocked = !isCompleted && idx > (firstIncompleteIdx === -1 ? 3 : firstIncompleteIdx);

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
//                       <span>{completedStages.filter(Boolean).length} / 4</span>
//                   </div>
//                   <div className="w-full bg-slate-200 rounded-full h-1.5">
//                       <div 
//                         className="bg-emerald-500 h-1.5 rounded-full transition-all" 
//                         style={{ width: `${(completedStages.filter(Boolean).length / 4) * 100}%` }}
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
//                   {completedStages[currentStage] && (
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
//                     {getCurrentStageComponent()}
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
//                   {currentStage === 3 ? (
//                     <button
//                       onClick={handleComplete}
//                       disabled={isSaving || (completedStages[currentStage] && !forceEditMode)}
//                       className="flex items-center gap-2 px-8 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-bold shadow-md transition-all"
//                     >
//                       {isSaving ? (
//                         <><Loader2 size={18} className="animate-spin" /> Finalizing...</>
//                       ) : (
//                         <><Check size={18} /> Complete Huddle</>
//                       )}
//                     </button>
//                   ) : (
//                     <button
//                       onClick={handleNext}
//                       disabled={isSaving || (completedStages[currentStage] && !forceEditMode)}
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

// export { PreopHuddleModal };


// /**
//  * Preoperative Huddle Modal - Main Orchestrator
//  * Manages 4-stage workflow: Surgeon → Anaesthetist → Scrub Nurse → Complete
//  */

// import React, { useState, useEffect, useRef } from "react";
// import {
//   X,
//   ChevronLeft,
//   ChevronRight,
//   AlertCircle,
//   Loader2,
//   Printer,
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
// import { otPreopHuddleService } from "../services/ot-preop-huddle.service";
// import {
//   PreopHuddleSurgeonData,
//   PreopHuddleAnaesthetistData,
//   PreopHuddleScrubData,
//   PreopHuddleCompleteData,
// } from "../services/ot-preop-huddle.service";

// // Stage Components
// import PreopHuddleSurgeon from "./PreopHuddleSurgeon";
// import PreopHuddleAnaesthetist from "./PreopHuddleAnaesthetist";
// import PreopHuddleScrub from "./PreopHuddleScrub";
// import PreopHuddleComplete from "./PreopHuddleComplete";
// import PreopHuddlePrintView from "./PreopHuddlePrintView";

// const STAGES = [
//   { id: 0, name: "Surgeon", shortName: "S", color: "bg-blue-600", border: "border-blue-200" },
//   { id: 1, name: "Anaesthetist", shortName: "A", color: "bg-teal-600", border: "border-teal-200" },
//   { id: 2, name: "Scrub Nurse", shortName: "SN", color: "bg-orange-500", border: "border-orange-200" },
//   { id: 3, name: "Complete", shortName: "C", color: "bg-green-600", border: "border-green-200" },
// ];

// interface PreopHuddleModalProps {
//   isOpen: boolean;
//   onClose: () => void;
//   ot_case_id: number;
//   ot_case_number?: string;
//   surgery?: any; 
//   encounterData?: any; 
//   onComplete?: () => void;
//   onBackToActions?: () => void;
// }

// const PreopHuddleModal: React.FC<PreopHuddleModalProps> = ({
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

//   // DOM & UI State
//   const [isFullscreen, setIsFullscreen] = useState(false);
//   const containerRef = useRef<HTMLDivElement>(null);

//   const [currentStage, setCurrentStage] = useState(0);
//   const [isLoading, setIsLoading] = useState(false);
//   const [isSaving, setIsSaving] = useState(false);
//   const [forceEditMode, setForceEditMode] = useState(false);
//   const [showPrintView, setShowPrintView] = useState(false);
//   const [completedStages, setCompletedStages] = useState<boolean[]>([
//     false, false, false, false,
//   ]);

//   const [formData, setFormData] = useState({
//     surgeon: {} as Partial<PreopHuddleSurgeonData>,
//     anaesthetist: {} as Partial<PreopHuddleAnaesthetistData>,
//     scrub: {} as Partial<PreopHuddleScrubData>,
//     complete: {} as Partial<PreopHuddleCompleteData>,
//   });

//   const [errors, setErrors] = useState<Record<string, string>>({});
//   const [huddleData, setHuddleData] = useState<any>(null);

//   // Safely extract data from API response first, then fall back to props
//   const patientName = huddleData?.patient_name 
//     || (surgery?.first_name ? `${surgery.first_name} ${surgery.last_name}` : null) 
//     || encounterData?.patient_name 
//     || 'Unknown Patient';
    
//   const patientMRN = huddleData?.mrn || surgery?.mrn || encounterData?.mrn || 'N/A';
//   const patientGender = huddleData?.gender || surgery?.gender || encounterData?.gender || 'N/A';
//   const patientAge = huddleData?.age || surgery?.age || encounterData?.age || 'N/A';
//   const procedureName = huddleData?.procedure_name || huddleData?.surgery_name || surgery?.surgery_name || encounterData?.procedure_name || encounterData?.surgery_name || 'N/A';
//   const roomName = huddleData?.room_name || encounterData?.room_name || 'N/A';
//   const displayCaseNumber = huddleData?.ot_case_number || ot_case_number || encounterData?.ot_case_number || 'N/A';

//   useEffect(() => {
//     if (isOpen) {
//       loadHuddleData();
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

//   const loadHuddleData = async () => {
//     setIsLoading(true);
//     try {
//       const data = await otPreopHuddleService.getHuddle(ot_case_id);
//       if (data) {
//         setHuddleData(data);
//         const completed = otPreopHuddleService.getCompletedStages(data);
//         setCompletedStages(completed);

//         prefillFormData(data);

//         const firstIncompleteIdx = completed.findIndex((done) => !done);
//         if (firstIncompleteIdx >= 0) {
//           setCurrentStage(firstIncompleteIdx);
//         } else {
//           setCurrentStage(3); // Go to last stage if all completed
//         }
//       }
//     } catch (err) {
//       console.error("Failed to load huddle data", err);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const prefillFormData = (data: any) => {
//     setFormData({
//       surgeon: {
//         stage: "surgeon",
//         ot_case_id,
//         identity_confirmed: data.identity_confirmed,
//         procedure_position: data.procedure_position,
//         equipment_discussed: data.equipment_discussed,
//         blood_loss_risk: data.blood_loss_risk,
//         blood_prepared: data.blood_prepared,
//         imaging_reviewed: data.imaging_reviewed,
//         special_equipment: data.special_equipment,
//         critical_steps: data.critical_steps,
//         patient_specific_concerns: data.patient_specific_concerns,
//         surgeon_id: data.surgeon_id,
//         surgeon_name: data.surgeon_name,
//         surgeon_designation: data.surgeon_designation,
//       },
//       anaesthetist: {
//         stage: "anaesthetist",
//         ot_case_id,
//         airway_risk: data.airway_risk,
//         airway_prepared: data.airway_prepared,
//         has_allergy: data.has_allergy,
//         allergies_json:
//           typeof data.allergies_json === "string"
//             ? JSON.parse(data.allergies_json)
//             : data.allergies_json || [],
//         asa_grade: data.asa_grade,
//         risk_score: data.risk_score,
//         monitoring_plan: data.monitoring_plan,
//         anaesthetist_id: data.anaesthetist_id,
//         anaesthetist_name: data.anaesthetist_name,
//         anaesthetist_designation: data.anaesthetist_designation,
//       },
//       scrub: {
//         stage: "scrub",
//         ot_case_id,
//         instrument_sterility_confirmed: data.instrument_sterility_confirmed,
//         equipment_ready_confirmed: data.equipment_ready_confirmed,
//         equipment_issues_flag: data.equipment_issues_flag,
//         equipment_issue_details: data.equipment_issue_details,
//         team_introduced: data.team_introduced,
//         imaging_displayed: data.imaging_displayed,
//         nurse_id: data.nurse_id,
//         nurse_name: data.nurse_name,
//         nurse_designation: data.nurse_designation,
//       },
//       complete: {
//         stage: "complete",
//         ot_case_id,
//         icu_required: data.icu_required,
//         recovery_concerns: data.recovery_concerns,
//         completed: data.completed,
//       },
//     });
//   };

//   const validateCurrentStage = (): boolean => {
//     const stageKey = ["surgeon", "anaesthetist", "scrub", "complete"][currentStage] as keyof typeof formData;
//     const stageData = formData[stageKey];
//     const newErrors: Record<string, string> = {};

//     if (currentStage === 0) {
//       if (!stageData.identity_confirmed) newErrors.identity_confirmed = "Identity confirmation is required";
//       if (!stageData.procedure_position) newErrors.procedure_position = "Procedure position is required";
//       if (!stageData.surgeon_name) newErrors.surgeon_name = "Surgeon name is required";
//     } else if (currentStage === 1) {
//       if (!stageData.airway_risk) newErrors.airway_risk = "Airway risk assessment is required";
//       if (!stageData.asa_grade) newErrors.asa_grade = "ASA grade is required";
//       if (!stageData.anaesthetist_name) newErrors.anaesthetist_name = "Anaesthetist name is required";
//     } else if (currentStage === 2) {
//       if (!stageData.instrument_sterility_confirmed) newErrors.instrument_sterility_confirmed = "Sterility confirmation is required";
//       if (!stageData.nurse_name) newErrors.nurse_name = "Nurse name is required";
//     } else if (currentStage === 3) {
//       if (!stageData.completed) newErrors.completed = "Huddle completion confirmation is required";
//     }

//     setErrors(newErrors);
//     return Object.keys(newErrors).length === 0;
//   };

//   const saveCurrentStage = async () => {
//     if (!validateCurrentStage()) {
//       notify("Please complete all required fields", "error");
//       return false;
//     }

//     setIsSaving(true);
//     try {
//       const stageKey = ["surgeon", "anaesthetist", "scrub", "complete"][currentStage] as string;
//       let stageData = formData[stageKey as keyof typeof formData];

//       if (stageKey === "anaesthetist" && (stageData as any).allergies_json) {
//         stageData = { ...stageData, allergies_json: (stageData as any).allergies_json };
//       }

//       const payload = { ...stageData, ot_case_id, stage: stageKey } as any;
//       const response = await otPreopHuddleService.saveStage(payload);

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
//     const stageKey = ["surgeon", "anaesthetist", "scrub", "complete"][currentStage] as keyof typeof formData;
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
//     if (saved && currentStage < 3) {
//       setCurrentStage(currentStage + 1);
//       setForceEditMode(false);
//     }
//   };

//   const handleComplete = async () => {
//     const saved = await saveCurrentStage();
//     if (saved) {
//       notify("Preoperative huddle completed successfully!", "success");
//       onComplete?.();
//       setTimeout(() => onClose(), 1500);
//     }
//   };

//   // Prevent accessing future uncompleted stages via sidebar to enforce workflow
//   const navigateToStage = (idx: number) => {
//     if (idx === currentStage) return;
//     const firstIncompleteIdx = completedStages.findIndex((done) => !done);
//     const maxAllowed = firstIncompleteIdx === -1 ? 3 : firstIncompleteIdx;
    
//     if (idx <= maxAllowed) {
//         setCurrentStage(idx);
//         setForceEditMode(false);
//     } else {
//         notify("Please complete previous stages first.", "warning");
//     }
//   };

//   const getCurrentStageComponent = () => {
//     const stageKey = ["surgeon", "anaesthetist", "scrub", "complete"][currentStage] as keyof typeof formData;
//     const isStageCompleted = completedStages[currentStage];
//     const isDisabled = isStageCompleted && huddleData && !forceEditMode;

//     const props = {
//       data: formData[stageKey] || {},
//       onChange: handleFieldChange,
//       errors,
//       disabled: isDisabled,
//     };

//     switch (currentStage) {
//       case 0: return <PreopHuddleSurgeon {...props} />;
//       case 1: return <PreopHuddleAnaesthetist {...props} />;
//       case 2: return <PreopHuddleScrub {...props} />;
//       case 3: return <PreopHuddleComplete {...props} />;
//       default: return null;
//     }
//   };

//   if (!isOpen) return null;

//   return (
//     <>
//       {showPrintView && huddleData && (
//         <PreopHuddlePrintView huddleData={huddleData} isOpen={showPrintView} onClose={() => setShowPrintView(false)} />
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
//                   <ShieldCheck size={20} className="text-emerald-400" /> Preoperative Team Huddle (T2)
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
//               {huddleData && (
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
//                 <h3 className="text-2xl font-black text-[#2A157c] tracking-tight animate-pulse">Loading Huddle...</h3>
//                 <p className="text-slate-600 font-medium mt-2">Retrieving team safety records, please wait.</p>
//               </div>
//             )}

//             {/* Sidebar Navigation */}
//             <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto">
//               <div className="p-5 border-b border-slate-200 bg-slate-100 text-slate-800">
//                 <h3 className="font-black tracking-tight text-lg flex items-center gap-2">Huddle Stages</h3>
//                 <p className="text-xs text-slate-500 mt-1">Complete in sequential order</p>
//               </div>
//               <nav className="p-3 space-y-2">
//                 {STAGES.map((stage, idx) => {
//                   const isCompleted = completedStages[idx];
//                   const isActive = currentStage === idx;
//                   const firstIncompleteIdx = completedStages.findIndex(d => !d);
//                   const isLocked = !isCompleted && idx > (firstIncompleteIdx === -1 ? 3 : firstIncompleteIdx);

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
//                       <span>{completedStages.filter(Boolean).length} / 4</span>
//                   </div>
//                   <div className="w-full bg-slate-200 rounded-full h-1.5">
//                       <div 
//                         className="bg-emerald-500 h-1.5 rounded-full transition-all" 
//                         style={{ width: `${(completedStages.filter(Boolean).length / 4) * 100}%` }}
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
//                   {completedStages[currentStage] && (
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
//                     {getCurrentStageComponent()}
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
//                   {currentStage === 3 ? (
//                     <button
//                       onClick={handleComplete}
//                       disabled={isSaving || (completedStages[currentStage] && !forceEditMode)}
//                       className="flex items-center gap-2 px-8 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-bold shadow-md transition-all"
//                     >
//                       {isSaving ? (
//                         <><Loader2 size={18} className="animate-spin" /> Finalizing...</>
//                       ) : (
//                         <><Check size={18} /> Complete Huddle</>
//                       )}
//                     </button>
//                   ) : (
//                     <button
//                       onClick={handleNext}
//                       disabled={isSaving || (completedStages[currentStage] && !forceEditMode)}
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

// export { PreopHuddleModal };

// /**
//  * Preoperative Huddle Modal - Main Orchestrator
//  * Manages 4-stage workflow: Surgeon → Anaesthetist → Scrub Nurse → Complete
//  */

// import React, { useState, useEffect } from "react";
// import {
//   X,
//   ChevronLeft,
//   ChevronRight,
//   AlertCircle,
//   Loader,
//   Printer,
//   ArrowLeft,
// } from "lucide-react";
// import { useNotification } from "../context/NotificationContext";
// import { useAuth } from "../context/AuthContext";
// import { otPreopHuddleService } from "../services/ot-preop-huddle.service";
// import {
//   PreopHuddleSurgeonData,
//   PreopHuddleAnaesthetistData,
//   PreopHuddleScrubData,
//   PreopHuddleCompleteData,
// } from "../services/ot-preop-huddle.service";

// // Stage Components
// import PreopHuddleSurgeon from "./PreopHuddleSurgeon";
// import PreopHuddleAnaesthetist from "./PreopHuddleAnaesthetist";
// import PreopHuddleScrub from "./PreopHuddleScrub";
// import PreopHuddleComplete from "./PreopHuddleComplete";
// import PreopHuddlePrintView from "./PreopHuddlePrintView";

// const STAGES = [
//   { name: "Surgeon", shortName: "S", color: "bg-brand-active0" },
//   { name: "Anaesthetist", shortName: "A", color: "bg-teal-500" },
//   { name: "Scrub Nurse", shortName: "SN", color: "bg-orange-500" },
//   { name: "Complete", shortName: "C", color: "bg-green-500" },
// ];

// interface PreopHuddleModalProps {
//   isOpen: boolean;
//   onClose: () => void;
//   ot_case_id: number;
//   onComplete?: () => void;
//   onBackToActions?: () => void;
// }

// const PreopHuddleModal: React.FC<PreopHuddleModalProps> = ({
//   isOpen,
//   onClose,
//   ot_case_id,
//   onComplete,
//   onBackToActions,
// }) => {
//   const { notify } = useNotification();
//   const { user } = useAuth();

//   const [currentStage, setCurrentStage] = useState(0);
//   const [isLoading, setIsLoading] = useState(false);
//   const [isSaving, setIsSaving] = useState(false);
//   const [forceEditMode, setForceEditMode] = useState(false);
//   const [showPrintView, setShowPrintView] = useState(false);
//   const [completedStages, setCompletedStages] = useState<boolean[]>([
//     false,
//     false,
//     false,
//     false,
//   ]);

//   const [formData, setFormData] = useState({
//     surgeon: {} as Partial<PreopHuddleSurgeonData>,
//     anaesthetist: {} as Partial<PreopHuddleAnaesthetistData>,
//     scrub: {} as Partial<PreopHuddleScrubData>,
//     complete: {} as Partial<PreopHuddleCompleteData>,
//   });

//   const [errors, setErrors] = useState<Record<string, string>>({});
//   const [huddleData, setHuddleData] = useState<any>(null);

//   useEffect(() => {
//     if (isOpen) {
//       loadHuddleData();
//     }
//   }, [isOpen, ot_case_id]);

//   const loadHuddleData = async () => {
//     setIsLoading(true);
//     try {
//       const data = await otPreopHuddleService.getHuddle(ot_case_id);
//       if (data) {
//         setHuddleData(data);
//         const completed = otPreopHuddleService.getCompletedStages(data);
//         setCompletedStages(completed);

//         // Pre-fill form with existing data
//         prefillFormData(data);

//         // Jump to first incomplete stage
//         const firstIncompleteIdx = completed.findIndex((done) => !done);
//         if (firstIncompleteIdx >= 0) {
//           setCurrentStage(firstIncompleteIdx);
//         } else {
//           // If all completed, stay on first stage or last
//           setCurrentStage(0);
//         }
//       }
//     } catch (err) {
//       console.error("Failed to load huddle data", err);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   /**
//    * Pre-fill form data from existing huddle
//    */
//   const prefillFormData = (data: any) => {
//     setFormData({
//       surgeon: {
//         stage: "surgeon",
//         ot_case_id,
//         identity_confirmed: data.identity_confirmed,
//         procedure_position: data.procedure_position,
//         equipment_discussed: data.equipment_discussed,
//         blood_loss_risk: data.blood_loss_risk,
//         blood_prepared: data.blood_prepared,
//         imaging_reviewed: data.imaging_reviewed,
//         special_equipment: data.special_equipment,
//         critical_steps: data.critical_steps,
//         patient_specific_concerns: data.patient_specific_concerns,
//         surgeon_id: data.surgeon_id,
//         surgeon_name: data.surgeon_name,
//         surgeon_designation: data.surgeon_designation,
//       },
//       anaesthetist: {
//         stage: "anaesthetist",
//         ot_case_id,
//         airway_risk: data.airway_risk,
//         airway_prepared: data.airway_prepared,
//         has_allergy: data.has_allergy,
//         allergies_json:
//           typeof data.allergies_json === "string"
//             ? JSON.parse(data.allergies_json)
//             : data.allergies_json || [],
//         asa_grade: data.asa_grade,
//         risk_score: data.risk_score,
//         monitoring_plan: data.monitoring_plan,
//         anaesthetist_id: data.anaesthetist_id,
//         anaesthetist_name: data.anaesthetist_name,
//         anaesthetist_designation: data.anaesthetist_designation,
//       },
//       scrub: {
//         stage: "scrub",
//         ot_case_id,
//         instrument_sterility_confirmed: data.instrument_sterility_confirmed,
//         equipment_ready_confirmed: data.equipment_ready_confirmed,
//         equipment_issues_flag: data.equipment_issues_flag,
//         equipment_issue_details: data.equipment_issue_details,
//         team_introduced: data.team_introduced,
//         imaging_displayed: data.imaging_displayed,
//         nurse_id: data.nurse_id,
//         nurse_name: data.nurse_name,
//         nurse_designation: data.nurse_designation,
//       },
//       complete: {
//         stage: "complete",
//         ot_case_id,
//         icu_required: data.icu_required,
//         recovery_concerns: data.recovery_concerns,
//         completed: data.completed,
//       },
//     });
//   };

//   const validateCurrentStage = (): boolean => {
//     const stageKey = ["surgeon", "anaesthetist", "scrub", "complete"][
//       currentStage
//     ] as keyof typeof formData;
//     const stageData = formData[stageKey];
//     const newErrors: Record<string, string> = {};

//     if (currentStage === 0) {
//       if (!stageData.identity_confirmed)
//         newErrors.identity_confirmed = "Identity confirmation is required";
//       if (!stageData.procedure_position)
//         newErrors.procedure_position = "Procedure position is required";
//       if (!stageData.surgeon_name)
//         newErrors.surgeon_name = "Surgeon name is required";
//     } else if (currentStage === 1) {
//       if (!stageData.airway_risk)
//         newErrors.airway_risk = "Airway risk assessment is required";
//       if (!stageData.asa_grade) newErrors.asa_grade = "ASA grade is required";
//       if (!stageData.anaesthetist_name)
//         newErrors.anaesthetist_name = "Anaesthetist name is required";
//     } else if (currentStage === 2) {
//       if (!stageData.instrument_sterility_confirmed)
//         newErrors.instrument_sterility_confirmed =
//           "Sterility confirmation is required";
//       if (!stageData.nurse_name)
//         newErrors.nurse_name = "Nurse name is required";
//     } else if (currentStage === 3) {
//       if (!stageData.completed)
//         newErrors.completed = "Huddle completion confirmation is required";
//     }

//     setErrors(newErrors);
//     return Object.keys(newErrors).length === 0;
//   };

//   const saveCurrentStage = async () => {
//     if (!validateCurrentStage()) {
//       notify("Please complete all required fields", "error");
//       return false;
//     }

//     setIsSaving(true);
//     try {
//       const stageKey = ["surgeon", "anaesthetist", "scrub", "complete"][
//         currentStage
//       ] as string;
//       let stageData = formData[stageKey as keyof typeof formData];

//       // Convert arrays to JSON strings if needed
//       if (stageKey === "anaesthetist" && (stageData as any).allergies_json) {
//         stageData = {
//           ...stageData,
//           allergies_json: (stageData as any).allergies_json,
//         };
//       }

//       const payload = {
//         ...stageData,
//         ot_case_id,
//         stage: stageKey,
//       } as any;

//       const response = await otPreopHuddleService.saveStage(payload);

//       if (response.status === "success") {
//         const newCompleted = [...completedStages];
//         newCompleted[currentStage] = true;
//         setCompletedStages(newCompleted);
//         notify(`${STAGES[currentStage].name} saved successfully`, "success");
//         return true;
//       }
//     } catch (error: any) {
//       const errorMsg =
//         error.response?.data?.message ||
//         error.message ||
//         "Failed to save stage";
//       notify(errorMsg, "error");
//       return false;
//     } finally {
//       setIsSaving(false);
//     }
//   };

//   const handleFieldChange = (fieldName: string, value: any) => {
//     const stageKey = ["surgeon", "anaesthetist", "scrub", "complete"][
//       currentStage
//     ] as keyof typeof formData;

//     setFormData((prev) => ({
//       ...prev,
//       [stageKey]: {
//         ...prev[stageKey],
//         [fieldName]: value,
//       },
//     }));

//     if (errors[fieldName]) {
//       const newErrors = { ...errors };
//       delete newErrors[fieldName];
//       setErrors(newErrors);
//     }
//   };

//   const handleNext = async () => {
//     const saved = await saveCurrentStage();
//     if (saved && currentStage < 3) {
//       setCurrentStage(currentStage + 1);
//       setForceEditMode(false);
//     }
//   };

//   const handlePrevious = () => {
//     if (currentStage > 0) {
//       setCurrentStage(currentStage - 1);
//       setForceEditMode(false);
//     }
//   };

//   const handleComplete = async () => {
//     const saved = await saveCurrentStage();
//     if (saved) {
//       notify("Preoperative huddle completed successfully!", "success");
//       onComplete?.();
//       onClose();
//     }
//   };

//   const handlePrint = () => {
//     if (huddleData) {
//       setShowPrintView(true);
//     }
//   };

//   const getCurrentStageComponent = () => {
//     const stageKey = ["surgeon", "anaesthetist", "scrub", "complete"][
//       currentStage
//     ] as keyof typeof formData;
//     const isStageCompleted = completedStages[currentStage];
//     const isDisabled = isStageCompleted && huddleData && !forceEditMode;

//     const props = {
//       data: formData[stageKey] || {},
//       onChange: handleFieldChange,
//       errors,
//       disabled: isDisabled,
//     };

//     switch (currentStage) {
//       case 0:
//         return <PreopHuddleSurgeon {...props} />;
//       case 1:
//         return <PreopHuddleAnaesthetist {...props} />;
//       case 2:
//         return <PreopHuddleScrub {...props} />;
//       case 3:
//         return <PreopHuddleComplete {...props} />;
//       default:
//         return null;
//     }
//   };

//   if (!isOpen) return null;

//   return (
//     <>
//       {/* Print View Modal */}
//       {showPrintView && huddleData && (
//         <PreopHuddlePrintView
//           huddleData={huddleData}
//           isOpen={showPrintView}
//           onClose={() => setShowPrintView(false)}
//         />
//       )}

//       <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
//         <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
//           {/* Header */}
//           <div className="bg-gradient-to-r from-brand-primary to-teal-600 text-white p-6 flex items-center justify-between">
//             <div className="flex items-center gap-3">
//               {onBackToActions && (
//                 <button
//                   onClick={onBackToActions}
//                   className="p-1.5 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
//                   title="Back to Actions"
//                 >
//                   <ArrowLeft size={18} />
//                 </button>
//               )}
//               <div>
//                 <h2 className="text-2xl font-bold">Preoperative Team Huddle</h2>
//                 <p className="text-brand-active text-sm">OT Case #{ot_case_id}</p>
//               </div>
//             </div>
//             <button
//               onClick={onClose}
//               className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
//             >
//               <X size={24} />
//             </button>
//           </div>

//           {/* Stage Progress */}
//           <div className="bg-slate-100 px-6 py-4 border-b">
//             <div className="flex gap-2 justify-center">
//               {STAGES.map((stage, idx) => (
//                 <div
//                   key={idx}
//                   className={`flex items-center ${idx < STAGES.length - 1 ? "gap-2" : ""}`}
//                 >
//                   <button
//                     onClick={() => idx < currentStage && setCurrentStage(idx)}
//                     className={`w-10 h-10 rounded-full font-bold transition-all flex items-center justify-center ${
//                       completedStages[idx]
//                         ? `${stage.color} text-white`
//                         : idx === currentStage
//                           ? `${stage.color} text-white`
//                           : "bg-gray-300 text-gray-600"
//                     } ${idx <= currentStage ? "cursor-pointer hover:shadow-lg" : ""}`}
//                   >
//                     {completedStages[idx] ? "✓" : stage.shortName}
//                   </button>
//                   {idx < STAGES.length - 1 && (
//                     <div
//                       className={`w-12 h-1 ${
//                         idx < currentStage ? "bg-green-500" : "bg-gray-300"
//                       }`}
//                     />
//                   )}
//                 </div>
//               ))}
//             </div>
//           </div>

//           {/* Content */}
//           <div className="flex-1 overflow-y-auto p-6">
//             {isLoading ? (
//               <div className="flex items-center justify-center h-full">
//                 <Loader className="animate-spin" size={32} />
//                 <span className="ml-2">Loading huddle data...</span>
//               </div>
//             ) : (
//               <>
//                 {completedStages[currentStage] && huddleData && (
//                   <div className="mb-4 p-4 bg-brand-active border border-brand-active rounded-lg flex items-start gap-3">
//                     <AlertCircle
//                       className="text-brand-primary mt-0.5 flex-shrink-0"
//                       size={20}
//                     />
//                     <div className="flex-1">
//                       <p className="font-semibold text-brand-primary">
//                         Stage Completed
//                       </p>
//                       <p className="text-sm text-brand-primary">
//                         This stage is already completed.
//                         {!forceEditMode
//                           ? " You can edit it using the button below."
//                           : " Now in edit mode."}
//                       </p>
//                     </div>
//                     {!forceEditMode ? (
//                       <button
//                         onClick={() => setForceEditMode(true)}
//                         className="ml-2 px-3 py-1 bg-brand-primary text-white text-sm rounded hover:bg-brand-primary transition-colors whitespace-nowrap"
//                       >
//                         Edit
//                       </button>
//                     ) : (
//                       <button
//                         onClick={() => setForceEditMode(false)}
//                         className="ml-2 px-3 py-1 bg-slate-400 text-white text-sm rounded hover:bg-slate-500 transition-colors whitespace-nowrap"
//                       >
//                         Lock
//                       </button>
//                     )}
//                   </div>
//                 )}
//                 {getCurrentStageComponent()}
//               </>
//             )}
//           </div>

//           {/* Footer */}
//           <div className="bg-slate-50 px-6 py-4 border-t flex gap-2 justify-between">
//             <button
//               onClick={handlePrevious}
//               disabled={currentStage === 0 || isSaving}
//               className="flex items-center gap-2 px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
//             >
//               <ChevronLeft size={20} />
//               Previous
//             </button>

//             <div className="text-sm text-slate-600">
//               Step {currentStage + 1} of {STAGES.length}
//             </div>

//             <div className="flex gap-2">
//               {huddleData && (
//                 <button
//                   onClick={handlePrint}
//                   disabled={isSaving}
//                   className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
//                 >
//                   <Printer size={20} />
//                   Print
//                 </button>
//               )}

//               {currentStage < 3 ? (
//                 <button
//                   onClick={handleNext}
//                   disabled={isSaving}
//                   className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
//                 >
//                   {isSaving ? (
//                     <>
//                       <Loader size={20} className="animate-spin" />
//                       Saving...
//                     </>
//                   ) : (
//                     <>
//                       Next
//                       <ChevronRight size={20} />
//                     </>
//                   )}
//                 </button>
//               ) : (
//                 <button
//                   onClick={handleComplete}
//                   disabled={isSaving}
//                   className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold"
//                 >
//                   {isSaving ? (
//                     <>
//                       <Loader size={20} className="animate-spin" />
//                       Completing...
//                     </>
//                   ) : (
//                     "Complete Huddle"
//                   )}
//                 </button>
//               )}
//             </div>
//           </div>
//         </div>
//       </div>
//     </>
//   );
// };

// export { PreopHuddleModal };
