import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Search, ChevronDown, Check } from "lucide-react";
import apiClient from "../../api/client";

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  role_name: string;
  specialization_name: string | null;
}

interface SearchableUserSelectProps {
  value: string | number;
  onChange: (userId: number | null) => void;
  placeholder?: string;
  roleFilter?: string; // Optional role name to filter by, e.g., 'nurse'
  roleFilters?: string[]; // Optional list of role names to filter by, e.g., ['doctor', 'nurse']
}

const SearchableUserSelect: React.FC<SearchableUserSelectProps> = ({
  value,
  onChange,
  placeholder = "Select user...",
  roleFilter,
  roleFilters,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const openDropdown = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
    setIsOpen((prev) => !prev);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/users/all");
      if (response.data?.data) {
        setUsers(response.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (roleFilter && u.role_name !== roleFilter) return false;
    if (roleFilters && roleFilters.length > 0) {
      const role = (u.role_name || "").toLowerCase();
      if (!roleFilters.some((r) => role.includes(r.toLowerCase()))) return false;
    }

    const fullName = `${u.first_name} ${u.last_name}`.toLowerCase();
    const role = (u.role_name || "").toLowerCase();
    const search = searchTerm.toLowerCase();
    return fullName.includes(search) || role.includes(search);
  });

  const selectedUser = users.find((u) => u.id.toString() === value?.toString());

  return (
    <div ref={triggerRef}>
      <div
        className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white cursor-pointer flex items-center justify-between min-h-[38px]"
        onClick={openDropdown}
      >
        <span className={selectedUser ? "text-slate-900 font-medium" : "text-slate-400"}>
          {selectedUser
            ? `${selectedUser.first_name} ${selectedUser.last_name} (${selectedUser.role_name})`
            : placeholder}
        </span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </div>

      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-[9999] bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 flex flex-col overflow-hidden"
            style={{ top: coords.top, left: coords.left, width: coords.width }}
          >
            <div className="p-2 border-b border-slate-100 flex items-center gap-2 sticky top-0 bg-white">
              <Search size={14} className="text-slate-400 shrink-0" />
              <input
                type="text"
                className="w-full text-sm outline-none bg-transparent"
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="overflow-y-auto flex-1 p-1">
              {loading ? (
                <div className="p-3 text-sm text-slate-500 text-center flex flex-col items-center">
                  <div className="w-4 h-4 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mb-1"></div>
                  Loading...
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-3 text-sm text-slate-500 text-center">No users found</div>
              ) : (
                <>
                  <div
                    className={`p-2 rounded-md cursor-pointer text-sm mb-1 ${
                      !value ? "bg-slate-100 text-slate-700 font-bold" : "hover:bg-slate-50 text-slate-700"
                    }`}
                    onClick={() => {
                      onChange(null);
                      setIsOpen(false);
                      setSearchTerm("");
                    }}
                  >
                    None / Clear selection
                  </div>
                  {filteredUsers.map((u) => {
                    const isSelected = u.id.toString() === value?.toString();
                    return (
                      <div
                        key={u.id}
                        className={`p-2 rounded-md cursor-pointer text-sm flex flex-col ${
                          isSelected ? "bg-brand-primary/10 text-brand-primary" : "hover:bg-slate-50 text-slate-700"
                        }`}
                        onClick={() => {
                          onChange(u.id);
                          setIsOpen(false);
                          setSearchTerm("");
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {u.first_name} {u.last_name}
                          </span>
                          {isSelected && <Check size={14} />}
                        </div>
                        <span className="text-xs opacity-70 uppercase tracking-widest">{u.role_name}</span>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default SearchableUserSelect;
