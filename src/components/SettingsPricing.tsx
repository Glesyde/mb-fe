
import React, { useState } from 'react';
import { Search, Save, Filter, History } from 'lucide-react';

const INITIAL_SERVICES = [
  { id: 'S1', name: 'General Consultation', category: 'Consultation', price: 5000 },
  { id: 'S2', name: 'Specialist Consultation', category: 'Consultation', price: 15000 },
  { id: 'S3', name: 'Full Blood Count (FBC)', category: 'Labs', price: 4500 },
  { id: 'S4', name: 'Malaria Parasite Test', category: 'Labs', price: 2500 },
  { id: 'S5', name: 'Urinalysis', category: 'Labs', price: 1500 },
  { id: 'S6', name: 'Appendectomy', category: 'Procedures', price: 120000 },
  { id: 'S7', name: 'Wound Dressing', category: 'Procedures', price: 5500 },
];

const SettingsPricing: React.FC = () => {
  const [services, setServices] = useState(INITIAL_SERVICES);
  const [searchTerm, setSearchTerm] = useState('');

  const handlePriceChange = (id: string, newPrice: number) => {
    setServices(services.map(s => s.id === id ? { ...s, price: newPrice } : s));
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-black text-slate-800">Services & Pricing Master</h3>
          <p className="text-sm font-medium text-slate-500">Define billable hospital services and standard pricing.</p>
        </div>
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search catalog..." 
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold focus:bg-white outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-[32px] overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Service Item</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Standard Fee (₦)</th>
              <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {services.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).map(service => (
              <tr key={service.id} className="hover:bg-slate-50/30 group transition-colors">
                <td className="px-8 py-5">
                  <span className="text-sm font-black text-slate-800">{service.name}</span>
                </td>
                <td className="px-8 py-5">
                  <span className="text-[9px] font-black px-3 py-1 rounded-lg bg-slate-100 text-slate-500 uppercase tracking-widest border border-slate-200">{service.category}</span>
                </td>
                <td className="px-8 py-5 text-right">
                  <input 
                    type="number" 
                    className="w-36 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-brand-primary text-right outline-none focus:bg-white focus:border-brand-active0 transition-all"
                    value={service.price}
                    onChange={(e) => handlePriceChange(service.id, parseInt(e.target.value) || 0)}
                  />
                </td>
                <td className="px-8 py-5 text-right">
                  <button className="text-[10px] font-black text-slate-300 hover:text-slate-800 uppercase tracking-widest flex items-center justify-end gap-1 ml-auto">
                    <History size={14} /> Log
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="flex justify-end gap-3 pt-8 border-t border-slate-50">
          <button className="px-8 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Discard</button>
          <button className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-slate-800 transition-all active:scale-95 flex items-center gap-3">
            <Save size={18} /> Commit Price List
          </button>
      </div>
    </div>
  );
};

export default SettingsPricing;
