import React, { useState, useEffect, useRef } from 'react';
import { 
  ShoppingCart, Search, Plus, FileText, Building2, 
  CheckCircle2, X, Eye, Loader2, RefreshCcw, Trash2, Calculator
} from 'lucide-react';
import { inventoryService } from '../services/inventory.service';
import { useNotification } from '../context/NotificationContext';

export default function PurchaseOrderManagement() {
  const { notify } = useNotification();
  
  // Views: LIST | CREATE | DETAILS
  const [activeView, setActiveView] = useState<"LIST" | "CREATE" | "DETAILS">("LIST");
  
  // State for Lists
  const [pos, setPos] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Details Modal
  const [selectedPO, setSelectedPO] = useState<any | null>(null);
  const [isApproving, setIsApproving] = useState(false);

  // Create PO Form State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newPO, setNewPO] = useState({
    vendor_id: '',
    order_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: '',
    shipping_fee: 0,
    tax_amount: 0,
    notes: '',
    terms_conditions: 'Standard Net-30 payment terms apply.'
  });
  const [lineItems, setLineItems] = useState<any[]>([{ item_id: '', quantity: 1, unit_price: 0 }]);

  // 🔥 Dropdown Search States 🔥
  const [vendorDropdownOpen, setVendorDropdownOpen] = useState(false);
  const [vendorSearch, setVendorSearch] = useState('');
  const vendorDropdownRef = useRef<HTMLDivElement>(null);

  const [activeItemDropdownIndex, setActiveItemDropdownIndex] = useState<number | null>(null);
  const [itemSearch, setItemSearch] = useState('');
  const itemDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (vendorDropdownRef.current && !vendorDropdownRef.current.contains(e.target as Node)) {
        setVendorDropdownOpen(false);
      }
      if (itemDropdownRef.current && !itemDropdownRef.current.contains(e.target as Node)) {
        setActiveItemDropdownIndex(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredVendors = vendors.filter(v => v.name.toLowerCase().includes(vendorSearch.toLowerCase()) || v.vendor_uhid?.toLowerCase().includes(vendorSearch.toLowerCase()));
  const filteredItems = catalogItems.filter(i => i.name.toLowerCase().includes(itemSearch.toLowerCase()) || i.item_type?.toLowerCase().includes(itemSearch.toLowerCase()));
  
  const selectedVendorName = vendors.find(v => v.id.toString() === newPO.vendor_id)?.name;


  const fetchPOs = async () => {
    setLoading(true);
    try {
      const data = await inventoryService.getPurchaseOrders({ status: statusFilter, search: searchTerm });
      setPos(data);
    } catch (err) {
      notify("Failed to fetch Purchase Orders.", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchPrerequisites = async () => {
    try {
      const [vData, iData] = await Promise.all([
        inventoryService.searchVendors(),
        inventoryService.searchItems()
      ]);
      setVendors(vData);
      setCatalogItems(iData);
    } catch (err) {
      notify("Failed to load vendors and items.", "error");
    }
  };

  useEffect(() => {
    if (activeView === "LIST") {
      fetchPOs();
    } else if (activeView === "CREATE" && vendors.length === 0) {
      fetchPrerequisites();
    }
  }, [activeView, statusFilter]);

  // Handle Dynamic Line Items
  const handleAddLineItem = () => {
    setLineItems([...lineItems, { item_id: '', quantity: 1, unit_price: 0 }]);
  };

  const handleRemoveLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleLineItemChange = (index: number, field: string, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  // Calculations
  const calcSubtotal = () => lineItems.reduce((acc, item) => acc + (parseFloat(item.quantity) * parseFloat(item.unit_price) || 0), 0);
  const calcGrandTotal = () => calcSubtotal() + parseFloat(newPO.shipping_fee as any || 0) + parseFloat(newPO.tax_amount as any || 0);

  const handleCreatePO = async () => {
    if (!newPO.vendor_id || lineItems.some(i => !i.item_id || i.quantity <= 0)) {
      notify("Please select a vendor and valid items.", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...newPO,
        items: lineItems.map(i => ({
          item_id: Number(i.item_id),
          quantity: Number(i.quantity),
          unit_price: Number(i.unit_price)
        }))
      };
      await inventoryService.createPurchaseOrder(payload);
      notify("Purchase Order created and sent for approval.", "success");
      setActiveView("LIST");
      setNewPO({ vendor_id: '', order_date: new Date().toISOString().split('T')[0], expected_delivery_date: '', shipping_fee: 0, tax_amount: 0, notes: '', terms_conditions: 'Standard Net-30 payment terms apply.' });
      setLineItems([{ item_id: '', quantity: 1, unit_price: 0 }]);
    } catch (err: any) {
      notify(err.response?.data?.message || "Failed to create PO.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprovePO = async (id: number) => {
    setIsApproving(true);
    try {
      await inventoryService.approvePurchaseOrder(id);
      notify("Purchase Order Approved Successfully.", "success");
      setSelectedPO({ ...selectedPO, status: 'APPROVED' });
      fetchPOs();
    } catch (err: any) {
      notify(err.response?.data?.message || "Failed to approve PO.", "error");
    } finally {
      setIsApproving(false);
    }
  };

  const openPODetails = async (id: number) => {
    try {
      const details = await inventoryService.getPurchaseOrderDetails(id);
      setSelectedPO(details);
      setActiveView("DETAILS");
    } catch (err) {
      notify("Failed to fetch PO details.", "error");
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: "bg-slate-100 text-slate-600 border-slate-200",
      PENDING_APPROVAL: "bg-amber-100 text-amber-700 border-amber-200",
      APPROVED: "bg-indigo-100 text-indigo-700 border-indigo-200",
      PARTIALLY_RECEIVED: "bg-blue-100 text-blue-700 border-blue-200",
      COMPLETED: "bg-emerald-100 text-emerald-700 border-emerald-200",
      CANCELLED: "bg-red-100 text-red-700 border-red-200"
    };
    const css = colors[status] || "bg-slate-100 text-slate-600";
    return <span className={`text-[9px] md:text-[10px] font-black px-2.5 py-1 rounded-md border uppercase tracking-widest ${css}`}>{status.replace('_', ' ')}</span>;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      


      {activeView === "LIST" && (
        <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 bg-slate-50/50 border-b border-slate-100 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            
            
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
              <div>
                <h1 className="font-black text-slate-800 tracking-tight flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600">
                    <ShoppingCart size={20} />
                  </div>
                  Purchase Orders
                </h1>
                <p className="text-xs md:text-sm font-medium text-slate-500 mt-1">Manage external supplier orders, approvals, and procurement records.</p>
              </div>
              {activeView === "LIST" && (
                <button 
                  onClick={() => setActiveView("CREATE")} 
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-md active:scale-95 whitespace-nowrap"
                >
                  <Plus size={18} /> Create New PO
                </button>
              )}
            </div>

            
             <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
               <div className="relative group w-full sm:w-72 shrink-0">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={16} />
                   <input 
                      type="text" placeholder="Search PO Number, Vendor..."
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-sm text-slate-800 shadow-sm"
                      value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                   />
               </div>
               <select
                  value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full sm:w-auto py-2 px-3 bg-white border border-slate-200 rounded-lg font-bold text-xs md:text-sm text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
               >
                  <option value="">All Statuses</option>
                  <option value="PENDING_APPROVAL">Pending Approval</option>
                  <option value="APPROVED">Approved</option>
                  <option value="COMPLETED">Completed / Received</option>
               </select>
             </div>

             <button onClick={fetchPOs} className="p-2 bg-white border border-slate-200 shadow-sm hover:bg-slate-50 rounded-lg transition-colors text-slate-500 hover:text-indigo-600 shrink-0">
                <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
             </button>

          </div>

          <div className="overflow-auto min-h-[100vh] w-full custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead className="sticky top-0 z-30 bg-slate-100/90 backdrop-blur-md shadow-[0_1px_2px_rgba(0,0,0,0.05)] border-b border-slate-200">
                <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  <th className="px-5 py-4">PO Details</th>
                  <th className="px-5 py-4">Vendor</th>
                  <th className="px-5 py-4">Dates</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Grand Total</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={6} className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-indigo-600 mb-2" size={32} /></td></tr>
                ) : pos.length === 0 ? (
                  <tr><td colSpan={6} className="py-20 text-center text-slate-400 font-bold text-sm">No Purchase Orders Found.</td></tr>
                ) : (
                  pos.map((po) => (
                    <tr key={po.id} className="hover:bg-slate-50/70 transition-colors cursor-pointer group" onClick={() => openPODetails(po.id)}>
                      <td className="px-5 py-4">
                        <span className="text-sm font-black text-indigo-700">{po.po_number}</span>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">By: {po.created_by_name}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5"><Building2 size={14} className="text-slate-400"/> {po.vendor_name}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-[11px] font-bold text-slate-700">Order: {new Date(po.order_date).toLocaleDateString()}</div>
                        <div className="text-[10px] font-bold text-slate-400 mt-1">Exp: {po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString() : 'TBD'}</div>
                      </td>
                      <td className="px-5 py-4">{getStatusBadge(po.status)}</td>
                      <td className="px-5 py-4 text-right">
                        <span className="text-sm font-black text-slate-800">₦{parseFloat(po.grand_total).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:text-indigo-600 hover:border-indigo-200 shadow-sm transition-all group-hover:bg-indigo-50 flex items-center gap-1 ml-auto">
                          <Eye size={14} /> View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE PO VIEW */}
      {activeView === "CREATE" && (
        <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm p-6 animate-in slide-in-from-right-4 duration-300">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
            <h2 className="text-lg font-black text-slate-800">Create Purchase Order</h2>
            <button onClick={() => setActiveView("LIST")} className="text-slate-400 hover:text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-200"><X size={18} /></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="space-y-1 relative" ref={vendorDropdownRef}>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Vendor *</label>
              <button
                 type="button"
                 onClick={() => { setVendorDropdownOpen(!vendorDropdownOpen); setVendorSearch(''); }}
                 className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none flex items-center justify-between text-left focus:border-indigo-400 focus:bg-white transition-all"
              >
                 <span className="truncate">{selectedVendorName || "-- Search Vendor --"}</span>
                 <Search size={14} className="text-slate-400 flex-shrink-0 ml-2" />
              </button>
              
              {vendorDropdownOpen && (
                 <div className="absolute z-50 top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden">
                    <div className="p-2 border-b border-slate-100">
                       <input
                          autoFocus type="text" placeholder="Search vendors..."
                          value={vendorSearch} onChange={(e) => setVendorSearch(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-indigo-400"
                       />
                    </div>
                    <ul className="max-h-56 overflow-y-auto">
                       {filteredVendors.length === 0 ? (
                          <li className="px-4 py-3 text-[11px] text-slate-400 font-bold text-center">No vendors found</li>
                       ) : (
                          filteredVendors.map(v => (
                             <li
                                key={v.id}
                                onClick={() => { setNewPO({ ...newPO, vendor_id: v.id.toString() }); setVendorDropdownOpen(false); }}
                                className="px-4 py-3 cursor-pointer transition-colors hover:bg-indigo-50 text-slate-700 border-b border-slate-50 last:border-0"
                             >
                                <div className="text-sm font-bold truncate">{v.name}</div>
                                <div className="text-[10px] text-slate-400 mt-0.5">{v.vendor_uhid}</div>
                             </li>
                          ))
                       )}
                    </ul>
                 </div>
              )}
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Order Date *</label>
              <input 
                type="date" value={newPO.order_date} onChange={(e) => setNewPO({...newPO, order_date: e.target.value})}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-indigo-400 focus:bg-white transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Expected Delivery</label>
              <input 
                type="date" value={newPO.expected_delivery_date} min={newPO.order_date} onChange={(e) => setNewPO({...newPO, expected_delivery_date: e.target.value})}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-indigo-400 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
               <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Order Items</h3>
               <button onClick={handleAddLineItem} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 hover:bg-indigo-100 flex items-center gap-1 transition-all"><Plus size={14}/> Add Row</button>
            </div>
            
            <div className="space-y-3">
              {lineItems.map((line, idx) => {
                  const selectedItemDetails = catalogItems.find(ci => ci.id.toString() === line.item_id?.toString());
                  return (
                    <div key={idx} className="flex flex-col sm:flex-row items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
                      
                      <div className="flex-1 w-full relative" ref={activeItemDropdownIndex === idx ? itemDropdownRef : null}>
                         <button
                            type="button"
                            onClick={() => {
                               setActiveItemDropdownIndex(activeItemDropdownIndex === idx ? null : idx);
                               setItemSearch('');
                            }}
                            className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none flex items-center justify-between text-left truncate"
                         >
                            <span className={selectedItemDetails ? "text-slate-800 truncate" : "text-slate-400"}>
                               {selectedItemDetails ? `${selectedItemDetails.name} (${selectedItemDetails.item_type})` : "-- Search Item --"}
                            </span>
                            <Search size={14} className="text-slate-400 shrink-0 ml-2" />
                         </button>

                         {activeItemDropdownIndex === idx && (
                            <div className="absolute z-50 top-full left-0 w-80 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden">
                               <div className="p-2 border-b border-slate-100">
                                  <input
                                     autoFocus type="text" placeholder="Search catalog..."
                                     value={itemSearch} onChange={(e) => setItemSearch(e.target.value)}
                                     className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-indigo-400"
                                  />
                               </div>
                               <ul className="max-h-56 overflow-y-auto">
                                  {filteredItems.length === 0 ? (
                                     <li className="px-4 py-3 text-[11px] text-slate-400 font-bold text-center">No items found</li>
                                  ) : (
                                     filteredItems.map(ci => (
                                        <li
                                           key={ci.id}
                                           onClick={() => { handleLineItemChange(idx, 'item_id', ci.id.toString()); setActiveItemDropdownIndex(null); }}
                                           className="px-4 py-3 cursor-pointer transition-colors hover:bg-indigo-50 text-slate-700 border-b border-slate-50 last:border-0"
                                        >
                                           <div className="text-sm font-bold truncate">{ci.name}</div>
                                           <div className="text-[9px] font-black uppercase text-slate-400 mt-0.5">{ci.item_type}</div>
                                        </li>
                                     ))
                                  )}
                               </ul>
                            </div>
                         )}
                      </div>

                      <div className="w-full sm:w-24">
                        <input type="number" min="1" placeholder="Qty" value={line.quantity} onChange={(e) => handleLineItemChange(idx, 'quantity', e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none text-center focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all" />
                      </div>
                      <div className="w-full sm:w-32 relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₦</span>
                        <input type="number" min="0" placeholder="Unit Price" value={line.unit_price} onChange={(e) => handleLineItemChange(idx, 'unit_price', e.target.value)} className="w-full pl-7 pr-2 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none text-right focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all" />
                      </div>
                      <div className="w-full sm:w-32 bg-slate-200/50 py-2.5 px-3 rounded-lg text-right text-xs font-black text-slate-700">
                        ₦{((parseFloat(line.quantity) || 0) * (parseFloat(line.unit_price) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                      <button onClick={() => handleRemoveLineItem(idx)} disabled={lineItems.length === 1} className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )
              })}
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-end items-start gap-8 border-t border-slate-100 pt-6 mt-6">
             <div className="flex-1 w-full space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Internal Notes</label>
                  <textarea rows={2} value={newPO.notes} onChange={(e) => setNewPO({...newPO, notes: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none resize-none focus:border-indigo-400 focus:bg-white transition-all" placeholder="Notes for approval..."></textarea>
                </div>
             </div>

             <div className="w-full md:w-80 bg-slate-50 border border-slate-200 p-5 rounded-2xl">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-2 mb-3 flex items-center gap-2"><Calculator size={14} /> Summary</h4>
                
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-500">Subtotal:</span>
                  <span className="text-sm font-black text-slate-800">₦{calcSubtotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-500">Shipping:</span>
                  <input type="number" value={newPO.shipping_fee} onChange={e => setNewPO({...newPO, shipping_fee: parseFloat(e.target.value) || 0})} className="w-24 p-1 bg-white border border-slate-200 rounded text-xs font-bold text-right outline-none focus:border-indigo-400" />
                </div>
                <div className="flex justify-between items-center mb-4 border-b border-slate-200 pb-3">
                  <span className="text-xs font-bold text-slate-500">Tax Amount:</span>
                  <input type="number" value={newPO.tax_amount} onChange={e => setNewPO({...newPO, tax_amount: parseFloat(e.target.value) || 0})} className="w-24 p-1 bg-white border border-slate-200 rounded text-xs font-bold text-right outline-none focus:border-indigo-400" />
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-black text-slate-800">Grand Total:</span>
                  <span className="text-lg font-black text-indigo-700">₦{calcGrandTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>

                <button 
                  onClick={handleCreatePO} disabled={isSubmitting}
                  className="w-full mt-5 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs py-3.5 rounded-xl uppercase tracking-widest shadow-md disabled:opacity-50 transition-all flex justify-center items-center gap-2 active:scale-95"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Submit PO
                </button>
             </div>
          </div>
        </div>
      )}

      {/* PO DETAILS MODAL */}
      {activeView === "DETAILS" && selectedPO && (
        <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm p-0 animate-in slide-in-from-bottom-4 duration-300 overflow-hidden">
          {/* Header Strip */}
          <div className="bg-slate-800 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 text-white">
            <div>
              <div className="flex items-center gap-3 mb-1">
                 <h2 className="text-2xl font-black">{selectedPO.po_number}</h2>
                 {getStatusBadge(selectedPO.status)}
              </div>
              <p className="text-xs font-bold text-slate-400">Created by {selectedPO.created_by_name} on {new Date(selectedPO.created_at).toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-3">
              {selectedPO.status === "PENDING_APPROVAL" && (
                 <button 
                   onClick={() => handleApprovePO(selectedPO.id)} disabled={isApproving}
                   className="bg-emerald-500 hover:bg-emerald-400 text-white px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-colors disabled:opacity-50"
                 >
                   {isApproving ? <Loader2 size={16} className="animate-spin"/> : <CheckCircle2 size={16}/>} Approve Order
                 </button>
              )}
              <button onClick={() => setActiveView("LIST")} className="bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-colors"><X size={20}/></button>
            </div>
          </div>

          <div className="p-6 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Vendor Details</span>
                 <p className="font-bold text-slate-800 text-sm flex items-center gap-1.5"><Building2 size={14} className="text-slate-400"/> {selectedPO.vendor_name}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Delivery Target</span>
                 <p className="font-bold text-slate-800 text-sm">{selectedPO.expected_delivery_date ? new Date(selectedPO.expected_delivery_date).toLocaleDateString() : 'Not Specified'}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Financial Total</span>
                 <p className="font-black text-indigo-700 text-lg leading-none">₦{parseFloat(selectedPO.grand_total).toLocaleString(undefined, {minimumFractionDigits:2})}</p>
              </div>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden">
               <table className="w-full text-left text-sm">
                 <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                   <tr>
                     <th className="px-4 py-3">Item Description</th>
                     <th className="px-4 py-3 text-center">Type</th>
                     <th className="px-4 py-3 text-right">Qty</th>
                     <th className="px-4 py-3 text-right">Unit Price</th>
                     <th className="px-4 py-3 text-right">Subtotal</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {selectedPO.items?.map((item: any) => (
                     <tr key={item.id} className="hover:bg-slate-50">
                       <td className="px-4 py-3 font-bold text-slate-800">{item.item_name}</td>
                       <td className="px-4 py-3 text-center text-xs font-bold text-slate-500">{item.item_type}</td>
                       <td className="px-4 py-3 text-right font-black text-slate-700">{parseFloat(item.quantity_ordered).toLocaleString()}</td>
                       <td className="px-4 py-3 text-right font-mono text-slate-500">₦{parseFloat(item.unit_price).toLocaleString()}</td>
                       <td className="px-4 py-3 text-right font-black text-slate-800">₦{parseFloat(item.subtotal).toLocaleString(undefined, {minimumFractionDigits:2})}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
            </div>

            {selectedPO.notes && (
              <div className="mt-6 p-4 bg-amber-50 border border-amber-100 rounded-xl text-sm">
                 <strong className="text-amber-800 block mb-1 text-[10px] uppercase tracking-widest">Internal Notes:</strong>
                 <p className="text-amber-900 font-medium">{selectedPO.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


// import React, { useState, useEffect, useMemo } from 'react';
// import { 
//   ShoppingCart, Search, Plus, FileText, Building2, 
//   CheckCircle2, X, Eye, Loader2, RefreshCcw, Trash2, Calculator
// } from 'lucide-react';
// import { inventoryService } from '../services/inventory.service';
// import { useNotification } from '../context/NotificationContext';

// export default function PurchaseOrderManagement() {
//   const { notify } = useNotification();
  
//   // Views: LIST | CREATE | DETAILS
//   const [activeView, setActiveView] = useState<"LIST" | "CREATE" | "DETAILS">("LIST");
  
//   // State for Lists
//   const [pos, setPos] = useState<any[]>([]);
//   const [vendors, setVendors] = useState<any[]>([]);
//   const [catalogItems, setCatalogItems] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
  
//   // Filters
//   const [searchTerm, setSearchTerm] = useState('');
//   const [statusFilter, setStatusFilter] = useState('');
  
//   // Details Modal
//   const [selectedPO, setSelectedPO] = useState<any | null>(null);
//   const [isApproving, setIsApproving] = useState(false);

//   // Create PO Form State
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [newPO, setNewPO] = useState({
//     vendor_id: '',
//     order_date: new Date().toISOString().split('T')[0],
//     expected_delivery_date: '',
//     shipping_fee: 0,
//     tax_amount: 0,
//     notes: '',
//     terms_conditions: 'Standard Net-30 payment terms apply.'
//   });
//   const [lineItems, setLineItems] = useState<any[]>([{ item_id: '', quantity: 1, unit_price: 0 }]);

//   const fetchPOs = async () => {
//     setLoading(true);
//     try {
//       const data = await inventoryService.getPurchaseOrders({ status: statusFilter, search: searchTerm });
//       setPos(data);
//     } catch (err) {
//       notify("Failed to fetch Purchase Orders.", "error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const fetchPrerequisites = async () => {
//     try {
//       const [vData, iData] = await Promise.all([
//         inventoryService.searchVendors(),
//         inventoryService.searchItems() // Assuming this fetches your catalog obj_items
//       ]);
//       setVendors(vData);
//       setCatalogItems(iData);
//     } catch (err) {
//       notify("Failed to load vendors and items.", "error");
//     }
//   };

//   useEffect(() => {
//     if (activeView === "LIST") {
//       fetchPOs();
//     } else if (activeView === "CREATE" && vendors.length === 0) {
//       fetchPrerequisites();
//     }
//   }, [activeView, statusFilter]);

//   // Handle Dynamic Line Items
//   const handleAddLineItem = () => {
//     setLineItems([...lineItems, { item_id: '', quantity: 1, unit_price: 0 }]);
//   };

//   const handleRemoveLineItem = (index: number) => {
//     setLineItems(lineItems.filter((_, i) => i !== index));
//   };

//   const handleLineItemChange = (index: number, field: string, value: any) => {
//     const updated = [...lineItems];
//     updated[index] = { ...updated[index], [field]: value };
//     setLineItems(updated);
//   };

//   // Calculations
//   const calcSubtotal = () => lineItems.reduce((acc, item) => acc + (parseFloat(item.quantity) * parseFloat(item.unit_price) || 0), 0);
//   const calcGrandTotal = () => calcSubtotal() + parseFloat(newPO.shipping_fee as any || 0) + parseFloat(newPO.tax_amount as any || 0);

//   const handleCreatePO = async () => {
//     if (!newPO.vendor_id || lineItems.some(i => !i.item_id || i.quantity <= 0)) {
//       notify("Please select a vendor and valid items.", "warning");
//       return;
//     }

//     setIsSubmitting(true);
//     try {
//       const payload = {
//         ...newPO,
//         items: lineItems.map(i => ({
//           item_id: Number(i.item_id),
//           quantity: Number(i.quantity),
//           unit_price: Number(i.unit_price)
//         }))
//       };
//       await inventoryService.createPurchaseOrder(payload);
//       notify("Purchase Order created and sent for approval.", "success");
//       setActiveView("LIST");
//       setNewPO({ ...newPO, vendor_id: '', notes: '' });
//       setLineItems([{ item_id: '', quantity: 1, unit_price: 0 }]);
//     } catch (err: any) {
//       notify(err.response?.data?.message || "Failed to create PO.", "error");
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   const handleApprovePO = async (id: number) => {
//     setIsApproving(true);
//     try {
//       await inventoryService.approvePurchaseOrder(id);
//       notify("Purchase Order Approved Successfully.", "success");
//       setSelectedPO({ ...selectedPO, status: 'APPROVED' });
//       fetchPOs();
//     } catch (err: any) {
//       notify(err.response?.data?.message || "Failed to approve PO.", "error");
//     } finally {
//       setIsApproving(false);
//     }
//   };

//   const openPODetails = async (id: number) => {
//     try {
//       const details = await inventoryService.getPurchaseOrderDetails(id);
//       setSelectedPO(details);
//       setActiveView("DETAILS");
//     } catch (err) {
//       notify("Failed to fetch PO details.", "error");
//     }
//   };

//   // Render Helpers
//   const getStatusBadge = (status: string) => {
//     const colors: Record<string, string> = {
//       DRAFT: "bg-slate-100 text-slate-600 border-slate-200",
//       PENDING_APPROVAL: "bg-amber-100 text-amber-700 border-amber-200",
//       APPROVED: "bg-indigo-100 text-indigo-700 border-indigo-200",
//       PARTIALLY_RECEIVED: "bg-blue-100 text-blue-700 border-blue-200",
//       COMPLETED: "bg-emerald-100 text-emerald-700 border-emerald-200",
//       CANCELLED: "bg-red-100 text-red-700 border-red-200"
//     };
//     const css = colors[status] || "bg-slate-100 text-slate-600";
//     return <span className={`text-[9px] md:text-[10px] font-black px-2.5 py-1 rounded-md border uppercase tracking-widest ${css}`}>{status.replace('_', ' ')}</span>;
//   };

//   return (
//     <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
//       {/* Header */}
//       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-[24px] border border-slate-200 shadow-sm">
//         <div>
//            <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
//              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
//                <ShoppingCart size={24} />
//              </div>
//              Purchase Orders
//            </h1>
//            <p className="text-xs md:text-sm font-medium text-slate-500 mt-1">Manage external supplier orders, approvals, and procurement records.</p>
//         </div>
//         {activeView === "LIST" && (
//           <button 
//              onClick={() => setActiveView("CREATE")} 
//              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-md active:scale-95 whitespace-nowrap"
//           >
//              <Plus size={18} /> Create New PO
//           </button>
//         )}
//       </div>

//       {activeView === "LIST" && (
//         <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
//           <div className="px-5 py-4 bg-slate-50/50 border-b border-slate-100 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
//              <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
//                <div className="relative group w-full sm:w-72 shrink-0">
//                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={16} />
//                    <input 
//                       type="text" placeholder="Search PO Number, Vendor..."
//                       className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-sm text-slate-800 shadow-sm"
//                       value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
//                    />
//                </div>
//                <select
//                   value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
//                   className="w-full sm:w-auto py-2 px-3 bg-white border border-slate-200 rounded-lg font-bold text-xs md:text-sm text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
//                >
//                   <option value="">All Statuses</option>
//                   <option value="PENDING_APPROVAL">Pending Approval</option>
//                   <option value="APPROVED">Approved</option>
//                   <option value="COMPLETED">Completed / Received</option>
//                </select>
//              </div>
//              <button onClick={fetchPOs} className="p-2 bg-white border border-slate-200 shadow-sm hover:bg-slate-50 rounded-lg transition-colors text-slate-500 hover:text-indigo-600 shrink-0">
//                 <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
//              </button>
//           </div>

//           <div className="overflow-auto max-h-[60vh] w-full custom-scrollbar">
//             <table className="w-full text-left border-collapse min-w-[900px]">
//               <thead className="sticky top-0 z-30 bg-slate-100/90 backdrop-blur-md shadow-[0_1px_2px_rgba(0,0,0,0.05)] border-b border-slate-200">
//                 <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
//                   <th className="px-5 py-4">PO Details</th>
//                   <th className="px-5 py-4">Vendor</th>
//                   <th className="px-5 py-4">Dates</th>
//                   <th className="px-5 py-4">Status</th>
//                   <th className="px-5 py-4 text-right">Grand Total</th>
//                   <th className="px-5 py-4 text-right">Actions</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-100">
//                 {loading ? (
//                   <tr><td colSpan={6} className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-indigo-600 mb-2" size={32} /></td></tr>
//                 ) : pos.length === 0 ? (
//                   <tr><td colSpan={6} className="py-20 text-center text-slate-400 font-bold text-sm">No Purchase Orders Found.</td></tr>
//                 ) : (
//                   pos.map((po) => (
//                     <tr key={po.id} className="hover:bg-slate-50/70 transition-colors cursor-pointer group" onClick={() => openPODetails(po.id)}>
//                       <td className="px-5 py-4">
//                         <span className="text-sm font-black text-indigo-700">{po.po_number}</span>
//                         <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">By: {po.created_by_name}</p>
//                       </td>
//                       <td className="px-5 py-4">
//                         <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5"><Building2 size={14} className="text-slate-400"/> {po.vendor_name}</span>
//                       </td>
//                       <td className="px-5 py-4">
//                         <div className="text-[11px] font-bold text-slate-700">Order: {new Date(po.order_date).toLocaleDateString()}</div>
//                         <div className="text-[10px] font-bold text-slate-400 mt-1">Exp: {po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString() : 'TBD'}</div>
//                       </td>
//                       <td className="px-5 py-4">{getStatusBadge(po.status)}</td>
//                       <td className="px-5 py-4 text-right">
//                         <span className="text-sm font-black text-slate-800">₦{parseFloat(po.grand_total).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
//                       </td>
//                       <td className="px-5 py-4 text-right">
//                         <button className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:text-indigo-600 hover:border-indigo-200 shadow-sm transition-all group-hover:bg-indigo-50 flex items-center gap-1 ml-auto">
//                           <Eye size={14} /> View
//                         </button>
//                       </td>
//                     </tr>
//                   ))
//                 )}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       )}

//       {/* CREATE PO VIEW */}
//       {activeView === "CREATE" && (
//         <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm p-6 animate-in slide-in-from-right-4 duration-300">
//           <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
//             <h2 className="text-lg font-black text-slate-800">Create Purchase Order</h2>
//             <button onClick={() => setActiveView("LIST")} className="text-slate-400 hover:text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-200"><X size={18} /></button>
//           </div>

//           <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
//             <div className="space-y-1">
//               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Vendor *</label>
//               <select 
//                 value={newPO.vendor_id} onChange={(e) => setNewPO({...newPO, vendor_id: e.target.value})}
//                 className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-indigo-400"
//               >
//                 <option value="">-- Select Vendor --</option>
//                 {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
//               </select>
//             </div>
//             <div className="space-y-1">
//               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Order Date *</label>
//               <input 
//                 type="date" value={newPO.order_date} onChange={(e) => setNewPO({...newPO, order_date: e.target.value})}
//                 className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-indigo-400"
//               />
//             </div>
//             <div className="space-y-1">
//               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Expected Delivery</label>
//               <input 
//                 type="date" value={newPO.expected_delivery_date} min={newPO.order_date} onChange={(e) => setNewPO({...newPO, expected_delivery_date: e.target.value})}
//                 className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-indigo-400"
//               />
//             </div>
//           </div>

//           <div className="mb-6">
//             <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
//                <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Order Items</h3>
//                <button onClick={handleAddLineItem} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 hover:bg-indigo-100 flex items-center gap-1 transition-all"><Plus size={14}/> Add Row</button>
//             </div>
            
//             <div className="space-y-3">
//               {lineItems.map((line, idx) => (
//                 <div key={idx} className="flex flex-col sm:flex-row items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
//                   <div className="flex-1 w-full">
//                     <select 
//                       value={line.item_id} onChange={(e) => handleLineItemChange(idx, 'item_id', e.target.value)}
//                       className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none"
//                     >
//                       <option value="">-- Select Item --</option>
//                       {catalogItems.map(ci => <option key={ci.id} value={ci.id}>{ci.name} ({ci.item_type})</option>)}
//                     </select>
//                   </div>
//                   <div className="w-full sm:w-24">
//                     <input type="number" min="1" placeholder="Qty" value={line.quantity} onChange={(e) => handleLineItemChange(idx, 'quantity', e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none text-center" />
//                   </div>
//                   <div className="w-full sm:w-32 relative">
//                     <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₦</span>
//                     <input type="number" min="0" placeholder="Unit Price" value={line.unit_price} onChange={(e) => handleLineItemChange(idx, 'unit_price', e.target.value)} className="w-full pl-7 pr-2 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none text-right" />
//                   </div>
//                   <div className="w-full sm:w-32 bg-slate-200/50 py-2.5 px-3 rounded-lg text-right text-xs font-black text-slate-700">
//                     ₦{((parseFloat(line.quantity) || 0) * (parseFloat(line.unit_price) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
//                   </div>
//                   <button onClick={() => handleRemoveLineItem(idx)} disabled={lineItems.length === 1} className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30">
//                     <Trash2 size={16} />
//                   </button>
//                 </div>
//               ))}
//             </div>
//           </div>

//           <div className="flex flex-col md:flex-row justify-end items-start gap-8 border-t border-slate-100 pt-6 mt-6">
//              <div className="flex-1 w-full space-y-4">
//                 <div className="space-y-1">
//                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Internal Notes</label>
//                   <textarea rows={2} value={newPO.notes} onChange={(e) => setNewPO({...newPO, notes: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none resize-none" placeholder="Notes for approval..."></textarea>
//                 </div>
//              </div>

//              <div className="w-full md:w-80 bg-slate-50 border border-slate-200 p-5 rounded-2xl">
//                 <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-2 mb-3 flex items-center gap-2"><Calculator size={14} /> Summary</h4>
                
//                 <div className="flex justify-between items-center mb-2">
//                   <span className="text-xs font-bold text-slate-500">Subtotal:</span>
//                   <span className="text-sm font-black text-slate-800">₦{calcSubtotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
//                 </div>
//                 <div className="flex justify-between items-center mb-2">
//                   <span className="text-xs font-bold text-slate-500">Shipping:</span>
//                   <input type="number" value={newPO.shipping_fee} onChange={e => setNewPO({...newPO, shipping_fee: parseFloat(e.target.value) || 0})} className="w-24 p-1 bg-white border border-slate-200 rounded text-xs font-bold text-right outline-none" />
//                 </div>
//                 <div className="flex justify-between items-center mb-4 border-b border-slate-200 pb-3">
//                   <span className="text-xs font-bold text-slate-500">Tax Amount:</span>
//                   <input type="number" value={newPO.tax_amount} onChange={e => setNewPO({...newPO, tax_amount: parseFloat(e.target.value) || 0})} className="w-24 p-1 bg-white border border-slate-200 rounded text-xs font-bold text-right outline-none" />
//                 </div>
                
//                 <div className="flex justify-between items-center">
//                   <span className="text-sm font-black text-slate-800">Grand Total:</span>
//                   <span className="text-lg font-black text-indigo-700">₦{calcGrandTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
//                 </div>

//                 <button 
//                   onClick={handleCreatePO} disabled={isSubmitting}
//                   className="w-full mt-5 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs py-3.5 rounded-xl uppercase tracking-widest shadow-md disabled:opacity-50 transition-all flex justify-center items-center gap-2"
//                 >
//                   {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Submit PO
//                 </button>
//              </div>
//           </div>
//         </div>
//       )}

//       {/* PO DETAILS MODAL */}
//       {activeView === "DETAILS" && selectedPO && (
//         <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm p-0 animate-in slide-in-from-bottom-4 duration-300 overflow-hidden">
//           {/* Header Strip */}
//           <div className="bg-slate-800 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 text-white">
//             <div>
//               <div className="flex items-center gap-3 mb-1">
//                  <h2 className="text-2xl font-black">{selectedPO.po_number}</h2>
//                  {getStatusBadge(selectedPO.status)}
//               </div>
//               <p className="text-xs font-bold text-slate-400">Created by {selectedPO.created_by_name} on {new Date(selectedPO.created_at).toLocaleString()}</p>
//             </div>
//             <div className="flex items-center gap-3">
//               {selectedPO.status === "PENDING_APPROVAL" && (
//                  <button 
//                    onClick={() => handleApprovePO(selectedPO.id)} disabled={isApproving}
//                    className="bg-emerald-500 hover:bg-emerald-400 text-white px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-colors disabled:opacity-50"
//                  >
//                    {isApproving ? <Loader2 size={16} className="animate-spin"/> : <CheckCircle2 size={16}/>} Approve Order
//                  </button>
//               )}
//               <button onClick={() => setActiveView("LIST")} className="bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-colors"><X size={20}/></button>
//             </div>
//           </div>

//           <div className="p-6 md:p-8">
//             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
//               <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
//                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Vendor Details</span>
//                  <p className="font-bold text-slate-800 text-sm flex items-center gap-1.5"><Building2 size={14} className="text-slate-400"/> {selectedPO.vendor_name}</p>
//               </div>
//               <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
//                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Delivery Target</span>
//                  <p className="font-bold text-slate-800 text-sm">{selectedPO.expected_delivery_date ? new Date(selectedPO.expected_delivery_date).toLocaleDateString() : 'Not Specified'}</p>
//               </div>
//               <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
//                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Financial Total</span>
//                  <p className="font-black text-indigo-700 text-lg leading-none">₦{parseFloat(selectedPO.grand_total).toLocaleString(undefined, {minimumFractionDigits:2})}</p>
//               </div>
//             </div>

//             <div className="border border-slate-200 rounded-2xl overflow-hidden">
//                <table className="w-full text-left text-sm">
//                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-widest">
//                    <tr>
//                      <th className="px-4 py-3">Item Description</th>
//                      <th className="px-4 py-3 text-center">Type</th>
//                      <th className="px-4 py-3 text-right">Qty</th>
//                      <th className="px-4 py-3 text-right">Unit Price</th>
//                      <th className="px-4 py-3 text-right">Subtotal</th>
//                    </tr>
//                  </thead>
//                  <tbody className="divide-y divide-slate-100">
//                    {selectedPO.items?.map((item: any) => (
//                      <tr key={item.id} className="hover:bg-slate-50">
//                        <td className="px-4 py-3 font-bold text-slate-800">{item.item_name}</td>
//                        <td className="px-4 py-3 text-center text-xs font-bold text-slate-500">{item.item_type}</td>
//                        <td className="px-4 py-3 text-right font-black text-slate-700">{parseFloat(item.quantity_ordered).toLocaleString()}</td>
//                        <td className="px-4 py-3 text-right font-mono text-slate-500">₦{parseFloat(item.unit_price).toLocaleString()}</td>
//                        <td className="px-4 py-3 text-right font-black text-slate-800">₦{parseFloat(item.subtotal).toLocaleString(undefined, {minimumFractionDigits:2})}</td>
//                      </tr>
//                    ))}
//                  </tbody>
//                </table>
//             </div>

//             {selectedPO.notes && (
//               <div className="mt-6 p-4 bg-amber-50 border border-amber-100 rounded-xl text-sm">
//                  <strong className="text-amber-800 block mb-1 text-[10px] uppercase tracking-widest">Internal Notes:</strong>
//                  <p className="text-amber-900 font-medium">{selectedPO.notes}</p>
//               </div>
//             )}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }