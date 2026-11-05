
import React, { useState } from 'react';
import { 
  Filter, 
  Send, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Search, 
  Download, 
  ChevronDown,
  FileText,
  Calendar
} from 'lucide-react';

interface Claim {
  id: string;
  patientName: string;
  hmo: string;
  amount: number;
  status: 'Pending' | 'Submitted' | 'Paid' | 'Rejected';
  date: string;
}

const MOCK_CLAIMS: Claim[] = [
  { id: 'CLM-001', patientName: 'Alexander Thompson', hmo: 'Reliance Health', amount: 45000, status: 'Paid', date: '2025-05-18' },
  { id: 'CLM-002', patientName: 'Sarah Miller', hmo: 'AXA Mansard', amount: 12500, status: 'Pending', date: '2025-05-19' },
  { id: 'CLM-003', patientName: 'James Wilson', hmo: 'Hygeia HMO', amount: 8200, status: 'Rejected', date: '2025-05-19' },
  { id: 'CLM-004', patientName: 'Elena Rodriguez', hmo: 'Reliance Health', amount: 31000, status: 'Submitted', date: '2025-05-20' },
  { id: 'CLM-005', patientName: 'Lily Evans', hmo: 'Leadway Health', amount: 15400, status: 'Pending', date: '2025-05-21' },
];

const HMOClaims: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');

  const getStatusStyle = (status: Claim['status']) => {
    switch (status) {
      case 'Paid': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'Pending': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'Rejected': return 'bg-red-50 text-red-600 border-red-100';
      case 'Submitted': return 'bg-brand-active text-brand-primary border-brand-active';
      default: return 'bg-slate-50 text-slate-500';
    }
  };

  const filteredClaims = MOCK_CLAIMS.filter(claim => {
    const matchesStatus = statusFilter === 'All' || claim.status === statusFilter;
    const matchesSearch = claim.patientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         claim.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Search and Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-[32px] p-4 flex flex-col md:flex-row md:items-center gap-4 shadow-sm">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-brand-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Search by Patient or Claim ID..."
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:bg-white focus:ring-4 focus:ring-brand-active0/10 transition-all font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5 pointer-events-none" />
            <select 
              className="pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-600 outline-none appearance-none hover:bg-slate-50 transition-all cursor-pointer"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Submitted">Submitted</option>
              <option value="Rejected">Rejected</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-3 h-3 pointer-events-none" />
          </div>

          <button className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-2xl text-xs font-bold hover:bg-slate-800 transition-all shadow-md">
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[40px] overflow-hidden shadow-sm">
        <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Claims Registry</h2>
            <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Global Claim Ledger</p>
          </div>
          <button className="bg-brand-primary text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-brand-primary transition-all shadow-lg shadow-brand-active">
            Process Batch Claims
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Claim ID</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Patient</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">HMO Provider</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Amount</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredClaims.map(claim => (
                <tr key={claim.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer group">
                  <td className="px-8 py-5 font-mono text-xs font-bold text-brand-primary uppercase tracking-tighter">{claim.id}</td>
                  <td className="px-8 py-5">
                    <p className="text-sm font-black text-slate-800">{claim.patientName}</p>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">{claim.hmo}</span>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-sm font-black text-slate-900">₦{claim.amount.toLocaleString()}</p>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`text-[9px] font-black px-3 py-1 rounded-full border flex items-center gap-1.5 w-fit uppercase tracking-widest ${getStatusStyle(claim.status)}`}>
                      {claim.status === 'Paid' && <CheckCircle2 size={12} />}
                      {claim.status === 'Pending' && <Clock size={12} />}
                      {claim.status === 'Rejected' && <XCircle size={12} />}
                      {claim.status === 'Submitted' && <Send size={12} />}
                      {claim.status}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right text-xs font-bold text-slate-400 uppercase">
                    {claim.date}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredClaims.length === 0 && (
          <div className="py-20 text-center">
            <FileText className="mx-auto text-slate-200 mb-4" size={48} />
            <p className="text-slate-400 font-bold uppercase tracking-widest">No claims found matching filters</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HMOClaims;
