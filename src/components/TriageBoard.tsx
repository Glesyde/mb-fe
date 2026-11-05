
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
  Search
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
      </div>
    </div>
  );
};

const TriageBoard: React.FC = () => {
  const [patients, setPatients] = useState<EDPatient[]>(MOCK_ED_PATIENTS);
  const [showRegModal, setShowRegModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<EDPatient | null>(null);

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

  const handleRapidRegister = () => {
    const newPatient: EDPatient = {
      id: `ED-${Math.floor(Math.random() * 1000)}`,
      name: formData.firstName || formData.lastName ? `${formData.firstName} ${formData.lastName}` : `Unknown ${formData.gender}`,
      mrn: `TEMP-${Math.floor(Math.random() * 1000)}`,
      age: formData.age ? `${formData.age}Y` : 'Unknown',
      complaint: formData.complaint,
      arrivalTime: new Date(),
      triage: formData.triage as any,
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

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Zap size={20} className="text-red-600" />
            Live Triage Board
          </h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Patient status & response tracking</p>
        </div>
        <button 
          onClick={() => setShowRegModal(true)}
          className="bg-red-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-red-700 transition-all shadow-lg shadow-red-200 active:scale-95 text-xs uppercase tracking-widest"
        >
          <UserPlus size={20} /> Rapid Registration
        </button>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-4 no-scrollbar min-h-[600px]">
        <TriageColumn 
          title="Immediate / Red" 
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
          title="Stable / Green" 
          color="bg-emerald-500" 
          patients={patients.filter(p => p.triage === 'Green')}
          onAction={(p) => setSelectedPatient(p)}
        />
      </div>

      {/* Modal & Sidebar UI would go here - preserved from existing code */}
      {showRegModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowRegModal(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-red-50/30">
                <div className="flex items-center gap-3">
                   <UserPlus size={24} className="text-red-600" />
                   <h2 className="text-xl font-bold text-slate-800 tracking-tight">Rapid ED Intake</h2>
                </div>
                <button onClick={() => setShowRegModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20}/></button>
             </div>
             <div className="p-8 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                   <input placeholder="First Name" className="w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm outline-none" onChange={e => setFormData({...formData, firstName: e.target.value})} />
                   <input placeholder="Last Name" className="w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm outline-none" onChange={e => setFormData({...formData, lastName: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <input placeholder="Age" className="w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm outline-none" onChange={e => setFormData({...formData, age: e.target.value})} />
                   <select className="w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm outline-none" value={formData.triage} onChange={e => setFormData({...formData, triage: e.target.value})}>
                      <option value="Red">RED</option>
                      <option value="Yellow">YELLOW</option>
                      <option value="Green">GREEN</option>
                   </select>
                </div>
                <textarea placeholder="Complaint..." className="w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm outline-none h-20 resize-none" onChange={e => setFormData({...formData, complaint: e.target.value})} />
             </div>
             <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button onClick={() => setShowRegModal(false)} className="px-6 py-2 text-sm font-bold text-slate-400">Cancel</button>
                <button onClick={handleRapidRegister} className="bg-red-600 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-lg shadow-red-200">Register Patient</button>
             </div>
          </div>
        </div>
      )}

      {selectedPatient && (
        <div className="fixed inset-y-0 right-0 z-[130] w-full max-w-sm bg-white shadow-2xl border-l border-slate-100 animate-in slide-in-from-right duration-300">
           <div className="p-8 h-full flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-slate-800">Triage Summary</h3>
                <button onClick={() => setSelectedPatient(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20}/></button>
              </div>
              <div className="space-y-6 flex-1">
                 <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                    <h4 className="font-black text-slate-800 text-lg">{selectedPatient.name}</h4>
                    <p className="text-xs font-bold text-brand-primary uppercase tracking-widest mt-1">{selectedPatient.mrn}</p>
                 </div>
                 <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase">Chief Complaint</p>
                    <p className="text-sm font-medium text-slate-700 leading-relaxed italic">"{selectedPatient.complaint}"</p>
                 </div>
                 <div className="pt-6 border-t border-slate-100 grid grid-cols-2 gap-4">
                    <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase">Vitals BP</p>
                       <p className="text-lg font-black text-slate-800">{selectedPatient.vitals.bp}</p>
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase">Heart Rate</p>
                       <p className="text-lg font-black text-slate-800">{selectedPatient.vitals.hr} BPM</p>
                    </div>
                 </div>
              </div>
              <button className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                 <FileText size={18} /> Open Clinical Encounter
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default TriageBoard;
