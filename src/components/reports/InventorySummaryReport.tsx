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
  Wallet,
  Boxes,
  ShoppingCart,
} from "lucide-react";
import { exportToCSV, exportToExcel, exportToPDF } from "../../utils/exportUtils";
import apiClient from "../../api/client";
import { i18n } from "../../i18n";

const renderValue = (val: any) => {
  if (val === null || val === undefined || val === "") return "—";
  return String(val);
};

const ITEM_TYPES = ["DRUG", "CONSUMABLE", "DEVICE"];
const LOCATIONS = ["STORE", "PHARMACY", "CSSD", "THEATRE", "LAB", "RADIOLOGY", "WARD", "ICU", "HDU", "ERD", "OPD", "PATIENT"];

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 2 }).format(val || 0);
};

const statusBadgeClass = (status?: string) => {
  const s = (status || "").toUpperCase();
  if (s === "PENDING") return "bg-amber-50 text-amber-600 border-amber-100";
  if (s === "APPROVED" || s === "COMPLETED") return "bg-emerald-50 text-emerald-600 border-emerald-100";
  if (s === "REJECTED" || s === "CANCELLED") return "bg-red-50 text-red-600 border-red-100";
  return "bg-slate-50 text-slate-500 border-slate-100";
};

// Generic table for sections whose row shape isn't guaranteed (weekly supplies, approved requisition metrics)
const DynamicTable: React.FC<{ rows: any[]; emptyLabel: string }> = ({ rows, emptyLabel }) => {
  if (!rows || rows.length === 0) {
    return <div className="px-4 py-8 text-center text-slate-400 italic text-sm">{emptyLabel}</div>;
  }
  const headers = Object.keys(rows[0]);
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-start text-sm whitespace-nowrap">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px]">
                {h.replace(/_/g, " ")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-slate-50/80 transition-colors">
              {headers.map((h) => (
                <td key={h} className="px-4 py-3 text-slate-700">{renderValue(row[h])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const InventorySummaryReport: React.FC = () => {
  const [metadata, setMetadata] = useState<any>(null);
  const [kpis, setKpis] = useState<any>(null);
  const [reports, setReports] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [timeframe, setTimeframe] = useState("today");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [itemTypeFilter, setItemTypeFilter] = useState("All");
  const [locationFilter, setLocationFilter] = useState("All");

  // Pagination for detailed financial inventory (client-side; endpoint returns full set)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

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

      const url = `/inventory/summary/report${params.length ? `?${params.join("&")}` : ""}`;
      const response = await apiClient.get(url);
      if (response.data && response.data.data) {
        setMetadata(response.data.data.metadata || null);
        setKpis(response.data.data.kpis || null);
        setReports(response.data.data.reports || null);
      } else {
        setMetadata(null);
        setKpis(null);
        setReports(null);
      }
    } catch (error) {
      console.error("Failed to fetch inventory summary report data:", error);
      setMetadata(null);
      setKpis(null);
      setReports(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [timeframe, dateFrom, dateTo, itemTypeFilter, locationFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [timeframe, dateFrom, dateTo, itemTypeFilter, locationFilter, searchTerm]);

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

  const detailedInventory: any[] = reports?.detailed_financial_inventory || [];
  const filteredDetailed = detailedInventory.filter((item) => {
    return (
      renderValue(item.item_name).toLowerCase().includes(searchTerm.toLowerCase()) ||
      renderValue(item.items_uhid).toLowerCase().includes(searchTerm.toLowerCase()) ||
      renderValue(item.brand).toLowerCase().includes(searchTerm.toLowerCase()) ||
      renderValue(item.vendor_name).toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const totalItems = filteredDetailed.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredDetailed.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleExportCSV = () => {
    exportToCSV(filteredDetailed, "inventory_summary_report");
    setIsExportOpen(false);
  };

  const handleExportExcel = () => {
    exportToExcel(filteredDetailed, "inventory_summary_report");
    setIsExportOpen(false);
  };

  const handleExportPDF = () => {
    exportToPDF(filteredDetailed, "inventory_summary_report", "Inventory Summary Report");
    setIsExportOpen(false);
  };

  const classificationSummary: any[] = reports?.classification_summary || [];
  const vendorValuationSummary: any[] = reports?.vendor_valuation_summary || [];
  const weeklySupplies: any[] = reports?.weekly_supplies || [];
  const approvedRequisitionMetrics: any[] = reports?.approved_requisition_metrics || [];
  const requisitionTracking: any[] = reports?.requisition_tracking || [];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 animate-in slide-in-from-bottom-4 duration-500 w-full overflow-hidden flex flex-col gap-8">
      <div>
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-2">
          <div>
            <h2 className="text-xl font-bold text-slate-800">{i18n.t("Inventory Summary Report")}</h2>
            <p className="text-sm text-slate-500">{i18n.t("Comprehensive inventory dashboard — valuation, classification, vendors, and requisitions.")}</p>
            {metadata && (
              <p className="text-xs text-slate-400 font-medium mt-1">{i18n.t("Period:")}{" "}{renderValue(metadata.report_period)}{" "}{i18n.t("• Location:")}{" "}{renderValue(metadata.location_filter)}{" "}{i18n.t("• Item Type:")}{" "}{renderValue(metadata.item_type_filter)}
              </p>
            )}
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
                disabled={isLoading || detailedInventory.length === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-brand-primary text-white hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-bold transition-all shadow-md shadow-brand-primary/20"
              >
                <Download size={18} />{i18n.t("Export")}<ChevronDown size={16} className={`transition-transform duration-200 ${isExportOpen ? "rotate-180" : ""}`} />
              </button>

              {isExportOpen && (
                <div className="absolute end-0 mt-2 w-48 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 py-2 animate-in fade-in zoom-in-95 duration-200">
                  <button onClick={handleExportCSV} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                    <div className="p-1.5 bg-slate-50 text-slate-600 rounded-lg">
                      <FileText size={16} />
                    </div>{i18n.t("Export as CSV")}</button>
                  <button onClick={handleExportExcel} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                    <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                      <FileSpreadsheet size={16} />
                    </div>{i18n.t("Export as Excel")}</button>
                  <button onClick={handleExportPDF} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                    <div className="p-1.5 bg-red-50 text-red-600 rounded-lg">
                      <FilePdf size={16} />
                    </div>{i18n.t("Export as PDF")}</button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-4">
          <div className="relative lg:col-span-2">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder={i18n.t("Search item, UHID, brand, vendor...")}
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
              <option value="this_week">{i18n.t("This Week")}</option>
              <option value="last_week">{i18n.t("Last Week")}</option>
              <option value="this_month">{i18n.t("This Month")}</option>
              <option value="last_month">{i18n.t("Last Month")}</option>
              <option value="last_2_months">{i18n.t("Last 2 Months")}</option>
              <option value="last_3_months">{i18n.t("Last 3 Months")}</option>
              <option value="this_year">{i18n.t("This Year")}</option>
              <option value="last_year">{i18n.t("Last Year")}</option>
              <option value="custom">{i18n.t("Custom Range")}</option>
            </select>
          </div>
          <div>
            <select
              value={itemTypeFilter}
              onChange={(e) => setItemTypeFilter(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-700 disabled:opacity-50"
            >
              <option value="All">{i18n.t("All Item Types")}</option>
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
              <option value="All">{i18n.t("All Locations")}</option>
              {LOCATIONS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
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
      </div>

      {isLoading ? (
        <div className="h-full w-full flex items-center justify-center min-h-[400px] bg-slate-50/50 rounded-xl">
          <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-4">
              <div className="p-3 bg-emerald-600 text-white rounded-xl shrink-0">
                <Wallet size={20} />
              </div>
              <div>
                <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider mb-1">{i18n.t("Total Inventory Value")}</p>
                <p className="text-xl font-black text-emerald-900">{formatCurrency(kpis?.total_inventory_value || 0)}</p>
              </div>
            </div>
            <div className="p-5 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-4">
              <div className="p-3 bg-blue-600 text-white rounded-xl shrink-0">
                <Boxes size={20} />
              </div>
              <div>
                <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-1">{i18n.t("Total Items In Stock")}</p>
                <p className="text-xl font-black text-blue-900">{(kpis?.total_items_in_stock ?? 0).toLocaleString()}</p>
              </div>
            </div>
            <div className="p-5 bg-purple-50 border border-purple-100 rounded-2xl flex items-center gap-4">
              <div className="p-3 bg-purple-600 text-white rounded-xl shrink-0">
                <ShoppingCart size={20} />
              </div>
              <div>
                <p className="text-xs text-purple-600 font-bold uppercase tracking-wider mb-1">{i18n.t("Total Supply Cost (Period)")}</p>
                <p className="text-xl font-black text-purple-900">{formatCurrency(kpis?.total_supply_cost_period || 0)}</p>
              </div>
            </div>
          </div>

          {/* Classification Summary */}
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-3">{i18n.t("Classification Summary")}</h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-start text-sm whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px]">{i18n.t("Classification")}</th>
                    <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-end">{i18n.t("Unique Items")}</th>
                    <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-end">{i18n.t("Total Physical Stock")}</th>
                    <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-end">{i18n.t("Total Financial Value")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classificationSummary.length > 0 ? (
                    classificationSummary.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-800">{renderValue(row.classification)}</td>
                        <td className="px-4 py-3 text-slate-700 text-end">{renderValue(row.unique_items_count)}</td>
                        <td className="px-4 py-3 text-slate-700 text-end">{renderValue(row.total_physical_stock)}</td>
                        <td className="px-4 py-3 font-bold text-slate-800 text-end">{formatCurrency(Number(row.total_financial_value))}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic">{i18n.t("No classification data.")}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Vendor Valuation Summary */}
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-3">{i18n.t("Vendor Valuation Summary")}</h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-start text-sm whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px]">{i18n.t("Vendor")}</th>
                    <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px]">{i18n.t("Vendor UHID")}</th>
                    <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-end">{i18n.t("Items Supplied")}</th>
                    <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-end">{i18n.t("Total Physical Stock")}</th>
                    <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-end">{i18n.t("Total Financial Value")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vendorValuationSummary.length > 0 ? (
                    vendorValuationSummary.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-800">{renderValue(row.vendor_name)}</td>
                        <td className="px-4 py-3 text-slate-500 font-mono text-xs">{renderValue(row.vendor_uhid)}</td>
                        <td className="px-4 py-3 text-slate-700 text-end">{renderValue(row.unique_items_supplied)}</td>
                        <td className="px-4 py-3 text-slate-700 text-end">{renderValue(row.total_physical_stock)}</td>
                        <td className="px-4 py-3 font-bold text-slate-800 text-end">{formatCurrency(Number(row.total_financial_value))}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">{i18n.t("No vendor data.")}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Requisition Tracking */}
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-3">{i18n.t("Requisition Tracking")}</h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-start text-sm whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px]">{i18n.t("Request #")}</th>
                    <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px]">{i18n.t("Requesting Dept")}</th>
                    <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px]">{i18n.t("Dispensing Dept")}</th>
                    <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px]">{i18n.t("Item")}</th>
                    <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-end">{i18n.t("Requested")}</th>
                    <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-end">{i18n.t("Approved")}</th>
                    <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-end">{i18n.t("Outstanding")}</th>
                    <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px]">{i18n.t("Status")}</th>
                    <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px]">{i18n.t("Requested At")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {requisitionTracking.length > 0 ? (
                    requisitionTracking.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">{renderValue(row.request_number)}</td>
                        <td className="px-4 py-3 text-slate-700">{renderValue(row.requesting_dept)}</td>
                        <td className="px-4 py-3 text-slate-700">{renderValue(row.dispensing_dept)}</td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-800">{renderValue(row.item_name)}</div>
                          <div className="text-[11px] text-slate-400">{renderValue(row.item_type)}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-700 text-end">{renderValue(row.requested_qty)}</td>
                        <td className="px-4 py-3 text-slate-700 text-end">{renderValue(row.approved_qty)}</td>
                        <td className="px-4 py-3 text-slate-700 text-end">{renderValue(row.outstanding_qty)}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wider ${statusBadgeClass(row.item_status)}`}>
                            {renderValue(row.item_status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{renderValue(row.requested_at)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-slate-400 italic">{i18n.t("No requisition tracking data.")}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Weekly Supplies */}
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-3">{i18n.t("Weekly Supplies")}</h3>
            <DynamicTable rows={weeklySupplies} emptyLabel="No weekly supply data for this period." />
          </div>

          {/* Approved Requisition Metrics */}
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-3">{i18n.t("Approved Requisition Metrics")}</h3>
            <DynamicTable rows={approvedRequisitionMetrics} emptyLabel="No approved requisition metrics for this period." />
          </div>

          {/* Detailed Financial Inventory */}
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-3">{i18n.t("Detailed Financial Inventory")}</h3>
            <div className="overflow-x-auto overflow-y-auto rounded-xl border border-slate-200 min-h-[300px]">
              <table className="w-full text-start text-sm whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">{i18n.t("Item")}</th>
                    <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">{i18n.t("Type")}</th>
                    <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">{i18n.t("Location")}</th>
                    <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">{i18n.t("Vendor")}</th>
                    <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">{i18n.t("Vendor Contact")}</th>
                    <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-end">{i18n.t("Qty")}</th>
                    <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-end">{i18n.t("Unit Cost")}</th>
                    <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-end">{i18n.t("Total Value")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentItems.length > 0 ? (
                    currentItems.map((row, index) => (
                      <tr key={`${row.items_uhid}-${index}`} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3.5 border-e border-slate-50">
                          <div className="font-bold text-slate-800">{renderValue(row.item_name)}</div>
                          <div className="text-[11px] text-slate-400">{renderValue(row.brand)} • {renderValue(row.items_uhid)}</div>
                        </td>
                        <td className="px-4 py-3.5 text-slate-700 border-e border-slate-50">{renderValue(row.item_type)}</td>
                        <td className="px-4 py-3.5 text-slate-700 border-e border-slate-50">{renderValue(row.location)}</td>
                        <td className="px-4 py-3.5 text-slate-700 border-e border-slate-50">{renderValue(row.vendor_name)}</td>
                        <td className="px-4 py-3.5 border-e border-slate-50">
                          <div className="text-slate-700">{renderValue(row.vendor_contact)}</div>
                          <div className="text-[11px] text-slate-400">{renderValue(row.vendor_phone)}</div>
                        </td>
                        <td className="px-4 py-3.5 text-slate-700 border-e border-slate-50 text-end">{renderValue(row.total_quantity)}</td>
                        <td className="px-4 py-3.5 text-slate-700 border-e border-slate-50 text-end">{formatCurrency(Number(row.unit_purchase_cost))}</td>
                        <td className="px-4 py-3.5 font-bold text-slate-800 text-end">{formatCurrency(Number(row.total_financial_value))}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-slate-400 italic">{i18n.t("No detailed inventory records found.")}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            {detailedInventory.length > 0 && (
              <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                <div className="text-sm text-slate-500 font-medium">{i18n.t("Showing")}{" "}<span className="text-slate-900 font-bold">{totalItems === 0 ? 0 : indexOfFirstItem + 1}</span>{" "}{i18n.t("to")}{" "}
                  <span className="text-slate-900 font-bold">{Math.min(indexOfLastItem, totalItems)}</span>{" "}{i18n.t("of")}{" "}
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
                      {[10, 25, 50, 100].map((val) => (
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
                      <span className="text-sm font-bold text-slate-900">{totalPages}</span>
                    </div>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors shadow-sm"
                    >
                      <ChevronRight className="rtl:-scale-x-100" size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default InventorySummaryReport;
