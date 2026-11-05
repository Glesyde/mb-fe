import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown } from 'lucide-react';

export default function SearchableDropdown({ options, value, onChange, placeholder = "Select...", className = "", buttonClassName = "" }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter((opt: any) =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOption = options.find((opt: any) => String(opt.value) === String(value));

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div
        className={`w-full bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 cursor-pointer flex justify-between items-center outline-none ${buttonClassName}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate pr-2">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown size={16} className="text-slate-400 shrink-0" />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-hidden flex flex-col">
          <div className="p-2 bg-slate-50 border-b border-slate-100 shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-400 transition-colors"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1 custom-scrollbar">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-xs text-slate-500 text-center">No results found</div>
            ) : (
              filteredOptions.map((opt: any) => (
                <div
                  key={opt.value}
                  className={`p-3 text-sm text-slate-700 hover:bg-indigo-50 cursor-pointer transition-colors ${String(opt.value) === String(value) ? 'bg-indigo-50/50 text-indigo-700' : ''}`}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                >
                  {opt.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}