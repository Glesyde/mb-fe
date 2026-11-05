
import React, { useState } from 'react';
import { 
  Search, 
  Plus, 
  Edit2, 
  Settings2, 
  Clock, 
  DollarSign, 
  Filter, 
  Trash2,
  Scan
} from 'lucide-react';

interface ImagingService {
  id: string;
  code: string;
  name: string;
  modality: 'X-Ray' | 'Ultrasound' | 'CT Scan' | 'MRI' | 'ECG';
  price: number;
  avgTime: string;
}

const MOCK_RAD_CATALOG: ImagingService[] = [
  { id: '1', code: 'XRY-001', name: 'Chest X-Ray AP/Lat', modality: 'X-Ray', price: 12000, avgTime: '15 mins' },
  { id: '2', code: 'USS-042', name: 'Abdominal Ultrasound', modality: 'Ultrasound', price: 18500, avgTime: '30 mins' },
  { id: '3', code: 'CTS-112', name: 'Brain CT (Non-Contrast)', modality: 'CT Scan', price: 85000, avgTime: '45 mins' },
  { id: '4', code: 'MRI-088', name: 'Lumbar Spine MRI', modality: 'MRI', price: 120000, avgTime: '1.5 hours' },
  { id: '5', code: 'ECG-005', name: '12-Lead Resting ECG', modality: 'ECG', price: 8000, avgTime: '10 mins' },
];

const RadiologyCatalog: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = MOCK_RAD_CATALOG.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-4 rounded-3xl border border-slate-200 flex flex-col md:flex-row gap-4 items-center shadow-sm">
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-slate-700 transition-colors" />
          <input 
            type="text" 
            placeholder="Search imaging catalog by name or code..."
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:ring-4 focus:ring-slate-400/10 outline-none transition-all font-bold"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-5 py-3 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all">
            <Filter size={16} /> All Modalities
          </button>
          <button className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg active:scale-95 text-xs uppercase tracking-widest">
            <Plus size={18} /> New Service
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[40px] overflow-hidden shadow-sm">
        <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
           <div>
             <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3">
               <DollarSign size={20} className="text-slate-700" /> Imaging Tariff Schedule
             </h3>
             <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Standard Master Price List for RIS</p>
           </div>
           <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-600 transition-all shadow-sm">
              <Settings2 size={18} />
           </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="px-8 py-5">Service Code</th>
                <th className="px-8 py-5">Investigation Description</th>
                <th className="px-8 py-5">Modality</th>
                <th className="px-8 py-5 text-center">Avg. Session</th>
                <th className="px-8 py-5 text-right">Standard Fee</th>
                <th className="px-8 py-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <span className="text-xs font-mono font-black text-slate-600 bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200 uppercase tracking-tighter shadow-sm">
                      {item.code}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-sm font-black text-slate-800">{item.name}</p>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg uppercase tracking-wider border border-slate-200">
                      {item.modality}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600">
                      <Clock size={14} className="text-slate-400" />
                      {item.avgTime}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <p className="text-sm font-black text-slate-900">₦{item.price.toLocaleString()}</p>
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
    </div>
  );
};

export default RadiologyCatalog;
