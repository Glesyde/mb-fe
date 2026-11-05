
import React, { useState } from 'react';
import { 
  Activity, 
  Plus, 
  Clock, 
  User, 
  CheckSquare, 
  Timer, 
  MapPin, 
  ChevronRight, 
  AlertCircle,
  Calendar,
  Settings,
  X,
  CheckCircle2,
  ChevronLeft
} from 'lucide-react';

interface Surgery {
  id: string;
  patientName: string;
  procedure: string;
  surgeon: string;
  anaesthetist: string;
  startTime: string; 
  duration: number; 
  or: string; 
  status: 'Pre-Op' | 'In-Theatre' | 'Recovery' | 'Ward Transfer';
}

const MOCK_SURGERIES: Surgery[] = [
  { id: 'S1', patientName: 'Alexander J. Thompson', procedure: 'Appendectomy', surgeon: 'Dr. Gregory House', anaesthetist: 'Dr. Wilson', startTime: '08:30', duration: 90, or: 'OR 1', status: 'In-Theatre' },
  { id: 'S2', patientName: 'Sarah Miller', procedure: 'Knee Arthroscopy', surgeon: 'Dr. Cuddy', anaesthetist: 'Dr. Chase', startTime: '10:00', duration: 120, or: 'OR 2', status: 'Pre-Op' },
  { id: 'S3', patientName: 'James Wilson', procedure: 'Cataract Surgery', surgeon: 'Dr. Foreman', anaesthetist: 'Dr. Cameron', startTime: '13:30', duration: 60, or: 'OR 1', status: 'Pre-Op' },
];

const TIME_SLOTS = Array.from({ length: 12 }, (_, i) => `${(i + 8).toString().padStart(2, '0')}:00`);

const SurgerySchedule: React.FC = () => {
  const [surgeries, setSurgeries] = useState<Surgery[]>(MOCK_SURGERIES);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showChecklist, setShowChecklist] = useState<Surgery | null>(null);
  const [activeORView, setActiveORView] = useState<'all' | 'OR 1' | 'OR 2'>('all');

  const getStatusColor = (status: Surgery['status']) => {
    switch (status) {
      case 'Pre-Op': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'In-Theatre': return 'bg-rose-50 text-rose-600 border-rose-100 animate-pulse';
      case 'Recovery': return 'bg-purple-50 text-purple-600 border-purple-100';
      case 'Ward Transfer': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      default: return 'bg-slate-50 text-slate-500';
    }
  };

  const getSlotPosition = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const startHour = 8;
    return (hours - startHour) * 100 + (minutes / 60) * 100;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white border border-slate-200 rounded-[40px] shadow-sm overflow-hidden">
        <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <Calendar size={18} className="text-rose-600" />
              Main Theatre Board
            </h2>
            <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl">
              <button className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400"><ChevronLeft size={16}/></button>
              <span className="text-xs font-bold px-2">Today, 22 May 2025</span>
              <button className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400"><ChevronRight size={16}/></button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowBookingModal(true)}
              className="bg-rose-600 text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-rose-700 transition-all shadow-md active:scale-95"
            >
              <Plus size={16} className="inline mr-1" /> New Surgery
            </button>
          </div>
        </div>

        <div className="relative overflow-x-auto">
          <div className="flex min-w-[1200px] border-b border-slate-100 bg-slate-50/30">
            <div className="w-24 flex-shrink-0 p-4 border-r border-slate-100 text-[10px] font-bold text-slate-400 uppercase flex items-center justify-center">OR</div>
            {TIME_SLOTS.map(time => (
              <div key={time} className="flex-1 min-w-[100px] p-4 text-[10px] font-bold text-slate-400 text-center border-r border-slate-50 last:border-r-0">
                {time}
              </div>
            ))}
          </div>

          <div className="min-w-[1200px]">
            {['OR 1', 'OR 2', 'OR 3', 'OR 4'].filter(or => activeORView === 'all' || activeORView === or).map(or => (
              <div key={or} className="flex h-32 border-b border-slate-100 relative group">
                <div className="w-24 flex-shrink-0 bg-slate-50/50 border-r border-slate-100 flex items-center justify-center font-black text-slate-400 text-sm">
                  {or}
                </div>
                {TIME_SLOTS.map(time => (
                  <div key={time} className="flex-1 border-r border-slate-50 last:border-r-0" />
                ))}

                {surgeries.filter(s => s.or === or).map(s => {
                  const leftPos = getSlotPosition(s.startTime);
                  const widthPos = (s.duration / 60) * 100;
                  return (
                    <div 
                      key={s.id}
                      onClick={() => setShowChecklist(s)}
                      className={`absolute top-4 h-24 rounded-[24px] border shadow-sm p-4 cursor-pointer transition-all hover:scale-[1.02] active:scale-95 group/block
                        ${s.status === 'In-Theatre' ? 'bg-rose-600 text-white border-rose-700 shadow-rose-200' : 'bg-white text-slate-800 border-slate-200'}
                      `}
                      style={{ left: `calc(96px + ${leftPos}px)`, width: `${widthPos}px` }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="truncate">
                          <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest">{s.startTime} - {s.duration}m</p>
                          <h4 className="font-bold truncate">{s.procedure}</h4>
                          <p className="text-[10px] font-medium opacity-80 mt-1">{s.patientName}</p>
                        </div>
                        {s.status === 'In-Theatre' ? (
                           <div className="p-1.5 bg-white/20 rounded-lg">
                            <Timer size={14} />
                          </div>
                        ) : (
                          <div className="p-1.5 bg-slate-50 text-slate-400 rounded-lg group-hover/block:bg-rose-50 group-hover/block:text-rose-600">
                            <Settings size={14} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-rose-50 border border-rose-100 p-6 rounded-[32px] flex items-start gap-4">
        <AlertCircle className="text-rose-600 flex-shrink-0" size={24} />
        <div>
          <h4 className="text-sm font-bold text-rose-800">Theatre Safety Protocol</h4>
          <p className="text-xs text-rose-600 leading-relaxed mt-1 uppercase font-black tracking-widest">
            ALL PROCEDURES MUST BE AUTHORIZED WITH COMPLETED WHO SAFETY CHECKLISTS BEFORE INCISION.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SurgerySchedule;
