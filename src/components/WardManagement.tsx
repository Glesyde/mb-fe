
import React, { useState } from 'react';
import { 
  Bed, 
  Map, 
  ClipboardList, 
  LogOut, 
  Activity, 
  Search, 
  ChevronRight, 
  User, 
  MoreVertical,
  Plus,
  AlertTriangle,
  // Fix: removed non-existent 'CleaningBucket' member
} from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

const WardManagement: React.FC = () => {
  const { notify } = useNotification();
  const [activeTab, setActiveTab] = useState<'view' | 'nursing' | 'admissions'>('view');
  const [showConfirmDischarge, setShowConfirmDischarge] = useState<string | null>(null);

  const handleConfirmDischarge = () => {
    if (!showConfirmDischarge) return;
    notify(`Patient in Bed ${showConfirmDischarge} has been initiated for clinical discharge.`, 'success');
    setShowConfirmDischarge(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-brand-active text-brand-primary rounded-xl">
              <Bed size={24} />
            </div>
            Facility Ward Governance
          </h1>
          <p className="text-slate-500 font-medium">Coordinate facility occupancy and manage inpatient nursing lifecycles.</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[44px] p-20 text-center shadow-sm">
         <div className="bg-brand-active w-24 h-24 rounded-[32px] flex items-center justify-center mx-auto mb-8 text-brand-primary shadow-inner">
            <Map size={48} />
         </div>
         <h3 className="text-2xl font-black text-slate-800 tracking-tight">Interactive Ward Dashboard</h3>
         <p className="text-slate-500 max-w-sm mx-auto mt-2 font-medium leading-relaxed">
           Access real-time floor maps and occupancy metrics for the General and Surgical units.
         </p>
         <button className="mt-8 bg-brand-primary text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-brand-active hover:bg-brand-primary transition-all active:scale-95 flex items-center gap-2 mx-auto">
            Launch Ward Viewer <ChevronRight size={18} />
         </button>
      </div>

      {/* Confirmation Modal for Discharges */}
      {showConfirmDischarge && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowConfirmDischarge(null)} />
          <div className="relative bg-white w-full max-w-sm rounded-[48px] shadow-2xl overflow-hidden p-10 text-center animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-[32px] flex items-center justify-center mx-auto mb-6 border border-rose-100 shadow-inner">
              <LogOut size={40} />
            </div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">Authorize Discharge?</h3>
            <p className="text-sm text-slate-500 font-medium mt-2 leading-relaxed px-4">
              Patient in bed {showConfirmDischarge} will be removed from the active ward list and bed marked as 'Cleaning Required'.
            </p>
            <div className="mt-10 flex gap-3">
              <button onClick={() => setShowConfirmDischarge(null)} className="flex-1 px-6 py-4 rounded-[24px] font-black uppercase text-[10px] tracking-widest text-slate-400 hover:text-slate-800 transition-all">Cancel</button>
              {/* Fix: changed handleConfirmDischarge attribute to onClick */}
              <button onClick={handleConfirmDischarge} className="flex-1 bg-brand-primary text-white px-6 py-4 rounded-[24px] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-brand-active hover:bg-brand-primary active:scale-95 transition-all">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WardManagement;
