import React, { useEffect, useRef, useState } from "react";
import {
  FileText,
  FileSpreadsheet,
  File as FilePdf,
  Loader2,
  ChevronDown,
  Download,
  ChevronLeft,
  ChevronRight,
  FilterX,
  RefreshCw,
} from "lucide-react";
import { exportToCSV, exportToExcel, exportToPDF } from "../../utils/exportUtils";

export const renderValue = (val: any) => {
  if (val === null || val === undefined || val === "") return "—";
  return String(val);
};

export const formatCurrency = (val: any) => {
  const num = parseFloat(val);
  if (isNaN(num)) return "₦0.00";
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 2 }).format(num);
};

export const badgeClass = (status?: string) => {
  const s = (status || "").toUpperCase();
  if (s.includes("CRITICAL") || s.includes("CANCEL") || s.includes("REJECT") || s.includes("EXPIRED") || s.includes("BREACH") || s.includes("MISSED") || s.includes("OMITTED") || s.includes("MAINTENANCE") || s.includes("OUT_OF_SERVICE") || s.includes("OUT OF SERVICE")) {
    return "bg-red-50 text-red-600 border-red-100";
  }
  if (s.includes("NO_SHOW") || s.includes("NO SHOW")) {
    return "bg-orange-50 text-orange-600 border-orange-100";
  }
  if (s.includes("PENDING") || s.includes("PARTIAL") || s.includes("WARNING") || s.includes("RISK") || s.includes("REQUESTED")) {
    return "bg-amber-50 text-amber-600 border-amber-100";
  }
  if (s.includes("PAID") || s.includes("OPTIMAL") || s.includes("APPROVED") || s.includes("COMPLETED") || s.includes("COVERED") || s.includes("REPORTED") || s.includes("AVAILABLE") || s.includes("GIVEN")) {
    return "bg-emerald-50 text-emerald-600 border-emerald-100";
  }
  if (s.includes("SCHEDULED") || s.includes("ORDERED") || s.includes("BOOKED") || s.includes("CHECKED_IN") || s.includes("CHECKED IN") || s.includes("OCCUPIED")) {
    return "bg-blue-50 text-blue-600 border-blue-100";
  }
  if (s.includes("SCANNED") || s.includes("COLLECTED") || s.includes("PROCESSING") || s.includes("IN_PROGRESS") || s.includes("IN PROGRESS")) {
    return "bg-purple-50 text-purple-600 border-purple-100";
  }
  return "bg-slate-50 text-slate-500 border-slate-100";
};

export const ITEM_TYPES = ["DRUG", "CONSUMABLE", "DEVICE"];
export const LOCATIONS = ["STORE", "PHARMACY", "CSSD", "THEATRE", "LAB", "RADIOLOGY", "WARD", "ICU", "HDU", "ERD", "OPD", "PATIENT"];

export const TIMEFRAME_OPTIONS: { value: string; label: string }[] = [
  { value: "all_time", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this_week", label: "This Week" },
  { value: "last_week", label: "Last Week" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "last_2_months", label: "Last 2 Months" },
  { value: "last_3_months", label: "Last 3 Months" },
  { value: "this_year", label: "This Year" },
  { value: "last_year", label: "Last Year" },
  { value: "custom", label: "Custom Range" },
];

export const buildTimeframeParams = (timeframe: string, dateFrom: string, dateTo: string): string[] => {
  const params: string[] = [];
  if (timeframe !== "all_time") params.push(`timeframe=${timeframe}`);
  if (timeframe === "custom") {
    if (dateFrom) params.push(`start_date=${dateFrom}`);
    if (dateTo) params.push(`end_date=${dateTo}`);
  }
  return params;
};

export const TimeframeSelect: React.FC<{
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}> = ({ value, onChange, disabled }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    disabled={disabled}
    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-700 disabled:opacity-50"
  >
    {TIMEFRAME_OPTIONS.map((o) => (
      <option key={o.value} value={o.value}>{o.label}</option>
    ))}
  </select>
);

export const CustomDateInputs: React.FC<{
  dateFrom: string;
  dateTo: string;
  setDateFrom: (v: string) => void;
  setDateTo: (v: string) => void;
  disabled?: boolean;
}> = ({ dateFrom, dateTo, setDateFrom, setDateTo, disabled }) => (
  <>
    <div>
      <input
        type="date"
        value={dateFrom}
        onChange={(e) => setDateFrom(e.target.value)}
        disabled={disabled}
        title="Date From"
        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-700 disabled:opacity-50"
      />
    </div>
    <div>
      <input
        type="date"
        value={dateTo}
        onChange={(e) => setDateTo(e.target.value)}
        disabled={disabled}
        min={dateFrom}
        title="Date To"
        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-700 disabled:opacity-50"
      />
    </div>
  </>
);

const ExportDropdown: React.FC<{
  isLoading: boolean;
  hasData: boolean;
  data: any[];
  filename: string;
  reportTitle: string;
}> = ({ isLoading, hasData, data, filename, reportTitle }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading || !hasData}
        className="flex items-center gap-2 px-5 py-2.5 bg-brand-primary text-white hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-bold transition-all shadow-md shadow-brand-primary/20"
      >
        <Download size={18} />
        Export
        <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 py-2 animate-in fade-in zoom-in-95 duration-200">
          <button
            onClick={() => { exportToCSV(data, filename); setIsOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <div className="p-1.5 bg-slate-50 text-slate-600 rounded-lg"><FileText size={16} /></div>
            Export as CSV
          </button>
          <button
            onClick={() => { exportToExcel(data, filename); setIsOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg"><FileSpreadsheet size={16} /></div>
            Export as Excel
          </button>
          <button
            onClick={() => { exportToPDF(data, filename, reportTitle); setIsOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <div className="p-1.5 bg-red-50 text-red-600 rounded-lg"><FilePdf size={16} /></div>
            Export as PDF
          </button>
        </div>
      )}
    </div>
  );
};

export const ReportShell: React.FC<{
  title: string;
  subtitle: string;
  metaLine?: string;
  isLoading: boolean;
  onClear: () => void;
  onRefresh: () => void;
  exportData: any[];
  exportFilename: string;
  filters: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, subtitle, metaLine, isLoading, onClear, onRefresh, exportData, exportFilename, filters, children }) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 animate-in slide-in-from-bottom-4 duration-500 w-full overflow-hidden flex flex-col gap-6">
      <div>
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-2">
          <div>
            <h2 className="text-xl font-bold text-slate-800">{title}</h2>
            <p className="text-sm text-slate-500">{subtitle}</p>
            {metaLine && <p className="text-xs text-slate-400 font-medium mt-1">{metaLine}</p>}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClear}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50 rounded-xl text-sm font-bold transition-colors"
              title="Clear Filters"
            >
              <FilterX size={18} />
              <span className="hidden sm:inline">Clear</span>
            </button>

            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50 rounded-xl text-sm font-bold transition-colors"
              title="Refresh Data"
            >
              <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <ExportDropdown
              isLoading={isLoading}
              hasData={exportData.length > 0}
              data={exportData}
              filename={exportFilename}
              reportTitle={title}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-4">
          {filters}
        </div>
      </div>

      {isLoading ? (
        <div className="h-full w-full flex items-center justify-center min-h-[400px] bg-slate-50/50 rounded-xl">
          <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
        </div>
      ) : (
        children
      )}
    </div>
  );
};

export const Pagination: React.FC<{
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  rangeStart: number;
  rangeEnd: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  limitOptions?: number[];
}> = ({ currentPage, totalPages, totalRecords, rangeStart, rangeEnd, itemsPerPage, onPageChange, onLimitChange, limitOptions = [25, 50, 100, 200] }) => (
  <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
    <div className="text-sm text-slate-500 font-medium">
      Showing <span className="text-slate-900 font-bold">{totalRecords === 0 ? 0 : rangeStart}</span> to{" "}
      <span className="text-slate-900 font-bold">{rangeEnd}</span> of{" "}
      <span className="text-slate-900 font-bold">{totalRecords}</span> records
    </div>
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 mr-4">
        <span className="text-xs text-slate-400 font-bold uppercase mr-2">Show</span>
        <select
          value={itemsPerPage}
          onChange={(e) => onLimitChange(Number(e.target.value))}
          className="bg-white border border-slate-200 rounded-lg text-xs font-bold px-2 py-1 outline-none focus:ring-2 focus:ring-brand-primary/20"
        >
          {limitOptions.map((val) => (
            <option key={val} value={val}>{val}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors shadow-sm"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="flex items-center gap-1 px-2">
          <span className="text-sm font-bold text-slate-900">{currentPage}</span>
          <span className="text-sm text-slate-400 mx-1">of</span>
          <span className="text-sm font-bold text-slate-900">{totalPages || 1}</span>
        </div>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || totalPages === 0}
          className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors shadow-sm"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  </div>
);

export const usePagedRows = (rows: any[], defaultPageSize: number = 10) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  useEffect(() => {
    setPage(1);
  }, [rows]);

  const totalRecords = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const indexOfLast = page * pageSize;
  const indexOfFirst = indexOfLast - pageSize;
  const pageRows = rows.slice(indexOfFirst, indexOfLast);

  return {
    page,
    setPage,
    pageSize,
    setPageSize: (v: number) => { setPageSize(v); setPage(1); },
    totalPages,
    totalRecords,
    indexOfFirst,
    indexOfLast,
    pageRows,
  };
};

export const KpiCard: React.FC<{
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  colorClass: string;
}> = ({ icon: Icon, label, value, colorClass }) => (
  <div className={`p-5 rounded-2xl flex items-center gap-4 border ${colorClass}`}>
    <div className="p-3 rounded-xl shrink-0 bg-black/10">
      <Icon size={20} />
    </div>
    <div>
      <p className="text-xs font-bold uppercase tracking-wider mb-1 opacity-80">{label}</p>
      <p className="text-xl font-black">{value}</p>
    </div>
  </div>
);

// import React, { useEffect, useRef, useState } from "react";
// import {
//   FileText,
//   FileSpreadsheet,
//   File as FilePdf,
//   Loader2,
//   ChevronDown,
//   Download,
//   ChevronLeft,
//   ChevronRight,
//   FilterX,
//   RefreshCw,
// } from "lucide-react";
// import { exportToCSV, exportToExcel, exportToPDF } from "../../utils/exportUtils";

// export const renderValue = (val: any) => {
//   if (val === null || val === undefined || val === "") return "—";
//   return String(val);
// };

// export const formatCurrency = (val: any) => {
//   const num = parseFloat(val);
//   if (isNaN(num)) return "₦0.00";
//   return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 2 }).format(num);
// };

// export const badgeClass = (status?: string) => {
//   const s = (status || "").toUpperCase();
//   if (s.includes("CRITICAL") || s.includes("CANCEL") || s.includes("REJECT") || s.includes("EXPIRED") || s.includes("BREACH") || s.includes("MISSED") || s.includes("OMITTED") || s.includes("MAINTENANCE") || s.includes("OUT_OF_SERVICE") || s.includes("OUT OF SERVICE")) {
//     return "bg-red-50 text-red-600 border-red-100";
//   }
//   if (s.includes("NO_SHOW") || s.includes("NO SHOW")) {
//     return "bg-orange-50 text-orange-600 border-orange-100";
//   }
//   if (s.includes("PENDING") || s.includes("PARTIAL") || s.includes("WARNING") || s.includes("RISK") || s.includes("REQUESTED")) {
//     return "bg-amber-50 text-amber-600 border-amber-100";
//   }
//   if (s.includes("PAID") || s.includes("OPTIMAL") || s.includes("APPROVED") || s.includes("COMPLETED") || s.includes("COVERED") || s.includes("REPORTED") || s.includes("AVAILABLE") || s.includes("GIVEN")) {
//     return "bg-emerald-50 text-emerald-600 border-emerald-100";
//   }
//   if (s.includes("SCHEDULED") || s.includes("ORDERED") || s.includes("BOOKED") || s.includes("CHECKED_IN") || s.includes("CHECKED IN") || s.includes("OCCUPIED")) {
//     return "bg-blue-50 text-blue-600 border-blue-100";
//   }
//   if (s.includes("SCANNED") || s.includes("COLLECTED") || s.includes("PROCESSING") || s.includes("IN_PROGRESS") || s.includes("IN PROGRESS")) {
//     return "bg-purple-50 text-purple-600 border-purple-100";
//   }
//   return "bg-slate-50 text-slate-500 border-slate-100";
// };

// export const TIMEFRAME_OPTIONS: { value: string; label: string }[] = [
//   { value: "all_time", label: "All Time" },
//   { value: "today", label: "Today" },
//   { value: "yesterday", label: "Yesterday" },
//   { value: "this_week", label: "This Week" },
//   { value: "last_week", label: "Last Week" },
//   { value: "this_month", label: "This Month" },
//   { value: "last_month", label: "Last Month" },
//   { value: "last_2_months", label: "Last 2 Months" },
//   { value: "last_3_months", label: "Last 3 Months" },
//   { value: "this_year", label: "This Year" },
//   { value: "last_year", label: "Last Year" },
//   { value: "custom", label: "Custom Range" },
// ];

// export const buildTimeframeParams = (timeframe: string, dateFrom: string, dateTo: string): string[] => {
//   const params: string[] = [];
//   if (timeframe !== "all_time") params.push(`timeframe=${timeframe}`);
//   if (timeframe === "custom") {
//     if (dateFrom) params.push(`start_date=${dateFrom}`);
//     if (dateTo) params.push(`end_date=${dateTo}`);
//   }
//   return params;
// };

// export const TimeframeSelect: React.FC<{
//   value: string;
//   onChange: (v: string) => void;
//   disabled?: boolean;
// }> = ({ value, onChange, disabled }) => (
//   <select
//     value={value}
//     onChange={(e) => onChange(e.target.value)}
//     disabled={disabled}
//     className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-700 disabled:opacity-50"
//   >
//     {TIMEFRAME_OPTIONS.map((o) => (
//       <option key={o.value} value={o.value}>{o.label}</option>
//     ))}
//   </select>
// );

// export const CustomDateInputs: React.FC<{
//   dateFrom: string;
//   dateTo: string;
//   setDateFrom: (v: string) => void;
//   setDateTo: (v: string) => void;
//   disabled?: boolean;
// }> = ({ dateFrom, dateTo, setDateFrom, setDateTo, disabled }) => (
//   <>
//     <div>
//       <input
//         type="date"
//         value={dateFrom}
//         onChange={(e) => setDateFrom(e.target.value)}
//         disabled={disabled}
//         title="Date From"
//         className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-700 disabled:opacity-50"
//       />
//     </div>
//     <div>
//       <input
//         type="date"
//         value={dateTo}
//         onChange={(e) => setDateTo(e.target.value)}
//         disabled={disabled}
//         min={dateFrom}
//         title="Date To"
//         className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-700 disabled:opacity-50"
//       />
//     </div>
//   </>
// );

// const ExportDropdown: React.FC<{
//   isLoading: boolean;
//   hasData: boolean;
//   data: any[];
//   filename: string;
//   reportTitle: string;
// }> = ({ isLoading, hasData, data, filename, reportTitle }) => {
//   const [isOpen, setIsOpen] = useState(false);
//   const ref = useRef<HTMLDivElement>(null);

//   useEffect(() => {
//     const handler = (e: MouseEvent) => {
//       if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
//     };
//     document.addEventListener("mousedown", handler);
//     return () => document.removeEventListener("mousedown", handler);
//   }, []);

//   return (
//     <div className="relative" ref={ref}>
//       <button
//         onClick={() => setIsOpen(!isOpen)}
//         disabled={isLoading || !hasData}
//         className="flex items-center gap-2 px-5 py-2.5 bg-brand-primary text-white hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-bold transition-all shadow-md shadow-brand-primary/20"
//       >
//         <Download size={18} />
//         Export
//         <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
//       </button>
//       {isOpen && (
//         <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 py-2 animate-in fade-in zoom-in-95 duration-200">
//           <button
//             onClick={() => { exportToCSV(data, filename); setIsOpen(false); }}
//             className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
//           >
//             <div className="p-1.5 bg-slate-50 text-slate-600 rounded-lg"><FileText size={16} /></div>
//             Export as CSV
//           </button>
//           <button
//             onClick={() => { exportToExcel(data, filename); setIsOpen(false); }}
//             className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
//           >
//             <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg"><FileSpreadsheet size={16} /></div>
//             Export as Excel
//           </button>
//           <button
//             onClick={() => { exportToPDF(data, filename, reportTitle); setIsOpen(false); }}
//             className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
//           >
//             <div className="p-1.5 bg-red-50 text-red-600 rounded-lg"><FilePdf size={16} /></div>
//             Export as PDF
//           </button>
//         </div>
//       )}
//     </div>
//   );
// };

// export const ReportShell: React.FC<{
//   title: string;
//   subtitle: string;
//   metaLine?: string;
//   isLoading: boolean;
//   onClear: () => void;
//   onRefresh: () => void;
//   exportData: any[];
//   exportFilename: string;
//   filters: React.ReactNode;
//   children: React.ReactNode;
// }> = ({ title, subtitle, metaLine, isLoading, onClear, onRefresh, exportData, exportFilename, filters, children }) => {
//   return (
//     <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 animate-in slide-in-from-bottom-4 duration-500 w-full overflow-hidden flex flex-col gap-6">
//       <div>
//         <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-2">
//           <div>
//             <h2 className="text-xl font-bold text-slate-800">{title}</h2>
//             <p className="text-sm text-slate-500">{subtitle}</p>
//             {metaLine && <p className="text-xs text-slate-400 font-medium mt-1">{metaLine}</p>}
//           </div>

//           <div className="flex items-center gap-3">
//             <button
//               onClick={onClear}
//               disabled={isLoading}
//               className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50 rounded-xl text-sm font-bold transition-colors"
//               title="Clear Filters"
//             >
//               <FilterX size={18} />
//               <span className="hidden sm:inline">Clear</span>
//             </button>

//             <button
//               onClick={onRefresh}
//               disabled={isLoading}
//               className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50 rounded-xl text-sm font-bold transition-colors"
//               title="Refresh Data"
//             >
//               <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
//               <span className="hidden sm:inline">Refresh</span>
//             </button>

//             <ExportDropdown
//               isLoading={isLoading}
//               hasData={exportData.length > 0}
//               data={exportData}
//               filename={exportFilename}
//               reportTitle={title}
//             />
//           </div>
//         </div>

//         <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-4">
//           {filters}
//         </div>
//       </div>

//       {isLoading ? (
//         <div className="h-full w-full flex items-center justify-center min-h-[400px] bg-slate-50/50 rounded-xl">
//           <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
//         </div>
//       ) : (
//         children
//       )}
//     </div>
//   );
// };

// export const Pagination: React.FC<{
//   currentPage: number;
//   totalPages: number;
//   totalRecords: number;
//   rangeStart: number;
//   rangeEnd: number;
//   itemsPerPage: number;
//   onPageChange: (page: number) => void;
//   onLimitChange: (limit: number) => void;
//   limitOptions?: number[];
// }> = ({ currentPage, totalPages, totalRecords, rangeStart, rangeEnd, itemsPerPage, onPageChange, onLimitChange, limitOptions = [25, 50, 100, 200] }) => (
//   <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
//     <div className="text-sm text-slate-500 font-medium">
//       Showing <span className="text-slate-900 font-bold">{totalRecords === 0 ? 0 : rangeStart}</span> to{" "}
//       <span className="text-slate-900 font-bold">{rangeEnd}</span> of{" "}
//       <span className="text-slate-900 font-bold">{totalRecords}</span> records
//     </div>
//     <div className="flex items-center gap-2">
//       <div className="flex items-center gap-1 mr-4">
//         <span className="text-xs text-slate-400 font-bold uppercase mr-2">Show</span>
//         <select
//           value={itemsPerPage}
//           onChange={(e) => onLimitChange(Number(e.target.value))}
//           className="bg-white border border-slate-200 rounded-lg text-xs font-bold px-2 py-1 outline-none focus:ring-2 focus:ring-brand-primary/20"
//         >
//           {limitOptions.map((val) => (
//             <option key={val} value={val}>{val}</option>
//           ))}
//         </select>
//       </div>
//       <div className="flex items-center gap-1">
//         <button
//           onClick={() => onPageChange(currentPage - 1)}
//           disabled={currentPage === 1}
//           className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors shadow-sm"
//         >
//           <ChevronLeft size={16} />
//         </button>
//         <div className="flex items-center gap-1 px-2">
//           <span className="text-sm font-bold text-slate-900">{currentPage}</span>
//           <span className="text-sm text-slate-400 mx-1">of</span>
//           <span className="text-sm font-bold text-slate-900">{totalPages || 1}</span>
//         </div>
//         <button
//           onClick={() => onPageChange(currentPage + 1)}
//           disabled={currentPage === totalPages || totalPages === 0}
//           className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors shadow-sm"
//         >
//           <ChevronRight size={16} />
//         </button>
//       </div>
//     </div>
//   </div>
// );

// export const usePagedRows = (rows: any[], defaultPageSize: number = 10) => {
//   const [page, setPage] = useState(1);
//   const [pageSize, setPageSize] = useState(defaultPageSize);

//   useEffect(() => {
//     setPage(1);
//   }, [rows]);

//   const totalRecords = rows.length;
//   const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
//   const indexOfLast = page * pageSize;
//   const indexOfFirst = indexOfLast - pageSize;
//   const pageRows = rows.slice(indexOfFirst, indexOfLast);

//   return {
//     page,
//     setPage,
//     pageSize,
//     setPageSize: (v: number) => { setPageSize(v); setPage(1); },
//     totalPages,
//     totalRecords,
//     indexOfFirst,
//     indexOfLast,
//     pageRows,
//   };
// };

// export const KpiCard: React.FC<{
//   icon: React.ElementType;
//   label: string;
//   value: React.ReactNode;
//   colorClass: string;
// }> = ({ icon: Icon, label, value, colorClass }) => (
//   <div className={`p-5 rounded-2xl flex items-center gap-4 border ${colorClass}`}>
//     <div className="p-3 rounded-xl shrink-0 bg-black/10">
//       <Icon size={20} />
//     </div>
//     <div>
//       <p className="text-xs font-bold uppercase tracking-wider mb-1 opacity-80">{label}</p>
//       <p className="text-xl font-black">{value}</p>
//     </div>
//   </div>
// );
