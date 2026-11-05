/**
 * WHO Surgical Safety Checklist - T1 Form Types
 * Covers all 5 stages: Ward Check 1, Ward Check 2, Sign In, Time Out, Sign Out
 */

// ============================================================================
// Stage 1: WARD CHECK 1 (By Operating Surgeon)
// ============================================================================
export interface WardCheck1Data {
  stage: "ward1";
  ot_case_id: number;
  // Checklist items
  identity: number; // 0 or 1
  documents: number; // 0 or 1
  site_confirmed: number; // 0 or 1
  site_marked: number; // 0 or 1
  not_applicable: number; // 0 or 1
  // Sign-off
  name: string; // Surgeon name
  designation: string; // Consultant Surgeon, etc
}

// ============================================================================
// Stage 2: WARD CHECK 2 (By Ward Nurse, prior to leaving ward)
// ============================================================================
export interface WardCheck2Data {
  stage: "ward2";
  ot_case_id: number;
  // Checklist items
  details_correct: number; // 0 or 1
  site_checked: number; // 0 or 1
  not_applicable: number; // 0 or 1
  // Sign-off
  name: string; // Nurse name
  designation: string; // Ward Nurse, etc
}

// ============================================================================
// Stage 3: SIGN IN (Before Induction of Anaesthesia)
// By Operating Surgeon or Nominated Deputy
// ============================================================================
export interface SignInData {
  stage: "sign_in";
  ot_case_id: number;
  // Checklist items
  identity: number; // 0 or 1
  site_marked: number; // 0 or 1
  anaesthesia: number; // 0 or 1 (anaesthesia check complete)
  // Airway risk assessment
  airway_risk: "YES" | "NO" | null;
  airway_prepared: number; // 0 or 1
  // Allergy check
  has_allergy: number; // 0 or 1
  allergies: string[] | null; // e.g., ["Penicillin", "Latex"]
  // Implant check
  has_implant: number; // 0 or 1
  implant_details: string | null; // e.g., "Pacemaker in situ"
  // Blood loss risk
  blood_risk: number; // 0 or 1
  blood_prepared: number; // 0 or 1
}

// ============================================================================
// Stage 4: TIME OUT (Before start of surgical intervention)
// By Entire Surgical Team (Surgeon, Anaesthetist, Nurse)
// ============================================================================
export interface SurgeonNotes {
  blood_loss?: string; // e.g., "500ml expected"
  critical_steps?: string; // e.g., "Monitor bleeding"
}

export interface AnaesthesiaNotes {
  asa_grade?: string; // "ASA I", "ASA II", etc
  concerns?: string; // e.g., "Hypertension"
}

export interface NurseNotes {
  sterility_confirmed?: boolean;
  equipment_issues?: string; // "None" or list of issues
}

export interface TimeOutData {
  stage: "time_out";
  ot_case_id: number;
  // Patient & procedure confirmation
  patient_confirmed: number; // 0 or 1
  procedure_confirmed: number; // 0 or 1
  // Team notes
  surgeon_notes: SurgeonNotes | string; // May be JSON string from API
  anaesthesia_notes: AnaesthesiaNotes | string; // May be JSON string from API
  nurse_notes: NurseNotes | string; // May be JSON string from API
  // Surgical Site Infection Bundle
  antibiotic: number; // Given within 60 minutes
  warming: number; // Patient warming check
  hair: number; // Hair removal done
  glycaemic: number; // Glycaemic control checked
  // VTE Prophylaxis
  vte: number; // 0 or 1
  // Imaging
  imaging: number; // 0 or 1 (essential imaging displayed)
}

// ============================================================================
// Stage 5: SIGN OUT (Before any member leaves operating room)
// By Surgical Team
// ============================================================================
export interface SignOutData {
  stage: "sign_out";
  ot_case_id: number;
  // Checklist items
  procedure_recorded: number; // 0 or 1
  counts_complete: number; // 0 or 1 (swabs, instruments, sharps)
  specimen_labelled: number; // 0 or 1
  // Issues & concerns
  equipment_issues: string; // "None" or description
  recovery_concerns: string; // e.g., "Monitor BP post-op"
  // Imaging
  imaging: number; // 0 or 1 (essential imaging displayed)
  // Sign-off (team members)
  surgeon_id: number;
  anaesthetist_id: number;
  nurse_id: number;
}

// ============================================================================
// Union type for all checklist stages
// ============================================================================
export type ChecklistStageData =
  | WardCheck1Data
  | WardCheck2Data
  | SignInData
  | TimeOutData
  | SignOutData;

// ============================================================================
// API Request/Response Models
// ============================================================================
export interface ChecklistRequest {
  stage: "ward1" | "ward2" | "sign_in" | "time_out" | "sign_out";
  ot_case_id: number;
  [key: string]: any;
}

export interface ChecklistResponse {
  status: string; // "success"
  message: string;
  data?: ChecklistData;
}

// ============================================================================
// Complete Checklist Data (from GET endpoint)
// Maps to the response structure provided
// ============================================================================
export interface ChecklistData {
  id: number;
  ot_case_id: number;
  encounter_id: number;
  patient_name: string;
  mrn: string;
  age: string;
  room_name: string;
  gender: string;
  date_of_birth: string | null;
  procedure_name: string;
  operation_date: string | null;

  // ========== WARD CHECK 1 ==========
  wc1_identity_confirmed: number;
  wc1_documents_checked: number;
  wc1_site_confirmed: number;
  wc1_site_marked: number;
  wc1_not_applicable: number;
  wc1_signed_by: number;
  wc1_signed_name: string;
  wc1_designation: string;
  wc1_signed_at: string;

  // ========== WARD CHECK 2 ==========
  wc2_patient_details_correct: number;
  wc2_site_checked: number;
  wc2_not_applicable: number;
  wc2_signed_by: number;
  wc2_signed_name: string;
  wc2_designation: string;
  wc2_signed_at: string;

  // ========== SIGN IN ==========
  si_identity_confirmed: number;
  si_site_marked: number;
  si_anaesthesia_check: number;
  si_airway_risk: "YES" | "NO" | null;
  si_airway_prepared: number;
  si_has_allergy: number;
  si_allergies_json: string | null; // JSON string: ["Penicillin"]
  si_has_implant: number;
  si_implant_details: string | null;
  si_blood_loss_risk: number;
  si_blood_prepared: number;
  si_signed_by: number;
  si_signed_at: string;

  // ========== TIME OUT ==========
  to_team_introduced: number | null;
  to_patient_confirmed: number;
  to_procedure_confirmed: number;
  to_surgeon_notes: string | null; // JSON string
  to_anaesthesia_notes: string | null; // JSON string
  to_nurse_notes: string | null; // JSON string
  to_antibiotic_given: number;
  to_warming_done: number;
  to_hair_removed: number;
  to_glycaemic_checked: number;
  to_vte_prophylaxis: number;
  to_imaging_available: number;
  to_signed_by: number;
  to_signed_at: string;

  // ========== SIGN OUT ==========
  so_procedure_recorded: number;
  so_counts_complete: number;
  so_specimen_labelled: number;
  so_equipment_issues: string | null;
  so_recovery_concerns: string | null;
  so_imaging_displayed: number;
  so_signed_by_surgeon: number;
  so_signed_by_anaesthetist: number;
  so_signed_by_nurse: number;
  so_signed_at: string;

  // ========== COMPLETION STATUS ==========
  wc1_done: number;
  wc2_done: number;
  sign_in_done: number;
  time_out_done: number;
  sign_out_done: number;

  // ========== AUDIT FIELDS ==========
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted: number;
}

// ============================================================================
// UI State Model
// ============================================================================
export interface ChecklistUIState {
  currentStage: 0 | 1 | 2 | 3 | 4; // Index of current stage (0-4)
  isLoading: boolean;
  isSaving: boolean;
  errors: Record<string, string>; // Field-level validation errors
  formData: {
    ward1: Partial<WardCheck1Data> | null;
    ward2: Partial<WardCheck2Data> | null;
    signIn: Partial<SignInData> | null;
    timeOut: Partial<TimeOutData> | null;
    signOut: Partial<SignOutData> | null;
  };
  completedStages: boolean[]; // [wc1, wc2, signIn, timeOut, signOut]
}

// ============================================================================
// Props Types for Components
// ============================================================================
export interface StageFormProps {
  data: any; // Stage-specific data
  onChange: (fieldName: string, value: any) => void;
  errors: Record<string, string>;
  disabled?: boolean; // Read-only mode for completed stages
}

export interface OTChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  ot_case_id: number;
  encounterData?: {
    patient_name?: string;
    mrn?: string;
    ot_case_number?: string;
    procedure_name?: string;
    encounter_number?: string;
    gender?: string;
    age?: string;
    room_name?: string;
  };
  onComplete?: (checklistData: ChecklistData) => void; // Callback after successful completion
  onBackToActions?: () => void;
}

export interface OTChecklistPrintViewProps {
  checklistData: ChecklistData;
  isOpen: boolean;
  onClose: () => void;
}
