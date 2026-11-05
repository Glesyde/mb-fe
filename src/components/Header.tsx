import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Bell, 
  Menu, 
  User, 
  LogOut, 
  HelpCircle, 
  ChevronDown, 
  Search, 
  Stethoscope, 
  X, 
  Clock 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UserProfile } from '../types';
import { NAV_ITEMS, ROLE_PERMISSIONS } from '../services/constants';
import { useAuth } from "../context/AuthContext";

interface HeaderProps {
  toggleMobileMenu: () => void;
  user: UserProfile;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleMobileMenu, user, onLogout }) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  const { roles } = useAuth();
  const navigate = useNavigate();

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const profileContainerRef = useRef<HTMLDivElement>(null);

  // Live ticking clock for hospital precision
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dateStr = useMemo(() => {
    return currentTime.toLocaleDateString("en-NG", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }, [currentTime]);

  const timeStr = useMemo(() => {
    return currentTime.toLocaleTimeString("en-NG", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }, [currentTime]);

  const greetingHour = useMemo(() => {
    const h = currentTime.getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }, [currentTime]);

  // Type-safe display role calculation
  const displayRole = useMemo(() => {
    if (roles && Array.isArray(roles) && roles.length > 0) {
      const firstRole: unknown = roles[0];
      if (typeof firstRole === 'string' && firstRole.trim()) {
        return firstRole.replace(/_/g, ' ');
      }
      if (typeof firstRole === 'object' && firstRole !== null && 'name' in firstRole) {
        const roleName = (firstRole as { name?: unknown }).name;
        if (typeof roleName === 'string' && roleName.trim()) {
          return roleName.replace(/_/g, ' ');
        }
      }
    }
    if (user?.role) {
      return String(user.role).replace(/_/g, ' ');
    }
    return "Staff";
  }, [roles, user?.role]);

  // Flatten NAV_ITEMS and filter based on user permissions
  const searchItems = useMemo(() => {
    const allowedRootIds = (user?.role && ROLE_PERMISSIONS[user.role]) || [];
    const items: Array<{ label: string; path: string; icon: React.ComponentType<any>; category: string }> = [];

    NAV_ITEMS.forEach((item) => {
      if (allowedRootIds.length > 0 && !allowedRootIds.includes(item.id)) return;

      if (item.path && (!item.subItems || item.subItems.length === 0)) {
        items.push({
          label: item.label,
          path: item.path,
          icon: item.icon,
          category: 'Main Menu',
        });
      }

      if (item.subItems) {
        item.subItems.forEach((sub) => {
          items.push({
            label: sub.label,
            path: sub.path,
            icon: sub.icon || item.icon,
            category: item.label,
          });
        });
      }
    });

    return items;
  }, [user?.role]);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return searchItems.filter(
      (item) => item.label.toLowerCase().includes(q) || item.category.toLowerCase().includes(q)
    );
  }, [searchItems, searchQuery]);

  // Global shortcut (⌘K / Ctrl+K)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
      if (profileContainerRef.current && !profileContainerRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-focus input when search popover opens
  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isSearchOpen]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        handleNavigate(filteredItems[selectedIndex].path);
      }
    } else if (e.key === 'Escape') {
      setIsSearchOpen(false);
    }
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setSearchQuery('');
    setIsSearchOpen(false);
  };

  return (
    <header className="h-16 relative bg-gradient-to-r from-brand-primary via-brand-primary to-indigo-900 border-b border-white/10 flex items-center justify-between px-4 md:px-6 sticky top-0 z-40 shadow-lg overflow-visible">
      {/* Ambient Decorative Blobs */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-12 left-1/4 w-56 h-56 bg-indigo-400/10 rounded-full blur-2xl pointer-events-none" />

      {/* Left: Mobile Toggle & Brand Identity */}
      <div className="flex items-center gap-3 relative z-10 shrink-0">
        <button 
          onClick={toggleMobileMenu}
          className="md:hidden p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors border border-white/10"
          aria-label="Toggle navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">


          <img
            src="/assets/logo-nobg.png"
            alt="Logo"
            className="block lg:hidden object-contain transition-all duration-300 w-10 h-10"
            
          />
          {/* <div className="p-2 bg-white/15 backdrop-blur-md rounded-xl border border-white/20 shadow-sm flex items-center justify-center">
            <Stethoscope size={20} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-white font-extrabold text-sm tracking-tight leading-none">
                Gracespring HIS
              </span>
              <span className="hidden sm:inline-flex text-[9px] font-bold text-brand-active px-2 py-0.5 bg-white/10 rounded-full border border-white/20 uppercase tracking-widest leading-none">
                HL7 V4.2
              </span>
            </div>
            <p className="text-[10px] text-brand-active/80 font-medium tracking-wide mt-0.5 hidden sm:block">
              Hospital Information System
            </p>
          </div> */}
        </div>
      </div>

      {/* Center: Module Tabs Portal */}
      <div 
        id="module-tabs-portal" 
        className="flex-1 flex justify-start overflow-x-auto items-center mx-4 h-full relative z-10 min-w-0 scrollbar-hide"
      />




      {/* Right: Actions, Search Popover & Profile */}
      <div className="flex items-center gap-0.2 relative z-10 bg-white/10 backdrop-blur-md border border-white/15 text-xs text-white/90 shadow-sm shrink-0 ">



        {/* Center-Right: Live Clock & Dynamic Greeting */}
        <div className="hidden xl:flex items-center gap-0.5 px-1 py-0.5 text-xs text-white/90 shadow-sm shrink-0 mr-0.3 relative z-10">
          <Clock className="w-3.5 h-3.5 text-brand-active" />
          <span className="text-white/80 font-medium">{dateStr}</span>
          <span className="text-white/40">,</span>
          <span className="font-mono font-bold text-brand-active">{timeStr}</span>
          {/* <span className="text-white/40">|</span>
          <span className="font-medium text-white truncate max-w-[140px]">
            {greetingHour}, <span className="font-bold text-brand-active">{user?.name?.split(' ')[0] || "User"}</span>
          </span> */}
        </div>


        {/* Compact Anchored Search */}
        <div className="relative " ref={searchContainerRef}>
          <button 
            onClick={() => setIsSearchOpen((prev) => !prev)}
            className={`p-2 rounded-xl transition-all flex items-center gap-2 text-white ${
              isSearchOpen 
                ? 'shadow-inner' 
                : 'shadow-sm'
            }`}
            title="Search modules and actions (⌘K / Ctrl+K)"
          >
            <Search className="w-4 h-4 text-white" />

          </button>

          {/* Compact Dropdown Popover */}
          {isSearchOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200/90 text-slate-800 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="p-3 border-b border-slate-100 bg-slate-50/80 flex items-center gap-2">
                <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Quick search modules, actions..."
                  className="w-full bg-transparent text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSelectedIndex(0);
                  }}
                  onKeyDown={handleKeyDown}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="p-1 hover:bg-slate-200/60 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <span className="text-[10px] font-bold text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-xs">
                  ESC
                </span>
              </div>

              {/* Search Results list */}
              <div className="max-h-64 overflow-y-auto p-1.5 space-y-0.5">
                {searchQuery.trim().length > 0 ? (
                  filteredItems.length > 0 ? (
                    <>
                      <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Results ({filteredItems.length})
                      </div>
                      {filteredItems.map((item, idx) => {
                        const Icon = item.icon;
                        const isSelected = idx === selectedIndex;
                        return (
                          <button
                            key={item.path}
                            onClick={() => handleNavigate(item.path)}
                            onMouseEnter={() => setSelectedIndex(idx)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all ${
                              isSelected
                                ? 'bg-brand-primary text-white font-medium shadow-sm'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`p-1.5 rounded-lg shrink-0 ${
                                isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                              }`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold leading-tight truncate">
                                  {item.label}
                                </p>
                                <p className={`text-[10px] leading-tight truncate mt-0.5 ${
                                  isSelected ? 'text-white/80' : 'text-slate-400'
                                }`}>
                                  {item.category}
                                </p>
                              </div>
                            </div>
                            {isSelected && (
                              <span className="text-[10px] font-bold bg-white/20 px-1.5 py-0.5 rounded shrink-0">
                                ↵
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </>
                  ) : (
                    <div className="py-6 px-4 text-center">
                      <p className="text-xs text-slate-500 font-semibold">No matching modules</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Try searching Lab, Pharmacy, or EMR</p>
                    </div>
                  )
                ) : (
                  <div className="p-2">
                    <p className="px-2 pb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Quick Shortcuts
                    </p>
                    <div className="grid grid-cols-2 gap-1">
                      {searchItems.slice(0, 4).map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.path}
                            onClick={() => handleNavigate(item.path)}
                            className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 text-left transition-colors"
                          >
                            <Icon className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                            <span className="text-xs font-semibold text-slate-700 truncate">
                              {item.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Popover Footer */}
              <div className="p-2 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-[10px] text-slate-400 font-medium px-3">
                <div className="flex items-center gap-2">
                  <span><kbd className="font-semibold text-slate-600">↑↓</kbd> navigate</span>
                  <span><kbd className="font-semibold text-slate-600">↵</kbd> open</span>
                </div>
                <span className="text-brand-primary font-bold">HIS Command</span>
              </div>
            </div>
          )}
        </div>

        {/* Notifications */}
        <button 
          className="relative p-2 text-white/80 shadow-sm "
          title="Notifications"
        >
          <Bell className="w-4 h-4 text-white" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-brand-primary" />
        </button>

        {/* <div className="h-6 w-px bg-white/20 mx-1 hidden sm:block" /> */}

        {/* User Profile Dropdown */}
        <div className="relative shrink-0 " ref={profileContainerRef}>
          <button 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2.5 p-1 sm:pl-2 sm:pr-2.5 py-1 transition-all text-white shadow-sm"
          >
            <div className="w-7 h-7 rounded-lg bg-white/20 border border-white/25 flex items-center justify-center font-bold text-xs text-white">
              {user?.name ? user.name.charAt(0).toUpperCase() : <User size={13} />}
            </div>
            <div className="text-left hidden md:block">
              <p className="text-xs font-bold text-white leading-none mb-0.5 max-w-[110px] truncate">
                {user?.name || "User"}
              </p>
              <p className="text-[9px] text-brand-active font-semibold uppercase tracking-wider leading-none">
                {displayRole}
              </p>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-white/70 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} />
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200/90 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-slate-800">
              {/* <div className="p-3 bg-slate-50 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900 truncate">{user?.name || "Staff User"}</p>
                <p className="text-[10px] font-semibold text-brand-primary uppercase tracking-wider mt-0.5">
                  {displayRole}
                </p>
                {user?.department && (
                  <p className="text-[10px] text-slate-400 mt-1">Department: {user.department}</p>
                )}
              </div> */}
              
              <div className="p-1">
                <button 
                  onClick={() => {
                    setIsProfileOpen(false);
                    navigate('/profile');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors text-left"
                >
                  <User size={15} /> Profile Settings
                </button>
                <button 
                  onClick={() => {
                    setIsProfileOpen(false);
                    navigate('/help');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors text-left"
                >
                  <HelpCircle size={15} /> Help & Documentation
                </button>
                <div className="h-px bg-slate-100 my-1" />
                <button 
                  onClick={onLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors text-left"
                >
                  <LogOut size={15} /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>


    </header>
  );
};

export default Header;













// import React, { useState, useEffect, useMemo, useRef } from 'react';
// import { Bell, Menu, User, LogOut, HelpCircle, ChevronDown, Search } from 'lucide-react';
// import { useNavigate } from 'react-router-dom';
// import { UserProfile } from '../types';
// import { NAV_ITEMS, ROLE_PERMISSIONS } from '../services/constants';

// interface HeaderProps {
//   toggleMobileMenu: () => void;
//   user: UserProfile;
//   onLogout: () => void;
// }

// const Header: React.FC<HeaderProps> = ({ toggleMobileMenu, user, onLogout }) => {
//   const [isProfileOpen, setIsProfileOpen] = useState(false);
//   const [searchQuery, setSearchQuery] = useState('');
//   const [isOpen, setIsOpen] = useState(false);
//   const [selectedIndex, setSelectedIndex] = useState(0);

//   const navigate = useNavigate();
//   const searchInputRef = useRef<HTMLInputElement>(null);

//   // Flatten NAV_ITEMS and filter based on user permissions
//   const searchItems = useMemo(() => {
//     const allowedRootIds = ROLE_PERMISSIONS[user.role] || [];
//     const items: Array<{ label: string; path: string; icon: React.ComponentType<any>; category: string }> = [];

//     NAV_ITEMS.forEach((item) => {
//       if (!allowedRootIds.includes(item.id)) return;

//       if (item.path && (!item.subItems || item.subItems.length === 0)) {
//         items.push({
//           label: item.label,
//           path: item.path,
//           icon: item.icon,
//           category: 'Main Menu',
//         });
//       }

//       if (item.subItems) {
//         item.subItems.forEach((sub) => {
//           items.push({
//             label: sub.label,
//             path: sub.path,
//             icon: sub.icon || item.icon,
//             category: item.label,
//           });
//         });
//       }
//     });

//     return items;
//   }, [user.role]);

//   const filteredItems = useMemo(() => {
//     if (!searchQuery.trim()) return [];
//     return searchItems.filter(
//       (item) =>
//         item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
//         item.category.toLowerCase().includes(searchQuery.toLowerCase())
//     );
//   }, [searchItems, searchQuery]);

//   useEffect(() => {
//     const handleGlobalKeyDown = (e: KeyboardEvent) => {
//       if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
//         e.preventDefault();
//         setIsOpen(true);
//       }
//     };
//     window.addEventListener('keydown', handleGlobalKeyDown);
//     return () => window.removeEventListener('keydown', handleGlobalKeyDown);
//   }, []);

//   const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
//     if (e.key === 'ArrowDown') {
//       e.preventDefault();
//       setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
//     } else if (e.key === 'ArrowUp') {
//       e.preventDefault();
//       setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
//     } else if (e.key === 'Enter') {
//       e.preventDefault();
//       if (filteredItems[selectedIndex]) {
//         handleNavigate(filteredItems[selectedIndex].path);
//       }
//     } else if (e.key === 'Escape') {
//       setIsOpen(false);
//       searchInputRef.current?.blur();
//     }
//   };

//   const handleNavigate = (path: string) => {
//     navigate(path);
//     setSearchQuery('');
//     setIsOpen(false);
//     searchInputRef.current?.blur();
//   };

//   return (
//     <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-40">
//       {/* Left side: Mobile Menu */}
//       <div className="flex items-center gap-4 w-12 md:w-auto">
//         <button 
//           onClick={toggleMobileMenu}
//           className="md:hidden p-2 hover:bg-slate-100 rounded-lg text-slate-600"
//         >
//           <Menu className="w-6 h-6" />
//         </button>
//       </div>

//       {/* Left-Aligned: Module Tabs Portal */}
//       <div 
//         id="module-tabs-portal" 
//         className="flex-1 flex justify-start overflow-x-auto items-center mx-4 h-full relative min-w-0 scrollbar-hide"
//       ></div>

//       {/* Right side: Actions & Profile */}
//       <div className="flex items-center gap-3">
//         {/* Search Toggle Button */}
//         <button 
//           onClick={() => setIsOpen(true)}
//           className="p-2 text-slate-500 hover:text-brand-primary hover:bg-brand-active rounded-lg transition-colors flex items-center gap-2"
//           title="Search (Cmd+K)"
//         >
//           <Search className="w-5 h-5" />
//           <div className="hidden lg:flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
//             <span>⌘K</span>
//           </div>
//         </button>
//         {/* Notifications */}
//         <button className="relative p-2 text-slate-500 hover:text-brand-primary hover:bg-brand-active rounded-lg transition-colors">
//           <Bell className="w-5 h-5" />
//           <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
//         </button>

//         {/* Vertical Divider */}
//         <div className="h-8 w-px bg-slate-200 mx-2 hidden md:block"></div>

//         {/* User Profile Dropdown */}
//         <div className="relative shrink-0">
//           <button 
//             onClick={() => setIsProfileOpen(!isProfileOpen)}
//             className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-full hover:bg-slate-50 transition-colors"
//           >
//             <div className="text-right hidden md:block">
//               <p className="text-sm font-semibold text-slate-800 leading-none mb-0.5">{user.name}</p>
//               <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wide">{user.role}</p>
//             </div>
//             <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
//           </button>

//           {isProfileOpen && (
//             <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200 origin-top-right">
//               <div className="p-4 bg-slate-50 border-b border-slate-100">
//                 <p className="text-sm font-semibold text-slate-900">{user.name}</p>
//                 <p className="text-xs text-slate-500">{user.department}</p>
//               </div>
//               <div className="p-1">
//                 <button 
//                   onClick={() => {
//                     setIsProfileOpen(false);
//                     // Standard navigation within the app
//                     window.location.href = '/profile';
//                   }}
//                   className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors text-left"
//                 >
//                   <User size={16} /> Profile Settings
//                 </button>
//                 <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors">
//                   <HelpCircle size={16} /> Help & Documentation
//                 </button>
//                 <div className="h-px bg-slate-100 my-1"></div>
//                 <button 
//                   onClick={onLogout}
//                   className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
//                 >
//                   <LogOut size={16} /> Sign Out
//                 </button>
//               </div>
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Search Modal */}
//       {isOpen && (
//         <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] bg-slate-900/50 backdrop-blur-sm p-4">
//           <div 
//             className="absolute inset-0" 
//             onClick={() => setIsOpen(false)}
//           />
//           <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
//             <div className="p-4 border-b border-slate-100 relative">
//               <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
//               <input
//                 ref={searchInputRef}
//                 type="text"
//                 placeholder="Search features, pages... (Press Esc to close)"
//                 className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base font-medium text-slate-700 placeholder-slate-400 focus:bg-white focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
//                 value={searchQuery}
//                 onChange={(e) => {
//                   setSearchQuery(e.target.value);
//                   setSelectedIndex(0);
//                 }}
//                 onKeyDown={handleKeyDown}
//                 autoFocus
//               />
//             </div>
            
//             {searchQuery.trim().length > 0 && (
//               <div className="max-h-[60vh] overflow-y-auto p-2">
//                 <div className="px-3 pb-2 pt-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
//                   Menu Items ({filteredItems.length})
//                 </div>
//                 {filteredItems.length > 0 ? (
//                   filteredItems.map((item, idx) => {
//                     const Icon = item.icon;
//                     return (
//                       <button
//                         key={item.path}
//                         onClick={() => handleNavigate(item.path)}
//                         onMouseEnter={() => setSelectedIndex(idx)}
//                         className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-all ${
//                           idx === selectedIndex 
//                             ? 'bg-brand-active text-brand-primary font-bold' 
//                             : 'text-slate-600 hover:bg-slate-50'
//                         }`}
//                       >
//                         <div className="flex items-center gap-4">
//                           <Icon className={`w-5 h-5 ${idx === selectedIndex ? 'text-brand-primary' : 'text-slate-400'}`} />
//                           <div>
//                             <p className="text-sm font-semibold leading-none">{item.label}</p>
//                             <p className="text-[11px] text-slate-400 mt-1 font-medium">{item.category}</p>
//                           </div>
//                         </div>
//                         {idx === selectedIndex && (
//                           <span className="text-[10px] font-bold bg-white border border-brand-primary/20 px-2 py-0.5 rounded shadow-sm text-brand-primary">Enter ↵</span>
//                         )}
//                       </button>
//                     );
//                   })
//                 ) : (
//                   <div className="p-8 text-center text-sm text-slate-400 font-medium">
//                     No matching pages found for "{searchQuery}"
//                   </div>
//                 )}
//               </div>
//             )}
            
//             {searchQuery.trim().length === 0 && (
//               <div className="p-8 text-center text-sm text-slate-400 font-medium flex flex-col items-center gap-3">
//                 <Search className="w-8 h-8 opacity-20" />
//                 <p>Start typing to search across modules and pages</p>
//               </div>
//             )}
//           </div>
//         </div>
//       )}
//     </header>
//   );
// };

// export default Header;
