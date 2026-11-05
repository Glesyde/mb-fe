import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  FileSpreadsheet,
  Users,
  Calendar,
  Package,
  ChevronDown,
  Baby,
  Receipt,
  FlaskConical,
  Pill,
  Radiation,
  BedDouble,
  Scissors,
  ChevronLeft,
  ChevronRight,
  Stethoscope
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface ReportSubItem {
  to: string;
  label: string;
}

interface ReportTab {
  id: string; // Unique identifier matching ROLE_REPORT_ACCESS
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  items: ReportSubItem[];
}

// Master tabs configuration with explicit category IDs
const REPORT_TABS: ReportTab[] = [
  {
    id: "patient",
    label: "Patient Report",
    icon: Users,
    items: [
      { to: "/all-reports/patient", label: "Patient registration report" },
      { to: "/all-reports/patient/overview", label: "Executive PAS Overview" },
      { to: "/all-reports/patient/master", label: "Master Patient Report" },
      { to: "/all-reports/patient/payer-market-share", label: "Payer Market Share" },
      { to: "/all-reports/patient/age-demographics", label: "Age Demographics" },
      { to: "/all-reports/patient/staff-productivity", label: "Registration Staff Productivity Audit" },
      { to: "/all-reports/patient/geographic-distribution", label: "Geographic Distribution" },
      { to: "/all-reports/patient/encounter-frequency", label: "Patient Visit & Encounter Frequency" },
      { to: "/all-reports/patient/emergency-contacts", label: "Emergency Contacts Safety Audit" },
      { to: "/all-reports/patient/deceased-inactive", label: "Deceased & Inactive Account Ledger" },
    ],
  },
  {
    id: "appointment",
    label: "Appointment Report",
    icon: Calendar,
    items: [
      { to: "/all-reports/appointment", label: "Patient Appointment Report" },
      { to: "/all-reports/appointment/dashboard", label: "Appointments Dashboard" },
      { to: "/all-reports/appointment/ledger", label: "Master Appointment Ledger" },
      { to: "/all-reports/appointment/cancellations", label: "Cancellations Audit" },
      { to: "/all-reports/appointment/staff-productivity", label: "Front Desk Staff Productivity" },
    ],
  },
  {
    id: "inventory",
    label: "Inventory Report",
    icon: Package,
    items: [
      { to: "/all-reports/inventory", label: "Inventory transactions report" },
      { to: "/all-reports/inventory/stock", label: "Inventory stock report" },
      { to: "/all-reports/inventory/movement", label: "Inventory stock movement report" },
      { to: "/all-reports/inventory/valuation", label: "Inventory financial valuation report" },
      { to: "/all-reports/inventory/summary", label: "Inventory summary report" },
      { to: "/all-reports/inventory/classification", label: "Inventory classification report" },
      { to: "/all-reports/inventory/top-consumed", label: "Top consumed items report" },
      { to: "/all-reports/inventory/approved-consumption", label: "Approved items consumption report" },
      { to: "/all-reports/inventory/vendor-supply", label: "Vendor supply report" },
    ],
  },
  {
    id: "operational",
    label: "Operational Report",
    icon: FileSpreadsheet,
    items: [
      { to: "/all-reports/operational/outpatient", label: "Outpatient Report" },
      { to: "/all-reports/operational/inpatient", label: "Inpatient Report" },
      { to: "/all-reports/operational/emergency", label: "Emergency Patient Report" },
    ],
  },
  {
    id: "anc",
    label: "ANC Report",
    icon: Baby,
    items: [
      { to: "/all-reports/operational/anc", label: "ANC Report" },
    ],
  },
  {
    id: "billing",
    label: "Billing Report",
    icon: Receipt,
    items: [
      { to: "/all-reports/financial/billing/overview", label: "Billing Overview" },
      { to: "/all-reports/financial/billing", label: "Billing Report" },
      { to: "/all-reports/financial/deposit-utilization", label: "Deposit Utilization Report" },
      { to: "/all-reports/financial/cash-collection", label: "Cash Collection Report" },
      { to: "/all-reports/financial/advance-collection", label: "Advance Collection Report" },
      { to: "/all-reports/financial/unbilled-orders", label: "Unbilled Orders Report" },
      { to: "/all-reports/financial/departmental-revenue", label: "Departmental Revenue Report" },
      { to: "/all-reports/financial/discount", label: "Discount Report" },
      { to: "/all-reports/financial/physician-productivity", label: "Physician Productivity Report" },
      { to: "/all-reports/financial/cancellation-audit", label: "Cancellation & Reversal Audit" },
    ],
  },
  {
    id: "lab",
    label: "Lab Report",
    icon: FlaskConical,
    items: [
      { to: "/all-reports/laboratory", label: "Laboratory Report" },
      { to: "/all-reports/laboratory/operational", label: "Lab Operational Performance" },
      { to: "/all-reports/laboratory/detailed", label: "Lab Detailed Report" },
      { to: "/all-reports/laboratory/tat", label: "Lab TAT Report" },
      { to: "/all-reports/laboratory/abnormal-findings", label: "Lab Abnormal Findings Report" },
      { to: "/all-reports/laboratory/referrals", label: "Lab Detailed Referrals Report" },
      { to: "/all-reports/laboratory/productivity", label: "Lab Personnel Productivity Report" },
    ],
  },
{
    id: "pharmacy",
    label: "Pharmacy Report",
    icon: Pill,
    items: [
      { 
        to: "/all-reports/pharmacy/dispense", 
        label: "Dispensing report" 
      },
      { 
        to: "/all-reports/pharmacy", 
        label: "Pharmacy Overview & Metrics" 
      },
      { 
        to: "/all-reports/pharmacy/operational", 
        label: "Operations, Stock & Expiry Audit" 
      },
      { 
        to: "/all-reports/pharmacy/transactions", 
        label: "Pharmacy Transaction Book / Dispensing" 
      },
      { 
        to: "/all-reports/pharmacy/tat", 
        label: "Pharmacy TAT Report" 
      },
      { 
        to: "/all-reports/pharmacy/cancellations", 
        label: "Pharmacy Cancellations Report" 
      },
      { 
        to: "/all-reports/pharmacy/productivity", 
        label: "Pharmacist Productivity Report" 
      },
    ],
  },
  // {
  //   id: "pharmacy",
  //   label: "Pharmacy Report",
  //   icon: Pill,
  //   items: [
  //     { to: "/all-reports/pharmacy", label: "Pharmacy Report" },
  //     { to: "/all-reports/pharmacy/tat", label: "Pharmacy TAT Report" },
  //     { to: "/all-reports/pharmacy/cancellations", label: "Pharmacy Cancellations Report" },
  //     { to: "/all-reports/pharmacy/productivity", label: "Pharmacist Productivity Report" },
  //     { to: "/all-reports/pharmacy/transactions", label: "Pharmacy Transaction Book" },
  //   ],
  // },
  {
    id: "radiology",
    label: "Radiology Report",
    icon: Radiation,
    items: [
      { to: "/all-reports/radiology", label: "Radiology Report" },
      { to: "/all-reports/radiology/productivity", label: "Radiologist Productivity Report" },
      { to: "/all-reports/radiology/cancellations", label: "Radiology Cancellation Report" },
      { to: "/all-reports/radiology/referrals", label: "Radiology Detailed Referrals Report" },
    ],
  },

  {
    id: "clinical",
    label: "Doctor Report",
    icon: Stethoscope,
    items: [
      { to: "/all-reports/clinical/doctor-analytics", label: "Doctor Clinical Analytics" },
    ],
  },

  
  {
    id: "clinical",
    label: "Nurse Report",
    icon: Stethoscope,
    items: [
      { to: "/all-reports/clinical/nursing-productivity", label: "Nursing Clinical Productivity" },
    ],
  },


  {
    id: "ipd",
    label: "IPD Report",
    icon: BedDouble,
    items: [
      { to: "/all-reports/operational/inpatient", label: "Inpatient Report" },
      { to: "/all-reports/ipd/bed-utilization", label: "Bed Utilization & Ward Occupancy" },
      { to: "/all-reports/ipd/discharge-tat", label: "Discharge Turnaround Time" },
      { to: "/all-reports/ipd/transfusion-metrics", label: "Blood Transfusion Utilization" },
      { to: "/all-reports/ipd/medication-audit", label: "Medication Administration & Alerts Log" },
      { to: "/all-reports/ipd/revenue", label: "IPD Financial Ledger & Payer Breakdown" },
    ],
  },
  {
    id: "opd",
    label: "OPD Report",
    icon: FileSpreadsheet,
    items: [
      { to: "/all-reports/operational/outpatient", label: "Outpatient Report" },
      { to: "/all-reports/opd/funnel", label: "Patient Funnel Analysis" },
      { to: "/all-reports/opd/revenue-yield", label: "Revenue Departmental Yield" },
      { to: "/all-reports/opd/payer-mix", label: "Payer Mix Analytics" },
    ],
  },
  {
    id: "ot",
    label: "OT Report",
    icon: Scissors,
    items: [
      { to: "/all-reports/ot/dashboard", label: "Enterprise OT Dashboard" },
      { to: "/all-reports/ot/cancellations", label: "OT Cancellations Audit" },
      { to: "/all-reports/ot/safety", label: "Pre-Op Safety & Equipment Audit" },
      { to: "/all-reports/ot/tat", label: "Surgery Turnaround & Duration Analysis" },
      { to: "/all-reports/ot/ledger", label: "Master OT Case Ledger" },
    ],
  },
];

// Mapping roles directly to their allowed report category tabs
export const ROLE_REPORT_ACCESS: Record<string, string[]> = {
  // Super Admin & System Admins (Full suite access)
  super_admin: ["*"],
  hospital_admin: ["*"],
  Admin: ["*"],
  admin: ["*"],
  executive_director: ["*"],
  chief_operating_officer: ["*"],
  medical_director: ["*"],

  // Executive Leadership
  // medical_director: ["patient", "appointment", "operational", "anc", "billing", "lab", "pharmacy", "radiology", "ipd", "opd", "ot"],
  // chief_operating_officer: ["patient", "appointment", "operational", "anc", "billing", "lab", "pharmacy", "radiology", "ipd", "opd", "ot"],

  // Doctors & Consultants
  doctor: ["patient", "appointment", "ipd", "opd", "ot"],
  Doctor: ["patient", "appointment", "ipd", "opd", "ot"],
  consultant: ["patient", "appointment", "ipd", "opd", "ot"],

  // Nursing
  nurse: ["opd", "anc", "ipd"],
  Nurse: ["opd", "anc", "ipd"],
  nurse_manager: ["opd", "anc", "ipd", "opd", "ot"],

  // Front Desk & Reception
  front_desk: ["patient", "appointment"],
  receptionist: ["patient", "appointment"],
  customer_service: ["patient", "appointment"],
  customer_service_manager: ["patient", "appointment", "opd"],

  // Pharmacy
  pharmacist: ["pharmacy"],
  Pharmacist: ["pharmacy"],

  // Laboratory & Radiology
  lab_scientist: ["lab"],
  "Lab Tech": ["lab"],
  radiologist: ["radiology"],

  // Operating Theatre & Specialists
  operating_theater: ["ot"],
  // anesthesia_technician: ["inventory","ot"],
  anesthesia_technician: ["inventory"],
  cardiovascular_perfusionist: ["ot"],

  // Finance & Accounts
  billing: ["patient", "appointment","billing"],
  accountant: ["patient", "appointment","billing", "inventory"],
  Accountant: ["patient", "appointment","billing", "inventory"],

  // Inventory & Stores
  inventory: ["inventory"],
  "Inventory Manager": ["inventory"],

  // Patients
  patient: ["appointment"],
};

// Touch-aware & Boundary-safe Dropdown Tab
const DropdownTab = ({ tab, location }: { tab: ReportTab; location: ReturnType<typeof useLocation> }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const calculatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownWidth = 260;
      const clampedLeft = Math.max(8, Math.min(rect.left, window.innerWidth - dropdownWidth - 12));
      setCoords({
        top: rect.bottom + 6,
        left: clampedLeft,
      });
    }
  };

  const handleMouseEnter = () => {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    calculatePosition();
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 120);
  };

  const toggleDropdown = () => {
    calculatePosition();
    setIsOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  const isActiveTab = tab.items.some((item) => location.pathname === item.to);
  const Icon = tab.icon;

  return (
    <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleDropdown}
        className={`
          flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold transition-all whitespace-nowrap shrink-0 
          ${isActiveTab
            ? "reports-tab-active bg-white text-emerald-800 shadow-sm font-bold scale-[1.02]"
            : "text-white hover:text-white hover:bg-white/10"
          }
        `}
      >
        <Icon size={14} className="shrink-0" />
        <span>{tab.label}</span>
        <ChevronDown
          size={12}
          className={`ml-0.5 opacity-70 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="fixed w-64 max-h-[60vh] overflow-y-auto bg-white border border-slate-200 shadow-2xl z-[9999] py-1.5 animate-in fade-in zoom-in-95 duration-150 divide-y divide-slate-50"
            style={{ top: coords.top, left: coords.left }}
          >
            {tab.items.map((item, idx) => {
              const isSubActive = location.pathname === item.to;
              return (
                <NavLink
                  key={idx}
                  to={item.to}
                  onClick={() => setIsOpen(false)}
                  className={`
                    block px-4 py-2.5 text-xs transition-colors
                    ${isSubActive
                      ? "text-emerald-700 font-bold bg-emerald-50/60"
                      : "text-slate-700 hover:bg-slate-50 font-medium"
                    }
                  `}
                >
                  {item.label}
                </NavLink>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
};

const AllReportsLayout: React.FC = () => {
  const { user, roles, hasAnyPermission } = useAuth();
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  // Resolve user role name dynamically
  const firstRole: any = roles && (roles as any[]).length > 0 ? (roles as any[])[0] : null;
  const roleName = typeof firstRole === "string" ? firstRole : firstRole?.name || "";
  const currentRole = roleName || user?.role || "";

  // Dynamically filter tabs based on authenticated user's role
  const visibleTabs = useMemo(() => {
    const isSuperAdmin =
      currentRole?.toLowerCase() === "super_admin" ||
      currentRole?.toLowerCase() === "hospital_admin" ||
      hasAnyPermission(["*"]);

    if (isSuperAdmin) return REPORT_TABS;

    const allowed =
      ROLE_REPORT_ACCESS[currentRole] ||
      ROLE_REPORT_ACCESS[currentRole.toLowerCase()] ||
      [];

    if (allowed.includes("*")) return REPORT_TABS;

    return REPORT_TABS.filter((tab) => allowed.includes(tab.id));
  }, [currentRole, hasAnyPermission]);

  useEffect(() => {
    setPortalRoot(document.getElementById("module-tabs-portal"));
  }, []);

  const checkScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 4);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
    }
  }, []);

  useEffect(() => {
    checkScroll();
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);

    return () => {
      container.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [portalRoot, checkScroll, visibleTabs]);

  useEffect(() => {
    if (scrollContainerRef.current) {
      const activeEl = scrollContainerRef.current.querySelector<HTMLElement>(".reports-tab-active");
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    }
    checkScroll();
  }, [location.pathname, checkScroll]);

  const handleScroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollStep = 220;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollStep : scrollStep,
        behavior: "smooth",
      });
    }
  };

  const renderNavTrack = () => (
    <div className="flex items-center max-w-full min-w-0">
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => handleScroll("left")}
          className="py-3 px-1.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white/90 border border-white/15 backdrop-blur-md shadow-sm transition-all shrink-0"
          title="Scroll tabs left"
        >
          <ChevronLeft size={14} />
        </button>
      )}

      <nav
        ref={scrollContainerRef}
        aria-label="Reports Categories"
        className="bg-white/10 backdrop-blur-md border border-white/15 p-1 flex items-center gap-1 overflow-x-auto scrollbar-hide shadow-inner scroll-smooth min-w-0"
      >
        {visibleTabs.length > 0 ? (
          visibleTabs.map((tab) => (
            <DropdownTab key={tab.id} tab={tab} location={location} />
          ))
        ) : (
          <span className="text-xs text-white/60 px-3 py-1 font-medium">
            No report categories assigned to this role.
          </span>
        )}
      </nav>

      {canScrollRight && (
        <button
          type="button"
          onClick={() => handleScroll("right")}
          className="py-3 px-1.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white/90 border border-white/15 backdrop-blur-md shadow-sm transition-all shrink-0"
          title="Scroll tabs right"
        >
          <ChevronRight size={14} />
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12 md:pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2.5 sm:gap-3">
            <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-md shrink-0">
              <FileSpreadsheet size={22} />
            </div>
            <span>Module Reports Hub</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Exportable tabular reports for all hospital modules.
          </p>
        </div>
      </div>

      {portalRoot ? (
        createPortal(renderNavTrack(), portalRoot)
      ) : (
        <div className="w-full bg-slate-900/80 backdrop-blur p-1.5 rounded-xl border border-slate-700/40 shadow-sm">
          {renderNavTrack()}
        </div>
      )}

      <main className="min-h-[60vh] px-2 md:px-4">
        <Outlet />
      </main>
    </div>
  );
};

export default AllReportsLayout;



































// import React, { useState, useEffect, useRef, useCallback } from "react";
// import { createPortal } from "react-dom";
// import { NavLink, Outlet, useLocation } from "react-router-dom";
// import {
//   FileSpreadsheet,
//   Users,
//   Calendar,
//   Package,
//   ChevronDown,
//   Baby,
//   Receipt,
//   FlaskConical,
//   Pill,
//   Radiation,
//   BedDouble,
//   Scissors,
//   ChevronLeft,
//   ChevronRight,
// } from "lucide-react";

// interface ReportSubItem {
//   to: string;
//   label: string;
// }

// interface ReportTab {
//   label: string;
//   icon: React.ComponentType<{ size?: number; className?: string }>;
//   items: ReportSubItem[];
// }

// const REPORT_TABS: ReportTab[] = [
//   {
//     label: "Patient Report",
//     icon: Users,
//     items: [
//       { to: "/all-reports/patient", label: "Patient registration report" },
//       { to: "/all-reports/patient/overview", label: "Executive PAS Overview" },
//       { to: "/all-reports/patient/master", label: "Master Patient Report" },
//       { to: "/all-reports/patient/payer-market-share", label: "Payer Market Share" },
//       { to: "/all-reports/patient/age-demographics", label: "Age Demographics" },
//       { to: "/all-reports/patient/staff-productivity", label: "Registration Staff Productivity Audit" },
//       { to: "/all-reports/patient/geographic-distribution", label: "Geographic Distribution" },
//       { to: "/all-reports/patient/encounter-frequency", label: "Patient Visit & Encounter Frequency" },
//       { to: "/all-reports/patient/emergency-contacts", label: "Emergency Contacts Safety Audit" },
//       { to: "/all-reports/patient/deceased-inactive", label: "Deceased & Inactive Account Ledger" },
//     ],
//   },
//   {
//     label: "Appointment Report",
//     icon: Calendar,
//     items: [
//       { to: "/all-reports/appointment", label: "Patient Appointment Report" },
//       { to: "/all-reports/appointment/dashboard", label: "Appointments Dashboard" },
//       { to: "/all-reports/appointment/ledger", label: "Master Appointment Ledger" },
//       { to: "/all-reports/appointment/cancellations", label: "Cancellations Audit" },
//       { to: "/all-reports/appointment/staff-productivity", label: "Front Desk Staff Productivity" },
//     ],
//   },
//   {
//     label: "Inventory Report",
//     icon: Package,
//     items: [
//       { to: "/all-reports/inventory", label: "Inventory transactions report" },
//       { to: "/all-reports/inventory/stock", label: "Inventory stock report" },
//       { to: "/all-reports/inventory/movement", label: "Inventory stock movement report" },
//       { to: "/all-reports/inventory/valuation", label: "Inventory financial valuation report" },
//       { to: "/all-reports/inventory/summary", label: "Inventory summary report" },
//       { to: "/all-reports/inventory/classification", label: "Inventory classification report" },
//       { to: "/all-reports/inventory/top-consumed", label: "Top consumed items report" },
//       { to: "/all-reports/inventory/approved-consumption", label: "Approved items consumption report" },
//       { to: "/all-reports/inventory/vendor-supply", label: "Vendor supply report" },
//     ],
//   },
//   {
//     label: "Operational Report",
//     icon: FileSpreadsheet,
//     items: [
//       { to: "/all-reports/operational/outpatient", label: "Outpatient Report" },
//       { to: "/all-reports/operational/inpatient", label: "Inpatient Report" },
//       { to: "/all-reports/operational/emergency", label: "Emergency Patient Report" },
//     ],
//   },
//   {
//     label: "ANC Report",
//     icon: Baby,
//     items: [
//       { to: "/all-reports/operational/anc", label: "ANC Report" },
//     ],
//   },
//   {
//     label: "Billing Report",
//     icon: Receipt,
//     items: [
//       { to: "/all-reports/financial/billing", label: "Billing Report" },
//       { to: "/all-reports/financial/deposit-utilization", label: "Deposit Utilization Report" },
//       { to: "/all-reports/financial/cash-collection", label: "Cash Collection Report" },
//       { to: "/all-reports/financial/advance-collection", label: "Advance Collection Report" },
//       { to: "/all-reports/financial/unbilled-orders", label: "Unbilled Orders Report" },
//       { to: "/all-reports/financial/departmental-revenue", label: "Departmental Revenue Report" },
//       { to: "/all-reports/financial/discount", label: "Discount Report" },
//       { to: "/all-reports/financial/physician-productivity", label: "Physician Productivity Report" },
//       { to: "/all-reports/financial/cancellation-audit", label: "Cancellation & Reversal Audit" },
//     ],
//   },
//   {
//     label: "Lab Report",
//     icon: FlaskConical,
//     items: [
//       { to: "/all-reports/laboratory", label: "Laboratory Report" },
//       { to: "/all-reports/laboratory/detailed", label: "Lab Detailed Report" },
//       { to: "/all-reports/laboratory/tat", label: "Lab TAT Report" },
//       { to: "/all-reports/laboratory/abnormal-findings", label: "Lab Abnormal Findings Report" },
//       { to: "/all-reports/laboratory/referrals", label: "Lab Detailed Referrals Report" },
//       { to: "/all-reports/laboratory/productivity", label: "Lab Personnel Productivity Report" },
//     ],
//   },
//   {
//     label: "Pharmacy Report",
//     icon: Pill,
//     items: [
//       { to: "/all-reports/pharmacy", label: "Pharmacy Report" },
//       { to: "/all-reports/pharmacy/tat", label: "Pharmacy TAT Report" },
//       { to: "/all-reports/pharmacy/cancellations", label: "Pharmacy Cancellations Report" },
//       { to: "/all-reports/pharmacy/productivity", label: "Pharmacist Productivity Report" },
//       { to: "/all-reports/pharmacy/transactions", label: "Pharmacy Transaction Book" },
//     ],
//   },
//   {
//     label: "Radiology Report",
//     icon: Radiation,
//     items: [
//       { to: "/all-reports/radiology", label: "Radiology Report" },
//       { to: "/all-reports/radiology/productivity", label: "Radiologist Productivity Report" },
//       { to: "/all-reports/radiology/cancellations", label: "Radiology Cancellation Report" },
//       { to: "/all-reports/radiology/referrals", label: "Radiology Detailed Referrals Report" },
//     ],
//   },
//   {
//     label: "IPD Report",
//     icon: BedDouble,
//     items: [
//       { to: "/all-reports/ipd/bed-utilization", label: "Bed Utilization & Ward Occupancy" },
//       { to: "/all-reports/ipd/discharge-tat", label: "Discharge Turnaround Time" },
//       { to: "/all-reports/ipd/transfusion-metrics", label: "Blood Transfusion Utilization" },
//       { to: "/all-reports/ipd/medication-audit", label: "Medication Administration & Alerts Log" },
//       { to: "/all-reports/ipd/revenue", label: "IPD Financial Ledger & Payer Breakdown" },
//     ],
//   },
//   {
//     label: "OPD Report",
//     icon: FileSpreadsheet,
//     items: [
//       { to: "/all-reports/operational/outpatient", label: "Outpatient Report" },
//       { to: "/all-reports/opd/funnel", label: "Patient Funnel Analysis" },
//       { to: "/all-reports/opd/revenue-yield", label: "Revenue Departmental Yield" },
//       { to: "/all-reports/opd/payer-mix", label: "Payer Mix Analytics" },
//     ],
//   },
//   {
//     label: "OT Report",
//     icon: Scissors,
//     items: [
//       { to: "/all-reports/ot/dashboard", label: "Enterprise OT Dashboard" },
//       { to: "/all-reports/ot/cancellations", label: "OT Cancellations Audit" },
//       { to: "/all-reports/ot/safety", label: "Pre-Op Safety & Equipment Audit" },
//       { to: "/all-reports/ot/tat", label: "Surgery Turnaround & Duration Analysis" },
//       { to: "/all-reports/ot/ledger", label: "Master OT Case Ledger" },
//     ],
//   },
// ];

// // Touch-aware & Boundary-safe Dropdown Tab
// const DropdownTab = ({ tab, location }: { tab: ReportTab; location: ReturnType<typeof useLocation> }) => {
//   const [isOpen, setIsOpen] = useState(false);
//   const [coords, setCoords] = useState({ top: 0, left: 0 });
//   const buttonRef = useRef<HTMLButtonElement>(null);
//   const dropdownRef = useRef<HTMLDivElement>(null);
//   const timeoutRef = useRef<NodeJS.Timeout | null>(null);

//   const calculatePosition = () => {
//     if (buttonRef.current) {
//       const rect = buttonRef.current.getBoundingClientRect();
//       const dropdownWidth = 260;
//       // Clamp left coordinate so dropdown does not extend beyond mobile viewport edges
//       const clampedLeft = Math.max(8, Math.min(rect.left, window.innerWidth - dropdownWidth - 12));
//       setCoords({
//         top: rect.bottom + 6,
//         left: clampedLeft,
//       });
//     }
//   };

//   const handleMouseEnter = () => {
//     if (window.matchMedia("(pointer: coarse)").matches) return; // Touchscreens rely on taps
//     if (timeoutRef.current) clearTimeout(timeoutRef.current);
//     calculatePosition();
//     setIsOpen(true);
//   };

//   const handleMouseLeave = () => {
//     if (window.matchMedia("(pointer: coarse)").matches) return;
//     timeoutRef.current = setTimeout(() => {
//       setIsOpen(false);
//     }, 120);
//   };

//   const toggleDropdown = () => {
//     calculatePosition();
//     setIsOpen((prev) => !prev);
//   };

//   // Close when tapping outside
//   useEffect(() => {
//     if (!isOpen) return;
//     const handleOutsideClick = (e: MouseEvent) => {
//       if (
//         buttonRef.current &&
//         !buttonRef.current.contains(e.target as Node) &&
//         dropdownRef.current &&
//         !dropdownRef.current.contains(e.target as Node)
//       ) {
//         setIsOpen(false);
//       }
//     };
//     document.addEventListener("mousedown", handleOutsideClick);
//     return () => document.removeEventListener("mousedown", handleOutsideClick);
//   }, [isOpen]);

//   const isActiveTab = tab.items.some((item) => location.pathname === item.to);
//   const Icon = tab.icon;

//   return (
//     <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} className="relative shrink-0">
//       <button
//         ref={buttonRef}
//         type="button"
//         onClick={toggleDropdown}
//         className={`
//           flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold transition-all whitespace-nowrap shrink-0 
//           ${isActiveTab
//             ? "reports-tab-active bg-white text-emerald-800 shadow-sm font-bold scale-[1.02]"
//             : "text-white hover:text-white hover:bg-white/10"
//           }
//         `}
//       >
//         <Icon size={14} className="shrink-0" />
//         <span>{tab.label}</span>
//         <ChevronDown
//           size={12}
//           className={`ml-0.5 opacity-70 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
//         />
//       </button>

//       {isOpen &&
//         createPortal(
//           <div
//             ref={dropdownRef}
//             onMouseEnter={handleMouseEnter}
//             onMouseLeave={handleMouseLeave}
//             className="fixed w-64 max-h-[60vh] overflow-y-auto bg-white border border-slate-200 shadow-2xl z-[9999] py-1.5 animate-in fade-in zoom-in-95 duration-150 divide-y divide-slate-50"
//             style={{ top: coords.top, left: coords.left }}
//           >
//             {tab.items.map((item, idx) => {
//               const isSubActive = location.pathname === item.to;
//               return (
//                 <NavLink
//                   key={idx}
//                   to={item.to}
//                   onClick={() => setIsOpen(false)}
//                   className={`
//                     block px-4 py-2.5 text-xs transition-colors
//                     ${isSubActive
//                       ? "text-emerald-700 font-bold bg-emerald-50/60"
//                       : "text-slate-700 hover:bg-slate-50 font-medium"
//                     }
//                   `}
//                 >
//                   {item.label}
//                 </NavLink>
//               );
//             })}
//           </div>,
//           document.body
//         )}
//     </div>
//   );
// };

// const AllReportsLayout: React.FC = () => {
//   const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
//   const [canScrollLeft, setCanScrollLeft] = useState(false);
//   const [canScrollRight, setCanScrollRight] = useState(false);

//   const scrollContainerRef = useRef<HTMLDivElement>(null);
//   const location = useLocation();

//   useEffect(() => {
//     setPortalRoot(document.getElementById("module-tabs-portal"));
//   }, []);

//   // Monitor track boundary overflow
//   const checkScroll = useCallback(() => {
//     if (scrollContainerRef.current) {
//       const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
//       setCanScrollLeft(scrollLeft > 4);
//       setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
//     }
//   }, []);

//   // Re-verify bounds on scroll and window resize
//   useEffect(() => {
//     checkScroll();
//     const container = scrollContainerRef.current;
//     if (!container) return;

//     container.addEventListener("scroll", checkScroll, { passive: true });
//     window.addEventListener("resize", checkScroll);

//     return () => {
//       container.removeEventListener("scroll", checkScroll);
//       window.removeEventListener("resize", checkScroll);
//     };
//   }, [portalRoot, checkScroll]);

//   // Auto-center the active category tab when the route changes
//   useEffect(() => {
//     if (scrollContainerRef.current) {
//       const activeEl = scrollContainerRef.current.querySelector<HTMLElement>(".reports-tab-active");
//       if (activeEl) {
//         activeEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
//       }
//     }
//     checkScroll();
//   }, [location.pathname, checkScroll]);

//   const handleScroll = (direction: "left" | "right") => {
//     if (scrollContainerRef.current) {
//       const scrollStep = 220;
//       scrollContainerRef.current.scrollBy({
//         left: direction === "left" ? -scrollStep : scrollStep,
//         behavior: "smooth",
//       });
//     }
//   };

//   const renderNavTrack = () => (
//     <div className="flex items-center max-w-full min-w-0">
//       {/* Scroll Left Button */}
//       {canScrollLeft && (
//         <button
//           type="button"
//           onClick={() => handleScroll("left")}
//           className="py-3 px-1.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white/90 border border-white/15 backdrop-blur-md shadow-sm transition-all shrink-0"
//           title="Scroll tabs left"
//         >
//           <ChevronLeft size={14} />
//         </button>
//       )}

//       {/* Scrollable Tabs Track */}
//       <nav
//         ref={scrollContainerRef}
//         aria-label="Reports Categories"
//         className="bg-white/10 backdrop-blur-md border border-white/15 p-1 flex items-center gap-1 overflow-x-auto scrollbar-hide shadow-inner scroll-smooth min-w-0"
//       >
//         {REPORT_TABS.map((tab) => (
//           <DropdownTab key={tab.label} tab={tab} location={location} />
//         ))}
//       </nav>

//       {/* Scroll Right Button */}
//       {canScrollRight && (
//         <button
//           type="button"
//           onClick={() => handleScroll("right")}
//           className="py-3 px-1.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white/90 border border-white/15 backdrop-blur-md shadow-sm transition-all shrink-0"
//           title="Scroll tabs right"
//         >
//           <ChevronRight size={14} />
//         </button>
//       )}
//     </div>
//   );

//   return (
//     <div className="space-y-6 animate-in fade-in duration-300 pb-12 md:pb-20">
//       {/* Header section */}
//       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
//         <div>
//           <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2.5 sm:gap-3">
//             <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-md shrink-0">
//               <FileSpreadsheet size={22} />
//             </div>
//             <span>Module Reports Hub</span>
//           </h1>
//           <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
//             Exportable tabular reports for all hospital modules.
//           </p>
//         </div>
//       </div>

//       {/* Sub-Navigation: Mounts to portal header with inline glass fallback */}
//       {portalRoot ? (
//         createPortal(renderNavTrack(), portalRoot)
//       ) : (
//         <div className="w-full bg-slate-900/80 backdrop-blur p-1.5 rounded-xl border border-slate-700/40 shadow-sm">
//           {renderNavTrack()}
//         </div>
//       )}

//       {/* Main Content Area */}
//       <main className="min-h-[60vh] px-2 md:px-4">
//         <Outlet />
//       </main>
//     </div>
//   );
// };

// export default AllReportsLayout;



// import React, { useState, useEffect, useRef } from "react";
// import { createPortal } from "react-dom";
// import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
// import {
//   FileSpreadsheet,
//   Users,
//   Calendar,
//   Package,
//   ChevronDown,
//   Baby,
//   Receipt,
//   FlaskConical,
//   Pill,
//   Radiation,
//   BedDouble,
//   Scissors,
// } from "lucide-react";

// // Custom component to handle dropdown without being clipped by parent overflow
// const DropdownTab = ({ tab, location }: { tab: any; location: any }) => {
//   const [isOpen, setIsOpen] = useState(false);
//   const [coords, setCoords] = useState({ top: 0, left: 0 });
//   const buttonRef = useRef<HTMLButtonElement>(null);
//   const timeoutRef = useRef<NodeJS.Timeout | null>(null);

//   const handleMouseEnter = () => {
//     if (timeoutRef.current) clearTimeout(timeoutRef.current);
//     if (buttonRef.current) {
//       const rect = buttonRef.current.getBoundingClientRect();
//       setCoords({
//         top: rect.bottom,
//         left: rect.left,
//       });
//       setIsOpen(true);
//     }
//   };

//   const handleMouseLeave = () => {
//     timeoutRef.current = setTimeout(() => {
//       setIsOpen(false);
//     }, 100); // slight delay to allow cursor moving to dropdown
//   };

//   const isActiveTab = tab.items.some((item: any) => location.pathname === item.to);

//   return (
//     <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} className="relative">
//       <button
//         ref={buttonRef}
//         className={`
//           flex items-center gap-2 px-6 py-2.5 rounded-[18px] text-sm font-bold transition-all whitespace-nowrap
//           ${
//             isActiveTab
//               ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200"
//               : "text-emerald-500 hover:text-emerald-700 hover:bg-white/50"
//           }
//         `}
//       >
//         <tab.icon size={16} />
//         {tab.label}
//         <ChevronDown size={14} className={`ml-1 opacity-70 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
//       </button>

//       {isOpen &&
//         createPortal(
//           <div
//             onMouseEnter={handleMouseEnter}
//             onMouseLeave={handleMouseLeave}
//             className="fixed w-64 bg-white border border-slate-100 rounded-2xl shadow-xl z-[9999] py-2 animate-in fade-in zoom-in-95 duration-150"
//             style={{ top: coords.top + 8, left: coords.left }}
//           >
//             {tab.items.map((item: any, idx: number) => (
//               <NavLink
//                 key={idx}
//                 to={item.to}
//                 onClick={() => setIsOpen(false)}
//                 className={({ isActive }) => `
//                   block px-4 py-3 text-sm transition-colors
//                   ${isActive ? "text-emerald-600 font-bold bg-emerald-50/50" : "text-slate-700 hover:bg-slate-50 font-medium"}
//                 `}
//               >
//                 {item.label}
//               </NavLink>
//             ))}
//           </div>,
//           document.body
//         )}
//     </div>
//   );
// };

// const AllReportsLayout: React.FC = () => {
//   const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
//   const location = useLocation();
//   const navigate = useNavigate();
//   useEffect(() => {
//     setPortalRoot(document.getElementById("module-tabs-portal"));
//   }, []);

//   const tabs = [
//     {
//       label: "Patient Report",
//       icon: Users,
//       items: [
//         { to: "/all-reports/patient", label: "Patient registration report" },
//         { to: "/all-reports/patient/overview", label: "Executive PAS Overview" },
//         { to: "/all-reports/patient/master", label: "Master Patient Report" },
//         { to: "/all-reports/patient/payer-market-share", label: "Payer Market Share" },
//         { to: "/all-reports/patient/age-demographics", label: "Age Demographics" },
//         { to: "/all-reports/patient/staff-productivity", label: "Registration Staff Productivity Audit" },
//         { to: "/all-reports/patient/geographic-distribution", label: "Geographic Distribution" },
//         { to: "/all-reports/patient/encounter-frequency", label: "Patient Visit & Encounter Frequency" },
//         { to: "/all-reports/patient/emergency-contacts", label: "Emergency Contacts Safety Audit" },
//         { to: "/all-reports/patient/deceased-inactive", label: "Deceased & Inactive Account Ledger" },
//       ]
//     },
//     {
//       label: "Appointment Report",
//       icon: Calendar,
//       items: [
//         { to: "/all-reports/appointment", label: "Patient Appointment Report" },
//         { to: "/all-reports/appointment/dashboard", label: "Appointments Dashboard" },
//         { to: "/all-reports/appointment/ledger", label: "Master Appointment Ledger" },
//         { to: "/all-reports/appointment/cancellations", label: "Cancellations Audit" },
//         { to: "/all-reports/appointment/staff-productivity", label: "Front Desk Staff Productivity" },
//       ]
//     },
//     {
//       label: "Inventory Report",
//       icon: Package,
//       items: [
//         { to: "/all-reports/inventory", label: "Inventory transactions report" },
//         { to: "/all-reports/inventory/stock", label: "Inventory stock report" },
//         { to: "/all-reports/inventory/movement", label: "Inventory stock movement report" },
//         { to: "/all-reports/inventory/valuation", label: "Inventory financial valuation report" },
//         { to: "/all-reports/inventory/summary", label: "Inventory summary report" },
//         { to: "/all-reports/inventory/classification", label: "Inventory classification report" },
//         { to: "/all-reports/inventory/top-consumed", label: "Top consumed items report" },
//         { to: "/all-reports/inventory/approved-consumption", label: "Approved items consumption report" },
//         { to: "/all-reports/inventory/vendor-supply", label: "Vendor supply report" },
//       ]
//     },
//     {
//       label: "Operational Report",
//       icon: FileSpreadsheet,
//       items: [
//         { to: "/all-reports/operational/outpatient", label: "Outpatient Report" },
//         { to: "/all-reports/operational/inpatient", label: "Inpatient Report" },
//         { to: "/all-reports/operational/emergency", label: "Emergency Patient Report" },
//       ]
//     },
//     {
//       label: "ANC Report",
//       icon: Baby,
//       items: [
//         { to: "/all-reports/operational/anc", label: "ANC Report" },
//       ]
//     },
//     {
//       label: "Billing Report",
//       icon: Receipt,
//       items: [
//         { to: "/all-reports/financial/billing", label: "Billing Report" },
//         { to: "/all-reports/financial/deposit-utilization", label: "Deposit Utilization Report" },
//         { to: "/all-reports/financial/cash-collection", label: "Cash Collection Report" },
//         { to: "/all-reports/financial/advance-collection", label: "Advance Collection Report" },
//         { to: "/all-reports/financial/unbilled-orders", label: "Unbilled Orders Report" },
//         { to: "/all-reports/financial/departmental-revenue", label: "Departmental Revenue Report" },
//         { to: "/all-reports/financial/discount", label: "Discount Report" },
//         { to: "/all-reports/financial/physician-productivity", label: "Physician Productivity Report" },
//         { to: "/all-reports/financial/cancellation-audit", label: "Cancellation & Reversal Audit" },
//       ]
//     },
//     {
//       label: "Lab Report",
//       icon: FlaskConical,
//       items: [
//         { to: "/all-reports/laboratory", label: "Laboratory Report" },
//         { to: "/all-reports/laboratory/detailed", label: "Lab Detailed Report" },
//         { to: "/all-reports/laboratory/tat", label: "Lab TAT Report" },
//         { to: "/all-reports/laboratory/abnormal-findings", label: "Lab Abnormal Findings Report" },
//         { to: "/all-reports/laboratory/referrals", label: "Lab Detailed Referrals Report" },
//         { to: "/all-reports/laboratory/productivity", label: "Lab Personnel Productivity Report" },
//       ]
//     },
//     {
//       label: "Pharmacy Report",
//       icon: Pill,
//       items: [
//         { to: "/all-reports/pharmacy", label: "Pharmacy Report" },
//         { to: "/all-reports/pharmacy/tat", label: "Pharmacy TAT Report" },
//         { to: "/all-reports/pharmacy/cancellations", label: "Pharmacy Cancellations Report" },
//         { to: "/all-reports/pharmacy/productivity", label: "Pharmacist Productivity Report" },
//         { to: "/all-reports/pharmacy/transactions", label: "Pharmacy Transaction Book" },
//       ]
//     },
//     {
//       label: "Radiology Report",
//       icon: Radiation,
//       items: [
//         { to: "/all-reports/radiology", label: "Radiology Report" },
//         { to: "/all-reports/radiology/productivity", label: "Radiologist Productivity Report" },
//         { to: "/all-reports/radiology/cancellations", label: "Radiology Cancellation Report" },
//         { to: "/all-reports/radiology/referrals", label: "Radiology Detailed Referrals Report" },
//       ]
//     },
//     {
//       label: "IPD Report",
//       icon: BedDouble,
//       items: [
//         { to: "/all-reports/ipd/bed-utilization", label: "Bed Utilization & Ward Occupancy" },
//         { to: "/all-reports/ipd/discharge-tat", label: "Discharge Turnaround Time" },
//         { to: "/all-reports/ipd/transfusion-metrics", label: "Blood Transfusion Utilization" },
//         { to: "/all-reports/ipd/medication-audit", label: "Medication Administration & Alerts Log" },
//         { to: "/all-reports/ipd/revenue", label: "IPD Financial Ledger & Payer Breakdown" },
//       ]
//     },
//     {
//       label: "OPD Report",
//       icon: FileSpreadsheet,
//       items: [
//         { to: "/all-reports/operational/outpatient", label: "Outpatient Report" },
//         { to: "/all-reports/opd/funnel", label: "Patient Funnel Analysis" },
//         { to: "/all-reports/opd/revenue-yield", label: "Revenue Departmental Yield" },
//         { to: "/all-reports/opd/payer-mix", label: "Payer Mix Analytics" },
//       ]
//     },
//     {
//       label: "OT Report",
//       icon: Scissors,
//       items: [
//         { to: "/all-reports/ot/dashboard", label: "Enterprise OT Dashboard" },
//         { to: "/all-reports/ot/cancellations", label: "OT Cancellations Audit" },
//         { to: "/all-reports/ot/safety", label: "Pre-Op Safety & Equipment Audit" },
//         { to: "/all-reports/ot/tat", label: "Surgery Turnaround & Duration Analysis" },
//         { to: "/all-reports/ot/ledger", label: "Master OT Case Ledger" },
//       ]
//     },
//   ];

//   return (
//     <div className="space-y-8 animate-in fade-in duration-500 pb-20">
//       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
//         <div>
//           <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
//             <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-100">
//               <FileSpreadsheet size={24} />
//             </div>
//             Module Reports Hub
//           </h1>
//           <p className="text-slate-500 font-medium">
//             Exportable tabular reports for all hospital modules.
//           </p>
//         </div>
//       </div>

//       {/* Emerald Top Navigation Bar */}
//       {portalRoot && createPortal(
//         <div className="flex items-center gap-1 p-1 bg-emerald-50 border border-emerald-100 rounded-[24px] w-max shadow-sm overflow-x-auto no-scrollbar relative z-50">
//           {tabs.map((tab) => (
//             <DropdownTab key={tab.label} tab={tab} location={location} />
//           ))}
//         </div>,
//         portalRoot
//       )}

//       <div className="min-h-[60vh] relative z-0">
//         <Outlet />
//       </div>
//     </div>
//   );
// };

// export default AllReportsLayout;




// import React, { useState, useEffect, useRef } from "react";
// import { createPortal } from "react-dom";
// import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
// import {
//   FileSpreadsheet,
//   Users,
//   Calendar,
//   Package,
//   ChevronDown,
//   Baby,
//   Receipt,
//   FlaskConical,
//   Pill,
//   Radiation,
//   BedDouble,
// } from "lucide-react";

// // Custom component to handle dropdown without being clipped by parent overflow
// const DropdownTab = ({ tab, location }: { tab: any; location: any }) => {
//   const [isOpen, setIsOpen] = useState(false);
//   const [coords, setCoords] = useState({ top: 0, left: 0 });
//   const buttonRef = useRef<HTMLButtonElement>(null);
//   const timeoutRef = useRef<NodeJS.Timeout | null>(null);

//   const handleMouseEnter = () => {
//     if (timeoutRef.current) clearTimeout(timeoutRef.current);
//     if (buttonRef.current) {
//       const rect = buttonRef.current.getBoundingClientRect();
//       setCoords({
//         top: rect.bottom,
//         left: rect.left,
//       });
//       setIsOpen(true);
//     }
//   };

//   const handleMouseLeave = () => {
//     timeoutRef.current = setTimeout(() => {
//       setIsOpen(false);
//     }, 100); // slight delay to allow cursor moving to dropdown
//   };

//   const isActiveTab = tab.items.some((item: any) => location.pathname === item.to);

//   return (
//     <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} className="relative">
//       <button
//         ref={buttonRef}
//         className={`
//           flex items-center gap-2 px-6 py-2.5 rounded-[18px] text-sm font-bold transition-all whitespace-nowrap
//           ${
//             isActiveTab
//               ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200"
//               : "text-emerald-500 hover:text-emerald-700 hover:bg-white/50"
//           }
//         `}
//       >
//         <tab.icon size={16} />
//         {tab.label}
//         <ChevronDown size={14} className={`ml-1 opacity-70 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
//       </button>

//       {isOpen &&
//         createPortal(
//           <div
//             onMouseEnter={handleMouseEnter}
//             onMouseLeave={handleMouseLeave}
//             className="fixed w-64 bg-white border border-slate-100 rounded-2xl shadow-xl z-[9999] py-2 animate-in fade-in zoom-in-95 duration-150"
//             style={{ top: coords.top + 8, left: coords.left }}
//           >
//             {tab.items.map((item: any, idx: number) => (
//               <NavLink
//                 key={idx}
//                 to={item.to}
//                 onClick={() => setIsOpen(false)}
//                 className={({ isActive }) => `
//                   block px-4 py-3 text-sm transition-colors
//                   ${isActive ? "text-emerald-600 font-bold bg-emerald-50/50" : "text-slate-700 hover:bg-slate-50 font-medium"}
//                 `}
//               >
//                 {item.label}
//               </NavLink>
//             ))}
//           </div>,
//           document.body
//         )}
//     </div>
//   );
// };

// const AllReportsLayout: React.FC = () => {
//   const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
//   const location = useLocation();
//   const navigate = useNavigate();

//   useEffect(() => {
//     setPortalRoot(document.getElementById("module-tabs-portal"));
//   }, []);

//   const tabs = [
//     {
//       label: "Patient Report",
//       icon: Users,
//       items: [
//         { to: "/all-reports/patient", label: "Patient registration report" },
//       ]
//     },
//     {
//       label: "Appointment Report",
//       icon: Calendar,
//       items: [
//         { to: "/all-reports/appointment", label: "Patient Appointment Report" },
//         { to: "/all-reports/appointment/dashboard", label: "Appointments Dashboard" },
//         { to: "/all-reports/appointment/ledger", label: "Master Appointment Ledger" },
//         { to: "/all-reports/appointment/cancellations", label: "Cancellations Audit" },
//         { to: "/all-reports/appointment/staff-productivity", label: "Front Desk Staff Productivity" },
//       ]
//     },
//     {
//       label: "Inventory Report",
//       icon: Package,
//       items: [
//         { to: "/all-reports/inventory", label: "Inventory transactions report" },
//         { to: "/all-reports/inventory/stock", label: "Inventory stock report" },
//         { to: "/all-reports/inventory/movement", label: "Inventory stock movement report" },
//         { to: "/all-reports/inventory/valuation", label: "Inventory financial valuation report" },
//         { to: "/all-reports/inventory/summary", label: "Inventory summary report" },
//         { to: "#", label: "Emergency OPD report (Coming Soon)" },
//       ]
//     },
//     {
//       label: "Operational Report",
//       icon: FileSpreadsheet,
//       items: [
//         { to: "/all-reports/operational/outpatient", label: "Outpatient Report" },
//         { to: "/all-reports/operational/inpatient", label: "Inpatient Report" },
//         { to: "/all-reports/operational/emergency", label: "Emergency Patient Report" },
//       ]
//     },
//     {
//       label: "ANC Report",
//       icon: Baby,
//       items: [
//         { to: "/all-reports/operational/anc", label: "ANC Report" },
//       ]
//     },
//     {
//       label: "Billing Report",
//       icon: Receipt,
//       items: [
//         { to: "/all-reports/financial/billing", label: "Billing Report" },
//         { to: "/all-reports/financial/deposit-utilization", label: "Deposit Utilization Report" },
//         { to: "/all-reports/financial/cash-collection", label: "Cash Collection Report" },
//         { to: "/all-reports/financial/advance-collection", label: "Advance Collection Report" },
//         { to: "/all-reports/financial/unbilled-orders", label: "Unbilled Orders Report" },
//         { to: "/all-reports/financial/departmental-revenue", label: "Departmental Revenue Report" },
//         { to: "/all-reports/financial/discount", label: "Discount Report" },
//         { to: "/all-reports/financial/physician-productivity", label: "Physician Productivity Report" },
//         { to: "/all-reports/financial/cancellation-audit", label: "Cancellation & Reversal Audit" },
//       ]
//     },
//     {
//       label: "Lab Report",
//       icon: FlaskConical,
//       items: [
//         { to: "/all-reports/laboratory", label: "Laboratory Report" },
//         { to: "/all-reports/laboratory/detailed", label: "Lab Detailed Report" },
//         { to: "/all-reports/laboratory/tat", label: "Lab TAT Report" },
//         { to: "/all-reports/laboratory/abnormal-findings", label: "Lab Abnormal Findings Report" },
//         { to: "/all-reports/laboratory/referrals", label: "Lab Detailed Referrals Report" },
//         { to: "/all-reports/laboratory/productivity", label: "Lab Personnel Productivity Report" },
//       ]
//     },
//     {
//       label: "Pharmacy Report",
//       icon: Pill,
//       items: [
//         { to: "/all-reports/pharmacy", label: "Pharmacy Report" },
//         { to: "/all-reports/pharmacy/tat", label: "Pharmacy TAT Report" },
//         { to: "/all-reports/pharmacy/cancellations", label: "Pharmacy Cancellations Report" },
//         { to: "/all-reports/pharmacy/productivity", label: "Pharmacist Productivity Report" },
//         { to: "/all-reports/pharmacy/transactions", label: "Pharmacy Transaction Book" },
//       ]
//     },
//     {
//       label: "Radiology Report",
//       icon: Radiation,
//       items: [
//         { to: "/all-reports/radiology", label: "Radiology Report" },
//         { to: "/all-reports/radiology/productivity", label: "Radiologist Productivity Report" },
//         { to: "/all-reports/radiology/cancellations", label: "Radiology Cancellation Report" },
//         { to: "/all-reports/radiology/referrals", label: "Radiology Detailed Referrals Report" },
//       ]
//     },
//     {
//       label: "IPD Report",
//       icon: BedDouble,
//       items: [
//         { to: "/all-reports/ipd/bed-utilization", label: "Bed Utilization & Ward Occupancy" },
//         { to: "/all-reports/ipd/discharge-tat", label: "Discharge Turnaround Time" },
//         { to: "/all-reports/ipd/transfusion-metrics", label: "Blood Transfusion Utilization" },
//         { to: "/all-reports/ipd/medication-audit", label: "Medication Administration & Alerts Log" },
//         { to: "/all-reports/ipd/revenue", label: "IPD Financial Ledger & Payer Breakdown" },
//       ]
//     },
//   ];

//   return (
//     <div className="space-y-8 animate-in fade-in duration-500 pb-20">
//       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
//         <div>
//           <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
//             <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-100">
//               <FileSpreadsheet size={24} />
//             </div>
//             Module Reports Hub
//           </h1>
//           <p className="text-slate-500 font-medium">
//             Exportable tabular reports for all hospital modules.
//           </p>
//         </div>
//       </div>

//       {/* Emerald Top Navigation Bar */}
//       {portalRoot && createPortal(
//         <div className="flex items-center gap-1 p-1 bg-emerald-50 border border-emerald-100 rounded-[24px] w-max shadow-sm relative z-50">
//           {tabs.map((tab) => (
//             <DropdownTab key={tab.label} tab={tab} location={location} />
//           ))}
//         </div>,
//         portalRoot
//       )}

//       <div className="min-h-[60vh] relative z-0">
//         <Outlet />
//       </div>
//     </div>
//   );
// };

// export default AllReportsLayout;
