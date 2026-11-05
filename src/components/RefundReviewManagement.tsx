import React, { useState, useEffect, useCallback } from 'react';
import { 
  RotateCcw, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  X, 
  Loader2,
  Check,
  Ban,
  Filter
} from 'lucide-react';
import { billingService } from '../services/billing.service';
import { useNotification } from '../context/NotificationContext';

const RefundReviewManagement: React.FC = () => {
  const { notify } = useNotification();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Modals
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('PENDING'); // Default to PENDING
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Review Form
  const [selectedRefund, setSelectedRefund] = useState<any>(null);
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      } else {
        setRequests([]);
      }
    } catch (err) {
      console.error(err);
      notify('Failed to load refunds', 'error');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, dateFrom, dateTo, notify]);

  useEffect(() => {
    fetchRefunds();
  }, [fetchRefunds]);

  const submitReview = async () => {
    if (!selectedRefund) return;
    setIsSubmitting(true);
    try {
      const payload = {
        refund_id: selectedRefund.id,
        action: reviewAction,
        notes: reviewNotes
      };
      const res = await billingService.reviewRefund(payload);
      if (res.status === 'success') {
        notify(`Refund ${reviewAction.toLowerCase()}d successfully`, 'success');
        setShowReviewModal(false);
        setSelectedRefund(null);
        setReviewNotes('');
        fetchRefunds();
      } else {
        notify(res.message || 'Failed to review refund', 'error');
      }
    } catch (err: any) {
      console.error(err);
      notify(err.response?.data?.message || 'Failed to review refund', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
             <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <RotateCcw size={28} />
            </div>
            Refund Reviews
          </h1>
          <p className="text-slate-500 font-medium">Review and authorize patient refund requests.</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[40px] shadow-sm overflow-hidden flex flex-col">
        <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4 justify-between items-center">
           <h3 className="text-lg font-black text-slate-800 tracking-tight">Refund Authorization Registry</h3>
           <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl">
                <Filter size={16} className="text-slate-400" />
                <select 
                  value={statusFilter} 
                  onChange={e => setStatusFilter(e.target.value)}
                  className="text-sm font-bold text-slate-700 outline-none bg-transparent"
                >
                  <option value="">All Statuses</option>
                  <option value="PENDING">Pending Approval</option>
                  <option value="APPROVED">Approved</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>
              <input 
                type="date" 
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none"
              />
              <span className="text-slate-400 font-bold">-</span>
              <input 
                type="date" 
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none"
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
              <p className="text-lg font-bold">No refunds found for the selected criteria.</p>
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
                      {req.status_code === 'PENDING' && (
                        <button 
                          onClick={() => { setSelectedRefund(req); setShowReviewModal(true); }}
                          className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-sm shadow-blue-200 hover:bg-blue-700 transition-colors"
                        >
                          Review Request
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

      {/* Review Refund Modal */}
      {showReviewModal && selectedRefund && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-blue-50">
              <h3 className="text-lg font-black text-blue-900 tracking-tight flex items-center gap-2">
                <RotateCcw className="text-blue-600" size={20} />
                Review Refund Request
              </h3>
              <button onClick={() => setShowReviewModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-xs text-slate-500 font-bold uppercase mb-1">Refund Details</p>
                <p className="text-sm font-bold text-slate-800">Patient: {selectedRefund.first_name} {selectedRefund.last_name}</p>
                <p className="text-sm font-bold text-slate-800">Invoice: {selectedRefund.invoice_number}</p>
                <p className="text-xl font-black text-rose-600 mt-2">Amount: ₦{parseFloat(selectedRefund.refund_amount).toLocaleString()}</p>
                <p className="text-sm text-slate-600 mt-2">Reason: {selectedRefund.reason}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Authorization Action</label>
                <div className="flex gap-4">
                  <label className={`flex-1 p-3 rounded-xl border flex items-center justify-center gap-2 cursor-pointer transition-colors ${reviewAction === 'APPROVE' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-slate-200 text-slate-600'}`}>
                    <input type="radio" name="action" className="hidden" checked={reviewAction === 'APPROVE'} onChange={() => setReviewAction('APPROVE')} />
                    <Check size={16} /> <span className="font-bold text-sm">Approve</span>
                  </label>
                  <label className={`flex-1 p-3 rounded-xl border flex items-center justify-center gap-2 cursor-pointer transition-colors ${reviewAction === 'REJECT' ? 'bg-rose-50 border-rose-500 text-rose-700' : 'bg-white border-slate-200 text-slate-600'}`}>
                    <input type="radio" name="action" className="hidden" checked={reviewAction === 'REJECT'} onChange={() => setReviewAction('REJECT')} />
                    <Ban size={16} /> <span className="font-bold text-sm">Reject</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Review Notes</label>
                <textarea
                  value={reviewNotes}
                  onChange={e => setReviewNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 text-sm"
                  rows={3}
                  placeholder="e.g. Verified and approved..."
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50">
              <button onClick={() => setShowReviewModal(false)} className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={submitReview}
                disabled={isSubmitting || !reviewNotes.trim()}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                Confirm Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RefundReviewManagement;
