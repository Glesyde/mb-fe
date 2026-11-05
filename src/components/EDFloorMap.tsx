
import React, { useState } from 'react';
import { 
  Layout, 
  MapPin, 
  Plus, 
  User, 
  Clock, 
  AlertCircle, 
  Activity, 
  MoreVertical,
  ArrowRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

interface EDBay {
  id: string;
  type: 'Resuscitation' | 'General Bay' | 'Hallway Area' | 'FastTrack';
  status: 'Available' | 'Occupied' | 'Cleaning';
  patient?: {
    name: string;
    mrn: string;
    triage: 'Red' | 'Yellow' | 'Green';
    timeIn: string;
  };
}

const MOCK_FLOOR: EDBay[] = [
  { id: 'Resus 1', type: 'Resuscitation', status: 'Occupied', patient: { name: 'Unknown Male', mrn: 'TEMP-881', triage: 'Red', timeIn: '12m' } },
  { id: 'Resus 2', type: 'Resuscitation', status: 'Available' },
  { id: 'Bay 1', type: 'General Bay', status: 'Occupied', patient: { name: 'Jane Smith', mrn: 'MRN-2024-9912', triage: 'Red', timeIn: '45m' } },
  { id: 'Bay 2', type: 'General Bay', status: 'Cleaning' },
  { id: 'Bay 3', type: 'General Bay', status: 'Occupied', patient: { name: 'Robert Jenkins', mrn: 'MRN-2024-4421', triage: 'Yellow', timeIn: '1h 10m' } },
  { id: 'Bay 4', type: 'General Bay', status: 'Available' },
  { id: 'Hallway A', type: 'Hallway Area', status: 'Occupied', patient: { name: 'Samuel Okafor', mrn: 'MRN-2024-1102', triage: 'Green', timeIn: '2h 15m' } },
  { id: 'Room 1', type: 'FastTrack', status: 'Available' },
];

const EDFloorMap: React.FC = () => {
  const [bays, setBays] = useState(MOCK_FLOOR);

  const handleTransferRequest = (bayId: string) => {
    if (confirm("Initiate Ward Transfer Request? Admission team will be notified.")) {
      setBays(prev => prev.map(b => b.id === bayId ? { ...b, status: 'Cleaning', patient: undefined } : b));
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Layout size={20} className="text-red-600" />
            Live ED Floor Map
          </h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Real-time bay occupancy & turnover tracking</p>
        </div>
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-6 px-6 py-2.5 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 shadow-sm shadow-red-200" />
                <span className="text-[10px] font-black text-slate-400 uppercase">Resus Busy</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200" />
                <span className="text-[10px] font-black text-slate-400 uppercase">FastTrack Clear</span>
              </div>
           </div>
        </div>
      </div>

      {/* Grid of Bays */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {bays.map((bay) => (
          <div 
            key={bay.id}
            className={`group relative rounded-[44px] border-2 transition-all p-7 flex flex-col justify-between min-h-[280px] shadow-sm
              ${bay.status === 'Occupied' 
                ? 'bg-white border-red-100 hover:border-red-500 hover:shadow-red-100' 
                : bay.status === 'Available'
                ? 'bg-white border-slate-100 border-dashed hover:border-brand-active0 hover:bg-brand-active/20'
                : 'bg-slate-50 border-slate-200'}
            `}
          >
            <div className="flex items-start justify-between">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl transition-all
                ${bay.status === 'Occupied' ? 'bg-red-600 text-white shadow-xl shadow-red-200' : 'bg-slate-100 text-slate-400'}
              `}>
                {bay.id.charAt(0)}
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest border
                  ${bay.status === 'Occupied' ? 'bg-red-50 text-red-600 border-red-100' : bay.status === 'Available' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-200'}
                `}>
                  {bay.status}
                </span>
                <button className="p-1 text-slate-300 hover:text-slate-500 transition-colors">
                  <MoreVertical size={18} />
                </button>
              </div>
            </div>

            <div className="mt-4">
              <h4 className="font-black text-slate-800 text-lg leading-tight">{bay.id}</h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{bay.type}</p>
              
              {bay.status === 'Occupied' && bay.patient ? (
                <div className="mt-5 space-y-4 animate-in fade-in duration-300">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group-hover:bg-white transition-all">
                    <div className="flex items-center gap-3 mb-1">
                      <div className={`w-2 h-2 rounded-full ${bay.patient.triage === 'Red' ? 'bg-red-500' : bay.patient.triage === 'Yellow' ? 'bg-amber-500' : 'bg-emerald-500'} shadow-sm`} />
                      <h5 className="text-sm font-black text-slate-900 truncate">{bay.patient.name}</h5>
                    </div>
                    <p className="text-[10px] font-mono font-bold text-brand-primary uppercase tracking-tighter ml-5">{bay.patient.mrn}</p>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase">
                      <Clock size={14} className="text-red-500" />
                      <span>In: {bay.patient.timeIn}</span>
                    </div>
                    <button 
                      onClick={() => handleTransferRequest(bay.id)}
                      className="flex items-center gap-1.5 text-[10px] font-black text-brand-primary hover:bg-brand-active px-3 py-1.5 rounded-xl transition-all uppercase tracking-widest"
                    >
                      Admit to Ward <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              ) : bay.status === 'Available' ? (
                <div className="flex-1 flex flex-col items-center justify-center py-10">
                   <button className="flex flex-col items-center gap-3 text-slate-300 hover:text-brand-primary transition-all group/btn">
                    <div className="p-4 rounded-[24px] bg-slate-50 border-2 border-slate-100 group-hover/btn:bg-brand-primary group-hover/btn:text-white transition-all shadow-sm">
                      <Plus size={28} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Assign Case</span>
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-10">
                   <Activity className="text-amber-500 mb-2 animate-pulse" size={36} />
                   <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">Turnover Cleaning</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Info Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
        <div className="bg-slate-900 rounded-[44px] p-10 text-white relative overflow-hidden group shadow-2xl">
           <div className="relative z-10">
              <h4 className="text-xl font-black tracking-tight mb-8">Facility Velocity Analytics</h4>
              <div className="grid grid-cols-2 gap-8">
                 <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Average LOS (ED)</p>
                    <p className="text-3xl font-black">2h 45m</p>
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Turnover Target</p>
                    <p className="text-3xl font-black text-emerald-400">92% Met</p>
                 </div>
              </div>
           </div>
           <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-red-600/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
        </div>

        <div className="bg-brand-active border border-brand-active p-10 rounded-[44px] flex items-center justify-between shadow-sm">
           <div className="flex items-center gap-6">
              <div className="p-4 bg-white text-brand-primary rounded-[28px] shadow-sm border border-brand-active">
                <ShieldCheck size={32} />
              </div>
              <div>
                <h4 className="text-xl font-black text-brand-primary tracking-tight">Active Bed Sync</h4>
                <p className="text-sm text-brand-primary/80 font-medium leading-relaxed max-w-sm">
                  Occupancy data is shared with the Admissions Desk. 'Admit to Ward' triggers a bed search in Inpatient management.
                </p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default EDFloorMap;
