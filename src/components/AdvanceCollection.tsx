
import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  Plus, 
  History, 
  Banknote, 
  CreditCard, 
  Smartphone, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight,
  User,
  Search,
  AlertCircle,
  Loader2,
  ChevronDown
} from 'lucide-react';
import { billingService } from '../services/billing.service';
import { patientService } from '../services/patient.service';
import { useNotification } from '../context/NotificationContext';

const AdvanceCollection: React.FC = () => {
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH');
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [paymentReference, setPaymentReference] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [searchMrn, setSearchMrn] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const { notify } = useNotification();

  useEffect(() => {
    const fetchMethods = async () => {
      try {
        const methods = await billingService.getPaymentMethods();
        setPaymentMethods(methods);
      } catch (err) {
        console.error("Failed to load payment methods", err);
      }
    };
    fetchMethods();
  }, []);

  const handleSearch = async () => {
    if (!searchMrn) return;
    setLoading(true);
    try {
      const patient = await patientService.getPatientByMrn(searchMrn);
      if (patient) {
        setSelectedPatient({
          name: `${patient.demographics.first_name} ${patient.demographics.last_name}`,
          mrn: patient.mrn
        });
        fetchHistory(patient.mrn);
      } else {
        notify("Patient not found", "error");
        setSelectedPatient(null);
      }
    } catch (err) {
      notify("Search failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (mrn: string) => {
    try {
      const res = await billingService.getAdvanceHistory(mrn);
      if (res.status === 'success' && res.message) {
        setBalance(parseFloat(res.message.total_balance));
        setHistory(res.message.transactions || []);
      }
    } catch (err) {
      console.error("Failed to fetch history", err);
    }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) {
      notify("Please select a patient first", "error");
      return;
    }
    
    const depAmount = parseFloat(amount);
    if (!depAmount || depAmount <= 0) {
      notify("Invalid amount", "error");
      return;
    }

    const selectedMethod = paymentMethods.find((m) => m.code === paymentMethod);
    const requiresRef = selectedMethod && selectedMethod.category !== "CASH";

    if (requiresRef && !paymentReference) {
      notify(`Payment reference required for ${selectedMethod.name}`, "error");
      return;
    }

    setProcessing(true);
    try {
      await billingService.collectAdvance({
        patient_mrn: selectedPatient.mrn,
        amount: depAmount,
        payment_method_id: selectedMethod?.id,
        payment_reference: paymentReference
      });
      
      notify("Deposit successful", "success");
      setAmount('');
      setPaymentReference('');
      fetchHistory(selectedPatient.mrn); // Refresh balance and history
    } catch (err: any) {
      notify(err.response?.data?.message || "Deposit failed", "error");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
             <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Wallet size={28} />
            </div>
            Advance Collection & Wallet
          </h1>
          <p className="text-slate-500 font-medium">Manage patient deposits and pre-payments.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Wallet Status */}
        <div className="lg:col-span-1 space-y-6">
          {/* Patient Card */}
          <div className="bg-white border border-slate-200 rounded-[40px] p-8 shadow-sm">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <User size={16} /> Identify Patient
            </h3>
            <div className="relative mb-6 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search MRN..." 
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:bg-white transition-all"
                  value={searchMrn}
                  onChange={(e) => setSearchMrn(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <button 
                onClick={handleSearch}
                disabled={loading}
                className="bg-slate-900 text-white p-3 rounded-xl disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" /> : <ArrowUpRight />}
              </button>
            </div>
            {selectedPatient && (
               <div className="p-4 bg-brand-active border border-brand-active rounded-2xl animate-in zoom-in-95">
                 <p className="text-sm font-black text-brand-primary">{selectedPatient.name}</p>
                 <p className="text-[10px] font-bold text-brand-active0 uppercase tracking-widest">{selectedPatient.mrn}</p>
               </div>
            )}
          </div>

          {/* Balance Card */}
          <div className="bg-gradient-to-br from-emerald-600 to-teal-800 rounded-[40px] p-8 text-white shadow-xl shadow-emerald-100 relative overflow-hidden group">
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-200 mb-1">Available Credit</p>
              <h2 className="text-4xl font-black tracking-tight">₦{balance.toLocaleString()}</h2>
              <div className="mt-8 flex items-center gap-2 text-[10px] font-bold text-emerald-200/60 uppercase tracking-widest">
                <Clock size={12} /> Last updated: Just now
              </div>
            </div>
            <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-white/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
          </div>

          {/* Top-up Form */}
          <div className="bg-white border border-slate-200 rounded-[40px] p-8 shadow-sm">
            <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
              <Plus size={20} className="text-emerald-600" />
              Collect Advance
            </h3>
            <form onSubmit={handleDeposit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Deposit Amount (₦)</label>
                <input 
                  required
                  type="number" 
                  placeholder="0.00"
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xl font-black text-slate-800 outline-none focus:bg-white focus:border-emerald-500 transition-all"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              
              <div className="space-y-4">
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors z-10">
                    <Wallet size={18} />
                  </div>
                  <select
                    value={paymentMethod}
                    onChange={(e) => {
                      setPaymentMethod(e.target.value);
                      const method = paymentMethods.find((m) => m.code === e.target.value);
                      if (method?.category === "CASH") setPaymentReference("");
                    }}
                    className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-800 outline-none focus:bg-white focus:border-emerald-500 transition-all appearance-none cursor-pointer"
                  >
                    {paymentMethods.length > 0 ? (
                      paymentMethods.map((method) => (
                        <option key={method.id} value={method.code}>
                          {method.name} ({method.category})
                        </option>
                      ))
                    ) : (
                      <option value="CASH">Cash Payment</option>
                    )}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none transition-transform group-focus-within:rotate-180">
                    <ChevronDown size={18} />
                  </div>
                </div>
              </div>

              {paymentMethods.find(m => m.code === paymentMethod)?.category !== "CASH" && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reference / Transaction ID</label>
                   <input 
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      placeholder="Enter Ref No."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:bg-white focus:border-emerald-500 transition-all"
                   />
                </div>
              )}

              <button 
                disabled={processing || !selectedPatient}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
              >
                {processing ? <Loader2 className="animate-spin mx-auto" /> : 'Confirm & Receipt'}
              </button>
            </form>
          </div>
        </div>

        {/* Right: History */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200 rounded-[40px] shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                <History size={20} className="text-brand-primary" />
                Wallet Ledger
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <th className="px-8 py-5">Date & Time</th>
                    <th className="px-8 py-5">Receipt #</th>
                    <th className="px-8 py-5">Method</th>
                    <th className="px-8 py-5">Collected By</th>
                    <th className="px-8 py-5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                        No transactions found
                      </td>
                    </tr>
                  ) : (
                    history.map((tx, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-8 py-5">
                          <p className="text-xs font-bold text-slate-700">{tx.deposit_date}</p>
                        </td>
                        <td className="px-8 py-5">
                          <p className="text-xs font-mono font-bold text-brand-primary uppercase">{tx.receipt_number}</p>
                        </td>
                        <td className="px-8 py-5">
                          <p className="text-[10px] font-black text-slate-500 uppercase">{tx.payment_method}</p>
                        </td>
                        <td className="px-8 py-5">
                          <p className="text-xs font-bold text-slate-700">{tx.collected_by || "-"}</p>
                        </td>
                        <td className="px-8 py-5 text-right font-black text-slate-800">
                          ₦{parseFloat(tx.amount).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-brand-active border border-brand-active p-6 rounded-[32px] flex items-start gap-4">
         <AlertCircle className="text-brand-primary flex-shrink-0" size={24} />
         <p className="text-xs text-brand-primary font-medium leading-relaxed uppercase tracking-tight">
          Advance payments are held in escrow for patient services. Unused balances are refundable upon final discharge verification by the Medical Director.
         </p>
      </div>
    </div>
  );
};

export default AdvanceCollection;
