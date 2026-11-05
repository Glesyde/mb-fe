import React, { useState, useEffect } from 'react';
import { 
  Stethoscope, 
  Search, 
  Activity, 
  CheckCircle2, 
  Wind, 
  Heart, 
  Droplets, 
  Plus, 
  Save, 
  AlertCircle, 
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  Zap,
  MoreVertical,
  Clock,
  Loader2,
  LogOut,
  X
} from 'lucide-react';
import { erdService } from '../services/erd.service';
import { wardService } from '../services/ward.service';
import DischargeSummaryModal from './DischargeSummaryModal';
import SignaturePad from './SignaturePad';

interface EDEncounter {
  id: string | number; // Updated to support number IDs from API
  admission_id?: number; 
  patientName: string;
  mrn: string;
  complaint: string;
  timeStarted: string;
  triage: 'Red' | 'Yellow' | 'Green';
}

const MOCK_ACTIVE_PATIENTS: EDEncounter[] = [
  { id: 'ENC-001', admission_id: 101, patientName: 'Unknown Male', mrn: 'TEMP-881', complaint: 'RTA Trauma', timeStarted: '12m ago', triage: 'Red' },
  { id: 'ENC-002', admission_id: 102, patientName: 'Jane Smith', mrn: 'MRN-9912', complaint: 'Acute Chest Pain', timeStarted: '30m ago', triage: 'Red' },
  { id: 'ENC-003', admission_id: 103, patientName: 'Robert Jenkins', mrn: 'MRN-4421', complaint: 'Shortness of Breath', timeStarted: '45m ago', triage: 'Yellow' },
];

const EmergencyEncounter: React.FC = () => {
  const [selected, setSelected] = useState<EDEncounter | null>(null);
  const [survey, setSurvey] = useState({ A: false, B: false, C: false });
  const [activeOrders, setActiveOrders] = useState<string[]>([]);
  const [disposition, setDisposition] = useState('');
  const [isFinalizing, setIsFinalizing] = useState(false);

  // Discharge State
  const [showDischargeModal, setShowDischargeModal] = useState<any>(null);
  const [dischargeReasons, setDischargeReasons] = useState<any[]>([]);
  const [dischargeFormData, setDischargeFormData] = useState({
    discharge_reason_id: "",
    discharge_notes: "",
    doctor_signature: "",
    patient_witness: "",
  });
  const [reasonSearchTerm, setReasonSearchTerm] = useState("");
  const [showReasonList, setShowReasonList] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState<number | null>(null);

  useEffect(() => {
    fetchDischargeReasons();
  }, []);

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

  const toggleSurvey = (key: 'A' | 'B' | 'C') => {
    setSurvey(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const addOrder = (order: string) => {
    if (!activeOrders.includes(order)) {
      setActiveOrders([...activeOrders, order]);
    }
  };

  const handleFinalize = async () => {
    if (!disposition) {
      alert("Please select a disposition (Admit/Discharge/Transfer) before finalizing.");
      return;
    }

    if (disposition.includes('Discharge') && selected?.admission_id) {
      setShowDischargeModal({ 
        patient: { 
          name: selected.patientName, 
          admission_id: selected.admission_id 
        } 
      });
      return;
    }

    await finalizeEncounter();
  };

  const finalizeEncounter = async (dischargeData?: any) => {
    setIsFinalizing(true);
    try {
      if (dischargeData && selected?.admission_id) {
        await erdService.markForDischarge({
          admission_id: selected.admission_id,
          ...dischargeData
        });
      }
      
      alert(`Clinical encounter for ${selected?.patientName} finalized with disposition: ${disposition}`);
      setSelected(null);
      setSurvey({ A: false, B: false, C: false });
      setActiveOrders([]);
      setDisposition('');
      setShowDischargeModal(null);
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to finalize encounter properly.");
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleMarkForDischarge = async () => {
    if (!dischargeFormData.discharge_reason_id) {
      alert("Please select a discharge reason");
      return;
    }
    if (!dischargeFormData.doctor_signature) {
      alert("Doctor signature is required");
      return;
    }

    await finalizeEncounter({
      discharge_reason_id: parseInt(dischargeFormData.discharge_reason_id),
      discharge_notes: dischargeFormData.discharge_notes,
      doctor_signature: dischargeFormData.doctor_signature,
      patient_witness: dischargeFormData.patient_witness,
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500 min-h-[700px]">
      {/* Left Sidebar: My Active Patients */}
      <div className="lg:col-span-3 space-y-6 flex flex-col h-full">
        <div className="bg-white border border-slate-200 rounded-[40px] p-6 shadow-sm flex flex-col flex-1 overflow-hidden">
          <div className="mb-6">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <Activity size={16} className="text-red-600" /> My Active Cases
            </h3>
            <p className="text-[10px] font-bold text-slate-400 mt-1">Assigned clinical encounters</p>
          </div>
          
          <div className="relative mb-6 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-600 transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Quick filter..." 
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:bg-white transition-all"
            />
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar pr-1">
            {MOCK_ACTIVE_PATIENTS.map(e => (
              <div 
                key={e.id}
                onClick={() => setSelected(e)}
                className={`p-5 rounded-[28px] border-2 transition-all cursor-pointer relative group
                  ${selected?.id === e.id 
                    ? 'bg-red-600 border-red-600 text-white shadow-xl shadow-red-100' 
                    : 'bg-white border-slate-50 hover:border-red-100 text-slate-700'}
                `}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${e.triage === 'Red' ? 'bg-red-500' : 'bg-amber-500'} ring-4 ring-white/10`} />
                    <h4 className="text-sm font-black truncate max-w-[120px]">{e.patientName}</h4>
                  </div>
                  <span className={`text-[8px] font-mono font-bold ${selected?.id === e.id ? 'text-red-200' : 'text-slate-400'}`}>{e.mrn}</span>
                </div>
                <p className={`text-xs font-medium line-clamp-1 italic ${selected?.id === e.id ? 'text-red-100' : 'text-slate-500'}`}>"{e.complaint}"</p>
                <div className="mt-4 flex items-center justify-between">
                   <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest opacity-60">
                      <Clock size={12}/> {e.timeStarted}
                   </div>
                   <ChevronRight size={14} className={selected?.id === e.id ? 'text-white' : 'text-slate-300'} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area: Rapid Note Interface */}
      <div className="lg:col-span-9">
        {selected ? (
          <div className="bg-white border border-slate-200 rounded-[48px] shadow-xl overflow-hidden flex flex-col h-full animate-in slide-in-from-right-6 duration-500">
            {/* Context Header */}
            <div className="p-10 border-b border-slate-100 bg-red-50/20 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-3xl bg-red-600 text-white flex items-center justify-center font-black shadow-lg shadow-red-200">
                  <Stethoscope size={40} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-tight">Rapid Trauma Assessment</h2>
                  <p className="text-sm text-slate-500 font-bold uppercase tracking-[0.15em] mt-1">{selected.patientName} • {selected.mrn}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                 <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Triage Priority</span>
                    <span className="text-sm font-black text-red-600 uppercase">Immediate / Red</span>
                 </div>
              </div>
            </div>

            <div className="p-10 space-y-10 overflow-y-auto no-scrollbar">
              {/* Primary Survey (ABCDE) */}
              <div className="space-y-6">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-l-4 border-red-500 pl-4">Primary Survey (ABC)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { key: 'A' as const, label: 'Airway', desc: 'Patent & Clear', icon: Wind },
                    { key: 'B' as const, label: 'Breathing', desc: 'Adequate Effort', icon: Activity },
                    { key: 'C' as const, label: 'Circulation', desc: 'Strong Perfusion', icon: Heart },
                  ].map((item) => (
                    <button 
                      key={item.key}
                      onClick={() => toggleSurvey(item.key)}
                      className={`flex items-center gap-4 p-5 rounded-[28px] border-2 transition-all text-left group
                        ${survey[item.key] 
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-md shadow-emerald-100' 
                          : 'bg-slate-50 border-slate-100 hover:border-slate-300 text-slate-400'}
                      `}
                    >
                      <div className={`p-3 rounded-2xl transition-colors ${survey[item.key] ? 'bg-emerald-500 text-white' : 'bg-white text-slate-300 group-hover:text-slate-500'}`}>
                        <item.icon size={24} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60 leading-none mb-1">{item.key}</p>
                        <p className="text-base font-black leading-none mb-1">{item.label}</p>
                        <p className="text-[10px] font-bold">{survey[item.key] ? 'Status Verified' : item.desc}</p>
                      </div>
                      {survey[item.key] && <CheckCircle2 size={20} className="ml-auto text-emerald-600 animate-in zoom-in duration-300" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Orders */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-l-4 border-red-500 pl-4">Rapid Order Entry</h3>
                  <span className="text-[9px] font-black text-brand-active0 bg-brand-active px-2 py-0.5 rounded uppercase tracking-widest">Instant Fulfillment</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {[
                    { label: 'ECG', icon: Activity, color: 'text-brand-primary bg-brand-active border-brand-active' },
                    { label: 'IV Access', icon: Droplets, color: 'text-rose-600 bg-rose-50 border-rose-100' },
                    { label: 'Oxygen 4L/m', icon: Wind, color: 'text-teal-600 bg-teal-50 border-teal-100' },
                    { label: 'Stat CXR', icon: ShieldCheck, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
                    { label: 'Trauma Bloods', icon: Droplets, color: 'text-purple-600 bg-purple-50 border-purple-100' },
                  ].map((order, i) => (
                    <button 
                      key={i}
                      onClick={() => addOrder(order.label)}
                      className={`flex items-center gap-2 px-5 py-3 rounded-2xl border-2 font-black text-xs uppercase tracking-widest transition-all active:scale-95
                        ${activeOrders.includes(order.label) ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : `${order.color} hover:shadow-md`}
                      `}
                    >
                      {activeOrders.includes(order.label) ? <CheckCircle2 size={14}/> : <order.icon size={14} />}
                      {order.label}
                    </button>
                  ))}
                  <button className="flex items-center gap-2 px-5 py-3 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-brand-active0 hover:text-brand-primary transition-all font-black text-xs uppercase tracking-widest">
                    <Plus size={14} /> Other
                  </button>
                </div>
              </div>

              {/* Clinical Impression & Disposition */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assessment / Impression</label>
                  <textarea 
                    rows={4} 
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-[32px] text-sm font-medium outline-none focus:bg-white focus:border-red-500 transition-all resize-none leading-relaxed" 
                    placeholder="Enter rapid clinical findings..." 
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Clinical Disposition</label>
                  <select 
                    className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-[28px] text-lg font-black text-slate-800 outline-none focus:bg-white focus:border-red-500 appearance-none cursor-pointer shadow-inner"
                    value={disposition}
                    onChange={(e) => setDisposition(e.target.value)}
                  >
                    <option value="">Select Disposition...</option>
                    <option value="Admit to Ward">Admit to Ward</option>
                    <option value="Discharge with FU">Discharge (Follow-up)</option>
                    <option value="Transfer to Theatre">Transfer to Theatre</option>
                    <option value="Refer to Specialist">Refer to Specialist</option>
                  </select>
                  <div className="p-5 bg-amber-50 border border-amber-100 rounded-[24px] flex items-start gap-4">
                    <AlertCircle className="text-amber-600 flex-shrink-0" size={20} />
                    <p className="text-[10px] text-amber-700 font-bold leading-relaxed uppercase">
                      Confirming disposition will trigger an automatic notification to the respective department head.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-10 bg-slate-50 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 mt-auto">
               <div className="flex items-center gap-4">
                 <div className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active System Connection Verified</span>
                 </div>
                 {selected.admission_id && (
                   <button 
                     onClick={() => setShowSummaryModal(selected.admission_id!)}
                     className="px-5 py-2.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl shadow-sm text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-colors"
                   >
                     View Summary
                   </button>
                 )}
               </div>
               <div className="flex items-center gap-4">
                 <button onClick={() => setSelected(null)} className="px-8 py-3 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-800 transition-colors">Discard Session</button>
                 <button 
                  onClick={handleFinalize}
                  disabled={isFinalizing}
                  className="bg-red-600 text-white px-12 py-5 rounded-[24px] font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-red-200 hover:bg-red-700 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-70"
                 >
                   {isFinalizing ? <Loader2 size={20} className="animate-spin" /> : <ShieldCheck size={20} />}
                   Finalize Encounter
                 </button>
               </div>
            </div>
          </div>
        ) : (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-[48px] h-full flex flex-col items-center justify-center p-20 text-center animate-in fade-in duration-700">
             <div className="w-32 h-32 bg-slate-50 text-slate-200 rounded-[44px] flex items-center justify-center mb-8 shadow-inner">
               <Zap size={64} className="animate-pulse" />
             </div>
             <h3 className="text-3xl font-black text-slate-800 tracking-tight">Active Clinical Interface</h3>
             <p className="text-slate-500 max-w-sm mx-auto mt-4 font-medium leading-relaxed">
              Select a patient from your active ED list to open the Rapid Documentation interface. Sessions are secured and logged in real-time.
             </p>
             <div className="mt-12 grid grid-cols-2 gap-4 w-full max-w-md">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                   <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Session Limit</p>
                   <p className="text-sm font-black text-slate-700 uppercase">3 Concurrent</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                   <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Current Load</p>
                   <p className="text-sm font-black text-red-600 uppercase">High Utility</p>
                </div>
             </div>
          </div>
        )}
      </div>

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
                disabled={!dischargeFormData.discharge_reason_id || !dischargeFormData.doctor_signature || isFinalizing}
                className="bg-rose-600 text-white px-8 py-3 rounded-[24px] font-black uppercase text-xs tracking-widest shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isFinalizing ? <Loader2 size={16} className="animate-spin" /> : 'Confirm Discharge'}
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
        isERD={true}
      />
    </div>
  );
};

export default EmergencyEncounter;
