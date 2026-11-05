// src/components/Sidebar.tsx
import React, { useState, useEffect, useCallback } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { NAV_ITEMS } from "../constants";
import { NAV_PERMISSION_RULES } from "../services/constants";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { UserRole, NavItem } from "../types";
import { useAuth } from "../context/AuthContext";

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (val: boolean) => void;
  userRole: UserRole;
  closeMobileMenu?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  setIsCollapsed,
  userRole,
  closeMobileMenu,
}) => {
  const location = useLocation();
  const { hasAnyPermission, roles, modules } = useAuth();

  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [isResizing, setIsResizing] = useState(false);

  const MIN_WIDTH = 220;
  const MAX_WIDTH = 450;

  // Fix TS2339 by casting firstRole safely
  const firstRole: any = roles && (roles as any[]).length > 0 ? (roles as any[])[0] : null;
  const roleName = typeof firstRole === "string" ? firstRole : firstRole?.name || "";
  const displayRole = roleName
    ? roleName.replace(/_/g, " ")
    : userRole || "Unknown";

  const isSuperAdmin =
    roleName?.toLowerCase() === "super_admin" ||
    (userRole as string)?.toLowerCase() === "super_admin" ||
    hasAnyPermission(["*"]);


    const moduleCodeMap: Record<string, string> = {
    theatre: "ot",
    ward: "ipd",
    emergency: "erd",
    settings: "system",
    reports: "reports",
    reporting: "reports",
    "all-reports": "reports",
    management: "billing",
    "blood-bank": "Blood_Bank",
    finance: "finance",
    hr: "hr",
    hmo: "hmo",
    marketing: "marketing",
    nursing: "Nursing",
  };



  const filterNavItems = (items: NavItem[], isTopLevel = true): NavItem[] => {
    return items.reduce<NavItem[]>((acc, item) => {
      if (isTopLevel) {
        const alwaysAllowed = ["profile", "dashboard"].includes(item.id);
        
        const hasModule =
          alwaysAllowed ||
          (modules || []).some((m) => {
            const dbCode = m.code?.toLowerCase();
            return (
              dbCode === item.id.toLowerCase() ||
              dbCode === "reports" && (item.id === "reports" || item.id === "reporting") ||
              (item.moduleId && m.id === item.moduleId)
            );
          });

        if (!hasModule) return acc;
      }

      const visibleSubItems = item.subItems
        ? filterNavItems(item.subItems, false)
        : undefined;

      const requiredPermissions = NAV_PERMISSION_RULES?.[item.id] || [];

      // Allows leaf items when requiredPermissions is empty
      const canViewItem =
        isSuperAdmin ||
        (visibleSubItems && visibleSubItems.length > 0) ||
        (requiredPermissions.length > 0 && hasAnyPermission(requiredPermissions)) ||
        (requiredPermissions.length === 0 && !item.subItems);

      if (!canViewItem) return acc;

      acc.push({ ...item, subItems: visibleSubItems });
      return acc;
    }, []);
  };

  // const filterNavItems = (items: NavItem[], isTopLevel = true): NavItem[] => {
  //   return items.reduce<NavItem[]>((acc, item) => {
  //     if (isTopLevel) {
  //       const legacyCode = moduleCodeMap[item.id];
  //       const alwaysAllowed = ["profile", "dashboard"].includes(item.id);
        
  //       // Matches item.id, legacy alias, or item.moduleId against DB modules
  //       const hasModule =
  //         alwaysAllowed ||
  //         (modules || []).some((m) => {
  //           const dbCode = m.code?.toLowerCase();
  //           return (
  //             dbCode === item.id.toLowerCase() ||
  //             (legacyCode && dbCode === legacyCode.toLowerCase()) ||
  //             (item.moduleId && m.id === item.moduleId)
  //           );
  //         });

  //       if (!hasModule) return acc;
  //     }

  //     const visibleSubItems = item.subItems
  //       ? filterNavItems(item.subItems, false)
  //       : undefined;

  //     const requiredPermissions = NAV_PERMISSION_RULES?.[item.id] || [];

  //     const canViewItem =
  //       isSuperAdmin ||
  //       (visibleSubItems && visibleSubItems.length > 0) ||
  //       (requiredPermissions.length > 0 && hasAnyPermission(requiredPermissions)) ||
  //       (requiredPermissions.length === 0 && !item.subItems);

  //     if (!canViewItem) return acc;

  //     acc.push({ ...item, subItems: visibleSubItems });
  //     return acc;
  //   }, []);
  // };

  // const moduleCodeMap: Record<string, string> = {
  //   theatre: "ot",
  //   ward: "ipd",
  //   emergency: "erd",
  //   settings: "system",
  //   reporting: "reports",
  //   "all-reports": "reports",
  //   management: "billing",
  //   "blood-bank": "Blood_Bank",
  //   finance: "finance",
  //   hr: "hr",
  //   hmo: "hmo",
  //   marketing: "marketing",
  // };

  // const filterNavItems = (items: NavItem[], isTopLevel = true): NavItem[] => {
  //   return items.reduce<NavItem[]>((acc, item) => {
  //     if (isTopLevel) {
  //       const codeToCheck = moduleCodeMap[item.id] || item.id;
  //       const alwaysAllowed = ["profile", "dashboard"].includes(item.id);
  //       const hasModule =
  //         alwaysAllowed ||
  //         (modules || []).some(
  //           (m) => m.code?.toLowerCase() === codeToCheck.toLowerCase()
  //         );

  //       if (!hasModule) return acc;
  //     }

  //     const visibleSubItems = item.subItems
  //       ? filterNavItems(item.subItems, false)
  //       : undefined;

  //     const requiredPermissions = NAV_PERMISSION_RULES?.[item.id] || [];

  //     // Allow item if:
  //     // 1. User is super admin
  //     // 2. Parent has visible child items
  //     // 3. Explicit permissions match hasAnyPermission
  //     // 4. Leaf node has no permission restriction
  //     const canViewItem =
  //       isSuperAdmin ||
  //       (visibleSubItems && visibleSubItems.length > 0) ||
  //       (requiredPermissions.length > 0 && hasAnyPermission(requiredPermissions)) ||
  //       (requiredPermissions.length === 0 && !item.subItems);

  //     if (!canViewItem) return acc;

  //     acc.push({ ...item, subItems: visibleSubItems });
  //     return acc;
  //   }, []);
  // };

  const allowedItems = filterNavItems(NAV_ITEMS);

  const toggleMenu = (id: string, e: React.MouseEvent) => {
    if (isCollapsed) return;
    e.preventDefault();
    setExpandedMenus((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (e: MouseEvent) => {
      if (isResizing) {
        const newWidth = e.clientX;
        if (newWidth < 120) {
          setIsCollapsed(true);
          setSidebarWidth(MIN_WIDTH);
        } else {
          setIsCollapsed(false);
          if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
            setSidebarWidth(newWidth);
          }
        }
      }
    },
    [isResizing, setIsCollapsed]
  );

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  const renderNavItem = (item: NavItem, isSubItem = false) => {
    const Icon = item.icon;
    const hasSubItems = item.subItems && item.subItems.length > 0;
    const isExpanded = expandedMenus.includes(item.id);
    const isParentActive =
      hasSubItems &&
      item.subItems?.some((sub) => location.pathname.startsWith(sub.path));

    return (
      <div key={item.id} className="space-y-1 w-full">
        {hasSubItems ? (
          <button
            onClick={(e) => toggleMenu(item.id, e)}
            className={`
              w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group
              ${isParentActive ? "bg-gray-100 text-black" : "text-gray-600 hover:bg-gray-50 hover:text-black"}
            `}
          >
            <Icon
              className={`w-5 h-5 flex-shrink-0 transition-colors ${
                isParentActive ? "text-black" : "text-gray-500 group-hover:text-black"
              }`}
            />
            {!isCollapsed && (
              <>
                <span className="text-sm font-medium flex-1 text-left whitespace-nowrap overflow-hidden text-ellipsis">
                  {item.label}
                </span>
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-200 text-gray-400 ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                />
              </>
            )}
          </button>
        ) : (
          <NavLink
            to={item.path}
            onClick={closeMobileMenu}
            className={({ isActive }) => `
              w-full flex items-center gap-3 rounded-lg transition-all duration-200 group relative
              ${isActive ? "bg-gray-100 text-black shadow-sm font-medium" : "text-gray-600 hover:bg-gray-50 hover:text-black"}
              ${isSubItem ? "px-3 py-2 text-sm" : "px-3 py-2.5"} 
            `}
            title={isCollapsed ? item.label : undefined}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute left-0 top-2 bottom-2 w-[3px] bg-black rounded-r-full" />
                )}

                <Icon
                  className={`w-5 h-5 flex-shrink-0 transition-colors ${
                    isActive ? "text-black" : "text-gray-500 group-hover:text-black"
                  }`}
                />

                {!isCollapsed && (
                  <div className="flex flex-1 items-center justify-between overflow-hidden">
                    <span className="text-sm whitespace-nowrap text-ellipsis overflow-hidden">
                      {item.label}
                    </span>
                    {item.badge && (
                      <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-2">
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </>
            )}
          </NavLink>
        )}

        {!isCollapsed && hasSubItems && isExpanded && (
          <div className="relative mt-1 mb-2">
            <div className="absolute left-[22px] top-0 bottom-4 w-[1px] bg-gray-200" />
            <div className="space-y-1 flex flex-col animate-in slide-in-from-top-2 duration-200">
              {item.subItems?.map((subItem) => (
                <div key={subItem.id} className="relative pl-9 pr-2 w-full">
                  <div className="absolute left-[22px] top-1/2 -translate-y-1/2 w-[14px] h-[1px] bg-gray-200 pointer-events-none" />
                  {renderNavItem(subItem, true)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <aside
      style={{ width: isCollapsed ? 80 : sidebarWidth }}
      className={`
        relative h-screen bg-white border-r border-gray-200 flex flex-col z-50
        ${!isResizing ? "transition-all duration-300 ease-in-out" : ""} 
      `}
    >




      <div
        className={`h-16 relative flex items-center bg-gradient-to-r from-brand-primary via-brand-primary to-indigo-900 border-b border-white/10 flex-shrink-0 transition-all duration-300 overflow-hidden ${
          isCollapsed ? "justify-center px-2" : "px-6"
        }`}
      >
        <div className="flex items-center justify-center h-20 overflow-hidden">
          <img
            src="/assets/logo-nobg.png"
            alt="Logo"
            className={`object-contain transition-all duration-300 ${
              isCollapsed ? "w-10 h-10" : "w-20"
            }`}
          />
        </div>
      </div>


      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 space-y-1 no-scrollbar">
        {allowedItems.length > 0 ? (
          allowedItems.map((item) => renderNavItem(item))
        ) : (
          <div className="px-4 py-8 text-center">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              No access configured for role: {userRole}
            </p>
          </div>
        )}
      </nav>

      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-20 bg-white border border-gray-200 text-gray-600 rounded-full p-1 shadow-md hover:bg-gray-50 transition-colors hidden md:block z-10"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {!isCollapsed && (
        <div
          onMouseDown={startResizing}
          className="absolute top-0 right-0 w-2 h-full cursor-col-resize hover:bg-gray-100 active:bg-gray-200 transition-colors z-0"
        />
      )}

      {!isCollapsed && (
        <div className="p-4 bg-gray-50 border-t border-gray-200 mt-auto whitespace-nowrap overflow-hidden">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"></div>
            <span className="text-[11px] tracking-wider truncate">
              Access: {displayRole}
            </span>
          </div>
          <p className="text-[7px] text-gray-500">
            Ver 0.0.3 | Electronic Hospitals Record
          </p>
          <p className="text-[7px] text-gray-500">
            © 2026 Gracespring Hospitals Limited
          </p>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;