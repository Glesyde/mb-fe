import { LucideIcon } from "lucide-react";

export interface AppModule {
  id: number;
  code: string;
  name: string;
  icon: string;
  route: string;
}


export type UserRole =
  | "super_admin"
  | "hospital_admin"
  | "Admin"
  | "Doctor"
  | "doctor"
  | "Nurse"
  | "nurse"
  | "Front Desk"
  | "front_desk"
  | "Pharmacist"
  | "pharmacist"
  | "Lab Tech"
  | "lab_scientist"
  | "Accountant"
  | "accountant"
  | "Inventory Manager"
  | "inventory"
  | string;
  
// export type UserRole =
//   | "Admin"
//   | "Doctor"
//   | "Nurse"
//   | "Front Desk"
//   | "Pharmacist"
//   | "Lab Tech"
//   | "Accountant"
//   | "Inventory Manager";

export interface NavItem {
  id: string;
  moduleId?: number;
  label: string;
  icon: LucideIcon;
  path: string;
  badge?: number;
  category?: "clinical" | "admin" | "ops";
  permission?: string;       // <--- ADD THIS LINE
  allowedRoles?: string[];       // <--- ADD THIS LINE TO FIX TS2353
  subItems?: NavItem[];
}

export interface UserProfile {
  id?: number;
  name: string;
  role: UserRole;
  avatar: string;
  department: string;
}

export interface HospitalStats {
  occupancy: number;
  emergencyWaiting: number;
  appointmentsToday: number;
  pharmacyOrders: number;
}

export type AuditAction =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | "LOGOUT"
  | "TOKEN_REFRESH"
  | "PATIENT_CREATED"
  | "PATIENT_UPDATED"
  | "PATIENT_DELETED"
  | "PATIENT_HISTORY_VIEWED"
  | "DOCUMENT_UPLOADED"
  | "DOCUMENT_DELETED"
  | "RECORD_MODIFIED"
  | string;

export interface AuditLog {
  id: number;
  user_id: number;
  action: AuditAction;
  entity_type: string | null;
  entity_id: number | null;
  entity_key: string | null;
  old_value: string | null;
  new_value: string | null;
  ip_address: string;
  user_agent: string;
  created_at: string;
  performed_by: string;
}

export type PatientDocumentType = "LAB" | "RADIOLOGY" | "DOCUMENT" | "IMAGE";

export type PatientDocumentCategory =
  | "lab_result"
  | "referral_letter"
  | "lab_referral"
  | "imaging_report"
  | "general_document";

export interface PatientDocument {
  id: number;
  file_type: PatientDocumentType;
  category: PatientDocumentCategory;
  description: string;
  file_path: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  uploaded_at: string;
}
