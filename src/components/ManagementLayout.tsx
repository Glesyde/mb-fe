import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Tag,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const NAV_TABS = [
  { to: "/management/discounts", label: "Discounts", icon: Tag },
  { to: "/management/refunds", label: "Refunds", icon: RotateCcw },
];

const ManagementLayout: React.FC = () => {
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    setPortalRoot(document.getElementById("module-tabs-portal"));
  }, []);

  // Monitor track edges to toggle directional chevron buttons
  const checkScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 4);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
    }
  }, []);

  // Re-check boundaries on viewport resize and portal mount
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

  // Center active tab automatically whenever the route changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      const activeEl = scrollContainerRef.current.querySelector<HTMLElement>(".management-tab-active");
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

      {/* Scrollable Navigation Track */}
      <nav
        ref={scrollContainerRef}
        aria-label="Management Sub-modules"
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
                  ? "management-tab-active bg-white text-brand-primary shadow-sm font-bold scale-[1.02]"
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
      {/* Mounts into header portal with inline fallback for viewports missing the portal node */}
      {portalRoot ? (
        createPortal(renderNavTrack(), portalRoot)
      ) : (
        <div className="w-full bg-slate-900/80 backdrop-blur p-1.5 rounded-xl border border-slate-700/40 shadow-sm">
          {renderNavTrack()}
        </div>
      )}

      {/* Content Area */}
      <main className="min-h-[60vh] px-2 md:px-4">
        <Outlet />
      </main>
    </div>
  );
};

export default ManagementLayout;


// import React, { useState, useEffect } from "react";
// import { createPortal } from "react-dom";
// import { NavLink, Outlet } from "react-router-dom";
// import {
//   Tag,
//   RotateCcw,
// } from "lucide-react";

// const ManagementLayout: React.FC = () => {
//   const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
//   useEffect(() => {
//     setPortalRoot(document.getElementById("module-tabs-portal"));
//   }, []);
//   const tabs = [
//     { to: "/management/discounts", label: "Discounts", icon: Tag },
//     { to: "/management/refunds", label: "Refunds", icon: RotateCcw },
//   ];

//   return (
//     <div className="space-y-6 animate-in fade-in duration-500">
//       {/* Module Navigation Header - Horizontal Scrollable */}
//       {portalRoot && createPortal(
//         <div className="bg-white border border-slate-200 rounded-[32px] p-2 flex items-center gap-1 w-max shadow-sm overflow-x-auto no-scrollbar">
//         {tabs.map((tab) => (
//           <NavLink
//             key={tab.to}
//             to={tab.to}
//             className={({ isActive }) => `
//               flex items-center gap-2 px-5 py-2.5 rounded-[24px] text-xs font-black transition-all whitespace-nowrap uppercase tracking-wider
//               ${isActive
//                 ? "bg-brand-primary text-white shadow-lg shadow-brand-active"
//                 : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
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

// export default ManagementLayout;
