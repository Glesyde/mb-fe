import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  // Building2,
  // Layers,
  // DollarSign,
  Coins,
  Printer,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const NAV_TABS = [
  // { to: "/settings/facility", label: "Facility Setup", icon: Building2 },
  // { to: "/settings/departments", label: "Departments", icon: Layers },
  // { to: "/settings/pricing", label: "Services & Pricing", icon: DollarSign },
  { to: "/settings/finance", label: "Tax & Currency", icon: Coins },
  { to: "/settings/hardware", label: "Hardware Config", icon: Printer },
];

const SettingsLayout: React.FC = () => {
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
      const activeEl = scrollContainerRef.current.querySelector<HTMLElement>(
        ".settings-tab-active"
      );
      if (activeEl) {
        activeEl.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
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
            <div className="p-2 bg-slate-800 text-white rounded-xl shadow-lg shadow-slate-200">
              <Settings size={24} />
            </div>
            System Configuration
          </h1>
          <p className="text-slate-500 font-medium">
            Control global hospital parameters, prices, and device connectivity.
          </p>
        </div>
      </div>

      {/* Translucent Glassmorphic Sub-Navigation in Header */}
      {portalRoot &&
        createPortal(
          <div className="flex items-center gap-1.5 max-w-full min-w-0">
            {/* Scroll Left Button */}
            {canScrollLeft && (
              <button
                type="button"
                onClick={() => handleScroll("left")}
                className="p-1 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white/90 border border-white/15 backdrop-blur-md shadow-sm transition-all shrink-0"
                title="Scroll tabs left"
              >
                <ChevronLeft size={14} />
              </button>
            )}

            {/* Scrollable Tabs Track */}
            <nav
              ref={scrollContainerRef}
              aria-label="Settings Sub-modules"
              className="bg-black/20 backdrop-blur-md border border-white/15 rounded-full p-1 flex items-center gap-1 overflow-x-auto scrollbar-hide shadow-inner scroll-smooth min-w-0"
            >
              {NAV_TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <NavLink
                    key={tab.to}
                    to={tab.to}
                    className={({ isActive }) => `
                      flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap shrink-0
                      ${
                        isActive
                          ? "settings-tab-active bg-white text-slate-800 shadow-sm font-bold scale-[1.02]"
                          : "text-white/75 hover:text-white hover:bg-white/10"
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
                className="p-1 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white/90 border border-white/15 backdrop-blur-md shadow-sm transition-all shrink-0"
                title="Scroll tabs right"
              >
                <ChevronRight size={14} />
              </button>
            )}
          </div>,
          portalRoot
        )}

      {/* Content Area */}
      <div className="min-h-[60vh] px-2 md:px-4">
        <div className="bg-white border border-slate-200 rounded-[32px] md:rounded-[40px] p-6 md:p-12 shadow-sm">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default SettingsLayout;

// import React, { useState, useEffect } from "react";
// import { createPortal } from "react-dom";
// import { NavLink, Outlet } from "react-router-dom";
// import {
//   Building2,
//   Layers,
//   DollarSign,
//   Coins,
//   Printer,
//   Settings,
// } from "lucide-react";

// const SettingsLayout: React.FC = () => {
//   const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
//   useEffect(() => {
//     setPortalRoot(document.getElementById("module-tabs-portal"));
//   }, []);
//   const tabs = [
//     // { to: "/settings/facility", label: "Facility Setup", icon: Building2 },
//     // { to: "/settings/departments", label: "Departments", icon: Layers },
//     // { to: "/settings/pricing", label: "Services & Pricing", icon: DollarSign },
//     { to: "/settings/finance", label: "Tax & Currency", icon: Coins },
//     { to: "/settings/hardware", label: "Hardware Config", icon: Printer },
//   ];

//   return (
//     <div className="space-y-8 animate-in fade-in duration-500 pb-20">
//       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
//         <div>
//           <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
//             <div className="p-2 bg-slate-800 text-white rounded-xl shadow-lg shadow-slate-200">
//               <Settings size={24} />
//             </div>
//             System Configuration
//           </h1>
//           <p className="text-slate-500 font-medium">
//             Control global hospital parameters, prices, and device connectivity.
//           </p>
//         </div>
//       </div>

//       {/* Slate/Dark Top Navigation Bar */}
//       {portalRoot && createPortal(
//         <div className="flex items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-[24px] w-max shadow-sm overflow-x-auto no-scrollbar max-w-full">
//           {tabs.map((tab) => (
//             <NavLink
//               key={tab.to}
//               to={tab.to}
//               className={({ isActive }) => `
//                 flex items-center gap-2 px-6 py-2.5 rounded-[18px] text-sm font-bold transition-all whitespace-nowrap
//                 ${
//                   isActive
//                     ? "bg-slate-800 text-white shadow-lg"
//                     : "text-slate-500 hover:text-slate-900 hover:bg-white/50"
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

//       {/* Content Area */}
//       <div className="min-h-[60vh] bg-white border border-slate-200 rounded-[40px] p-8 md:p-12 shadow-sm">
//         <Outlet />
//       </div>
//     </div>
//   );
// };

// export default SettingsLayout;
