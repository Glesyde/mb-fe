
import React, { useState } from 'react';
import { 
  Layers, 
  Search, 
  Plus, 
  Edit2, 
  Settings2,
  Filter,
  Trash2,
  Activity,
  ChevronRight,
  Database
} from 'lucide-react';

interface DrugEntry {
  id: string;
  brandName: string;
  genericName: string;
  form: 'Tab' | 'Syrup' | 'Injection' | 'Cream' | 'Inhaler';
  strength: string;
  price: number;
}

const MOCK_DRUGS: DrugEntry[] = [
  { id: 'D-001', brandName: 'Panadol Advance', genericName: 'Paracetamol', form: 'Tab', strength: '500mg', price: 1200 },
  { id: 'D-002', brandName: 'Augmentin', genericName: 'Co-Amoxiclav', form: 'Tab', strength: '625mg', price: 8500 },
  { id: 'D-003', brandName: 'Benylin 4Flu', genericName: 'Diphenhydramine', form: 'Syrup', strength: '100ml', price: 2800 },
  { id: 'D-004', brandName: 'Rocephin', genericName: 'Ceftriaxone', form: 'Injection', strength: '1g', price: 4200 },
  { id: 'D-005', brandName: 'Ventolin', genericName: 'Salbutamol', form: 'Inhaler', strength: '100mcg', price: 5500 },
];

const DrugCatalog: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = MOCK_DRUGS.filter(d => 
    d.brandName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    d.genericName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Search & Action Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 flex flex-col md:flex-row gap-4 items-center shadow-sm">
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-teal-600 transition-colors" />
          <input 
            type="text" 
            placeholder="Search master drug registry by Brand or Generic name..."
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:ring-4 focus:ring-teal-500/10 outline-none transition-all font-bold"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-5 py-3 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all">
            <Filter size={16} /> All Forms
          </button>
          <button className="bg-teal-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-teal-700 transition-all shadow-lg active:scale-95 text-xs uppercase tracking-widest">
            <Plus size={18} /> Add New Drug
          </button>
        </div>
      </div>

      {/* Catalog Table */}
      <div className="bg-white border border-slate-200 rounded-[40px] overflow-hidden shadow-sm">
        <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
           <div>
             <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
               <Database size={20} className="text-teal-600" /> Pharmacological Master Registry
             </h3>
             <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Official Hospital Drug List & Standardized Pricing</p>
           </div>
           <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-teal-600 transition-all shadow-sm">
              <Settings2 size={18} />
           </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Drug Name (Brand)</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Generic Name</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Form</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Strength</th>
                <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Selling Price</th>
                <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((drug) => (
                <tr key={drug.id} className="hover:bg-teal-50/20 transition-colors group">
                  <td className="px-8 py-6">
                    <p className="text-sm font-black text-slate-800 group-hover:text-teal-700 transition-colors">{drug.brandName}</p>
                    <p className="text-[10px] font-mono font-bold text-slate-400 uppercase mt-0.5">{drug.id}</p>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-xs font-bold text-slate-500 italic">{drug.genericName}</p>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-3 py-1 rounded-lg uppercase tracking-wider border border-slate-200">
                      {drug.form}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <span className="text-xs font-bold text-slate-600">{drug.strength}</span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <p className="text-sm font-black text-slate-900">₦{drug.price.toLocaleString()}</p>
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
        
        {filtered.length === 0 && (
          <div className="py-20 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200">
               <Layers size={32} />
            </div>
            <p className="text-slate-400 font-bold uppercase tracking-widest">No matching drugs in registry</p>
          </div>
        )}
      </div>

      {/* Info Footer */}
      <div className="bg-teal-50 border border-teal-100 p-8 rounded-[40px] flex items-start gap-4">
         <div className="p-3 bg-white text-teal-600 rounded-2xl shadow-sm border border-teal-100">
            <Activity size={24} />
         </div>
         <div>
            <h4 className="text-lg font-black text-teal-900 tracking-tight">Catalog Intelligence</h4>
            <p className="text-sm text-teal-700/80 leading-relaxed font-medium mt-1">
              All entries are categorized based on clinical class. Changes to selling prices are automatically audited and applied to the Billing module for all active OPD and IPD encounters.
            </p>
         </div>
      </div>
    </div>
  );
};

export default DrugCatalog;
