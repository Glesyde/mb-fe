
import React, { useState } from 'react';
import { Plus, Trash2, Layers, ShieldCheck, AlertCircle, Building2 } from 'lucide-react';

const INITIAL_DEPARTMENTS = [
  'General Outpatient (GOPD)',
  'Cardiology',
  'Pediatrics & Neonatology',
  'Internal Medicine',
  'Obstetrics & Gynecology',
  'Radiology & Diagnostics',
  'Laboratory Services'
];

const DepartmentSetup: React.FC = () => {
  const [departments, setDepartments] = useState(INITIAL_DEPARTMENTS);
  const [newDept, setNewDept] = useState('');

  const handleAddDept = () => {
    if (newDept.trim()) {
      setDepartments([...departments, newDept.trim()]);
      setNewDept('');
    }
  };

  const handleDeleteDept = (index: number) => {
    if (confirm(`Confirm removal of "${departments[index]}"? This will restrict new patient assignments to this unit.`)) {
      setDepartments(departments.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-2xl font-black text-slate-800 tracking-tight">Clinical Departments & Units</h3>
          <p className="text-sm font-medium text-slate-500 mt-1">Configure and index active hospital clinical modules.</p>
        </div>
        <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
          <ShieldCheck size={16} />
          <span className="text-[10px] font-black uppercase tracking-widest">HL7 Registry Synced</span>
        </div>
      </div>

      <div className="bg-slate-50 p-10 rounded-[44px] border border-slate-200/60 shadow-inner">
        <div className="max-w-2xl mx-auto space-y-4">
           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block text-center">Register New Hospital Unit</label>
           <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1 group">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="e.g. Intensive Care Unit (ICU)" 
                className="w-full pl-11 pr-5 py-4 bg-white border-2 border-transparent rounded-[24px] text-sm font-bold outline-none focus:border-brand-active0 focus:ring-8 focus:ring-brand-active0/5 transition-all shadow-sm"
                value={newDept}
                onChange={(e) => setNewDept(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddDept()}
              />
            </div>
            <button 
              onClick={handleAddDept}
              disabled={!newDept.trim()}
              className="bg-slate-900 text-white px-10 py-4 rounded-[24px] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-brand-primary transition-all shadow-xl active:scale-95 disabled:opacity-30"
            >
              <Plus size={20} /> Add Dept
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map((dept, i) => (
          <div key={i} className="flex items-center justify-between p-6 bg-white border border-slate-100 rounded-[32px] hover:border-slate-900 transition-all group shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 group-hover:bg-slate-900 group-hover:text-white flex items-center justify-center font-black text-xs transition-all shadow-sm">{i+1}</div>
              <span className="text-sm font-black text-slate-700">{dept}</span>
            </div>
            <button 
              onClick={() => handleDeleteDept(i)}
              className="p-2.5 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
            >
              <Trash2 size={20} />
            </button>
          </div>
        ))}
      </div>
      
      <div className="bg-amber-50 border border-amber-100 p-8 rounded-[40px] flex items-start gap-4">
         <AlertCircle className="text-amber-600 flex-shrink-0" size={28} />
         <div>
            <h4 className="text-sm font-black text-amber-900 uppercase tracking-widest">Administrative Guardrail</h4>
            <p className="text-xs text-amber-700 font-bold leading-relaxed uppercase mt-1">
              Note: Removal of a department does not delete associated clinical or financial archives. It only restricts the unit from appearing in future triage and admission dropdowns.
            </p>
         </div>
      </div>
    </div>
  );
};

export default DepartmentSetup;
