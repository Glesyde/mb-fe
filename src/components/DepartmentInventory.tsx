import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingBag, 
  Search, 
  TrendingUp, 
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
  Package,
  History,
  RefreshCcw,
  CheckCircle2,
  Filter,
  ArrowRight,
  X
} from 'lucide-react';
import { inventoryService, formatDepartmentLabel } from '../services/inventory.service';
import { useNotification } from '../context/NotificationContext';

interface MovementRecord {
  id: number;
  item_id: number;
  batch_id: number;
  movement_type: string;
  quantity: string;
  movement_date: string;
  destination_location: string;
  source_location: string;
  item_name?: string;
  item_brand?: string;
  items_uhid?: string;
  unit?: string;
}

interface DepartmentInventoryProps {
  location?: "RADIOLOGY" | "LAB" | "PHARMACY" | "THEATRE" | "CSSD" | "WARD" | "ICU" | "HDU" | "LABOUR_WARD" |"ERD" | "OPD" | "DIALYSIS" | "BILLING" | "PATIENTADMIN";
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
const ALL_DEPARTMENTS = ["RADIOLOGY", "LAB", "PHARMACY", "THEATRE", "CSSD", "WARD", "ICU", "HDU", "LABOUR_WARD", "STORE", "VENDOR", "ERD", "OPD", "DIALYSIS", "BILLING", "PATIENTADMIN"];

const DepartmentInventory: React.FC<DepartmentInventoryProps> = ({ location, isGlobal }) => {
  const { notify } = useNotification();
  const [movements, setMovements] = useState<MovementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // For grouped department filter or Global filter
  const [activeFilter, setActiveFilter] = useState<string>(location || "ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const groupUnits = location ? GROUPED_UNITS[location] : undefined;
  const isGroupModule = !!groupUnits;

  const fetchMovements = async (filterLoc: string) => {
    setLoading(true);
    try {
      const queryLoc = filterLoc === "ALL" ? undefined : filterLoc;
      const data = await inventoryService.getDepartmentMovements(queryLoc);
      setMovements(data.results || []);
    } catch (err) {
      notify('Failed to load inventory ledger', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovements(activeFilter);
  }, [activeFilter, location]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeFilter]);

  const filteredMovements = useMemo(() => {
    return movements.filter(m => 
      m.id.toString().includes(searchTerm) || 
      (m.item_name && m.item_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      m.source_location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.destination_location?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [movements, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredMovements.length / itemsPerPage));
  const paginatedMovements = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredMovements.slice(start, start + itemsPerPage);
  }, [filteredMovements, currentPage]);

  const getEffectiveType = (move: MovementRecord) => {
    if (activeFilter === "ALL") return move.movement_type;
    if (move.destination_location === activeFilter) return "IN";
    if (move.source_location === activeFilter) return "OUT";
    return move.movement_type;
  };

  const receivedCount = movements.filter(m => getEffectiveType(m) === "IN").length;
  const issuedCount = movements.filter(m => getEffectiveType(m) === "OUT").length;


  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col min-h-[calc(100vh-2rem)]">
      
      {/* ================= STICKY HEADER & CONTROLS ================= */}
      {/* Stays anchored at top during window scroll */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 space-y-5  flex justify-between">
        
        {/* Top Bar: Title, Context, and Primary Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 ">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-xl shadow-xs shrink-0">
              <ShoppingBag size={22} className="stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                {isGlobal ? "Master Stock Ledger" : `${formatDepartmentLabel(activeFilter)} Inventory`}
              </h1>
              <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5 mt-0.5">
                <History size={13} className="text-indigo-500 shrink-0" /> 
                Real-time tracking of stock movements and  supplies.
              </p>
            </div>
          </div>

          {/* Department Filters & Refresh Action */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            {isGroupModule && groupUnits?.length > 0 && (
              <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/60 overflow-x-auto max-w-full">
                {groupUnits.map((unit) => (
                  <button
                    key={unit}
                    onClick={() => setActiveFilter(unit)}
                    className={`px-3.5 py-1.5 rounded-lg font-semibold text-xs transition-all whitespace-nowrap ${
                      activeFilter === unit
                        ? 'bg-white shadow-xs text-indigo-600 font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                  >
                    {formatDepartmentLabel(unit)}
                  </button>
                ))}
              </div>
            )}

            {isGlobal && (
              <select
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value)}
                className="px-3.5 py-1.5 rounded-xl font-semibold text-xs bg-slate-50 border border-slate-200 text-slate-700 shadow-2xs hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
              >
                <option value="ALL">All Departments</option>
                {ALL_DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {formatDepartmentLabel(dept)}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={() => fetchMovements(activeFilter)}
              title="Refresh ledger"
              disabled={loading}
              className="p-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/60 hover:border-indigo-200 transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCcw size={16} className={loading ? 'animate-spin text-indigo-600' : ''} />
            </button>
          </div>
        </div>

        {/* Second Row: Key Metrics & Search Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5 items-center ">
          
          {/* Metric IN */}
          <div className="lg:col-span-3 bg-slate-50/70 hover:bg-slate-50 p-3 px-4 rounded-xl border border-slate-200/70 flex items-center justify-between transition-colors">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">IN</p>
              <p className="text-lg font-extrabold text-emerald-600 tabular-nums">
                {receivedCount.toLocaleString()}{' '}
                <span className="text-xs font-semibold text-slate-400">units</span>
              </p>
            </div>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100/80">
              <ArrowDownLeft size={18} />
            </div>
          </div>

          {/* Metric OUT */}
          <div className="lg:col-span-3 bg-slate-50/70 hover:bg-slate-50 p-3 px-4 rounded-xl border border-slate-200/70 flex items-center justify-between transition-colors">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">OUT</p>
              <p className="text-lg font-extrabold text-rose-600 tabular-nums">
                {issuedCount.toLocaleString()}{' '}
                <span className="text-xs font-semibold text-slate-400">units</span>
              </p>
            </div>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl border border-rose-100/80">
              <ArrowUpRight size={18} />
            </div>
          </div>

          {/* Search Input */}
          <div className="sm:col-span-2 lg:col-span-6 relative">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors pointer-events-none"
              size={18}
            />
            <input
              type="text"
              placeholder="Search by item name, UHID, batch, or destination..."
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50/60 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl outline-none focus:ring-3 focus:ring-indigo-500/15 focus:border-indigo-500 transition-all text-xs font-medium text-slate-800 placeholder:text-slate-400 shadow-2xs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
                title="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ================= TABLE AREA WITH STICKY THEAD ================= */}
      {/* Container allows horizontal scrolling on mobile while retaining vertical sticky thead */}
      <div className="flex-1 overflow-x-auto relative ">
        <table className="w-full text-left border-collapse min-w-[760px]">
          <thead>
            {/* Sticky table column headers anchored below header */}
            <tr className="sticky z-20 bg-slate-50/95 backdrop-blur-sm border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="px-6 py-3.5">Date & Time</th>
              <th className="px-6 py-3.5">Type</th>
              <th className="px-6 py-3.5">Item Definition</th>
              <th className="px-6 py-3.5">Batch & Quantity</th>
              <th className="px-6 py-3.5 text-right">Route (Src → Dest)</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {loading && movements.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-24 text-center">
                  <Loader2 size={36} className="animate-spin mx-auto text-indigo-600 mb-3" />
                  <p className="text-xs font-semibold text-slate-500 tracking-wide uppercase">
                    Compiling Movement Ledger...
                  </p>
                </td>
              </tr>
            ) : paginatedMovements.length > 0 ? (
              paginatedMovements.map((move) => {
                const isIncoming = getEffectiveType(move) === 'IN';
                return (
                  <tr
                    key={move.id}
                    className="hover:bg-indigo-50/30 transition-colors group"
                  >
                    {/* Timestamp */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-xs font-bold text-slate-800 tabular-nums">
                        {new Date(move.movement_date).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: '2-digit'
                        })}
                      </p>
                      <p className="text-[11px] font-medium text-slate-400 tabular-nums">
                        {new Date(move.movement_date).toLocaleTimeString(undefined, {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </td>

                    {/* Movement Badge */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                          isIncoming
                            ? 'bg-emerald-50/80 text-emerald-700 border-emerald-200/80'
                            : 'bg-rose-50/80 text-rose-700 border-rose-200/80'
                        }`}
                      >
                        {isIncoming ? (
                          <ArrowDownLeft size={12} className="stroke-[2.5]" />
                        ) : (
                          <ArrowUpRight size={12} className="stroke-[2.5]" />
                        )}
                        {getEffectiveType(move)}
                      </span>
                    </td>

                    {/* Item Name & UHID */}
                    <td className="px-6 py-4">
                      <p className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {move.item_name || `Item #${move.item_id}`}
                      </p>
                      <p className="text-[11px] font-medium text-slate-400 font-mono">
                        UHID: <span className="text-slate-600 font-semibold">{move.items_uhid || '—'}</span>
                      </p>
                    </td>

                    {/* Batch & Qty */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded border border-indigo-100">
                          #{move.batch_id}
                        </span>
                        <span className="text-sm font-extrabold text-slate-800 tabular-nums">
                          {parseFloat(move.quantity).toLocaleString()}{' '}
                          <span className="text-xs font-normal text-slate-400">
                            {move.unit || 'units'}
                          </span>
                        </span>
                      </div>
                    </td>

                    {/* Route Details */}
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2 text-xs font-medium">
                        <span className="px-2.5 py-1 bg-slate-100/80 text-slate-600 rounded-md border border-slate-200/70 text-[11px]">
                          {move.source_location || 'Stock Central'}
                        </span>
                        <ArrowRight size={13} className="text-slate-400" />
                        <span className="px-2.5 py-1 bg-indigo-50/80 text-indigo-700 font-semibold rounded-md border border-indigo-100 text-[11px]">
                          {move.destination_location || 'Department'}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="py-24 text-center">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                    <Package size={24} />
                  </div>
                  <p className="text-sm font-bold text-slate-700">No stock movements found</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Try clearing your search query or selecting a different department filter above.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ================= PAGINATION CONTROLS ================= */}
      {totalPages > 1 && (
        <footer className="sticky bottom-0 z-20 px-6 py-3.5 bg-white/95 backdrop-blur-md border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <p className="text-slate-500 font-medium">
            Page <span className="font-bold text-slate-800">{currentPage}</span> of{' '}
            <span className="font-bold text-slate-800">{totalPages}</span>
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1 || loading}
              className="px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 active:bg-slate-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || loading}
              className="px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 active:bg-slate-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
            >
              Next
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}
//   return (
//     <div className="space-y-6 animate-in fade-in duration-500 pb-20">


//       <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden min-h-[100vh]">
//         <div className="px-8 py-6 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
   
         
//           {/* Dynamic Header & Filters */}
//           <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-1 bg-white p-1 border border-slate-200 shadow-sm">
//             <div>
//               <h1 className="font-black text-slate-800 tracking-tight flex items-center gap-3">
//                 <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
//                   <ShoppingBag size={24} />
//                 </div>
//                 {isGlobal ? "Master Stock Ledger" : `${formatDepartmentLabel(activeFilter)} Inventory`} Movement Ledger
//               </h1>
//               <p className="text-sm font-medium text-slate-500 mt-1"><History size={16} className="text-indigo-600" /> Real-time tracking of medical supplies and stock movements.</p>
//             </div>

//             {/* Filters for grouped department or Global */}
//             {(isGroupModule || isGlobal) && (
//               <div className="flex items-center gap-2 bg-slate-50">
//                 {isGroupModule && groupUnits!.map(unit => (
//                   <button
//                     key={unit}
//                     onClick={() => setActiveFilter(unit)}
//                     className={`px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeFilter === unit ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
//                   >
//                     {formatDepartmentLabel(unit)}
//                   </button>
//                 ))}
//                 {isGlobal && (
//                   <select
//                     value={activeFilter}
//                     onChange={(e) => setActiveFilter(e.target.value)}
//                     className="px-6 py-2.5 rounded-xl font-bold outline-none text-xs uppercase tracking-widest bg-white border border-slate-200 text-slate-700 shadow-sm"
//                   >
//                     <option value="ALL">All Departments</option>
//                     {ALL_DEPARTMENTS.map(dept => (
//                       <option key={dept} value={dept}>{formatDepartmentLabel(dept)}</option>
//                     ))}
//                   </select>
//                 )}
//               </div>
//             )}
//           </div>



//           <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
//             <div className="bg-white p-5 rounded-[28px] border border-slate-200 shadow-sm flex items-center justify-between">
//               <div>
//                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Received (IN)</p>
//                 <p className="text-xl font-black text-emerald-600">{receivedCount} Movements</p>
//               </div>
//               <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl shadow-sm border border-emerald-100"><ArrowDownLeft size={20}/></div>
//             </div>
//             <div className="bg-white p-5 rounded-[28px] border border-slate-200 shadow-sm flex items-center justify-between">
//               <div>
//                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Issued (OUT)</p>
//                 <p className="text-xl font-black text-rose-600">{issuedCount} Movements</p>
//               </div>
//               <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl border border-rose-100"><ArrowUpRight size={20}/></div>
//             </div>
//             <div className="md:col-span-2 relative group flex-1">
//               <Search className="absolute left-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
//               <input 
//                   type="text" 
//                   placeholder="Search by item name, ID, or location..."
//                   className="w-full pl-14 pr-4 py-2 bg-white border border-slate-200 rounded-[32px] outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-800 shadow-sm"
//                   value={searchTerm}
//                   onChange={(e) => setSearchTerm(e.target.value)}
//               />
//             </div>
//           </div>


//            <div className="flex items-center gap-2">
//              <button onClick={() => fetchMovements(activeFilter)} className="p-2 hover:bg-slate-200 rounded-xl transition-colors text-slate-400 hover:text-indigo-600">
//                 <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
//              </button>
//            </div>
//         </div>

//         <div className="overflow-x-auto">
//           <table className="w-full text-left">
//             <thead>
//               <tr className="bg-white border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
//                 <th className="px-8 py-5">Date & Time</th>
//                 <th className="px-8 py-5">Type</th>
//                 <th className="px-8 py-5">Item Definition</th>
//                 <th className="px-8 py-5">Batch & Qty</th>
//                 <th className="px-8 py-5 text-right">Route (Src → Dest)</th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-slate-50">
//               {loading && movements.length === 0 ? (
//                 <tr>
//                   <td colSpan={5} className="py-20 text-center">
//                     <Loader2 size={40} className="animate-spin mx-auto text-indigo-600 mb-4" />
//                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Compiling Movement Ledger...</p>
//                   </td>
//                 </tr>
//               ) : paginatedMovements.length > 0 ? (
//                 paginatedMovements.map((move) => (
//                   <tr key={move.id} className="group hover:bg-slate-50/50 transition-colors">
//                     <td className="px-8 py-6">
//                       <p className="text-sm font-black text-slate-800">{new Date(move.movement_date).toLocaleDateString()}</p>
//                       <p className="text-[10px] font-bold text-slate-400 uppercase">{new Date(move.movement_date).toLocaleTimeString()}</p>
//                     </td>
//                     <td className="px-8 py-6">
//                       <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
//                           getEffectiveType(move) === 'IN' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
//                           'bg-rose-50 text-rose-600 border-rose-100'
//                         }`}>
//                         {getEffectiveType(move) === 'IN' ? <ArrowDownLeft size={12}/> : <ArrowUpRight size={12}/>}
//                         {getEffectiveType(move)}
//                       </div>
//                     </td>
//                     <td className="px-8 py-6">
//                       <p className="text-sm font-black text-slate-800">{move.item_name || `Item #${move.item_id}`}</p>
//                       <p className="text-[10px] font-bold text-slate-400 uppercase">UHID: {move.items_uhid || 'N/A'}</p>
//                     </td>
//                     <td className="px-8 py-6">
//                       <div className="flex items-center gap-3">
//                          <span className="text-[10px] font-mono font-bold text-brand-primary bg-brand-active px-2 py-1 rounded-lg border border-brand-active uppercase">BATCH-{move.batch_id}</span>
//                          <span className="text-lg font-black text-slate-800">{parseFloat(move.quantity).toLocaleString()} <span className="text-[10px] text-slate-400">{move.unit || 'units'}</span></span>
//                       </div>
//                     </td>
//                     <td className="px-8 py-6 text-right">
//                        <div className="flex items-center justify-end gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
//                          <span className="px-3 py-1 bg-slate-100 rounded-lg border border-slate-200">{move.source_location || 'N/A'}</span>
//                          <span className="text-slate-300">→</span>
//                          <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100">{move.destination_location || 'N/A'}</span>
//                        </div>
//                     </td>
//                   </tr>
//                 ))
//               ) : (
//                 <tr>
//                   <td colSpan={5} className="py-32 text-center">
//                     <Package className="mx-auto text-slate-200 mb-4" size={48} />
//                     <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No stock movements found</p>
//                   </td>
//                 </tr>
//               )}
//             </tbody>
//           </table>
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

//     </div>
//   );
// };

export default DepartmentInventory;
