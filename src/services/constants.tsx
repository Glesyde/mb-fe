// src/services/constants.tsx
export { NAV_ITEMS, MODULE_IDS, ROLE_PERMISSIONS, MARKUP_TYPES } from "../constants";

export const NAV_PERMISSION_RULES: Record<string, string[]> = {
  // Free Access Modules
  reports: [],
  "all-reports": [],
  reporting: [],

  // Main Modules
  patients: ["patient_read", "patient_create", "*"],
  appointments: ["appointment_read", "appointment_create", "doctor_schedule_read", "*"],
  emr: ["emr_read", "emr_note_create", "emr_order_create", "*"],
  billing: ["billing_read", "billing_invoice_create", "billing_payment_receive", "*"],
  finance: ["finance_coa_read", "finance_ap_invoice_read", "finance_report_read", "*"],
  hr: ["hr_employee_read", "hr_roster_read", "hr_payroll_read", "*"],
  hmo: ["hmo_provider_read", "hmo_claim_read", "hmo_tariff_read", "*"],
  marketing: ["marketing_corporate_read", "marketing_lead_read", "marketing_campaign_read", "*"],
  lab: ["lab_order_read", "lab_result_create", "lab_result_read", "*"],
  blood_bank: ["blood_request_read", "blood_sample_receive", "blood_result_save", "blood_unit_create","blood_unit_issue", "*"],
  // "blood-bank": ["blood_bank_read", "blood_bank_issue", "*"],
  radiology: ["radiology_order_read", "radiology_report_create", "radiology_report_read", "*"],
  pharmacy: ["pharmacy_order_read", "pharmacy_stock_read", "*"],
  theatre: ["ot_schedule_read", "ot_dashboard_read", "*"],
  ward: ["ipd_read", "ipd_bed_manage", "*"],
  nursing: ["ward_read", "nursing_read", "ipd_read", "*"],
  emergency: ["erd_bed_manage", "erd_read", "*"],
  inventory: ["inventory_item_read", "inventory_stock_in", "inventory_requisition_read", "*"],
  assets: ["inventory_item_read", "asset_read", "asset_manage", "*"],
  management: ["billing_tariff_manage", "management_read", "discount_manage", "*"],
  settings: ["system_settings_manage", "*"],
  users: ["user_read", "role_assign", "system_audit_read", "*"],

  // Sub-item Permissions
  "patient-inventory": ["inventory_stock_read", "*"],
  "patient-stock": ["inventory_stock_read", "*"],
  "patient-requisitions": ["inventory_requisition_read", "*"],
  "bill-pricing": ["billing_tariff_manage", "*"],
  "bill-rec": ["billing_payment_receive", "*"],
  "bill-inventory": ["inventory_stock_read", "*"],
  "bill-stock": ["inventory_stock_read", "*"],
  "bill-requisitions": ["inventory_requisition_read", "*"],
  "lab-verification": ["lab_result_verify", "*"],
  "lab-management": ["lab_result_verify", "*"],
  "lab-inventory": ["inventory_requisition_read", "*"],
  "lab-stock": ["inventory_requisition_read", "*"],
  "lab-requisitions": ["inventory_requisition_read", "*"],
  "rad-inventory": ["inventory_stock_read", "*"],
  "rad-stock": ["inventory_stock_read", "*"],
  "rad-requisitions": ["inventory_requisition_read", "*"],
  "rx-inventory": ["pharmacy_stock_read", "inventory_stock_read", "*"],
  "rx-stock": ["pharmacy_stock_read", "inventory_stock_read", "*"],
  "rx-requisitions": ["inventory_requisition_read", "*"],
  "ot-inventory": ["inventory_stock_read", "*"],
  "ot-stock": ["inventory_stock_read", "*"],
  "ot-requisitions": ["inventory_requisition_read", "*"],
  "ward-inventory": ["inventory_stock_read", "*"],
  "ward-stock": ["inventory_stock_read", "*"],
  "ward-requisitions": ["inventory_requisition_read", "*"],
  "nurse-movement": ["ward_read", "inventory_stock_read", "*"],
  "nurse-stock": ["ward_read", "inventory_stock_read", "*"],
  "nurse-req": ["ward_read", "inventory_requisition_read", "*"],
  "ed-inventory": ["inventory_stock_read", "*"],
  "ed-stock": ["inventory_stock_read", "*"],
  "ed-requisitions": ["inventory_requisition_read", "*"],
  "inv-po": ["inventory_requisition_approve", "*"],
  "inv-suppliers": ["inventory_vendor_read", "*"],
  "user-dir": ["user_read", "*"],
  "user-access": ["role_assign", "*"],
  "user-audit": ["system_audit_read", "*"],
};


// // src/services/constants.ts
// export { NAV_ITEMS, MODULE_IDS, ROLE_PERMISSIONS, MARKUP_TYPES } from "../constants";



// export const NAV_PERMISSION_RULES: Record<string, string[]> = {
//   // Modules controlled by module access:
//   reports: [],
//   "all-reports": [],
//   reporting: [],

//   // Clinical & Operations Modules
//   patients: ["patient_read", "patient_create", "*"],
//   appointments: ["appointment_read", "appointment_create", "doctor_schedule_read", "*"],
//   emr: ["emr_read", "emr_note_create", "emr_order_create", "*"],
//   billing: ["billing_read", "billing_invoice_create", "billing_payment_receive", "*"],
//   finance: ["finance_coa_read", "finance_ap_invoice_read", "finance_report_read", "*"],
//   hr: ["hr_employee_read", "hr_roster_read", "hr_payroll_read", "*"],
//   hmo: ["hmo_provider_read", "hmo_claim_read", "hmo_tariff_read", "*"],
//   marketing: ["marketing_corporate_read", "marketing_lead_read", "marketing_campaign_read", "*"],
//   lab: ["lab_order_read", "lab_result_create", "lab_result_read", "*"],
//   blood_bank: ["blood_bank_read", "blood_bank_issue", "blood_view", "*"],
//   radiology: ["radiology_order_read", "radiology_report_create", "radiology_report_read", "*"],
//   pharmacy: ["pharmacy_order_read", "pharmacy_stock_read", "*"],
//   theatre: ["ot_schedule_read", "ot_dashboard_read", "*"],
//   ward: ["ipd_read", "ipd_bed_manage", "*"],
//   nursing: ["ward_read", "nursing_read", "ipd_read", "nursing_vitals_read", "*"],
//   emergency: ["erd_bed_manage", "erd_read", "*"],
//   inventory: ["inventory_item_read", "inventory_stock_in", "inventory_requisition_read", "*"],
//   assets: ["inventory_item_read", "asset_read", "asset_manage", "*"],
//   management: ["billing_tariff_manage", "management_read", "discount_manage", "*"],
//   settings: ["system_settings_manage", "*"],

//   // User Governance & Security
//   users: ["user_read", "role_assign", "system_audit_read", "*"],
//   "user-dir": ["user_read", "*"],
//   "user-access": ["role_assign", "*"],
//   "user-audit": ["system_audit_read", "*"],
// };


// export const NAV_PERMISSION_RULES: Record<string, string[]> = {
//   // Clinical Modules
//   patients: ["patient_read", "patient_create", "*"],
//   appointments: ["appointment_read", "appointment_create", "doctor_schedule_read", "*"],
//   emr: ["emr_read", "emr_note_create", "emr_order_create", "*"],
//   billing: ["billing_read", "billing_invoice_create", "billing_payment_receive", "*"],
//   finance: ["finance_coa_read", "finance_ap_invoice_read", "finance_report_read", "*"],
//   hr: ["hr_employee_read", "hr_roster_read", "hr_payroll_read", "*"],
//   hmo: ["hmo_provider_read", "hmo_claim_read", "hmo_tariff_read", "*"],
//   marketing: ["marketing_corporate_read", "marketing_lead_read", "marketing_campaign_read", "*"],
//   lab: ["lab_order_read", "lab_result_create", "lab_result_read", "*"],
//   "blood-bank": ["blood_bank_read", "blood_bank_issue", "blood_view", "*"],
//   radiology: ["radiology_order_read", "radiology_report_create", "radiology_report_read", "*"],
//   pharmacy: ["pharmacy_order_read", "pharmacy_stock_read", "*"],
//   theatre: ["ot_schedule_read", "ot_dashboard_read", "*"],
//   ward: ["ipd_read", "ipd_bed_manage", "*"],
//   nursing: ["ward_read", "nursing_read", "ipd_read", "nursing_vitals_read", "*"],
//   emergency: ["erd_bed_manage", "erd_read", "*"],
//   inventory: ["inventory_item_read", "inventory_stock_in", "inventory_requisition_read", "*"],
//   assets: ["inventory_item_read", "asset_read", "asset_manage", "*"],
//   management: ["billing_tariff_manage", "management_read", "discount_manage", "*"],
//   reporting: ["reporting_read", "billing_report_read", "summary_operational_report_report", "*"],
//   "all-reports": ["reporting_read", "billing_report_read", "summary_operational_report_report", "*"],
//   settings: ["system_settings_manage", "*"],

//   // User Governance & Audit Sub-routes
//   users: ["user_read", "role_assign", "system_audit_read", "*"],
//   "user-dir": ["user_read", "*"],
//   "user-access": ["role_assign", "*"],
//   "user-audit": ["system_audit_read", "*"],
// };




// // constants.ts

// import {
//   Users,
//   Calendar,
//   FileText,
//   CreditCard,
//   ShieldCheck,
//   FlaskConical,
//   Pill,
//   Activity,
//   Bed,
//   Ambulance,
//   Package,
//   BarChart3,
//   UserCog,
//   Settings,
//   LayoutDashboard,
//   UserPlus,
//   Search,
//   Fingerprint,
//   CalendarPlus,
//   Clock,
//   ClipboardList,
//   User,
//   FilePlus,
//   Wallet,
//   RotateCcw,
//   History,
//   Coins,
//   Building2,
//   DollarSign,
//   Send,
//   Archive,
//   ShoppingBag,
//   Layers,
//   MonitorPlay,
//   LogOut,
//   Map,
//   Truck,
//   TrendingUp,
//   PieChart,
//   ShieldAlert,
//   Lock,
//   Receipt,
//   FileSpreadsheet,
//   Megaphone,
//   Briefcase,
//   Target,
//   MessageSquareHeart,
//   Tag,
//   HeartPulse,
//   Microscope,
//   Landmark
// } from "lucide-react";
// import { NavItem } from "../types";

// // ==========================================
// // 1. DATABASE MODULE ID DICTIONARY (obj_modules)
// // ==========================================
// export const MODULE_IDS = {
//   DASHBOARD: 1,
//   PATIENTS: 2,
//   APPOINTMENTS: 3,
//   BILLING: 4,
//   EMR: 5,
//   PHARMACY: 6,
//   INVENTORY: 7,
//   LAB: 8,
//   RADIOLOGY: 9,
//   THEATRE: 10,
//   WARD: 11,
//   EMERGENCY: 12,
//   REPORTS: 13,
//   ADMIN: 14,
//   SETTINGS: 15,
//   ASSETS: 16,
//   USERS: 17,
//   NURSING: 18,
//   BLOOD_BANK: 19,
//   FINANCE: 20,
//   HR: 21,
//   HMO: 22,
//   MARKETING: 23,
//   MANAGEMENT: 24,
// } as const;

// export type ModuleId = (typeof MODULE_IDS)[keyof typeof MODULE_IDS];

// export const MARKUP_TYPES = ["PERCENTAGE", "FIXED", "NONE"] as const;
// export type MarkupType = (typeof MARKUP_TYPES)[number];

// // ==========================================
// // 2. NAVIGATION ITEMS (Bound to DB Module IDs)
// // ==========================================
// export const NAV_ITEMS: NavItem[] = [
//   { 
//     id: "dashboard", 
//     moduleId: MODULE_IDS.DASHBOARD, 
//     label: "Dashboard", 
//     icon: LayoutDashboard, 
//     path: "/" 
//   },

//   // --- PATIENTS ---
//   {
//     id: "patients",
//     moduleId: MODULE_IDS.PATIENTS,
//     label: "Demographics",
//     icon: Users,
//     path: "/patients",
//     category: "admin",
//     subItems: [
//       { id: "patient-search", label: "Patient Search", icon: Search, path: "/patients/search", permission: "patient_read" },
//       { id: "patient-reg", label: "Demographics", icon: UserPlus, path: "/patients/demographics", permission: "patient_create" },
//       { id: "patient-history", label: "Patient History", icon: History, path: "/patients/history", permission: "patient_read" },
//       { id: "patient-admissions", label: "Admission List", icon: Bed, path: "/patients/admissions", permission: "ipd_read" },
//       { id: "patient-docs", label: "Patient Documents", icon: Archive, path: "/patients/documents", permission: "patient_document_read" },
//     ],
//   },

//   // --- APPOINTMENTS ---
//   {
//     id: "appointments",
//     moduleId: MODULE_IDS.APPOINTMENTS,
//     label: "Appointments",
//     icon: Calendar,
//     path: "/appointments",
//     badge: 5,
//     category: "clinical",
//     subItems: [
//       { id: "appt-schedule", label: "Doctor Schedule", icon: Clock, path: "/appointments/schedule", permission: "doctor_schedule_read" },
//       { id: "appt-book", label: "Book Appointment", icon: CalendarPlus, path: "/appointments/book", permission: "appointment_create" },
//       { id: "appt-queue", label: "Today's Queue", icon: Users, path: "/appointments/queue", permission: "appointment_read" },
//     ],
//   },

//   // --- EMR ---
//   {
//     id: "emr",
//     moduleId: MODULE_IDS.EMR,
//     label: "EMR",
//     icon: FileText,
//     path: "/emr",
//     category: "clinical",
//     subItems: [
//       { id: "emr-worklist", label: "My Worklist", icon: ClipboardList, path: "/emr/worklist", permission: "emr_read" },
//       { id: "emr-chart", label: "Patient Chart", icon: User, path: "/emr/chart", permission: "emr_note_create" },
//       { id: "emr-orders", label: "Service Entry (CPOE)", icon: FilePlus, path: "/emr/orders", permission: "emr_order_create" },
//     ],
//   },

//   // --- BILLING ---
//   {
//     id: "billing",
//     moduleId: MODULE_IDS.BILLING,
//     label: "Billing",
//     icon: CreditCard,
//     path: "/billing",
//     category: "admin",
//     subItems: [
//       { id: "bill-opd", label: "OPD Billing", icon: FilePlus, path: "/billing/opd", permission: "billing_invoice_create" },
//       { id: "bill-ipd", label: "IPD Billing", icon: Bed, path: "/billing/ipd", permission: "billing_invoice_create" },
//       { id: "bill-admissions", label: "Admission List", icon: Bed, path: "/billing/admissions", permission: "billing_read" },
//       { id: "bill-history", label: "Billing History", icon: History, path: "/billing/history", permission: "billing_read" },
//       { id: "bill-pricing", label: "Service Pricing", icon: DollarSign, path: "/billing/pricing", permission: "billing_tariff_manage" },
//       { id: "bill-adv", label: "Advance Collection", icon: Wallet, path: "/billing/advances", permission: "billing_advance_collect" },
//       { id: "bill-rec", label: "Refunds", icon: RotateCcw, path: "/billing/refunds" },
//     ],
//   },

//   // --- FINANCE & ACCOUNTS ---
//   {
//     id: "finance",
//     moduleId: MODULE_IDS.FINANCE,
//     label: "Finance & Accounts",
//     icon: Coins,
//     path: "/finance",
//     category: "admin",
//     subItems: [
//       { id: "fin-coa", label: "Chart of Accounts", icon: Layers, path: "/finance/chart-of-accounts", permission: "finance_coa_read" },
//       { id: "fin-ap", label: "Accounts Payable", icon: Receipt, path: "/finance/accounts-payable", permission: "finance_ap_invoice_read" },
//       { id: "fin-ar", label: "Accounts Receivable", icon: Landmark, path: "/finance/accounts-receivable", permission: "finance_ar_ledger_read" },
//       { id: "fin-reconcile", label: "Bank Reconciliation", icon: Landmark, path: "/finance/reconciliation", permission: "finance_bank_reconcile" },
//       { id: "fin-petty", label: "Petty Cash", icon: Wallet, path: "/finance/petty-cash", permission: "finance_petty_cash_read" },
//       { id: "fin-statements", label: "Financial Reports", icon: FileSpreadsheet, path: "/finance/statements", permission: "finance_report_read" },
//     ],
//   },

//   // --- HUMAN RESOURCES ---
//   {
//     id: "hr",
//     moduleId: MODULE_IDS.HR,
//     label: "Human Resources",
//     icon: Briefcase,
//     path: "/hr",
//     category: "admin",
//     subItems: [
//       { id: "hr-directory", label: "Staff Directory", icon: Users, path: "/hr/directory", permission: "hr_employee_read" },
//       { id: "hr-roster", label: "Duty Rostering", icon: Calendar, path: "/hr/roster", permission: "hr_roster_read" },
//       { id: "hr-attendance", label: "Attendance Logs", icon: Fingerprint, path: "/hr/attendance", permission: "hr_attendance_read" },
//       { id: "hr-leaves", label: "Leave Requests", icon: CalendarPlus, path: "/hr/leaves", permission: "hr_leave_read" },
//       { id: "hr-payroll", label: "Payroll Processing", icon: DollarSign, path: "/hr/payroll", permission: "hr_payroll_read" },
//     ],
//   },

//   // --- HMO & INSURANCE ---
//   {
//     id: "hmo",
//     moduleId: MODULE_IDS.HMO,
//     label: "HMO & Insurance",
//     icon: ShieldCheck,
//     path: "/hmo",
//     category: "admin",
//     subItems: [
//       { id: "hmo-providers", label: "Provider Directory", icon: Building2, path: "/hmo/providers", permission: "hmo_provider_read" },
//       { id: "hmo-tariffs", label: "Tariff Plans", icon: DollarSign, path: "/hmo/tariffs", permission: "hmo_tariff_read" },
//       { id: "hmo-claims", label: "Claims Manager", icon: FileText, path: "/hmo/claims", permission: "hmo_claim_read" },
//       { id: "hmo-auth", label: "Pre-Authorizations", icon: Send, path: "/hmo/auth", permission: "hmo_preauth_read" },
//     ],
//   },

//   // --- MARKETING & CRM ---
//   {
//     id: "marketing",
//     moduleId: MODULE_IDS.MARKETING,
//     label: "Marketing & CRM",
//     icon: Megaphone,
//     path: "/marketing",
//     category: "admin",
//     subItems: [
//       { id: "mkt-corporate", label: "Corporate Clients", icon: Building2, path: "/marketing/corporate-clients", permission: "marketing_corporate_read" },
//       { id: "mkt-partners", label: "Referral Partners", icon: Users, path: "/marketing/partners", permission: "marketing_partner_read" },
//       { id: "mkt-leads", label: "Inquiries & Leads", icon: UserPlus, path: "/marketing/leads", permission: "marketing_lead_read" },
//       { id: "mkt-packages", label: "Health Packages", icon: Package, path: "/marketing/packages", permission: "marketing_package_manage" },
//       { id: "mkt-campaigns", label: "Campaigns", icon: Target, path: "/marketing/campaigns", permission: "marketing_campaign_read" },
//       { id: "mkt-feedback", label: "Patient Feedback", icon: MessageSquareHeart, path: "/marketing/feedback", permission: "marketing_feedback_read" },
//     ],
//   },

//   // --- LAB ---
//   {
//     id: "lab",
//     moduleId: MODULE_IDS.LAB,
//     label: "Lab (LIS)",
//     icon: FlaskConical,
//     path: "/lab",
//     category: "clinical",
//     subItems: [
//       { id: "lab-worklist", label: "Lab Worklist", icon: ClipboardList, path: "/lab/worklist", permission: "lab_order_read" },
//       { id: "lab-results", label: "Result Entry", icon: FileText, path: "/lab/results", permission: "lab_result_create" },
//       { id: "lab-catalog", label: "Result Verification", icon: Microscope, path: "/lab/verification" },
//       { id: "lab-reports", label: "Lab Reports", icon: Archive, path: "/lab/reports", permission: "lab_result_read" },
//     ],
//   },

//   // --- RADIOLOGY ---
//   {
//     id: "radiology",
//     moduleId: MODULE_IDS.RADIOLOGY,
//     label: "Radiology (RIS)",
//     icon: Archive,
//     path: "/radiology",
//     category: "clinical",
//     subItems: [
//       { id: "rad-worklist", label: "Imaging Worklist", icon: ClipboardList, path: "/radiology/worklist", permission: "radiology_order_read" },
//       { id: "rad-results", label: "Result Entry", icon: FileText, path: "/radiology/results", permission: "radiology_report_create" },
//       { id: "rad-viewer", label: "Image Viewer", icon: MonitorPlay, path: "/radiology/view", permission: "radiology_report_read" },
//     ],
//   },

//   // --- PHARMACY ---
//   {
//     id: "pharmacy",
//     moduleId: MODULE_IDS.PHARMACY,
//     label: "Pharmacy",
//     icon: Pill,
//     path: "/pharmacy",
//     category: "clinical",
//     subItems: [
//       { id: "rx-queue", label: "Dispensing Queue", icon: Clock, path: "/pharmacy/queue", permission: "pharmacy_order_read" },
//       { id: "rx-inventory", label: "Stock Movement", icon: ShoppingBag, path: "/pharmacy/inventory", permission: "pharmacy_stock_read" },
//       { id: "rx-stock", label: "Stock Inventory", icon: Package, path: "/pharmacy/stock", permission: "pharmacy_stock_read" },
//     ],
//   },

//   // --- THEATRE ---
//   {
//     id: "theatre",
//     moduleId: MODULE_IDS.THEATRE,
//     label: "Theatre",
//     icon: Activity,
//     path: "/theatre",
//     category: "clinical",
//     subItems: [
//       { id: "ot-schedule", label: "Surgery Schedule", icon: Calendar, path: "/theatre/schedule", permission: "ot_schedule_read" },
//       { id: "ot-live", label: "Live Status Board", icon: MonitorPlay, path: "/theatre/live", permission: "ot_dashboard_read" },
//     ],
//   },

//   // --- WARD ---
//   {
//     id: "ward",
//     moduleId: MODULE_IDS.WARD,
//     label: "Ward",
//     icon: Bed,
//     path: "/ward",
//     category: "clinical",
//     subItems: [
//       { id: "ward-beds", label: "Bed View", icon: Map, path: "/ward/beds", permission: "ipd_bed_manage" },
//       { id: "ward-logs", label: "Admission/Discharge", icon: LogOut, path: "/ward/admissions", permission: "ipd_read" },
//     ],
//   },

//   // --- NURSING & LABOUR ---
//   {
//     id: "nursing",
//     moduleId: MODULE_IDS.NURSING,
//     label: "Nursing & Labour",
//     icon: HeartPulse,
//     path: "/nursing",
//     category: "clinical",
//     subItems: [
//       { id: "nurse-admissions", label: "Labour Admissions", icon: UserPlus, path: "/nursing/admissions", permission: "ward_read" },
//       { id: "nurse-movement", label: "Stock Movement", icon: ShoppingBag, path: "/nursing/inventory", permission: "ward_read" },
//       { id: "nurse-stock", label: "Stock Inventory", icon: Package, path: "/nursing/stock", permission: "ward_read" },
//       { id: "nurse-req", label: "Requisitions", icon: ClipboardList, path: "/nursing/requisitions", permission: "ward_read" },
//     ],
//   },

//   // --- EMERGENCY ---
//   {
//     id: "emergency",
//     moduleId: MODULE_IDS.EMERGENCY,
//     label: "Emergency (ED)",
//     icon: Ambulance,
//     path: "/emergency",
//     category: "clinical",
//     subItems: [
//       { id: "ed-floor", label: "Floor Map", icon: LayoutDashboard, path: "/emergency/floor", permission: "erd_bed_manage" },
//     ],
//   },

//   // --- INVENTORY ---
//   {
//     id: "inventory",
//     moduleId: MODULE_IDS.INVENTORY,
//     label: "Inventory",
//     icon: Package,
//     path: "/inventory",
//     category: "ops",
//     subItems: [
//       { id: "inv-stock", label: "Stock Master", icon: Layers, path: "/inventory/master", permission: "inventory_item_read" },
//       { id: "inv-grn", label: "Goods Received (GRN)", icon: Truck, path: "/inventory/grn", permission: "inventory_stock_in" },
//       { id: "inv-requests", label: "Internal Requisitions", icon: ClipboardList, path: "/inventory/requests", permission: "inventory_requisition_read" },
//       { id: "inv-suppliers", label: "Supplier Setup", icon: Building2, path: "/inventory/suppliers", permission: "inventory_vendor_read" },
//     ],
//   },

//   // --- ASSETS ---
//   {
//     id: "assets",
//     moduleId: MODULE_IDS.ASSETS,
//     label: "Fixed Assets",
//     icon: Building2,
//     path: "/assets",
//     category: "ops",
//     subItems: [
//       { id: "asset-dash", label: "Asset Dashboard", icon: LayoutDashboard, path: "/assets/dashboard", permission: "inventory_item_read" },
//       { id: "asset-master", label: "Asset Master", icon: Layers, path: "/assets/master", permission: "inventory_item_read" },
//     ],
//   },

//   // --- MANAGEMENT ---
//   {
//     id: "management",
//     moduleId: MODULE_IDS.MANAGEMENT,
//     label: "Management",
//     icon: TrendingUp,
//     path: "/management",
//     category: "admin",
//     subItems: [
//       { id: "mgmt-disc", label: "Discount Approvals", icon: Tag, path: "/management/discounts", permission: "billing_tariff_manage" },
//       { id: "mgmt-ref", label: "Refund Approvals", icon: RotateCcw, path: "/management/refunds", permission: "billing_tariff_manage" },
//     ],
//   },

//   // --- REPORTS & BI ---
//   {
//     id: "reports",
//     moduleId: MODULE_IDS.REPORTS,
//     label: "Reports & Analytics",
//     icon: BarChart3,
//     path: "/all-reports",
//     category: "ops",
//     subItems: [
//       { id: "rep-overview", label: "Hospital Overview", icon: LayoutDashboard, path: "/reports/overview" },
//       { id: "rep-revenue", label: "Revenue Reports", icon: TrendingUp, path: "/reports/revenue" },
//       { id: "rep-patients", label: "Patient Analytics", icon: PieChart, path: "/reports/patients" },
//       { id: "rep-usage", label: "Department Usage", icon: BarChart3, path: "/reports/usage" },
//       { id: "rep-builder", label: "Report Builder", icon: FileSpreadsheet, path: "/reports/builder" },
//     ],
//   },

//   // --- USERS & SECURITY ---
//   {
//     id: "users",
//     moduleId: MODULE_IDS.USERS,
//     label: "Users",
//     icon: UserCog,
//     path: "/admin/users",
//     category: "admin",
//     subItems: [
//       { id: "user-dir", label: "Staff Directory", icon: Users, path: "/admin/users/directory", permission: "user_read" },
//       { id: "user-access", label: "Access Control", icon: Lock, path: "/admin/users/access", permission: "role_assign" },
//       { id: "user-audit", label: "Security Audit", icon: ShieldAlert, path: "/admin/users/audit", permission: "system_audit_read" },
//     ],
//   },

//   // --- SETTINGS ---
//   {
//     id: "settings",
//     moduleId: MODULE_IDS.SETTINGS,
//     label: "Settings",
//     icon: Settings,
//     path: "/settings",
//     category: "ops",
//     subItems: [
//       { id: "set-finance", label: "Tax & Currency", icon: Coins, path: "/settings/finance", permission: "system_settings_manage" },
//     ],
//   },

//   // --- PROFILE ---
//   {
//     id: "profile",
//     label: "My Profile",
//     icon: User,
//     path: "/profile",
//   },
// ];

// // ==========================================
// // 3. REARRANGED LEAN ROLE PERMISSIONS
// // Handles both DB format (doctor) and Frontend format (Doctor)
// // Enforces: 1 Department Module + Reports (Doctors get EMR + Appointments + Reports)
// // ==========================================
// export const ROLE_PERMISSIONS: Record<string, string[]> = {
//   // Super Admin & Hospital Admin
//   super_admin: [
//     "dashboard", "patients", "appointments", "emr", "billing", "finance", "hr",
//     "hmo", "marketing", "lab", "radiology", "pharmacy", "theatre", "ward",
//     "nursing", "emergency", "inventory", "assets", "management", "reports",
//     "users", "settings",
//   ],
//   Admin: [
//     "dashboard", "patients", "appointments", "emr", "billing", "finance", "hr",
//     "hmo", "marketing", "lab", "radiology", "pharmacy", "theatre", "ward",
//     "nursing", "emergency", "inventory", "assets", "management", "reports",
//     "users", "settings",
//   ],
//   hospital_admin: [
//     "dashboard", "patients", "appointments", "emr", "billing", "finance", "hr",
//     "hmo", "marketing", "lab", "radiology", "pharmacy", "theatre", "ward",
//     "nursing", "emergency", "inventory", "assets", "management", "reports",
//     "users", "settings",
//   ],

//   // Doctors / Consultants (EMR + Appointments + Reports)
//   Doctor: ["dashboard", "appointments", "emr", "reports"],
//   doctor: ["dashboard", "appointments", "emr", "reports"],
//   consultant: ["dashboard", "appointments", "emr", "reports"],

//   // Nursing (Nursing + Ward)
//   Nurse: ["dashboard", "ward", "nursing"],
//   nurse: ["dashboard", "ward", "nursing"],
//   nurse_manager: ["dashboard", "ward", "emergency", "nursing", "reports"],

//   // Front Desk / Reception (Patients + Appointments + Reports)
//   "Front Desk": ["dashboard", "patients", "appointments", "reports"],
//   front_desk: ["dashboard", "patients", "appointments", "reports"],
//   receptionist: ["dashboard", "patients", "appointments"],

//   // Pharmacy (Pharmacy + Reports)
//   Pharmacist: ["dashboard", "pharmacy", "reports"],
//   pharmacist: ["dashboard", "pharmacy", "reports"],

//   // Laboratory (Lab + Reports)
//   "Lab Tech": ["dashboard", "lab", "reports"],
//   lab_scientist: ["dashboard", "lab", "reports"],

//   // Radiology (Radiology + Reports)
//   radiologist: ["dashboard", "radiology", "reports"],

//   // Finance & Accounts (Billing + Finance + Reports)
//   Accountant: ["dashboard", "billing", "finance", "reports"],
//   accountant: ["dashboard", "billing", "finance", "reports"],
//   billing: ["dashboard", "billing", "reports"],

//   // Inventory & Store (Inventory + Assets + Reports)
//   "Inventory Manager": ["dashboard", "inventory", "assets", "reports"],
//   inventory: ["dashboard", "inventory", "assets", "reports"],

//   // Surgical Theatre
//   operating_theater: ["dashboard", "theatre", "reports"],
//   anesthesia_technician: ["dashboard", "theatre", "reports"],
//   cardiovascular_perfusionist: ["dashboard", "theatre", "reports"],

//   // Customer Service / Marketing
//   customer_service: ["dashboard", "marketing", "reports"],
//   customer_service_manager: ["dashboard", "patients", "marketing", "reports"],

//   // Executive Management
//   medical_director: ["dashboard", "appointments", "emr", "theatre", "ward", "lab", "pharmacy", "reports"],
//   chief_operating_officer: ["dashboard", "billing", "finance", "hr", "management", "reports"],
// };





// import React from "react";
// import {
//   Users,
//   Calendar,
//   FileText,
//   CreditCard,
//   ShieldCheck,
//   FlaskConical,
//   Pill,
//   Activity,
//   Bed,
//   Ambulance,
//   Package,
//   BarChart3,
//   UserCog,
//   Settings,
//   LayoutDashboard,
//   UserPlus,
//   Search,
//   Fingerprint,
//   CalendarPlus,
//   Clock,
//   ClipboardList,
//   User,
//   FilePlus,
//   Wallet,
//   RotateCcw,
//   History,
//   Wrench,
//   Tag,
//   UserMinus,
//   Coins,
//   Building2,
//   DollarSign,
//   Send,
//   Microscope,
//   FileEdit,
//   ClipboardCheck,
//   Archive,
//   ShoppingBag,
//   Layers,
//   AlertCircle,
//   Scissors,
//   MonitorPlay,
//   LogOut,
//   Map,
//   Zap,
//   Layout,
//   Stethoscope,
//   Truck,
//   TrendingUp,
//   PieChart,
//   FileSpreadsheet,
//   ShieldPlus,
//   ShieldAlert,
//   Lock,
//   Printer,
// } from "lucide-react";
// import { NavItem, UserRole } from "../types";

// export const MARKUP_TYPES = ["PERCENTAGE", "FIXED", "NONE"] as const;
// export type MarkupType = (typeof MARKUP_TYPES)[number];

// // src/services/constants.ts (or src/services/constants.tsx)

// export { NAV_ITEMS } from "../constants";



// export const NAV_PERMISSION_RULES: Record<string, string[]> = {
//   patients: ["patient_read", "patient_create"],
//   appointments: ["appointment_read", "appointment_create", "doctor_schedule_read"],
//   emr: ["emr_read", "emr_note_create", "emr_order_create"],
//   billing: ["billing_read", "billing_invoice_create", "billing_payment_receive"],
//   finance: ["finance_coa_read", "finance_ap_invoice_read", "finance_report_read"],
//   hr: ["hr_employee_read", "hr_roster_read", "hr_payroll_read"],
//   hmo: ["hmo_provider_read", "hmo_claim_read", "hmo_tariff_read"],
//   marketing: ["marketing_corporate_read", "marketing_lead_read", "marketing_campaign_read"],
//   lab: ["lab_order_read", "lab_result_create", "lab_result_read"],
//   "blood-bank": ["blood_bank_read", "blood_bank_issue"],
//   radiology: ["radiology_order_read", "radiology_report_create", "radiology_report_read"],
//   pharmacy: ["pharmacy_order_read", "pharmacy_stock_read"],
//   theatre: ["ot_schedule_read", "ot_dashboard_read"],
//   ward: ["ipd_read", "ipd_bed_manage"],
//   nursing: ["ward_read", "nursing_read", "ipd_read"],
//   emergency: ["erd_bed_manage", "erd_read"],
//   inventory: ["inventory_item_read", "inventory_stock_in", "inventory_requisition_read"],
//   assets: ["inventory_item_read", "asset_read", "asset_manage"],
//   management: ["billing_tariff_manage", "management_read", "discount_manage"],
//   reporting: ["reporting_read", "billing_report_read", "summary_operational_report_report"],
//   "all-reports": ["reporting_read", "billing_report_read"],
//   users: ["user_read", "role_assign", "system_audit_read"],
//   "user-dir": ["user_read"],
//   "user-access": ["role_assign"],
//   "user-audit": ["system_audit_read"],
//   settings: ["system_settings_manage"],
// };



// // export const NAV_PERMISSION_RULES: Record<string, string[]> = {
// //   // Modules
// //   dashboard: ["*"],
// //   patients: ["patient_read", "patient_create", "*"],
// //   appointments: ["appointment_read", "appointment_create", "*"],
// //   emr: ["emr_read", "emr_note_create", "*"],
// //   billing: ["billing_read", "billing_invoice_create", "*"],
// //   finance: ["finance_coa_read", "finance_report_read", "billing_read", "*"],
// //   hr: ["hr_employee_read", "hr_roster_read", "user_read", "*"],
// //   hmo: ["hmo_provider_read", "hmo_claim_read", "*"],
// //   marketing: ["marketing_lead_read", "marketing_corporate_read", "patient_read", "*"],
// //   lab: ["lab_order_read", "lab_result_read", "*"],
// //   radiology: ["radiology_order_read", "radiology_report_read", "*"],
// //   pharmacy: ["pharmacy_order_read", "pharmacy_stock_read", "*"],
// //   theatre: ["ot_schedule_read", "ot_dashboard_read", "*"],
// //   ot: ["ot_schedule_read", "ot_dashboard_read", "*"],
// //   ward: ["ipd_read", "ipd_bed_manage", "*"],
// //   ipd: ["ipd_read", "ipd_bed_manage", "*"],
// //   nursing: ["nursing_vitals_read", "nursing_notes_read", "*"],
// //   Nursing: ["nursing_vitals_read", "nursing_notes_read", "*"],
// //   emergency: ["erd_read", "erd_bed_manage", "*"],
// //   erd: ["erd_read", "erd_bed_manage", "*"],
// //   inventory: ["inventory_item_read", "inventory_stock_read", "*"],
// //   reporting: ["billing_report_read", "summary_operational_report_report", "*"],
// //   reports: ["billing_report_read", "summary_operational_report_report", "*"],
// //   "all-reports": ["summary_operational_report_report", "billing_report_read", "*"],
// //   management: ["billing_discount_view", "billing_refund_request", "*"],
// //   users: ["user_read", "role_assign", "*"],
// //   "user-dir": ["user_read", "*"],
// //   "user-access": ["role_assign", "*"],
// //   "user-audit": ["system_audit_read", "*"],
// //   settings: ["system_settings_manage", "*"],
// //   system: ["system_settings_manage", "*"],
// //   assets: ["inventory_item_read", "*"],
// //   "blood-bank": ["blood_view", "blood_request_read", "*"],
// //   Blood_Bank: ["blood_view", "blood_request_read", "*"],

// //   // Sub-items
// //   "patient-search": ["patient_read", "*"],
// //   "patient-reg": ["patient_create", "*"],
// //   "patient-history": ["patient_read", "*"],
// //   "patient-admissions": ["ipd_read", "*"],
// //   "appt-schedule": ["doctor_schedule_read", "*"],
// //   "appt-book": ["appointment_create", "*"],
// //   "appt-queue": ["appointment_read", "*"],
// //   "emr-worklist": ["emr_read", "*"],
// //   "emr-chart": ["emr_note_create", "emr_read", "*"],
// //   "emr-orders": ["emr_order_create", "*"],
// //   "bill-opd": ["billing_invoice_create", "*"],
// //   "bill-ipd": ["billing_invoice_create", "*"],
// //   "bill-admissions": ["billing_read", "*"],
// //   "bill-history": ["billing_read", "*"],
// //   "bill-pricing": ["billing_tariff_manage", "*"],
// //   "bill-adv": ["billing_advance_collect", "*"],
// //   "bill-rec": ["billing_payment_receive", "*"],
// //   "fin-coa": ["finance_coa_read", "*"],
// //   "fin-ap": ["finance_ap_invoice_read", "*"],
// //   "fin-ar": ["finance_ar_ledger_read", "*"],
// //   "fin-reconcile": ["finance_bank_reconcile", "*"],
// //   "fin-petty": ["finance_petty_cash_read", "*"],
// //   "fin-statements": ["finance_report_read", "*"],
// //   "hr-directory": ["hr_employee_read", "user_read", "*"],
// //   "hr-roster": ["hr_roster_read", "*"],
// //   "hr-attendance": ["hr_attendance_read", "*"],
// //   "hr-leaves": ["hr_leave_read", "*"],
// //   "hr-payroll": ["hr_payroll_read", "*"],
// //   "hmo-providers": ["hmo_provider_read", "*"],
// //   "hmo-tariffs": ["hmo_tariff_read", "*"],
// //   "hmo-claims": ["hmo_claim_read", "*"],
// //   "hmo-auth": ["hmo_preauth_read", "*"],
// //   "mkt-corporate": ["marketing_corporate_read", "*"],
// //   "mkt-partners": ["marketing_partner_read", "*"],
// //   "mkt-leads": ["marketing_lead_read", "*"],
// //   "mkt-packages": ["marketing_package_manage", "*"],
// // };
// // Added super_admin and updated Admin keys




// export const ROLE_PERMISSIONS: Record<string, string[]> = {
//   super_admin: [
//     "dashboard",
//     "patients",
//     "appointments",
//     "emr",
//     "billing",
//     "finance",
//     "hr",
//     "hmo",
//     "marketing",
//     "lab",
//     "radiology",
//     "pharmacy",
//     "theatre",
//     "ward",
//     "emergency",
//     "inventory",
//     "reporting",
//     "management",
//     "users",
//     "settings",
//   ],
//   Admin: [
//     "dashboard",
//     "patients",
//     "appointments",
//     "emr",
//     "billing",
//     "finance",
//     "hr",
//     "hmo",
//     "marketing",
//     "lab",
//     "radiology",
//     "pharmacy",
//     "theatre",
//     "ward",
//     "emergency",
//     "inventory",
//     "reporting",
//     "management",
//     "users",
//     "settings",
//   ],
//   Doctor: ["dashboard", "patients", "appointments", "emr", "theatre", "ward", "reporting"],
//   Nurse: ["dashboard", "patients", "emr", "ward", "theatre", "emergency"],
//   "Front Desk": ["dashboard", "patients", "appointments", "billing", "hmo", "emergency", "marketing"],
//   Pharmacist: ["dashboard", "pharmacy", "inventory"],
//   "Lab Tech": ["dashboard", "lab", "radiology", "inventory"],
//   Accountant: ["dashboard", "billing", "finance", "hmo", "reporting"],
//   "Inventory Manager": ["dashboard", "inventory", "pharmacy"],
// };

// export const MOCK_USER = {
//   name: "Dr. Gregory House",
//   role: "Doctor" as UserRole,
//   department: "Internal Medicine",
//   avatar: "https://picsum.photos/seed/doctor/200/200",
// };