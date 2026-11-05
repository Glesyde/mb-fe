
import React from 'react';
import { 
  Building2, 
  MoreVertical, 
  ArrowUpRight, 
  Plus, 
  Mail, 
  Phone, 
  Users,
  ShieldCheck,
  Search,
  Filter
} from 'lucide-react';

interface HMOProvider {
  id: string;
  name: string;
  logo: string;
  plans: string[];
  contact: string;
  phone: string;
  activeClaims: number;
  enrollees: number;
  status: 'Active' | 'Under Review' | 'Suspended';
}

const HMO_PROVIDERS: HMOProvider[] = [
  { 
    id: '1', 
    name: 'Reliance Health', 
    logo: 'RH', 
    plans: ['Standard', 'Gold', 'Platinum'], 
    contact: 'support@reliance.com', 
    phone: '01-700-0000',
    activeClaims: 24,
    enrollees: 1240,
    status: 'Active'
  },
  { 
    id: '2', 
    name: 'AXA Mansard', 
    logo: 'AX', 
    plans: ['Easy Care', 'Classic', 'Elite'], 
    contact: 'claims@axamansard.com', 
    phone: '0800-AXA-SAFE',
    activeClaims: 12,
    enrollees: 850,
    status: 'Active'
  },
  { 
    id: '3', 
    name: 'Hygeia HMO', 
    logo: 'HY', 
    plans: ['Hyprime', 'Hylite'], 
    contact: 'hmo@hygeia.com', 
    phone: '0700-HYGEIA',
    activeClaims: 8,
    enrollees: 410,
    status: 'Active'
  },
  { 
    id: '4', 
    name: 'Leadway Health', 
    logo: 'LH', 
    plans: ['Executive', 'Core', 'Silver'], 
    contact: 'info@leadwayhealth.com', 
    phone: '01-280-0000',
    activeClaims: 15,
    enrollees: 620,
    status: 'Under Review'
  },
];

const HMOProviders: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Control Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 flex flex-col md:flex-row gap-4 items-center shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search provider directory..."
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:ring-4 focus:ring-brand-active0/10 outline-none transition-all font-bold"
          />
        </div>
        <div className="flex items-center gap-2">
           <button className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all">
            <Filter size={16} /> All Regions
          </button>
          <button className="bg-slate-900 text-white px-6 py-2.5 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg active:scale-95">
            <Plus size={18} /> Add Provider
          </button>
        </div>
      </div>

      {/* Grid View */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {HMO_PROVIDERS.map(hmo => (
          <div key={hmo.id} className="bg-white border border-slate-200 rounded-[40px] p-8 hover:shadow-xl hover:shadow-slate-200/50 transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-active rounded-full -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-8">
                <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-brand-primary font-black text-2xl border-2 border-slate-100 shadow-sm group-hover:border-brand-active0 group-hover:bg-brand-primary group-hover:text-white transition-all duration-500">
                  {hmo.logo}
                </div>
                <div className="flex flex-col items-end gap-2">
                   <button className="p-2 text-slate-300 hover:bg-slate-100 hover:text-slate-600 rounded-xl transition-all">
                    <MoreVertical size={20} />
                  </button>
                  <span className={`text-[9px] font-black uppercase tracking-[0.1em] px-2.5 py-1 rounded-full border 
                    ${hmo.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                    {hmo.status}
                  </span>
                </div>
              </div>

              <h3 className="text-2xl font-black text-slate-800 tracking-tight group-hover:text-brand-primary transition-colors">{hmo.name}</h3>
              
              <div className="mt-4 space-y-2 mb-8">
                <p className="flex items-center gap-2 text-xs font-bold text-slate-400">
                  <Mail size={14} className="text-brand-active0" /> {hmo.contact}
                </p>
                <p className="flex items-center gap-2 text-xs font-bold text-slate-400">
                  <Phone size={14} className="text-emerald-500" /> {hmo.phone}
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap gap-1.5">
                  {hmo.plans.map(plan => (
                    <span key={plan} className="text-[10px] font-black px-2.5 py-1 bg-slate-50 text-slate-500 rounded-xl uppercase tracking-wider border border-slate-100">
                      {plan}
                    </span>
                  ))}
                </div>
                
                <div className="pt-6 border-t border-slate-50 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Enrolled</p>
                    <p className="text-lg font-black text-slate-800 flex items-center gap-1.5 mt-0.5">
                      <Users size={16} className="text-brand-active0" /> {hmo.enrollees.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Claims Pending</p>
                    <p className="text-lg font-black text-rose-600 flex items-center gap-1.5 mt-0.5">
                      <ShieldCheck size={16} className="text-rose-500" /> {hmo.activeClaims}
                    </p>
                  </div>
                </div>
              </div>

              <button className="w-full mt-8 py-3.5 bg-slate-50 group-hover:bg-brand-primary group-hover:text-white rounded-[24px] text-xs font-black uppercase tracking-widest text-slate-500 transition-all flex items-center justify-center gap-2 shadow-sm group-hover:shadow-lg group-hover:shadow-brand-active">
                Manage Directory <ArrowUpRight size={16} />
              </button>
            </div>
          </div>
        ))}

        <button className="border-4 border-dashed border-slate-100 rounded-[40px] p-8 flex flex-col items-center justify-center text-slate-300 hover:border-brand-active hover:text-brand-active0 hover:bg-brand-active/20 transition-all min-h-[400px] group">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-brand-active transition-all">
            <Building2 size={40} />
          </div>
          <span className="font-black text-lg uppercase tracking-widest">Partner Onboarding</span>
          <p className="text-sm font-medium text-slate-400 mt-2 max-w-[180px] text-center">Add a new insurance provider to the system.</p>
        </button>
      </div>
    </div>
  );
};

export default HMOProviders;
