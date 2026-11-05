import React, { useState, useEffect, useMemo } from "react";
import {
  ClipboardList,
  Plus,
  Search,
  X,
  CheckCircle2,
  Clock,
  Loader2,
  Filter,
  FileText,
  Trash2,
  AlertCircle,
  Eye,
  Send,
  MapPin,
} from "lucide-react";
import { inventoryService, RequisitionDepartment, RequisitionType, formatDepartmentLabel, ITEM_STOCK_DEPARTMENTS, getItemDeptStock } from "../services/inventory.service";
import { useNotification } from "../context/NotificationContext";

const REQUISITION_TYPES: RequisitionType[] = ["GENERAL", "PATIENT_SPECIFIC", "EMERGENCY"];

const SOURCE_LOCATIONS: RequisitionDepartment[] = [
  "STORE",
  "PHARMACY",
  "CSSD",
  "THEATRE",
  "LAB",
  "RADIOLOGY",
  "WARD",
  "ICU",
  "HDU",
  "ERD",
  "OPD",
  "DIALYSIS",
  "LABOUR_WARD",
  "BILLING",
  "PATIENTADMIN",
];

interface ReqItem {
  id?: number;
  item_id: number;
  item_name?: string;
  quantity: number;
  approved_qty?: number;
  requested_qty?: number;
  current_source_stock?: string;
}

interface Requisition {
  id: number;
  request_number: string;
  source_location: string;
  destination_location: string;
  requisition_type?: "GENERAL" | "PATIENT_SPECIFIC" | "EMERGENCY";
  patient_id?: number | null;
  date_required?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "PARTIAL" | "CANCELLED";
  requested_by: number;
  approved_by?: number | null;
  requested_at: string;
  approved_at?: string | null;
  updated_at?: string | null;
  remarks: string;
  reason?: string | null;
  requester_name: string;
  approver_name?: string | null;
  patient_name?: string | null;
  mrn?: string | null;
  items?: ReqItem[];
}

interface DepartmentRequisitionsProps {
  allowedDepartments: string[];
}

const DepartmentRequisitions: React.FC<DepartmentRequisitionsProps> = ({ allowedDepartments }) => {
  const { notify } = useNotification();
  
  // Intercept the departments from the parent and force LABOUR_WARD to be included 
  // whenever we are in a Ward context so the Destination Dropdown shows all 4.
  const activeDepartments = useMemo(() => {
    const depts = new Set(allowedDepartments);
    if (depts.has("WARD") || depts.has("ICU") || depts.has("HDU") || depts.has("LABOUR_WARD")) {
      depts.add("WARD");
      depts.add("ICU");
      depts.add("HDU");
      depts.add("LABOUR_WARD");
    }
    return Array.from(depts);
  }, [allowedDepartments]);

  const [showModal, setShowModal] = useState(false);
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Raise Request Form (Initialized with activeDepartments)
  const [reqSourceLocation, setReqSourceLocation] = useState<RequisitionDepartment>("STORE");
  const [reqDept, setReqDept] = useState(activeDepartments[0] || "");
  const [reqType, setReqType] = useState<RequisitionType>("GENERAL");
  const [reqDateRequired, setReqDateRequired] = useState("");
  const [reqReason, setReqReason] = useState("");
  const [reqRemarks, setReqRemarks] = useState("");
  const [reqItems, setReqItems] = useState<{ item_id: number; item_name: string; quantity: number; catalogItem?: any }[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  // View Details Modal
  const [showViewModal, setShowViewModal] = useState<Requisition | null>(null);
  const [viewItems, setViewItems] = useState<any[]>([]);

  const [showApproveModal, setShowApproveModal] = useState<Requisition | null>(null);
  const [approveItems, setApproveItems] = useState<{ item_id: number; approved_qty: number; item_name?: string; requested_qty?: number; current_source_stock?: string }[]>([]);

  useEffect(() => {
    fetchRequisitions();
    fetchCatalog();
  }, [activeDepartments, notify]);

  useEffect(() => {
    if (reqSourceLocation === reqDept) {
      const nextSource = SOURCE_LOCATIONS.find(d => d !== reqDept);
      if (nextSource) setReqSourceLocation(nextSource);
    }
  }, [reqSourceLocation, reqDept]);

  const totalPages = Math.max(1, Math.ceil(requisitions.length / itemsPerPage));
  const paginatedRequisitions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return requisitions.slice(start, start + itemsPerPage);
  }, [requisitions, currentPage]);

  const fetchRequisitions = async () => {
    setLoading(true);
    try {
      const data = await inventoryService.getRequisitions();
      // Filter using our activeDepartments list to include Labour Ward
      const relevant = data.filter(
        (r) => activeDepartments.includes(r.destination_location) || activeDepartments.includes(r.source_location),
      );
      setRequisitions(relevant);
    } catch (err) {
      notify("Failed to load your requisitions", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchCatalog = async () => {
    setLoadingCatalog(true);
    try {
      const items = await inventoryService.searchItems();
      setCatalogItems(items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCatalog(false);
    }
  };

  const handleAddItem = (catalogItem: any) => {
    if (reqItems.find((i) => i.item_id === catalogItem.id)) {
      notify("Item already added", "error");
      return;
    }
    setReqItems([...reqItems, { item_id: catalogItem.id, item_name: catalogItem.name, quantity: 1, catalogItem }]);
    setSearchQuery("");
  };

  const handleRemoveItem = (index: number) => {
    setReqItems(reqItems.filter((_, i) => i !== index));
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    const updated = [...reqItems];
    updated[index].quantity = quantity;
    setReqItems(updated);
  };

  const submitRequisition = async () => {
    if (reqItems.length === 0) {
      notify("Add at least one item", "error");
      return;
    }
    if (!reqDept) {
      notify("Select a valid department", "error");
      return;
    }
    setProcessingId(-1);
    try {
      await inventoryService.createRequisition({
        source_location: reqSourceLocation,
        destination_location: reqDept as RequisitionDepartment,
        requisition_type: reqType,
        date_required: reqDateRequired || undefined,
        reason: reqReason || undefined,
        remarks: reqRemarks,
        items: reqItems.map((i) => ({ item_id: i.item_id, quantity: i.quantity })),
      });
      notify("Requisition raised successfully", "success");
      setShowModal(false);
      setReqSourceLocation("STORE");
      setReqDept(activeDepartments[0] || "");
      setReqType("GENERAL");
      setReqDateRequired("");
      setReqReason("");
      setReqRemarks("");
      setReqItems([]);
      fetchRequisitions();
    } catch (err: any) {
      notify(err.response?.data?.message || "Failed to raise request", "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleViewDetails = async (req: Requisition) => {
    setProcessingId(req.id);
    try {
      const details = await inventoryService.getRequisitionDetails(req.id);
      setViewItems(details.items || []);
      setShowViewModal(req);
    } catch (err) {
      notify("Failed to fetch requisition details", "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleOpenApprove = async (req: Requisition) => {
    setProcessingId(req.id);
    try {
      const details = await inventoryService.getRequisitionDetails(req.id);
      const items = details.items || [];
      const initialItems = items.map((i: any) => ({
        item_id: i.item_id,
        item_name: i.item_name || `Item #${i.item_id}`,
        requested_qty: Math.floor(parseFloat(i.requested_qty || "0")),
        approved_qty: Math.floor(parseFloat(i.requested_qty || "0")),
        current_source_stock: i.current_source_stock || "0",
      }));
      if (initialItems.length === 0) {
        notify("Warning: No detailed items found in this requisition data.", "error");
      }
      setApproveItems(initialItems);
      setShowApproveModal(req);
    } catch (err) {
      notify("Failed to fetch requisition details", "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveQtyChange = (index: number, qty: number) => {
    const updated = [...approveItems];
    updated[index].approved_qty = qty;
    setApproveItems(updated);
  };

  const submitApproval = async () => {
    if (!showApproveModal) return;
    setProcessingId(showApproveModal.id);
    try {
      await inventoryService.approveRequisition(showApproveModal.id, {
        items: approveItems.map((i) => ({ item_id: i.item_id, approved_qty: i.approved_qty })),
      });
      notify("Requisition approved/fulfilled successfully", "success");
      setShowApproveModal(null);
      fetchRequisitions();
    } catch (err: any) {
      notify(err.response?.data?.message || "Approval failed", "error");
    } finally {
      setProcessingId(null);
    }
  };

  const filteredCatalog = useMemo(() => {
    if (!searchQuery) return [];
    return catalogItems.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 5);
  }, [searchQuery, catalogItems]);


  

  return (
    <div className="animate-in fade-in duration-500 w-full pb-10">
      
      {/* MAIN CONTAINER */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col w-full">
        
        {/* === HEADER === */}
        <header className="px-1 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex flex-col">
            <h2 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <ClipboardList size={18} className="text-brand-primary" />
              Internal Requisitions
            </h2>
            <p className="text-[10px] sm:text-xs text-slate-500 font-semibold uppercase tracking-wider mt-0.5">
              Request inventory from main store
            </p>
          </div>
          
          {/* === METRICS GRID (Sub-header) === */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 p-4 sm:p-5 border-b border-slate-100 ">
            <div className="bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-200/60 shadow-sm">
              <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider">Awaiting Approval</p>
              <p className="text-xl sm:text-2xl font-bold text-amber-600 mt-1">
                {requisitions.filter((r) => r.status === "PENDING").length}
              </p>
            </div>
            <div className="bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-200/60 shadow-sm">
              <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider">Approved / Issued</p>
              <p className="text-xl sm:text-2xl font-bold text-emerald-600 mt-1">
                {requisitions.filter((r) => r.status === "APPROVED").length}
              </p>
            </div>
            <div className="col-span-2 md:col-span-1 bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-200/60 shadow-sm flex flex-row md:flex-col items-center md:items-start justify-between md:justify-start">
              <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Requests</p>
              <p className="text-xl sm:text-2xl font-bold text-slate-800 md:mt-1">
                {requisitions.length}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <button className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-brand-primary transition-all shadow-sm">
              <Filter size={16} />
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="flex-1 md:flex-none bg-brand-primary text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-brand-primary/90 transition-all shadow-sm active:scale-95 text-[10px] sm:text-xs uppercase tracking-wider"
            >
              <Plus size={16} /> Raise Request
            </button>
          </div>
        </header>



        {/* === BODY (Table) === */}
        <main className="overflow-x-auto min-h-[300px] w-full">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-400">
              <Loader2 size={32} className="animate-spin text-brand-primary mb-3" />
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Loading Requisitions...</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 sm:px-6 py-3">Req No & Time</th>
                  <th className="px-4 sm:px-6 py-3">Source → Destination</th>
                  <th className="px-4 sm:px-6 py-3">Remarks</th>
                  <th className="px-4 sm:px-6 py-3 text-center">Status</th>
                  <th className="px-4 sm:px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedRequisitions.map((req) => {
                  const canApprove = req.status === "PENDING" && activeDepartments.includes(req.source_location);
                  return (
                    <tr key={req.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-4 sm:px-6 py-3.5">
                        <p className="text-xs sm:text-sm font-bold text-slate-800 font-mono">{req.request_number}</p>
                        <p className="text-[9px] sm:text-[10px] font-medium text-slate-500 flex items-center gap-1 mt-0.5">
                          <Clock size={10} /> {req.requested_at}
                        </p>
                      </td>
                      <td className="px-4 sm:px-6 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-brand-active/50 text-brand-primary rounded-md hidden sm:block">
                            <MapPin size={12} />
                          </div>
                          <p className="text-[11px] sm:text-xs font-semibold text-slate-700">
                            {formatDepartmentLabel(req.source_location)} <span className="text-slate-300 mx-1">→</span> {formatDepartmentLabel(req.destination_location)}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 max-w-[200px]">
                        <div className="flex items-start gap-1.5">
                          <FileText size={12} className="text-slate-400 mt-0.5 shrink-0" />
                          <div>
                            <span className="text-[11px] sm:text-xs font-medium text-slate-700 line-clamp-1">{req.remarks || "No remarks"}</span>
                            <p className="text-[9px] font-medium text-slate-400 mt-0.5">BY: {req.requester_name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border ${
                          req.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' :
                          req.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200/60' :
                          req.status === 'REJECTED' || req.status === 'CANCELLED' ? 'bg-red-50 text-red-700 border-red-200/60' :
                          'bg-brand-active/50 text-brand-primary border-brand-primary/20'
                        }`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 text-right">
                        {canApprove ? (
                          <button
                            onClick={() => handleOpenApprove(req)}
                            disabled={processingId === req.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-primary text-white rounded-lg hover:opacity-90 transition-all shadow-sm disabled:opacity-50 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider"
                            title="Approve / Fulfill"
                          >
                            {processingId === req.id ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                            Approve
                          </button>
                        ) : (
                          <button
                            onClick={() => handleViewDetails(req)}
                            disabled={processingId === req.id}
                            className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-brand-primary hover:text-white transition-all shadow-sm disabled:opacity-50"
                            title="View Details"
                          >
                            {processingId === req.id ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {requisitions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      <ClipboardList size={32} className="mx-auto opacity-20 mb-3" />
                      <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">No Requisitions Found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </main>
        
        {/* === FOOTER (Pagination) === */}
        {totalPages > 1 && (
          <footer className="px-4 sm:px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-[10px] sm:text-xs font-semibold rounded-md hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-[10px] sm:text-xs font-medium text-slate-500">
              Page <strong className="text-slate-700">{currentPage}</strong> of <strong className="text-slate-700">{totalPages}</strong>
            </span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-[10px] sm:text-xs font-semibold rounded-md hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Next
            </button>
          </footer>
        )}
      </div>

      {/* ========================================= */}
      {/* MODAL: RAISE REQUEST                      */}
      {/* ========================================= */}
      {showModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white w-full max-w-4xl rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            
            <header className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-brand-primary text-white rounded-lg shadow-sm">
                  <ClipboardList size={16} />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight">Internal Stock Request</h2>
                  <p className="text-[9px] sm:text-[10px] text-brand-primary font-bold uppercase tracking-wider">Request from Main Store</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-slate-200 rounded-md transition-colors text-slate-400">
                <X size={18} />
              </button>
            </header>

            <main className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Source Location</label>
                  <select
                    value={reqSourceLocation}
                    onChange={e => setReqSourceLocation(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold outline-none cursor-pointer focus:border-brand-primary/50 focus:bg-white"
                  >
                    {SOURCE_LOCATIONS.filter(d => d !== reqDept).map(d => <option key={d} value={d}>{formatDepartmentLabel(d)}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Destination</label>
                  {activeDepartments.length > 1 ? (
                    <select
                      value={reqDept}
                      onChange={e => setReqDept(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold outline-none cursor-pointer focus:border-brand-primary/50 focus:bg-white"
                    >
                      {activeDepartments.filter(d => d !== reqSourceLocation).map(d => <option key={d} value={d}>{formatDepartmentLabel(d)}</option>)}
                    </select>
                  ) : (
                    <div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-500 cursor-not-allowed uppercase">
                      {formatDepartmentLabel(reqDept)}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Requisition Type</label>
                  <select
                    value={reqType}
                    onChange={e => setReqType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold outline-none cursor-pointer focus:border-brand-primary/50 focus:bg-white"
                  >
                    {REQUISITION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Date Required</label>
                  <input
                    type="date"
                    value={reqDateRequired}
                    onChange={e => setReqDateRequired(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-brand-primary/50 focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Reason</label>
                <input
                  type="text"
                  value={reqReason}
                  onChange={e => setReqReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium outline-none focus:bg-white focus:border-brand-primary/50 transition-all"
                  placeholder="Reason for requisition..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Remarks</label>
                <textarea
                  rows={2}
                  value={reqRemarks}
                  onChange={e => setReqRemarks(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium outline-none resize-none focus:bg-white focus:border-brand-primary/50 transition-all"
                  placeholder="Additional remarks..."
                />
              </div>

              {/* Item Search Block */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Requested Items</h4>
                
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-brand-primary" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search to add items..."
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:bg-white focus:border-brand-primary outline-none transition-all"
                  />
                  {searchQuery && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden z-10 max-h-60 overflow-y-auto">
                      {filteredCatalog.map(cat => (
                        <div key={cat.id} onClick={() => handleAddItem(cat)} className="px-3 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-b-0 cursor-pointer group/row">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="text-xs font-bold text-slate-800">{cat.name}</p>
                                {cat.item_type && <span className="text-[8px] font-bold uppercase px-1 py-0.5 rounded bg-slate-100 text-slate-500 tracking-wider">{cat.item_type}</span>}
                                {cat.is_low_stock === 1 && <span className="text-[8px] font-bold uppercase px-1 py-0.5 rounded bg-amber-100 text-amber-700 tracking-wider">Low Stock</span>}
                              </div>
                              <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                                {cat.items_uhid}{cat.brand ? ` • ${cat.brand}` : ""}{cat.unit_name ? ` • ${cat.unit_name}` : ""}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right shrink-0">
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Global</p>
                                <p className="text-xs font-bold text-slate-700">{parseFloat(cat.global_stock || "0")}</p>
                              </div>
                              <button className="shrink-0 p-1 rounded bg-brand-active/50 text-brand-primary group-hover/row:bg-brand-primary group-hover/row:text-white transition-colors">
                                <Plus size={14} />
                              </button>
                            </div>
                          </div>
                          {/* Stock Pills */}
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {ITEM_STOCK_DEPARTMENTS.map(dept => {
                              const qty = getItemDeptStock(cat, dept);
                              const isSource = dept === reqSourceLocation;
                              return (
                                <span key={dept} className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${isSource ? (qty > 0 ? "bg-emerald-600 text-white border-emerald-600" : "bg-red-500 text-white border-red-500") : (qty > 0 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-400 border-slate-200")}`}>
                                  {dept}: {qty}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                      {filteredCatalog.length === 0 && (
                        <div className="px-3 py-3 text-[11px] text-slate-400 italic text-center">No items found matching "{searchQuery}"</div>
                      )}
                    </div>
                  )}
                </div>

                {reqItems.length > 0 && (
                  <div className="bg-slate-50 rounded-xl p-1.5 border border-slate-200 space-y-1.5">
                    {reqItems.map((item, idx) => {
                      const cat = item.catalogItem;
                      return (
                        <div key={idx} className="p-2 sm:p-3 bg-white rounded-lg shadow-sm border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-xs font-bold text-slate-800">{item.item_name}</p>
                              {cat?.item_type && <span className="text-[8px] font-bold uppercase px-1 py-0.5 rounded bg-slate-100 text-slate-500">{cat.item_type}</span>}
                            </div>
                            {cat && <p className="text-[9px] text-slate-400 font-mono mt-0.5">{cat.items_uhid} • {cat.unit_name}</p>}
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                            <input 
                              type="number" 
                              value={item.quantity} 
                              min={1} 
                              onChange={e => handleQuantityChange(idx, parseInt(e.target.value) || 1)}
                              className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs font-bold text-center outline-none focus:border-brand-primary/50" 
                            />
                            <button onClick={() => handleRemoveItem(idx)} className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </main>

            <footer className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2 shrink-0">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-200 rounded-lg uppercase tracking-wider transition-colors">
                Cancel
              </button>
              <button onClick={submitRequisition} disabled={processingId !== null} className="bg-brand-primary text-white px-5 py-2 rounded-lg font-bold hover:bg-brand-primary/90 shadow-sm transition-all flex items-center gap-1.5 uppercase tracking-wider text-[11px] disabled:opacity-50">
                {processingId === -1 ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} 
                Submit Request
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* MODAL: APPROVE REQUEST                    */}
      {/* ========================================= */}
      {showApproveModal && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !processingId && setShowApproveModal(null)} />
          <div className="relative bg-white w-full max-w-xl rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            <header className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-brand-primary text-white rounded-lg shadow-sm">
                  <Send size={16} />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight">Approve Transfer</h2>
                  <p className="text-[9px] sm:text-[10px] text-brand-primary font-bold uppercase tracking-wider">REQ {showApproveModal.request_number}</p>
                </div>
              </div>
              <button disabled={processingId !== null} onClick={() => setShowApproveModal(null)} className="p-1.5 hover:bg-slate-200 rounded-md transition-colors text-slate-400">
                <X size={18} />
              </button>
            </header>

            <main className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-5 custom-scrollbar">
               <div className="grid grid-cols-2 gap-2 sm:gap-3">
                 <div className="bg-slate-50 p-2.5 sm:p-3 rounded-lg border border-slate-100">
                    <p className="text-[9px] uppercase font-bold tracking-wider text-slate-500">Source</p>
                    <p className="text-xs font-bold text-slate-800 mt-0.5 truncate">{formatDepartmentLabel(showApproveModal.source_location)}</p>
                 </div>
                 <div className="bg-slate-50 p-2.5 sm:p-3 rounded-lg border border-slate-100">
                    <p className="text-[9px] uppercase font-bold tracking-wider text-slate-500">Destination</p>
                    <p className="text-xs font-bold text-slate-800 mt-0.5 truncate">{formatDepartmentLabel(showApproveModal.destination_location)}</p>
                 </div>
                 <div className="bg-slate-50 p-2.5 sm:p-3 rounded-lg border border-slate-100">
                    <p className="text-[9px] uppercase font-bold tracking-wider text-slate-500">Requested By</p>
                    <p className="text-xs font-bold text-slate-800 mt-0.5 truncate">{showApproveModal.requester_name}</p>
                 </div>
                 <div className="bg-slate-50 p-2.5 sm:p-3 rounded-lg border border-slate-100">
                    <p className="text-[9px] uppercase font-bold tracking-wider text-slate-500">Type</p>
                    <p className="text-xs font-bold text-slate-800 mt-0.5 truncate">{showApproveModal.requisition_type || "—"}</p>
                 </div>
               </div>

               <div className="space-y-3 pt-3 border-t border-slate-100">
                 <h4 className="text-[10px] sm:text-xs font-bold text-slate-800 uppercase tracking-wider">Approve Line Items</h4>
                 {approveItems.length === 0 ? (
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-700 text-xs font-semibold text-center">
                       No detailed items provided.
                    </div>
                 ) : (
                   <div className="space-y-2">
                     {approveItems.map((ai, index) => (
                        <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white border border-slate-200 p-3 rounded-xl shadow-sm gap-3">
                           <div className="flex-1 min-w-0">
                             <p className="text-xs font-bold text-slate-800 truncate">{ai.item_name}</p>
                             <div className="flex items-center gap-3 mt-1.5">
                               <p className="text-[9px] font-bold text-slate-500 uppercase">Req: <span className="text-brand-primary">{ai.requested_qty}</span></p>
                               <div className="w-px h-3 bg-slate-200"></div>
                               <p className="text-[9px] font-bold text-slate-500 uppercase">Stock: <span className={Number(ai.current_source_stock || 0) > 0 ? "text-emerald-600" : "text-red-600"}>{ai.current_source_stock || 0}</span></p>
                             </div>
                           </div>
                           <div className="w-full sm:w-28 shrink-0">
                             <label className="text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Approved QTY</label>
                             <input 
                               type="number" 
                               value={ai.approved_qty} 
                               onChange={e => handleApproveQtyChange(index, parseInt(e.target.value)||0)}
                               className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm font-bold text-center focus:border-brand-primary outline-none transition-all" 
                              />
                           </div>
                        </div>
                     ))}
                   </div>
                 )}
               </div>
            </main>

            <footer className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
               <button onClick={submitApproval} disabled={processingId !== null} className="bg-brand-primary text-white px-6 py-2 rounded-lg font-bold hover:bg-brand-primary/90 shadow-sm transition-all flex items-center gap-1.5 uppercase tracking-wider text-[11px] disabled:opacity-50">
                 {processingId === showApproveModal.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                 Confirm Approval
               </button>
            </footer>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* MODAL: VIEW DETAILS                       */}
      {/* ========================================= */}
      {showViewModal && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowViewModal(null)} />
          <div className="relative bg-white w-full max-w-xl rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            <header className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-slate-200 text-slate-600 rounded-lg shadow-sm">
                  <FileText size={16} />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight">Requisition Details</h2>
                  <p className="text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-wider">REQ {showViewModal.request_number}</p>
                </div>
              </div>
              <button onClick={() => setShowViewModal(null)} className="p-1.5 hover:bg-slate-200 rounded-md transition-colors text-slate-400">
                <X size={18} />
              </button>
            </header>

            <main className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4 custom-scrollbar">
               <div className="grid grid-cols-2 gap-2 sm:gap-3">
                 <div className="bg-slate-50 p-2.5 sm:p-3 rounded-lg border border-slate-100">
                    <p className="text-[9px] uppercase font-bold tracking-wider text-slate-500">Source</p>
                    <p className="text-xs font-bold text-slate-800 mt-0.5 truncate">{formatDepartmentLabel(showViewModal.source_location)}</p>
                 </div>
                 <div className="bg-slate-50 p-2.5 sm:p-3 rounded-lg border border-slate-100">
                    <p className="text-[9px] uppercase font-bold tracking-wider text-slate-500">Destination</p>
                    <p className="text-xs font-bold text-slate-800 mt-0.5 truncate">{formatDepartmentLabel(showViewModal.destination_location)}</p>
                 </div>
                 <div className="bg-slate-50 p-2.5 sm:p-3 rounded-lg border border-slate-100">
                    <p className="text-[9px] uppercase font-bold tracking-wider text-slate-500">Status</p>
                    <p className={`text-xs font-bold mt-0.5 ${
                        showViewModal.status === 'APPROVED' ? 'text-emerald-600' :
                        showViewModal.status === 'PENDING' ? 'text-amber-600' :
                        showViewModal.status === 'REJECTED' || showViewModal.status === 'CANCELLED' ? 'text-red-600' :
                        'text-brand-primary'
                    }`}>{showViewModal.status}</p>
                 </div>
                 {showViewModal.date_required && (
                   <div className="bg-slate-50 p-2.5 sm:p-3 rounded-lg border border-slate-100">
                      <p className="text-[9px] uppercase font-bold tracking-wider text-slate-500">Date Required</p>
                      <p className="text-xs font-bold text-slate-800 mt-0.5">{showViewModal.date_required}</p>
                   </div>
                 )}
               </div>

               {(showViewModal.reason || showViewModal.remarks) && (
                 <div className="flex flex-col gap-2">
                   {showViewModal.reason && (
                     <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <p className="text-[9px] uppercase font-bold tracking-wider text-slate-500 mb-0.5">Reason</p>
                        <p className="text-xs font-medium text-slate-700">{showViewModal.reason}</p>
                     </div>
                   )}
                   {showViewModal.remarks && (
                     <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <p className="text-[9px] uppercase font-bold tracking-wider text-slate-500 mb-0.5">Remarks</p>
                        <p className="text-xs font-medium text-slate-700">{showViewModal.remarks}</p>
                     </div>
                   )}
                 </div>
               )}

               <div className="space-y-3 pt-3 border-t border-slate-100">
                 <h4 className="text-[10px] sm:text-xs font-bold text-slate-800 uppercase tracking-wider">Requested Items</h4>
                 {viewItems.length === 0 ? (
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-700 text-xs font-semibold text-center">
                       No detailed items available.
                    </div>
                 ) : (
                   <div className="space-y-2">
                     {viewItems.map((vi, index) => (
                        <div key={index} className="flex flex-col bg-white border border-slate-200 p-3 rounded-xl shadow-sm">
                           <p className="text-xs font-bold text-slate-800">{vi.item_name}</p>
                           <div className="flex items-center gap-4 mt-2 pt-2 border-t border-slate-100">
                             <div>
                               <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Requested</p>
                               <p className="text-xs font-bold text-brand-primary mt-0.5">{parseFloat(vi.requested_qty || 0)} <span className="text-[9px] text-slate-400 font-medium">Units</span></p>
                             </div>
                             {(showViewModal.status === 'APPROVED' || showViewModal.status === 'PARTIAL') && (
                               <>
                                 <div className="w-px h-6 bg-slate-200"></div>
                                 <div>
                                   <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Approved</p>
                                   <p className="text-xs font-bold text-emerald-600 mt-0.5">{parseFloat(vi.approved_qty || 0)} <span className="text-[9px] text-slate-400 font-medium">Units</span></p>
                                 </div>
                               </>
                             )}
                           </div>
                        </div>
                     ))}
                   </div>
                 )}
               </div>
            </main>

            <footer className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
               <button onClick={() => setShowViewModal(null)} className="bg-slate-800 text-white px-6 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider hover:bg-slate-700 shadow-sm transition-all flex items-center gap-1.5">
                 Close
               </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );

  // return (
  //   <div className="space-y-8 animate-in fade-in duration-500 pb-20">

  //     <div className="bg-white border border-slate-200 rounded-[44px] overflow-hidden shadow-sm">
  //       <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        
  //         <h3 className="text-lg font-black text-slate-800">
  //           My Requisitions
  //         </h3>

          
  //         <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-brand-primary transition-all">
  //           <Filter size={18} />
  //         </button>
  //       </div>


  //       <div className="overflow-x-auto min-h-[300px]">
  //         {loading ? (
  //            <div className="flex flex-col items-center justify-center p-20 text-slate-400">
  //              <Loader2 size={40} className="animate-spin text-brand-primary mb-4" />
  //              <p className="text-xs font-black uppercase tracking-widest">Loading Requisitions...</p>
  //            </div>
  //         ) : (
  //         <table className="w-full text-left">
  //           <thead>
  //             <tr className="bg-white border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
  //               <th className="px-8 py-5">Req No & Time</th>
  //               <th className="px-8 py-5">Source → Destination</th>
  //               <th className="px-8 py-5">Remarks</th>
  //               <th className="px-8 py-5 text-center">Status</th>
  //               <th className="px-8 py-5 text-right">Actions</th>
  //             </tr>
  //           </thead>
  //           <tbody className="divide-y divide-slate-50">
  //             {paginatedRequisitions.map((req) => {
  //               const canApprove = req.status === "PENDING" && activeDepartments.includes(req.source_location);
  //               return (
  //               <tr
  //                 key={req.id}
  //                 className="hover:bg-slate-50/50 transition-colors"
  //               >
  //                 <td className="px-8 py-6">
  //                   <p className="text-sm font-black text-slate-800 font-mono">
  //                     {req.request_number}
  //                   </p>
  //                   <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mt-1">
  //                     <Clock size={12} /> {req.requested_at}
  //                   </p>
  //                 </td>
  //                 <td className="px-8 py-6">
  //                   <div className="flex items-center gap-2">
  //                     <div className="p-2 bg-brand-active text-brand-primary rounded-lg">
  //                       <MapPin size={14} />
  //                     </div>
  //                     <p className="text-xs font-black text-slate-700">
  //                       {formatDepartmentLabel(req.source_location)} <span className="text-slate-300">→</span> {formatDepartmentLabel(req.destination_location)}
  //                     </p>
  //                   </div>
  //                 </td>
  //                 <td className="px-8 py-6">
  //                   <div className="flex items-center gap-2">
  //                      <FileText size={14} className="text-slate-400" />
  //                      <span className="text-sm font-medium text-slate-700">{req.remarks || "No remarks"}</span>
  //                   </div>
  //                   <p className="text-[10px] font-bold text-slate-400 mt-1 pl-5">
  //                     BY: {req.requester_name}
  //                   </p>
  //                 </td>
  //                 <td className="px-8 py-6 text-center">
  //                   <span className={`inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border
  //                     ${req.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
  //                       req.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border-amber-100' :
  //                       req.status === 'REJECTED' || req.status === 'CANCELLED' ? 'bg-red-50 text-red-600 border-red-100' :
  //                       'bg-brand-active text-brand-primary border-brand-active'
  //                     }
  //                   `}>
  //                     {req.status}
  //                   </span>
  //                 </td>
  //                 <td className="px-8 py-6 text-right">
  //                   {canApprove ? (
  //                     <button
  //                       onClick={() => handleOpenApprove(req)}
  //                       disabled={processingId === req.id}
  //                       className="inline-flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-xl hover:opacity-90 transition-all shadow-sm disabled:opacity-50 text-[10px] font-black uppercase tracking-widest"
  //                       title="Approve / Fulfill"
  //                     >
  //                       {processingId === req.id ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
  //                       Approve
  //                     </button>
  //                   ) : (
  //                     <button
  //                       onClick={() => handleViewDetails(req)}
  //                       disabled={processingId === req.id}
  //                       className="p-2 bg-brand-active text-brand-primary rounded-xl hover:bg-brand-primary hover:text-white transition-all shadow-sm disabled:opacity-50"
  //                       title="View Details"
  //                     >
  //                       {processingId === req.id ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
  //                     </button>
  //                   )}
  //                 </td>
  //               </tr>
  //               );
  //             })}
  //             {requisitions.length === 0 && (
  //               <tr>
  //                  <td colSpan={5} className="py-16 text-center text-slate-400">
  //                    <ClipboardList size={40} className="mx-auto opacity-20 mb-4" />
  //                    <p className="text-xs font-bold uppercase tracking-widest">No Requisitions Found</p>
  //                  </td>
  //               </tr>
  //             )}
  //           </tbody>
  //         </table>
  //         )}
  //       </div>
        
  //       {/* Pagination Controls */}
  //       {totalPages > 1 && (
  //         <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between rounded-b-2xl">
  //           <button 
  //             onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
  //             disabled={currentPage === 1}
  //             className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
  //           >
  //             Previous
  //           </button>
  //           <span className="text-xs font-bold text-slate-500">
  //             Page {currentPage} of {totalPages}
  //           </span>
  //           <button 
  //             onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
  //             disabled={currentPage === totalPages}
  //             className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
  //           >
  //             Next
  //           </button>
  //         </div>
  //       )}
  //     </div>

  //     {/* Raise Request Modal */}
  //     {showModal && (
  //       <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
  //         <div
  //           className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
  //           onClick={() => setShowModal(false)}
  //         />
  //         <div className="relative bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
  //           <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
  //             <div className="flex items-center gap-3">
  //               <div className="p-2 bg-brand-primary text-white rounded-xl shadow-lg">
  //                 <ClipboardList size={20} />
  //               </div>
  //               <div>
  //                 <h2 className="text-xl font-bold text-slate-800 tracking-tight">
  //                   Internal Stock Request
  //                 </h2>
  //                 <p className="text-xs text-brand-primary font-bold uppercase tracking-widest">
  //                   Request from Main Store
  //                 </p>
  //               </div>
  //             </div>
  //             <button
  //               onClick={() => setShowModal(false)}
  //               className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
  //             >
  //               <X size={20} />
  //             </button>
  //           </div>

  //           <div className="p-10 space-y-8 overflow-y-auto">
  //             <div className="grid grid-cols-2 gap-4">
  //               <div className="space-y-2">
  //                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
  //                   Source Location (Requesting From)
  //                 </label>
  //                 <select
  //                   value={reqSourceLocation}
  //                   onChange={e => setReqSourceLocation(e.target.value as RequisitionDepartment)}
  //                   className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none appearance-none cursor-pointer"
  //                 >
  //                   {SOURCE_LOCATIONS.filter(d => d !== reqDept).map(d => <option key={d} value={d}>{formatDepartmentLabel(d)}</option>)}
  //                 </select>
  //               </div>

  //               <div className="space-y-2">
  //                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
  //                   Destination (Deliver To)
  //                 </label>
  //                 {/* Now mapping through our activeDepartments which includes LABOUR_WARD */}
  //                 {activeDepartments.length > 1 ? (
  //                   <select
  //                     value={reqDept}
  //                     onChange={e => setReqDept(e.target.value)}
  //                     className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none appearance-none cursor-pointer"
  //                   >
  //                     {activeDepartments.filter(d => d !== reqSourceLocation).map(d => <option key={d} value={d}>{formatDepartmentLabel(d)}</option>)}
  //                   </select>
  //                 ) : (
  //                   <div className="w-full px-5 py-4 bg-slate-100 border border-slate-200 rounded-2xl text-sm font-bold text-slate-500 cursor-not-allowed uppercase">
  //                      {formatDepartmentLabel(reqDept)}
  //                   </div>
  //                 )}
  //               </div>
  //             </div>

  //             <div className="grid grid-cols-2 gap-4">
  //               <div className="space-y-2">
  //                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
  //                   Requisition Type
  //                 </label>
  //                 <select
  //                   value={reqType}
  //                   onChange={e => setReqType(e.target.value as RequisitionType)}
  //                   className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none appearance-none cursor-pointer"
  //                 >
  //                   {REQUISITION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
  //                 </select>
  //               </div>

  //               <div className="space-y-2">
  //                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
  //                   Date Required
  //                 </label>
  //                 <input
  //                   type="date"
  //                   value={reqDateRequired}
  //                   onChange={e => setReqDateRequired(e.target.value)}
  //                   className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none"
  //                 />
  //               </div>
  //             </div>

  //             <div className="space-y-2">
  //               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
  //                 Reason
  //               </label>
  //               <input
  //                 type="text"
  //                 value={reqReason}
  //                 onChange={e => setReqReason(e.target.value)}
  //                 className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:bg-white transition-all"
  //                 placeholder="Reason for requisition..."
  //               />
  //             </div>

  //             <div className="space-y-2">
  //               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
  //                 Remarks
  //               </label>
  //               <textarea
  //                 rows={2}
  //                 value={reqRemarks}
  //                 onChange={e => setReqRemarks(e.target.value)}
  //                 className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none resize-none focus:bg-white transition-all"
  //                 placeholder="Additional remarks..."
  //               ></textarea>
  //             </div>

  //             <div className="pt-4 border-t border-slate-100 space-y-4">
  //                <h4 className="text-sm font-black text-slate-800 tracking-tight uppercase">Requested Items</h4>
                 
  //                <div className="relative group">
  //                   <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-brand-active0" />
  //                   <input
  //                     type="text"
  //                     value={searchQuery}
  //                     onChange={e => setSearchQuery(e.target.value)}
  //                     placeholder="Search to add items..."
  //                     className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white focus:border-brand-primary outline-none transition-all"
  //                   />
  //                   {searchQuery && (
  //                     <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-10 max-h-96 overflow-y-auto">
  //                        {filteredCatalog.map(cat => (
  //                          <div key={cat.id}
  //                               onClick={() => handleAddItem(cat)}
  //                               className="px-5 py-3.5 hover:bg-slate-50 border-b border-slate-50 last:border-b-0 cursor-pointer group/row">
  //                            <div className="flex items-start justify-between gap-3">
  //                              <div className="min-w-0">
  //                                <div className="flex items-center gap-2 flex-wrap">
  //                                  <p className="text-sm font-black text-slate-800">{cat.name}</p>
  //                                  {cat.item_type && (
  //                                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 tracking-wider">{cat.item_type}</span>
  //                                  )}
  //                                  {cat.is_low_stock === 1 && (
  //                                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 tracking-wider">Low Stock</span>
  //                                  )}
  //                                </div>
  //                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
  //                                  {cat.items_uhid}{cat.brand ? ` • ${cat.brand}` : ""}{cat.strength ? ` • ${cat.strength}` : ""}{cat.unit_name ? ` • ${cat.unit_name}` : ""}
  //                                </p>
  //                              </div>
  //                              <div className="text-right shrink-0">
  //                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Global</p>
  //                                <p className="text-sm font-black text-slate-700">{parseFloat(cat.global_stock || "0")}</p>
  //                              </div>
  //                              <button className="shrink-0 p-1.5 rounded-lg bg-brand-active text-brand-primary group-hover/row:bg-brand-primary group-hover/row:text-white transition-colors">
  //                                <Plus size={14} />
  //                              </button>
  //                            </div>
  //                            <div className="flex flex-wrap gap-1 mt-2">
  //                              {ITEM_STOCK_DEPARTMENTS.map(dept => {
  //                                const qty = getItemDeptStock(cat, dept);
  //                                const isSource = dept === reqSourceLocation;
  //                                return (
  //                                  <span
  //                                    key={dept}
  //                                    className={`text-[9px] font-black px-1.5 py-0.5 rounded border tracking-tight ${
  //                                      isSource
  //                                        ? qty > 0 ? "bg-emerald-600 text-white border-emerald-600" : "bg-red-500 text-white border-red-500"
  //                                        : qty > 0 ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-50 text-slate-300 border-slate-100"
  //                                    }`}
  //                                    title={`${formatDepartmentLabel(dept)}: ${qty} ${cat.unit_name || ""}`}
  //                                  >
  //                                    {dept}: {qty}
  //                                  </span>
  //                                );
  //                              })}
  //                            </div>
  //                          </div>
  //                        ))}
  //                        {filteredCatalog.length === 0 && (
  //                          <div className="px-5 py-3 text-xs text-slate-400 italic font-medium">No items found matching "{searchQuery}"</div>
  //                        )}
  //                     </div>
  //                   )}
  //                </div>

  //                {reqItems.length > 0 && (
  //                  <div className="bg-slate-50 rounded-[24px] p-2 border border-slate-200 space-y-2">
  //                    {reqItems.map((item, idx) => {
  //                      const cat = item.catalogItem;
  //                      return (
  //                      <div key={idx} className="p-3.5 bg-white rounded-[16px] shadow-sm">
  //                        <div className="flex items-start justify-between gap-3">
  //                          <div className="min-w-0">
  //                            <div className="flex items-center gap-2 flex-wrap">
  //                              <p className="text-sm font-black text-slate-800">{item.item_name}</p>
  //                              {cat?.item_type && (
  //                                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 tracking-wider">{cat.item_type}</span>
  //                              )}
  //                              {cat?.is_low_stock === 1 && (
  //                                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 tracking-wider">Low Stock</span>
  //                              )}
  //                            </div>
  //                            {cat && (
  //                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
  //                                {cat.items_uhid}{cat.brand ? ` • ${cat.brand}` : ""}{cat.strength ? ` • ${cat.strength}` : ""}{cat.unit_name ? ` • ${cat.unit_name}` : ""}
  //                              </p>
  //                            )}
  //                          </div>
  //                          <div className="flex items-center gap-3 shrink-0">
  //                            <input type="number" value={item.quantity} min={1} onChange={e => handleQuantityChange(idx, parseInt(e.target.value) || 1)}
  //                              className="w-20 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-center outline-none focus:border-brand-active0" />
  //                            <button onClick={() => handleRemoveItem(idx)} className="text-slate-400 hover:text-red-500">
  //                              <Trash2 size={16} />
  //                            </button>
  //                          </div>
  //                        </div>
  //                        {cat && (
  //                          <div className="flex flex-wrap gap-1 mt-2">
  //                            {ITEM_STOCK_DEPARTMENTS.map(dept => {
  //                              const qty = getItemDeptStock(cat, dept);
  //                              const isSource = dept === reqSourceLocation;
  //                              return (
  //                                <span
  //                                  key={dept}
  //                                  className={`text-[9px] font-black px-1.5 py-0.5 rounded border tracking-tight ${
  //                                    isSource
  //                                      ? qty > 0 ? "bg-emerald-600 text-white border-emerald-600" : "bg-red-500 text-white border-red-500"
  //                                      : qty > 0 ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-50 text-slate-300 border-slate-100"
  //                                  }`}
  //                                  title={`${formatDepartmentLabel(dept)}: ${qty} ${cat.unit_name || ""}`}
  //                                >
  //                                  {dept}: {qty}
  //                                </span>
  //                              );
  //                            })}
  //                          </div>
  //                        )}
  //                      </div>
  //                      );
  //                    })}
  //                  </div>
  //                )}
  //             </div>
  //           </div>

  //           <div className="px-10 py-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
  //             <button
  //               onClick={() => setShowModal(false)}
  //               className="px-6 py-2.5 text-sm font-black text-slate-400 uppercase tracking-widest"
  //             >
  //               Discard
  //             </button>
  //             <button
  //               onClick={submitRequisition}
  //               disabled={processingId !== null}
  //               className="bg-brand-primary text-white px-10 py-4 rounded-[20px] font-black hover:bg-brand-primary shadow-xl shadow-brand-active transition-all flex items-center gap-2 uppercase tracking-widest text-xs disabled:opacity-50"
  //             >
  //               {processingId === -1 ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />} 
  //               Submit Requisition
  //             </button>
  //           </div>
  //         </div>
  //       </div>
  //     )}

  //     {/* Approve Modal */}
  //     {showApproveModal && (
  //       <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
  //         <div
  //           className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
  //           onClick={() => !processingId && setShowApproveModal(null)}
  //         />
  //         <div className="relative bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
  //           <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
  //             <div className="flex items-center gap-3">
  //               <div className="p-2 bg-brand-primary text-white rounded-xl shadow-lg">
  //                 <Send size={20} />
  //               </div>
  //               <div>
  //                 <h2 className="text-xl font-bold text-slate-800 tracking-tight">
  //                   Approve Stock Transfer
  //                 </h2>
  //                 <p className="text-xs text-brand-primary font-bold uppercase tracking-widest">
  //                   REQ {showApproveModal.request_number}
  //                 </p>
  //               </div>
  //             </div>
  //             <button
  //               disabled={processingId !== null}
  //               onClick={() => setShowApproveModal(null)}
  //               className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
  //             >
  //               <X size={20} />
  //             </button>
  //           </div>

  //           <div className="p-10 flex-1 overflow-y-auto no-scrollbar pb-6 space-y-6">
  //              <div className="grid grid-cols-2 gap-4">
  //                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
  //                   <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Source</p>
  //                   <p className="text-sm font-black text-slate-800 mt-1">{formatDepartmentLabel(showApproveModal.source_location)}</p>
  //                </div>
  //                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
  //                   <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Destination</p>
  //                   <p className="text-sm font-black text-slate-800 mt-1">{formatDepartmentLabel(showApproveModal.destination_location)}</p>
  //                </div>
  //                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
  //                   <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Requested By</p>
  //                   <p className="text-sm font-black text-slate-800 mt-1">{showApproveModal.requester_name}</p>
  //                </div>
  //                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
  //                   <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Type</p>
  //                   <p className="text-sm font-black text-slate-800 mt-1">{showApproveModal.requisition_type || "—"}</p>
  //                </div>
  //                {showApproveModal.date_required && (
  //                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
  //                     <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Date Required</p>
  //                     <p className="text-sm font-black text-slate-800 mt-1">{showApproveModal.date_required}</p>
  //                  </div>
  //                )}
  //                {showApproveModal.reason && (
  //                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
  //                     <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Reason</p>
  //                     <p className="text-sm font-black text-slate-800 mt-1">{showApproveModal.reason}</p>
  //                  </div>
  //                )}
  //              </div>

  //              <div className="space-y-4 pt-4 border-t border-slate-100">
  //                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Approve Line Items</h4>
  //                {approveItems.length === 0 ? (
  //                   <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-amber-600 text-xs font-bold text-center">
  //                      No detailed items provided by backend for this request.
  //                   </div>
  //                ) : (
  //                  <div className="space-y-3">
  //                    {approveItems.map((ai, index) => (
  //                       <div key={index} className="flex items-center justify-between bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
  //                          <div className="flex-1 pr-4">
  //                            <p className="text-sm font-bold text-slate-800 truncate">{ai.item_name}</p>
  //                            <div className="flex items-center gap-4 mt-1">
  //                              <p className="text-[10px] font-black text-slate-400 uppercase">Requested: <span className="text-brand-primary">{ai.requested_qty}</span> Units</p>
  //                              <p className="text-[10px] font-black text-slate-400 uppercase border-l border-slate-200 pl-4">Source Stock: <span className="text-emerald-600">{ai.current_source_stock}</span></p>
  //                            </div>
  //                          </div>
  //                          <div className="w-32">
  //                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Approved QTY</label>
  //                            <input type="number" value={ai.approved_qty} onChange={e => handleApproveQtyChange(index, parseInt(e.target.value)||0)}
  //                               className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-lg font-black text-center focus:border-brand-active0 outline-none transition-all" />
  //                          </div>
  //                       </div>
  //                    ))}
  //                  </div>
  //                )}
  //              </div>
  //           </div>

  //           <div className="px-10 py-6 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
  //              <button
  //                 onClick={submitApproval}
  //                 disabled={processingId !== null}
  //                 className="bg-brand-primary text-white px-10 py-4 rounded-[20px] font-black hover:bg-brand-primary shadow-xl shadow-brand-active transition-all flex items-center gap-2 uppercase tracking-widest text-xs disabled:opacity-50"
  //              >
  //                {processingId === showApproveModal.id ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
  //                Confirm Approval
  //              </button>
  //           </div>
  //         </div>
  //       </div>
  //     )}

  //     {/* View Details Modal */}
  //     {showViewModal && (
  //       <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
  //         <div
  //           className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
  //           onClick={() => setShowViewModal(null)}
  //         />
  //         <div className="relative bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
  //           <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
  //             <div className="flex items-center gap-3">
  //               <div className="p-2 bg-slate-200 text-slate-600 rounded-xl shadow-lg">
  //                 <FileText size={20} />
  //               </div>
  //               <div>
  //                 <h2 className="text-xl font-bold text-slate-800 tracking-tight">
  //                   Requisition Details
  //                 </h2>
  //                 <p className="text-xs text-brand-primary font-bold uppercase tracking-widest">
  //                   REQ {showViewModal.request_number}
  //                 </p>
  //               </div>
  //             </div>
  //             <button
  //               onClick={() => setShowViewModal(null)}
  //               className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
  //             >
  //               <X size={20} />
  //             </button>
  //           </div>

  //           <div className="p-10 flex-1 overflow-y-auto no-scrollbar pb-6 space-y-6">
  //              <div className="grid grid-cols-2 gap-4">
  //                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
  //                   <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Source</p>
  //                   <p className="text-sm font-black text-slate-800 mt-1">{formatDepartmentLabel(showViewModal.source_location)}</p>
  //                </div>
  //                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
  //                   <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Destination</p>
  //                   <p className="text-sm font-black text-slate-800 mt-1">{formatDepartmentLabel(showViewModal.destination_location)}</p>
  //                </div>
  //                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
  //                   <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Type</p>
  //                   <p className="text-sm font-black text-slate-800 mt-1">{showViewModal.requisition_type || "—"}</p>
  //                </div>
  //                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
  //                   <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Status</p>
  //                   <p className={`text-sm font-black mt-1 ${
  //                       showViewModal.status === 'APPROVED' ? 'text-emerald-600' :
  //                       showViewModal.status === 'PENDING' ? 'text-amber-600' :
  //                       showViewModal.status === 'REJECTED' || showViewModal.status === 'CANCELLED' ? 'text-red-600' :
  //                       'text-brand-primary'
  //                   }`}>{showViewModal.status}</p>
  //                </div>
  //                {showViewModal.date_required && (
  //                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
  //                     <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Date Required</p>
  //                     <p className="text-sm font-black text-slate-800 mt-1">{showViewModal.date_required}</p>
  //                  </div>
  //                )}
  //                {showViewModal.patient_name && (
  //                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
  //                     <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Patient</p>
  //                     <p className="text-sm font-black text-slate-800 mt-1">{showViewModal.patient_name}{showViewModal.mrn ? ` (${showViewModal.mrn})` : ""}</p>
  //                  </div>
  //                )}
  //              </div>

  //              {showViewModal.reason && (
  //                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mt-2">
  //                   <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">Reason</p>
  //                   <p className="text-xs font-semibold text-slate-700">{showViewModal.reason}</p>
  //                </div>
  //              )}

  //              {showViewModal.remarks && (
  //                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mt-2">
  //                   <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">Remarks</p>
  //                   <p className="text-xs font-semibold text-slate-700">{showViewModal.remarks}</p>
  //                </div>
  //              )}

  //              <div className="space-y-4 pt-4 border-t border-slate-100">
  //                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Requested Items</h4>
  //                {viewItems.length === 0 ? (
  //                   <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-amber-600 text-xs font-bold text-center">
  //                      No detailed items provided by backend for this request.
  //                   </div>
  //                ) : (
  //                  <div className="space-y-3">
  //                    {viewItems.map((vi, index) => (
  //                       <div key={index} className="flex flex-col bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
  //                          <p className="text-sm font-bold text-slate-800">{vi.item_name}</p>
  //                          <div className="flex items-center gap-6 mt-3 pt-3 border-t border-slate-100">
  //                            <div>
  //                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Requested</p>
  //                              <p className="text-sm font-black text-brand-primary mt-0.5">{parseFloat(vi.requested_qty || 0)} <span className="text-[10px] text-slate-400">Units</span></p>
  //                            </div>
  //                            {(showViewModal.status === 'APPROVED' || showViewModal.status === 'PARTIAL') && (
  //                              <div>
  //                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Approved</p>
  //                                <p className="text-sm font-black text-emerald-600 mt-0.5">{parseFloat(vi.approved_qty || 0)} <span className="text-[10px] text-slate-400">Units</span></p>
  //                              </div>
  //                            )}
  //                          </div>
  //                       </div>
  //                    ))}
  //                  </div>
  //                )}
  //              </div>
  //           </div>

  //           <div className="px-10 py-6 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
  //              <button
  //                 onClick={() => setShowViewModal(null)}
  //                 className="bg-slate-900 text-white px-8 py-3 rounded-[20px] text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 shadow-lg shadow-slate-200 transition-all flex items-center gap-2"
  //              >
  //                Close
  //              </button>
  //           </div>
  //         </div>
  //       </div>
  //     )}
  //   </div>
  // );
};

export default DepartmentRequisitions;

// import React, { useState, useEffect, useMemo } from "react";
// import {
//   ClipboardList,
//   Plus,
//   Search,
//   X,
//   CheckCircle2,
//   Clock,
//   Loader2,
//   Filter,
//   FileText,
//   Trash2,
//   AlertCircle,
//   Eye,
//   Send,
//   MapPin,
// } from "lucide-react";
// import { inventoryService, RequisitionDepartment, RequisitionType, formatDepartmentLabel, ITEM_STOCK_DEPARTMENTS, getItemDeptStock } from "../services/inventory.service";
// import { useNotification } from "../context/NotificationContext";

// const REQUISITION_TYPES: RequisitionType[] = ["GENERAL", "PATIENT_SPECIFIC", "EMERGENCY"];

// const SOURCE_LOCATIONS: RequisitionDepartment[] = [
//   "STORE",
//   "PHARMACY",
//   "CSSD",
//   "THEATRE",
//   "LAB",
//   "RADIOLOGY",
//   "WARD",
//   "ICU",
//   "HDU",
//   "ERD",
//   "OPD",
//   "DIALYSIS",
//   "LABOUR_WARD",
//   "BILLING",
//   "PATIENTADMIN",
// ];

// interface ReqItem {
//   id?: number;
//   item_id: number;
//   item_name?: string;
//   quantity: number;
//   approved_qty?: number;
//   requested_qty?: number;
//   current_source_stock?: string;
// }

// interface Requisition {
//   id: number;
//   request_number: string;
//   source_location: string;
//   destination_location: string;
//   requisition_type?: "GENERAL" | "PATIENT_SPECIFIC" | "EMERGENCY";
//   patient_id?: number | null;
//   date_required?: string | null;
//   status: "PENDING" | "APPROVED" | "REJECTED" | "PARTIAL" | "CANCELLED";
//   requested_by: number;
//   approved_by?: number | null;
//   requested_at: string;
//   approved_at?: string | null;
//   updated_at?: string | null;
//   remarks: string;
//   reason?: string | null;
//   requester_name: string;
//   approver_name?: string | null;
//   patient_name?: string | null;
//   mrn?: string | null;
//   items?: ReqItem[];
// }

// interface DepartmentRequisitionsProps {
//   allowedDepartments: string[];
// }

// const DepartmentRequisitions: React.FC<DepartmentRequisitionsProps> = ({ allowedDepartments }) => {
//   const { notify } = useNotification();
//   const [showModal, setShowModal] = useState(false);
//   const [requisitions, setRequisitions] = useState<Requisition[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [processingId, setProcessingId] = useState<number | null>(null);
//   const [currentPage, setCurrentPage] = useState(1);
//   const itemsPerPage = 10;

//   // Raise Request Form
//   const [reqSourceLocation, setReqSourceLocation] = useState<RequisitionDepartment>("STORE");
//   const [reqDept, setReqDept] = useState(allowedDepartments[0] || "");
//   const [reqType, setReqType] = useState<RequisitionType>("GENERAL");
//   const [reqDateRequired, setReqDateRequired] = useState("");
//   const [reqReason, setReqReason] = useState("");
//   const [reqRemarks, setReqRemarks] = useState("");
//   const [reqItems, setReqItems] = useState<{ item_id: number; item_name: string; quantity: number; catalogItem?: any }[]>([]);
//   const [searchQuery, setSearchQuery] = useState("");
//   const [catalogItems, setCatalogItems] = useState<any[]>([]);
//   const [loadingCatalog, setLoadingCatalog] = useState(false);

//   // View Details Modal
//   const [showViewModal, setShowViewModal] = useState<Requisition | null>(null);
//   const [viewItems, setViewItems] = useState<any[]>([]);

//   const [showApproveModal, setShowApproveModal] = useState<Requisition | null>(null);
//   const [approveItems, setApproveItems] = useState<{ item_id: number; approved_qty: number; item_name?: string; requested_qty?: number; current_source_stock?: string }[]>([]);

//   useEffect(() => {
//     fetchRequisitions();
//     fetchCatalog();
//   }, [allowedDepartments, notify]);

//   useEffect(() => {
//     if (reqSourceLocation === reqDept) {
//       const nextSource = SOURCE_LOCATIONS.find(d => d !== reqDept);
//       if (nextSource) setReqSourceLocation(nextSource);
//     }
//   }, [reqSourceLocation, reqDept]);

//   const totalPages = Math.max(1, Math.ceil(requisitions.length / itemsPerPage));
//   const paginatedRequisitions = useMemo(() => {
//     const start = (currentPage - 1) * itemsPerPage;
//     return requisitions.slice(start, start + itemsPerPage);
//   }, [requisitions, currentPage]);

//   const fetchRequisitions = async () => {
//     setLoading(true);
//     try {
//       const data = await inventoryService.getRequisitions();
//       // Requests this department raised (destination is us) OR requests drawing on our stock (source is us)
//       const relevant = data.filter(
//         (r) => allowedDepartments.includes(r.destination_location) || allowedDepartments.includes(r.source_location),
//       );
//       setRequisitions(relevant);
//     } catch (err) {
//       notify("Failed to load your requisitions", "error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const fetchCatalog = async () => {
//     setLoadingCatalog(true);
//     try {
//       const items = await inventoryService.searchItems();
//       setCatalogItems(items);
//     } catch (err) {
//       console.error(err);
//     } finally {
//       setLoadingCatalog(false);
//     }
//   };

//   const handleAddItem = (catalogItem: any) => {
//     if (reqItems.find((i) => i.item_id === catalogItem.id)) {
//       notify("Item already added", "error");
//       return;
//     }
//     setReqItems([...reqItems, { item_id: catalogItem.id, item_name: catalogItem.name, quantity: 1, catalogItem }]);
//     setSearchQuery("");
//   };

//   const handleRemoveItem = (index: number) => {
//     setReqItems(reqItems.filter((_, i) => i !== index));
//   };

//   const handleQuantityChange = (index: number, quantity: number) => {
//     const updated = [...reqItems];
//     updated[index].quantity = quantity;
//     setReqItems(updated);
//   };

//   const submitRequisition = async () => {
//     if (reqItems.length === 0) {
//       notify("Add at least one item", "error");
//       return;
//     }
//     if (!reqDept) {
//       notify("Select a valid department", "error");
//       return;
//     }
//     setProcessingId(-1);
//     try {
//       await inventoryService.createRequisition({
//         source_location: reqSourceLocation,
//         destination_location: reqDept as RequisitionDepartment,
//         requisition_type: reqType,
//         date_required: reqDateRequired || undefined,
//         reason: reqReason || undefined,
//         remarks: reqRemarks,
//         items: reqItems.map((i) => ({ item_id: i.item_id, quantity: i.quantity })),
//       });
//       notify("Requisition raised successfully", "success");
//       setShowModal(false);
//       setReqSourceLocation("STORE");
//       setReqDept(allowedDepartments[0] || "");
//       setReqType("GENERAL");
//       setReqDateRequired("");
//       setReqReason("");
//       setReqRemarks("");
//       setReqItems([]);
//       fetchRequisitions();
//     } catch (err: any) {
//       notify(err.response?.data?.message || "Failed to raise request", "error");
//     } finally {
//       setProcessingId(null);
//     }
//   };

//   const handleViewDetails = async (req: Requisition) => {
//     setProcessingId(req.id);
//     try {
//       const details = await inventoryService.getRequisitionDetails(req.id);
//       setViewItems(details.items || []);
//       setShowViewModal(req);
//     } catch (err) {
//       notify("Failed to fetch requisition details", "error");
//     } finally {
//       setProcessingId(null);
//     }
//   };

//   const handleOpenApprove = async (req: Requisition) => {
//     setProcessingId(req.id);
//     try {
//       const details = await inventoryService.getRequisitionDetails(req.id);
//       const items = details.items || [];
//       const initialItems = items.map((i: any) => ({
//         item_id: i.item_id,
//         item_name: i.item_name || `Item #${i.item_id}`,
//         requested_qty: Math.floor(parseFloat(i.requested_qty || "0")),
//         approved_qty: Math.floor(parseFloat(i.requested_qty || "0")),
//         current_source_stock: i.current_source_stock || "0",
//       }));
//       if (initialItems.length === 0) {
//         notify("Warning: No detailed items found in this requisition data.", "error");
//       }
//       setApproveItems(initialItems);
//       setShowApproveModal(req);
//     } catch (err) {
//       notify("Failed to fetch requisition details", "error");
//     } finally {
//       setProcessingId(null);
//     }
//   };

//   const handleApproveQtyChange = (index: number, qty: number) => {
//     const updated = [...approveItems];
//     updated[index].approved_qty = qty;
//     setApproveItems(updated);
//   };

//   const submitApproval = async () => {
//     if (!showApproveModal) return;
//     setProcessingId(showApproveModal.id);
//     try {
//       await inventoryService.approveRequisition(showApproveModal.id, {
//         items: approveItems.map((i) => ({ item_id: i.item_id, approved_qty: i.approved_qty })),
//       });
//       notify("Requisition approved/fulfilled successfully", "success");
//       setShowApproveModal(null);
//       fetchRequisitions();
//     } catch (err: any) {
//       notify(err.response?.data?.message || "Approval failed", "error");
//     } finally {
//       setProcessingId(null);
//     }
//   };

//   const filteredCatalog = useMemo(() => {
//     if (!searchQuery) return [];
//     return catalogItems.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 5);
//   }, [searchQuery, catalogItems]);

//   return (
//     <div className="space-y-8 animate-in fade-in duration-500 pb-20">
//       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
//         <div>
//           <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
//             <ClipboardList size={20} className="text-brand-primary" />
//             Internal Requisitions
//           </h2>
//           <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
//             Request inventory from main store
//           </p>
//         </div>
//         <button
//           onClick={() => setShowModal(true)}
//           className="bg-brand-primary text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-brand-primary transition-all shadow-lg shadow-brand-active active:scale-95 text-xs uppercase tracking-widest"
//         >
//           <Plus size={18} /> Raise Request
//         </button>
//       </div>

//       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//         <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
//           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
//             Awaiting Approval
//           </p>
//           <p className="text-3xl font-black text-amber-600 mt-2">
//             {requisitions.filter((r) => r.status === "PENDING").length}
//           </p>
//         </div>
//         <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
//           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
//             Approved / Issued
//           </p>
//           <p className="text-3xl font-black text-emerald-600 mt-2">
//             {requisitions.filter((r) => r.status === "APPROVED").length}
//           </p>
//         </div>
//         <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
//           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
//             Total Requests
//           </p>
//           <p className="text-3xl font-black text-slate-800 mt-2">
//             {requisitions.length}
//           </p>
//         </div>
//       </div>

//       <div className="bg-white border border-slate-200 rounded-[44px] overflow-hidden shadow-sm">
//         <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
//           <h3 className="text-lg font-black text-slate-800">
//             My Requisitions
//           </h3>
//           <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-brand-primary transition-all">
//             <Filter size={18} />
//           </button>
//         </div>
//         <div className="overflow-x-auto min-h-[300px]">
//           {loading ? (
//              <div className="flex flex-col items-center justify-center p-20 text-slate-400">
//                <Loader2 size={40} className="animate-spin text-brand-primary mb-4" />
//                <p className="text-xs font-black uppercase tracking-widest">Loading Requisitions...</p>
//              </div>
//           ) : (
//           <table className="w-full text-left">
//             <thead>
//               <tr className="bg-white border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
//                 <th className="px-8 py-5">Req No & Time</th>
//                 <th className="px-8 py-5">Source → Destination</th>
//                 <th className="px-8 py-5">Remarks</th>
//                 <th className="px-8 py-5 text-center">Status</th>
//                 <th className="px-8 py-5 text-right">Actions</th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-slate-50">
//               {paginatedRequisitions.map((req) => {
//                 const canApprove = req.status === "PENDING" && allowedDepartments.includes(req.source_location);
//                 return (
//                 <tr
//                   key={req.id}
//                   className="hover:bg-slate-50/50 transition-colors"
//                 >
//                   <td className="px-8 py-6">
//                     <p className="text-sm font-black text-slate-800 font-mono">
//                       {req.request_number}
//                     </p>
//                     <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mt-1">
//                       <Clock size={12} /> {req.requested_at}
//                     </p>
//                   </td>
//                   <td className="px-8 py-6">
//                     <div className="flex items-center gap-2">
//                       <div className="p-2 bg-brand-active text-brand-primary rounded-lg">
//                         <MapPin size={14} />
//                       </div>
//                       <p className="text-xs font-black text-slate-700">
//                         {formatDepartmentLabel(req.source_location)} <span className="text-slate-300">→</span> {formatDepartmentLabel(req.destination_location)}
//                       </p>
//                     </div>
//                   </td>
//                   <td className="px-8 py-6">
//                     <div className="flex items-center gap-2">
//                        <FileText size={14} className="text-slate-400" />
//                        <span className="text-sm font-medium text-slate-700">{req.remarks || "No remarks"}</span>
//                     </div>
//                     <p className="text-[10px] font-bold text-slate-400 mt-1 pl-5">
//                       BY: {req.requester_name}
//                     </p>
//                   </td>
//                   <td className="px-8 py-6 text-center">
//                     <span className={`inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border
//                       ${req.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
//                         req.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border-amber-100' :
//                         req.status === 'REJECTED' || req.status === 'CANCELLED' ? 'bg-red-50 text-red-600 border-red-100' :
//                         'bg-brand-active text-brand-primary border-brand-active'
//                       }
//                     `}>
//                       {req.status}
//                     </span>
//                   </td>
//                   <td className="px-8 py-6 text-right">
//                     {canApprove ? (
//                       <button
//                         onClick={() => handleOpenApprove(req)}
//                         disabled={processingId === req.id}
//                         className="inline-flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-xl hover:opacity-90 transition-all shadow-sm disabled:opacity-50 text-[10px] font-black uppercase tracking-widest"
//                         title="Approve / Fulfill"
//                       >
//                         {processingId === req.id ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
//                         Approve
//                       </button>
//                     ) : (
//                       <button
//                         onClick={() => handleViewDetails(req)}
//                         disabled={processingId === req.id}
//                         className="p-2 bg-brand-active text-brand-primary rounded-xl hover:bg-brand-primary hover:text-white transition-all shadow-sm disabled:opacity-50"
//                         title="View Details"
//                       >
//                         {processingId === req.id ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
//                       </button>
//                     )}
//                   </td>
//                 </tr>
//                 );
//               })}
//               {requisitions.length === 0 && (
//                 <tr>
//                    <td colSpan={5} className="py-16 text-center text-slate-400">
//                      <ClipboardList size={40} className="mx-auto opacity-20 mb-4" />
//                      <p className="text-xs font-bold uppercase tracking-widest">No Requisitions Found</p>
//                    </td>
//                 </tr>
//               )}
//             </tbody>
//           </table>
//           )}
//         </div>
        
//         {/* Pagination Controls */}
//         {totalPages > 1 && (
//           <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between rounded-b-2xl">
//             <button 
//               onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
//               disabled={currentPage === 1}
//               className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
//             >
//               Previous
//             </button>
//             <span className="text-xs font-bold text-slate-500">
//               Page {currentPage} of {totalPages}
//             </span>
//             <button 
//               onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
//               disabled={currentPage === totalPages}
//               className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
//             >
//               Next
//             </button>
//           </div>
//         )}
//       </div>

//       {/* Raise Request Modal */}
//       {showModal && (
//         <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
//           <div
//             className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
//             onClick={() => setShowModal(false)}
//           />
//           <div className="relative bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
//             <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
//               <div className="flex items-center gap-3">
//                 <div className="p-2 bg-brand-primary text-white rounded-xl shadow-lg">
//                   <ClipboardList size={20} />
//                 </div>
//                 <div>
//                   <h2 className="text-xl font-bold text-slate-800 tracking-tight">
//                     Internal Stock Request
//                   </h2>
//                   <p className="text-xs text-brand-primary font-bold uppercase tracking-widest">
//                     Request from Main Store
//                   </p>
//                 </div>
//               </div>
//               <button
//                 onClick={() => setShowModal(false)}
//                 className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
//               >
//                 <X size={20} />
//               </button>
//             </div>

//             <div className="p-10 space-y-8 overflow-y-auto">
//               <div className="grid grid-cols-2 gap-4">
//                 <div className="space-y-2">
//                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
//                     Source Location (Requesting From)
//                   </label>
//                   <select
//                     value={reqSourceLocation}
//                     onChange={e => setReqSourceLocation(e.target.value as RequisitionDepartment)}
//                     className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none appearance-none cursor-pointer"
//                   >
//                     {SOURCE_LOCATIONS.filter(d => d !== reqDept).map(d => <option key={d} value={d}>{formatDepartmentLabel(d)}</option>)}
//                   </select>
//                 </div>

//                 <div className="space-y-2">
//                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
//                     Destination (Deliver To)
//                   </label>
//                   {allowedDepartments.length > 1 ? (
//                     <select
//                       value={reqDept}
//                       onChange={e => setReqDept(e.target.value)}
//                       className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none appearance-none cursor-pointer"
//                     >
//                       {allowedDepartments.filter(d => d !== reqSourceLocation).map(d => <option key={d} value={d}>{formatDepartmentLabel(d)}</option>)}
//                     </select>
//                   ) : (
//                     <div className="w-full px-5 py-4 bg-slate-100 border border-slate-200 rounded-2xl text-sm font-bold text-slate-500 cursor-not-allowed uppercase">
//                        {formatDepartmentLabel(reqDept)}
//                     </div>
//                   )}
//                 </div>
//               </div>

//               <div className="grid grid-cols-2 gap-4">
//                 <div className="space-y-2">
//                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
//                     Requisition Type
//                   </label>
//                   <select
//                     value={reqType}
//                     onChange={e => setReqType(e.target.value as RequisitionType)}
//                     className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none appearance-none cursor-pointer"
//                   >
//                     {REQUISITION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
//                   </select>
//                 </div>

//                 <div className="space-y-2">
//                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
//                     Date Required
//                   </label>
//                   <input
//                     type="date"
//                     value={reqDateRequired}
//                     onChange={e => setReqDateRequired(e.target.value)}
//                     className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none"
//                   />
//                 </div>
//               </div>

//               <div className="space-y-2">
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
//                   Reason
//                 </label>
//                 <input
//                   type="text"
//                   value={reqReason}
//                   onChange={e => setReqReason(e.target.value)}
//                   className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:bg-white transition-all"
//                   placeholder="Reason for requisition..."
//                 />
//               </div>

//               <div className="space-y-2">
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
//                   Remarks
//                 </label>
//                 <textarea
//                   rows={2}
//                   value={reqRemarks}
//                   onChange={e => setReqRemarks(e.target.value)}
//                   className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none resize-none focus:bg-white transition-all"
//                   placeholder="Additional remarks..."
//                 ></textarea>
//               </div>

//               <div className="pt-4 border-t border-slate-100 space-y-4">
//                  <h4 className="text-sm font-black text-slate-800 tracking-tight uppercase">Requested Items</h4>
                 
//                  <div className="relative group">
//                     <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-brand-active0" />
//                     <input
//                       type="text"
//                       value={searchQuery}
//                       onChange={e => setSearchQuery(e.target.value)}
//                       placeholder="Search to add items..."
//                       className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white focus:border-brand-primary outline-none transition-all"
//                     />
//                     {searchQuery && (
//                       <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-10 max-h-96 overflow-y-auto">
//                          {filteredCatalog.map(cat => (
//                            <div key={cat.id}
//                                 onClick={() => handleAddItem(cat)}
//                                 className="px-5 py-3.5 hover:bg-slate-50 border-b border-slate-50 last:border-b-0 cursor-pointer group/row">
//                              <div className="flex items-start justify-between gap-3">
//                                <div className="min-w-0">
//                                  <div className="flex items-center gap-2 flex-wrap">
//                                    <p className="text-sm font-black text-slate-800">{cat.name}</p>
//                                    {cat.item_type && (
//                                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 tracking-wider">{cat.item_type}</span>
//                                    )}
//                                    {cat.is_low_stock === 1 && (
//                                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 tracking-wider">Low Stock</span>
//                                    )}
//                                  </div>
//                                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
//                                    {cat.items_uhid}{cat.brand ? ` • ${cat.brand}` : ""}{cat.strength ? ` • ${cat.strength}` : ""}{cat.unit_name ? ` • ${cat.unit_name}` : ""}
//                                  </p>
//                                </div>
//                                <div className="text-right shrink-0">
//                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Global</p>
//                                  <p className="text-sm font-black text-slate-700">{parseFloat(cat.global_stock || "0")}</p>
//                                </div>
//                                <button className="shrink-0 p-1.5 rounded-lg bg-brand-active text-brand-primary group-hover/row:bg-brand-primary group-hover/row:text-white transition-colors">
//                                  <Plus size={14} />
//                                </button>
//                              </div>
//                              <div className="flex flex-wrap gap-1 mt-2">
//                                {ITEM_STOCK_DEPARTMENTS.map(dept => {
//                                  const qty = getItemDeptStock(cat, dept);
//                                  const isSource = dept === reqSourceLocation;
//                                  return (
//                                    <span
//                                      key={dept}
//                                      className={`text-[9px] font-black px-1.5 py-0.5 rounded border tracking-tight ${
//                                        isSource
//                                          ? qty > 0 ? "bg-emerald-600 text-white border-emerald-600" : "bg-red-500 text-white border-red-500"
//                                          : qty > 0 ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-50 text-slate-300 border-slate-100"
//                                      }`}
//                                      title={`${formatDepartmentLabel(dept)}: ${qty} ${cat.unit_name || ""}`}
//                                    >
//                                      {dept}: {qty}
//                                    </span>
//                                  );
//                                })}
//                              </div>
//                            </div>
//                          ))}
//                          {filteredCatalog.length === 0 && (
//                            <div className="px-5 py-3 text-xs text-slate-400 italic font-medium">No items found matching "{searchQuery}"</div>
//                          )}
//                       </div>
//                     )}
//                  </div>

//                  {reqItems.length > 0 && (
//                    <div className="bg-slate-50 rounded-[24px] p-2 border border-slate-200 space-y-2">
//                      {reqItems.map((item, idx) => {
//                        const cat = item.catalogItem;
//                        return (
//                        <div key={idx} className="p-3.5 bg-white rounded-[16px] shadow-sm">
//                           <div className="flex items-start justify-between gap-3">
//                             <div className="min-w-0">
//                               <div className="flex items-center gap-2 flex-wrap">
//                                 <p className="text-sm font-black text-slate-800">{item.item_name}</p>
//                                 {cat?.item_type && (
//                                   <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 tracking-wider">{cat.item_type}</span>
//                                 )}
//                                 {cat?.is_low_stock === 1 && (
//                                   <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 tracking-wider">Low Stock</span>
//                                 )}
//                               </div>
//                               {cat && (
//                                 <p className="text-[10px] text-slate-400 font-mono mt-0.5">
//                                   {cat.items_uhid}{cat.brand ? ` • ${cat.brand}` : ""}{cat.strength ? ` • ${cat.strength}` : ""}{cat.unit_name ? ` • ${cat.unit_name}` : ""}
//                                 </p>
//                               )}
//                             </div>
//                             <div className="flex items-center gap-3 shrink-0">
//                               <input type="number" value={item.quantity} min={1} onChange={e => handleQuantityChange(idx, parseInt(e.target.value) || 1)}
//                                 className="w-20 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-center outline-none focus:border-brand-active0" />
//                               <button onClick={() => handleRemoveItem(idx)} className="text-slate-400 hover:text-red-500">
//                                 <Trash2 size={16} />
//                               </button>
//                             </div>
//                           </div>
//                           {cat && (
//                             <div className="flex flex-wrap gap-1 mt-2">
//                               {ITEM_STOCK_DEPARTMENTS.map(dept => {
//                                 const qty = getItemDeptStock(cat, dept);
//                                 const isSource = dept === reqSourceLocation;
//                                 return (
//                                   <span
//                                     key={dept}
//                                     className={`text-[9px] font-black px-1.5 py-0.5 rounded border tracking-tight ${
//                                       isSource
//                                         ? qty > 0 ? "bg-emerald-600 text-white border-emerald-600" : "bg-red-500 text-white border-red-500"
//                                         : qty > 0 ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-50 text-slate-300 border-slate-100"
//                                     }`}
//                                     title={`${formatDepartmentLabel(dept)}: ${qty} ${cat.unit_name || ""}`}
//                                   >
//                                     {dept}: {qty}
//                                   </span>
//                                 );
//                               })}
//                             </div>
//                           )}
//                        </div>
//                        );
//                      })}
//                    </div>
//                  )}
//               </div>
//             </div>

//             <div className="px-10 py-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
//               <button
//                 onClick={() => setShowModal(false)}
//                 className="px-6 py-2.5 text-sm font-black text-slate-400 uppercase tracking-widest"
//               >
//                 Discard
//               </button>
//               <button
//                 onClick={submitRequisition}
//                 disabled={processingId !== null}
//                 className="bg-brand-primary text-white px-10 py-4 rounded-[20px] font-black hover:bg-brand-primary shadow-xl shadow-brand-active transition-all flex items-center gap-2 uppercase tracking-widest text-xs disabled:opacity-50"
//               >
//                 {processingId === -1 ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />} 
//                 Submit Requisition
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Approve Modal */}
//       {showApproveModal && (
//         <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
//           <div
//             className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
//             onClick={() => !processingId && setShowApproveModal(null)}
//           />
//           <div className="relative bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
//             <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
//               <div className="flex items-center gap-3">
//                 <div className="p-2 bg-brand-primary text-white rounded-xl shadow-lg">
//                   <Send size={20} />
//                 </div>
//                 <div>
//                   <h2 className="text-xl font-bold text-slate-800 tracking-tight">
//                     Approve Stock Transfer
//                   </h2>
//                   <p className="text-xs text-brand-primary font-bold uppercase tracking-widest">
//                     REQ {showApproveModal.request_number}
//                   </p>
//                 </div>
//               </div>
//               <button
//                 disabled={processingId !== null}
//                 onClick={() => setShowApproveModal(null)}
//                 className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
//               >
//                 <X size={20} />
//               </button>
//             </div>

//             <div className="p-10 flex-1 overflow-y-auto no-scrollbar pb-6 space-y-6">
//                <div className="grid grid-cols-2 gap-4">
//                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
//                     <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Source</p>
//                     <p className="text-sm font-black text-slate-800 mt-1">{formatDepartmentLabel(showApproveModal.source_location)}</p>
//                  </div>
//                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
//                     <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Destination</p>
//                     <p className="text-sm font-black text-slate-800 mt-1">{formatDepartmentLabel(showApproveModal.destination_location)}</p>
//                  </div>
//                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
//                     <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Requested By</p>
//                     <p className="text-sm font-black text-slate-800 mt-1">{showApproveModal.requester_name}</p>
//                  </div>
//                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
//                     <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Type</p>
//                     <p className="text-sm font-black text-slate-800 mt-1">{showApproveModal.requisition_type || "—"}</p>
//                  </div>
//                  {showApproveModal.date_required && (
//                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
//                       <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Date Required</p>
//                       <p className="text-sm font-black text-slate-800 mt-1">{showApproveModal.date_required}</p>
//                    </div>
//                  )}
//                  {showApproveModal.reason && (
//                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
//                       <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Reason</p>
//                       <p className="text-sm font-black text-slate-800 mt-1">{showApproveModal.reason}</p>
//                    </div>
//                  )}
//                </div>

//                <div className="space-y-4 pt-4 border-t border-slate-100">
//                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Approve Line Items</h4>
//                  {approveItems.length === 0 ? (
//                     <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-amber-600 text-xs font-bold text-center">
//                        No detailed items provided by backend for this request.
//                     </div>
//                  ) : (
//                    <div className="space-y-3">
//                      {approveItems.map((ai, index) => (
//                         <div key={index} className="flex items-center justify-between bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
//                            <div className="flex-1 pr-4">
//                              <p className="text-sm font-bold text-slate-800 truncate">{ai.item_name}</p>
//                              <div className="flex items-center gap-4 mt-1">
//                                <p className="text-[10px] font-black text-slate-400 uppercase">Requested: <span className="text-brand-primary">{ai.requested_qty}</span> Units</p>
//                                <p className="text-[10px] font-black text-slate-400 uppercase border-l border-slate-200 pl-4">Source Stock: <span className="text-emerald-600">{ai.current_source_stock}</span></p>
//                              </div>
//                            </div>
//                            <div className="w-32">
//                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Approved QTY</label>
//                              <input type="number" value={ai.approved_qty} onChange={e => handleApproveQtyChange(index, parseInt(e.target.value)||0)}
//                                 className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-lg font-black text-center focus:border-brand-active0 outline-none transition-all" />
//                            </div>
//                         </div>
//                      ))}
//                    </div>
//                  )}
//                </div>
//             </div>

//             <div className="px-10 py-6 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
//                <button
//                   onClick={submitApproval}
//                   disabled={processingId !== null}
//                   className="bg-brand-primary text-white px-10 py-4 rounded-[20px] font-black hover:bg-brand-primary shadow-xl shadow-brand-active transition-all flex items-center gap-2 uppercase tracking-widest text-xs disabled:opacity-50"
//                >
//                  {processingId === showApproveModal.id ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
//                  Confirm Approval
//                </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* View Details Modal */}
//       {showViewModal && (
//         <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
//           <div
//             className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
//             onClick={() => setShowViewModal(null)}
//           />
//           <div className="relative bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
//             <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
//               <div className="flex items-center gap-3">
//                 <div className="p-2 bg-slate-200 text-slate-600 rounded-xl shadow-lg">
//                   <FileText size={20} />
//                 </div>
//                 <div>
//                   <h2 className="text-xl font-bold text-slate-800 tracking-tight">
//                     Requisition Details
//                   </h2>
//                   <p className="text-xs text-brand-primary font-bold uppercase tracking-widest">
//                     REQ {showViewModal.request_number}
//                   </p>
//                 </div>
//               </div>
//               <button
//                 onClick={() => setShowViewModal(null)}
//                 className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
//               >
//                 <X size={20} />
//               </button>
//             </div>

//             <div className="p-10 flex-1 overflow-y-auto no-scrollbar pb-6 space-y-6">
//                <div className="grid grid-cols-2 gap-4">
//                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
//                     <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Source</p>
//                     <p className="text-sm font-black text-slate-800 mt-1">{formatDepartmentLabel(showViewModal.source_location)}</p>
//                  </div>
//                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
//                     <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Destination</p>
//                     <p className="text-sm font-black text-slate-800 mt-1">{formatDepartmentLabel(showViewModal.destination_location)}</p>
//                  </div>
//                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
//                     <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Type</p>
//                     <p className="text-sm font-black text-slate-800 mt-1">{showViewModal.requisition_type || "—"}</p>
//                  </div>
//                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
//                     <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Status</p>
//                     <p className={`text-sm font-black mt-1 ${
//                         showViewModal.status === 'APPROVED' ? 'text-emerald-600' :
//                         showViewModal.status === 'PENDING' ? 'text-amber-600' :
//                         showViewModal.status === 'REJECTED' || showViewModal.status === 'CANCELLED' ? 'text-red-600' :
//                         'text-brand-primary'
//                     }`}>{showViewModal.status}</p>
//                  </div>
//                  {showViewModal.date_required && (
//                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
//                       <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Date Required</p>
//                       <p className="text-sm font-black text-slate-800 mt-1">{showViewModal.date_required}</p>
//                    </div>
//                  )}
//                  {showViewModal.patient_name && (
//                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
//                       <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Patient</p>
//                       <p className="text-sm font-black text-slate-800 mt-1">{showViewModal.patient_name}{showViewModal.mrn ? ` (${showViewModal.mrn})` : ""}</p>
//                    </div>
//                  )}
//                </div>

//                {showViewModal.reason && (
//                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mt-2">
//                     <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">Reason</p>
//                     <p className="text-xs font-semibold text-slate-700">{showViewModal.reason}</p>
//                  </div>
//                )}

//                {showViewModal.remarks && (
//                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mt-2">
//                     <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">Remarks</p>
//                     <p className="text-xs font-semibold text-slate-700">{showViewModal.remarks}</p>
//                  </div>
//                )}

//                <div className="space-y-4 pt-4 border-t border-slate-100">
//                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Requested Items</h4>
//                  {viewItems.length === 0 ? (
//                     <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-amber-600 text-xs font-bold text-center">
//                        No detailed items provided by backend for this request.
//                     </div>
//                  ) : (
//                    <div className="space-y-3">
//                      {viewItems.map((vi, index) => (
//                         <div key={index} className="flex flex-col bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
//                            <p className="text-sm font-bold text-slate-800">{vi.item_name}</p>
//                            <div className="flex items-center gap-6 mt-3 pt-3 border-t border-slate-100">
//                              <div>
//                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Requested</p>
//                                <p className="text-sm font-black text-brand-primary mt-0.5">{parseFloat(vi.requested_qty || 0)} <span className="text-[10px] text-slate-400">Units</span></p>
//                              </div>
//                              {(showViewModal.status === 'APPROVED' || showViewModal.status === 'PARTIAL') && (
//                                <div>
//                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Approved</p>
//                                  <p className="text-sm font-black text-emerald-600 mt-0.5">{parseFloat(vi.approved_qty || 0)} <span className="text-[10px] text-slate-400">Units</span></p>
//                                </div>
//                              )}
//                            </div>
//                         </div>
//                      ))}
//                    </div>
//                  )}
//                </div>
//             </div>

//             <div className="px-10 py-6 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
//                <button
//                   onClick={() => setShowViewModal(null)}
//                   className="bg-slate-900 text-white px-8 py-3 rounded-[20px] text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 shadow-lg shadow-slate-200 transition-all flex items-center gap-2"
//                >
//                  Close
//                </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default DepartmentRequisitions;
