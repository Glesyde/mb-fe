import React, { useState, useEffect } from 'react';
import { Search, Loader2, RefreshCw, ChevronLeft, ChevronRight, ArrowLeft, MoreVertical, Eye, Plus, CheckCircle, Droplet, PackagePlus, FileCheck, X } from 'lucide-react';
import { bloodBankService } from '../services/bloodBank.service';
import { useNotification } from '../context/NotificationContext';
import { createPortal } from 'react-dom';

const WORKFLOW_TABS = [
  { id: 'ALL', label: 'All Requests', statuses: [] },
  { id: 'PENDING_CROSSMATCH', label: 'Needs Crossmatch', statuses: ['SAMPLE_RECEIVED'] },
  { id: 'READY_TO_ISSUE', label: 'Ready to Issue', statuses: ['CROSSMATCHED', 'UNIT_READY'] },
  { id: 'IN_PROGRESS', label: 'Active Transfusions', statuses: ['ISSUED', 'IN_TRANSFUSION'] },
  { id: 'COMPLETED', label: 'Completed', statuses: ['COMPLETED', 'STOPPED'] },
];

const BloodBankIssue: React.FC = () => {
  const { notify } = useNotification();
  
  // Base State
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dropdown Menu State
  const [activeMenu, setActiveMenu] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('READY_TO_ISSUE');
  
  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterUrgency, setFilterUrgency] = useState('');
  const [filterSampleCondition, setFilterSampleCondition] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Modal States
  const [actionModalReq, setActionModalReq] = useState<any | null>(null);
  
  // Sub-modal states
  const [detailsModalReq, setDetailsModalReq] = useState<any | null>(null);
  const [createUnitModalReq, setCreateUnitModalReq] = useState<any | null>(null);
  const [issueUnitModalReq, setIssueUnitModalReq] = useState<any | null>(null);
  
  // Details fetching state
  const [requestDetails, setRequestDetails] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Forms
  const [unitForm, setUnitForm] = useState({
    donation_number: '',
    component: 'PACKED_RED_CELLS',
    unit_group: 'O POSITIVE',
    volume_ml: 250,
    expiry_date: '',
    crossmatch_result: 'COMPATIBLE'
  });
  const [submittingUnit, setSubmittingUnit] = useState(false);
  const [issuingUnitId, setIssuingUnitId] = useState<number | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const rawRes: any = await bloodBankService.getRequests({
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        request_status: filterStatus || undefined,
        urgency: filterUrgency || undefined,
        sample_condition: filterSampleCondition || undefined
      });
      
      const payload: any = rawRes?.data ? rawRes.data : rawRes;
      let dataArray: any[] = [];
      if (Array.isArray(rawRes)) {
        dataArray = rawRes;
      } else if (Array.isArray(payload)) {
        dataArray = payload;
      } else if (payload && Array.isArray(payload.data)) {
        dataArray = payload.data;
      } else if (payload && Array.isArray(payload.message)) {
        dataArray = payload.message;
      } else if (rawRes?.data?.data && Array.isArray(rawRes.data.data)) {
        dataArray = rawRes.data.data;
      }

      setRequests(dataArray || []);
    } catch (err: any) {
      notify(err.response?.data?.message || err.message || 'Failed to fetch blood requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    const handleClickOutside = () => setActiveMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const fetchDetails = async (reqId: number) => {
    setLoadingDetails(true);
    setRequestDetails(null);
    try {
      const rawRes: any = await bloodBankService.getRequestDetails(reqId);
      const payload: any = rawRes?.data ? rawRes.data : rawRes;
      let detailsObj = null;

      if (payload?.id && payload?.request_number) {
        detailsObj = payload;
      } else if (payload?.message && typeof payload.message === 'object' && payload.message.id) {
        detailsObj = payload.message;
      } else if (payload?.data && typeof payload.data === 'object' && !Array.isArray(payload.data) && payload.data.id) {
        detailsObj = payload.data;
      }

      setRequestDetails(detailsObj);
    } catch (err: any) {
      notify(err.response?.data?.message || err.message || 'Failed to load details', 'error');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleOpenDetails = () => {
    setDetailsModalReq(actionModalReq);
    fetchDetails(actionModalReq.id);
    setActionModalReq(null);
  };
  
  const handleOpenCreateUnit = () => {
    setCreateUnitModalReq(actionModalReq);
    setUnitForm({
      donation_number: '',
      component: 'PACKED_RED_CELLS',
      unit_group: 'O POSITIVE',
      volume_ml: 250,
      expiry_date: '',
      crossmatch_result: 'COMPATIBLE'
    });
    setActionModalReq(null);
  };
  
  const handleOpenIssueUnit = () => {
    setIssueUnitModalReq(actionModalReq);
    fetchDetails(actionModalReq.id);
    setActionModalReq(null);
  };

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createUnitModalReq) return;
    
    setSubmittingUnit(true);
    try {
      await bloodBankService.createUnit({
        ...unitForm,
        request_id: createUnitModalReq.id
      });
      notify('Blood unit registered successfully', 'success');
      setCreateUnitModalReq(null);
      fetchRequests();
    } catch (err: any) {
      notify(err.response?.data?.message || err.message || 'Failed to create unit', 'error');
    } finally {
      setSubmittingUnit(false);
    }
  };

  const handleIssueUnit = async (unitId: number) => {
    if (!issueUnitModalReq) return;
    
    setIssuingUnitId(unitId);
    try {
      await bloodBankService.issueUnit({
        unit_id: unitId,
        request_id: issueUnitModalReq.id
      });
      notify('Blood unit issued successfully', 'success');
      await fetchDetails(issueUnitModalReq.id);
      fetchRequests(); 
    } catch (err: any) {
      notify(err.response?.data?.message || err.message || 'Failed to issue unit', 'error');
    } finally {
      setIssuingUnitId(null);
    }
  };

  const safeRequests = Array.isArray(requests) ? requests : [];

  const filteredRequests = safeRequests.filter(r => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = (r.request_number || '').toLowerCase().includes(q) ||
                          (r.patient_name || '').toLowerCase().includes(q) ||
                          (r.mrn || '').toLowerCase().includes(q);
                          
    const currentTab = WORKFLOW_TABS.find(t => t.id === activeTab);
    const matchesTab = activeTab === 'ALL' || currentTab?.statuses.includes(r.request_status);

    return matchesSearch && matchesTab;
  });

  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const paginatedRequests = filteredRequests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'REQUESTED': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'SAMPLE_RECEIVED': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'COMPLETED': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'CANCELLED': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getUnitStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'AVAILABLE': return 'bg-emerald-100 text-emerald-700';
      case 'ISSUED': return 'bg-purple-100 text-purple-700';
      case 'DISCARDED':
      case 'EXPIRED': return 'bg-red-100 text-red-700';
      default: return 'bg-amber-100 text-amber-700';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Main Table */}
      <div className="bg-white rounded-[40px] border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-8 py-5 bg-white border-b border-slate-100 flex flex-col md:flex-row md:items-center gap-4 justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-black text-slate-700 tracking-wide">Crossmatch & Issue Management</h3>
          </div>
          <div className="flex flex-wrap items-center gap-3 ml-auto">
            <div className="flex items-center gap-2">
              <input type="date" className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-primary" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              <span className="text-slate-400">-</span>
              <input type="date" className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-primary" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            <div className="relative w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search requests..."
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary transition-all font-medium"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              onClick={fetchRequests}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-slate-100 transition-all"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        {/* WORKFLOW TABS */}
        <div className="flex items-center gap-2 px-8 py-3 border-b border-slate-100 bg-slate-50/50 overflow-x-auto custom-scrollbar">
          {WORKFLOW_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeTab === tab.id 
                  ? 'bg-brand-primary text-white shadow-md' 
                  : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Additional Filters */}
        <div className="px-8 py-3 bg-slate-50/50 border-b border-slate-100 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Status:</span>
            <select className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 outline-none focus:border-brand-primary" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="REQUESTED">Requested</option>
              <option value="SAMPLE_RECEIVED">Sample Received</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Urgency:</span>
            <select className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 outline-none focus:border-brand-primary" value={filterUrgency} onChange={e => setFilterUrgency(e.target.value)}>
              <option value="">All Urgencies</option>
              <option value="ROUTINE">Routine</option>
              <option value="URGENT">Urgent</option>
              <option value="STAT">STAT</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Sample Cond:</span>
            <select className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 outline-none focus:border-brand-primary" value={filterSampleCondition} onChange={e => setFilterSampleCondition(e.target.value)}>
              <option value="">All Conditions</option>
              <option value="SATISFACTORY">Satisfactory</option>
              <option value="HAEMOLYSED">Haemolysed</option>
              <option value="INSUFFICIENT">Insufficient</option>
              <option value="UNLABELLED">Unlabelled</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto pb-24">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50">
                <th className="px-6 py-4">Request & DateTime</th>
                <th className="px-6 py-4">Patient</th>
                <th className="px-6 py-4">Required Components</th>
                <th className="px-6 py-4">Urgency</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <Loader2 size={36} className="animate-spin mx-auto text-brand-primary mb-3" />
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Requests...</p>
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <Droplet size={40} className="mx-auto text-slate-300 mb-4" />
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No requests found</p>
                  </td>
                </tr>
              ) : paginatedRequests.map((req) => (
                <tr key={req.id} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-black text-slate-800">{req.request_number}</p>
                    <p className="text-[10px] font-mono text-slate-400 mt-0.5">{req.required_date} {req.required_time}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-black text-slate-800">{req.patient_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-mono font-bold text-brand-primary bg-brand-active px-2 py-0.5 rounded">MRN: {req.mrn}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {req.components?.map((c: any) => (
                      <div key={c.id} className="text-[11px] font-bold text-slate-600">
                        {c.units_requested}x {c.component}
                      </div>
                    ))}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border w-fit ${
                      req.urgency === 'URGENT' || req.urgency === 'STAT' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}>
                      {req.urgency}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border w-fit ${getStatusColor(req.request_status)}`}>
                      {req.request_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenu(activeMenu === req.id ? null : req.id);
                      }}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                      <MoreVertical size={18} />
                    </button>

                    {activeMenu === req.id && (
                      <div className="absolute right-8 top-10 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-10 animate-in fade-in slide-in-from-top-2">
                        <button
                          onClick={() => { setActionModalReq(req); setActiveMenu(null); }}
                          className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-red-600 flex items-center gap-2"
                        >
                          <Eye size={14} /> Open Actions
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filteredRequests.length > itemsPerPage && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
            <p className="text-xs font-bold text-slate-500">
              Showing <span className="text-slate-800">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
              <span className="text-slate-800">{Math.min(currentPage * itemsPerPage, filteredRequests.length)}</span> of{' '}
              <span className="text-slate-800">{filteredRequests.length}</span> entries
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 border border-slate-200 rounded-xl hover:bg-white disabled:opacity-50 transition-colors bg-slate-100 text-slate-600"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-700">
                Page {currentPage} of {totalPages || 1}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-2 border border-slate-200 rounded-xl hover:bg-white disabled:opacity-50 transition-colors bg-slate-100 text-slate-600"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Action Modal */}
      {actionModalReq && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col p-6 relative">
            <button onClick={() => setActionModalReq(null)} className="absolute top-6 right-6 p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
              <X size={20} />
            </button>
            <h3 className="text-xl font-black text-slate-800 mb-1">Request Actions</h3>
            <p className="text-xs font-bold text-slate-500 mb-6">
              {actionModalReq.request_number} • {actionModalReq.patient_name}
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              <button onClick={handleOpenDetails} className="p-6 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-3 hover:bg-brand-active hover:border-brand-primary hover:text-brand-primary transition-all group text-slate-600">
                <div className="p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform"><Eye size={24} /></div>
                <span className="font-bold text-sm">View Details</span>
              </button>
              
              <button onClick={handleOpenCreateUnit} className="p-6 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-3 hover:bg-emerald-50 hover:border-emerald-500 hover:text-emerald-600 transition-all group text-slate-600">
                <div className="p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform"><PackagePlus size={24} /></div>
                <span className="font-bold text-sm">Register Unit</span>
              </button>
              
              <button onClick={handleOpenIssueUnit} className="p-6 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-3 hover:bg-purple-50 hover:border-purple-500 hover:text-purple-600 transition-all group text-slate-600 col-span-2">
                <div className="p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform"><CheckCircle size={24} /></div>
                <span className="font-bold text-sm">Crossmatch & Issue</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Details Modal */}
      {detailsModalReq && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-4">
                <button onClick={() => { setActionModalReq(detailsModalReq); setDetailsModalReq(null); }} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <h3 className="text-lg font-black text-slate-800">Request Details</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                    {detailsModalReq.request_number}
                  </p>
                </div>
              </div>
              <button onClick={() => setDetailsModalReq(null)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
              {loadingDetails ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-brand-primary" size={32} /></div>
              ) : requestDetails ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Indication</p>
                      <p className="text-sm font-bold text-slate-800">{requestDetails.indication || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Urgency</p>
                      <p className="text-sm font-bold text-slate-800">{requestDetails.urgency}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Required</p>
                      <p className="text-sm font-bold text-slate-800">{requestDetails.required_date} {requestDetails.required_time}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Previous Tx</p>
                      <p className="text-sm font-bold text-slate-800">{requestDetails.previous_transfusion}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-black text-slate-800 mb-3 uppercase tracking-wider flex items-center gap-2">
                      <Droplet size={16} className="text-brand-primary" /> Requested Components
                    </h3>
                    <div className="space-y-2">
                      {requestDetails.components?.map((comp: any) => (
                        <div key={comp.id} className="bg-white p-3 rounded-xl border border-slate-200 flex justify-between items-center">
                          <span className="text-sm font-bold text-slate-700">{comp.component}</span>
                          <span className="text-xs font-black text-brand-primary bg-brand-active px-3 py-1 rounded-lg">
                            {comp.units_requested} Units Requested
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10"><p className="text-sm font-bold text-slate-400">Failed to load details.</p></div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Create Unit Modal */}
      {createUnitModalReq && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="absolute inset-0" onClick={() => setCreateUnitModalReq(null)} />
          <form onSubmit={handleCreateUnit} className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col p-8">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => { setActionModalReq(createUnitModalReq); setCreateUnitModalReq(null); }} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <h3 className="text-xl font-black text-slate-800">Register Blood Unit</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase">{createUnitModalReq.request_number}</p>
                </div>
              </div>
              <button type="button" onClick={() => setCreateUnitModalReq(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Donation Number</label>
                <input required type="text" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-brand-primary" value={unitForm.donation_number} onChange={e => setUnitForm({...unitForm, donation_number: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Component</label>
                  <select required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-brand-primary" value={unitForm.component} onChange={e => setUnitForm({...unitForm, component: e.target.value})}>
                    <option value="PACKED_RED_CELLS">Packed Red Cells</option>
                    <option value="WHOLE_BLOOD">Whole Blood</option>
                    <option value="PLATELETS">Platelets</option>
                    <option value="FFP">FFP</option>
                    <option value="CRYOPRECIPITATE">Cryoprecipitate</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Blood Group</label>
                  <select required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-brand-primary" value={unitForm.unit_group} onChange={e => setUnitForm({...unitForm, unit_group: e.target.value})}>
                    <option value="O POSITIVE">O Positive</option>
                    <option value="O NEGATIVE">O Negative</option>
                    <option value="A POSITIVE">A Positive</option>
                    <option value="A NEGATIVE">A Negative</option>
                    <option value="B POSITIVE">B Positive</option>
                    <option value="B NEGATIVE">B Negative</option>
                    <option value="AB POSITIVE">AB Positive</option>
                    <option value="AB NEGATIVE">AB Negative</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Volume (ml)</label>
                  <input required type="number" min="1" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-brand-primary" value={unitForm.volume_ml} onChange={e => setUnitForm({...unitForm, volume_ml: Number(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Expiry Date</label>
                  <input required type="date" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-brand-primary" value={unitForm.expiry_date} onChange={e => setUnitForm({...unitForm, expiry_date: e.target.value})} min={new Date().toISOString().split("T")[0]} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Crossmatch Result</label>
                <select required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-emerald-400" value={unitForm.crossmatch_result} onChange={e => setUnitForm({...unitForm, crossmatch_result: e.target.value})}>
                  <option value="COMPATIBLE">Compatible</option>
                  <option value="INCOMPATIBLE">Incompatible</option>
                  <option value="NOT_DONE">Not Done</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setCreateUnitModalReq(null)} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Cancel</button>
              <button type="submit" disabled={submittingUnit} className="px-5 py-2.5 text-sm font-bold text-white bg-brand-primary rounded-xl hover:bg-brand-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2">
                {submittingUnit ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Save Unit
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* Issue Unit Modal */}
      {issueUnitModalReq && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-4">
                <button onClick={() => { setActionModalReq(issueUnitModalReq); setIssueUnitModalReq(null); }} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <h3 className="text-lg font-black text-slate-800">Issue Blood Units</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                    {issueUnitModalReq.request_number}
                  </p>
                </div>
              </div>
              <button onClick={() => setIssueUnitModalReq(null)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
              {loadingDetails ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-purple-600" size={32} /></div>
              ) : requestDetails ? (
                <div className="space-y-4">
                  {requestDetails.units?.length === 0 ? (
                    <div className="text-center py-10 bg-white border border-slate-200 border-dashed rounded-2xl">
                      <PackagePlus size={40} className="mx-auto text-slate-300 mb-4" />
                      <p className="text-sm font-bold text-slate-500">No units prepared yet</p>
                      <p className="text-xs font-medium text-slate-400 mt-1">Register a unit first before issuing.</p>
                    </div>
                  ) : (
                    requestDetails.units?.map((unit: any) => (
                      <div key={unit.id} className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-purple-200 hover:shadow-sm transition-all">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-black text-slate-800">{unit.donation_number}</span>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${getUnitStatusColor(unit.issue_status || 'AVAILABLE')}`}>
                              {unit.issue_status || 'AVAILABLE'}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-slate-500">
                            {unit.component} • {unit.unit_group} • {unit.volume_ml}ml • Exp: {unit.expiry_date}
                          </p>
                          <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-50 border border-slate-100">
                            <FileCheck size={12} className={unit.crossmatch_result === 'COMPATIBLE' ? 'text-emerald-500' : 'text-red-500'} />
                            <span className={`text-[10px] font-black uppercase ${unit.crossmatch_result === 'COMPATIBLE' ? 'text-emerald-600' : 'text-red-600'}`}>
                              {unit.crossmatch_result}
                            </span>
                          </div>
                        </div>
                        
                        {(!unit.issue_status || unit.issue_status === 'AVAILABLE') && unit.crossmatch_result === 'COMPATIBLE' && (
                          <button 
                            onClick={() => handleIssueUnit(unit.id)}
                            disabled={issuingUnitId === unit.id}
                            className="bg-purple-600 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50 justify-center whitespace-nowrap"
                          >
                            {issuingUnitId === unit.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                            Issue Unit
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="text-center py-10"><p className="text-sm font-bold text-slate-400">Failed to load details.</p></div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default BloodBankIssue;


// import React, { useState, useEffect } from 'react';
// import { Search, Loader2, RefreshCw, ChevronLeft, ChevronRight, ArrowLeft, MoreVertical, Eye, Plus, CheckCircle, Droplet, PackagePlus, FileCheck, X } from 'lucide-react';
// import { bloodBankService } from '../services/bloodBank.service';
// import { useNotification } from '../context/NotificationContext';
// import { createPortal } from 'react-dom';

// const WORKFLOW_TABS = [
//   { id: 'ALL', label: 'All Requests', statuses: [] },
//   { id: 'PENDING_CROSSMATCH', label: 'Needs Crossmatch', statuses: ['SAMPLE_RECEIVED'] },
//   { id: 'READY_TO_ISSUE', label: 'Ready to Issue', statuses: ['CROSSMATCHED', 'UNIT_READY'] },
//   { id: 'IN_PROGRESS', label: 'Active Transfusions', statuses: ['ISSUED', 'IN_TRANSFUSION'] },
//   { id: 'COMPLETED', label: 'Completed', statuses: ['COMPLETED', 'STOPPED'] },
// ];

// const BloodBankIssue: React.FC = () => {
//   const { notify } = useNotification();
  
//   // Base State
//   const [requests, setRequests] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [searchQuery, setSearchQuery] = useState('');
  
//   // Dropdown Menu State
//   const [activeMenu, setActiveMenu] = useState<number | null>(null);
//   const [activeTab, setActiveTab] = useState('READY_TO_ISSUE');
  
//   // Filters
//   const [dateFrom, setDateFrom] = useState('');
//   const [dateTo, setDateTo] = useState('');
//   const [filterStatus, setFilterStatus] = useState('');
//   const [filterUrgency, setFilterUrgency] = useState('');
//   const [filterSampleCondition, setFilterSampleCondition] = useState('');
  
//   // Pagination
//   const [currentPage, setCurrentPage] = useState(1);
//   const itemsPerPage = 10;
  
//   // Modal States
//   const [actionModalReq, setActionModalReq] = useState<any | null>(null);
  
//   // Sub-modal states
//   const [detailsModalReq, setDetailsModalReq] = useState<any | null>(null);
//   const [createUnitModalReq, setCreateUnitModalReq] = useState<any | null>(null);
//   const [issueUnitModalReq, setIssueUnitModalReq] = useState<any | null>(null);
  
//   // Details fetching state
//   const [requestDetails, setRequestDetails] = useState<any | null>(null);
//   const [loadingDetails, setLoadingDetails] = useState(false);

//   // Forms
//   const [unitForm, setUnitForm] = useState({
//     donation_number: '',
//     component: 'PACKED_RED_CELLS',
//     unit_group: 'O POSITIVE',
//     volume_ml: 250,
//     expiry_date: '',
//     crossmatch_result: 'COMPATIBLE'
//   });
//   const [submittingUnit, setSubmittingUnit] = useState(false);
//   const [issuingUnitId, setIssuingUnitId] = useState<number | null>(null);

//   const fetchRequests = async () => {
//     setLoading(true);
//     try {
//       const rawRes = await bloodBankService.getRequests({
//         date_from: dateFrom || undefined,
//         date_to: dateTo || undefined,
//         request_status: filterStatus || undefined,
//         urgency: filterUrgency || undefined,
//         sample_condition: filterSampleCondition || undefined
//       });
      
//       const payload = rawRes?.data ? rawRes.data : rawRes;
//       let dataArray: any[] = [];
//       if (Array.isArray(rawRes)) dataArray = rawRes;
//       else if (Array.isArray(payload)) dataArray = payload;
//       else if (payload && Array.isArray(payload.data)) dataArray = payload.data;
//       else if (payload && Array.isArray(payload.message)) dataArray = payload.message;
//       else if (rawRes?.data?.data && Array.isArray(rawRes.data.data)) dataArray = rawRes.data.data;

//       setRequests(dataArray || []);
      
//     } catch (err: any) {
//       notify(err.response?.data?.message || err.message || 'Failed to fetch blood requests', 'error');
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchRequests();
//   }, []);

//   useEffect(() => {
//     const handleClickOutside = () => setActiveMenu(null);
//     document.addEventListener('click', handleClickOutside);
//     return () => document.removeEventListener('click', handleClickOutside);
//   }, []);

//   const fetchDetails = async (reqId: number) => {
//     setLoadingDetails(true);
//     setRequestDetails(null);
//     try {
//       const rawRes = await bloodBankService.getRequestDetails(reqId);
//       const payload = rawRes?.data ? rawRes.data : rawRes;
//       let detailsObj = null;

//       if (payload?.id && payload?.request_number) {
//           detailsObj = payload;
//       } else if (payload?.message && typeof payload.message === 'object' && payload.message.id) {
//           detailsObj = payload.message;
//       } else if (payload?.data && typeof payload.data === 'object' && !Array.isArray(payload.data) && payload.data.id) {
//           detailsObj = payload.data;
//       }

//       setRequestDetails(detailsObj);
//     } catch (err: any) {
//       notify(err.response?.data?.message || err.message || 'Failed to load details', 'error');
//     } finally {
//       setLoadingDetails(false);
//     }
//   };

//   const handleOpenDetails = () => {
//     setDetailsModalReq(actionModalReq);
//     fetchDetails(actionModalReq.id);
//     setActionModalReq(null);
//   };
  
//   const handleOpenCreateUnit = () => {
//     setCreateUnitModalReq(actionModalReq);
//     setUnitForm({
//       donation_number: '',
//       component: 'PACKED_RED_CELLS',
//       unit_group: 'O POSITIVE',
//       volume_ml: 250,
//       expiry_date: '',
//       crossmatch_result: 'COMPATIBLE'
//     });
//     setActionModalReq(null);
//   };
  
//   const handleOpenIssueUnit = () => {
//     setIssueUnitModalReq(actionModalReq);
//     fetchDetails(actionModalReq.id);
//     setActionModalReq(null);
//   };

//   const handleCreateUnit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!createUnitModalReq) return;
    
//     setSubmittingUnit(true);
//     try {
//       await bloodBankService.createUnit({
//         ...unitForm,
//         request_id: createUnitModalReq.id
//       });
//       notify('Blood unit registered successfully', 'success');
//       setCreateUnitModalReq(null);
//       fetchRequests();
//     } catch (err: any) {
//       notify(err.response?.data?.message || err.message || 'Failed to create unit', 'error');
//     } finally {
//       setSubmittingUnit(false);
//     }
//   };

//   const handleIssueUnit = async (unitId: number) => {
//     if (!issueUnitModalReq) return;
    
//     setIssuingUnitId(unitId);
//     try {
//       await bloodBankService.issueUnit({
//         unit_id: unitId,
//         request_id: issueUnitModalReq.id
//       });
//       notify('Blood unit issued successfully', 'success');
//       await fetchDetails(issueUnitModalReq.id);
//       fetchRequests(); 
//     } catch (err: any) {
//       notify(err.response?.data?.message || err.message || 'Failed to issue unit', 'error');
//     } finally {
//       setIssuingUnitId(null);
//     }
//   };

//   const safeRequests = Array.isArray(requests) ? requests : [];

//   const filteredRequests = safeRequests.filter(r => {
//     const q = searchQuery.toLowerCase();
//     const matchesSearch = (r.request_number || '').toLowerCase().includes(q) ||
//                           (r.patient_name || '').toLowerCase().includes(q) ||
//                           (r.mrn || '').toLowerCase().includes(q);
                          
//     const currentTab = WORKFLOW_TABS.find(t => t.id === activeTab);
//     const matchesTab = activeTab === 'ALL' || currentTab?.statuses.includes(r.request_status);

//     return matchesSearch && matchesTab;
//   });

//   const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
//   const paginatedRequests = filteredRequests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

//   const getStatusColor = (status: string) => {
//     switch (status?.toUpperCase()) {
//       case 'REQUESTED': return 'bg-blue-50 text-blue-700 border-blue-200';
//       case 'SAMPLE_RECEIVED': return 'bg-amber-50 text-amber-700 border-amber-200';
//       case 'COMPLETED': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
//       case 'CANCELLED': return 'bg-red-50 text-red-700 border-red-200';
//       default: return 'bg-slate-50 text-slate-700 border-slate-200';
//     }
//   };

//   const getUnitStatusColor = (status: string) => {
//     switch (status?.toUpperCase()) {
//       case 'AVAILABLE': return 'bg-emerald-100 text-emerald-700';
//       case 'ISSUED': return 'bg-purple-100 text-purple-700';
//       case 'DISCARDED':
//       case 'EXPIRED': return 'bg-red-100 text-red-700';
//       default: return 'bg-amber-100 text-amber-700';
//     }
//   };

//   return (
//     <div className="space-y-6 animate-in fade-in duration-500">
      
//       {/* Header Stats */}
//       {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//         <div className="bg-white p-5 rounded-[28px] border border-slate-200 shadow-sm flex items-center justify-between">
//           <div>
//             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Requests</p>
//             <p className="text-3xl font-black text-slate-800">{safeRequests.length}</p>
//           </div>
//           <div className="p-3 bg-red-50 text-red-600 rounded-2xl"><Droplet size={22}/></div>
//         </div>
//       </div> */}

//       {/* Main Table */}
//       <div className="bg-white rounded-[40px] border border-slate-200 overflow-hidden shadow-sm">
//         <div className="px-8 py-5 bg-white border-b border-slate-100 flex flex-col md:flex-row md:items-center gap-4 justify-between">
//           <div className="flex items-center gap-2">
//              <h3 className="text-sm font-black text-slate-700 tracking-wide">Crossmatch & Issue Management</h3>
//           </div>
//           <div className="flex flex-wrap items-center gap-3 ml-auto">
//             <div className="flex items-center gap-2">
//               <input type="date" className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-primary" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
//               <span className="text-slate-400">-</span>
//               <input type="date" className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-primary" value={dateTo} onChange={e => setDateTo(e.target.value)} />
//             </div>
//             <div className="relative w-72">
//               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
//               <input
//                 type="text"
//                 placeholder="Search requests..."
//                 className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary transition-all font-medium"
//                 value={searchQuery}
//                 onChange={(e) => setSearchQuery(e.target.value)}
//               />
//             </div>
//             <button
//               onClick={fetchRequests}
//               className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-slate-100 transition-all"
//             >
//               <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
//             </button>
//           </div>
//         </div>

//         {/* WORKFLOW TABS */}
//         <div className="flex items-center gap-2 px-8 py-3 border-b border-slate-100 bg-slate-50/50 overflow-x-auto custom-scrollbar">
//           {WORKFLOW_TABS.map(tab => (
//             <button
//               key={tab.id}
//               onClick={() => setActiveTab(tab.id)}
//               className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
//                 activeTab === tab.id 
//                   ? 'bg-brand-primary text-white shadow-md' 
//                   : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300 hover:bg-slate-50'
//               }`}
//             >
//               {tab.label}
//             </button>
//           ))}
//         </div>

//         {/* Additional Filters */}
//         <div className="px-8 py-3 bg-slate-50/50 border-b border-slate-100 flex flex-wrap items-center gap-6">
//           <div className="flex items-center gap-2">
//             <span className="text-[10px] font-bold text-slate-500 uppercase">Status:</span>
//             <select className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 outline-none focus:border-brand-primary" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
//               <option value="">All Statuses</option>
//               <option value="REQUESTED">Requested</option>
//               <option value="SAMPLE_RECEIVED">Sample Received</option>
//               <option value="COMPLETED">Completed</option>
//             </select>
//           </div>
//           <div className="flex items-center gap-2">
//             <span className="text-[10px] font-bold text-slate-500 uppercase">Urgency:</span>
//             <select className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 outline-none focus:border-brand-primary" value={filterUrgency} onChange={e => setFilterUrgency(e.target.value)}>
//               <option value="">All Urgencies</option>
//               <option value="ROUTINE">Routine</option>
//               <option value="URGENT">Urgent</option>
//               <option value="STAT">STAT</option>
//             </select>
//           </div>
//           <div className="flex items-center gap-2">
//             <span className="text-[10px] font-bold text-slate-500 uppercase">Sample Cond:</span>
//             <select className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 outline-none focus:border-brand-primary" value={filterSampleCondition} onChange={e => setFilterSampleCondition(e.target.value)}>
//               <option value="">All Conditions</option>
//               <option value="SATISFACTORY">Satisfactory</option>
//               <option value="HAEMOLYSED">Haemolysed</option>
//               <option value="INSUFFICIENT">Insufficient</option>
//               <option value="UNLABELLED">Unlabelled</option>
//             </select>
//           </div>
//         </div>

//         <div className="overflow-x-auto pb-24">
//           <table className="w-full text-left">
//             <thead>
//               <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50">
//                 <th className="px-6 py-4">Request & DateTime</th>
//                 <th className="px-6 py-4">Patient</th>
//                 <th className="px-6 py-4">Required Components</th>
//                 <th className="px-6 py-4">Urgency</th>
//                 <th className="px-6 py-4">Status</th>
//                 <th className="px-6 py-4 text-right">Actions</th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-slate-50">
//               {loading ? (
//                 <tr>
//                   <td colSpan={6} className="py-20 text-center">
//                     <Loader2 size={36} className="animate-spin mx-auto text-brand-primary mb-3" />
//                     <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Requests...</p>
//                   </td>
//                 </tr>
//               ) : filteredRequests.length === 0 ? (
//                 <tr>
//                   <td colSpan={6} className="py-20 text-center">
//                     <Droplet size={40} className="mx-auto text-slate-300 mb-4" />
//                     <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No requests found</p>
//                   </td>
//                 </tr>
//               ) : paginatedRequests.map((req) => (
//                 <tr key={req.id} className="group hover:bg-slate-50/50 transition-colors">
//                   <td className="px-6 py-4">
//                     <p className="text-sm font-black text-slate-800">{req.request_number}</p>
//                     <p className="text-[10px] font-mono text-slate-400 mt-0.5">{req.required_date} {req.required_time}</p>
//                   </td>
//                   <td className="px-6 py-4">
//                     <p className="text-sm font-black text-slate-800">{req.patient_name}</p>
//                     <div className="flex items-center gap-2 mt-0.5">
//                       <span className="text-[10px] font-mono font-bold text-brand-primary bg-brand-active px-2 py-0.5 rounded">MRN: {req.mrn}</span>
//                     </div>
//                   </td>
//                   <td className="px-6 py-4">
//                     {req.components?.map((c: any) => (
//                       <div key={c.id} className="text-[11px] font-bold text-slate-600">
//                         {c.units_requested}x {c.component}
//                       </div>
//                     ))}
//                   </td>
//                   <td className="px-6 py-4">
//                     <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border w-fit ${
//                       req.urgency === 'URGENT' || req.urgency === 'STAT' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-50 text-slate-700 border-slate-200'
//                     }`}>
//                       {req.urgency}
//                     </span>
//                   </td>
//                   <td className="px-6 py-4">
//                     <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border w-fit ${getStatusColor(req.request_status)}`}>
//                       {req.request_status}
//                     </span>
//                   </td>
//                   <td className="px-6 py-4 text-right relative">
//                     <button
//                       onClick={(e) => {
//                         e.stopPropagation();
//                         setActiveMenu(activeMenu === req.id ? null : req.id);
//                       }}
//                       className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
//                     >
//                       <MoreVertical size={18} />
//                     </button>

//                     {activeMenu === req.id && (
//                       <div className="absolute right-8 top-10 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-10 animate-in fade-in slide-in-from-top-2">
//                         <button
//                           onClick={() => { setActionModalReq(req); setActiveMenu(null); }}
//                           className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-red-600 flex items-center gap-2"
//                         >
//                           <Eye size={14} /> Open Actions
//                         </button>
//                       </div>
//                     )}
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>

//         {/* Pagination Footer */}
//         {filteredRequests.length > itemsPerPage && (
//           <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
//             <p className="text-xs font-bold text-slate-500">
//               Showing <span className="text-slate-800">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
//               <span className="text-slate-800">{Math.min(currentPage * itemsPerPage, filteredRequests.length)}</span> of{' '}
//               <span className="text-slate-800">{filteredRequests.length}</span> entries
//             </p>
//             <div className="flex items-center gap-2">
//               <button
//                 onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
//                 disabled={currentPage === 1}
//                 className="p-2 border border-slate-200 rounded-xl hover:bg-white disabled:opacity-50 transition-colors bg-slate-100 text-slate-600"
//               >
//                 <ChevronLeft size={16} />
//               </button>
//               <div className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-700">
//                 Page {currentPage} of {totalPages || 1}
//               </div>
//               <button
//                 onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
//                 disabled={currentPage === totalPages || totalPages === 0}
//                 className="p-2 border border-slate-200 rounded-xl hover:bg-white disabled:opacity-50 transition-colors bg-slate-100 text-slate-600"
//               >
//                 <ChevronRight size={16} />
//               </button>
//             </div>
//           </div>
//         )}
//       </div>

//       {/* MODALS BELOW REMAIN UNCHANGED */}
//       {actionModalReq && createPortal(
//         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
//           <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col p-6 relative">
//             <button onClick={() => setActionModalReq(null)} className="absolute top-6 right-6 p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
//               <X size={20} />
//             </button>
//             <h3 className="text-xl font-black text-slate-800 mb-1">Request Actions</h3>
//             <p className="text-xs font-bold text-slate-500 mb-6">{actionModalReq.request_number} • {actionModalReq.patient_name}</p>
            
//             <div className="grid grid-cols-2 gap-4">
//               <button onClick={handleOpenDetails} className="p-6 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-3 hover:bg-brand-active hover:border-brand-primary hover:text-brand-primary transition-all group text-slate-600">
//                 <div className="p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform"><Eye size={24} /></div>
//                 <span className="font-bold text-sm">View Details</span>
//               </button>
              
//               <button onClick={handleOpenCreateUnit} className="p-6 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-3 hover:bg-emerald-50 hover:border-emerald-500 hover:text-emerald-600 transition-all group text-slate-600">
//                 <div className="p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform"><PackagePlus size={24} /></div>
//                 <span className="font-bold text-sm">Register Unit</span>
//               </button>
              
//               <button onClick={handleOpenIssueUnit} className="p-6 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-3 hover:bg-purple-50 hover:border-purple-500 hover:text-purple-600 transition-all group text-slate-600 col-span-2">
//                 <div className="p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform"><CheckCircle size={24} /></div>
//                 <span className="font-bold text-sm">Crossmatch & Issue</span>
//               </button>
//             </div>
//           </div>
//         </div>,
//         document.body
//       )}

//       {detailsModalReq && createPortal(
//         <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
//           <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
//             <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
//               <div className="flex items-center gap-4">
//                 <button onClick={() => { setActionModalReq(detailsModalReq); setDetailsModalReq(null); }} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
//                   <ArrowLeft size={20} />
//                 </button>
//                 <div>
//                   <h3 className="text-lg font-black text-slate-800">Request Details</h3>
//                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
//                     {detailsModalReq.request_number}
//                   </p>
//                 </div>
//               </div>
//               <button onClick={() => setDetailsModalReq(null)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
//                 <X size={20} />
//               </button>
//             </div>
//             <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
//               {loadingDetails ? (
//                 <div className="flex justify-center py-20"><Loader2 className="animate-spin text-brand-primary" size={32} /></div>
//               ) : requestDetails ? (
//                 <div className="space-y-6">
//                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
//                     <div>
//                       <p className="text-[10px] font-bold text-slate-400 uppercase">Indication</p>
//                       <p className="text-sm font-bold text-slate-800">{requestDetails.indication || 'N/A'}</p>
//                     </div>
//                     <div>
//                       <p className="text-[10px] font-bold text-slate-400 uppercase">Urgency</p>
//                       <p className="text-sm font-bold text-slate-800">{requestDetails.urgency}</p>
//                     </div>
//                     <div>
//                       <p className="text-[10px] font-bold text-slate-400 uppercase">Required</p>
//                       <p className="text-sm font-bold text-slate-800">{requestDetails.required_date} {requestDetails.required_time}</p>
//                     </div>
//                     <div>
//                       <p className="text-[10px] font-bold text-slate-400 uppercase">Previous Tx</p>
//                       <p className="text-sm font-bold text-slate-800">{requestDetails.previous_transfusion}</p>
//                     </div>
//                   </div>

//                   <div>
//                     <h3 className="text-sm font-black text-slate-800 mb-3 uppercase tracking-wider flex items-center gap-2">
//                       <Droplet size={16} className="text-brand-primary" /> Requested Components
//                     </h3>
//                     <div className="space-y-2">
//                       {requestDetails.components?.map((comp: any) => (
//                         <div key={comp.id} className="bg-white p-3 rounded-xl border border-slate-200 flex justify-between items-center">
//                           <span className="text-sm font-bold text-slate-700">{comp.component}</span>
//                           <span className="text-xs font-black text-brand-primary bg-brand-active px-3 py-1 rounded-lg">
//                             {comp.units_requested} Units Requested
//                           </span>
//                         </div>
//                       ))}
//                     </div>
//                   </div>
//                 </div>
//               ) : (
//                 <div className="text-center py-10"><p className="text-sm font-bold text-slate-400">Failed to load details.</p></div>
//               )}
//             </div>
//           </div>
//         </div>,
//         document.body
//       )}

//       {createUnitModalReq && createPortal(
//         <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
//           <div className="absolute inset-0" onClick={() => setCreateUnitModalReq(null)} />
//           <form onSubmit={handleCreateUnit} className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col p-8">
//             <div className="flex justify-between items-center mb-6">
//               <div className="flex items-center gap-3">
//                 <button type="button" onClick={() => { setActionModalReq(createUnitModalReq); setCreateUnitModalReq(null); }} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
//                   <ArrowLeft size={20} />
//                 </button>
//                 <div>
//                   <h3 className="text-xl font-black text-slate-800">Register Blood Unit</h3>
//                   <p className="text-xs font-bold text-slate-400 uppercase">{createUnitModalReq.request_number}</p>
//                 </div>
//               </div>
//               <button type="button" onClick={() => setCreateUnitModalReq(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full"><X size={20} /></button>
//             </div>

//             <div className="space-y-4">
//               <div className="space-y-1">
//                 <label className="text-[10px] font-bold text-slate-500 uppercase">Donation Number</label>
//                 <input required type="text" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-brand-primary" value={unitForm.donation_number} onChange={e => setUnitForm({...unitForm, donation_number: e.target.value})} />
//               </div>
//               <div className="grid grid-cols-2 gap-4">
//                 <div className="space-y-1">
//                   <label className="text-[10px] font-bold text-slate-500 uppercase">Component</label>
//                   <select required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-brand-primary" value={unitForm.component} onChange={e => setUnitForm({...unitForm, component: e.target.value})}>
//                     <option value="PACKED_RED_CELLS">Packed Red Cells</option>
//                     <option value="WHOLE_BLOOD">Whole Blood</option>
//                     <option value="PLATELETS">Platelets</option>
//                     <option value="FFP">FFP</option>
//                     <option value="CRYOPRECIPITATE">Cryoprecipitate</option>
//                   </select>
//                 </div>
//                 <div className="space-y-1">
//                   <label className="text-[10px] font-bold text-slate-500 uppercase">Blood Group</label>
//                   <select required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-brand-primary" value={unitForm.unit_group} onChange={e => setUnitForm({...unitForm, unit_group: e.target.value})}>
//                     <option value="O POSITIVE">O Positive</option>
//                     <option value="O NEGATIVE">O Negative</option>
//                     <option value="A POSITIVE">A Positive</option>
//                     <option value="A NEGATIVE">A Negative</option>
//                     <option value="B POSITIVE">B Positive</option>
//                     <option value="B NEGATIVE">B Negative</option>
//                     <option value="AB POSITIVE">AB Positive</option>
//                     <option value="AB NEGATIVE">AB Negative</option>
//                   </select>
//                 </div>
//                 <div className="space-y-1">
//                   <label className="text-[10px] font-bold text-slate-500 uppercase">Volume (ml)</label>
//                   <input required type="number" min="1" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-brand-primary" value={unitForm.volume_ml} onChange={e => setUnitForm({...unitForm, volume_ml: Number(e.target.value)})} />
//                 </div>
//                 <div className="space-y-1">
//                   <label className="text-[10px] font-bold text-slate-500 uppercase">Expiry Date</label>
//                   <input required type="date" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-brand-primary" value={unitForm.expiry_date} onChange={e => setUnitForm({...unitForm, expiry_date: e.target.value})} min={new Date().toISOString().split("T")[0]} />
//                 </div>
//               </div>
//               <div className="space-y-1">
//                 <label className="text-[10px] font-bold text-slate-500 uppercase">Crossmatch Result</label>
//                 <select required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-emerald-400" value={unitForm.crossmatch_result} onChange={e => setUnitForm({...unitForm, crossmatch_result: e.target.value})}>
//                   <option value="COMPATIBLE">Compatible</option>
//                   <option value="INCOMPATIBLE">Incompatible</option>
//                   <option value="NOT_DONE">Not Done</option>
//                 </select>
//               </div>
//             </div>
            
//             <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-100">
//               <button type="button" onClick={() => setCreateUnitModalReq(null)} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Cancel</button>
//               <button type="submit" disabled={submittingUnit} className="px-5 py-2.5 text-sm font-bold text-white bg-brand-primary rounded-xl hover:bg-brand-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2">
//                 {submittingUnit ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Save Unit
//               </button>
//             </div>
//           </form>
//         </div>,
//         document.body
//       )}

//       {issueUnitModalReq && createPortal(
//         <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
//           <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
//             <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
//               <div className="flex items-center gap-4">
//                 <button onClick={() => { setActionModalReq(issueUnitModalReq); setIssueUnitModalReq(null); }} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
//                   <ArrowLeft size={20} />
//                 </button>
//                 <div>
//                   <h3 className="text-lg font-black text-slate-800">Issue Blood Units</h3>
//                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
//                     {issueUnitModalReq.request_number}
//                   </p>
//                 </div>
//               </div>
//               <button onClick={() => setIssueUnitModalReq(null)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
//                 <X size={20} />
//               </button>
//             </div>
            
//             <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
//               {loadingDetails ? (
//                 <div className="flex justify-center py-20"><Loader2 className="animate-spin text-purple-600" size={32} /></div>
//               ) : requestDetails ? (
//                 <div className="space-y-4">
//                   {requestDetails.units?.length === 0 ? (
//                     <div className="text-center py-10 bg-white border border-slate-200 border-dashed rounded-2xl">
//                       <PackagePlus size={40} className="mx-auto text-slate-300 mb-4" />
//                       <p className="text-sm font-bold text-slate-500">No units prepared yet</p>
//                       <p className="text-xs font-medium text-slate-400 mt-1">Register a unit first before issuing.</p>
//                     </div>
//                   ) : (
//                     requestDetails.units?.map((unit: any) => (
//                       <div key={unit.id} className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-purple-200 hover:shadow-sm transition-all">
//                         <div>
//                           <div className="flex items-center gap-2 mb-1">
//                             <span className="text-sm font-black text-slate-800">{unit.donation_number}</span>
//                             <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${getUnitStatusColor(unit.issue_status || 'AVAILABLE')}`}>
//                               {unit.issue_status || 'AVAILABLE'}
//                             </span>
//                           </div>
//                           <p className="text-xs font-bold text-slate-500">
//                             {unit.component} • {unit.unit_group} • {unit.volume_ml}ml • Exp: {unit.expiry_date}
//                           </p>
//                           <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-50 border border-slate-100">
//                             <FileCheck size={12} className={unit.crossmatch_result === 'COMPATIBLE' ? 'text-emerald-500' : 'text-red-500'} />
//                             <span className={`text-[10px] font-black uppercase ${unit.crossmatch_result === 'COMPATIBLE' ? 'text-emerald-600' : 'text-red-600'}`}>
//                               {unit.crossmatch_result}
//                             </span>
//                           </div>
//                         </div>
                        
//                         {(!unit.issue_status || unit.issue_status === 'AVAILABLE') && unit.crossmatch_result === 'COMPATIBLE' && (
//                           <button 
//                             onClick={() => handleIssueUnit(unit.id)}
//                             disabled={issuingUnitId === unit.id}
//                             className="bg-purple-600 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50 justify-center whitespace-nowrap"
//                           >
//                             {issuingUnitId === unit.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
//                             Issue Unit
//                           </button>
//                         )}
//                       </div>
//                     ))
//                   )}
//                 </div>
//               ) : (
//                 <div className="text-center py-10"><p className="text-sm font-bold text-slate-400">Failed to load details.</p></div>
//               )}
//             </div>
//           </div>
//         </div>,
//         document.body
//       )}

//     </div>
//   );
// };

// export default BloodBankIssue;



// import React, { useState, useEffect } from 'react';
// import {
//   Search, Loader2, RefreshCw, ChevronLeft, ChevronRight, ArrowLeft,
//   MoreVertical, Eye, Plus, CheckCircle, Droplet, PackagePlus, FileCheck, X
// } from 'lucide-react';
// import { bloodBankService } from '../services/bloodBank.service';
// import { useNotification } from '../context/NotificationContext';
// import { createPortal } from 'react-dom';

// const BloodBankIssue: React.FC = () => {
//   const { notify } = useNotification();
  
//   // Base State
//   const [requests, setRequests] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [searchQuery, setSearchQuery] = useState('');
  
//   // Dropdown Menu State
//   const [activeMenu, setActiveMenu] = useState<number | null>(null);
  
//   // Filters
//   const [dateFrom, setDateFrom] = useState('');
//   const [dateTo, setDateTo] = useState('');
//   const [filterStatus, setFilterStatus] = useState('');
//   const [filterUrgency, setFilterUrgency] = useState('');
//   const [filterSampleCondition, setFilterSampleCondition] = useState('');
  
//   // Pagination
//   const [currentPage, setCurrentPage] = useState(1);
//   const itemsPerPage = 10;
  
//   // Modal States
//   const [actionModalReq, setActionModalReq] = useState<any | null>(null);
  
//   // Sub-modal states
//   const [detailsModalReq, setDetailsModalReq] = useState<any | null>(null);
//   const [createUnitModalReq, setCreateUnitModalReq] = useState<any | null>(null);
//   const [issueUnitModalReq, setIssueUnitModalReq] = useState<any | null>(null);
  
//   // Details fetching state
//   const [requestDetails, setRequestDetails] = useState<any | null>(null);
//   const [loadingDetails, setLoadingDetails] = useState(false);

//   // Forms
//   const [unitForm, setUnitForm] = useState({
//     donation_number: '',
//     component: 'PACKED_RED_CELLS',
//     unit_group: 'O POSITIVE',
//     volume_ml: 250,
//     expiry_date: '',
//     crossmatch_result: 'COMPATIBLE'
//   });
//   const [submittingUnit, setSubmittingUnit] = useState(false);
//   const [issuingUnitId, setIssuingUnitId] = useState<number | null>(null);

//   const fetchRequests = async () => {
//     setLoading(true);
//     try {
//       const rawRes = await bloodBankService.getRequests({
//         date_from: dateFrom || undefined,
//         date_to: dateTo || undefined,
//         request_status: filterStatus || undefined,
//         urgency: filterUrgency || undefined,
//         sample_condition: filterSampleCondition || undefined
//       });
      
//       // HYPER-RESILIENT ARRAY EXTRACTOR
//       const payload = rawRes?.data ? rawRes.data : rawRes;
      
//       let dataArray: any[] = [];
//       if (Array.isArray(rawRes)) dataArray = rawRes;
//       else if (Array.isArray(payload)) dataArray = payload;
//       else if (payload && Array.isArray(payload.data)) dataArray = payload.data;
//       else if (payload && Array.isArray(payload.message)) dataArray = payload.message;
//       else if (rawRes?.data?.data && Array.isArray(rawRes.data.data)) dataArray = rawRes.data.data;

//       // Fallback to empty array to ensure .filter() never crashes again
//       setRequests(dataArray || []);
      
//     } catch (err: any) {
//       notify(err.response?.data?.message || err.message || 'Failed to fetch blood requests', 'error');
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchRequests();
//   }, []);

//   // Close dropdown menu when clicking outside
//   useEffect(() => {
//     const handleClickOutside = () => setActiveMenu(null);
//     document.addEventListener('click', handleClickOutside);
//     return () => document.removeEventListener('click', handleClickOutside);
//   }, []);

//   const fetchDetails = async (reqId: number) => {
//     setLoadingDetails(true);
//     setRequestDetails(null);
//     try {
//       const rawRes = await bloodBankService.getRequestDetails(reqId);
      
//       // HYPER-RESILIENT OBJECT EXTRACTOR
//       const payload = rawRes?.data ? rawRes.data : rawRes;
//       let detailsObj = null;

//       // Ensure we grab the actual Object containing the ID, not an empty array []
//       if (payload?.id && payload?.request_number) {
//           detailsObj = payload;
//       } else if (payload?.message && typeof payload.message === 'object' && payload.message.id) {
//           detailsObj = payload.message;
//       } else if (payload?.data && typeof payload.data === 'object' && !Array.isArray(payload.data) && payload.data.id) {
//           detailsObj = payload.data;
//       }

//       setRequestDetails(detailsObj);
      
//     } catch (err: any) {
//       notify(err.response?.data?.message || err.message || 'Failed to load details', 'error');
//     } finally {
//       setLoadingDetails(false);
//     }
//   };

//   const handleOpenDetails = () => {
//     setDetailsModalReq(actionModalReq);
//     fetchDetails(actionModalReq.id);
//     setActionModalReq(null);
//   };
  
//   const handleOpenCreateUnit = () => {
//     setCreateUnitModalReq(actionModalReq);
//     setUnitForm({
//       donation_number: '',
//       component: 'PACKED_RED_CELLS',
//       unit_group: 'O POSITIVE',
//       volume_ml: 250,
//       expiry_date: '',
//       crossmatch_result: 'COMPATIBLE'
//     });
//     setActionModalReq(null);
//   };
  
//   const handleOpenIssueUnit = () => {
//     setIssueUnitModalReq(actionModalReq);
//     fetchDetails(actionModalReq.id);
//     setActionModalReq(null);
//   };

//   const handleCreateUnit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!createUnitModalReq) return;
    
//     setSubmittingUnit(true);
//     try {
//       await bloodBankService.createUnit({
//         ...unitForm,
//         request_id: createUnitModalReq.id
//       });
//       notify('Blood unit registered successfully', 'success');
//       setCreateUnitModalReq(null);
//       fetchRequests();
//     } catch (err: any) {
//       notify(err.response?.data?.message || err.message || 'Failed to create unit', 'error');
//     } finally {
//       setSubmittingUnit(false);
//     }
//   };

//   const handleIssueUnit = async (unitId: number) => {
//     if (!issueUnitModalReq) return;
    
//     setIssuingUnitId(unitId);
//     try {
//       await bloodBankService.issueUnit({
//         unit_id: unitId,
//         request_id: issueUnitModalReq.id
//       });
//       notify('Blood unit issued successfully', 'success');
//       await fetchDetails(issueUnitModalReq.id);
//       fetchRequests(); 
//     } catch (err: any) {
//       notify(err.response?.data?.message || err.message || 'Failed to issue unit', 'error');
//     } finally {
//       setIssuingUnitId(null);
//     }
//   };

//   const safeRequests = Array.isArray(requests) ? requests : [];

//   const filteredRequests = safeRequests.filter(r => {
//     const q = searchQuery.toLowerCase();
//     return (
//       (r.request_number || '').toLowerCase().includes(q) ||
//       (r.patient_name || '').toLowerCase().includes(q) ||
//       (r.mrn || '').toLowerCase().includes(q)
//     );
//   });

//   const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
//   const paginatedRequests = filteredRequests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

//   // Helper for Request Statuses (REQUESTED, SAMPLE_RECEIVED, COMPLETED)
//   const getStatusColor = (status) => {
//     switch (status?.toUpperCase()) {
//       case 'REQUESTED':
//         return 'bg-blue-50 text-blue-700 border-blue-200';
//       case 'SAMPLE_RECEIVED':
//         return 'bg-amber-50 text-amber-700 border-amber-200';
//       case 'COMPLETED':
//         return 'bg-emerald-50 text-emerald-700 border-emerald-200';
//       case 'CANCELLED':
//         return 'bg-red-50 text-red-700 border-red-200';
//       default:
//         return 'bg-slate-50 text-slate-700 border-slate-200';
//     }
//   };

//   // Helper for Unit Statuses (AVAILABLE, ISSUED, etc.)
//   const getUnitStatusColor = (status) => {
//     switch (status?.toUpperCase()) {
//       case 'AVAILABLE':
//         return 'bg-emerald-100 text-emerald-700';
//       case 'ISSUED':
//         return 'bg-purple-100 text-purple-700';
//       case 'DISCARDED':
//       case 'EXPIRED':
//         return 'bg-red-100 text-red-700';
//       default:
//         return 'bg-amber-100 text-amber-700';
//     }
//   };

//   return (
//     <div className="space-y-6 animate-in fade-in duration-500">
      
//       {/* Header Stats */}
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//         <div className="bg-white p-5 rounded-[28px] border border-slate-200 shadow-sm flex items-center justify-between">
//           <div>
//             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Requests</p>
//             <p className="text-3xl font-black text-slate-800">{safeRequests.length}</p>
//           </div>
//           <div className="p-3 bg-red-50 text-red-600 rounded-2xl"><Droplet size={22}/></div>
//         </div>
//       </div>

//       {/* Main Table */}
//       <div className="bg-white rounded-[40px] border border-slate-200 overflow-hidden shadow-sm">
//         <div className="px-8 py-5 bg-white border-b border-slate-100 flex flex-col md:flex-row md:items-center gap-4 justify-between">
//           <div className="flex items-center gap-2">
//              <h3 className="text-sm font-black text-slate-700 tracking-wide">Crossmatch & Issue Management</h3>
//           </div>
//           <div className="flex flex-wrap items-center gap-3 ml-auto">
//             <div className="flex items-center gap-2">
//               <input type="date" className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-primary" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
//               <span className="text-slate-400">-</span>
//               <input type="date" className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-primary" value={dateTo} onChange={e => setDateTo(e.target.value)} />
//             </div>
//             <div className="relative w-72">
//               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
//               <input
//                 type="text"
//                 placeholder="Search requests..."
//                 className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary transition-all font-medium"
//                 value={searchQuery}
//                 onChange={(e) => setSearchQuery(e.target.value)}
//               />
//             </div>
//             <button
//               onClick={fetchRequests}
//               className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-slate-100 transition-all"
//             >
//               <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
//             </button>
//           </div>
//         </div>

//         {/* Additional Filters */}
//         <div className="px-8 py-3 bg-slate-50/50 border-b border-slate-100 flex flex-wrap items-center gap-6">
//           <div className="flex items-center gap-2">
//             <span className="text-[10px] font-bold text-slate-500 uppercase">Status:</span>
//             <select className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 outline-none focus:border-brand-primary" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
//               <option value="">All Statuses</option>
//               <option value="REQUESTED">Requested</option>
//               <option value="SAMPLE_RECEIVED">Sample Received</option>
//               <option value="COMPLETED">Completed</option>
//             </select>
//           </div>
//           <div className="flex items-center gap-2">
//             <span className="text-[10px] font-bold text-slate-500 uppercase">Urgency:</span>
//             <select className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 outline-none focus:border-brand-primary" value={filterUrgency} onChange={e => setFilterUrgency(e.target.value)}>
//               <option value="">All Urgencies</option>
//               <option value="ROUTINE">Routine</option>
//               <option value="URGENT">Urgent</option>
//               <option value="STAT">STAT</option>
//             </select>
//           </div>
//           <div className="flex items-center gap-2">
//             <span className="text-[10px] font-bold text-slate-500 uppercase">Sample Cond:</span>
//             <select className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 outline-none focus:border-brand-primary" value={filterSampleCondition} onChange={e => setFilterSampleCondition(e.target.value)}>
//               <option value="">All Conditions</option>
//               <option value="SATISFACTORY">Satisfactory</option>
//               <option value="HAEMOLYSED">Haemolysed</option>
//               <option value="INSUFFICIENT">Insufficient</option>
//               <option value="UNLABELLED">Unlabelled</option>
//             </select>
//           </div>
//         </div>

//         <div className="overflow-x-auto pb-24">
//           <table className="w-full text-left">
//             <thead>
//               <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50">
//                 <th className="px-6 py-4">Request & DateTime</th>
//                 <th className="px-6 py-4">Patient</th>
//                 <th className="px-6 py-4">Required Components</th>
//                 <th className="px-6 py-4">Urgency</th>
//                 <th className="px-6 py-4">Status</th>
//                 <th className="px-6 py-4 text-right">Actions</th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-slate-50">
//               {loading ? (
//                 <tr>
//                   <td colSpan={6} className="py-20 text-center">
//                     <Loader2 size={36} className="animate-spin mx-auto text-brand-primary mb-3" />
//                     <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Requests...</p>
//                   </td>
//                 </tr>
//               ) : filteredRequests.length === 0 ? (
//                 <tr>
//                   <td colSpan={6} className="py-20 text-center">
//                     <Droplet size={40} className="mx-auto text-slate-300 mb-4" />
//                     <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No requests found</p>
//                   </td>
//                 </tr>
//               ) : paginatedRequests.map((req) => (
//                 <tr key={req.id} className="group hover:bg-slate-50/50 transition-colors">
//                   <td className="px-6 py-4">
//                     <p className="text-sm font-black text-slate-800">{req.request_number}</p>
//                     <p className="text-[10px] font-mono text-slate-400 mt-0.5">{req.required_date} {req.required_time}</p>
//                   </td>
//                   <td className="px-6 py-4">
//                     <p className="text-sm font-black text-slate-800">{req.patient_name}</p>
//                     <div className="flex items-center gap-2 mt-0.5">
//                       <span className="text-[10px] font-mono font-bold text-brand-primary bg-brand-active px-2 py-0.5 rounded">MRN: {req.mrn}</span>
//                     </div>
//                   </td>
//                   <td className="px-6 py-4">
//                     {req.components?.map((c: any) => (
//                       <div key={c.id} className="text-[11px] font-bold text-slate-600">
//                         {c.units_requested}x {c.component}
//                       </div>
//                     ))}
//                   </td>
//                   <td className="px-6 py-4">
//                     <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border w-fit ${
//                       req.urgency === 'URGENT' || req.urgency === 'STAT' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-50 text-slate-700 border-slate-200'
//                     }`}>
//                       {req.urgency}
//                     </span>
//                   </td>
//                   <td className="px-6 py-4">
//                     <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border w-fit ${getStatusColor(req.request_status)}`}>
//                       {req.request_status}
//                     </span>
//                   </td>
//                   <td className="px-6 py-4 text-right relative">
//                     <button
//                       onClick={(e) => {
//                         e.stopPropagation();
//                         setActiveMenu(activeMenu === req.id ? null : req.id);
//                       }}
//                       className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
//                     >
//                       <MoreVertical size={18} />
//                     </button>

//                     {activeMenu === req.id && (
//                       <div className="absolute right-8 top-10 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-10 animate-in fade-in slide-in-from-top-2">
//                         <button
//                           onClick={() => { setActionModalReq(req); setActiveMenu(null); }}
//                           className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-red-600 flex items-center gap-2"
//                         >
//                           <Eye size={14} /> Open Actions
//                         </button>
//                       </div>
//                     )}
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>

//         {/* Pagination Footer */}
//         {filteredRequests.length > itemsPerPage && (
//           <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
//             <p className="text-xs font-bold text-slate-500">
//               Showing <span className="text-slate-800">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
//               <span className="text-slate-800">{Math.min(currentPage * itemsPerPage, filteredRequests.length)}</span> of{' '}
//               <span className="text-slate-800">{filteredRequests.length}</span> entries
//             </p>
//             <div className="flex items-center gap-2">
//               <button
//                 onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
//                 disabled={currentPage === 1}
//                 className="p-2 border border-slate-200 rounded-xl hover:bg-white disabled:opacity-50 transition-colors bg-slate-100 text-slate-600"
//               >
//                 <ChevronLeft size={16} />
//               </button>
//               <div className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-700">
//                 Page {currentPage} of {totalPages || 1}
//               </div>
//               <button
//                 onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
//                 disabled={currentPage === totalPages || totalPages === 0}
//                 className="p-2 border border-slate-200 rounded-xl hover:bg-white disabled:opacity-50 transition-colors bg-slate-100 text-slate-600"
//               >
//                 <ChevronRight size={16} />
//               </button>
//             </div>
//           </div>
//         )}
//       </div>

//       {/* CENTRAL ACTION MODAL */}
//       {actionModalReq && createPortal(
//         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
//           <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col p-6 relative">
//             <button onClick={() => setActionModalReq(null)} className="absolute top-6 right-6 p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
//               <X size={20} />
//             </button>
//             <h3 className="text-xl font-black text-slate-800 mb-1">Request Actions</h3>
//             <p className="text-xs font-bold text-slate-500 mb-6">{actionModalReq.request_number} • {actionModalReq.patient_name}</p>
            
//             <div className="grid grid-cols-2 gap-4">
//               <button onClick={handleOpenDetails} className="p-6 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-3 hover:bg-brand-active hover:border-brand-primary hover:text-brand-primary transition-all group text-slate-600">
//                 <div className="p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform"><Eye size={24} /></div>
//                 <span className="font-bold text-sm">View Details</span>
//               </button>
              
//               <button onClick={handleOpenCreateUnit} className="p-6 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-3 hover:bg-emerald-50 hover:border-emerald-500 hover:text-emerald-600 transition-all group text-slate-600">
//                 <div className="p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform"><PackagePlus size={24} /></div>
//                 <span className="font-bold text-sm">Register Unit</span>
//               </button>
              
//               <button onClick={handleOpenIssueUnit} className="p-6 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-3 hover:bg-purple-50 hover:border-purple-500 hover:text-purple-600 transition-all group text-slate-600 col-span-2">
//                 <div className="p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform"><CheckCircle size={24} /></div>
//                 <span className="font-bold text-sm">Crossmatch & Issue</span>
//               </button>
//             </div>
//           </div>
//         </div>,
//         document.body
//       )}

//       {/* DETAILS SUB-MODAL */}
//       {detailsModalReq && createPortal(
//         <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
//           <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
//             <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
//               <div className="flex items-center gap-4">
//                 <button onClick={() => { setActionModalReq(detailsModalReq); setDetailsModalReq(null); }} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
//                   <ArrowLeft size={20} />
//                 </button>
//                 <div>
//                   <h3 className="text-lg font-black text-slate-800">Request Details</h3>
//                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
//                     {detailsModalReq.request_number}
//                   </p>
//                 </div>
//               </div>
//               <button onClick={() => setDetailsModalReq(null)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
//                 <X size={20} />
//               </button>
//             </div>
//             <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
//               {loadingDetails ? (
//                 <div className="flex justify-center py-20"><Loader2 className="animate-spin text-brand-primary" size={32} /></div>
//               ) : requestDetails ? (
//                 <div className="space-y-6">
//                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
//                     <div>
//                       <p className="text-[10px] font-bold text-slate-400 uppercase">Indication</p>
//                       <p className="text-sm font-bold text-slate-800">{requestDetails.indication || 'N/A'}</p>
//                     </div>
//                     <div>
//                       <p className="text-[10px] font-bold text-slate-400 uppercase">Urgency</p>
//                       <p className="text-sm font-bold text-slate-800">{requestDetails.urgency}</p>
//                     </div>
//                     <div>
//                       <p className="text-[10px] font-bold text-slate-400 uppercase">Required</p>
//                       <p className="text-sm font-bold text-slate-800">{requestDetails.required_date} {requestDetails.required_time}</p>
//                     </div>
//                     <div>
//                       <p className="text-[10px] font-bold text-slate-400 uppercase">Previous Tx</p>
//                       <p className="text-sm font-bold text-slate-800">{requestDetails.previous_transfusion}</p>
//                     </div>
//                   </div>

//                   <div>
//                     <h3 className="text-sm font-black text-slate-800 mb-3 uppercase tracking-wider flex items-center gap-2">
//                       <Droplet size={16} className="text-brand-primary" /> Requested Components
//                     </h3>
//                     <div className="space-y-2">
//                       {requestDetails.components?.map((comp: any) => (
//                         <div key={comp.id} className="bg-white p-3 rounded-xl border border-slate-200 flex justify-between items-center">
//                           <span className="text-sm font-bold text-slate-700">{comp.component}</span>
//                           <span className="text-xs font-black text-brand-primary bg-brand-active px-3 py-1 rounded-lg">
//                             {comp.units_requested} Units Requested
//                           </span>
//                         </div>
//                       ))}
//                     </div>
//                   </div>
//                 </div>
//               ) : (
//                 <div className="text-center py-10"><p className="text-sm font-bold text-slate-400">Failed to load details.</p></div>
//               )}
//             </div>
//           </div>
//         </div>,
//         document.body
//       )}

//       {/* CREATE UNIT SUB-MODAL */}
//       {createUnitModalReq && createPortal(
//         <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
//           <div className="absolute inset-0" onClick={() => setCreateUnitModalReq(null)} />
//           <form onSubmit={handleCreateUnit} className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col p-8">
//             <div className="flex justify-between items-center mb-6">
//               <div className="flex items-center gap-3">
//                 <button type="button" onClick={() => { setActionModalReq(createUnitModalReq); setCreateUnitModalReq(null); }} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
//                   <ArrowLeft size={20} />
//                 </button>
//                 <div>
//                   <h3 className="text-xl font-black text-slate-800">Register Blood Unit</h3>
//                   <p className="text-xs font-bold text-slate-400 uppercase">{createUnitModalReq.request_number}</p>
//                 </div>
//               </div>
//               <button type="button" onClick={() => setCreateUnitModalReq(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full"><X size={20} /></button>
//             </div>

//             <div className="space-y-4">
//               <div className="space-y-1">
//                 <label className="text-[10px] font-bold text-slate-500 uppercase">Donation Number</label>
//                 <input required type="text" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-brand-primary" value={unitForm.donation_number} onChange={e => setUnitForm({...unitForm, donation_number: e.target.value})} />
//               </div>
//               <div className="grid grid-cols-2 gap-4">
//                 <div className="space-y-1">
//                   <label className="text-[10px] font-bold text-slate-500 uppercase">Component</label>
//                   <select required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-brand-primary" value={unitForm.component} onChange={e => setUnitForm({...unitForm, component: e.target.value})}>
//                     <option value="PACKED_RED_CELLS">Packed Red Cells</option>
//                     <option value="WHOLE_BLOOD">Whole Blood</option>
//                     <option value="PLATELETS">Platelets</option>
//                     <option value="FFP">FFP</option>
//                     <option value="CRYOPRECIPITATE">Cryoprecipitate</option>
//                   </select>
//                 </div>
//                 <div className="space-y-1">
//                   <label className="text-[10px] font-bold text-slate-500 uppercase">Blood Group</label>
//                   <select required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-brand-primary" value={unitForm.unit_group} onChange={e => setUnitForm({...unitForm, unit_group: e.target.value})}>
//                     <option value="O POSITIVE">O Positive</option>
//                     <option value="O NEGATIVE">O Negative</option>
//                     <option value="A POSITIVE">A Positive</option>
//                     <option value="A NEGATIVE">A Negative</option>
//                     <option value="B POSITIVE">B Positive</option>
//                     <option value="B NEGATIVE">B Negative</option>
//                     <option value="AB POSITIVE">AB Positive</option>
//                     <option value="AB NEGATIVE">AB Negative</option>
//                   </select>
//                 </div>
//                 <div className="space-y-1">
//                   <label className="text-[10px] font-bold text-slate-500 uppercase">Volume (ml)</label>
//                   <input required type="number" min="1" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-brand-primary" value={unitForm.volume_ml} onChange={e => setUnitForm({...unitForm, volume_ml: Number(e.target.value)})} />
//                 </div>
//                 <div className="space-y-1">
//                   <label className="text-[10px] font-bold text-slate-500 uppercase">Expiry Date</label>
//                   <input required type="date" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-brand-primary" value={unitForm.expiry_date} onChange={e => setUnitForm({...unitForm, expiry_date: e.target.value})} min={new Date().toISOString().split("T")[0]} />
//                 </div>
//               </div>
//               <div className="space-y-1">
//                 <label className="text-[10px] font-bold text-slate-500 uppercase">Crossmatch Result</label>
//                 <select required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-emerald-400" value={unitForm.crossmatch_result} onChange={e => setUnitForm({...unitForm, crossmatch_result: e.target.value})}>
//                   <option value="COMPATIBLE">Compatible</option>
//                   <option value="INCOMPATIBLE">Incompatible</option>
//                   <option value="NOT_DONE">Not Done</option>
//                 </select>
//               </div>
//             </div>
            
//             <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-100">
//               <button type="button" onClick={() => setCreateUnitModalReq(null)} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Cancel</button>
//               <button type="submit" disabled={submittingUnit} className="px-5 py-2.5 text-sm font-bold text-white bg-brand-primary rounded-xl hover:bg-brand-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2">
//                 {submittingUnit ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Save Unit
//               </button>
//             </div>
//           </form>
//         </div>,
//         document.body
//       )}

//       {/* ISSUE UNIT SUB-MODAL */}
//       {issueUnitModalReq && createPortal(
//         <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
//           <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
//             <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
//               <div className="flex items-center gap-4">
//                 <button onClick={() => { setActionModalReq(issueUnitModalReq); setIssueUnitModalReq(null); }} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
//                   <ArrowLeft size={20} />
//                 </button>
//                 <div>
//                   <h3 className="text-lg font-black text-slate-800">Issue Blood Units</h3>
//                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
//                     {issueUnitModalReq.request_number}
//                   </p>
//                 </div>
//               </div>
//               <button onClick={() => setIssueUnitModalReq(null)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
//                 <X size={20} />
//               </button>
//             </div>
            
//             <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
//               {loadingDetails ? (
//                 <div className="flex justify-center py-20"><Loader2 className="animate-spin text-purple-600" size={32} /></div>
//               ) : requestDetails ? (
//                 <div className="space-y-4">
//                   {requestDetails.units?.length === 0 ? (
//                     <div className="text-center py-10 bg-white border border-slate-200 border-dashed rounded-2xl">
//                       <PackagePlus size={40} className="mx-auto text-slate-300 mb-4" />
//                       <p className="text-sm font-bold text-slate-500">No units prepared yet</p>
//                       <p className="text-xs font-medium text-slate-400 mt-1">Register a unit first before issuing.</p>
//                     </div>
//                   ) : (
//                     requestDetails.units?.map((unit: any) => (
//                       <div key={unit.id} className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-purple-200 hover:shadow-sm transition-all">
//                         <div>
//                           <div className="flex items-center gap-2 mb-1">
//                             <span className="text-sm font-black text-slate-800">{unit.donation_number}</span>
//                             <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${getUnitStatusColor(unit.issue_status || 'AVAILABLE')}`}>
//                               {unit.issue_status || 'AVAILABLE'}
//                             </span>
//                             {/* <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${unit.issue_status === 'ISSUED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
//                               {unit.issue_status || 'AVAILABLE'}
//                             </span> */}
//                           </div>
//                           <p className="text-xs font-bold text-slate-500">
//                             {unit.component} • {unit.unit_group} • {unit.volume_ml}ml • Exp: {unit.expiry_date}
//                           </p>
//                           <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-50 border border-slate-100">
//                             <FileCheck size={12} className={unit.crossmatch_result === 'COMPATIBLE' ? 'text-emerald-500' : 'text-red-500'} />
//                             <span className={`text-[10px] font-black uppercase ${unit.crossmatch_result === 'COMPATIBLE' ? 'text-emerald-600' : 'text-red-600'}`}>
//                               {unit.crossmatch_result}
//                             </span>
//                           </div>
//                         </div>
                        
//                         {(!unit.issue_status || unit.issue_status === 'AVAILABLE') && unit.crossmatch_result === 'COMPATIBLE' && (
//                           <button 
//                             onClick={() => handleIssueUnit(unit.id)}
//                             disabled={issuingUnitId === unit.id}
//                             className="bg-purple-600 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50 justify-center whitespace-nowrap"
//                           >
//                             {issuingUnitId === unit.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
//                             Issue Unit
//                           </button>
//                         )}
//                       </div>
//                     ))
//                   )}
//                 </div>
//               ) : (
//                 <div className="text-center py-10"><p className="text-sm font-bold text-slate-400">Failed to load details.</p></div>
//               )}
//             </div>
//           </div>
//         </div>,
//         document.body
//       )}

//     </div>
//   );
// };

// export default BloodBankIssue;


