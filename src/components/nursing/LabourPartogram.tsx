import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Plus, Loader2, Activity, Maximize, Minimize2, Edit, MoreVertical, Trash2 } from "lucide-react";
import { nursingService } from "../../services/nursingService";
import {
  LabourSession,
  PartogramObservation,
  PartogramChartData,
  CtgObservation,
} from "../../types/nursing.types";
import PartographChart from "./PartographChart";
import AddObservationModal from "./AddObservationModal";
import EditSessionModal from "./EditSessionModal";
import EditObservationModal from "./EditObservationModal";
import DeleteObservationModal from "./DeleteObservationModal";
import ObservationActionModal from "./ObservationActionModal";
import AddCtgObservationModal from "./AddCtgObservationModal";
import EditCtgObservationModal from "./EditCtgObservationModal";
import DeleteCtgObservationModal from "./DeleteCtgObservationModal";
import { useNotification } from "../../context/NotificationContext";

const LabourPartogram: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { notify } = useNotification();

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<LabourSession | null>(null);
  const [observations, setObservations] = useState<PartogramObservation[]>([]);
  const [ctgObservations, setCtgObservations] = useState<CtgObservation[]>([]);
  const [chartData, setChartData] = useState<PartogramChartData | null>(null);
  
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddCtgModalOpen, setIsAddCtgModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const [activeObsMenu, setActiveObsMenu] = useState<number | null>(null);
  const [selectedObsForEdit, setSelectedObsForEdit] = useState<PartogramObservation | null>(null);
  const [selectedObsForDelete, setSelectedObsForDelete] = useState<number | null>(null);

  const [activeCtgMenu, setActiveCtgMenu] = useState<number | null>(null);
  const [selectedCtgForEdit, setSelectedCtgForEdit] = useState<CtgObservation | null>(null);
  const [selectedCtgForDelete, setSelectedCtgForDelete] = useState<number | null>(null);

  const [activeTab, setActiveTab] = useState<"partogram" | "ctg">("partogram");
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const chartContainerRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    if (!sessionId) return;
    try {
      setLoading(true);
      const sid = parseInt(sessionId, 10);
      
      const [sessionRes, obsRes, chartRes, ctgRes] = await Promise.all([
        nursingService.getLabourSession(sid),
        nursingService.getObservations(sid),
        nursingService.getChartData(sid),
        nursingService.getCtgObservations(sid),
      ]);

      if (sessionRes.status === "success" && sessionRes.data) {
        setSession(sessionRes.data);
      }
      
      if (obsRes.status === "success" && obsRes.data) {
        setObservations(obsRes.data);
      }
      
      if (chartRes.status === "success" && chartRes.data) {
        setChartData(chartRes.data);
      }
      
      if (ctgRes.status === "success" && ctgRes.data) {
        setCtgObservations(ctgRes.data);
      }
    } catch (error) {
      console.error("Error fetching partogram data:", error);
      notify("Failed to load partogram data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [sessionId]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      chartContainerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const handleActionSelect = (action: "partogram" | "ctg") => {
    setIsActionModalOpen(false);
    if (action === "partogram") {
      setIsAddModalOpen(true);
    } else {
      setIsAddCtgModalOpen(true);
    }
  };

  const handleAddObservationSuccess = () => {
    setIsAddModalOpen(false);
    notify("Observation added successfully", "success");
    fetchData(); // Refresh data
  };

  const handleAddCtgSuccess = () => {
    setIsAddCtgModalOpen(false);
    notify("CTG observation added successfully", "success");
    fetchData(); // Refresh data
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-white rounded-[40px] shadow-sm border border-slate-200 min-h-[400px]">
        <div className="flex flex-col items-center">
          <Loader2 className="w-10 h-10 animate-spin text-brand-primary mb-4" />
          <p className="text-sm font-bold text-slate-400">Loading session data...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-white rounded-[40px] shadow-sm border border-slate-200 min-h-[400px] p-6 text-center">
        <Activity className="w-12 h-12 text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Session Not Found</h2>
        <p className="text-sm font-medium text-slate-400 mt-2 mb-6">The labour session you are looking for does not exist or has been removed.</p>
        <button
          onClick={() => navigate("/nursing/admissions")}
          className="px-6 py-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors font-bold text-sm"
        >
          Back to Admissions
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/nursing/admissions")}
            className="p-2.5 bg-white border border-slate-200 text-slate-400 hover:text-brand-primary hover:bg-brand-active hover:border-brand-active rounded-xl transition-all shadow-sm"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
              <span className="truncate">Labour Partogram</span>
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <span className="text-xs font-bold text-brand-primary bg-brand-active px-2.5 py-1 rounded-md border border-brand-active">
                {session.patient_name}
              </span>
              <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">MRN: {session.patient_mrn}</span>
              <span className="hidden md:inline text-slate-300">•</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9.5px] font-bold uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100">
                {session.status}
              </span>
            </div>
          </div>
        </div>
        
        <button
          onClick={() => setIsActionModalOpen(true)}
          className="px-5 py-2.5 bg-brand-primary text-white rounded-xl shadow-sm hover:bg-brand-secondary transition-all flex items-center gap-2 font-bold text-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Observation</span>
        </button>
      </div>

      {/* Patient Demographics & Session Info Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <InfoCard label="Gravida" value={session.gravida.toString()} />
        <InfoCard label="Para" value={session.para.toString()} />
        <InfoCard label="Gestational Age" value={`${session.gestational_age_weeks} wks`} />
        <InfoCard label="Membranes" value={session.membranes_state} />
        <InfoCard label="Blood Group" value={session.blood_group} />
        <InfoCard label="GBS Status" value={session.gbs_status} />
        <InfoCard label="HIV Status" value={session.hiv_status} />
        <InfoCard label="Analgesia" value={session.analgesia_plan} />
      </div>

      {/* Chart Section */}
      <div 
        ref={chartContainerRef}
        className={`bg-white transition-all overflow-hidden ${
          isFullscreen 
            ? 'w-full h-full z-[9999] rounded-none overflow-y-auto flex flex-col' 
            : 'rounded-[32px] md:rounded-[40px] shadow-sm border border-slate-200 relative group'
        }`}
      >
        <div className={`border-b border-slate-100 flex items-center justify-between bg-slate-50/30 ${isFullscreen ? 'p-6 md:p-8 shrink-0' : 'p-5 md:p-6'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 bg-brand-active text-brand-primary rounded-xl shrink-0 ${isFullscreen ? 'block' : 'hidden'}`}>
              <Activity size={24} />
            </div>
            <div>
              <h3 className={`font-black text-slate-800 tracking-tight flex items-center gap-2 ${isFullscreen ? 'text-xl md:text-2xl' : 'uppercase tracking-wide text-xs'}`}>
                {!isFullscreen && <Activity className="w-4 h-4 text-brand-primary" />}
                WHO Partograph {isFullscreen && '- Full Screen'}
              </h3>
              {isFullscreen && session && (
                 <p className="text-xs font-bold text-slate-400 mt-0.5">{session.patient_name} • MRN: {session.patient_mrn}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!isFullscreen && (
              <span className="text-[10px] font-bold text-slate-400 bg-white border border-slate-100 px-3 py-1.5 rounded-lg shadow-sm">
                Started: {new Date(session.created_at).toLocaleString()}
              </span>
            )}
            <button 
              onClick={toggleFullscreen}
              className={`transition-colors flex items-center gap-2 ${
                isFullscreen
                 ? 'px-4 py-2 bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 rounded-xl font-bold text-sm'
                 : 'p-1.5 text-slate-400 hover:text-brand-primary hover:bg-brand-active rounded-lg border border-transparent hover:border-brand-primary/20'
              }`}
              title={isFullscreen ? "Exit Full Screen" : "View Full Screen"}
            >
              {isFullscreen ? <><Minimize2 className="w-4 h-4" /> Close</> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>
        
        <div className={`overflow-x-auto bg-slate-50/10 ${isFullscreen ? 'p-6 md:p-12 flex-1 flex justify-center items-start overflow-y-auto' : 'p-4 md:p-6'}`}>
           <div className={isFullscreen ? 'bg-white rounded-[32px] p-6 shadow-xl border border-slate-200 w-full max-w-7xl shrink-0' : 'w-full'}>
              {chartData && <PartographChart data={chartData} />}
           </div>
        </div>
      </div>

      {/* Observations Table Section */}
      <div className="bg-white rounded-[32px] md:rounded-[40px] shadow-sm border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/30 flex items-center">
          <button
            onClick={() => setActiveTab("partogram")}
            className={`px-6 py-5 text-xs font-black uppercase tracking-widest border-b-2 transition-colors ${
              activeTab === "partogram"
                ? "border-brand-primary text-brand-primary bg-white"
                : "border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50"
            }`}
          >
            Partogram Logs
          </button>
          <button
            onClick={() => setActiveTab("ctg")}
            className={`px-6 py-5 text-xs font-black uppercase tracking-widest border-b-2 transition-colors ${
              activeTab === "ctg"
                ? "border-emerald-500 text-emerald-600 bg-white"
                : "border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50"
            }`}
          >
            CTG Logs
          </button>
        </div>
        <div className="overflow-x-auto">
          {activeTab === "partogram" ? (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Time</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Hr of Labour</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Dilation</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Descent</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">FHR (bpm)</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Contractions</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Liquor</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap text-right">Recorded By</th>
                  <th className="px-6 py-5 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {observations.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center">
                      <p className="text-sm font-bold text-slate-400">No partogram observations recorded yet.</p>
                    </td>
                  </tr>
                ) : (
                  observations.map((obs) => (
                    <tr key={obs.id} className="hover:bg-slate-50/30 transition-colors group cursor-pointer">
                      <td className="px-6 py-4 text-xs font-black text-slate-800 whitespace-nowrap">{obs.observation_time}</td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-600">Hour {obs.hour_of_labour}</td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-600">{obs.cervical_dilation_display}</td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-600">{obs.fetal_descent_fifths}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${
                          obs.fetal_heart_rate_bpm < 110 || obs.fetal_heart_rate_bpm > 160 
                            ? 'bg-red-50 text-red-600 border-red-100 animate-pulse' 
                            : 'bg-slate-50 text-slate-600 border-slate-100 group-hover:bg-brand-active group-hover:text-brand-primary group-hover:border-brand-active transition-colors'
                        }`}>
                          {obs.fetal_heart_rate_display}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-600 whitespace-nowrap">
                        {obs.contractions_frequency}/10m <span className="text-[10px] font-medium text-slate-400 ml-1">({obs.contractions_duration_label})</span>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-600">{obs.liquor_state}</td>
                      <td className="px-6 py-4 text-[10px] font-bold text-slate-400 text-right">{obs.recorded_by_display}</td>
                      <td className="px-6 py-4 text-right relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveObsMenu(activeObsMenu === obs.id ? null : obs.id);
                          }}
                          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                        >
                          <MoreVertical size={16} />
                        </button>
  
                        {activeObsMenu === obs.id && (
                          <div className="absolute right-8 top-10 w-36 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-10 animate-in fade-in slide-in-from-top-2 text-left">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveObsMenu(null);
                                setSelectedObsForEdit(obs);
                              }}
                              className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-amber-600 flex items-center gap-2"
                            >
                              <Edit size={14} /> Edit
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveObsMenu(null);
                                setSelectedObsForDelete(obs.id);
                              }}
                              className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-red-50 hover:text-red-600 flex items-center gap-2 border-t border-slate-100"
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Time</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">FHR (bpm)</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Contractions</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Comment</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap text-right">Recorded By</th>
                  <th className="px-6 py-5 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {ctgObservations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <p className="text-sm font-bold text-slate-400">No CTG observations recorded yet.</p>
                    </td>
                  </tr>
                ) : (
                  ctgObservations.map((obs) => (
                    <tr key={obs.id} className="hover:bg-slate-50/30 transition-colors group cursor-pointer">
                      <td className="px-6 py-4 text-xs font-black text-slate-800 whitespace-nowrap">
                        {new Date(obs.observation_datetime).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${
                          obs.fetal_heart_rate_bpm < 110 || obs.fetal_heart_rate_bpm > 160 
                            ? 'bg-red-50 text-red-600 border-red-100 animate-pulse' 
                            : 'bg-emerald-50 text-emerald-600 border-emerald-100 group-hover:bg-emerald-100 transition-colors'
                        }`}>
                          {obs.fetal_heart_rate_bpm}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-600 whitespace-nowrap">
                        {obs.contractions_frequency}/10m <span className="text-[10px] font-medium text-slate-400 ml-1">({obs.contractions_duration})</span>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-600 max-w-xs truncate">
                        {obs.comment || "-"}
                      </td>
                      <td className="px-6 py-4 text-[10px] font-bold text-slate-400 text-right">{obs.recorded_by_name}</td>
                      <td className="px-6 py-4 text-right relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveCtgMenu(activeCtgMenu === obs.id ? null : obs.id);
                          }}
                          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                        >
                          <MoreVertical size={16} />
                        </button>
  
                        {activeCtgMenu === obs.id && (
                          <div className="absolute right-8 top-10 w-36 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-10 animate-in fade-in slide-in-from-top-2 text-left">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveCtgMenu(null);
                                setSelectedCtgForEdit(obs);
                              }}
                              className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-amber-600 flex items-center gap-2"
                            >
                              <Edit size={14} /> Edit
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveCtgMenu(null);
                                setSelectedCtgForDelete(obs.id);
                              }}
                              className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-red-50 hover:text-red-600 flex items-center gap-2 border-t border-slate-100"
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isActionModalOpen && session && (
        <ObservationActionModal
          session={session}
          onClose={() => setIsActionModalOpen(false)}
          onSelectAction={handleActionSelect}
        />
      )}

      {isAddModalOpen && sessionId && (
        <AddObservationModal
          sessionId={parseInt(sessionId, 10)}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={handleAddObservationSuccess}
        />
      )}

      {isAddCtgModalOpen && sessionId && (
        <AddCtgObservationModal
          sessionId={parseInt(sessionId, 10)}
          onClose={() => setIsAddCtgModalOpen(false)}
          onSuccess={handleAddCtgSuccess}
        />
      )}

      {isEditModalOpen && session && (
        <EditSessionModal
          session={session}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={(updatedSession) => {
            setIsEditModalOpen(false);
            setSession(updatedSession);
            fetchData();
          }}
        />
      )}

      {selectedObsForEdit && sessionId && (
        <EditObservationModal
          observation={selectedObsForEdit}
          sessionId={parseInt(sessionId, 10)}
          onClose={() => setSelectedObsForEdit(null)}
          onSuccess={() => {
            setSelectedObsForEdit(null);
            fetchData();
          }}
        />
      )}

      {selectedObsForDelete && (
        <DeleteObservationModal
          observationId={selectedObsForDelete}
          onClose={() => setSelectedObsForDelete(null)}
          onSuccess={() => {
            setSelectedObsForDelete(null);
            fetchData();
          }}
        />
      )}

      {selectedCtgForEdit && (
        <EditCtgObservationModal
          observation={selectedCtgForEdit}
          onClose={() => setSelectedCtgForEdit(null)}
          onSuccess={() => {
            setSelectedCtgForEdit(null);
            fetchData();
          }}
        />
      )}

      {selectedCtgForDelete && (
        <DeleteCtgObservationModal
          observationId={selectedCtgForDelete}
          onClose={() => setSelectedCtgForDelete(null)}
          onSuccess={() => {
            setSelectedCtgForDelete(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
};

const InfoCard = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-center items-center text-center shadow-sm hover:border-brand-primary/20 hover:shadow-md transition-all group">
    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5 group-hover:text-brand-primary transition-colors">{label}</span>
    <span className="text-sm font-black text-slate-800">{value || "-"}</span>
  </div>
);

export default LabourPartogram;
