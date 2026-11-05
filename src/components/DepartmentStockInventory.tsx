import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, Search, Loader2, RefreshCcw, List, 
  AlertTriangle, Clock, Printer, Edit2, Check, X, PackageMinus, CheckCircle2 
} from 'lucide-react';
import { inventoryService, formatDepartmentLabel } from '../services/inventory.service';
import { useNotification } from '../context/NotificationContext';
import InternalConsumptionForm from './InternalConsumptionForm';

export interface DepartmentItem {
  stock_id: number; 
  item_id: number;
  batch_id?: number; 
  name: string;
  brand: string;
  item_type: string;
  strength?: string;
  formulation?: string;
  unit_name: string;
  location: string;
  quantity: string;
  batch_number: string;
  mfg_batch_no: string;
  expiry_date: string;
  purchase_price?: string;
  created_by_name?: string;
  updated_by_name?: string;
  updated_at?: string;
}

interface DepartmentStockInventoryProps {
  location?: "RADIOLOGY" | "LAB" | "PHARMACY" | "THEATRE" | "CSSD" | "WARD" | "ICU" | "HDU" | "ERD" | "OPD" | "DIALYSIS" | "LABOUR_WARD" | "BILLING" | "PATIENTADMIN";
  isGlobal?: boolean;
}

const WARD_UNITS = ["WARD", "ICU", "HDU", "LABOUR_WARD"];
const GROUPED_UNITS: Record<string, string[]> = {
  WARD: WARD_UNITS,
  ICU: WARD_UNITS,
  HDU: WARD_UNITS,
  LABOUR_WARD: WARD_UNITS,
  THEATRE: ["THEATRE", "CSSD"],
  CSSD: ["THEATRE", "CSSD"],
  OPD: ["OPD", "DIALYSIS"],
  DIALYSIS: ["OPD", "DIALYSIS"],
};

// Using the String ENUMs for locations directly
const ALL_DEPARTMENTS = ["STORE", "RADIOLOGY", "LAB", "PHARMACY", "THEATRE", "CSSD", "WARD", "ICU", "HDU", "ERD", "OPD", "DIALYSIS", "LABOUR_WARD", "BILLING", "PATIENTADMIN"];

const DepartmentStockInventory: React.FC<DepartmentStockInventoryProps> = ({ location, isGlobal }) => {
  const { notify } = useNotification();
  const [items, setItems] = useState<DepartmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<"EXPIRY" | "NAME" | "QTY">("EXPIRY");
  const [activeFilter, setActiveFilter] = useState<string>(location || "ALL");
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20; 

  const [showConsumptionModal, setShowConsumptionModal] = useState(false);
  
  const [editingStockId, setEditingStockId] = useState<number | null>(null);
  const [editQuantity, setEditQuantity] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Single Item Consumption State
  const [singleConsumeItem, setSingleConsumeItem] = useState<DepartmentItem | null>(null);
  const [consumeQty, setConsumeQty] = useState<string>('1');
  const [consumeRemarks, setConsumeRemarks] = useState<string>('');
  const [consumeDeptId, setConsumeDeptId] = useState<string>('');
  const [isConsuming, setIsConsuming] = useState(false);

  const groupUnits = location ? GROUPED_UNITS[location] : undefined;
  const isGroupModule = !!groupUnits;

  const fetchData = async (filterLoc: string) => {
    setLoading(true);
    try {
      const queryLoc = filterLoc === "ALL" ? undefined : filterLoc;
      const invData = await inventoryService.getDepartmentItems(queryLoc);
      setItems(invData || []);
    } catch (err) {
      notify('Failed to load stock inventory', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(activeFilter);
  }, [activeFilter, location]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeFilter, sortBy]);

  const filteredAndSortedItems = useMemo(() => {
    let result = items.filter(item => 
      item.item_id?.toString().includes(searchTerm) || 
      (item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.batch_number && item.batch_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.mfg_batch_no && item.mfg_batch_no.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.location && item.location.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (sortBy === "EXPIRY") {
      result.sort((a, b) => {
        if (!a.expiry_date) return 1;
        if (!b.expiry_date) return -1;
        return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
      });
    } else if (sortBy === "NAME") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "QTY") {
      result.sort((a, b) => parseFloat(a.quantity) - parseFloat(b.quantity));
    }

    return result;
  }, [items, searchTerm, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedItems.length / itemsPerPage));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedItems.slice(start, start + itemsPerPage);
  }, [filteredAndSortedItems, currentPage]);

  const handleSaveQuantity = async (stockId: number) => {
    if (!editQuantity || isNaN(Number(editQuantity))) {
      return notify("Please enter a valid numeric quantity.", "warning");
    }

    setIsUpdating(true);
    try {
      await inventoryService.updateStock(stockId, { quantity: parseFloat(editQuantity) });
      notify("Quantity updated successfully.", "success");
      setItems(prev => prev.map(i => i.stock_id === stockId ? { ...i, quantity: editQuantity } : i));
      setEditingStockId(null);
    } catch (err: any) {
      notify(err.response?.data?.message || "Failed to update quantity.", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  // 🔥 Auto-Prefill Location Wrapper for Single Consumption
  const openSingleConsumptionModal = (item: DepartmentItem) => {
    setSingleConsumeItem(item);
    setConsumeQty('1');
    setConsumeRemarks('');
    // Automatically bind the department dropdown to the item's location
    setConsumeDeptId(item.location || '');
  };

  const handleSingleConsumeSubmit = async () => {
    if (!singleConsumeItem) return;
    const qty = parseFloat(consumeQty);
    
    if (isNaN(qty) || qty <= 0) return notify("Quantity must be greater than zero.", "warning");
    if (!consumeDeptId) return notify("Please select the department consuming this item.", "warning");
    if (!consumeRemarks.trim()) return notify("Remarks are compulsory for logging consumption.", "error");
    if (qty > parseFloat(singleConsumeItem.quantity)) return notify("Consumption quantity cannot exceed available stock.", "warning");

    setIsConsuming(true);
    try {
      const payload = {
        department_id: consumeDeptId, // Backend accepts this string ENUM
        notes: consumeRemarks,
        items: [{
          item_id: singleConsumeItem.item_id,
          batch_id: singleConsumeItem.batch_id,
          quantity: qty,
          source_location: singleConsumeItem.location
        }]
      };

      await inventoryService.recordConsumption(payload);
      notify("Consumption logged successfully.", "success");
      
      // Fast UI Update
      setItems(prev => prev.map(i => i.stock_id === singleConsumeItem.stock_id ? { ...i, quantity: (parseFloat(i.quantity) - qty).toString() } : i));
      
      setSingleConsumeItem(null);
      setConsumeRemarks('');
      setConsumeQty('1');
    } catch (err: any) {
      notify(err.response?.data?.message || "Failed to log consumption.", "error");
    } finally {
      setIsConsuming(false);
    }
  };

  const handlePrintExpiredReport = () => {
    const now = new Date().getTime();
    let totalExpiredLoss = 0;
    let totalExpiringValue = 0;

    const criticalItems = items.filter(item => {
      if (!item.expiry_date) return false;
      const expTime = new Date(item.expiry_date).getTime();
      const daysUntilExpiry = (expTime - now) / (1000 * 60 * 60 * 24);
      return daysUntilExpiry <= 30; 
    });

    if (criticalItems.length === 0) return notify("No expired or expiring items to report.", "success");

    criticalItems.sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());

    const tableRows = criticalItems.map(item => {
      const isExpired = new Date(item.expiry_date).getTime() < now;
      const statusColor = isExpired ? '#ef4444' : '#f59e0b';
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.purchase_price || "0");
      const totalValue = qty * price;

      if (isExpired) totalExpiredLoss += totalValue;
      else totalExpiringValue += totalValue;

      return `
        <tr>
          <td><strong>${item.name}</strong><br/><small style="color: #64748b;">${item.item_type}</small></td>
          <td>${item.mfg_batch_no || 'N/A'}</td>
          <td>${item.batch_number || 'N/A'}</td>
          <td>${item.location}</td>
          <td style="color: ${statusColor}; font-weight: bold;">${new Date(item.expiry_date).toLocaleDateString()}</td>
          <td style="text-align: right;">${qty.toLocaleString()}</td>
          <td style="text-align: right;">₦${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
        </tr>
      `;
    }).join('');

    const printWindow = window.open('', '_blank');
    if (!printWindow) return notify("Allow popups to print reports.", "warning");

    printWindow.document.write(`
      <html>
      <head>
        <title>Expiry Report</title>
        <style>
          body { font-family: sans-serif; padding: 20px; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f8f9fa; }
        </style>
      </head>
      <body>
        <h2>Inventory Expirations & Financial Report</h2>
        <p><strong>Total Expired Loss:</strong> ₦${totalExpiredLoss.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        <p><strong>Value at Risk (<30 Days):</strong> ₦${totalExpiringValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        <table>
          <thead><tr><th>Item</th><th>Mfg Batch</th><th>System Batch</th><th>Location</th><th>Expiry</th><th style="text-align: right;">Qty</th><th style="text-align: right;">Value</th></tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
        <script>window.onload = function() { window.print(); };</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-in fade-in duration-500 pb-12">
      
      {/* Top Header & Department Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white px-4  border border-slate-200 shadow-sm">
        <div>
           <h1 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
             <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
               <Package size={18} />
             </div>
             {isGlobal ? "Master Stock Inventory" : `${formatDepartmentLabel(activeFilter)} Current Stock`}
           </h1>
        </div>

        {(isGroupModule || isGlobal) && (
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 p-1.5 border border-slate-200 rounded-lg w-full md:w-auto">
            {isGroupModule && groupUnits!.map(unit => (
              <button
                key={unit}
                onClick={() => setActiveFilter(unit)}
                className={`flex-1 md:flex-none px-4 py-2 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all  ${activeFilter === unit ? 'bg-white shadow-sm text-indigo-600 border border-slate-200/60' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
              >
                {formatDepartmentLabel(unit)}
              </button>
            ))}
          </div>
        )}

               
        {/* Compact Toolbar */}
        <div className="px-4 py-3 bg-slate-50/50 border-b border-slate-200 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
            {isGlobal && (
              <select
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value)}
                className="w-full md:w-auto px-4 py-2 rounded-lg font-bold outline-none text-[10px] uppercase tracking-widest bg-white border border-slate-200 text-slate-700 shadow-sm cursor-pointer"
              >
                <option value="ALL">All Departments</option>
                {ALL_DEPARTMENTS.map(dept => (
                   <option key={dept} value={dept}>{formatDepartmentLabel(dept)}</option>
                ))}
              </select>
            )}

           <div className="flex flex-col sm:flex-row items-center gap-2 w-full lg:w-auto">
             <div className="relative group w-full sm:w-64 shrink-0">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={14} />
                 <input 
                    type="text" 
                    placeholder="Search inventory..."
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-xs text-slate-800 shadow-sm h-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                 />
             </div>
             
             <div className="flex items-center gap-2 w-full sm:w-auto">
                 <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full sm:w-auto py-1.5 px-2 bg-white border border-slate-200 rounded-lg font-bold text-[10px] uppercase tracking-widest text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all h-8 cursor-pointer"
                 >
                    <option value="EXPIRY">Sort: Expiry</option>
                    <option value="NAME">Sort: Name</option>
                    <option value="QTY">Sort: Qty</option>
                 </select>
                 
                 <button onClick={() => fetchData(activeFilter)} className="bg-white border border-slate-200 shadow-sm hover:bg-slate-50 rounded-lg transition-colors text-slate-500 hover:text-indigo-600 h-8 w-8 flex items-center justify-center shrink-0">
                    <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
                 </button>
             </div>
           </div>

           <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
             <button 
                onClick={handlePrintExpiredReport} 
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors shadow-sm"
             >
                <Printer size={14} /> <span className="hidden sm:inline">Expiry Report</span>
             </button>

             <button 
              onClick={() => setShowConsumptionModal(true)} 
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors shadow-sm"
             >
              <PackageMinus size={14} /> <span className="hidden sm:inline">Bulk Consume</span>
             </button>
           </div>
        </div>

      </div>

 

      <div className="bg-white rounded-2xl md:rounded-[24px] border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[100vh]">
        


        {/* Scalable & Responsive Fixed Header Table Wrapper */}
        <div className="overflow-auto max-h-[65vh] w-full custom-scrollbar bg-slate-50/30">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="sticky top-0 z-30 bg-slate-100/95 backdrop-blur-sm shadow-[0_1px_2px_rgba(0,0,0,0.05)] border-b border-slate-200">
              <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                <th className="px-4 md:px-5 py-3 md:py-4">Item Definition</th>
                <th className="px-4 md:px-5 py-3 md:py-4">Location</th>
                <th className="px-4 md:px-5 py-3 md:py-4">Mfg Batch & Expiry</th>
                <th className="px-4 md:px-5 py-3 md:py-4">System Batch</th>
                <th className="px-4 md:px-5 py-3 md:py-4">Last Updated</th>
                <th className="px-4 md:px-5 py-3 md:py-4 text-right">Quantity</th>
                <th className="px-4 md:px-5 py-3 md:py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-24 text-center">
                    <Loader2 size={32} className="animate-spin mx-auto text-indigo-600 mb-3" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading Stock Inventory...</p>
                  </td>
                </tr>
              ) : paginatedItems.length > 0 ? (
                paginatedItems.map((item, idx) => {
                  
                  let isExpired = false;
                  let isExpiringSoon = false;

                  if (item.expiry_date) {
                      const expiryTime = new Date(item.expiry_date).getTime();
                      const now = new Date().getTime();
                      const daysUntilExpiry = (expiryTime - now) / (1000 * 60 * 60 * 24);

                      isExpired = daysUntilExpiry < 0;
                      isExpiringSoon = daysUntilExpiry >= 0 && daysUntilExpiry <= 30; // Within 30 days
                  }

                  // Relies precisely on obj_stock_levels (updated_by / created_by)
                  const staffName = item.updated_by_name || item.created_by_name || "System Record";

                  return (
                      <tr key={`${item.stock_id}-${item.batch_number}-${idx}`} className={`group transition-colors ${isExpired ? 'bg-red-50/40 hover:bg-red-100/50' : isExpiringSoon ? 'bg-amber-50/40 hover:bg-amber-100/50' : 'hover:bg-slate-50/70'}`}>
                        <td className="px-4 md:px-5 py-3.5 md:py-4">
                          <p className="text-xs md:text-sm font-black text-slate-800">{item.name}</p>
                          <p className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase mt-0.5">
                            {item.brand || "NO BRAND"} • {item.item_type} 
                            {item.strength && ` • ${item.strength}`}
                            {item.formulation && ` • ${item.formulation}`}
                          </p>
                        </td>
                        <td className="px-4 md:px-5 py-3.5 md:py-4">
                          <span className="px-2.5 py-1 bg-slate-100 text-[9px] md:text-[10px] font-black text-slate-600 rounded-md border border-slate-200 uppercase tracking-widest">{item.location || 'N/A'}</span>
                        </td>
                        <td className="px-4 md:px-5 py-3.5 md:py-4">
                          <div className="flex flex-col gap-1.5 items-start">
                             <span className="text-[9px] md:text-[10px] font-mono font-bold text-brand-primary bg-brand-active px-2 py-0.5 rounded-md border border-brand-active uppercase self-start">
                                {item.mfg_batch_no || "NO MFG BATCH"}
                             </span>
                             {item.expiry_date && (
                                <span className={`flex items-center gap-1 text-[9px] md:text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${
                                    isExpired ? 'text-red-700 bg-red-100' : isExpiringSoon ? 'text-amber-700 bg-amber-100' : 'text-slate-400'
                                }`}>
                                   {(isExpired || isExpiringSoon) && <AlertTriangle size={12} />}
                                   Exp: {new Date(item.expiry_date).toLocaleDateString()}
                                </span>
                             )}
                          </div>
                        </td>
                        <td className="px-4 md:px-5 py-3.5 md:py-4">
                          <div className="flex flex-col gap-1.5 items-start">
                             <span className="text-[9px] md:text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 uppercase self-start">
                                {item.batch_number || "NO SYSTEM BATCH"}
                             </span>
                          </div>
                        </td>
                        
                        <td className="px-4 md:px-5 py-3.5 md:py-4">
                            <div className="flex items-center gap-3">
                                <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-black text-slate-500 shadow-sm shrink-0">
                                    {staffName.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-[11px] md:text-xs font-bold text-slate-700">{staffName}</p>
                                    <p className="text-[9px] md:text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                                        <Clock size={10} />
                                        {item.updated_at ? new Date(item.updated_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short'}) : 'N/A'}
                                    </p>
                                </div>
                            </div>
                        </td>
                        <td className="px-4 md:px-5 py-3.5 md:py-4 text-right">
                          {editingStockId === item.stock_id ? (
                              <div className="flex items-center justify-end gap-1.5">
                                  <input 
                                    type="number" 
                                    value={editQuantity} 
                                    onChange={(e) => setEditQuantity(e.target.value)}
                                    autoFocus
                                    className="w-16 md:w-20 px-2 py-1 text-xs md:text-sm font-bold border-2 border-indigo-400 rounded-md outline-none focus:ring-2 focus:ring-indigo-500/20 text-right shadow-inner"
                                  />
                                  <button 
                                    onClick={() => handleSaveQuantity(item.stock_id)} 
                                    disabled={isUpdating}
                                    className="text-white bg-emerald-500 hover:bg-emerald-600 p-1 md:p-1.5 rounded-md transition-colors shadow-sm disabled:opacity-50"
                                  >
                                      {isUpdating ? <Loader2 size={12} className="animate-spin" /> : <Check size={14} />}
                                  </button>
                                  <button 
                                    onClick={() => setEditingStockId(null)} 
                                    disabled={isUpdating}
                                    className="text-slate-500 bg-slate-200 hover:bg-slate-300 p-1 md:p-1.5 rounded-md transition-colors shadow-sm disabled:opacity-50"
                                  >
                                      <X size={14} />
                                  </button>
                              </div>
                          ) : (
                              <div className="flex flex-col items-end">
                                <span className={`text-base md:text-lg font-black ${parseFloat(item.quantity) <= 0 ? 'text-red-500' : 'text-slate-800'}`}>
                                    {parseFloat(item.quantity).toLocaleString()}
                                </span>
                                <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.unit_name || 'Units'}</span>
                              </div>
                          )}
                        </td>
                        <td className="px-4 md:px-5 py-3.5 md:py-4 text-center">
                            {/* 🔥 Single Action Buttons 🔥 */}
                            <div className="flex items-center justify-center gap-1 opacity-30 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => openSingleConsumptionModal(item)}
                                  className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white rounded-md transition-all shadow-sm focus:opacity-100"
                                  title="Log Consumption for this item"
                                >
                                  <PackageMinus size={14} className="md:w-4 md:h-4" />
                                </button>

                                <button 
                                  onClick={() => {
                                      setEditingStockId(item.stock_id);
                                      setEditQuantity(item.quantity);
                                  }}
                                  className="p-1.5 bg-indigo-50 text-indigo-500 hover:bg-indigo-500 hover:text-white rounded-md transition-all shadow-sm focus:opacity-100"
                                  title="Edit Quantity"
                                >
                                  <Edit2 size={14} className="md:w-4 md:h-4" />
                                </button>
                            </div>
                        </td>
                      </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-24 text-center">
                    <Package className="mx-auto text-slate-200 mb-3" size={40} />
                    <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest">No stock inventory found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Footer / Pagination */}
        {totalPages > 1 && (
          <div className="px-4 md:px-5 py-3 md:py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 md:px-4 md:py-2 bg-white border border-slate-200 text-slate-600 text-[10px] md:text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 shadow-sm"
            >
              Previous
            </button>
            <span className="text-[10px] md:text-xs font-bold text-slate-500">
              Page {currentPage} of {totalPages}
            </span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 md:px-4 md:py-2 bg-white border border-slate-200 text-slate-600 text-[10px] md:text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 shadow-sm"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* 🔥 Bulk Consumption Modal 🔥 */}
      {showConsumptionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <InternalConsumptionForm 
            onClose={() => {
              setShowConsumptionModal(false);
              fetchData(activeFilter); 
            }} 
            preselectedDepartment={location} 
          />
        </div>
      )}

      {/* 🔥 Single Item Consumption Modal 🔥 */}
      {singleConsumeItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-200">
                <div className="p-5 border-b border-slate-100 bg-rose-50 flex items-start justify-between">
                    <div>
                        <h3 className="text-sm font-black text-rose-800 flex items-center gap-2">
                            <PackageMinus size={16} className="text-rose-600" />
                            Log Stock Usage
                        </h3>
                        <p className="text-[10px] font-bold text-rose-600/80 mt-1 uppercase tracking-widest truncate max-w-[200px]">{singleConsumeItem.name}</p>
                    </div>
                    <button onClick={() => setSingleConsumeItem(null)} className="p-1.5 bg-white rounded-lg text-slate-400 hover:text-slate-600 shadow-sm"><X size={16}/></button>
                </div>
                
                <div className="p-6 space-y-4">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Available Stock</span>
                        <span className="text-sm font-black text-slate-800">{parseFloat(singleConsumeItem.quantity).toLocaleString()} {singleConsumeItem.unit_name}</span>
                    </div>

                    {/* 🔥 Locked Department Auto-Prefill 🔥 */}
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Consuming Department *</label>
                        <select 
                            value={consumeDeptId} 
                            onChange={(e) => setConsumeDeptId(e.target.value)}
                            disabled={singleConsumeItem.location !== 'STORE'}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-rose-400 shadow-sm disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                        >
                            <option value="">-- Select Department --</option>
                            {ALL_DEPARTMENTS.map((deptName) => (
                                <option key={deptName} value={deptName}>{formatDepartmentLabel(deptName)}</option>
                            ))}
                        </select>
                        {singleConsumeItem.location !== 'STORE' && (
                            <p className="text-[9px] text-slate-400 font-medium mt-1.5 leading-tight">
                              Department is automatically locked to the item's current inventory location.
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Quantity to Consume *</label>
                        <input 
                            type="number" 
                            min="0.01" 
                            max={singleConsumeItem.quantity}
                            step="any"
                            value={consumeQty} 
                            onChange={(e) => setConsumeQty(e.target.value)}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-rose-400 transition-all shadow-sm"
                            placeholder="Amount used..."
                        />
                    </div>
                    
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between mb-2">
                            <span>Remarks / Reason *</span>
                            <span className="text-rose-600 bg-red-50 px-2 py-0.5 rounded-md">Compulsory</span>
                        </label>
                        <textarea 
                            value={consumeRemarks} 
                            onChange={(e) => setConsumeRemarks(e.target.value)}
                            rows={3}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-rose-400 transition-all shadow-sm resize-none"
                            placeholder="e.g. Used for procedure, damaged, expired..."
                        />
                    </div>

                    <button 
                        onClick={handleSingleConsumeSubmit} 
                        disabled={isConsuming}
                        className="w-full mt-2 py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 disabled:opacity-50 transition-all active:scale-95"
                    >
                        {isConsuming ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                        Confirm Consumption
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default DepartmentStockInventory;