
import React, { useState } from 'react';
import { 
  Search, 
  Plus, 
  Edit2, 
  DollarSign, 
  X, 
  AlertCircle, 
  Filter, 
  Download, 
  History,
  Activity,
  CheckCircle2,
  TrendingUp,
  FileText
} from 'lucide-react';

interface Tariff {
  id: string;
  service: string;
  category: 'Consultation' | 'Lab' | 'Pharmacy' | 'Radiology' | 'Procedure';
  basePrice: number;
  hmoPrice: number;
  hmoName: string;
  lastUpdated: string;
}

const MOCK_TARIFFS: Tariff[] = [
  { id: 'T1', service: 'General Consultation', category: 'Consultation', basePrice: 5000, hmoPrice: 4500, hmoName: 'Reliance Health', lastUpdated: '12 May, 2025' },
  { id: 'T2', service: 'Full Blood Count', category: 'Lab', basePrice: 4500, hmoPrice: 4000, hmoName: 'Reliance Health', lastUpdated: '12 May, 2025' },
  { id: 'T3', service: 'Malaria Parasite Test', category: 'Lab', basePrice: 2500, hmoPrice: 2200, hmoName: 'Reliance Health', lastUpdated: '15 May, 2025' },
  { id: 'T4', service: 'Chest X-Ray', category: 'Radiology', basePrice: 12000, hmoPrice: 10500, hmoName: 'AXA Mansard', lastUpdated: '02 Apr, 2025' },
  { id: 'T5', service: 'Ciprofloxacin 500mg', category: 'Pharmacy', basePrice: 3500, hmoPrice: 3200, hmoName: 'Hygeia HMO', lastUpdated: 'Yesterday' },
  { id: 'T6', service: 'Minor Suturing', category: 'Procedure', basePrice: 15000, hmoPrice: 12500, hmoName: 'Leadway Health', lastUpdated: '1 week ago' },
];

const HMOTariffs: React.FC = () => {
  const [showEditTariff, setShowEditTariff] = useState<Tariff | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTariffs = MOCK_TARIFFS.filter(t => 
    t.service.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.hmoName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Controls */}
      <div className="bg-white p-6 rounded-[40px] border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6 items-center">
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-brand-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Search by service name or provider..."
            className="w-full pl-14 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-[28px] text-sm font-bold text-slate-800 outline-none focus:bg-white focus:ring-4 focus:ring-brand-active0/10 focus:border-brand-active0 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button className="flex items-center gap-2 px-6 py-4 bg-white border border-slate-200 rounded-[24px] text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-800 transition-all shadow-sm">
            <Filter size={16} /> All Providers
          </button>
          <button className="flex-1 md:flex-none bg-brand-primary text-white px-8 py-4 rounded-[24px] font-black text-xs uppercase tracking-widest hover:bg-brand-primary transition-all shadow-lg shadow-brand-active flex items-center justify-center gap-2">
            <Download size={18} /> Export List
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-[44px] overflow-hidden shadow-sm">
        <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
           <div>
             <h3 className="text-xl font-black text-slate-800 tracking-tight">Active Price Schedules</h3>
             <p className="text-xs font-bold text-slate-400 mt-1">Master registry of negotiated HMO service tariffs.</p>
           </div>
           <button className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg active:scale-95 text-xs uppercase tracking-widest">
            <Plus size={18} /> Add Tariff Rule
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white border-b border-slate-100">
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Service Description</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Partner</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Standard Price</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Negotiated Tariff</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Variance</th>
                <th className="px-8 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredTariffs.map(tariff => {
                const variance = ((tariff.basePrice - tariff.hmoPrice) / tariff.basePrice) * 100;
                return (
                  <tr key={tariff.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-slate-100 rounded-xl text-slate-400 group-hover:bg-brand-active group-hover:text-brand-primary transition-all">
                           <Activity size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-800">{tariff.service}</p>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{tariff.category}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-xs font-black text-slate-600 bg-slate-100 px-3 py-1 rounded-xl uppercase tracking-tighter border border-slate-200">
                        {tariff.hmoName}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                       <p className="text-sm font-bold text-slate-400">₦{tariff.basePrice.toLocaleString()}</p>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-base font-black text-brand-primary">₦{tariff.hmoPrice.toLocaleString()}</span>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex items-center gap-1.5 text-emerald-600 font-black text-xs">
                          <TrendingUp size={14} /> {variance.toFixed(0)}% Disc.
                       </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button 
                          onClick={() => setShowEditTariff(tariff)}
                          className="p-3 bg-white border border-slate-200 text-brand-primary rounded-xl hover:bg-brand-primary hover:text-white transition-all shadow-sm"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button className="p-3 bg-white border border-slate-200 text-slate-400 rounded-xl hover:bg-slate-100 transition-all shadow-sm">
                          <History size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {filteredTariffs.length === 0 && (
          <div className="py-20 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200">
               <FileText size={32} />
            </div>
            <p className="text-slate-400 font-bold">No tariff rules found for "{searchTerm}"</p>
          </div>
        )}
      </div>

      {/* Edit Tariff Modal */}
      {showEditTariff && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowEditTariff(null)} />
          <div className="relative bg-white w-full max-w-md rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-10 pb-0 flex justify-between items-start">
              <div className="p-4 bg-brand-primary text-white rounded-[24px] shadow-xl shadow-brand-active">
                <DollarSign size={28} />
              </div>
              <button onClick={() => setShowEditTariff(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-10 pt-6">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-1">Negotiated Price Update</h3>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-8">{showEditTariff.hmoName} Contract</p>
              
              <div className="space-y-8">
                <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Service Item</p>
                   <p className="text-lg font-black text-slate-800 leading-tight">{showEditTariff.service}</p>
                   <div className="mt-4 flex items-center justify-between pt-4 border-t border-slate-200/50">
                      <span className="text-xs font-bold text-slate-500">Base Hospital Price</span>
                      <span className="text-sm font-black text-slate-800">₦{showEditTariff.basePrice.toLocaleString()}</span>
                   </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">New Agreed HMO Price (₦)</label>
                  <div className="relative">
                     <span className="absolute left-5 top-1/2 -translate-y-1/2 text-lg font-black text-brand-primary">₦</span>
                     <input 
                        type="number"
                        defaultValue={showEditTariff.hmoPrice}
                        autoFocus
                        className="w-full pl-12 pr-6 py-5 bg-brand-active/30 border-2 border-brand-active rounded-[32px] text-2xl font-black text-brand-primary outline-none focus:ring-8 focus:ring-brand-active0/5 focus:border-brand-active0 transition-all"
                      />
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-100 p-6 rounded-[32px] flex items-start gap-4">
                  <AlertCircle className="text-amber-600 flex-shrink-0" size={24} />
                  <p className="text-xs text-amber-700 leading-relaxed font-bold uppercase tracking-tight">
                    Warning: Price changes are effective immediately for all pending and future bills under this provider schedule.
                  </p>
                </div>
              </div>

              <div className="mt-12 space-y-3">
                <button 
                  onClick={() => setShowEditTariff(null)}
                  className="w-full bg-slate-900 text-white py-5 rounded-[28px] font-black uppercase tracking-[0.2em] text-xs shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={18} /> Apply Tariff Update
                </button>
                <button 
                  onClick={() => setShowEditTariff(null)}
                  className="w-full text-slate-400 py-3 text-xs font-black uppercase tracking-widest hover:text-slate-600 transition-colors"
                >
                  Discard Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HMOTariffs;
