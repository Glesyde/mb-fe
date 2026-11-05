import React, { useState, useRef, useEffect } from "react";
import { Search, ChevronDown } from "lucide-react";

interface SearchableSelectProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options = [],
  value,
  onChange,
  placeholder,
  disabled,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-xs font-bold outline-none focus:border-brand-primary flex justify-between items-center ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        <span className="truncate">{value || placeholder}</span>
        <ChevronDown className="text-slate-400 shrink-0" size={14} />
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 flex flex-col">
          <div className="p-2 border-b border-slate-100 flex items-center gap-2 bg-slate-50 rounded-t-xl">
            <Search className="text-slate-400" size={12} />
            <input
              type="text"
              autoFocus
              placeholder="Search..."
              className="w-full bg-transparent text-xs outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="overflow-y-auto hide-scrollbar p-1 max-h-48">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    onChange(opt);
                    setIsOpen(false);
                    setSearchTerm("");
                  }}
                  className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors ${
                    value === opt
                      ? "bg-brand-primary text-white font-bold"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {opt}
                </button>
              ))
            ) : (
              <div className="p-3 text-xs text-center text-slate-400">
                No results found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;