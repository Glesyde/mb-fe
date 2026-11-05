
import React, { useState } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  Printer, 
  Mail, 
  Eye, 
  Receipt, 
  User, 
  Calendar, 
  ArrowRight,
  ChevronRight,
  Download,
  Smartphone,
  CreditCard,
  Banknote
} from 'lucide-react';

interface PaymentReceipt {
  id: string;
  date: string;
  patient: string;
  mrn: string;
  amount: number;
  mode: string;
  type: 'OPD' | 'IPD' | 'Pharmacy' | 'Lab';
}

const MOCK_RECEIPTS: PaymentReceipt[] = [
  { id: 'RC-2025-0921', date: '22 May, 11:30 AM', patient: 'Alexander Thompson', mrn: 'MRN-8842', amount: 4500, mode: 'POS', type: 'Lab' },
  { id: 'RC-2025-0915', date: '22 May, 09:15 AM', patient: 'Sarah Miller', mrn: 'MRN-1120', amount: 15000, mode: 'Cash', type: 'OPD' },
  { id: 'RC-2025-0892', date: '21 May, 04:30 PM', patient: 'James Wilson', mrn: 'MRN-7721', amount: 125000, mode: 'Transfer', type: 'IPD' },
  { id: 'RC-2025-0870', date: '21 May, 02:20 PM', patient: 'Lily Evans', mrn: 'MRN-0012', amount: 3500, mode: 'POS', type: 'Pharmacy' },
];

const ReceiptHistory: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
             <div className="p-2 bg-brand-active text-brand-primary rounded-xl">
              <History size={28} />
            </div>
            Payment Receipt Registry
          </h1>
          <p className="text-slate-500 font-medium">Search, reprint, and verify historical payment transactions.</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[40px] p-10 shadow-sm">
        <div className="max-w-3xl mx-auto space-y-6">
           <div className="relative group">
              <div className="absolute inset-0 bg-brand-primary/5 blur-2xl rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity" />
              <div className="relative flex items-center gap-3 bg-slate-50 border-2 border-slate-100 p-2 rounded-[32px] group-focus-within:border-brand-active0 focus-within:bg-white transition-all">
                <div className="pl-5 text-slate-400"><Search size={22} /></div>
                <input 
                  type="text" 
                  placeholder="Enter Receipt ID, Patient Name or MRN..."
                  className="flex-1 py-4 bg-transparent text-lg font-bold text-slate-800 outline-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button className="bg-slate-900 text-white px-8 py-4 rounded-[24px] font-black text-sm uppercase tracking-widest hover:bg-slate-800 transition-all">
                   Locate Records
                </button>
              </div>
           </div>
           <div className="flex items-center justify-center gap-4">
              <button className="px-5 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs font-black text-slate-500 hover:text-brand-primary hover:bg-brand-active transition-all flex items-center gap-2">
                 <Calendar size={14} /> Custom Date Range
              </button>
              <button className="px-5 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs font-black text-slate-500 hover:text-brand-primary hover:bg-brand-active transition-all flex items-center gap-2">
                 <Filter size={14} /> Filter by Mode
              </button>
           </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[40px] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="px-8 py-5">Receipt ID</th>
                <th className="px-8 py-5">Date & Time</th>
                <th className="px-8 py-5">Patient Details</th>
                <th className="px-8 py-5">Payment Details</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {MOCK_RECEIPTS.map(rc => (
                <tr key={rc.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <span className="text-xs font-mono font-black text-brand-primary bg-brand-active px-3 py-1.5 rounded-lg border border-brand-active uppercase tracking-tighter">
                      {rc.id}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-sm font-bold text-slate-700">{rc.date}</p>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-500 group-hover:bg-brand-primary group-hover:text-white transition-all shadow-sm">
                        {rc.patient.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800">{rc.patient}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{rc.mrn} • {rc.type} Billing</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-lg font-black text-slate-900 leading-none">₦{rc.amount.toLocaleString()}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                         {rc.mode === 'POS' ? <CreditCard size={10}/> : rc.mode === 'Cash' ? <Banknote size={10}/> : <Smartphone size={10}/>}
                         {rc.mode}
                       </span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-brand-primary hover:bg-brand-active transition-all shadow-sm" title="Reprint">
                        <Printer size={16} />
                      </button>
                      <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-brand-primary hover:bg-brand-active transition-all shadow-sm" title="Email">
                        <Mail size={16} />
                      </button>
                      <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-brand-primary hover:bg-brand-active transition-all shadow-sm" title="View PDF">
                        <Eye size={16} />
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

export default ReceiptHistory;
