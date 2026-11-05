import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Loader2, PlayCircle, Eye, ClipboardList, MapPin, Activity, RefreshCw, MoreVertical, Trash2 } from "lucide-react";
import { nursingService } from "../../services/nursingService";
import { LabourListRecord, LabourSession } from "../../types/nursing.types";
import StartSessionModal from "./StartSessionModal";
import SessionActionsModal from "./SessionActionsModal";
import EditSessionModal from "./EditSessionModal";
import { useNotification } from "../../context/NotificationContext";

const LabourAdmissions: React.FC = () => {
  const [admissions, setAdmissions] = useState<LabourListRecord[]>([]);
  const [sessions, setSessions] = useState<LabourSession[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchAdmissions, setSearchAdmissions] = useState("");
  const [searchSessions, setSearchSessions] = useState("");
  const [activeTab, setActiveTab] = useState<"admissions" | "sessions">("admissions");
  
  const [isStartSessionModalOpen, setIsStartSessionModalOpen] = useState(false);
  const [selectedAdmission, setSelectedAdmission] = useState<any | null>(null);
  const [activeMenu, setActiveMenu] = useState<number | string | null>(null);
  
  const [activeActionModal, setActiveActionModal] = useState<any | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedSessionForEdit, setSelectedSessionForEdit] = useState<any | null>(null);
  
  const navigate = useNavigate();
  const { notify } = useNotification();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [admRes, sesRes] = await Promise.all([
        nursingService.getLabourList(),
        nursingService.getLabourSessionList()
      ]);
      
      if (admRes.status === "success" && admRes.data) {
        setAdmissions(admRes.data);
      }
      if (sesRes.status === "success" && sesRes.data) {
        setSessions(sesRes.data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      notify("Failed to load records", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = () => setActiveMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleStartSession = (admission: LabourListRecord) => {
    const adaptedAdmission = {
      ...admission,
      first_name: admission.patient_name?.split(" ")[0] || admission.patient_name,
      last_name: admission.patient_name?.split(" ").slice(1).join(" ") || "",
      encounter_number: admission.encounter_number || admission.admission_number,
      room_number: admission.bed_label?.split("-")[0] || "",
      bed_number: admission.bed_label?.split("-")[1] || admission.bed_label,
    };
    setSelectedAdmission(adaptedAdmission);
    setIsStartSessionModalOpen(true);
  };

  const handleViewPartogram = (sessionId: number) => {
    navigate(`/nursing/partogram/${sessionId}`);
  };

  const handleDeleteSession = async (sessionId: number) => {
    if (window.confirm("Are you sure you want to delete this labour session? This cannot be undone.")) {
      try {
        const res = await nursingService.deleteLabourSession(sessionId);
        if (res.status === "success") {
          notify("Labour session deleted successfully", "success");
          fetchData();
        } else {
          notify(res.message || "Failed to delete session", "error");
        }
      } catch (error) {
        notify("Failed to delete session", "error");
      }
    }
  };

  // Map to unified structure for table rendering
  const unifiedAdmissions = admissions.map(a => ({
    id: `adm-${a.admission_id}`,
    patient_name: a.patient_name,
    mrn: a.mrn,
    dob: a.date_of_birth,
    adm_num: a.admission_number,
    doctor: a.attending_doctor,
    ward: a.ward_name,
    location: a.bed_label,
    status: a.labour_status,
    hours: a.hours_in_labour,
    weeks: a.gestational_age_weeks,
    session_id: a.session_id,
    original: a,
    isSession: false
  }));

  const unifiedSessions = sessions.map(s => ({
    id: `ses-${s.id}`,
    patient_name: s.patient_name,
    mrn: s.mrn || s.patient_mrn,
    dob: s.patient_date_of_birth,
    adm_num: s.admission_number,
    doctor: s.attending_doctor_name || s.admitting_doctor_name || "Unknown Doctor",
    ward: s.ward_name,
    location: `${s.room_number || ''} ${s.bed_number || ''}`.trim(),
    status: s.status,
    hours: null,
    weeks: s.gestational_age_weeks,
    session_id: s.id,
    original: s,
    isSession: true
  }));

  const filteredAdmissions = unifiedAdmissions.filter(
    (item) =>
      (item.patient_name || "").toLowerCase().includes(searchAdmissions.toLowerCase()) ||
      (item.mrn || "").includes(searchAdmissions) ||
      (item.adm_num || "").includes(searchAdmissions)
  );

  const filteredSessions = unifiedSessions.filter(
    (item) =>
      (item.patient_name || "").toLowerCase().includes(searchSessions.toLowerCase()) ||
      (item.mrn || "").includes(searchSessions) ||
      (item.adm_num || "").includes(searchSessions)
  );

  const currentFilteredData = activeTab === "admissions" ? filteredAdmissions : filteredSessions;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-[28px] border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending Admissions</p>
            <p className="text-3xl font-black text-slate-800">{unifiedAdmissions.length}</p>
          </div>
          <div className="p-3 bg-brand-active text-brand-primary rounded-2xl"><ClipboardList size={22}/></div>
        </div>
        <div className="bg-white p-5 rounded-[28px] border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Labour Sessions</p>
            <p className="text-3xl font-black text-emerald-600">{unifiedSessions.length || '—'}</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><Activity size={22}/></div>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-[40px] border border-slate-200 overflow-hidden shadow-sm">
        
        {/* Toolbar */}
        <div className="px-8 py-5 bg-white border-b border-slate-100 flex flex-col md:flex-row md:items-center gap-4">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl w-fit">
            <button
              onClick={() => setActiveTab('admissions')}
              className={`px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all whitespace-nowrap ${
                activeTab === 'admissions'
                  ? 'bg-white text-brand-primary shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Admission List
            </button>
            <button
              onClick={() => setActiveTab('sessions')}
              className={`px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all whitespace-nowrap ${
                activeTab === 'sessions'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Active Sessions
            </button>
          </div>

          {/* Search + Refresh */}
          <div className="flex items-center gap-3 ml-auto">
            <div className="relative w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by name, MRN, or admission no..."
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary/40 transition-all font-medium"
                value={activeTab === 'admissions' ? searchAdmissions : searchSessions}
                onChange={(e) => activeTab === 'admissions' ? setSearchAdmissions(e.target.value) : setSearchSessions(e.target.value)}
              />
            </div>
            <button
              onClick={fetchData}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-slate-100 transition-all"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        {/* Sub Header */}
        <div className="px-8 py-4 border-b border-slate-100 bg-slate-50/30">
          <h3 className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 ${activeTab === 'admissions' ? 'text-brand-primary' : 'text-emerald-600'}`}>
            {activeTab === 'admissions' ? <ClipboardList size={14} /> : <Activity size={14} />}
            {activeTab === 'admissions' ? 'Pending Labour Admissions' : 'Active Labour Sessions'}
          </h3>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto pb-24 min-h-[400px]">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="px-6 py-4">Patient Details</th>
                <th className="px-6 py-4">Admission Info</th>
                {activeTab === "sessions" && (
                  <th className="px-6 py-4">Labour Status</th>
                )}
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <Loader2 size={36} className={`animate-spin mx-auto mb-3 ${activeTab === 'admissions' ? 'text-brand-primary' : 'text-emerald-600'}`} />
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Records...</p>
                  </td>
                </tr>
              ) : currentFilteredData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    {activeTab === "admissions" ? (
                      <ClipboardList size={40} className="mx-auto text-slate-300 mb-4" />
                    ) : (
                      <Activity size={40} className="mx-auto text-slate-300 mb-4" />
                    )}
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No records found</p>
                  </td>
                </tr>
              ) : currentFilteredData.map((item) => (
                <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors cursor-pointer">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-black text-xs shrink-0">
                        {item.patient_name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800">{item.patient_name}</p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-mono font-bold text-brand-primary">MRN: {item.mrn}</span>
                          {item.dob && <span className="text-[10px] font-bold text-slate-400">• DOB: {item.dob}</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-bold text-slate-700">{item.adm_num}</span>
                      <span className="text-[10px] font-medium text-slate-400">
                        {item.doctor ? `Dr. ${item.doctor}` : ""}
                      </span>
                    </div>
                  </td>
                  {activeTab === "sessions" && (
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5">
                        <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border bg-emerald-50 text-emerald-700 border-emerald-200 w-fit">
                          {item.status || "Active"}
                        </span>
                        <span className="text-[10px] font-medium text-slate-400 mt-1">
                          {item.hours ? `${item.hours} hrs in labour` : (item.weeks ? `${item.weeks} weeks` : "N/A")}
                        </span>
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-sm font-bold text-slate-600">
                      <MapPin size={13} className="text-slate-400" />
                      {item.ward}
                    </div>
                    {item.location && (
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5 ml-4.5">{item.location}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveActionModal(item);
                      }}
                      className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-full hover:bg-slate-700 transition-colors inline-flex items-center gap-2"
                    >
                      Action <span className="text-[10px]">▼</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isStartSessionModalOpen && selectedAdmission && (
        <StartSessionModal
          admission={selectedAdmission}
          onClose={() => setIsStartSessionModalOpen(false)}
          onSuccess={(sessionId) => {
            setIsStartSessionModalOpen(false);
            navigate(`/nursing/partogram/${sessionId}`);
          }}
        />
      )}

      {activeActionModal && (
        <SessionActionsModal
          session={activeActionModal}
          onClose={() => setActiveActionModal(null)}
          onView={() => handleViewPartogram(activeActionModal.session_id)}
          onEdit={() => {
            setSelectedSessionForEdit(activeActionModal.original);
            setIsEditModalOpen(true);
          }}
          onDelete={() => handleDeleteSession(activeActionModal.session_id)}
          onStart={() => handleStartSession(activeActionModal.original)}
          isPending={activeTab === 'admissions'}
        />
      )}

      {isEditModalOpen && selectedSessionForEdit && (
        <EditSessionModal
          session={selectedSessionForEdit}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={() => {
            setIsEditModalOpen(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
};

export default LabourAdmissions;
