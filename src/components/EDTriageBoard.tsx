import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Clock, 
  Zap, 
  X, 
  CheckCircle2, 
  UserPlus, 
  AlertTriangle,
  FileText,
  Search,
  MoreVertical,
  Bed,
  Stethoscope,
  // Added missing Activity icon
  Activity
} from 'lucide-react';

interface EDPatient {
  id: string;
  name: string;
  mrn: string;
  age: string;
  complaint: string;
  arrivalTime: Date;
  triage: 'Red' | 'Yellow' | 'Green';
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
    name: 'Unknown Male (Trauma)',
    mrn: 'TEMP-881',
    age: '25-30 Est.',
    complaint: 'Road Traffic Accident - Severe hemorrhage',
    arrivalTime: new Date(Date.now() - 8 * 60000),
    triage: 'Red',
    vitals: { bp: '80/50', hr: '130', resp: '28', temp: '36.1' }
  },
  {
    id: 'ED-002',
    name: 'Jane Smith',
    mrn: 'MRN-2024-9912',
    age: '54Y',
    complaint: 'Crushing chest pain, radiating to left arm',
    arrivalTime: new Date(Date.now() - 15 * 60000),
    triage: 'Red',
    vitals: { bp: '160/100', hr: '105', resp: '22', temp: '36.8' }
  },
  {
    id: 'ED-003',
    name: 'Robert Jenkins',
    mrn: 'MRN-2024-4421',
    age: '68Y',
    complaint: 'Shortness of breath, history of COPD',
    arrivalTime: new Date(Date.now() - 45 * 60000),
    triage: 'Yellow',
    vitals: { bp: '135/85', hr: '88', resp: '24', temp: '37.2' }
  },
  {
    id: 'ED-004',
    name: 'Lily Evans',
    mrn: 'MRN-2025-0012',
    age: '4Y',
    complaint: 'High fever, persistent vomiting',
    arrivalTime: new Date(Date.now() - 30 * 60000),
    triage: 'Yellow',
    vitals: { bp: '95/60', hr: '110', resp: '26', temp: '39.4' }
  },
  {
    id: 'ED-005',
    name: 'Samuel Okafor',
    mrn: 'MRN-2024-1102',
    age: '32Y',
    complaint: 'Laceration to right hand, stable',
    arrivalTime: new Date(Date.now() - 120 * 60000),
    triage: 'Green',
    vitals: { bp: '120/80', hr: '72', resp: '16', temp: '36.6' }
  }
];

const EDTriageBoard: React.FC = () => {
  const [patients, setPatients] = useState<EDPatient[]>(MOCK_ED_PATIENTS);
  const [showRegModal, setShowRegModal] = useState(false);
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', gender: 'Unknown', age: '', complaint: '', triage: 'Yellow' as const,
    bp: '', hr: '', resp: '', temp: ''
  });

  const getWaitTime = (arrival: Date) => {
    const diff = Math.floor((now.getTime() - arrival.getTime()) / 60000);
    if (diff < 60) return `${diff}m`;
    return `${Math.floor(diff / 60)}h ${diff % 60}m`;
  };

  const handleRapidRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const newPatient: EDPatient = {
      id: `ED-${Math.floor(Math.random() * 1000)}`,
      name: formData.firstName || formData.lastName ? `${formData.firstName} ${formData.lastName}` : `Unknown ${formData.gender}`,
      mrn: `TEMP-${Math.floor(Math.random() * 1000)}`,
      age: formData.age ? `${formData.age}Y` : 'Unknown',
      complaint: formData.complaint,
      arrivalTime: new Date(),
      triage: formData.triage,
      vitals: {
        bp: formData.bp || '--/--', hr: formData.hr || '--', resp: formData.resp || '--', temp: formData.temp || '--'
      }
    };
    setPatients([newPatient, ...patients]);
    setShowRegModal(false);
    setFormData({
      firstName: '', lastName: '', gender: 'Unknown', age: '', complaint: '', triage: 'Yellow',
      bp: '', hr: '', resp: '', temp: ''
    });
  };

  const TriageColumn = ({ title, color, triageLevel }: { title: string, color: string, triageLevel: 'Red' | 'Yellow' | 'Green' }) => {
    const columnPatients = patients.filter(p => p.triage === triageLevel);
    
    return (
      <div className="flex flex-col h-full min-w-[340px] bg-slate-100/50 rounded-[40px] p-5 border border-slate-200/60">
        <div className="flex items-center justify-between px-4 mb-6">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${color} shadow-sm shadow-${color}/50`} />
            <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">{title}</h3>
          </div>
          <span className="text-[10px] font-black bg-white px-3 py-1 rounded-full border border-slate-200 text-slate-500 shadow-sm">
            {columnPatients.length} Patients
          </span>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto no-scrollbar pb-4">
          {columnPatients.map(p => (
            <div 
              key={p.id}
              className="group bg-white p-6 rounded-[32px] border-2 border-transparent hover:border-red-100 shadow-sm hover:shadow-md transition-all relative overflow-visible"
            >
              {p.triage === 'Red' && <div className="absolute top-0 left-0 w-2 h-full bg-red-500" />}
              
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-black text-slate-900 text-base leading-tight group-hover:text-red-600 transition-colors">{p.name}</h4>
                  <p className="text-[10px] font-mono font-bold text-brand-primary mt-1 uppercase tracking-tighter">{p.mrn} • {p.age}</p>
                </div>
                <div className="relative">
                  <button 
                    onClick={() => setActiveActionMenu(activeActionMenu === p.id ? null : p.id)}
                    className="p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
                  >
                    <MoreVertical size={18} />
                  </button>
                  
                  {activeActionMenu === p.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setActiveActionMenu(null)} />
                      <div className="absolute right-0 top-10 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 z-20 py-2 animate-in fade-in zoom-in-95 duration-100">
                        <button className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-red-50 hover:text-red-600 transition-colors">
                          <Bed size={16} /> Assign Bed / Bay
                        </button>
                        <button className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-brand-active hover:text-brand-primary transition-colors">
                          <Stethoscope size={16} /> Start Encounter
                        </button>
                        <div className="h-px bg-slate-50 my-1 mx-2" />
                        <button className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors">
                          <CheckCircle2 size={16} /> Mark Stabilized
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 mb-5">
                <p className="text-xs text-slate-600 font-medium line-clamp-2 italic leading-relaxed">
                  "{p.complaint}"
                </p>
              </div>

              <div className="grid grid-cols-4 gap-2 pt-4 border-t border-slate-50">
                <div className="text-center">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">BP</p>
                  <p className="text-[10px] font-black text-slate-800">{p.vitals.bp}</p>
                </div>
                <div className="text-center">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">HR</p>
                  <p className="text-[10px] font-black text-slate-800">{p.vitals.hr}</p>
                </div>
                <div className="text-center">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">RESP</p>
                  <p className="text-[10px] font-black text-slate-800">{p.vitals.resp}</p>
                </div>
                <div className="text-center">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">TEMP</p>
                  <p className="text-[10px] font-black text-slate-800">{p.vitals.temp}°</p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-[9px] font-black text-slate-400 uppercase tracking-[0.1em]">
                <div className="flex items-center gap-1">
                  <Clock size={12} className="text-red-400" />
                  Waited: {getWaitTime(p.arrivalTime)}
                </div>
                <div className="flex items-center gap-1 text-brand-active0">
                  {/* Added Activity icon */}
                  <Activity size={12} /> Live
                </div>
              </div>
            </div>
          ))}
          {columnPatients.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-200 rounded-[32px] opacity-40">
              <CheckCircle2 size={40} className="text-slate-300 mb-2" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Section Clear</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Zap size={20} className="text-red-600" />
            Trauma Triage Board
          </h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Managed response & clinical sorting</p>
        </div>
        <button 
          onClick={() => setShowRegModal(true)}
          className="bg-red-600 text-white px-8 py-4 rounded-[20px] font-black flex items-center gap-2 hover:bg-red-700 transition-all shadow-xl shadow-red-200 active:scale-95 text-xs uppercase tracking-[0.15em]"
        >
          <UserPlus size={18} /> Rapid Registration
        </button>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-6 overflow-x-auto pb-6 no-scrollbar h-[calc(100vh-320px)]">
        <TriageColumn title="Immediate (Red)" color="bg-red-500" triageLevel="Red" />
        <TriageColumn title="Urgent (Yellow)" color="bg-amber-500" triageLevel="Yellow" />
        <TriageColumn title="Routine (Green)" color="bg-emerald-500" triageLevel="Green" />
      </div>

      {/* Stats QuickView */}
      <div className="bg-slate-900 rounded-[32px] p-6 text-white flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-12 px-6">
           <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Active Triage</p>
              <p className="text-2xl font-black">{patients.length}</p>
           </div>
           <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Avg stabilization</p>
              <p className="text-2xl font-black text-emerald-400">14m</p>
           </div>
        </div>
        <div className="flex items-center gap-4">
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Live Connection Verified</span>
           <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
        </div>
      </div>

      {/* Rapid Registration Modal */}
      {showRegModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowRegModal(false)} />
          <form 
            onSubmit={handleRapidRegister}
            className="relative bg-white w-full max-w-lg rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
          >
            <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-red-50/20">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-600 text-white rounded-2xl shadow-lg">
                  <UserPlus size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">Rapid ED Intake</h2>
                  <p className="text-xs text-red-600 font-bold uppercase tracking-widest">Life-saving documentation first</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowRegModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={24} className="text-slate-400" />
              </button>
            </div>

            <div className="p-10 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">First Name / Identifier</label>
                  <input required type="text" placeholder="e.g. Unknown Male" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white outline-none" onChange={e => setFormData({...formData, firstName: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Last Name</label>
                  <input type="text" placeholder="Optional" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white outline-none" onChange={e => setFormData({...formData, lastName: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Age (Est.)</label>
                  <input type="text" placeholder="e.g. 35" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white outline-none" onChange={e => setFormData({...formData, age: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Initial Triage</label>
                  <select 
                    className="w-full px-5 py-3.5 bg-red-50 border-2 border-red-100 rounded-2xl text-sm font-black text-red-600 outline-none appearance-none"
                    value={formData.triage}
                    onChange={e => setFormData({...formData, triage: e.target.value as any})}
                  >
                    <option value="Red">RED (Immediate)</option>
                    <option value="Yellow">YELLOW (Urgent)</option>
                    <option value="Green">GREEN (Routine)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Chief Complaint</label>
                <textarea required rows={2} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-3xl text-sm font-medium outline-none focus:bg-white resize-none" placeholder="Reason for ED presentation..." onChange={e => setFormData({...formData, complaint: e.target.value})} />
              </div>

              <div className="bg-amber-50 border border-amber-100 p-6 rounded-[32px] flex items-start gap-4">
                 <AlertTriangle className="text-amber-600 flex-shrink-0" size={24} />
                 <p className="text-[10px] text-amber-700 font-black uppercase tracking-tight leading-relaxed">
                   Duplicate Check: System will auto-merge if biometrics match existing MRN record during full enrollment.
                 </p>
              </div>
            </div>

            <div className="px-10 py-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button type="button" onClick={() => setShowRegModal(false)} className="px-6 py-3 text-xs font-black text-slate-400 uppercase tracking-widest">Discard</button>
              <button type="submit" className="bg-red-600 text-white px-10 py-4 rounded-[20px] font-black uppercase text-xs tracking-widest shadow-xl shadow-red-200 hover:bg-red-700 transition-all flex items-center gap-2">
                <Plus size={18} /> Admit to Board
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default EDTriageBoard;