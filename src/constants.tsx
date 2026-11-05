// src/constants.ts
import {
  Users,
  Calendar,
  FileText,
  CreditCard,
  ShieldCheck,
  FlaskConical,
  Pill,
  Activity,
  Bed,
  Ambulance,
  Package,
  Droplet,
  UserCog,
  Settings,
  LayoutDashboard,
  UserPlus,
  Search,
  Fingerprint,
  CalendarPlus,
  Clock,
  ClipboardList,
  User,
  FilePlus,
  Wallet,
  RotateCcw,
  History,
  Coins,
  Building2,
  DollarSign,
  Send,
  Archive,
  ShoppingBag,
  Layers,
  MonitorPlay,
  LogOut,
  Map,
  Truck,
  TrendingUp,
  Receipt,
  FileSpreadsheet,
  Megaphone,
  Briefcase,
  Target,
  MessageSquareHeart,
  Tag,
  HeartPulse,
  SquarePen,
  FileCheck,
  FileBarChart,
  Boxes,
  ArrowRightLeft,
  ShoppingCart,
  Lock,
  ShieldAlert,
} from "lucide-react";
import { NavItem, UserRole } from "./types";

export const MARKUP_TYPES = ["PERCENTAGE", "FIXED", "NONE"] as const;
export type MarkupType = (typeof MARKUP_TYPES)[number];

export const MODULE_IDS = {
  DASHBOARD: 1,
  PATIENTS: 2,
  APPOINTMENTS: 3,
  BILLING: 4,
  EMR: 5,
  PHARMACY: 6,
  INVENTORY: 7,
  LAB: 8,
  RADIOLOGY: 9,
  THEATRE: 10,
  WARD: 11,
  EMERGENCY: 12,
  REPORTS: 13,
  ADMIN: 14,
  SETTINGS: 15,
  ASSETS: 16,
  USERS: 17,
  NURSING: 18,
  BLOOD_BANK: 19,
  FINANCE: 20,
  HR: 21,
  HMO: 22,
  MARKETING: 23,
  MANAGEMENT: 24,
} as const;

export type ModuleId = (typeof MODULE_IDS)[keyof typeof MODULE_IDS];

// Reusable Departmental RBAC Role Sets
const PATIENT_STOCK_ROLES = [
  "super_admin", "hospital_admin", "admin", "executive_director", 
  "front_desk", "receptionist", "customer_service", "customer_service_manager", 
  "chief_operating_officer", "inventory"
];

const BILLING_STOCK_ROLES = [
  "super_admin", "hospital_admin", "admin", "executive_director", 
  "billing", "accountant", "chief_operating_officer", "inventory"
];

const BILLING_MGMT_ROLES = [
  "super_admin", "hospital_admin", "admin", "executive_director", 
  "accountant", "chief_operating_officer", "billing"
];

const LAB_STOCK_ROLES = [
  "super_admin", "hospital_admin", "admin", "executive_director", 
  "lab_scientist", "chief_operating_officer", "inventory"
];

const RAD_STOCK_ROLES = [
  "super_admin", "hospital_admin", "admin", "executive_director", 
  "radiologist", "chief_operating_officer", "inventory"
];

const THEATRE_STOCK_ROLES = [
  "super_admin", "hospital_admin", "admin", "executive_director", 
  "operating_theater", "anesthesia_technician", "cardiovascular_perfusionist", 
  "nurse_manager", "chief_operating_officer", "inventory"
];

const WARD_STOCK_ROLES = [
  "super_admin", "hospital_admin", "admin", "executive_director", 
  "nurse", "nurse_manager", "chief_operating_officer", "inventory"
];

const EMERGENCY_STOCK_ROLES = [
  "super_admin", "hospital_admin", "admin", "executive_director", 
  "nurse", "nurse_manager", "chief_operating_officer", "inventory"
];

const PROCUREMENT_ROLES = [
  "super_admin", "hospital_admin", "admin", "executive_director", 
  "chief_operating_officer", "inventory", "accountant"
];

export const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", moduleId: MODULE_IDS.DASHBOARD, label: "Home", icon: LayoutDashboard, path: "/" },

  // --- PATIENTS ---
  {
    id: "patients",
    moduleId: MODULE_IDS.PATIENTS,
    label: "Demographics",
    icon: Users,
    path: "/patients",
    category: "admin",
    subItems: [
      { id: "patient-search", label: "Patient Search", icon: Search, path: "/patients/search", permission: "patient_read" },
      { id: "patient-reg", label: "Demographics", icon: UserPlus, path: "/patients/demographics", permission: "patient_create" },
      { id: "patient-history", label: "Patient History", icon: History, path: "/patients/history", permission: "patient_read" },
      { id: "patient-admissions", label: "Admission List", icon: Bed, path: "/patients/admissions", permission: "ipd_read" },
      { id: "patient-docs", label: "Patient Documents", icon: Archive, path: "/patients/documents", permission: "patient_document_read" },
      { 
        id: "patient-inventory", 
        label: "Stock Movement", 
        icon: ArrowRightLeft, 
        path: "/patients/inventory", 
        permission: "inventory_stock_read", 
        allowedRoles: PATIENT_STOCK_ROLES 
      },
      { 
        id: "patient-stock", 
        label: "Stock Inventory", 
        icon: Package, 
        path: "/patients/stock", 
        permission: "inventory_stock_read", 
        allowedRoles: PATIENT_STOCK_ROLES 
      },
      { 
        id: "patient-requisitions", 
        label: "Requisitions", 
        icon: ClipboardList, 
        path: "/patients/requisitions", 
        permission: "inventory_requisition_read", 
        allowedRoles: PATIENT_STOCK_ROLES 
      },
    ],
  },

  // --- APPOINTMENTS ---
  {
    id: "appointments",
    moduleId: MODULE_IDS.APPOINTMENTS,
    label: "Appointments",
    icon: Calendar,
    path: "/appointments",
    badge: 5,
    category: "clinical",
    subItems: [
      { id: "appt-schedule", label: "Doctor Schedule", icon: Clock, path: "/appointments/schedule", permission: "doctor_schedule_read" },
      { id: "appt-book", label: "Book Appointment", icon: CalendarPlus, path: "/appointments/book", permission: "appointment_create" },
      { id: "appt-queue", label: "Today's Queue", icon: Users, path: "/appointments/queue", permission: "appointment_read" },
    ],
  },

  // --- EMR ---
  {
    id: "emr",
    moduleId: MODULE_IDS.EMR,
    label: "EMR",
    icon: FileText,
    path: "/emr",
    category: "clinical",
    subItems: [
      { id: "emr-worklist", label: "My Worklist", icon: ClipboardList, path: "/emr/worklist", permission: "emr_read" },
      { id: "emr-chart", label: "Patient Chart", icon: User, path: "/emr/chart", permission: "emr_note_create" },
      { id: "emr-orders", label: "Service Entry (CPOE)", icon: FilePlus, path: "/emr/orders", permission: "emr_order_create" },
    ],
  },

  // --- BILLING ---
  {
    id: "billing",
    moduleId: MODULE_IDS.BILLING,
    label: "Billing",
    icon: CreditCard,
    path: "/billing",
    category: "admin",
    subItems: [
      { id: "bill-opd", label: "OPD Billing", icon: FilePlus, path: "/billing/opd", permission: "billing_invoice_create" },
      { id: "bill-ipd", label: "IPD Billing", icon: Bed, path: "/billing/ipd", permission: "billing_invoice_create" },
      { id: "bill-admissions", label: "Admission List", icon: Bed, path: "/billing/admissions", permission: "billing_read" },
      { id: "bill-history", label: "Billing History", icon: History, path: "/billing/history", permission: "billing_read" },
      { 
        id: "bill-pricing", 
        label: "Service Pricing", 
        icon: DollarSign, 
        path: "/billing/pricing", 
        permission: "billing_tariff_manage", 
        allowedRoles: BILLING_MGMT_ROLES 
      },
      { id: "bill-adv", label: "Advance Collection", icon: Wallet, path: "/billing/advances", permission: "billing_advance_collect" },
      { 
        id: "bill-rec", 
        label: "Refunds", 
        icon: RotateCcw, 
        path: "/billing/refunds", 
        permission: "billing_payment_receive", 
        allowedRoles: BILLING_MGMT_ROLES 
      },
      { 
        id: "bill-inventory", 
        label: "Stock Movement", 
        icon: ArrowRightLeft, 
        path: "/billing/inventory", 
        permission: "inventory_stock_read", 
        allowedRoles: BILLING_STOCK_ROLES 
      },
      { 
        id: "bill-stock", 
        label: "Stock Inventory", 
        icon: Package, 
        path: "/billing/stock", 
        permission: "inventory_stock_read", 
        allowedRoles: BILLING_STOCK_ROLES 
      },
      { 
        id: "bill-requisitions", 
        label: "Requisitions", 
        icon: ClipboardList, 
        path: "/billing/requisitions", 
        permission: "inventory_requisition_read", 
        allowedRoles: BILLING_STOCK_ROLES 
      },
    ],
  },

  // --- FINANCE & ACCOUNTS ---
  {
    id: "finance",
    moduleId: MODULE_IDS.FINANCE,
    label: "Finance & Accounts",
    icon: Coins,
    path: "/finance",
    category: "admin",
    subItems: [
      { id: "fin-coa", label: "Chart of Accounts", icon: Layers, path: "/finance/chart-of-accounts", permission: "finance_coa_read" },
      { id: "fin-ap", label: "Accounts Payable", icon: Receipt, path: "/finance/accounts-payable", permission: "finance_ap_invoice_read" },
      { id: "fin-ar", label: "Accounts Receivable", icon: Building2, path: "/finance/accounts-receivable", permission: "finance_ar_ledger_read" },
      { id: "fin-reconcile", label: "Bank Reconciliation", icon: Building2, path: "/finance/reconciliation", permission: "finance_bank_reconcile" },
      { id: "fin-petty", label: "Petty Cash", icon: Wallet, path: "/finance/petty-cash", permission: "finance_petty_cash_read" },
      { id: "fin-statements", label: "Financial Reports", icon: FileSpreadsheet, path: "/finance/statements", permission: "finance_report_read" },
    ],
  },

  // --- HUMAN RESOURCES ---
  {
    id: "hr",
    moduleId: MODULE_IDS.HR,
    label: "Human Resources",
    icon: Briefcase,
    path: "/hr",
    category: "admin",
    subItems: [
      { id: "hr-directory", label: "Staff Directory", icon: Users, path: "/hr/directory", permission: "hr_employee_read" },
      { id: "hr-roster", label: "Duty Rostering", icon: Calendar, path: "/hr/roster", permission: "hr_roster_read" },
      { id: "hr-attendance", label: "Attendance Logs", icon: Fingerprint, path: "/hr/attendance", permission: "hr_attendance_read" },
      { id: "hr-leaves", label: "Leave Requests", icon: CalendarPlus, path: "/hr/leaves", permission: "hr_leave_read" },
      { id: "hr-payroll", label: "Payroll Processing", icon: DollarSign, path: "/hr/payroll", permission: "hr_payroll_read" },
    ],
  },

  // --- HMO & INSURANCE ---
  {
    id: "hmo",
    moduleId: MODULE_IDS.HMO,
    label: "HMO & Insurance",
    icon: ShieldCheck,
    path: "/hmo",
    category: "admin",
    subItems: [
      { id: "hmo-providers", label: "Provider Directory", icon: Building2, path: "/hmo/providers", permission: "hmo_provider_read" },
      { id: "hmo-tariffs", label: "Tariff Plans", icon: DollarSign, path: "/hmo/tariffs", permission: "hmo_tariff_read" },
      { id: "hmo-claims", label: "Claims Manager", icon: FileText, path: "/hmo/claims", permission: "hmo_claim_read" },
      { id: "hmo-auth", label: "Pre-Authorizations", icon: Send, path: "/hmo/auth", permission: "hmo_preauth_read" },
    ],
  },

  // --- MARKETING & CRM ---
  {
    id: "marketing",
    moduleId: MODULE_IDS.MARKETING,
    label: "Marketing & CRM",
    icon: Megaphone,
    path: "/marketing",
    category: "admin",
    subItems: [
      { id: "mkt-corporate", label: "Corporate Clients", icon: Building2, path: "/marketing/corporate-clients", permission: "marketing_corporate_read" },
      { id: "mkt-partners", label: "Referral Partners", icon: Users, path: "/marketing/partners", permission: "marketing_partner_read" },
      { id: "mkt-leads", label: "Inquiries & Leads", icon: UserPlus, path: "/marketing/leads", permission: "marketing_lead_read" },
      { id: "mkt-packages", label: "Health Packages", icon: Package, path: "/marketing/packages", permission: "marketing_package_manage" },
      { id: "mkt-campaigns", label: "Campaigns", icon: Target, path: "/marketing/campaigns", permission: "marketing_campaign_read" },
      { id: "mkt-feedback", label: "Patient Feedback", icon: MessageSquareHeart, path: "/marketing/feedback", permission: "marketing_feedback_read" },
    ],
  },

  // --- LAB ---
  {
    id: "lab",
    moduleId: MODULE_IDS.LAB,
    label: "Lab (LIS)",
    icon: FlaskConical,
    path: "/lab",
    category: "clinical",
    subItems: [
      { id: "lab-worklist", label: "Worklist", icon: ClipboardList, path: "/lab/worklist", permission: "lab_order_read" },
      { id: "lab-results", label: "Result Entry", icon: SquarePen, path: "/lab/results", permission: "lab_result_create" },
      { 
        id: "lab-verification", 
        label: "Result Verification", 
        icon: FileCheck, 
        path: "/lab/verification", 
        permission: "lab_result_verify", 
        allowedRoles: ["super_admin", "hospital_admin", "admin", "medical_director", "lab_scientist"] 
      },
      { id: "lab-reports", label: "Reports", icon: FileBarChart, path: "/lab/reports", permission: "lab_result_read" },
      { 
        id: "lab-management", 
        label: "Management", 
        icon: LayoutDashboard, 
        path: "/lab/management", 
        permission: "lab_admin", 
        allowedRoles: ["super_admin", "hospital_admin", "admin", "medical_director", "lab_scientist"] 
      },
      { 
        id: "lab-inventory", 
        label: "Stock Movement", 
        icon: ArrowRightLeft, 
        path: "/lab/inventory", 
        permission: "lab_inventory_read", 
        allowedRoles: LAB_STOCK_ROLES 
      },
      { 
        id: "lab-stock", 
        label: "Stock Inventory", 
        icon: Boxes, 
        path: "/lab/stock", 
        permission: "lab_inventory_manage", 
        allowedRoles: LAB_STOCK_ROLES 
      },
      { 
        id: "lab-requisitions", 
        label: "Requisitions", 
        icon: Receipt, 
        path: "/lab/requisitions", 
        permission: "lab_result_read", 
        allowedRoles: LAB_STOCK_ROLES 
      },
    ],
  },

  // --- BLOOD BANK ---
  {
    id: "blood_bank",
    moduleId: MODULE_IDS.BLOOD_BANK,
    label: "Blood Bank",
    icon: Droplet,
    path: "/blood-bank/requests",
    category: "clinical",
    subItems: [
      { id: "blood-bank-request", label: "Requests & Crossmatch", icon: ClipboardList, path: "/blood-bank/requests", permission: "blood_bank_read" },
      { id: "blood-issued", label: "Register & Issue", icon: Droplet, path: "/blood-bank/issue", permission: "blood_bank_issue" },
    ],
  },

  // --- RADIOLOGY ---
  {
    id: "radiology",
    moduleId: MODULE_IDS.RADIOLOGY,
    label: "Radiology (RIS)",
    icon: Archive,
    path: "/radiology",
    category: "clinical",
    subItems: [
      { id: "rad-worklist", label: "Imaging Worklist", icon: ClipboardList, path: "/radiology/worklist", permission: "radiology_order_read" },
      { id: "rad-results", label: "Result Entry", icon: FileText, path: "/radiology/results", permission: "radiology_report_create" },
      { id: "rad-viewer", label: "Image Viewer", icon: MonitorPlay, path: "/radiology/view", permission: "radiology_report_read" },
      { 
        id: "rad-inventory", 
        label: "Stock Movement", 
        icon: ArrowRightLeft, 
        path: "/radiology/inventory", 
        permission: "inventory_stock_read", 
        allowedRoles: RAD_STOCK_ROLES 
      },
      { 
        id: "rad-stock", 
        label: "Stock Inventory", 
        icon: Package, 
        path: "/radiology/stock", 
        permission: "inventory_stock_read", 
        allowedRoles: RAD_STOCK_ROLES 
      },
      { 
        id: "rad-requisitions", 
        label: "Internal Requisitions", 
        icon: ClipboardList, 
        path: "/radiology/requisitions", 
        permission: "inventory_requisition_read", 
        allowedRoles: RAD_STOCK_ROLES 
      },
    ],
  },

  // --- PHARMACY ---
  {
    id: "pharmacy",
    moduleId: MODULE_IDS.PHARMACY,
    label: "Pharmacy",
    icon: Pill,
    path: "/pharmacy",
    category: "clinical",
    subItems: [
      { id: "rx-queue", label: "Dispensing Queue", icon: Clock, path: "/pharmacy/queue", permission: "pharmacy_order_read" },
      { 
        id: "rx-inventory", 
        label: "Stock Movement", 
        icon: ShoppingBag, 
        path: "/pharmacy/inventory", 
        permission: "pharmacy_stock_read",
        allowedRoles: ["super_admin", "hospital_admin", "admin", "pharmacist", "inventory", "chief_operating_officer"]
      },
      { 
        id: "rx-stock", 
        label: "Stock Inventory", 
        icon: Package, 
        path: "/pharmacy/stock", 
        permission: "pharmacy_stock_read",
        allowedRoles: ["super_admin", "hospital_admin", "admin", "pharmacist", "inventory", "chief_operating_officer"]
      },
      { 
        id: "rx-requisitions", 
        label: "Internal Requisitions", 
        icon: ClipboardList, 
        path: "/pharmacy/requisitions", 
        permission: "inventory_requisition_read",
        allowedRoles: ["super_admin", "hospital_admin", "admin", "pharmacist", "inventory", "chief_operating_officer"]
      },
    ],
  },

  // --- THEATRE ---
  {
    id: "theatre",
    moduleId: MODULE_IDS.THEATRE,
    label: "Theatre",
    icon: Activity,
    path: "/theatre",
    category: "clinical",
    subItems: [
      { id: "ot-schedule", label: "Surgery Schedule", icon: Calendar, path: "/theatre/schedule", permission: "ot_schedule_read" },
      { id: "ot-live", label: "Live Status Board", icon: MonitorPlay, path: "/theatre/live", permission: "ot_dashboard_read" },
      { 
        id: "ot-inventory", 
        label: "Stock Movement", 
        icon: ArrowRightLeft, 
        path: "/theatre/inventory", 
        permission: "inventory_stock_read", 
        allowedRoles: THEATRE_STOCK_ROLES 
      },
      { 
        id: "ot-stock", 
        label: "Stock Inventory", 
        icon: Package, 
        path: "/theatre/stock", 
        permission: "inventory_stock_read", 
        allowedRoles: THEATRE_STOCK_ROLES 
      },
      { 
        id: "ot-requisitions", 
        label: "Internal Requisitions", 
        icon: ClipboardList, 
        path: "/theatre/requisitions", 
        permission: "inventory_requisition_read", 
        allowedRoles: THEATRE_STOCK_ROLES 
      },
    ],
  },

  // --- WARD ---
  {
    id: "ward",
    moduleId: MODULE_IDS.WARD,
    label: "Ward",
    icon: Bed,
    path: "/ward",
    category: "clinical",
    subItems: [
      { id: "ward-beds", label: "Bed View", icon: Map, path: "/ward/beds", permission: "ipd_bed_manage" },
      { id: "ward-logs", label: "Admission/Discharge", icon: LogOut, path: "/ward/admissions", permission: "ipd_read" },
      { 
        id: "ward-inventory", 
        label: "Stock Movement", 
        icon: ArrowRightLeft, 
        path: "/ward/inventory", 
        permission: "inventory_stock_read", 
        allowedRoles: WARD_STOCK_ROLES 
      },
      { 
        id: "ward-stock", 
        label: "Stock Inventory", 
        icon: Package, 
        path: "/ward/stock", 
        permission: "inventory_stock_read", 
        allowedRoles: WARD_STOCK_ROLES 
      },
      { 
        id: "ward-requisitions", 
        label: "Internal Requisitions", 
        icon: ClipboardList, 
        path: "/ward/requisitions", 
        permission: "inventory_requisition_read", 
        allowedRoles: WARD_STOCK_ROLES 
      },
    ],
  },

  // --- NURSING & LABOUR ---
  {
    id: "nursing",
    moduleId: MODULE_IDS.NURSING,
    label: "Nursing & Labour",
    icon: HeartPulse,
    path: "/nursing",
    category: "clinical",
    subItems: [
      { id: "nurse-admissions", label: "Labour Admissions", icon: UserPlus, path: "/nursing/admissions", permission: "ward_read" },
      { 
        id: "nurse-movement", 
        label: "Stock Movement", 
        icon: ArrowRightLeft, 
        path: "/nursing/inventory", 
        permission: "ward_read", 
        allowedRoles: WARD_STOCK_ROLES 
      },
      { 
        id: "nurse-stock", 
        label: "Stock Inventory", 
        icon: Package, 
        path: "/nursing/stock", 
        permission: "ward_read", 
        allowedRoles: WARD_STOCK_ROLES 
      },
      { 
        id: "nurse-req", 
        label: "Requisitions", 
        icon: ClipboardList, 
        path: "/nursing/requisitions", 
        permission: "ward_read", 
        allowedRoles: WARD_STOCK_ROLES 
      },
    ],
  },

  // --- EMERGENCY ---
  {
    id: "emergency",
    moduleId: MODULE_IDS.EMERGENCY,
    label: "Emergency (ED)",
    icon: Ambulance,
    path: "/emergency",
    category: "clinical",
    subItems: [
      { id: "ed-floor", label: "Floor Map", icon: LayoutDashboard, path: "/emergency/floor", permission: "erd_bed_manage" },
      { 
        id: "ed-inventory", 
        label: "Stock Movement", 
        icon: ArrowRightLeft, 
        path: "/emergency/inventory", 
        permission: "inventory_stock_read", 
        allowedRoles: EMERGENCY_STOCK_ROLES 
      },
      { 
        id: "ed-stock", 
        label: "Stock Inventory", 
        icon: Package, 
        path: "/emergency/stock", 
        permission: "inventory_stock_read", 
        allowedRoles: EMERGENCY_STOCK_ROLES 
      },
      { 
        id: "ed-requisitions", 
        label: "Internal Requisitions", 
        icon: ClipboardList, 
        path: "/emergency/requisitions", 
        permission: "inventory_requisition_read", 
        allowedRoles: EMERGENCY_STOCK_ROLES 
      },
    ],
  },

  // --- INVENTORY ---
  {
    id: "inventory",
    moduleId: MODULE_IDS.INVENTORY,
    label: "Inventory",
    icon: Package,
    path: "/inventory",
    category: "ops",
    subItems: [
      { id: "inv-stock-master", label: "Stock Master", icon: Layers, path: "/inventory/master", permission: "inventory_item_read" },
      { id: "inv-grn", label: "Goods Received (GRN)", icon: Truck, path: "/inventory/grn", permission: "inventory_stock_in" },
      { id: "inv-movement", label: "Stock Movement", icon: ArrowRightLeft, path: "/inventory/movement", permission: "inventory_stock_read" },
      { id: "inv-stock", label: "Stock Inventory", icon: Package, path: "/inventory/stock", permission: "inventory_stock_read" },
      { id: "inv-requests", label: "Internal Requisitions", icon: ClipboardList, path: "/inventory/requests", permission: "inventory_requisition_read" },
      { 
        id: "inv-po", 
        label: "Purchase Orders", 
        icon: ShoppingCart, 
        path: "/inventory/purchase-orders", 
        permission: "inventory_requisition_approve",
        allowedRoles: PROCUREMENT_ROLES
      },
      { 
        id: "inv-suppliers", 
        label: "Supplier Setup", 
        icon: Building2, 
        path: "/inventory/suppliers", 
        permission: "inventory_vendor_read",
        allowedRoles: PROCUREMENT_ROLES
      },
    ],
  },

  // --- ASSETS ---
  {
    id: "assets",
    moduleId: MODULE_IDS.ASSETS,
    label: "Fixed Assets",
    icon: Building2,
    path: "/assets",
    category: "ops",
    subItems: [
      { id: "asset-dash", label: "Asset Dashboard", icon: LayoutDashboard, path: "/assets/dashboard", permission: "inventory_item_read" },
      { id: "asset-master", label: "Asset Master", icon: Layers, path: "/assets/master", permission: "inventory_item_read" },
    ],
  },

  // --- MANAGEMENT ---
  {
    id: "management",
    moduleId: MODULE_IDS.MANAGEMENT,
    label: "Management",
    icon: TrendingUp,
    path: "/management",
    category: "admin",
    subItems: [
      { id: "mgmt-disc", label: "Discount Approvals", icon: Tag, path: "/management/discounts", permission: "billing_tariff_manage" },
      { id: "mgmt-ref", label: "Refund Approvals", icon: RotateCcw, path: "/management/refunds", permission: "billing_tariff_manage" },
    ],
  },

  // --- USERS & SECURITY ---
  {
    id: "users",
    moduleId: MODULE_IDS.USERS,
    label: "Users",
    icon: UserCog,
    path: "/admin/users",
    category: "admin",
    subItems: [
      { id: "user-dir", label: "Staff Directory", icon: Users, path: "/admin/users/directory", permission: "user_read" },
      { id: "user-access", label: "Access Control", icon: Lock, path: "/admin/users/access", permission: "role_assign" },
      { id: "user-audit", label: "Security Audit", icon: ShieldAlert, path: "/admin/users/audit", permission: "system_audit_read" },
    ],
  },

  // --- SETTINGS ---
  {
    id: "settings",
    moduleId: MODULE_IDS.SETTINGS,
    label: "Settings",
    icon: Settings,
    path: "/settings",
    category: "ops",
    subItems: [
      { id: "set-finance", label: "Tax & Currency", icon: Coins, path: "/settings/finance", permission: "system_settings_manage" },
    ],
  },

  // --- REPORTS & BI ---
  {
    id: "reports",
    moduleId: MODULE_IDS.REPORTS,
    label: "Reports",
    icon: FileText,
    path: "/all-reports",
    category: "ops",
  },

  // --- PROFILE ---
  {
    id: "profile",
    label: "My Profile",
    icon: User,
    path: "/profile",
  },
];

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: [
    "dashboard", "patients", "appointments", "emr", "billing", "finance", "hr",
    "hmo", "marketing", "lab", "blood_bank", "radiology", "pharmacy", "theatre", "ward",
    "nursing", "emergency", "inventory", "assets", "management", "reports",
    "users", "settings",
  ],
  hospital_admin: [
    "dashboard", "patients", "appointments", "emr", "billing", "finance", "hr",
    "hmo", "marketing", "lab", "blood_bank", "radiology", "pharmacy", "theatre", "ward",
    "nursing", "emergency", "inventory", "assets", "management", "reports",
    "users", "settings",
  ],
  Admin: [
    "dashboard", "patients", "appointments", "emr", "billing", "finance", "hr",
    "hmo", "marketing", "lab", "blood_bank", "radiology", "pharmacy", "theatre", "ward",
    "nursing", "emergency", "inventory", "assets", "management", "reports",
    "users", "settings",
  ],
  doctor: ["dashboard", "appointments", "emr", "theatre", "reports"],
  Doctor: ["dashboard", "appointments", "emr", "theatre", "reports"],
  consultant: ["dashboard", "appointments", "emr", "theatre", "reports"],
  nurse: ["dashboard", "ward", "nursing", "emergency"],
  Nurse: ["dashboard", "ward", "nursing", "emergency"],
  nurse_manager: ["dashboard", "ward", "nursing", "emergency", "theatre", "reports"],
  front_desk: ["dashboard", "patients", "appointments", "reports"],
  "Front Desk": ["dashboard", "patients", "appointments", "reports"],
  receptionist: ["dashboard", "patients", "appointments"],
  customer_service: ["dashboard", "marketing", "reports"],
  customer_service_manager: ["dashboard", "patients", "marketing", "reports"],
  billing: ["dashboard", "billing", "reports"],
  accountant: ["dashboard", "billing", "finance", "reports"],
  Accountant: ["dashboard", "billing", "finance", "reports"],
  pharmacist: ["dashboard", "pharmacy", "reports"],
  Pharmacist: ["dashboard", "pharmacy", "reports"],
  lab_scientist: ["dashboard", "lab", "blood_bank", "reports"],
  "Lab Tech": ["dashboard", "lab", "blood_bank", "reports"],
  radiologist: ["dashboard", "radiology", "reports"],
  operating_theater: ["dashboard", "theatre", "reports"],
  anesthesia_technician: ["dashboard", "theatre", "reports"],
  cardiovascular_perfusionist: ["dashboard", "theatre", "reports"],
  inventory: ["dashboard", "inventory", "assets", "reports"],
  "Inventory Manager": ["dashboard", "inventory", "assets", "reports"],
  medical_director: ["dashboard", "appointments", "emr", "theatre", "ward", "lab", "pharmacy", "reports"],
  chief_operating_officer: ["dashboard", "billing", "finance", "hr", "management", "reports"],
};


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
//   Droplet,
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
//   Landmark,
//   Receipt,
//   FileSpreadsheet,
//   Megaphone,
//   Briefcase,
//   Target,
//   MessageSquareHeart,
//   Tag,
//   HeartPulse,
//   Microscope,
//   SquarePen,
//   FileCheck,
//   FileBarChart,
//   Boxes,
//   ArrowRightLeft,
// } from "lucide-react";
// import { NavItem, UserRole } from "./types";

// export const MARKUP_TYPES = ["PERCENTAGE", "FIXED", "NONE"] as const;
// export type MarkupType = (typeof MARKUP_TYPES)[number];

// export const NAV_ITEMS: NavItem[] = [
//   { id: "dashboard", label: "Home", icon: LayoutDashboard, path: "/" },

//   // --- PATIENTS ---
//   {
//     id: "patients",
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
//     label: "Lab (LIS)",
//     icon: FlaskConical,
//     path: "/lab",
//     category: "clinical",
//     subItems: [
//       // { id: "lab-worklist", label: "Worklist", icon: ClipboardList, path: "/lab/worklist", permission: "lab_order_read" },
//       // { id: "lab-results", label: "Result Entry", icon: FileText, path: "/lab/results", permission: "lab_result_create" },
//       // {
//       //   id: "lab-catalog",
//       //   label: "Result Verification",
//       //   icon: Microscope,
//       //   path: "/lab/verification",
//       // },
//       // { id: "lab-reports", label: "Reports", icon: Archive, path: "/lab/reports", permission: "lab_result_read" },
//       // { id: "lab-reports", label: "Management", icon: Archive, path: "/lab/management", permission: "" },
//       // { id: "lab-reports", label: "Requisitions", icon: Archive, path: "/lab/requisitions", permission: "lab_result_read" },
//       // { id: "lab-reports", label: "Inventory", icon: Archive, path: "/lab/inventory", permission: "" },
//       // { id: "lab-reports", label: "Stock/Item Movement", icon: Archive, path: "/lab/stock", permission: "" },


//       {
//         id: "lab-worklist",
//         label: "Worklist",
//         icon: ClipboardList,
//         path: "/lab/worklist",
//         permission: "lab_order_read",
//       },
//       {
//         id: "lab-results",
//         label: "Result Entry",
//         icon: SquarePen,
//         path: "/lab/results",
//         permission: "lab_result_create",
//       },
//       {
//         id: "lab-verification",
//         label: "Result Verification",
//         icon: FileCheck,
//         path: "/lab/verification",
//         permission: "lab_result_verify",
//       },
//       {
//         id: "lab-reports",
//         label: "Reports",
//         icon: FileBarChart,
//         path: "/lab/reports",
//         permission: "lab_result_read",
//       },
//       {
//         id: "lab-management",
//         label: "Management",
//         icon: LayoutDashboard,
//         path: "/lab/management",
//         permission: "lab_admin",
//       },
//       {
//         id: "lab-requisitions",
//         label: "Requisitions",
//         icon: Receipt,
//         path: "/lab/requisitions",
//         permission: "lab_result_read",
//       },
//       {
//         id: "lab-inventory",
//         label: "Inventory",
//         icon: Boxes,
//         path: "/lab/inventory",
//         permission: "lab_inventory_read",
//       },
//       {
//         id: "lab-stock",
//         label: "Stock/Item Movement",
//         icon: ArrowRightLeft,
//         path: "/lab/stock",
//         permission: "lab_inventory_manage",
//       },
//     ],
//   },

  
//   // --- LAB ---
//   {
//     id: "blood_bank",
//     label: "Blood Bank",
//     icon: Droplet,
//     path: "/blood-bank/requests",
//     category: "clinical",
//     subItems: [
//       { id: "blood-bank-request", label: "Requests & Crossmatch", icon: ClipboardList, path: "/blood-bank/requests", permission: "blood_bank_read" },
//       { id: "blood-issued", label: "Register & Issue", icon: Droplet, path: "/blood-bank/issue", permission: "blood_bank_issue" },
//     ],
//   },

  
//   // --- RADIOLOGY ---
//   {
//     id: "radiology",
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
//     label: "Ward",
//     icon: Bed,
//     path: "/ward",
//     category: "clinical",
//     subItems: [
//       { id: "ward-beds", label: "Bed View", icon: Map, path: "/ward/beds", permission: "ipd_bed_manage" },
//       { id: "ward-logs", label: "Admission/Discharge", icon: LogOut, path: "/ward/admissions", permission: "ipd_read" },
//     ],
//   },

//   // --- NURSING & LABOUR (RESTORED) ---
//   {
//     id: "nursing",
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

//   // --- ASSETS (RESTORED) ---
//   {
//     id: "assets",
//     label: "Fixed Assets",
//     icon: Building2,
//     path: "/assets",
//     category: "ops",
//     subItems: [
//       { id: "asset-dash", label: "Asset Dashboard", icon: LayoutDashboard, path: "/assets/dashboard", permission: "inventory_item_read" },
//       { id: "asset-master", label: "Asset Master", icon: Layers, path: "/assets/master", permission: "inventory_item_read" },
//     ],
//   },

//   // --- MANAGEMENT (RESTORED) ---
//   {
//     id: "management",
//     label: "Management",
//     icon: TrendingUp,
//     path: "/management",
//     category: "admin",
//     subItems: [
//       { id: "mgmt-disc", label: "Discount Approvals", icon: Tag, path: "/management/discounts", permission: "billing_tariff_manage" },
//       { id: "mgmt-ref", label: "Refund Approvals", icon: RotateCcw, path: "/management/refunds", permission: "billing_tariff_manage" },
//     ],
//   },

//   // --- REPORTING & BI (RESTORED) ---
//   // {
//   //   id: "reporting",
//   //   label: "Analytics",
//   //   icon: BarChart3,
//   //   path: "/reports",
//   //   category: "ops",
//   //   subItems: [
//   //     { id: "rep-overview", label: "Hospital Overview", icon: LayoutDashboard, path: "/reports/overview" },
//   //     { id: "rep-revenue", label: "Revenue Reports", icon: TrendingUp, path: "/reports/revenue" },
//   //     { id: "rep-patients", label: "Patient Analytics", icon: PieChart, path: "/reports/patients" },
//   //     { id: "rep-usage", label: "Department Usage", icon: BarChart3, path: "/reports/usage" },
//   //     { id: "rep-builder", label: "Report Builder", icon: FileSpreadsheet, path: "/reports/builder" },
//   //     // { id: "rep-all-catalog", label: "All Reports Catalog", icon: Archive, path: "/all-reports" },
//   //   ],
//   // },


//   // --- USERS & SECURITY ---
//   {
//     id: "users",
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
//     label: "Settings",
//     icon: Settings,
//     path: "/settings",
//     category: "ops",
//     subItems: [
//       { id: "set-finance", label: "Tax & Currency", icon: Coins, path: "/settings/finance", permission: "system_settings_manage" },
//     ],
//   },


  
//   // --- REPORTING & BI ---
//   {
//     id: "reports",
//     moduleId: 13,
//     label: "Reports",
//     icon: FileText,
//     path: "/all-reports",
//     category: "ops",
//   },

//   // --- PROFILE ---
//   {
//     id: "profile",
//     label: "My Profile",
//     icon: User,
//     path: "/profile",
//   },

//   // // --- REPORTING & BI (RESTORED) ---
//   // {
//   //   id: "reporting",
//   //   label: "Reports",
//   //   icon: FileText,
//   //   path: "/all-reports",
//   //   category: "ops",

//   // },

  
//   // // --- REPORTING & BI (RESTORED) ---
//   // {
//   //   id: "profile",
//   //   label: "My Profile",
//   //   icon: User,
//   //   path: "/profile",
//   //   category: "ops",

//   // },
// ];

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
//     "nursing",
//     "emergency",
//     "inventory",
//     "assets",
//     "management",
//     "reporting",
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
//     "nursing",
//     "emergency",
//     "inventory",
//     "assets",
//     "management",
//     "reporting",
//     "users",
//     "settings",
//   ],
//   Doctor: ["dashboard", "patients", "appointments", "emr", "theatre", "ward", "nursing", "reporting"],
//   Nurse: ["dashboard", "patients", "emr", "ward", "nursing", "theatre", "emergency"],
//   "Front Desk": ["dashboard", "patients", "appointments", "billing", "hmo", "emergency", "marketing"],
//   Pharmacist: ["dashboard", "pharmacy", "inventory"],
//   "Lab Tech": ["dashboard", "lab", "radiology", "inventory"],
//   Accountant: ["dashboard", "billing", "finance", "hmo", "management", "reporting"],
//   "Inventory Manager": ["dashboard", "inventory", "assets", "pharmacy"],
// };

// // Add near the top of src/constants.ts:
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









































































































































































































































































































































































































































































































































































// // // src/constants.tsx
// // import React from "react";
// // import {
// //   Users,
// //   Calendar,
// //   FileText,
// //   CreditCard,
// //   ShieldCheck,
// //   FlaskConical,
// //   Pill,
// //   Activity,
// //   Bed,
// //   Ambulance,
// //   Package,
// //   BarChart3,
// //   UserCog,
// //   Settings,
// //   LayoutDashboard,
// //   UserPlus,
// //   Search,
// //   Fingerprint,
// //   CalendarPlus,
// //   Clock,
// //   ClipboardList,
// //   User,
// //   FilePlus,
// //   Wallet,
// //   RotateCcw,
// //   History,
// //   Coins,
// //   Building2,
// //   DollarSign,
// //   Send,
// //   Archive,
// //   ShoppingBag,
// //   Layers,
// //   MonitorPlay,
// //   LogOut,
// //   Map,
// //   Truck,
// //   TrendingUp,
// //   PieChart,
// //   ShieldAlert,
// //   Lock,
// //   Landmark,
// //   Receipt,
// //   FileSpreadsheet,
// //   Megaphone,
// //   Briefcase,
// //   Target,
// //   MessageSquareHeart,
// //   Droplets,
// // } from "lucide-react";
// // import { NavItem, UserRole } from "./types";

// // export const MARKUP_TYPES = ["PERCENTAGE", "FIXED", "NONE"] as const;
// // export type MarkupType = (typeof MARKUP_TYPES)[number];

// // export const NAV_ITEMS: NavItem[] = [
// //   { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/" },
// //   {
// //     id: "patients",
// //     label: "Demographics",
// //     icon: Users,
// //     path: "/patients",
// //     category: "admin",
// //     subItems: [
// //       { id: "patient-search", label: "Patient Search", icon: Search, path: "/patients/search", permission: "patient_read" },
// //       { id: "patient-reg", label: "Demographics", icon: UserPlus, path: "/patients/demographics", permission: "patient_create" },
// //       { id: "patient-history", label: "Patient History", icon: History, path: "/patients/history", permission: "patient_read" },
// //       { id: "patient-admissions", label: "Admission List", icon: Bed, path: "/patients/admissions", permission: "ipd_read" },
// //       { id: "patient-docs", label: "Patient Documents", icon: Archive, path: "/patients/documents", permission: "patient_document_read" },
// //     ],
// //   },
// //   {
// //     id: "appointments",
// //     label: "Appointments",
// //     icon: Calendar,
// //     path: "/appointments",
// //     badge: 5,
// //     category: "clinical",
// //     subItems: [
// //       { id: "appt-schedule", label: "Doctor Schedule", icon: Clock, path: "/appointments/schedule", permission: "doctor_schedule_read" },
// //       { id: "appt-book", label: "Book Appointment", icon: CalendarPlus, path: "/appointments/book", permission: "appointment_create" },
// //       { id: "appt-queue", label: "Today's Queue", icon: Users, path: "/appointments/queue", permission: "appointment_read" },
// //     ],
// //   },
// //   {
// //     id: "emr",
// //     label: "EMR",
// //     icon: FileText,
// //     path: "/emr",
// //     category: "clinical",
// //     subItems: [
// //       { id: "emr-worklist", label: "My Worklist", icon: ClipboardList, path: "/emr/worklist", permission: "emr_read" },
// //       { id: "emr-chart", label: "Patient Chart", icon: User, path: "/emr/chart", permission: "emr_note_create" },
// //       { id: "emr-orders", label: "Service Entry (CPOE)", icon: FilePlus, path: "/emr/orders", permission: "emr_order_create" },
// //     ],
// //   },
// //   {
// //     id: "billing",
// //     label: "Billing",
// //     icon: CreditCard,
// //     path: "/billing",
// //     category: "admin",
// //     subItems: [
// //       { id: "bill-opd", label: "OPD Billing", icon: FilePlus, path: "/billing/opd", permission: "billing_invoice_create" },
// //       { id: "bill-ipd", label: "IPD Billing", icon: Bed, path: "/billing/ipd", permission: "billing_invoice_create" },
// //       { id: "bill-admissions", label: "Admission List", icon: Bed, path: "/billing/admissions", permission: "billing_read" },
// //       { id: "bill-history", label: "Billing History", icon: History, path: "/billing/history", permission: "billing_read" },
// //       { id: "bill-pricing", label: "Service Pricing", icon: DollarSign, path: "/billing/pricing", permission: "billing_tariff_manage" },
// //       { id: "bill-adv", label: "Advance Collection", icon: Wallet, path: "/billing/advances", permission: "billing_advance_collect" },
// //       { id: "bill-rec", label: "Payment Receipt", icon: History, path: "/billing/receipts", permission: "billing_payment_receive" },
// //     ],
// //   },
// //   {
// //     id: "finance",
// //     label: "Finance & Accounts",
// //     icon: Coins,
// //     path: "/finance",
// //     category: "admin",
// //     subItems: [
// //       { id: "fin-coa", label: "Chart of Accounts", icon: Layers, path: "/finance/chart-of-accounts", permission: "finance_coa_read" },
// //       { id: "fin-ap", label: "Accounts Payable", icon: Receipt, path: "/finance/accounts-payable", permission: "finance_ap_invoice_read" },
// //       { id: "fin-ar", label: "Accounts Receivable", icon: Landmark, path: "/finance/accounts-receivable", permission: "finance_ar_ledger_read" },
// //       { id: "fin-reconcile", label: "Bank Reconciliation", icon: Landmark, path: "/finance/reconciliation", permission: "finance_bank_reconcile" },
// //       { id: "fin-petty", label: "Petty Cash", icon: Wallet, path: "/finance/petty-cash", permission: "finance_petty_cash_read" },
// //       { id: "fin-statements", label: "Financial Reports", icon: FileSpreadsheet, path: "/finance/statements", permission: "finance_report_read" },
// //     ],
// //   },
// //   {
// //     id: "hr",
// //     label: "Human Resources",
// //     icon: Briefcase,
// //     path: "/hr",
// //     category: "admin",
// //     subItems: [
// //       { id: "hr-directory", label: "Staff Directory", icon: Users, path: "/hr/directory", permission: "hr_employee_read" },
// //       { id: "hr-roster", label: "Duty Rostering", icon: Calendar, path: "/hr/roster", permission: "hr_roster_read" },
// //       { id: "hr-attendance", label: "Attendance Logs", icon: Fingerprint, path: "/hr/attendance", permission: "hr_attendance_read" },
// //       { id: "hr-leaves", label: "Leave Requests", icon: CalendarPlus, path: "/hr/leaves", permission: "hr_leave_read" },
// //       { id: "hr-payroll", label: "Payroll Processing", icon: DollarSign, path: "/hr/payroll", permission: "hr_payroll_read" },
// //     ],
// //   },
// //   {
// //     id: "hmo",
// //     label: "HMO & Insurance",
// //     icon: ShieldCheck,
// //     path: "/hmo",
// //     category: "admin",
// //     subItems: [
// //       { id: "hmo-providers", label: "Provider Directory", icon: Building2, path: "/hmo/providers", permission: "hmo_provider_read" },
// //       { id: "hmo-tariffs", label: "Tariff Plans", icon: DollarSign, path: "/hmo/tariffs", permission: "hmo_tariff_read" },
// //       { id: "hmo-claims", label: "Claims Manager", icon: FileText, path: "/hmo/claims", permission: "hmo_claim_read" },
// //       { id: "hmo-auth", label: "Pre-Authorizations", icon: Send, path: "/hmo/auth", permission: "hmo_preauth_read" },
// //     ],
// //   },
// //   {
// //     id: "marketing",
// //     label: "Marketing & CRM",
// //     icon: Megaphone,
// //     path: "/marketing",
// //     category: "admin",
// //     subItems: [
// //       { id: "mkt-corporate", label: "Corporate Clients", icon: Building2, path: "/marketing/corporate-clients", permission: "marketing_corporate_read" },
// //       { id: "mkt-partners", label: "Referral Partners", icon: Users, path: "/marketing/partners", permission: "marketing_partner_read" },
// //       { id: "mkt-leads", label: "Inquiries & Leads", icon: UserPlus, path: "/marketing/leads", permission: "marketing_lead_read" },
// //       { id: "mkt-packages", label: "Health Packages", icon: Package, path: "/marketing/packages", permission: "marketing_package_manage" },
// //       { id: "mkt-campaigns", label: "Campaigns", icon: Target, path: "/marketing/campaigns", permission: "marketing_campaign_read" },
// //       { id: "mkt-feedback", label: "Patient Feedback", icon: MessageSquareHeart, path: "/marketing/feedback", permission: "marketing_feedback_read" },
// //     ],
// //   },
// //   {
// //     id: "lab",
// //     label: "Lab (LIS)",
// //     icon: FlaskConical,
// //     path: "/lab",
// //     category: "clinical",
// //     subItems: [
// //       { id: "lab-worklist", label: "Lab Worklist", icon: ClipboardList, path: "/lab/worklist", permission: "lab_order_read" },
// //       { id: "lab-results", label: "Result Entry", icon: FileText, path: "/lab/results", permission: "lab_result_create" },
// //       { id: "lab-reports", label: "Lab Reports", icon: Archive, path: "/lab/reports", permission: "lab_result_read" },
// //     ],
// //   },
// //   {
// //     id: "radiology",
// //     label: "Radiology (RIS)",
// //     icon: Archive,
// //     path: "/radiology",
// //     category: "clinical",
// //     subItems: [
// //       { id: "rad-worklist", label: "Imaging Worklist", icon: ClipboardList, path: "/radiology/worklist", permission: "radiology_order_read" },
// //       { id: "rad-results", label: "Result Entry", icon: FileText, path: "/radiology/results", permission: "radiology_report_create" },
// //       { id: "rad-viewer", label: "Image Viewer", icon: MonitorPlay, path: "/radiology/view", permission: "radiology_report_read" },
// //     ],
// //   },
// //   {
// //     id: "pharmacy",
// //     label: "Pharmacy",
// //     icon: Pill,
// //     path: "/pharmacy",
// //     category: "clinical",
// //     subItems: [
// //       { id: "rx-queue", label: "Dispensing Queue", icon: Clock, path: "/pharmacy/queue", permission: "pharmacy_order_read" },
// //       { id: "rx-inventory", label: "Stock Movement", icon: ShoppingBag, path: "/pharmacy/inventory", permission: "pharmacy_stock_read" },
// //       { id: "rx-stock", label: "Stock Inventory", icon: Package, path: "/pharmacy/stock", permission: "pharmacy_stock_read" },
// //     ],
// //   },
// //   {
// //     id: "theatre",
// //     label: "Theatre",
// //     icon: Activity,
// //     path: "/theatre",
// //     category: "clinical",
// //     subItems: [
// //       { id: "ot-schedule", label: "Surgery Schedule", icon: Calendar, path: "/theatre/schedule", permission: "ot_schedule_read" },
// //       { id: "ot-live", label: "Live Status Board", icon: MonitorPlay, path: "/theatre/live", permission: "ot_dashboard_read" },
// //     ],
// //   },
// //   {
// //     id: "ward",
// //     label: "Ward",
// //     icon: Bed,
// //     path: "/ward",
// //     category: "clinical",
// //     subItems: [
// //       { id: "ward-beds", label: "Bed View", icon: Map, path: "/ward/beds", permission: "ipd_bed_manage" },
// //       { id: "ward-logs", label: "Admission/Discharge", icon: LogOut, path: "/ward/admissions", permission: "ipd_read" },
// //     ],
// //   },
// //   {
// //     id: "emergency",
// //     label: "Emergency (ED)",
// //     icon: Ambulance,
// //     path: "/emergency",
// //     category: "clinical",
// //     subItems: [
// //       { id: "ed-floor", label: "Floor Map", icon: LayoutDashboard, path: "/emergency/floor", permission: "erd_bed_manage" },
// //     ],
// //   },
// //   {
// //     id: "inventory",
// //     label: "Inventory",
// //     icon: Package,
// //     path: "/inventory",
// //     category: "ops",
// //     subItems: [
// //       { id: "inv-stock", label: "Stock Master", icon: Layers, path: "/inventory/stock", permission: "inventory_item_read" },
// //       { id: "inv-grn", label: "Goods Received (GRN)", icon: Truck, path: "/inventory/grn", permission: "inventory_stock_in" },
// //       { id: "inv-requests", label: "Internal Requisitions", icon: ClipboardList, path: "/inventory/requests", permission: "inventory_requisition_read" },
// //       { id: "inv-suppliers", label: "Supplier Setup", icon: Building2, path: "/inventory/suppliers", permission: "inventory_vendor_read" },
// //     ],
// //   },
// //   {
// //     id: "reporting",
// //     label: "Reporting",
// //     icon: BarChart3,
// //     path: "/reports",
// //     category: "ops",
// //     subItems: [
// //       { id: "rep-revenue", label: "Revenue Reports", icon: TrendingUp, path: "/reports/revenue", permission: "billing_report_read" },
// //       { id: "rep-patients", label: "Patient Analytics", icon: PieChart, path: "/reports/patients", permission: "summary_operational_report_report" },
// //       { id: "rep-usage", label: "Department Usage", icon: BarChart3, path: "/reports/usage", permission: "inventory_item_report" },
// //     ],
// //   },
// //   {
// //     id: "users",
// //     label: "Users",
// //     icon: UserCog,
// //     path: "/admin/users",
// //     category: "admin",
// //     subItems: [
// //       { id: "user-dir", label: "Staff Directory", icon: Users, path: "/admin/users/directory", permission: "user_read" },
// //       { id: "user-access", label: "Access Control", icon: Lock, path: "/admin/users/access", permission: "role_assign" },
// //       { id: "user-audit", label: "Security Audit", icon: ShieldAlert, path: "/admin/users/audit", permission: "system_audit_read" },
// //     ],
// //   },
// //   {
// //     id: "settings",
// //     label: "Settings",
// //     icon: Settings,
// //     path: "/settings",
// //     category: "ops",
// //     subItems: [
// //       { id: "set-finance", label: "Tax & Currency", icon: Coins, path: "/settings/finance", permission: "system_settings_manage" },
// //     ],
// //   },
// // ];



// // // src/constants.tsx

// // export const ROLE_PERMISSIONS: Record<string, string[]> = {
// //   // 1. Add super_admin (matches your API response: roles[0].name === "super_admin")
// //   super_admin: [
// //     "dashboard",
// //     "patients",
// //     "appointments",
// //     "emr",
// //     "billing",
// //     "finance",    // <-- Added
// //     "hr",         // <-- Added
// //     "hmo",
// //     "marketing",  // <-- Added
// //     "lab",
// //     "radiology",
// //     "pharmacy",
// //     "theatre",
// //     "ward",
// //     "emergency",
// //     "inventory",
// //     "reporting",
// //     "users",
// //     "management",
// //     "settings",
// //   ],

// //   // 2. Add them to Admin as well
// //   Admin: [
// //     "dashboard",
// //     "patients",
// //     "appointments",
// //     "emr",
// //     "billing",
// //     "finance",    // <-- Added
// //     "hr",         // <-- Added
// //     "hmo",
// //     "marketing",  // <-- Added
// //     "lab",
// //     "radiology",
// //     "pharmacy",
// //     "theatre",
// //     "ward",
// //     "emergency",
// //     "inventory",
// //     "reporting",
// //     "management",
// //     "users",
// //     "settings",
// //   ],
// //   Doctor: ["dashboard", "patients", "appointments", "emr", "theatre", "ward", "reporting"],
// //   Nurse: ["dashboard", "patients", "emr", "ward", "theatre", "emergency"],
// //   "Front Desk": ["dashboard", "patients", "appointments", "billing", "hmo", "emergency", "marketing"],
// //   Pharmacist: ["dashboard", "pharmacy", "inventory"],
// //   "Lab Tech": ["dashboard", "lab", "radiology", "inventory"],
// //   Accountant: ["dashboard", "billing", "finance", "hmo", "reporting"],
// //   "Inventory Manager": ["dashboard", "inventory", "pharmacy"],
// // };





























// // // Ensure 'Admin' and 'super_admin' contain all newly introduced module IDs
// // export const ROLE_PERMISSIONS: Record<string, string[]> = {
// //   super_admin: [
// //     "dashboard", "patients", "appointments", "emr", "billing", "finance", "hr",
// //     "hmo", "marketing", "lab", "radiology", "pharmacy", "theatre", "ward",
// //     "emergency", "inventory", "reporting", "users", "settings"
// //   ],
// //   Admin: [
// //     "dashboard", "patients", "appointments", "emr", "billing", "finance", "hr",
// //     "hmo", "marketing", "lab", "radiology", "pharmacy", "theatre", "ward",
// //     "emergency", "inventory", "reporting", "users", "settings"
// //   ],
// //   Doctor: ["dashboard", "patients", "appointments", "emr", "theatre", "ward", "reporting"],
// //   Nurse: ["dashboard", "patients", "emr", "ward", "theatre", "emergency"],
// //   "Front Desk": ["dashboard", "patients", "appointments", "billing", "hmo", "emergency", "marketing"],
// //   Pharmacist: ["dashboard", "pharmacy", "inventory"],
// //   "Lab Tech": ["dashboard", "lab", "radiology", "inventory"],
// //   Accountant: ["dashboard", "billing", "finance", "hmo", "reporting"],
// //   "Inventory Manager": ["dashboard", "inventory", "pharmacy"],
// // };


// // import React from "react";
// // import {
// //   Users,
// //   Calendar,
// //   FileText,
// //   CreditCard,
// //   ShieldCheck,
// //   FlaskConical,
// //   Pill,
// //   Activity,
// //   Bed,
// //   Ambulance,
// //   Package,
// //   BarChart3,
// //   UserCog,
// //   Settings,
// //   LayoutDashboard,
// //   UserPlus,
// //   Search,
// //   Fingerprint,
// //   CalendarPlus,
// //   Clock,
// //   ClipboardList,
// //   User,
// //   FilePlus,
// //   Wallet,
// //   RotateCcw,
// //   History,
// //   Wrench,
// //   Tag,
// //   UserMinus,
// //   Coins,
// //   Building2,
// //   DollarSign,
// //   Send,
// //   Microscope,
// //   FileEdit,
// //   ClipboardCheck,
// //   Archive,
// //   ShoppingBag,
// //   Layers,
// //   AlertCircle,
// //   Scissors,
// //   MonitorPlay,
// //   LogOut,
// //   Map,
// //   Zap,
// //   Layout,
// //   Stethoscope,
// //   Truck,
// //   TrendingUp,
// //   PieChart,
// //   FileSpreadsheet,
// //   ShieldPlus,
// //   ShieldAlert,
// //   Lock,
// //   Printer,
// // } from "lucide-react";
// // import { NavItem, UserRole } from "./types";

// // export const MARKUP_TYPES = ["PERCENTAGE", "FIXED", "NONE"] as const;
// // export type MarkupType = (typeof MARKUP_TYPES)[number];

// // export const NAV_ITEMS: NavItem[] = [
// //   { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/" },
// //   {
// //     id: "patients",
// //     label: "Patient Admin",
// //     icon: Users,
// //     path: "/patients",
// //     category: "admin",
// //     subItems: [
// //       {
// //         id: "patient-search",
// //         label: "Patient Search",
// //         icon: Search,
// //         path: "/patients/search",
// //       },
// //       {
// //         id: "patient-reg",
// //         label: "Demographics",
// //         icon: UserPlus,
// //         path: "/patients/demographics",
// //       },
// //       {
// //         id: "patient-history",
// //         label: "Patient History",
// //         icon: History,
// //         path: "/patients/history",
// //       },
// //       {
// //         id: "patient-admissions",
// //         label: "Admission List",
// //         icon: Bed,
// //         path: "/patients/admissions",
// //       },
// //     ],
// //   },
// //   {
// //     id: "appointments",
// //     label: "Appointments",
// //     icon: Calendar,
// //     path: "/appointments",
// //     badge: 5,
// //     category: "clinical",
// //     subItems: [
// //       {
// //         id: "appt-schedule",
// //         label: "Doctor Schedule",
// //         icon: Clock,
// //         path: "/appointments/schedule",
// //       },
// //       {
// //         id: "appt-book",
// //         label: "Book Appointment",
// //         icon: CalendarPlus,
// //         path: "/appointments/book",
// //       },
// //       {
// //         id: "appt-queue",
// //         label: "Today's Queue",
// //         icon: Users,
// //         path: "/appointments/queue",
// //       },
// //     ],
// //   },
// //   {
// //     id: "emr",
// //     label: "EMR",
// //     icon: FileText,
// //     path: "/emr",
// //     category: "clinical",
// //     subItems: [
// //       {
// //         id: "emr-worklist",
// //         label: "My Worklist",
// //         icon: ClipboardList,
// //         path: "/emr/worklist",
// //       },
// //       {
// //         id: "emr-chart",
// //         label: "Patient Chart",
// //         icon: User,
// //         path: "/emr/chart",
// //       },
// //       {
// //         id: "emr-orders",
// //         label: "Service Entry (CPOE)",
// //         icon: FilePlus,
// //         path: "/emr/orders",
// //       },
// //     ],
// //   },
// //   {
// //     id: "billing",
// //     label: "Billing",
// //     icon: CreditCard,
// //     path: "/billing",
// //     category: "admin",
// //     subItems: [
// //       {
// //         id: "bill-opd",
// //         label: "OPD Billing",
// //         icon: FilePlus,
// //         path: "/billing/opd",
// //       },
// //       { id: "bill-ipd", label: "IPD Billing", icon: Bed, path: "/billing/ipd" },
// //       {
// //         id: "bill-admissions",
// //         label: "Admission List",
// //         icon: Bed,
// //         path: "/billing/admissions",
// //       },
// //       {
// //         id: "bill-history",
// //         label: "Billing History",
// //         icon: History,
// //         path: "/billing/history",
// //       },
// //       {
// //         id: "bill-pricing",
// //         label: "Service Pricing",
// //         icon: DollarSign,
// //         path: "/billing/pricing",
// //       },
// //       {
// //         id: "bill-adv",
// //         label: "Advance Collection",
// //         icon: Wallet,
// //         path: "/billing/advances",
// //       },
// //       // {
// //       //   id: "bill-ref",
// //       //   label: "Refund Management",
// //       //   icon: RotateCcw,
// //       //   path: "/billing/refunds",
// //       // },
// //       // {
// //       //   id: "bill-adj",
// //       //   label: "Bill Adjustment",
// //       //   icon: Wrench,
// //       //   path: "/billing/adjustments",
// //       // },
// //       // {
// //       //   id: "bill-inv",
// //       //   label: "Invoice Generation",
// //       //   icon: FileText,
// //       //   path: "/billing/invoices",
// //       // },
// //       //   id: "bill-pay",
// //       //   label: "Cash & Insurance",
// //       //   icon: Coins,
// //       //   path: "/billing/payments",
// //       // },
// //       {
// //         id: "bill-rec",
// //         label: "Payment Receipt",
// //         icon: History,
// //         path: "/billing/receipts",
// //       },
// //       // {
// //       //   id: "bill-debt",
// //       //   label: "Outstanding Balance",
// //       //   icon: UserMinus,
// //       //   path: "/billing/debtors",
// //       // },
// //     ],
// //   },
// //   {
// //     id: "hmo",
// //     label: "HMO",
// //     icon: ShieldCheck,
// //     path: "/hmo",
// //     category: "admin",
// //     subItems: [
// //       {
// //         id: "hmo-providers",
// //         label: "Provider Directory",
// //         icon: Building2,
// //         path: "/hmo/providers",
// //       },
// //       {
// //         id: "hmo-tariffs",
// //         label: "Tariff Plans",
// //         icon: DollarSign,
// //         path: "/hmo/tariffs",
// //       },
// //       {
// //         id: "hmo-claims",
// //         label: "Claims Manager",
// //         icon: FileText,
// //         path: "/hmo/claims",
// //       },
// //       {
// //         id: "hmo-auth",
// //         label: "Auth & Eligibility",
// //         icon: Send,
// //         path: "/hmo/auth",
// //       },
// //     ],
// //   },
// //   {
// //     id: "lab",
// //     label: "Lab (LIS)",
// //     icon: FlaskConical,
// //     path: "/lab",
// //     category: "clinical",
// //     subItems: [
// //       {
// //         id: "lab-worklist",
// //         label: "Lab Worklist",
// //         icon: ClipboardCheck,
// //         path: "/lab/worklist",
// //       },
// //       {
// //         id: "lab-results",
// //         label: "Result Entry",
// //         icon: FileEdit,
// //         path: "/lab/results",
// //       },
// //       // {
// //       //   id: "lab-catalog",
// //       //   label: "Test Catalog",
// //       //   icon: Microscope,
// //       //   path: "/lab/catalog",
// //       // },
// //       {
// //         id: "lab-reports",
// //         label: "Lab Reports",
// //         icon: Archive,
// //         path: "/lab/reports",
// //       },
// //     ],
// //   },
// //   {
// //     id: "radiology",
// //     label: "Radiology (RIS)",
// //     icon: Archive,
// //     path: "/radiology",
// //     category: "clinical",
// //     subItems: [
// //       {
// //         id: "rad-worklist",
// //         label: "Imaging Worklist",
// //         icon: ClipboardList,
// //         path: "/radiology/worklist",
// //       },
// //       {
// //         id: "rad-results",
// //         label: "Result Entry",
// //         icon: FileEdit,
// //         path: "/radiology/results",
// //       },
// //       // {
// //       //   id: "rad-catalog",
// //       //   label: "Imaging Catalog",
// //       //   icon: DollarSign,
// //       //   path: "/radiology/catalog",
// //       // },
// //       {
// //         id: "rad-viewer",
// //         label: "Image Viewer",
// //         icon: MonitorPlay,
// //         path: "/radiology/view",
// //       },
// //     ],
// //   },
// //   {
// //     id: "pharmacy",
// //     label: "Pharmacy",
// //     icon: Pill,
// //     path: "/pharmacy",
// //     category: "clinical",
// //     subItems: [
// //       {
// //         id: "rx-queue",
// //         label: "Dispensing Queue",
// //         icon: Clock,
// //         path: "/pharmacy/queue",
// //       },
// //       {
// //         id: "rx-inventory",
// //         label: "Stock Movement",
// //         icon: ShoppingBag,
// //         path: "/pharmacy/inventory",
// //       },
// //       {
// //         id: "rx-stock",
// //         label: "Stock Inventory",
// //         icon: Package,
// //         path: "/pharmacy/stock",
// //       },
// //       // {
// //       //   id: "rx-catalog",
// //       //   label: "Drug Catalog",
// //       //   icon: Layers,
// //       //   path: "/pharmacy/catalog",
// //       // },
// //       // {
// //       //   id: "rx-expiry",
// //       //   label: "Expiry Tracker",
// //       //   icon: AlertCircle,
// //       //   path: "/pharmacy/expiry",
// //       // },
// //     ],
// //   },
// //   {
// //     id: "theatre",
// //     label: "Theatre",
// //     icon: Activity,
// //     path: "/theatre",
// //     category: "clinical",
// //     subItems: [
// //       {
// //         id: "ot-schedule",
// //         label: "Surgery Schedule",
// //         icon: Calendar,
// //         path: "/theatre/schedule",
// //       },
// //       // {
// //       //   id: "ot-notes",
// //       //   label: "Procedure Notes",
// //       //   icon: Scissors,
// //       //   path: "/theatre/notes",
// //       // },
// //       {
// //         id: "ot-live",
// //         label: "Live Status Board",
// //         icon: MonitorPlay,
// //         path: "/theatre/live",
// //       },
// //     ],
// //   },
// //   {
// //     id: "ward",
// //     label: "Ward",
// //     icon: Bed,
// //     path: "/ward",
// //     category: "clinical",
// //     subItems: [
// //       { id: "ward-beds", label: "Bed View", icon: Map, path: "/ward/beds" },
// //       // {
// //       //   id: "ward-tasks",
// //       //   label: "Nursing Tasks",
// //       //   icon: ClipboardList,
// //       //   path: "/ward/nursing",
// //       // },
// //       {
// //         id: "ward-logs",
// //         label: "Admission/Discharge",
// //         icon: LogOut,
// //         path: "/ward/admissions",
// //       },
// //     ],
// //   },
// //   {
// //     id: "emergency",
// //     label: "Emergency (ED)",
// //     icon: Ambulance,
// //     path: "/emergency",
// //     // badge: 3,
// //     category: "clinical",
// //     subItems: [
// //       // {
// //       //   id: "ed-triage",
// //       //   label: "Triage Board",
// //       //   icon: Zap,
// //       //   path: "/emergency/triage",
// //       // },
// //       {
// //         id: "ed-floor",
// //         label: "Floor Map",
// //         icon: Layout,
// //         path: "/emergency/floor",
// //       },
// //       // {
// //       //   id: "ed-encounter",
// //       //   label: "Active Encounters",
// //       //   icon: Stethoscope,
// //       //   path: "/emergency/encounter",
// //       // },
// //     ],
// //   },
// //   {
// //     id: "inventory",
// //     label: "Inventory",
// //     icon: Package,
// //     path: "/inventory",
// //     category: "ops",
// //     subItems: [
// //       {
// //         id: "inv-stock",
// //         label: "Stock Master",
// //         icon: Layers,
// //         path: "/inventory/stock",
// //       },
// //       {
// //         id: "inv-grn",
// //         label: "Goods Received (GRN)",
// //         icon: Truck,
// //         path: "/inventory/grn",
// //       },
// //       {
// //         id: "inv-requests",
// //         label: "Internal Requisitions",
// //         icon: ClipboardList,
// //         path: "/inventory/requests",
// //       },
// //       {
// //         id: "inv-suppliers",
// //         label: "Supplier Setup",
// //         icon: Building2,
// //         path: "/inventory/suppliers",
// //       },
// //     ],
// //   },
// //   {
// //     id: "reporting",
// //     label: "Reporting",
// //     icon: BarChart3,
// //     path: "/reports",
// //     category: "ops",
// //     subItems: [
// //       {
// //         id: "rep-revenue",
// //         label: "Revenue Reports",
// //         icon: TrendingUp,
// //         path: "/reports/revenue",
// //       },
// //       {
// //         id: "rep-patients",
// //         label: "Patient Analytics",
// //         icon: PieChart,
// //         path: "/reports/patients",
// //       },
// //       {
// //         id: "rep-usage",
// //         label: "Department Usage",
// //         icon: BarChart3,
// //         path: "/reports/usage",
// //       },
// //       // {
// //       //   id: "rep-builder",
// //       //   label: "Report Builder",
// //       //   icon: FileSpreadsheet,
// //       //   path: "/reports/builder",
// //       // },
// //     ],
// //   },
// //   {
// //     id: "users",
// //     label: "Users",
// //     icon: UserCog,
// //     path: "/admin/users",
// //     category: "admin",
// //     subItems: [
// //       {
// //         id: "user-dir",
// //         label: "Staff Directory",
// //         icon: Users,
// //         path: "/admin/users/directory",
// //       },
// //       {
// //         id: "user-access",
// //         label: "Access Control",
// //         icon: Lock,
// //         path: "/admin/users/access",
// //       },
// //       {
// //         id: "user-audit",
// //         label: "Security Audit",
// //         icon: ShieldAlert,
// //         path: "/admin/users/audit",
// //       },
// //     ],
// //   },
// //   {
// //     id: "management",
// //     label: "Management",
// //     icon: TrendingUp,
// //     path: "/management",
// //     category: "admin",
// //     subItems: [
// //       {
// //         id: "mgmt-disc",
// //         label: "Discounts",
// //         icon: Tag,
// //         path: "/management/discounts",
// //       },
// //     ],
// //   },
// //   {
// //     id: "settings",
// //     label: "Settings",
// //     icon: Settings,
// //     path: "/settings",
// //     category: "ops",
// //     subItems: [
// //       // {
// //       //   id: "set-facility",
// //       //   label: "Facility Setup",
// //       //   icon: Building2,
// //       //   path: "/settings/facility",
// //       // },
// //       // {
// //       //   id: "set-depts",
// //       //   label: "Departments",
// //       //   icon: Layers,
// //       //   path: "/settings/departments",
// //       // },
// //       // {
// //       //   id: "set-pricing",
// //       //   label: "Services & Pricing",
// //       //   icon: DollarSign,
// //       //   path: "/settings/pricing",
// //       // },
// //       {
// //         id: "set-finance",
// //         label: "Tax & Currency",
// //         icon: Coins,
// //         path: "/settings/finance",
// //       },
// //       {
// //         id: "set-hardware",
// //         label: "Hardware Config",
// //         icon: Printer,
// //         path: "/settings/hardware",
// //       },
// //     ],
// //   },
// // ];

// // // Map frontend UserRole keys to allowed Navigation IDs
// // export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
// //   Admin: [
// //     "dashboard",
// //     "patients",
// //     "appointments",
// //     "emr",
// //     "billing",
// //     "hmo",
// //     "lab",
// //     "radiology",
// //     "pharmacy",
// //     "theatre",
// //     "ward",
// //     "emergency",
// //     "inventory",
// //     "reporting",
// //     "management",
// //     "users",
// //     "settings",
// //   ],
// //   Doctor: [
// //     "dashboard",
// //     "patients",
// //     "appointments",
// //     "emr",
// //     "theatre",
// //     "ward",
// //     "reporting",
// //   ],
// //   Nurse: ["dashboard", "patients", "emr", "ward", "theatre", "emergency"],
// //   "Front Desk": [
// //     "dashboard",
// //     "patients",
// //     "appointments",
// //     "billing",
// //     "hmo",
// //     "emergency",
// //   ],
// //   Pharmacist: ["dashboard", "pharmacy", "inventory"],
// //   "Lab Tech": ["dashboard", "lab", "radiology", "inventory"],
// //   Accountant: ["dashboard", "billing", "hmo", "reporting"],
// //   "Inventory Manager": ["dashboard", "inventory", "pharmacy"],
// // };

// // export const MOCK_USER = {
// //   name: "Dr. Gregory House",
// //   role: "Doctor" as UserRole,
// //   department: "Internal Medicine",
// //   avatar: "https://picsum.photos/seed/doctor/200/200",
// // };
