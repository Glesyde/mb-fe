
import React, { useState } from 'react';
import { 
  Microscope, 
  Search, 
  Plus, 
  Edit2, 
  MoreVertical, 
  Settings2, 
  Clock,
  DollarSign,
  Filter,
  CheckCircle2,
  Trash2
} from 'lucide-react';

interface LabTest {
  id: string;
  code: string;
  name: string;
  department: 'Hematology' | 'Microbiology' | 'Chemical Pathology' | 'Parasitology' | 'Serology';
  price: number;
  tat: string; // Turnaround time
}

const MOCK_CATALOG: LabTest[] = [
  { id: '1', code: 'HEM-001', name: 'Full Blood Count (FBC)', department: 'Hematology', price: 4500, tat: '2 Hours' },
  { id: '2', code: 'PAR-042', name: 'Malaria Parasite (MP)', department: 'Parasitology', price: 2500, tat: '1 Hour' },
  { id: '3', code: 'CHEM-112', name: 'Liver Function Test (LFT)', department: 'Chemical Pathology', price: 8500, tat: '4 Hours' },
  { id: '4', code: 'MIC-088', name: 'Urine Culture & Sensitivity', department: 'Microbiology', price: 12000, tat: '48 Hours' },
  { id: '5', code: 'SER-005', name: 'HIV 1 & 2 Screening', department: 'Serology', price: 3500, tat: '1 Hour' },
];

const LabCatalog: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTests = MOCK_CATALOG.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Search & Action Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 flex flex-col md:flex-row gap-4 items-center shadow-sm">
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-purple-600 transition-colors" />
          <input 
            type="text" 
            placeholder="Search test catalog by name or code..."
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:ring-4 focus:ring-purple-500/10 outline-none transition-all font-bold"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-5 py-3 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all">
            <Filter size={16} /> All Depts
          </button>
          <button className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg active:scale-95 text-xs uppercase tracking-widest">
            <Plus size={18} /> Add New Test
          </button>
        </div>
      </div>

      {/* Catalog Table */}
      <div className="bg-white border border-slate-200 rounded-[40px] overflow-hidden shadow-sm">
        <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
           <div>
             <h3 className="text-xl font-black text-slate-800 tracking-tight">Diagnostic Master Registry</h3>
             <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Global Laboratory Price List & Standards</p>
           </div>
           <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-purple-600 transition-all shadow-sm">
              <Settings2 size={18} />
           </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Test Code</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Investigation Name</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Department</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">TAT</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Standard Fee</th>
                <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredTests.map((test) => (
                <tr key={test.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <span className="text-xs font-mono font-black text-purple-600 bg-purple-50 px-2.5 py-1.5 rounded-lg border border-purple-100 uppercase tracking-tighter">
                      {test.code}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-sm font-black text-slate-800">{test.name}</p>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg uppercase tracking-wider border border-slate-200">
                      {test.department}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600">
                      <Clock size={14} className="text-slate-400" />
                      {test.tat}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <p className="text-sm font-black text-slate-900">₦{test.price.toLocaleString()}</p>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-brand-primary transition-all shadow-sm">
                        <Edit2 size={16} />
                      </button>
                      <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-red-500 transition-all shadow-sm">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Catalog Info Footer */}
      <div className="bg-purple-50 border border-purple-100 p-8 rounded-[40px] flex items-start gap-4">
         <div className="p-3 bg-white text-purple-600 rounded-2xl shadow-sm border border-purple-100">
            <CheckCircle2 size={24} />
         </div>
         <div>
            <h4 className="text-lg font-black text-purple-900 tracking-tight">Sync Status</h4>
            <p className="text-sm text-purple-700/80 leading-relaxed font-medium mt-1">
              Test pricing and parameters are globally synced with Clinical Order Entry and Billing. Changes made here will reflect immediately across all hospital terminals.
            </p>
         </div>
      </div>
    </div>
  );
};

export default LabCatalog;
