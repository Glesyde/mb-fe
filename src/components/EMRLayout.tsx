import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { 
  ClipboardList, 
  User, 
  FilePlus, 
  ChevronLeft, 
  ChevronRight 
} from "lucide-react";

const NAV_TABS = [
  { to: "/emr/worklist", label: "My Worklist", icon: ClipboardList },
  { to: "/emr/chart", label: "Patient Chart", icon: User },
  { to: "/emr/orders", label: "Order Entry (CPOE)", icon: FilePlus },
];

const EMRLayout: React.FC = () => {
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

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
  }, [portalRoot, checkScroll]);

  // Auto-scroll active tab into view when route changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      const activeEl = scrollContainerRef.current.querySelector<HTMLElement>(".emr-tab-active");
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
              className="py-3 bg-white/10 hover:bg-white/20 active:scale-95 text-white/90 border border-white/15 backdrop-blur-md shadow-sm transition-all shrink-0 "
              title="Scroll tabs left"
            >
              <ChevronLeft size={14} />
            </button>
          )}

          {/* Scrollable Tabs Track */}
          <nav 
            ref={scrollContainerRef}
            aria-label="EMR Sub-modules" 
            className="bg-white/10 backdrop-blur-md border border-white/15 p-1 flex items-center gap-1 overflow-x-auto scrollbar-hide shadow-inner scroll-smooth min-w-0 "
          >
            {NAV_TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  className={({ isActive }) => `
                    flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold transition-all whitespace-nowrap shrink-0
                    ${isActive
                      ? "emr-tab-active bg-white text-brand-primary shadow-sm font-bold scale-[1.02]"
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
              className="py-3 bg-white/10 hover:bg-white/20 active:scale-95 text-white/90 border border-white/15 backdrop-blur-md shadow-sm transition-all shrink-0 "
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

export default EMRLayout;


// import React, { useState, useEffect, useRef, useCallback } from "react";
// import { createPortal } from "react-dom";
// import { NavLink, Outlet, useLocation } from "react-router-dom";
// import { 
//   ClipboardList, 
//   User, 
//   FilePlus, 
//   ChevronLeft, 
//   ChevronRight 
// } from "lucide-react";

// const NAV_TABS = [
//   { to: "/emr/worklist", label: "My Worklist", icon: ClipboardList },
//   { to: "/emr/chart", label: "Patient Chart", icon: User },
//   { to: "/emr/orders", label: "Order Entry (CPOE)", icon: FilePlus },
// ];

// const EMRLayout: React.FC = () => {
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
//       const activeEl = scrollContainerRef.current.querySelector<HTMLElement>(".emr-tab-active");
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
//             aria-label="EMR Sub-modules" 
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
//                       ? "emr-tab-active bg-white text-brand-primary shadow-sm font-bold scale-[1.02]"
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
//     </div>
//   );
// };

// export default EMRLayout;

// import React, { useState, useEffect } from "react";
// import { createPortal } from "react-dom";
// import { NavLink, Outlet } from 'react-router-dom';
// import { ClipboardList, User, FilePlus } from 'lucide-react';

// const EMRLayout: React.FC = () => {
//   const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
//   useEffect(() => {
//     setPortalRoot(document.getElementById("module-tabs-portal"));
//   }, []);
//   return (
//     <div className="animate-in fade-in duration-500">
//       {/* Sub-Module Navigation Header */}
//       {portalRoot && createPortal(
//         <div className="bg-white border border-slate-200 rounded-[32px] p-2 flex items-center gap-1 w-max shadow-sm overflow-x-auto no-scrollbar">
//         <NavLink
//           to="/emr/worklist"
//           className={({ isActive }) => `
//             flex items-center gap-2 px-6 py-2.5 rounded-[24px] text-sm font-bold transition-all whitespace-nowrap
//             ${isActive 
//               ? 'bg-brand-primary text-white shadow-lg shadow-brand-active' 
//               : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}
//           `}
//         >
//           <ClipboardList size={18} />
//           My Worklist
//         </NavLink>
//         <NavLink
//           to="/emr/chart"
//           className={({ isActive }) => `
//             flex items-center gap-2 px-6 py-2.5 rounded-[24px] text-sm font-bold transition-all whitespace-nowrap
//             ${isActive 
//               ? 'bg-brand-primary text-white shadow-lg shadow-brand-active' 
//               : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}
//           `}
//         >
//           <User size={18} />
//           Patient Chart
//         </NavLink>
//         <NavLink
//           to="/emr/orders"
//           className={({ isActive }) => `
//             flex items-center gap-2 px-6 py-2.5 rounded-[24px] text-sm font-bold transition-all whitespace-nowrap
//             ${isActive 
//               ? 'bg-brand-primary text-white shadow-lg shadow-brand-active' 
//               : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}
//           `}
//         >
//           <FilePlus size={18} />
//           Order Entry (CPOE)
//         </NavLink>
//       </div>,
//         portalRoot
//       )}

//       <div className="min-h-[60vh]">
//         <Outlet />
//       </div>
//     </div>
//   );
// };

// export default EMRLayout;
