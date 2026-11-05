import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import BillingCalculator from "./BillingCalculator";
import {
  FilePlus,
  Bed,
  BedDouble,
  History,
  DollarSign,
  Wallet,
  RotateCcw,
  ArrowRightLeft,
  Package,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface NavTabItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  permissions?: string[];
  allowedRoles?: string[];
}

const BILLING_MANAGEMENT_ROLES = [
  "super_admin",
  "hospital_admin",
  "admin",
  "executive_director",
  "chief_operating_officer",
  "accountant",
  "billing",
];

const BILLING_STOCK_ROLES = [
  "super_admin",
  "hospital_admin",
  "admin",
  "executive_director",
  "chief_operating_officer",
  "billing",
  "accountant",
  "inventory",
];

const NAV_TABS: NavTabItem[] = [
  { to: "/billing/opd", label: "OPD Billing", icon: FilePlus, permissions: ["billing_invoice_create", "billing_read", "*"] },
  { to: "/billing/ipd", label: "IPD Billing", icon: Bed, permissions: ["billing_invoice_create", "billing_read", "*"] },
  { to: "/billing/admissions", label: "Admission List", icon: BedDouble, permissions: ["billing_read", "ipd_read", "*"] },
  { to: "/billing/history", label: "Billing History", icon: History, permissions: ["billing_read", "*"] },
  { 
    to: "/billing/pricing", 
    label: "Service Pricing", 
    icon: DollarSign, 
    permissions: ["billing_tariff_manage", "*"],
    allowedRoles: BILLING_MANAGEMENT_ROLES 
  },
  { to: "/billing/advances", label: "Advance Collection", icon: Wallet, permissions: ["billing_advance_collect", "billing_read", "*"] },
  { 
    to: "/billing/refunds", 
    label: "Refund Management", 
    icon: RotateCcw, 
    permissions: ["billing_payment_receive", "billing_tariff_manage", "*"],
    allowedRoles: BILLING_MANAGEMENT_ROLES 
  },
  { 
    to: "/billing/inventory", 
    label: "Stock Movement", 
    icon: ArrowRightLeft, 
    permissions: ["inventory_stock_read", "inventory_item_read", "*"],
    allowedRoles: BILLING_STOCK_ROLES 
  },
  { 
    to: "/billing/stock", 
    label: "Stock Inventory", 
    icon: Package, 
    permissions: ["inventory_stock_read", "inventory_item_read", "*"],
    allowedRoles: BILLING_STOCK_ROLES 
  },
  { 
    to: "/billing/requisitions", 
    label: "Requisitions", 
    icon: ClipboardList, 
    permissions: ["inventory_requisition_read", "inventory_requisition_create", "*"],
    allowedRoles: BILLING_STOCK_ROLES 
  },
];

const BillingLayout: React.FC = () => {
  const { user, roles, hasAnyPermission } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const firstRole: any = roles && (roles as any[]).length > 0 ? (roles as any[])[0] : null;
  const roleName = typeof firstRole === "string" ? firstRole : firstRole?.name || "";
  const currentRole = (roleName || user?.role || "").toLowerCase();

  const isSuperAdmin =
    currentRole === "super_admin" ||
    currentRole === "hospital_admin" ||
    currentRole === "admin" ||
    currentRole === "executive_director" ||
    hasAnyPermission(["*"]);

  const visibleTabs = useMemo(() => {
    if (isSuperAdmin) return NAV_TABS;

    return NAV_TABS.filter((tab) => {
      if (tab.allowedRoles && tab.allowedRoles.length > 0) {
        const roleMatches = tab.allowedRoles.some((r) => r.toLowerCase() === currentRole);
        if (!roleMatches) return false;
      }
      if (tab.permissions && tab.permissions.length > 0) {
        return hasAnyPermission(tab.permissions);
      }
      return true;
    });
  }, [currentRole, isSuperAdmin, hasAnyPermission]);

  useEffect(() => {
    const currentTab = NAV_TABS.find((tab) => location.pathname === tab.to);
    if (currentTab) {
      const isAllowed = visibleTabs.some((tab) => tab.to === currentTab.to);
      if (!isAllowed) {
        navigate(visibleTabs[0]?.to || "/billing/opd", { replace: true });
      }
    }
  }, [location.pathname, visibleTabs, navigate]);

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
      const activeEl = scrollContainerRef.current.querySelector<HTMLElement>(".billing-tab-active");
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    }
    checkScroll();
  }, [location.pathname, checkScroll]);

  const handleScroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollStep = 240;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollStep : scrollStep,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {portalRoot && createPortal(
        <div className="flex items-center max-w-full min-w-0">
          {canScrollLeft && (
            <button
              type="button"
              onClick={() => handleScroll("left")}
              className="py-3 bg-white/10 hover:bg-white/20 active:scale-95 text-white/90 border border-white/15 backdrop-blur-md shadow-sm transition-all shrink-0"
              title="Scroll tabs left"
            >
              <ChevronLeft size={14} />
            </button>
          )}

          <nav 
            ref={scrollContainerRef}
            aria-label="Billing Sub-modules" 
            className="bg-white/10 backdrop-blur-md border border-white/15 p-1 flex items-center gap-1 overflow-x-auto scrollbar-hide shadow-inner scroll-smooth min-w-0"
          >
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  className={({ isActive }) => `
                    flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold transition-all whitespace-nowrap shrink-0
                    ${isActive
                      ? "billing-tab-active bg-white text-brand-primary shadow-sm font-bold scale-[1.02]"
                      : "text-white hover:text-white hover:bg-white/10"
                    }
                  `}
                >
                  <Icon size={14} className="shrink-0" />
                  <span>{tab.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {canScrollRight && (
            <button
              type="button"
              onClick={() => handleScroll("right")}
              className="py-3 bg-white/10 hover:bg-white/20 active:scale-95 text-white/90 border border-white/15 backdrop-blur-md shadow-sm transition-all shrink-0"
              title="Scroll tabs right"
            >
              <ChevronRight size={14} />
            </button>
          )}
        </div>,
        portalRoot
      )}

      <div className="min-h-[60vh] px-2 md:px-4">
        <Outlet />
      </div>

      <BillingCalculator />
    </div>
  );
};

export default BillingLayout;















// import React, { useState, useEffect, useRef, useCallback } from "react";
// import { createPortal } from "react-dom";
// import { NavLink, Outlet, useLocation } from "react-router-dom";
// import BillingCalculator from "./BillingCalculator";
// import {
//   FilePlus,
//   Bed,
//   BedDouble,
//   History,
//   DollarSign,
//   Wallet,
//   RotateCcw,
//   ArrowRightLeft,
//   Package,
//   ClipboardList,
//   ChevronLeft,
//   ChevronRight,
// } from "lucide-react";

// const NAV_TABS = [
//   { to: "/billing/opd", label: "OPD Billing", icon: FilePlus },
//   { to: "/billing/ipd", label: "IPD Billing", icon: Bed },
//   { to: "/billing/admissions", label: "Admission List", icon: BedDouble },
//   { to: "/billing/history", label: "Billing History", icon: History },
//   { to: "/billing/pricing", label: "Service Pricing", icon: DollarSign },
//   { to: "/billing/advances", label: "Advance Collection", icon: Wallet },
//   { to: "/billing/refunds", label: "Refund Management", icon: RotateCcw },
//   { to: "/billing/inventory", label: "Stock Movement", icon: ArrowRightLeft },
//   { to: "/billing/stock", label: "Stock Inventory", icon: Package },
//   { to: "/billing/requisitions", label: "Requisitions", icon: ClipboardList },
// ];

// const BillingLayout: React.FC = () => {
//   const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
//   const [canScrollLeft, setCanScrollLeft] = useState(false);
//   const [canScrollRight, setCanScrollRight] = useState(false);

//   const scrollContainerRef = useRef<HTMLDivElement>(null);
//   const location = useLocation();

//   useEffect(() => {
//     setPortalRoot(document.getElementById("module-tabs-portal"));
//   }, []);

//   // Check scroll boundary status
//   const checkScroll = useCallback(() => {
//     if (scrollContainerRef.current) {
//       const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
//       setCanScrollLeft(scrollLeft > 4);
//       setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
//     }
//   }, []);

//   // Re-check scroll buttons when portal mounts or window resizes
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

//   // Auto-scroll active tab into view when route changes
//   useEffect(() => {
//     if (scrollContainerRef.current) {
//       const activeEl = scrollContainerRef.current.querySelector<HTMLElement>(".billing-tab-active");
//       if (activeEl) {
//         activeEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
//       }
//     }
//     checkScroll();
//   }, [location.pathname, checkScroll]);

//   const handleScroll = (direction: "left" | "right") => {
//     if (scrollContainerRef.current) {
//       const scrollStep = 240;
//       scrollContainerRef.current.scrollBy({
//         left: direction === "left" ? -scrollStep : scrollStep,
//         behavior: "smooth",
//       });
//     }
//   };

//   return (
//     <div className="space-y-6 animate-in fade-in duration-300">
//       {/* Translucent Glassmorphic Sub-Navigation in Header */}
//       {portalRoot && createPortal(
//         <div className="flex items-center max-w-full min-w-0">
//           {/* Scroll Left Button */}
//           {canScrollLeft && (
//             <button
//               type="button"
//               onClick={() => handleScroll("left")}
//               className="py-3 bg-white/10 hover:bg-white/20 active:scale-95 text-white/90 border border-white/15 backdrop-blur-md shadow-sm transition-all shrink-0 "
//               title="Scroll tabs left"
//             >
//               <ChevronLeft size={14} />
//             </button>
//           )}

//           {/* Scrollable Tabs Track */}
//           <nav 
//             ref={scrollContainerRef}
//             aria-label="Billing Sub-modules" 
//             className="bg-white/10 backdrop-blur-md border border-white/15 p-1 flex items-center gap-1 overflow-x-auto scrollbar-hide shadow-inner scroll-smooth min-w-0 "
//           >
//             {NAV_TABS.map((tab) => {
//               const Icon = tab.icon;
//               return (
//                 <NavLink
//                   key={tab.to}
//                   to={tab.to}
//                   className={({ isActive }) => `
//                     flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold transition-all whitespace-nowrap shrink-0
//                     ${isActive
//                       ? "billing-tab-active bg-white text-brand-primary shadow-sm font-bold scale-[1.02]"
//                       : "text-white hover:text-white hover:bg-white/10"
//                     }
//                   `}
//                 >
//                   <Icon size={14} className="shrink-0" />
//                   <span>{tab.label}</span>
//                 </NavLink>
//               );
//             })}
//           </nav>

//           {/* Scroll Right Button */}
//           {canScrollRight && (
//             <button
//               type="button"
//               onClick={() => handleScroll("right")}
//               className="py-3 bg-white/10 hover:bg-white/20 active:scale-95 text-white/90 border border-white/15 backdrop-blur-md shadow-sm transition-all shrink-0 "
//               title="Scroll tabs right"
//             >
//               <ChevronRight size={14} />
//             </button>
//           )}
//         </div>,
//         portalRoot
//       )}

//       {/* Module Content Area */}
//       <div className="min-h-[60vh] px-2 md:px-4">
//         <Outlet />
//       </div>

//       {/* Billing Calculator - floats above all billing pages */}
//       <BillingCalculator />
//     </div>
//   );
// };

// export default BillingLayout;

























// import React, { useState, useEffect, useRef, useCallback } from "react";
// import { createPortal } from "react-dom";
// import { NavLink, Outlet, useLocation } from "react-router-dom";
// import BillingCalculator from "./BillingCalculator";
// import {
//   FilePlus,
//   Bed,
//   BedDouble,
//   History,
//   DollarSign,
//   Wallet,
//   RotateCcw,
//   ArrowRightLeft,
//   Package,
//   ClipboardList,
//   ChevronLeft,
//   ChevronRight,
// } from "lucide-react";

// const NAV_TABS = [
//   { to: "/billing/opd", label: "OPD Billing", icon: FilePlus },
//   { to: "/billing/ipd", label: "IPD Billing", icon: Bed },
//   { to: "/billing/admissions", label: "Admission List", icon: BedDouble },
//   { to: "/billing/history", label: "Billing History", icon: History },
//   { to: "/billing/pricing", label: "Service Pricing", icon: DollarSign },
//   { to: "/billing/advances", label: "Advance Collection", icon: Wallet },
//   { to: "/billing/refunds", label: "Refund Management", icon: RotateCcw },
//   { to: "/billing/inventory", label: "Stock Movement", icon: ArrowRightLeft },
//   { to: "/billing/stock", label: "Stock Inventory", icon: Package },
//   { to: "/billing/requisitions", label: "Requisitions", icon: ClipboardList },
// ];

// const BillingLayout: React.FC = () => {
//   const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
//   const [canScrollLeft, setCanScrollLeft] = useState(false);
//   const [canScrollRight, setCanScrollRight] = useState(false);

//   const scrollContainerRef = useRef<HTMLDivElement>(null);
//   const location = useLocation();

//   useEffect(() => {
//     setPortalRoot(document.getElementById("module-tabs-portal"));
//   }, []);

//   // Check scroll boundary status
//   const checkScroll = useCallback(() => {
//     if (scrollContainerRef.current) {
//       const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
//       setCanScrollLeft(scrollLeft > 4);
//       setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
//     }
//   }, []);

//   // Re-check scroll buttons when portal mounts or window resizes
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

//   // Auto-scroll active tab into view when route changes
//   useEffect(() => {
//     if (scrollContainerRef.current) {
//       const activeEl = scrollContainerRef.current.querySelector<HTMLElement>(".billing-tab-active");
//       if (activeEl) {
//         activeEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
//       }
//     }
//     checkScroll();
//   }, [location.pathname, checkScroll]);

//   const handleScroll = (direction: "left" | "right") => {
//     if (scrollContainerRef.current) {
//       const scrollStep = 240;
//       scrollContainerRef.current.scrollBy({
//         left: direction === "left" ? -scrollStep : scrollStep,
//         behavior: "smooth",
//       });
//     }
//   };

//   return (
//     <div className="space-y-6 animate-in fade-in duration-300">
//       {/* Translucent Glassmorphic Sub-Navigation in Header */}
//       {portalRoot && createPortal(
//         <div className="flex items-center gap-1.5 max-w-full min-w-0">
//           {/* Scroll Left Button */}
//           {canScrollLeft && (
//             <button
//               type="button"
//               onClick={() => handleScroll("left")}
//               className="p-1 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white/90 border border-white/15 backdrop-blur-md shadow-sm transition-all shrink-0"
//               title="Scroll tabs left"
//             >
//               <ChevronLeft size={14} />
//             </button>
//           )}

//           {/* Scrollable Tabs Track */}
//           <nav 
//             ref={scrollContainerRef}
//             aria-label="Billing Sub-modules" 
//             className="bg-black/20 backdrop-blur-md border border-white/15 rounded-full p-1 flex items-center gap-1 overflow-x-auto scrollbar-hide shadow-inner scroll-smooth min-w-0"
//           >
//             {NAV_TABS.map((tab) => {
//               const Icon = tab.icon;
//               return (
//                 <NavLink
//                   key={tab.to}
//                   to={tab.to}
//                   className={({ isActive }) => `
//                     flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap shrink-0
//                     ${isActive
//                       ? "billing-tab-active bg-white text-brand-primary shadow-sm font-bold scale-[1.02]"
//                       : "text-white/75 hover:text-white hover:bg-white/10"
//                     }
//                   `}
//                 >
//                   <Icon size={14} className="shrink-0" />
//                   <span>{tab.label}</span>
//                 </NavLink>
//               );
//             })}
//           </nav>

//           {/* Scroll Right Button */}
//           {canScrollRight && (
//             <button
//               type="button"
//               onClick={() => handleScroll("right")}
//               className="p-1 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white/90 border border-white/15 backdrop-blur-md shadow-sm transition-all shrink-0"
//               title="Scroll tabs right"
//             >
//               <ChevronRight size={14} />
//             </button>
//           )}
//         </div>,
//         portalRoot
//       )}

//       {/* Module Content Area */}
//       <div className="min-h-[60vh] px-2 md:px-4">
//         <Outlet />
//       </div>

//       {/* Billing Calculator - floats above all billing pages */}
//       <BillingCalculator />
//     </div>
//   );
// };

// export default BillingLayout;


// import React, { useState, useEffect } from "react";
// import { createPortal } from "react-dom";
// import { NavLink, Outlet } from "react-router-dom";
// import BillingCalculator from "./BillingCalculator";
// import {
//   FilePlus,
//   Bed,
//   Wallet,
//   RotateCcw,
//   History,
//   Wrench,
//   FileText,
//   Coins,
//   Tag,
//   UserMinus,
//   DollarSign,
//   BedDouble,
//   ClipboardList,
//   ArrowRightLeft,
//   Package,
// } from "lucide-react";

// const BillingLayout: React.FC = () => {
//   const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
//   useEffect(() => {
//     setPortalRoot(document.getElementById("module-tabs-portal"));
//   }, []);
//   const tabs = [
//     { to: "/billing/opd", label: "OPD Billing", icon: FilePlus },
//     { to: "/billing/ipd", label: "IPD Billing", icon: Bed },
//     { to: "/billing/admissions", label: "Admission List", icon: BedDouble },
//     { to: "/billing/history", label: "Billing History", icon: History },
//     { to: "/billing/pricing", label: "Service Pricing", icon: DollarSign },
//     { to: "/billing/advances", label: "Advance Collection", icon: Wallet },
//     { to: "/billing/refunds", label: "Refund Management", icon: RotateCcw },
//     { to: "/billing/inventory", label: "Stock Movement", icon: ArrowRightLeft },
//     { to: "/billing/stock", label: "Stock Inventory", icon: Package },
//     { to: "/billing/requisitions", label: "Requisitions", icon: ClipboardList },
//     // { to: "/billing/adjustments", label: "Bill Adjustment", icon: Wrench },
//     // { to: "/billing/invoices", label: "Invoice Generation", icon: FileText },
//     // { to: "/billing/payments", label: "Cash & Insurance", icon: Coins },
//     // { to: "/billing/discounts", label: "Discounts", icon: Tag },
//     // { to: "/billing/receipts", label: "Payment Receipt", icon: History },
//     // { to: "/billing/debtors", label: "Outstanding Balance", icon: UserMinus },
//   ];

//   return (
//     <div className="space-y-6 animate-in fade-in duration-500">
//       {/* Module Navigation Header - Horizontal Scrollable */}
//       {portalRoot && createPortal(
//         <div className="bg-white border border-slate-200 rounded-[32px] p-2 flex items-center gap-1 w-max shadow-sm overflow-x-auto no-scrollbar">
//           {tabs.map((tab) => (
//             <NavLink
//               key={tab.to}
//               to={tab.to}
//               className={({ isActive }) => `
//                 flex items-center gap-2 px-5 py-2.5 rounded-[24px] text-xs font-black transition-all whitespace-nowrap uppercase tracking-wider
//                 ${isActive
//                   ? "bg-brand-primary text-white shadow-lg shadow-brand-active"
//                   : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
//                 }
//               `}
//             >
//               <tab.icon size={16} />
//               {tab.label}
//             </NavLink>
//           ))}
//         </div>,
//         portalRoot
//       )}

//       {/* Module Content Area */}
//       <div className="min-h-[60vh]">
//         <Outlet />
//       </div>

//       {/* Billing Calculator - floats above all billing pages */}
//       <BillingCalculator />
//     </div>
//   );
// };

// export default BillingLayout;


// import React, { useState, useEffect } from "react";
// import { createPortal } from "react-dom";
// import { NavLink, Outlet } from "react-router-dom";
// import BillingCalculator from "./BillingCalculator";
// import {
//   FilePlus,
//   Bed,
//   Wallet,
//   RotateCcw,
//   History,
//   Wrench,
//   FileText,
//   Coins,
//   Tag,
//   UserMinus,
//   DollarSign,
//   BedDouble,
//   ClipboardList,
//   ArrowRightLeft,
//   Package,
// } from "lucide-react";

// const BillingLayout: React.FC = () => {
//   const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
//   useEffect(() => {
//     setPortalRoot(document.getElementById("module-tabs-portal"));
//   }, []);
//   const tabs = [
//     { to: "/billing/opd", label: "OPD Billing", icon: FilePlus },
//     { to: "/billing/ipd", label: "IPD Billing", icon: Bed },
//     { to: "/billing/admissions", label: "Admission List", icon: BedDouble },
//     { to: "/billing/history", label: "Billing History", icon: History },
//     { to: "/billing/pricing", label: "Service Pricing", icon: DollarSign },
//     { to: "/billing/advances", label: "Advance Collection", icon: Wallet },
//     { to: "/billing/refunds", label: "Refund Management", icon: RotateCcw },
//     { to: "/billing/inventory", label: "Stock Movement", icon: ArrowRightLeft },
//     { to: "/billing/stock", label: "Stock Inventory", icon: Package },
//     { to: "/billing/requisitions", label: "Requisitions", icon: ClipboardList },
//     // { to: "/billing/adjustments", label: "Bill Adjustment", icon: Wrench },
//     // { to: "/billing/invoices", label: "Invoice Generation", icon: FileText },
//     // { to: "/billing/payments", label: "Cash & Insurance", icon: Coins },
//     // { to: "/billing/discounts", label: "Discounts", icon: Tag },
//     // { to: "/billing/receipts", label: "Payment Receipt", icon: History },
//     // { to: "/billing/debtors", label: "Outstanding Balance", icon: UserMinus },
//   ];

//   return (
//     <div className="space-y-6 animate-in fade-in duration-500">
//       {/* Module Navigation Header - Horizontal Scrollable */}
//       {portalRoot && createPortal(
//         <div className="bg-white border border-slate-200 rounded-[32px] p-2 flex items-center gap-1 w-max shadow-sm">
//           {tabs.map((tab) => (
//             <NavLink
//               key={tab.to}
//               to={tab.to}
//               className={({ isActive }) => `
//                 flex items-center gap-2 px-5 py-2.5 rounded-[24px] text-xs font-black transition-all whitespace-nowrap uppercase tracking-wider
//                 ${isActive
//                   ? "bg-brand-primary text-white shadow-lg shadow-brand-active"
//                   : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
//                 }
//               `}
//             >
//               <tab.icon size={16} />
//               {tab.label}
//             </NavLink>
//           ))}
//         </div>,
//         portalRoot
//       )}

//       {/* Module Content Area */}
//       <div className="min-h-[60vh]">
//         <Outlet />
//       </div>

//       {/* Billing Calculator - floats above all billing pages */}
//       <BillingCalculator />
//     </div>
//   );
// };

// export default BillingLayout;
