import React, { useState, useEffect, useRef } from "react";
import { Search, ChevronDown, Check } from "lucide-react";
import apiClient from "../../api/client";

export interface Doctor {
  doctor_id: number;
  first_name: string;
  last_name: string;
  specialization_name: string;
}

interface SearchableDoctorSelectProps {
  value: string | number;
  onChange: (doctorId: string) => void;
  placeholder?: string;
}

const SearchableDoctorSelect: React.FC<SearchableDoctorSelectProps> = ({
  value,
  onChange,
  placeholder = "Select doctor...",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchDoctors();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/doctors");
      if (response.data?.data) {
        setDoctors(response.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch doctors:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDoctors = doctors.filter((doc) => {
    const fullName = `${doc.first_name} ${doc.last_name}`.toLowerCase();
    const spec = (doc.specialization_name || "").toLowerCase();
    const search = searchTerm.toLowerCase();
    return fullName.includes(search) || spec.includes(search);
  });

  const selectedDoctor = doctors.find((d) => d.doctor_id.toString() === value?.toString());

  return (
    <div className={`relative ${isOpen ? "z-[60]" : "z-10"}`} ref={dropdownRef}>
      <div
        className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white cursor-pointer flex items-center justify-between min-h-[38px]"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={selectedDoctor ? "text-slate-900" : "text-slate-400"}>
          {selectedDoctor
            ? `${selectedDoctor.first_name} ${selectedDoctor.last_name} (${selectedDoctor.specialization_name})`
            : placeholder}
        </span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 flex flex-col overflow-hidden">
          <div className="p-2 border-b border-slate-100 flex items-center gap-2 sticky top-0 bg-white">
            <Search size={14} className="text-slate-400 shrink-0" />
            <input
              type="text"
              className="w-full text-sm outline-none bg-transparent"
              placeholder="Search by name or specialty..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="overflow-y-auto flex-1 p-1">
            {loading ? (
              <div className="p-3 text-sm text-slate-500 text-center">Loading doctors...</div>
            ) : filteredDoctors.length === 0 ? (
              <div className="p-3 text-sm text-slate-500 text-center">No doctors found</div>
            ) : (
              <>
                <div
                  className={`p-2 rounded-md cursor-pointer text-sm mb-1 ${
                    !value ? "bg-brand-primary/10 text-brand-primary font-medium" : "hover:bg-slate-50 text-slate-700"
                  }`}
                  onClick={() => {
                    onChange("");
                    setIsOpen(false);
                    setSearchTerm("");
                  }}
                >
                  None / Clear selection
                </div>
                {filteredDoctors.map((doc) => {
                  const isSelected = doc.doctor_id.toString() === value?.toString();
                  return (
                    <div
                      key={doc.doctor_id}
                      className={`p-2 rounded-md cursor-pointer text-sm flex flex-col ${
                        isSelected ? "bg-brand-primary/10 text-brand-primary" : "hover:bg-slate-50 text-slate-700"
                      }`}
                      onClick={() => {
                        onChange(doc.doctor_id.toString());
                        setIsOpen(false);
                        setSearchTerm("");
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {doc.first_name} {doc.last_name}
                        </span>
                        {isSelected && <Check size={14} />}
                      </div>
                      <span className="text-xs opacity-70">{doc.specialization_name}</span>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableDoctorSelect;
