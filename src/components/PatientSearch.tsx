import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Edit2,
  Stethoscope,
  Trash2,
  Loader2,
  User,
  Activity,
  ChevronRight,
  History,
  Printer,
  FileText,
  XCircle,
  IdCard,
} from "lucide-react";
import { patientService } from "../services/patient.service";
import { useNotification } from "../context/NotificationContext";

const PatientSearch: React.FC = () => {
  const navigate = useNavigate();
  const { notify } = useNotification();
  const [patients, setPatients] = useState<any[]>([]);
  const [activeMenu, setActiveMenu] = useState<number | null>(null);
  const [activeActionModal, setActiveActionModal] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveMenu(null);
    if (activeMenu !== null)
      window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, [activeMenu]);

  const latestQuery = React.useRef("");

  const performSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setPatients([]);
        return;
      }

      latestQuery.current = query;
      setIsSearching(true);
      try {
        const results = await patientService.searchPatients(query);

        // Only update state if this is still the most recent query
        if (latestQuery.current === query) {
          setPatients(results);
          if (results.length === 0) {
            notify(`No records found for "${query}"`, "info");
          }
        }
      } catch (err: any) {
        if (latestQuery.current === query) {
          console.error("[SEARCH_ERROR]", err);
          notify("Search failed: Could not connect to Patient Index", "error");
        }
      } finally {
        if (latestQuery.current === query) {
          setIsSearching(false);
        }
      }
    },
    [notify],
  );

  // Debounced search effect — Only auto-search after 3 characters
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.trim().length >= 3) {
        performSearch(searchTerm);
      } else if (searchTerm.trim().length === 0) {
        setPatients([]);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [searchTerm, performSearch]);

  const handlePatientAction = (patient: any, action: string) => {
    setActiveActionModal(null);
    switch (action) {
      case "view":
        // Navigate to Demographics with the MRN
        navigate(`/patients/demographics?mrn=${patient.mrn}`);
        break;
      case "documents":
        // Navigate to Documents with the MRN
        navigate(`/patients/documents?mrn=${patient.mrn}`);
        break;
      case "history":
        navigate(`/patients/history?mrn=${patient.mrn}`);
        break;
      case "print":
        window.open(`/print/demographics/${patient.mrn}`, "_blank");
        break;
      case "emr":
        navigate("/emr/chart", {
          state: {
            patient: {
              patientName: `${patient.demographics.first_name} ${patient.demographics.last_name}`,
              mrn: patient.mrn,
              age: `${patient.age}Y`,
            },
          },
        });
        break;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 ">
        <div>
          <h1 className=" font-semibold text-slate-800 tracking-tight flex items-center gap-3 ">
            <div className="p-2 bg-brand-primary text-white rounded-xl shadow-lg shadow-brand-active">
              <Search size={18} />
            </div>
            Patient Search & Directory
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Access the centralized Master Patient Index (MPI).
          </p>
        </div>


      {/* Primary Search Bar */}
      <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm relative group ">
        <div className="relative">
          <Search
            className={`absolute left-5 top-1/2 -translate-y-1/2 transition-colors duration-300 ${isSearching ? "text-brand-primary" : "text-slate-400"}`}
            size={24}
          />
          <input
            type="text"
            placeholder="Search by First Name, Last Name, Phone, or MRN..."
            className="w-full pl-14 pr-24 py-1 bg-slate-50 border-2 border-slate-100 rounded-[32px] text-lg font-bold text-slate-800 focus:bg-white focus:border-brand-active0 outline-none transition-all shadow-inner "
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
          />
          <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center gap-3">
            {isSearching && (
              <Loader2 size={20} className="text-brand-primary animate-spin" />
            )}
            <button
              onClick={() => performSearch(searchTerm)}
              className="p-1 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>


        <div>

          <button
            onClick={() => navigate("/patients/demographics")}
            className="flex items-center gap-2 bg-brand-primary text-white px-6 py-3 rounded-2xl font-bold hover:bg-brand-primary transition-all shadow-lg shadow-brand-active active:scale-95"
          >
            <Plus size={20} />
            Register New Patient
          </button>

        </div>

      </div>



      {/* Results Section */}
      <div className="bg-white rounded-[44px] border border-slate-200 overflow-visible shadow-sm min-h-[400px] mb-20">
        {patients.length > 0 ? (
          <div className="overflow-visible pb-32">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    MRN
                  </th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    Patient Identity
                  </th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    Age / Gender
                  </th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    Primary Contact
                  </th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    Payer Type
                  </th>
                  <th className="px-8 py-6"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {patients.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-brand-active/30 transition-colors group"
                  >
                    <td className="px-8 py-6">
                      <span className="text-xs font-mono font-black text-brand-primary bg-brand-active px-3 py-1.5 rounded-xl border border-brand-active uppercase tracking-tighter">
                        {p.mrn}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-[20px] bg-slate-100 flex items-center justify-center font-black text-slate-500 group-hover:bg-brand-primary group-hover:text-white transition-all shadow-sm">
                          {p.demographics.first_name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-base font-black text-slate-800">
                            {p.demographics.first_name}{" "}
                            {p.demographics.last_name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                            {p.demographics.email || "No email provided"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-sm font-black text-slate-700">
                        {p.age}Y <span className="text-slate-300 mx-1">/</span>{" "}
                        {p.demographics.gender}
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                        {p.demographics.date_of_birth}
                      </p>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-sm font-black text-slate-700">
                        {p.demographics.phone}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium truncate max-w-[150px]">
                        {p.demographics.address}
                      </p>
                    </td>
                    <td className="px-8 py-6">
                      <span
                        className={`text-[10px] font-black px-3 py-1 rounded-full border uppercase tracking-widest
                        ${p.payer ? "bg-indigo-50 text-indigo-600 border-indigo-100" : "bg-slate-50 text-slate-500 border-slate-200"}
                      `}
                      >
                        {p.payer?.payer_type || "Self-Pay"}
                      </span>
                    </td>
                    <td
                      className="px-8 py-6 text-right relative"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => setActiveActionModal(p)}
                        className="p-2.5 rounded-2xl transition-all text-slate-400 hover:text-slate-800 hover:bg-slate-100"
                      >
                        <MoreVertical size={20} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-32 flex flex-col items-center justify-center text-center px-10">
            {isSearching ? (
              <div className="space-y-6">
                <div className="w-20 h-20 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto shadow-xl" />
                <p className="text-lg font-black text-slate-800 uppercase tracking-widest">
                  Querying Global Patient Index
                </p>
              </div>
            ) : (
              <>
                <div className="w-24 h-24 bg-slate-50 rounded-[40px] flex items-center justify-center mb-6 shadow-inner border border-slate-100">
                  <User size={48} className="text-slate-200" />
                </div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                  No Patient Loaded
                </h3>
                <p className="text-slate-500 max-w-sm mx-auto mt-2 font-medium leading-relaxed">
                  Enter a query in the search bar above to retrieve records from
                  the hospital's unified database.
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Info Panel */}
      <div className="bg-brand-primary rounded-[44px] p-10 text-white relative overflow-hidden group shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-10">
          <div className="max-w-xl">
            <h4 className="text-2xl font-black tracking-tight mb-4">
              Master Index Integrity
            </h4>
            <p className="text-brand-active/70 text-sm leading-relaxed font-medium">
              All searches are logged for clinical auditing purposes. Search
              across MRN, Full Name, and Phone Number aliases. Patients not
              found here should be enrolled via the{" "}
              <span
                className="text-white font-black italic underline cursor-pointer"
                onClick={() => navigate("/patients/demographics")}
              >
                Registration
              </span>{" "}
              portal.
            </p>
          </div>
          <div className="p-8 bg-white/10 rounded-[40px] border border-white/10 flex items-center justify-center backdrop-blur-sm group-hover:scale-105 transition-transform duration-700">
            <Activity size={64} className="text-brand-primary animate-pulse" />
          </div>
        </div>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-brand-active0/10 rounded-full blur-3xl" />
      </div>

      {/* Action Modal (Grid Layout) */}
      {activeActionModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="bg-slate-50 px-6 py-5 border-b border-slate-100 flex justify-between items-start sticky top-0 z-10">
              <div>
                <h3 className="font-black text-slate-800 text-xl tracking-tight">
                  Patient Actions
                </h3>
                <p className="text-xs font-bold text-slate-500 mt-1 flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-700">
                    {activeActionModal.mrn}
                  </span>
                  {activeActionModal.demographics.first_name} {activeActionModal.demographics.last_name}
                </p>
              </div>
              <button
                onClick={() => setActiveActionModal(null)}
                className="text-slate-400 hover:text-red-500 bg-white hover:bg-red-50 p-2 rounded-full transition-all border border-slate-200 hover:border-red-200 shadow-sm"
              >
                <XCircle size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {/* View Details */}
                <button
                  onClick={() => handlePatientAction(activeActionModal, "view")}
                  className="flex flex-col items-center justify-center gap-3 p-5 bg-white border-2 border-slate-100 rounded-2xl hover:bg-slate-50 hover:border-slate-300 transition-all text-slate-700 group"
                >
                  <div className="p-4 bg-slate-100 rounded-2xl group-hover:scale-110 transition-transform">
                    <Eye size={28} className="text-slate-600" />
                  </div>
                  <span className="text-sm font-bold text-center">View Details</span>
                </button>

                {/* View Documents */}
                <button
                  onClick={() => handlePatientAction(activeActionModal, "documents")}
                  className="flex flex-col items-center justify-center gap-3 p-5 bg-white border-2 border-slate-100 rounded-2xl hover:bg-slate-50 hover:border-slate-300 transition-all text-slate-700 group"
                >
                  <div className="p-4 bg-slate-100 rounded-2xl group-hover:scale-110 transition-transform text-slate-600">
                    <FileText size={28} />
                  </div>
                  <span className="text-sm font-bold text-center">View Documents</span>
                </button>

                {/* Patient History */}
                <button
                  onClick={() => handlePatientAction(activeActionModal, "history")}
                  className="flex flex-col items-center justify-center gap-3 p-5 bg-white border-2 border-teal-50 rounded-2xl hover:bg-teal-50 hover:border-teal-200 transition-all text-teal-700 group shadow-sm hover:shadow-md shadow-teal-500/5"
                >
                  <div className="p-4 bg-teal-100 rounded-2xl group-hover:scale-110 transition-transform text-teal-600">
                    <History size={28} />
                  </div>
                  <span className="text-sm font-bold text-center">Patient History</span>
                </button>

                {/* Print Demographics */}
                <button
                  onClick={() => handlePatientAction(activeActionModal, "print")}
                  className="flex flex-col items-center justify-center gap-3 p-5 bg-white border-2 border-indigo-50 rounded-2xl hover:bg-indigo-50 hover:border-indigo-200 transition-all text-indigo-700 group shadow-sm hover:shadow-md shadow-indigo-500/5"
                >
                  <div className="p-4 bg-indigo-100 rounded-2xl group-hover:scale-110 transition-transform text-indigo-600">
                    <Printer size={28} />
                  </div>
                  <span className="text-sm font-bold text-center">Print Demographics</span>
                </button>

                {/* Print Patient ID */}
                <button
                  onClick={() => window.open(`/print/patient-card/${activeActionModal.mrn}`, "_blank")}
                  className="flex flex-col items-center justify-center gap-3 p-5 bg-white border-2 border-purple-50 rounded-2xl hover:bg-purple-50 hover:border-purple-200 transition-all text-purple-700 group shadow-sm hover:shadow-md shadow-purple-500/5"
                >
                  <div className="p-4 bg-purple-100 rounded-2xl group-hover:scale-110 transition-transform text-purple-600">
                    <IdCard size={28} />
                  </div>
                  <span className="text-sm font-bold text-center">Print Patient ID</span>
                </button>

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientSearch;
