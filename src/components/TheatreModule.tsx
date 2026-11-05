import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Calendar,
  Clock,
  User,
  Activity,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Play,
  CheckSquare,
  DollarSign,
  FileText,
  BedDouble,
  Eye,
  Loader2,
  ChevronRight,
  PenTool,
  ClipboardList,
  ArrowLeft,
  MonitorPlay,
  FileSignature,
  HeartPulse,
  HeartHandshake,
  ListChecks, Users, 
  Droplets, UserCheck, 
  FileEdit, Monitor, Receipt,
} from "lucide-react";
import {
  otService,
  OTRoom,
  OTRequest,
  OTSurgery,
} from "../services/ot.service";
import { useNotification } from "../context/NotificationContext";
import ConsentModal from "./ConsentModal";
import OTChecklistModal from "./OTChecklistModal";
import { PreopHuddleModal } from "./PreopHuddleModal";
import { OTAnaesthesiaMonitoringModal } from "./OTAnaesthesiaMonitoringModal";
import { OTCardiacAnaesthesiaMonitoringModal } from "./OTCardiacAnaesthesiaMonitoringModal";
import { OTPerfusionMonitoringModal } from "./OTPerfusionMonitoringModal";
import OperativeNoteModal from "./OperativeNoteModal";
import OTBoardView from "./OTBoardView";

const TheatreSchedule: React.FC = () => {
  const { notify } = useNotification();
  const [activeTab, setActiveTab] = useState<"board" | "requests" | "rooms">(
    "board",
  );
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Data State
  const [surgeries, setSurgeries] = useState<OTSurgery[]>([]);
  const [requests, setRequests] = useState<OTRequest[]>([]);
  const [rooms, setRooms] = useState<OTRoom[]>([]);

  // Modal State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<OTRequest | null>(
    null,
  );
  const [scheduleForm, setScheduleForm] = useState({
    ot_case_id: 0,
    ot_room_id: "",
    scheduled_date: "",
    scheduled_time: "",
  });

  // Details Modal State
  const [viewSurgery, setViewSurgery] = useState<OTSurgery | null>(null);
  const [viewRequest, setViewRequest] = useState<OTRequest | null>(null);
  const [viewRoomSchedule, setViewRoomSchedule] = useState<OTRoom | null>(null);

  // Consent Modal State
  const [consentModalOpen, setConsentModalOpen] = useState(false);
  const [selectedSurgeryForConsent, setSelectedSurgeryForConsent] =
    useState<OTSurgery | null>(null);

  // Room Creation State
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");

  // OT Checklist Modal State
  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false);
  const [selectedSurgeryForChecklist, setSelectedSurgeryForChecklist] =
    useState<OTSurgery | null>(null);

  // Pre-op Huddle Modal State (T2)
  const [isHuddleModalOpen, setIsHuddleModalOpen] = useState(false);
  const [selectedSurgeryForHuddle, setSelectedSurgeryForHuddle] =
    useState<OTSurgery | null>(null);

    // Anaesthesia Monitoring Modal State
  const [isAnaesthesiaModalOpen, setIsAnaesthesiaModalOpen] = useState(false);
  const [selectedSurgeryForAnaesthesia, setSelectedSurgeryForAnaesthesia] = 
    useState<OTSurgery | null>(null);

    // Cardaic Anaesthesia Monitoring Modal State
  const [isCardiacAnaesthesiaModalOpen, setIsCardiacAnaesthesiaModalOpen] = useState(false);
  const [selectedSurgeryForCardiacAnaesthesia, setSelectedSurgeryForCardiacAnaesthesia] = 
    useState<OTSurgery | null>(null);
    
    // Perfusionist Monitoring Modal State
  const [isPerfusionistModalOpen, setIsPerfusionistModalOpen] = useState(false);
  const [selectedSurgeryForPerfusionist, setSelectedSurgeryForPerfusionist] = 
    useState<OTSurgery | null>(null);

  // Operative Note Modal State
  const [isOperativeNoteModalOpen, setIsOperativeNoteModalOpen] = useState(false);
  const [selectedSurgeryForNote, setSelectedSurgeryForNote] =
    useState<OTSurgery | null>(null);

  // OT Board State
  const [boardCase, setBoardCase] = useState<{ id: number; caseNumber?: string } | null>(null);

  // Action Modal State
  const [activeActionModal, setActiveActionModal] = useState<OTSurgery | null>(null);

  // Filters State
  const [boardSearchTerm, setBoardSearchTerm] = useState("");
  const [boardStatusFilter, setBoardStatusFilter] = useState("ALL");
  const [boardDateFilter, setBoardDateFilter] = useState("ALL");

  const filteredSurgeries = React.useMemo(() => {
    return surgeries.filter(s => {
      const term = boardSearchTerm.toLowerCase();
      const matchesSearch = !term || 
        s.first_name?.toLowerCase().includes(term) ||
        s.last_name?.toLowerCase().includes(term) ||
        s.mrn?.toLowerCase().includes(term) ||
        s.surgery_name?.toLowerCase().includes(term) ||
        s.room_name?.toLowerCase().includes(term);
      
      const matchesStatus = boardStatusFilter === "ALL" || s.status === boardStatusFilter;
      
      let matchesDate = true;
      if (boardDateFilter !== "ALL" && s.scheduled_date) {
        const todayStr = new Date().toISOString().split("T")[0];
        if (boardDateFilter === "TODAY") {
          matchesDate = s.scheduled_date === todayStr;
        } else if (boardDateFilter === "UPCOMING") {
          matchesDate = s.scheduled_date > todayStr;
        } else if (boardDateFilter === "PAST") {
          matchesDate = s.scheduled_date < todayStr;
        }
      }
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [surgeries, boardSearchTerm, boardStatusFilter, boardDateFilter]);

  // Initial Data Fetch
  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Always fetch surgeries to have counts available for rooms
      const surgeriesData = await otService.getSurgeries();
      setSurgeries(surgeriesData);

      if (activeTab === "requests") {
        const reqs = await otService.getRequests();
        setRequests(reqs);
        const roomData = await otService.getRooms();
        setRooms(roomData);
      } else if (activeTab === "rooms") {
        const roomData = await otService.getRooms();
        setRooms(roomData);
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message || "Failed to load data";
      notify(errorMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  // Handlers
  const handleScheduleClick = (req: OTRequest) => {
    // Find room ID from preferred room name
    const preferredRoom = rooms.find(
      (r) => r.room_name === req.preferred_ot_room,
    );

    setSelectedRequest(req);
    setScheduleForm({
      ot_case_id: req.ot_case_id,
      ot_room_id: preferredRoom?.id?.toString() || "",
      scheduled_date: req.preferred_surgery_date,
      scheduled_time: req.preferred_surgery_time,
    });
    setIsScheduleModalOpen(true);
  };

  const submitSchedule = async () => {
    if (
      !selectedRequest ||
      !scheduleForm.ot_room_id ||
      !scheduleForm.scheduled_date ||
      !scheduleForm.scheduled_time
    ) {
      notify("Please fill all required fields", "error");
      return;
    }

    setSubmitting(true);
    try {
      await otService.scheduleSurgery({
        ot_case_id: scheduleForm.ot_case_id,
        ot_room_id: parseInt(scheduleForm.ot_room_id),
        scheduled_date: scheduleForm.scheduled_date,
        scheduled_time: scheduleForm.scheduled_time,
      });
      notify("Surgery scheduled successfully", "success");
      setIsScheduleModalOpen(false);
      fetchData(); // Refresh list
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message || "Failed to schedule surgery";
      notify(errorMsg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) return;
    try {
      await otService.createRoom({ room_name: newRoomName });
      notify("OT Room created successfully", "success");
      setNewRoomName("");
      setIsRoomModalOpen(false);
      fetchData();
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message || "Failed to create room";
      notify(errorMsg, "error");
    }
  };

  const handleStatusAction = async (
    action: "start" | "complete" | "cancel" | "clearance" | "check-in",
    id: number,
  ) => {
    setActiveActionModal(null); // Close modal
    try {
      if (action === "start") await otService.startSurgery(id);
      if (action === "complete") await otService.completeSurgery(id);
      if (action === "cancel") await otService.cancelSurgery(id);
      if (action === "clearance") await otService.billingClearance(id);
      if (action === "check-in")
        await otService.updateSurgery({ id, status: "CHECKED_IN" });

      const actionText = action === "check-in" ? "checked in" : `${action}ed`;
      notify(`Surgery ${actionText} successfully`, "success");
      fetchData();
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message || `Failed to ${action} surgery`;
      notify(errorMsg, "error");
    }
  };

  // Render Helpers
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      REQUESTED: "bg-slate-100 text-slate-600",
      SCHEDULED: "bg-brand-active text-brand-primary",
      CHECKED_IN: "bg-indigo-100 text-indigo-700",
      IN_PROGRESS: "bg-amber-100 text-amber-700 animate-pulse",
      COMPLETED: "bg-emerald-100 text-emerald-700",
      CANCELLED: "bg-red-100 text-red-700",
      DOCUMENTED: "bg-purple-100 text-purple-700",
    };
    return (
      <span
        className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${styles[status] || "bg-gray-100 text-gray-600"}`}
      >
        {status.replace("_", " ")}
      </span>
    );
  };

  const getTodayScheduleCount = (roomId: number) => {
    const today = new Date().toISOString().split("T")[0];
    return surgeries.filter(
      (s) => s.ot_room_id === roomId && s.scheduled_date === today,
    ).length;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            Theatre Management
          </h1>
          <p className="text-slate-500 font-medium">
            Manage surgeries, schedules, and OT resources
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("board")}
            className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === "board" ? "bg-slate-900 text-white shadow-lg" : "bg-white text-slate-600 hover:bg-slate-50"}`}
          >
            OT Board
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === "requests" ? "bg-slate-900 text-white shadow-lg" : "bg-white text-slate-600 hover:bg-slate-50"}`}
          >
            Requests
            {requests.length > 0 && (
              <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                {requests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("rooms")}
            className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === "rooms" ? "bg-slate-900 text-white shadow-lg" : "bg-white text-slate-600 hover:bg-slate-50"}`}
          >
            Rooms
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm min-h-[600px] overflow-hidden">
        {/* OT BOARD TAB */}
        {activeTab === "board" && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Activity className="text-brand-primary" size={20} /> Scheduled
                Surgeries
              </h2>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      size={16}
                    />
                    <input
                      type="text"
                      placeholder="Search surgeries..."
                      value={boardSearchTerm}
                      onChange={(e) => setBoardSearchTerm(e.target.value)}
                      className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-active0/20"
                    />
                  </div>
                  <select 
                    value={boardDateFilter} 
                    onChange={(e) => setBoardDateFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-active0/20"
                  >
                    <option value="ALL">All Dates</option>
                    <option value="TODAY">Today</option>
                    <option value="UPCOMING">Upcoming</option>
                    <option value="PAST">Past</option>
                  </select>
                  <select 
                    value={boardStatusFilter} 
                    onChange={(e) => setBoardStatusFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-active0/20"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="SCHEDULED">Scheduled</option>
                    <option value="CHECKED_IN">Checked In</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-black text-slate-400 uppercase tracking-wider">
                    <th className="px-4 py-4">Date & Time</th>
                    <th className="px-4 py-4">Patient</th>
                    <th className="px-4 py-4">Surgery</th>
                    <th className="px-4 py-4">Room</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-4 py-4">Financial</th>
                    <th className="px-4 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredSurgeries.map((surgery) => (
                    <tr
                      key={surgery.id}
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800">
                            {new Date(
                              surgery.scheduled_date,
                            ).toLocaleDateString()}
                          </span>
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Clock size={12} /> {surgery.scheduled_time}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand-active text-brand-primary flex items-center justify-center font-bold text-xs">
                            {surgery.first_name?.charAt(0) || ""}
                            {surgery.last_name?.charAt(0) || ""}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-sm">
                              {surgery.first_name} {surgery.last_name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {surgery.mrn}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-slate-800 text-sm">
                          {surgery.surgery_name}
                        </p>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${surgery.surgery_type === "EMERGENCY" ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-500"}`}
                        >
                          {surgery.surgery_type}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm font-medium text-slate-600">
                          {surgery.room_name}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {getStatusBadge(surgery.status)}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${
                            surgery.financial_status === "BILLED"
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-amber-50 text-amber-600"
                          }`}
                        >
                          {surgery.financial_status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right relative">
                        <button
                          onClick={() => setActiveActionModal(surgery)}
                          className="px-4 py-2 bg-[#0B1021] text-white rounded-xl text-xs font-bold shadow-md hover:bg-slate-800 transition-all flex items-center gap-1.5 ml-auto"
                        >
                          Actions <MoreVertical size={16} className="opacity-80" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {loading && (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400">
                        <Loader2 size={48} className="mx-auto mb-3 text-brand-primary animate-spin" />
                        <p>Loading surgeries...</p>
                      </td>
                    </tr>
                  )}
                  {filteredSurgeries.length === 0 && !loading && (
                    <tr>
                      <td
                        colSpan={7}
                        className="text-center py-12 text-slate-400"
                      >
                        <Activity
                          size={48}
                          className="mx-auto mb-3 opacity-20"
                        />
                        <p>No surgeries scheduled</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REQUESTS TAB */}
        {activeTab === "requests" && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FileText className="text-brand-primary" size={20} /> Pending
                Requests
              </h2>
            </div>

            <div className="grid gap-4">
              {requests.map((req) => (
                <div
                  key={req.order_id}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between hover:bg-white hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-xl border border-slate-200 flex items-center justify-center text-slate-400">
                      <User size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">
                        {req.first_name} {req.last_name}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        MRN: {req.mrn} • {req.ward_name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-bold text-brand-primary bg-brand-active px-2 py-0.5 rounded border border-brand-active">
                          {req.surgery_name}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Req by: {req.requested_by_first_name}{" "}
                          {req.requested_by_last_name}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Requested
                      </p>
                      <p className="text-sm font-bold text-slate-800">
                        {new Date(req.ordered_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => setViewRequest(req)}
                      className="p-2 text-slate-400 hover:text-brand-primary hover:bg-brand-active rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye size={20} />
                    </button>
                    <button
                      onClick={() => handleScheduleClick(req)}
                      className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition-colors shadow-lg"
                    >
                      Schedule
                    </button>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="text-center py-12 text-slate-400">
                  <Loader2 size={48} className="mx-auto mb-3 text-brand-primary animate-spin" />
                  <p>Loading requests...</p>
                </div>
              )}
              {requests.length === 0 && !loading && (
                <div className="text-center py-12 text-slate-400">
                  <CheckSquare size={48} className="mx-auto mb-3 opacity-20" />
                  <p>No pending surgery requests</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ROOMS TAB */}
        {activeTab === "rooms" && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <BedDouble className="text-brand-primary" size={20} /> Operation
                Theatres
              </h2>
              <button
                onClick={() => setIsRoomModalOpen(true)}
                className="bg-brand-primary text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-brand-active0 transition-colors shadow-lg"
              >
                <Plus size={16} /> Add Room
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12 text-slate-400">
                <Loader2 size={48} className="mx-auto mb-3 text-brand-primary animate-spin" />
                <p>Loading rooms...</p>
              </div>
            ) : rooms.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <BedDouble size={48} className="mx-auto mb-3 opacity-20" />
                <p>No rooms configured</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {rooms.map((room) => (
                  <div
                    key={room.id}
                    className="bg-slate-50 border border-slate-200 rounded-2xl p-6 hover:shadow-md transition-all group"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-white rounded-xl shadow-sm text-brand-primary">
                        <Activity size={24} />
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${room.status === "ACTIVE" ? "bg-emerald-100 text-emerald-600" : "bg-slate-200 text-slate-500"}`}
                      >
                        {room.status}
                      </span>
                    </div>
                    <h3 className="text-xl font-black text-slate-800 mb-1">
                      {room.room_name}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">
                      Created: {new Date(room.created_at).toLocaleDateString()}
                    </p>

                    <div className="mt-6 pt-4 border-t border-slate-200 flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-500">
                        {getTodayScheduleCount(room.id)} Scheduled Today
                      </span>
                      <button
                        onClick={() => setViewRoomSchedule(room)}
                        className="text-brand-primary hover:text-brand-primary font-bold text-xs uppercase tracking-wider flex items-center gap-1"
                      >
                        View Schedule <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Schedule Modal */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-black text-slate-800 text-lg">
                Schedule Surgery
              </h3>
              <button
                onClick={() => setIsScheduleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircle size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Patient
                </label>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 font-bold text-slate-700">
                  {selectedRequest?.first_name} {selectedRequest?.last_name}{" "}
                  <span className="text-slate-400 font-normal">
                    ({selectedRequest?.mrn})
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Procedure
                </label>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 font-medium text-slate-700">
                  {selectedRequest?.surgery_name}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Room
                </label>
                <select
                  value={scheduleForm.ot_room_id}
                  onChange={(e) =>
                    setScheduleForm({
                      ...scheduleForm,
                      ot_room_id: e.target.value,
                    })
                  }
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-brand-active0/20 outline-none"
                >
                  <option value="">Select Room</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.room_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={scheduleForm.scheduled_date}
                    onChange={(e) =>
                      setScheduleForm({
                        ...scheduleForm,
                        scheduled_date: e.target.value,
                      })
                    }
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-brand-active0/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    value={scheduleForm.scheduled_time}
                    onChange={(e) =>
                      setScheduleForm({
                        ...scheduleForm,
                        scheduled_time: e.target.value,
                      })
                    }
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-brand-active0/20 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setIsScheduleModalOpen(false)}
                className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={submitSchedule}
                disabled={submitting}
                className="px-6 py-3 rounded-xl font-bold text-white bg-brand-primary hover:bg-brand-primary shadow-lg shadow-brand-active transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <CheckCircle size={18} />
                )}
                {submitting ? "Scheduling..." : "Confirm Schedule"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Room Modal */}
      {isRoomModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-black text-slate-800 text-lg">
                Add New OT Room
              </h3>
              <button
                onClick={() => setIsRoomModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircle size={24} />
              </button>
            </div>

            <div className="p-6">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Room Name
              </label>
              <input
                type="text"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="e.g. Ortho OT 1"
                className="w-full p-3 bg-white border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-brand-active0/20 outline-none"
              />
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setIsRoomModalOpen(false)}
                className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRoom}
                className="px-6 py-3 rounded-xl font-bold text-white bg-brand-primary hover:bg-brand-primary shadow-lg shadow-brand-active transition-all"
              >
                Create Room
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Surgery Details Modal */}
      {viewSurgery && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const surgery = viewSurgery;
                    setViewSurgery(null);
                    if (surgery) setActiveActionModal(surgery);
                  }}
                  className="p-1.5 bg-white border border-slate-200 shadow-sm text-slate-500 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Back to Actions"
                >
                  <ArrowLeft size={18} />
                </button>
                <div>
                  <h3 className="font-black text-slate-800 text-lg">
                    Surgery Details
                  </h3>
                  <p className="text-xs text-slate-500 font-bold uppercase">
                    {viewSurgery.ot_case_number}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewSurgery(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircle size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="p-4 bg-brand-active rounded-xl border border-brand-active">
                  <h4 className="text-xs font-bold text-brand-primary uppercase mb-2">
                    Patient Information
                  </h4>
                  <div className="space-y-1">
                    <p className="font-bold text-slate-800">
                      {viewSurgery.first_name} {viewSurgery.last_name}
                    </p>
                    <p className="text-sm text-slate-600">
                      MRN: {viewSurgery.mrn}
                    </p>
                    <p className="text-sm text-slate-600">
                      Admission: {viewSurgery.admission_number}
                    </p>
                  </div>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">
                    Surgery Status
                  </h4>
                  <div className="space-y-1">
                    <p className="font-bold text-slate-800">
                      {viewSurgery.status}
                    </p>
                    <p className="text-sm text-slate-600">
                      Financial: {viewSurgery.financial_status}
                    </p>
                    <p className="text-sm text-slate-600">
                      Consent:{" "}
                      <span style={{ color: viewSurgery.status_color }}>
                        {viewSurgery.status_label}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase">
                      Procedure
                    </label>
                    <p className="font-medium text-slate-800">
                      {viewSurgery.surgery_name}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase">
                      Type
                    </label>
                    <p className="font-medium text-slate-800">
                      {viewSurgery.surgery_type}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase">
                      Scheduled Date
                    </label>
                    <p className="font-medium text-slate-800">
                      {new Date(
                        viewSurgery.scheduled_date,
                      ).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase">
                      Scheduled Time
                    </label>
                    <p className="font-medium text-slate-800">
                      {viewSurgery.scheduled_time}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase">
                      Room
                    </label>
                    <p className="font-medium text-slate-800">
                      {viewSurgery.room_name}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase">
                      Created By
                    </label>
                    <p className="font-medium text-slate-800">
                      {viewSurgery.creator_first_name}{" "}
                      {viewSurgery.creator_last_name}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Request Details Modal */}
      {viewRequest && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
            {/* Header */}
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center flex-shrink-0">
              <div>
                <h3 className="font-black text-slate-800 text-lg">
                  OT Request Details
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Request ID: {viewRequest.order_id} | Case ID:{" "}
                  {viewRequest.ot_case_id}
                </p>
              </div>
              <button
                onClick={() => setViewRequest(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircle size={24} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto flex-1 p-6 space-y-6">
              {/* Patient & Admission Info */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">
                    Patient Details
                  </h4>
                  <div className="space-y-2">
                    <p>
                      <span className="text-slate-500 text-sm">Name:</span>{" "}
                      <span className="font-bold text-slate-800">
                        {viewRequest.first_name} {viewRequest.last_name}
                      </span>
                    </p>
                    <p>
                      <span className="text-slate-500 text-sm">MRN:</span>{" "}
                      <span className="font-bold text-slate-800">
                        {viewRequest.mrn}
                      </span>
                    </p>
                    <p>
                      <span className="text-slate-500 text-sm">Gender:</span>{" "}
                      <span className="font-bold text-slate-800">
                        {viewRequest.gender}
                      </span>
                    </p>
                    <p>
                      <span className="text-slate-500 text-sm">Phone:</span>{" "}
                      <span className="font-bold text-slate-800">
                        {viewRequest.phone}
                      </span>
                    </p>
                    <p>
                      <span className="text-slate-500 text-sm">Encounter:</span>{" "}
                      <span className="font-bold text-slate-800">
                        {viewRequest.encounter_number}
                      </span>
                    </p>
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">
                    Admission Info
                  </h4>
                  <div className="space-y-2">
                    <p>
                      <span className="text-slate-500 text-sm">Ward:</span>{" "}
                      <span className="font-bold text-slate-800">
                        {viewRequest.ward_name}
                      </span>
                    </p>
                    <p>
                      <span className="text-slate-500 text-sm">Bed:</span>{" "}
                      <span className="font-bold text-slate-800">
                        {viewRequest.bed_number}
                      </span>
                    </p>
                    <p>
                      <span className="text-slate-500 text-sm">
                        Requested By:
                      </span>{" "}
                      <span className="font-bold text-slate-800">
                        {viewRequest.requested_by_first_name}{" "}
                        {viewRequest.requested_by_last_name}
                      </span>
                    </p>
                    {viewRequest.admission_number && (
                      <p>
                        <span className="text-slate-500 text-sm">
                          Admission #:
                        </span>{" "}
                        <span className="font-bold text-slate-800">
                          {viewRequest.admission_number}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Surgery Details */}
              <div className="border-t border-slate-100 pt-6">
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">
                  Surgery Details
                </h4>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <p>
                      <span className="text-slate-500 text-sm">
                        Surgery Name:
                      </span>{" "}
                      <span className="font-bold text-slate-800">
                        {viewRequest.surgery_name}
                      </span>
                    </p>
                    <p>
                      <span className="text-slate-500 text-sm">
                        Service Code:
                      </span>{" "}
                      <span className="font-bold text-slate-800">
                        {viewRequest.service_code}
                      </span>
                    </p>
                    <p>
                      <span className="text-slate-500 text-sm">
                        Surgery Type:
                      </span>{" "}
                      <span
                        className={`font-bold px-2 py-1 rounded text-xs ${
                          viewRequest.surgery_type === "EMERGENCY"
                            ? "bg-red-100 text-red-700"
                            : "bg-brand-active text-brand-primary"
                        }`}
                      >
                        {viewRequest.surgery_type}
                      </span>
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p>
                      <span className="text-slate-500 text-sm">Priority:</span>{" "}
                      <span
                        className={`font-bold px-2 py-1 rounded text-xs ${
                          viewRequest.priority === "HIGH"
                            ? "bg-red-100 text-red-700"
                            : viewRequest.priority === "MEDIUM"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-green-100 text-green-700"
                        }`}
                      >
                        {viewRequest.priority}
                      </span>
                    </p>
                    {viewRequest.anesthesia_type && (
                      <p>
                        <span className="text-slate-500 text-sm">
                          Anesthesia Type:
                        </span>{" "}
                        <span className="font-bold text-slate-800">
                          {viewRequest.anesthesia_type}
                        </span>
                      </p>
                    )}
                    {viewRequest.surgeon_first_name && (
                      <p>
                        <span className="text-slate-500 text-sm">
                          Assigned Surgeon:
                        </span>{" "}
                        <span className="font-bold text-slate-800">
                          Dr. {viewRequest.surgeon_first_name}{" "}
                          {viewRequest.surgeon_last_name}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* OT Planning */}
              <div className="border-t border-slate-100 pt-6">
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">
                  OT Planning
                </h4>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <p>
                      <span className="text-slate-500 text-sm">
                        Preferred OT Room:
                      </span>{" "}
                      <span className="font-bold text-slate-800">
                        {viewRequest.preferred_ot_room || "Not specified"}
                      </span>
                    </p>
                    {viewRequest.assigned_ot_room && (
                      <p>
                        <span className="text-slate-500 text-sm">
                          Assigned OT Room:
                        </span>{" "}
                        <span className="font-bold text-slate-800">
                          {viewRequest.assigned_ot_room}
                        </span>
                      </p>
                    )}
                    <p>
                      <span className="text-slate-500 text-sm">
                        Preferred Date:
                      </span>{" "}
                      <span className="font-bold text-slate-800">
                        {new Date(
                          viewRequest.preferred_surgery_date,
                        ).toLocaleDateString()}
                      </span>
                    </p>
                    <p>
                      <span className="text-slate-500 text-sm">
                        Preferred Time:
                      </span>{" "}
                      <span className="font-bold text-slate-800">
                        {viewRequest.preferred_surgery_time}
                      </span>
                    </p>
                  </div>
                  <div className="space-y-2">
                    {viewRequest.scheduled_date && (
                      <>
                        <p>
                          <span className="text-slate-500 text-sm">
                            Scheduled Date:
                          </span>{" "}
                          <span className="font-bold text-slate-800">
                            {new Date(
                              viewRequest.scheduled_date,
                            ).toLocaleDateString()}
                          </span>
                        </p>
                        <p>
                          <span className="text-slate-500 text-sm">
                            Scheduled Time:
                          </span>{" "}
                          <span className="font-bold text-slate-800">
                            {viewRequest.scheduled_time}
                          </span>
                        </p>
                      </>
                    )}
                    {viewRequest.estimated_duration_min && (
                      <p>
                        <span className="text-slate-500 text-sm">
                          Estimated Duration:
                        </span>{" "}
                        <span className="font-bold text-slate-800">
                          {viewRequest.estimated_duration_min} minutes
                        </span>
                      </p>
                    )}
                    <p>
                      <span className="text-slate-500 text-sm">OT Status:</span>{" "}
                      <span className="font-bold px-2 py-1 rounded text-xs bg-slate-100 text-slate-700">
                        {viewRequest.ot_status}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Financial & Status */}
              <div className="border-t border-slate-100 pt-6">
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">
                  Financial & Status
                </h4>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <p>
                      <span className="text-slate-500 text-sm">
                        Financial Status:
                      </span>{" "}
                      <span
                        className={`font-bold px-2 py-1 rounded text-xs ${
                          viewRequest.financial_status === "BILLED"
                            ? "bg-green-100 text-green-700"
                            : "bg-orange-100 text-orange-700"
                        }`}
                      >
                        {viewRequest.financial_status}
                      </span>
                    </p>
                    <p>
                      <span className="text-slate-500 text-sm">Billed:</span>{" "}
                      <span className="font-bold text-slate-800">
                        {viewRequest.is_billed ? "Yes" : "No"}
                      </span>
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p>
                      <span className="text-slate-500 text-sm">
                        Request Status:
                      </span>{" "}
                      <span className="font-bold px-2 py-1 rounded text-xs bg-brand-active text-brand-primary">
                        {viewRequest.request_status}
                      </span>
                    </p>
                    <p>
                      <span className="text-slate-500 text-sm">
                        Order Status:
                      </span>{" "}
                      <span className="font-bold px-2 py-1 rounded text-xs bg-slate-100 text-slate-700">
                        {viewRequest.order_status}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Request Notes & Metadata */}
              {(viewRequest.request_notes ||
                viewRequest.requested_by_first_name) && (
                <div className="border-t border-slate-100 pt-6">
                  <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">
                    Request Information
                  </h4>
                  <div className="space-y-3">
                    {viewRequest.request_notes && (
                      <div>
                        <p className="text-slate-500 text-sm mb-1">
                          Request Notes:
                        </p>
                        <p className="text-slate-800 text-sm bg-slate-50 p-3 rounded border border-slate-200">
                          {viewRequest.request_notes}
                        </p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-6">
                      <p>
                        <span className="text-slate-500 text-sm">
                          Requested By:
                        </span>{" "}
                        <span className="font-bold text-slate-800">
                          {viewRequest.requested_by_first_name}{" "}
                          {viewRequest.requested_by_last_name}
                        </span>
                      </p>
                      <p>
                        <span className="text-slate-500 text-sm">
                          Request Time:
                        </span>{" "}
                        <span className="font-bold text-slate-800">
                          {new Date(viewRequest.request_time).toLocaleString()}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0">
              <button
                onClick={() => setViewRequest(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setViewRequest(null);
                  handleScheduleClick(viewRequest);
                }}
                className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold hover:bg-slate-800 transition-colors"
              >
                Proceed to Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Room Schedule List Modal */}
      {viewRoomSchedule && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[80vh] flex flex-col">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
              <h3 className="font-black text-slate-800 text-lg">
                {viewRoomSchedule.room_name} - Schedule
              </h3>
              <button
                onClick={() => setViewRoomSchedule(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircle size={24} />
              </button>
            </div>

            <div className="p-0 overflow-y-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 sticky top-0">
                  <tr className="border-b border-slate-100 text-xs font-black text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Time</th>
                    <th className="px-6 py-3">Patient</th>
                    <th className="px-6 py-3">Procedure</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {surgeries
                    .filter((s) => s.ot_room_id === viewRoomSchedule.id)
                    .sort(
                      (a, b) =>
                        new Date(a.scheduled_date).getTime() -
                        new Date(b.scheduled_date).getTime(),
                    )
                    .map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-3 text-sm font-bold text-slate-600">
                          {new Date(s.scheduled_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-3 text-sm font-bold text-slate-600">
                          {s.scheduled_time}
                        </td>
                        <td className="px-6 py-3 text-sm font-medium text-slate-800">
                          {s.first_name} {s.last_name}
                        </td>
                        <td className="px-6 py-3 text-sm font-medium text-slate-800">
                          {s.surgery_name}
                        </td>
                        <td className="px-6 py-3">
                          {getStatusBadge(s.status)}
                        </td>
                      </tr>
                    ))}
                  {surgeries.filter((s) => s.ot_room_id === viewRoomSchedule.id)
                    .length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="text-center py-8 text-slate-400"
                      >
                        No surgeries scheduled for this room.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Consent Modal */}
      {consentModalOpen && selectedSurgeryForConsent && (
        <ConsentModal
          isOpen={consentModalOpen}
          onClose={() => {
            setConsentModalOpen(false);
            setSelectedSurgeryForConsent(null);
          }}
          onBackToActions={() => {
            setConsentModalOpen(false);
            const surgery = selectedSurgeryForConsent;
            setSelectedSurgeryForConsent(null);
            if (surgery) setActiveActionModal(surgery);
          }}
          entityType="SURGERY"
          entityId={selectedSurgeryForConsent.id}
          orderId={selectedSurgeryForConsent.order_id}
          encounterNumber={selectedSurgeryForConsent.encounter_number}
          patientName={`${selectedSurgeryForConsent.first_name} ${selectedSurgeryForConsent.last_name}`}
          mrn={selectedSurgeryForConsent.mrn}
          procedureName={selectedSurgeryForConsent.surgery_name}
          surgery={selectedSurgeryForConsent}
          onSuccess={() => {
            fetchData(); // Refresh to update consent status
          }}
        />
      )}

      {/* OT Checklist Modal */}
      {selectedSurgeryForChecklist && (
        <OTChecklistModal
          isOpen={isChecklistModalOpen}
          onClose={() => {
            setIsChecklistModalOpen(false);
            setSelectedSurgeryForChecklist(null);
          }}
          onBackToActions={() => {
            setIsChecklistModalOpen(false);
            const surgery = selectedSurgeryForChecklist;
            setSelectedSurgeryForChecklist(null);
            if (surgery) setActiveActionModal(surgery);
          }}
          ot_case_id={selectedSurgeryForChecklist.id}
          ot_case_number={selectedSurgeryForChecklist.ot_case_number || ''}
          encounterData={{
            patient_name: `${selectedSurgeryForChecklist.first_name} ${selectedSurgeryForChecklist.last_name}`,
            mrn: selectedSurgeryForChecklist.mrn,
            procedure_name: selectedSurgeryForChecklist.surgery_name,
            encounter_number: selectedSurgeryForChecklist.encounter_number,
          }}
          onComplete={() => {
            notify("Checklist completed successfully!", "success");
            fetchData(); // Refresh data
          }}
        />
      )}

      {/* Pre-op Huddle Modal (T2) */}
      
      
      {/* OT Checklist Modal */}
      {selectedSurgeryForChecklist && (
        <OTChecklistModal
          isOpen={isChecklistModalOpen}
          // ... (other props stay the same)
          ot_case_id={selectedSurgeryForChecklist.id}
          ot_case_number={selectedSurgeryForChecklist.ot_case_number || ''}
          
          // ADD THIS LINE:
          surgery={selectedSurgeryForChecklist}
          
          encounterData={{
            patient_name: `${selectedSurgeryForChecklist.first_name} ${selectedSurgeryForChecklist.last_name}`,
            mrn: selectedSurgeryForChecklist.mrn,
            procedure_name: selectedSurgeryForChecklist.surgery_name,
            encounter_number: selectedSurgeryForChecklist.encounter_number,
          }}
          onComplete={() => {
            notify("Checklist completed successfully!", "success");
            fetchData();
          }}
        />
      )}
      
      {/* Pre-op Huddle Modal (T2) */}
      {/* {selectedSurgeryForHuddle && (
        <PreopHuddleModal
          isOpen={isHuddleModalOpen}
          onClose={() => {
            setIsHuddleModalOpen(false);
            setSelectedSurgeryForHuddle(null);
          }}
          onBackToActions={() => {
            setIsHuddleModalOpen(false);
            const surgery = selectedSurgeryForHuddle;
            setSelectedSurgeryForHuddle(null);
            if (surgery) setActiveActionModal(surgery);
          }}
          ot_case_id={selectedSurgeryForHuddle.id}
          
          // ADD THESE TWO LINES:
          ot_case_number={selectedSurgeryForHuddle.ot_case_number}
          surgery={selectedSurgeryForHuddle} 
          
          onComplete={() => {
            notify("Pre-op huddle completed successfully!", "success");
            fetchData();
          }}
        />
      )} */}
      {/* {selectedSurgeryForHuddle && (
        <PreopHuddleModal
          isOpen={isHuddleModalOpen}
          onClose={() => {
            setIsHuddleModalOpen(false);
            setSelectedSurgeryForHuddle(null);
          }}
          onBackToActions={() => {
            setIsHuddleModalOpen(false);
            const surgery = selectedSurgeryForHuddle;
            setSelectedSurgeryForHuddle(null);
            if (surgery) setActiveActionModal(surgery);
          }}
          ot_case_id={selectedSurgeryForHuddle.id}
          onComplete={() => {
            notify("Pre-op huddle completed successfully!", "success");
            fetchData();
          }}
        />
      )} */}
      
      {selectedSurgeryForAnaesthesia && (
        <OTAnaesthesiaMonitoringModal
          isOpen={isAnaesthesiaModalOpen}
          onClose={() => {
            setIsAnaesthesiaModalOpen(false);
            const surgery = selectedSurgeryForAnaesthesia;
            setSelectedSurgeryForAnaesthesia(null);
            if (surgery) setActiveActionModal(surgery); // reopen the action menu
          }}
          surgery={selectedSurgeryForAnaesthesia}
          onLoad={(recordId) => {
          console.log("Modal finished loading data! Record ID:", recordId);
          // Do whatever else you need to do "onload" here
        }}
        />
      )}

      
      {selectedSurgeryForCardiacAnaesthesia && (
        <OTCardiacAnaesthesiaMonitoringModal
          isOpen={isCardiacAnaesthesiaModalOpen}
          onClose={() => {
            setIsCardiacAnaesthesiaModalOpen(false);
            const surgery = selectedSurgeryForCardiacAnaesthesia;
            setSelectedSurgeryForCardiacAnaesthesia(null);
            if (surgery) setActiveActionModal(surgery); // reopen the action menu
          }}
          surgery={selectedSurgeryForCardiacAnaesthesia}
          onLoad={(recordId) => {
          console.log("Modal finished loading data! Record ID:", recordId);
          // Do whatever else you need to do "onload" here
        }}
        />
      )}


      {selectedSurgeryForPerfusionist && (
        <OTPerfusionMonitoringModal
          isOpen={isPerfusionistModalOpen}
          onClose={() => {
            setIsPerfusionistModalOpen(false);
            const surgery = selectedSurgeryForPerfusionist;
            setSelectedSurgeryForPerfusionist(null);
            if (surgery) setActiveActionModal(surgery); // reopen the action menu
          }}
          surgery={selectedSurgeryForPerfusionist}
          onLoad={(recordId) => {
          console.log("Modal finished loading data! Record ID:", recordId);
          // Do whatever else you need to do "onload" here
        }}
        />
      )}


      {/* Action Modal (Grid Layout) */}
      {activeActionModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="bg-slate-50 px-6 py-5 border-b border-slate-100 flex justify-between items-start sticky top-0 z-10">
              <div>
                <h3 className="font-black text-slate-800 text-xl tracking-tight">
                  Surgery Actions
                </h3>
                <p className="text-xs font-bold text-slate-500 mt-1 flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-700">
                    {activeActionModal.mrn}
                  </span>
                  {activeActionModal.first_name} {activeActionModal.last_name} • {activeActionModal.surgery_name}
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
                
                {/* View Details - Blue */}
                <button
                  onClick={() => {
                    setViewSurgery(activeActionModal);
                    setActiveActionModal(null);
                  }}
                  className="flex flex-col items-center justify-center gap-3 p-5 bg-white border-2 border-blue-50 rounded-2xl hover:bg-blue-50 hover:border-blue-200 transition-all text-blue-700 group shadow-sm hover:shadow-md shadow-blue-500/5"
                >
                  <div className="p-4 bg-blue-100 rounded-2xl group-hover:scale-110 transition-transform text-blue-600">
                    <Eye size={28} />
                  </div>
                  <span className="text-sm font-bold text-center">View Details</span>
                </button>

                {/* Sign Consent - Violet */}
                <button
                  onClick={() => {
                    setSelectedSurgeryForConsent(activeActionModal);
                    setConsentModalOpen(true);
                    setActiveActionModal(null);
                  }}
                  className="flex flex-col items-center justify-center gap-3 p-5 bg-white border-2 border-violet-50 rounded-2xl hover:bg-violet-50 hover:border-violet-200 transition-all text-violet-700 group shadow-sm hover:shadow-md shadow-violet-500/5"
                >
                  <div className="p-4 bg-violet-100 rounded-2xl group-hover:scale-110 transition-transform relative text-violet-600">
                    <FileSignature size={28} />
                    {activeActionModal.consent_status === "SIGNED" && (
                      <span className="absolute -top-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 shadow-sm">
                        <CheckCircle size={12} />
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-bold text-center">
                    {activeActionModal.consent_status === "SIGNED" ? "View Consent" : "Sign Consent"}
                  </span>
                </button>

                {/* GSH Form - Purple */}
                <button
                  onClick={() => {
                    setSelectedSurgeryForChecklist(activeActionModal);
                    setIsChecklistModalOpen(true);
                    setActiveActionModal(null);
                  }}
                  className="flex flex-col items-center justify-center gap-3 p-5 bg-white border-2 border-purple-50 rounded-2xl hover:bg-purple-50 hover:border-purple-200 transition-all text-purple-700 group shadow-sm hover:shadow-md shadow-purple-500/5"
                >
                  <div className="p-4 bg-purple-100 rounded-2xl group-hover:scale-110 transition-transform relative text-purple-600">
                    <ListChecks size={28} />
                    {activeActionModal.checklist_completed && (
                      <span className="absolute -top-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 shadow-sm">
                        <CheckCircle size={12} />
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-bold text-center">Procedure Checklist</span>
                </button>

                {/* Pre-op Huddle - Fuchsia */}
                <button
                  onClick={() => {
                    setSelectedSurgeryForHuddle(activeActionModal);
                    setIsHuddleModalOpen(true);
                    setActiveActionModal(null);
                  }}
                  className="flex flex-col items-center justify-center gap-3 p-5 bg-white border-2 border-fuchsia-50 rounded-2xl hover:bg-fuchsia-50 hover:border-fuchsia-200 transition-all text-fuchsia-700 group shadow-sm hover:shadow-md shadow-fuchsia-500/5"
                >
                  <div className="p-4 bg-fuchsia-100 rounded-2xl group-hover:scale-110 transition-transform relative text-fuchsia-600">
                    <Users size={28} />
                    {activeActionModal.huddle_completed && (
                      <span className="absolute -top-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 shadow-sm">
                        <CheckCircle size={12} />
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-bold text-center">Pre-op Huddle (T2)</span>
                </button>

                {/* Anaesthesia Monitoring - Cyan */}
                <button
                  onClick={() => {
                    setSelectedSurgeryForAnaesthesia(activeActionModal);
                    setIsAnaesthesiaModalOpen(true);
                    setActiveActionModal(null);
                  }}
                  className="flex flex-col items-center justify-center gap-3 p-5 bg-white border-2 border-cyan-50 rounded-2xl hover:bg-cyan-50 hover:border-cyan-200 transition-all text-cyan-700 group shadow-sm hover:shadow-md shadow-cyan-500/5"
                >
                  <div className="p-4 bg-cyan-100 rounded-2xl group-hover:scale-110 transition-transform relative text-cyan-600">
                    <Activity size={28} />
                    {activeActionModal.anaesthesia_completed && (
                      <span className="absolute -top-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 shadow-sm">
                        <CheckCircle size={12} />
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-bold text-center">Anaesthesia Monitoring</span>
                </button>

                {/* Cardiac Anaesthesia - Rose */}
                <button
                  onClick={() => {
                    setSelectedSurgeryForCardiacAnaesthesia(activeActionModal);
                    setIsCardiacAnaesthesiaModalOpen(true);
                    setActiveActionModal(null);
                  }}
                  className="flex flex-col items-center justify-center gap-3 p-5 bg-white border-2 border-rose-50 rounded-2xl hover:bg-rose-50 hover:border-rose-200 transition-all text-rose-700 group shadow-sm hover:shadow-md shadow-rose-500/5"
                >
                  <div className="p-4 bg-rose-100 rounded-2xl group-hover:scale-110 transition-transform relative text-rose-600">
                    <HeartPulse size={28} />
                    {activeActionModal.cardiac_completed && (
                      <span className="absolute -top-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 shadow-sm">
                        <CheckCircle size={12} />
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-bold text-center">Cardiac Anaesthesia Record</span>
                </button>

                {/* Perfusion Record - Orange */}
                <button
                  onClick={() => {
                    setSelectedSurgeryForPerfusionist(activeActionModal);
                    setIsPerfusionistModalOpen(true);
                    setActiveActionModal(null);
                  }}
                  className="flex flex-col items-center justify-center gap-3 p-5 bg-white border-2 border-orange-50 rounded-2xl hover:bg-orange-50 hover:border-orange-200 transition-all text-orange-700 group shadow-sm hover:shadow-md shadow-orange-500/5"
                >
                  <div className="p-4 bg-orange-100 rounded-2xl group-hover:scale-110 transition-transform relative text-orange-600">
                    <Droplets size={28} />
                    {activeActionModal.perfusion_completed && (
                      <span className="absolute -top-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 shadow-sm">
                        <CheckCircle size={12} />
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-bold text-center">Perfusion (CPB) Record</span>
                </button>

                {/* Check In - Indigo */}
                {activeActionModal.status === "SCHEDULED" && (
                  <button
                    onClick={() => handleStatusAction("check-in", activeActionModal.id)}
                    className="flex flex-col items-center justify-center gap-3 p-5 bg-white border-2 border-indigo-50 rounded-2xl hover:bg-indigo-50 hover:border-indigo-200 transition-all text-indigo-700 group shadow-sm hover:shadow-md shadow-indigo-500/5"
                  >
                    <div className="p-4 bg-indigo-100 rounded-2xl group-hover:scale-110 transition-transform text-indigo-600">
                      <UserCheck size={28} />
                    </div>
                    <span className="text-sm font-bold text-center">Check In</span>
                  </button>
                )}

                {/* Cancel Surgery - Red */}
                {activeActionModal.status === "SCHEDULED" && (
                  <button
                    onClick={() => handleStatusAction("cancel", activeActionModal.id)}
                    className="flex flex-col items-center justify-center gap-3 p-5 bg-white border-2 border-red-50 rounded-2xl hover:bg-red-50 hover:border-red-200 transition-all text-red-700 group shadow-sm hover:shadow-md shadow-red-500/5"
                  >
                    <div className="p-4 bg-red-100 rounded-2xl group-hover:scale-110 transition-transform text-red-600">
                      <XCircle size={28} />
                    </div>
                    <span className="text-sm font-bold text-center">Cancel</span>
                  </button>
                )}

                {/* Start Surgery - Emerald */}
                {activeActionModal.status === "CHECKED_IN" && (
                  <button
                    onClick={() => handleStatusAction("start", activeActionModal.id)}
                    className="flex flex-col items-center justify-center gap-3 p-5 bg-white border-2 border-emerald-50 rounded-2xl hover:bg-emerald-50 hover:border-emerald-200 transition-all text-emerald-700 group shadow-sm hover:shadow-md shadow-emerald-500/5"
                  >
                    <div className="p-4 bg-emerald-100 rounded-2xl group-hover:scale-110 transition-transform text-emerald-600">
                      <Play size={28} />
                    </div>
                    <span className="text-sm font-bold text-center">Start Surgery</span>
                  </button>
                )}

                {/* Complete Surgery - Brand Primary */}
                {activeActionModal.status === "IN_PROGRESS" && (
                  <button
                    onClick={() => handleStatusAction("complete", activeActionModal.id)}
                    className="flex flex-col items-center justify-center gap-3 p-5 bg-white border-2 border-brand-active rounded-2xl hover:bg-brand-active/50 hover:border-brand-primary transition-all text-brand-primary group shadow-sm hover:shadow-md shadow-brand-primary/10"
                  >
                    <div className="p-4 bg-brand-active0 rounded-2xl group-hover:scale-110 transition-transform text-brand-primary">
                      <CheckSquare size={28} />
                    </div>
                    <span className="text-sm font-bold text-center">Complete</span>
                  </button>
                )}

                {/* Operative Note - Slate */}
                {(activeActionModal.status === "IN_PROGRESS" || activeActionModal.status === "COMPLETED") && (
                  <button
                    onClick={() => {
                      setSelectedSurgeryForNote(activeActionModal);
                      setIsOperativeNoteModalOpen(true);
                      setActiveActionModal(null);
                    }}
                    className="flex flex-col items-center justify-center gap-3 p-5 bg-white border-2 border-slate-100 rounded-2xl hover:bg-slate-100 hover:border-slate-300 transition-all text-slate-700 group shadow-sm hover:shadow-md shadow-slate-500/5"
                  >
                    <div className="p-4 bg-slate-200 rounded-2xl group-hover:scale-110 transition-transform relative text-slate-700">
                      <FileEdit size={28} />
                      {activeActionModal.op_note_completed && (
                        <span className="absolute -top-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 shadow-sm">
                          <CheckCircle size={12} />
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-bold text-center">Operative Note</span>
                  </button>
                )}

                {/* OT Board - Sky */}
                {(activeActionModal.status === "IN_PROGRESS" || activeActionModal.status === "COMPLETED") && (
                  <button
                    onClick={() => {
                      setBoardCase({ id: activeActionModal.id, caseNumber: activeActionModal.ot_case_number });
                      setActiveActionModal(null);
                    }}
                    className="flex flex-col items-center justify-center gap-3 p-5 bg-white border-2 border-sky-50 rounded-2xl hover:bg-sky-50 hover:border-sky-200 transition-all text-sky-700 group shadow-sm hover:shadow-md shadow-sky-500/5"
                  >
                    <div className="p-4 bg-sky-100 rounded-2xl group-hover:scale-110 transition-transform text-sky-600">
                      <Monitor size={28} />
                    </div>
                    <span className="text-sm font-bold text-center">OT Board</span>
                  </button>
                )}

                {/* Billing Clearance - Amber */}
                {activeActionModal.financial_status !== "BILLED" && (
                  <button
                    onClick={() => handleStatusAction("clearance", activeActionModal.id)}
                    className="flex flex-col items-center justify-center gap-3 p-5 bg-white border-2 border-amber-50 rounded-2xl hover:bg-amber-50 hover:border-amber-200 transition-all text-amber-700 group shadow-sm hover:shadow-md shadow-amber-500/5"
                  >
                    <div className="p-4 bg-amber-100 rounded-2xl group-hover:scale-110 transition-transform text-amber-600">
                      <Receipt size={28} />
                    </div>
                    <span className="text-sm font-bold text-center">Billing Clearance</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {selectedSurgeryForNote && (
        <OperativeNoteModal
          isOpen={isOperativeNoteModalOpen}
          onClose={() => setIsOperativeNoteModalOpen(false)}
          surgery={selectedSurgeryForNote}
          onComplete={fetchData}
          onBackToActions={() => setActiveActionModal(selectedSurgeryForNote)}
        />
      )}

      {boardCase && (
        <OTBoardView
          otCaseId={boardCase.id}
          caseNumber={boardCase.caseNumber}
          onClose={() => setBoardCase(null)}
        />
      )}
    </div>
  );
};

export default TheatreSchedule;
