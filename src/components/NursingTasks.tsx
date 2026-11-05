
import React, { useState } from 'react';
import { 
  ClipboardList, 
  Clock, 
  CheckCircle2, 
  Plus, 
  FileText, 
  X, 
  Save, 
  Search,
  User,
  AlertCircle,
  Activity
} from 'lucide-react';

interface NursingTask {
  id: string;
  patient: string;
  bed: string;
  task: string;
  time: string;
  status: 'Pending' | 'Completed';
}

const MOCK_TASKS: NursingTask[] = [
  { id: '1', patient: 'Alexander Thompson', bed: 'A4', task: 'Hourly Vitals Check', time: '14:30', status: 'Pending' },
  { id: '2', patient: 'Sarah Miller', bed: 'B6', task: 'Administer Paracetamol (500mg)', time: '15:00', status: 'Pending' },
  { id: '3', patient: 'James Wilson', bed: 'A1', task: 'Wound Dressing Change', time: '15:15', status: 'Pending' },
  { id: '4', patient: 'Elena Rodriguez', bed: 'A12', task: 'Post-Op Observation', time: '16:00', status: 'Pending' },
];

const NursingTasks: React.FC = () => {
  const [tasks, setTasks] = useState<NursingTask[]>(MOCK_TASKS);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteForm, setNoteForm] = useState({ patient: '', note: '' });

  const completeTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'Completed' } : t));
  };

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate saving to EMR
    alert(`Clinical note for ${noteForm.patient} recorded in EMR.`);
    setShowNoteModal(false);
    setNoteForm({ patient: '', note: '' });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <ClipboardList size={20} className="text-brand-primary" />
            Clinical Task Queue
          </h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Real-time nursing workload management</p>
        </div>
        <button 
          onClick={() => setShowNoteModal(true)}
          className="bg-brand-primary text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-brand-primary transition-all shadow-lg shadow-brand-active active:scale-95 text-xs uppercase tracking-widest"
        >
          <FileText size={18} /> New Shift Note
        </button>
      </div>

      {/* Task List Table */}
      <div className="bg-white border border-slate-200 rounded-[40px] shadow-sm overflow-hidden flex flex-col">
        <div className="p-8 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Pending Interventions</h3>
            <span className="bg-brand-active text-brand-primary px-3 py-1 rounded-xl text-[10px] font-black uppercase border border-brand-active">
              {tasks.filter(t => t.status === 'Pending').length} Remaining
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="px-8 py-5">Location</th>
                <th className="px-8 py-5">Task Description</th>
                <th className="px-8 py-5">Patient Name</th>
                <th className="px-8 py-5">Scheduled</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {tasks.filter(t => t.status === 'Pending').map((task) => (
                <tr key={task.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <span className="text-xs font-black text-brand-primary bg-brand-active px-3 py-1.5 rounded-lg border border-brand-active uppercase tracking-widest shadow-sm">
                      Bed {task.bed}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-sm font-black text-slate-800">{task.task}</p>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-black text-xs text-slate-400">
                        {task.patient.charAt(0)}
                      </div>
                      <p className="text-xs font-bold text-slate-600">{task.patient}</p>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                      <Clock size={14} className="text-brand-primary" /> {task.time}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button 
                      onClick={() => completeTask(task.id)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-slate-100 hover:border-emerald-600 hover:text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 transition-all shadow-sm"
                    >
                      <CheckCircle2 size={14} /> Complete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {tasks.filter(t => t.status === 'Pending').length === 0 && (
            <div className="py-24 text-center opacity-40">
              <CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-4" />
              <h4 className="text-xl font-black text-slate-800 uppercase tracking-widest">Shift Tasks Completed</h4>
              <p className="text-sm font-bold text-slate-500 mt-2 italic">All clinical actions have been fulfilled for this ward.</p>
            </div>
          )}
        </div>
      </div>

      {/* Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowNoteModal(false)} />
          <form 
            onSubmit={handleSaveNote}
            className="relative bg-white w-full max-w-xl rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
          >
            <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-brand-active/20">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-brand-primary text-white rounded-2xl shadow-lg shadow-brand-active">
                  <FileText size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">Clinical Observation</h2>
                  <p className="text-xs text-brand-primary font-bold uppercase tracking-widest">Digital Nursing Shift Log</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowNoteModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
                <X size={24} />
              </button>
            </div>

            <div className="p-10 space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Patient Instance</label>
                <div className="relative group">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-active0 transition-colors" size={18} />
                  <input 
                    required
                    type="text" 
                    placeholder="Search by Name or Bed..."
                    className="w-full pl-14 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-3xl text-sm font-bold text-slate-800 focus:bg-white outline-none transition-all"
                    value={noteForm.patient}
                    onChange={(e) => setNoteForm({ ...noteForm, patient: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Shift Note / Observation Body</label>
                <textarea 
                  required
                  rows={6}
                  placeholder="Record patient status, behavioral observations, or procedural feedback..."
                  className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-[32px] text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-brand-active0 transition-all resize-none leading-relaxed"
                  value={noteForm.note}
                  onChange={(e) => setNoteForm({ ...noteForm, note: e.target.value })}
                />
              </div>

              <div className="bg-brand-active border border-brand-active p-6 rounded-[32px] flex items-start gap-4">
                 <AlertCircle className="text-brand-primary flex-shrink-0" size={24} />
                 <p className="text-[10px] text-brand-primary font-black uppercase tracking-tight leading-relaxed">
                   Notes recorded here are instantly indexed in the EMR and will be visible to the treating consultant during handover.
                 </p>
              </div>
            </div>

            <div className="px-10 py-8 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button 
                type="button"
                onClick={() => setShowNoteModal(false)} 
                className="px-6 py-2.5 text-xs font-black text-slate-400 uppercase tracking-widest"
              >
                Discard
              </button>
              <button 
                type="submit"
                className="bg-brand-primary text-white px-10 py-4 rounded-[20px] font-black uppercase text-xs tracking-widest shadow-xl shadow-brand-active hover:bg-brand-primary active:scale-95 transition-all flex items-center gap-2"
              >
                <Save size={18} /> Record to EMR
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Info Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div className="bg-slate-900 rounded-[40px] p-8 text-white relative overflow-hidden group">
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <h4 className="text-xl font-bold tracking-tight">Shift Efficiency Pulse</h4>
              <p className="text-slate-400 text-sm mt-1">94% of critical tasks were completed within 15 mins of scheduling.</p>
            </div>
            <Activity size={40} className="text-brand-active0 animate-pulse" />
          </div>
          <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-brand-primary/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
        </div>
        <div className="bg-white border border-slate-200 p-8 rounded-[40px] flex items-center justify-between shadow-sm">
           <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl shadow-sm border border-emerald-100">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Handover Status</p>
                <p className="text-sm font-black text-slate-800">Clear for Ward Transfer</p>
              </div>
           </div>
           <button className="text-[10px] font-black text-brand-primary uppercase tracking-widest hover:underline">Download Log</button>
        </div>
      </div>
    </div>
  );
};

export default NursingTasks;
