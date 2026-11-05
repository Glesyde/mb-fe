
import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Plus, 
  Filter, 
  Edit2, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  DollarSign, 
  Building2, 
  ArrowUpRight,
  MoreVertical,
  X,
  Send,
  AlertCircle
} from 'lucide-react';

interface HMOProvider {
  id: string;
  name: string;
  logo: string;
  plans: string[];
  contact: string;
  activeClaims: number;
}

interface Claim {
  id: string;
  patientName: string;
  hmo: string;
  amount: number;
  status: 'Pending' | 'Submitted' | 'Paid' | 'Rejected';
  date: string;
}

interface Tariff {
  id: string;
  service: string;
  basePrice: number;
  hmoPrice: number;
  hmoName: string;
}

const HMO_PROVIDERS: HMOProvider[] = [
  { id: '1', name: 'Reliance Health', logo: 'RH', plans: ['Standard', 'Gold', 'Platinum'], contact: 'support@reliance.com', activeClaims: 24 },
  { id: '2', name: 'AXA Mansard', logo: 'AX', plans: ['Easy Care', 'Classic', 'Elite'], contact: 'info@axamansard.com', activeClaims: 12 },
  { id: '3', name: 'Hygeia HMO', logo: 'HY', plans: ['Hyprime', 'Hylite'], contact: 'claims@hygeia.com', activeClaims: 8 },
];

const MOCK_CLAIMS: Claim[] = [
  { id: 'CLM-001', patientName: 'Alexander Thompson', hmo: 'Reliance Health', amount: 45000, status: 'Paid', date: '2025-05-18' },
  { id: 'CLM-002', patientName: 'Sarah Miller', hmo: 'AXA Mansard', amount: 12500, status: 'Pending', date: '2025-05-19' },
  { id: 'CLM-003', patientName: 'James Wilson', hmo: 'Hygeia HMO', amount: 8200, status: 'Rejected', date: '2025-05-19' },
  { id: 'CLM-004', patientName: 'Elena Rodriguez', hmo: 'Reliance Health', amount: 31000, status: 'Submitted', date: '2025-05-20' },
];

const MOCK_TARIFFS: Tariff[] = [
  { id: 'T1', service: 'General Consultation', basePrice: 5000, hmoPrice: 4500, hmoName: 'Reliance Health' },
  { id: 'T2', service: 'Full Blood Count', basePrice: 4500, hmoPrice: 4000, hmoName: 'Reliance Health' },
  { id: 'T3', service: 'Malaria Parasite Test', basePrice: 2500, hmoPrice: 2200, hmoName: 'Reliance Health' },
  { id: 'T4', service: 'Chest X-Ray', basePrice: 12000, hmoPrice: 10500, hmoName: 'AXA Mansard' },
];

const HMOModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'providers' | 'tariffs' | 'claims' | 'auth'>('claims');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showEditTariff, setShowEditTariff] = useState<Tariff | null>(null);

  const getStatusStyle = (status: Claim['status']) => {
    switch (status) {
      case 'Paid': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'Pending': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'Rejected': return 'bg-red-50 text-red-600 border-red-100';
      case 'Submitted': return 'bg-brand-active text-brand-primary border-brand-active';
      default: return 'bg-slate-50 text-slate-500';
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'providers':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {HMO_PROVIDERS.map(hmo => (
              <div key={hmo.id} className="bg-white border border-slate-200 rounded-[32px] p-6 hover:shadow-lg hover:shadow-slate-200/50 transition-all group">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 bg-brand-active rounded-2xl flex items-center justify-center text-brand-primary font-black text-xl border border-brand-active group-hover:bg-brand-primary group-hover:text-white transition-colors">
                    {hmo.logo}
                  </div>
                  <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl transition-colors">
                    <MoreVertical size={18} />
                  </button>
                </div>
                <h3 className="text-xl font-bold text-slate-800">{hmo.name}</h3>
                <p className="text-sm text-slate-500 mb-6">{hmo.contact}</p>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {hmo.plans.map(plan => (
                      <span key={plan} className="text-[10px] font-bold px-2 py-1 bg-slate-50 text-slate-500 rounded-lg uppercase tracking-wider">{plan}</span>
                    ))}
                  </div>
                  <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Active Claims</p>
                      <p className="text-lg font-bold text-slate-800">{hmo.activeClaims}</p>
                    </div>
                    <button className="text-brand-primary text-sm font-bold flex items-center gap-1 hover:underline">
                      View Tariffs <ArrowUpRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            <button className="border-2 border-dashed border-slate-200 rounded-[32px] p-6 flex flex-col items-center justify-center text-slate-400 hover:border-brand-primary hover:text-brand-active0 transition-all bg-slate-50/30">
              <Plus size={32} className="mb-2" />
              <span className="font-bold">Add New Provider</span>
            </button>
          </div>
        );

      case 'tariffs':
        return (
          <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm animate-in fade-in duration-500">
            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Filter by service or provider..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-active0/20"
                />
              </div>
              <button className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all">
                <Plus size={18} /> Bulk Upload Tariffs
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Service Item</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Provider</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Standard Price</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">HMO Tariff</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {MOCK_TARIFFS.map(tariff => (
                    <tr key={tariff.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 font-bold text-slate-800 text-sm">{tariff.service}</td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-semibold text-slate-500">{tariff.hmoName}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400 font-medium">₦{tariff.basePrice.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-black text-brand-primary">₦{tariff.hmoPrice.toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => setShowEditTariff(tariff)}
                          className="p-2 text-slate-300 hover:text-brand-primary hover:bg-brand-active rounded-lg transition-all"
                        >
                          <Edit2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'claims':
        return (
          <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm animate-in fade-in duration-500">
            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="font-bold text-slate-800">Claims Registry</h2>
              <div className="flex items-center gap-2">
                <button className="p-2 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100 transition-colors">
                  <Filter size={18} />
                </button>
                <button className="bg-brand-primary text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-brand-primary transition-all shadow-md shadow-brand-active">
                  Generate Monthly Claims
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Claim ID</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Patient</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">HMO Provider</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Amount</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {MOCK_CLAIMS.map(claim => (
                    <tr key={claim.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer">
                      <td className="px-6 py-4 font-mono text-xs font-bold text-brand-primary">{claim.id}</td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-800">{claim.patientName}</td>
                      <td className="px-6 py-4 text-sm text-slate-500 font-medium">{claim.hmo}</td>
                      <td className="px-6 py-4 font-black text-slate-900">₦{claim.amount.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 w-fit ${getStatusStyle(claim.status)}`}>
                          {claim.status === 'Paid' && <CheckCircle2 size={12} />}
                          {claim.status === 'Pending' && <Clock size={12} />}
                          {claim.status === 'Rejected' && <XCircle size={12} />}
                          {claim.status === 'Submitted' && <Send size={12} />}
                          {claim.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-xs text-slate-400 font-medium">{claim.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'auth':
        return (
          <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white border border-slate-200 rounded-[40px] p-8 shadow-sm">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-brand-active text-brand-primary rounded-2xl">
                  <ShieldCheck size={32} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight">Pre-Authorization Request</h2>
                  <p className="text-slate-500 font-medium">Request coverage approval from HMO providers for specific treatments.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Patient</label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input 
                      type="text" 
                      placeholder="Search patient name or MRN..."
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:border-brand-active0 outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Diagnosis / ICD-10</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Typhoid Fever (A01.0)"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:border-brand-active0 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Proposed Treatment</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Inpatient Admission, IV Fluids"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:border-brand-active0 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estimated Cost (₦)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input 
                      type="number" 
                      placeholder="0.00"
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:border-brand-active0 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 mb-8">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Clinical Justification</label>
                <textarea 
                  rows={4}
                  placeholder="Explain why this procedure is necessary for the patient's recovery..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:border-brand-active0 outline-none transition-all resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
                <button className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">Save as Draft</button>
                <button className="bg-brand-primary text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-brand-primary shadow-lg shadow-brand-active transition-all active:scale-95">
                  <Send size={18} /> Submit for Approval
                </button>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-brand-active text-brand-primary rounded-xl">
              <Building2 size={24} />
            </div>
            HMO & Insurance
          </h1>
          <p className="text-slate-500 font-medium">Managing tariffs, claims, and insurance provider relationships.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100/50 backdrop-blur rounded-[20px] w-fit">
        {[
          { id: 'claims', label: 'Claims Registry', icon: FileText },
          { id: 'providers', label: 'Registered Providers', icon: ShieldCheck },
          { id: 'tariffs', label: 'Tariff Lists', icon: DollarSign },
          { id: 'auth', label: 'Authorizations', icon: Send },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`
              flex items-center gap-2 px-6 py-2.5 rounded-[16px] text-sm font-bold transition-all
              ${activeTab === tab.id 
                ? 'bg-white text-brand-primary shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'}
            `}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {renderContent()}

      {/* Edit Tariff Modal */}
      {showEditTariff && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowEditTariff(null)} />
          <div className="relative bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 pb-0 flex justify-between items-start">
              <div className="p-3 bg-brand-active text-brand-primary rounded-2xl">
                <DollarSign size={24} />
              </div>
              <button onClick={() => setShowEditTariff(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="p-8 pt-4">
              <h3 className="text-xl font-black text-slate-800 mb-2">Update Tariff Price</h3>
              <p className="text-sm text-slate-500 mb-8">{showEditTariff.service} • {showEditTariff.hmoName}</p>
              
              <div className="space-y-6">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase">Base Hospital Price</span>
                  <span className="text-sm font-bold text-slate-800">₦{showEditTariff.basePrice.toLocaleString()}</span>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Agreed HMO Price (₦)</label>
                  <input 
                    type="number"
                    defaultValue={showEditTariff.hmoPrice}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-lg font-black text-brand-primary outline-none focus:ring-4 focus:ring-brand-active0/10 focus:border-brand-active0 transition-all"
                  />
                </div>
                <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-3">
                  <AlertCircle className="text-amber-600 flex-shrink-0" size={18} />
                  <p className="text-[10px] text-amber-700 leading-relaxed font-medium">
                    Note: Changing this price will affect all future invoices generated for patients under the {showEditTariff.hmoName} provider.
                  </p>
                </div>
              </div>

              <div className="mt-10 space-y-3">
                <button 
                  onClick={() => setShowEditTariff(null)}
                  className="w-full bg-brand-primary text-white py-4 rounded-2xl font-bold shadow-lg shadow-brand-active hover:bg-brand-primary transition-all active:scale-95"
                >
                  Save Changes
                </button>
                <button 
                  onClick={() => setShowEditTariff(null)}
                  className="w-full text-slate-400 py-2 text-sm font-bold hover:text-slate-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HMOModule;
