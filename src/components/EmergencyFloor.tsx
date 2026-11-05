
import React, { useState, useEffect } from 'react';
import { Layout, Plus, User, Clock, AlertCircle, Activity, MoreVertical, X, XCircle, CheckCircle2, Search, Trash2, Edit2, RotateCcw, LogOut, FileText, Loader2, ArrowLeft } from 'lucide-react';
import { erdService } from '../services/erd.service';
import { wardService } from '../services/ward.service';
import { patientService } from '../services/patient.service';
import { useNotification } from '../context/NotificationContext';
import ReversalModal from './ReversalModal';
import DischargeSummaryModal from './DischargeSummaryModal';

interface ERDBed {
  bed_id: number;
  bed_number: string;
  bed_status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED';
  triage_category: 'RED' | 'YELLOW' | 'GREEN' | 'BLACK';
  patient?: any;
  occupant?: {
    mrn: string;
    full_name: string;
    gender: string;
    age: number;
    admission_details: {
      admission_no: string;
      encounter_id: number;
      admitted_at: string;
      triage_level: string;
      admission_id?: number;
      discharge_stage?: string | null;
    };
    clinical: {
      admitting_doctor: string;
    };
    financial: {
      payer_name: string;
      payer_category: string;
    };
  };
}

interface Doctor {
  doctor_id: number;
  first_name: string;
  last_name: string;
  specialization_name: string;
}

const EmergencyFloor: React.FC = () => {
  const { notify } = useNotification();
  const [beds, setBeds] = useState<ERDBed[]>([]);
  const [loading, setLoading] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTriage, setFilterTriage] = useState('');

  // Modals
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showAdmitModal, setShowAdmitModal] = useState<ERDBed | null>(null);
  const [showEditModal, setShowEditModal] = useState<ERDBed | null>(null);
  // Discharge / Billing Actions
  const [activeDischargeAction, setActiveDischargeAction] = useState<ERDBed | null>(null);
  const [dischargeModalView, setDischargeModalView] = useState<'actions' | 'details' | 'edit' | 'transferIpd'>('actions');
  const [dischargeActionLoading, setDischargeActionLoading] = useState(false);

  // Transfer to IPD
  const [ipdWards, setIpdWards] = useState<any[]>([]);
  const [ipdRooms, setIpdRooms] = useState<any[]>([]);
  const [ipdBeds, setIpdBeds] = useState<any[]>([]);
  const [transferForm, setTransferForm] = useState({
    ward_id: '',
    room_id: '',
    bed_id: '',
    admitting_doctor_id: '',
    admission_reason: '',
  });
  const [transferLoading, setTransferLoading] = useState(false);
  const [showReversalModal, setShowReversalModal] = useState<{
    admissionId: number;
    action: string;
    title: string;
    description: string;
    patientName: string;
  } | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState<number | null>(null);

  // Setup Form
  const [setupData, setSetupData] = useState({
    bed_number: '',
    triage_category: 'RED'
  });

  // Admit Form
  const [searchMrn, setSearchMrn] = useState('');
  const [searchedPatient, setSearchedPatient] = useState<any>(null);
  const [admissionData, setAdmissionData] = useState({
    admitting_doctor_id: '',
    triage_level: 'URGENT'
  });

  useEffect(() => {
    fetchDoctors();
  }, []);

  useEffect(() => {
    fetchBeds();
  }, [filterStatus, filterTriage]);

  const fetchBeds = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterStatus) params.bed_status = filterStatus;
      if (filterTriage) params.triage_category = filterTriage;
      const [bedsRes, admissionsRes] = await Promise.all([
        erdService.getBeds(params),
        erdService.getAdmissions().catch(() => null),
      ]);
      if (bedsRes.status === 'success') {
        const admissions = admissionsRes?.data?.results || admissionsRes?.data || [];
        // Every discharge action endpoint (mark/nurse/pharmacy/billing/finalize + reversals) takes
        // admission_id, not encounter_id — join on admission_number, which /clinical/erd/beds'
        // occupant.admission_details.admission_no already reliably matches.
        const byAdmissionNo = new Map<string, { admission_id: number; discharge_stage: string | null }>(
          admissions.map((adm: any) => [adm.admission_number, { admission_id: adm.admission_id, discharge_stage: adm.discharge_stage }]),
        );
        const results: ERDBed[] = (bedsRes.data.results || []).map((bed: ERDBed) => {
          if (!bed.occupant) return bed;
          const match = byAdmissionNo.get(bed.occupant.admission_details?.admission_no);
          if (!match) return bed;
          return {
            ...bed,
            occupant: {
              ...bed.occupant,
              admission_details: { ...bed.occupant.admission_details, ...match },
            },
          };
        });
        setBeds(results);
      }
    } catch (err: any) {
      console.error(err);
      notify(err.response?.data?.message || 'Failed to fetch ERD beds', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      const res = await wardService.getDoctors();
      if (res.status === 'success') {
        setDoctors(res.data);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const fetchIpdWards = async () => {
    try {
      const res = await wardService.getWards();
      if (res.status === 'success') setIpdWards(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchIpdRooms = async (wardId: number) => {
    try {
      const res = await wardService.getRooms(wardId);
      if (res.status === 'success') setIpdRooms(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchIpdBeds = async (roomId: number) => {
    try {
      const res = await wardService.getBeds(roomId);
      if (res.status === 'success') setIpdBeds(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const openTransferToIpd = () => {
    setTransferForm({ ward_id: '', room_id: '', bed_id: '', admitting_doctor_id: '', admission_reason: '' });
    setIpdRooms([]);
    setIpdBeds([]);
    fetchIpdWards();
    setDischargeModalView('transferIpd');
  };

  const handleTransferToIpd = async (admissionId: number, mrn: string) => {
    if (!transferForm.bed_id || !transferForm.admitting_doctor_id || !transferForm.admission_reason.trim()) {
      notify('Please fill in bed, admitting doctor, and admission reason', 'error');
      return;
    }
    setTransferLoading(true);
    try {
      await erdService.transferToIpd({
        admission_id: admissionId,
        mrn,
        target_ipd_bed_id: parseInt(transferForm.bed_id),
        admitting_doctor_id: parseInt(transferForm.admitting_doctor_id),
        admission_reason: transferForm.admission_reason.trim(),
      });
      notify('Patient transferred to IPD successfully', 'success');
      setActiveDischargeAction(null);
      setDischargeModalView('actions');
      fetchBeds();
    } catch (err: any) {
      notify(err.response?.data?.message || 'Failed to transfer patient to IPD', 'error');
    } finally {
      setTransferLoading(false);
    }
  };

  const handleCreateBed = async () => {
    try {
      await erdService.createBed(setupData);
      notify('ERD Bed created successfully', 'success');
      setShowSetupModal(false);
      setSetupData({ bed_number: '', triage_category: 'RED' });
      fetchBeds();
    } catch (err: any) {
      console.error(err);
      notify(err.response?.data?.message || 'Failed to create bed', 'error');
    }
  };

  const handleUpdateBed = async () => {
    if (!showEditModal) return;
    try {
      await erdService.updateBed({
        id: showEditModal.bed_id,
        bed_number: showEditModal.bed_number,
        bed_status: showEditModal.bed_status,
        triage_category: showEditModal.triage_category
      });
      notify('ERD Bed updated successfully', 'success');
      setShowEditModal(null);
      setDischargeModalView('actions');
      fetchBeds();
    } catch (err: any) {
      console.error(err);
      notify(err.response?.data?.message || 'Failed to update bed', 'error');
    }
  };

  const handleDeleteBed = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this bed?")) return;
    try {
      await erdService.deleteBed(id);
      notify('ERD Bed deleted successfully', 'success');
      fetchBeds();
    } catch (err: any) {
      console.error(err);
      notify(err.response?.data?.message || 'Failed to delete bed', 'error');
    }
  };

  const handleDischargeAction = async (action: string, admissionId: number, patientName: string) => {
    if (!admissionId) {
      notify('Admission ID not found for this bed', 'error');
      return;
    }

    setDischargeActionLoading(true);
    try {
      if (['reverseBillingFileReceived', 'reverseBillingClearance'].includes(action)) {
        setShowReversalModal({
          admissionId,
          action,
          patientName,
          title: action === 'reverseBillingFileReceived' ? 'Reverse Billing File Received' : 'Reverse Billing Clearance',
          description: `Are you sure you want to reverse the ${action === 'reverseBillingFileReceived' ? 'billing file received' : 'billing clearance'} status?`
        });
        setDischargeActionLoading(false);
        return;
      }

      if (action === 'billingFileReceived') await erdService.billingFileReceived(admissionId);
      else if (action === 'billingClearance') await erdService.billingClearance(admissionId);
      else if (action === 'finalizeDischarge') await erdService.finalize(admissionId);

      notify('Action successful', 'success');
      setActiveDischargeAction(null);
      fetchBeds();
    } catch (err: any) {
      notify(err.response?.data?.message || 'Failed to perform action', 'error');
    } finally {
      setDischargeActionLoading(false);
    }
  };

  const handleSearchPatient = async () => {
    if (!searchMrn) return;
    try {
      const patient = await patientService.getPatientByMrn(searchMrn);
      if (patient) {
        setSearchedPatient(patient);
        notify('Patient found', 'success');
      } else {
        setSearchedPatient(null);
        notify('Patient not found', 'error');
      }
    } catch (err: any) {
      console.error(err);
      notify(err.response?.data?.message || 'Failed to search patient', 'error');
    }
  };

  const handleAdmitPatient = async () => {
    if (!showAdmitModal || !searchedPatient) return;
    try {
      await erdService.admitPatient({
        mrn: searchedPatient.mrn,
        bed_number: showAdmitModal.bed_number,
        triage_level: admissionData.triage_level,
        admitting_doctor_id: parseInt(admissionData.admitting_doctor_id)
      });
      notify('Patient admitted to ERD successfully', 'success');
      setShowAdmitModal(null);
      setAdmissionData({ admitting_doctor_id: '', triage_level: 'URGENT' });
      setSearchMrn('');
      setSearchedPatient(null);
      fetchBeds();
    } catch (err: any) {
      console.error(err);
      notify(err.response?.data?.message || 'Failed to admit patient', 'error');
    }
  };

  const getTriageColor = (category: string) => {
    switch (category) {
      case 'RED': return 'text-red-600 bg-red-50 border-red-200';
      case 'YELLOW': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'GREEN': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'BLACK': return 'text-slate-800 bg-slate-200 border-slate-300';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  const getBedCardColor = (status: string, triage: string) => {
    if (status === 'OCCUPIED') {
      switch (triage) {
        case 'RED': return 'bg-white border-red-200 hover:border-red-400';
        case 'YELLOW': return 'bg-white border-amber-200 hover:border-amber-400';
        case 'GREEN': return 'bg-white border-emerald-200 hover:border-emerald-400';
        case 'BLACK': return 'bg-white border-slate-300 hover:border-slate-500';
        default: return 'bg-white border-red-100 hover:border-red-400';
      }
    } else if (status === 'AVAILABLE') {
      switch (triage) {
        case 'RED': return 'bg-white border-red-100 border-dashed hover:border-red-400 hover:bg-red-50/20';
        case 'YELLOW': return 'bg-white border-amber-100 border-dashed hover:border-amber-400 hover:bg-amber-50/20';
        case 'GREEN': return 'bg-white border-emerald-100 border-dashed hover:border-emerald-400 hover:bg-emerald-50/20';
        case 'BLACK': return 'bg-white border-slate-200 border-dashed hover:border-slate-400 hover:bg-slate-50/20';
        default: return 'bg-white border-slate-100 border-dashed hover:border-brand-primary hover:bg-brand-active/20';
      }
    }
    return 'bg-slate-50 border-slate-200';
  };

  const getBedIconColor = (status: string, triage: string) => {
    if (status === 'OCCUPIED') {
      switch (triage) {
        case 'RED': return 'bg-red-600 text-white shadow-lg shadow-red-200';
        case 'YELLOW': return 'bg-amber-500 text-white shadow-lg shadow-amber-200';
        case 'GREEN': return 'bg-emerald-500 text-white shadow-lg shadow-emerald-200';
        case 'BLACK': return 'bg-slate-800 text-white shadow-lg shadow-slate-200';
        default: return 'bg-red-600 text-white shadow-lg shadow-red-200';
      }
    } else {
      switch (triage) {
        case 'RED': return 'bg-red-50 text-red-500';
        case 'YELLOW': return 'bg-amber-50 text-amber-500';
        case 'GREEN': return 'bg-emerald-50 text-emerald-500';
        case 'BLACK': return 'bg-slate-100 text-slate-600';
        default: return 'bg-slate-100 text-slate-400';
      }
    }
  };

  const getStatusBadgeColor = (status: string, triage: string) => {
    if (status === 'OCCUPIED') {
      switch (triage) {
        case 'RED': return 'bg-red-50 text-red-600 border-red-100';
        case 'YELLOW': return 'bg-amber-50 text-amber-600 border-amber-100';
        case 'GREEN': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
        case 'BLACK': return 'bg-slate-100 text-slate-800 border-slate-200';
        default: return 'bg-red-50 text-red-600 border-red-100';
      }
    }
    return 'bg-slate-50 text-slate-400 border-slate-200';
  };

  const getActivityColor = (triage: string) => {
    switch (triage) {
      case 'RED': return 'text-red-500';
      case 'YELLOW': return 'text-amber-500';
      case 'GREEN': return 'text-emerald-500';
      case 'BLACK': return 'text-slate-600';
      default: return 'text-red-500';
    }
  };

  // Tells staff who needs to act next in the discharge pipeline, given the current stage.
  const getDischargeStageLabel = (stage?: string | null) => {
    switch (stage) {
      case 'DOCTOR_MARKED': return 'Awaiting Nurse Clearance';
      case 'NURSING_CLEARANCE': return 'Awaiting Pharmacy Clearance';
      case 'PHARMACY_CLEARANCE': return 'Awaiting Billing File';
      case 'BILLING_FILE_RECEIVED': return 'Awaiting Billing Clearance';
      case 'BILLING_CLEARANCE': return 'Awaiting Finalize';
      case 'FINALIZED': return 'Discharge Finalized';
      default: return null;
    }
  };

  const filteredBeds = beds.filter(b => b.bed_number.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Layout size={20} className="text-red-600" />
            ED Floor Layout
          </h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Real-time facility visualization</p>
        </div>
        <div className="flex items-center gap-4">
          <select 
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-red-500"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="OCCUPIED">Occupied</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="RESERVED">Reserved</option>
          </select>
          <select 
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-red-500"
            value={filterTriage}
            onChange={(e) => setFilterTriage(e.target.value)}
          >
            <option value="">All Triage</option>
            <option value="RED">RED</option>
            <option value="YELLOW">YELLOW</option>
            <option value="GREEN">GREEN</option>
            <option value="BLACK">BLACK</option>
          </select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Find bed..."
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:border-red-500 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setShowSetupModal(true)}
            className="bg-red-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-red-700 transition-colors flex items-center gap-2 shadow-sm"
          >
            <Plus size={16} /> Add ERD Bed
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredBeds.map((bed) => (
            <div 
              key={bed.bed_id}
              className={`group relative rounded-[28px] border-2 transition-all p-7 flex flex-col justify-between min-h-[220px] shadow-sm ${getBedCardColor(bed.bed_status, bed.triage_category)}`}
            >
              <div className="flex items-start justify-between">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg flex-shrink-0 ${getBedIconColor(bed.bed_status, bed.triage_category)}`}>
                  {bed.bed_number.charAt(0)}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest border ${getTriageColor(bed.triage_category)}`}>
                    {bed.triage_category}
                  </span>
                  <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest border ${getStatusBadgeColor(bed.bed_status, bed.triage_category)}`}>
                    {bed.bed_status}
                  </span>
                </div>
              </div>

              <div className="mt-4">
                <h4 className="font-black text-slate-800 text-lg leading-tight">{bed.bed_number}</h4>
                
                {bed.bed_status === 'OCCUPIED' ? (
                  bed.occupant ? (
                    <div className="mt-4 flex flex-col gap-2 pt-4 border-t border-slate-50">
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-red-500" />
                        <span className="text-xs font-bold text-slate-600 truncate">{bed.occupant.full_name} ({bed.occupant.gender?.charAt(0)}, {bed.occupant.age})</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded">{bed.occupant.mrn}</span>
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded">{bed.occupant.admission_details?.admission_no}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                        <Clock size={12} /> {bed.occupant.admission_details?.admitted_at ? new Date(bed.occupant.admission_details.admitted_at).toLocaleString() : 'N/A'}
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mt-1">
                        <span className="truncate max-w-[120px]">Dr: {bed.occupant.clinical?.admitting_doctor || 'N/A'}</span>
                        <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded truncate max-w-[80px]">{bed.occupant.financial?.payer_name || 'N/A'}</span>
                      </div>
                      {getDischargeStageLabel(bed.occupant.admission_details?.discharge_stage) && (
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wide bg-amber-50 text-amber-700 border border-amber-100 whitespace-nowrap w-fit max-w-full">
                          <Clock size={10} className="shrink-0" /> <span className="truncate">{getDischargeStageLabel(bed.occupant.admission_details?.discharge_stage)}</span>
                        </div>
                      )}
                    </div>
                  ) : bed.patient ? (
                    <div className="mt-4 flex flex-col gap-2 pt-4 border-t border-slate-50">
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-red-500" />
                        <span className="text-xs font-bold text-slate-600">{bed.patient.name}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                        <Clock size={12} /> {new Date(bed.patient.admission_date).toLocaleString()}
                      </div>
                    </div>
                  ) : (
                    <div className={`mt-6 flex items-center gap-2 ${getActivityColor(bed.triage_category)}`}>
                       <Activity size={14} className="animate-pulse" />
                       <span className="text-[10px] font-black uppercase">OCCUPIED</span>
                    </div>
                  )
                ) : bed.bed_status === 'AVAILABLE' ? (
                   <button 
                     onClick={() => setShowAdmitModal(bed)}
                     className="mt-6 flex items-center gap-2 text-[10px] font-black text-brand-primary uppercase tracking-widest hover:underline"
                   >
                      <Plus size={14} /> Assign Patient
                   </button>
                ) : (
                  <div className="mt-6 flex items-center gap-2 text-amber-500">
                     <Activity size={14} className="animate-pulse" />
                     <span className="text-[10px] font-black uppercase">{bed.bed_status}</span>
                  </div>
                )}

                <button
                  onClick={() => {
                    setActiveDischargeAction(bed);
                    setDischargeModalView('actions');
                  }}
                  className="mt-4 w-full flex items-center justify-center gap-2 py-2 bg-white/70 hover:bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-600 uppercase tracking-widest transition-colors"
                >
                  <MoreVertical size={14} /> Actions
                </button>
              </div>
            </div>
          ))}
          {filteredBeds.length === 0 && (
            <div className="col-span-full text-center py-20 text-slate-400 font-bold">
              No ERD beds found. Create one to get started.
            </div>
          )}
        </div>
      )}

      {/* Setup Bed Modal */}
      {showSetupModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowSetupModal(false)} />
          <div className="relative bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-red-50/30">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-600 text-white rounded-xl shadow-sm">
                  <Plus size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-800 tracking-tight">Create ERD Bed</h2>
                  <p className="text-[10px] text-red-600 font-bold uppercase tracking-widest">Emergency Floor</p>
                </div>
              </div>
              <button onClick={() => setShowSetupModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bed Number / Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. ER Triage 1"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-red-500"
                  value={setupData.bed_number}
                  onChange={e => setSetupData({...setupData, bed_number: e.target.value})}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Triage Category</label>
                <select 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-red-500"
                  value={setupData.triage_category}
                  onChange={e => setSetupData({...setupData, triage_category: e.target.value})}
                >
                  <option value="RED">RED (Immediate)</option>
                  <option value="YELLOW">YELLOW (Urgent)</option>
                  <option value="GREEN">GREEN (Stable)</option>
                  <option value="BLACK">BLACK (Deceased/Expectant)</option>
                </select>
              </div>
            </div>

            <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button onClick={() => setShowSetupModal(false)} className="px-6 py-2.5 text-xs font-black text-slate-400 uppercase tracking-widest">Cancel</button>
              <button 
                onClick={handleCreateBed}
                disabled={!setupData.bed_number}
                className="bg-red-600 text-white px-8 py-3 rounded-[24px] font-black uppercase text-xs tracking-widest shadow-lg shadow-red-200 hover:bg-red-700 transition-all disabled:opacity-50"
              >
                Create Bed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admit Patient Modal */}
      {showAdmitModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowAdmitModal(null)} />
          <div className="relative bg-white w-full max-w-md rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-emerald-50/30">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-200">
                  <User size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">Admit to ERD</h2>
                  <p className="text-xs text-emerald-600 font-bold uppercase tracking-widest">{showAdmitModal.bed_number}</p>
                </div>
              </div>
              <button onClick={() => setShowAdmitModal(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
                <X size={24} />
              </button>
            </div>

            <div className="p-10 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Patient MRN</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Enter MRN..."
                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-emerald-500"
                    value={searchMrn}
                    onChange={e => setSearchMrn(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearchPatient()}
                  />
                  <button 
                    onClick={handleSearchPatient}
                    className="px-4 py-3 bg-slate-800 text-white rounded-2xl font-bold hover:bg-slate-700 transition-colors"
                  >
                    <Search size={18} />
                  </button>
                </div>
              </div>

              {searchedPatient && (
                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex items-center gap-4 animate-in fade-in">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-emerald-600 font-black text-lg shadow-sm flex-shrink-0">
                    {searchedPatient.demographics?.first_name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800">{searchedPatient.demographics?.first_name} {searchedPatient.demographics?.last_name}</h4>
                    <p className="text-xs font-bold text-emerald-600">{searchedPatient.mrn}</p>
                  </div>
                </div>
              )}

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Admitting Doctor</label>
                  <select 
                    value={admissionData.admitting_doctor_id}
                    onChange={e => setAdmissionData({...admissionData, admitting_doctor_id: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-emerald-500 mt-1"
                  >
                    <option value="">Select a doctor...</option>
                    {doctors.map(d => (
                      <option key={d.doctor_id} value={d.doctor_id}>
                        Dr. {d.first_name} {d.last_name} ({d.specialization_name})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Triage Level</label>
                  <select 
                    value={admissionData.triage_level}
                    onChange={e => setAdmissionData({...admissionData, triage_level: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-emerald-500 mt-1"
                  >
                    <option value="IMMEDIATE">IMMEDIATE</option>
                    <option value="URGENT">URGENT</option>
                    <option value="DELAYED">DELAYED</option>
                    <option value="EXPECTANT">EXPECTANT</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="px-10 py-8 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button onClick={() => setShowAdmitModal(null)} className="px-6 py-2.5 text-xs font-black text-slate-400 uppercase tracking-widest">Cancel</button>
              <button 
                onClick={handleAdmitPatient}
                disabled={!searchedPatient || !admissionData.admitting_doctor_id}
                className="bg-emerald-600 text-white px-8 py-3 rounded-[24px] font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-200 hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Admission
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bed Actions Modal — View/Edit/Delete Bed + ERD Discharge/Billing actions */}
      {activeDischargeAction && !showReversalModal && (() => {
        const bed = activeDischargeAction;
        const occupant = bed.occupant;
        const details = occupant?.admission_details;
        const admissionId = details?.admission_id || 0;
        const stage = details?.discharge_stage;
        const isPharmacyClearance = stage === 'PHARMACY_CLEARANCE';
        const isBillingFileReceived = stage === 'BILLING_FILE_RECEIVED';
        const isBillingClearance = stage === 'BILLING_CLEARANCE';
        const hasDischargeStarted = !!stage && stage !== 'ACTIVE' && stage !== 'NONE';

        return (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
              <div className="bg-slate-50 px-6 py-5 border-b border-slate-100 flex justify-between items-start sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  {dischargeModalView !== 'actions' && (
                    <button
                      onClick={() => setDischargeModalView('actions')}
                      className="p-2 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors shrink-0"
                      title="Back"
                    >
                      <ArrowLeft size={18} />
                    </button>
                  )}
                  <div>
                    <h3 className="font-black text-slate-800 text-xl tracking-tight">
                      {dischargeModalView === 'details' ? 'Patient Details' : dischargeModalView === 'edit' ? 'Edit Bed' : dischargeModalView === 'transferIpd' ? 'Transfer to IPD' : 'Bed Actions'}
                    </h3>
                    <p className="text-xs font-bold text-slate-500 mt-1 flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-700">{bed.bed_number}</span>
                      {occupant ? `${occupant.mrn} • ${occupant.full_name}` : 'No patient assigned'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveDischargeAction(null)}
                  className="text-slate-400 hover:text-red-500 bg-white hover:bg-red-50 p-2 rounded-full transition-colors shrink-0"
                >
                  <XCircle size={24} />
                </button>
              </div>

              {dischargeModalView === 'details' && occupant && (
                <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
                  <div>
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Demographics</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Full Name</p>
                        <p className="font-black text-slate-800 mt-1">{occupant.full_name}</p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">MRN</p>
                        <p className="font-black text-slate-800 mt-1">{occupant.mrn}</p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gender</p>
                        <p className="font-black text-slate-800 mt-1">{occupant.gender}</p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Age</p>
                        <p className="font-black text-slate-800 mt-1">{occupant.age} years</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Admission Details</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Admission No</p>
                        <p className="font-black text-slate-800 mt-1">{details?.admission_no || 'N/A'}</p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Admitted At</p>
                        <p className="font-black text-slate-800 mt-1">
                          {details?.admitted_at ? new Date(details.admitted_at).toLocaleString() : 'N/A'}
                        </p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Triage Level</p>
                        <p className="font-black text-slate-800 mt-1">{details?.triage_level || 'N/A'}</p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reason for Admission</p>
                        <p className="font-black text-slate-800 mt-1">{(details as any)?.reason_for_admission || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Clinical</h4>
                      <div className="space-y-3">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Admitting Doctor</p>
                          <p className="font-black text-slate-800 mt-1">Dr. {occupant.clinical?.admitting_doctor || 'N/A'}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Diagnosis</p>
                          <p className="font-black text-slate-800 mt-1">{(occupant.clinical as any)?.diagnosis || 'N/A'}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Allergies</p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {((occupant.clinical as any)?.allergies || []).length > 0 ? (
                              ((occupant.clinical as any)?.allergies || []).map((allergy: string, idx: number) => (
                                <span key={idx} className="px-2 py-1 bg-rose-100 text-rose-700 text-xs font-bold rounded-md">
                                  {allergy}
                                </span>
                              ))
                            ) : (
                              <span className="font-black text-slate-800">None recorded</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Financial</h4>
                      <div className="space-y-3">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Payer Name</p>
                          <p className="font-black text-slate-800 mt-1">{occupant.financial?.payer_name || 'N/A'}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Payer Category</p>
                          <p className="font-black text-slate-800 mt-1">{occupant.financial?.payer_category || 'N/A'}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Plan Name</p>
                          <p className="font-black text-slate-800 mt-1">{(occupant.financial as any)?.plan_name || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {dischargeModalView === 'edit' && showEditModal && (
                <>
                  <div className="p-8 space-y-5 overflow-y-auto custom-scrollbar">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bed Number / Name</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-brand-active0"
                        value={showEditModal.bed_number}
                        onChange={e => setShowEditModal({ ...showEditModal, bed_number: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
                      <select
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-brand-active0"
                        value={showEditModal.bed_status}
                        onChange={e => setShowEditModal({ ...showEditModal, bed_status: e.target.value as any })}
                      >
                        <option value="AVAILABLE">AVAILABLE</option>
                        <option value="OCCUPIED">OCCUPIED</option>
                        <option value="MAINTENANCE">MAINTENANCE</option>
                        <option value="RESERVED">RESERVED</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Triage Category</label>
                      <select
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-brand-active0"
                        value={showEditModal.triage_category}
                        onChange={e => setShowEditModal({ ...showEditModal, triage_category: e.target.value as any })}
                      >
                        <option value="RED">RED (Immediate)</option>
                        <option value="YELLOW">YELLOW (Urgent)</option>
                        <option value="GREEN">GREEN (Stable)</option>
                        <option value="BLACK">BLACK (Deceased/Expectant)</option>
                      </select>
                    </div>
                  </div>
                  <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                    <button onClick={() => setDischargeModalView('actions')} className="px-6 py-2.5 text-xs font-black text-slate-400 uppercase tracking-widest">Cancel</button>
                    <button
                      onClick={handleUpdateBed}
                      disabled={!showEditModal.bed_number}
                      className="bg-brand-primary text-white px-8 py-3 rounded-[24px] font-black uppercase text-xs tracking-widest shadow-lg shadow-brand-active hover:bg-brand-primary transition-all disabled:opacity-50"
                    >
                      Save Changes
                    </button>
                  </div>
                </>
              )}

              {dischargeModalView === 'transferIpd' && occupant && (
                <>
                  <div className="p-8 space-y-5 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ward</label>
                        <select
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-brand-active0"
                          value={transferForm.ward_id}
                          onChange={e => {
                            const ward_id = e.target.value;
                            setTransferForm({ ...transferForm, ward_id, room_id: '', bed_id: '' });
                            setIpdBeds([]);
                            if (ward_id) fetchIpdRooms(parseInt(ward_id));
                            else setIpdRooms([]);
                          }}
                        >
                          <option value="">Select ward...</option>
                          {ipdWards.map((w: any) => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Room</label>
                        <select
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-brand-active0 disabled:opacity-50"
                          value={transferForm.room_id}
                          disabled={!transferForm.ward_id}
                          onChange={e => {
                            const room_id = e.target.value;
                            setTransferForm({ ...transferForm, room_id, bed_id: '' });
                            if (room_id) fetchIpdBeds(parseInt(room_id));
                            else setIpdBeds([]);
                          }}
                        >
                          <option value="">Select room...</option>
                          {ipdRooms.map((r: any) => (
                            <option key={r.id} value={r.id}>{r.room_number}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bed</label>
                      <select
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-brand-active0 disabled:opacity-50"
                        value={transferForm.bed_id}
                        disabled={!transferForm.room_id}
                        onChange={e => setTransferForm({ ...transferForm, bed_id: e.target.value })}
                      >
                        <option value="">Select bed...</option>
                        {ipdBeds.map((b: any) => (
                          <option key={b.id} value={b.id} disabled={b.bed_status !== 'AVAILABLE'}>
                            {b.bed_number} {b.bed_status !== 'AVAILABLE' ? `(${b.bed_status})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Admitting Doctor</label>
                      <select
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-brand-active0"
                        value={transferForm.admitting_doctor_id}
                        onChange={e => setTransferForm({ ...transferForm, admitting_doctor_id: e.target.value })}
                      >
                        <option value="">Select doctor...</option>
                        {doctors.map((d: Doctor) => (
                          <option key={d.doctor_id} value={d.doctor_id}>Dr. {d.first_name} {d.last_name}{d.specialization_name ? ` — ${d.specialization_name}` : ''}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Admission Reason</label>
                      <textarea
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-brand-active0 min-h-[100px] resize-none"
                        placeholder="e.g. Patient requires continuous monitoring and IV antibiotics for severe pneumonia."
                        value={transferForm.admission_reason}
                        onChange={e => setTransferForm({ ...transferForm, admission_reason: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                    <button onClick={() => setDischargeModalView('actions')} disabled={transferLoading} className="px-6 py-2.5 text-xs font-black text-slate-400 uppercase tracking-widest disabled:opacity-50">Cancel</button>
                    <button
                      onClick={() => handleTransferToIpd(admissionId, occupant.mrn)}
                      disabled={transferLoading || !transferForm.bed_id || !transferForm.admitting_doctor_id || !transferForm.admission_reason.trim()}
                      className="bg-indigo-600 text-white px-8 py-3 rounded-[24px] font-black uppercase text-xs tracking-widest shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      {transferLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                      Confirm Transfer
                    </button>
                  </div>
                </>
              )}

              {dischargeModalView === 'actions' && (
              <div className="p-6 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {occupant && (
                      <button
                        onClick={() => setDischargeModalView('details')}
                        className="flex flex-col items-center justify-center gap-3 p-5 bg-white border-2 border-slate-100 rounded-2xl hover:bg-slate-50 hover:border-slate-300 transition-all text-slate-700 group shadow-sm hover:shadow-md shadow-slate-500/5"
                      >
                        <div className="p-4 bg-slate-100 rounded-2xl group-hover:scale-110 transition-transform text-slate-600">
                          <User size={28} />
                        </div>
                        <span className="text-sm font-bold text-center">View Details</span>
                      </button>
                    )}

                    {occupant && (
                      <button
                        onClick={openTransferToIpd}
                        className="flex flex-col items-center justify-center gap-3 p-5 bg-white border-2 border-indigo-50 rounded-2xl hover:bg-indigo-50 hover:border-indigo-200 transition-all text-indigo-700 group shadow-sm hover:shadow-md shadow-indigo-500/5"
                      >
                        <div className="p-4 bg-indigo-100 rounded-2xl group-hover:scale-110 transition-transform text-indigo-600">
                          <ArrowLeft size={28} className="rotate-180" />
                        </div>
                        <span className="text-sm font-bold text-center">Transfer to IPD</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setShowEditModal(bed);
                        setDischargeModalView('edit');
                      }}
                      className="flex flex-col items-center justify-center gap-3 p-5 bg-white border-2 border-slate-100 rounded-2xl hover:bg-slate-50 hover:border-slate-300 transition-all text-slate-700 group shadow-sm hover:shadow-md shadow-slate-500/5"
                    >
                      <div className="p-4 bg-slate-100 rounded-2xl group-hover:scale-110 transition-transform text-slate-600">
                        <Edit2 size={28} />
                      </div>
                      <span className="text-sm font-bold text-center">Edit Bed</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveDischargeAction(null);
                        handleDeleteBed(bed.bed_id);
                      }}
                      className="flex flex-col items-center justify-center gap-3 p-5 bg-white border-2 border-rose-50 rounded-2xl hover:bg-rose-50 hover:border-rose-200 transition-all text-rose-700 group shadow-sm hover:shadow-md shadow-rose-500/5"
                    >
                      <div className="p-4 bg-rose-100 rounded-2xl group-hover:scale-110 transition-transform text-rose-600">
                        <Trash2 size={28} />
                      </div>
                      <span className="text-sm font-bold text-center">Delete Bed</span>
                    </button>

                    {occupant && (
                      <>
                    <button
                      onClick={() => isPharmacyClearance && handleDischargeAction('billingFileReceived', admissionId, occupant.full_name)}
                      disabled={dischargeActionLoading || !isPharmacyClearance}
                      title={!isPharmacyClearance ? "Requires Pharmacy Clearance first, or file already received." : ""}
                      className="flex flex-col items-center justify-center gap-3 p-5 bg-white border-2 border-teal-50 rounded-2xl hover:bg-teal-50 hover:border-teal-200 transition-all text-teal-700 group shadow-sm hover:shadow-md shadow-teal-500/5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
                    >
                      <div className="p-4 bg-teal-100 rounded-2xl group-hover:scale-110 transition-transform text-teal-600">
                        {dischargeActionLoading && isPharmacyClearance ? <Loader2 size={28} className="animate-spin" /> : <CheckCircle2 size={28} />}
                      </div>
                      <span className="text-sm font-bold text-center">Receive File</span>
                    </button>

                    <button
                      onClick={() => isBillingFileReceived && handleDischargeAction('reverseBillingFileReceived', admissionId, occupant.full_name)}
                      disabled={dischargeActionLoading || !isBillingFileReceived}
                      title={!isBillingFileReceived ? "Can only reverse if file was just received." : ""}
                      className="flex flex-col items-center justify-center gap-3 p-5 bg-white border-2 border-rose-50 rounded-2xl hover:bg-rose-50 hover:border-rose-200 transition-all text-rose-700 group shadow-sm hover:shadow-md shadow-rose-500/5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
                    >
                      <div className="p-4 bg-rose-100 rounded-2xl group-hover:scale-110 transition-transform text-rose-600">
                        <RotateCcw size={28} />
                      </div>
                      <span className="text-sm font-bold text-center">Reverse File</span>
                    </button>

                    <button
                      onClick={() => isBillingFileReceived && handleDischargeAction('billingClearance', admissionId, occupant.full_name)}
                      disabled={dischargeActionLoading || !isBillingFileReceived}
                      title={!isBillingFileReceived ? "Requires Billing File Received first, or already cleared." : ""}
                      className="flex flex-col items-center justify-center gap-3 p-5 bg-white border-2 border-teal-50 rounded-2xl hover:bg-teal-50 hover:border-teal-200 transition-all text-teal-700 group shadow-sm hover:shadow-md shadow-teal-500/5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
                    >
                      <div className="p-4 bg-teal-100 rounded-2xl group-hover:scale-110 transition-transform text-teal-600">
                        {dischargeActionLoading && isBillingFileReceived ? <Loader2 size={28} className="animate-spin" /> : <CheckCircle2 size={28} />}
                      </div>
                      <span className="text-sm font-bold text-center">Clear Billing</span>
                    </button>

                    <button
                      onClick={() => isBillingClearance && handleDischargeAction('reverseBillingClearance', admissionId, occupant.full_name)}
                      disabled={dischargeActionLoading || !isBillingClearance}
                      title={!isBillingClearance ? "Can only reverse if currently at Billing Clearance stage." : ""}
                      className="flex flex-col items-center justify-center gap-3 p-5 bg-white border-2 border-rose-50 rounded-2xl hover:bg-rose-50 hover:border-rose-200 transition-all text-rose-700 group shadow-sm hover:shadow-md shadow-rose-500/5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
                    >
                      <div className="p-4 bg-rose-100 rounded-2xl group-hover:scale-110 transition-transform text-rose-600">
                        <RotateCcw size={28} />
                      </div>
                      <span className="text-sm font-bold text-center">Reverse Clearance</span>
                    </button>

                    <button
                      onClick={() => isBillingClearance && handleDischargeAction('finalizeDischarge', admissionId, occupant.full_name)}
                      disabled={dischargeActionLoading || !isBillingClearance}
                      title={!isBillingClearance ? "Requires Billing Clearance first." : ""}
                      className="flex flex-col items-center justify-center gap-3 p-5 bg-white border-2 border-brand-active rounded-2xl hover:bg-brand-active/50 hover:border-brand-primary transition-all text-brand-primary group shadow-sm hover:shadow-md shadow-brand-primary/10 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
                    >
                      <div className="p-4 bg-brand-active0 rounded-2xl group-hover:scale-110 transition-transform text-brand-primary">
                        {dischargeActionLoading && isBillingClearance ? <Loader2 size={28} className="animate-spin" /> : <LogOut size={28} />}
                      </div>
                      <span className="text-sm font-bold text-center">Finalize Discharge</span>
                    </button>

                    <button
                      onClick={() => {
                        if (!hasDischargeStarted) return;
                        setShowSummaryModal(details!.encounter_id);
                        setActiveDischargeAction(null);
                      }}
                      disabled={!hasDischargeStarted}
                      title={!hasDischargeStarted ? "Requires the patient to be marked for discharge first." : ""}
                      className="flex flex-col items-center justify-center gap-3 p-5 bg-white border-2 border-slate-100 rounded-2xl hover:bg-slate-50 hover:border-slate-300 transition-all text-slate-700 group shadow-sm hover:shadow-md shadow-slate-500/5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
                    >
                      <div className="p-4 bg-slate-100 rounded-2xl group-hover:scale-110 transition-transform text-slate-600">
                        <FileText size={28} />
                      </div>
                      <span className="text-sm font-bold text-center">Discharge Summary</span>
                    </button>
                      </>
                    )}
                </div>
              </div>
              )}
            </div>
          </div>
        );
      })()}

      <ReversalModal
        isOpen={!!showReversalModal}
        onClose={() => {
          setShowReversalModal(null);
          setActiveDischargeAction(null);
        }}
        onBack={() => setShowReversalModal(null)}
        title={showReversalModal?.title || ''}
        description={showReversalModal?.description || ''}
        patientName={showReversalModal?.patientName}
        onConfirm={async (reason) => {
          if (!showReversalModal) return;
          const payload = { admission_id: showReversalModal.admissionId, reason };
          try {
            if (showReversalModal.action === 'reverseBillingFileReceived') await erdService.reverseBillingFileReceived(payload);
            else if (showReversalModal.action === 'reverseBillingClearance') await erdService.reverseBillingClearance(payload);
            notify('Reversal successful', 'success');
            setShowReversalModal(null);
            setActiveDischargeAction(null);
            fetchBeds();
          } catch (err: any) {
            notify(err.response?.data?.message || 'Failed to reverse action', 'error');
            throw err;
          }
        }}
      />

      {showSummaryModal !== null && (
        <DischargeSummaryModal
          isOpen={showSummaryModal !== null}
          onClose={() => setShowSummaryModal(null)}
          encounterId={showSummaryModal}
          isERD={true}
        />
      )}
    </div>
  );
};

export default EmergencyFloor;

