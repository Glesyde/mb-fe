import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Box, Layers, ChevronLeft, ChevronRight } from "lucide-react";

const NAV_TABS = [
  { to: "/assets/dashboard", label: "Dashboard", icon: Box },
  { to: "/assets/master", label: "Asset Master", icon: Layers },
  // Easily extendable with additional asset tabs (e.g., Maintenance, Audits, Depreciations)
];

const AssetsLayout: React.FC = () => {
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    setPortalRoot(document.getElementById("module-tabs-portal"));
  }, []);

  // Check boundary positions for horizontal scroll
  const checkScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 4);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
    }
  }, []);

  // Listen to container scroll events & window resizing
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

  // Center active tab automatically on route changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      const activeEl = scrollContainerRef.current.querySelector<HTMLElement>(".asset-tab-active");
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    }
    checkScroll();
  }, [location.pathname, checkScroll]);

  const handleScroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollStep = 200;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollStep : scrollStep,
        behavior: "smooth",
      });
    }
  };

  const renderNavTrack = () => (
    <div className="flex items-center max-w-full min-w-0">
      {/* Scroll Left Button */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => handleScroll("left")}
          className="py-3 px-1.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white/90 border border-white/15 backdrop-blur-md shadow-sm transition-all shrink-0 rounded-l-lg"
          title="Scroll tabs left"
        >
          <ChevronLeft size={14} />
        </button>
      )}

      {/* Scrollable Navigation Strip */}
      <nav
        ref={scrollContainerRef}
        aria-label="Asset Sub-modules"
        className="bg-white/10 backdrop-blur-md border border-white/15 p-1 flex items-center gap-1 overflow-x-auto scrollbar-hide shadow-inner scroll-smooth min-w-0 rounded-lg"
      >
        {NAV_TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) => `
                flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold transition-all whitespace-nowrap shrink-0 rounded-md
                ${isActive
                  ? "asset-tab-active bg-white text-slate-900 shadow-sm font-bold scale-[1.02]"
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
          className="py-3 px-1.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white/90 border border-white/15 backdrop-blur-md shadow-sm transition-all shrink-0 rounded-r-lg"
          title="Scroll tabs right"
        >
          <ChevronRight size={14} />
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2.5 sm:gap-3">
            <div className="p-2 bg-slate-900 text-white rounded-xl shrink-0">
              <Box size={22} />
            </div>
            <span>Assets Management</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Manage hospital assets, equipment, and tracking.
          </p>
        </div>
      </div>

      {/* Portal Mount with in-flow fallback for mobile screens where portalRoot is absent */}
      {portalRoot ? (
        createPortal(renderNavTrack(), portalRoot)
      ) : (
        <div className="w-full bg-slate-800 p-2 rounded-xl shadow-sm">
          {renderNavTrack()}
        </div>
      )}

      {/* Module Content Area */}
      <main className="min-h-[60vh] px-2 md:px-4">
        <Outlet />
      </main>
    </div>
  );
};

export default AssetsLayout;

// import React, { useState, useEffect } from "react";
// import { createPortal } from "react-dom";
// import { NavLink, Outlet } from 'react-router-dom';
// import { Box, Layers } from 'lucide-react';

// const AssetsLayout: React.FC = () => {
//   const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
//   useEffect(() => {
//     setPortalRoot(document.getElementById("module-tabs-portal"));
//   }, []);
//   const tabs = [
//     { to: "/assets/dashboard", label: "Dashboard", icon: Box },
//     { to: "/assets/master", label: "Asset Master", icon: Layers },
//   ];

//   return (
//     <div className="space-y-8 animate-in fade-in duration-500 pb-20">
//       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
//         <div>
//           <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
//             <div className="p-2 bg-slate-900 text-white rounded-xl">
//               <Box size={24} />
//             </div>
//             Assets Management
//           </h1>
//           <p className="text-slate-500 font-medium">Manage hospital assets, equipment, and tracking.</p>
//         </div>
//       </div>

//       {/* Slate/Dark Sub-Navigation Header */}
//       {portalRoot && createPortal(
//         <div className="flex items-center gap-1 p-1 bg-slate-200/50 backdrop-blur rounded-[20px] w-max border border-slate-300/40 shadow-sm">
//         {tabs.map((tab) => (
//           <NavLink
//             key={tab.to}
//             to={tab.to}
//             className={({ isActive }) => `
//               flex items-center gap-2 px-6 py-2.5 rounded-[16px] text-sm font-bold transition-all whitespace-nowrap
//               ${isActive 
//                 ? 'bg-slate-900 text-white shadow-lg' 
//                 : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'}
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

// export default AssetsLayout;
