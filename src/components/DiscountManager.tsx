
import React, { useState, useEffect } from 'react';
import { 
  Tag, 
  Search, 
  CheckCircle2, 
  ShieldAlert, 
  Filter, 
  User, 
  AlertCircle,
  ChevronRight,
  MoreVertical,
  XCircle,
  FileText,
  X,
  CreditCard,
  Phone,
  Calendar,
  Activity,
  Loader2
} from 'lucide-react';
import { billingService } from '../services/billing.service';
import { useNotification } from '../context/NotificationContext';

interface DiscountEntry {
  id: string;
  patient: string;
  invoice: string;
  originalAmount: number;
  discountAmount: number;
  reason: string;
  requestedBy: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  raw: any;
}

const DiscountManager: React.FC = () => {
  const [logs, setLogs] = useState<DiscountEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isApproving, setIsApproving] = useState<string | null>(null);
  const [isRejecting, setIsRejecting] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<DiscountEntry | null>(null);
  const [rejectModal, setRejectModal] = useState<DiscountEntry | null>(null);
  const { notify } = useNotification();
  
  const [filters, setFilters] = useState({
    status: '',
    discount_type: '',
    date_from: ''
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.patient.toLowerCase().includes(q) ||
      log.invoice.toLowerCase().includes(q) ||
      log.requestedBy.toLowerCase().includes(q) ||
      (log.raw?.mrn && String(log.raw.mrn).toLowerCase().includes(q))
    );
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDiscounts();
    }, 500);
    return () => clearTimeout(timer);
  }, [filters]);

  const fetchDiscounts = async () => {
    setIsLoading(true);
    try {
      const res = await billingService.getDiscountList(filters);
      // Determine array of data from response
      const dataArr = res?.data?.data || res?.data || res || [];
      if (Array.isArray(dataArr)) {
        const mapped: DiscountEntry[] = dataArr.map((d: any) => ({
          id: (d.discount_id || d.id || 0).toString(),
          patient: d.patient_name || "Unknown Patient",
          invoice: d.invoice_number || "No Invoice",
          originalAmount: Number(d.invoice_gross) || 0,
          discountAmount: Number(d.discount_amount) || 0,
          reason: d.reason || "No Reason",
          requestedBy: d.requested_by || d.created_by_name || "Unknown",
          status: d.status || 'PENDING',
          raw: d
        }));
        setLogs(mapped);
      }
    } catch (err) {
      console.error("Failed to load discounts", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    setIsApproving(id);
    try {
      const res = await billingService.approveDiscount({ discount_id: parseInt(id) });
      setLogs(prev => prev.map(log => log.id === id ? { ...log, status: 'APPROVED' } : log));
      notify(res?.message || "Discount approved and applied to invoice", "success");
    } catch (err: any) {
      notify(err.response?.data?.message || "Failed to approve discount", "error");
    } finally {
      setIsApproving(null);
    }
  };

  const handleReject = async (id: string) => {
    setIsRejecting(id);
    try {
      const res = await billingService.rejectDiscount({ discount_id: parseInt(id) });
      setLogs(prev => prev.map(log => log.id === id ? { ...log, status: 'REJECTED' } : log));
      notify(res?.message || "Discount request rejected", "success");
      setRejectModal(null);
    } catch (err: any) {
      notify(err.response?.data?.message || "Failed to reject discount", "error");
    } finally {
      setIsRejecting(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
             <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Tag size={28} />
            </div>
            Discount & Waiver Registry
          </h1>
          <p className="text-slate-500 font-medium">Audit and authorize financial concessions on patient bills.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex flex-col justify-between">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending Approvals</p>
          <p className="text-3xl font-black text-amber-500 mt-2">{filteredLogs.filter(l => l.status === 'PENDING').length}</p>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex flex-col justify-between">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Approved</p>
          <p className="text-3xl font-black text-emerald-500 mt-2">{filteredLogs.filter(l => l.status === 'APPROVED').length}</p>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex flex-col justify-between">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Amt Waived (₦)</p>
          <p className="text-3xl font-black text-rose-500 mt-2">
            {filteredLogs.filter(l => l.status === 'APPROVED').reduce((acc, curr) => acc + curr.discountAmount, 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex flex-col justify-between">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Avg Waiver %</p>
          <p className="text-3xl font-black text-slate-800 mt-2">
            {filteredLogs.length > 0 
              ? (filteredLogs.reduce((acc, curr) => acc + (curr.originalAmount > 0 ? (curr.discountAmount / curr.originalAmount) : 0), 0) / filteredLogs.length * 100).toFixed(1) + "%" 
              : "0%"}
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-4 w-full">
         <div className="relative flex-1 w-full">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
             <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search user, action or IP..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-full outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-sm font-medium text-slate-700"
             />
         </div>
         <div className="flex items-center gap-2">
             <select 
               value={filters.status}
               onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
               className="px-4 py-2.5 bg-white border border-slate-200 rounded-full outline-none font-bold text-slate-600 text-[11px] uppercase tracking-wider focus:border-indigo-500 transition-colors cursor-pointer"
             >
               <option value="">All Actions</option>
               <option value="PENDING">Pending</option>
               <option value="APPROVED">Approved</option>
               <option value="REJECTED">Rejected</option>
             </select>
             <select 
               value={filters.discount_type}
               onChange={(e) => setFilters(prev => ({ ...prev, discount_type: e.target.value }))}
               className="px-4 py-2.5 bg-white border border-slate-200 rounded-full outline-none font-bold text-slate-600 text-[11px] uppercase tracking-wider focus:border-indigo-500 transition-colors cursor-pointer"
             >
               <option value="">All Types</option>
               <option value="PERCENTAGE">Percentage</option>
               <option value="FLAT">Flat</option>
               <option value="WAIVER">Waiver</option>
             </select>
             <input 
               type="date"
               value={filters.date_from}
               onChange={(e) => setFilters(prev => ({ ...prev, date_from: e.target.value }))}
               className="px-4 py-2.5 bg-white border border-slate-200 rounded-full outline-none font-bold text-slate-600 text-[11px] uppercase tracking-wider focus:border-indigo-500 transition-colors"
             />
         </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[40px] shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
           <h3 className="text-lg font-black text-slate-800">Concession Authorization Log</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="px-8 py-5">Patient & Invoice</th>
                <th className="px-8 py-5">Reason / Justification</th>
                <th className="px-8 py-5">Waiver Details</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <Loader2 className="animate-spin text-indigo-500" size={32} />
                      <p className="text-sm font-medium text-slate-400">Fetching records...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-16 text-center text-slate-500 font-medium">
                    No records found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <p className="text-sm font-black text-slate-800">{log.patient}</p>
                    <p className="text-[10px] font-mono font-bold text-brand-primary mt-1 uppercase">{log.invoice} • {log.id}</p>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-xs font-medium text-slate-600 leading-relaxed max-w-xs">{log.reason}</p>
                    <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold flex items-center gap-1"><User size={10}/> Req by: {log.requestedBy}</p>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-sm font-black text-rose-600">-₦{log.discountAmount.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">From ₦{log.originalAmount.toLocaleString()}</p>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border
                      ${log.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : log.status === 'REJECTED' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-amber-50 text-amber-600 border-amber-100'}
                    `}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                       {log.status === 'PENDING' && (
                         <>
                           <button
                            onClick={() => handleApprove(log.id)}
                            disabled={isApproving === log.id || isRejecting === log.id}
                            className="px-4 py-1.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 shadow-md shadow-indigo-100 disabled:opacity-50 flex items-center gap-2"
                           >
                             {isApproving === log.id && <Loader2 size={10} className="animate-spin" />}
                             Authorize
                           </button>
                           <button
                            onClick={() => setRejectModal(log)}
                            disabled={isApproving === log.id || isRejecting === log.id}
                            className="px-4 py-1.5 bg-white text-red-600 border border-red-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 disabled:opacity-50 flex items-center gap-2"
                           >
                             {isRejecting === log.id ? <Loader2 size={10} className="animate-spin" /> : <XCircle size={10} />}
                             Reject
                           </button>
                         </>
                       )}
                       <button onClick={() => setSelectedLog(log)} className="p-2 text-slate-300 hover:text-slate-600 transition-all"><MoreVertical size={18}/></button>
                    </div>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-100 p-8 rounded-[40px] flex items-start gap-4 shadow-sm shadow-amber-100/50">
         <div className="p-3 bg-white text-amber-600 rounded-2xl shadow-sm border border-amber-100 flex-shrink-0">
            <ShieldAlert size={24} />
         </div>
         <div>
            <h4 className="text-lg font-black text-amber-900 tracking-tight">Override Policy Alert</h4>
            <p className="text-sm text-amber-700/80 leading-relaxed font-medium mt-1">
              Discounts exceeding 15% of the total invoice value or absolute amounts over ₦20,000 are flagged for secondary review by the Chief Accountant or Hospital Director.
            </p>
         </div>
      </div>

      {selectedLog && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-slate-50 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 bg-white border-b border-slate-200 flex items-center justify-between">
               <div>
                 <h2 className="text-2xl font-black text-slate-800">Discount Details</h2>
                 <p className="text-sm text-slate-500 font-medium">Reference: {selectedLog.id} • {selectedLog.invoice}</p>
               </div>
               <button onClick={() => setSelectedLog(null)} className="p-2 bg-slate-100 text-slate-500 hover:text-slate-800 rounded-full transition-colors">
                 <X size={20} />
               </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
               {/* Summary Cards */}
               <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Requested By</p>
                    <p className="text-sm font-bold text-slate-800">{selectedLog.raw?.requested_by || selectedLog.raw?.created_by_name || 'System'}</p>
                    <p className="text-xs text-slate-500 mt-1">{selectedLog.raw?.created_at}</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${selectedLog.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : selectedLog.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      {selectedLog.status}
                    </span>
                    {selectedLog.raw?.approved_by && (
                       <p className="text-xs text-slate-500 mt-1">by {selectedLog.raw.approved_by}</p>
                    )}
                  </div>
               </div>

               {/* Patient Info */}
               <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                 <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                    <User size={16} className="text-slate-400" />
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Patient Information</h3>
                 </div>
                 <div className="p-5 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Name</p>
                      <p className="font-bold text-slate-800">{selectedLog.raw?.patient_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium">MRN</p>
                      <p className="font-bold text-slate-800">{selectedLog.raw?.mrn}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Gender & DOB</p>
                      <p className="font-bold text-slate-800">{selectedLog.raw?.gender} • {selectedLog.raw?.date_of_birth}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Phone</p>
                      <p className="font-bold text-slate-800">{selectedLog.raw?.phone}</p>
                    </div>
                 </div>
               </div>

               {/* Invoice Info */}
               <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                 <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                    <CreditCard size={16} className="text-slate-400" />
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Invoice Details</h3>
                 </div>
                 <div className="p-5">
                    <div className="flex justify-between items-center mb-4">
                       <p className="text-xs text-slate-500 font-bold uppercase">Waiver Applied</p>
                       <p className="text-lg font-black text-rose-600">-₦{Number(selectedLog.raw?.discount_amount).toLocaleString()}</p>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                         <span className="text-slate-500">Gross Total:</span>
                         <span className="font-bold text-slate-800">₦{Number(selectedLog.raw?.invoice_gross).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                         <span className="text-slate-500">Net Total (After Discount):</span>
                         <span className="font-bold text-slate-800">₦{Number(selectedLog.raw?.invoice_net).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm pt-3 border-t border-slate-100">
                         <span className="text-slate-500 font-medium">Reason for Waiver:</span>
                         <span className="font-bold text-slate-800 text-right max-w-[60%]">{selectedLog.raw?.reason}</span>
                      </div>
                    </div>
                 </div>
               </div>

               {/* Line Items */}
               {selectedLog.raw?.invoice_items?.lines?.length > 0 && (
                 <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                   <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
                      <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Line Items</h3>
                   </div>
                   <div className="divide-y divide-slate-100">
                      {selectedLog.raw.invoice_items.lines.map((line: any, idx: number) => (
                        <div key={idx} className="p-4 flex justify-between items-center">
                           <div className="flex-1">
                             <p className="text-sm font-bold text-slate-800">{line.description || line.service_code}</p>
                             <p className="text-[10px] font-medium text-slate-400 mt-1 uppercase tracking-wider">{line.quantity} x ₦{Number(line.unit_price).toLocaleString()}</p>
                           </div>
                           <div className="text-right">
                             <p className="text-sm font-black text-slate-800">₦{Number(line.line_total).toLocaleString()}</p>
                             {Number(line.item_discount_amount) > 0 && (
                               <p className="text-xs text-rose-500 font-bold mt-0.5">-₦{Number(line.item_discount_amount).toLocaleString()} disc</p>
                             )}
                           </div>
                        </div>
                      ))}
                   </div>
                 </div>
               )}
            </div>

            {selectedLog.status === 'PENDING' && (
              <div className="p-6 bg-white border-t border-slate-200 flex gap-3">
                <button
                  onClick={() => handleApprove(selectedLog.id)}
                  disabled={isApproving === selectedLog.id || isRejecting === selectedLog.id}
                  className="flex-1 py-4 bg-indigo-600 text-white rounded-xl text-sm font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isApproving === selectedLog.id && <Loader2 size={16} className="animate-spin" />}
                  Authorize Concession
                </button>
                <button
                  onClick={() => setRejectModal(selectedLog)}
                  disabled={isApproving === selectedLog.id || isRejecting === selectedLog.id}
                  className="flex-1 py-4 bg-white text-red-600 border border-red-200 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isRejecting === selectedLog.id ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                  Reject
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reject Confirmation Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                <AlertCircle className="text-amber-500" size={16} />
                Reject Discount Request
              </h3>
              <button
                onClick={() => setRejectModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-4 space-y-1">
              <p className="text-sm text-slate-600">
                This will reject the discount request for <span className="font-semibold text-slate-800">{rejectModal.invoice}</span>
                {" "}(-₦{rejectModal.discountAmount.toLocaleString()}).
              </p>
            </div>
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-2 justify-end">
              <button
                onClick={() => setRejectModal(null)}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReject(rejectModal.id)}
                disabled={isRejecting === rejectModal.id}
                className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-black hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRejecting === rejectModal.id ? "Rejecting..." : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscountManager;
