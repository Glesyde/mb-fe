import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, Search, X, AlertCircle } from "lucide-react";
import { emrService } from "../services/emr.service";

interface DiagnosisOption {
  code: string;
  description: string;
  chapter_code: string;
  chapter_name: string;
  category: string;
  specialization_id: number | null;
}

interface DiagnosisDropdownProps {
  value: string; // icd10_code
  onSelect: (code: string, description: string, isOthers: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
}

const DiagnosisDropdown: React.FC<DiagnosisDropdownProps> = ({
  value,
  onSelect,
  disabled = false,
  placeholder = "Search or select diagnosis...",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [diagnoses, setDiagnoses] = useState<DiagnosisOption[]>([]);
  const [filteredDiagnoses, setFilteredDiagnoses] = useState<DiagnosisOption[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [selectedDiagnosis, setSelectedDiagnosis] =
    useState<DiagnosisOption | null>(null);
  const [showOthersInput, setShowOthersInput] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch ICD10 diagnoses on mount
  useEffect(() => {
    const fetchDiagnoses = async () => {
      setLoading(true);
      try {
        const data = await emrService.getICD10DiagnosisList();
        setDiagnoses(data);
        setFilteredDiagnoses(data);
      } catch (err) {
        console.error("Failed to fetch diagnoses", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDiagnoses();
  }, []);

  // Filter diagnoses based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredDiagnoses(diagnoses);
      setShowOthersInput(false);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = diagnoses.filter(
      (d) =>
        d.code.toLowerCase().includes(term) ||
        d.description.toLowerCase().includes(term) ||
        d.category.toLowerCase().includes(term),
    );
    setFilteredDiagnoses(filtered);
  }, [searchTerm, diagnoses]);

  // Handle click outside to close dropdown
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

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelectDiagnosis = (diagnosis: DiagnosisOption) => {
    setSelectedDiagnosis(diagnosis);
    setSearchTerm("");
    setShowOthersInput(false);
    onSelect(diagnosis.code, diagnosis.description, false);
    setIsOpen(false);
  };

  const handleOthersSelect = () => {
    setShowOthersInput(true);
    setSearchTerm("");
  };

  const handleOthersSubmit = (customDescription: string) => {
    if (customDescription.trim()) {
      setSelectedDiagnosis({
        code: "0",
        description: customDescription,
        chapter_code: "",
        chapter_name: "Custom",
        category: "Other",
        specialization_id: null,
      });
      onSelect("0", customDescription, true);
      setShowOthersInput(false);
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    setSelectedDiagnosis(null);
    setSearchTerm("");
    setShowOthersInput(false);
    onSelect("", "", false);
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Main Dropdown Button */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`flex items-center justify-between w-full p-3 border rounded-xl transition-all cursor-pointer ${
          disabled
            ? "bg-slate-100 border-slate-200 cursor-not-allowed"
            : "bg-white border-slate-300 hover:border-slate-400"
        } ${isOpen ? "border-brand-active0 ring-2 ring-brand-active" : ""}`}
      >
        <div className="flex-1 min-w-0">
          {selectedDiagnosis ? (
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-brand-primary bg-brand-active px-2 py-0.5 rounded text-xs">
                {selectedDiagnosis.code}
              </span>
              <span className="text-slate-800 font-medium text-sm truncate">
                {selectedDiagnosis.description}
              </span>
            </div>
          ) : (
            <span className="text-slate-400 text-sm">{placeholder}</span>
          )}
        </div>
        <div className="flex items-center gap-1 ml-2">
          {selectedDiagnosis && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"
            >
              <X size={16} />
            </button>
          )}
          <ChevronDown
            size={20}
            className={`text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-slate-300 rounded-xl shadow-lg">
          {/* Search Input */}
          <div className="p-3 border-b border-slate-200 sticky top-0 bg-white">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <Search size={16} className="text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search by code, name, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 bg-slate-50 outline-none text-sm text-slate-900 placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="p-6 text-center">
              <div className="inline-block animate-spin">
                <div className="w-6 h-6 border-2 border-brand-active0 border-t-transparent rounded-full"></div>
              </div>
              <p className="text-sm text-slate-500 mt-2">
                Loading diagnoses...
              </p>
            </div>
          ) : showOthersInput ? (
            /* Custom Diagnosis Input */
            <OthersInput
              onSubmit={handleOthersSubmit}
              onCancel={() => setShowOthersInput(false)}
            />
          ) : (
            <>
              {/* Diagnoses List */}
              <div className="max-h-80 overflow-y-auto">
                {filteredDiagnoses.length === 0 ? (
                  <div className="p-6">
                    <div className="flex flex-col items-center justify-center gap-2">
                      {searchTerm && (
                        <>
                          <AlertCircle size={24} className="text-slate-300" />
                          <p className="text-sm text-slate-500">
                            No matches found for "{searchTerm}"
                          </p>
                          <p className="text-xs text-slate-400">
                            Click "Others" to add custom diagnosis
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredDiagnoses.map((diagnosis) => (
                      <button
                        key={diagnosis.code}
                        onClick={() => handleSelectDiagnosis(diagnosis)}
                        className="w-full px-4 py-3 text-left hover:bg-brand-active transition-colors border-b border-slate-100 last:border-0"
                      >
                        <div className="flex items-start gap-3">
                          <span className="font-mono font-bold text-brand-primary bg-brand-active px-2 py-0.5 rounded text-xs whitespace-nowrap mt-0.5">
                            {diagnosis.code}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-800 text-sm">
                              {diagnosis.description}
                            </p>
                            <div className="flex gap-2 mt-1">
                              <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                                {diagnosis.category}
                              </span>
                              <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                                {diagnosis.chapter_name}
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Others Option */}
              <div className="border-t border-slate-200 p-3 bg-slate-50">
                <button
                  onClick={handleOthersSelect}
                  className="w-full px-4 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Plus size={16} />
                  <span>Others (Manual Entry)</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

interface OthersInputProps {
  onSubmit: (description: string) => void;
  onCancel: () => void;
}

const OthersInput: React.FC<OthersInputProps> = ({ onSubmit, onCancel }) => {
  const [customDescription, setCustomDescription] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="p-4 border-b border-slate-200">
      <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">
        Enter Custom Diagnosis
      </label>
      <textarea
        ref={inputRef}
        value={customDescription}
        onChange={(e) => setCustomDescription(e.target.value)}
        placeholder="Describe the diagnosis..."
        className="w-full p-3 border border-slate-300 rounded-lg text-sm resize-none outline-none focus:border-brand-active0 focus:ring-2 focus:ring-brand-active"
        rows={3}
      />
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => onSubmit(customDescription)}
          disabled={!customDescription.trim()}
          className="flex-1 bg-brand-primary hover:bg-brand-primary disabled:bg-slate-300 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all"
        >
          Add Diagnosis
        </button>
        <button
          onClick={onCancel}
          className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold transition-all"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

// Missing icon import - add to top
const Plus = ({ size }: { size: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

export default DiagnosisDropdown;
