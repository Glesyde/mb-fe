import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Outlet, NavLink } from "react-router-dom";
import { Stethoscope, ClipboardList, ArrowRightLeft, Package } from "lucide-react";

const NursingLayout: React.FC = () => {
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setPortalRoot(document.getElementById("module-tabs-portal"));
  }, []);

  const tabs = [
    { to: "/nursing/admissions", label: "Labour Admissions", icon: ClipboardList },
    { to: "/nursing/inventory", label: "Stock Movement", icon: ArrowRightLeft },
    { to: "/nursing/stock", label: "Stock Inventory", icon: Package },
    { to: "/nursing/requisitions", label: "Requisitions", icon: ClipboardList },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-brand-active text-brand-primary rounded-xl shrink-0">
              <Stethoscope size={24} className="md:w-7 md:h-7" />
            </div>
            <span className="truncate">Nursing</span>
          </h1>
          <p className="text-slate-500 font-medium text-sm md:text-base mt-1">
            Manage labour, observations, and nursing tasks.
          </p>
        </div>
      </div>

      {/* Sub-Module Navigation Header */}
      {portalRoot && createPortal(
        <div className="flex items-center gap-1 p-1 bg-slate-100/50 backdrop-blur rounded-[20px] w-max border border-slate-200/40">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) => `
                flex items-center gap-2 px-6 py-2.5 rounded-[16px] text-sm font-bold transition-all whitespace-nowrap
                ${isActive
                  ? "bg-white text-brand-primary shadow-sm border border-slate-200/50"
                  : "text-slate-500 hover:text-slate-800 hover:bg-white/40"}
              `}
            >
              <tab.icon size={16} />
              {tab.label}
            </NavLink>
          ))}
        </div>,
        portalRoot
      )}

      {/* Content Area */}
      <div className="flex-1 min-h-0 relative">
        <Outlet />
      </div>
    </div>
  );
};

export default NursingLayout;
