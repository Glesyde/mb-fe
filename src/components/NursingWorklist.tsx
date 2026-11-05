import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  Search,
  AlertCircle,
  User,
  Stethoscope,
  MapPin,
  Filter,
  Loader2,
  FilePlus,
  MoreVertical,
  LogOut,
  RotateCcw,
  CheckCircle2,
  X
} from 'lucide-react';
import { emrService } from '../services/emr.service';
import { wardService } from '../services/ward.service';
import { erdService } from '../services/erd.service';
import { useNotification } from '../context/NotificationContext';
import NurseClearanceModal from './NurseClearanceModal';
import ReversalModal from './ReversalModal';
import DischargeSummaryModal from './DischargeSummaryModal';
import SignaturePad from './SignaturePad';

interface WorklistItem {
  id: string;
  encounter_number: string;
  patientName: string;
  mrn: string;
  location: string;
  complaint: string;
  status: string;
  arrivalTime: string;
  gender?: string;
  encounter_type?: string;
  admission_id?: number;
  encounter_id?: number;
  discharge_stage?: string;
  doctor_name?: string;
  specialization_name?: string;
  age?: string;
  phone?: string;
  payer?: string;
  admission_number?: string;
  admission_date?: string;
}

const EMRWorklist: React.FC = () => {
  const navigate = useNavigate();
  const { notify } = useNotification();
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [worklist, setWorklist] = useState<WorklistItem[]>([]);

  const [activeTab, setActiveTab] = useState<'OPD' | 'IPD' | 'ERD'>('OPD');
  const [filterType, setFilterType] = useState<'TODAY' | 'DATE' | 'ALL'>('TODAY');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Dropdown State
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Discharge State
  const [showDischargeModal, setShowDischargeModal] = useState<any>(null);
  const [isSubmittingDischarge, setIsSubmittingDischarge] = useState(false);
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
  const [showNurseClearanceModal, setShowNurseClearanceModal] = useState<any>(null);
  const [showReversalModal, setShowReversalModal] = useState<{
    admissionId: number;
    action: string;
    title: string;
    description: string;
    patientName: string;
    isERD: boolean;
  } | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState<number | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'IPD' || activeTab === 'ERD') {
        const res = activeTab === 'IPD' ? await wardService.getAdmissions() : await erdService.getAdmissions();
        const admissions = res?.data?.results || res?.data || [];
        const mapped: WorklistItem[] = admissions.map((adm: any) => ({
          id: adm.admission_id.toString(),
          encounter_number: adm.encounter_number,
          patientName: `${adm.first_name} ${adm.last_name}`,
          mrn: adm.mrn,
          location: activeTab === 'IPD' 
            ? `${adm.ward_name} ${adm.bed_number || ''}`.trim()
            : `Emergency Room - ${adm.bed_number?.replace('Emergency Room ', '') || 'N/A'}`,
          complaint: activeTab === 'IPD' ? 'Inpatient Admission' : 'Emergency Visit',
          status: adm.status,
          arrivalTime: adm.admission_date,
          gender: adm.gender,
          encounter_type: activeTab,
          admission_id: adm.admission_id,
          encounter_id: adm.encounter_id,
          discharge_stage: adm.discharge_stage,
          doctor_name: adm.doctor_first_name ? `${adm.doctor_first_name} ${adm.doctor_last_name || ''}`.trim() : (adm.doctor_name || adm.attending_doctor || 'Unassigned'),
          specialization_name: adm.specialization_name || adm.specialty || adm.department || (activeTab === 'IPD' ? adm.ward_name : 'Emergency Room'),
          age: adm.display_age || (adm.age_years !== undefined ? `${adm.age_years}y` : undefined),
          phone: adm.phone,
          payer: adm.payer_name || adm.payer_type_name,
          admission_number: adm.admission_number,
          admission_date: adm.admission_date
        }));
        setWorklist(mapped);
      } else {
        let encounters = [];
        if (filterType === 'TODAY') {
          encounters = await emrService.getTodayEncounters();
        } else if (filterType === 'DATE') {
          encounters = await emrService.getEncountersByDate(selectedDate);
        } else {
          encounters = await emrService.getAllEncounters();
        }

        const mapped: WorklistItem[] = encounters
          .filter((enc: any) => enc.encounter_type === activeTab)
          .map((enc: any) => ({
            id: enc.id.toString(),
            encounter_number: enc.encounter_number,
            patientName: `${enc.first_name} ${enc.last_name}`,
            mrn: enc.mrn,
            location: enc.specialization_name || 'GOPD',
            complaint: enc.visit_reason || 'General Visit',
            status: enc.encounter_status === 'OPEN' ? 'To be seen' : enc.encounter_status,
            arrivalTime: enc.started_at,
            gender: enc.gender,
            encounter_type: activeTab,
            doctor_name: enc.doctor_name,
            specialization_name: enc.specialization_name,
            age: enc.display_age || (enc.age_years !== undefined ? `${enc.age_years}y` : undefined),
            phone: enc.phone,
            payer: enc.payer_name || enc.payer_type_name
          }));

        setWorklist(mapped);
      }
    } catch (err) {
      console.error(err);
      notify('Failed to load encounters', 'error');
    } finally {
      setLoading(false);
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

  useEffect(() => {
    fetchData();
    fetchDischargeReasons();
  }, [filterType, selectedDate, activeTab]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRefresh = () => {
    fetchData();
  };

  const handleDischargeAction = async (action: string, admissionId: number, encounterType: string = 'IPD') => {
    setOpenDropdownId(null);
    try {
      if (encounterType === 'ERD') {
        if (action === 'markForDischarge') {
          const item = worklist.find(i => i.admission_id === admissionId);
          setShowDischargeModal({ 
            patient: { 
              name: item?.patientName, 
              admission_id: admissionId,
              isERD: true
            } 
          });
          return;
        } else if (action === 'reverseDoctorMark') {
          const item = worklist.find(i => i.admission_id === admissionId);
          setShowReversalModal({
            admissionId, action, isERD: true, patientName: item?.patientName || '',
            title: 'Reverse Doctor Mark',
            description: 'Are you sure you want to reverse the doctor mark for discharge?'
          });
          return;
        } else if (action === 'nurseClearance') {
          const item = worklist.find(i => i.admission_id === admissionId);
          setShowNurseClearanceModal({
            patientName: item?.patientName,
            admissionId: admissionId,
            isERD: true
          });
          return;
        } else if (action === 'reverseNurseClearance') {
          const item = worklist.find(i => i.admission_id === admissionId);
          setShowReversalModal({
            admissionId, action, isERD: true, patientName: item?.patientName || '',
            title: 'Reverse Nurse Clearance',
            description: 'Are you sure you want to reverse the nurse clearance?'
          });
          return;
        }
      } else {
        if (action === 'markForDischarge') {
          const item = worklist.find(i => i.admission_id === admissionId);
          setShowDischargeModal({ 
            patient: { 
              name: item?.patientName, 
              admission_id: admissionId 
            } 
          });
          return;
        } else if (action === 'reverseDoctorMark') {
          const item = worklist.find(i => i.admission_id === admissionId);
          setShowReversalModal({
            admissionId, action, isERD: false, patientName: item?.patientName || '',
            title: 'Reverse Doctor Mark',
            description: 'Are you sure you want to reverse the doctor mark for discharge?'
          });
          return;
        } else if (action === 'nurseClearance') {
          const item = worklist.find(i => i.admission_id === admissionId);
          setShowNurseClearanceModal({
            patientName: item?.patientName,
            admissionId: admissionId,
            isERD: false
          });
          return;
        } else if (action === 'reverseNurseClearance') {
          const item = worklist.find(i => i.admission_id === admissionId);
          setShowReversalModal({
            admissionId, action, isERD: false, patientName: item?.patientName || '',
            title: 'Reverse Nurse Clearance',
            description: 'Are you sure you want to reverse the nurse clearance?'
          });
          return;
        }
      }

      notify('Action successful', 'success');
      fetchData();
    } catch (err: any) {
      notify(err.response?.data?.message || 'Failed to perform action', 'error');
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

    setIsSubmittingDischarge(true);
    try {
      if (showDischargeModal.patient.isERD) {
        await erdService.markForDischarge({
          admission_id: showDischargeModal.patient.admission_id,
          discharge_reason_id: parseInt(dischargeFormData.discharge_reason_id),
          discharge_notes: dischargeFormData.discharge_notes,
          doctor_signature: dischargeFormData.doctor_signature,
          patient_witness: dischargeFormData.patient_witness,
        });
      } else {
        await wardService.markForDischarge({
          admission_id: showDischargeModal.patient.admission_id,
          discharge_reason_id: parseInt(dischargeFormData.discharge_reason_id),
          discharge_notes: dischargeFormData.discharge_notes,
          doctor_signature: dischargeFormData.doctor_signature,
          patient_witness_name: dischargeFormData.patient_witness_name,
          patient_witness: dischargeFormData.patient_witness,
        });
      }

      notify("Patient marked for discharge successfully", "success");
      setShowDischargeModal(null);
      setDischargeFormData({ discharge_reason_id: "", discharge_notes: "", doctor_signature: "", patient_witness_name: "", patient_witness: "" });
      setReasonSearchTerm("");
      fetchData();
    } catch (err: any) {
      console.error(err);
      notify(err.response?.data?.message || "Failed to mark for discharge", "error");
    } finally {
      setIsSubmittingDischarge(false);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Critical': return 'bg-red-50 text-red-600 border-red-100';
      case 'In Progress': return 'bg-brand-active text-brand-primary border-brand-active';
      case 'Stable': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      default: return 'bg-amber-50 text-amber-600 border-amber-100';
    }
  };

  const filtered = worklist.filter(p =>
    (p.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.mrn.toLowerCase().includes(searchTerm.toLowerCase())) &&
    p.encounter_type === activeTab
  );

  const handlePatientClick = (patient: WorklistItem) => {
    navigate('/emr/chart', {
      state: {
        patientMRN: patient.mrn,
        encounterNumber: patient.encounter_number,
        admission_id: patient.admission_id
      }
    });
  };

  const handleOrderEntry = (e: React.MouseEvent, patient: WorklistItem) => {
    e.stopPropagation();
    navigate('/emr/orders', {
      state: {
        patientName: patient.patientName,
        patientMRN: patient.mrn,
        encounterNumber: patient.encounter_number
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-brand-active text-brand-primary rounded-xl shrink-0">
              <ClipboardList size={24} className="md:w-7 md:h-7" />
            </div>
            <span className="truncate">My Active Worklist</span>
          </h1>
          <p className="text-slate-500 font-medium text-sm md:text-base">Manage clinical encounters and patient oversight.</p>
        </div>
      </div>

      {/* Filters & Tabs */}
      <div className="bg-white p-4 md:p-6 rounded-[32px] border border-slate-200 flex flex-col xl:flex-row gap-6 items-stretch xl:items-center shadow-sm">
        {/* Tab Switcher */}
        <div className="flex p-1 bg-slate-100 rounded-2xl shrink-0 overflow-x-auto no-scrollbar scroll-smooth">
          <button
            onClick={() => setActiveTab('OPD')}
            className={`flex-1 min-w-[120px] px-4 py-2.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'OPD' ? 'bg-white text-brand-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            OPD Encounters
          </button>
          <button
            onClick={() => setActiveTab('ERD')}
            className={`flex-1 min-w-[120px] px-4 py-2.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'ERD' ? 'bg-white text-brand-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            ERD Encounters
          </button>
          <button
            onClick={() => setActiveTab('IPD')}
            className={`flex-1 min-w-[120px] px-4 py-2.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'IPD' ? 'bg-white text-brand-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            IPD Encounters
          </button>
        </div>

        <div className="h-8 w-px bg-slate-200 hidden xl:block"></div>

        {/* Date Filters & Search */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 flex-1">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth">
            <button
              onClick={() => setFilterType('TODAY')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all whitespace-nowrap ${filterType === 'TODAY' ? 'bg-brand-active border-brand-active text-brand-primary' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              Today's List
            </button>
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all whitespace-nowrap ${filterType === 'ALL' ? 'bg-brand-active border-brand-active text-brand-primary' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              All History
            </button>

            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${filterType === 'DATE' ? 'bg-brand-active border-brand-active' : 'bg-white border-slate-200'}`}>
              <input
                type="radio"
                checked={filterType === 'DATE'}
                onChange={() => setFilterType('DATE')}
                className="w-4 h-4 text-brand-primary cursor-pointer"
              />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setFilterType('DATE');
                }}
                className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 flex-1 max-w-[280px] xl:max-w-md">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-brand-primary transition-colors" />
              <input
                type="text"
                placeholder="Search by name or MRN..."
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-4 focus:ring-brand-active0/10 outline-none transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-4 py-2.5 md:px-5 md:py-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 text-slate-600 text-xs font-bold transition-colors shadow-sm whitespace-nowrap"
            >
              <Loader2 size={16} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[32px] md:rounded-[40px] border border-slate-200 overflow-hidden shadow-sm min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full py-20">
            <Loader2 className="animate-spin text-brand-primary mb-4" size={40} />
            <p className="text-sm font-bold text-slate-400">Loading encounters...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-20 px-6 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
              <ClipboardList className="text-slate-300" size={32} />
            </div>
            <p className="text-sm font-bold text-slate-400">No active encounters found.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Patient Details</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Provider & Spec.</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Location</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Visit Info</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => handlePatientClick(item)}
                      className="hover:bg-slate-50/30 transition-colors group cursor-pointer"
                    >
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm ${item.status === 'Critical' ? 'bg-red-500 animate-pulse' : 'bg-slate-100 text-slate-400 group-hover:bg-brand-primary group-hover:text-white transition-all'}`}>
                            {item.patientName.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-800">{item.patientName}</p>
                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] font-mono font-bold text-brand-primary">{item.mrn}</span>
                              {item.gender && <span className="text-[10px] font-bold text-slate-400">{item.gender}</span>}
                              {item.age && <span className="text-[10px] font-bold text-slate-400">{item.age}</span>}
                            </div>
                            {(item.phone || item.payer) && (
                              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                {item.phone && <span className="text-[10px] font-medium text-slate-500">{item.phone}</span>}
                                {item.phone && item.payer && <span className="text-[10px] text-slate-300">•</span>}
                                {item.payer && <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-bold max-w-[120px] truncate" title={item.payer}>{item.payer}</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex flex-col gap-1.5">
                          {item.doctor_name && (
                            <div className="flex items-center gap-2 text-slate-700">
                              <Stethoscope size={14} className="text-slate-400" />
                              <span className="text-xs font-bold">{item.doctor_name}</span>
                            </div>
                          )}
                          {item.specialization_name && (
                            <span className="text-[10px] font-bold text-brand-primary ml-5">{item.specialization_name}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-2 text-slate-800">
                          <MapPin size={14} className="text-slate-400" />
                          <span className="text-xs font-bold">{item.location}</span>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex flex-col gap-1">
                          <p className="text-xs font-bold text-slate-700 line-clamp-2" title={item.complaint}>{item.complaint}</p>
                          <span className="text-[10px] font-medium text-slate-400">
                            {item.admission_date ?? item.arrivalTime}
                          </span>
                          {item.admission_number && <span className="text-[10px] font-mono font-bold text-brand-primary">{item.admission_number}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex flex-col items-start gap-1.5">
                          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${getStatusStyle(item.status)}`}>
                            {item.status}
                          </div>
                          {item.discharge_stage && item.discharge_stage !== 'ACTIVE' && item.discharge_stage !== 'NONE' && (
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9.5px] font-bold uppercase tracking-widest bg-brand-active text-brand-primary border border-brand-active">
                              {item.discharge_stage.replace(/_/g, ' ')}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-6 text-right relative">
                        {(activeTab === 'IPD' || activeTab === 'ERD') ? (
                          <div className="flex justify-end items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (openDropdownId === item.id) {
                                  setOpenDropdownId(null);
                                } else {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setDropdownPosition({
                                    top: rect.bottom + 8,
                                    right: window.innerWidth - rect.right
                                  });
                                  setOpenDropdownId(item.id);
                                }
                              }}
                              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              <MoreVertical size={18} />
                            </button>

                            {openDropdownId === item.id && createPortal(
                              <div
                                ref={dropdownRef}
                                className="fixed w-56 bg-white rounded-xl shadow-xl border border-slate-100 z-[9999] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                                style={{ top: dropdownPosition.top, right: dropdownPosition.right }}
                              >
                                <div className="py-1">
                                  <button
                                    onClick={(e) => { setOpenDropdownId(null); handleOrderEntry(e, item); }}
                                    className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                  >
                                    <FilePlus size={16} className="text-emerald-500" /> Orders
                                  </button>
                                  <button
                                    onClick={() => { setOpenDropdownId(null); handlePatientClick(item); }}
                                    className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                  >
                                    <Stethoscope size={16} className="text-brand-active0" /> Chart
                                  </button>

                                  <div className="h-px bg-slate-100 my-1"></div>

                                  {(() => {
                                    const isNone = (!item.discharge_stage || item.discharge_stage === 'ACTIVE' || item.discharge_stage === 'NONE') && !!item.admission_id;
                                    const isDoctorMarked = item.discharge_stage === 'DOCTOR_MARKED' && !!item.admission_id;
                                    const isNursingCleared = item.discharge_stage === 'NURSING_CLEARANCE' && !!item.admission_id;

                                    return (
                                      <>
                                        <button
                                          onClick={(e) => { if (isNone) { e.stopPropagation(); handleDischargeAction('markForDischarge', item.admission_id!, item.encounter_type); } }}
                                          disabled={!isNone}
                                          title={!isNone ? "Patient is already marked for discharge or further along." : ""}
                                          className={`w-full text-left px-4 py-2.5 text-sm font-medium flex items-center gap-2 ${isNone ? 'text-amber-600 hover:bg-amber-50' : 'text-slate-400 cursor-not-allowed opacity-60'}`}
                                        >
                                          <LogOut size={16} /> Mark for Discharge
                                        </button>

                                        <button
                                          onClick={(e) => { if (isDoctorMarked) { e.stopPropagation(); handleDischargeAction('nurseClearance', item.admission_id!, item.encounter_type); } }}
                                          disabled={!isDoctorMarked}
                                          title={!isDoctorMarked ? "Requires Doctor Mark first, or already cleared." : ""}
                                          className={`w-full text-left px-4 py-2.5 text-sm font-medium flex items-center gap-2 ${isDoctorMarked ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 cursor-not-allowed opacity-60'}`}
                                        >
                                          <CheckCircle2 size={16} /> Nurse Clearance
                                        </button>

                                        <button
                                          onClick={(e) => { if (isDoctorMarked) { e.stopPropagation(); handleDischargeAction('reverseDoctorMark', item.admission_id!, item.encounter_type); } }}
                                          disabled={!isDoctorMarked}
                                          title={!isDoctorMarked ? "Can only reverse if currently at Doctor Marked stage." : ""}
                                          className={`w-full text-left px-4 py-2.5 text-sm font-medium flex items-center gap-2 ${isDoctorMarked ? 'text-red-600 hover:bg-red-50' : 'text-slate-400 cursor-not-allowed opacity-60'}`}
                                        >
                                          <RotateCcw size={16} /> Reverse Doctor Mark
                                        </button>

                                        <button
                                          onClick={(e) => { if (isNursingCleared) { e.stopPropagation(); handleDischargeAction('reverseNurseClearance', item.admission_id!, item.encounter_type); } }}
                                          disabled={!isNursingCleared}
                                          title={!isNursingCleared ? "Can only reverse if currently at Nursing Clearance stage." : ""}
                                          className={`w-full text-left px-4 py-2.5 text-sm font-medium flex items-center gap-2 ${isNursingCleared ? 'text-red-600 hover:bg-red-50' : 'text-slate-400 cursor-not-allowed opacity-60'}`}
                                        >
                                          <RotateCcw size={16} /> Reverse Nurse Clearance
                                        </button>

                                        {!isNone && (
                                          <button
                                            onClick={(e) => { e.stopPropagation(); setOpenDropdownId(null); setShowSummaryModal(item.encounter_id ?? item.admission_id!); }}
                                            className="w-full text-left px-4 py-2.5 text-sm font-medium flex items-center gap-2 text-indigo-600 hover:bg-indigo-50 mt-1 border-t border-slate-50 pt-3"
                                          >
                                            <ClipboardList size={16} /> View Discharge Summary
                                          </button>
                                        )}
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>,
                              document.body
                            )}
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={(e) => handleOrderEntry(e, item)}
                              className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-2 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                            >
                              <FilePlus size={14} /> Orders
                            </button>
                            <button
                              onClick={() => handlePatientClick(item)}
                              className="flex items-center gap-1.5 text-[10px] font-black text-brand-primary uppercase tracking-widest bg-brand-active px-3 py-2 rounded-xl hover:bg-brand-primary hover:text-white transition-all shadow-sm"
                            >
                              <Stethoscope size={14} /> Chart
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile/Tablet Card View */}
            <div className="lg:hidden divide-y divide-slate-100">
              {filtered.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handlePatientClick(item)}
                  className="p-4 md:p-6 hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white shadow-sm shrink-0 ${item.status === 'Critical' ? 'bg-red-500 animate-pulse' : 'bg-slate-100 text-slate-400 group-hover:bg-brand-primary group-hover:text-white transition-all'}`}>
                        {item.patientName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-800 truncate">{item.patientName}</p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-1">
                          <span className="text-[10px] font-mono font-bold text-brand-primary shrink-0">{item.mrn}</span>
                          {item.gender && <span className="text-[10px] font-bold text-slate-400 shrink-0">{item.gender}</span>}
                          {item.age && <span className="text-[10px] font-bold text-slate-400 shrink-0">{item.age}</span>}
                          
                          <div className="w-full flex flex-col gap-1.5 mt-1">
                            <div className="flex items-center gap-1 text-slate-500 shrink-0">
                              <MapPin size={10} className="text-slate-400" />
                              <span className="text-[10px] font-bold text-slate-700">{item.location}</span>
                            </div>
                            {item.doctor_name && (
                              <div className="flex items-center gap-1 text-slate-500 shrink-0">
                                <Stethoscope size={10} className="text-slate-400" />
                                <span className="text-[10px] font-bold text-slate-700">{item.doctor_name}</span>
                                {item.specialization_name && (
                                  <span className="text-[10px] font-bold text-brand-primary ml-2">{item.specialization_name}</span>
                                )}
                              </div>
                            )}
                            {(item.phone || item.payer) && (
                              <div className="flex items-center gap-1.5">
                                {item.phone && <span className="text-[10px] font-medium text-slate-500">{item.phone}</span>}
                                {item.phone && item.payer && <span className="text-[10px] text-slate-300">•</span>}
                                {item.payer && <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-bold truncate" title={item.payer}>{item.payer}</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0 ml-4">
                      <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${getStatusStyle(item.status)}`}>
                        {item.status}
                      </div>
                    </div>
                  </div>

                  <div className="mb-4 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                    <p className="text-xs font-medium text-slate-500 leading-relaxed italic line-clamp-2">
                      <span className="text-[10px] font-black uppercase text-slate-400 mr-2 not-italic tracking-widest">Complaint:</span>
                      {item.complaint}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    {item.discharge_stage && item.discharge_stage !== 'ACTIVE' && item.discharge_stage !== 'NONE' && (
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-widest bg-brand-active text-brand-primary border border-brand-active">
                        {item.discharge_stage.replace(/_/g, ' ')}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 ml-auto w-full sm:w-auto">
                      {(activeTab === 'IPD' || activeTab === 'ERD') ? (
                        <div className="flex items-center gap-2 w-full justify-between sm:justify-end">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const rect = e.currentTarget.getBoundingClientRect();
                              setDropdownPosition({
                                top: rect.bottom + 8,
                                right: window.innerWidth - rect.right
                              });
                              setOpenDropdownId(item.id);
                            }}
                            className="p-2.5 text-slate-400 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 transition-colors"
                          >
                            <MoreVertical size={18} />
                          </button>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => handleOrderEntry(e, item)}
                              className="flex items-center justify-center gap-1.5 flex-1 px-4 py-2.5 text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 rounded-xl border border-emerald-100 active:scale-95 transition-transform"
                            >
                              <FilePlus size={14} /> Orders
                            </button>
                            <button
                              onClick={() => handlePatientClick(item)}
                              className="flex items-center justify-center gap-1.5 flex-1 px-4 py-2.5 text-[10px] font-black text-brand-primary uppercase tracking-widest bg-brand-active rounded-xl border border-brand-active active:scale-95 transition-transform"
                            >
                              <Stethoscope size={14} /> Chart
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 w-full">
                          <button
                            onClick={(e) => handleOrderEntry(e, item)}
                            className="flex items-center justify-center gap-2 flex-1 px-4 py-3 text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 rounded-xl border border-emerald-100 active:scale-95 transition-transform"
                          >
                            <FilePlus size={16} /> Orders
                          </button>
                          <button
                            onClick={() => handlePatientClick(item)}
                            className="flex items-center justify-center gap-2 flex-1 px-4 py-3 text-[10px] font-black text-brand-primary uppercase tracking-widest bg-brand-active rounded-xl border border-brand-active active:scale-95 transition-transform"
                          >
                            <Stethoscope size={16} /> Chart
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Discharge Modal */}
      {showDischargeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setShowDischargeModal(null)}
          />
          <div className="relative bg-white w-full max-w-lg rounded-[32px] md:rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 mx-auto max-h-[90vh] flex flex-col">
            <div className="px-6 md:px-10 py-6 md:py-8 border-b border-slate-100 flex items-center justify-between bg-rose-50/30 shrink-0">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="p-2 md:p-3 bg-rose-600 text-white rounded-xl md:rounded-2xl shadow-lg shadow-rose-200 shrink-0">
                  <LogOut size={20} className="md:w-6 md:h-6" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg md:text-xl font-black text-slate-800 tracking-tight truncate">
                    Mark for Discharge
                  </h2>
                  <p className="text-[9px] md:text-xs text-rose-600 font-bold uppercase tracking-widest truncate">
                    Patient: {showDischargeModal.patient.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDischargeModal(null)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 shrink-0"
              >
                <X size={20} className="md:w-6 md:h-6" />
              </button>
            </div>

            <div className="p-6 md:p-10 space-y-6 overflow-y-auto">
              <div className="relative">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Discharge Reason
                </label>
                <div className="relative group mt-1.5">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-rose-600 transition-colors" size={16} />
                  <input
                    type="text"
                    placeholder="Search or select reason..."
                    className="w-full pl-12 pr-4 py-3 md:py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-rose-500 transition-all shadow-sm"
                    value={reasonSearchTerm}
                    onChange={(e) => { setReasonSearchTerm(e.target.value); setShowReasonList(true); }}
                    onFocus={() => setShowReasonList(true)}
                    onBlur={() => setTimeout(() => setShowReasonList(false), 150)}
                  />

                  {showReasonList && (
                    <div className="absolute top-full left-0 right-0 mt-2 max-h-48 overflow-y-auto bg-white border border-slate-100 rounded-2xl shadow-xl space-y-1 p-1 z-[60] no-scrollbar">
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
                  className="w-full mt-1.5 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-rose-500 min-h-[120px] shadow-sm resize-none"
                  placeholder="Enter clinical notes..."
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

              {!showDischargeModal.patient.isERD && (
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
              )}

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

            <div className="px-6 md:px-10 py-6 md:py-8 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 shrink-0">
              <button
                onClick={() => setShowDischargeModal(null)}
                className="px-6 py-2.5 text-xs font-black text-slate-400 uppercase tracking-widest order-2 sm:order-1"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkForDischarge}
                disabled={!dischargeFormData.discharge_reason_id || !dischargeFormData.doctor_signature || isSubmittingDischarge}
                className="bg-rose-600 text-white px-8 py-3.5 md:py-3 rounded-2xl md:rounded-[24px] font-black uppercase text-[10px] md:text-xs tracking-widest shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed order-1 sm:order-2 flex items-center justify-center gap-2"
              >
                {isSubmittingDischarge ? <Loader2 size={16} className="animate-spin" /> : null}
                Confirm Discharge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <NurseClearanceModal
        isOpen={!!showNurseClearanceModal}
        onClose={() => setShowNurseClearanceModal(null)}
        patientName={showNurseClearanceModal?.patientName || ''}
        admissionId={showNurseClearanceModal?.admissionId || 0}
        isERD={showNurseClearanceModal?.isERD}
        onSuccess={handleRefresh}
      />

      <ReversalModal
        isOpen={!!showReversalModal}
        onClose={() => setShowReversalModal(null)}
        title={showReversalModal?.title || ''}
        description={showReversalModal?.description || ''}
        patientName={showReversalModal?.patientName}
        onConfirm={async (reason) => {
          if (!showReversalModal) return;
          const payload = { admission_id: showReversalModal.admissionId, reason };
          try {
            if (showReversalModal.isERD) {
              if (showReversalModal.action === 'reverseDoctorMark') await erdService.reverseDoctorMark(payload);
              else if (showReversalModal.action === 'reverseNurseClearance') await erdService.reverseNurseClearance(payload);
            } else {
              if (showReversalModal.action === 'reverseDoctorMark') await wardService.reverseDoctorMark(payload);
              else if (showReversalModal.action === 'reverseNurseClearance') await wardService.reverseNurseClearance(payload);
            }
            notify('Reversal successful', 'success');
            setShowReversalModal(null);
            fetchData();
          } catch (err: any) {
            notify(err.response?.data?.message || 'Failed to reverse action', 'error');
            throw err;
          }
        }}
      />

      <DischargeSummaryModal
        isOpen={!!showSummaryModal}
        onClose={() => setShowSummaryModal(null)}
        encounterId={showSummaryModal!}
        isERD={activeTab === 'ERD'}
      />
    </div>
  );
};

export default EMRWorklist;


// import React, { useState, useEffect, useRef } from 'react';
// import { createPortal } from 'react-dom';
// import { useNavigate } from 'react-router-dom';
// import {
//   ClipboardList,
//   Search,
//   AlertCircle,
//   User,
//   Stethoscope,
//   MapPin,
//   Filter,
//   Loader2,
//   FilePlus,
//   MoreVertical,
//   LogOut,
//   RotateCcw,
//   CheckCircle2,
//   X
// } from 'lucide-react';
// import { emrService } from '../services/emr.service';
// import { wardService } from '../services/ward.service';
// import { erdService } from '../services/erd.service';
// import { useNotification } from '../context/NotificationContext';
// import NurseClearanceModal from './NurseClearanceModal';
// import ReversalModal from './ReversalModal';
// import DischargeSummaryModal from './DischargeSummaryModal';
// import SignaturePad from './SignaturePad';

// interface WorklistItem {
//   id: string;
//   encounter_number: string;
//   patientName: string;
//   mrn: string;
//   location: string;
//   complaint: string;
//   status: string;
//   arrivalTime: string;
//   gender?: string;
//   encounter_type?: string;
//   admission_id?: number;
//   encounter_id?: number;
//   discharge_stage?: string;
//   doctor_name?: string;
//   specialization_name?: string;
//   age?: string;
//   phone?: string;
//   payer?: string;
//   admission_number?: string;
//   admission_date?: string;
// }

// const EMRWorklist: React.FC = () => {
//   const navigate = useNavigate();
//   const { notify } = useNotification();
//   const [searchTerm, setSearchTerm] = useState('');
//   const [loading, setLoading] = useState(true);
//   const [worklist, setWorklist] = useState<WorklistItem[]>([]);

//   const [activeTab, setActiveTab] = useState<'OPD' | 'IPD' | 'ERD'>('OPD');
//   const [filterType, setFilterType] = useState<'TODAY' | 'DATE' | 'ALL'>('TODAY');
//   const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

//   // Dropdown State
//   const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
//   const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
//   const dropdownRef = useRef<HTMLDivElement>(null);

//   // Discharge State
//   const [showDischargeModal, setShowDischargeModal] = useState<any>(null);
//   const [isSubmittingDischarge, setIsSubmittingDischarge] = useState(false);
//   const [dischargeReasons, setDischargeReasons] = useState<any[]>([]);
//   const [dischargeFormData, setDischargeFormData] = useState({
//     discharge_reason_id: "",
//     discharge_notes: "",
//     doctor_signature: "",
//     patient_witness_name: "",
//     patient_witness: "",
//   });
//   const [reasonSearchTerm, setReasonSearchTerm] = useState("");
//   const [showReasonList, setShowReasonList] = useState(false);
//   const [showNurseClearanceModal, setShowNurseClearanceModal] = useState<any>(null);
//   const [showReversalModal, setShowReversalModal] = useState<{
//     admissionId: number;
//     action: string;
//     title: string;
//     description: string;
//     patientName: string;
//     isERD: boolean;
//   } | null>(null);
//   const [showSummaryModal, setShowSummaryModal] = useState<number | null>(null);

//   const fetchData = async () => {
//     setLoading(true);
//     try {
//       if (activeTab === 'IPD' || activeTab === 'ERD') {
//         const res = activeTab === 'IPD' ? await wardService.getAdmissions() : await erdService.getAdmissions();
//         const admissions = res?.data?.results || res?.data || [];
//         const mapped: WorklistItem[] = admissions.map((adm: any) => ({
//           id: adm.admission_id.toString(),
//           encounter_number: adm.encounter_number,
//           patientName: `${adm.first_name} ${adm.last_name}`,
//           mrn: adm.mrn,
//           location: activeTab === 'IPD' 
//             ? `${adm.ward_name} - ${adm.bed_number}` 
//             : `Emergency Room - ${adm.bed_number?.replace('Emergency Room ', '') || 'N/A'}`,
//           complaint: activeTab === 'IPD' ? 'Inpatient Admission' : 'Emergency Visit',
//           status: adm.status,
//           arrivalTime: adm.admission_date,
//           gender: adm.gender,
//           encounter_type: activeTab,
//           admission_id: adm.admission_id,
//           encounter_id: adm.encounter_id,
//           discharge_stage: adm.discharge_stage,
//           doctor_name: adm.doctor_first_name ? `${adm.doctor_first_name} ${adm.doctor_last_name || ''}`.trim() : (adm.doctor_name || adm.attending_doctor || 'Unassigned'),
//           specialization_name: adm.specialization_name || adm.specialty || adm.department || (activeTab === 'IPD' ? adm.ward_name : 'Emergency Room'),
//           age: adm.display_age || (adm.age_years !== undefined ? `${adm.age_years}y` : undefined),
//           phone: adm.phone,
//           payer: adm.payer_name || adm.payer_type_name,
//           admission_number: adm.admission_number,
//           admission_date: adm.admission_date
//         }));
//         setWorklist(mapped);
//       } else {
//         let encounters = [];
//         if (filterType === 'TODAY') {
//           encounters = await emrService.getTodayEncounters();
//         } else if (filterType === 'DATE') {
//           encounters = await emrService.getEncountersByDate(selectedDate);
//         } else {
//           encounters = await emrService.getAllEncounters();
//         }

//         // Map enriched encounters directly to worklist items
//         const mapped: WorklistItem[] = encounters
//           .filter((enc: any) => enc.encounter_type === activeTab)
//           .map((enc: any) => ({
//             id: enc.id.toString(),
//             encounter_number: enc.encounter_number,
//             patientName: `${enc.first_name} ${enc.last_name}`,
//             mrn: enc.mrn,
//             location: enc.specialization_name || 'GOPD',
//             complaint: enc.visit_reason || 'General Visit',
//             status: enc.encounter_status === 'OPEN' ? 'To be seen' : enc.encounter_status,
//             arrivalTime: enc.started_at,
//             gender: enc.gender,
//             encounter_type: activeTab,
//             doctor_name: enc.doctor_name,
//             specialization_name: enc.specialization_name,
//             age: enc.display_age || (enc.age_years !== undefined ? `${enc.age_years}y` : undefined),
//             phone: enc.phone,
//             payer: enc.payer_name || enc.payer_type_name
//           }));

//         setWorklist(mapped);
//       }
//     } catch (err) {
//       console.error(err);
//       notify('Failed to load encounters', 'error');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const fetchDischargeReasons = async () => {
//     try {
//       const res = await wardService.getDischargeReasons();
//       if (res.status === "success") {
//         setDischargeReasons(res.data);
//       }
//     } catch (err) {
//       console.error("Failed to fetch discharge reasons", err);
//     }
//   };

//   useEffect(() => {
//     fetchData();
//     fetchDischargeReasons();
//   }, [filterType, selectedDate, activeTab]);

//   // Close dropdown when clicking outside
//   useEffect(() => {
//     const handleClickOutside = (event: MouseEvent) => {
//       if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
//         setOpenDropdownId(null);
//       }
//     };
//     document.addEventListener('mousedown', handleClickOutside);
//     return () => document.removeEventListener('mousedown', handleClickOutside);
//   }, []);

//   const handleRefresh = () => {
//     fetchData();
//   };

//   const handleDischargeAction = async (action: string, admissionId: number, encounterType: string = 'IPD') => {
//     setOpenDropdownId(null);
//     try {
//       if (encounterType === 'ERD') {
//         if (action === 'markForDischarge') {
//           const item = worklist.find(i => i.admission_id === admissionId);
//           setShowDischargeModal({ 
//             patient: { 
//               name: item?.patientName, 
//               admission_id: admissionId,
//               isERD: true
//             } 
//           });
//           return;
//         }
//         else if (action === 'reverseDoctorMark') {
//           const item = worklist.find(i => i.admission_id === admissionId);
//           setShowReversalModal({
//             admissionId, action, isERD: true, patientName: item?.patientName || '',
//             title: 'Reverse Doctor Mark',
//             description: 'Are you sure you want to reverse the doctor mark for discharge?'
//           });
//           return;
//         }
//         else if (action === 'nurseClearance') {
//           const item = worklist.find(i => i.admission_id === admissionId);
//           setShowNurseClearanceModal({
//             patientName: item?.patientName,
//             admissionId: admissionId,
//             isERD: true
//           });
//           return;
//         }
//         else if (action === 'reverseNurseClearance') {
//           const item = worklist.find(i => i.admission_id === admissionId);
//           setShowReversalModal({
//             admissionId, action, isERD: true, patientName: item?.patientName || '',
//             title: 'Reverse Nurse Clearance',
//             description: 'Are you sure you want to reverse the nurse clearance?'
//           });
//           return;
//         }
//       } else {
//         if (action === 'markForDischarge') {
//           const item = worklist.find(i => i.admission_id === admissionId);
//           setShowDischargeModal({ 
//             patient: { 
//               name: item?.patientName, 
//               admission_id: admissionId 
//             } 
//           });
//           return;
//         }
//         else if (action === 'reverseDoctorMark') {
//           const item = worklist.find(i => i.admission_id === admissionId);
//           setShowReversalModal({
//             admissionId, action, isERD: false, patientName: item?.patientName || '',
//             title: 'Reverse Doctor Mark',
//             description: 'Are you sure you want to reverse the doctor mark for discharge?'
//           });
//           return;
//         }
//         else if (action === 'nurseClearance') {
//           const item = worklist.find(i => i.admission_id === admissionId);
//           setShowNurseClearanceModal({
//             patientName: item?.patientName,
//             admissionId: admissionId,
//             isERD: false
//           });
//           return;
//         }
//         else if (action === 'reverseNurseClearance') {
//           const item = worklist.find(i => i.admission_id === admissionId);
//           setShowReversalModal({
//             admissionId, action, isERD: false, patientName: item?.patientName || '',
//             title: 'Reverse Nurse Clearance',
//             description: 'Are you sure you want to reverse the nurse clearance?'
//           });
//           return;
//         }
//       }

//       notify('Action successful', 'success');
//       fetchData();
//     } catch (err: any) {
//       notify(err.response?.data?.message || 'Failed to perform action', 'error');
//     }
//   };

//   const handleMarkForDischarge = async () => {
//     if (!showDischargeModal || !dischargeFormData.discharge_reason_id) {
//       notify("Please select a discharge reason", "error");
//       return;
//     }
//     if (!dischargeFormData.doctor_signature) {
//       notify("Doctor signature is required", "error");
//       return;
//     }

//     setIsSubmittingDischarge(true);
//     try {
//       if (showDischargeModal.patient.isERD) {
//         await erdService.markForDischarge({
//           admission_id: showDischargeModal.patient.admission_id,
//           discharge_reason_id: parseInt(dischargeFormData.discharge_reason_id),
//           discharge_notes: dischargeFormData.discharge_notes,
//           doctor_signature: dischargeFormData.doctor_signature,
//           patient_witness: dischargeFormData.patient_witness,
//         });
//       } else {
//         await wardService.markForDischarge({
//           admission_id: showDischargeModal.patient.admission_id,
//           discharge_reason_id: parseInt(dischargeFormData.discharge_reason_id),
//           discharge_notes: dischargeFormData.discharge_notes,
//           doctor_signature: dischargeFormData.doctor_signature,
//           patient_witness_name: dischargeFormData.patient_witness_name,
//           patient_witness: dischargeFormData.patient_witness,
//         });
//       }

//       notify("Patient marked for discharge successfully", "success");
//       setShowDischargeModal(null);
//       setDischargeFormData({ discharge_reason_id: "", discharge_notes: "", doctor_signature: "", patient_witness_name: "", patient_witness: "" });
//       setReasonSearchTerm("");
//       fetchData();
//     } catch (err: any) {
//       console.error(err);
//       notify(err.response?.data?.message || "Failed to mark for discharge", "error");
//     } finally {
//       setIsSubmittingDischarge(false);
//     }
//   };

//   const getStatusStyle = (status: string) => {
//     switch (status) {
//       case 'Critical': return 'bg-red-50 text-red-600 border-red-100';
//       case 'In Progress': return 'bg-brand-active text-brand-primary border-brand-active';
//       case 'Stable': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
//       default: return 'bg-amber-50 text-amber-600 border-amber-100';
//     }
//   };

//   // Filter by search term AND active tab
//   const filtered = worklist.filter(p =>
//     (p.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       p.mrn.toLowerCase().includes(searchTerm.toLowerCase())) &&
//     p.encounter_type === activeTab
//   );

//   const handlePatientClick = (patient: WorklistItem) => {
//     // Preserve the active admission context when opening an inpatient chart.
//     navigate('/emr/chart', {
//       state: {
//         patientMRN: patient.mrn,
//         encounterNumber: patient.encounter_number,
//         admission_id: patient.admission_id
//       }
//     });
//   };

//   const handleOrderEntry = (e: React.MouseEvent, patient: WorklistItem) => {
//     e.stopPropagation();
//     navigate('/emr/orders', {
//       state: {
//         patientName: patient.patientName,
//         patientMRN: patient.mrn,
//         encounterNumber: patient.encounter_number
//       }
//     });
//   };

//   return (
//     <div className="space-y-6 animate-in fade-in duration-500">
//       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
//         <div className="flex-1">
//           <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
//             <div className="p-2 bg-brand-active text-brand-primary rounded-xl shrink-0">
//               <ClipboardList size={24} className="md:w-7 md:h-7" />
//             </div>
//             <span className="truncate">My Active Worklist</span>
//           </h1>
//           <p className="text-slate-500 font-medium text-sm md:text-base">Manage clinical encounters and patient oversight.</p>
//         </div>
//       </div>

//       {/* Filters & Tabs */}
//       <div className="bg-white p-4 md:p-6 rounded-[32px] border border-slate-200 flex flex-col xl:flex-row gap-6 items-stretch xl:items-center shadow-sm">

//         {/* Tab Switcher */}
//         <div className="flex p-1 bg-slate-100 rounded-2xl shrink-0 overflow-x-auto no-scrollbar scroll-smooth">
//           <button
//             onClick={() => setActiveTab('OPD')}
//             className={`flex-1 min-w-[120px] px-4 py-2.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'OPD' ? 'bg-white text-brand-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
//           >
//             OPD Encounters
//           </button>
//           <button
//             onClick={() => setActiveTab('ERD')}
//             className={`flex-1 min-w-[120px] px-4 py-2.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'ERD' ? 'bg-white text-brand-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
//           >
//             ERD Encounters
//           </button>
//           <button
//             onClick={() => setActiveTab('IPD')}
//             className={`flex-1 min-w-[120px] px-4 py-2.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'IPD' ? 'bg-white text-brand-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
//           >
//             IPD Encounters
//           </button>
//         </div>

//         <div className="h-8 w-px bg-slate-200 hidden xl:block"></div>

//         {/* Date Filters & Search */}
//         <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 flex-1">
//           <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth">
//             <button
//               onClick={() => setFilterType('TODAY')}
//               className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all whitespace-nowrap ${filterType === 'TODAY' ? 'bg-brand-active border-brand-active text-brand-primary' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
//             >
//               Today's List
//             </button>
//             <button
//               onClick={() => setFilterType('ALL')}
//               className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all whitespace-nowrap ${filterType === 'ALL' ? 'bg-brand-active border-brand-active text-brand-primary' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
//             >
//               All History
//             </button>

//             <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${filterType === 'DATE' ? 'bg-brand-active border-brand-active' : 'bg-white border-slate-200'}`}>
//               <input
//                 type="radio"
//                 checked={filterType === 'DATE'}
//                 onChange={() => setFilterType('DATE')}
//                 className="w-4 h-4 text-brand-primary cursor-pointer"
//               />
//               <input
//                 type="date"
//                 value={selectedDate}
//                 onChange={(e) => {
//                   setSelectedDate(e.target.value);
//                   setFilterType('DATE');
//                 }}
//                 className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
//               />
//             </div>
//           </div>

//           <div className="flex items-center gap-3 flex-1 max-w-[280px] xl:max-w-md">
//             <div className="relative flex-1 group">
//               <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-brand-primary transition-colors" />
//               <input
//                 type="text"
//                 placeholder="Search by name or MRN..."
//                 className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-4 focus:ring-brand-active0/10 outline-none transition-all"
//                 value={searchTerm}
//                 onChange={(e) => setSearchTerm(e.target.value)}
//               />
//             </div>
//             <button
//               onClick={handleRefresh}
//               className="flex items-center gap-2 px-4 py-2.5 md:px-5 md:py-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 text-slate-600 text-xs font-bold transition-colors shadow-sm whitespace-nowrap"
//             >
//               <Loader2 size={16} className={loading ? "animate-spin" : ""} />
//               Refresh
//             </button>
//           </div>
//         </div>
//       </div>

//       <div className="bg-white rounded-[32px] md:rounded-[40px] border border-slate-200 overflow-hidden shadow-sm min-h-[400px]">
//         {loading ? (
//           <div className="flex flex-col items-center justify-center h-full py-20">
//             <Loader2 className="animate-spin text-brand-primary mb-4" size={40} />
//             <p className="text-sm font-bold text-slate-400">Loading encounters...</p>
//           </div>
//         ) : filtered.length === 0 ? (
//           <div className="flex flex-col items-center justify-center h-full py-20 px-6 text-center">
//             <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
//               <ClipboardList className="text-slate-300" size={32} />
//             </div>
//             <p className="text-sm font-bold text-slate-400">No active encounters found.</p>
//           </div>
//         ) : (
//           <>
//             {/* Desktop Table View */}
//             <div className="hidden lg:block overflow-x-auto">
//               <table className="w-full text-left">
//                 <thead>
//                   <tr className="bg-slate-50/50 border-b border-slate-100">
//                     <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Patient Details</th>
//                     <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Provider & Spec.</th>
//                     <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Location</th>
//                     <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Visit Info</th>
//                     <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
//                     <th className="px-6 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y divide-slate-50">
//                   {filtered.map((item) => (
//                     <tr
//                       key={item.id}
//                       onClick={() => handlePatientClick(item)}
//                       className="hover:bg-slate-50/30 transition-colors group cursor-pointer"
//                     >
//                       <td className="px-6 py-6">
//                         <div className="flex items-center gap-4">
//                           <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm ${item.status === 'Critical' ? 'bg-red-500 animate-pulse' : 'bg-slate-100 text-slate-400 group-hover:bg-brand-primary group-hover:text-white transition-all'}`}>
//                             {item.patientName.charAt(0)}
//                           </div>
//                           <div>
//                             <p className="text-sm font-black text-slate-800">{item.patientName}</p>
//                             <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
//                               <span className="text-[10px] font-mono font-bold text-brand-primary">{item.mrn}</span>
//                               {item.gender && <span className="text-[10px] font-bold text-slate-400">• {item.gender}</span>}
//                               {item.age && <span className="text-[10px] font-bold text-slate-400">• {item.age}</span>}
//                             </div>
//                             {(item.phone || item.payer) && (
//                               <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
//                                 {item.phone && <span className="text-[10px] font-medium text-slate-500">{item.phone}</span>}
//                                 {item.phone && item.payer && <span className="text-[10px] text-slate-300">•</span>}
//                                 {item.payer && <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-bold max-w-[120px] truncate" title={item.payer}>{item.payer}</span>}
//                               </div>
//                             )}
//                           </div>
//                         </div>
//                       </td>
//                       <td className="px-6 py-6">
//                         <div className="flex flex-col gap-1.5">
//                           {item.doctor_name && (
//                             <div className="flex items-center gap-2 text-slate-700">
//                               <Stethoscope size={14} className="text-slate-400" />
//                               <span className="text-xs font-bold">{item.doctor_name}</span>
//                             </div>
//                           )}
//                           {item.specialization_name && (
//                             <span className="text-[10px] font-bold text-brand-primary ml-5">{item.specialization_name}</span>
//                           )}
//                         </div>
//                       </td>
//                       <td className="px-6 py-6">
//                         <div className="flex items-center gap-2 text-slate-800">
//                           <MapPin size={14} className="text-slate-400" />
//                           <span className="text-xs font-bold">{item.location}</span>
//                         </div>
//                       </td>
//                       <td className="px-6 py-6">
//                         <div className="flex flex-col gap-1">
//                           <p className="text-xs font-bold text-slate-700 line-clamp-2" title={item.complaint}>{item.complaint}</p>
//                           <span className="text-[10px] font-medium text-slate-400">
//                             {item.admission_date ?? item.arrivalTime}
//                           </span>
//                           {item.admission_number && <span className="text-[10px] font-mono font-bold text-brand-primary">{item.admission_number}</span>}
//                         </div>
//                       </td>
//                       <td className="px-6 py-6">
//                         <div className="flex flex-col items-start gap-1.5">
//                           <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${getStatusStyle(item.status)}`}>
//                             {item.status}
//                           </div>
//                           {item.discharge_stage && item.discharge_stage !== 'ACTIVE' && item.discharge_stage !== 'NONE' && (
//                             <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9.5px] font-bold uppercase tracking-widest bg-brand-active text-brand-primary border border-brand-active">
//                               {item.discharge_stage.replace(/_/g, ' ')}
//                             </div>
//                           )}
//                         </div>
//                       </td>
//                       <td className="px-6 py-6 text-right relative">
//                         {(activeTab === 'IPD' || activeTab === 'ERD') ? (
//                           <div className="flex justify-end items-center gap-2">
//                             <button
//                               onClick={(e) => {
//                                 e.stopPropagation();
//                                 if (openDropdownId === item.id) {
//                                   setOpenDropdownId(null);
//                                 } else {
//                                   const rect = e.currentTarget.getBoundingClientRect();
//                                   setDropdownPosition({
//                                     top: rect.bottom + 8,
//                                     right: window.innerWidth - rect.right
//                                   });
//                                   setOpenDropdownId(item.id);
//                                 }
//                               }}
//                               className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
//                             >
//                               <MoreVertical size={18} />
//                             </button>

//                             {openDropdownId === item.id && createPortal(
//                               <div
//                                 ref={dropdownRef}
//                                 className="fixed w-56 bg-white rounded-xl shadow-xl border border-slate-100 z-[9999] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
//                                 style={{ top: dropdownPosition.top, right: dropdownPosition.right }}
//                               >
//                                 <div className="py-1">
//                                   <button
//                                     onClick={(e) => { setOpenDropdownId(null); handleOrderEntry(e, item); }}
//                                     className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
//                                   >
//                                     <FilePlus size={16} className="text-emerald-500" /> Orders
//                                   </button>
//                                   <button
//                                     onClick={() => { setOpenDropdownId(null); handlePatientClick(item); }}
//                                     className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
//                                   >
//                                     <Stethoscope size={16} className="text-brand-active0" /> Chart
//                                   </button>

//                                   <div className="h-px bg-slate-100 my-1"></div>

//                                   {(() => {
//                                     const isNone = (!item.discharge_stage || item.discharge_stage === 'ACTIVE' || item.discharge_stage === 'NONE') && !!item.admission_id;
//                                     const isDoctorMarked = item.discharge_stage === 'DOCTOR_MARKED' && !!item.admission_id;
//                                     const isNursingCleared = item.discharge_stage === 'NURSING_CLEARANCE' && !!item.admission_id;

//                                     return (
//                                       <>
//                                         <button
//                                           onClick={(e) => { if (isNone) { e.stopPropagation(); handleDischargeAction('markForDischarge', item.admission_id!, item.encounter_type); } }}
//                                           disabled={!isNone}
//                                           title={!isNone ? "Patient is already marked for discharge or further along." : ""}
//                                           className={`w-full text-left px-4 py-2.5 text-sm font-medium flex items-center gap-2 ${isNone ? 'text-amber-600 hover:bg-amber-50' : 'text-slate-400 cursor-not-allowed opacity-60'}`}
//                                         >
//                                           <LogOut size={16} /> Mark for Discharge
//                                         </button>

//                                         <button
//                                           onClick={(e) => { if (isDoctorMarked) { e.stopPropagation(); handleDischargeAction('nurseClearance', item.admission_id!, item.encounter_type); } }}
//                                           disabled={!isDoctorMarked}
//                                           title={!isDoctorMarked ? "Requires Doctor Mark first, or already cleared." : ""}
//                                           className={`w-full text-left px-4 py-2.5 text-sm font-medium flex items-center gap-2 ${isDoctorMarked ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 cursor-not-allowed opacity-60'}`}
//                                         >
//                                           <CheckCircle2 size={16} /> Nurse Clearance
//                                         </button>

//                                         <button
//                                           onClick={(e) => { if (isDoctorMarked) { e.stopPropagation(); handleDischargeAction('reverseDoctorMark', item.admission_id!, item.encounter_type); } }}
//                                           disabled={!isDoctorMarked}
//                                           title={!isDoctorMarked ? "Can only reverse if currently at Doctor Marked stage." : ""}
//                                           className={`w-full text-left px-4 py-2.5 text-sm font-medium flex items-center gap-2 ${isDoctorMarked ? 'text-red-600 hover:bg-red-50' : 'text-slate-400 cursor-not-allowed opacity-60'}`}
//                                         >
//                                           <RotateCcw size={16} /> Reverse Doctor Mark
//                                         </button>

//                                         <button
//                                           onClick={(e) => { if (isNursingCleared) { e.stopPropagation(); handleDischargeAction('reverseNurseClearance', item.admission_id!, item.encounter_type); } }}
//                                           disabled={!isNursingCleared}
//                                           title={!isNursingCleared ? "Can only reverse if currently at Nursing Clearance stage." : ""}
//                                           className={`w-full text-left px-4 py-2.5 text-sm font-medium flex items-center gap-2 ${isNursingCleared ? 'text-red-600 hover:bg-red-50' : 'text-slate-400 cursor-not-allowed opacity-60'}`}
//                                         >
//                                           <RotateCcw size={16} /> Reverse Nurse Clearance
//                                         </button>

//                                         {!isNone && (
//                                           <button
//                                             onClick={(e) => { e.stopPropagation(); setOpenDropdownId(null); setShowSummaryModal(item.encounter_id ?? item.admission_id!); }}
//                                             className="w-full text-left px-4 py-2.5 text-sm font-medium flex items-center gap-2 text-indigo-600 hover:bg-indigo-50 mt-1 border-t border-slate-50 pt-3"
//                                           >
//                                             <ClipboardList size={16} /> View Discharge Summary
//                                           </button>
//                                         )}
//                                       </>
//                                     );
//                                   })()}
//                                 </div>
//                               </div>,
//                               document.body
//                             )}
//                           </div>
//                         ) : (
//                           <div className="flex justify-end gap-2">
//                             <button
//                               onClick={(e) => handleOrderEntry(e, item)}
//                               className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-2 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
//                             >
//                               <FilePlus size={14} /> Orders
//                             </button>
//                             <button
//                               onClick={() => handlePatientClick(item)}
//                               className="flex items-center gap-1.5 text-[10px] font-black text-brand-primary uppercase tracking-widest bg-brand-active px-3 py-2 rounded-xl hover:bg-brand-primary hover:text-white transition-all shadow-sm"
//                             >
//                               <Stethoscope size={14} /> Chart
//                             </button>
//                           </div>
//                         )}
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>

//             {/* Mobile/Tablet Card View */}
//             <div className="lg:hidden divide-y divide-slate-100">
//               {filtered.map((item) => (
//                 <div
//                   key={item.id}
//                   onClick={() => handlePatientClick(item)}
//                   className="p-4 md:p-6 hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer group"
//                 >
//                   <div className="flex items-start justify-between mb-4">
//                     <div className="flex items-center gap-4">
//                       <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white shadow-sm shrink-0 ${item.status === 'Critical' ? 'bg-red-500 animate-pulse' : 'bg-slate-100 text-slate-400 group-hover:bg-brand-primary group-hover:text-white transition-all'}`}>
//                         {item.patientName.charAt(0)}
//                       </div>
//                       <div className="min-w-0">
//                         <p className="text-sm font-black text-slate-800 truncate">{item.patientName}</p>
//                         <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-1">
//                           <span className="text-[10px] font-mono font-bold text-brand-primary shrink-0">{item.mrn}</span>
//                           {item.gender && <span className="text-[10px] font-bold text-slate-400 shrink-0">• {item.gender}</span>}
//                           {item.age && <span className="text-[10px] font-bold text-slate-400 shrink-0">• {item.age}</span>}
                          
//                           <div className="w-full flex flex-col gap-1.5 mt-1">
//                             <div className="flex items-center gap-1 text-slate-500 shrink-0">
//                               <MapPin size={10} className="text-slate-400" />
//                               <span className="text-[10px] font-bold text-slate-700">{item.location}</span>
//                             </div>
//                             {item.doctor_name && (
//                               <div className="flex items-center gap-1 text-slate-500 shrink-0">
//                                 <Stethoscope size={10} className="text-slate-400" />
//                                 <span className="text-[10px] font-bold text-slate-700">{item.doctor_name}</span>
//                                 {item.specialization_name && (
//                                   <span className="text-[10px] font-bold text-brand-primary ml-2">• {item.specialization_name}</span>
//                                 )}
//                               </div>
//                             )}
//                             {(item.phone || item.payer) && (
//                               <div className="flex items-center gap-1.5">
//                                 {item.phone && <span className="text-[10px] font-medium text-slate-500">{item.phone}</span>}
//                                 {item.phone && item.payer && <span className="text-[10px] text-slate-300">•</span>}
//                                 {item.payer && <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-bold truncate" title={item.payer}>{item.payer}</span>}
//                               </div>
//                             )}
//                           </div>
//                         </div>
//                       </div>
//                     </div>

//                     <div className="flex flex-col items-end gap-2 shrink-0 ml-4">
//                       <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${getStatusStyle(item.status)}`}>
//                         {item.status}
//                       </div>
//                     </div>
//                   </div>

//                   <div className="mb-4 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
//                     <p className="text-xs font-medium text-slate-500 leading-relaxed italic line-clamp-2">
//                       <span className="text-[10px] font-black uppercase text-slate-400 mr-2 not-italic tracking-widest">Complaint:</span>
//                       {item.complaint}
//                     </p>
//                   </div>

//                   <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
//                     {item.discharge_stage && item.discharge_stage !== 'ACTIVE' && item.discharge_stage !== 'NONE' && (
//                       <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-widest bg-brand-active text-brand-primary border border-brand-active">
//                         {item.discharge_stage.replace(/_/g, ' ')}
//                       </div>
//                     )}
                    
//                     <div className="flex items-center gap-2 ml-auto w-full sm:w-auto">
//                       {(activeTab === 'IPD' || activeTab === 'ERD') ? (
//                         <div className="flex items-center gap-2 w-full justify-between sm:justify-end">
//                           <button
//                             onClick={(e) => {
//                               e.stopPropagation();
//                               const rect = e.currentTarget.getBoundingClientRect();
//                               setDropdownPosition({
//                                 top: rect.bottom + 8,
//                                 right: window.innerWidth - rect.right
//                               });
//                               setOpenDropdownId(item.id);
//                             }}
//                             className="p-2.5 text-slate-400 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 transition-colors"
//                           >
//                             <MoreVertical size={18} />
//                           </button>
//                           <div className="flex items-center gap-2">
//                             <button
//                               onClick={(e) => handleOrderEntry(e, item)}
//                               className="flex items-center justify-center gap-1.5 flex-1 px-4 py-2.5 text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 rounded-xl border border-emerald-100 active:scale-95 transition-transform"
//                             >
//                               <FilePlus size={14} /> Orders
//                             </button>
//                             <button
//                               onClick={() => handlePatientClick(item)}
//                               className="flex items-center justify-center gap-1.5 flex-1 px-4 py-2.5 text-[10px] font-black text-brand-primary uppercase tracking-widest bg-brand-active rounded-xl border border-brand-active active:scale-95 transition-transform"
//                             >
//                               <Stethoscope size={14} /> Chart
//                             </button>
//                           </div>
//                         </div>
//                       ) : (
//                         <div className="flex items-center gap-2 w-full">
//                           <button
//                             onClick={(e) => handleOrderEntry(e, item)}
//                             className="flex items-center justify-center gap-2 flex-1 px-4 py-3 text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 rounded-xl border border-emerald-100 active:scale-95 transition-transform"
//                           >
//                             <FilePlus size={16} /> Orders
//                           </button>
//                           <button
//                             onClick={() => handlePatientClick(item)}
//                             className="flex items-center justify-center gap-2 flex-1 px-4 py-3 text-[10px] font-black text-brand-primary uppercase tracking-widest bg-brand-active rounded-xl border border-brand-active active:scale-95 transition-transform"
//                           >
//                             <Stethoscope size={16} /> Chart
//                           </button>
//                         </div>
//                       )}
//                     </div>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </>
//         )}
//       </div>

//       {/* Discharge Modal */}
//       {showDischargeModal && (
//         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
//           <div
//             className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
//             onClick={() => setShowDischargeModal(null)}
//           />
//           <div className="relative bg-white w-full max-w-lg rounded-[32px] md:rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 mx-auto max-h-[90vh] flex flex-col">
//             <div className="px-6 md:px-10 py-6 md:py-8 border-b border-slate-100 flex items-center justify-between bg-rose-50/30 shrink-0">
//               <div className="flex items-center gap-3 md:gap-4">
//                 <div className="p-2 md:p-3 bg-rose-600 text-white rounded-xl md:rounded-2xl shadow-lg shadow-rose-200 shrink-0">
//                   <LogOut size={20} className="md:w-6 md:h-6" />
//                 </div>
//                 <div className="min-w-0">
//                   <h2 className="text-lg md:text-xl font-black text-slate-800 tracking-tight truncate">
//                     Mark for Discharge
//                   </h2>
//                   <p className="text-[9px] md:text-xs text-rose-600 font-bold uppercase tracking-widest truncate">
//                     Patient: {showDischargeModal.patient.name}
//                   </p>
//                 </div>
//               </div>
//               <button
//                 onClick={() => setShowDischargeModal(null)}
//                 className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 shrink-0"
//               >
//                 <X size={20} className="md:w-6 md:h-6" />
//               </button>
//             </div>

//             <div className="p-6 md:p-10 space-y-6 overflow-y-auto">
//               <div className="relative">
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
//                   Discharge Reason
//                 </label>
//                 <div className="relative group mt-1.5">
//                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-rose-600 transition-colors" size={16} />
//                   <input
//                     type="text"
//                     placeholder="Search or select reason..."
//                     className="w-full pl-12 pr-4 py-3 md:py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-rose-500 transition-all shadow-sm"
//                     value={reasonSearchTerm}
//                     onChange={(e) => { setReasonSearchTerm(e.target.value); setShowReasonList(true); }}
//                     onFocus={() => setShowReasonList(true)}
//                     onBlur={() => setTimeout(() => setShowReasonList(false), 150)}
//                   />

//                   {showReasonList && (
//                     <div className="absolute top-full left-0 right-0 mt-2 max-h-48 overflow-y-auto bg-white border border-slate-100 rounded-2xl shadow-xl space-y-1 p-1 z-[60] no-scrollbar">
//                       {dischargeReasons
//                         .filter(r => r.name.toLowerCase().includes(reasonSearchTerm.toLowerCase()))
//                         .map((reason) => (
//                           <button
//                             key={reason.id}
//                             onMouseDown={(e) => e.preventDefault()}
//                             onClick={() => {
//                               setDischargeFormData({ ...dischargeFormData, discharge_reason_id: reason.id.toString() });
//                               setReasonSearchTerm(reason.name);
//                               setShowReasonList(false);
//                             }}
//                             className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all
//                               ${dischargeFormData.discharge_reason_id === reason.id.toString()
//                                 ? 'bg-rose-600 text-white'
//                                 : 'text-slate-600 hover:bg-rose-50 hover:text-rose-600'}
//                             `}
//                           >
//                             {reason.name}
//                           </button>
//                         ))}
//                     </div>
//                   )}
//                 </div>
//               </div>

//               <div>
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
//                   Discharge Notes
//                 </label>
//                 <textarea
//                   value={dischargeFormData.discharge_notes}
//                   onChange={(e) =>
//                     setDischargeFormData({
//                       ...dischargeFormData,
//                       discharge_notes: e.target.value,
//                     })
//                   }
//                   className="w-full mt-1.5 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-rose-500 min-h-[120px] shadow-sm resize-none"
//                   placeholder="Enter clinical notes..."
//                 />
//               </div>

//               <div>
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
//                   Doctor Signature
//                 </label>
//                 <div className="mt-1.5 h-32 bg-slate-50 border border-dashed border-slate-300 rounded-2xl overflow-hidden">
//                   <SignaturePad
//                     onEnd={(dataUrl) => setDischargeFormData({ ...dischargeFormData, doctor_signature: dataUrl })}
//                     onClear={() => setDischargeFormData({ ...dischargeFormData, doctor_signature: "" })}
//                   />
//                 </div>
//               </div>

//               {!showDischargeModal.patient.isERD && (
//                 <div>
//                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
//                     Patient Witness Name
//                   </label>
//                   <input
//                     type="text"
//                     value={dischargeFormData.patient_witness_name}
//                     onChange={(e) => setDischargeFormData({ ...dischargeFormData, patient_witness_name: e.target.value })}
//                     placeholder="e.g. John Doe (Brother)"
//                     className="w-full mt-1.5 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-rose-500 transition-all"
//                   />
//                 </div>
//               )}

//               <div>
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
//                   Patient Witness Signature
//                 </label>
//                 <div className="mt-1.5 h-32 bg-slate-50 border border-dashed border-slate-300 rounded-2xl overflow-hidden">
//                   <SignaturePad
//                     onEnd={(dataUrl) => setDischargeFormData({ ...dischargeFormData, patient_witness: dataUrl })}
//                     onClear={() => setDischargeFormData({ ...dischargeFormData, patient_witness: "" })}
//                   />
//                 </div>
//               </div>
//             </div>

//             <div className="px-6 md:px-10 py-6 md:py-8 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 shrink-0">
//               <button
//                 onClick={() => setShowDischargeModal(null)}
//                 className="px-6 py-2.5 text-xs font-black text-slate-400 uppercase tracking-widest order-2 sm:order-1"
//               >
//                 Cancel
//               </button>
//               <button
//                 onClick={handleMarkForDischarge}
//                 disabled={!dischargeFormData.discharge_reason_id || !dischargeFormData.doctor_signature || isSubmittingDischarge}
//                 className="bg-rose-600 text-white px-8 py-3.5 md:py-3 rounded-2xl md:rounded-[24px] font-black uppercase text-[10px] md:text-xs tracking-widest shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed order-1 sm:order-2 flex items-center justify-center gap-2"
//               >
//                 {isSubmittingDischarge ? <Loader2 size={16} className="animate-spin" /> : null}
//                 Confirm Discharge
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Modals */}
//       <NurseClearanceModal
//         isOpen={!!showNurseClearanceModal}
//         onClose={() => setShowNurseClearanceModal(null)}
//         patientName={showNurseClearanceModal?.patientName || ''}
//         admissionId={showNurseClearanceModal?.admissionId || 0}
//         isERD={showNurseClearanceModal?.isERD}
//         onSuccess={handleRefresh}
//       />

//       <ReversalModal
//         isOpen={!!showReversalModal}
//         onClose={() => setShowReversalModal(null)}
//         title={showReversalModal?.title || ''}
//         description={showReversalModal?.description || ''}
//         patientName={showReversalModal?.patientName}
//         onConfirm={async (reason) => {
//           if (!showReversalModal) return;
//           const payload = { admission_id: showReversalModal.admissionId, reason };
//           try {
//             if (showReversalModal.isERD) {
//               if (showReversalModal.action === 'reverseDoctorMark') await erdService.reverseDoctorMark(payload);
//               else if (showReversalModal.action === 'reverseNurseClearance') await erdService.reverseNurseClearance(payload);
//             } else {
//               if (showReversalModal.action === 'reverseDoctorMark') await wardService.reverseDoctorMark(payload);
//               else if (showReversalModal.action === 'reverseNurseClearance') await wardService.reverseNurseClearance(payload);
//             }
//             notify('Reversal successful', 'success');
//             setShowReversalModal(null);
//             fetchData();
//           } catch (err: any) {
//             notify(err.response?.data?.message || 'Failed to reverse action', 'error');
//             throw err;
//           }
//         }}
//       />
//     </div>

//       <DischargeSummaryModal
//         isOpen={!!showSummaryModal}
//         onClose={() => setShowSummaryModal(null)}
//         encounterId={showSummaryModal!}
//         isERD={activeTab === 'ERD'}
//       />
//     </div>
//   );
// };

// export default EMRWorklist;
