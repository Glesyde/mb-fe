import React, { useState, useEffect } from 'react';
import { Truck, Search, Loader2, CheckCircle2, AlertTriangle, FileText, Download, X } from 'lucide-react';
import { inventoryService } from '../services/inventory.service';
import { useNotification } from '../context/NotificationContext';

export default function InventoryGRN() {
  const { notify } = useNotification();
  
  const [loading, setLoading] = useState(false);
  const [approvedPOs, setApprovedPOs] = useState<any[]>([]);
  const [selectedPO, setSelectedPO] = useState<any | null>(null);
  
  // GRN Form State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [grnData, setGrnData] = useState({
    supplier_invoice_no: '',
    received_date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  
  // Dynamic line items based on PO
  const [receivedItems, setReceivedItems] = useState<any[]>([]);

  useEffect(() => {
    fetchApprovedPOs();
  }, []);

  const fetchApprovedPOs = async () => {
    setLoading(true);
    try {
      // Only fetch POs that are approved and ready to receive
      const data = await inventoryService.getPurchaseOrders({ status: 'APPROVED' });
      setApprovedPOs(data);
    } catch (err) {
      notify("Failed to fetch pending Purchase Orders", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPO = async (poId: number) => {
    try {
      const poDetails = await inventoryService.getPurchaseOrderDetails(poId);
      setSelectedPO(poDetails);
      
      // Auto-populate the GRN items based on what was ordered
      const initialItems = poDetails.items.map((item: any) => ({
        po_item_id: item.id,
        item_id: item.item_id,
        item_name: item.item_name,
        quantity_ordered: item.quantity_ordered,
        quantity_received: item.quantity_ordered, // Default to receiving everything
        unit_price: item.unit_price,
        batch_number: '', // Requires manual input from physical box
        expiry_date: '',  // Requires manual input from physical box
      }));
      setReceivedItems(initialItems);
      
    } catch (err) {
      notify("Failed to load PO details", "error");
    }
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...receivedItems];
    updated[index] = { ...updated[index], [field]: value };
    setReceivedItems(updated);
  };

  const handleSubmitGRN = async () => {
    // 1. Validation
    if (!grnData.supplier_invoice_no) {
      return notify("Supplier Invoice Number is required.", "warning");
    }
    
    // Filter out items where quantity_received is 0
    const itemsToProcess = receivedItems.filter(i => parseFloat(i.quantity_received) > 0);
    
    if (itemsToProcess.length === 0) {
      return notify("You must receive at least 1 item to create a GRN.", "warning");
    }

    const missingBatches = itemsToProcess.some(i => !i.batch_number.trim() || !i.expiry_date);
    if (missingBatches) {
      return notify("Batch Number and Expiry Date are strictly required for all received items.", "error");
    }

    // 2. Formatting Payload
    setIsSubmitting(true);
    try {
      let calculatedTotal = 0;
      const formattedItems = itemsToProcess.map(i => {
        const subtotal = parseFloat(i.quantity_received) * parseFloat(i.unit_price);
        calculatedTotal += subtotal;
        return {
          po_item_id: i.po_item_id,
          item_id: i.item_id,
          batch_number: i.batch_number,
          expiry_date: i.expiry_date,
          quantity_received: parseFloat(i.quantity_received),
          unit_price: parseFloat(i.unit_price),
          subtotal: subtotal
        };
      });

      const payload = {
        po_id: selectedPO.id,
        vendor_id: selectedPO.vendor_id,
        supplier_invoice_no: grnData.supplier_invoice_no,
        received_date: grnData.received_date,
        notes: grnData.notes,
        total_amount: calculatedTotal,
        items: formattedItems
      };

      await inventoryService.createGRN(payload);
      notify("Goods Received Note created and sent to Finance for approval.", "success");
      
      // Reset view
      setSelectedPO(null);
      setGrnData({ supplier_invoice_no: '', received_date: new Date().toISOString().split('T')[0], notes: '' });
      fetchApprovedPOs(); // Refresh list

    } catch (err: any) {
      notify(err.response?.data?.message || "Failed to create GRN", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-[24px] border border-slate-200 shadow-sm">
        <div>
           <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
             <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
               <Truck size={24} />
             </div>
             Goods Received (GRN)
           </h1>
           <p className="text-xs md:text-sm font-medium text-slate-500 mt-1">Receive stock securely against approved purchase orders.</p>
        </div>
      </div>

      {!selectedPO ? (
        <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600" /> Awaiting Reception (Approved POs)
            </h2>
          </div>
          <div className="p-0 overflow-x-auto custom-scrollbar">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">PO Number</th>
                  <th className="px-6 py-4">Vendor</th>
                  <th className="px-6 py-4">Expected Delivery</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={4} className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-emerald-600" size={32}/></td></tr>
                ) : approvedPOs.length === 0 ? (
                  <tr><td colSpan={4} className="py-20 text-center font-bold text-slate-400 text-sm">No pending approved orders waiting to be received.</td></tr>
                ) : (
                  approvedPOs.map((po) => (
                    <tr key={po.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => handleSelectPO(po.id)}>
                      <td className="px-6 py-4 font-black text-emerald-700">{po.po_number}</td>
                      <td className="px-6 py-4 font-bold text-slate-800">{po.vendor_name}</td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">{po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString() : 'N/A'}</td>
                      <td className="px-6 py-4 text-right">
                        <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 group-hover:border-emerald-500 group-hover:text-emerald-600 transition-all flex items-center gap-2 ml-auto shadow-sm">
                           <Download size={14} /> Process GRN
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm p-6 animate-in slide-in-from-right-4 duration-300">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
            <div>
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                Draft GRN for <span className="text-emerald-600">{selectedPO.po_number}</span>
              </h2>
              <p className="text-sm font-bold text-slate-500 mt-1">Supplier: {selectedPO.vendor_name}</p>
            </div>
            <button onClick={() => setSelectedPO(null)} className="text-slate-400 hover:text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-200 transition-colors"><X size={18} /></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 bg-slate-50 p-5 rounded-2xl border border-slate-100">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                <span>Supplier Invoice No *</span>
              </label>
              <input 
                type="text" placeholder="e.g. INV-2024-889"
                value={grnData.supplier_invoice_no} onChange={(e) => setGrnData({...grnData, supplier_invoice_no: e.target.value})}
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Received Date *</label>
              <input 
                type="date" max={new Date().toISOString().split('T')[0]}
                value={grnData.received_date} onChange={(e) => setGrnData({...grnData, received_date: e.target.value})}
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-emerald-500 shadow-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reception Notes</label>
              <input 
                type="text" placeholder="Visual inspection OK..."
                value={grnData.notes} onChange={(e) => setGrnData({...grnData, notes: e.target.value})}
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-emerald-500 shadow-sm"
              />
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4 bg-amber-50 p-3 rounded-xl border border-amber-100">
              <AlertTriangle size={16} className="text-amber-600 shrink-0" />
              <p className="text-xs font-bold text-amber-800">Physical verification required. Enter the exact Batch Numbers and Expiry Dates as printed on the physical packaging.</p>
            </div>
            
            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
              <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  <tr>
                    <th className="px-4 py-3">Item Definition</th>
                    <th className="px-4 py-3 text-center">Ordered</th>
                    <th className="px-4 py-3">Received Qty</th>
                    <th className="px-4 py-3">Batch Number *</th>
                    <th className="px-4 py-3">Expiry Date *</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {receivedItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-bold text-slate-800 text-sm">{item.item_name}</td>
                      <td className="px-4 py-3 text-center font-black text-slate-400">{item.quantity_ordered}</td>
                      <td className="px-4 py-3">
                        <input 
                          type="number" min="0" 
                          value={item.quantity_received} 
                          onChange={(e) => handleItemChange(idx, 'quantity_received', e.target.value)}
                          className="w-24 p-2 bg-white border border-slate-300 rounded-lg text-sm font-bold outline-none focus:border-emerald-500 text-center shadow-inner"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input 
                          type="text" placeholder="Mfg Batch" 
                          value={item.batch_number} 
                          onChange={(e) => handleItemChange(idx, 'batch_number', e.target.value)}
                          className="w-40 p-2 bg-white border border-slate-300 rounded-lg text-sm font-bold outline-none focus:border-emerald-500 uppercase shadow-inner"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input 
                          type="date" min={new Date().toISOString().split('T')[0]}
                          value={item.expiry_date} 
                          onChange={(e) => handleItemChange(idx, 'expiry_date', e.target.value)}
                          className="w-36 p-2 bg-white border border-slate-300 rounded-lg text-sm font-bold outline-none focus:border-emerald-500 shadow-inner"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button 
              onClick={handleSubmitGRN} disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3.5 rounded-xl font-black text-sm uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 flex items-center gap-2 active:scale-95"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
              Submit to Finance for Approval
            </button>
          </div>

        </div>
      )}
    </div>
  );
}


// import React, { useState, useEffect, useRef } from "react";
// import {
//   Truck,
//   Plus,
//   Trash2,
//   CheckCircle2,
//   AlertCircle,
//   Package,
//   Search,
//   Loader2,
//   Users,
//   Layers,
// } from "lucide-react";
// import { inventoryService, MarkupType } from "../services/inventory.service";
// import { billingService } from "../services/billing.service";
// import { MARKUP_TYPES } from "../constants";
// import { useNotification } from "../context/NotificationContext";

// interface PayerMarkupRule {
//   id: string;
//   markup_type: MarkupType;
//   markup_value: number;
//   payer_ids: number[];
// }

// interface GRNItem {
//   id: string;
//   item_id: number;
//   name: string;
//   mfg_batch_no: string;
//   expiry_date: string;
//   purchase_price: number;
//   unit: string;
//   markup_type: MarkupType; // Default / Cash markup
//   markup_value: number;
//   payer_markups: PayerMarkupRule[]; // Specific HMO markups
// }

// const InventoryGRN: React.FC = () => {
//   const { notify } = useNotification();
//   const [vendors, setVendors] = useState<any[]>([]);
//   const [items, setItems] = useState<any[]>([]);
//   const [payers, setPayers] = useState<any[]>([]);
  
//   const [selectedVendorUhid, setSelectedVendorUhid] = useState("");
//   const [lineItems, setLineItems] = useState<GRNItem[]>([]);
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [loadingInitial, setLoadingInitial] = useState(true);
  
//   const [itemSearch, setItemSearch] = useState("");
//   const [itemDropdownOpen, setItemDropdownOpen] = useState(false);
//   const itemDropdownRef = useRef<HTMLDivElement>(null);

//   useEffect(() => {
//     const handleClickOutside = (e: MouseEvent) => {
//       if (itemDropdownRef.current && !itemDropdownRef.current.contains(e.target as Node)) {
//         setItemDropdownOpen(false);
//       }
//     };
//     document.addEventListener("mousedown", handleClickOutside);
//     return () => document.removeEventListener("mousedown", handleClickOutside);
//   }, []);

//   // Quick Add Form State
//   const [newItem, setNewItem] = useState({
//     item_id: 0,
//     mfg_batch_no: "",
//     expiry_date: "",
//     purchase_price: 0,
//     default_markup_type: "PERCENTAGE" as MarkupType,
//     default_markup_value: 0,
//     payer_markups: [] as PayerMarkupRule[],
//   });

//   const filteredItems = items.filter((i) => {
//     const q = itemSearch.toLowerCase();
//     return (
//       i.name.toLowerCase().includes(q) ||
//       (i.brand && i.brand.toLowerCase().includes(q))
//     );
//   });

//   const selectedItemName = items.find((i) => i.id === newItem.item_id)?.name || null;

//   // Track globally selected payers for the CURRENT item being added to prevent duplicates
//   const currentlyAllocatedPayerIds = newItem.payer_markups.flatMap(rule => rule.payer_ids);

//   useEffect(() => {
//     const loadData = async () => {
//       try {
//         const [vData, iData, pData] = await Promise.all([
//           inventoryService.searchVendors(),
//           inventoryService.searchItems(),
//           billingService.getPayers(),
//         ]);
//         setVendors(vData);
//         setItems(iData);
//         setPayers(pData);
//       } catch (err) {
//         notify("Failed to load catalog data", "error");
//       } finally {
//         setLoadingInitial(false);
//       }
//     };
//     loadData();
//   }, [notify]);

//   const handleAddPayerRule = () => {
//     setNewItem({
//       ...newItem,
//       payer_markups: [
//         ...newItem.payer_markups,
//         { id: Date.now().toString(), markup_type: "PERCENTAGE", markup_value: 0, payer_ids: [] },
//       ],
//     });
//   };

//   const handleRemovePayerRule = (ruleId: string) => {
//     setNewItem({
//       ...newItem,
//       payer_markups: newItem.payer_markups.filter(r => r.id !== ruleId)
//     });
//   };

//   const handleTogglePayerInRule = (ruleId: string, payerId: number) => {
//     setNewItem({
//       ...newItem,
//       payer_markups: newItem.payer_markups.map(rule => {
//         if (rule.id === ruleId) {
//           const hasPayer = rule.payer_ids.includes(payerId);
//           return {
//             ...rule,
//             payer_ids: hasPayer ? rule.payer_ids.filter(id => id !== payerId) : [...rule.payer_ids, payerId]
//           };
//         }
//         return rule;
//       })
//     });
//   };

//   const updatePayerRuleValue = (ruleId: string, field: "markup_type" | "markup_value", value: any) => {
//     setNewItem({
//       ...newItem,
//       payer_markups: newItem.payer_markups.map(rule => 
//         rule.id === ruleId ? { ...rule, [field]: value } : rule
//       )
//     });
//   };

//   const addItem = () => {
//     const masterItem = items.find((i) => i.id === newItem.item_id);
    
//     // Strict Validation Rules
//     if (!masterItem) {
//       notify("Please select a Master Item.", "warning");
//       return;
//     }
//     if (newItem.purchase_price <= 0) {
//       notify("Cost Price must be greater than zero.", "warning");
//       return;
//     }
//     if (!newItem.expiry_date) {
//       notify("Expiry Date is strictly required for inventory.", "warning");
//       return;
//     }
//     if (!newItem.mfg_batch_no.trim()) {
//       notify("Product Batch Number is required.", "warning");
//       return;
//     }
//     if (newItem.default_markup_value <= 0) {
//       notify("Selling Price Configuration (Default Cash Markup) must be greater than zero.", "warning");
//       return;
//     }

//     const item: GRNItem = {
//       id: Math.random().toString(36).substr(2, 9),
//       item_id: newItem.item_id,
//       name: masterItem.name,
//       mfg_batch_no: newItem.mfg_batch_no.trim(),
//       expiry_date: newItem.expiry_date,
//       purchase_price: newItem.purchase_price,
//       unit: masterItem.unit || "Units",
//       markup_type: newItem.default_markup_type,
//       markup_value: newItem.default_markup_value,
//       payer_markups: newItem.payer_markups.filter(r => r.payer_ids.length > 0), // Ignore empty rules
//     };

//     setLineItems([...lineItems, item]);
//     setNewItem({
//       item_id: 0,
//       mfg_batch_no: "",
//       expiry_date: "",
//       purchase_price: 0,
//       default_markup_type: "PERCENTAGE",
//       default_markup_value: 0,
//       payer_markups: [],
//     });
//   };

//   const removeItem = (id: string) => {
//     setLineItems(lineItems.filter((i) => i.id !== id));
//   };

//   const handleFinalize = async () => {
//     if (!selectedVendorUhid || lineItems.length === 0) {
//       notify("Incomplete manifest: Select vendor and add items.", "warning");
//       return;
//     }

//     setIsSubmitting(true);
//     try {
//       for (const item of lineItems) {
//         await inventoryService.createBatch({
//           item_id: item.item_id,
//           mfg_batch_no: item.mfg_batch_no,
//           expiry_date: item.expiry_date,
//           vendor_uhid: selectedVendorUhid,
//           purchase_price: item.purchase_price,
//           markup_type: item.markup_type,
//           markup_value: item.markup_value,
//           payer_markups: item.payer_markups // Passed to backend
//         });
//       }

//       notify(`GRN finalized. ${lineItems.length} items logged with dynamic pricing rules.`, "success");
//       setLineItems([]);
//       setSelectedVendorUhid("");
//     } catch (err: any) {
//       notify(err.response?.data?.message || "Bulk processing failed. Verify API connectivity.", "error");
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   return (
//     <div className="space-y-8 animate-in fade-in duration-500 pb-20">
//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
//         {/* Left: General Info */}
//         <div className="lg:col-span-1 space-y-6">
//           <div className="bg-white border border-slate-200 rounded-[40px] p-8 shadow-sm space-y-8">
//             <div className="flex items-center gap-4">
//               <div className="p-3 bg-brand-primary text-white rounded-2xl shadow-lg shadow-brand-active">
//                 <Truck size={24} />
//               </div>
//               <div>
//                 <h2 className="text-xl font-black text-slate-800 tracking-tight">Receipt Logistics</h2>
//                 <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Ingestion Protocol</p>
//               </div>
//             </div>

//             <div className="space-y-6">
//               <div className="space-y-2">
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vendor / Source</label>
//                 <select
//                   disabled={loadingInitial || isSubmitting}
//                   className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-brand-active0/5 transition-all disabled:opacity-50"
//                   value={selectedVendorUhid}
//                   onChange={(e) => setSelectedVendorUhid(e.target.value)}
//                 >
//                   <option value="">Select Origin...</option>
//                   {vendors.map((v) => (
//                     <option key={v.id} value={v.vendor_uhid}>{v.name} ({v.vendor_uhid})</option>
//                   ))}
//                 </select>
//               </div>

//               <div className="p-6 bg-slate-50 border border-slate-100 rounded-[32px] flex items-start gap-4">
//                 <AlertCircle size={24} className="text-brand-primary flex-shrink-0" />
//                 <p className="text-[10px] text-brand-primary font-bold leading-relaxed uppercase">
//                   Finalization commits inventory to the master store and generates specific pricing rules for HMOs vs Cash.
//                 </p>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Right: Item Entry */}
//         <div className="lg:col-span-2 space-y-6">
//           <div className="bg-white border border-slate-200 rounded-[40px] shadow-sm overflow-hidden flex flex-col">
//             <div className="p-8 border-b border-slate-100 bg-slate-50/30">
//               <h3 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2 mb-6">
//                 <Package size={16} className="text-brand-primary" /> Manifest Entry
//               </h3>

//               {/* Core Item Input Row */}
//               <div className="grid grid-cols-12 gap-3 items-end mb-6">
//                 <div className="col-span-4 space-y-1.5" ref={itemDropdownRef}>
//                   <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Master Item *</label>
//                   <div className="relative">
//                     <button
//                       type="button"
//                       disabled={loadingInitial || isSubmitting}
//                       onClick={() => { setItemDropdownOpen((prev) => !prev); setItemSearch(""); }}
//                       className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none text-left flex items-center justify-between disabled:opacity-50 truncate"
//                     >
//                       <span className={selectedItemName ? "text-slate-800 truncate" : "text-slate-400"}>
//                         {loadingInitial ? "Loading items..." : (selectedItemName || "Select Product...")}
//                       </span>
//                       {loadingInitial ? <Loader2 size={13} className="text-slate-400 flex-shrink-0 ml-1 animate-spin" /> : <Search size={13} className="text-slate-400 flex-shrink-0 ml-1" />}
//                     </button>

//                     {itemDropdownOpen && (
//                       <div className="absolute z-50 top-full left-0 w-80 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden">
//                         <div className="p-2 border-b border-slate-100">
//                           <input
//                             autoFocus type="text" placeholder="Search items..."
//                             value={itemSearch} onChange={(e) => setItemSearch(e.target.value)}
//                             className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none"
//                           />
//                         </div>
//                         <ul className="max-h-56 overflow-y-auto">
//                           {filteredItems.length === 0 ? (
//                             <li className="px-4 py-3 text-[11px] text-slate-400 font-bold text-center">No items found</li>
//                           ) : (
//                             filteredItems.map((i) => (
//                               <li
//                                 key={i.id}
//                                 onClick={() => { setNewItem({ ...newItem, item_id: i.id }); setItemDropdownOpen(false); }}
//                                 className={`px-4 py-3 cursor-pointer transition-colors hover:bg-brand-active/50 ${newItem.item_id === i.id ? "bg-brand-active text-brand-primary" : "text-slate-700"}`}
//                               >
//                                 <div className="text-sm font-bold truncate">{i.name}</div>
//                                 {i.item_type && <span className="text-[9px] font-black uppercase bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded mt-1 inline-block">{i.item_type}</span>}
//                               </li>
//                             ))
//                           )}
//                         </ul>
//                       </div>
//                     )}
//                   </div>
//                 </div>
//                 <div className="col-span-3 space-y-1.5">
//                   <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Base Cost (₦) *</label>
//                   <input
//                     disabled={isSubmitting} type="number" placeholder="Cost Price" min="0.01" step="any"
//                     className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-brand-primary"
//                     value={newItem.purchase_price || ""}
//                     onChange={(e) => setNewItem({ ...newItem, purchase_price: parseFloat(e.target.value) || 0 })}
//                   />
//                 </div>
//                 <div className="col-span-3 space-y-1.5">
//                   <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Batch Expiry *</label>
//                   <input
//                     disabled={isSubmitting} type="date"
//                     className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none"
//                     value={newItem.expiry_date} onChange={(e) => setNewItem({ ...newItem, expiry_date: e.target.value })}
//                   />
//                 </div>
                
//                 <div className="col-span-2 space-y-1.5">
//                   <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Mfg Batch No *</label>
//                   <input
//                     disabled={isSubmitting} type="text" placeholder="e.g. LOT-A2"
//                     className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none"
//                     value={newItem.mfg_batch_no} onChange={(e) => setNewItem({ ...newItem, mfg_batch_no: e.target.value })}
//                   />
//                 </div>
//               </div>

//               {/* Pricing Rules Section */}
//               <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
//                 <div className="absolute top-0 left-0 w-1 h-full bg-brand-primary"></div>
//                 <h4 className="text-xs font-black text-slate-800 tracking-wider mb-4 flex items-center justify-between">
//                   <span>Selling Price Configuration *</span>
//                   <button 
//                     onClick={handleAddPayerRule} 
//                     className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors uppercase tracking-widest flex items-center gap-1"
//                   >
//                     <Plus size={12} /> Add Payer Exception
//                   </button>
//                 </h4>

//                 {/* Default Cash Rule */}
//                 <div className="flex items-center gap-4 mb-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
//                   <div className="flex-1">
//                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Target Audience</span>
//                     <span className="text-xs font-bold text-slate-700">Default / Cash Patients</span>
//                   </div>
//                   <div className="w-32">
//                     <select
//                       className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold bg-white"
//                       value={newItem.default_markup_type}
//                       onChange={(e) => setNewItem({ ...newItem, default_markup_type: e.target.value as MarkupType })}
//                     >
//                       {MARKUP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
//                     </select>
//                   </div>
//                   <div className="w-32">
//                     <div className="relative">
//                       <input
//                         type="number" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold pl-8"
//                         value={newItem.default_markup_value || ""} onChange={(e) => setNewItem({ ...newItem, default_markup_value: parseFloat(e.target.value) || 0 })}
//                       />
//                       <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">{newItem.default_markup_type === "PERCENTAGE" ? "%" : "₦"}</span>
//                     </div>
//                   </div>
//                 </div>

//                 {/* Exceptions Loop */}
//                 {newItem.payer_markups.map((rule, idx) => (
//                   <div key={rule.id} className="mb-4 p-4 bg-white rounded-xl border border-indigo-100 shadow-sm relative pr-12 animate-in slide-in-from-top-2">
//                     <button 
//                       onClick={() => handleRemovePayerRule(rule.id)}
//                       className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-500 bg-slate-50 hover:bg-red-50 p-2 rounded-lg transition-colors"
//                     >
//                       <Trash2 size={16} />
//                     </button>
                    
//                     <div className="flex flex-col gap-3">
//                       <div className="flex items-center gap-4">
//                         <div className="w-32">
//                           <select
//                             className="w-full px-3 py-2 border border-indigo-100 rounded-lg text-xs font-bold bg-indigo-50/30 text-indigo-800"
//                             value={rule.markup_type} onChange={(e) => updatePayerRuleValue(rule.id, "markup_type", e.target.value)}
//                           >
//                             {MARKUP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
//                           </select>
//                         </div>
//                         <div className="w-32">
//                           <div className="relative">
//                             <input
//                               type="number" className="w-full px-3 py-2 border border-indigo-100 rounded-lg text-xs font-bold pl-8 text-indigo-900 bg-white"
//                               value={rule.markup_value || ""} onChange={(e) => updatePayerRuleValue(rule.id, "markup_value", parseFloat(e.target.value) || 0)}
//                             />
//                             <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-indigo-400">{rule.markup_type === "PERCENTAGE" ? "%" : "₦"}</span>
//                           </div>
//                         </div>
//                         <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Pricing Rule</span>
//                       </div>
                      
//                       <div className="pt-3 border-t border-indigo-50">
//                         <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2 flex items-center gap-1">
//                           <Users size={12} /> Applies To Payer(s):
//                         </span>
//                         <div className="flex flex-wrap gap-2">
//                           {payers.filter(p => p.name !== "Cash Payment").map((payer) => {
//                             const isSelectedInOtherRule = currentlyAllocatedPayerIds.includes(payer.id) && !rule.payer_ids.includes(payer.id);
//                             const isSelectedHere = rule.payer_ids.includes(payer.id);

//                             return (
//                               <button
//                                 key={payer.id}
//                                 disabled={isSelectedInOtherRule}
//                                 onClick={() => handleTogglePayerInRule(rule.id, payer.id)}
//                                 className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
//                                   isSelectedHere 
//                                     ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" 
//                                     : isSelectedInOtherRule 
//                                       ? "bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed opacity-50" 
//                                       : "bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
//                                 }`}
//                               >
//                                 {payer.name}
//                               </button>
//                             );
//                           })}
//                         </div>
//                       </div>
//                     </div>
//                   </div>
//                 ))}

//                 <button
//                   disabled={
//                     isSubmitting || 
//                     !newItem.item_id || 
//                     newItem.purchase_price <= 0 || 
//                     !newItem.mfg_batch_no.trim() || 
//                     !newItem.expiry_date || 
//                     newItem.default_markup_value <= 0
//                   }
//                   onClick={addItem}
//                   className="mt-6 w-full bg-brand-primary text-white py-4 rounded-xl text-xs font-black uppercase tracking-widest shadow-md hover:bg-brand-primary transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
//                 >
//                   Commit Item to Manifest
//                 </button>
//               </div>
//             </div>

//             {/* List Table */}
//             <div className="flex-1 overflow-y-auto no-scrollbar bg-slate-50/50">
//               <table className="w-full text-left">
//                 <thead>
//                   <tr className="bg-white border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
//                     <th className="px-8 py-5">Product Details</th>
//                     <th className="px-8 py-5 text-center">Cost Price</th>
//                     <th className="px-8 py-5 text-center">Pricing Rules</th>
//                     <th className="px-8 py-5 text-right">Action</th>
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y divide-slate-100 font-medium">
//                   {lineItems.map((item) => (
//                     <tr key={item.id} className="hover:bg-white transition-colors group bg-slate-50/30">
//                       <td className="px-8 py-6">
//                         <p className="text-sm font-black text-slate-800">{item.name}</p>
//                         <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-1">Mfg Batch: {item.mfg_batch_no} | Exp: {item.expiry_date || "N/A"}</p>
//                       </td>
//                       <td className="px-8 py-6 text-center">
//                         <p className="text-sm font-black text-slate-900">₦{item.purchase_price.toLocaleString()}</p>
//                       </td>
//                       <td className="px-8 py-6">
//                         <div className="flex flex-col gap-1.5 max-w-[250px] mx-auto">
//                           <div className="flex justify-between items-center bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
//                             <span className="text-[9px] font-black text-slate-500 uppercase">Default</span>
//                             <span className="text-[10px] font-black text-slate-800">{item.markup_value}{item.markup_type === "PERCENTAGE" ? "%" : "₦"}</span>
//                           </div>
//                           {item.payer_markups.map((pm, i) => (
//                             <div key={i} className="flex justify-between items-center bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
//                               <span className="text-[9px] font-black text-indigo-500 uppercase truncate max-w-[120px]" title={payers.filter(p => pm.payer_ids.includes(p.id)).map(p => p.name).join(", ")}>
//                                 {payers.filter(p => pm.payer_ids.includes(p.id)).length} Payers
//                               </span>
//                               <span className="text-[10px] font-black text-indigo-700">{pm.markup_value}{pm.markup_type === "PERCENTAGE" ? "%" : "₦"}</span>
//                             </div>
//                           ))}
//                         </div>
//                       </td>
//                       <td className="px-8 py-6 text-right">
//                         <button disabled={isSubmitting} onClick={() => removeItem(item.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors disabled:opacity-30 bg-white rounded-lg shadow-sm border border-slate-100">
//                           <Trash2 size={16} />
//                         </button>
//                       </td>
//                     </tr>
//                   ))}
//                   {lineItems.length === 0 && (
//                     <tr>
//                       <td colSpan={5} className="py-20 text-center opacity-40">
//                         <Package size={48} className="mx-auto text-slate-400 mb-4" />
//                         <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Manifest is currently empty</p>
//                       </td>
//                     </tr>
//                   )}
//                 </tbody>
//               </table>
//             </div>

//             <div className="p-8 bg-white border-t border-slate-100 flex items-center justify-between">
//               <div className="flex items-center gap-3">
//                 <div className="p-2 bg-slate-100 rounded-lg text-slate-500"><Layers size={20} /></div>
//                 <div>
//                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Total Line Items</span>
//                   <span className="text-xl font-black text-slate-800">{lineItems.length}</span>
//                 </div>
//               </div>
//               <button
//                 disabled={isSubmitting || lineItems.length === 0}
//                 onClick={handleFinalize}
//                 className="bg-slate-900 text-white px-10 py-4 rounded-[20px] font-black uppercase text-xs tracking-widest shadow-xl shadow-slate-200 hover:bg-brand-primary hover:shadow-brand-active active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
//               >
//                 {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
//                 {isSubmitting ? "Committing Database..." : "Finalize & Import"}
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default InventoryGRN;

