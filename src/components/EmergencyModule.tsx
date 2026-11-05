import React, { useState, useEffect } from 'react';
import { 
  Ambulance, 
  Plus, 
  Clock, 
  Activity, 
  AlertTriangle, 
  UserPlus, 
  Thermometer, 
  Droplets, 
  Heart, 
  Zap, 
  X, 
  CheckCircle2, 
  MoreVertical,
  Search,
  Timer,
  FileText,
  Loader2,
  RotateCcw
} from 'lucide-react';
import { erdService } from '../services/erd.service';
import NurseClearanceModal from './NurseClearanceModal';
import ReversalModal from './ReversalModal';
import DischargeSummaryModal from './DischargeSummaryModal';

interface EDPatient {
  id: string;
  admission_id: number;
  name: string;
  mrn: string;
  age: string;
  complaint: string;
  arrivalTime: Date;
  triage: 'Red' | 'Yellow' | 'Green';
  discharge_stage?: string;
  vitals: {
    bp: string;
    hr: string;
    resp: string;
    temp: string;
  };
}

const MOCK_ED_PATIENTS: EDPatient[] = [
  {
    id: 'ED-001',
    admission_id: 101,
    name: 'Unknown Male (Trauma)',
    mrn: 'TEMP-881',
    age: '25-30 Est.',
    complaint: 'Road Traffic Accident - Severe hemorrhage',
    arrivalTime: new Date(Date.now() - 8 * 60000), // 8 mins ago
    triage: 'Red',
    discharge_stage: 'ACTIVE',
    vitals: { bp: '80/50', hr: '130', resp: '28', temp: '36.1' }
  },
  {
    id: 'ED-002',
    admission_id: 102,
    name: 'Jane Smith',
    mrn: 'MRN-2024-9912',
    age: '54Y',
    complaint: 'Crushing chest pain, radiating to left arm',
    arrivalTime: new Date(Date.now() - 15 * 60000), // 15 mins ago
    triage: 'Red',
    discharge_stage: 'DOCTOR_MARKED',
    vitals: { bp: '160/100', hr: '105', resp: '22', temp: '36.8' }
  },
  {
    id: 'ED-003',
    admission_id: 103,
    name: 'Robert Jenkins',
    mrn: 'MRN-2024-4421',
    age: '68Y',
    complaint: 'Shortness of breath, history of COPD',
    arrivalTime: new Date(Date.now() - 45 * 60000), // 45 mins ago
    triage: 'Yellow',
    discharge_stage: 'ACTIVE',
    vitals: { bp: '135/85', hr: '88', resp: '24', temp: '37.2' }
  },
  {
    id: 'ED-004',
    admission_id: 104,
    name: 'Lily Evans',
    mrn: 'MRN-2025-0012',
    age: '4Y',
    complaint: 'High fever, persistent vomiting',
    arrivalTime: new Date(Date.now() - 30 * 60000), // 30 mins ago
    triage: 'Yellow',
    discharge_stage: 'NURSING_CLEARANCE',
    vitals: { bp: '95/60', hr: '110', resp: '26', temp: '39.4' }
  },
  {
    id: 'ED-005',
    admission_id: 105,
    name: 'Samuel Okafor',
    mrn: 'MRN-2024-1102',
    age: '32Y',
    complaint: 'Laceration to right hand, stable',
    arrivalTime: new Date(Date.now() - 120 * 60000), // 2 hours ago
    triage: 'Green',
    discharge_stage: 'ACTIVE',
    vitals: { bp: '120/80', hr: '72', resp: '16', temp: '36.6' }
  }
];

const TriageColumn = ({ 
  title, 
  color, 
  patients, 
  onAction 
}: { 
  title: string; 
  color: string; 
  patients: EDPatient[]; 
  onAction: (p: EDPatient) => void 
}) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const getWaitTime = (arrival: Date) => {
    const diff = Math.floor((now.getTime() - arrival.getTime()) / 60000);
    if (diff < 60) return `${diff}m`;
    return `${Math.floor(diff / 60)}h ${diff % 60}m`;
  };

  const getUrgencyColor = (arrival: Date, triage: string) => {
    const diff = Math.floor((now.getTime() - arrival.getTime()) / 60000);
    if (triage === 'Red' && diff > 5) return 'text-red-600 bg-red-50 animate-pulse';
    if (triage === 'Yellow' && diff > 30) return 'text-orange-600 bg-orange-50';
    return 'text-slate-400 bg-slate-50';
  };

  return (
    <div className="flex flex-col h-full min-w-[320px] bg-slate-100/50 rounded-[32px] p-4 border border-slate-200/60">
      <div className="flex items-center justify-between px-4 mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${color}`} />
          <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">{title}</h3>
        </div>
        <span className="text-[10px] font-bold bg-white px-2 py-0.5 rounded-full border border-slate-200 text-slate-500 shadow-sm">
          {patients.length}
        </span>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto no-scrollbar pb-4">
        {patients.map(p => (
          <div 
            key={p.id}
            onClick={() => onAction(p)}
            className="group bg-white p-5 rounded-[24px] border border-slate-200 shadow-sm hover:shadow-md hover:border-brand-active transition-all cursor-pointer relative overflow-hidden"
          >
            {p.triage === 'Red' && (
              <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500" />
            )}
            
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-bold text-slate-900 text-sm leading-tight">{p.name}</h4>
                <p className="text-[10px] font-mono font-bold text-brand-primary mt-1">{p.mrn}</p>
              </div>
              <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-lg border border-transparent ${getUrgencyColor(p.arrivalTime, p.triage)}`}>
                <Clock size={12} /> {getWaitTime(p.arrivalTime)}
              </div>
            </div>

            <p className="text-xs text-slate-600 font-medium line-clamp-2 mb-4">
              {p.complaint}
            </p>

            {p.discharge_stage && p.discharge_stage !== 'ACTIVE' && (
              <div className="mb-4 flex items-center gap-2">
                <span className="text-[9px] font-black px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase tracking-widest">
                  {p.discharge_stage.replace(/_/g, ' ')}
                </span>
              </div>
            )}

            <div className="grid grid-cols-4 gap-2 pt-3 border-t border-slate-50">
              <div className="text-center">
                <p className="text-[8px] font-bold text-slate-400 uppercase">BP</p>
                <p className="text-[10px] font-black text-slate-700">{p.vitals.bp}</p>
              </div>
              <div className="text-center">
                <p className="text-[8px] font-bold text-slate-400 uppercase">HR</p>
                <p className="text-[10px] font-black text-slate-700">{p.vitals.hr}</p>
              </div>
              <div className="text-center">
                <p className="text-[8px] font-bold text-slate-400 uppercase">Resp</p>
                <p className="text-[10px] font-black text-slate-700">{p.vitals.resp}</p>
              </div>
              <div className="text-center">
                <p className="text-[8px] font-bold text-slate-400 uppercase">Temp</p>
                <p className="text-[10px] font-black text-slate-700">{p.vitals.temp}°C</p>
              </div>
            </div>
          </div>
        ))}
        {patients.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-200 rounded-[24px]">
            <CheckCircle2 className="text-slate-200 mb-2" size={32} />
            <p className="text-[10px] font-bold text-slate-300 uppercase">No Patients</p>
          </div>
        )}
      </div>
    </div>
  );
};

const EmergencyModule: React.FC = () => {
  const [patients, setPatients] = useState<EDPatient[]>(MOCK_ED_PATIENTS);
  const [showRegModal, setShowRegModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<EDPatient | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    gender: 'Unknown',
    age: '',
    complaint: '',
    triage: 'Yellow',
    bp: '',
    hr: '',
    resp: '',
    temp: ''
  });

  const [showNurseClearanceModal, setShowNurseClearanceModal] = useState<any>(null);
  const [showReversalModal, setShowReversalModal] = useState<{
    admissionId: number;
    action: string;
    title: string;
    description: string;
    patientName: string;
  } | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState<number | null>(null);

  const handleRapidRegister = () => {
    const newPatient: EDPatient = {
      id: `ED-${Math.floor(Math.random() * 1000)}`,
      admission_id: Math.floor(Math.random() * 10000), // Added admission_id
      name: formData.firstName || formData.lastName ? `${formData.firstName} ${formData.lastName}` : `Unknown ${formData.gender}`,
      mrn: `TEMP-${Math.floor(Math.random() * 1000)}`,
      age: formData.age ? `${formData.age}Y` : 'Unknown',
      complaint: formData.complaint,
      arrivalTime: new Date(),
      triage: formData.triage as any,
      discharge_stage: 'ACTIVE',
      vitals: {
        bp: formData.bp || '--/--',
        hr: formData.hr || '--',
        resp: formData.resp || '--',
        temp: formData.temp || '--'
      }
    };
    setPatients([newPatient, ...patients]);
    setShowRegModal(false);
    setFormData({
      firstName: '', lastName: '', gender: 'Unknown', age: '', complaint: '', triage: 'Yellow',
      bp: '', hr: '', resp: '', temp: ''
    });
  };

  const handleNurseClearance = (admissionId: number) => {
    const p = patients.find(p => p.admission_id === admissionId);
    setShowNurseClearanceModal({
      patientName: p?.name,
      admissionId: admissionId,
      isERD: true
    });
  };

  const handleNurseClearanceSuccess = () => {
    if (showNurseClearanceModal) {
      const { admissionId } = showNurseClearanceModal;
      setPatients(prev => prev.map(p => p.admission_id === admissionId ? { ...p, discharge_stage: 'NURSING_CLEARANCE' } : p));
      if (selectedPatient?.admission_id === admissionId) {
        setSelectedPatient({ ...selectedPatient, discharge_stage: 'NURSING_CLEARANCE' });
      }
    }
  };

  const handleReverseNurseClearance = (admissionId: number) => {
    const p = patients.find(p => p.admission_id === admissionId);
    setShowReversalModal({
      admissionId,
      action: 'reverseNurseClearance',
      title: 'Reverse Nurse Clearance',
      description: 'Are you sure you want to reverse the nurse clearance?',
      patientName: p?.name || ''
    });
  };

  const handleFinalizeDischarge = async (admissionId: number) => {
    setIsActionLoading(true);
    try {
      await erdService.finalize(admissionId);
      alert("Discharge Finalized successfully");
      setPatients(prev => prev.map(p => p.admission_id === admissionId ? { ...p, discharge_stage: 'FINALIZED' } : p));
      if (selectedPatient?.admission_id === admissionId) {
        setSelectedPatient({ ...selectedPatient, discharge_stage: 'FINALIZED' });
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to finalize discharge");
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-600 text-white rounded-[20px] shadow-lg shadow-red-200 animate-pulse">
            <Ambulance size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Emergency Department</h1>
            <p className="text-slate-500 font-medium flex items-center gap-2">
              <Zap size={14} className="text-amber-500" /> Live Triage Board • Critical Care Center
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active System Connection</span>
          </div>
          <button 
            onClick={() => setShowRegModal(true)}
            className="bg-red-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-red-700 transition-all shadow-lg shadow-red-200 active:scale-95"
          >
            <UserPlus size={20} /> Rapid Registration
          </button>
        </div>
      </div>

      {/* Main Board Area */}
      <div className="flex-1 flex gap-6 overflow-x-auto pb-4 no-scrollbar">
        <TriageColumn 
          title="Resuscitation / Immediate" 
          color="bg-red-500" 
          patients={patients.filter(p => p.triage === 'Red')}
          onAction={(p) => setSelectedPatient(p)}
        />
        <TriageColumn 
          title="Urgent / Yellow" 
          color="bg-amber-500" 
          patients={patients.filter(p => p.triage === 'Yellow')}
          onAction={(p) => setSelectedPatient(p)}
        />
        <TriageColumn 
          title="Non-Urgent / Green" 
          color="bg-emerald-500" 
          patients={patients.filter(p => p.triage === 'Green')}
          onAction={(p) => setSelectedPatient(p)}
        />
      </div>

      {/* Stats Footer Overlay */}
      <div className="bg-white/80 backdrop-blur border border-slate-200/50 p-4 rounded-[32px] flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-8 px-4">
          <div className="flex flex-col">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">ED Capacity</span>
            <span className="text-sm font-black text-slate-800">12/15 Beds</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Avg Wait Time</span>
            <span className="text-sm font-black text-amber-600">18m</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Ambulance ETA</span>
            <span className="text-sm font-black text-brand-primary">4m (Trauma)</span>
          </div>
        </div>
        <button className="text-[10px] font-bold text-brand-primary hover:bg-brand-active px-4 py-2 rounded-xl transition-all">
          View All Staff On Call
        </button>
      </div>

      {/* Rapid Registration Modal */}
      {showRegModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowRegModal(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-red-50/30">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-600 text-white rounded-xl">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800 tracking-tight">Rapid ED Intake</h2>
                  <p className="text-xs text-red-600 font-bold uppercase tracking-widest">Essential Fields Only</p>
                </div>
              </div>
              <button onClick={() => setShowRegModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="p-8 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">First Name / ID</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Unknown Male"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500/20 outline-none transition-all"
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Last Name</label>
                  <input 
                    type="text" 
                    placeholder="Optional"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500/20 outline-none"
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Est. Age</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 25-30"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500/20 outline-none"
                    onChange={(e) => setFormData({...formData, age: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Initial Triage</label>
                  <select 
                    className={`w-full px-4 py-2.5 border rounded-xl text-sm outline-none font-bold
                      ${formData.triage === 'Red' ? 'bg-red-50 text-red-600 border-red-200' : 
                        formData.triage === 'Yellow' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}
                    `}
                    value={formData.triage}
                    onChange={(e) => setFormData({...formData, triage: e.target.value})}
                  >
                    <option value="Red">RED (Immediate)</option>
                    <option value="Yellow">YELLOW (Urgent)</option>
                    <option value="Green">GREEN (Stable)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Presenting Complaint</label>
                <textarea 
                  rows={2}
                  placeholder="Primary reason for ED visit..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500/20 outline-none"
                  onChange={(e) => setFormData({...formData, complaint: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-4 gap-3 pt-4 border-t border-slate-100">
                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-slate-400 uppercase">BP</label>
                  <input type="text" placeholder="120/80" className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] outline-none" onChange={e => setFormData({...formData, bp: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-slate-400 uppercase">HR</label>
                  <input type="text" placeholder="80" className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] outline-none" onChange={e => setFormData({...formData, hr: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-slate-400 uppercase">Resp</label>
                  <input type="text" placeholder="18" className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] outline-none" onChange={e => setFormData({...formData, resp: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-slate-400 uppercase">Temp</label>
                  <input type="text" placeholder="36.8" className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] outline-none" onChange={e => setFormData({...formData, temp: e.target.value})} />
                </div>
              </div>
            </div>

            <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button 
                onClick={() => setShowRegModal(false)}
                className="px-6 py-2.5 text-sm font-bold text-slate-500"
              >
                Discard
              </button>
              <button 
                onClick={handleRapidRegister}
                className="bg-red-600 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-red-700 transition-all shadow-md shadow-red-200 flex items-center gap-2"
              >
                <AlertTriangle size={18} /> Admit to Board
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Patient Detail / Triage Update Sidebar (Mock) */}
      {selectedPatient && (
        <div className="fixed inset-y-0 right-0 z-[70] w-full max-w-sm bg-white shadow-2xl border-l border-slate-100 animate-in slide-in-from-right duration-300">
           <div className="p-8 h-full flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-slate-800">Triage Profile</h3>
                <button onClick={() => setSelectedPatient(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="space-y-8 flex-1">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl
                    ${selectedPatient.triage === 'Red' ? 'bg-red-500 shadow-lg shadow-red-200' : 
                      selectedPatient.triage === 'Yellow' ? 'bg-amber-500 shadow-lg shadow-amber-200' : 'bg-emerald-500 shadow-lg shadow-emerald-200'}
                  `}>
                    {selectedPatient.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-slate-900">{selectedPatient.name}</h4>
                    <p className="text-xs text-slate-500">{selectedPatient.mrn} • {selectedPatient.age}</p>
                  </div>
                </div>

                <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100">
                   <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Patient Complaint</h5>
                   <p className="text-sm font-medium text-slate-700 leading-relaxed italic">
                    "{selectedPatient.complaint}"
                   </p>
                </div>

                <div className="space-y-4">
                  <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Discharge Workflow</h5>
                  <div className="grid grid-cols-1 gap-2">
                    {selectedPatient.discharge_stage === 'DOCTOR_MARKED' && (
                      <button 
                        onClick={() => handleNurseClearance(selectedPatient.admission_id)}
                        disabled={isActionLoading}
                        className="flex items-center justify-between p-4 rounded-2xl border font-bold text-sm bg-brand-primary text-white hover:bg-brand-primary shadow-lg shadow-brand-active transition-all disabled:opacity-50"
                      >
                        <span className="flex items-center gap-3">
                          {isActionLoading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18}/>} 
                          Nurse Clearance
                        </span>
                      </button>
                    )}

                    {selectedPatient.discharge_stage === 'NURSING_CLEARANCE' && (
                      <button 
                        onClick={() => handleReverseNurseClearance(selectedPatient.admission_id)}
                        disabled={isActionLoading}
                        className="flex items-center justify-between p-4 rounded-2xl border font-bold text-sm bg-red-50 text-red-600 border-red-100 hover:bg-red-100 transition-all disabled:opacity-50"
                      >
                        <span className="flex items-center gap-3">
                          {isActionLoading ? <Loader2 size={18} className="animate-spin" /> : <RotateCcw size={18}/>} 
                          Reverse Nurse Clearance
                        </span>
                      </button>
                    )}

                    {selectedPatient.discharge_stage === 'BILLING_CLEARANCE' && (
                      <button 
                        onClick={() => handleFinalizeDischarge(selectedPatient.admission_id)}
                        disabled={isActionLoading}
                        className="flex items-center justify-between p-4 rounded-2xl border font-bold text-sm bg-brand-primary text-white hover:bg-brand-primary shadow-lg shadow-brand-active transition-all disabled:opacity-50"
                      >
                        <span className="flex items-center gap-3">
                          {isActionLoading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18}/>} 
                          Finalize Discharge
                        </span>
                      </button>
                    )}

                    {(!selectedPatient.discharge_stage || selectedPatient.discharge_stage === 'ACTIVE') ? (
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status</p>
                        <p className="text-sm font-black text-slate-700">Patient under active ER treatment</p>
                      </div>
                    ) : (
                      <>
                        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3">
                          <CheckCircle2 size={24} className="text-emerald-500" />
                          <div>
                            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest leading-none">Status</p>
                            <p className="text-sm font-black text-emerald-700 mt-1">{selectedPatient.discharge_stage.replace(/_/g, ' ')}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setShowSummaryModal(selectedPatient.admission_id)}
                          className="flex items-center justify-center p-4 rounded-2xl border font-bold text-sm bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100 transition-all mt-2"
                        >
                          <span className="flex items-center gap-3">
                            <FileText size={18}/> View Discharge Summary
                          </span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all">
                <FileText size={18} /> Open Full EMR Record
              </button>
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
        onSuccess={handleNurseClearanceSuccess}
      />
      <ReversalModal
        isOpen={!!showReversalModal}
        onClose={() => setShowReversalModal(null)}
        title={showReversalModal?.title || ''}
        description={showReversalModal?.description || ''}
        patientName={showReversalModal?.patientName}
        onConfirm={async (reason) => {
          if (!showReversalModal) return;
          const { admissionId } = showReversalModal;
          try {
            await erdService.reverseNurseClearance({ admission_id: admissionId, reason });
            alert("Nurse clearance reversed");
            setPatients(prev => prev.map(p => p.admission_id === admissionId ? { ...p, discharge_stage: 'DOCTOR_MARKED' } : p));
            if (selectedPatient?.admission_id === admissionId) {
              setSelectedPatient({ ...selectedPatient, discharge_stage: 'DOCTOR_MARKED' });
            }
            setShowReversalModal(null);
          } catch (err: any) {
            alert(err.response?.data?.message || "Failed to reverse action");
            throw err;
          }
        }}
      />
      <DischargeSummaryModal
        isOpen={!!showSummaryModal}
        onClose={() => setShowSummaryModal(null)}
        encounterId={showSummaryModal!}
        isERD={true}
      />
    </div>
  );
};

export default EmergencyModule;
