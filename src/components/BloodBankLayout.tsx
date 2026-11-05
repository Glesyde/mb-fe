import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Droplet, ClipboardCheck, ChevronLeft, ChevronRight } from "lucide-react";

const NAV_TABS = [
  { to: "/blood-bank/requests", label: "Requests", icon: ClipboardCheck },
  { to: "/blood-bank/issue", label: "Crossmatch & Issue", icon: Droplet },
];

const BloodBankLayout: React.FC = () => {
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
      const activeEl = scrollContainerRef.current.querySelector<HTMLElement>(".blood-bank-tab-active");
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
    <div className="space-y-6 animate-in fade-in duration-300 pb-20">
      {/* Module Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2 md:px-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-red-50 text-red-600 rounded-xl">
              <Droplet size={24} />
            </div>
            Blood Bank Management
          </h1>
          <p className="text-slate-500 font-medium">
            Manage blood requests, sample collection, and crossmatching results.
          </p>
        </div>
      </div>

      {/* Translucent Glassmorphic Sub-Navigation in Header */}
      {portalRoot && createPortal(
        <div className="flex items-center max-w-full min-w-0">
          {/* Scroll Left Button */}
          {canScrollLeft && (
            <button
              type="button"
              onClick={() => handleScroll("left")}
              className="py-3 bg-white/10 hover:bg-white/20 active:scale-95 text-white/90 border border-white/15 backdrop-blur-md shadow-sm transition-all shrink-0 rounded-l-md"
              title="Scroll tabs left"
            >
              <ChevronLeft size={14} />
            </button>
          )}

          {/* Scrollable Tabs Track */}
          <nav 
            ref={scrollContainerRef}
            aria-label="Blood Bank Sub-modules" 
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
                      ? "blood-bank-tab-active bg-white text-red-600 shadow-sm font-bold scale-[1.02] rounded-md"
                      : "text-white hover:text-white hover:bg-white/10 rounded-md"
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
              className="py-3 bg-white/10 hover:bg-white/20 active:scale-95 text-white/90 border border-white/15 backdrop-blur-md shadow-sm transition-all shrink-0 rounded-r-md"
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

export default BloodBankLayout;

// import React, { useState, useEffect } from "react";
// import { createPortal } from "react-dom";
// import { NavLink, Outlet } from "react-router-dom";
// import { Droplet, ClipboardCheck } from "lucide-react";

// const BloodBankLayout: React.FC = () => {
//   const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
//   useEffect(() => {
//     setPortalRoot(document.getElementById("module-tabs-portal"));
//   }, []);
//   const tabs = [
//     { to: "/blood-bank/requests", label: "Requests", icon: ClipboardCheck },
//     { to: "/blood-bank/issue", label: "Crossmatch & Issue", icon: Droplet },
//   ];

//   return (
//     <div className="space-y-8 animate-in fade-in duration-500 pb-20">
//       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
//         <div>
//           <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
//             <div className="p-2 bg-red-50 text-red-600 rounded-xl">
//               <Droplet size={24} />
//             </div>
//             Blood Bank Management
//           </h1>
//           <p className="text-slate-500 font-medium">
//             Manage blood requests, sample collection, and crossmatching results.
//           </p>
//         </div>
//       </div>

//       {/* Sub-Module Navigation Header */}
//       {portalRoot && createPortal(
//         <div className="flex items-center gap-1 p-1 bg-slate-100/50 backdrop-blur rounded-[20px] w-max border border-slate-200/40">
//         {tabs.map((tab) => (
//           <NavLink
//             key={tab.to}
//             to={tab.to}
//             className={({ isActive }) => `
//               flex items-center gap-2 px-6 py-2.5 rounded-[16px] text-sm font-bold transition-all whitespace-nowrap
//               ${
//                 isActive
//                   ? "bg-white text-red-600 shadow-sm border border-slate-200/50"
//                   : "text-slate-500 hover:text-slate-800 hover:bg-white/40"
//               }
//             `}
//           >
//             <tab.icon size={16} />
//             {tab.label}
//           </NavLink>
//         ))}
//       </div>,
//         portalRoot
//       )}

//       <div className="min-h-[60vh]">
//         <Outlet />
//       </div>
//     </div>
//   );
// };

// export default BloodBankLayout;
