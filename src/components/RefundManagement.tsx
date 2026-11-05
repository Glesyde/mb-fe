import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  RotateCcw, 
  Plus, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  X, 
  Receipt, 
  ArrowRight,
  Filter,
  Printer,
  ShieldAlert,
  ChevronRight,
  Loader2,
  Check,
  Ban,
  Wallet
} from 'lucide-react';
import { billingService } from '../services/billing.service';
import { useNotification } from '../context/NotificationContext';

const RefundManagement: React.FC = () => {
  const { notify } = useNotification();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Modals
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Request Form
  const [searchId, setSearchId] = useState('');
  const [foundInvoice, setFoundInvoice] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [refundAmount, setRefundAmount] = useState<number | ''>('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Review Form
  const [selectedRefund, setSelectedRefund] = useState<any>(null);
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [reviewNotes, setReviewNotes] = useState('');

  // Payout Form
  const [payoutMethod, setPayoutMethod] = useState(1);
  const [payoutReference, setPayoutReference] = useState('');
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);

  const fetchRefunds = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const res = await billingService.getRefundList(params);
      if (res.status === 'success' && res.data?.data) {
        setRequests(res.data.data);
      }
    } catch (err) {
      console.error(err);
      notify('Failed to load refunds', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, dateFrom, dateTo, notify]);

  useEffect(() => {
    fetchRefunds();
  }, [fetchRefunds]);

  useEffect(() => {
    billingService.getPaymentMethods().then(setPaymentMethods).catch(console.error);
  }, []);

  const handleSearchInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchId.trim()) return;
    setIsSearching(true);
    try {
      const res = await billingService.lookupInvoice(searchId.trim());
      if (res.status === 'success' && res.data) {
        setFoundInvoice(res.data);
        const maxRefund = res.data.financial_summary?.amount_paid || res.data.financial_summary?.gross_amount || 0;
        setRefundAmount(maxRefund);
      } else {
        notify('Invoice not found', 'error');
      }
    } catch (err: any) {
      console.error(err);
      notify(err.response?.data?.message || 'Failed to find invoice', 'error');
    } finally {
      setIsSearching(false);
    }
  };


  const submitRequest = async () => {
    if (!foundInvoice) return;
    setIsSubmitting(true);
    try {
      const payload = {
        invoice_id: foundInvoice.header.id,
        refund_amount: Number(refundAmount),
        reason
      };
      const res = await billingService.requestRefund(payload);
      if (res.status === 'success') {
        notify('Refund requested successfully', 'success');
        setShowRequestModal(false);
        resetRequestForm();
        fetchRefunds();
      } else {
        notify(res.message || 'Failed to request refund', 'error');
      }
    } catch (err: any) {
      console.error(err);
      notify(err.response?.data?.message || 'Failed to request refund', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };


  const submitPayout = async () => {
    if (!selectedRefund) return;
    setIsSubmitting(true);
    try {
      const payload = {
        refund_id: selectedRefund.id,
        refund_method_id: payoutMethod,
        payment_reference: payoutReference
      };
      const res = await billingService.payoutRefund(payload);
      if (res.status === 'success') {
        notify('Refund paid out successfully', 'success');
        setShowPayoutModal(false);
        setSelectedRefund(null);
        setPayoutReference('');
        fetchRefunds();
      } else {
        notify(res.message || 'Failed to payout refund', 'error');
      }
    } catch (err: any) {
      console.error(err);
      notify(err.response?.data?.message || 'Failed to payout refund', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetRequestForm = () => {
    setFoundInvoice(null);
    setRefundAmount('');
    setReason('');
    setSearchId('');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
             <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <RotateCcw size={28} />
            </div>
            Refund & Reversals
          </h1>
          <p className="text-slate-500 font-medium">Manage clinical cancellations and patient payment returns.</p>
        </div>
        <button 
          onClick={() => setShowRequestModal(true)}
          className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg active:scale-95"
        >
          <Plus size={20} /> Request New Refund
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-[40px] shadow-sm overflow-hidden flex flex-col">
        <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4 justify-between items-center">
           <h3 className="text-lg font-black text-slate-800 tracking-tight">Active Refund Registry</h3>
           <div className="flex items-center gap-3 w-full md:w-auto">
              <select 
                value={statusFilter} 
                onChange={e => setStatusFilter(e.target.value)}
                className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none"
              >
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="COMPLETED">Completed</option>
                <option value="REJECTED">Rejected</option>
              </select>
              <input 
                type="date" 
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none"
              />
              <span className="text-slate-400 font-bold">-</span>
              <input 
                type="date" 
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none"
              />
           </div>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center h-[300px]">
              <Loader2 className="animate-spin text-brand-primary" size={32} />
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-slate-400">
              <AlertCircle size={48} className="mb-4 opacity-50" />
              <p className="text-lg font-bold">No refunds found</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <th className="px-8 py-5">Patient & Invoice</th>
                  <th className="px-8 py-5">Refund Reason</th>
                  <th className="px-8 py-5">Amount</th>
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {requests.map(req => (
                  <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-5">
                      <p className="text-sm font-bold text-slate-800">{req.first_name} {req.last_name}</p>
                      <p className="text-[10px] font-mono font-bold text-brand-primary mt-1">{req.invoice_number} • {req.receipt_number || `REF-${req.id}`}</p>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-xs font-medium text-slate-600 max-w-xs truncate" title={req.reason}>{req.reason}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{new Date(req.requested_at).toLocaleString()}</p>
                    </td>
                    <td className="px-8 py-5 font-black text-slate-800">
                      ₦{parseFloat(req.refund_amount).toLocaleString()}
                    </td>
                    <td className="px-8 py-5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border
                        ${req.status_code === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                          req.status_code === 'REJECTED' ? 'bg-red-50 text-red-600 border-red-100' : 
                          req.status_code === 'APPROVED' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                          'bg-amber-50 text-amber-600 border-amber-100'}
                      `}>
                        {req.status_code === 'COMPLETED' ? <CheckCircle2 size={12}/> : <Clock size={12}/>}
                        {req.status_name}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right flex justify-end gap-2">
                      {req.status_code === 'APPROVED' && (
                        <button 
                          onClick={() => { setSelectedRefund(req); setShowPayoutModal(true); }}
                          className="px-3 py-1.5 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-lg border border-emerald-100 hover:bg-emerald-100 transition-colors"
                        >
                          Payout
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Refund Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => { setShowRequestModal(false); resetRequestForm(); }} />
          <div className="relative bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-rose-50/30">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-600 text-white rounded-xl shadow-lg shadow-rose-200">
                  <RotateCcw size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">New Refund Request</h2>
                  <p className="text-xs text-rose-600 font-bold uppercase tracking-widest">Partial or Full Reversal</p>
                </div>
              </div>
              <button onClick={() => { setShowRequestModal(false); resetRequestForm(); }} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto no-scrollbar">
              {!foundInvoice ? (
                <form onSubmit={handleSearchInvoice} className="space-y-4">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Search Receipt/Invoice ID</label>
                  <div className="relative flex items-center">
                    <Search className="absolute left-4 text-slate-400" size={20} />
                    <input 
                      autoFocus
                      type="text" 
                      placeholder="e.g. OP/2026/122"
                      className="w-full pl-12 pr-24 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:bg-white transition-all"
                      value={searchId}
                      onChange={(e) => setSearchId(e.target.value)}
                    />
                    <button 
                      type="submit"
                      disabled={isSearching || !searchId.trim()}
                      className="absolute right-2 px-4 py-2 bg-brand-primary text-white text-sm font-bold rounded-xl disabled:opacity-50"
                    >
                      {isSearching ? <Loader2 size={16} className="animate-spin" /> : 'Search'}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 italic">Only finalized and paid invoices can be refunded.</p>
                </form>
              ) : (
                <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                  <div className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-brand-primary text-white flex items-center justify-center font-bold">
                        {foundInvoice.patient_details.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Found Invoice</p>
                        <p className="text-sm font-black text-slate-800">{foundInvoice.patient_details.full_name} • {foundInvoice.header.reference}</p>
                      </div>
                    </div>
                    <button onClick={() => setFoundInvoice(null)} className="text-[10px] font-black text-brand-primary uppercase hover:underline">Change</button>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Invoice Items</h4>
                    <div className="space-y-2">
                      {foundInvoice.items.map((item: any) => (
                        <div 
                          key={item.id}
                          className="p-4 rounded-2xl border bg-white border-slate-100 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-slate-700">{item.display_name}</span>
                          </div>
                          <span className="text-sm font-black text-slate-800">
                            ₦{parseFloat(item.line_total || '0').toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Reason for Refund</label>
                    <textarea 
                      required
                      rows={2}
                      placeholder="e.g. Service cancelled by clinical team..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:bg-white transition-all resize-none"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </div>

                  <div className="bg-slate-900 rounded-[32px] p-6 text-white shadow-xl flex flex-col md:flex-row gap-4 items-center justify-between">
                     <div className="flex-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Refund Amount (₦)</p>
                        <input
                          type="number"
                          className="w-full max-w-[200px] bg-slate-800 border-none rounded-xl px-4 py-2 text-2xl font-black text-rose-500 outline-none focus:ring-2 focus:ring-rose-500"
                          value={refundAmount}
                          onChange={e => setRefundAmount(e.target.value ? Number(e.target.value) : '')}
                        />
                     </div>
                     <button 
                       disabled={!refundAmount || Number(refundAmount) <= 0 || !reason || isSubmitting}
                       onClick={submitRequest}
                       className="bg-white text-slate-900 px-8 py-3 rounded-2xl font-black uppercase text-xs hover:bg-rose-50 transition-all flex items-center gap-2 disabled:opacity-50"
                     >
                       {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                       Submit Request
                     </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}


      {/* Payout Refund Modal */}
      {showPayoutModal && selectedRefund && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50">
              <h3 className="text-lg font-black text-emerald-900 tracking-tight flex items-center gap-2">
                <Wallet className="text-emerald-600" size={20} />
                Process Payout
              </h3>
              <button onClick={() => setShowPayoutModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-4 bg-emerald-500 text-white rounded-xl shadow-inner">
                <p className="text-xs font-bold uppercase text-emerald-100 mb-1">Amount to Pay</p>
                <p className="text-3xl font-black">₦{parseFloat(selectedRefund.refund_amount).toLocaleString()}</p>
                <p className="text-sm font-medium text-emerald-50 mt-2">To: {selectedRefund.first_name} {selectedRefund.last_name}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={payoutMethod}
                  onChange={e => setPayoutMethod(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 text-sm font-medium"
                >
                  {paymentMethods.map(method => (
                    <option key={method.id} value={method.id}>{method.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Payment Reference</label>
                <input
                  type="text"
                  value={payoutReference}
                  onChange={e => setPayoutReference(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 text-sm font-medium"
                  placeholder="e.g. Bank Ref / Voucher ID"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50">
              <button onClick={() => setShowPayoutModal(false)} className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={submitPayout}
                disabled={isSubmitting || !payoutReference.trim()}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                Confirm Payout
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-amber-50 border border-amber-100 p-8 rounded-[40px] flex items-start gap-4">
         <div className="p-3 bg-white text-amber-600 rounded-2xl shadow-sm border border-amber-100 flex-shrink-0">
            <ShieldAlert size={24} />
         </div>
         <div>
            <h4 className="text-lg font-black text-amber-900 tracking-tight">Financial Compliance Alert</h4>
            <p className="text-sm text-amber-700/80 leading-relaxed font-medium mt-1">
              All refunds exceeding ₦50,000 require secondary authorization from the Audit Department. Processed refunds are automatically logged in the Daily Liquidity Report.
            </p>
         </div>
      </div>
    </div>
  );
};

export default RefundManagement;

