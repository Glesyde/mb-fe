import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Package,
  Layers,
  Truck,
  ArrowRightLeft,
  ClipboardList,
  ShoppingCart,
  Building2,
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

const PROCUREMENT_ADMIN_ROLES = [
  "super_admin",
  "hospital_admin",
  "admin",
  "executive_director",
  "chief_operating_officer",
  "inventory",
  "accountant",
];

const NAV_TABS: NavTabItem[] = [
  { to: "/inventory/master", label: "Stock Master", icon: Layers, permissions: ["inventory_item_read", "*"] },
  { to: "/inventory/grn", label: "Goods Received (GRN)", icon: Truck, permissions: ["inventory_stock_in", "*"] },
  { to: "/inventory/movement", label: "Stock Movement", icon: ArrowRightLeft, permissions: ["inventory_stock_read", "*"] },
  { to: "/inventory/stock", label: "Stock Inventory", icon: Package, permissions: ["inventory_stock_read", "*"] },
  { to: "/inventory/requests", label: "Internal Requisitions", icon: ClipboardList, permissions: ["inventory_requisition_read", "*"] },
  { 
    to: "/inventory/purchase-orders", 
    label: "Purchase Orders", 
    icon: ShoppingCart, 
    permissions: ["inventory_requisition_approve", "finance_ap_invoice_read", "*"],
    allowedRoles: PROCUREMENT_ADMIN_ROLES 
  },
  { 
    to: "/inventory/suppliers", 
    label: "Supplier Setup", 
    icon: Building2, 
    permissions: ["inventory_vendor_read", "inventory_vendor_create", "*"],
    allowedRoles: PROCUREMENT_ADMIN_ROLES 
  },
];

const InventoryLayout: React.FC = () => {
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
        navigate(visibleTabs[0]?.to || "/inventory/master", { replace: true });
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
      const activeEl = scrollContainerRef.current.querySelector<HTMLElement>(".inventory-tab-active");
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2 md:px-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-slate-900 text-white rounded-xl">
              <Package size={24} />
            </div>
            Inventory & Store Management
          </h1>
          <p className="text-slate-500 font-medium">
            Coordinate medical supplies, procurement, and asset logistics.
          </p>
        </div>
      </div>

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
            aria-label="Inventory Sub-modules" 
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
                      ? "inventory-tab-active bg-white text-slate-900 shadow-sm font-bold scale-[1.02]"
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
    </div>
  );
};

export default InventoryLayout;



// import React, { useState, useEffect } from "react";
// import { createPortal } from "react-dom";
// import { NavLink, Outlet } from 'react-router-dom';
// import { Package, Layers, Truck, ClipboardList, Building2, ArrowRightLeft } from 'lucide-react';

// const InventoryLayout: React.FC = () => {
//   const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  
//   useEffect(() => {
//     setPortalRoot(document.getElementById("module-tabs-portal"));
//   }, []);

//   const tabs = [
//     // 1. Changed "Stock Master" route to /inventory/master to fix the conflict
//     { to: "/inventory/stock", label: "Stock Master", icon: Layers }, 
//     { to: "/inventory/grn", label: "Goods Received (GRN)", icon: Truck },
//     { to: "/inventory/movement", label: "Stock Movement", icon: ArrowRightLeft },
//     // 2. Kept "Stock Inventory" as /inventory/stock
//     { to: "/inventory/stock", label: "Stock Inventory", icon: Package }, 
//     { to: "/inventory/requests", label: "Internal Requisitions", icon: ClipboardList },
//     { to: "/inventory/suppliers", label: "Supplier Setup", icon: Building2 },
//   ];

//   return (
//     <div className="space-y-8 animate-in fade-in duration-500 pb-20">
//       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
//         <div>
//           <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
//             <div className="p-2 bg-slate-900 text-white rounded-xl">
//               <Package size={24} />
//             </div>
//             Inventory & Store Management
//           </h1>
//           <p className="text-slate-500 font-medium">Coordinate medical supplies, procurement, and asset logistics.</p>
//         </div>
//       </div>

//       {/* Slate/Dark Sub-Navigation Header */}
//       {portalRoot && createPortal(
//         <div className="flex items-center gap-1 p-1 bg-slate-200/50 backdrop-blur rounded-[20px] w-max border border-slate-300/40 shadow-sm overflow-x-auto no-scrollbar">
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

// export default InventoryLayout;

// import React, { useState, useEffect } from "react";
// import { createPortal } from "react-dom";
// import { NavLink, Outlet } from 'react-router-dom';
// import { Package, Layers, Truck, ClipboardList, Building2, ArrowRightLeft } from 'lucide-react';

// const InventoryLayout: React.FC = () => {
//   const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  
//   useEffect(() => {
//     setPortalRoot(document.getElementById("module-tabs-portal"));
//   }, []);

//   const tabs = [
//     { to: "/inventory/master", label: "Stock Master", icon: Layers }, // Fixed Route
//     { to: "/inventory/grn", label: "Goods Received (GRN)", icon: Truck },
//     { to: "/inventory/movement", label: "Stock Movement", icon: ArrowRightLeft },
//     { to: "/inventory/stock", label: "Stock Inventory", icon: Package }, // Kept Route
//     { to: "/inventory/requests", label: "Internal Requisitions", icon: ClipboardList },
//     { to: "/inventory/suppliers", label: "Supplier Setup", icon: Building2 },
//   ];

//   return (
//     <div className="space-y-8 animate-in fade-in duration-500 pb-20">
//       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
//         <div>
//           <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
//             <div className="p-2 bg-slate-900 text-white rounded-xl">
//               <Package size={24} />
//             </div>
//             Inventory & Store Management
//           </h1>
//           <p className="text-slate-500 font-medium">Coordinate medical supplies, procurement, and asset logistics.</p>
//         </div>
//       </div>

//       {portalRoot && createPortal(
//         <div className="flex items-center gap-1 p-1 bg-slate-200/50 backdrop-blur rounded-[20px] w-max border border-slate-300/40 shadow-sm overflow-x-auto no-scrollbar">
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

// export default InventoryLayout;

// import React, { useState, useEffect } from "react";
// import { createPortal } from "react-dom";
// import { NavLink, Outlet } from 'react-router-dom';
// import { Package, Layers, Truck, ClipboardList, Building2, ArrowRightLeft } from 'lucide-react';

// const InventoryLayout: React.FC = () => {
//   const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
//   useEffect(() => {
//     setPortalRoot(document.getElementById("module-tabs-portal"));
//   }, []);
//   const tabs = [
//     { to: "/inventory/master", label: "Stock Master", icon: Layers },
//     { to: "/inventory/grn", label: "Goods Received (GRN)", icon: Truck },
//     { to: "/inventory/movement", label: "Stock Movement", icon: ArrowRightLeft },
//     { to: "/inventory/stock", label: "Stock Inventory", icon: Package },
//     { to: "/inventory/requests", label: "Internal Requisitions", icon: ClipboardList },
//     { to: "/inventory/suppliers", label: "Supplier Setup", icon: Building2 },
//   ];

//   return (
//     <div className="space-y-8 animate-in fade-in duration-500 pb-20">
//       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
//         <div>
//           <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
//             <div className="p-2 bg-slate-900 text-white rounded-xl">
//               <Package size={24} />
//             </div>
//             Inventory & Store Management
//           </h1>
//           <p className="text-slate-500 font-medium">Coordinate medical supplies, procurement, and asset logistics.</p>
//         </div>
//       </div>

//       {/* Slate/Dark Sub-Navigation Header */}
//       {portalRoot && createPortal(
//         <div className="flex items-center gap-1 p-1 bg-slate-200/50 backdrop-blur rounded-[20px] w-max border border-slate-300/40 shadow-sm overflow-x-auto no-scrollbar">
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

// export default InventoryLayout;




















// import React, { useState, useEffect } from "react";
// import { createPortal } from "react-dom";
// import { NavLink, Outlet } from 'react-router-dom';
// // 1. IMPORT ShoppingCart ICON
// import { Package, Layers, Truck, ClipboardList, Building2, ArrowRightLeft, ShoppingCart } from 'lucide-react';

// const InventoryLayout: React.FC = () => {
//   const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  
//   useEffect(() => {
//     setPortalRoot(document.getElementById("module-tabs-portal"));
//   }, []);

//   const tabs = [
//     { to: "/inventory/master", label: "Stock Master", icon: Layers },
//     { to: "/inventory/grn", label: "Goods Received (GRN)", icon: Truck },
//     { to: "/inventory/movement", label: "Stock Movement", icon: ArrowRightLeft },
//     { to: "/inventory/stock", label: "Stock Inventory", icon: Package },
//     { to: "/inventory/requests", label: "Internal Requisitions", icon: ClipboardList },
//     // 2. ADD THE PURCHASE ORDERS TAB HERE
//     { to: "/inventory/purchase-orders", label: "Purchase Orders", icon: ShoppingCart },
//     { to: "/inventory/suppliers", label: "Supplier Setup", icon: Building2 },
//   ];

//   return (
//     <div className="space-y-8 animate-in fade-in duration-500 pb-20">
//       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
//         <div>
//           <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
//             <div className="p-2 bg-slate-900 text-white rounded-xl">
//               <Package size={24} />
//             </div>
//             Inventory & Store Management
//           </h1>
//           <p className="text-slate-500 font-medium">Coordinate medical supplies, procurement, and asset logistics.</p>
//         </div>
//       </div>

//       {portalRoot && createPortal(
//         <div className="flex items-center gap-1 p-1 bg-slate-200/50 backdrop-blur rounded-[20px] w-max border border-slate-300/40 shadow-sm overflow-x-auto no-scrollbar">
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

// export default InventoryLayout;



















// import React, { useState, useEffect, useRef, useCallback } from "react";
// import { createPortal } from "react-dom";
// import { NavLink, Outlet, useLocation } from "react-router-dom";
// import {
//   Package,
//   Layers,
//   Truck,
//   ArrowRightLeft,
//   ClipboardList,
//   ShoppingCart,
//   Building2,
//   ChevronLeft,
//   ChevronRight,
// } from "lucide-react";

// const NAV_TABS = [
//   { to: "/inventory/master", label: "Stock Master", icon: Layers },
//   { to: "/inventory/grn", label: "Goods Received (GRN)", icon: Truck },
//   { to: "/inventory/movement", label: "Stock Movement", icon: ArrowRightLeft },
//   { to: "/inventory/stock", label: "Stock Inventory", icon: Package },
//   { to: "/inventory/requests", label: "Internal Requisitions", icon: ClipboardList },
//   { to: "/inventory/purchase-orders", label: "Purchase Orders", icon: ShoppingCart },
//   { to: "/inventory/suppliers", label: "Supplier Setup", icon: Building2 },
// ];

// const InventoryLayout: React.FC = () => {
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
//       const activeEl = scrollContainerRef.current.querySelector<HTMLElement>(".inventory-tab-active");
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
//     <div className="space-y-6 animate-in fade-in duration-300 pb-20">
//       {/* Module Title Header */}
//       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2 md:px-4">
//         <div>
//           <h1 className="font-black text-slate-800 tracking-tight flex items-center gap-3">
//             <div className="p-2 bg-slate-900 text-white rounded-xl">
//               <Package size={20} />
//             </div>
//             Inventory & Store Management
//           </h1>
//           <p className="text-slate-500 font-medium">
//             Coordinate medical supplies, procurement, and asset logistics.
//           </p>
//         </div>
//       </div>

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
//             aria-label="Inventory Sub-modules" 
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
//                       ? "inventory-tab-active bg-white text-slate-900 shadow-sm font-bold scale-[1.02]"
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

// export default InventoryLayout;







// import React, { useState, useEffect, useRef, useCallback } from "react";
// import { createPortal } from "react-dom";
// import { NavLink, Outlet, useLocation } from "react-router-dom";
// import {
//   Package,
//   Layers,
//   Truck,
//   ArrowRightLeft,
//   ClipboardList,
//   ShoppingCart,
//   Building2,
//   ChevronLeft,
//   ChevronRight,
// } from "lucide-react";

// const NAV_TABS = [
//   { to: "/inventory/master", label: "Stock Master", icon: Layers },
//   { to: "/inventory/grn", label: "Goods Received (GRN)", icon: Truck },
//   { to: "/inventory/movement", label: "Stock Movement", icon: ArrowRightLeft },
//   { to: "/inventory/stock", label: "Stock Inventory", icon: Package },
//   { to: "/inventory/requests", label: "Internal Requisitions", icon: ClipboardList },
//   { to: "/inventory/purchase-orders", label: "Purchase Orders", icon: ShoppingCart },
//   { to: "/inventory/suppliers", label: "Supplier Setup", icon: Building2 },
// ];

// const InventoryLayout: React.FC = () => {
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
//       const activeEl = scrollContainerRef.current.querySelector<HTMLElement>(".inventory-tab-active");
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
//     <div className="space-y-6 animate-in fade-in duration-300 pb-20">
//       {/* Module Title Header */}
//       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2 md:px-4">
//         <div>
//           <h1 className="font-black text-slate-800 tracking-tight flex items-center gap-3">
//             <div className="p-2 bg-slate-900 text-white rounded-xl">
//               <Package size={20} />
//             </div>
//             Inventory & Store Management
//           </h1>
//           <p className="text-slate-500 font-medium">
//             Coordinate medical supplies, procurement, and asset logistics.
//           </p>
//         </div>
//       </div>

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
//             aria-label="Inventory Sub-modules" 
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
//                       ? "inventory-tab-active bg-white text-slate-900 shadow-sm font-bold scale-[1.02]"
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

// export default InventoryLayout;