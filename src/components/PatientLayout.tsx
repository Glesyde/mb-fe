import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { 
  Users, 
  UserPlus, 
  FileText, 
  History, 
  BedDouble, 
  ArrowRightLeft, 
  Package, 
  ClipboardList,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface NavTabItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  permissions?: string[];
  allowedRoles?: string[];
}

// Roles permitted to access Patient Administration internal stock & requisitions
const PATIENT_ADMIN_STOCK_ROLES = [
  "super_admin",
  "hospital_admin",
  "admin",
  "executive_director",
  "front_desk",
  "receptionist",
  "customer_service",
  "customer_service_manager",
  "chief_operating_officer",
  "billing",
];

// Roles permitted to access Patient Administration internal stock & requisitions
const PATIENT_ADMIN_REGISTRATION = [
  "super_admin",
  "hospital_admin",
  "admin",
  "executive_director",
  "front_desk",
  "receptionist",
  "customer_service",
  "customer_service_manager",
  "chief_operating_officer",
  "billing",
];

const NAV_TABS: NavTabItem[] = [
  { 
    to: "/patients/search", 
    label: "Patient Search", 
    icon: Users,
    permissions: ["patient_read", "*"]
  },
  { 
    to: "/patients/demographics", 
    label: "Demographics", 
    icon: UserPlus,
    permissions: ["patient_create", "*"],
    allowedRoles: PATIENT_ADMIN_REGISTRATION,
  },
  { 
    to: "/patients/documents", 
    label: "Documents", 
    icon: FileText,
    permissions: ["patient_document_read", "patient_read", "*"]
  },
  { 
    to: "/patients/history", 
    label: "Patient History", 
    icon: History,
    permissions: ["patient_read", "*"]
  },
  { 
    to: "/patients/admissions", 
    label: "Admission List", 
    icon: BedDouble,
    permissions: ["ipd_read", "ipd_view_admissions", "patient_read", "*"],
    allowedRoles: PATIENT_ADMIN_REGISTRATION,
  },
  { 
    to: "/patients/inventory", 
    label: "Stock Movement", 
    icon: ArrowRightLeft,
    permissions: ["inventory_stock_read", "inventory_item_read", "*"],
    allowedRoles: PATIENT_ADMIN_STOCK_ROLES,
  },
  { 
    to: "/patients/stock", 
    label: "Stock Inventory", 
    icon: Package,
    permissions: ["inventory_stock_read", "inventory_item_read", "*"],
    allowedRoles: PATIENT_ADMIN_STOCK_ROLES,
  },
  { 
    to: "/patients/requisitions", 
    label: "Requisitions", 
    icon: ClipboardList,
    permissions: ["inventory_requisition_read", "inventory_requisition_create", "*"],
    allowedRoles: PATIENT_ADMIN_STOCK_ROLES,
  },
];

const PatientLayout: React.FC = () => {
  const { user, roles, hasAnyPermission } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Extract user role safely
  const firstRole: any = roles && (roles as any[]).length > 0 ? (roles as any[])[0] : null;
  const roleName = typeof firstRole === "string" ? firstRole : firstRole?.name || "";
  const currentRole = (roleName || user?.role || "").toLowerCase();

  const isSuperAdmin =
    currentRole === "super_admin" ||
    currentRole === "hospital_admin" ||
    currentRole === "admin" ||
    currentRole === "executive_director" ||
    hasAnyPermission(["*"]);

  // Filter tabs dynamically based on user role and granular permissions
  const visibleTabs = useMemo(() => {
    if (isSuperAdmin) return NAV_TABS;

    return NAV_TABS.filter((tab) => {
      // 1. Role verification: If the tab has a role restriction, current role must match
      if (tab.allowedRoles && tab.allowedRoles.length > 0) {
        const roleMatches = tab.allowedRoles.some(
          (r) => r.toLowerCase() === currentRole
        );
        if (!roleMatches) return false;
      }

      // 2. Permission verification: If permissions are defined, check user permissions
      if (tab.permissions && tab.permissions.length > 0) {
        const hasPerm = hasAnyPermission(tab.permissions);
        if (tab.allowedRoles && tab.allowedRoles.length > 0) {
          return hasPerm || tab.allowedRoles.some((r) => r.toLowerCase() === currentRole);
        }
        return hasPerm;
      }

      return true;
    });
  }, [currentRole, isSuperAdmin, hasAnyPermission]);

  // Direct URL navigation protection: redirect to first permitted tab if an unauthorized route is requested
  useEffect(() => {
    const currentTab = NAV_TABS.find((tab) => location.pathname === tab.to);
    if (currentTab) {
      const isAllowed = visibleTabs.some((tab) => tab.to === currentTab.to);
      if (!isAllowed) {
        navigate(visibleTabs[0]?.to || "/patients/search", { replace: true });
      }
    }
  }, [location.pathname, visibleTabs, navigate]);

  useEffect(() => {
    setPortalRoot(document.getElementById("module-tabs-portal"));
  }, []);

  // Check scroll boundary status
  const checkScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 4);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
    }
  }, []);

  // Re-check scroll buttons when portal mounts or window resizes
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

  // Auto-scroll active tab into view when route changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      const activeEl = scrollContainerRef.current.querySelector<HTMLElement>(".patient-tab-active");
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
      {/* Translucent Glassmorphic Sub-Navigation in Header */}
      {portalRoot && createPortal(
        <div className="flex items-center max-w-full min-w-0">
          {/* Scroll Left Button */}
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

          {/* Scrollable Tabs Track */}
          <nav 
            ref={scrollContainerRef}
            aria-label="Patient Sub-modules" 
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
                      ? "patient-tab-active bg-white text-brand-primary shadow-sm font-bold scale-[1.02]"
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

          {/* Scroll Right Button */}
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

      {/* Module Content Area */}
      <div className="min-h-[60vh] px-2 md:px-4">
        <Outlet />
      </div>
    </div>
  );
};

export default PatientLayout;



// import React, { useState, useEffect, useRef, useCallback } from "react";
// import { createPortal } from "react-dom";
// import { NavLink, Outlet, useLocation } from "react-router-dom";
// import { 
//   Users, 
//   UserPlus, 
//   FileText, 
//   History, 
//   BedDouble, 
//   ArrowRightLeft, 
//   Package, 
//   ClipboardList,
//   ChevronLeft,
//   ChevronRight
// } from "lucide-react";

// const NAV_TABS = [
//   { to: "/patients/search", label: "Patient Search", icon: Users },
//   { to: "/patients/demographics", label: "Demographics", icon: UserPlus },
//   { to: "/patients/documents", label: "Documents", icon: FileText },
//   { to: "/patients/history", label: "Patient History", icon: History },
//   { to: "/patients/admissions", label: "Admission List", icon: BedDouble },
//   { to: "/patients/inventory", label: "Stock Movement", icon: ArrowRightLeft },
//   { to: "/patients/stock", label: "Stock Inventory", icon: Package },
//   { to: "/patients/requisitions", label: "Requisitions", icon: ClipboardList },
// ];

// const PatientLayout: React.FC = () => {
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
//       const activeEl = scrollContainerRef.current.querySelector<HTMLElement>(".patient-tab-active");
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
//             aria-label="Patient Sub-modules" 
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
//                       ? "patient-tab-active bg-white text-brand-primary shadow-sm font-bold scale-[1.02]"
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
//     </div>
//   );
// };

// export default PatientLayout;
















// import React, { useState, useEffect, useRef, useCallback } from "react";
// import { createPortal } from "react-dom";
// import { NavLink, Outlet, useLocation } from "react-router-dom";
// import { 
//   Users, 
//   UserPlus, 
//   FileText, 
//   History, 
//   BedDouble, 
//   ArrowRightLeft, 
//   Package, 
//   ClipboardList,
//   ChevronLeft,
//   ChevronRight
// } from "lucide-react";

// interface TabItem {
//   to: string;
//   label: string;
//   icon: React.ComponentType<{ size?: number; className?: string }>;
// }

// const NAV_TABS: TabItem[] = [
//   { to: "/patients/search", label: "Patient Search", icon: Users },
//   { to: "/patients/demographics", label: "Demographics", icon: UserPlus },
//   { to: "/patients/documents", label: "Documents", icon: FileText },
//   { to: "/patients/history", label: "Patient History", icon: History },
//   { to: "/patients/admissions", label: "Admission List", icon: BedDouble },
//   { to: "/patients/inventory", label: "Stock Movement", icon: ArrowRightLeft },
//   { to: "/patients/stock", label: "Stock Inventory", icon: Package },
//   { to: "/patients/requisitions", label: "Requisitions", icon: ClipboardList },
// ];

// const PatientLayout: React.FC = () => {
//   const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
//   const [canScrollLeft, setCanScrollLeft] = useState(false);
//   const [canScrollRight, setCanScrollRight] = useState(false);

//   const scrollContainerRef = useRef<HTMLDivElement>(null);
//   const isDraggingRef = useRef(false);
//   const startXRef = useRef(0);
//   const scrollLeftStartRef = useRef(0);
//   const hasMovedRef = useRef(false);

//   const location = useLocation();

//   useEffect(() => {
//     setPortalRoot(document.getElementById("module-tabs-portal"));
//   }, []);

//   const checkScrollBoundaries = useCallback(() => {
//     const el = scrollContainerRef.current;
//     if (!el) return;
//     setCanScrollLeft(el.scrollLeft > 6);
//     setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 6);
//   }, []);

//   useEffect(() => {
//     checkScrollBoundaries();
//     const el = scrollContainerRef.current;
//     if (!el) return;

//     el.addEventListener("scroll", checkScrollBoundaries, { passive: true });
//     window.addEventListener("resize", checkScrollBoundaries);

//     const handleWheel = (e: WheelEvent) => {
//       if (e.deltaY !== 0) {
//         e.preventDefault();
//         el.scrollLeft += e.deltaY;
//       }
//     };
//     el.addEventListener("wheel", handleWheel, { passive: false });

//     return () => {
//       el.removeEventListener("scroll", checkScrollBoundaries);
//       window.removeEventListener("resize", checkScrollBoundaries);
//       el.removeEventListener("wheel", handleWheel);
//     };
//   }, [portalRoot, checkScrollBoundaries]);

//   useEffect(() => {
//     if (scrollContainerRef.current) {
//       const activeEl = scrollContainerRef.current.querySelector<HTMLElement>(".patient-tab-active");
//       if (activeEl) {
//         activeEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
//       }
//     }
//     checkScrollBoundaries();
//   }, [location.pathname, checkScrollBoundaries]);

//   const handleScroll = (direction: "left" | "right") => {
//     if (scrollContainerRef.current) {
//       const scrollStep = 240;
//       scrollContainerRef.current.scrollBy({
//         left: direction === "left" ? -scrollStep : scrollStep,
//         behavior: "smooth",
//       });
//     }
//   };

//   const handleMouseDown = (e: React.MouseEvent) => {
//     const el = scrollContainerRef.current;
//     if (!el) return;
//     isDraggingRef.current = true;
//     hasMovedRef.current = false;
//     startXRef.current = e.pageX - el.offsetLeft;
//     scrollLeftStartRef.current = el.scrollLeft;
//   };

//   const handleMouseMove = (e: React.MouseEvent) => {
//     if (!isDraggingRef.current || !scrollContainerRef.current) return;
//     const x = e.pageX - scrollContainerRef.current.offsetLeft;
//     const walk = (x - startXRef.current) * 1.2;
//     if (Math.abs(walk) > 4) {
//       hasMovedRef.current = true;
//     }
//     scrollContainerRef.current.scrollLeft = scrollLeftStartRef.current - walk;
//   };

//   const handleMouseUpOrLeave = () => {
//     isDraggingRef.current = false;
//   };

//   const handleClickCapture = (e: React.MouseEvent) => {
//     if (hasMovedRef.current) {
//       e.preventDefault();
//       e.stopPropagation();
//     }
//   };

//   const NavigationBar = (
//     <div className="flex items-center gap-1.5 max-w-full min-w-0 select-none">
//       {/* Scroll Left Button */}
//       {canScrollLeft && (
//         <button
//           type="button"
//           onClick={() => handleScroll("left")}
//           className="p-2 rounded-full bg-white text-slate-700 hover:text-brand-primary border border-slate-200/90 shadow-md hover:shadow-lg transition-all shrink-0 active:scale-95"
//           title="Scroll Left"
//         >
//           <ChevronLeft size={16} />
//         </button>
//       )}

//       {/* Retained White Capsule Container */}
//       <nav
//         ref={scrollContainerRef}
//         aria-label="Patient Sub-modules"
//         onMouseDown={handleMouseDown}
//         onMouseMove={handleMouseMove}
//         onMouseUp={handleMouseUpOrLeave}
//         onMouseLeave={handleMouseUpOrLeave}
//         onClickCapture={handleClickCapture}
//         className="bg-white border border-slate-200 rounded-[32px] p-1.5 flex items-center gap-1 shadow-sm overflow-x-auto scrollbar-hide scroll-smooth min-w-0 cursor-grab active:cursor-grabbing"
//       >
//         {NAV_TABS.map((tab) => {
//           const Icon = tab.icon;
//           return (
//             <NavLink
//               key={tab.to}
//               to={tab.to}
//               className={({ isActive }) => `
//                 flex items-center gap-2 px-5 py-2.5 rounded-[24px] text-xs font-black transition-all whitespace-nowrap uppercase tracking-wider shrink-0
//                 ${isActive
//                   ? "patient-tab-active bg-brand-primary text-white shadow-lg shadow-brand-active scale-[1.02]"
//                   : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
//                 }
//               `}
//             >
//               <Icon size={16} className="shrink-0" />
//               <span>{tab.label}</span>
//             </NavLink>
//           );
//         })}
//       </nav>

//       {/* Scroll Right Button */}
//       {canScrollRight && (
//         <button
//           type="button"
//           onClick={() => handleScroll("right")}
//           className="p-2 rounded-full bg-white text-slate-700 hover:text-brand-primary border border-slate-200/90 shadow-md hover:shadow-lg transition-all shrink-0 active:scale-95"
//           title="Scroll Right"
//         >
//           <ChevronRight size={16} />
//         </button>
//       )}
//     </div>
//   );

//   return (
//     <div className="space-y-6 animate-in fade-in duration-500">
//       {/* Module Navigation Header */}
//       {portalRoot ? (
//         createPortal(NavigationBar, portalRoot)
//       ) : (
//         <div className="w-full flex justify-start pb-2">
//           {NavigationBar}
//         </div>
//       )}

//       {/* Module Content Area */}
//       <div className="min-h-[60vh]">
//         <Outlet />
//       </div>
//     </div>
//   );
// };

// export default PatientLayout;




// // import React, { useState, useEffect } from "react";
// // import { createPortal } from "react-dom";
// // import { NavLink, Outlet } from "react-router-dom";
// // import { 
// //   Users, 
// //   UserPlus, 
// //   FileText, 
// //   History, 
// //   BedDouble, 
// //   ArrowRightLeft, 
// //   Package, 
// //   ClipboardList 
// // } from "lucide-react";

// // const NAV_TABS = [
// //   { to: "/patients/search", label: "Patient Search", icon: Users },
// //   { to: "/patients/demographics", label: "Demographics", icon: UserPlus },
// //   { to: "/patients/documents", label: "Documents", icon: FileText },
// //   { to: "/patients/history", label: "Patient History", icon: History },
// //   { to: "/patients/admissions", label: "Admission List", icon: BedDouble },
// //   { to: "/patients/inventory", label: "Stock Movement", icon: ArrowRightLeft },
// //   { to: "/patients/stock", label: "Stock Inventory", icon: Package },
// //   { to: "/patients/requisitions", label: "Requisitions", icon: ClipboardList },
// // ];

// // const PatientLayout: React.FC = () => {
// //   const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

// //   useEffect(() => {
// //     setPortalRoot(document.getElementById("module-tabs-portal"));
// //   }, []);

// //   return (
// //     <div className="space-y-6 animate-in fade-in duration-300">
// //       {/* Translucent Glassmorphic Sub-Navigation in Header */}
// //       {portalRoot && createPortal(
// //         <nav 
// //           aria-label="Patient Sub-modules" 
// //           className="bg-black/20 backdrop-blur-md border border-white/15 rounded-full p-1 flex items-center gap-1 w-max max-w-full overflow-x-auto scrollbar-hide shadow-inner"
// //         >
// //           {NAV_TABS.map((tab) => {
// //             const Icon = tab.icon;
// //             return (
// //               <NavLink
// //                 key={tab.to}
// //                 to={tab.to}
// //                 className={({ isActive }) => `
// //                   flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap
// //                   ${isActive
// //                     ? "bg-white text-brand-primary shadow-sm font-bold scale-[1.02]"
// //                     : "text-white/75 hover:text-white hover:bg-white/10"
// //                   }
// //                 `}
// //               >
// //                 <Icon size={14} className="shrink-0" />
// //                 <span>{tab.label}</span>
// //               </NavLink>
// //             );
// //           })}
// //         </nav>,
// //         portalRoot
// //       )}

// //       {/* Module Content Area */}
// //       <div className="min-h-[60vh] px-2 md:px-4">
// //         <Outlet />
// //       </div>
// //     </div>
// //   );
// // };

// // export default PatientLayout;

// // import React, { useState, useEffect } from "react";
// // import { createPortal } from "react-dom";
// // import { NavLink, Outlet } from "react-router-dom";
// // import { Users, UserPlus, History, FileText, BedDouble, ArrowRightLeft, Package, ClipboardList } from "lucide-react";

// // const PatientLayout: React.FC = () => {
// //   const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
// //   useEffect(() => {
// //     setPortalRoot(document.getElementById("module-tabs-portal"));
// //   }, []);

// //   return (
// //     <div className="space-y-6 animate-in fade-in duration-500">
// //       {/* Sub-Module Navigation Header */}
// //       {portalRoot && createPortal(
// //         <div className="bg-white border border-slate-200 rounded-[32px] p-2 flex items-center gap-1 w-max shadow-sm overflow-x-auto no-scrollbar">
// //           <NavLink
// //           to="/patients/search"
// //           className={({ isActive }) => `
// //             flex items-center gap-2 px-6 py-2.5 rounded-[24px] text-sm font-bold transition-all whitespace-nowrap
// //             ${isActive
// //               ? "bg-brand-primary text-white shadow-lg shadow-brand-active"
// //               : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
// //             }
// //           `}
// //         >
// //           <Users size={18} />
// //           Patient Search
// //         </NavLink>
// //         <NavLink
// //           to="/patients/demographics"
// //           className={({ isActive }) => `
// //             flex items-center gap-2 px-6 py-2.5 rounded-[24px] text-sm font-bold transition-all whitespace-nowrap
// //             ${isActive
// //               ? "bg-brand-primary text-white shadow-lg shadow-brand-active"
// //               : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
// //             }
// //           `}
// //         >
// //           <UserPlus size={18} />
// //           Demographics
// //         </NavLink>
// //         <NavLink
// //           to="/patients/documents"
// //           className={({ isActive }) => `
// //             flex items-center gap-2 px-6 py-2.5 rounded-[24px] text-sm font-bold transition-all whitespace-nowrap
// //             ${isActive
// //               ? "bg-brand-primary text-white shadow-lg shadow-brand-active"
// //               : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
// //             }
// //           `}
// //         >
// //           <FileText size={18} />
// //           Documents
// //         </NavLink>
// //         <NavLink
// //           to="/patients/history"
// //           className={({ isActive }) => `
// //             flex items-center gap-2 px-6 py-2.5 rounded-[24px] text-sm font-bold transition-all whitespace-nowrap
// //             ${isActive
// //               ? "bg-brand-primary text-white shadow-lg shadow-brand-active"
// //               : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
// //             }
// //           `}
// //         >
// //           <History size={18} />
// //           Patient History
// //         </NavLink>
// //         <NavLink
// //           to="/patients/admissions"
// //           className={({ isActive }) => `
// //             flex items-center gap-2 px-6 py-2.5 rounded-[24px] text-sm font-bold transition-all whitespace-nowrap
// //             ${isActive
// //               ? "bg-brand-primary text-white shadow-lg shadow-brand-active"
// //               : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
// //             }
// //           `}
// //         >
// //           <BedDouble size={18} />
// //           Admission List
// //         </NavLink>
// //         <NavLink
// //           to="/patients/inventory"
// //           className={({ isActive }) => `
// //             flex items-center gap-2 px-6 py-2.5 rounded-[24px] text-sm font-bold transition-all whitespace-nowrap
// //             ${isActive
// //               ? "bg-brand-primary text-white shadow-lg shadow-brand-active"
// //               : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
// //             }
// //           `}
// //         >
// //           <ArrowRightLeft size={18} />
// //           Stock Movement
// //         </NavLink>
// //         <NavLink
// //           to="/patients/stock"
// //           className={({ isActive }) => `
// //             flex items-center gap-2 px-6 py-2.5 rounded-[24px] text-sm font-bold transition-all whitespace-nowrap
// //             ${isActive
// //               ? "bg-brand-primary text-white shadow-lg shadow-brand-active"
// //               : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
// //             }
// //           `}
// //         >
// //           <Package size={18} />
// //           Stock Inventory
// //         </NavLink>
// //         <NavLink
// //           to="/patients/requisitions"
// //           className={({ isActive }) => `
// //             flex items-center gap-2 px-6 py-2.5 rounded-[24px] text-sm font-bold transition-all whitespace-nowrap
// //             ${isActive
// //               ? "bg-brand-primary text-white shadow-lg shadow-brand-active"
// //               : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
// //             }
// //           `}
// //         >
// //           <ClipboardList size={18} />
// //           Requisitions
// //         </NavLink>
// //       </div>,
// //       portalRoot
// //       )}

// //       {/* Module Content Area */}
// //       <div className="min-h-[60vh]">
// //         <Outlet />
// //       </div>
// //     </div>
// //   );
// // };

// // export default PatientLayout;
