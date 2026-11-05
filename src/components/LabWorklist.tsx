import React, { useState, useEffect } from 'react';
import {
  Search,
  Clock,
  Droplets,
  ClipboardList,
  Activity,
  Loader2,
  MoreVertical,
  Eye,
  X,
  Printer,
  RefreshCw,
  Tag,
  CheckCircle2,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Stethoscope,
  Phone,
  Lock,
  AlertTriangle
} from 'lucide-react';
import { labService } from '../services/lab.service';
import { useNotification } from '../context/NotificationContext';
import { createPortal } from 'react-dom';

const printReferenceLabel = (order: any) => {
  localStorage.setItem('printLabOrder', JSON.stringify(order));
  const refNo = order.reference_no || String(order.id);
  window.open(`/print/lab-label/${refNo}`, '_blank');
};

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

const LabWorklist: React.FC = () => {
  const { notify } = useNotification();

  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [activeMenu, setActiveMenu] = useState<number | null>(null);
  const [searchOrders, setSearchOrders] = useState('');

  const [pendingSamples, setPendingSamples] = useState<any[]>([]);
  const [samplesLoading, setSamplesLoading] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printOrder, setPrintOrder] = useState<any | null>(null);
  const [searchPrint, setSearchPrint] = useState('');

  const [activeTab, setActiveTab] = useState<'pending' | 'print_reference'>('pending');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // New States for Collection Modal
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [orderToCollect, setOrderToCollect] = useState<any | null>(null);
  const [collectionType, setCollectionType] = useState<'IN_HOUSE' | 'OUTSOURCE'>('IN_HOUSE');
  const [outsourceCenters, setOutsourceCenters] = useState<any[]>([]);
  const [selectedCenterId, setSelectedCenterId] = useState<string>('');
  const [centersLoading, setCentersLoading] = useState(false);

  const fetchOutsourceCenters = async () => {
    setCentersLoading(true);
    try {
      const response: any = await labService.getOutsourceCenters();
      const centers = Array.isArray(response) ? response : (response?.data || response?.results || []);
      setOutsourceCenters(centers);
      if (centers.length > 0) setSelectedCenterId(String(centers[0].id));
    } catch (err: any) {
      notify('Failed to load outsource centers', 'error');
    } finally {
      setCentersLoading(false);
    }
  };

  useEffect(() => {
    fetchOutsourceCenters();
  }, []);
  
  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const response: any = await labService.getPendingOrders();
      const dataArray = Array.isArray(response) ? response : (response?.data || response?.results || []);
      const validOrders = dataArray.filter((o: any) => o.service_name !== 'Lab/Anc/Doctor');
      setOrders(validOrders);
    } catch (err: any) {
      notify(err.response?.data?.message || 'Failed to load lab orders', 'error');
    } finally {
      setOrdersLoading(false);
    }
  };

  const fetchPendingSamples = async () => {
    setSamplesLoading(true);
    try {
      const response: any = await labService.getSamples();
      const dataArray = Array.isArray(response) ? response : (response?.data || response?.results || []);
      
      // FIXED FILTER LOGIC: Include all active uncompleted statuses to show in the Print Reference tab
      const validStatuses = ['PENDING', 'COLLECTED', 'PROCESSING', 'TECH_REVIEW', 'VERIFIED'];
      
      const validSamples = dataArray.filter((s: any) => 
        validStatuses.includes(s.workflow_status) && 
        s.service_name !== 'Lab/Anc/Doctor' && 
        s.sample_name !== 'Lab/Anc/Doctor'
      );
      setPendingSamples(validSamples);
    } catch (err: any) {
      notify(err.response?.data?.message || 'Failed to load samples', 'error');
    } finally {
      setSamplesLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  useEffect(() => {
    if (activeTab === 'print_reference' && pendingSamples.length === 0 && !samplesLoading) {
      fetchPendingSamples();
    }
  }, [activeTab]);

  useEffect(() => {
    const handleClickOutside = () => setActiveMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const openCollectModal = (order: any) => {
    if (isOrderLocked(order)) {
      notify('This OPD order is locked awaiting billing payment.', 'warning');
      return;
    }
    setOrderToCollect(order);
    setCollectionType('IN_HOUSE');
    setIsCollectModalOpen(true);
    setActiveMenu(null);
  };

  const confirmCollection = async () => {
    if (!orderToCollect) return;
    
    if (collectionType === 'OUTSOURCE' && !selectedCenterId) {
      notify('Please select an outsource center', 'warning');
      return;
    }

    const orderId = orderToCollect.order_id || orderToCollect.id;
    setProcessingId(orderId);
    setIsCollectModalOpen(false);

    try {
      await labService.collectSample({
        order_id: orderId,
        collection_type: collectionType,
        outsource_center_id: collectionType === 'OUTSOURCE' ? parseInt(selectedCenterId) : null
      });
      notify('Sample collection processed successfully.', 'success');
      fetchOrders();
    } catch (err: any) {
      notify(err.response?.data?.message || 'Collection failed', 'error');
    } finally {
      setProcessingId(null);
      setOrderToCollect(null);
      setSelectedOrder(null);
    }
  };

  const filteredOrders = orders.filter(o => {
    const q = searchOrders.toLowerCase();
    return (
      `${o.first_name} ${o.last_name}`.toLowerCase().includes(q) ||
      (o.mrn || '').toLowerCase().includes(q) ||
      (o.service_name || '').toLowerCase().includes(q) ||
      (o.encounter_number || '').toLowerCase().includes(q)
    );
  });

  const filteredPrint = pendingSamples.filter(s => {
    const q = searchPrint.toLowerCase();
    return (
      (s.patient_name || '').toLowerCase().includes(q) ||
      (s.mrn || '').toLowerCase().includes(q) ||
      (s.sample_name || s.service_name || '').toLowerCase().includes(q) ||
      (s.reference_no || '').toLowerCase().includes(q) ||
      (s.encounter_number || '').toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchOrders, searchPrint, activeTab]);

  const totalPagesPending = Math.ceil(filteredOrders.length / itemsPerPage) || 1;
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalPagesPrint = Math.ceil(filteredPrint.length / itemsPerPage) || 1;
  const paginatedPrint = filteredPrint.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const inLabCount = orders.filter(o => o.processing_status && o.processing_status !== 'NOT_COLLECTED').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* {activeTab === 'pending' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-[28px] border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending Collection</p>
              <p className="text-3xl font-black text-slate-800">{orders.length}</p>
            </div>
            <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl"><Droplets size={22}/></div>
          </div>
          <div className="bg-white p-5 rounded-[28px] border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">In Lab Analysis</p>
              <p className="text-3xl font-black text-amber-600">{inLabCount || '—'}</p>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl"><Activity size={22}/></div>
          </div>
        </div>
      )} */}

      <div className="bg-white rounded-[40px] border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-8 py-5 bg-white border-b border-slate-100 flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl w-fit">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all whitespace-nowrap ${
                activeTab === 'pending'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="text-xl font-black text-slate-800">{orders.length}</span> Pending Lab Investigations
            </button>
            <button
              onClick={() => setActiveTab('print_reference')}
              className={`px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all whitespace-nowrap ${
                activeTab === 'print_reference'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Print Reference
            </button>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <div className="relative w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder={activeTab === 'pending' ? 'Search by Patient Name, Test or Encounter...' : 'Search patient, ref no, MRN...'}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-400 transition-all font-medium"
                value={activeTab === 'pending' ? searchOrders : searchPrint}
                onChange={(e) => activeTab === 'pending' ? setSearchOrders(e.target.value) : setSearchPrint(e.target.value)}
              />
            </div>
            <button
              onClick={() => activeTab === 'pending' ? fetchOrders() : fetchPendingSamples()}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-slate-100 transition-all"
            >
              <RefreshCw size={15} className={(ordersLoading || samplesLoading) ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        {activeTab === 'pending' && (
          <>
            <div className="px-8 py-4 border-b border-slate-100 bg-slate-50/30">
              <h3 className="text-xs font-black text-purple-600 uppercase tracking-widest flex items-center gap-2">
                <ClipboardList size={14} /> Pending Lab Investigations
              </h3>
            </div>

            <div className="overflow-x-auto pb-24">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-6 py-4">#</th>
                    <th className="px-6 py-4">Patient Details</th>
                    <th className="px-6 py-4">Location</th>
                    <th className="px-6 py-4">Investigation / Ordered By</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {ordersLoading ? (
                    <tr>
                      <td colSpan={6} className="py-20 text-center">
                        <Loader2 size={36} className="animate-spin mx-auto text-purple-600 mb-3" />
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Orders...</p>
                      </td>
                    </tr>
                  ) : paginatedOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-20 text-center">
                        <ClipboardList size={40} className="mx-auto text-slate-300 mb-4" />
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No pending investigations</p>
                      </td>
                    </tr>
                  ) : paginatedOrders.map((order) => {
                    const uniqueId = order.order_id || order.id;
                    const locked = isOrderLocked(order);

                    return (
                      <tr key={uniqueId} className={`group transition-colors ${locked ? 'bg-amber-50/20 hover:bg-amber-50/40' : 'hover:bg-slate-50/50'}`}>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1.5">
                            <span className={`inline-flex items-center justify-center px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border w-fit ${
                              order.encounter_type === 'ERD' ? 'bg-red-50 text-red-600 border-red-100' :
                              order.encounter_type === 'IPD' ? 'bg-brand-active text-brand-primary border-brand-active' :
                              'bg-emerald-50 text-emerald-600 border-emerald-100'
                            }`}>
                              {order.encounter_type || 'OPD'}
                            </span>
                            <div className="text-[10px] font-bold text-slate-400 leading-tight font-mono">
                              <div>{order.ordered_at?.split(' ')[0]}</div>
                              <div>{order.ordered_at?.split(' ')[1]}</div>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-black text-xs shrink-0">
                              {(order.first_name?.[0] || '?')}{(order.last_name?.[0] || '')}
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-800">{order.first_name} {order.last_name}</p>
                              <div className="flex flex-col gap-0.5 mt-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-mono font-bold text-brand-primary">MRN: {order.mrn}</span>
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    {order.display_age || (order.age_years ? `${order.age_years}y` : '')}
                                    {order.gender ? ` · ${order.gender}` : ''}
                                  </span>
                                </div>
                                {order.phone && (
                                  <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                                    <Phone size={10} className="text-slate-400" />
                                    {order.phone}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 text-sm font-bold text-slate-600">
                              <MapPin size={13} className="text-slate-400" />
                              {order.ward || 'Outpatient'}
                            </div>
                            {order.room_number && (
                              <p className="text-[10px] text-slate-400 font-medium ml-4.5">{order.room_number} · {order.bed_number}</p>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1.5">
                            <div>
                              <p className="text-sm font-black text-slate-800">{order.service_name}</p>
                              <p className="text-[10px] font-mono text-slate-400 mt-0.5">{order.encounter_number}</p>
                            </div>
                            {order.doctor_name && (
                              <div className="flex items-center gap-1 text-[10px] font-bold text-purple-600/80 bg-purple-50/50 w-fit px-1.5 py-0.5 rounded">
                                <Stethoscope size={10} />
                                {order.doctor_name.replace(/^Dr\.?\s*/i, 'Dr. ')}
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1.5 items-start">
                            {locked ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-slate-800 text-white shadow-sm border border-slate-700">
                                <Lock size={12} className="text-amber-400" /> Unpaid (Locked)
                              </span>
                            ) : (
                              <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border bg-emerald-50 text-emerald-700 border-emerald-200 w-fit">
                                {order.processing_status || order.order_status || 'PENDING'}
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
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                          >
                            <MoreVertical size={18} />
                          </button>

                          {activeMenu === uniqueId && (
                            <div className="absolute right-8 top-10 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-10 animate-in fade-in slide-in-from-top-2">
                              <button
                                onClick={() => { setSelectedOrder(order); setActiveMenu(null); }}
                                className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-purple-600 flex items-center gap-2"
                              >
                                <Eye size={14} /> View Details
                              </button>
                              <button
                                onClick={() => openCollectModal(order)}
                                disabled={processingId === uniqueId || locked}
                                className={`w-full text-left px-4 py-2.5 text-xs font-bold flex items-center gap-2 border-t border-slate-50 transition-colors ${
                                  locked
                                    ? 'text-slate-400 bg-slate-50 cursor-not-allowed'
                                    : 'text-slate-700 hover:bg-slate-50 hover:text-emerald-600'
                                }`}
                              >
                                {processingId === uniqueId ? (
                                  <Loader2 size={14} className="animate-spin text-purple-600" />
                                ) : locked ? (
                                  <Lock size={14} className="text-amber-500" />
                                ) : (
                                  <CheckCircle2 size={14} className="text-emerald-600" />
                                )}
                                {locked ? 'Awaiting Payment' : 'Collect Sample'}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPagesPending > 1 && (
              <div className="px-8 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredOrders.length)} of {filteredOrders.length}
                </span>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 text-slate-400 hover:text-purple-600 disabled:opacity-50 disabled:hover:text-slate-400 rounded-lg transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-xs font-black text-slate-700 px-3">Page {currentPage} of {totalPagesPending}</span>
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPagesPending, p + 1))}
                    disabled={currentPage === totalPagesPending}
                    className="p-1.5 text-slate-400 hover:text-purple-600 disabled:opacity-50 disabled:hover:text-slate-400 rounded-lg transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'print_reference' && (
          <>
            <div className="px-8 py-4 border-b border-slate-100 bg-slate-50/30">
              <h3 className="text-xs font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                <Tag size={14} /> Pending Samples — Print Reference Labels
              </h3>
            </div>

            <div className="overflow-x-auto pb-24">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-6 py-4">Ordered At</th>
                    <th className="px-6 py-4">Patient</th>
                    <th className="px-6 py-4">Investigation</th>
                    <th className="px-6 py-4">Reference No.</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {samplesLoading ? (
                    <tr>
                      <td colSpan={5} className="py-20 text-center">
                        <Loader2 size={36} className="animate-spin mx-auto text-emerald-600 mb-3" />
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Samples...</p>
                      </td>
                    </tr>
                  ) : paginatedPrint.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-20 text-center">
                        <Tag size={40} className="mx-auto text-slate-300 mb-4" />
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No pending samples found</p>
                      </td>
                    </tr>
                  ) : paginatedPrint.map((sample) => (
                    <tr key={sample.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-[10px] font-bold text-slate-500 leading-tight font-mono">
                          <div className="flex items-center gap-1"><Clock size={10}/> {sample.ordered_at?.split(' ')[0]}</div>
                          <div className="ml-3.5 text-slate-400">{sample.ordered_at?.split(' ')[1]}</div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <p className="text-sm font-black text-slate-800">{sample.patient_name}</p>
                        <p className="text-[10px] font-mono font-bold text-brand-primary mt-0.5">MRN: {sample.mrn}</p>
                      </td>

                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-700">{sample.sample_name || sample.service_name}</p>
                        <p className="text-[10px] font-mono text-slate-400 mt-0.5">{sample.encounter_number}</p>
                      </td>

                      <td className="px-6 py-4">
                        {sample.reference_no ? (
                          <span className="text-[11px] font-mono font-black text-brand-primary uppercase bg-brand-active px-2.5 py-1 rounded-lg">
                            {sample.reference_no}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Not assigned</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenu(activeMenu === sample.id ? null : sample.id);
                          }}
                          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                        >
                          <MoreVertical size={18} />
                        </button>

                        {activeMenu === sample.id && (
                          <div className="absolute right-8 top-10 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-10 animate-in fade-in slide-in-from-top-2">
                            <button
                              onClick={() => { setSelectedOrder(sample); setActiveMenu(null); }}
                              className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-purple-600 flex items-center gap-2"
                            >
                              <Eye size={14} /> View Details
                            </button>
                            {sample.reference_no && (
                              <button
                                onClick={() => { setPrintOrder(sample); setIsPrintModalOpen(true); setActiveMenu(null); }}
                                className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-emerald-600 flex items-center gap-2"
                              >
                                <Printer size={14} /> Print Label
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPagesPrint > 1 && (
              <div className="px-8 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredPrint.length)} of {filteredPrint.length}
                </span>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 text-slate-400 hover:text-emerald-600 disabled:opacity-50 disabled:hover:text-slate-400 rounded-lg transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-xs font-black text-slate-700 px-3">Page {currentPage} of {totalPagesPrint}</span>
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPagesPrint, p + 1))}
                    disabled={currentPage === totalPagesPrint}
                    className="p-1.5 text-slate-400 hover:text-emerald-600 disabled:opacity-50 disabled:hover:text-slate-400 rounded-lg transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Order Details Side Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[88vh]">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-lg font-black text-slate-800">Order Details</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                  {selectedOrder.service_name} · {selectedOrder.encounter_number}
                </p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto space-y-6">
              {isOrderLocked(selectedOrder) && (
                <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-2xl flex items-start gap-3">
                  <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                  <div>
                    <h4 className="font-black text-xs uppercase tracking-widest">Locked — Awaiting Billing Payment</h4>
                    <p className="text-xs mt-1 font-medium text-amber-800">
                      This order cannot be collected until the patient completes payment at the billing counter.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                {[
                  ['Patient', `${selectedOrder.first_name || selectedOrder.patient_name || ''} ${selectedOrder.last_name || ''}`],
                  ['MRN', selectedOrder.mrn],
                  ['Age / Gender', `${selectedOrder.display_age || selectedOrder.age_years + 'y'} · ${selectedOrder.gender || '-'}`],
                  ['Contact', selectedOrder.phone || 'N/A'],
                  ['Ward / Location', selectedOrder.ward || 'Outpatient'],
                  ['Status', isOrderLocked(selectedOrder) ? 'UNPAID (LOCKED)' : (selectedOrder.order_status || selectedOrder.processing_status || 'PENDING')],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{label}</p>
                    <p className="text-sm font-bold text-slate-800">{value}</p>
                  </div>
                ))}
              </div>

              {selectedOrder.diagnosis && (
                <div className="bg-brand-active/50 p-4 rounded-2xl border border-brand-active">
                  <p className="text-[10px] font-bold text-brand-primary uppercase mb-1">Diagnosis</p>
                  <p className="text-sm font-bold text-brand-primary">
                    {selectedOrder.icd10_code ? `[${selectedOrder.icd10_code}] ` : ''}{selectedOrder.diagnosis}
                  </p>
                </div>
              )}

              {selectedOrder.clinical_note && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Clinical Notes</p>
                  <div className="text-sm font-medium text-slate-700 space-y-1">
                    {selectedOrder.clinical_note.split('|').map((note: string, i: number) => (
                      <p key={i}>{note.trim()}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-8 py-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setSelectedOrder(null)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors">
                Close
              </button>
              
              {isOrderLocked(selectedOrder) ? (
                <div className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-slate-400 bg-slate-200/70 border border-slate-300 cursor-not-allowed flex items-center gap-2">
                  <Lock size={14} /> Locked (Unpaid)
                </div>
              ) : (
                <button
                  onClick={() => { openCollectModal(selectedOrder); setSelectedOrder(null); }}
                  disabled={processingId === (selectedOrder.order_id || selectedOrder.id) || selectedOrder.processing_status === 'IN_PROGRESS'}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 transition-colors shadow-md shadow-purple-200 flex items-center gap-2 disabled:opacity-50"
                >
                  {processingId === (selectedOrder.order_id || selectedOrder.id) ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Droplets size={16} />
                  )}
                  Collect Sample
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Print Reference Preview Modal */}
      {isPrintModalOpen && printOrder && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsPrintModalOpen(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Printer size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">Reference Label</h3>
                  <p className="text-xs text-slate-500 font-bold">50mm × 25mm thermal</p>
                </div>
              </div>
              <button onClick={() => setIsPrintModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 bg-white font-mono space-y-2">
                <p className="text-xs font-black text-slate-800 tracking-tight">{printOrder.reference_no}</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                  <div><span className="text-[9px] text-slate-400 font-bold uppercase">Patient: </span><span className="font-bold text-slate-700">{printOrder.patient_name}</span></div>
                  <div><span className="text-[9px] text-slate-400 font-bold uppercase">MRN: </span><span className="font-bold text-slate-700">{printOrder.mrn}</span></div>
                  <div><span className="text-[9px] text-slate-400 font-bold uppercase">Test: </span><span className="font-bold text-slate-700">{printOrder.sample_name || printOrder.service_name}</span></div>
                  <div><span className="text-[9px] text-slate-400 font-bold uppercase">Enc: </span><span className="font-bold text-slate-700 text-[9px]">{printOrder.encounter_number}</span></div>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2">
                  {printOrder.barcode_path && (
                    <img src={`${(import.meta as any).env?.VITE_API_BASE_URL || ''}${printOrder.barcode_path}`} alt="Barcode" className="h-6 w-auto max-w-[80%]" />
                  )}
                  {printOrder.qr_code_path && (
                    <img src={`${(import.meta as any).env?.VITE_API_BASE_URL || ''}${printOrder.qr_code_path}`} alt="QR Code" className="h-8 w-8 ml-2" />
                  )}
                </div>
                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest text-center mt-2">gracespringhospitals · lab</p>
              </div>
              <p className="text-[10px] text-slate-400 text-center mt-3">Preview · Prints at 50mm × 25mm</p>
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setIsPrintModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={() => { printReferenceLabel(printOrder); setIsPrintModalOpen(false); }}
                className="px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all flex items-center gap-1.5"
              >
                <Printer size={16} /> Print Now
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Sample Collection Options Modal */}
      {isCollectModalOpen && orderToCollect && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-800">Process Sample</h3>
                <p className="text-xs font-bold text-slate-500 mt-1">{orderToCollect.service_name}</p>
              </div>
              <button onClick={() => setIsCollectModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Collection Destination</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setCollectionType('IN_HOUSE')}
                    className={`p-4 rounded-2xl border-2 text-left transition-all flex flex-col items-start gap-2 ${
                      collectionType === 'IN_HOUSE' 
                        ? 'border-purple-600 bg-purple-50 text-purple-700' 
                        : 'border-slate-100 hover:border-slate-200 text-slate-500'
                    }`}
                  >
                    <Activity size={24} className={collectionType === 'IN_HOUSE' ? 'text-purple-600' : 'text-slate-400'} />
                    <span className="font-bold text-sm">In-House</span>
                  </button>

                  <button
                    onClick={() => setCollectionType('OUTSOURCE')}
                    className={`p-4 rounded-2xl border-2 text-left transition-all flex flex-col items-start gap-2 ${
                      collectionType === 'OUTSOURCE' 
                        ? 'border-blue-600 bg-blue-50 text-blue-700' 
                        : 'border-slate-100 hover:border-slate-200 text-slate-500'
                    }`}
                  >
                    <MapPin size={24} className={collectionType === 'OUTSOURCE' ? 'text-blue-600' : 'text-slate-400'} />
                    <span className="font-bold text-sm">Outsource</span>
                  </button>
                </div>
              </div>

              {collectionType === 'OUTSOURCE' && (
                <div className="animate-in slide-in-from-top-2 fade-in">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">
                    Select Partner Laboratory
                  </label>
                  {centersLoading ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500 p-3 bg-slate-50 rounded-xl">
                      <Loader2 size={16} className="animate-spin" /> Loading centers...
                    </div>
                  ) : (
                    <select
                      value={selectedCenterId}
                      onChange={(e) => setSelectedCenterId(e.target.value)}
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                      <option value="" disabled>Select a diagnostic center...</option>
                      {outsourceCenters.map((center) => (
                        <option key={center.id} value={center.id}>
                          {center.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setIsCollectModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100">
                Cancel
              </button>
              <button
                onClick={confirmCollection}
                disabled={collectionType === 'OUTSOURCE' && !selectedCenterId}
                className={`px-5 py-2.5 text-sm font-bold text-white rounded-xl shadow-lg transition-all flex items-center gap-2 ${
                  collectionType === 'IN_HOUSE' 
                    ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-200' 
                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <Droplets size={16} /> Confirm Collection
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default LabWorklist;


// import React, { useState, useEffect } from 'react';
// import {
//   Search,
//   Clock,
//   Droplets,
//   ClipboardList,
//   Activity,
//   Loader2,
//   MoreVertical,
//   Eye,
//   X,
//   Printer,
//   RefreshCw,
//   Tag,
//   CheckCircle2,
//   MapPin,
//   ChevronLeft,
//   ChevronRight,
//   Stethoscope,
//   Phone,
//   Lock,
//   AlertTriangle
// } from 'lucide-react';
// import { labService } from '../services/lab.service';
// import { useNotification } from '../context/NotificationContext';
// import { createPortal } from 'react-dom';

// const printReferenceLabel = (order: any) => {
//   localStorage.setItem('printLabOrder', JSON.stringify(order));
//   const refNo = order.reference_no || String(order.id);
//   window.open(`/print/lab-label/${refNo}`, '_blank');
// };

// const isOrderLocked = (o: any): boolean => {
//   if (!o) return false;
//   const encType = String(o.encounter_type || '').toUpperCase();
//   if (encType !== 'OPD') return false;

//   const orderStatus = String(o.order_status || o.status || '').toUpperCase();
//   if (orderStatus === 'REQUESTED' || orderStatus === 'PARTIALLY_PAID' || orderStatus === 'UNPAID') {
//     return true;
//   }

//   const invoiceStatus = String(o.invoice_status || '').toUpperCase();
//   if (invoiceStatus && invoiceStatus !== 'PAID') {
//     return true;
//   }

//   return orderStatus !== 'PAID' && orderStatus !== 'COMPLETED' && orderStatus !== 'IN_PROGRESS';
// };

// const LabWorklist: React.FC = () => {
//   const { notify } = useNotification();

//   const [orders, setOrders] = useState<any[]>([]);
//   const [ordersLoading, setOrdersLoading] = useState(true);
//   const [processingId, setProcessingId] = useState<number | null>(null);
//   const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
//   const [activeMenu, setActiveMenu] = useState<number | null>(null);
//   const [searchOrders, setSearchOrders] = useState('');

//   const [pendingSamples, setPendingSamples] = useState<any[]>([]);
//   const [samplesLoading, setSamplesLoading] = useState(false);
//   const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
//   const [printOrder, setPrintOrder] = useState<any | null>(null);
//   const [searchPrint, setSearchPrint] = useState('');

//   const [activeTab, setActiveTab] = useState<'pending' | 'print_reference'>('pending');

//   const [currentPage, setCurrentPage] = useState(1);
//   const itemsPerPage = 10;

//   // New States for Collection Modal
//   const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
//   const [orderToCollect, setOrderToCollect] = useState<any | null>(null);
//   const [collectionType, setCollectionType] = useState<'IN_HOUSE' | 'OUTSOURCE'>('IN_HOUSE');
//   const [outsourceCenters, setOutsourceCenters] = useState<any[]>([]);
//   const [selectedCenterId, setSelectedCenterId] = useState<string>('');
//   const [centersLoading, setCentersLoading] = useState(false);

//   const fetchOutsourceCenters = async () => {
//     setCentersLoading(true);
//     try {
//       const response: any = await labService.getOutsourceCenters();
//       const centers = Array.isArray(response) ? response : (response?.data || response?.results || []);
//       setOutsourceCenters(centers);
//       if (centers.length > 0) setSelectedCenterId(String(centers[0].id));
//     } catch (err: any) {
//       notify('Failed to load outsource centers', 'error');
//     } finally {
//       setCentersLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchOutsourceCenters();
//   }, []);
  
//   const fetchOrders = async () => {
//     setOrdersLoading(true);
//     try {
//       const response: any = await labService.getPendingOrders();
//       const dataArray = Array.isArray(response) ? response : (response?.data || response?.results || []);
//       const validOrders = dataArray.filter((o: any) => o.service_name !== 'Lab/Anc/Doctor');
//       setOrders(validOrders);
//     } catch (err: any) {
//       notify(err.response?.data?.message || 'Failed to load lab orders', 'error');
//     } finally {
//       setOrdersLoading(false);
//     }
//   };

//   const fetchPendingSamples = async () => {
//     setSamplesLoading(true);
//     try {
//       const response: any = await labService.getSamples();
//       const dataArray = Array.isArray(response) ? response : (response?.data || response?.results || []);
//       const validSamples = dataArray.filter((s: any) => 
//         s.workflow_status === 'PENDING' && 
//         s.service_name !== 'Lab/Anc/Doctor' && 
//         s.sample_name !== 'Lab/Anc/Doctor'
//       );
//       setPendingSamples(validSamples);
//     } catch (err: any) {
//       notify(err.response?.data?.message || 'Failed to load samples', 'error');
//     } finally {
//       setSamplesLoading(false);
//     }
//   };

//   useEffect(() => { fetchOrders(); }, []);

//   useEffect(() => {
//     if (activeTab === 'print_reference' && pendingSamples.length === 0 && !samplesLoading) {
//       fetchPendingSamples();
//     }
//   }, [activeTab]);

//   useEffect(() => {
//     const handleClickOutside = () => setActiveMenu(null);
//     document.addEventListener('click', handleClickOutside);
//     return () => document.removeEventListener('click', handleClickOutside);
//   }, []);

//   const openCollectModal = (order: any) => {
//     if (isOrderLocked(order)) {
//       notify('This OPD order is locked awaiting billing payment.', 'warning');
//       return;
//     }
//     setOrderToCollect(order);
//     setCollectionType('IN_HOUSE');
//     setIsCollectModalOpen(true);
//     setActiveMenu(null);
//   };

//   const confirmCollection = async () => {
//     if (!orderToCollect) return;
    
//     if (collectionType === 'OUTSOURCE' && !selectedCenterId) {
//       notify('Please select an outsource center', 'warning');
//       return;
//     }

//     const orderId = orderToCollect.order_id || orderToCollect.id;
//     setProcessingId(orderId);
//     setIsCollectModalOpen(false);

//     try {
//       await labService.collectSample({
//         order_id: orderId,
//         collection_type: collectionType,
//         outsource_center_id: collectionType === 'OUTSOURCE' ? parseInt(selectedCenterId) : null
//       });
//       notify('Sample collection processed successfully.', 'success');
//       fetchOrders();
//     } catch (err: any) {
//       notify(err.response?.data?.message || 'Collection failed', 'error');
//     } finally {
//       setProcessingId(null);
//       setOrderToCollect(null);
//       setSelectedOrder(null);
//     }
//   };

//   const filteredOrders = orders.filter(o => {
//     const q = searchOrders.toLowerCase();
//     return (
//       `${o.first_name} ${o.last_name}`.toLowerCase().includes(q) ||
//       (o.mrn || '').toLowerCase().includes(q) ||
//       (o.service_name || '').toLowerCase().includes(q) ||
//       (o.encounter_number || '').toLowerCase().includes(q)
//     );
//   });

//   const filteredPrint = pendingSamples.filter(s => {
//     const q = searchPrint.toLowerCase();
//     return (
//       (s.patient_name || '').toLowerCase().includes(q) ||
//       (s.mrn || '').toLowerCase().includes(q) ||
//       (s.sample_name || s.service_name || '').toLowerCase().includes(q) ||
//       (s.reference_no || '').toLowerCase().includes(q) ||
//       (s.encounter_number || '').toLowerCase().includes(q)
//     );
//   });

//   useEffect(() => {
//     setCurrentPage(1);
//   }, [searchOrders, searchPrint, activeTab]);

//   const totalPagesPending = Math.ceil(filteredOrders.length / itemsPerPage) || 1;
//   const paginatedOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

//   const totalPagesPrint = Math.ceil(filteredPrint.length / itemsPerPage) || 1;
//   const paginatedPrint = filteredPrint.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

//   const inLabCount = orders.filter(o => o.processing_status && o.processing_status !== 'NOT_COLLECTED').length;

//   return (
//     <div className="space-y-6 animate-in fade-in duration-500">
//       {/* {activeTab === 'pending' && (
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//           <div className="bg-white p-5 rounded-[28px] border border-slate-200 shadow-sm flex items-center justify-between">
//             <div>
//               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending Collection</p>
//               <p className="text-3xl font-black text-slate-800">{orders.length}</p>
//             </div>
//             <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl"><Droplets size={22}/></div>
//           </div>
//           <div className="bg-white p-5 rounded-[28px] border border-slate-200 shadow-sm flex items-center justify-between">
//             <div>
//               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">In Lab Analysis</p>
//               <p className="text-3xl font-black text-amber-600">{inLabCount || '—'}</p>
//             </div>
//             <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl"><Activity size={22}/></div>
//           </div>
//         </div>
//       )} */}

//       <div className="bg-white rounded-[40px] border border-slate-200 overflow-hidden shadow-sm">
//         <div className="px-8 py-5 bg-white border-b border-slate-100 flex flex-col md:flex-row md:items-center gap-4">
//           <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl w-fit">
//             <button
//               onClick={() => setActiveTab('pending')}
//               className={`px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all whitespace-nowrap ${
//                 activeTab === 'pending'
//                   ? 'bg-white text-purple-600 shadow-sm'
//                   : 'text-slate-500 hover:text-slate-800'
//               }`}
//             >
//               <span className="text-xl font-black text-slate-800">{orders.length}</span> Pending Lab Investigations
//             </button>
//             <button
//               onClick={() => setActiveTab('print_reference')}
//               className={`px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all whitespace-nowrap ${
//                 activeTab === 'print_reference'
//                   ? 'bg-white text-emerald-600 shadow-sm'
//                   : 'text-slate-500 hover:text-slate-800'
//               }`}
//             >
//               Print Reference
//             </button>
//           </div>

//           <div className="flex items-center gap-3 ml-auto">
//             <div className="relative w-72">
//               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
//               <input
//                 type="text"
//                 placeholder={activeTab === 'pending' ? 'Search by Patient Name, Test or Encounter...' : 'Search patient, ref no, MRN...'}
//                 className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-400 transition-all font-medium"
//                 value={activeTab === 'pending' ? searchOrders : searchPrint}
//                 onChange={(e) => activeTab === 'pending' ? setSearchOrders(e.target.value) : setSearchPrint(e.target.value)}
//               />
//             </div>
//             <button
//               onClick={() => activeTab === 'pending' ? fetchOrders() : fetchPendingSamples()}
//               className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-slate-100 transition-all"
//             >
//               <RefreshCw size={15} className={(ordersLoading || samplesLoading) ? 'animate-spin' : ''} /> Refresh
//             </button>
//           </div>
//         </div>

//         {activeTab === 'pending' && (
//           <>
//             <div className="px-8 py-4 border-b border-slate-100 bg-slate-50/30">
//               <h3 className="text-xs font-black text-purple-600 uppercase tracking-widest flex items-center gap-2">
//                 <ClipboardList size={14} /> Pending Lab Investigations
//               </h3>
//             </div>

//             <div className="overflow-x-auto pb-24">
//               <table className="w-full text-left">
//                 <thead>
//                   <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
//                     <th className="px-6 py-4">#</th>
//                     <th className="px-6 py-4">Patient Details</th>
//                     <th className="px-6 py-4">Location</th>
//                     <th className="px-6 py-4">Investigation / Ordered By</th>
//                     <th className="px-6 py-4">Status</th>
//                     <th className="px-6 py-4 text-right">Actions</th>
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y divide-slate-50">
//                   {ordersLoading ? (
//                     <tr>
//                       <td colSpan={6} className="py-20 text-center">
//                         <Loader2 size={36} className="animate-spin mx-auto text-purple-600 mb-3" />
//                         <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Orders...</p>
//                       </td>
//                     </tr>
//                   ) : paginatedOrders.length === 0 ? (
//                     <tr>
//                       <td colSpan={6} className="py-20 text-center">
//                         <ClipboardList size={40} className="mx-auto text-slate-300 mb-4" />
//                         <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No pending investigations</p>
//                       </td>
//                     </tr>
//                   ) : paginatedOrders.map((order) => {
//                     const uniqueId = order.order_id || order.id;
//                     const locked = isOrderLocked(order);

//                     return (
//                       <tr key={uniqueId} className={`group transition-colors ${locked ? 'bg-amber-50/20 hover:bg-amber-50/40' : 'hover:bg-slate-50/50'}`}>
//                         <td className="px-6 py-4">
//                           <div className="flex flex-col gap-1.5">
//                             <span className={`inline-flex items-center justify-center px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border w-fit ${
//                               order.encounter_type === 'ERD' ? 'bg-red-50 text-red-600 border-red-100' :
//                               order.encounter_type === 'IPD' ? 'bg-brand-active text-brand-primary border-brand-active' :
//                               'bg-emerald-50 text-emerald-600 border-emerald-100'
//                             }`}>
//                               {order.encounter_type || 'OPD'}
//                             </span>
//                             <div className="text-[10px] font-bold text-slate-400 leading-tight font-mono">
//                               <div>{order.ordered_at?.split(' ')[0]}</div>
//                               <div>{order.ordered_at?.split(' ')[1]}</div>
//                             </div>
//                           </div>
//                         </td>

//                         <td className="px-6 py-4">
//                           <div className="flex items-center gap-3">
//                             <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-black text-xs shrink-0">
//                               {(order.first_name?.[0] || '?')}{(order.last_name?.[0] || '')}
//                             </div>
//                             <div>
//                               <p className="text-sm font-black text-slate-800">{order.first_name} {order.last_name}</p>
//                               <div className="flex flex-col gap-0.5 mt-0.5">
//                                 <div className="flex items-center gap-2">
//                                   <span className="text-[10px] font-mono font-bold text-brand-primary">MRN: {order.mrn}</span>
//                                   <span className="text-[10px] text-slate-400 font-medium">
//                                     {order.display_age || (order.age_years ? `${order.age_years}y` : '')}
//                                     {order.gender ? ` · ${order.gender}` : ''}
//                                   </span>
//                                 </div>
//                                 {order.phone && (
//                                   <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
//                                     <Phone size={10} className="text-slate-400" />
//                                     {order.phone}
//                                   </div>
//                                 )}
//                               </div>
//                             </div>
//                           </div>
//                         </td>

//                         <td className="px-6 py-4">
//                           <div className="flex flex-col gap-1">
//                             <div className="flex items-center gap-1.5 text-sm font-bold text-slate-600">
//                               <MapPin size={13} className="text-slate-400" />
//                               {order.ward || 'Outpatient'}
//                             </div>
//                             {order.room_number && (
//                               <p className="text-[10px] text-slate-400 font-medium ml-4.5">{order.room_number} · {order.bed_number}</p>
//                             )}
//                           </div>
//                         </td>

//                         <td className="px-6 py-4">
//                           <div className="flex flex-col gap-1.5">
//                             <div>
//                               <p className="text-sm font-black text-slate-800">{order.service_name}</p>
//                               <p className="text-[10px] font-mono text-slate-400 mt-0.5">{order.encounter_number}</p>
//                             </div>
//                             {order.doctor_name && (
//                               <div className="flex items-center gap-1 text-[10px] font-bold text-purple-600/80 bg-purple-50/50 w-fit px-1.5 py-0.5 rounded">
//                                 <Stethoscope size={10} />
//                                 {order.doctor_name.replace(/^Dr\.?\s*/i, 'Dr. ')}
//                               </div>
//                             )}
//                           </div>
//                         </td>

//                         <td className="px-6 py-4">
//                           <div className="flex flex-col gap-1.5 items-start">
//                             {locked ? (
//                               <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-slate-800 text-white shadow-sm border border-slate-700">
//                                 <Lock size={12} className="text-amber-400" /> Unpaid (Locked)
//                               </span>
//                             ) : (
//                               <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border bg-emerald-50 text-emerald-700 border-emerald-200 w-fit">
//                                 {order.processing_status || order.order_status || 'PENDING'}
//                               </span>
//                             )}
//                           </div>
//                         </td>

//                         <td className="px-6 py-4 text-right relative">
//                           <button
//                             onClick={(e) => {
//                               e.stopPropagation();
//                               setActiveMenu(activeMenu === uniqueId ? null : uniqueId);
//                             }}
//                             className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
//                           >
//                             <MoreVertical size={18} />
//                           </button>

//                           {activeMenu === uniqueId && (
//                             <div className="absolute right-8 top-10 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-10 animate-in fade-in slide-in-from-top-2">
//                               <button
//                                 onClick={() => { setSelectedOrder(order); setActiveMenu(null); }}
//                                 className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-purple-600 flex items-center gap-2"
//                               >
//                                 <Eye size={14} /> View Details
//                               </button>
//                               <button
//                                 onClick={() => openCollectModal(order)}
//                                 disabled={processingId === uniqueId || locked}
//                                 className={`w-full text-left px-4 py-2.5 text-xs font-bold flex items-center gap-2 border-t border-slate-50 transition-colors ${
//                                   locked
//                                     ? 'text-slate-400 bg-slate-50 cursor-not-allowed'
//                                     : 'text-slate-700 hover:bg-slate-50 hover:text-emerald-600'
//                                 }`}
//                               >
//                                 {processingId === uniqueId ? (
//                                   <Loader2 size={14} className="animate-spin text-purple-600" />
//                                 ) : locked ? (
//                                   <Lock size={14} className="text-amber-500" />
//                                 ) : (
//                                   <CheckCircle2 size={14} className="text-emerald-600" />
//                                 )}
//                                 {locked ? 'Awaiting Payment' : 'Collect Sample'}
//                               </button>
//                             </div>
//                           )}
//                         </td>
//                       </tr>
//                     );
//                   })}
//                 </tbody>
//               </table>
//             </div>

//             {totalPagesPending > 1 && (
//               <div className="px-8 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
//                 <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
//                   Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredOrders.length)} of {filteredOrders.length}
//                 </span>
//                 <div className="flex items-center gap-1">
//                   <button 
//                     onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
//                     disabled={currentPage === 1}
//                     className="p-1.5 text-slate-400 hover:text-purple-600 disabled:opacity-50 disabled:hover:text-slate-400 rounded-lg transition-colors"
//                   >
//                     <ChevronLeft size={16} />
//                   </button>
//                   <span className="text-xs font-black text-slate-700 px-3">Page {currentPage} of {totalPagesPending}</span>
//                   <button 
//                     onClick={() => setCurrentPage(p => Math.min(totalPagesPending, p + 1))}
//                     disabled={currentPage === totalPagesPending}
//                     className="p-1.5 text-slate-400 hover:text-purple-600 disabled:opacity-50 disabled:hover:text-slate-400 rounded-lg transition-colors"
//                   >
//                     <ChevronRight size={16} />
//                   </button>
//                 </div>
//               </div>
//             )}
//           </>
//         )}

//         {activeTab === 'print_reference' && (
//           <>
//             <div className="px-8 py-4 border-b border-slate-100 bg-slate-50/30">
//               <h3 className="text-xs font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
//                 <Tag size={14} /> Pending Samples — Print Reference Labels
//               </h3>
//             </div>

//             <div className="overflow-x-auto pb-24">
//               <table className="w-full text-left">
//                 <thead>
//                   <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
//                     <th className="px-6 py-4">Ordered At</th>
//                     <th className="px-6 py-4">Patient</th>
//                     <th className="px-6 py-4">Investigation</th>
//                     <th className="px-6 py-4">Reference No.</th>
//                     <th className="px-6 py-4 text-right">Actions</th>
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y divide-slate-50">
//                   {samplesLoading ? (
//                     <tr>
//                       <td colSpan={5} className="py-20 text-center">
//                         <Loader2 size={36} className="animate-spin mx-auto text-emerald-600 mb-3" />
//                         <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Samples...</p>
//                       </td>
//                     </tr>
//                   ) : paginatedPrint.length === 0 ? (
//                     <tr>
//                       <td colSpan={5} className="py-20 text-center">
//                         <Tag size={40} className="mx-auto text-slate-300 mb-4" />
//                         <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No pending samples found</p>
//                       </td>
//                     </tr>
//                   ) : paginatedPrint.map((sample) => (
//                     <tr key={sample.id} className="group hover:bg-slate-50/50 transition-colors">
//                       <td className="px-6 py-4">
//                         <div className="text-[10px] font-bold text-slate-500 leading-tight font-mono">
//                           <div className="flex items-center gap-1"><Clock size={10}/> {sample.ordered_at?.split(' ')[0]}</div>
//                           <div className="ml-3.5 text-slate-400">{sample.ordered_at?.split(' ')[1]}</div>
//                         </div>
//                       </td>

//                       <td className="px-6 py-4">
//                         <p className="text-sm font-black text-slate-800">{sample.patient_name}</p>
//                         <p className="text-[10px] font-mono font-bold text-brand-primary mt-0.5">MRN: {sample.mrn}</p>
//                       </td>

//                       <td className="px-6 py-4">
//                         <p className="text-sm font-bold text-slate-700">{sample.sample_name || sample.service_name}</p>
//                         <p className="text-[10px] font-mono text-slate-400 mt-0.5">{sample.encounter_number}</p>
//                       </td>

//                       <td className="px-6 py-4">
//                         {sample.reference_no ? (
//                           <span className="text-[11px] font-mono font-black text-brand-primary uppercase bg-brand-active px-2.5 py-1 rounded-lg">
//                             {sample.reference_no}
//                           </span>
//                         ) : (
//                           <span className="text-[10px] text-slate-400 italic">Not assigned</span>
//                         )}
//                       </td>

//                       <td className="px-6 py-4 text-right relative">
//                         <button
//                           onClick={(e) => {
//                             e.stopPropagation();
//                             setActiveMenu(activeMenu === sample.id ? null : sample.id);
//                           }}
//                           className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
//                         >
//                           <MoreVertical size={18} />
//                         </button>

//                         {activeMenu === sample.id && (
//                           <div className="absolute right-8 top-10 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-10 animate-in fade-in slide-in-from-top-2">
//                             <button
//                               onClick={() => { setSelectedOrder(sample); setActiveMenu(null); }}
//                               className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-purple-600 flex items-center gap-2"
//                             >
//                               <Eye size={14} /> View Details
//                             </button>
//                             {sample.reference_no && (
//                               <button
//                                 onClick={() => { setPrintOrder(sample); setIsPrintModalOpen(true); setActiveMenu(null); }}
//                                 className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-emerald-600 flex items-center gap-2"
//                               >
//                                 <Printer size={14} /> Print Label
//                               </button>
//                             )}
//                           </div>
//                         )}
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>

//             {totalPagesPrint > 1 && (
//               <div className="px-8 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
//                 <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
//                   Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredPrint.length)} of {filteredPrint.length}
//                 </span>
//                 <div className="flex items-center gap-1">
//                   <button 
//                     onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
//                     disabled={currentPage === 1}
//                     className="p-1.5 text-slate-400 hover:text-emerald-600 disabled:opacity-50 disabled:hover:text-slate-400 rounded-lg transition-colors"
//                   >
//                     <ChevronLeft size={16} />
//                   </button>
//                   <span className="text-xs font-black text-slate-700 px-3">Page {currentPage} of {totalPagesPrint}</span>
//                   <button 
//                     onClick={() => setCurrentPage(p => Math.min(totalPagesPrint, p + 1))}
//                     disabled={currentPage === totalPagesPrint}
//                     className="p-1.5 text-slate-400 hover:text-emerald-600 disabled:opacity-50 disabled:hover:text-slate-400 rounded-lg transition-colors"
//                   >
//                     <ChevronRight size={16} />
//                   </button>
//                 </div>
//               </div>
//             )}
//           </>
//         )}
//       </div>

//       {/* Order Details Side Modal */}
//       {selectedOrder && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
//           <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[88vh]">
//             <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
//               <div>
//                 <h3 className="text-lg font-black text-slate-800">Order Details</h3>
//                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
//                   {selectedOrder.service_name} · {selectedOrder.encounter_number}
//                 </p>
//               </div>
//               <button onClick={() => setSelectedOrder(null)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
//                 <X size={20} />
//               </button>
//             </div>

//             <div className="p-8 overflow-y-auto space-y-6">
//               {/* LOCK BANNER IN MODAL */}
//               {isOrderLocked(selectedOrder) && (
//                 <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-2xl flex items-start gap-3">
//                   <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
//                   <div>
//                     <h4 className="font-black text-xs uppercase tracking-widest">Locked — Awaiting Billing Payment</h4>
//                     <p className="text-xs mt-1 font-medium text-amber-800">
//                       This order cannot be collected until the patient completes payment at the billing counter.
//                     </p>
//                   </div>
//                 </div>
//               )}

//               <div className="grid grid-cols-2 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
//                 {[
//                   ['Patient', `${selectedOrder.first_name || selectedOrder.patient_name || ''} ${selectedOrder.last_name || ''}`],
//                   ['MRN', selectedOrder.mrn],
//                   ['Age / Gender', `${selectedOrder.display_age || selectedOrder.age_years + 'y'} · ${selectedOrder.gender || '-'}`],
//                   ['Contact', selectedOrder.phone || 'N/A'],
//                   ['Ward / Location', selectedOrder.ward || 'Outpatient'],
//                   ['Status', isOrderLocked(selectedOrder) ? 'UNPAID (LOCKED)' : (selectedOrder.order_status || selectedOrder.processing_status || 'PENDING')],
//                 ].map(([label, value]) => (
//                   <div key={label}>
//                     <p className="text-[10px] font-bold text-slate-400 uppercase">{label}</p>
//                     <p className="text-sm font-bold text-slate-800">{value}</p>
//                   </div>
//                 ))}
//               </div>

//               {selectedOrder.diagnosis && (
//                 <div className="bg-brand-active/50 p-4 rounded-2xl border border-brand-active">
//                   <p className="text-[10px] font-bold text-brand-primary uppercase mb-1">Diagnosis</p>
//                   <p className="text-sm font-bold text-brand-primary">
//                     {selectedOrder.icd10_code ? `[${selectedOrder.icd10_code}] ` : ''}{selectedOrder.diagnosis}
//                   </p>
//                 </div>
//               )}

//               {selectedOrder.clinical_note && (
//                 <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
//                   <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Clinical Notes</p>
//                   <div className="text-sm font-medium text-slate-700 space-y-1">
//                     {selectedOrder.clinical_note.split('|').map((note: string, i: number) => (
//                       <p key={i}>{note.trim()}</p>
//                     ))}
//                   </div>
//                 </div>
//               )}
//             </div>

//             <div className="px-8 py-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
//               <button onClick={() => setSelectedOrder(null)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors">
//                 Close
//               </button>
              
//               {isOrderLocked(selectedOrder) ? (
//                 <div className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-slate-400 bg-slate-200/70 border border-slate-300 cursor-not-allowed flex items-center gap-2">
//                   <Lock size={14} /> Locked (Unpaid)
//                 </div>
//               ) : (
//                 <button
//                   onClick={() => openCollectModal(selectedOrder)}
//                   disabled={processingId === (selectedOrder.order_id || selectedOrder.id) || selectedOrder.processing_status === 'IN_PROGRESS'}
//                   className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 transition-colors shadow-md shadow-purple-200 flex items-center gap-2 disabled:opacity-50"
//                 >
//                   {processingId === (selectedOrder.order_id || selectedOrder.id) ? (
//                     <Loader2 size={16} className="animate-spin" />
//                   ) : (
//                     <Droplets size={16} />
//                   )}
//                   Collect Sample
//                 </button>
//               )}
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Print Reference Preview Modal */}
//       {isPrintModalOpen && printOrder && createPortal(
//         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in">
//           <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsPrintModalOpen(false)} />
//           <div className="relative w-full max-w-sm bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
//             <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
//               <div className="flex items-center gap-4">
//                 <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
//                   <Printer size={22} />
//                 </div>
//                 <div>
//                   <h3 className="text-lg font-black text-slate-800">Reference Label</h3>
//                   <p className="text-xs text-slate-500 font-bold">50mm × 25mm thermal</p>
//                 </div>
//               </div>
//               <button onClick={() => setIsPrintModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all">
//                 <X size={20} />
//               </button>
//             </div>

//             <div className="p-6">
//               <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 bg-white font-mono space-y-2">
//                 <p className="text-xs font-black text-slate-800 tracking-tight">{printOrder.reference_no}</p>
//                 <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
//                   <div><span className="text-[9px] text-slate-400 font-bold uppercase">Patient: </span><span className="font-bold text-slate-700">{printOrder.patient_name}</span></div>
//                   <div><span className="text-[9px] text-slate-400 font-bold uppercase">MRN: </span><span className="font-bold text-slate-700">{printOrder.mrn}</span></div>
//                   <div><span className="text-[9px] text-slate-400 font-bold uppercase">Test: </span><span className="font-bold text-slate-700">{printOrder.sample_name || printOrder.service_name}</span></div>
//                   <div><span className="text-[9px] text-slate-400 font-bold uppercase">Enc: </span><span className="font-bold text-slate-700 text-[9px]">{printOrder.encounter_number}</span></div>
//                 </div>
//                 <div className="flex items-center justify-between mt-2 pt-2">
//                   {printOrder.barcode_path && (
//                     <img src={`${(import.meta as any).env?.VITE_API_BASE_URL || ''}${printOrder.barcode_path}`} alt="Barcode" className="h-6 w-auto max-w-[80%]" />
//                   )}
//                   {printOrder.qr_code_path && (
//                     <img src={`${(import.meta as any).env?.VITE_API_BASE_URL || ''}${printOrder.qr_code_path}`} alt="QR Code" className="h-8 w-8 ml-2" />
//                   )}
//                 </div>
//                 <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest text-center mt-2">gracespringhospitals · lab</p>
//               </div>
//               <p className="text-[10px] text-slate-400 text-center mt-3">Preview · Prints at 50mm × 25mm</p>
//             </div>

//             <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
//               <button onClick={() => setIsPrintModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
//                 Cancel
//               </button>
//               <button
//                 onClick={() => { printReferenceLabel(printOrder); setIsPrintModalOpen(false); }}
//                 className="px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all flex items-center gap-1.5"
//               >
//                 <Printer size={16} /> Print Now
//               </button>
//             </div>
//           </div>
//         </div>,
//         document.body
//       )}

//       {/* Sample Collection Options Modal */}
//       {isCollectModalOpen && orderToCollect && createPortal(
//         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
//           <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
//             <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
//               <div>
//                 <h3 className="text-lg font-black text-slate-800">Process Sample</h3>
//                 <p className="text-xs font-bold text-slate-500 mt-1">{orderToCollect.service_name}</p>
//               </div>
//               <button onClick={() => setIsCollectModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full">
//                 <X size={20} />
//               </button>
//             </div>

//             <div className="p-6 space-y-6">
//               <div>
//                 <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Collection Destination</p>
//                 <div className="grid grid-cols-2 gap-3">
//                   <button
//                     onClick={() => setCollectionType('IN_HOUSE')}
//                     className={`p-4 rounded-2xl border-2 text-left transition-all flex flex-col items-start gap-2 ${
//                       collectionType === 'IN_HOUSE' 
//                         ? 'border-purple-600 bg-purple-50 text-purple-700' 
//                         : 'border-slate-100 hover:border-slate-200 text-slate-500'
//                     }`}
//                   >
//                     <Activity size={24} className={collectionType === 'IN_HOUSE' ? 'text-purple-600' : 'text-slate-400'} />
//                     <span className="font-bold text-sm">In-House</span>
//                   </button>

//                   <button
//                     onClick={() => setCollectionType('OUTSOURCE')}
//                     className={`p-4 rounded-2xl border-2 text-left transition-all flex flex-col items-start gap-2 ${
//                       collectionType === 'OUTSOURCE' 
//                         ? 'border-blue-600 bg-blue-50 text-blue-700' 
//                         : 'border-slate-100 hover:border-slate-200 text-slate-500'
//                     }`}
//                   >
//                     <MapPin size={24} className={collectionType === 'OUTSOURCE' ? 'text-blue-600' : 'text-slate-400'} />
//                     <span className="font-bold text-sm">Outsource</span>
//                   </button>
//                 </div>
//               </div>

//               {collectionType === 'OUTSOURCE' && (
//                 <div className="animate-in slide-in-from-top-2 fade-in">
//                   <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">
//                     Select Partner Laboratory
//                   </label>
//                   {centersLoading ? (
//                     <div className="flex items-center gap-2 text-sm text-slate-500 p-3 bg-slate-50 rounded-xl">
//                       <Loader2 size={16} className="animate-spin" /> Loading centers...
//                     </div>
//                   ) : (
//                     <select
//                       value={selectedCenterId}
//                       onChange={(e) => setSelectedCenterId(e.target.value)}
//                       className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
//                     >
//                       <option value="" disabled>Select a diagnostic center...</option>
//                       {outsourceCenters.map((center) => (
//                         <option key={center.id} value={center.id}>
//                           {center.name}
//                         </option>
//                       ))}
//                     </select>
//                   )}
//                 </div>
//               )}
//             </div>

//             <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
//               <button onClick={() => setIsCollectModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100">
//                 Cancel
//               </button>
//               <button
//                 onClick={confirmCollection}
//                 disabled={collectionType === 'OUTSOURCE' && !selectedCenterId}
//                 className={`px-5 py-2.5 text-sm font-bold text-white rounded-xl shadow-lg transition-all flex items-center gap-2 ${
//                   collectionType === 'IN_HOUSE' 
//                     ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-200' 
//                     : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
//                 } disabled:opacity-50 disabled:cursor-not-allowed`}
//               >
//                 <Droplets size={16} /> Confirm Collection
//               </button>
//             </div>
//           </div>
//         </div>,
//         document.body
//       )}

//     </div>
//   );
// };

// export default LabWorklist;












































































































































// import React, { useState, useEffect } from 'react';
// import {
//   Search,
//   Clock,
//   Droplets,
//   ClipboardList,
//   Activity,
//   Loader2,
//   MoreVertical,
//   Eye,
//   X,
//   Printer,
//   RefreshCw,
//   Tag,
//   CheckCircle2,
//   MapPin,
//   ChevronLeft,
//   ChevronRight,
//   Stethoscope,
//   Phone,
//   Lock,
//   AlertTriangle
// } from 'lucide-react';
// import { labService } from '../services/lab.service';
// import { useNotification } from '../context/NotificationContext';
// import { createPortal } from 'react-dom';

// const printReferenceLabel = (order: any) => {
//   localStorage.setItem('printLabOrder', JSON.stringify(order));
//   const refNo = order.reference_no || String(order.id);
//   window.open(`/print/lab-label/${refNo}`, '_blank');
// };

// const isOrderLocked = (o: any): boolean => {
//   if (!o) return false;
//   const encType = String(o.encounter_type || '').toUpperCase();
//   if (encType !== 'OPD') return false;

//   const orderStatus = String(o.order_status || o.status || '').toUpperCase();
//   if (orderStatus === 'REQUESTED' || orderStatus === 'PARTIALLY_PAID' || orderStatus === 'UNPAID') {
//     return true;
//   }

//   const invoiceStatus = String(o.invoice_status || '').toUpperCase();
//   if (invoiceStatus && invoiceStatus !== 'PAID') {
//     return true;
//   }

//   return orderStatus !== 'PAID' && orderStatus !== 'COMPLETED' && orderStatus !== 'IN_PROGRESS';
// };

// const LabWorklist: React.FC = () => {
//   const { notify } = useNotification();

//   const [orders, setOrders] = useState<any[]>([]);
//   const [ordersLoading, setOrdersLoading] = useState(true);
//   const [processingId, setProcessingId] = useState<number | null>(null);
//   const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
//   const [activeMenu, setActiveMenu] = useState<number | null>(null);
//   const [searchOrders, setSearchOrders] = useState('');

//   const [pendingSamples, setPendingSamples] = useState<any[]>([]);
//   const [samplesLoading, setSamplesLoading] = useState(false);
//   const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
//   const [printOrder, setPrintOrder] = useState<any | null>(null);
//   const [searchPrint, setSearchPrint] = useState('');

//   const [activeTab, setActiveTab] = useState<'pending' | 'print_reference'>('pending');

//   const [currentPage, setCurrentPage] = useState(1);
//   const itemsPerPage = 10;

//   const fetchOrders = async () => {
//     setOrdersLoading(true);
//     try {
//       const response: any = await labService.getPendingOrders();
//       const dataArray = Array.isArray(response) ? response : (response?.data || response?.results || []);
//       const validOrders = dataArray.filter((o: any) => o.service_name !== 'Lab/Anc/Doctor');
//       setOrders(validOrders);
//     } catch (err: any) {
//       notify(err.response?.data?.message || 'Failed to load lab orders', 'error');
//     } finally {
//       setOrdersLoading(false);
//     }
//   };

//   const fetchPendingSamples = async () => {
//     setSamplesLoading(true);
//     try {
//       const response: any = await labService.getSamples();
//       const dataArray = Array.isArray(response) ? response : (response?.data || response?.results || []);
//       const validSamples = dataArray.filter((s: any) => 
//         s.workflow_status === 'PENDING' && 
//         s.service_name !== 'Lab/Anc/Doctor' && 
//         s.sample_name !== 'Lab/Anc/Doctor'
//       );
//       setPendingSamples(validSamples);
//     } catch (err: any) {
//       notify(err.response?.data?.message || 'Failed to load samples', 'error');
//     } finally {
//       setSamplesLoading(false);
//     }
//   };

//   useEffect(() => { fetchOrders(); }, []);

//   useEffect(() => {
//     if (activeTab === 'print_reference' && pendingSamples.length === 0 && !samplesLoading) {
//       fetchPendingSamples();
//     }
//   }, [activeTab]);

//   useEffect(() => {
//     const handleClickOutside = () => setActiveMenu(null);
//     document.addEventListener('click', handleClickOutside);
//     return () => document.removeEventListener('click', handleClickOutside);
//   }, []);

//   const handleCollect = async (order: any) => {
//     const orderId = order.order_id || order.id;

//     if (isOrderLocked(order)) {
//       notify('This OPD order is locked awaiting billing payment.', 'warning');
//       return;
//     }

//     setProcessingId(orderId);
//     setActiveMenu(null);
//     try {
//       await labService.collectSample(orderId);
//       notify('Sample collected successfully. Moved to result entry.', 'success');
//       fetchOrders();
//     } catch (err: any) {
//       notify(err.response?.data?.message || 'Collection failed', 'error');
//     } finally {
//       setProcessingId(null);
//     }
//   };

//   const filteredOrders = orders.filter(o => {
//     const q = searchOrders.toLowerCase();
//     return (
//       `${o.first_name} ${o.last_name}`.toLowerCase().includes(q) ||
//       (o.mrn || '').toLowerCase().includes(q) ||
//       (o.service_name || '').toLowerCase().includes(q) ||
//       (o.encounter_number || '').toLowerCase().includes(q)
//     );
//   });

//   const filteredPrint = pendingSamples.filter(s => {
//     const q = searchPrint.toLowerCase();
//     return (
//       (s.patient_name || '').toLowerCase().includes(q) ||
//       (s.mrn || '').toLowerCase().includes(q) ||
//       (s.sample_name || s.service_name || '').toLowerCase().includes(q) ||
//       (s.reference_no || '').toLowerCase().includes(q) ||
//       (s.encounter_number || '').toLowerCase().includes(q)
//     );
//   });

//   useEffect(() => {
//     setCurrentPage(1);
//   }, [searchOrders, searchPrint, activeTab]);

//   const totalPagesPending = Math.ceil(filteredOrders.length / itemsPerPage) || 1;
//   const paginatedOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

//   const totalPagesPrint = Math.ceil(filteredPrint.length / itemsPerPage) || 1;
//   const paginatedPrint = filteredPrint.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

//   const inLabCount = orders.filter(o => o.processing_status && o.processing_status !== 'NOT_COLLECTED').length;

//   return (
//     <div className="space-y-6 animate-in fade-in duration-500">
//       {activeTab === 'pending' && (
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//           <div className="bg-white p-5 rounded-[28px] border border-slate-200 shadow-sm flex items-center justify-between">
//             <div>
//               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending Collection</p>
//               <p className="text-3xl font-black text-slate-800">{orders.length}</p>
//             </div>
//             <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl"><Droplets size={22}/></div>
//           </div>
//           <div className="bg-white p-5 rounded-[28px] border border-slate-200 shadow-sm flex items-center justify-between">
//             <div>
//               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">In Lab Analysis</p>
//               <p className="text-3xl font-black text-amber-600">{inLabCount || '—'}</p>
//             </div>
//             <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl"><Activity size={22}/></div>
//           </div>
//         </div>
//       )}

//       <div className="bg-white rounded-[40px] border border-slate-200 overflow-hidden shadow-sm">
//         <div className="px-8 py-5 bg-white border-b border-slate-100 flex flex-col md:flex-row md:items-center gap-4">
//           <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl w-fit">
//             <button
//               onClick={() => setActiveTab('pending')}
//               className={`px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all whitespace-nowrap ${
//                 activeTab === 'pending'
//                   ? 'bg-white text-purple-600 shadow-sm'
//                   : 'text-slate-500 hover:text-slate-800'
//               }`}
//             >
//               Pending Lab Investigations
//             </button>
//             <button
//               onClick={() => setActiveTab('print_reference')}
//               className={`px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all whitespace-nowrap ${
//                 activeTab === 'print_reference'
//                   ? 'bg-white text-emerald-600 shadow-sm'
//                   : 'text-slate-500 hover:text-slate-800'
//               }`}
//             >
//               Print Reference
//             </button>
//           </div>

//           <div className="flex items-center gap-3 ml-auto">
//             <div className="relative w-72">
//               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
//               <input
//                 type="text"
//                 placeholder={activeTab === 'pending' ? 'Search by Patient Name, Test or Encounter...' : 'Search patient, ref no, MRN...'}
//                 className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-400 transition-all font-medium"
//                 value={activeTab === 'pending' ? searchOrders : searchPrint}
//                 onChange={(e) => activeTab === 'pending' ? setSearchOrders(e.target.value) : setSearchPrint(e.target.value)}
//               />
//             </div>
//             <button
//               onClick={() => activeTab === 'pending' ? fetchOrders() : fetchPendingSamples()}
//               className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-slate-100 transition-all"
//             >
//               <RefreshCw size={15} className={(ordersLoading || samplesLoading) ? 'animate-spin' : ''} /> Refresh
//             </button>
//           </div>
//         </div>

//         {activeTab === 'pending' && (
//           <>
//             <div className="px-8 py-4 border-b border-slate-100 bg-slate-50/30">
//               <h3 className="text-xs font-black text-purple-600 uppercase tracking-widest flex items-center gap-2">
//                 <ClipboardList size={14} /> Pending Lab Investigations
//               </h3>
//             </div>

//             <div className="overflow-x-auto pb-24">
//               <table className="w-full text-left">
//                 <thead>
//                   <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
//                     <th className="px-6 py-4">#</th>
//                     <th className="px-6 py-4">Patient Details</th>
//                     <th className="px-6 py-4">Location</th>
//                     <th className="px-6 py-4">Investigation / Ordered By</th>
//                     <th className="px-6 py-4">Status</th>
//                     <th className="px-6 py-4 text-right">Actions</th>
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y divide-slate-50">
//                   {ordersLoading ? (
//                     <tr>
//                       <td colSpan={6} className="py-20 text-center">
//                         <Loader2 size={36} className="animate-spin mx-auto text-purple-600 mb-3" />
//                         <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Orders...</p>
//                       </td>
//                     </tr>
//                   ) : paginatedOrders.length === 0 ? (
//                     <tr>
//                       <td colSpan={6} className="py-20 text-center">
//                         <ClipboardList size={40} className="mx-auto text-slate-300 mb-4" />
//                         <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No pending investigations</p>
//                       </td>
//                     </tr>
//                   ) : paginatedOrders.map((order) => {
//                     const uniqueId = order.order_id || order.id;
//                     const locked = isOrderLocked(order);

//                     return (
//                       <tr key={uniqueId} className={`group transition-colors ${locked ? 'bg-amber-50/20 hover:bg-amber-50/40' : 'hover:bg-slate-50/50'}`}>
//                         <td className="px-6 py-4">
//                           <div className="flex flex-col gap-1.5">
//                             <span className={`inline-flex items-center justify-center px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border w-fit ${
//                               order.encounter_type === 'ERD' ? 'bg-red-50 text-red-600 border-red-100' :
//                               order.encounter_type === 'IPD' ? 'bg-brand-active text-brand-primary border-brand-active' :
//                               'bg-emerald-50 text-emerald-600 border-emerald-100'
//                             }`}>
//                               {order.encounter_type || 'OPD'}
//                             </span>
//                             <div className="text-[10px] font-bold text-slate-400 leading-tight font-mono">
//                               <div>{order.ordered_at?.split(' ')[0]}</div>
//                               <div>{order.ordered_at?.split(' ')[1]}</div>
//                             </div>
//                           </div>
//                         </td>

//                         <td className="px-6 py-4">
//                           <div className="flex items-center gap-3">
//                             <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-black text-xs shrink-0">
//                               {(order.first_name?.[0] || '?')}{(order.last_name?.[0] || '')}
//                             </div>
//                             <div>
//                               <p className="text-sm font-black text-slate-800">{order.first_name} {order.last_name}</p>
//                               <div className="flex flex-col gap-0.5 mt-0.5">
//                                 <div className="flex items-center gap-2">
//                                   <span className="text-[10px] font-mono font-bold text-brand-primary">MRN: {order.mrn}</span>
//                                   <span className="text-[10px] text-slate-400 font-medium">
//                                     {order.display_age || (order.age_years ? `${order.age_years}y` : '')}
//                                     {order.gender ? ` · ${order.gender}` : ''}
//                                   </span>
//                                 </div>
//                                 {order.phone && (
//                                   <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
//                                     <Phone size={10} className="text-slate-400" />
//                                     {order.phone}
//                                   </div>
//                                 )}
//                               </div>
//                             </div>
//                           </div>
//                         </td>

//                         <td className="px-6 py-4">
//                           <div className="flex flex-col gap-1">
//                             <div className="flex items-center gap-1.5 text-sm font-bold text-slate-600">
//                               <MapPin size={13} className="text-slate-400" />
//                               {order.ward || 'Outpatient'}
//                             </div>
//                             {order.room_number && (
//                               <p className="text-[10px] text-slate-400 font-medium ml-4.5">{order.room_number} · {order.bed_number}</p>
//                             )}
//                           </div>
//                         </td>

//                         <td className="px-6 py-4">
//                           <div className="flex flex-col gap-1.5">
//                             <div>
//                               <p className="text-sm font-black text-slate-800">{order.service_name}</p>
//                               <p className="text-[10px] font-mono text-slate-400 mt-0.5">{order.encounter_number}</p>
//                             </div>
//                             {order.doctor_name && (
//                               <div className="flex items-center gap-1 text-[10px] font-bold text-purple-600/80 bg-purple-50/50 w-fit px-1.5 py-0.5 rounded">
//                                 <Stethoscope size={10} />
//                                 {order.doctor_name.replace(/^Dr\.?\s*/i, 'Dr. ')}
//                               </div>
//                             )}
//                           </div>
//                         </td>

//                         <td className="px-6 py-4">
//                           <div className="flex flex-col gap-1.5 items-start">
//                             {locked ? (
//                               <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-slate-800 text-white shadow-sm border border-slate-700">
//                                 <Lock size={12} className="text-amber-400" /> Unpaid (Locked)
//                               </span>
//                             ) : (
//                               <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border bg-emerald-50 text-emerald-700 border-emerald-200 w-fit">
//                                 {order.processing_status || order.order_status || 'PENDING'}
//                               </span>
//                             )}
//                           </div>
//                         </td>

//                         <td className="px-6 py-4 text-right relative">
//                           <button
//                             onClick={(e) => {
//                               e.stopPropagation();
//                               setActiveMenu(activeMenu === uniqueId ? null : uniqueId);
//                             }}
//                             className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
//                           >
//                             <MoreVertical size={18} />
//                           </button>

//                           {activeMenu === uniqueId && (
//                             <div className="absolute right-8 top-10 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-10 animate-in fade-in slide-in-from-top-2">
//                               <button
//                                 onClick={() => { setSelectedOrder(order); setActiveMenu(null); }}
//                                 className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-purple-600 flex items-center gap-2"
//                               >
//                                 <Eye size={14} /> View Details
//                               </button>
//                               <button
//                                 onClick={() => handleCollect(order)}
//                                 disabled={processingId === uniqueId || locked}
//                                 className={`w-full text-left px-4 py-2.5 text-xs font-bold flex items-center gap-2 border-t border-slate-50 transition-colors ${
//                                   locked
//                                     ? 'text-slate-400 bg-slate-50 cursor-not-allowed'
//                                     : 'text-slate-700 hover:bg-slate-50 hover:text-emerald-600'
//                                 }`}
//                               >
//                                 {processingId === uniqueId ? (
//                                   <Loader2 size={14} className="animate-spin text-purple-600" />
//                                 ) : locked ? (
//                                   <Lock size={14} className="text-amber-500" />
//                                 ) : (
//                                   <CheckCircle2 size={14} className="text-emerald-600" />
//                                 )}
//                                 {locked ? 'Awaiting Payment' : 'Collect Sample'}
//                               </button>
//                             </div>
//                           )}
//                         </td>
//                       </tr>
//                     );
//                   })}
//                 </tbody>
//               </table>
//             </div>

//             {totalPagesPending > 1 && (
//               <div className="px-8 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
//                 <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
//                   Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredOrders.length)} of {filteredOrders.length}
//                 </span>
//                 <div className="flex items-center gap-1">
//                   <button 
//                     onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
//                     disabled={currentPage === 1}
//                     className="p-1.5 text-slate-400 hover:text-purple-600 disabled:opacity-50 disabled:hover:text-slate-400 rounded-lg transition-colors"
//                   >
//                     <ChevronLeft size={16} />
//                   </button>
//                   <span className="text-xs font-black text-slate-700 px-3">Page {currentPage} of {totalPagesPending}</span>
//                   <button 
//                     onClick={() => setCurrentPage(p => Math.min(totalPagesPending, p + 1))}
//                     disabled={currentPage === totalPagesPending}
//                     className="p-1.5 text-slate-400 hover:text-purple-600 disabled:opacity-50 disabled:hover:text-slate-400 rounded-lg transition-colors"
//                   >
//                     <ChevronRight size={16} />
//                   </button>
//                 </div>
//               </div>
//             )}
//           </>
//         )}

//         {activeTab === 'print_reference' && (
//           <>
//             <div className="px-8 py-4 border-b border-slate-100 bg-slate-50/30">
//               <h3 className="text-xs font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
//                 <Tag size={14} /> Pending Samples — Print Reference Labels
//               </h3>
//             </div>

//             <div className="overflow-x-auto pb-24">
//               <table className="w-full text-left">
//                 <thead>
//                   <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
//                     <th className="px-6 py-4">Ordered At</th>
//                     <th className="px-6 py-4">Patient</th>
//                     <th className="px-6 py-4">Investigation</th>
//                     <th className="px-6 py-4">Reference No.</th>
//                     <th className="px-6 py-4 text-right">Actions</th>
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y divide-slate-50">
//                   {samplesLoading ? (
//                     <tr>
//                       <td colSpan={5} className="py-20 text-center">
//                         <Loader2 size={36} className="animate-spin mx-auto text-emerald-600 mb-3" />
//                         <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Samples...</p>
//                       </td>
//                     </tr>
//                   ) : paginatedPrint.length === 0 ? (
//                     <tr>
//                       <td colSpan={5} className="py-20 text-center">
//                         <Tag size={40} className="mx-auto text-slate-300 mb-4" />
//                         <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No pending samples found</p>
//                       </td>
//                     </tr>
//                   ) : paginatedPrint.map((sample) => (
//                     <tr key={sample.id} className="group hover:bg-slate-50/50 transition-colors">
//                       <td className="px-6 py-4">
//                         <div className="text-[10px] font-bold text-slate-500 leading-tight font-mono">
//                           <div className="flex items-center gap-1"><Clock size={10}/> {sample.ordered_at?.split(' ')[0]}</div>
//                           <div className="ml-3.5 text-slate-400">{sample.ordered_at?.split(' ')[1]}</div>
//                         </div>
//                       </td>

//                       <td className="px-6 py-4">
//                         <p className="text-sm font-black text-slate-800">{sample.patient_name}</p>
//                         <p className="text-[10px] font-mono font-bold text-brand-primary mt-0.5">MRN: {sample.mrn}</p>
//                       </td>

//                       <td className="px-6 py-4">
//                         <p className="text-sm font-bold text-slate-700">{sample.sample_name || sample.service_name}</p>
//                         <p className="text-[10px] font-mono text-slate-400 mt-0.5">{sample.encounter_number}</p>
//                       </td>

//                       <td className="px-6 py-4">
//                         {sample.reference_no ? (
//                           <span className="text-[11px] font-mono font-black text-brand-primary uppercase bg-brand-active px-2.5 py-1 rounded-lg">
//                             {sample.reference_no}
//                           </span>
//                         ) : (
//                           <span className="text-[10px] text-slate-400 italic">Not assigned</span>
//                         )}
//                       </td>

//                       <td className="px-6 py-4 text-right relative">
//                         <button
//                           onClick={(e) => {
//                             e.stopPropagation();
//                             setActiveMenu(activeMenu === sample.id ? null : sample.id);
//                           }}
//                           className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
//                         >
//                           <MoreVertical size={18} />
//                         </button>

//                         {activeMenu === sample.id && (
//                           <div className="absolute right-8 top-10 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-10 animate-in fade-in slide-in-from-top-2">
//                             <button
//                               onClick={() => { setSelectedOrder(sample); setActiveMenu(null); }}
//                               className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-purple-600 flex items-center gap-2"
//                             >
//                               <Eye size={14} /> View Details
//                             </button>
//                             {sample.reference_no && (
//                               <button
//                                 onClick={() => { setPrintOrder(sample); setIsPrintModalOpen(true); setActiveMenu(null); }}
//                                 className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-emerald-600 flex items-center gap-2"
//                               >
//                                 <Printer size={14} /> Print Label
//                               </button>
//                             )}
//                           </div>
//                         )}
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>

//             {totalPagesPrint > 1 && (
//               <div className="px-8 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
//                 <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
//                   Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredPrint.length)} of {filteredPrint.length}
//                 </span>
//                 <div className="flex items-center gap-1">
//                   <button 
//                     onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
//                     disabled={currentPage === 1}
//                     className="p-1.5 text-slate-400 hover:text-emerald-600 disabled:opacity-50 disabled:hover:text-slate-400 rounded-lg transition-colors"
//                   >
//                     <ChevronLeft size={16} />
//                   </button>
//                   <span className="text-xs font-black text-slate-700 px-3">Page {currentPage} of {totalPagesPrint}</span>
//                   <button 
//                     onClick={() => setCurrentPage(p => Math.min(totalPagesPrint, p + 1))}
//                     disabled={currentPage === totalPagesPrint}
//                     className="p-1.5 text-slate-400 hover:text-emerald-600 disabled:opacity-50 disabled:hover:text-slate-400 rounded-lg transition-colors"
//                   >
//                     <ChevronRight size={16} />
//                   </button>
//                 </div>
//               </div>
//             )}
//           </>
//         )}
//       </div>

//       {/* Order Details Side Modal */}
//       {selectedOrder && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
//           <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[88vh]">
//             <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
//               <div>
//                 <h3 className="text-lg font-black text-slate-800">Order Details</h3>
//                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
//                   {selectedOrder.service_name} · {selectedOrder.encounter_number}
//                 </p>
//               </div>
//               <button onClick={() => setSelectedOrder(null)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
//                 <X size={20} />
//               </button>
//             </div>

//             <div className="p-8 overflow-y-auto space-y-6">
//               {/* LOCK BANNER IN MODAL */}
//               {isOrderLocked(selectedOrder) && (
//                 <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-2xl flex items-start gap-3">
//                   <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
//                   <div>
//                     <h4 className="font-black text-xs uppercase tracking-widest">Locked — Awaiting Billing Payment</h4>
//                     <p className="text-xs mt-1 font-medium text-amber-800">
//                       This order cannot be collected until the patient completes payment at the billing counter.
//                     </p>
//                   </div>
//                 </div>
//               )}

//               <div className="grid grid-cols-2 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
//                 {[
//                   ['Patient', `${selectedOrder.first_name || selectedOrder.patient_name || ''} ${selectedOrder.last_name || ''}`],
//                   ['MRN', selectedOrder.mrn],
//                   ['Age / Gender', `${selectedOrder.display_age || selectedOrder.age_years + 'y'} · ${selectedOrder.gender || '-'}`],
//                   ['Contact', selectedOrder.phone || 'N/A'],
//                   ['Ward / Location', selectedOrder.ward || 'Outpatient'],
//                   ['Status', isOrderLocked(selectedOrder) ? 'UNPAID (LOCKED)' : (selectedOrder.order_status || selectedOrder.processing_status || 'PENDING')],
//                 ].map(([label, value]) => (
//                   <div key={label}>
//                     <p className="text-[10px] font-bold text-slate-400 uppercase">{label}</p>
//                     <p className="text-sm font-bold text-slate-800">{value}</p>
//                   </div>
//                 ))}
//               </div>

//               {selectedOrder.diagnosis && (
//                 <div className="bg-brand-active/50 p-4 rounded-2xl border border-brand-active">
//                   <p className="text-[10px] font-bold text-brand-primary uppercase mb-1">Diagnosis</p>
//                   <p className="text-sm font-bold text-brand-primary">
//                     {selectedOrder.icd10_code ? `[${selectedOrder.icd10_code}] ` : ''}{selectedOrder.diagnosis}
//                   </p>
//                 </div>
//               )}

//               {selectedOrder.clinical_note && (
//                 <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
//                   <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Clinical Notes</p>
//                   <div className="text-sm font-medium text-slate-700 space-y-1">
//                     {selectedOrder.clinical_note.split('|').map((note: string, i: number) => (
//                       <p key={i}>{note.trim()}</p>
//                     ))}
//                   </div>
//                 </div>
//               )}
//             </div>

//             <div className="px-8 py-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
//               <button onClick={() => setSelectedOrder(null)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors">
//                 Close
//               </button>
              
//               {isOrderLocked(selectedOrder) ? (
//                 <div className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-slate-400 bg-slate-200/70 border border-slate-300 cursor-not-allowed flex items-center gap-2">
//                   <Lock size={14} /> Locked (Unpaid)
//                 </div>
//               ) : (
//                 <button
//                   onClick={() => { handleCollect(selectedOrder); setSelectedOrder(null); }}
//                   disabled={processingId === (selectedOrder.order_id || selectedOrder.id) || selectedOrder.processing_status === 'IN_PROGRESS'}
//                   className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 transition-colors shadow-md shadow-purple-200 flex items-center gap-2 disabled:opacity-50"
//                 >
//                   {processingId === (selectedOrder.order_id || selectedOrder.id) ? (
//                     <Loader2 size={16} className="animate-spin" />
//                   ) : (
//                     <Droplets size={16} />
//                   )}
//                   Collect Sample
//                 </button>
//               )}
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Print Reference Preview Modal */}
//       {isPrintModalOpen && printOrder && createPortal(
//         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in">
//           <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsPrintModalOpen(false)} />
//           <div className="relative w-full max-w-sm bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
//             <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
//               <div className="flex items-center gap-4">
//                 <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
//                   <Printer size={22} />
//                 </div>
//                 <div>
//                   <h3 className="text-lg font-black text-slate-800">Reference Label</h3>
//                   <p className="text-xs text-slate-500 font-bold">50mm × 25mm thermal</p>
//                 </div>
//               </div>
//               <button onClick={() => setIsPrintModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all">
//                 <X size={20} />
//               </button>
//             </div>

//             <div className="p-6">
//               <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 bg-white font-mono space-y-2">
//                 <p className="text-xs font-black text-slate-800 tracking-tight">{printOrder.reference_no}</p>
//                 <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
//                   <div><span className="text-[9px] text-slate-400 font-bold uppercase">Patient: </span><span className="font-bold text-slate-700">{printOrder.patient_name}</span></div>
//                   <div><span className="text-[9px] text-slate-400 font-bold uppercase">MRN: </span><span className="font-bold text-slate-700">{printOrder.mrn}</span></div>
//                   <div><span className="text-[9px] text-slate-400 font-bold uppercase">Test: </span><span className="font-bold text-slate-700">{printOrder.sample_name || printOrder.service_name}</span></div>
//                   <div><span className="text-[9px] text-slate-400 font-bold uppercase">Enc: </span><span className="font-bold text-slate-700 text-[9px]">{printOrder.encounter_number}</span></div>
//                 </div>
//                 <div className="flex items-center justify-between mt-2 pt-2">
//                   {printOrder.barcode_path && (
//                     <img src={`${(import.meta as any).env?.VITE_API_BASE_URL || ''}${printOrder.barcode_path}`} alt="Barcode" className="h-6 w-auto max-w-[80%]" />
//                   )}
//                   {printOrder.qr_code_path && (
//                     <img src={`${(import.meta as any).env?.VITE_API_BASE_URL || ''}${printOrder.qr_code_path}`} alt="QR Code" className="h-8 w-8 ml-2" />
//                   )}
//                 </div>
//                 <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest text-center mt-2">gracespringhospitals · lab</p>
//               </div>
//               <p className="text-[10px] text-slate-400 text-center mt-3">Preview · Prints at 50mm × 25mm</p>
//             </div>

//             <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
//               <button onClick={() => setIsPrintModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
//                 Cancel
//               </button>
//               <button
//                 onClick={() => { printReferenceLabel(printOrder); setIsPrintModalOpen(false); }}
//                 className="px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all flex items-center gap-1.5"
//               >
//                 <Printer size={16} /> Print Now
//               </button>
//             </div>
//           </div>
//         </div>,
//         document.body
//       )}
//     </div>
//   );
// };

// export default LabWorklist;








































































































































































































































































































// import React, { useState, useEffect } from 'react';
// import {
//   Search,
//   Clock,
//   Droplets,
//   ClipboardList,
//   Activity,
//   Loader2,
//   MoreVertical,
//   Eye,
//   X,
//   FileText,
//   Printer,
//   RefreshCw,
//   Tag,
//   CheckCircle2,
//   MapPin,
//   ChevronLeft,
//   ChevronRight,
//   Stethoscope,
//   Phone
// } from 'lucide-react';
// import { labService } from '../services/lab.service';
// import { useNotification } from '../context/NotificationContext';
// import { createPortal } from 'react-dom';

// const printReferenceLabel = (order: any) => {
//   localStorage.setItem('printLabOrder', JSON.stringify(order));
//   const refNo = order.reference_no || String(order.id);
//   window.open(`/print/lab-label/${refNo}`, '_blank');
// };

// const LabWorklist: React.FC = () => {
//   const { notify } = useNotification();

//   const [orders, setOrders] = useState<any[]>([]);
//   const [ordersLoading, setOrdersLoading] = useState(true);
//   const [processingId, setProcessingId] = useState<number | null>(null);
//   const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
//   const [activeMenu, setActiveMenu] = useState<number | null>(null);
//   const [searchOrders, setSearchOrders] = useState('');

//   const [pendingSamples, setPendingSamples] = useState<any[]>([]);
//   const [samplesLoading, setSamplesLoading] = useState(false);
//   const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
//   const [printOrder, setPrintOrder] = useState<any | null>(null);
//   const [searchPrint, setSearchPrint] = useState('');

//   const [activeTab, setActiveTab] = useState<'pending' | 'print_reference'>('pending');

//   const [currentPage, setCurrentPage] = useState(1);
//   const itemsPerPage = 10;

//   const uniqueId = order.order_id || order.id;
//   const isLockedOPD = order.encounter_type === "OPD" && order.order_status === "REQUESTED"; // 👈 Add this line

//   const fetchOrders = async () => {
//     setOrdersLoading(true);
//     try {
//       const data = await labService.getPendingOrders();
//       // Filter out 'Lab/Anc/Doctor' from the results
//       const validOrders = data.filter((o: any) => o.service_name !== 'Lab/Anc/Doctor');
//       setOrders(validOrders);
//     } catch (err: any) {
//       notify(err.response?.data?.message || 'Failed to load lab orders', 'error');
//     } finally {
//       setOrdersLoading(false);
//     }
//   };

//   const fetchPendingSamples = async () => {
//     setSamplesLoading(true);
//     try {
//       const data = await labService.getSamples();
//       // Filter out 'Lab/Anc/Doctor' and ensure they are 'PENDING'
//       const validSamples = data.filter((s: any) => 
//         s.workflow_status === 'PENDING' && 
//         s.service_name !== 'Lab/Anc/Doctor' && 
//         s.sample_name !== 'Lab/Anc/Doctor'
//       );
//       setPendingSamples(validSamples);
//     } catch (err: any) {
//       notify(err.response?.data?.message || 'Failed to load samples', 'error');
//     } finally {
//       setSamplesLoading(false);
//     }
//   };

//   useEffect(() => { fetchOrders(); }, []);

//   useEffect(() => {
//     if (activeTab === 'print_reference' && pendingSamples.length === 0 && !samplesLoading) {
//       fetchPendingSamples();
//     }
//   }, [activeTab]);

//   useEffect(() => {
//     const handleClickOutside = () => setActiveMenu(null);
//     document.addEventListener('click', handleClickOutside);
//     return () => document.removeEventListener('click', handleClickOutside);
//   }, []);

//   const handleCollect = async (orderId: number) => {
//     setProcessingId(orderId);
//     setActiveMenu(null);
//     try {
//       await labService.collectSample(orderId);
//       notify('Sample collected successfully. Moved to result entry.', 'success');
//       fetchOrders();
//     } catch (err: any) {
//       notify(err.response?.data?.message || 'Collection failed', 'error');
//     } finally {
//       setProcessingId(null);
//     }
//   };

//   const filteredOrders = orders.filter(o => {
//     const q = searchOrders.toLowerCase();
//     return (
//       `${o.first_name} ${o.last_name}`.toLowerCase().includes(q) ||
//       (o.mrn || '').toLowerCase().includes(q) ||
//       (o.service_name || '').toLowerCase().includes(q) ||
//       (o.encounter_number || '').toLowerCase().includes(q)
//     );
//   });

//   const filteredPrint = pendingSamples.filter(s => {
//     const q = searchPrint.toLowerCase();
//     return (
//       (s.patient_name || '').toLowerCase().includes(q) ||
//       (s.mrn || '').toLowerCase().includes(q) ||
//       (s.sample_name || s.service_name || '').toLowerCase().includes(q) ||
//       (s.reference_no || '').toLowerCase().includes(q) ||
//       (s.encounter_number || '').toLowerCase().includes(q)
//     );
//   });

//   useEffect(() => {
//     setCurrentPage(1);
//   }, [searchOrders, searchPrint, activeTab]);

//   const totalPagesPending = Math.ceil(filteredOrders.length / itemsPerPage);
//   const paginatedOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

//   const totalPagesPrint = Math.ceil(filteredPrint.length / itemsPerPage);
//   const paginatedPrint = filteredPrint.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

//   const inLabCount = orders.filter(o => o.processing_status && o.processing_status !== 'NOT_COLLECTED').length;

//   return (
//     <div className="space-y-6 animate-in fade-in duration-500">
//       {activeTab === 'pending' && (
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//           <div className="bg-white p-5 rounded-[28px] border border-slate-200 shadow-sm flex items-center justify-between">
//             <div>
//               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending Collection</p>
//               <p className="text-3xl font-black text-slate-800">{orders.length}</p>
//             </div>
//             <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl"><Droplets size={22}/></div>
//           </div>
//           <div className="bg-white p-5 rounded-[28px] border border-slate-200 shadow-sm flex items-center justify-between">
//             <div>
//               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">In Lab Analysis</p>
//               <p className="text-3xl font-black text-amber-600">{inLabCount || '—'}</p>
//             </div>
//             <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl"><Activity size={22}/></div>
//           </div>
//         </div>
//       )}

//       <div className="bg-white rounded-[40px] border border-slate-200 overflow-hidden shadow-sm">
//         <div className="px-8 py-5 bg-white border-b border-slate-100 flex flex-col md:flex-row md:items-center gap-4">
//           <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl w-fit">
//             <button
//               onClick={() => setActiveTab('pending')}
//               className={`px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all whitespace-nowrap ${
//                 activeTab === 'pending'
//                   ? 'bg-white text-purple-600 shadow-sm'
//                   : 'text-slate-500 hover:text-slate-800'
//               }`}
//             >
//               Pending Lab Investigations
//             </button>
//             <button
//               onClick={() => setActiveTab('print_reference')}
//               className={`px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all whitespace-nowrap ${
//                 activeTab === 'print_reference'
//                   ? 'bg-white text-emerald-600 shadow-sm'
//                   : 'text-slate-500 hover:text-slate-800'
//               }`}
//             >
//               Print Reference
//             </button>
//           </div>

//           <div className="flex items-center gap-3 ml-auto">
//             <div className="relative w-72">
//               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
//               <input
//                 type="text"
//                 placeholder={activeTab === 'pending' ? 'Search by Patient Name, Test or Encounter...' : 'Search patient, ref no, MRN...'}
//                 className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-400 transition-all font-medium"
//                 value={activeTab === 'pending' ? searchOrders : searchPrint}
//                 onChange={(e) => activeTab === 'pending' ? setSearchOrders(e.target.value) : setSearchPrint(e.target.value)}
//               />
//             </div>
//             <button
//               onClick={() => activeTab === 'pending' ? fetchOrders() : fetchPendingSamples()}
//               className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-slate-100 transition-all"
//             >
//               <RefreshCw size={15} className={(ordersLoading || samplesLoading) ? 'animate-spin' : ''} /> Refresh
//             </button>
//           </div>
//         </div>

//         {activeTab === 'pending' && (
//           <>
//             <div className="px-8 py-4 border-b border-slate-100 bg-slate-50/30">
//               <h3 className="text-xs font-black text-purple-600 uppercase tracking-widest flex items-center gap-2">
//                 <ClipboardList size={14} /> Pending Lab Investigations
//               </h3>
//             </div>

//             <div className="overflow-x-auto pb-24">
//               <table className="w-full text-left">
//                 <thead>
//                   <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
//                     <th className="px-6 py-4">#</th>
//                     <th className="px-6 py-4">Patient Details</th>
//                     <th className="px-6 py-4">Location</th>
//                     <th className="px-6 py-4">Investigation / Ordered By</th>
//                     <th className="px-6 py-4">Status</th>
//                     <th className="px-6 py-4 text-right">Actions</th>
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y divide-slate-50">
//                   {ordersLoading ? (
//                     <tr>
//                       <td colSpan={6} className="py-20 text-center">
//                         <Loader2 size={36} className="animate-spin mx-auto text-purple-600 mb-3" />
//                         <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Orders...</p>
//                       </td>
//                     </tr>
//                   ) : paginatedOrders.length === 0 ? (
//                     <tr>
//                       <td colSpan={6} className="py-20 text-center">
//                         <ClipboardList size={40} className="mx-auto text-slate-300 mb-4" />
//                         <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No pending investigations</p>
//                       </td>
//                     </tr>
//                   ) : paginatedOrders.map((order, idx) => (
//                     <tr key={order.order_id || order.id} className="group hover:bg-slate-50/50 transition-colors">
//                       <td className="px-6 py-4">
//                         <div className="flex flex-col gap-1.5">
//                           <span className={`inline-flex items-center justify-center px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border w-fit ${
//                             order.encounter_type === 'ERD' ? 'bg-red-50 text-red-600 border-red-100' :
//                             order.encounter_type === 'IPD' ? 'bg-brand-active text-brand-primary border-brand-active' :
//                             'bg-emerald-50 text-emerald-600 border-emerald-100'
//                           }`}>
//                             {order.encounter_type || 'OPD'}
//                           </span>
//                           <div className="text-[10px] font-bold text-slate-400 leading-tight font-mono">
//                             <div>{order.ordered_at?.split(' ')[0]}</div>
//                             <div>{order.ordered_at?.split(' ')[1]}</div>
//                           </div>
//                         </div>
//                       </td>

//                       <td className="px-6 py-4">
//                         <div className="flex items-center gap-3">
//                           <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-black text-xs shrink-0">
//                             {(order.first_name?.[0] || '?')}{(order.last_name?.[0] || '')}
//                           </div>
//                           <div>
//                             <p className="text-sm font-black text-slate-800">{order.first_name} {order.last_name}</p>
//                             <div className="flex flex-col gap-0.5 mt-0.5">
//                               <div className="flex items-center gap-2">
//                                 <span className="text-[10px] font-mono font-bold text-brand-primary">MRN: {order.mrn}</span>
//                                 <span className="text-[10px] text-slate-400 font-medium">
//                                   {order.display_age || (order.age_years ? `${order.age_years}y` : '')}
//                                   {order.gender ? ` · ${order.gender}` : ''}
//                                 </span>
//                               </div>
//                               {order.phone && (
//                                 <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
//                                   <Phone size={10} className="text-slate-400" />
//                                   {order.phone}
//                                 </div>
//                               )}
//                             </div>
//                           </div>
//                         </div>
//                       </td>

//                       <td className="px-6 py-4">
//                         <div className="flex flex-col gap-1">
//                           <div className="flex items-center gap-1.5 text-sm font-bold text-slate-600">
//                             <MapPin size={13} className="text-slate-400" />
//                             {order.ward || 'Outpatient'}
//                           </div>
//                           {order.room_number && (
//                             <p className="text-[10px] text-slate-400 font-medium ml-4.5">{order.room_number} · {order.bed_number}</p>
//                           )}
//                         </div>
//                       </td>

//                       <td className="px-6 py-4">
//                         <div className="flex flex-col gap-1.5">
//                           <div>
//                             <p className="text-sm font-black text-slate-800">{order.service_name}</p>
//                             <p className="text-[10px] font-mono text-slate-400 mt-0.5">{order.encounter_number}</p>
//                           </div>
//                           {order.doctor_name && (
//                             <div className="flex items-center gap-1 text-[10px] font-bold text-purple-600/80 bg-purple-50/50 w-fit px-1.5 py-0.5 rounded">
//                               <Stethoscope size={10} />
//                               {order.doctor_name.replace(/^Dr\.?\s*/i, 'Dr. ')}
//                             </div>
//                           )}
//                         </div>
//                       </td>

//                       <td className="px-6 py-4">
//                         <div className="flex flex-col gap-1.5">
//                           {order.invoice_status && (
//                             <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border w-fit ${
//                               order.invoice_status === 'PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
//                             }`}>
//                               {order.invoice_status}
//                             </span>
//                           )}
//                           <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border bg-amber-50 text-amber-700 border-amber-200 w-fit">
//                             {order.processing_status || 'PENDING'}
//                           </span>
//                         </div>
//                       </td>

//                       <td className="px-6 py-4 text-right relative">
//                         <button
//                           onClick={(e) => {
//                             e.stopPropagation();
//                             setActiveMenu(activeMenu === (order.order_id || order.id) ? null : (order.order_id || order.id));
//                           }}
//                           className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
//                         >
//                           <MoreVertical size={18} />
//                         </button>

//                         {activeMenu === (order.order_id || order.id) && (
//                           <div className="absolute right-8 top-10 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-10 animate-in fade-in slide-in-from-top-2">
//                             <button
//                               onClick={() => { setSelectedOrder(order); setActiveMenu(null); }}
//                               className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-purple-600 flex items-center gap-2"
//                             >
//                               <Eye size={14} /> View Details
//                             </button>
//                             <button
//                               onClick={() => handleCollect(order.order_id || order.id)}
//                               disabled={processingId === (order.order_id || order.id)}
//                               className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-emerald-600 flex items-center gap-2 disabled:opacity-50"
//                             >
//                               {processingId === (order.order_id || order.id)
//                                 ? <Loader2 size={14} className="animate-spin" />
//                                 : <CheckCircle2 size={14} />}
//                               Collect Sample
//                             </button>
//                           </div>
//                         )}
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>

//             {totalPagesPending > 1 && (
//               <div className="px-8 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
//                 <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
//                   Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredOrders.length)} of {filteredOrders.length}
//                 </span>
//                 <div className="flex items-center gap-1">
//                   <button 
//                     onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
//                     disabled={currentPage === 1}
//                     className="p-1.5 text-slate-400 hover:text-purple-600 disabled:opacity-50 disabled:hover:text-slate-400 rounded-lg transition-colors"
//                   >
//                     <ChevronLeft size={16} />
//                   </button>
//                   <span className="text-xs font-black text-slate-700 px-3">Page {currentPage} of {totalPagesPending}</span>
//                   <button 
//                     onClick={() => setCurrentPage(p => Math.min(totalPagesPending, p + 1))}
//                     disabled={currentPage === totalPagesPending}
//                     className="p-1.5 text-slate-400 hover:text-purple-600 disabled:opacity-50 disabled:hover:text-slate-400 rounded-lg transition-colors"
//                   >
//                     <ChevronRight size={16} />
//                   </button>
//                 </div>
//               </div>
//             )}
//           </>
//         )}

//         {activeTab === 'print_reference' && (
//           <>
//             <div className="px-8 py-4 border-b border-slate-100 bg-slate-50/30">
//               <h3 className="text-xs font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
//                 <Tag size={14} /> Pending Samples — Print Reference Labels
//               </h3>
//             </div>

//             <div className="overflow-x-auto pb-24">
//               <table className="w-full text-left">
//                 <thead>
//                   <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
//                     <th className="px-6 py-4">Ordered At</th>
//                     <th className="px-6 py-4">Patient</th>
//                     <th className="px-6 py-4">Investigation</th>
//                     <th className="px-6 py-4">Reference No.</th>
//                     <th className="px-6 py-4 text-right">Actions</th>
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y divide-slate-50">
//                   {samplesLoading ? (
//                     <tr>
//                       <td colSpan={5} className="py-20 text-center">
//                         <Loader2 size={36} className="animate-spin mx-auto text-emerald-600 mb-3" />
//                         <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Samples...</p>
//                       </td>
//                     </tr>
//                   ) : paginatedPrint.length === 0 ? (
//                     <tr>
//                       <td colSpan={5} className="py-20 text-center">
//                         <Tag size={40} className="mx-auto text-slate-300 mb-4" />
//                         <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No pending samples found</p>
//                       </td>
//                     </tr>
//                   ) : paginatedPrint.map((sample) => (
//                     <tr key={sample.id} className="group hover:bg-slate-50/50 transition-colors">
//                       <td className="px-6 py-4">
//                         <div className="text-[10px] font-bold text-slate-500 leading-tight font-mono">
//                           <div className="flex items-center gap-1"><Clock size={10}/> {sample.ordered_at?.split(' ')[0]}</div>
//                           <div className="ml-3.5 text-slate-400">{sample.ordered_at?.split(' ')[1]}</div>
//                         </div>
//                       </td>

//                       <td className="px-6 py-4">
//                         <p className="text-sm font-black text-slate-800">{sample.patient_name}</p>
//                         <p className="text-[10px] font-mono font-bold text-brand-primary mt-0.5">MRN: {sample.mrn}</p>
//                       </td>

//                       <td className="px-6 py-4">
//                         <p className="text-sm font-bold text-slate-700">{sample.sample_name || sample.service_name}</p>
//                         <p className="text-[10px] font-mono text-slate-400 mt-0.5">{sample.encounter_number}</p>
//                       </td>

//                       <td className="px-6 py-4">
//                         {sample.reference_no ? (
//                           <span className="text-[11px] font-mono font-black text-brand-primary uppercase bg-brand-active px-2.5 py-1 rounded-lg">
//                             {sample.reference_no}
//                           </span>
//                         ) : (
//                           <span className="text-[10px] text-slate-400 italic">Not assigned</span>
//                         )}
//                       </td>

//                       <td className="px-6 py-4 text-right relative">
//                         <button
//                           onClick={(e) => {
//                             e.stopPropagation();
//                             setActiveMenu(activeMenu === sample.id ? null : sample.id);
//                           }}
//                           className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
//                         >
//                           <MoreVertical size={18} />
//                         </button>

//                         {activeMenu === sample.id && (
//                           <div className="absolute right-8 top-10 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-10 animate-in fade-in slide-in-from-top-2">
//                             <button
//                               onClick={() => { setSelectedOrder(sample); setActiveMenu(null); }}
//                               className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-purple-600 flex items-center gap-2"
//                             >
//                               <Eye size={14} /> View Details
//                             </button>
//                             {sample.reference_no && (
//                               <button
//                                 onClick={() => { setPrintOrder(sample); setIsPrintModalOpen(true); setActiveMenu(null); }}
//                                 className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-emerald-600 flex items-center gap-2"
//                               >
//                                 <Printer size={14} /> Print Label
//                               </button>
//                             )}
//                           </div>
//                         )}
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>

//             {totalPagesPrint > 1 && (
//               <div className="px-8 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
//                 <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
//                   Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredPrint.length)} of {filteredPrint.length}
//                 </span>
//                 <div className="flex items-center gap-1">
//                   <button 
//                     onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
//                     disabled={currentPage === 1}
//                     className="p-1.5 text-slate-400 hover:text-emerald-600 disabled:opacity-50 disabled:hover:text-slate-400 rounded-lg transition-colors"
//                   >
//                     <ChevronLeft size={16} />
//                   </button>
//                   <span className="text-xs font-black text-slate-700 px-3">Page {currentPage} of {totalPagesPrint}</span>
//                   <button 
//                     onClick={() => setCurrentPage(p => Math.min(totalPagesPrint, p + 1))}
//                     disabled={currentPage === totalPagesPrint}
//                     className="p-1.5 text-slate-400 hover:text-emerald-600 disabled:opacity-50 disabled:hover:text-slate-400 rounded-lg transition-colors"
//                   >
//                     <ChevronRight size={16} />
//                   </button>
//                 </div>
//               </div>
//             )}
//           </>
//         )}
//       </div>

//       {/* ── Order Details Side Modal ── */}
//       {selectedOrder && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
//           <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[88vh]">
//             <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
//               <div>
//                 <h3 className="text-lg font-black text-slate-800">Order Details</h3>
//                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
//                   {selectedOrder.service_name} · {selectedOrder.encounter_number}
//                 </p>
//               </div>
//               <button onClick={() => setSelectedOrder(null)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
//                 <X size={20} />
//               </button>
//             </div>

//             <div className="p-8 overflow-y-auto space-y-6">
//               <div className="grid grid-cols-2 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
//                 {[
//                   ['Patient', `${selectedOrder.first_name || selectedOrder.patient_name || ''} ${selectedOrder.last_name || ''}`],
//                   ['MRN', selectedOrder.mrn],
//                   ['Age / Gender', `${selectedOrder.display_age || selectedOrder.age_years + 'y'} · ${selectedOrder.gender || '-'}`],
//                   ['Contact', selectedOrder.phone || 'N/A'],
//                   ['Ward / Location', selectedOrder.ward || 'Outpatient'],
//                   ['Invoice Status', selectedOrder.invoice_status || '—'],
//                 ].map(([label, value]) => (
//                   <div key={label}>
//                     <p className="text-[10px] font-bold text-slate-400 uppercase">{label}</p>
//                     <p className="text-sm font-bold text-slate-800">{value}</p>
//                   </div>
//                 ))}
//               </div>

//               {selectedOrder.diagnosis && (
//                 <div className="bg-brand-active/50 p-4 rounded-2xl border border-brand-active">
//                   <p className="text-[10px] font-bold text-brand-primary uppercase mb-1">Diagnosis</p>
//                   <p className="text-sm font-bold text-brand-primary">
//                     {selectedOrder.icd10_code ? `[${selectedOrder.icd10_code}] ` : ''}{selectedOrder.diagnosis}
//                   </p>
//                 </div>
//               )}

//               {selectedOrder.clinical_note && (
//                 <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
//                   <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Clinical Notes</p>
//                   <div className="text-sm font-medium text-slate-700 space-y-1">
//                     {selectedOrder.clinical_note.split('|').map((note: string, i: number) => (
//                       <p key={i}>{note.trim()}</p>
//                     ))}
//                   </div>
//                 </div>
//               )}
//             </div>

//             <div className="px-8 py-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
//               <button onClick={() => setSelectedOrder(null)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors">
//                 Close
//               </button>
//               <button
//                 onClick={() => { handleCollect(selectedOrder.order_id || selectedOrder.id); setSelectedOrder(null); }}
//                 disabled={processingId === (selectedOrder.order_id || selectedOrder.id) || selectedOrder.processing_status === 'IN_PROGRESS'}
//                 className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 transition-colors shadow-md shadow-purple-200 flex items-center gap-2 disabled:opacity-50"
//               >
//                 {processingId === (selectedOrder.order_id || selectedOrder.id)
//                   ? <Loader2 size={16} className="animate-spin" />
//                   : <Droplets size={16} />}
//                 Collect Sample
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* ── Print Reference Preview Modal ── */}
//       {isPrintModalOpen && printOrder && createPortal(
//         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in">
//           <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsPrintModalOpen(false)} />
//           <div className="relative w-full max-w-sm bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
//             <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
//               <div className="flex items-center gap-4">
//                 <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
//                   <Printer size={22} />
//                 </div>
//                 <div>
//                   <h3 className="text-lg font-black text-slate-800">Reference Label</h3>
//                   <p className="text-xs text-slate-500 font-bold">50mm × 25mm thermal</p>
//                 </div>
//               </div>
//               <button onClick={() => setIsPrintModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all">
//                 <X size={20} />
//               </button>
//             </div>

//             <div className="p-6">
//               {/* Preview */}
//               <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 bg-white font-mono space-y-2">
//                 <p className="text-xs font-black text-slate-800 tracking-tight">{printOrder.reference_no}</p>
//                 <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
//                   <div><span className="text-[9px] text-slate-400 font-bold uppercase">Patient: </span><span className="font-bold text-slate-700">{printOrder.patient_name}</span></div>
//                   <div><span className="text-[9px] text-slate-400 font-bold uppercase">MRN: </span><span className="font-bold text-slate-700">{printOrder.mrn}</span></div>
//                   <div><span className="text-[9px] text-slate-400 font-bold uppercase">Test: </span><span className="font-bold text-slate-700">{printOrder.sample_name || printOrder.service_name}</span></div>
//                   <div><span className="text-[9px] text-slate-400 font-bold uppercase">Enc: </span><span className="font-bold text-slate-700 text-[9px]">{printOrder.encounter_number}</span></div>
//                 </div>
//                 <div className="flex items-center justify-between mt-2 pt-2">
//                   {printOrder.barcode_path && (
//                     <img src={`${import.meta.env.VITE_API_BASE_URL}${printOrder.barcode_path}`} alt="Barcode" className="h-6 w-auto max-w-[80%]" />
//                   )}
//                   {printOrder.qr_code_path && (
//                     <img src={`${import.meta.env.VITE_API_BASE_URL}${printOrder.qr_code_path}`} alt="QR Code" className="h-8 w-8 ml-2" />
//                   )}
//                 </div>
//                 <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest text-center mt-2">gracespringhospitals · lab</p>
//               </div>
//               <p className="text-[10px] text-slate-400 text-center mt-3">Preview · Prints at 50mm × 25mm</p>
//             </div>

//             <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
//               <button onClick={() => setIsPrintModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
//                 Cancel
//               </button>
//               <button
//                 onClick={() => { printReferenceLabel(printOrder); setIsPrintModalOpen(false); }}
//                 className="px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all flex items-center gap-1.5"
//               >
//                 <Printer size={16} /> Print Now
//               </button>
//             </div>
//           </div>
//         </div>,
//         document.body
//       )}
//     </div>
//   );
// };

// export default LabWorklist;



// import React, { useState, useEffect } from 'react';
// import {
//   Search,
//   Clock,
//   Droplets,
//   ClipboardList,
//   Activity,
//   Loader2,
//   MoreVertical,
//   Eye,
//   X,
//   FileText,
//   Printer,
//   RefreshCw,
//   Tag,
//   CheckCircle2,
//   MapPin,
//   ChevronLeft,
//   ChevronRight,
//   Stethoscope,
//   Phone
// } from 'lucide-react';
// import { labService } from '../services/lab.service';
// import { useNotification } from '../context/NotificationContext';
// import { createPortal } from 'react-dom';

// // ─────────────────────────────────────────────────────────
// // Utility: print 50mm × 25mm thermal reference label
// // ─────────────────────────────────────────────────────────
// const printReferenceLabel = (order: any) => {
//   localStorage.setItem('printLabOrder', JSON.stringify(order));
//   const refNo = order.reference_no || String(order.id);
//   window.open(`/print/lab-label/${refNo}`, '_blank');
// };

// // ─────────────────────────────────────────────────────────
// // Component
// // ─────────────────────────────────────────────────────────
// const LabWorklist: React.FC = () => {
//   const { notify } = useNotification();

//   // Tab 1: Pending Lab Investigations — /lab/orders
//   const [orders, setOrders] = useState<any[]>([]);
//   const [ordersLoading, setOrdersLoading] = useState(true);
//   const [processingId, setProcessingId] = useState<number | null>(null);
//   const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
//   const [activeMenu, setActiveMenu] = useState<number | null>(null);
//   const [searchOrders, setSearchOrders] = useState('');

//   // Tab 2: Print Reference — /lab/sample/view (PENDING workflow_status)
//   const [pendingSamples, setPendingSamples] = useState<any[]>([]);
//   const [samplesLoading, setSamplesLoading] = useState(false);
//   const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
//   const [printOrder, setPrintOrder] = useState<any | null>(null);
//   const [searchPrint, setSearchPrint] = useState('');

//   // Active tab
//   const [activeTab, setActiveTab] = useState<'pending' | 'print_reference'>('pending');

//   // Pagination State
//   const [currentPage, setCurrentPage] = useState(1);
//   const itemsPerPage = 10;

//   // ── Fetch pending lab orders (tab 1)
//   const fetchOrders = async () => {
//     setOrdersLoading(true);
//     try {
//       const data = await labService.getPendingOrders();
//       setOrders(data);
//     } catch (err: any) {
//       notify(err.response?.data?.message || 'Failed to load lab orders', 'error');
//     } finally {
//       setOrdersLoading(false);
//     }
//   };

//   // ── Fetch samples for print reference tab (tab 2)
//   const fetchPendingSamples = async () => {
//     setSamplesLoading(true);
//     try {
//       const data = await labService.getSamples();
//       setPendingSamples(data.filter((s: any) => s.workflow_status === 'PENDING'));
//     } catch (err: any) {
//       notify(err.response?.data?.message || 'Failed to load samples', 'error');
//     } finally {
//       setSamplesLoading(false);
//     }
//   };

//   useEffect(() => { fetchOrders(); }, []);

//   // Lazy-load print reference tab data only when first opened
//   useEffect(() => {
//     if (activeTab === 'print_reference' && pendingSamples.length === 0 && !samplesLoading) {
//       fetchPendingSamples();
//     }
//   }, [activeTab]);

//   // Close dropdown on outside click
//   useEffect(() => {
//     const handleClickOutside = () => setActiveMenu(null);
//     document.addEventListener('click', handleClickOutside);
//     return () => document.removeEventListener('click', handleClickOutside);
//   }, []);

//   const handleCollect = async (orderId: number) => {
//     setProcessingId(orderId);
//     setActiveMenu(null);
//     try {
//       await labService.collectSample(orderId);
//       notify('Sample collected successfully. Moved to result entry.', 'success');
//       fetchOrders();
//     } catch (err: any) {
//       notify(err.response?.data?.message || 'Collection failed', 'error');
//     } finally {
//       setProcessingId(null);
//     }
//   };

//   // ── Filtered lists
//   const filteredOrders = orders.filter(o => {
//     const q = searchOrders.toLowerCase();
//     return (
//       `${o.first_name} ${o.last_name}`.toLowerCase().includes(q) ||
//       (o.mrn || '').toLowerCase().includes(q) ||
//       (o.service_name || '').toLowerCase().includes(q) ||
//       (o.encounter_number || '').toLowerCase().includes(q)
//     );
//   });

//   const filteredPrint = pendingSamples.filter(s => {
//     const q = searchPrint.toLowerCase();
//     return (
//       (s.patient_name || '').toLowerCase().includes(q) ||
//       (s.mrn || '').toLowerCase().includes(q) ||
//       (s.sample_name || s.service_name || '').toLowerCase().includes(q) ||
//       (s.reference_no || '').toLowerCase().includes(q) ||
//       (s.encounter_number || '').toLowerCase().includes(q)
//     );
//   });

//   useEffect(() => {
//     setCurrentPage(1);
//   }, [searchOrders, searchPrint, activeTab]);

//   const totalPagesPending = Math.ceil(filteredOrders.length / itemsPerPage);
//   const paginatedOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

//   const totalPagesPrint = Math.ceil(filteredPrint.length / itemsPerPage);
//   const paginatedPrint = filteredPrint.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

//   // ── Stats
//   const inLabCount = orders.filter(o => o.processing_status && o.processing_status !== 'NOT_COLLECTED').length;

//   return (
//     <div className="space-y-6 animate-in fade-in duration-500">

//       {/* Stats — only show on pending tab */}
//       {activeTab === 'pending' && (
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//           <div className="bg-white p-5 rounded-[28px] border border-slate-200 shadow-sm flex items-center justify-between">
//             <div>
//               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending Collection</p>
//               <p className="text-3xl font-black text-slate-800">{orders.length}</p>
//             </div>
//             <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl"><Droplets size={22}/></div>
//           </div>
//           <div className="bg-white p-5 rounded-[28px] border border-slate-200 shadow-sm flex items-center justify-between">
//             <div>
//               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">In Lab Analysis</p>
//               <p className="text-3xl font-black text-amber-600">{inLabCount || '—'}</p>
//             </div>
//             <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl"><Activity size={22}/></div>
//           </div>
//         </div>
//       )}

//       {/* Main Card */}
//       <div className="bg-white rounded-[40px] border border-slate-200 overflow-hidden shadow-sm">

//         {/* Toolbar */}
//         <div className="px-8 py-5 bg-white border-b border-slate-100 flex flex-col md:flex-row md:items-center gap-4">
//           {/* Tabs */}
//           <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl w-fit">
//             <button
//               onClick={() => setActiveTab('pending')}
//               className={`px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all whitespace-nowrap ${
//                 activeTab === 'pending'
//                   ? 'bg-white text-purple-600 shadow-sm'
//                   : 'text-slate-500 hover:text-slate-800'
//               }`}
//             >
//               Pending Lab Investigations
//             </button>
//             <button
//               onClick={() => setActiveTab('print_reference')}
//               className={`px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all whitespace-nowrap ${
//                 activeTab === 'print_reference'
//                   ? 'bg-white text-emerald-600 shadow-sm'
//                   : 'text-slate-500 hover:text-slate-800'
//               }`}
//             >
//               Print Reference
//             </button>
//           </div>

//           {/* Search + Refresh */}
//           <div className="flex items-center gap-3 ml-auto">
//             <div className="relative w-72">
//               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
//               <input
//                 type="text"
//                 placeholder={activeTab === 'pending' ? 'Search by Patient Name, Test or Encounter...' : 'Search patient, ref no, MRN...'}
//                 className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-400 transition-all font-medium"
//                 value={activeTab === 'pending' ? searchOrders : searchPrint}
//                 onChange={(e) => activeTab === 'pending' ? setSearchOrders(e.target.value) : setSearchPrint(e.target.value)}
//               />
//             </div>
//             <button
//               onClick={() => activeTab === 'pending' ? fetchOrders() : fetchPendingSamples()}
//               className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-slate-100 transition-all"
//             >
//               <RefreshCw size={15} className={(ordersLoading || samplesLoading) ? 'animate-spin' : ''} /> Refresh
//             </button>
//           </div>
//         </div>

//         {/* ── TAB 1: Pending Lab Investigations ── */}
//         {activeTab === 'pending' && (
//           <>
//             <div className="px-8 py-4 border-b border-slate-100 bg-slate-50/30">
//               <h3 className="text-xs font-black text-purple-600 uppercase tracking-widest flex items-center gap-2">
//                 <ClipboardList size={14} /> Pending Lab Investigations
//               </h3>
//             </div>

//             <div className="overflow-x-auto pb-24">
//               <table className="w-full text-left">
//                 <thead>
//                   <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
//                     <th className="px-6 py-4">#</th>
//                     <th className="px-6 py-4">Patient Details</th>
//                     <th className="px-6 py-4">Location</th>
//                     <th className="px-6 py-4">Investigation / Ordered By</th>
//                     <th className="px-6 py-4">Status</th>
//                     <th className="px-6 py-4 text-right">Actions</th>
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y divide-slate-50">
//                   {ordersLoading ? (
//                     <tr>
//                       <td colSpan={6} className="py-20 text-center">
//                         <Loader2 size={36} className="animate-spin mx-auto text-purple-600 mb-3" />
//                         <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Orders...</p>
//                       </td>
//                     </tr>
//                   ) : paginatedOrders.length === 0 ? (
//                     <tr>
//                       <td colSpan={6} className="py-20 text-center">
//                         <ClipboardList size={40} className="mx-auto text-slate-300 mb-4" />
//                         <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No pending investigations</p>
//                       </td>
//                     </tr>
//                   ) : paginatedOrders.map((order, idx) => (
//                     <tr key={order.order_id || order.id} className="group hover:bg-slate-50/50 transition-colors">
//                       {/* # Column: type badge + date */}
//                       <td className="px-6 py-4">
//                         <div className="flex flex-col gap-1.5">
//                           <span className={`inline-flex items-center justify-center px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border w-fit ${
//                             order.encounter_type === 'ERD' ? 'bg-red-50 text-red-600 border-red-100' :
//                             order.encounter_type === 'IPD' ? 'bg-brand-active text-brand-primary border-brand-active' :
//                             'bg-emerald-50 text-emerald-600 border-emerald-100'
//                           }`}>
//                             {order.encounter_type || 'OPD'}
//                           </span>
//                           <div className="text-[10px] font-bold text-slate-400 leading-tight font-mono">
//                             <div>{order.ordered_at?.split(' ')[0]}</div>
//                             <div>{order.ordered_at?.split(' ')[1]}</div>
//                           </div>
//                         </div>
//                       </td>

//                       {/* Patient Details */}
//                       <td className="px-6 py-4">
//                         <div className="flex items-center gap-3">
//                           <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-black text-xs shrink-0">
//                             {(order.first_name?.[0] || '?')}{(order.last_name?.[0] || '')}
//                           </div>
//                           <div>
//                             <p className="text-sm font-black text-slate-800">{order.first_name} {order.last_name}</p>
//                             <div className="flex flex-col gap-0.5 mt-0.5">
//                               <div className="flex items-center gap-2">
//                                 <span className="text-[10px] font-mono font-bold text-brand-primary">MRN: {order.mrn}</span>
//                                 <span className="text-[10px] text-slate-400 font-medium">
//                                   {order.display_age || (order.age_years ? `${order.age_years}y` : '')}
//                                   {order.gender ? ` · ${order.gender}` : ''}
//                                 </span>
//                               </div>
//                               {order.phone && (
//                                 <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
//                                   <Phone size={10} className="text-slate-400" />
//                                   {order.phone}
//                                 </div>
//                               )}
//                             </div>
//                           </div>
//                         </div>
//                       </td>

//                       {/* Location */}
//                       <td className="px-6 py-4">
//                         <div className="flex flex-col gap-1">
//                           <div className="flex items-center gap-1.5 text-sm font-bold text-slate-600">
//                             <MapPin size={13} className="text-slate-400" />
//                             {order.ward || 'Outpatient'}
//                           </div>
//                           {order.room_number && (
//                             <p className="text-[10px] text-slate-400 font-medium ml-4.5">{order.room_number} · {order.bed_number}</p>
//                           )}
//                         </div>
//                       </td>

//                       {/* Investigation */}
//                       <td className="px-6 py-4">
//                         <div className="flex flex-col gap-1.5">
//                           <div>
//                             <p className="text-sm font-black text-slate-800">{order.service_name}</p>
//                             <p className="text-[10px] font-mono text-slate-400 mt-0.5">{order.encounter_number}</p>
//                           </div>
//                           {order.doctor_name && (
//                             <div className="flex items-center gap-1 text-[10px] font-bold text-purple-600/80 bg-purple-50/50 w-fit px-1.5 py-0.5 rounded">
//                               <Stethoscope size={10} />
//                               {order.doctor_name.replace(/^Dr\.?\s*/i, 'Dr. ')}
//                             </div>
//                           )}
//                         </div>
//                       </td>

//                       {/* Status */}
//                       <td className="px-6 py-4">
//                         <div className="flex flex-col gap-1.5">
//                           {order.invoice_status && (
//                             <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border w-fit ${
//                               order.invoice_status === 'PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
//                             }`}>
//                               {order.invoice_status}
//                             </span>
//                           )}
//                           <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border bg-amber-50 text-amber-700 border-amber-200 w-fit">
//                             {order.processing_status || 'PENDING'}
//                           </span>
//                         </div>
//                       </td>

//                       {/* Actions */}
//                       <td className="px-6 py-4 text-right relative">
//                         <button
//                           onClick={(e) => {
//                             e.stopPropagation();
//                             setActiveMenu(activeMenu === (order.order_id || order.id) ? null : (order.order_id || order.id));
//                           }}
//                           className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
//                         >
//                           <MoreVertical size={18} />
//                         </button>

//                         {activeMenu === (order.order_id || order.id) && (
//                           <div className="absolute right-8 top-10 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-10 animate-in fade-in slide-in-from-top-2">
//                             <button
//                               onClick={() => { setSelectedOrder(order); setActiveMenu(null); }}
//                               className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-purple-600 flex items-center gap-2"
//                             >
//                               <Eye size={14} /> View Details
//                             </button>
//                             <button
//                               onClick={() => handleCollect(order.order_id || order.id)}
//                               disabled={processingId === (order.order_id || order.id)}
//                               className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-emerald-600 flex items-center gap-2 disabled:opacity-50"
//                             >
//                               {processingId === (order.order_id || order.id)
//                                 ? <Loader2 size={14} className="animate-spin" />
//                                 : <CheckCircle2 size={14} />}
//                               Collect Sample
//                             </button>
//                           </div>
//                         )}
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>

//             {/* Pagination Footer */}
//             {totalPagesPending > 1 && (
//               <div className="px-8 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
//                 <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
//                   Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredOrders.length)} of {filteredOrders.length}
//                 </span>
//                 <div className="flex items-center gap-1">
//                   <button 
//                     onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
//                     disabled={currentPage === 1}
//                     className="p-1.5 text-slate-400 hover:text-purple-600 disabled:opacity-50 disabled:hover:text-slate-400 rounded-lg transition-colors"
//                   >
//                     <ChevronLeft size={16} />
//                   </button>
//                   <span className="text-xs font-black text-slate-700 px-3">Page {currentPage} of {totalPagesPending}</span>
//                   <button 
//                     onClick={() => setCurrentPage(p => Math.min(totalPagesPending, p + 1))}
//                     disabled={currentPage === totalPagesPending}
//                     className="p-1.5 text-slate-400 hover:text-purple-600 disabled:opacity-50 disabled:hover:text-slate-400 rounded-lg transition-colors"
//                   >
//                     <ChevronRight size={16} />
//                   </button>
//                 </div>
//               </div>
//             )}
//           </>
//         )}

//         {/* ── TAB 2: Print Reference ── */}
//         {activeTab === 'print_reference' && (
//           <>
//             <div className="px-8 py-4 border-b border-slate-100 bg-slate-50/30">
//               <h3 className="text-xs font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
//                 <Tag size={14} /> Pending Samples — Print Reference Labels
//               </h3>
//             </div>

//             <div className="overflow-x-auto pb-24">
//               <table className="w-full text-left">
//                 <thead>
//                   <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
//                     <th className="px-6 py-4">Ordered At</th>
//                     <th className="px-6 py-4">Patient</th>
//                     <th className="px-6 py-4">Investigation</th>
//                     <th className="px-6 py-4">Reference No.</th>
//                     <th className="px-6 py-4 text-right">Actions</th>
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y divide-slate-50">
//                   {samplesLoading ? (
//                     <tr>
//                       <td colSpan={5} className="py-20 text-center">
//                         <Loader2 size={36} className="animate-spin mx-auto text-emerald-600 mb-3" />
//                         <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Samples...</p>
//                       </td>
//                     </tr>
//                   ) : paginatedPrint.length === 0 ? (
//                     <tr>
//                       <td colSpan={5} className="py-20 text-center">
//                         <Tag size={40} className="mx-auto text-slate-300 mb-4" />
//                         <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No pending samples found</p>
//                       </td>
//                     </tr>
//                   ) : paginatedPrint.map((sample) => (
//                     <tr key={sample.id} className="group hover:bg-slate-50/50 transition-colors">
//                       {/* Ordered At */}
//                       <td className="px-6 py-4">
//                         <div className="text-[10px] font-bold text-slate-500 leading-tight font-mono">
//                           <div className="flex items-center gap-1"><Clock size={10}/> {sample.ordered_at?.split(' ')[0]}</div>
//                           <div className="ml-3.5 text-slate-400">{sample.ordered_at?.split(' ')[1]}</div>
//                         </div>
//                       </td>

//                       {/* Patient */}
//                       <td className="px-6 py-4">
//                         <p className="text-sm font-black text-slate-800">{sample.patient_name}</p>
//                         <p className="text-[10px] font-mono font-bold text-brand-primary mt-0.5">MRN: {sample.mrn}</p>
//                       </td>

//                       {/* Investigation */}
//                       <td className="px-6 py-4">
//                         <p className="text-sm font-bold text-slate-700">{sample.sample_name || sample.service_name}</p>
//                         <p className="text-[10px] font-mono text-slate-400 mt-0.5">{sample.encounter_number}</p>
//                       </td>

//                       {/* Reference No */}
//                       <td className="px-6 py-4">
//                         {sample.reference_no ? (
//                           <span className="text-[11px] font-mono font-black text-brand-primary uppercase bg-brand-active px-2.5 py-1 rounded-lg">
//                             {sample.reference_no}
//                           </span>
//                         ) : (
//                           <span className="text-[10px] text-slate-400 italic">Not assigned</span>
//                         )}
//                       </td>

//                       {/* Actions */}
//                       <td className="px-6 py-4 text-right relative">
//                         <button
//                           onClick={(e) => {
//                             e.stopPropagation();
//                             setActiveMenu(activeMenu === sample.id ? null : sample.id);
//                           }}
//                           className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
//                         >
//                           <MoreVertical size={18} />
//                         </button>

//                         {activeMenu === sample.id && (
//                           <div className="absolute right-8 top-10 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-10 animate-in fade-in slide-in-from-top-2">
//                             <button
//                               onClick={() => { setSelectedOrder(sample); setActiveMenu(null); }}
//                               className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-purple-600 flex items-center gap-2"
//                             >
//                               <Eye size={14} /> View Details
//                             </button>
//                             {sample.reference_no && (
//                               <button
//                                 onClick={() => { setPrintOrder(sample); setIsPrintModalOpen(true); setActiveMenu(null); }}
//                                 className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-emerald-600 flex items-center gap-2"
//                               >
//                                 <Printer size={14} /> Print Label
//                               </button>
//                             )}
//                           </div>
//                         )}
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>

//             {/* Pagination Footer */}
//             {totalPagesPrint > 1 && (
//               <div className="px-8 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
//                 <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
//                   Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredPrint.length)} of {filteredPrint.length}
//                 </span>
//                 <div className="flex items-center gap-1">
//                   <button 
//                     onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
//                     disabled={currentPage === 1}
//                     className="p-1.5 text-slate-400 hover:text-emerald-600 disabled:opacity-50 disabled:hover:text-slate-400 rounded-lg transition-colors"
//                   >
//                     <ChevronLeft size={16} />
//                   </button>
//                   <span className="text-xs font-black text-slate-700 px-3">Page {currentPage} of {totalPagesPrint}</span>
//                   <button 
//                     onClick={() => setCurrentPage(p => Math.min(totalPagesPrint, p + 1))}
//                     disabled={currentPage === totalPagesPrint}
//                     className="p-1.5 text-slate-400 hover:text-emerald-600 disabled:opacity-50 disabled:hover:text-slate-400 rounded-lg transition-colors"
//                   >
//                     <ChevronRight size={16} />
//                   </button>
//                 </div>
//               </div>
//             )}
//           </>
//         )}
//       </div>

//       {/* ── Order Details Side Modal (Pending tab) ── */}
//       {selectedOrder && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
//           <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[88vh]">
//             <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
//               <div>
//                 <h3 className="text-lg font-black text-slate-800">Order Details</h3>
//                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
//                   {selectedOrder.service_name} · {selectedOrder.encounter_number}
//                 </p>
//               </div>
//               <button onClick={() => setSelectedOrder(null)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
//                 <X size={20} />
//               </button>
//             </div>

//             <div className="p-8 overflow-y-auto space-y-6">
//               <div className="grid grid-cols-2 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
//                 {[
//                   ['Patient', `${selectedOrder.first_name} ${selectedOrder.last_name}`],
//                   ['MRN', selectedOrder.mrn],
//                   ['Age / Gender', `${selectedOrder.display_age || selectedOrder.age_years + 'y'} · ${selectedOrder.gender}`],
//                   ['Contact', selectedOrder.phone || 'N/A'],
//                   ['Ward / Location', selectedOrder.ward || 'Outpatient'],
//                   ['Invoice Status', selectedOrder.invoice_status || '—'],
//                 ].map(([label, value]) => (
//                   <div key={label}>
//                     <p className="text-[10px] font-bold text-slate-400 uppercase">{label}</p>
//                     <p className="text-sm font-bold text-slate-800">{value}</p>
//                   </div>
//                 ))}
//               </div>

//               {selectedOrder.diagnosis && (
//                 <div className="bg-brand-active/50 p-4 rounded-2xl border border-brand-active">
//                   <p className="text-[10px] font-bold text-brand-primary uppercase mb-1">Diagnosis</p>
//                   <p className="text-sm font-bold text-brand-primary">
//                     {selectedOrder.icd10_code ? `[${selectedOrder.icd10_code}] ` : ''}{selectedOrder.diagnosis}
//                   </p>
//                 </div>
//               )}

//               {selectedOrder.clinical_note && (
//                 <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
//                   <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Clinical Notes</p>
//                   <div className="text-sm font-medium text-slate-700 space-y-1">
//                     {selectedOrder.clinical_note.split('|').map((note: string, i: number) => (
//                       <p key={i}>{note.trim()}</p>
//                     ))}
//                   </div>
//                 </div>
//               )}
//             </div>

//             <div className="px-8 py-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
//               <button onClick={() => setSelectedOrder(null)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors">
//                 Close
//               </button>
//               <button
//                 onClick={() => { handleCollect(selectedOrder.order_id || selectedOrder.id); setSelectedOrder(null); }}
//                 disabled={processingId === (selectedOrder.order_id || selectedOrder.id)}
//                 className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 transition-colors shadow-md shadow-purple-200 flex items-center gap-2 disabled:opacity-50"
//               >
//                 {processingId === (selectedOrder.order_id || selectedOrder.id)
//                   ? <Loader2 size={16} className="animate-spin" />
//                   : <Droplets size={16} />}
//                 Collect Sample
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* ── Print Reference Preview Modal ── */}
//       {isPrintModalOpen && printOrder && createPortal(
//         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in">
//           <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsPrintModalOpen(false)} />
//           <div className="relative w-full max-w-sm bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
//             <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
//               <div className="flex items-center gap-4">
//                 <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
//                   <Printer size={22} />
//                 </div>
//                 <div>
//                   <h3 className="text-lg font-black text-slate-800">Reference Label</h3>
//                   <p className="text-xs text-slate-500 font-bold">50mm × 25mm thermal</p>
//                 </div>
//               </div>
//               <button onClick={() => setIsPrintModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all">
//                 <X size={20} />
//               </button>
//             </div>

//             <div className="p-6">
//               {/* Preview */}
//               <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 bg-white font-mono space-y-2">
//                 <p className="text-xs font-black text-slate-800 tracking-tight">{printOrder.reference_no}</p>
//                 <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
//                   <div><span className="text-[9px] text-slate-400 font-bold uppercase">Patient: </span><span className="font-bold text-slate-700">{printOrder.patient_name}</span></div>
//                   <div><span className="text-[9px] text-slate-400 font-bold uppercase">MRN: </span><span className="font-bold text-slate-700">{printOrder.mrn}</span></div>
//                   <div><span className="text-[9px] text-slate-400 font-bold uppercase">Test: </span><span className="font-bold text-slate-700">{printOrder.sample_name || printOrder.service_name}</span></div>
//                   <div><span className="text-[9px] text-slate-400 font-bold uppercase">Enc: </span><span className="font-bold text-slate-700 text-[9px]">{printOrder.encounter_number}</span></div>
//                 </div>
//                 <div className="flex items-center justify-between mt-2 pt-2">
//                   {printOrder.barcode_path && (
//                     <img src={`${import.meta.env.VITE_API_BASE_URL}${printOrder.barcode_path}`} alt="Barcode" className="h-6 w-auto max-w-[80%]" />
//                   )}
//                   {printOrder.qr_code_path && (
//                     <img src={`${import.meta.env.VITE_API_BASE_URL}${printOrder.qr_code_path}`} alt="QR Code" className="h-8 w-8 ml-2" />
//                   )}
//                 </div>
//                 <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest text-center mt-2">gracespringhospitals · lab</p>
//               </div>
//               <p className="text-[10px] text-slate-400 text-center mt-3">Preview · Prints at 50mm × 25mm</p>
//             </div>

//             <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
//               <button onClick={() => setIsPrintModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
//                 Cancel
//               </button>
//               <button
//                 onClick={() => { printReferenceLabel(printOrder); setIsPrintModalOpen(false); }}
//                 className="px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all flex items-center gap-1.5"
//               >
//                 <Printer size={16} /> Print Now
//               </button>
//             </div>
//           </div>
//         </div>,
//         document.body
//       )}
//     </div>
//   );
// };

// export default LabWorklist;
