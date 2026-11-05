import React, { useState, useEffect } from 'react';
import { X, Activity, FileText, DollarSign, History, AlertCircle, Loader2, RotateCcw, CheckCircle2 } from 'lucide-react';
import { billingService } from '../services/billing.service';

interface AuditBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  encounterNumber: string;
}

const AuditBillModal: React.FC<AuditBillModalProps> = ({ isOpen, onClose, encounterNumber }) => {
  const [loading, setLoading] = useState(true);
  const [auditData, setAuditData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'ORDERS' | 'FINANCIAL' | 'DISCHARGE' | 'SYSTEM'>('ORDERS');

  useEffect(() => {
    if (isOpen && encounterNumber) {
      loadAuditData();
    }
  }, [isOpen, encounterNumber]);

  const loadAuditData = async () => {
    setLoading(true);
    try {
      const res = await billingService.getAuditTrail(encounterNumber);
      if (res.status === 'success') {
        setAuditData(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const formatDate = (d: string) => new Date(d).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
  const formatCurrency = (amt: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amt);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-[95vw] max-w-6xl h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="bg-slate-800 text-white p-6 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-black flex items-center gap-2">
              <Activity className="text-blue-400" /> Encounter Audit Log
            </h2>
            <p className="text-slate-400 text-sm font-medium mt-1">Tracking all clinical and financial activity for {encounterNumber}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full transition-colors text-slate-300">
            <X size={24} />
          </button>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <Loader2 size={40} className="animate-spin text-blue-500 mb-4" />
            <p className="font-bold">Aggregating Audit Trail...</p>
          </div>
        ) : !auditData ? (
          <div className="flex-1 flex items-center justify-center text-red-500 font-bold">Failed to load audit data.</div>
        ) : (
          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar Navigation */}
            <div className="w-64 bg-slate-50 border-r border-slate-200 p-4 flex flex-col gap-2 shrink-0">
              <button onClick={() => setActiveTab('ORDERS')} className={`flex items-center gap-3 p-4 rounded-xl text-sm font-bold transition-all ${activeTab === 'ORDERS' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-200'}`}>
                <FileText size={18} /> Orders & Cancellations
              </button>
              <button onClick={() => setActiveTab('FINANCIAL')} className={`flex items-center gap-3 p-4 rounded-xl text-sm font-bold transition-all ${activeTab === 'FINANCIAL' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-200'}`}>
                <DollarSign size={18} /> Financial Ledger
              </button>
              <button onClick={() => setActiveTab('DISCHARGE')} className={`flex items-center gap-3 p-4 rounded-xl text-sm font-bold transition-all ${activeTab === 'DISCHARGE' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-200'}`}>
                <AlertCircle size={18} /> Discharge Workflow
              </button>
              <button onClick={() => setActiveTab('SYSTEM')} className={`flex items-center gap-3 p-4 rounded-xl text-sm font-bold transition-all ${activeTab === 'SYSTEM' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-200'}`}>
                <History size={18} /> Deep System Logs
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 bg-white p-6 overflow-y-auto">
              
              {/* ORDERS TAB */}
              {activeTab === 'ORDERS' && (
                <div>
                  <h3 className="text-lg font-black text-slate-800 border-b border-slate-200 pb-2 mb-4">Orders & Service Cancellations</h3>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-500 text-xs uppercase tracking-wider">
                        <th className="p-3 font-black">Date</th>
                        <th className="p-3 font-black">Service Name</th>
                        <th className="p-3 font-black">Type</th>
                        <th className="p-3 font-black">Status</th>
                        <th className="p-3 font-black">Ordered By</th>
                        <th className="p-3 font-black">Cancelled By / Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {auditData.orders_audit.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-slate-400">No orders found.</td></tr>}
                      {auditData.orders_audit.map((order: any) => (
                        <tr key={order.order_id} className="hover:bg-slate-50">
                          <td className="p-3 text-xs whitespace-nowrap">{formatDate(order.ordered_at)}</td>
                          <td className="p-3 font-bold text-slate-800">{order.service_name}</td>
                          <td className="p-3 text-xs font-bold text-slate-500">{order.order_type}</td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded text-[10px] font-black ${order.order_status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                              {order.order_status}
                            </span>
                          </td>
                          <td className="p-3 text-slate-600">{order.ordered_by_name}</td>
                          <td className="p-3">
                            {order.order_status === 'CANCELLED' ? (
                              <div className="text-red-500 text-xs">
                                <b>{order.cancelled_by_name}</b> at {formatDate(order.cancelled_at)}<br/>
                                <span className="italic text-slate-400">Reason: {order.notes || 'N/A'}</span>
                              </div>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* FINANCIAL TAB */}
              {activeTab === 'FINANCIAL' && (
                <div>
                  <h3 className="text-lg font-black text-slate-800 border-b border-slate-200 pb-2 mb-4">Financial Ledger Trail</h3>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-500 text-xs uppercase tracking-wider">
                        <th className="p-3 font-black">Date</th>
                        <th className="p-3 font-black">Action Type</th>
                        <th className="p-3 font-black">Reference</th>
                        <th className="p-3 font-black text-right">Amount</th>
                        <th className="p-3 font-black">Performed By</th>
                        <th className="p-3 font-black">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {auditData.financial_ledger.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-slate-400">No financial transactions found.</td></tr>}
                      {auditData.financial_ledger.map((fin: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="p-3 text-xs whitespace-nowrap">{formatDate(fin.action_date)}</td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded text-[10px] font-black ${fin.action_type.includes('CANCELLED') || fin.action_type.includes('REVERSAL') ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                              {fin.action_type.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="p-3 font-bold text-slate-700">{fin.reference}</td>
                          <td className="p-3 text-right font-black text-slate-800">{formatCurrency(fin.amount)}</td>
                          <td className="p-3 text-slate-600">{fin.performed_by || 'System'}</td>
                          <td className="p-3 text-xs text-slate-500 italic max-w-xs truncate" title={fin.remarks}>{fin.remarks || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* DISCHARGE TAB */}
              {activeTab === 'DISCHARGE' && (
                <div>
                  <h3 className="text-lg font-black text-slate-800 border-b border-slate-200 pb-2 mb-4">Discharge Workflow Trail</h3>
                  <div className="space-y-4">
                    {auditData.discharge_timeline.length === 0 && <p className="text-slate-400 text-center py-4">No discharge activity recorded.</p>}
                    {auditData.discharge_timeline.map((event: any, i: number) => (
                      <div key={i} className="flex gap-4 p-4 border border-slate-100 rounded-xl bg-slate-50 items-start">
                        <div className={`p-2 rounded-full ${event.event_type === 'REVERSED' || event.event_type === 'RETURNED' ? 'bg-red-100 text-red-500' : 'bg-green-100 text-green-600'}`}>
                          {event.event_type === 'REVERSED' || event.event_type === 'RETURNED' ? <RotateCcw size={16} /> : <CheckCircle2 size={16} />}
                        </div>
                        <div>
                          <h4 className="font-black text-slate-800">{event.stage.replace(/_/g, ' ')}</h4>
                          <p className="text-xs text-slate-500 mb-1">
                            <span className="font-bold">{event.event_type}</span> by <span className="font-bold text-blue-600">{event.performed_by_name || 'System'}</span> on {formatDate(event.action_date)}
                          </p>
                          {event.remarks && <p className="text-sm italic text-slate-600 bg-white p-2 rounded border border-slate-200 mt-2">"{event.remarks}"</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SYSTEM TAB */}
              {activeTab === 'SYSTEM' && (
                <div>
                  <h3 className="text-lg font-black text-slate-800 border-b border-slate-200 pb-2 mb-4">Deep System Logs</h3>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-500 text-xs uppercase tracking-wider">
                        <th className="p-3 font-black">Date</th>
                        <th className="p-3 font-black">Action</th>
                        <th className="p-3 font-black">Entity</th>
                        <th className="p-3 font-black">Performed By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {auditData.system_logs.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-slate-400">No deep logs found.</td></tr>}
                      {auditData.system_logs.map((log: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="p-3 text-xs whitespace-nowrap">{formatDate(log.audit_date)}</td>
                          <td className="p-3 font-bold text-slate-700">{log.action}</td>
                          <td className="p-3 text-xs text-slate-500">
                            {log.entity_type} (ID: {log.entity_id})
                          </td>
                          <td className="p-3 text-slate-600">{log.performed_by || 'System'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditBillModal;