
import React, { useState } from 'react';
import { Scissors, Search, FileText, Plus, Clock, User, ChevronRight, Save, History } from 'lucide-react';

interface ProcedureLog {
  id: string;
  patientName: string;
  mrn: string;
  procedure: string;
  date: string;
  surgeon: string;
  status: 'Draft' | 'Finalized';
}

const MOCK_NOTES: ProcedureLog[] = [
  { id: 'LOG-882', patientName: 'Alexander J. Thompson', mrn: 'MRN-8842', procedure: 'Appendectomy', date: '22 May, 2025', surgeon: 'Dr. House', status: 'Finalized' },
  { id: 'LOG-881', patientName: 'Sarah Miller', mrn: 'MRN-1120', procedure: 'Knee Arthroscopy', date: '21 May, 2025', surgeon: 'Dr. Cuddy', status: 'Draft' },
];

const ProcedureNotes: React.FC = () => {
  const [activeLog, setActiveLog] = useState<ProcedureLog | null>(null);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white border border-slate-200 rounded-[40px] p-8 shadow-sm flex flex-col h-full">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <History size={16} className="text-rose-600" /> Operative Logs
            </h3>
            <button className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-all">
              <Plus size={18} />
            </button>
          </div>

          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by MRN or Procedure..."
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:bg-white transition-all"
            />
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar">
            {MOCK_NOTES.map(note => (
              <div 
                key={note.id}
                onClick={() => setActiveLog(note)}
                className={`p-5 rounded-[28px] border-2 transition-all cursor-pointer group
                  ${activeLog?.id === note.id ? 'bg-rose-600 border-rose-600 text-white shadow-xl shadow-rose-100' : 'bg-white border-slate-50 hover:border-rose-100'}
                `}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-black truncate">{note.patientName}</h4>
                    <p className={`text-[10px] font-bold mt-0.5 ${activeLog?.id === note.id ? 'text-rose-100' : 'text-slate-400'}`}>{note.procedure}</p>
                  </div>
                  <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border 
                    ${note.status === 'Finalized' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                    {note.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="lg:col-span-2">
        {activeLog ? (
          <div className="bg-white border border-slate-200 rounded-[48px] shadow-xl overflow-hidden animate-in slide-in-from-right-6 duration-500">
            <div className="p-10 border-b border-slate-100 bg-rose-50/20 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="p-4 bg-rose-600 text-white rounded-3xl shadow-lg">
                  <FileText size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight">{activeLog.procedure} Note</h2>
                  <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mt-1">{activeLog.patientName} • {activeLog.mrn}</p>
                </div>
              </div>
            </div>
            <div className="p-10 space-y-8">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Surgeon(s) On Duty</label>
                  <input type="text" defaultValue={activeLog.surgeon} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Procedural Findings</label>
                  <select className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold">
                    <option>Normal / Unremarkable</option>
                    <option>Complications Encountered</option>
                    <option>Revision Required</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Detailed Operative Findings</label>
                <textarea rows={8} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[32px] text-sm font-medium outline-none focus:bg-white focus:border-rose-500 transition-all resize-none" placeholder="Enter surgical detail..." />
              </div>
            </div>
            <div className="p-10 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button className="px-8 py-3 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-800">Draft Copy</button>
              <button className="bg-rose-600 text-white px-10 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-rose-700 transition-all shadow-lg shadow-rose-200">
                <Save size={18} /> Finalize Note
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-[48px] h-[600px] flex flex-col items-center justify-center p-20 text-center">
            <div className="w-24 h-24 bg-slate-50 text-slate-300 rounded-[40px] flex items-center justify-center mb-8">
              <Scissors size={48} />
            </div>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">Technical Documentation</h3>
            <p className="text-slate-500 max-w-sm mx-auto mt-2 font-medium leading-relaxed">
              Select a procedure from the logs or start a new clinical entry for a patient.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProcedureNotes;
