
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  FilePlus, 
  Search, 
  Pill, 
  FlaskConical, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  User,
  Activity,
  AlertCircle,
  FileText,
  Stethoscope,
  ChevronRight,
  History as HistoryIcon,
  MoreVertical
} from 'lucide-react';

interface OrderItem {
  id: string;
  type: 'Pharmacy' | 'Lab';
  name: string;
  instructions: string;
}

const OrderEntry: React.FC = () => {
  const location = useLocation();
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeForm, setActiveForm] = useState<'rx' | 'lab'>('rx');
  const [draftOrders, setDraftOrders] = useState<OrderItem[]>([]);
  const [catalogQuery, setCatalogQuery] = useState('');

  const MOCK_PATIENTS = [
    { id: '1', name: 'Alexander J. Thompson', mrn: 'MRN-2024-8842', ward: 'GOPD' },
    { id: '2', name: 'Sarah Miller', mrn: 'MRN-2024-9912', ward: 'ED' },
    { id: '3', name: 'James Wilson', mrn: 'MRN-2024-4421', ward: 'Ward A' },
  ];

  // Auto-select patient from navigation state if coming from worklist or profile
  useEffect(() => {
    if (location.state?.patient) {
      // Map worklist patient to order entry patient format
      const p = location.state.patient;
      setSelectedPatient({
        id: p.id,
        name: p.patientName,
        mrn: p.mrn,
        ward: p.location
      });
    }
  }, [location.state]);

  const addToOrders = (name: string) => {
    const newItem: OrderItem = {
      id: Math.random().toString(36).substr(2, 9),
      type: activeForm === 'rx' ? 'Pharmacy' : 'Lab',
      name,
      instructions: activeForm === 'rx' ? '1 tab twice daily' : 'Routine'
    };
    setDraftOrders([...draftOrders, newItem]);
    setCatalogQuery('');
  };

  const removeOrder = (id: string) => {
    setDraftOrders(draftOrders.filter(o => o.id !== id));
  };

  return (
    <div className="h-[calc(100vh-140px)] flex gap-6 animate-in fade-in duration-500">
      {/* Left Column: Patient Search & Context */}
      <div className="w-80 flex-shrink-0 flex flex-col gap-6">
        <div className="bg-white border border-slate-200 rounded-[32px] p-6 shadow-sm flex flex-col h-full overflow-hidden">
          <div className="mb-6">
            <h3 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
              <User size={20} className="text-brand-primary" />
              Identify Patient
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">CPOE Target Selection</p>
          </div>

          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by Name/MRN..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-brand-active0 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar space-y-2">
            {MOCK_PATIENTS.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
              <div 
                key={p.id}
                onClick={() => setSelectedPatient(p)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer group
                  ${selectedPatient?.id === p.id 
                    ? 'bg-brand-primary border-brand-primary text-white shadow-lg shadow-brand-active' 
                    : 'bg-white border-slate-100 hover:border-brand-active hover:bg-brand-active/30 text-slate-700'}
                `}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-black truncate">{p.name}</p>
                  <ChevronRight size={14} className={selectedPatient?.id === p.id ? 'text-white' : 'text-slate-300'} />
                </div>
                <div className="flex items-center justify-between mt-1">
                  <p className={`text-[10px] font-mono font-bold ${selectedPatient?.id === p.id ? 'text-brand-active' : 'text-brand-primary'}`}>{p.mrn}</p>
                  <span className={`text-[9px] font-black uppercase tracking-wider ${selectedPatient?.id === p.id ? 'text-brand-active' : 'text-slate-400'}`}>{p.ward}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
             <button className="text-[10px] font-black text-brand-primary uppercase hover:underline">Provision Walk-in ID</button>
          </div>
        </div>
      </div>

      {/* Right Column: Order Workspace */}
      <div className="flex-1 flex flex-col gap-6">
        {selectedPatient ? (
          <>
            {/* Header Banner */}
            <div className="bg-slate-900 text-white p-8 rounded-[40px] shadow-xl flex items-center justify-between">
               <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-3xl bg-brand-primary flex items-center justify-center font-black text-2xl text-white shadow-lg shadow-brand-primary/50">
                    {selectedPatient.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black tracking-tight">{selectedPatient.name}</h2>
                    <p className="text-brand-primary font-bold text-sm tracking-wide uppercase">{selectedPatient.mrn} • ACTIVE CPOE SESSION</p>
                  </div>
               </div>
               <div className="flex items-center gap-3">
                  <button className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white/60 transition-all border border-white/5">
                    <HistoryIcon size={20} />
                  </button>
                  <button 
                    onClick={() => setSelectedPatient(null)}
                    className="px-6 py-3 bg-red-600 text-white rounded-2xl font-black text-sm hover:bg-red-700 transition-all active:scale-95 shadow-lg shadow-red-900/40"
                  >
                    Close Session
                  </button>
               </div>
            </div>

            <div className="flex-1 grid grid-cols-12 gap-6 overflow-hidden">
               {/* Form Selection */}
               <div className="col-span-8 flex flex-col gap-6 overflow-hidden">
                  <div className="bg-white border border-slate-200 rounded-[40px] p-8 shadow-sm flex flex-col overflow-hidden">
                    <div className="flex p-1.5 bg-slate-50 border border-slate-200 rounded-[20px] w-fit mb-8">
                      <button 
                        onClick={() => setActiveForm('rx')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-[16px] text-xs font-black uppercase tracking-wider transition-all
                          ${activeForm === 'rx' ? 'bg-white text-brand-primary shadow-sm' : 'text-slate-400'}
                        `}
                      >
                        <Pill size={16} /> Prescription
                      </button>
                      <button 
                        onClick={() => setActiveForm('lab')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-[16px] text-xs font-black uppercase tracking-wider transition-all
                          ${activeForm === 'lab' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}
                        `}
                      >
                        <FlaskConical size={16} /> Lab/Diagnostic
                      </button>
                    </div>

                    <div className="relative mb-6">
                      <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder={`Search hospital catalog for ${activeForm === 'rx' ? 'medications' : 'investigations'}...`}
                        className="w-full pl-14 pr-4 py-5 bg-slate-50 border border-slate-200 rounded-3xl text-sm font-bold focus:bg-white outline-none transition-all"
                        value={catalogQuery}
                        onChange={(e) => setCatalogQuery(e.target.value)}
                      />
                    </div>

                    <div className="flex-1 overflow-y-auto no-scrollbar space-y-3">
                      {catalogQuery.length >= 2 ? (
                        (activeForm === 'rx' ? ['Amoxicillin 500mg', 'Paracetamol 1g', 'Omeprazole 20mg', 'Metformin 500mg', 'Ciprofloxacin 500mg'] : ['Full Blood Count', 'Lipid Profile', 'Urinalysis', 'Chest X-Ray', 'Malaria Parasite'])
                          .filter(i => i.toLowerCase().includes(catalogQuery.toLowerCase()))
                          .map(item => (
                            <div 
                              key={item}
                              className="flex items-center justify-between p-5 bg-white border border-slate-100 hover:border-brand-active rounded-3xl transition-all group"
                            >
                              <div>
                                <h4 className="text-sm font-black text-slate-800">{item}</h4>
                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Hospital Standard Catalog</p>
                              </div>
                              <button 
                                onClick={() => addToOrders(item)}
                                className="p-3 bg-brand-active text-brand-primary rounded-2xl group-hover:bg-brand-primary group-hover:text-white transition-all shadow-sm"
                              >
                                <Plus size={20} />
                              </button>
                            </div>
                          ))
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center opacity-30 py-20">
                          <Activity size={48} className="text-slate-400 mb-4" />
                          <p className="text-sm font-bold text-slate-500 italic">Enter search terms to populate catalog results.</p>
                        </div>
                      )}
                    </div>
                  </div>
               </div>

               {/* Draft Review / Cart */}
               <div className="col-span-4 flex flex-col gap-6 overflow-hidden">
                  <div className="bg-white border border-slate-200 rounded-[40px] p-8 shadow-sm flex flex-col h-full overflow-hidden">
                    <div className="flex items-center justify-between mb-8">
                       <h3 className="text-lg font-black text-slate-800">Authorization Queue</h3>
                       <span className="bg-brand-active text-brand-primary px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest">{draftOrders.length}</span>
                    </div>

                    <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 mb-8">
                      {draftOrders.length > 0 ? (
                        <div className="overflow-x-auto border border-slate-100 rounded-2xl bg-white shadow-sm">
                          <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                              <tr>
                                <th className="px-4 py-3">Item Information</th>
                                <th className="px-4 py-3">Instructions</th>
                                <th className="px-4 py-3 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {draftOrders.map(order => (
                                <tr key={order.id} className="hover:bg-slate-50/50 transition-colors animate-in slide-in-from-right-2">
                                  <td className="px-4 py-3 align-middle">
                                    <div className="flex items-center gap-2">
                                      {order.type === 'Pharmacy' ? <Pill size={14} className="text-brand-primary" /> : <FlaskConical size={14} className="text-indigo-600" />}
                                      <span className="text-xs font-black text-slate-800">{order.name}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 align-middle">
                                    <input 
                                      type="text" 
                                      className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-bold text-slate-600 outline-none focus:border-brand-active transition-all"
                                      defaultValue={order.instructions}
                                      placeholder="Dosage / Special Instructions..."
                                    />
                                  </td>
                                  <td className="px-4 py-3 align-middle text-right">
                                    <button onClick={() => removeOrder(order.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                                      <Trash2 size={16} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-30 py-10">
                          <FilePlus size={32} className="text-slate-300 mb-2" />
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No Draft Orders</p>
                        </div>
                      )}
                    </div>

                    <button 
                      disabled={draftOrders.length === 0}
                      className="w-full bg-brand-primary hover:bg-brand-primary disabled:bg-slate-100 disabled:text-slate-300 disabled:shadow-none text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all shadow-xl shadow-brand-active active:scale-95"
                    >
                      <CheckCircle2 size={18} /> Authorize & Sign
                    </button>
                  </div>
               </div>
            </div>
          </>
        ) : (
          <div className="flex-1 bg-white border-2 border-dashed border-slate-200 rounded-[40px] flex flex-col items-center justify-center p-12 text-center">
            <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-[32px] flex items-center justify-center mb-6">
               <Stethoscope size={40} />
            </div>
            <h2 className="text-2xl font-black text-slate-800">No Patient Selected</h2>
            <p className="text-slate-500 max-w-sm mt-2 font-medium leading-relaxed">
              To begin entering clinical orders, please select a patient from your worklist on the left panel.
            </p>
            <div className="mt-8 flex items-center gap-3">
               <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">
                  <Activity size={14} /> System Monitoring
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderEntry;
