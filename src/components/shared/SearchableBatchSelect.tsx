import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Search, ChevronDown } from "lucide-react";

export interface AvailableBatch {
  batch_id: number;
  expiry_date: string;
  batch_number: string;
  purchase_price: number | string;
  available_quantity: number | string;
}

interface SearchableBatchSelectProps {
  value: number | string;
  onChange: (batchId: number) => void;
  options: AvailableBatch[];
  fallbackBatchNumber?: string;
  placeholder?: string;
}

const SearchableBatchSelect: React.FC<SearchableBatchSelectProps> = ({
  value,
  onChange,
  options,
  fallbackBatchNumber,
  placeholder = "Select batch...",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // If clicking inside the portal, don't close
      const target = event.target as Element;
      if (target.closest('.batch-select-portal')) return;
      
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    const handleScroll = (e: Event) => {
      const target = e.target as Element;
      // Don't close if scrolling inside the dropdown itself
      if (target?.closest?.('.batch-select-portal')) return;
      setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("scroll", handleScroll, true);
      window.addEventListener("resize", handleScroll);
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll);
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (!isOpen && dropdownRef.current) {
      setRect(dropdownRef.current.getBoundingClientRect());
    }
    setIsOpen(!isOpen);
    setSearchTerm("");
  };

  const filteredOptions = options?.filter((b) =>
    b.batch_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedBatch = options?.find((b) => b.batch_id.toString() === value?.toString());

  return (
    <div className="relative w-full min-w-[180px]" ref={dropdownRef}>
      <div
        className="w-full py-1.5 px-2 border border-slate-200 rounded-lg text-[10px] font-bold bg-white cursor-pointer flex items-center justify-between outline-none focus:ring-2 focus:ring-teal-500/20"
        onClick={handleToggle}
      >
        <span className={selectedBatch || fallbackBatchNumber ? "text-slate-600 truncate max-w-[140px]" : "text-slate-400"}>
          {selectedBatch
            ? `${selectedBatch.batch_number} (Qty: ${selectedBatch.available_quantity})`
            : fallbackBatchNumber 
              ? fallbackBatchNumber
              : placeholder}
        </span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </div>

      {isOpen && rect && createPortal(
        <div 
          className="batch-select-portal fixed z-[9999] bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 flex flex-col overflow-hidden"
          style={{
            top: rect.bottom + 4,
            left: rect.left,
            width: rect.width
          }}
        >
          <div className="p-2 border-b border-slate-100 flex items-center gap-2 sticky top-0 bg-white">
            <Search size={12} className="text-slate-400 shrink-0" />
            <input
              type="text"
              className="w-full text-[10px] font-bold outline-none bg-transparent"
              placeholder="Search batches..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>
          <div className="overflow-y-auto flex-1 p-1">
            {!options || options.length === 0 ? (
              <div className="p-2 text-[10px] font-bold text-slate-500 text-center">
                {fallbackBatchNumber ? "Only default batch available" : "No batches available"}
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className="p-2 text-[10px] font-bold text-slate-500 text-center">No matches found</div>
            ) : (
              filteredOptions.map((b) => (
                <div
                  key={b.batch_id}
                  className={`p-2 text-[10px] font-bold rounded cursor-pointer transition-colors ${
                    value?.toString() === b.batch_id.toString()
                      ? "bg-teal-50 text-teal-700"
                      : "hover:bg-slate-50 text-slate-600"
                  }`}
                  onClick={() => {
                    onChange(b.batch_id);
                    setIsOpen(false);
                    setSearchTerm("");
                  }}
                >
                  <div className="truncate">{b.batch_number}</div>
                  <div className="text-[9px] text-slate-400 font-normal mt-0.5">Qty: {b.available_quantity} • Exp: {new Date(b.expiry_date).toLocaleDateString()}</div>
                </div>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default SearchableBatchSelect;
