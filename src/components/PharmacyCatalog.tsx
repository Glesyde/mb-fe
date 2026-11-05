
import React, { useState } from 'react';
import { 
  Layers, 
  Search, 
  Plus, 
  MoreVertical, 
  FileText, 
  Edit2, 
  Settings2,
  Filter,
  CheckCircle2,
  Trash2,
  Activity
} from 'lucide-react';

interface CatalogDrug {
  id: string;
  name: string;
  genericName: string;
  strength: string;
  category: string;
  manufacturer: string;
  basePrice: number;
}

const MOCK_CATALOG: CatalogDrug[] = [
  { id: 'C-001', name: 'Panadol Advance', genericName: 'Paracetamol', strength: '500mg', category: 'Analgesics', manufacturer: 'GSK', basePrice: 1200 },
  { id: 'C-002', name: 'Augmentin', genericName: 'Co-Amoxiclav', strength: '625mg', category: 'Antibiotics', manufacturer: 'Beecham', basePrice: 8500 },
  { id: 'C-003', name: 'Zantac', genericName: 'Ranitidine', strength: '150mg', category: 'Gastrointestinal', manufacturer: 'Sanofi', basePrice: 2200 },
  { id: 'C-004', name: 'Glucophage', genericName: 'Metformin', strength: '500mg', category: 'Anti-Diabetics', manufacturer: 'Merck', basePrice: 3500 },
];

const PharmacyCatalog: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-4 rounded-3xl border border-slate-200 flex flex-col md:flex-row gap-4 items-center shadow-sm">
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-teal-600 transition-colors" />
          <input 
            type="text" 
            placeholder="Search pharmacological master catalog..."
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:ring-4 focus:ring-teal-500/10 outline-none transition-all font-bold"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg active:scale-95 text-xs uppercase tracking-widest">
          <Plus size={18} /> New Drug Entry
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-[40px] overflow-hidden shadow-sm">
        <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
           <div>
             <h3 className="text-xl font-black text-slate-800 tracking-tight">Hospital Drug Formulary</h3>
             <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Pharmacological Registry & Base Pricing</p>
           </div>
           <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-teal-600 transition-all shadow-sm">
              <Settings2 size={18} />
           </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Product Brand & Strength</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Clinical Category</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Manufacturer</th>
                <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Sales Price</th>
                <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {MOCK_CATALOG.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase())).map(drug => (
                <tr key={drug.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <p className="text-sm font-black text-slate-800">{drug.name} <span className="text-teal-600 ml-1">{drug.strength}</span></p>
                    <p className="text-[10px] font-bold text-slate-400 italic mt-0.5">{drug.genericName}</p>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg uppercase tracking-wider border border-slate-200">
                      {drug.category}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-xs font-bold text-slate-600">{drug.manufacturer}</p>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <p className="text-sm font-black text-slate-900">₦{drug.basePrice.toLocaleString()}</p>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
    </div>
  );
};

export default PharmacyCatalog;
