import React, { useState, useEffect } from 'react';
import { 
  Search, Clock, CheckCircle2, Filter, Activity, AlertCircle, Play, Loader2, MoreVertical, Eye, X, User, Stethoscope, FileText, Lock, AlertTriangle 
} from 'lucide-react';
import { radiologyService } from '../services/radiology.service';
import { useNotification } from '../context/NotificationContext';

interface RadiologyOrder {
  id: number;
  order_id?: number;
  encounter_number: string;
  encounter_type: string;
  first_name: string;
  last_name: string;
  mrn: string;
  gender: string;
  display_age?: string;
  age_years?: string;
  service_name: string;
  service_code: string;
  order_status: string;
  ordered_at: string;
  ward?: string;
  room_number?: string;
  bed_number?: string;
  patientName?: string;
  status?: string;
  invoice_status?: string;
  processing_status?: string;
  diagnosis?: string;
  icd10_code?: string;
  clinical_note?: string;
  phone?: string;
}

const isOrderLocked = (o: any): boolean => {
  if (!o) return false;
  const encType = String(o.encounter_type || '').toUpperCase();
  if (encType !== 'OPD') return false;

  const orderStatus = String(o.order_status || o.status || '').toUpperCase();
  if (orderStatus === 'REQUESTED' || orderStatus === 'PARTIALLY_PAID' || orderStatus === 'UNPAID') {
    return true;
  }

  const invoiceStatus = String(o.invoice_status || '').toUpperCase();
  if (invoiceStatus && invoiceStatus !== 'PAID') {
    return true;
  }

  return orderStatus !== 'PAID' && orderStatus !== 'COMPLETED' && orderStatus !== 'IN_PROGRESS';
};

const RadiologyWorklist: React.FC = () => {
  const { notify } = useNotification();
  const [orders, setOrders] = useState<RadiologyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<RadiologyOrder | null>(null);
  const [activeMenu, setActiveMenu] = useState<number | null>(null);

  useEffect(() => {
    const handleClickOutside = () => setActiveMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response: any = await radiologyService.getOrders();
      const dataArray = Array.isArray(response) ? response : (response?.data || response?.results || []);
      
      const sortedData = [...dataArray].sort((a, b) => new Date(b.ordered_at).getTime() - new Date(a.ordered_at).getTime());
      
      const mapped = sortedData.map((o: any) => ({
        ...o,
        patientName: `${o.first_name} ${o.last_name}`,
        status: o.order_status === 'IN_PROGRESS' ? 'In-Progress' : (o.order_status === 'PAID' || o.order_status === 'REQUESTED') ? 'Pending' : o.order_status
      }));
      setOrders(mapped);
    } catch (err: any) {
      notify(err.response?.data?.message || "Failed to load radiology worklist", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleStartScan = async (order: any) => {
    const orderId = order.order_id || order.id;

    if (isOrderLocked(order)) {
      notify("This OPD imaging order is locked awaiting billing payment.", "warning");
      return;
    }

    setProcessingId(orderId);
    setActiveMenu(null);
    try {
      const res = await radiologyService.startScan(orderId);
      notify(`Scan started. Ref: ${res.data?.reference_no}`, "success");
      fetchOrders(); 
    } catch (err: any) {
      notify(err.response?.data?.message || "Failed to start scan", "error");
    } finally {
      setProcessingId(null);
    }
  };

  const filtered = orders.filter(o => 
    (o.patientName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
    (o.encounter_number?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (o.mrn?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (o.service_name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-[28px] border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending Scans</p>
            <p className="text-xl font-black text-slate-800">{orders.filter(o => o.status === 'Pending').length}</p>
          </div>
          <div className="p-2.5 bg-slate-100 text-slate-600 rounded-xl border border-slate-200"><Clock size={20}/></div>
        </div>
        <div className="bg-white p-5 rounded-[28px] border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active (In-Room)</p>
            <p className="text-xl font-black text-brand-primary">{orders.filter(o => o.status === 'In-Progress').length}</p>
          </div>
          <div className="p-2.5 bg-brand-active text-brand-primary rounded-xl border border-brand-active animate-pulse"><Activity size={20}/></div>
        </div>
        <div className="bg-white p-5 rounded-[28px] border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stat Alerts</p>
            <p className="text-xl font-black text-red-600">0</p>
          </div>
          <div className="p-2.5 bg-red-50 text-red-600 rounded-xl border border-red-100"><AlertCircle size={20}/></div>
        </div>
        <div className="bg-white p-5 rounded-[28px] border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Orders</p>
            <p className="text-xl font-black text-emerald-600">{orders.length}</p>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100"><CheckCircle2 size={20}/></div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 flex flex-col md:flex-row gap-4 items-center shadow-sm">
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-slate-700 transition-colors" />
          <input 
            type="text" 
            placeholder="Search imaging worklist by Patient, MRN, Service..."
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:ring-4 focus:ring-slate-400/10 outline-none transition-all font-bold"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={fetchOrders}
          className="flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all w-full md:w-auto"
        >
          <Filter size={16} /> Refresh List
        </button>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm min-h-[400px]">
        <div className="overflow-x-auto pb-48">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="px-6 py-5 whitespace-nowrap">Order Info</th>
                <th className="px-6 py-5 whitespace-nowrap">Patient Details</th>
                <th className="px-6 py-5 whitespace-nowrap">Location</th>
                <th className="px-6 py-5 whitespace-nowrap">Imaging Study</th>
                <th className="px-6 py-5 whitespace-nowrap">Status</th>
                <th className="px-6 py-5 whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-20 text-slate-400">
                    <Loader2 className="animate-spin mx-auto mb-3" size={32} />
                    <p className="font-medium">Loading orders...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-20 text-slate-400">
                    <FileText size={48} className="mx-auto mb-3 opacity-20" />
                    <p className="font-bold text-lg text-slate-600">No orders found.</p>
                    <p className="text-sm">Try adjusting your search filters.</p>
                  </td>
                </tr>
              ) : filtered.map((order) => {
                const uniqueId = order.order_id || order.id;
                const locked = isOrderLocked(order);
                
                return (
                  <tr key={uniqueId} className={`group transition-colors ${locked ? 'bg-amber-50/20 hover:bg-amber-50/40' : 'hover:bg-slate-50/80'}`}>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2">
                        <span className={`inline-flex items-center justify-center px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border w-fit
                          ${order.encounter_type === 'ERD' ? 'bg-red-50 text-red-600 border-red-100' : 
                            order.encounter_type === 'IPD' ? 'bg-brand-active text-brand-primary border-brand-active' : 
                            'bg-emerald-50 text-emerald-600 border-emerald-100'}
                        `}>
                          {order.encounter_type}
                        </span>
                        <div className="flex flex-col text-[10px] font-bold text-slate-400 leading-tight">
                          <span className="flex items-center gap-1"><Clock size={10} /> {order.ordered_at?.split(' ')[0]}</span>
                          <span className="ml-3.5 whitespace-nowrap">{order.ordered_at?.split(' ')[1]}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm shrink-0 border border-slate-200">
                          {order.first_name?.[0]}{order.last_name?.[0]}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-800">{order.first_name} {order.last_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-mono font-bold text-brand-primary uppercase bg-brand-active/50 px-1.5 py-0.5 rounded">MRN: {order.mrn}</span>
                            <span className="text-[10px] font-bold text-slate-500">{order.display_age || `${order.age_years}y`} · {order.gender}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {order.ward ? (
                        <div>
                          <p className="text-xs font-bold text-slate-700">{order.ward}</p>
                          <p className="text-[10px] font-medium text-slate-500">{order.room_number} · {order.bed_number}</p>
                        </div>
                      ) : (
                        <span className="text-xs font-medium text-slate-400">Outpatient</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 items-start">
                        <span className="text-[10px] font-black text-slate-500 bg-slate-200/50 px-2 py-0.5 rounded uppercase">{order.service_code}</span>
                        <p className="text-sm font-bold text-slate-800 line-clamp-1 max-w-[200px]" title={order.service_name}>{order.service_name}</p>
                        <p className="text-[10px] text-slate-400 font-medium font-mono">{order.encounter_number}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5 items-start">
                        {locked ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-slate-800 text-white border border-slate-700 shadow-sm">
                            <Lock size={12} className="text-amber-400" /> Unpaid (Locked)
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border
                            ${order.status === 'Pending' ? 'bg-amber-50 text-amber-600 border-amber-200' : 
                              order.status === 'In-Progress' ? 'bg-brand-active text-brand-primary border-brand-active' : 
                              'bg-emerald-50 text-emerald-600 border-emerald-200'}
                          `}>
                            {order.status}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right relative">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenu(activeMenu === uniqueId ? null : uniqueId);
                        }}
                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
                      >
                        <MoreVertical size={18} />
                      </button>
                      
                      {activeMenu === uniqueId && (
                        <div className="absolute right-8 top-10 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2" onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={() => {
                              setSelectedOrder(order);
                              setActiveMenu(null);
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2"
                          >
                            <Eye size={16} /> View Order Details
                          </button>
                          {order.status === 'Pending' && (
                            <button 
                              onClick={() => handleStartScan(order)}
                              disabled={processingId === uniqueId || locked}
                              className={`w-full text-left px-4 py-2.5 text-sm font-bold flex items-center gap-2 border-t border-slate-50 transition-colors ${
                                locked
                                  ? 'text-slate-400 bg-slate-50 cursor-not-allowed'
                                  : 'text-brand-primary hover:bg-brand-active0/10'
                              }`}
                            >
                              {processingId === uniqueId ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : locked ? (
                                <Lock size={16} className="text-amber-500" />
                              ) : (
                                <Play size={16} fill="currentColor" />
                              )}
                              {locked ? 'Awaiting Payment' : 'Start Scan'}
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Side Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Order Details</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Ref #{selectedOrder.order_id || selectedOrder.id}</p>
              </div>
              <button 
                onClick={() => setSelectedOrder(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto space-y-6 flex-1">
              {/* LOCK BANNER IN MODAL */}
              {isOrderLocked(selectedOrder) && (
                <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-2xl flex items-start gap-3">
                  <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                  <div>
                    <h4 className="font-black text-xs uppercase tracking-widest">Locked — Awaiting Billing Payment</h4>
                    <p className="text-xs mt-1 font-medium text-amber-800">
                      This imaging study cannot be performed until the outpatient fee has been settled at the billing counter.
                    </p>
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <User size={14} /> Patient Information
                </h4>
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Name</p>
                    <p className="text-sm font-bold text-slate-800">{selectedOrder.first_name} {selectedOrder.last_name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">MRN</p>
                    <p className="text-sm font-mono font-bold text-slate-800">{selectedOrder.mrn}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Encounter</p>
                    <p className="text-sm font-mono font-bold text-slate-800">{selectedOrder.encounter_number} ({selectedOrder.encounter_type})</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Billing Status</p>
                    <p className="text-sm font-bold text-slate-800">{isOrderLocked(selectedOrder) ? 'UNPAID (LOCKED)' : (selectedOrder.order_status || 'PAID')}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Stethoscope size={14} /> Diagnostic Request
                </h4>
                <div className="bg-brand-active/30 p-4 rounded-2xl border border-brand-active">
                  <p className="text-[10px] font-bold text-brand-primary uppercase mb-1">Imaging Study</p>
                  <p className="text-sm font-bold text-brand-primary">
                    {selectedOrder.service_name}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="px-8 py-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button 
                onClick={() => setSelectedOrder(null)}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
              {selectedOrder.status === 'Pending' && (
                isOrderLocked(selectedOrder) ? (
                  <div className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-400 bg-slate-200/70 border border-slate-300 cursor-not-allowed flex items-center gap-2">
                    <Lock size={16} /> Locked (Awaiting Payment)
                  </div>
                ) : (
                  <button 
                    onClick={() => {
                      handleStartScan(selectedOrder);
                      setSelectedOrder(null);
                    }}
                    className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-slate-800 hover:bg-slate-900 transition-colors shadow-lg shadow-slate-200 flex items-center gap-2"
                  >
                    <Play size={16} fill="currentColor" /> Start Scan
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RadiologyWorklist;






// import React, { useState, useEffect, useRef } from 'react';
// import { 
//   Search, Clock, CheckCircle2, Filter, Activity, AlertCircle, Play, Loader2, MoreVertical, Eye, X, User, Stethoscope, FileText 
// } from 'lucide-react';
// import { radiologyService } from '../services/radiology.service';
// import { useNotification } from '../context/NotificationContext';

// interface RadiologyOrder {
//   id: number;
//   order_id?: number;
//   encounter_number: string;
//   encounter_type: string;
//   first_name: string;
//   last_name: string;
//   mrn: string;
//   gender: string;
//   display_age?: string;
//   age_years?: string;
//   service_name: string;
//   service_code: string;
//   order_status: string;
//   ordered_at: string;
//   ward?: string;
//   room_number?: string;
//   bed_number?: string;
//   patientName?: string;
//   status?: string;
// }

// const RadiologyWorklist: React.FC = () => {
//   const { notify } = useNotification();
//   const [orders, setOrders] = useState<RadiologyOrder[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [searchTerm, setSearchTerm] = useState('');
//   const [processingId, setProcessingId] = useState<number | null>(null);
//   const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
//   const [activeMenu, setActiveMenu] = useState<number | null>(null);

//   // Close dropdown when clicking outside
//   useEffect(() => {
//     const handleClickOutside = () => setActiveMenu(null);
//     document.addEventListener('click', handleClickOutside);
//     return () => document.removeEventListener('click', handleClickOutside);
//   }, []);

//   const fetchOrders = async () => {
//     setLoading(true);
//     try {
//       const data = await radiologyService.getOrders();
//       const sortedData = [...data].sort((a, b) => new Date(b.ordered_at).getTime() - new Date(a.ordered_at).getTime());
      
//       const mapped = sortedData.map((o: any) => ({
//         ...o,
//         patientName: `${o.first_name} ${o.last_name}`,
//         status: (o.order_status === 'PAID' || o.order_status === 'REQUESTED') ? 'Pending' : o.order_status
//       }));
//       setOrders(mapped);
//     } catch (err: any) {
//       notify(err.response?.data?.message || "Failed to load radiology worklist", "error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchOrders();
//   }, []);

//   const handleStartScan = async (orderId: number) => {
//     setProcessingId(orderId);
//     setActiveMenu(null);
//     try {
//       const res = await radiologyService.startScan(orderId);
//       notify(`Scan started. Ref: ${res.data?.reference_no}`, "success");
//       fetchOrders(); 
//     } catch (err: any) {
//       notify(err.response?.data?.message || "Failed to start scan", "error");
//     } finally {
//       setProcessingId(null);
//     }
//   };

//   const filtered = orders.filter(o => 
//     (o.patientName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
//     (o.encounter_number?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
//     (o.mrn?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
//     (o.service_name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
//   );

//   return (
//     <div className="space-y-6 animate-in fade-in duration-500">
      
//       {/* Stats Bar */}
//       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
//         <div className="bg-white p-5 rounded-[28px] border border-slate-200 shadow-sm flex items-center justify-between">
//           <div>
//             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending Scans</p>
//             <p className="text-xl font-black text-slate-800">{orders.filter(o => o.status === 'Pending').length}</p>
//           </div>
//           <div className="p-2.5 bg-slate-100 text-slate-600 rounded-xl border border-slate-200"><Clock size={20}/></div>
//         </div>
//         <div className="bg-white p-5 rounded-[28px] border border-slate-200 shadow-sm flex items-center justify-between">
//           <div>
//             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active (In-Room)</p>
//             <p className="text-xl font-black text-brand-primary">{orders.filter(o => o.status === 'In-Progress').length}</p>
//           </div>
//           <div className="p-2.5 bg-brand-active text-brand-primary rounded-xl border border-brand-active animate-pulse"><Activity size={20}/></div>
//         </div>
//          <div className="bg-white p-5 rounded-[28px] border border-slate-200 shadow-sm flex items-center justify-between">
//           <div>
//             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stat Alerts</p>
//             <p className="text-xl font-black text-red-600">0</p>
//           </div>
//           <div className="p-2.5 bg-red-50 text-red-600 rounded-xl border border-red-100"><AlertCircle size={20}/></div>
//         </div>
//         <div className="bg-white p-5 rounded-[28px] border border-slate-200 shadow-sm flex items-center justify-between">
//           <div>
//             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Orders</p>
//             <p className="text-xl font-black text-emerald-600">{orders.length}</p>
//           </div>
//           <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100"><CheckCircle2 size={20}/></div>
//         </div>
//       </div>

//       {/* Control Bar */}
//       <div className="bg-white p-4 rounded-3xl border border-slate-200 flex flex-col md:flex-row gap-4 items-center shadow-sm">
//         <div className="relative flex-1 w-full group">
//           <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-slate-700 transition-colors" />
//           <input 
//             type="text" 
//             placeholder="Search imaging worklist by Patient, MRN, Service..."
//             className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:ring-4 focus:ring-slate-400/10 outline-none transition-all font-bold"
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//           />
//         </div>
//         <button 
//           onClick={fetchOrders}
//           className="flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all w-full md:w-auto"
//         >
//           <Filter size={16} /> Refresh List
//         </button>
//       </div>

//       {/* Main Table */}
//       <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm min-h-[400px]">
//         {/* Added pb-48 so the last row's dropdown menu doesn't get cut off by overflow */}
//         <div className="overflow-x-auto pb-48">
//           <table className="w-full text-left">
//             <thead>
//               <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
//                 <th className="px-6 py-5 whitespace-nowrap">Order Info</th>
//                 <th className="px-6 py-5 whitespace-nowrap">Patient Details</th>
//                 <th className="px-6 py-5 whitespace-nowrap">Location</th>
//                 <th className="px-6 py-5 whitespace-nowrap">Imaging Study</th>
//                 <th className="px-6 py-5 whitespace-nowrap">Status</th>
//                 <th className="px-6 py-5 whitespace-nowrap text-right">Actions</th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-slate-50">
//               {loading ? (
//                  <tr>
//                    <td colSpan={6} className="text-center py-20 text-slate-400">
//                      <Loader2 className="animate-spin mx-auto mb-3" size={32} />
//                      <p className="font-medium">Loading orders...</p>
//                    </td>
//                  </tr>
//               ) : filtered.length === 0 ? (
//                 <tr>
//                    <td colSpan={6} className="text-center py-20 text-slate-400">
//                      <FileText size={48} className="mx-auto mb-3 opacity-20" />
//                      <p className="font-bold text-lg text-slate-600">No orders found.</p>
//                      <p className="text-sm">Try adjusting your search filters.</p>
//                    </td>
//                  </tr>
//               ) : filtered.map((order) => {
//                 const uniqueId = order.order_id || order.id;
                
//                 return (
//                 <tr key={uniqueId} className="group hover:bg-slate-50/80 transition-colors">
//                   <td className="px-6 py-4">
//                     <div className="flex flex-col gap-2">
//                        <span className={`inline-flex items-center justify-center px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border w-fit
//                         ${order.encounter_type === 'ERD' ? 'bg-red-50 text-red-600 border-red-100' : 
//                           order.encounter_type === 'IPD' ? 'bg-brand-active text-brand-primary border-brand-active' : 
//                           'bg-emerald-50 text-emerald-600 border-emerald-100'}
//                       `}>
//                         {order.encounter_type}
//                       </span>
//                       <div className="flex flex-col text-[10px] font-bold text-slate-400 leading-tight">
//                         <span className="flex items-center gap-1"><Clock size={10} /> {order.ordered_at?.split(' ')[0]}</span>
//                         <span className="ml-3.5 whitespace-nowrap">{order.ordered_at?.split(' ')[1]}</span>
//                       </div>
//                     </div>
//                   </td>
//                   <td className="px-6 py-4">
//                     <div className="flex items-center gap-3">
//                       <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm shrink-0 border border-slate-200">
//                         {order.first_name?.[0]}{order.last_name?.[0]}
//                       </div>
//                       <div>
//                         <p className="text-sm font-black text-slate-800">{order.first_name} {order.last_name}</p>
//                         <div className="flex items-center gap-2 mt-1">
//                           <span className="text-[10px] font-mono font-bold text-brand-primary uppercase bg-brand-active/50 px-1.5 py-0.5 rounded">MRN: {order.mrn}</span>
//                           <span className="text-[10px] font-bold text-slate-500">{order.display_age || `${order.age_years}y`} • {order.gender}</span>
//                         </div>
//                       </div>
//                     </div>
//                   </td>
//                   <td className="px-6 py-4">
//                     {order.ward ? (
//                       <div>
//                         <p className="text-xs font-bold text-slate-700">{order.ward}</p>
//                         <p className="text-[10px] font-medium text-slate-500">{order.room_number} • {order.bed_number}</p>
//                       </div>
//                     ) : (
//                       <span className="text-xs font-medium text-slate-400">Outpatient</span>
//                     )}
//                   </td>
//                   <td className="px-6 py-4">
//                     <div className="flex flex-col gap-1 items-start">
//                        <span className="text-[10px] font-black text-slate-500 bg-slate-200/50 px-2 py-0.5 rounded uppercase">{order.service_code}</span>
//                        <p className="text-sm font-bold text-slate-800 line-clamp-1 max-w-[200px]" title={order.service_name}>{order.service_name}</p>
//                        <p className="text-[10px] text-slate-400 font-medium font-mono">{order.encounter_number}</p>
//                     </div>
//                   </td>
//                   <td className="px-6 py-4">
//                     <div className="flex flex-col gap-1.5 items-start">
//                       <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border
//                         ${order.status === 'Pending' ? 'bg-amber-50 text-amber-600 border-amber-200' : 
//                           order.status === 'In-Progress' ? 'bg-brand-active text-brand-primary border-brand-active' : 
//                           'bg-emerald-50 text-emerald-600 border-emerald-200'}
//                       `}>
//                         {order.status}
//                       </div>
//                     </div>
//                   </td>
//                   <td className="px-6 py-4 text-right relative">
//                     <button 
//                       onClick={(e) => {
//                         e.stopPropagation();
//                         setActiveMenu(activeMenu === uniqueId ? null : uniqueId);
//                       }}
//                       className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
//                     >
//                       <MoreVertical size={18} />
//                     </button>
                    
//                     {activeMenu === uniqueId && (
//                       <div className="absolute right-8 top-10 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2" onClick={(e) => e.stopPropagation()}>
//                         <button 
//                           onClick={() => {
//                             setSelectedOrder(order);
//                             setActiveMenu(null);
//                           }}
//                           className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2"
//                         >
//                           <Eye size={16} /> View Order Details
//                         </button>
//                         {order.status === 'Pending' && (
//                           <button 
//                             onClick={() => handleStartScan(uniqueId)}
//                             disabled={processingId === uniqueId}
//                             className="w-full text-left px-4 py-2.5 text-sm font-bold text-brand-primary hover:bg-brand-active0/10 flex items-center gap-2 border-t border-slate-50 disabled:opacity-50"
//                           >
//                             {processingId === uniqueId ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} fill="currentColor" />}
//                             Start Scan
//                           </button>
//                         )}
//                       </div>
//                     )}
//                   </td>
//                 </tr>
//               )})}
//             </tbody>
//           </table>
//         </div>
//       </div>

//       {/* Order Details Modal (Unchanged) */}
//       {selectedOrder && (
//          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
//          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
//            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
//              <div>
//                <h3 className="text-xl font-black text-slate-800 tracking-tight">Order Details</h3>
//                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Ref #{selectedOrder.order_id || selectedOrder.id}</p>
//              </div>
//              <button 
//                onClick={() => setSelectedOrder(null)}
//                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
//              >
//                <X size={20} />
//              </button>
//            </div>
           
//            <div className="p-8 overflow-y-auto space-y-8 flex-1">
//              {/* Clinical Info Section - Similar to your previous code */}
//              <div>
//                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
//                  <User size={14} /> Patient Information
//                </h4>
//                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
//                  <div>
//                    <p className="text-[10px] font-bold text-slate-400 uppercase">Name</p>
//                    <p className="text-sm font-bold text-slate-800">{selectedOrder.first_name} {selectedOrder.last_name}</p>
//                  </div>
//                  <div>
//                    <p className="text-[10px] font-bold text-slate-400 uppercase">MRN</p>
//                    <p className="text-sm font-mono font-bold text-slate-800">{selectedOrder.mrn}</p>
//                  </div>
//                </div>
//              </div>

//              <div>
//                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
//                  <Stethoscope size={14} /> Diagnostic Request
//                </h4>
//                <div className="bg-brand-active/30 p-4 rounded-2xl border border-brand-active">
//                  <p className="text-[10px] font-bold text-brand-primary uppercase mb-1">Imaging Study</p>
//                  <p className="text-sm font-bold text-brand-primary">
//                    {selectedOrder.service_name}
//                  </p>
//                </div>
//              </div>
//            </div>
           
//            <div className="px-8 py-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
//              <button 
//                onClick={() => setSelectedOrder(null)}
//                className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors"
//              >
//                Close
//              </button>
//              {selectedOrder.status === 'Pending' && (
//                <button 
//                  onClick={() => {
//                    handleStartScan(selectedOrder.order_id || selectedOrder.id);
//                    setSelectedOrder(null);
//                  }}
//                  className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-slate-800 hover:bg-slate-900 transition-colors shadow-lg shadow-slate-200 flex items-center gap-2"
//                >
//                  <Play size={16} fill="currentColor" /> Start Scan
//                </button>
//              )}
//            </div>
//          </div>
//        </div>
//       )}
//     </div>
//   );
// };

// export default RadiologyWorklist;

// import React, { useState, useEffect, useRef } from 'react';
// import { 
//   Search, Clock, CheckCircle2, Filter, Activity, AlertCircle, Play, Loader2, MoreVertical, Eye, X, User, Stethoscope, FileText 
// } from 'lucide-react';
// import { radiologyService } from '../services/radiology.service';
// import { useNotification } from '../context/NotificationContext';

// interface RadiologyOrder {
//   id: number;
//   order_id?: number;
//   encounter_number: string;
//   encounter_type: string;
//   first_name: string;
//   last_name: string;
//   mrn: string;
//   gender: string;
//   display_age?: string;
//   age_years?: string;
//   service_name: string;
//   service_code: string;
//   order_status: string;
//   ordered_at: string;
//   ward?: string;
//   room_number?: string;
//   bed_number?: string;
//   patientName?: string;
//   status?: string;
// }

// const RadiologyWorklist: React.FC = () => {
//   const { notify } = useNotification();
//   const [orders, setOrders] = useState<RadiologyOrder[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [searchTerm, setSearchTerm] = useState('');
//   const [processingId, setProcessingId] = useState<number | null>(null);
//   const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
//   const [activeMenu, setActiveMenu] = useState<number | null>(null);

//   // Close dropdown when clicking outside
//   useEffect(() => {
//     const handleClickOutside = () => setActiveMenu(null);
//     document.addEventListener('click', handleClickOutside);
//     return () => document.removeEventListener('click', handleClickOutside);
//   }, []);

//   const fetchOrders = async () => {
//     setLoading(true);
//     try {
//       const data = await radiologyService.getOrders();
//       const sortedData = [...data].sort((a, b) => new Date(b.ordered_at).getTime() - new Date(a.ordered_at).getTime());
      
//       const mapped = sortedData.map((o: any) => ({
//         ...o,
//         patientName: `${o.first_name} ${o.last_name}`,
//         status: (o.order_status === 'PAID' || o.order_status === 'REQUESTED') ? 'Pending' : o.order_status
//       }));
//       setOrders(mapped);
//     } catch (err: any) {
//       notify(err.response?.data?.message || "Failed to load radiology worklist", "error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchOrders();
//   }, []);

//   const handleStartScan = async (orderId: number) => {
//     setProcessingId(orderId);
//     setActiveMenu(null);
//     try {
//       const res = await radiologyService.startScan(orderId);
//       notify(`Scan started. Ref: ${res.data?.reference_no}`, "success");
//       fetchOrders(); 
//     } catch (err: any) {
//       notify(err.response?.data?.message || "Failed to start scan", "error");
//     } finally {
//       setProcessingId(null);
//     }
//   };

//   const filtered = orders.filter(o => 
//     (o.patientName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
//     (o.encounter_number?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
//     (o.mrn?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
//     (o.service_name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
//   );

//   return (
//     <div className="space-y-6 animate-in fade-in duration-500">
      
//       {/* Stats Bar */}
//       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
//         <div className="bg-white p-5 rounded-[28px] border border-slate-200 shadow-sm flex items-center justify-between">
//           <div>
//             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending Scans</p>
//             <p className="text-xl font-black text-slate-800">{orders.filter(o => o.status === 'Pending').length}</p>
//           </div>
//           <div className="p-2.5 bg-slate-100 text-slate-600 rounded-xl border border-slate-200"><Clock size={20}/></div>
//         </div>
//         <div className="bg-white p-5 rounded-[28px] border border-slate-200 shadow-sm flex items-center justify-between">
//           <div>
//             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active (In-Room)</p>
//             <p className="text-xl font-black text-brand-primary">{orders.filter(o => o.status === 'In-Progress').length}</p>
//           </div>
//           <div className="p-2.5 bg-brand-active text-brand-primary rounded-xl border border-brand-active animate-pulse"><Activity size={20}/></div>
//         </div>
//          <div className="bg-white p-5 rounded-[28px] border border-slate-200 shadow-sm flex items-center justify-between">
//           <div>
//             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stat Alerts</p>
//             <p className="text-xl font-black text-red-600">0</p>
//           </div>
//           <div className="p-2.5 bg-red-50 text-red-600 rounded-xl border border-red-100"><AlertCircle size={20}/></div>
//         </div>
//         <div className="bg-white p-5 rounded-[28px] border border-slate-200 shadow-sm flex items-center justify-between">
//           <div>
//             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Orders</p>
//             <p className="text-xl font-black text-emerald-600">{orders.length}</p>
//           </div>
//           <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100"><CheckCircle2 size={20}/></div>
//         </div>
//       </div>

//       {/* Control Bar */}
//       <div className="bg-white p-4 rounded-3xl border border-slate-200 flex flex-col md:flex-row gap-4 items-center shadow-sm">
//         <div className="relative flex-1 w-full group">
//           <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-slate-700 transition-colors" />
//           <input 
//             type="text" 
//             placeholder="Search imaging worklist by Patient, MRN, Service..."
//             className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:ring-4 focus:ring-slate-400/10 outline-none transition-all font-bold"
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//           />
//         </div>
//         <button 
//           onClick={fetchOrders}
//           className="flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all w-full md:w-auto"
//         >
//           <Filter size={16} /> Refresh List
//         </button>
//       </div>

//       {/* Main Table */}
//       <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm min-h-[400px]">
//         {/* Added pb-48 so the last row's dropdown menu doesn't get cut off by overflow */}
//         <div className="overflow-x-auto pb-48">
//           <table className="w-full text-left">
//             <thead>
//               <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
//                 <th className="px-6 py-5 whitespace-nowrap">Order Info</th>
//                 <th className="px-6 py-5 whitespace-nowrap">Patient Details</th>
//                 <th className="px-6 py-5 whitespace-nowrap">Location</th>
//                 <th className="px-6 py-5 whitespace-nowrap">Imaging Study</th>
//                 <th className="px-6 py-5 whitespace-nowrap">Status</th>
//                 <th className="px-6 py-5 whitespace-nowrap text-right">Actions</th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-slate-50">
//               {loading ? (
//                  <tr>
//                    <td colSpan={6} className="text-center py-20 text-slate-400">
//                      <Loader2 className="animate-spin mx-auto mb-3" size={32} />
//                      <p className="font-medium">Loading orders...</p>
//                    </td>
//                  </tr>
//               ) : filtered.length === 0 ? (
//                 <tr>
//                    <td colSpan={6} className="text-center py-20 text-slate-400">
//                      <FileText size={48} className="mx-auto mb-3 opacity-20" />
//                      <p className="font-bold text-lg text-slate-600">No orders found.</p>
//                      <p className="text-sm">Try adjusting your search filters.</p>
//                    </td>
//                  </tr>
//               ) : filtered.map((order) => {
//                 const uniqueId = order.order_id || order.id;
                
//                 return (
//                 <tr key={uniqueId} className="group hover:bg-slate-50/80 transition-colors">
//                   <td className="px-6 py-4">
//                     <div className="flex flex-col gap-2">
//                        <span className={`inline-flex items-center justify-center px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border w-fit
//                         ${order.encounter_type === 'ERD' ? 'bg-red-50 text-red-600 border-red-100' : 
//                           order.encounter_type === 'IPD' ? 'bg-brand-active text-brand-primary border-brand-active' : 
//                           'bg-emerald-50 text-emerald-600 border-emerald-100'}
//                       `}>
//                         {order.encounter_type}
//                       </span>
//                       <div className="flex flex-col text-[10px] font-bold text-slate-400 leading-tight">
//                         <span className="flex items-center gap-1"><Clock size={10} /> {order.ordered_at?.split(' ')[0]}</span>
//                         <span className="ml-3.5 whitespace-nowrap">{order.ordered_at?.split(' ')[1]}</span>
//                       </div>
//                     </div>
//                   </td>
//                   <td className="px-6 py-4">
//                     <div className="flex items-center gap-3">
//                       <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm shrink-0 border border-slate-200">
//                         {order.first_name?.[0]}{order.last_name?.[0]}
//                       </div>
//                       <div>
//                         <p className="text-sm font-black text-slate-800">{order.first_name} {order.last_name}</p>
//                         <div className="flex items-center gap-2 mt-1">
//                           <span className="text-[10px] font-mono font-bold text-brand-primary uppercase bg-brand-active/50 px-1.5 py-0.5 rounded">MRN: {order.mrn}</span>
//                           <span className="text-[10px] font-bold text-slate-500">{order.display_age || `${order.age_years}y`} • {order.gender}</span>
//                         </div>
//                       </div>
//                     </div>
//                   </td>
//                   <td className="px-6 py-4">
//                     {order.ward ? (
//                       <div>
//                         <p className="text-xs font-bold text-slate-700">{order.ward}</p>
//                         <p className="text-[10px] font-medium text-slate-500">{order.room_number} • {order.bed_number}</p>
//                       </div>
//                     ) : (
//                       <span className="text-xs font-medium text-slate-400">Outpatient</span>
//                     )}
//                   </td>
//                   <td className="px-6 py-4">
//                     <div className="flex flex-col gap-1 items-start">
//                        <span className="text-[10px] font-black text-slate-500 bg-slate-200/50 px-2 py-0.5 rounded uppercase">{order.service_code}</span>
//                        <p className="text-sm font-bold text-slate-800 line-clamp-1 max-w-[200px]" title={order.service_name}>{order.service_name}</p>
//                        <p className="text-[10px] text-slate-400 font-medium font-mono">{order.encounter_number}</p>
//                     </div>
//                   </td>
//                   <td className="px-6 py-4">
//                     <div className="flex flex-col gap-1.5 items-start">
//                       <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border
//                         ${order.status === 'Pending' ? 'bg-amber-50 text-amber-600 border-amber-200' : 
//                           order.status === 'In-Progress' ? 'bg-brand-active text-brand-primary border-brand-active' : 
//                           'bg-emerald-50 text-emerald-600 border-emerald-200'}
//                       `}>
//                         {order.status}
//                       </div>
//                     </div>
//                   </td>
//                   <td className="px-6 py-4 text-right relative">
//                     <button 
//                       onClick={(e) => {
//                         e.stopPropagation();
//                         setActiveMenu(activeMenu === uniqueId ? null : uniqueId);
//                       }}
//                       className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
//                     >
//                       <MoreVertical size={18} />
//                     </button>
                    
//                     {activeMenu === uniqueId && (
//                       <div className="absolute right-8 top-10 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2" onClick={(e) => e.stopPropagation()}>
//                         <button 
//                           onClick={() => {
//                             setSelectedOrder(order);
//                             setActiveMenu(null);
//                           }}
//                           className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2"
//                         >
//                           <Eye size={16} /> View Order Details
//                         </button>
//                         {order.status === 'Pending' && (
//                           <button 
//                             onClick={() => handleStartScan(uniqueId)}
//                             disabled={processingId === uniqueId}
//                             className="w-full text-left px-4 py-2.5 text-sm font-bold text-brand-primary hover:bg-brand-active0/10 flex items-center gap-2 border-t border-slate-50 disabled:opacity-50"
//                           >
//                             {processingId === uniqueId ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} fill="currentColor" />}
//                             Start Scan
//                           </button>
//                         )}
//                       </div>
//                     )}
//                   </td>
//                 </tr>
//               )})}
//             </tbody>
//           </table>
//         </div>
//       </div>

//       {/* Order Details Modal (Unchanged) */}
//       {selectedOrder && (
//          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
//          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
//            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
//              <div>
//                <h3 className="text-xl font-black text-slate-800 tracking-tight">Order Details</h3>
//                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Ref #{selectedOrder.order_id || selectedOrder.id}</p>
//              </div>
//              <button 
//                onClick={() => setSelectedOrder(null)}
//                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
//              >
//                <X size={20} />
//              </button>
//            </div>
           
//            <div className="p-8 overflow-y-auto space-y-8 flex-1">
//              {/* Clinical Info Section - Similar to your previous code */}
//              <div>
//                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
//                  <User size={14} /> Patient Information
//                </h4>
//                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
//                  <div>
//                    <p className="text-[10px] font-bold text-slate-400 uppercase">Name</p>
//                    <p className="text-sm font-bold text-slate-800">{selectedOrder.first_name} {selectedOrder.last_name}</p>
//                  </div>
//                  <div>
//                    <p className="text-[10px] font-bold text-slate-400 uppercase">MRN</p>
//                    <p className="text-sm font-mono font-bold text-slate-800">{selectedOrder.mrn}</p>
//                  </div>
//                </div>
//              </div>

//              <div>
//                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
//                  <Stethoscope size={14} /> Diagnostic Request
//                </h4>
//                <div className="bg-brand-active/30 p-4 rounded-2xl border border-brand-active">
//                  <p className="text-[10px] font-bold text-brand-primary uppercase mb-1">Imaging Study</p>
//                  <p className="text-sm font-bold text-brand-primary">
//                    {selectedOrder.service_name}
//                  </p>
//                </div>
//              </div>
//            </div>
           
//            <div className="px-8 py-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
//              <button 
//                onClick={() => setSelectedOrder(null)}
//                className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors"
//              >
//                Close
//              </button>
//              {selectedOrder.status === 'Pending' && (
//                <button 
//                  onClick={() => {
//                    handleStartScan(selectedOrder.order_id || selectedOrder.id);
//                    setSelectedOrder(null);
//                  }}
//                  className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-slate-800 hover:bg-slate-900 transition-colors shadow-lg shadow-slate-200 flex items-center gap-2"
//                >
//                  <Play size={16} fill="currentColor" /> Start Scan
//                </button>
//              )}
//            </div>
//          </div>
//        </div>
//       )}
//     </div>
//   );
// };

// export default RadiologyWorklist;


// import React, { useState, useEffect } from 'react';
// import { 
//   Search, 
//   Clock, 
//   CheckCircle2, 
//   Filter, 
//   Activity, 
//   AlertCircle,
//   Play,
//   Check,
//   Loader2,
//   MoreVertical,
//   Eye,
//   X,
//   User,
//   Stethoscope,
//   FileText
// } from 'lucide-react';
// import { radiologyService } from '../services/radiology.service';
// import { useNotification } from '../context/NotificationContext';

// interface RadiologyOrder {
//   id: number;
//   encounter_number: string;
//   first_name: string;
//   last_name: string;
//   mrn: string; // Not in API response directly, might need to map or use if available
//   service_name: string;
//   service_code: string;
//   order_status: string; // 'PAID', 'IN_PROGRESS', 'COMPLETED', etc.
//   ordered_at: string;
//   // Mapped fields for UI
//   patientName?: string;
//   modality?: string;
//   priority?: string;
//   status?: string;
// }

// const RadiologyWorklist: React.FC = () => {
//   const { notify } = useNotification();
//   const [orders, setOrders] = useState<RadiologyOrder[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [searchTerm, setSearchTerm] = useState('');
//   const [processingId, setProcessingId] = useState<number | null>(null);
//   const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
//   const [activeMenu, setActiveMenu] = useState<number | null>(null);

//   const fetchOrders = async () => {
//     setLoading(true);
//     try {
//       const data = await radiologyService.getOrders();
//       // Sort by ordered_at descending
//       const sortedData = [...data].sort((a, b) => 
//         new Date(b.ordered_at).getTime() - new Date(a.ordered_at).getTime()
//       );
      
//       const mapped = sortedData.map((o: any) => ({
//         ...o,
//         patientName: `${o.first_name} ${o.last_name}`,
//         modality: o.service_name,
//         priority: 'Routine',
//         // Map PAID or REQUESTED to Pending for UI to enable Start Scan
//         status: (o.order_status === 'PAID' || o.order_status === 'REQUESTED') ? 'Pending' : o.order_status
//       }));
//       setOrders(mapped);
//     } catch (err: any) {
//       console.error("Failed to fetch radiology orders", err);
//       notify(err.response?.data?.message || "Failed to load radiology worklist", "error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchOrders();
//   }, []);

//   const handleStartScan = async (orderId: number) => {
//     setProcessingId(orderId);
//     setActiveMenu(null);
//     try {
//       const res = await radiologyService.startScan(orderId);
//       notify(`Scan started. Ref: ${res.data?.reference_no}`, "success");
//       fetchOrders(); 
//     } catch (err: any) {
//       notify(err.response?.data?.message || "Failed to start scan", "error");
//     } finally {
//       setProcessingId(null);
//     }
//   };

//   const filtered = orders.filter(o => 
//     (o.patientName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
//     (o.encounter_number?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
//     (o.mrn?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
//     (o.service_name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
//   );

//   return (
//     <div className="space-y-6 animate-in fade-in duration-500">
//       {/* Stats Bar */}
//       <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
//         <div className="bg-white p-5 rounded-[28px] border border-slate-200 shadow-sm flex items-center justify-between">
//           <div>
//             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending Scans</p>
//             <p className="text-xl font-black text-slate-800">{orders.filter(o => o.status === 'Pending').length}</p>
//           </div>
//           <div className="p-2.5 bg-slate-100 text-slate-600 rounded-xl border border-slate-200"><Clock size={20}/></div>
//         </div>
//         {/* ... other stats ... */}
//         <div className="bg-white p-5 rounded-[28px] border border-slate-200 shadow-sm flex items-center justify-between">
//           <div>
//             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active (In-Room)</p>
//             <p className="text-xl font-black text-brand-primary">{orders.filter(o => o.status === 'In-Progress').length}</p>
//           </div>
//           <div className="p-2.5 bg-brand-active text-brand-primary rounded-xl border border-brand-active animate-pulse"><Activity size={20}/></div>
//         </div>
//          <div className="bg-white p-5 rounded-[28px] border border-slate-200 shadow-sm flex items-center justify-between">
//           <div>
//             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stat Alerts</p>
//             <p className="text-xl font-black text-red-600">0</p>
//           </div>
//           <div className="p-2.5 bg-red-50 text-red-600 rounded-xl border border-red-100"><AlertCircle size={20}/></div>
//         </div>
//         <div className="bg-white p-5 rounded-[28px] border border-slate-200 shadow-sm flex items-center justify-between">
//           <div>
//             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Orders</p>
//             <p className="text-xl font-black text-emerald-600">{orders.length}</p>
//           </div>
//           <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100"><CheckCircle2 size={20}/></div>
//         </div>
//       </div>

//       {/* Control Bar */}
//       <div className="bg-white p-4 rounded-3xl border border-slate-200 flex flex-col md:flex-row gap-4 items-center shadow-sm">
//         <div className="relative flex-1 w-full group">
//           <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-slate-700 transition-colors" />
//           <input 
//             type="text" 
//             placeholder="Search imaging worklist by Patient..."
//             className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:ring-4 focus:ring-slate-400/10 outline-none transition-all font-bold"
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//           />
//         </div>
//         <button 
//           onClick={fetchOrders}
//           className="flex items-center gap-2 px-6 py-3 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all"
//         >
//           <Filter size={16} /> Refresh List
//         </button>
//       </div>

//       {/* Main Table */}
//       <div className="bg-white rounded-[40px] border border-slate-200 overflow-hidden shadow-sm">
//         <div className="overflow-x-auto pb-24">
//           <table className="w-full text-left">
//             <thead>
//               <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
//                 <th className="px-6 py-5 w-20">#</th>
//                 <th className="px-6 py-5">Patient Details</th>
//                 <th className="px-6 py-5">Location</th>
//                 <th className="px-6 py-5">Imaging Study</th>
//                 <th className="px-6 py-5">Status</th>
//                 <th className="px-6 py-5 text-right">Actions</th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-slate-50">
//               {loading ? (
//                  <tr>
//                    <td colSpan={6} className="text-center py-10 text-slate-400">
//                      <Loader2 className="animate-spin mx-auto mb-2" />
//                      Loading orders...
//                    </td>
//                  </tr>
//               ) : filtered.length === 0 ? (
//                 <tr>
//                    <td colSpan={6} className="text-center py-10 text-slate-400">
//                      No orders found.
//                    </td>
//                  </tr>
//               ) : filtered.map((order: any, idx) => (
//                 <tr key={order.order_id || order.id} className="group hover:bg-slate-50/50 transition-colors">
//                   <td className="px-6 py-4">
//                     <div className="flex flex-col gap-2">
//                        <span className={`inline-flex items-center justify-center px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border w-fit
//                         ${order.encounter_type === 'ERD' ? 'bg-red-50 text-red-600 border-red-100' : 
//                           order.encounter_type === 'IPD' ? 'bg-brand-active text-brand-primary border-brand-active' : 
//                           'bg-emerald-50 text-emerald-600 border-emerald-100'}
//                       `}>
//                         {order.encounter_type}
//                       </span>
//                       <div className="flex flex-col text-[10px] font-bold text-slate-400 leading-tight">
//                         <span className="flex items-center gap-1"><Clock size={10} /> {order.ordered_at?.split(' ')[0]}</span>
//                         <span className="ml-3.5 text-nowrap">{order.ordered_at?.split(' ')[1]}</span>
//                       </div>
//                     </div>
//                   </td>
//                   <td className="px-6 py-4">
//                     <div className="flex items-center gap-3">
//                       <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs">
//                         {order.first_name?.[0]}{order.last_name?.[0]}
//                       </div>
//                       <div>
//                         <p className="text-sm font-black text-slate-800">{order.first_name} {order.last_name}</p>
//                         <div className="flex items-center gap-2 mt-0.5">
//                           <span className="text-[10px] font-mono font-bold text-brand-primary uppercase">MRN: {order.mrn}</span>
//                           <span className="text-[10px] font-bold text-slate-400">{order.display_age || `${order.age_years}y`} • {order.gender}</span>
//                         </div>
//                       </div>
//                     </div>
//                   </td>
//                   <td className="px-6 py-4">
//                     {order.ward ? (
//                       <div>
//                         <p className="text-xs font-bold text-slate-700">{order.ward}</p>
//                         <p className="text-[10px] font-medium text-slate-500">{order.room_number} • {order.bed_number}</p>
//                       </div>
//                     ) : (
//                       <span className="text-xs font-medium text-slate-400">Outpatient</span>
//                     )}
//                   </td>
//                   <td className="px-6 py-4">
//                     <div className="flex items-center gap-3">
//                        <span className="text-xs font-black text-slate-700 bg-slate-200/50 px-2 py-0.5 rounded uppercase">{order.service_code}</span>
//                        <div>
//                          <p className="text-sm font-bold text-slate-700">{order.service_name}</p>
//                          <p className="text-[10px] text-slate-400 font-medium font-mono mt-0.5">{order.encounter_number}</p>
//                        </div>
//                     </div>
//                   </td>
//                   <td className="px-6 py-4">
//                     <div className="flex flex-col gap-1.5 items-start">
//                       <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border bg-slate-50 text-slate-600 border-slate-200">
//                         {order.order_status}
//                       </div>
//                       <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border
//                         ${order.status === 'Pending' ? 'bg-amber-50 text-amber-600 border-amber-200' : 
//                           order.status === 'In-Progress' ? 'bg-brand-active text-brand-primary border-brand-active' : 
//                           'bg-emerald-50 text-emerald-600 border-emerald-200'}
//                       `}>
//                         {order.status}
//                       </div>
//                     </div>
//                   </td>
//                   <td className="px-6 py-4 text-right relative">
//                     <button 
//                       onClick={() => setActiveMenu(activeMenu === (order.order_id || order.id) ? null : (order.order_id || order.id))}
//                       className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
//                     >
//                       <MoreVertical size={18} />
//                     </button>
                    
//                     {activeMenu === (order.order_id || order.id) && (
//                       <div className="absolute right-8 top-10 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-10 animate-in fade-in slide-in-from-top-2">
//                         <button 
//                           onClick={() => {
//                             setSelectedOrder(order);
//                             setActiveMenu(null);
//                           }}
//                           className="w-full text-left px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2"
//                         >
//                           <Eye size={14} /> View Order Details
//                         </button>
//                         {order.status === 'Pending' && (
//                           <button 
//                             onClick={() => handleStartScan(order.order_id || order.id)}
//                             disabled={processingId === (order.order_id || order.id)}
//                             className="w-full text-left px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-brand-primary flex items-center gap-2 disabled:opacity-50"
//                           >
//                             {processingId === (order.order_id || order.id) ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} fill="currentColor" />}
//                             Start Scan
//                           </button>
//                         )}
//                       </div>
//                     )}
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       </div>

//       {/* Order Details Modal */}
//       {selectedOrder && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
//           <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
//             <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
//               <div>
//                 <h3 className="text-lg font-black text-slate-800">Order Details</h3>
//                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">#{selectedOrder.order_id || selectedOrder.id} • {selectedOrder.service_name}</p>
//               </div>
//               <button 
//                 onClick={() => setSelectedOrder(null)}
//                 className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
//               >
//                 <X size={20} />
//               </button>
//             </div>
            
//             <div className="p-8 overflow-y-auto space-y-8">
//               {/* Patient Info */}
//               <div>
//                 <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
//                   <User size={14} /> Patient Information
//                 </h4>
//                 <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
//                   <div>
//                     <p className="text-[10px] font-bold text-slate-400 uppercase">Name</p>
//                     <p className="text-sm font-bold text-slate-800">{selectedOrder.first_name} {selectedOrder.last_name}</p>
//                   </div>
//                   <div>
//                     <p className="text-[10px] font-bold text-slate-400 uppercase">MRN</p>
//                     <p className="text-sm font-mono font-bold text-slate-800">{selectedOrder.mrn}</p>
//                   </div>
//                   <div>
//                     <p className="text-[10px] font-bold text-slate-400 uppercase">Age / Gender</p>
//                     <p className="text-sm font-bold text-slate-800">{selectedOrder.display_age || `${selectedOrder.age_years}y`} • {selectedOrder.gender}</p>
//                   </div>
//                   <div>
//                     <p className="text-[10px] font-bold text-slate-400 uppercase">Phone</p>
//                     <p className="text-sm font-bold text-slate-800">{selectedOrder.phone || 'N/A'}</p>
//                   </div>
//                 </div>
//               </div>

//               {/* Clinical Info */}
//               <div>
//                 <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
//                   <Stethoscope size={14} /> Clinical Information
//                 </h4>
//                 <div className="space-y-4">
//                   <div className="bg-brand-active/50 p-4 rounded-2xl border border-brand-active">
//                     <p className="text-[10px] font-bold text-brand-primary uppercase mb-1">Diagnosis</p>
//                     <p className="text-sm font-bold text-brand-primary">
//                       {selectedOrder.diagnosis ? `${selectedOrder.icd10_code ? `[${selectedOrder.icd10_code}] ` : ''}${selectedOrder.diagnosis}` : 'No diagnosis recorded'}
//                     </p>
//                   </div>
                  
//                   {selectedOrder.clinical_note && (
//                     <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
//                       <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Clinical Notes</p>
//                       <div className="text-sm font-medium text-slate-700 space-y-1">
//                         {selectedOrder.clinical_note.split('|').map((note: string, i: number) => (
//                           <p key={i}>{note.trim()}</p>
//                         ))}
//                       </div>
//                     </div>
//                   )}

//                   {selectedOrder.temperature && (
//                     <div className="grid grid-cols-4 gap-2">
//                       <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
//                         <p className="text-[10px] font-bold text-slate-400 uppercase">Temp</p>
//                         <p className="text-sm font-black text-slate-700">{selectedOrder.temperature}°C</p>
//                       </div>
//                       <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
//                         <p className="text-[10px] font-bold text-slate-400 uppercase">BP</p>
//                         <p className="text-sm font-black text-slate-700">{selectedOrder.systolic_bp}/{selectedOrder.diastolic_bp}</p>
//                       </div>
//                       <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
//                         <p className="text-[10px] font-bold text-slate-400 uppercase">Pulse</p>
//                         <p className="text-sm font-black text-slate-700">{selectedOrder.pulse}</p>
//                       </div>
//                       <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
//                         <p className="text-[10px] font-bold text-slate-400 uppercase">SpO2</p>
//                         <p className="text-sm font-black text-slate-700">{selectedOrder.spo2}%</p>
//                       </div>
//                     </div>
//                   )}
//                 </div>
//               </div>

//               {/* Encounter & Billing */}
//               <div>
//                 <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
//                   <FileText size={14} /> Encounter & Billing
//                 </h4>
//                 <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
//                   <div>
//                     <p className="text-[10px] font-bold text-slate-400 uppercase">Encounter</p>
//                     <p className="text-sm font-mono font-bold text-slate-800">{selectedOrder.encounter_number}</p>
//                     <p className="text-[10px] font-bold text-slate-500 mt-0.5">{selectedOrder.encounter_type}</p>
//                   </div>
//                   <div>
//                     <p className="text-[10px] font-bold text-slate-400 uppercase">Location</p>
//                     <p className="text-sm font-bold text-slate-800">{selectedOrder.ward || 'Outpatient'}</p>
//                     {selectedOrder.room_number && <p className="text-[10px] font-bold text-slate-500 mt-0.5">{selectedOrder.room_number} • {selectedOrder.bed_number}</p>}
//                   </div>
//                   <div>
//                     <p className="text-[10px] font-bold text-slate-400 uppercase">Payment Status</p>
//                     <p className={`text-sm font-black ${selectedOrder.invoice_status === 'PAID' ? 'text-emerald-600' : 'text-amber-600'}`}>
//                       {selectedOrder.invoice_status || 'PENDING'}
//                     </p>
//                   </div>
//                   <div>
//                     <p className="text-[10px] font-bold text-slate-400 uppercase">Payer</p>
//                     <p className="text-sm font-bold text-slate-800">{selectedOrder.payer_name || 'N/A'}</p>
//                   </div>
//                 </div>
//               </div>
//             </div>
            
//             <div className="px-8 py-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
//               <button 
//                 onClick={() => setSelectedOrder(null)}
//                 className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors"
//               >
//                 Close
//               </button>
//               {selectedOrder.status === 'Pending' && (
//                 <button 
//                   onClick={() => {
//                     handleStartScan(selectedOrder.order_id || selectedOrder.id);
//                     setSelectedOrder(null);
//                   }}
//                   className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-slate-700 hover:bg-slate-800 transition-colors shadow-md flex items-center gap-2"
//                 >
//                   <Play size={16} fill="currentColor" /> Start Scan
//                 </button>
//               )}
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default RadiologyWorklist;
