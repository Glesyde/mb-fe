
import React, { useState } from 'react';
import { Search, Save, Filter, History, DollarSign, Activity } from 'lucide-react';

interface ServiceItem {
  id: string;
  name: string;
  category: 'Consultation' | 'Labs' | 'Procedures' | 'Pharmacy' | 'Radiology';
  price: number;
}

const INITIAL_SERVICES: ServiceItem[] = [
  { id: 'S1', name: 'General Consultation', category: 'Consultation', price: 5000 },
  { id: 'S2', name: 'Specialist Consultation', category: 'Consultation', price: 15000 },
  { id: 'S3', name: 'Full Blood Count (FBC)', category: 'Labs', price: 4500 },
  { id: 'S4', name: 'Malaria Parasite Test', category: 'Labs', price: 2500 },
  { id: 'S5', name: 'Urinalysis', category: 'Labs', price: 1500 },
  { id: 'S6', name: 'Appendectomy', category: 'Procedures', price: 120000 },
  { id: 'S7', name: 'Wound Dressing', category: 'Procedures', price: 5500 },
  { id: 'S8', name: 'Chest X-Ray', category: 'Radiology', price: 12000 },
];

const PricingMaster: React.FC = () => {
  const [services, setServices] = useState<ServiceItem[]>(INITIAL_SERVICES);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const handlePriceChange = (id: string, newPrice: number) => {
    setServices(services.map(s => s.id === id ? { ...s, price: newPrice } : s));
  };

  const filteredServices = services.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || s.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h3 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
             <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <DollarSign size={24} />
            </div>
            Services & Pricing Master
          </h3>
          <p className="text-sm font-medium text-slate-500 mt-1">Configure global billable service items and standard hospital tariffs.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search catalog..." 
              className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white outline-none transition-all shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="p-3.5 bg-white border border-slate-200 text-slate-400 rounded-2xl hover:text-emerald-600 hover:border-emerald-200 transition-all">
            <Filter size={20} />
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[44px] overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Service Description</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Category</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Standard Fee (₦)</th>
              <th className="px-8 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredServices.map(service => (
              <tr key={service.id} className="hover:bg-slate-50/30 group transition-colors">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
                      <Activity size={18} />
                    </div>
                    <span className="text-sm font-black text-slate-800">{service.name}</span>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className="text-[10px] font-black px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 uppercase tracking-widest group-hover:border-emerald-200 group-hover:text-emerald-600 transition-colors">
                    {service.category}
                  </span>
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="relative inline-block">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-300">₦</span>
                    <input 
                      type="number" 
                      className="w-40 pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-emerald-600 text-right outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all shadow-inner"
                      value={service.price}
                      onChange={(e) => handlePriceChange(service.id, parseInt(e.target.value) || 0)}
                    />
                  </div>
                </td>
                <td className="px-8 py-6 text-right">
                  <button className="text-[10px] font-black text-slate-300 hover:text-slate-800 uppercase tracking-widest flex items-center justify-end gap-2 ml-auto group/btn transition-colors">
                    <History size={16} className="group-hover/btn:text-brand-active0" /> Log
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredServices.length === 0 && (
          <div className="py-24 text-center">
            <Search className="mx-auto text-slate-200 mb-4" size={48} />
            <p className="text-slate-400 font-bold uppercase tracking-widest">No matching service items</p>
          </div>
        )}
      </div>
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-8 border-t border-slate-100">
          <div className="flex items-center gap-3 text-amber-600 bg-amber-50 px-5 py-3 rounded-2xl border border-amber-100">
             <DollarSign size={18} />
             <p className="text-[10px] font-black uppercase tracking-tight">Price changes take effect immediately on new draft invoices</p>
          </div>
          <div className="flex gap-4">
            <button className="px-8 py-4 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">Discard Draft</button>
            <button className="bg-slate-900 text-white px-12 py-5 rounded-[24px] font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-slate-200 hover:bg-emerald-600 active:scale-95 transition-all flex items-center gap-3">
              <Save size={20} /> Commit Master List
            </button>
          </div>
      </div>
    </div>
  );
};

export default PricingMaster;
