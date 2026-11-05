import React, { useState, useEffect } from "react";
import {
  Bed,
  User,
  Plus,
  Clock,
  LogOut,
  CheckCircle2,
  MoreVertical,
  Stethoscope,
  X,
  Search,
  AlertCircle,
  Activity,
  Map,
  Filter,
  DoorOpen,
  ArrowLeft,
  Building2,
  Settings,
  Printer,
  FileText,
  UserCog,
  ArrowRightLeft,
  Tag,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { wardService } from "../services/ward.service";
import { patientService } from "../services/patient.service";
import { useNotification } from "../context/NotificationContext";
import DischargeSummaryModal from "./DischargeSummaryModal";
import SignaturePad from "./SignaturePad";

interface Ward {
  id: number;
  name: string;
  ward_type: string;
  department: string;
  is_active: number;
}

interface Room {
  id: number;
  ward_id: number;
  room_number: string;
  is_active: number;
  beds?: HospitalBed[];
}

interface HospitalBed {
  id: number;
  ward_id: number;
  room_id: number;
  bed_number: string;
  bed_status: "AVAILABLE" | "OCCUPIED" | "MAINTENANCE" | "RESERVED";
  patient?: any;
}

interface Doctor {
  doctor_id: number;
  first_name: string;
  last_name: string;
  specialization_name: string;
}

interface Patient {
  patient_id: number;
  first_name: string;
  last_name: string;
  mrn: string;
}

const WARD_TYPES = [
  "GENERAL_WARD",
  "TWIN_WARD",
  "PRIVATE_WARD",
  "SUITE",
  "ICU",
  "NICU",
  "MATERNITY",
  "HDU",
  "Dialysis",
  "Chemotherapy",
];

const BedIcon: React.FC<{ status: "AVAILABLE" | "OCCUPIED" | "MAINTENANCE" | "RESERVED" }> = ({ status }) => {
  const color =
    status === "AVAILABLE" ? "#10b981" : // Green
      status === "OCCUPIED" ? "#3b82f6" :  // Blue
        status === "MAINTENANCE" ? "#f59e0b" : // Yellow
          "#8b5cf6"; // Purple (RESERVED)

  return (
    <div className="p-4 rounded-full flex items-center justify-center transition-all duration-500 animate-in zoom-in" style={{ backgroundColor: `${color}15` }}>
      <Bed size={40} color={color} strokeWidth={2.5} />
    </div>
  );
};

const BedManagement: React.FC = () => {
  const { notify } = useNotification();

  // Navigation State
  const [activeWardType, setActiveWardType] = useState("GENERAL_WARD");
  const [selectedWard, setSelectedWard] = useState<Ward | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  // Data State
  const [wards, setWards] = useState<Ward[]>([]);
  const [fullWardData, setFullWardData] = useState<any[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [beds, setBeds] = useState<HospitalBed[]>([]);
  const [allWardBeds, setAllWardBeds] = useState<HospitalBed[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingFullData, setLoadingFullData] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // UI State
  const [viewMode, setViewMode] = useState<"single-scroll" | "hierarchy">("single-scroll");
  const [flatActiveRoomId, setFlatActiveRoomId] = useState<number | "ALL">("ALL");
  const [showAdmitModal, setShowAdmitModal] = useState<HospitalBed | null>(
    null,
  );
  const [showWardSetupModal, setShowWardSetupModal] = useState(false);
  const [showDoctorTransferModal, setShowDoctorTransferModal] =
    useState<any>(null);
  const [showBedTransferModal, setShowBedTransferModal] = useState<any>(null);
  const [transferSuccess, setTransferSuccess] = useState<{
    ward: Ward;
    room: Room;
    bed_number: string;
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeBedMenu, setActiveBedMenu] = useState<number | null>(null);

  // Admission Form State
  const [searchMrn, setSearchMrn] = useState("");
  const [searchedPatient, setSearchedPatient] = useState<any>(null);
  const [admissionData, setAdmissionData] = useState({
    admitting_doctor_id: "",
    admission_source: "OPD",
    admission_reason: "",
  });

  // Ward Setup Form State
  const [setupMode, setSetupMode] = useState<"AUTO" | "MANUAL">("AUTO");
  const [newWardData, setNewWardData] = useState({
    name: "",
    ward_type: "GENERAL_WARD",
    department: "",
    rooms: 5,
    beds_per_room: 4,
  });

  const [transferDoctorId, setTransferDoctorId] = useState("");

  // Bed Transfer State
  const [transferWardId, setTransferWardId] = useState("");
  const [transferRoomId, setTransferRoomId] = useState("");
  const [transferBedId, setTransferBedId] = useState("");
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [availableBeds, setAvailableBeds] = useState<HospitalBed[]>([]);

  // Discharge State
  const [showDischargeModal, setShowDischargeModal] = useState<any>(null);
  const [dischargeReasons, setDischargeReasons] = useState<any[]>([]);
  const [dischargeFormData, setDischargeFormData] = useState({
    discharge_reason_id: "",
    discharge_notes: "",
    doctor_signature: "",
    patient_witness_name: "",
    patient_witness: "",
  });
  const [reasonSearchTerm, setReasonSearchTerm] = useState("");
  const [showReasonList, setShowReasonList] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState<number | null>(null);

  // Fetch Data on Mount
  useEffect(() => {
    fetchWards();
    fetchDoctors();
    fetchAllData();
    fetchDischargeReasons();
  }, []);

  // Fetch Rooms when Ward is selected
  useEffect(() => {
    if (selectedWard) {
      fetchRooms(selectedWard.id);
    } else {
      setRooms([]);
    }
  }, [selectedWard]);

  // Fetch Beds when Room is selected
  useEffect(() => {
    if (selectedRoom) {
      fetchBeds(selectedRoom.id, selectedRoom.room_number);
    } else {
      setBeds([]);
    }
  }, [selectedRoom]);

  // Fetch Rooms when Transfer Ward is selected
  useEffect(() => {
    if (transferWardId) {
      wardService.getRooms(parseInt(transferWardId)).then((res) => {
        if (res.status === "success") setAvailableRooms(res.data);
      });
    } else {
      setAvailableRooms([]);
    }
  }, [transferWardId]);

  // Fetch Beds when Transfer Room is selected
  useEffect(() => {
    if (transferRoomId) {
      wardService.getBeds(parseInt(transferRoomId)).then((res) => {
        if (res.status === "success") {
          // Only show AVAILABLE beds
          setAvailableBeds(
            res.data.filter((b: any) => b.bed_status === "AVAILABLE"),
          );
        }
      });
    } else {
      setAvailableBeds([]);
    }
  }, [transferRoomId]);

  const fetchWards = async () => {
    setLoading(true);
    try {
      const res = await wardService.getWards();
      if (res.status === "success") {
        setWards(res.data);
      }
    } catch (err: any) {
      console.error(err);
      notify(err.response?.data?.message || "Failed to fetch wards", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllData = async () => {
    setLoadingFullData(true);
    try {
      const wardsRes = await wardService.getWards();
      if (wardsRes.status !== "success") return;

      const wardsList = wardsRes.data;

      // Fetch rooms for all wards
      const fullData = await Promise.all(wardsList.map(async (ward: any) => {
        const roomsRes = await wardService.getRooms(ward.id);
        if (roomsRes.status !== "success") return { ...ward, rooms: [] };

        const roomsList = roomsRes.data;

        // Fetch beds and admissions for all rooms
        const roomsWithBeds = await Promise.all(roomsList.map(async (room: any) => {
          const bedsRes = await wardService.getBeds(room.id);
          if (bedsRes.status !== "success") return { ...room, beds: [] };

          let bedsData = bedsRes.data;

          // Populate patient info if occupied
          try {
            const admissionsRes = await wardService.getAdmissions({ room_number: room.room_number });
            if (admissionsRes.status === "success" && admissionsRes.data?.results) {
              const admissions = admissionsRes.data.results;
              bedsData = bedsData.map((bed: any) => {
                const admission = admissions.find((a: any) =>
                  a.bed_number === bed.bed_number &&
                  a.room_number === room.room_number &&
                  a.ward_name === ward.name &&
                  a.status === "ACTIVE"
                );
                if (admission) {
                  return {
                    ...bed,
                    bed_status: "OCCUPIED",
                    patient: {
                      name: `${admission.first_name} ${admission.last_name}`,
                      mrn: admission.mrn,
                      phone: admission.phone,
                      payer: admission.payer_name,
                      admission_id: admission.admission_id,
                      encounter_id: admission.encounter_id,
                      admission_number: admission.admission_number,
                      encounter_number: admission.encounter_number,
                      admission_date: admission.admission_date,
                      doctor_name: `${admission.doctor_first_name} ${admission.doctor_last_name}`,
                      age: admission.date_of_birth ? calculateAge(admission.date_of_birth) : "Unknown",
                      sex: admission.gender || "Unknown",
                      discharge_stage: admission.discharge_stage,
                    },
                  };
                }
                return bed;
              });
            }
          } catch (e) {
            console.error("Admissions fetch error", e);
          }

          return { ...room, beds: bedsData };
        }));

        return { ...ward, rooms: roomsWithBeds };
      }));

      setFullWardData(fullData);
    } catch (err) {
      console.error("Full data fetch error", err);
    } finally {
      setLoadingFullData(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      const res = await wardService.getDoctors();
      if (res.status === "success") {
        setDoctors(res.data);
      }
    } catch (err: any) {
      console.error(err);
      notify(err.response?.data?.message || "Failed to fetch doctors", "error");
    }
  };

  const fetchDischargeReasons = async () => {
    try {
      const res = await wardService.getDischargeReasons();
      if (res.status === "success") {
        setDischargeReasons(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch discharge reasons", err);
    }
  };

  const calculateAge = (dobString: string) => {
    if (!dobString) return "N/A";
    const dob = new Date(dobString);
    const now = new Date();

    let years = now.getFullYear() - dob.getFullYear();
    let months = now.getMonth() - dob.getMonth();
    let days = now.getDate() - dob.getDate();

    if (days < 0) {
      months--;
      days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    }
    if (months < 0) {
      years--;
      months += 12;
    }

    if (years > 0) return `${years} Years`;
    if (months > 0) return `${months} Months`;
    return `${days} Days`;
  };

  const handleSearchPatient = async () => {
    if (!searchMrn) return;
    try {
      const patient = await patientService.getPatientByMrn(searchMrn);
      if (patient) {
        setSearchedPatient(patient);
        notify("Patient found", "success");
      } else {
        setSearchedPatient(null);
        notify("Patient not found", "error");
      }
    } catch (err: any) {
      console.error(err);
      notify(
        err.response?.data?.message || "Failed to search patient",
        "error",
      );
    }
  };

  const fetchRooms = async (wardId: number) => {
    setLoading(true);
    try {
      const res = await wardService.getRooms(wardId);
      if (res.status === "success") {
        setRooms(res.data);
      }
    } catch (err: any) {
      console.error(err);
      notify(err.response?.data?.message || "Failed to fetch rooms", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchBeds = async (roomId: number, roomNumber?: string) => {
    setLoading(true);
    try {
      const bedsRes = await wardService.getBeds(roomId);

      if (bedsRes.status === "success") {
        let bedsData = bedsRes.data;

        // If we have a room number, fetch active admissions to populate patient info
        if (roomNumber) {
          try {
            const admissionsRes = await wardService.getAdmissions({
              room_number: roomNumber,
            });
            if (
              admissionsRes.status === "success" &&
              admissionsRes.data?.results
            ) {
              const admissions = admissionsRes.data.results;

              bedsData = bedsData.map((bed: any) => {
                const admission = admissions.find(
                  (a: any) =>
                    a.bed_number === bed.bed_number &&
                    a.room_number === roomNumber &&
                    a.ward_name === selectedWard?.name &&
                    a.status === "ACTIVE",
                );
                if (admission) {
                  return {
                    ...bed,
                    bed_status: "OCCUPIED",
                    patient: {
                      name: `${admission.first_name} ${admission.last_name}`,
                      mrn: admission.mrn,
                      phone: admission.phone,
                      payer: admission.payer_name,
                      admission_id: admission.admission_id,
                      encounter_id: admission.encounter_id,
                      admission_number: admission.admission_number,
                      encounter_number: admission.encounter_number,
                      admission_date: admission.admission_date,
                      doctor_name: `${admission.doctor_first_name} ${admission.doctor_last_name}`,
                      age: admission.date_of_birth ? calculateAge(admission.date_of_birth) : "Unknown",
                      sex: admission.gender || "Unknown",
                      discharge_stage: admission.discharge_stage,
                    },
                  };
                }
                return bed;
              });
            }
          } catch (admErr) {
            console.error("Failed to fetch admissions", admErr);
          }
        }

        setBeds(bedsData);
      }
    } catch (err: any) {
      console.error(err);
      notify(err.response?.data?.message || "Failed to fetch beds", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAdmitPatient = async () => {
    if (!showAdmitModal || !searchedPatient) return;

    setIsActionLoading(true);
    try {
      await wardService.admitPatient({
        mrn: searchedPatient.mrn,
        bed_id: showAdmitModal.id,
        admitting_doctor_id: parseInt(admissionData.admitting_doctor_id),
        admission_source: admissionData.admission_source,
        admission_reason: admissionData.admission_reason,
      });

      notify("Patient admitted successfully", "success");
      setShowAdmitModal(null);
      // Refresh beds to show new status
      if (selectedRoom) fetchBeds(selectedRoom.id, selectedRoom.room_number);
      fetchAllData();

      // Reset form
      setAdmissionData({
        admitting_doctor_id: "",
        admission_source: "OPD",
        admission_reason: "",
      });
      setSearchMrn("");
      setSearchedPatient(null);
    } catch (err: any) {
      console.error(err);
      notify(err.response?.data?.message || "Failed to admit patient", "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDoctorTransfer = async () => {
    if (!showDoctorTransferModal || !transferDoctorId) return;

    setIsActionLoading(true);
    try {
      await wardService.transferDoctor({
        admission_id: showDoctorTransferModal.patient.admission_id,
        new_doctor_id: parseInt(transferDoctorId),
      });

      notify("Doctor transferred successfully", "success");
      setShowDoctorTransferModal(null);
      setTransferDoctorId("");

      // Refresh beds
      if (selectedRoom) fetchBeds(selectedRoom.id, selectedRoom.room_number);
      fetchAllData();
    } catch (err: any) {
      console.error(err);
      notify(
        err.response?.data?.message || "Failed to transfer doctor",
        "error",
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleBedTransfer = async () => {
    if (
      !showBedTransferModal ||
      !transferWardId ||
      !transferRoomId ||
      !transferBedId
    )
      return;

    setIsActionLoading(true);
    try {
      await wardService.transferBed({
        admission_id: showBedTransferModal.patient.admission_id,
        ward_id: parseInt(transferWardId),
        room_id: parseInt(transferRoomId),
        bed_id: parseInt(transferBedId),
      });

      // Capture details before resetting
      const targetWard = wards.find((w) => w.id === parseInt(transferWardId));
      const targetRoom = availableRooms.find(
        (r) => r.id === parseInt(transferRoomId),
      );
      const targetBed = availableBeds.find(
        (b) => b.id === parseInt(transferBedId),
      );

      if (targetWard && targetRoom && targetBed) {
        setTransferSuccess({
          ward: targetWard,
          room: targetRoom,
          bed_number: targetBed.bed_number,
        });
      } else {
        notify("Bed transferred successfully", "success");
      }

      setShowBedTransferModal(null);
      setTransferWardId("");
      setTransferRoomId("");
      setTransferBedId("");

      // Refresh beds
      if (selectedRoom) fetchBeds(selectedRoom.id, selectedRoom.room_number);
      fetchAllData();
    } catch (err: any) {
      console.error(err);
      notify(err.response?.data?.message || "Failed to transfer bed", "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleMarkForDischarge = async () => {
    if (!showDischargeModal || !dischargeFormData.discharge_reason_id) {
      notify("Please select a discharge reason", "error");
      return;
    }
    if (!dischargeFormData.doctor_signature) {
      notify("Doctor signature is required", "error");
      return;
    }

    setIsActionLoading(true);
    try {
      await wardService.markForDischarge({
        admission_id: showDischargeModal.patient.admission_id,
        discharge_reason_id: parseInt(dischargeFormData.discharge_reason_id),
        discharge_notes: dischargeFormData.discharge_notes,
        doctor_signature: dischargeFormData.doctor_signature,
        patient_witness_name: dischargeFormData.patient_witness_name,
        patient_witness: dischargeFormData.patient_witness,
      });

      notify("Patient marked for discharge successfully", "success");
      setShowDischargeModal(null);
      setDischargeFormData({ discharge_reason_id: "", discharge_notes: "", doctor_signature: "", patient_witness_name: "", patient_witness: "" });

      // Refresh beds
      if (selectedRoom) fetchBeds(selectedRoom.id, selectedRoom.room_number);
      fetchAllData();
    } catch (err: any) {
      console.error(err);
      notify(err.response?.data?.message || "Failed to mark for discharge", "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCreateWard = async () => {
    setIsActionLoading(true);
    try {
      if (setupMode === "AUTO") {
        await wardService.setupWard(newWardData);
      } else {
        await wardService.createWard({
          name: newWardData.name,
          ward_type: newWardData.ward_type,
          department: newWardData.department,
        });
      }
      notify("Ward created successfully", "success");
      setShowWardSetupModal(false);
      fetchWards();
      fetchAllData();
    } catch (err: any) {
      console.error(err);
      notify(err.response?.data?.message || "Failed to create ward", "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  const formatWardName = (key: string) => {
    return key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase())
      .replace("PRIAVTE", "Private");
  };

  // Filter Logic
  const filteredData = fullWardData.map(ward => ({
    ...ward,
    rooms: ward.rooms.map((room: any) => ({
      ...room,
      beds: room.beds.filter((bed: any) =>
        bed.bed_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bed.patient?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bed.patient?.mrn?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    })).filter((room: any) => room.beds.length > 0 || room.room_number.toLowerCase().includes(searchTerm.toLowerCase()))
  })).filter(ward => ward.rooms.length > 0 || ward.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const stats = fullWardData.reduce((acc, ward) => {
    ward.rooms.forEach((room: any) => {
      room.beds.forEach((bed: any) => {
        acc.total++;
        if (bed.bed_status === 'AVAILABLE') acc.available++;
        else if (bed.bed_status === 'OCCUPIED') acc.occupied++;
        else if (bed.bed_status === 'MAINTENANCE') acc.maintenance++;
        else if (bed.bed_status === 'RESERVED') acc.reserved++;
      });
    });
    return acc;
  }, { total: 0, available: 0, occupied: 0, maintenance: 0, reserved: 0 });

  const occupancyRate = stats.total > 0 ? Math.round((stats.occupied / stats.total) * 100) : 0;

  const currentWards = wards.filter(w => w.ward_type === activeWardType && w.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const currentRooms = rooms.filter(r => r.room_number.toLowerCase().includes(searchTerm.toLowerCase()));
  const currentBeds = beds.filter(b => b.bed_number.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      {/* ── Dashboard Stats ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* <div className="lg:col-span-1 bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center"> */}
        {/* <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Overall Statistics</p> */}
        {/* <div className="flex items-center gap-12">
            <div>
              <p className="text-4xl font-black text-slate-900">{occupancyRate}%</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">In Use</p>
            </div>
            <div className="w-px h-12 bg-slate-100"></div>
            <div>
              <p className="text-4xl font-black text-slate-900">{stats.total}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">Total Beds</p>
            </div>
          </div> */}

        {/* Custom Donut Chart Visualization */}
        {/* <div className="mt-8 relative w-40 h-40 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="12" fill="none" />
              <circle
                cx="50" cy="50" r="40"
                stroke="#3b82f6" strokeWidth="12" fill="none"
                strokeDasharray={`${occupancyRate * 2.51} 251.2`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Activity className="text-brand-primary mb-1" size={24} />
            </div>
          </div> */}

        {/* <div className="grid grid-cols-2 gap-x-8 gap-y-3 mt-8 w-full">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-brand-active0"></div>
              <span className="text-[10px] font-bold text-slate-600">In Use</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-500"></div>
              <span className="text-[10px] font-bold text-slate-600">Reserved</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <span className="text-[10px] font-bold text-slate-600">Empty</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500"></div>
              <span className="text-[10px] font-bold text-slate-600">Maintenance</span>
            </div>
          </div> */}
        {/* </div> */}

        {/* <div className="lg:col-span-2 bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-slate-800 tracking-tight">Ward Distribution</h3>
            <div className="flex gap-2">
              <button className="p-2 hover:bg-slate-50 rounded-xl text-slate-400"><Printer size={18} /></button>
              <button className="p-2 hover:bg-slate-50 rounded-xl text-slate-400"><Settings size={18} /></button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {fullWardData.slice(0, 3).map(ward => {
              const wardOccupied = ward.rooms.reduce((acc: number, r: any) => acc + r.beds.filter((b: any) => b.bed_status === 'OCCUPIED').length, 0);
              const wardTotal = ward.rooms.reduce((acc: number, r: any) => acc + r.beds.length, 0);
              const wardRate = wardTotal > 0 ? Math.round((wardOccupied / wardTotal) * 100) : 0;

              return (
                <div key={ward.id} className="p-6 rounded-3xl bg-slate-50/50 border border-slate-100 hover:border-brand-active transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-brand-primary">
                      <Building2 size={20} />
                    </div>
                    <span className="text-lg font-black text-slate-800">{wardRate}%</span>
                  </div>
                  <h4 className="font-bold text-slate-800 mb-1">{ward.name}</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">{wardTotal} Total Beds</p>

                  <div className="mt-6 flex gap-2">
                    <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-active0" style={{ width: `${wardRate}%` }}></div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-[10px] font-black uppercase tracking-wider">
                    <span className="text-brand-primary">{wardOccupied} In Use</span>
                    <span className="text-slate-400">{wardTotal - wardOccupied} Empty</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div> */}
      </div>

      {/* ── Global Search & View Controls ── */}
      <div className="bg-white p-6 rounded-[40px] border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:min-w-[400px] group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors" size={20} />
            <input
              type="text"
              placeholder="Search by Ward, Room, Bed or Patient Name..."
              className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white outline-none transition-all shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-400 hover:text-brand-primary transition-all">
            <Filter size={20} />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setViewMode('single-scroll')}
            className={`px-6 py-3 rounded-2xl text-xs font-black uppercase transition-all flex items-center gap-2
              ${viewMode === 'single-scroll' ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' : 'bg-white text-slate-400 hover:bg-slate-50 border border-slate-200'}
            `}
          >
            <Activity size={16} /> Global View
          </button>
          <button
            onClick={() => setViewMode('hierarchy')}
            className={`px-6 py-3 rounded-2xl text-xs font-black uppercase transition-all flex items-center gap-2
              ${viewMode === 'hierarchy' ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' : 'bg-white text-slate-400 hover:bg-slate-50 border border-slate-200'}
            `}
          >
            <Map size={16} /> Hierarchy
          </button>
          <button onClick={() => setShowWardSetupModal(true)} className="bg-brand-primary text-white px-6 py-3 rounded-2xl font-black text-xs hover:bg-brand-primary transition-all flex items-center gap-2 shadow-xl shadow-brand-active">
            <Plus size={18} /> New Ward
          </button>
        </div>
      </div>

      {/* ── Main Content Area (Single Scroll) ── */}
      {loadingFullData ? (
        <div className="flex flex-col items-center justify-center py-40 space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest animate-pulse">Syncing Global Hospital Beds...</p>
        </div>
      ) : viewMode === 'single-scroll' ? (
        <div className="space-y-12">
          {filteredData.map((ward) => (
            <div key={ward.id} className="space-y-8">
              <div className="flex items-center gap-4">
                <div className="h-10 w-1.5 bg-brand-primary rounded-full"></div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight">{ward.name}</h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{ward.department} • {ward.rooms.length} Rooms</p>
                </div>
              </div>

              {ward.rooms.map((room: any) => (
                <div key={room.id} className="bg-slate-50/50 rounded-[40px] p-8 border border-slate-100">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-emerald-600">
                        <DoorOpen size={20} />
                      </div>
                      <h3 className="text-lg font-black text-slate-800">Room {room.room_number}</h3>
                    </div>
                    <span className="text-[10px] font-black px-3 py-1 bg-white text-slate-500 rounded-full border border-slate-100 uppercase tracking-widest">
                      {room.beds.length} Beds
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                    {room.beds.map((bed: any) => {
                      const statusLabel =
                        bed.bed_status === 'OCCUPIED' ? 'In Use' :
                          bed.bed_status === 'AVAILABLE' ? 'Available' :
                            bed.bed_status === 'MAINTENANCE' ? 'Maintenance' : 'Reserved';

                      const statusColor =
                        bed.bed_status === 'AVAILABLE' ? 'text-emerald-600 bg-emerald-50' :
                          bed.bed_status === 'OCCUPIED' ? 'text-brand-primary bg-brand-active' :
                            bed.bed_status === 'MAINTENANCE' ? 'text-amber-600 bg-amber-50' :
                              'text-purple-600 bg-purple-50';

                      return (
                        <div key={bed.id} className="group bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                          <div className="flex justify-between items-start mb-6">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm
                                ${bed.bed_status === 'OCCUPIED' ? 'bg-brand-primary text-white shadow-lg shadow-brand-active' : 'bg-slate-100 text-slate-500'}
                             `}>
                              {bed.bed_number}
                            </div>
                            <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest ${statusColor}`}>
                              {statusLabel}
                            </span>
                          </div>

                          <div className="flex justify-center mb-8">
                            <BedIcon status={bed.bed_status} />
                          </div>

                          <div className="space-y-2 mt-auto">
                            {bed.bed_status === 'OCCUPIED' && bed.patient ? (
                              <div className="space-y-1 animate-in fade-in duration-500">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-sm font-black text-slate-800 truncate">{bed.patient.name}</p>
                                  <span className="text-[9px] font-black text-brand-primary bg-brand-active px-1.5 py-0.5 rounded-md shrink-0">{bed.patient.mrn}</span>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                                  <span>{bed.patient.age} / {bed.patient.sex?.charAt(0)}</span>
                                  <span>•</span>
                                  <span className="truncate">Dr. {bed.patient.doctor_name.split(' ').pop()}</span>
                                </div>
                                <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-slate-400 pt-1 border-t border-slate-50">
                                  <span>{new Date(bed.patient.admission_date).toLocaleDateString()}</span>
                                  <span className="text-emerald-600">{bed.patient.payer || 'Cash'}</span>
                                </div>
                                <div className="pt-2 flex justify-end">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveBedMenu(activeBedMenu === bed.id ? null : bed.id);
                                    }}
                                    className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-300 hover:text-brand-primary transition-colors"
                                  >
                                    <MoreVertical size={18} />
                                  </button>

                                  {activeBedMenu === bed.id && (
                                    <div className="absolute right-4 bottom-4 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 z-30 overflow-hidden animate-in zoom-in-95 duration-200">
                                      <div className="p-1.5 space-y-1">
                                        <button onClick={() => { setShowDoctorTransferModal(bed); setActiveBedMenu(null); }} className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-black text-slate-600 hover:bg-slate-50 hover:text-brand-primary rounded-xl transition-all">
                                          <UserCog size={14} /> Doctor Transfer
                                        </button>
                                        <button onClick={() => { setShowBedTransferModal(bed); setActiveBedMenu(null); }} className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-black text-slate-600 hover:bg-slate-50 hover:text-brand-primary rounded-xl transition-all">
                                          <ArrowRightLeft size={14} /> Bed Transfer
                                        </button>
                                        <div className="h-px bg-slate-100 my-1"></div>
                                        <button className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-black text-slate-600 hover:bg-slate-50 hover:text-brand-primary rounded-xl transition-all">
                                          <FileText size={14} /> Admission Letter
                                        </button>
                                        <button
                                          onClick={() => window.open(`/print/wristband/${bed.patient.admission_number}`, "_blank")}
                                          className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-black text-slate-600 hover:bg-slate-50 hover:text-brand-primary rounded-xl transition-all"
                                        >
                                          <Tag size={14} /> Print Wristband
                                        </button>
                                        <div className="h-px bg-slate-100 my-1"></div>
                                        <button
                                          onClick={() => { setShowDischargeModal(bed); setActiveBedMenu(null); }}
                                          disabled={bed.patient?.discharge_stage === 'DOCTOR_MARKED'}
                                          className={`w-full flex items-center gap-3 px-3 py-2 text-[10px] font-black rounded-xl transition-all ${bed.patient?.discharge_stage === 'DOCTOR_MARKED'
                                            ? 'text-slate-400 bg-slate-50 cursor-not-allowed opacity-60'
                                            : 'text-rose-500 hover:bg-rose-50'
                                            }`}
                                        >
                                          <LogOut size={14} />
                                          {bed.patient?.discharge_stage === 'DOCTOR_MARKED' ? 'Discharged' : 'Discharge'}
                                        </button>

                                        {bed.patient?.discharge_stage && bed.patient.discharge_stage !== 'ACTIVE' && (
                                          <button
                                            onClick={() => { setShowSummaryModal(bed.patient.encounter_id ?? bed.patient.admission_id); setActiveBedMenu(null); }}
                                            className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-black text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                          >
                                            <FileText size={14} /> View Summary
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center py-2 space-y-4">
                                {bed.bed_status === 'AVAILABLE' ? (
                                  <button
                                    onClick={() => setShowAdmitModal(bed)}
                                    className="w-full py-2.5 bg-brand-active text-brand-primary rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-primary hover:text-white transition-all shadow-sm"
                                  >
                                    Admit Patient
                                  </button>
                                ) : (
                                  <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase">
                                    <Clock size={14} /> {statusLabel}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        // Hierarchy View
        !selectedWard ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5 4xl:grid-cols-6 gap-6">
            {currentWards.map((ward) => (
              <div
                key={ward.id}
                onClick={() => setSelectedWard(ward)}
                className="group relative bg-white rounded-[40px] border border-slate-200 p-8 hover:border-brand-primary hover:shadow-lg hover:shadow-brand-active transition-all cursor-pointer"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="p-4 bg-brand-active text-brand-primary rounded-3xl group-hover:bg-brand-primary group-hover:text-white transition-colors">
                    <Building2 size={32} />
                  </div>
                  <span className="text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest bg-slate-100 text-slate-500">
                    {ward.department}
                  </span>
                </div>

                <h3 className="text-xl font-black text-slate-800 mb-1">
                  {ward.name}
                </h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">
                  {formatWardName(ward.ward_type)}
                </p>

                <div className="flex items-center gap-2 text-xs font-bold text-brand-primary group-hover:translate-x-2 transition-transform">
                  View Rooms <ArrowLeft className="rotate-180" size={14} />
                </div>
              </div>
            ))}
            {currentWards.length === 0 && (
              <div className="col-span-full text-center py-20 text-slate-400 font-bold">
                No wards found for this type. Create one to get started.
              </div>
            )}
          </div>
        ) : !selectedRoom ? (
          // LEVEL 2: ROOMS GRID
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5 4xl:grid-cols-6 gap-6">
            {currentRooms.map((room) => (
              <div
                key={room.id}
                onClick={() => setSelectedRoom(room)}
                className="group relative bg-white rounded-[40px] border border-slate-200 p-8 hover:border-brand-primary hover:shadow-lg hover:shadow-brand-active transition-all cursor-pointer"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="p-4 bg-emerald-50 text-emerald-600 rounded-3xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <DoorOpen size={32} />
                  </div>
                </div>

                <h3 className="text-2xl font-black text-slate-800 mb-1">
                  {room.room_number}
                </h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">
                  Room ID: {room.id}
                </p>

                <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 group-hover:translate-x-2 transition-transform">
                  View Beds <ArrowLeft className="rotate-180" size={14} />
                </div>
              </div>
            ))}
            {currentRooms.length === 0 && (
              <div className="col-span-full text-center py-20 text-slate-400 font-bold">
                No rooms found in this ward.
              </div>
            )}
          </div>
        ) : (
          // LEVEL 3: BEDS GRID
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5 4xl:grid-cols-6 gap-6">
            {currentBeds.map((bed) => (
              <div
                key={bed.id}
                className={`group relative rounded-[44px] border-2 transition-all p-7 min-h-[16rem] flex flex-col justify-between shadow-sm
                ${bed.bed_status === "OCCUPIED"
                    ? "bg-white border-brand-active hover:border-brand-active0 hover:shadow-brand-active"
                    : bed.bed_status === "AVAILABLE"
                      ? "bg-white border-emerald-100 border-dashed hover:border-emerald-500 hover:bg-emerald-50/20"
                      : "bg-slate-50 border-slate-200"
                  }
                `}
              >
                <div className="flex items-start justify-between">
                  <div
                    className={`w-16 h-16 rounded-3xl flex items-center justify-center font-black text-xl transition-all
                    ${bed.bed_status === "OCCUPIED" ? "bg-brand-primary text-white shadow-xl shadow-brand-active" : bed.bed_status === "AVAILABLE" ? "bg-emerald-50 text-emerald-600" : "bg-slate-200 text-slate-400"}
                `}
                  >
                    {bed.bed_number}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border
                    ${bed.bed_status === "OCCUPIED" ? "bg-brand-active text-brand-primary border-brand-active" : bed.bed_status === "AVAILABLE" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-100 text-slate-500"}
                    `}
                    >
                      {bed.bed_status}
                    </span>
                  </div>
                </div>

                {bed.bed_status === "OCCUPIED" && bed.patient ? (
                  <div className="mt-4 animate-in fade-in duration-300">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-black text-slate-800 text-lg leading-tight truncate">
                          {bed.patient.name}
                        </h4>
                        <p className="text-xs font-bold text-brand-primary uppercase tracking-wider mt-1">
                          {bed.patient.mrn}
                        </p>
                      </div>
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveBedMenu(
                              activeBedMenu === bed.id ? null : bed.id,
                            );
                          }}
                          className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
                        >
                          <MoreVertical size={20} />
                        </button>

                        {activeBedMenu === bed.id && (
                          <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 z-20 overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="p-2 space-y-1">
                              <button
                                onClick={() => {
                                  setShowDoctorTransferModal(bed);
                                  setActiveBedMenu(null);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-brand-primary rounded-xl transition-colors text-left"
                              >
                                <UserCog size={16} /> Doctor Transfer
                              </button>
                              <button
                                onClick={() => {
                                  setShowBedTransferModal(bed);
                                  setActiveBedMenu(null);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-brand-primary rounded-xl transition-colors text-left"
                              >
                                <ArrowRightLeft size={16} /> Bed Transfer
                              </button>
                              <div className="h-px bg-slate-100 my-1"></div>
                              <button className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-brand-primary rounded-xl transition-colors text-left">
                                <FileText size={16} /> Admission Letter
                              </button>
                              <button
                                onClick={() =>
                                  window.open(
                                    `/print/wristband/${bed.patient.admission_number}`,
                                    "_blank",
                                  )
                                }
                                className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-brand-primary rounded-xl transition-colors text-left"
                              >
                                <Tag size={16} /> Print Wristband
                              </button>
                              <div className="h-px bg-slate-100 my-1"></div>
                              <button
                                onClick={() => { setShowDischargeModal(bed); setActiveBedMenu(null); }}
                                disabled={bed.patient?.discharge_stage === 'DOCTOR_MARKED'}
                                className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-bold rounded-xl transition-colors text-left ${bed.patient?.discharge_stage === 'DOCTOR_MARKED'
                                  ? 'text-slate-400 bg-slate-50 cursor-not-allowed opacity-60'
                                  : 'text-rose-500 hover:bg-rose-50'
                                  }`}
                              >
                                <LogOut size={16} />
                                {bed.patient?.discharge_stage === 'DOCTOR_MARKED' ? 'Discharged' : 'Discharge'}
                              </button>
                              {bed.patient?.discharge_stage && bed.patient.discharge_stage !== 'ACTIVE' && (
                                <button
                                  onClick={() => { setShowSummaryModal(bed.patient.encounter_id ?? bed.patient.admission_id); setActiveBedMenu(null); }}
                                  className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors text-left"
                                >
                                  <FileText size={16} /> View Summary
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Stethoscope size={14} className="text-brand-primary" />
                        <span className="font-medium truncate">
                          Dr. {bed.patient.doctor_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Clock size={14} className="text-brand-primary" />
                        <span className="font-medium">
                          {new Date(bed.patient.admission_date).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : bed.bed_status === "AVAILABLE" ? (
                  <div className="flex-1 flex flex-col items-center justify-center">
                    <button
                      onClick={() => setShowAdmitModal(bed)}
                      className="flex flex-col items-center gap-3 text-slate-400 hover:text-emerald-600 transition-all group"
                    >
                      <div className="p-4 rounded-[20px] bg-slate-50 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm border border-slate-100">
                        <Plus size={28} />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                        Admit Patient
                      </span>
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center opacity-40">
                    <Activity
                      className="text-amber-500 mb-3 animate-pulse"
                      size={36}
                    />
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">
                      {bed.bed_status}
                    </span>
                  </div>
                )}
              </div>
            ))}
            {currentBeds.length === 0 && (
              <div className="col-span-full text-center py-20 text-slate-400 font-bold">
                No beds found in this room.
              </div>
            )}
          </div>
        ))}

      {/* Doctor Transfer Modal */}
      {showDoctorTransferModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setShowDoctorTransferModal(null)}
          />
          <div className="relative bg-white w-full max-w-md rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-brand-active/30">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-brand-primary text-white rounded-2xl shadow-lg shadow-brand-active">
                  <UserCog size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">
                    Transfer Doctor
                  </h2>
                  <p className="text-xs text-brand-primary font-bold uppercase tracking-widest">
                    Select New Physician
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDoctorTransferModal(null)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-10 space-y-6">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Current Patient
                </p>
                <h4 className="font-black text-slate-800 text-lg">
                  {showDoctorTransferModal.patient.name}
                </h4>
                <p className="text-xs font-medium text-slate-500 mt-1">
                  Currently assigned to:{" "}
                  <span className="text-brand-primary font-bold">
                    {showDoctorTransferModal.patient.doctor_name}
                  </span>
                </p>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  New Doctor
                </label>
                <select
                  value={transferDoctorId}
                  onChange={(e) => setTransferDoctorId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-brand-active0"
                >
                  <option value="">Select a doctor...</option>
                  {doctors.map((d) => (
                    <option key={d.doctor_id} value={d.doctor_id}>
                      Dr. {d.first_name} {d.last_name} ({d.specialization_name})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="px-10 py-8 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDoctorTransferModal(null)}
                className="px-6 py-2.5 text-xs font-black text-slate-400 uppercase tracking-widest"
              >
                Cancel
              </button>
              <button
                onClick={handleDoctorTransfer}
                disabled={!transferDoctorId || isActionLoading}
                className="bg-brand-primary text-white px-8 py-3 rounded-[24px] font-black uppercase text-xs tracking-widest shadow-xl shadow-brand-active hover:bg-brand-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isActionLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                Confirm Transfer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bed Transfer Modal */}
      {showBedTransferModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setShowBedTransferModal(null)}
          />
          <div className="relative bg-white w-full max-w-md rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-brand-active/30">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-brand-primary text-white rounded-2xl shadow-lg shadow-brand-active">
                  <ArrowRightLeft size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">
                    Transfer Bed
                  </h2>
                  <p className="text-xs text-brand-primary font-bold uppercase tracking-widest">
                    Move Patient
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBedTransferModal(null)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-10 space-y-6">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Current Location
                </p>
                <h4 className="font-black text-slate-800 text-lg">
                  {showBedTransferModal.patient.name}
                </h4>
                <p className="text-xs font-medium text-slate-500 mt-1">
                  {selectedWard?.name} • {selectedRoom?.room_number} •{" "}
                  <span className="text-brand-primary font-bold">
                    {showBedTransferModal.bed_number}
                  </span>
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    New Ward
                  </label>
                  <select
                    value={transferWardId}
                    onChange={(e) => {
                      setTransferWardId(e.target.value);
                      setTransferRoomId("");
                      setTransferBedId("");
                    }}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-brand-active0"
                  >
                    <option value="">Select Ward...</option>
                    {wards.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    New Room
                  </label>
                  <select
                    value={transferRoomId}
                    onChange={(e) => {
                      setTransferRoomId(e.target.value);
                      setTransferBedId("");
                    }}
                    disabled={!transferWardId}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-brand-active0 disabled:opacity-50"
                  >
                    <option value="">Select Room...</option>
                    {availableRooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.room_number}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    New Bed
                  </label>
                  <select
                    value={transferBedId}
                    onChange={(e) => setTransferBedId(e.target.value)}
                    disabled={!transferRoomId}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-brand-active0 disabled:opacity-50"
                  >
                    <option value="">Select Bed...</option>
                    {availableBeds.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.bed_number}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="px-10 py-8 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowBedTransferModal(null)}
                className="px-6 py-2.5 text-xs font-black text-slate-400 uppercase tracking-widest"
              >
                Cancel
              </button>
              <button
                onClick={handleBedTransfer}
                disabled={!transferBedId || isActionLoading}
                className="bg-brand-primary text-white px-8 py-3 rounded-[24px] font-black uppercase text-xs tracking-widest shadow-xl shadow-brand-active hover:bg-brand-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isActionLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                Confirm Transfer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Success Modal */}
      {transferSuccess && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <div className="relative bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-100">
                <CheckCircle2 size={40} />
              </div>
              <h2 className="text-2xl font-black text-slate-800 mb-2">
                Transfer Successful!
              </h2>
              <p className="text-slate-500 font-medium mb-8">
                Patient has been moved to <br />
                <span className="text-slate-800 font-bold">
                  {transferSuccess.ward.name}
                </span>{" "}
                •{" "}
                <span className="text-brand-primary font-bold">
                  {transferSuccess.bed_number}
                </span>
              </p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setSelectedWard(transferSuccess.ward);
                    setSelectedRoom(transferSuccess.room);
                    setTransferSuccess(null);
                  }}
                  className="w-full bg-brand-primary text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-brand-active hover:bg-brand-primary transition-all flex items-center justify-center gap-2"
                >
                  Go to {transferSuccess.room.room_number}{" "}
                  <ArrowRight size={16} />
                </button>
                <button
                  onClick={() => setTransferSuccess(null)}
                  className="w-full bg-slate-100 text-slate-500 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all"
                >
                  Stay Here
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ward Setup Modal */}
      {showWardSetupModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setShowWardSetupModal(false)}
          />
          <div className="relative bg-white w-full max-w-lg rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-brand-active/30">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-brand-primary text-white rounded-2xl shadow-lg shadow-brand-active">
                  <Settings size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">
                    Ward Setup
                  </h2>
                  <p className="text-xs text-brand-primary font-bold uppercase tracking-widest">
                    Create New Facility
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowWardSetupModal(false)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-10 space-y-6">
              {/* Mode Toggle */}
              <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
                <button
                  onClick={() => setSetupMode("AUTO")}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${setupMode === "AUTO" ? "bg-white shadow text-brand-primary" : "text-slate-500"}`}
                >
                  Automatic Setup
                </button>
                <button
                  onClick={() => setSetupMode("MANUAL")}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${setupMode === "MANUAL" ? "bg-white shadow text-brand-primary" : "text-slate-500"}`}
                >
                  Manual Setup
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Ward Name
                  </label>
                  <input
                    value={newWardData.name}
                    onChange={(e) =>
                      setNewWardData({ ...newWardData, name: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-brand-active0"
                    placeholder="e.g. Male General Ward"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Ward Type
                  </label>
                  <select
                    value={newWardData.ward_type}
                    onChange={(e) =>
                      setNewWardData({
                        ...newWardData,
                        ward_type: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-brand-active0"
                  >
                    {WARD_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {formatWardName(t)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Department
                  </label>
                  <input
                    value={newWardData.department}
                    onChange={(e) =>
                      setNewWardData({
                        ...newWardData,
                        department: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-brand-active0"
                    placeholder="e.g. Internal Medicine"
                  />
                </div>

                {setupMode === "AUTO" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Rooms
                      </label>
                      <input
                        type="number"
                        value={newWardData.rooms}
                        onChange={(e) =>
                          setNewWardData({
                            ...newWardData,
                            rooms: parseInt(e.target.value),
                          })
                        }
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-brand-active0"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Beds Per Room
                      </label>
                      <input
                        type="number"
                        value={newWardData.beds_per_room}
                        onChange={(e) =>
                          setNewWardData({
                            ...newWardData,
                            beds_per_room: parseInt(e.target.value),
                          })
                        }
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-brand-active0"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="px-10 py-8 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowWardSetupModal(false)}
                className="px-6 py-2.5 text-xs font-black text-slate-400 uppercase tracking-widest"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateWard}
                disabled={isActionLoading}
                className="bg-brand-primary text-white px-8 py-3 rounded-[24px] font-black uppercase text-xs tracking-widest shadow-xl shadow-brand-active hover:bg-brand-primary transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isActionLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                {setupMode === "AUTO" ? "Generate Ward" : "Create Ward"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admission Modal */}
      {showAdmitModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setShowAdmitModal(null)}
          />
          <div className="relative bg-white w-full max-w-lg max-h-[90vh] flex flex-col rounded-[32px] md:rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 mx-auto">
            <div className="px-6 md:px-10 py-6 md:py-8 border-b border-slate-100 flex items-center justify-between bg-emerald-50/30 shrink-0">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-200">
                  <Stethoscope size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">
                    Admit Patient
                  </h2>
                  <p className="text-xs text-emerald-600 font-bold uppercase tracking-widest">
                    Bed {showAdmitModal.bed_number}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAdmitModal(null)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 md:p-10 space-y-6 flex-1 overflow-y-auto min-h-0">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Search Patient by MRN
                </label>
                <div className="flex gap-2">
                  <input
                    value={searchMrn}
                    onChange={(e) => setSearchMrn(e.target.value)}
                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-emerald-500"
                    placeholder="Enter MRN (e.g. 100005)"
                  />
                  <button
                    onClick={handleSearchPatient}
                    className="bg-slate-800 text-white px-6 py-3 rounded-2xl font-bold text-xs hover:bg-slate-900 transition-colors"
                  >
                    Search
                  </button>
                </div>
              </div>

              {searchedPatient && (
                <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 flex items-start gap-4 animate-in fade-in slide-in-from-top-2">
                  {searchedPatient.demographics.photo_url ? (
                    <img
                      src={searchedPatient.demographics.photo_url}
                      alt="Patient"
                      className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-black text-xl border-2 border-white shadow-sm shrink-0">
                      {searchedPatient.demographics.first_name?.charAt(0)}
                      {searchedPatient.demographics.last_name?.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1">
                    <h4 className="font-black text-slate-800 text-lg">
                      {searchedPatient.demographics.first_name}{" "}
                      {searchedPatient.demographics.last_name}
                    </h4>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="px-2 py-1 bg-white rounded-lg text-[10px] font-bold text-slate-500 border border-slate-100">
                        {searchedPatient.demographics.gender}
                      </span>
                      <span className="px-2 py-1 bg-white rounded-lg text-[10px] font-bold text-slate-500 border border-slate-100">
                        {calculateAge(
                          searchedPatient.demographics.date_of_birth,
                        )}
                      </span>
                      <span className="px-2 py-1 bg-white rounded-lg text-[10px] font-bold text-slate-500 border border-slate-100">
                        {searchedPatient.medical_profile.blood_group}
                      </span>
                      <span className="px-2 py-1 bg-brand-active rounded-lg text-[10px] font-bold text-brand-primary border border-brand-active">
                        {searchedPatient.payer.payer_name}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSearchedPatient(null);
                      setSearchMrn("");
                    }}
                    className="text-slate-400 hover:text-rose-500"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Admitting Doctor
                </label>
                <select
                  value={admissionData.admitting_doctor_id}
                  onChange={(e) =>
                    setAdmissionData({
                      ...admissionData,
                      admitting_doctor_id: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-emerald-500"
                >
                  <option value="">Select a doctor...</option>
                  {doctors.map((d) => (
                    <option key={d.doctor_id} value={d.doctor_id}>
                      Dr. {d.first_name} {d.last_name} ({d.specialization_name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Source
                  </label>
                  <select
                    value={admissionData.admission_source}
                    onChange={(e) =>
                      setAdmissionData({
                        ...admissionData,
                        admission_source: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-emerald-500"
                  >
                    <option value="OPD">OPD</option>
                    <option value="ED">Emergency</option>
                    <option value="TRANSFER">Transfer</option>
                    <option value="DIRECT">Direct</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Reason for Admission
                </label>
                <textarea
                  value={admissionData.admission_reason}
                  onChange={(e) =>
                    setAdmissionData({
                      ...admissionData,
                      admission_reason: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-emerald-500 min-h-[100px]"
                  placeholder="Enter diagnosis or reason..."
                />
              </div>
            </div>

            <div className="px-6 md:px-10 py-6 md:py-8 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 shrink-0">
              <button
                onClick={() => setShowAdmitModal(null)}
                className="px-6 py-2.5 text-xs font-black text-slate-400 uppercase tracking-widest"
              >
                Cancel
              </button>
              <button
                onClick={handleAdmitPatient}
                disabled={
                  !searchedPatient || !admissionData.admitting_doctor_id || isActionLoading
                }
                className="bg-emerald-600 text-white px-8 py-3 rounded-[24px] font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-200 hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isActionLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                Confirm Admission
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Discharge Modal */}
      {showDischargeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setShowDischargeModal(null)}
          />
          <div className="relative bg-white w-full max-w-lg rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-rose-50/30 shrink-0">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-rose-600 text-white rounded-2xl shadow-lg shadow-rose-200">
                  <LogOut size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">
                    Mark for Discharge
                  </h2>
                  <p className="text-xs text-rose-600 font-bold uppercase tracking-widest">
                    Patient: {showDischargeModal.patient.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDischargeModal(null)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-10 space-y-6 overflow-y-auto">
              {/* Reason Search & Select */}
              <div className="relative">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Discharge Reason
                </label>
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-rose-600 transition-colors" size={16} />
                  <input
                    type="text"
                    placeholder="Search or select reason..."
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-rose-500 transition-all"
                    value={reasonSearchTerm}
                    onChange={(e) => { setReasonSearchTerm(e.target.value); setShowReasonList(true); }}
                    onFocus={() => setShowReasonList(true)}
                    onBlur={() => setTimeout(() => setShowReasonList(false), 150)}
                  />

                  {/* Dropdown Results */}
                  {showReasonList && (
                    <div className="absolute top-full left-0 right-0 mt-2 max-h-48 overflow-y-auto bg-white border border-slate-100 rounded-2xl shadow-xl space-y-1 p-1 z-[60]">
                      {dischargeReasons
                        .filter(r => r.name.toLowerCase().includes(reasonSearchTerm.toLowerCase()))
                        .map((reason) => (
                          <button
                            key={reason.id}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setDischargeFormData({ ...dischargeFormData, discharge_reason_id: reason.id.toString() });
                              setReasonSearchTerm(reason.name);
                              setShowReasonList(false);
                            }}
                            className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all
                              ${dischargeFormData.discharge_reason_id === reason.id.toString()
                                ? 'bg-rose-600 text-white'
                                : 'text-slate-600 hover:bg-rose-50 hover:text-rose-600'}
                            `}
                          >
                            {reason.name}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Discharge Notes
                </label>
                <textarea
                  value={dischargeFormData.discharge_notes}
                  onChange={(e) =>
                    setDischargeFormData({
                      ...dischargeFormData,
                      discharge_notes: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-rose-500 min-h-[120px]"
                  placeholder="Enter clinical notes or follow-up instructions..."
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Doctor Signature
                </label>
                <div className="mt-1.5 h-32 bg-slate-50 border border-dashed border-slate-300 rounded-2xl overflow-hidden">
                  <SignaturePad
                    onEnd={(dataUrl) => setDischargeFormData({ ...dischargeFormData, doctor_signature: dataUrl })}
                    onClear={() => setDischargeFormData({ ...dischargeFormData, doctor_signature: "" })}
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Patient Witness Name
                </label>
                <input
                  type="text"
                  value={dischargeFormData.patient_witness_name}
                  onChange={(e) => setDischargeFormData({ ...dischargeFormData, patient_witness_name: e.target.value })}
                  placeholder="e.g. John Doe (Brother)"
                  className="w-full mt-1.5 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-rose-500 transition-all"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Patient Witness Signature
                </label>
                <div className="mt-1.5 h-32 bg-slate-50 border border-dashed border-slate-300 rounded-2xl overflow-hidden">
                  <SignaturePad
                    onEnd={(dataUrl) => setDischargeFormData({ ...dischargeFormData, patient_witness: dataUrl })}
                    onClear={() => setDischargeFormData({ ...dischargeFormData, patient_witness: "" })}
                  />
                </div>
              </div>
            </div>

            <div className="px-10 py-8 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
              <button
                onClick={() => setShowDischargeModal(null)}
                className="px-6 py-2.5 text-xs font-black text-slate-400 uppercase tracking-widest"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkForDischarge}
                disabled={!dischargeFormData.discharge_reason_id || !dischargeFormData.doctor_signature || isActionLoading}
                className="bg-rose-600 text-white px-8 py-3 rounded-[24px] font-black uppercase text-xs tracking-widest shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isActionLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                Confirm Discharge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discharge Summary Modal */}
      <DischargeSummaryModal
        isOpen={!!showSummaryModal}
        onClose={() => setShowSummaryModal(null)}
        encounterId={showSummaryModal!}
        isERD={false}
      />
    </div>
  );
};

export default BedManagement;
