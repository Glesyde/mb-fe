import React, { useState, useEffect } from 'react';
import { Search, Droplets, ClipboardList, Loader2, MoreVertical, Eye, X, RefreshCw, CheckCircle2, Save, ChevronLeft, ChevronRight } from 'lucide-react';
import { bloodBankService } from '../services/bloodBank.service';
import { useNotification } from '../context/NotificationContext';
import { createPortal } from 'react-dom';

const WORKFLOW_TABS = [
  { id: 'ALL', label: 'All Requests', statuses: [] },
  { id: 'REQUESTED', label: 'New Requests', statuses: ['REQUESTED'] },
  { id: 'SAMPLE_RECEIVED', label: 'Sample Received', statuses: ['SAMPLE_RECEIVED'] },
  { id: 'COMPLETED', label: 'Completed', statuses: ['COMPLETED', 'CANCELLED'] },
];

const BloodBankRequests: React.FC = () => {
  const { notify } = useNotification();

  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [activeMenu, setActiveMenu] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('ALL');
  
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [receiveModalReq, setReceiveModalReq] = useState<any | null>(null);
  const [resultModalReq, setResultModalReq] = useState<any | null>(null);

  const [accessionNo, setAccessionNo] = useState('');
  const [sampleCondition, setSampleCondition] = useState('SATISFACTORY');
  
  const [aboGroup, setAboGroup] = useState('O');
  const [rhType, setRhType] = useState('POSITIVE');
  const [antibodyScreen, setAntibodyScreen] = useState('NEGATIVE');
  const [antibodyIdentified, setAntibodyIdentified] = useState('');
  const [resultComments, setResultComments] = useState('');
  const [processingId, setProcessingId] = useState<number | null>(null);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterUrgency, setFilterUrgency] = useState('');
  const [filterSampleCondition, setFilterSampleCondition] = useState('');

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const dataArray = await bloodBankService.getRequests({
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        request_status: filterStatus || undefined,
        urgency: filterUrgency || undefined,
        sample_condition: filterSampleCondition || undefined
      });
      
      setRequests(dataArray);
      
    } catch (err: any) {
      notify(err.response?.data?.message || err.message || 'Failed to load requests', 'error');
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

  const handleReceiveSample = async () => {
    if (!receiveModalReq) return;
    setProcessingId(receiveModalReq.id);
    try {
      await bloodBankService.receiveSample({
        request_id: receiveModalReq.id,
        accession_no: accessionNo,
        sample_condition: sampleCondition,
      });
      notify('Sample received successfully', 'success');
      setReceiveModalReq(null);
      fetchRequests();
    } catch (err: any) {
      notify(err.response?.data?.message || 'Failed to receive sample', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleSaveResult = async () => {
    if (!resultModalReq) return;
    setProcessingId(resultModalReq.id);
    try {
      await bloodBankService.saveResult({
        request_id: resultModalReq.id,
        abo_group: aboGroup,
        rh_type: rhType,
        antibody_screen: antibodyScreen,
        antibody_identified: antibodyIdentified || null,
        comments: resultComments
      });
      notify('Result saved successfully', 'success');
      setResultModalReq(null);
      fetchRequests();
    } catch (err: any) {
      notify(err.response?.data?.message || 'Failed to save result', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const safeRequests = Array.isArray(requests) ? requests : [];
  
  const filteredRequests = safeRequests.filter(req => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = (req.patient_name || '').toLowerCase().includes(q) ||
                          (req.mrn || '').toLowerCase().includes(q) ||
                          (req.request_number || '').toLowerCase().includes(q);
    
    const currentTab = WORKFLOW_TABS.find(t => t.id === activeTab);
    const matchesTab = activeTab === 'ALL' || currentTab?.statuses.includes(req.request_status);

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

  return (
    <div className="space-y-6 animate-in fade-in duration-500">


      <div className="bg-white rounded-[40px] border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-8 py-5 bg-white border-b border-slate-100 flex flex-col md:flex-row md:items-center gap-4 justify-between">
          <div className="flex items-center gap-2">
            <span className="p-3 bg-red-50 text-red-600 rounded-2xl"><Droplets size={22}/></span><p className="text-3xl font-black text-slate-800">{safeRequests.length}</p> <h3 className="text-sm font-black text-slate-700 tracking-wide">Total Requests</h3>
          </div>
          <div className="flex flex-wrap items-center gap-3 ml-auto">
            <div className="flex items-center gap-2">
              <input type="date" className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-red-400" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              <span className="text-slate-400">-</span>
              <input type="date" className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-red-400" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            <div className="relative w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input type="text" placeholder="Search by Patient, MRN..." className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-400 transition-all font-medium" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <button onClick={() => fetchRequests()} className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-slate-100 transition-all">
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
                  ? 'bg-slate-800 text-white shadow-md' 
                  : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="px-8 py-3 bg-slate-50/50 border-b border-slate-100 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Status:</span>
            <select className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 outline-none focus:border-red-400" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="REQUESTED">Requested</option>
              <option value="SAMPLE_RECEIVED">Sample Received</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Urgency:</span>
            <select className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 outline-none focus:border-red-400" value={filterUrgency} onChange={e => setFilterUrgency(e.target.value)}>
              <option value="">All Urgencies</option>
              <option value="ROUTINE">Routine</option>
              <option value="URGENT">Urgent</option>
              <option value="STAT">STAT</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Sample Cond:</span>
            <select className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 outline-none focus:border-red-400" value={filterSampleCondition} onChange={e => setFilterSampleCondition(e.target.value)}>
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
                <th className="px-6 py-4">Request No. & Date</th>
                <th className="px-6 py-4">Patient Details</th>
                <th className="px-6 py-4">Components</th>
                <th className="px-6 py-4">Urgency</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <Loader2 size={36} className="animate-spin mx-auto text-red-600 mb-3" />
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Requests...</p>
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <ClipboardList size={40} className="mx-auto text-slate-300 mb-4" />
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No requests found</p>
                  </td>
                </tr>
              ) : paginatedRequests.map((req) => (
                <tr key={req.id} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-black text-slate-800">{req.request_number}</p>
                    <p className="text-[10px] font-mono text-slate-400 mt-0.5">{req.requested_at}</p>
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
                    }`}>{req.urgency}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border w-fit ${getStatusColor(req.request_status)}`}>
                      {req.request_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right relative">
                    <button onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === req.id ? null : req.id); }} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                      <MoreVertical size={18} />
                    </button>

                    {activeMenu === req.id && (
                      <div className="absolute right-8 top-10 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-10 animate-in fade-in slide-in-from-top-2">
                        <button onClick={() => { setSelectedRequest(req); setActiveMenu(null); }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-red-600 flex items-center gap-2">
                          <Eye size={14} /> View Details
                        </button>
                        <button onClick={() => { setReceiveModalReq(req); setAccessionNo(''); setSampleCondition('SATISFACTORY'); setActiveMenu(null); }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-emerald-600 flex items-center gap-2">
                          <CheckCircle2 size={14} /> Receive Sample
                        </button>
                        <button onClick={() => { setResultModalReq(req); setActiveMenu(null); }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-purple-600 flex items-center gap-2">
                          <Save size={14} /> Save Result
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredRequests.length > itemsPerPage && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
            <p className="text-xs font-bold text-slate-500">
              Showing <span className="text-slate-800">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-slate-800">{Math.min(currentPage * itemsPerPage, filteredRequests.length)}</span> of <span className="text-slate-800">{filteredRequests.length}</span> entries
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="p-2 border border-slate-200 rounded-xl hover:bg-white disabled:opacity-50 transition-colors bg-slate-100 text-slate-600"><ChevronLeft size={16} /></button>
              <div className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-700">Page {currentPage} of {totalPages || 1}</div>
              <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-2 border border-slate-200 rounded-xl hover:bg-white disabled:opacity-50 transition-colors bg-slate-100 text-slate-600"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>

      {/* MODALS BELOW REMAIN UNCHANGED */}
      {selectedRequest && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[88vh]">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div><h3 className="text-lg font-black text-slate-800">Request Details</h3><p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{selectedRequest.request_number}</p></div>
              <button onClick={() => setSelectedRequest(null)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
            </div>
            <div className="p-8 overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                {[
                  ['Patient', selectedRequest.patient_name], ['MRN', selectedRequest.mrn],
                  ['Indication', selectedRequest.indication], ['Urgency', selectedRequest.urgency],
                  ['Clinician', selectedRequest.clinician_name], ['Required Date', selectedRequest.required_date],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{label}</p>
                    <p className="text-sm font-bold text-slate-800">{value || 'N/A'}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {receiveModalReq && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setReceiveModalReq(null)} />
          <div className="relative w-full max-w-sm bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col p-6">
            <h3 className="text-lg font-black text-slate-800 mb-4">Receive Sample</h3>
            <div className="space-y-4">
              <div><label className="text-xs font-bold text-slate-500 uppercase">Accession No.</label><input type="text" value={accessionNo} onChange={e => setAccessionNo(e.target.value)} className="w-full mt-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-emerald-400" placeholder="ACC-YYYY-001" /></div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Sample Condition</label>
                <select value={sampleCondition} onChange={e => setSampleCondition(e.target.value)} className="w-full mt-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-emerald-400">
                  <option value="SATISFACTORY">Satisfactory</option><option value="HAEMOLYSED">Haemolysed</option><option value="INSUFFICIENT">Insufficient</option><option value="UNLABELLED">Unlabelled</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setReceiveModalReq(null)} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Cancel</button>
              <button onClick={handleReceiveSample} disabled={!accessionNo || processingId === receiveModalReq.id} className="px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2">
                {processingId === receiveModalReq.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Receive
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {resultModalReq && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setResultModalReq(null)} />
          <div className="relative w-full max-w-sm bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col p-6">
            <h3 className="text-lg font-black text-slate-800 mb-4">Save Result</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-bold text-slate-500 uppercase">ABO Group</label><select value={aboGroup} onChange={e => setAboGroup(e.target.value)} className="w-full mt-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-purple-400">{['A', 'B', 'AB', 'O'].map(g => <option key={g} value={g}>{g}</option>)}</select></div>
                <div><label className="text-xs font-bold text-slate-500 uppercase">Rh Type</label><select value={rhType} onChange={e => setRhType(e.target.value)} className="w-full mt-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-purple-400"><option value="POSITIVE">Positive (+)</option><option value="NEGATIVE">Negative (-)</option></select></div>
              </div>
              <div><label className="text-xs font-bold text-slate-500 uppercase">Antibody Screen</label><select value={antibodyScreen} onChange={e => setAntibodyScreen(e.target.value)} className="w-full mt-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-purple-400"><option value="NEGATIVE">Negative</option><option value="POSITIVE">Positive</option></select></div>
              {antibodyScreen === 'POSITIVE' && (
                <div><label className="text-xs font-bold text-slate-500 uppercase">Antibody Identified</label><input type="text" value={antibodyIdentified} onChange={e => setAntibodyIdentified(e.target.value)} className="w-full mt-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-purple-400" placeholder="E.g., Anti-K" /></div>
              )}
              <div><label className="text-xs font-bold text-slate-500 uppercase">Comments</label><textarea value={resultComments} onChange={e => setResultComments(e.target.value)} className="w-full mt-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-purple-400 resize-none h-20" placeholder="Compatible, etc." /></div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setResultModalReq(null)} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Cancel</button>
              <button onClick={handleSaveResult} disabled={processingId === resultModalReq.id} className="px-5 py-2.5 text-sm font-bold text-white bg-purple-600 rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2">
                {processingId === resultModalReq.id ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default BloodBankRequests;



// import React, { useState, useEffect } from 'react';
// import {
//   Search, Droplets, ClipboardList, Loader2, MoreVertical, Eye, X, RefreshCw, CheckCircle2, Save, ChevronLeft, ChevronRight
// } from 'lucide-react';
// import { bloodBankService } from '../services/bloodBank.service';
// import { useNotification } from '../context/NotificationContext';
// import { createPortal } from 'react-dom';

// const BloodBankRequests: React.FC = () => {
//   const { notify } = useNotification();

//   const [requests, setRequests] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [searchQuery, setSearchQuery] = useState('');
  
//   const [currentPage, setCurrentPage] = useState(1);
//   const itemsPerPage = 10;
  
//   const [activeMenu, setActiveMenu] = useState<number | null>(null);
  
//   const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
//   const [receiveModalReq, setReceiveModalReq] = useState<any | null>(null);
//   const [resultModalReq, setResultModalReq] = useState<any | null>(null);

//   const [accessionNo, setAccessionNo] = useState('');
//   const [sampleCondition, setSampleCondition] = useState('SATISFACTORY');
  
//   const [aboGroup, setAboGroup] = useState('O');
//   const [rhType, setRhType] = useState('POSITIVE');
//   const [antibodyScreen, setAntibodyScreen] = useState('NEGATIVE');
//   const [antibodyIdentified, setAntibodyIdentified] = useState('');
//   const [resultComments, setResultComments] = useState('');
//   const [processingId, setProcessingId] = useState<number | null>(null);

//   const [dateFrom, setDateFrom] = useState('');
//   const [dateTo, setDateTo] = useState('');
//   const [filterStatus, setFilterStatus] = useState('');
//   const [filterUrgency, setFilterUrgency] = useState('');
//   const [filterSampleCondition, setFilterSampleCondition] = useState('');



//   const fetchRequests = async () => {
//     setLoading(true);
//     try {
//       const dataArray = await bloodBankService.getRequests({
//         date_from: dateFrom || undefined,
//         date_to: dateTo || undefined,
//         request_status: filterStatus || undefined,
//         urgency: filterUrgency || undefined,
//         sample_condition: filterSampleCondition || undefined
//       });
      
//       setRequests(dataArray);
      
//     } catch (err: any) {
//       notify(err.response?.data?.message || err.message || 'Failed to load requests', 'error');
//     } finally {
//       setLoading(false);
//     }
//   };

//   // const fetchRequests = async () => {
//   //   setLoading(true);
//   //   try {
//   //     const rawRes = await bloodBankService.getRequests({
//   //       date_from: dateFrom || undefined,
//   //       date_to: dateTo || undefined,
//   //       request_status: filterStatus || undefined,
//   //       urgency: filterUrgency || undefined,
//   //       sample_condition: filterSampleCondition || undefined
//   //     });
      
//   //     // HYPER-RESILIENT ARRAY EXTRACTOR
//   //     const payload = rawRes?.data ? rawRes.data : rawRes;
      
//   //     let dataArray: any[] = [];
//   //     if (Array.isArray(rawRes)) dataArray = rawRes;
//   //     else if (Array.isArray(payload)) dataArray = payload;
//   //     else if (payload && Array.isArray(payload.data)) dataArray = payload.data;
//   //     else if (payload && Array.isArray(payload.message)) dataArray = payload.message;
//   //     else if (rawRes?.data?.data && Array.isArray(rawRes.data.data)) dataArray = rawRes.data.data;

//   //     // Fallback to empty array to ensure .filter() never crashes again
//   //     setRequests(dataArray || []);
      
//   //   } catch (err: any) {
//   //     notify(err.response?.data?.message || err.message || 'Failed to fetch blood requests', 'error');
//   //   } finally {
//   //     setLoading(false);
//   //   }
//   // };

  
//   // const fetchRequests = async () => {
//   //   setLoading(true);
//   //   try {
//   //     const res = await bloodBankService.getRequests({
//   //       date_from: dateFrom || undefined,
//   //       date_to: dateTo || undefined,
//   //       request_status: filterStatus || undefined,
//   //       urgency: filterUrgency || undefined,
//   //       sample_condition: filterSampleCondition || undefined
//   //     });
      
//   //     // BULLETPROOF ARRAY EXTRACTOR
//   //     let rawArray: any[] = [];
//   //     if (Array.isArray(res)) rawArray = res;
//   //     else if (res && Array.isArray(res.data)) rawArray = res.data;
//   //     else if (res && Array.isArray(res.message)) rawArray = res.message;
//   //     else if (res?.data?.data && Array.isArray(res.data.data)) rawArray = res.data.data;

//   //     // Fail-safe to guarantee an array
//   //     const safeArray = Array.isArray(rawArray) ? rawArray : [];

//   //     setRequests(safeArray);
      
//   //   } catch (err: any) {
//   //     notify(err.response?.data?.message || err.message || 'Failed to load requests', 'error');
//   //   } finally {
//   //     setLoading(false);
//   //   }
//   // };

//   useEffect(() => { 
//     fetchRequests(); 
//   }, []);

//   useEffect(() => {
//     const handleClickOutside = () => setActiveMenu(null);
//     document.addEventListener('click', handleClickOutside);
//     return () => document.removeEventListener('click', handleClickOutside);
//   }, []);

//   const handleReceiveSample = async () => {
//     if (!receiveModalReq) return;
//     setProcessingId(receiveModalReq.id);
//     try {
//       await bloodBankService.receiveSample({
//         request_id: receiveModalReq.id,
//         accession_no: accessionNo,
//         sample_condition: sampleCondition,
//       });
//       notify('Sample received successfully', 'success');
//       setReceiveModalReq(null);
//       fetchRequests();
//     } catch (err: any) {
//       notify(err.response?.data?.message || 'Failed to receive sample', 'error');
//     } finally {
//       setProcessingId(null);
//     }
//   };

//   const handleSaveResult = async () => {
//     if (!resultModalReq) return;
//     setProcessingId(resultModalReq.id);
//     try {
//       await bloodBankService.saveResult({
//         request_id: resultModalReq.id,
//         abo_group: aboGroup,
//         rh_type: rhType,
//         antibody_screen: antibodyScreen,
//         antibody_identified: antibodyIdentified || null,
//         comments: resultComments
//       });
//       notify('Result saved successfully', 'success');
//       setResultModalReq(null);
//       fetchRequests();
//     } catch (err: any) {
//       notify(err.response?.data?.message || 'Failed to save result', 'error');
//     } finally {
//       setProcessingId(null);
//     }
//   };

//   const safeRequests = Array.isArray(requests) ? requests : [];
//   const filteredRequests = safeRequests.filter(req => {
//     const q = searchQuery.toLowerCase();
//     return (
//       (req.patient_name || '').toLowerCase().includes(q) ||
//       (req.mrn || '').toLowerCase().includes(q) ||
//       (req.request_number || '').toLowerCase().includes(q)
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
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//         <div className="bg-white p-5 rounded-[28px] border border-slate-200 shadow-sm flex items-center justify-between">
//           <div>
//             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Requests</p>
//             <p className="text-3xl font-black text-slate-800">{safeRequests.length}</p>
//           </div>
//           <div className="p-3 bg-red-50 text-red-600 rounded-2xl"><Droplets size={22}/></div>
//         </div>
//       </div>

//       <div className="bg-white rounded-[40px] border border-slate-200 overflow-hidden shadow-sm">
//         <div className="px-8 py-5 bg-white border-b border-slate-100 flex flex-col md:flex-row md:items-center gap-4 justify-between">
//           <div className="flex items-center gap-2">
//              <h3 className="text-sm font-black text-slate-700 tracking-wide">Blood Bank Requests</h3>
//           </div>
//           <div className="flex flex-wrap items-center gap-3 ml-auto">
//             <div className="flex items-center gap-2">
//               <input type="date" className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-red-400" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
//               <span className="text-slate-400">-</span>
//               <input type="date" className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-red-400" value={dateTo} onChange={e => setDateTo(e.target.value)} />
//             </div>
//             <div className="relative w-72">
//               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
//               <input type="text" placeholder="Search by Patient, MRN..." className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-400 transition-all font-medium" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
//             </div>
//             <button onClick={() => fetchRequests()} className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-slate-100 transition-all">
//               <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
//             </button>
//           </div>
//         </div>

//         <div className="px-8 py-3 bg-slate-50/50 border-b border-slate-100 flex flex-wrap items-center gap-6">
//           <div className="flex items-center gap-2">
//             <span className="text-[10px] font-bold text-slate-500 uppercase">Status:</span>
//             <select className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 outline-none focus:border-red-400" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
//               <option value="">All Statuses</option>
//               <option value="REQUESTED">Requested</option>
//               <option value="SAMPLE_RECEIVED">Sample Received</option>
//               <option value="COMPLETED">Completed</option>
//             </select>
//           </div>
//           <div className="flex items-center gap-2">
//             <span className="text-[10px] font-bold text-slate-500 uppercase">Urgency:</span>
//             <select className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 outline-none focus:border-red-400" value={filterUrgency} onChange={e => setFilterUrgency(e.target.value)}>
//               <option value="">All Urgencies</option>
//               <option value="ROUTINE">Routine</option>
//               <option value="URGENT">Urgent</option>
//               <option value="STAT">STAT</option>
//             </select>
//           </div>
//           <div className="flex items-center gap-2">
//             <span className="text-[10px] font-bold text-slate-500 uppercase">Sample Cond:</span>
//             <select className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 outline-none focus:border-red-400" value={filterSampleCondition} onChange={e => setFilterSampleCondition(e.target.value)}>
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
//                 <th className="px-6 py-4">Request No. & Date</th>
//                 <th className="px-6 py-4">Patient Details</th>
//                 <th className="px-6 py-4">Components</th>
//                 <th className="px-6 py-4">Urgency</th>
//                 <th className="px-6 py-4">Status</th>
//                 <th className="px-6 py-4 text-right">Actions</th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-slate-50">
//               {loading ? (
//                 <tr>
//                   <td colSpan={6} className="py-20 text-center">
//                     <Loader2 size={36} className="animate-spin mx-auto text-red-600 mb-3" />
//                     <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Requests...</p>
//                   </td>
//                 </tr>
//               ) : filteredRequests.length === 0 ? (
//                 <tr>
//                   <td colSpan={6} className="py-20 text-center">
//                     <ClipboardList size={40} className="mx-auto text-slate-300 mb-4" />
//                     <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No requests found</p>
//                   </td>
//                 </tr>
//               ) : paginatedRequests.map((req) => (
//                 <tr key={req.id} className="group hover:bg-slate-50/50 transition-colors">
//                   <td className="px-6 py-4">
//                     <p className="text-sm font-black text-slate-800">{req.request_number}</p>
//                     <p className="text-[10px] font-mono text-slate-400 mt-0.5">{req.requested_at}</p>
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
//                     }`}>{req.urgency}</span>
//                   </td>
//                   <td className="px-6 py-4">
//                     {/* <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border bg-amber-50 text-amber-700 border-amber-200 w-fit">
//                       {req.request_status}
//                     </span> */}
//                     <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border w-fit ${getStatusColor(req.request_status)}`}>
//                       {req.request_status}
//                     </span>
//                   </td>
//                   <td className="px-6 py-4 text-right relative">
//                     <button onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === req.id ? null : req.id); }} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
//                       <MoreVertical size={18} />
//                     </button>

//                     {activeMenu === req.id && (
//                       <div className="absolute right-8 top-10 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-10 animate-in fade-in slide-in-from-top-2">
//                         <button onClick={() => { setSelectedRequest(req); setActiveMenu(null); }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-red-600 flex items-center gap-2">
//                           <Eye size={14} /> View Details
//                         </button>
//                         <button onClick={() => { setReceiveModalReq(req); setAccessionNo(''); setSampleCondition('SATISFACTORY'); setActiveMenu(null); }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-emerald-600 flex items-center gap-2">
//                           <CheckCircle2 size={14} /> Receive Sample
//                         </button>
//                         <button onClick={() => { setResultModalReq(req); setActiveMenu(null); }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-purple-600 flex items-center gap-2">
//                           <Save size={14} /> Save Result
//                         </button>
//                       </div>
//                     )}
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>

//         {filteredRequests.length > itemsPerPage && (
//           <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
//             <p className="text-xs font-bold text-slate-500">
//               Showing <span className="text-slate-800">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-slate-800">{Math.min(currentPage * itemsPerPage, filteredRequests.length)}</span> of <span className="text-slate-800">{filteredRequests.length}</span> entries
//             </p>
//             <div className="flex items-center gap-2">
//               <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="p-2 border border-slate-200 rounded-xl hover:bg-white disabled:opacity-50 transition-colors bg-slate-100 text-slate-600"><ChevronLeft size={16} /></button>
//               <div className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-700">Page {currentPage} of {totalPages || 1}</div>
//               <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-2 border border-slate-200 rounded-xl hover:bg-white disabled:opacity-50 transition-colors bg-slate-100 text-slate-600"><ChevronRight size={16} /></button>
//             </div>
//           </div>
//         )}
//       </div>

//       {selectedRequest && createPortal(
//         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
//           <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[88vh]">
//             <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
//               <div><h3 className="text-lg font-black text-slate-800">Request Details</h3><p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{selectedRequest.request_number}</p></div>
//               <button onClick={() => setSelectedRequest(null)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
//             </div>
//             <div className="p-8 overflow-y-auto space-y-6">
//               <div className="grid grid-cols-2 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
//                 {[
//                   ['Patient', selectedRequest.patient_name], ['MRN', selectedRequest.mrn],
//                   ['Indication', selectedRequest.indication], ['Urgency', selectedRequest.urgency],
//                   ['Clinician', selectedRequest.clinician_name], ['Required Date', selectedRequest.required_date],
//                 ].map(([label, value]) => (
//                   <div key={label}>
//                     <p className="text-[10px] font-bold text-slate-400 uppercase">{label}</p>
//                     <p className="text-sm font-bold text-slate-800">{value || 'N/A'}</p>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           </div>
//         </div>,
//         document.body
//       )}

//       {receiveModalReq && createPortal(
//         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in">
//           <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setReceiveModalReq(null)} />
//           <div className="relative w-full max-w-sm bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col p-6">
//             <h3 className="text-lg font-black text-slate-800 mb-4">Receive Sample</h3>
//             <div className="space-y-4">
//               <div><label className="text-xs font-bold text-slate-500 uppercase">Accession No.</label><input type="text" value={accessionNo} onChange={e => setAccessionNo(e.target.value)} className="w-full mt-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-emerald-400" placeholder="ACC-YYYY-001" /></div>
//               <div>
//                 <label className="text-xs font-bold text-slate-500 uppercase">Sample Condition</label>
//                 <select value={sampleCondition} onChange={e => setSampleCondition(e.target.value)} className="w-full mt-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-emerald-400">
//                   <option value="SATISFACTORY">Satisfactory</option><option value="HAEMOLYSED">Haemolysed</option><option value="INSUFFICIENT">Insufficient</option><option value="UNLABELLED">Unlabelled</option>
//                 </select>
//               </div>
//             </div>
//             <div className="flex justify-end gap-3 mt-6">
//               <button onClick={() => setReceiveModalReq(null)} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Cancel</button>
//               <button onClick={handleReceiveSample} disabled={!accessionNo || processingId === receiveModalReq.id} className="px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2">
//                 {processingId === receiveModalReq.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Receive
//               </button>
//             </div>
//           </div>
//         </div>,
//         document.body
//       )}

//       {resultModalReq && createPortal(
//         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in">
//           <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setResultModalReq(null)} />
//           <div className="relative w-full max-w-sm bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col p-6">
//             <h3 className="text-lg font-black text-slate-800 mb-4">Save Result</h3>
//             <div className="space-y-4">
//               <div className="grid grid-cols-2 gap-4">
//                 <div><label className="text-xs font-bold text-slate-500 uppercase">ABO Group</label><select value={aboGroup} onChange={e => setAboGroup(e.target.value)} className="w-full mt-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-purple-400">{['A', 'B', 'AB', 'O'].map(g => <option key={g} value={g}>{g}</option>)}</select></div>
//                 <div><label className="text-xs font-bold text-slate-500 uppercase">Rh Type</label><select value={rhType} onChange={e => setRhType(e.target.value)} className="w-full mt-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-purple-400"><option value="POSITIVE">Positive (+)</option><option value="NEGATIVE">Negative (-)</option></select></div>
//               </div>
//               <div><label className="text-xs font-bold text-slate-500 uppercase">Antibody Screen</label><select value={antibodyScreen} onChange={e => setAntibodyScreen(e.target.value)} className="w-full mt-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-purple-400"><option value="NEGATIVE">Negative</option><option value="POSITIVE">Positive</option></select></div>
//               {antibodyScreen === 'POSITIVE' && (
//                 <div><label className="text-xs font-bold text-slate-500 uppercase">Antibody Identified</label><input type="text" value={antibodyIdentified} onChange={e => setAntibodyIdentified(e.target.value)} className="w-full mt-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-purple-400" placeholder="E.g., Anti-K" /></div>
//               )}
//               <div><label className="text-xs font-bold text-slate-500 uppercase">Comments</label><textarea value={resultComments} onChange={e => setResultComments(e.target.value)} className="w-full mt-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-purple-400 resize-none h-20" placeholder="Compatible, etc." /></div>
//             </div>
//             <div className="flex justify-end gap-3 mt-6">
//               <button onClick={() => setResultModalReq(null)} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Cancel</button>
//               <button onClick={handleSaveResult} disabled={processingId === resultModalReq.id} className="px-5 py-2.5 text-sm font-bold text-white bg-purple-600 rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2">
//                 {processingId === resultModalReq.id ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save
//               </button>
//             </div>
//           </div>
//         </div>,
//         document.body
//       )}

//     </div>
//   );
// };

// export default BloodBankRequests;