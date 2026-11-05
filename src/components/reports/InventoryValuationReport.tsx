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
  CalendarRange,
  AlertTriangle,
} from "lucide-react";
import { exportToCSV, exportToExcel, exportToPDF } from "../../utils/exportUtils";
import apiClient from "../../api/client";

const renderValue = (val: any) => {
  if (val === null || val === undefined || val === "") return "—";
  return String(val);
};

const diagnosisBadgeClass = (status?: string) => {
  const s = (status || "").toUpperCase();
  if (s === "EXPIRED") return "bg-red-50 text-red-600 border-red-100";
  if (s.includes("NEAR") || s.includes("WARNING") || s.includes("LOW")) return "bg-amber-50 text-amber-600 border-amber-100";
  if (s.includes("OK") || s.includes("GOOD") || s.includes("HEALTHY")) return "bg-emerald-50 text-emerald-600 border-emerald-100";
  return "bg-slate-50 text-slate-500 border-slate-100";
};

const ITEM_TYPES = ["DRUG", "CONSUMABLE", "DEVICE"];
const LOCATIONS = ["STORE", "PHARMACY", "CSSD", "THEATRE", "LAB", "RADIOLOGY", "WARD", "ICU", "HDU", "ERD", "OPD", "PATIENT"];

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 2 }).format(val || 0);
};

const InventoryValuationReport: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState<{ filtered_stock_count?: number; filtered_financial_value?: number } | null>(null);
  const [pagination, setPagination] = useState<{ total_records: number; limit: number; offset: number; total_pages: number; current_page: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [timeframe, setTimeframe] = useState("today");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [itemTypeFilter, setItemTypeFilter] = useState("All");
  const [locationFilter, setLocationFilter] = useState("All");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // Dropdown State
  const [isExportOpen, setIsExportOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchReportData = async () => {
    try {
      setIsLoading(true);
      const params: string[] = [];
      if (timeframe !== "all_time") params.push(`timeframe=${timeframe}`);
      if (timeframe === "custom") {
        if (dateFrom) params.push(`start_date=${dateFrom}`);
        if (dateTo) params.push(`end_date=${dateTo}`);
      }
      if (itemTypeFilter !== "All") params.push(`item_type=${itemTypeFilter}`);
      if (locationFilter !== "All") params.push(`location=${locationFilter}`);
      params.push(`limit=${itemsPerPage}`, `offset=${(currentPage - 1) * itemsPerPage}`);

      const url = `/inventory/financial/valuation/report?${params.join("&")}`;

      const response = await apiClient.get(url);
      if (response.data && response.data.data) {
        setData(response.data.data.records || []);
        setSummary(response.data.data.summary || null);
        setPagination(response.data.data.pagination || null);
      } else {
        setData([]);
        setSummary(null);
        setPagination(null);
      }
    } catch (error) {
      console.error("Failed to fetch inventory valuation report data:", error);
      setData([]);
      setSummary(null);
      setPagination(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [timeframe, dateFrom, dateTo, itemTypeFilter, locationFilter, currentPage, itemsPerPage]);

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
    return (
      renderValue(item.item_name).toLowerCase().includes(searchTerm.toLowerCase()) ||
      renderValue(item.items_uhid).toLowerCase().includes(searchTerm.toLowerCase()) ||
      renderValue(item.brand).toLowerCase().includes(searchTerm.toLowerCase()) ||
      renderValue(item.batch_number).toLowerCase().includes(searchTerm.toLowerCase()) ||
      renderValue(item.vendor_name).toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const totalRecords = pagination?.total_records ?? filteredData.length;
  const totalPages = pagination?.total_pages ?? 1;
  const indexOfFirstItem = pagination ? pagination.offset : 0;
  const indexOfLastItem = pagination ? pagination.offset + data.length : data.length;

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [timeframe, dateFrom, dateTo, itemTypeFilter, locationFilter]);

  const handleExportCSV = () => {
    exportToCSV(filteredData, "inventory_financial_valuation_report");
    setIsExportOpen(false);
  };

  const handleExportExcel = () => {
    exportToExcel(filteredData, "inventory_financial_valuation_report");
    setIsExportOpen(false);
  };

  const handleExportPDF = () => {
    exportToPDF(filteredData, "inventory_financial_valuation_report", "Inventory Financial Valuation Report");
    setIsExportOpen(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 animate-in slide-in-from-bottom-4 duration-500 w-full overflow-hidden flex flex-col">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Inventory Financial Valuation Report</h2>
          <p className="text-sm text-slate-500">View the financial value of stock on hand across all locations.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setSearchTerm("");
              setTimeframe("today");
              setDateFrom("");
              setDateTo("");
              setItemTypeFilter("All");
              setLocationFilter("All");
            }}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50 rounded-xl text-sm font-bold transition-colors"
            title="Clear Filters"
          >
            <FilterX size={18} />
            <span className="hidden sm:inline">Clear</span>
          </button>

          <button
            onClick={fetchReportData}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50 rounded-xl text-sm font-bold transition-colors"
            title="Refresh Data"
          >
            <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsExportOpen(!isExportOpen)}
              disabled={isLoading || data.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-primary text-white hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-bold transition-all shadow-md shadow-brand-primary/20"
            >
              <Download size={18} />
              Export
              <ChevronDown size={16} className={`transition-transform duration-200 ${isExportOpen ? "rotate-180" : ""}`} />
            </button>

            {isExportOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 py-2 animate-in fade-in zoom-in-95 duration-200">
                <button
                  onClick={handleExportCSV}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <div className="p-1.5 bg-slate-50 text-slate-600 rounded-lg">
                    <FileText size={16} />
                  </div>
                  Export as CSV
                </button>
                <button
                  onClick={handleExportExcel}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                    <FileSpreadsheet size={16} />
                  </div>
                  Export as Excel
                </button>
                <button
                  onClick={handleExportPDF}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <div className="p-1.5 bg-red-50 text-red-600 rounded-lg">
                    <FilePdf size={16} />
                  </div>
                  Export as PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search item, UHID, brand, batch, vendor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={isLoading}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary disabled:opacity-50"
          />
        </div>
        <div>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            disabled={isLoading}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-700 disabled:opacity-50"
          >
            <option value="all_time">All Time</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="this_week">This Week</option>
            <option value="last_week">Last Week</option>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="last_2_months">Last 2 Months</option>
            <option value="last_3_months">Last 3 Months</option>
            <option value="this_year">This Year</option>
            <option value="last_year">Last Year</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>
        <div>
          <select
            value={itemTypeFilter}
            onChange={(e) => setItemTypeFilter(e.target.value)}
            disabled={isLoading}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-700 disabled:opacity-50"
          >
            <option value="All">All Item Types</option>
            {ITEM_TYPES.map((t) => (
              <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>
            ))}
          </select>
        </div>
        <div>
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            disabled={isLoading}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-700 disabled:opacity-50"
          >
            <option value="All">All Locations</option>
            {LOCATIONS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>

        {timeframe === "custom" && (
          <>
            <div className="relative">
              <CalendarRange className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                disabled={isLoading}
                title="Date From"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-700 disabled:opacity-50"
              />
            </div>
            <div className="relative">
              <CalendarRange className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                disabled={isLoading}
                min={dateFrom}
                title="Date To"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-700 disabled:opacity-50"
              />
            </div>
          </>
        )}
      </div>

      {summary && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
            <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-1">Filtered Stock Count</p>
            <p className="text-2xl font-black text-blue-900">{summary.filtered_stock_count?.toLocaleString() ?? 0}</p>
          </div>
          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
            <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider mb-1">Filtered Financial Value</p>
            <p className="text-2xl font-black text-emerald-900">{formatCurrency(summary.filtered_financial_value || 0)}</p>
          </div>
        </div>
      )}

      <div className="overflow-x-auto overflow-y-auto rounded-xl border border-slate-200 flex-1 min-h-[400px]">
        {isLoading ? (
          <div className="h-full w-full flex items-center justify-center min-h-[400px] bg-slate-50/50">
            <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
          </div>
        ) : (
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Item</th>
                <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Type</th>
                <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Location</th>
                <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Batch</th>
                <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Expiry</th>
                <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-right">Qty</th>
                <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-right">Unit Cost</th>
                <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-right">Total Value</th>
                <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Vendor</th>
                <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Recorded By</th>
                <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Diagnosis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.length > 0 ? (
                filteredData.map((row, index) => (
                  <tr key={`${row.items_uhid}-${row.batch_number}-${index}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3.5 border-r border-slate-50">
                      <div className="font-bold text-slate-800">{renderValue(row.item_name)}</div>
                      <div className="text-[11px] text-slate-400">{renderValue(row.brand)} • {renderValue(row.items_uhid)}</div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-700 border-r border-slate-50">{renderValue(row.item_type)}</td>
                    <td className="px-4 py-3.5 text-slate-700 border-r border-slate-50">{renderValue(row.location)}</td>
                    <td className="px-4 py-3.5 text-slate-700 border-r border-slate-50">{renderValue(row.batch_number)}</td>
                    <td className="px-4 py-3.5 border-r border-slate-50">{renderValue(row.expiry_date)}</td>
                    <td className="px-4 py-3.5 text-slate-700 border-r border-slate-50 text-right">{renderValue(row.stock_quantity)}</td>
                    <td className="px-4 py-3.5 text-slate-700 border-r border-slate-50 text-right">{formatCurrency(Number(row.unit_purchase_cost))}</td>
                    <td className="px-4 py-3.5 font-bold text-slate-800 border-r border-slate-50 text-right">{formatCurrency(Number(row.total_financial_value))}</td>
                    <td className="px-4 py-3.5 text-slate-700 border-r border-slate-50">{renderValue(row.vendor_name)}</td>
                    <td className="px-4 py-3.5 text-slate-700 border-r border-slate-50">{renderValue(row.recorded_by_user)}</td>
                    <td className="px-4 py-3.5">
                      {row.system_diagnosis ? (
                        <span
                          title={[row.system_diagnosis.problem_identified, row.system_diagnosis.recommended_action].filter(Boolean).join(" — ")}
                          className={`inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wider ${diagnosisBadgeClass(row.system_diagnosis.status)}`}
                        >
                          {row.system_diagnosis.status === "EXPIRED" && <AlertTriangle size={11} />}
                          {renderValue(row.system_diagnosis.status)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-slate-400 italic">
                    No valuation records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Footer */}
      {!isLoading && data.length > 0 && (
        <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
          <div className="text-sm text-slate-500 font-medium">
            Showing <span className="text-slate-900 font-bold">{indexOfFirstItem + 1}</span> to{" "}
            <span className="text-slate-900 font-bold">
              {Math.min(indexOfLastItem, totalRecords)}
            </span> of{" "}
            <span className="text-slate-900 font-bold">{totalRecords}</span> records
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 mr-4">
              <span className="text-xs text-slate-400 font-bold uppercase mr-2">Show</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-200 rounded-lg text-xs font-bold px-2 py-1 outline-none focus:ring-2 focus:ring-brand-primary/20"
              >
                {[25, 50, 100, 200].map((val) => (
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
                <ChevronLeft size={16} />
              </button>

              <div className="flex items-center gap-1 px-2">
                <span className="text-sm font-bold text-slate-900">{currentPage}</span>
                <span className="text-sm text-slate-400 mx-1">of</span>
                <span className="text-sm font-bold text-slate-900">{totalPages || 1}</span>
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors shadow-sm"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryValuationReport;
