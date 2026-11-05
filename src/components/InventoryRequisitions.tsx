"use client";
import React, { useState, useEffect, useMemo } from "react";
import {
  ClipboardList,
  Plus,
  Search,
  X,
  CheckCircle2,
  MapPin,
  Clock,
  Loader2,
  Filter,
  Send,
  AlertCircle,
  FileText,
  Trash2,
} from "lucide-react";
import { inventoryService, RequisitionDepartment, RequisitionType, formatDepartmentLabel, ITEM_STOCK_DEPARTMENTS, getItemDeptStock } from "../services/inventory.service";
import { useNotification } from "../context/NotificationContext";

const REQUISITION_TYPES: RequisitionType[] = ["GENERAL", "PATIENT_SPECIFIC", "EMERGENCY"];

interface ReqItem {
  id?: number;
  item_id: number;
  item_name?: string;
  quantity: number;
  approved_qty?: number;
  current_source_stock?: string;
  requested_qty?: number;
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

const DEPARTMENTS: RequisitionDepartment[] = [
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

// Added userDepartment prop so the component knows which department is logged in
interface Props {
  userDepartment?: RequisitionDepartment;
}

const InventoryRequisitions: React.FC<Props> = ({ userDepartment = "STORE" }) => {
  const { notify } = useNotification();
  const [showModal, setShowModal] = useState(false);
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  // Raise Request Form
  const [reqSourceLocation, setReqSourceLocation] = useState<RequisitionDepartment>("STORE");
  const [reqDept, setReqDept] = useState<RequisitionDepartment>(DEPARTMENTS[1]);
  const [reqType, setReqType] = useState<RequisitionType>("GENERAL");
  const [reqDateRequired, setReqDateRequired] = useState("");
  const [reqReason, setReqReason] = useState("");
  const [reqRemarks, setReqRemarks] = useState("");
  const [reqItems, setReqItems] = useState<{ item_id: number; item_name: string; quantity: number; catalogItem?: any }[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  // Approve Request Modal
  const [showApproveModal, setShowApproveModal] = useState<Requisition | null>(null);
  const [approveItems, setApproveItems] = useState<{ item_id: number; approved_qty: number; item_name?: string; requested_qty?: number; current_source_stock?: string }[]>([]);

  useEffect(() => {
    fetchRequisitions();
  }, []);

  // Fetch catalog specifically for the selected Source Location
  useEffect(() => {
    fetchCatalog(reqSourceLocation);
    setReqItems([]); 
  }, [reqSourceLocation]);

  useEffect(() => {
    if (reqSourceLocation === reqDept) {
      const nextDept = DEPARTMENTS.find(d => d !== reqSourceLocation);
      if (nextDept) setReqDept(nextDept);
    }
  }, [reqSourceLocation, reqDept]);

  const fetchRequisitions = async () => {
    setLoading(true);
    try {
      const data = await inventoryService.getRequisitions({ department: userDepartment }); // ✅ Fix
      // THE FIX: Pass the department here to trigger the backend SQL filter!
      // const data = await inventoryService.getRequisitions(userDepartment);
      setRequisitions(data);
    } catch (err) {
      notify("Failed to load requisitions", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchCatalog = async (location: string) => {
    setLoadingCatalog(true);
    try {
      // @ts-ignore - bypassing until service is updated
      const items = await (inventoryService as any).searchItems(location);
      setCatalogItems(items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCatalog(false);
    }
  };

  const handleAddItem = (catalogItem: any) => {
    if (reqItems.find((i) => i.item_id === catalogItem.item_id)) {
      notify("Item already added", "error");
      return;
    }
    setReqItems([...reqItems, { item_id: catalogItem.item_id, item_name: catalogItem.name, quantity: 1, catalogItem }]);
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
    setProcessingId(-1);
    try {
      await inventoryService.createRequisition({
        source_location: reqSourceLocation,
        destination_location: reqDept,
        requisition_type: reqType,
        date_required: reqDateRequired || undefined,
        reason: reqReason || undefined,
        remarks: reqRemarks,
        items: reqItems.map((i) => ({ item_id: i.item_id, quantity: i.quantity })),
      });
      notify("Requisition raised successfully", "success");
      setShowModal(false);
      setReqSourceLocation("STORE");
      setReqDept(DEPARTMENTS[1]);
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
        current_source_stock: i.current_source_stock || "0"
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
        items: approveItems.map(i => ({ item_id: i.item_id, approved_qty: i.approved_qty }))
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
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">

      <div className="bg-white border border-slate-200 rounded-[44px] overflow-hidden shadow-sm">
        {/* HEADER SECTION */}
        <div className="p-4 md:p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col lg:flex-row lg:items-center gap-6 justify-between">
          
          <div className="w-full lg:w-auto">
            <h2 className="font-black text-slate-800 tracking-tight flex items-center gap-2 text-lg md:text-xl">
              <ClipboardList size={20} className="text-brand-primary shrink-0" />
              Internal Requisitions Queue
            </h2>
            <p className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
              Inter-departmental stock transfer management
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 w-full lg:w-auto lg:flex-1 lg:max-w-2xl">
            <div className="bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-200/60 shadow-sm flex flex-col justify-center">
              <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Awaiting Approval
              </p>
              <p className="text-lg sm:text-2xl font-bold text-amber-600 mt-1">
                {requisitions.filter((r) => r.status === "PENDING").length}
              </p>
            </div>

            <div className="bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-200/60 shadow-sm flex flex-col justify-center">
              <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Approved
              </p>
              <p className="text-lg sm:text-2xl font-bold text-brand-primary mt-1">
                {requisitions.filter((r) => r.status === "APPROVED").length}
              </p>
            </div>

            <div className="col-span-2 md:col-span-1 bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-200/60 shadow-sm flex flex-row md:flex-col items-center md:items-start justify-between md:justify-center">
              <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Total Requests
              </p>
              <p className="text-lg sm:text-2xl font-bold text-slate-800 md:mt-1">
                {requisitions.length}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto">
            <button
              onClick={() => setShowModal(true)}
              className="flex-1 sm:flex-none bg-brand-primary text-white px-6 md:px-8 py-3 rounded-xl md:rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-brand-primary transition-all shadow-lg shadow-brand-active active:scale-95 text-[10px] md:text-xs uppercase tracking-widest whitespace-nowrap"
            >
              <Plus size={18} /> Raise Request
            </button>
            
            <button className="p-3 bg-white border border-slate-200 rounded-xl md:rounded-2xl text-slate-400 hover:text-brand-primary hover:border-brand-primary transition-all shrink-0">
              <Filter size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[100vh]">
          {loading ? (
             <div className="flex flex-col items-center justify-center p-20 text-slate-400">
               <Loader2 size={40} className="animate-spin text-brand-primary mb-4" />
               <p className="text-xs font-black uppercase tracking-widest">Loading Requisitions...</p>
             </div>
          ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="px-8 py-5">Req No & Time</th>
                <th className="px-8 py-5">Department</th>
                <th className="px-8 py-5">Remarks & Requester</th>
                <th className="px-8 py-5 text-center">Status</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {requisitions.map((req) => (
                <tr
                  key={req.id}
                  className="hover:bg-slate-50/50 transition-colors"
                >
                  <td className="px-8 py-6">
                    <p className="text-sm font-black text-slate-800 font-mono">
                      {req.request_number}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mt-1">
                      <Clock size={12} /> {req.requested_at}
                    </p>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-brand-active text-brand-primary rounded-lg">
                        <MapPin size={14} />
                      </div>
                      <p className="text-xs font-black text-slate-700">
                        {formatDepartmentLabel(req.source_location)} <span className="text-slate-300">→</span> {formatDepartmentLabel(req.destination_location)}
                      </p>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                       <FileText size={14} className="text-slate-400" />
                       <span className="text-sm font-medium text-slate-700">{req.remarks || "No remarks"}</span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 pl-5">
                      BY: {req.requester_name}
                    </p>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <span className={`inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border
                      ${req.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        req.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                        req.status === 'REJECTED' || req.status === 'CANCELLED' ? 'bg-red-50 text-red-600 border-red-100' :
                        'bg-brand-active text-brand-primary border-brand-active'
                      }
                    `}>
                      {req.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    {req.status === "APPROVED" ? (
                      <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center justify-end gap-1.5">
                        <CheckCircle2 size={14} /> Processed
                      </span>
                    ) : req.status === "PENDING" ? (
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => handleOpenApprove(req)}
                          disabled={processingId === req.id}
                          className="bg-brand-primary text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-primary shadow-lg shadow-brand-active transition-all flex items-center gap-2"
                        >
                          {processingId === req.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Send size={14} />
                          )}
                          Approve
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {req.status}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {requisitions.length === 0 && (
                <tr>
                   <td colSpan={5} className="py-16 text-center text-slate-400">
                     <ClipboardList size={40} className="mx-auto opacity-20 mb-4" />
                     <p className="text-xs font-bold uppercase tracking-widest">No Requisitions Found</p>
                   </td>
                </tr>
              )}
            </tbody>
          </table>
          )}
        </div>
      </div>

      {/* Info Block */}
      <div className="bg-brand-active border border-brand-active p-8 rounded-[40px] flex items-start gap-4 mt-8">
        <div className="p-3 bg-white text-brand-primary rounded-2xl shadow-sm border border-brand-active flex-shrink-0">
          <AlertCircle size={24} />
        </div>
        <div>
          <h4 className="text-lg font-black text-brand-primary tracking-tight uppercase">
            Transfer Policy
          </h4>
          <p className="text-sm text-brand-primary/80 leading-relaxed font-medium mt-1">
            Approving stock automatically transfers custodial responsibility from
            the MAIN STORE to the destination sub-store. The departmental head
            at the destination unit will be required to acknowledge the digital
            GRN upon physical arrival of goods.
          </p>
        </div>
      </div>

      {/* Raise Request Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          <div className="relative bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-primary text-white rounded-xl shadow-lg">
                  <ClipboardList size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800 tracking-tight">
                    Internal Stock Request
                  </h2>
                  <p className="text-xs text-brand-primary font-bold uppercase tracking-widest">
                    Unit Requisition
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-10 space-y-8 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Source Location (Requesting From)
                  </label>
                  <select
                    value={reqSourceLocation}
                    onChange={e => setReqSourceLocation(e.target.value as RequisitionDepartment)}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none appearance-none cursor-pointer"
                  >
                    {DEPARTMENTS.filter(d => d !== reqDept).map(d => <option key={d} value={d}>{formatDepartmentLabel(d)}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Destination (Deliver To)
                  </label>
                  <select
                    value={reqDept}
                    onChange={e => setReqDept(e.target.value as RequisitionDepartment)}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none appearance-none cursor-pointer"
                  >
                    {DEPARTMENTS.filter(d => d !== reqSourceLocation).map(d => <option key={d} value={d}>{formatDepartmentLabel(d)}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Requisition Type
                  </label>
                  <select
                    value={reqType}
                    onChange={e => setReqType(e.target.value as RequisitionType)}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none appearance-none cursor-pointer"
                  >
                    {REQUISITION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Date Required
                  </label>
                  <input
                    type="date"
                    value={reqDateRequired}
                    onChange={e => setReqDateRequired(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Reason
                </label>
                <input
                  type="text"
                  value={reqReason}
                  onChange={e => setReqReason(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:bg-white transition-all"
                  placeholder="Reason for requisition..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Remarks
                </label>
                <textarea
                  rows={2}
                  value={reqRemarks}
                  onChange={e => setReqRemarks(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none resize-none focus:bg-white transition-all"
                  placeholder="Additional remarks..."
                ></textarea>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-4">
                 <h4 className="text-sm font-black text-slate-800 tracking-tight uppercase">Requested Items</h4>
                 
                 <div className="relative group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-brand-active0" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search to add items..."
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white focus:border-brand-primary outline-none transition-all"
                    />
                    {searchQuery && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-10 max-h-96 overflow-y-auto">
                         {filteredCatalog.map(cat => (
                           <div key={cat.item_id}
                                onClick={() => handleAddItem(cat)}
                                className="px-5 py-3.5 hover:bg-slate-50 border-b border-slate-50 last:border-b-0 cursor-pointer group/row">
                             <div className="flex items-start justify-between gap-3">
                               <div className="min-w-0">
                                 <div className="flex items-center gap-2 flex-wrap">
                                   <p className="text-sm font-black text-slate-800">{cat.name}</p>
                                   {cat.item_type && (
                                     <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 tracking-wider">{cat.item_type}</span>
                                   )}
                                   {cat.is_low_stock === 1 && (
                                     <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 tracking-wider">Low Stock</span>
                                   )}
                                 </div>
                                 <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                   {cat.items_uhid}{cat.brand ? ` • ${cat.brand}` : ""}{cat.strength ? ` • ${cat.strength}` : ""}{cat.unit_name ? ` • ${cat.unit_name}` : ""}
                                 </p>
                               </div>
                               <div className="text-right shrink-0">
                                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Global</p>
                                 <p className="text-sm font-black text-slate-700">{parseFloat(cat.quantity || cat.global_stock || "0")}</p>
                               </div>
                               <button className="shrink-0 p-1.5 rounded-lg bg-brand-active text-brand-primary group-hover/row:bg-brand-primary group-hover/row:text-white transition-colors">
                                 <Plus size={14} />
                               </button>
                             </div>
                             <div className="flex flex-wrap gap-1 mt-2">
                               {ITEM_STOCK_DEPARTMENTS.map(dept => {
                                 const qty = getItemDeptStock(cat, dept);
                                 const isSource = dept === reqSourceLocation;
                                 return (
                                   <span
                                     key={dept}
                                     className={`text-[9px] font-black px-1.5 py-0.5 rounded border tracking-tight ${
                                       isSource
                                         ? qty > 0 ? "bg-emerald-600 text-white border-emerald-600" : "bg-red-500 text-white border-red-500"
                                         : qty > 0 ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-50 text-slate-300 border-slate-100"
                                     }`}
                                     title={`${formatDepartmentLabel(dept)}: ${qty} ${cat.unit_name || ""}`}
                                   >
                                     {dept}: {qty}
                                   </span>
                                 );
                               })}
                             </div>
                           </div>
                         ))}
                         {filteredCatalog.length === 0 && (
                           <div className="px-5 py-3 text-xs text-slate-400 italic font-medium">No items found matching "{searchQuery}"</div>
                         )}
                      </div>
                    )}
                 </div>

                 {reqItems.length > 0 && (
                   <div className="bg-slate-50 rounded-[24px] p-2 border border-slate-200 space-y-2">
                     {reqItems.map((item, idx) => {
                       const cat = item.catalogItem;
                       return (
                       <div key={idx} className="p-3.5 bg-white rounded-[16px] shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-black text-slate-800">{item.item_name}</p>
                                {cat?.item_type && (
                                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 tracking-wider">{cat.item_type}</span>
                                )}
                              </div>
                              {cat && (
                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                  {cat.items_uhid}{cat.brand ? ` • ${cat.brand}` : ""}{cat.strength ? ` • ${cat.strength}` : ""}{cat.unit_name ? ` • ${cat.unit_name}` : ""}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <input type="number" value={item.quantity} min={1} onChange={e => handleQuantityChange(idx, parseInt(e.target.value) || 1)}
                                className="w-20 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-center outline-none focus:border-brand-active0" />
                              <button onClick={() => handleRemoveItem(idx)} className="text-slate-400 hover:text-red-500">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                       </div>
                       );
                     })}
                   </div>
                 )}
              </div>
            </div>

            <div className="px-10 py-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-2.5 text-sm font-black text-slate-400 uppercase tracking-widest"
              >
                Discard
              </button>
              <button
                onClick={submitRequisition}
                disabled={processingId !== null}
                className="bg-brand-primary text-white px-10 py-4 rounded-[20px] font-black hover:bg-brand-primary shadow-xl shadow-brand-active transition-all flex items-center gap-2 uppercase tracking-widest text-xs disabled:opacity-50"
              >
                {processingId === -1 ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />} 
                Submit Requisition
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => !processingId && setShowApproveModal(null)}
          />
          <div className="relative bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-primary text-white rounded-xl shadow-lg">
                  <Send size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800 tracking-tight">
                    Approve Stock Transfer
                  </h2>
                  <p className="text-xs text-brand-primary font-bold uppercase tracking-widest">
                    REQ {showApproveModal.request_number}
                  </p>
                </div>
              </div>
              <button
                disabled={processingId !== null}
                onClick={() => setShowApproveModal(null)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-10 flex-1 overflow-y-auto no-scrollbar pb-6 space-y-6">
               <div className="grid grid-cols-2 gap-4">
                 <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Source</p>
                    <p className="text-sm font-black text-slate-800 mt-1">{formatDepartmentLabel(showApproveModal.source_location)}</p>
                 </div>
                 <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Destination</p>
                    <p className="text-sm font-black text-slate-800 mt-1">{formatDepartmentLabel(showApproveModal.destination_location)}</p>
                 </div>
                 <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Requested By</p>
                    <p className="text-sm font-black text-slate-800 mt-1">{showApproveModal.requester_name}</p>
                 </div>
                 <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Type</p>
                    <p className="text-sm font-black text-slate-800 mt-1">{showApproveModal.requisition_type || "—"}</p>
                 </div>
                 {showApproveModal.date_required && (
                   <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Date Required</p>
                      <p className="text-sm font-black text-slate-800 mt-1">{showApproveModal.date_required}</p>
                   </div>
                 )}
                 {showApproveModal.reason && (
                   <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Reason</p>
                      <p className="text-sm font-black text-slate-800 mt-1">{showApproveModal.reason}</p>
                   </div>
                 )}
               </div>

               <div className="space-y-4 pt-4 border-t border-slate-100">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Approve Line Items</h4>
                 {approveItems.length === 0 ? (
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-amber-600 text-xs font-bold text-center">
                       No detailed items provided by backend for this request.
                    </div>
                 ) : (
                   <div className="space-y-3">
                     {approveItems.map((ai, index) => (
                        <div key={index} className="flex items-center justify-between bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
                           <div className="flex-1 pr-4">
                             <p className="text-sm font-bold text-slate-800 truncate">{ai.item_name}</p>
                             <div className="flex items-center gap-4 mt-1">
                               <p className="text-[10px] font-black text-slate-400 uppercase">Requested: <span className="text-brand-primary">{ai.requested_qty}</span> Units</p>
                               <p className="text-[10px] font-black text-slate-400 uppercase border-l border-slate-200 pl-4">Source Stock: <span className="text-emerald-600">{ai.current_source_stock}</span></p>
                             </div>
                           </div>
                           <div className="w-32">
                             <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Approved QTY</label>
                             <input type="number" value={ai.approved_qty} onChange={e => handleApproveQtyChange(index, parseInt(e.target.value)||0)}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-lg font-black text-center focus:border-brand-active0 outline-none transition-all" />
                           </div>
                        </div>
                     ))}
                   </div>
                 )}
               </div>
            </div>

            <div className="px-10 py-6 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
               <button
                  disabled={processingId !== null}
                  onClick={() => setShowApproveModal(null)}
                  className="px-6 py-3 text-xs font-black text-slate-400 hover:text-slate-800 uppercase tracking-widest mr-4"
               >
                 Cancel
               </button>
               <button
                  disabled={processingId !== null || approveItems.length === 0}
                  onClick={submitApproval}
                  className="bg-brand-primary text-white px-8 py-3 rounded-[20px] text-[10px] font-black uppercase tracking-widest hover:bg-brand-primary shadow-lg shadow-brand-active transition-all flex items-center gap-2 disabled:opacity-50"
               >
                 {processingId === showApproveModal.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} 
                 Confirm Approval
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryRequisitions;






// "use client";
// import React, { useState, useEffect, useMemo } from "react";
// import {
//   ClipboardList,
//   Plus,
//   Search,
//   X,
//   CheckCircle2,
//   MapPin,
//   Clock,
//   Loader2,
//   Filter,
//   Send,
//   AlertCircle,
//   FileText,
//   Trash2,
// } from "lucide-react";
// import { inventoryService, RequisitionDepartment, RequisitionType, formatDepartmentLabel, ITEM_STOCK_DEPARTMENTS, getItemDeptStock } from "../services/inventory.service";
// import { useNotification } from "../context/NotificationContext";

// const REQUISITION_TYPES: RequisitionType[] = ["GENERAL", "PATIENT_SPECIFIC", "EMERGENCY"];

// interface ReqItem {
//   id?: number;
//   item_id: number;
//   item_name?: string;
//   quantity: number;
//   approved_qty?: number;
//   current_source_stock?: string;
//   requested_qty?: number;
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

// const DEPARTMENTS: RequisitionDepartment[] = [
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

// const InventoryRequisitions: React.FC = () => {
//   const { notify } = useNotification();
//   const [showModal, setShowModal] = useState(false);
//   const [requisitions, setRequisitions] = useState<Requisition[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [processingId, setProcessingId] = useState<number | null>(null);

//   // Raise Request Form
//   const [reqSourceLocation, setReqSourceLocation] = useState<RequisitionDepartment>("STORE");
//   const [reqDept, setReqDept] = useState<RequisitionDepartment>(DEPARTMENTS[1]);
//   const [reqType, setReqType] = useState<RequisitionType>("GENERAL");
//   const [reqDateRequired, setReqDateRequired] = useState("");
//   const [reqReason, setReqReason] = useState("");
//   const [reqRemarks, setReqRemarks] = useState("");
//   const [reqItems, setReqItems] = useState<{ item_id: number; item_name: string; quantity: number; catalogItem?: any }[]>([]);
//   const [searchQuery, setSearchQuery] = useState("");
//   const [catalogItems, setCatalogItems] = useState<any[]>([]);
//   const [loadingCatalog, setLoadingCatalog] = useState(false);

//   // Approve Request Modal
//   const [showApproveModal, setShowApproveModal] = useState<Requisition | null>(null);
//   // const [approveItems, setApproveItems] = useState<{ item_id: number; approved_qty: number; item_name?: string; requested_qty?: number }[]>([]);
//   const [approveItems, setApproveItems] = useState<{ item_id: number; approved_qty: number; item_name?: string; requested_qty?: number; current_source_stock?: string }[]>([]);

//   useEffect(() => {
//     fetchRequisitions();
//   }, []);

//   // Fetch catalog specifically for the selected Source Location
//   useEffect(() => {
//     fetchCatalog(reqSourceLocation);
//     // Clear items if the source location changes to prevent requesting items that aren't there
//     setReqItems([]); 
//   }, [reqSourceLocation]);

//   useEffect(() => {
//     if (reqSourceLocation === reqDept) {
//       const nextDept = DEPARTMENTS.find(d => d !== reqSourceLocation);
//       if (nextDept) setReqDept(nextDept);
//     }
//   }, [reqSourceLocation, reqDept]);

//   const fetchRequisitions = async () => {
//     setLoading(true);
//     try {
//       const data = await inventoryService.getRequisitions();
//       setRequisitions(data);
//     } catch (err) {
//       notify("Failed to load requisitions", "error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // const fetchCatalog = async (location: string) => {
//   //   setLoadingCatalog(true);
//   //   try {
//   //     const items = await inventoryService.searchItems(location);
//   //     setCatalogItems(items);
//   const fetchCatalog = async (location: string) => {
//     setLoadingCatalog(true);
//     try {
//       // @ts-ignore - bypassing strict type check until inventory.service.ts is updated
//       const items = await (inventoryService as any).searchItems(location);
//       setCatalogItems(items);
//     } catch (err) {
//       console.error(err);
//     } finally {
//       setLoadingCatalog(false);
//     }
//   };

//   const handleAddItem = (catalogItem: any) => {
//     if (reqItems.find((i) => i.item_id === catalogItem.item_id)) {
//       notify("Item already added", "error");
//       return;
//     }
//     setReqItems([...reqItems, { item_id: catalogItem.item_id, item_name: catalogItem.name, quantity: 1, catalogItem }]);
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
//     setProcessingId(-1);
//     try {
//       await inventoryService.createRequisition({
//         source_location: reqSourceLocation,
//         destination_location: reqDept,
//         requisition_type: reqType,
//         date_required: reqDateRequired || undefined,
//         reason: reqReason || undefined,
//         remarks: reqRemarks,
//         items: reqItems.map((i) => ({ item_id: i.item_id, quantity: i.quantity })),
//       });
//       notify("Requisition raised successfully", "success");
//       setShowModal(false);
//       setReqSourceLocation("STORE");
//       setReqDept(DEPARTMENTS[1]);
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
//         current_source_stock: i.current_source_stock || "0"
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
//         items: approveItems.map(i => ({ item_id: i.item_id, approved_qty: i.approved_qty }))
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

//       <div className="bg-white border border-slate-200 rounded-[44px] overflow-hidden shadow-sm">
//         {/* HEADER SECTION */}
//         <div className="p-4 md:p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col lg:flex-row lg:items-center gap-6 justify-between">
          
//           <div className="w-full lg:w-auto">
//             <h2 className="font-black text-slate-800 tracking-tight flex items-center gap-2 text-lg md:text-xl">
//               <ClipboardList size={20} className="text-brand-primary shrink-0" />
//               Internal Requisitions Queue
//             </h2>
//             <p className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
//               Inter-departmental stock transfer management
//             </p>
//           </div>

//           <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 w-full lg:w-auto lg:flex-1 lg:max-w-2xl">
//             <div className="bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-200/60 shadow-sm flex flex-col justify-center">
//               <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider">
//                 Awaiting Approval
//               </p>
//               <p className="text-lg sm:text-2xl font-bold text-amber-600 mt-1">
//                 {requisitions.filter((r) => r.status === "PENDING").length}
//               </p>
//             </div>

//             <div className="bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-200/60 shadow-sm flex flex-col justify-center">
//               <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider">
//                 Approved
//               </p>
//               <p className="text-lg sm:text-2xl font-bold text-brand-primary mt-1">
//                 {requisitions.filter((r) => r.status === "APPROVED").length}
//               </p>
//             </div>

//             <div className="col-span-2 md:col-span-1 bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-200/60 shadow-sm flex flex-row md:flex-col items-center md:items-start justify-between md:justify-center">
//               <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider">
//                 Total Requests
//               </p>
//               <p className="text-lg sm:text-2xl font-bold text-slate-800 md:mt-1">
//                 {requisitions.length}
//               </p>
//             </div>
//           </div>

//           <div className="flex items-center gap-3 w-full lg:w-auto">
//             <button
//               onClick={() => setShowModal(true)}
//               className="flex-1 sm:flex-none bg-brand-primary text-white px-6 md:px-8 py-3 rounded-xl md:rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-brand-primary transition-all shadow-lg shadow-brand-active active:scale-95 text-[10px] md:text-xs uppercase tracking-widest whitespace-nowrap"
//             >
//               <Plus size={18} /> Raise Request
//             </button>
            
//             <button className="p-3 bg-white border border-slate-200 rounded-xl md:rounded-2xl text-slate-400 hover:text-brand-primary hover:border-brand-primary transition-all shrink-0">
//               <Filter size={18} />
//             </button>
//           </div>
//         </div>

//         <div className="overflow-x-auto min-h-[100vh]">
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
//                 <th className="px-8 py-5">Department</th>
//                 <th className="px-8 py-5">Remarks & Requester</th>
//                 <th className="px-8 py-5 text-center">Status</th>
//                 <th className="px-8 py-5 text-right">Actions</th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-slate-50">
//               {requisitions.map((req) => (
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
//                     {req.status === "APPROVED" ? (
//                       <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center justify-end gap-1.5">
//                         <CheckCircle2 size={14} /> Processed
//                       </span>
//                     ) : req.status === "PENDING" ? (
//                       <div className="flex items-center justify-end gap-3">
//                         <button
//                           onClick={() => handleOpenApprove(req)}
//                           disabled={processingId === req.id}
//                           className="bg-brand-primary text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-primary shadow-lg shadow-brand-active transition-all flex items-center gap-2"
//                         >
//                           {processingId === req.id ? (
//                             <Loader2 size={14} className="animate-spin" />
//                           ) : (
//                             <Send size={14} />
//                           )}
//                           Approve
//                         </button>
//                       </div>
//                     ) : (
//                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
//                         {req.status}
//                       </span>
//                     )}
//                   </td>
//                 </tr>
//               ))}
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
//       </div>

//       {/* Info Block */}
//       <div className="bg-brand-active border border-brand-active p-8 rounded-[40px] flex items-start gap-4 mt-8">
//         <div className="p-3 bg-white text-brand-primary rounded-2xl shadow-sm border border-brand-active flex-shrink-0">
//           <AlertCircle size={24} />
//         </div>
//         <div>
//           <h4 className="text-lg font-black text-brand-primary tracking-tight uppercase">
//             Transfer Policy
//           </h4>
//           <p className="text-sm text-brand-primary/80 leading-relaxed font-medium mt-1">
//             Approving stock automatically transfers custodial responsibility from
//             the MAIN STORE to the destination sub-store. The departmental head
//             at the destination unit will be required to acknowledge the digital
//             GRN upon physical arrival of goods.
//           </p>
//         </div>
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
//                     Unit Requisition
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
//                     {DEPARTMENTS.filter(d => d !== reqDept).map(d => <option key={d} value={d}>{formatDepartmentLabel(d)}</option>)}
//                   </select>
//                 </div>

//                 <div className="space-y-2">
//                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
//                     Destination (Deliver To)
//                   </label>
//                   <select
//                     value={reqDept}
//                     onChange={e => setReqDept(e.target.value as RequisitionDepartment)}
//                     className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none appearance-none cursor-pointer"
//                   >
//                     {DEPARTMENTS.filter(d => d !== reqSourceLocation).map(d => <option key={d} value={d}>{formatDepartmentLabel(d)}</option>)}
//                   </select>
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
//                            <div key={cat.item_id}
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
//                                  <p className="text-sm font-black text-slate-700">{parseFloat(cat.quantity || cat.global_stock || "0")}</p>
//                                </div>
//                                <button className="shrink-0 p-1.5 rounded-lg bg-brand-active text-brand-primary group-hover/row:bg-brand-primary group-hover/row:text-white transition-colors">
//                                  <Plus size={14} />
//                                </button>
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
//                   disabled={processingId !== null}
//                   onClick={() => setShowApproveModal(null)}
//                   className="px-6 py-3 text-xs font-black text-slate-400 hover:text-slate-800 uppercase tracking-widest mr-4"
//                >
//                  Cancel
//                </button>
//                <button
//                   disabled={processingId !== null || approveItems.length === 0}
//                   onClick={submitApproval}
//                   className="bg-brand-primary text-white px-8 py-3 rounded-[20px] text-[10px] font-black uppercase tracking-widest hover:bg-brand-primary shadow-lg shadow-brand-active transition-all flex items-center gap-2 disabled:opacity-50"
//                >
//                  {processingId === showApproveModal.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} 
//                  Confirm Approval
//                </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default InventoryRequisitions;




// import React, { useState, useEffect, useMemo } from "react";
// import {
//   ClipboardList,
//   Plus,
//   Search,
//   X,
//   CheckCircle2,
//   MapPin,
//   Clock,
//   Loader2,
//   Filter,
//   Send,
//   AlertCircle,
//   FileText,
//   Trash2,
// } from "lucide-react";
// import { inventoryService, RequisitionDepartment, RequisitionType, formatDepartmentLabel, ITEM_STOCK_DEPARTMENTS, getItemDeptStock } from "../services/inventory.service";

// const REQUISITION_TYPES: RequisitionType[] = ["GENERAL", "PATIENT_SPECIFIC", "EMERGENCY"];
// import { useNotification } from "../context/NotificationContext";

// interface ReqItem {
//   id?: number;
//   item_id: number;
//   item_name?: string;
//   quantity: number;
//   approved_qty?: number;
//   current_source_stock?: string;
//   requested_qty?: number;
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

// const DEPARTMENTS: RequisitionDepartment[] = [
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

// const InventoryRequisitions: React.FC = () => {
//   const { notify } = useNotification();
//   const [showModal, setShowModal] = useState(false);
//   const [requisitions, setRequisitions] = useState<Requisition[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [processingId, setProcessingId] = useState<number | null>(null);

//   // Raise Request Form
//   const [reqSourceLocation, setReqSourceLocation] = useState<RequisitionDepartment>("STORE");
//   const [reqDept, setReqDept] = useState<RequisitionDepartment>(DEPARTMENTS[1]);
//   const [reqType, setReqType] = useState<RequisitionType>("GENERAL");
//   const [reqDateRequired, setReqDateRequired] = useState("");
//   const [reqReason, setReqReason] = useState("");
//   const [reqRemarks, setReqRemarks] = useState("");
//   const [reqItems, setReqItems] = useState<{ item_id: number; item_name: string; quantity: number; catalogItem?: any }[]>([]);
//   const [searchQuery, setSearchQuery] = useState("");
//   const [catalogItems, setCatalogItems] = useState<any[]>([]);
//   const [loadingCatalog, setLoadingCatalog] = useState(false);

//   // Approve Request Modal
//   const [showApproveModal, setShowApproveModal] = useState<Requisition | null>(null);
//   const [approveItems, setApproveItems] = useState<{ item_id: number; approved_qty: number; item_name?: string; requested_qty?: number }[]>([]);

//   useEffect(() => {
//     fetchRequisitions();
//     fetchCatalog();
//   }, []);

//   useEffect(() => {
//     if (reqSourceLocation === reqDept) {
//       const nextDept = DEPARTMENTS.find(d => d !== reqSourceLocation);
//       if (nextDept) setReqDept(nextDept);
//     }
//   }, [reqSourceLocation, reqDept]);

//   const fetchRequisitions = async () => {
//     setLoading(true);
//     try {
//       const data = await inventoryService.getRequisitions();
//       setRequisitions(data);
//     } catch (err) {
//       notify("Failed to load requisitions", "error");
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
//     setProcessingId(-1);
//     try {
//       await inventoryService.createRequisition({
//         source_location: reqSourceLocation,
//         destination_location: reqDept,
//         requisition_type: reqType,
//         date_required: reqDateRequired || undefined,
//         reason: reqReason || undefined,
//         remarks: reqRemarks,
//         items: reqItems.map((i) => ({ item_id: i.item_id, quantity: i.quantity })),
//       });
//       notify("Requisition raised successfully", "success");
//       setShowModal(false);
//       setReqSourceLocation("STORE");
//       setReqDept(DEPARTMENTS[0]);
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
//         current_source_stock: i.current_source_stock || "0"
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
//         items: approveItems.map(i => ({ item_id: i.item_id, approved_qty: i.approved_qty }))
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



//       <div className="bg-white border border-slate-200 rounded-[44px] overflow-hidden shadow-sm">
// {/* HEADER SECTION */}
//   <div className="p-4 md:p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col lg:flex-row lg:items-center gap-6 justify-between">
    
//     {/* Title Area */}
//     <div className="w-full lg:w-auto">
//       <h2 className="font-black text-slate-800 tracking-tight flex items-center gap-2 text-lg md:text-xl">
//         <ClipboardList size={20} className="text-brand-primary shrink-0" />
//         Internal Requisitions Queue
//       </h2>
//       <p className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
//         Inter-departmental stock transfer management
//       </p>
//     </div>

//     {/* Metrics Grid */}
//     <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 w-full lg:w-auto lg:flex-1 lg:max-w-2xl">
//       {/* Metric: Awaiting Approval */}
//       <div className="bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-200/60 shadow-sm flex flex-col justify-center">
//         <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider">
//           Awaiting Approval
//         </p>
//         <p className="text-lg sm:text-2xl font-bold text-amber-600 mt-1">
//           {requisitions.filter((r) => r.status === "PENDING").length}
//         </p>
//       </div>

//       {/* Metric: Approved */}
//       <div className="bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-200/60 shadow-sm flex flex-col justify-center">
//         <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider">
//           Approved
//         </p>
//         <p className="text-lg sm:text-2xl font-bold text-brand-primary mt-1">
//           {requisitions.filter((r) => r.status === "APPROVED").length}
//         </p>
//       </div>

//       {/* Metric: Total Requests */}
//       <div className="col-span-2 md:col-span-1 bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-200/60 shadow-sm flex flex-row md:flex-col items-center md:items-start justify-between md:justify-center">
//         <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider">
//           Total Requests
//         </p>
//         <p className="text-lg sm:text-2xl font-bold text-slate-800 md:mt-1">
//           {requisitions.length}
//         </p>
//       </div>
//     </div>

//     {/* Actions (Buttons) */}
//     <div className="flex items-center gap-3 w-full lg:w-auto">
//       <button
//         onClick={() => setShowModal(true)}
//         className="flex-1 sm:flex-none bg-brand-primary text-white px-6 md:px-8 py-3 rounded-xl md:rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-brand-primary transition-all shadow-lg shadow-brand-active active:scale-95 text-[10px] md:text-xs uppercase tracking-widest whitespace-nowrap"
//       >
//         <Plus size={18} /> Raise Request
//       </button>
      
//       <button className="p-3 bg-white border border-slate-200 rounded-xl md:rounded-2xl text-slate-400 hover:text-brand-primary hover:border-brand-primary transition-all shrink-0">
//         <Filter size={18} />
//       </button>
//     </div>
//   </div>


//         <div className="overflow-x-auto min-h-[100vh]">
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
//                 <th className="px-8 py-5">Department</th>
//                 <th className="px-8 py-5">Remarks & Requester</th>
//                 <th className="px-8 py-5 text-center">Status</th>
//                 <th className="px-8 py-5 text-right">Actions</th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-slate-50">
//               {requisitions.map((req) => (
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
//                     {req.status === "APPROVED" ? (
//                       <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center justify-end gap-1.5">
//                         <CheckCircle2 size={14} /> Processed
//                       </span>
//                     ) : req.status === "PENDING" ? (
//                       <div className="flex items-center justify-end gap-3">
//                         <button
//                           onClick={() => handleOpenApprove(req)}
//                           disabled={processingId === req.id}
//                           className="bg-brand-primary text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-primary shadow-lg shadow-brand-active transition-all flex items-center gap-2"
//                         >
//                           {processingId === req.id ? (
//                             <Loader2 size={14} className="animate-spin" />
//                           ) : (
//                             <Send size={14} />
//                           )}
//                           Approve
//                         </button>
//                       </div>
//                     ) : (
//                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
//                         {req.status}
//                       </span>
//                     )}
//                   </td>
//                 </tr>
//               ))}
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
//       </div>

//       {/* Info Block */}
//       <div className="bg-brand-active border border-brand-active p-8 rounded-[40px] flex items-start gap-4 mt-8">
//         <div className="p-3 bg-white text-brand-primary rounded-2xl shadow-sm border border-brand-active flex-shrink-0">
//           <AlertCircle size={24} />
//         </div>
//         <div>
//           <h4 className="text-lg font-black text-brand-primary tracking-tight uppercase">
//             Transfer Policy
//           </h4>
//           <p className="text-sm text-brand-primary/80 leading-relaxed font-medium mt-1">
//             Approving stock automatically transfers custodial responsibility from
//             the MAIN STORE to the destination sub-store. The departmental head
//             at the destination unit will be required to acknowledge the digital
//             GRN upon physical arrival of goods.
//           </p>
//         </div>
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
//                     Unit Requisition
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
//                     {DEPARTMENTS.filter(d => d !== reqDept).map(d => <option key={d} value={d}>{formatDepartmentLabel(d)}</option>)}
//                   </select>
//                 </div>

//                 <div className="space-y-2">
//                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
//                     Destination (Deliver To)
//                   </label>
//                   <select
//                     value={reqDept}
//                     onChange={e => setReqDept(e.target.value as RequisitionDepartment)}
//                     className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none appearance-none cursor-pointer"
//                   >
//                     {DEPARTMENTS.filter(d => d !== reqSourceLocation).map(d => <option key={d} value={d}>{formatDepartmentLabel(d)}</option>)}
//                   </select>
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
//                   disabled={processingId !== null}
//                   onClick={() => setShowApproveModal(null)}
//                   className="px-6 py-3 text-xs font-black text-slate-400 hover:text-slate-800 uppercase tracking-widest mr-4"
//                >
//                  Cancel
//                </button>
//                <button
//                   disabled={processingId !== null || approveItems.length === 0}
//                   onClick={submitApproval}
//                   className="bg-brand-primary text-white px-8 py-3 rounded-[20px] text-[10px] font-black uppercase tracking-widest hover:bg-brand-primary shadow-lg shadow-brand-active transition-all flex items-center gap-2 disabled:opacity-50"
//                >
//                  {processingId === showApproveModal.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} 
//                  Confirm Approval
//                </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default InventoryRequisitions;
