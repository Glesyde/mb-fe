
import React, { useState } from 'react';
import { 
  Wrench, 
  Search, 
  Receipt, 
  Ban, 
  Edit3, 
  ShieldAlert, 
  CheckCircle2, 
  AlertCircle,
  X,
  History,
  Trash2,
  Save,
  ArrowRight
} from 'lucide-react';

interface Invoice {
  id: string;
  patient: string;
  date: string;
  total: number;
  items: { id: string, name: string, price: number, qty: number }[];
}

const MOCK_INVOICE: Invoice = {
  id: 'INV-77281-25',
  patient: 'Sarah Jenkins',
  date: '22 May, 2025',
  total: 22000,
  items: [
    { id: '1', name: 'Specialist Consultation', price: 15000, qty: 1 },
    { id: '2', name: 'Amoxicillin 500mg', price: 3500, qty: 2 },
  ]
};

const BillAdjustment: React.FC = () => {
  const [query, setQuery] = useState('');
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [mode, setMode] = useState<'view' | 'void' | 'modify'>('view');
  const [reason, setReason] = useState('');
  const [searching, setSearching] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearching(true);
    setTimeout(() => {
      setInvoice(MOCK_INVOICE);
      setSearching(false);
    }, 600);
  };

  const handleAction = () => {
    if (!reason) {
      alert("A reason for adjustment is mandatory for the audit trail.");
      return;
    }
    alert(`${mode === 'void' ? 'Invoice Voided' : 'Bill Adjusted'} successfully.`);
    setInvoice(null);
    setMode('view');
    setReason('');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
             <div className="p-2 bg-brand-active text-brand-primary rounded-xl">
              <Wrench size={28} />
            </div>
            Bill Adjustment Tool
          </h1>
          <p className="text-slate-500 font-medium">Rectify ledger errors or void incorrectly generated finalized invoices.</p>
        </div>
      </div>

      {/* Search Header */}
      <div className="bg-white border border-slate-200 rounded-[40px] p-10 shadow-sm">
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto space-y-4">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-center block">Search Finalized Invoice ID</label>
          <div className="relative flex items-center gap-3 p-2 bg-slate-50 border-2 border-slate-100 rounded-3xl focus-within:border-brand-active0 transition-all">
            <div className="pl-4 text-slate-400"><Search size={20} /></div>
            <input 
              type="text" 
              placeholder="e.g. INV-77281-25"
              className="flex-1 py-3 bg-transparent text-lg font-bold text-slate-800 outline-none"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button 
              disabled={searching || !query}
              className="bg-slate-900 text-white px-8 py-4 rounded-[20px] font-black text-sm uppercase tracking-widest hover:bg-slate-800 disabled:opacity-50 transition-all"
            >
              {searching ? 'Locating...' : 'Load Invoice'}
            </button>
          </div>
        </form>
      </div>

      {invoice && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom-6 duration-500">
          <div className="lg:col-span-2 space-y-6">
            {/* Invoice Detail Card */}
            <div className="bg-white border border-slate-200 rounded-[40px] shadow-sm overflow-hidden">
               <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-brand-primary shadow-sm border border-slate-100">
                        <Receipt size={24} />
                     </div>
                     <div>
                        <h3 className="font-black text-slate-800">{invoice.patient}</h3>
                        <p className="text-xs text-slate-500 font-medium">{invoice.id} • Finalized on {invoice.date}</p>
                     </div>
                  </div>
                  <div className="text-right">
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Value</p>
                     <p className="text-2xl font-black text-slate-900">₦{invoice.total.toLocaleString()}</p>
                  </div>
               </div>

               <div className="p-8">
                  <table className="w-full text-left">
                    <thead>
                       <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                          <th className="pb-4 px-2">Service Description</th>
                          <th className="pb-4 px-2 text-center">Qty</th>
                          <th className="pb-4 px-2 text-right">Price</th>
                          <th className="pb-4 px-2 text-right">Total</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {invoice.items.map(item => (
                         <tr key={item.id} className="group">
                            <td className="py-4 px-2">
                               <p className="text-sm font-bold text-slate-700">{item.name}</p>
                            </td>
                            <td className="py-4 px-2 text-center text-sm font-medium text-slate-500">{item.qty}</td>
                            <td className="py-4 px-2 text-right text-sm font-medium text-slate-500">₦{item.price.toLocaleString()}</td>
                            <td className="py-4 px-2 text-right text-sm font-black text-slate-900">₦{(item.price * item.qty).toLocaleString()}</td>
                         </tr>
                       ))}
                    </tbody>
                  </table>
               </div>
            </div>

            {/* Adjustment Controls */}
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setMode('modify')}
                className={`flex flex-col items-center justify-center p-8 rounded-[32px] border-2 transition-all gap-3
                  ${mode === 'modify' ? 'bg-brand-active border-brand-primary text-brand-primary shadow-lg shadow-brand-active' : 'bg-white border-slate-100 text-slate-400 hover:border-brand-active'}
                `}
              >
                <div className={`p-4 rounded-2xl ${mode === 'modify' ? 'bg-brand-primary text-white' : 'bg-slate-50'}`}>
                   <Edit3 size={28} />
                </div>
                <span className="font-black uppercase tracking-widest text-xs">Modify Line Items</span>
              </button>
              <button 
                onClick={() => setMode('void')}
                className={`flex flex-col items-center justify-center p-8 rounded-[32px] border-2 transition-all gap-3
                  ${mode === 'void' ? 'bg-rose-50 border-rose-600 text-rose-600 shadow-lg shadow-rose-100' : 'bg-white border-slate-100 text-slate-400 hover:border-rose-200'}
                `}
              >
                <div className={`p-4 rounded-2xl ${mode === 'void' ? 'bg-rose-600 text-white' : 'bg-slate-50'}`}>
                   <Ban size={28} />
                </div>
                <span className="font-black uppercase tracking-widest text-xs">Void Full Invoice</span>
              </button>
            </div>
          </div>

          <div className="space-y-6">
             <div className="bg-slate-900 rounded-[40px] p-8 text-white shadow-xl flex flex-col h-full">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 bg-amber-500 rounded-xl">
                    <ShieldAlert size={20} className="text-slate-900" />
                  </div>
                  <h3 className="text-lg font-bold">Audit Authorization</h3>
                </div>

                <div className="space-y-6 flex-1">
                   <div className="space-y-3">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Reason for Adjustment *</label>
                      <textarea 
                        rows={5}
                        placeholder="Detailed explanation of the error or requirement for modification..."
                        className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-3xl text-sm font-medium outline-none focus:border-white/20 transition-all resize-none"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                      />
                   </div>

                   <div className="p-5 bg-white/5 border border-white/10 rounded-3xl space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 uppercase font-bold">Logged User</span>
                        <span className="font-black">Admin Jane</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 uppercase font-bold">Timestamp</span>
                        <span className="font-black">Auto-generated</span>
                      </div>
                   </div>
                </div>

                <button 
                  disabled={mode === 'view' || !reason}
                  onClick={handleAction}
                  className={`w-full mt-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 disabled:opacity-30
                    ${mode === 'void' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-brand-primary hover:bg-brand-primary'}
                  `}
                >
                  {mode === 'void' ? <Ban size={18} /> : <Save size={18} />}
                  {mode === 'void' ? 'Confirm Void Session' : mode === 'modify' ? 'Apply Adjustments' : 'Select Action'}
                </button>
             </div>

             <div className="bg-brand-active border border-brand-active p-6 rounded-[32px] flex items-start gap-4">
                <AlertCircle className="text-brand-primary flex-shrink-0" size={24} />
                <p className="text-[10px] text-brand-primary font-bold leading-relaxed uppercase">
                  Adjustments are irreversible once authorized. A credit note will be automatically generated if the original amount changes.
                </p>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillAdjustment;
