import React, { useState, useEffect, useRef } from "react";
import { 
  Search, 
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
  CalendarRange
} from "lucide-react";
import { exportToCSV, exportToExcel, exportToPDF } from "../../utils/exportUtils";
import apiClient from "../../api/client";
import { i18n } from "../../i18n";

const renderValue = (val: any) => {
  if (val === null || val === undefined || val === "") return "—";
  return String(val);
};

const InventoryMovementReport: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [metadata, setMetadata] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [timeframe, setTimeframe] = useState("all_time");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  
  // Dropdown State
  const [isExportOpen, setIsExportOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchReportData = async () => {
    try {
      setIsLoading(true);
      let url = `/inventory/stock/movement/report`;
      if (timeframe !== "all_time") {
        url += `?timeframe=${timeframe}`;
      }
      if (timeframe === "custom") {
        if (dateFrom) url += `&start_date=${dateFrom}`;
        if (dateTo) url += `&end_date=${dateTo}`;
      }
      
      const response = await apiClient.get(url);
      if (response.data && response.data.data) {
        setData(response.data.data.records || []);
        setMetadata(response.data.data.metadata || null);
      } else {
        setData([]);
      }
    } catch (error) {
      console.error("Failed to fetch inventory movement report data:", error);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [timeframe, dateFrom, dateTo]); // Auto refetch on filter change

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsExportOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredData = data.filter((item) => {
    const matchesSearch = 
      renderValue(item.item_name).toLowerCase().includes(searchTerm.toLowerCase()) ||
      renderValue(item.brand).toLowerCase().includes(searchTerm.toLowerCase()) ||
      renderValue(item.items_uhid).toLowerCase().includes(searchTerm.toLowerCase()) ||
      renderValue(item.source_location).toLowerCase().includes(searchTerm.toLowerCase()) ||
      renderValue(item.destination_location).toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Pagination Logic
  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleExportCSV = () => {
    exportToCSV(filteredData, "inventory_movement_report");
    setIsExportOpen(false);
  };

  const handleExportExcel = () => {
    exportToExcel(filteredData, "inventory_movement_report");
    setIsExportOpen(false);
  };

  const handleExportPDF = () => {
    exportToPDF(filteredData, "inventory_movement_report", "Inventory Movement Report");
    setIsExportOpen(false);
  };

  const headers = data.length > 0 ? Object.keys(data[0]) : [];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 animate-in slide-in-from-bottom-4 duration-500 w-full overflow-hidden flex flex-col">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">{i18n.t("Inventory Movement Report")}</h2>
          <p className="text-sm text-slate-500">{i18n.t("View detailed stock movements across all locations.")}</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setSearchTerm("");
              setTimeframe("all_time");
              setDateFrom("");
              setDateTo("");
            }}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50 rounded-xl text-sm font-bold transition-colors"
            title={i18n.t("Clear Filters")}
          >
            <FilterX size={18} />
            <span className="hidden sm:inline">{i18n.t("Clear")}</span>
          </button>
          
          <button
            onClick={fetchReportData}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50 rounded-xl text-sm font-bold transition-colors"
            title={i18n.t("Refresh Data")}
          >
            <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">{i18n.t("Refresh")}</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsExportOpen(!isExportOpen)}
              disabled={isLoading || data.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-primary text-white hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-bold transition-all shadow-md shadow-brand-primary/20"
            >
              <Download size={18} />{i18n.t("Export")}<ChevronDown size={16} className={`transition-transform duration-200 ${isExportOpen ? "rotate-180" : ""}`} />
            </button>

          {isExportOpen && (
            <div className="absolute end-0 mt-2 w-48 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 py-2 animate-in fade-in zoom-in-95 duration-200">
              <button 
                onClick={handleExportCSV}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <div className="p-1.5 bg-slate-50 text-slate-600 rounded-lg">
                  <FileText size={16} />
                </div>{i18n.t("Export as CSV")}</button>
              <button 
                onClick={handleExportExcel}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                  <FileSpreadsheet size={16} />
                </div>{i18n.t("Export as Excel")}</button>
              <button 
                onClick={handleExportPDF}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <div className="p-1.5 bg-red-50 text-red-600 rounded-lg">
                  <FilePdf size={16} />
                </div>{i18n.t("Export as PDF")}</button>
            </div>
          )}
        </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        <div className="relative lg:col-span-2">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder={i18n.t("Search item, brand, UHID, locations...")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={isLoading}
            className="w-full ps-10 pe-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary disabled:opacity-50"
          />
        </div>
        <div>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            disabled={isLoading}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-700 disabled:opacity-50"
          >
            <option value="all_time">{i18n.t("All Time")}</option>
            <option value="today">{i18n.t("Today")}</option>
            <option value="yesterday">{i18n.t("Yesterday")}</option>
            <option value="last_week">{i18n.t("Last Week")}</option>
            <option value="last_month">{i18n.t("Last Month")}</option>
            <option value="last_2_months">{i18n.t("Last 2 Months")}</option>
            <option value="last_3_months">{i18n.t("Last 3 Months")}</option>
            <option value="last_year">{i18n.t("Last Year")}</option>
            <option value="custom">{i18n.t("Custom Range")}</option>
          </select>
        </div>
        
        {timeframe === "custom" && (
          <>
            <div className="relative">
              <CalendarRange className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                disabled={isLoading}
                title={i18n.t("Date From")}
                className="w-full ps-9 pe-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-700 disabled:opacity-50"
              />
            </div>
            <div className="relative">
              <CalendarRange className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                disabled={isLoading}
                min={dateFrom}
                title={i18n.t("Date To")}
                className="w-full ps-9 pe-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-700 disabled:opacity-50"
              />
            </div>
          </>
        )}
      </div>

      {metadata && (
        <div className="grid grid-cols-2 gap-4 mb-6">
           <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
             <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-1">{i18n.t("Total Movement Transactions")}</p>
             <p className="text-2xl font-black text-blue-900">{metadata.aggregates?.total_movement_transactions || 0}</p>
           </div>
           <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
             <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider mb-1">{i18n.t("Total Quantity Moved")}</p>
             <p className="text-2xl font-black text-emerald-900">{metadata.aggregates?.total_quantity_moved || 0}</p>
           </div>
        </div>
      )}

      <div className="overflow-x-auto overflow-y-auto rounded-xl border border-slate-200 flex-1 min-h-[400px]">
        {isLoading ? (
          <div className="h-full w-full flex items-center justify-center min-h-[400px] bg-slate-50/50">
            <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
          </div>
        ) : (
          <table className="w-full text-start text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
              <tr>
                {headers.map(header => (
                  <th key={header} className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">
                    {header.replace(/_/g, " ")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentItems.length > 0 ? (
                currentItems.map((row, index) => (
                  <tr key={index} className="hover:bg-slate-50/80 transition-colors">
                    {headers.map(header => (
                      <td key={header} className="px-4 py-3.5 text-slate-700 border-e border-slate-50 last:border-e-0">
                        {renderValue(row[header as keyof typeof row])}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={headers.length || 1} className="px-4 py-12 text-center text-slate-400 italic">{i18n.t("No movement records found.")}</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
      
      {/* Pagination Footer */}
      {!isLoading && data.length > 0 && (
        <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
          <div className="text-sm text-slate-500 font-medium">{i18n.t("Showing")}{" "}<span className="text-slate-900 font-bold">{indexOfFirstItem + 1}</span>{" "}{i18n.t("to")}{" "}
            <span className="text-slate-900 font-bold">
              {Math.min(indexOfLastItem, totalItems)}
            </span>{" "}{i18n.t("of")}{" "}
            <span className="text-slate-900 font-bold">{totalItems}</span>{" "}{i18n.t("records")}</div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 me-4">
              <span className="text-xs text-slate-400 font-bold uppercase me-2">{i18n.t("Show")}</span>
              <select 
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-200 rounded-lg text-xs font-bold px-2 py-1 outline-none focus:ring-2 focus:ring-brand-primary/20"
              >
                {[10, 25, 50, 100].map(val => (
                  <option key={val} value={val}>{val}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors shadow-sm"
              >
                <ChevronLeft className="rtl:-scale-x-100" size={16} />
              </button>
              
              <div className="flex items-center gap-1 px-2">
                <span className="text-sm font-bold text-slate-900">{currentPage}</span>
                <span className="text-sm text-slate-400 mx-1">{i18n.t("of")}</span>
                <span className="text-sm font-bold text-slate-900">{totalPages || 1}</span>
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors shadow-sm"
              >
                <ChevronRight className="rtl:-scale-x-100" size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryMovementReport;
