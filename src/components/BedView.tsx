
import React, { useState } from 'react';
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
  Filter
} from 'lucide-react';

const BedIcon: React.FC<{ status: 'In Use' | 'Reserved' | 'Empty' }> = ({ status }) => {
  const color = status === 'In Use' ? '#f43f5e' : status === 'Reserved' ? '#f59e0b' : '#0ea5e9';
  return (
    <svg width="120" height="60" viewBox="0 0 120 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-in zoom-in duration-500">
      <path d="M10 45V15C10 12.2386 12.2386 10 15 10H105C107.761 10 110 12.2386 110 15V45" stroke={color} strokeWidth="6" strokeLinecap="round"/>
      <path d="M10 40H110" stroke={color} strokeWidth="6" strokeLinecap="round"/>
      <rect x="25" y="20" width="30" height="15" rx="4" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2"/>
      <circle cx="90" cy="25" r="8" fill={color}/>
      <path d="M15 45V55" stroke={color} strokeWidth="6" strokeLinecap="round"/>
      <path d="M105 45V55" stroke={color} strokeWidth="6" strokeLinecap="round"/>
    </svg>
  );
};

interface PatientInfo {
  name: string;
  mrn: string;
  admissionDate: string;
  consultant: string;
  age: number;
  sex: 'Male' | 'Female';
}

interface HospitalBed {
  id: string;
  number: string;
  status: 'In Use' | 'Reserved' | 'Empty';
  patient?: PatientInfo;
}

interface RoomData {
  name: string;
  beds: HospitalBed[];
}

const WARD_DATA: Record<string, RoomData[]> = {
  "General Ward A": [
    {
      name: "Oncology room 1",
      beds: [
        {
          id: "B1",
          number: "BED 1",
          status: 'In Use',
          patient: {
            name: "Michael Scott",
            mrn: "MRN-2019-001",
            admissionDate: "09/12/2019",
            age: 67,
            sex: 'Male',
            consultant: "Dr. House"
          }
        },
        {
          id: "B2",
          number: "BED 2",
          status: 'Reserved',
          patient: {
            name: "Steve Smith",
            mrn: "MRN-2020-002",
            admissionDate: "01/20/2020",
            age: 43,
            sex: 'Male',
            consultant: "Dr. House"
          }
        },
        {
          id: "B3",
          number: "BED 3",
          status: 'In Use',
          patient: {
            name: "James Smith",
            mrn: "MRN-2019-003",
            admissionDate: "12/27/2019",
            age: 73,
            sex: 'Male',
            consultant: "Dr. House"
          }
        },
        {
          id: "B4",
          number: "BED 4",
          status: 'In Use',
          patient: {
            name: "Cindy Love",
            mrn: "MRN-2019-004",
            admissionDate: "12/12/2019",
            age: 36,
            sex: 'Female',
            consultant: "Dr. House"
          }
        },
        {
          id: "B5",
          number: "BED 5",
          status: 'In Use',
          patient: {
            name: "James Johnson",
            mrn: "MRN-2019-005",
            admissionDate: "11/12/2019",
            age: 37,
            sex: 'Male',
            consultant: "Dr. House"
          }
        },
        {
          id: "B6",
          number: "BED 6",
          status: 'In Use',
          patient: {
            name: "Maria Garcia",
            mrn: "MRN-2020-006",
            admissionDate: "1/12/2020",
            age: 64,
            sex: 'Male',
            consultant: "Dr. House"
          }
        },
        {
          id: "B7",
          number: "BED 7",
          status: 'Empty',
          patient: undefined
        },
        {
          id: "B8",
          number: "BED 8",
          status: 'In Use',
          patient: {
            name: "Robert Scott",
            mrn: "MRN-2020-007",
            admissionDate: "01/01/2020",
            age: 84,
            sex: 'Male',
            consultant: "Dr. House"
          }
        }
      ]
    },
    {
      name: "Emergency room 2",
      beds: Array.from({ length: 4 }, (_, i) => ({
        id: `E-${i + 1}`,
        number: `BED ${i + 1}`,
        status: 'Empty'
      }))
    }
  ],
  "Male Surgical Ward": [
    {
      name: "Surgical Suite 1",
      beds: Array.from({ length: 6 }, (_, i) => ({
        id: `S-${i + 1}`,
        number: `BED ${i + 1}`,
        status: i < 2 ? 'In Use' : 'Empty'
      }))
    }
  ],
};

const BedView: React.FC = () => {
  const [viewMode, setViewMode] = useState<'ward' | 'flat'>('flat');
  const [activeWard, setActiveWard] = useState("General Ward A");
  const [activeRoomIndex, setActiveRoomIndex] = useState(0);
  const [bedsData, setBedsData] = useState(WARD_DATA);
  const [showAdmitModal, setShowAdmitModal] = useState<HospitalBed | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const currentRooms = bedsData[activeWard];
  const currentRoom = currentRooms[activeRoomIndex];
  const allBedsInWard = currentRooms.flatMap(r => r.beds);

  const handleDischarge = (wardName: string, roomIndex: number, bedId: string) => {
    setBedsData(prev => ({
      ...prev,
      [wardName]: prev[wardName].map((room, rIdx) => 
        rIdx === roomIndex ? {
          ...room,
          beds: room.beds.map(b => b.id === bedId ? { ...b, status: 'Empty', patient: undefined } : b)
        } : room
      )
    }));
  };

  const handleAdmit = (bedId: string) => {
    setBedsData(prev => ({
      ...prev,
      [activeWard]: prev[activeWard].map((room, rIdx) => 
        rIdx === activeRoomIndex ? {
          ...room,
          beds: room.beds.map(b => b.id === bedId ? { 
            ...b, 
            status: 'In Use', 
            patient: { 
              name: 'Alexander Thompson', 
              mrn: 'MRN-2025-NEW', 
              admissionDate: '2025-05-25', 
              consultant: 'Dr. House',
              age: 45,
              sex: 'Male'
            } 
          } : b)
        } : room
      )
    }));
    setShowAdmitModal(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
           {viewMode === 'flat' ? (
             <div className="flex items-center gap-3 bg-white px-6 py-3 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-xs font-bold text-slate-400">Room:</span>
                <select 
                  value={activeRoomIndex}
                  onChange={(e) => setActiveRoomIndex(Number(e.target.value))}
                  className="bg-transparent border-none outline-none font-black text-slate-800 cursor-pointer"
                >
                  {currentRooms.map((r, i) => <option key={i} value={i}>{r.name}</option>)}
                </select>
             </div>
           ) : (
             <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                {Object.keys(WARD_DATA).map(ward => (
                  <button 
                    key={ward}
                    onClick={() => { setActiveWard(ward); setActiveRoomIndex(0); }}
                    className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap border-2
                      ${activeWard === ward ? 'bg-brand-primary text-white border-brand-primary shadow-lg shadow-brand-active' : 'bg-white text-slate-500 hover:bg-slate-50 border-slate-100'}
                    `}
                  >
                    {ward}
                  </button>
                ))}
             </div>
           )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl items-center">
             <button 
              onClick={() => setViewMode('flat')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === 'flat' ? 'bg-white text-brand-primary shadow-sm' : 'text-slate-400'}`}
             >
               Room Focus
             </button>
             <button 
              onClick={() => setViewMode('ward')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === 'ward' ? 'bg-white text-brand-primary shadow-sm' : 'text-slate-400'}`}
             >
               Ward Overview
             </button>
          </div>
          
          <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-sm shadow-slate-100/50">
             <Clock size={16} className="text-slate-400" />
             <select className="bg-transparent border-none outline-none font-black text-slate-800 text-sm cursor-pointer min-w-[80px]">
                <option>Month</option>
                <option>Day</option>
                <option>Week</option>
             </select>
          </div>

          <button className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-brand-primary shadow-sm shadow-slate-100/50">
             <Filter size={20} />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Beds', val: (viewMode === 'flat' ? currentRoom.beds : allBedsInWard).length, color: 'slate', icon: Bed },
          { label: 'In Use', val: (viewMode === 'flat' ? currentRoom.beds : allBedsInWard).filter(b => b.status === 'In Use').length, color: 'rose', icon: User },
          { label: 'Reserved', val: (viewMode === 'flat' ? currentRoom.beds : allBedsInWard).filter(b => b.status === 'Reserved').length, color: 'amber', icon: Clock },
          { label: 'Empty', val: (viewMode === 'flat' ? currentRoom.beds : allBedsInWard).filter(b => b.status === 'Empty').length, color: 'sky', icon: CheckCircle2 },
        ].map((s, i) => (
          <div key={i} className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
              <p className={`text-2xl font-black text-${s.color}-600 tracking-tight`}>{s.val}</p>
            </div>
            <div className={`p-3 bg-${s.color}-50 text-${s.color}-500 rounded-2xl border border-${s.color}-100`}>
              <s.icon size={24} />
            </div>
          </div>
        ))}
      </div>

      {/* Bed Grid Rendering */}
      {viewMode === 'flat' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {currentRoom.beds.map((bed) => (
            <div key={bed.id} className="bg-white rounded-[40px] border border-slate-100 p-8 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all group">
               <div className="flex items-center justify-between mb-6">
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">{bed.number}</span>
                  <span className={`text-[11px] font-black uppercase tracking-widest ${
                    bed.status === 'In Use' ? 'text-rose-500' : bed.status === 'Reserved' ? 'text-amber-500' : 'text-sky-500'
                  }`}>
                    {bed.status}
                  </span>
               </div>

               <div className="flex justify-center mb-8">
                  <BedIcon status={bed.status} />
               </div>

               <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400">Patient:</span>
                    <span className="text-sm font-black text-slate-700 truncate">{bed.patient?.name || '---'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400">Admission Date:</span>
                    <span className="text-sm font-black text-slate-700">{bed.patient?.admissionDate || '---'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400">Age:</span>
                    <span className="text-sm font-black text-slate-700">{bed.patient?.age || '---'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400">Sex:</span>
                    <span className="text-sm font-black text-slate-700">{bed.patient?.sex || '---'}</span>
                  </div>
               </div>

               {bed.status === 'Empty' && (
                 <button 
                  onClick={() => setShowAdmitModal(bed)}
                  className="w-full mt-6 bg-slate-50 text-slate-400 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-brand-primary hover:text-white transition-all shadow-sm"
                 >
                   Admit Patient
                 </button>
               )}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {allBedsInWard.map(bed => (
             <div 
             key={bed.id}
             className={`group relative rounded-[40px] border-2 transition-all p-6 h-64 flex flex-col justify-between
               ${bed.status === 'In Use' 
                 ? 'bg-white border-rose-100 hover:border-rose-400' 
                 : bed.status === 'Empty'
                 ? 'bg-white border-sky-100 border-dashed hover:border-sky-400 hover:bg-sky-50/20'
                 : 'bg-slate-50 border-amber-200'}
             `}
           >
             <div className="flex items-start justify-between">
               <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl
                 ${bed.status === 'In Use' ? 'bg-rose-600 text-white shadow-lg shadow-rose-100' : 'bg-slate-100 text-slate-400'}
               `}>
                 {bed.number.replace('BED ', '')}
               </div>
               <div className="flex items-center gap-1.5">
                 <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest border
                   ${bed.status === 'In Use' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-sky-50 text-sky-600 border-sky-100'}
                 `}>
                   {bed.status}
                 </span>
                 <button className="p-1 text-slate-300 hover:text-slate-500 transition-colors">
                   <MoreVertical size={18} />
                 </button>
               </div>
             </div>
 
             {bed.status === 'In Use' && bed.patient ? (
               <div className="mt-4 animate-in fade-in duration-300">
                 <h4 className="font-black text-slate-800 truncate text-lg leading-tight">{bed.patient.name}</h4>
                 <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">{bed.patient.mrn}</p>
                 <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                   <Stethoscope size={14} className="text-brand-primary" />
                   <span>{bed.patient.consultant}</span>
                 </div>
               </div>
             ) : bed.status === 'Empty' ? (
               <div className="flex-1 flex flex-col items-center justify-center">
                  <button 
                   onClick={() => setShowAdmitModal(bed)}
                   className="flex flex-col items-center gap-3 text-slate-400 hover:text-brand-primary transition-all group"
                 >
                   <div className="p-4 rounded-full bg-slate-50 group-hover:bg-brand-primary group-hover:text-white transition-all shadow-sm">
                     <Plus size={24} />
                   </div>
                   <span className="text-[10px] font-black uppercase tracking-[0.2em]">Admit Patient</span>
                 </button>
               </div>
             ) : (
               <div className="flex-1 flex flex-col items-center justify-center opacity-40">
                 <Clock className="text-amber-400 mb-3" size={32} />
                 <span className="text-[10px] font-black uppercase tracking-widest">Reserved</span>
               </div>
             )}
 
             {bed.status === 'In Use' && (
               <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                 <button 
                   onClick={() => handleDischarge(activeWard, activeRoomIndex, bed.id)}
                   className="text-[10px] font-black text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 uppercase tracking-widest"
                 >
                   <LogOut size={14} /> Discharge
                 </button>
               </div>
             )}
           </div>
          ))}
        </div>
      )}

      {/* Admission Modal */}
      {showAdmitModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowAdmitModal(null)} />
          <div className="relative bg-white w-full max-w-lg rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-brand-active/30">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-brand-primary text-white rounded-2xl shadow-lg shadow-brand-active">
                  <Plus size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">Facility Allocation</h2>
                  <p className="text-xs text-brand-primary font-bold uppercase tracking-widest">Admitting to Bed {showAdmitModal.number}</p>
                </div>
              </div>
              <button onClick={() => setShowAdmitModal(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={24} className="text-slate-400" />
              </button>
            </div>

            <div className="p-10 space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Patient Index</label>
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors" size={20} />
                  <input 
                    type="text" 
                    placeholder="Search Name or MRN..." 
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-3xl text-sm font-bold focus:bg-white focus:border-brand-active0 outline-none transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                {searchTerm.length > 2 && (
                  <div className="mt-3 p-4 bg-brand-active border border-brand-active rounded-2xl flex items-center justify-between animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-brand-primary flex items-center justify-center text-white font-black">AT</div>
                      <div>
                        <p className="text-sm font-black text-slate-800">Alexander Thompson</p>
                        <p className="text-[10px] font-bold text-brand-active0 uppercase tracking-wider">MRN-2024-8842</p>
                      </div>
                    </div>
                    <button className="text-[10px] font-black text-brand-primary uppercase hover:underline">Select</button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Admission Reason</label>
                  <select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none appearance-none">
                    <option>Post-Operative Care</option>
                    <option>Emergency Observation</option>
                    <option>Intensive Management</option>
                    <option>Diagnostic Workup</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Lead Consultant</label>
                  <select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none appearance-none">
                    <option>Dr. Gregory House</option>
                    <option>Dr. Lisa Cuddy</option>
                    <option>Dr. Wilson</option>
                  </select>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-100 p-6 rounded-[32px] flex items-start gap-4">
                <AlertCircle className="text-amber-600 flex-shrink-0" size={24} />
                <p className="text-[10px] text-amber-700 leading-relaxed font-black uppercase tracking-tight">
                  Authorization required: Enrollment will auto-generate Bed Fees on the patient ledger. Ensure Financial clearance is obtained.
                </p>
              </div>
            </div>

            <div className="px-10 py-8 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button 
                onClick={() => setShowAdmitModal(null)}
                className="px-6 py-2.5 text-xs font-black text-slate-400 uppercase tracking-widest"
              >
                Discard
              </button>
              <button 
                onClick={() => handleAdmit(showAdmitModal.id)}
                className="bg-brand-primary text-white px-10 py-4 rounded-[20px] font-black uppercase text-xs tracking-widest shadow-xl shadow-brand-active hover:bg-brand-primary transition-all flex items-center gap-2"
              >
                <CheckCircle2 size={18} /> Authorize Admission
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BedView;
