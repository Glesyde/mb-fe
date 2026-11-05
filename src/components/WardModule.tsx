
import React, { useState } from 'react';
import { 
  Bed, 
  User, 
  Search, 
  Plus, 
  X, 
  Clock, 
  LogOut, 
  ClipboardList, 
  Thermometer, 
  Activity, 
  CheckCircle2, 
  AlertCircle,
  MoreVertical,
  ChevronRight,
  Stethoscope,
  Info
} from 'lucide-react';

interface PatientInfo {
  name: string;
  mrn: string;
  admissionDate: string;
  consultant: string;
}

interface HospitalBed {
  id: string;
  number: string;
  status: 'Available' | 'Occupied' | 'Cleaning' | 'Maintenance';
  patient?: PatientInfo;
}

interface NursingTask {
  id: string;
  bedId: string;
  task: string;
  time: string;
  priority: 'High' | 'Normal';
}

const WARD_DATA: Record<string, HospitalBed[]> = {
  "General Ward A": Array.from({ length: 12 }, (_, i) => ({
    id: `A-${i + 1}`,
    number: `${i + 1}`,
    status: i % 3 === 0 ? 'Occupied' : 'Available',
    patient: i % 3 === 0 ? {
      name: ['Alexander Thompson', 'Sarah Miller', 'James Wilson', 'Elena Rodriguez'][i % 4],
      mrn: `MRN-2024-${8842 + i}`,
      admissionDate: '2025-05-18',
      consultant: 'Dr. Gregory House'
    } : undefined
  })),
  "Male Surgical Ward": Array.from({ length: 8 }, (_, i) => ({
    id: `B-${i + 1}`,
    number: `B${i + 1}`,
    status: i < 3 ? 'Occupied' : i === 4 ? 'Cleaning' : 'Available',
    patient: i < 3 ? {
      name: `Patient ${i + 100}`,
      mrn: `MRN-2024-00${i}`,
      admissionDate: '2025-05-20',
      consultant: 'Dr. Wilson'
    } : undefined
  })),
};

const MOCK_TASKS: NursingTask[] = [
  { id: 't1', bedId: '1', task: 'Vitals Check due', time: '14:30', priority: 'High' },
  { id: 't2', bedId: '4', task: 'Medication Administration', time: '15:00', priority: 'Normal' },
  { id: 't3', bedId: '7', task: 'Dressing Change', time: '15:15', priority: 'Normal' },
  { id: 't4', bedId: '10', task: 'Pre-op Preparation', time: '16:00', priority: 'High' },
];

const WardModule: React.FC = () => {
  const [activeWard, setActiveWard] = useState("General Ward A");
  const [beds, setBeds] = useState(WARD_DATA);
  const [showAdmitModal, setShowAdmitModal] = useState<HospitalBed | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleDischarge = (wardName: string, bedId: string) => {
    setBeds(prev => ({
      ...prev,
      [wardName]: prev[wardName].map(b => 
        b.id === bedId ? { ...b, status: 'Available', patient: undefined } : b
      )
    }));
  };

  const handleAdmit = (bed: HospitalBed) => {
    // Logic for admission would go here
    setBeds(prev => ({
      ...prev,
      [activeWard]: prev[activeWard].map(b => 
        b.id === bed.id ? { 
          ...b, 
          status: 'Occupied', 
          patient: { 
            name: 'New Admission', 
            mrn: 'MRN-2025-NEW', 
            admissionDate: 'Today', 
            consultant: 'Dr. House' 
          } 
        } : b
      )
    }));
    setShowAdmitModal(null);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-in fade-in duration-500 pb-20">
      <div className="flex-1 space-y-6">
        {/* Header Area */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
              <div className="p-2 bg-brand-active text-brand-primary rounded-xl">
                <Bed size={24} />
              </div>
              Inpatient Ward Management
            </h1>
            <p className="text-slate-500 font-medium">Real-time bed tracking and nursing workflows.</p>
          </div>
          <div className="flex items-center gap-2">
            {Object.keys(WARD_DATA).map(ward => (
              <button 
                key={ward}
                onClick={() => setActiveWard(ward)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all
                  ${activeWard === ward ? 'bg-brand-primary text-white shadow-lg shadow-brand-active' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'}
                `}
              >
                {ward}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Beds</p>
              <p className="text-xl font-black text-slate-800">{beds[activeWard].length}</p>
            </div>
            <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center">
              <Bed size={20} />
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Occupied</p>
              <p className="text-xl font-black text-brand-primary">{beds[activeWard].filter(b => b.status === 'Occupied').length}</p>
            </div>
            <div className="w-10 h-10 bg-brand-active text-brand-primary rounded-xl flex items-center justify-center">
              <User size={20} />
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Available</p>
              <p className="text-xl font-black text-emerald-600">{beds[activeWard].filter(b => b.status === 'Available').length}</p>
            </div>
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pending Cleaning</p>
              <p className="text-xl font-black text-amber-600">{beds[activeWard].filter(b => b.status === 'Cleaning').length}</p>
            </div>
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
              <Clock size={20} />
            </div>
          </div>
        </div>

        {/* Ward Bed Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {beds[activeWard].map(bed => (
            <div 
              key={bed.id}
              className={`group relative rounded-[32px] border-2 transition-all p-5 h-56 flex flex-col justify-between
                ${bed.status === 'Occupied' 
                  ? 'bg-white border-brand-active hover:border-brand-primary' 
                  : bed.status === 'Available'
                  ? 'bg-white border-emerald-100 border-dashed hover:border-emerald-300 hover:bg-emerald-50/30'
                  : 'bg-slate-50 border-slate-200'}
              `}
            >
              <div className="flex items-start justify-between">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black
                  ${bed.status === 'Occupied' ? 'bg-brand-primary text-white' : 'bg-slate-100 text-slate-400'}
                `}>
                  {bed.number}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase
                    ${bed.status === 'Occupied' ? 'bg-brand-active text-brand-primary' : 'bg-emerald-50 text-emerald-600'}
                  `}>
                    {bed.status}
                  </span>
                  <button className="p-1 text-slate-300 hover:text-slate-500 transition-colors">
                    <MoreVertical size={16} />
                  </button>
                </div>
              </div>

              {bed.status === 'Occupied' && bed.patient ? (
                <div className="mt-4 animate-in fade-in duration-300">
                  <h4 className="font-bold text-slate-800 truncate">{bed.patient.name}</h4>
                  <p className="text-xs text-slate-500 font-medium">{bed.patient.mrn}</p>
                  <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-400">
                    <Stethoscope size={12} className="text-brand-primary" />
                    <span>{bed.patient.consultant}</span>
                  </div>
                </div>
              ) : bed.status === 'Available' ? (
                <div className="flex-1 flex flex-col items-center justify-center">
                   <button 
                    onClick={() => setShowAdmitModal(bed)}
                    className="flex flex-col items-center gap-1.5 text-slate-400 hover:text-brand-primary transition-colors"
                  >
                    <div className="p-2 rounded-full bg-slate-50 group-hover:bg-brand-active transition-all">
                      <Plus size={20} />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest">Admit Patient</span>
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center">
                  <Clock className="text-amber-400 mb-2" size={24} />
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Cleaning Required</span>
                </div>
              )}

              {bed.status === 'Occupied' && (
                <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                  <div className="flex -space-x-1.5 overflow-hidden">
                    <div className="w-6 h-6 rounded-full border-2 border-white bg-brand-active flex items-center justify-center text-[8px] font-bold text-brand-primary">V</div>
                    <div className="w-6 h-6 rounded-full border-2 border-white bg-teal-100 flex items-center justify-center text-[8px] font-bold text-teal-600">M</div>
                  </div>
                  <button 
                    onClick={() => handleDischarge(activeWard, bed.id)}
                    className="text-[10px] font-bold text-red-500 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <LogOut size={12} /> Discharge
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Nursing Sidebar Dashboard */}
      <div className="w-full lg:w-80 space-y-6">
        <div className="bg-white border border-slate-200 rounded-[40px] p-6 shadow-sm sticky top-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <ClipboardList size={20} className="text-brand-primary" />
              Ward Nursing Logs
            </h3>
            <span className="text-[10px] font-bold bg-brand-active text-brand-primary px-2 py-1 rounded-full">{MOCK_TASKS.length}</span>
          </div>

          <div className="space-y-4">
            {MOCK_TASKS.map(task => (
              <div key={task.id} className="group p-4 bg-slate-50 border border-transparent hover:border-brand-active hover:bg-white rounded-2xl transition-all">
                <div className="flex items-start justify-between mb-2">
                  <div className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider
                    ${task.priority === 'High' ? 'bg-red-50 text-red-600' : 'bg-brand-active text-brand-primary'}
                  `}>
                    {task.priority} Priority
                  </div>
                  <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                    <Clock size={12} /> {task.time}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-800">{task.task}</h4>
                <div className="mt-2 flex items-center justify-between">
                   <p className="text-xs text-slate-500 font-medium">Bed {task.bedId}</p>
                   <button className="text-[10px] font-bold text-brand-primary hover:underline">Complete</button>
                </div>
              </div>
            ))}
          </div>

          <button className="w-full mt-6 bg-slate-900 text-white py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">
            <Activity size={18} /> Daily Nursing Summary
          </button>
        </div>

        <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-6">
          <div className="flex items-center gap-2 text-emerald-800 mb-2 font-bold text-sm">
            <Info size={18} /> Handover Ready
          </div>
          <p className="text-xs text-emerald-600 leading-relaxed">
            Evening shift handover notes have been digitized and sent to the Charge Nurse dashboard.
          </p>
        </div>
      </div>

      {/* Admission Modal */}
      {showAdmitModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowAdmitModal(null)} />
          <div className="relative bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-brand-active/30">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-active text-brand-primary rounded-xl">
                  <Plus size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Bed Allocation</h2>
                  <p className="text-xs text-slate-500">Admitting to Ward A - Bed {showAdmitModal.number}</p>
                </div>
              </div>
              <button onClick={() => setShowAdmitModal(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Patient</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input 
                    type="text" 
                    placeholder="Search name or MRN..." 
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-brand-active0/20 outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                {searchTerm && (
                  <div className="mt-2 p-3 bg-brand-active border border-brand-active rounded-xl flex items-center justify-between animate-in slide-in-from-top-1">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center text-white text-[10px] font-bold">AT</div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">Alexander Thompson</p>
                        <p className="text-[9px] text-slate-500">MRN-2024-8842</p>
                      </div>
                    </div>
                    <button className="text-[10px] font-bold text-brand-primary">Select</button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Admitting Reason</label>
                  <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none">
                    <option>Post-Operative Recovery</option>
                    <option>Acute Management</option>
                    <option>Observation</option>
                    <option>End of Life Care</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Treating Consultant</label>
                  <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none">
                    <option>Dr. Gregory House</option>
                    <option>Dr. Lisa Cuddy</option>
                    <option>Dr. Wilson</option>
                  </select>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-3">
                <AlertCircle className="text-amber-600 flex-shrink-0" size={18} />
                <p className="text-[10px] text-amber-700 leading-relaxed font-medium">
                  Note: Admission will trigger an automatic Bed Fee charge on the patient's billing account starting from today's cycle.
                </p>
              </div>
            </div>

            <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button 
                onClick={() => setShowAdmitModal(null)}
                className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-800"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleAdmit(showAdmitModal)}
                className="bg-brand-primary text-white px-8 py-2.5 rounded-xl font-bold hover:bg-brand-primary shadow-md shadow-brand-active transition-all flex items-center gap-2"
              >
                <CheckCircle2 size={18} /> Confirm Admission
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WardModule;
