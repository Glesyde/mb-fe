import React, { useState, useMemo, useEffect, useRef } from "react";
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
  CalendarRange,
  FilterX,
  RefreshCw
} from "lucide-react";
import { exportToCSV, exportToExcel, exportToPDF } from "../../utils/exportUtils";
import apiClient from "../../api/client";

const renderValue = (val: any) => {
  if (val === null || val === undefined || val === "") return "—";
  return String(val);
};

const InventoryReport: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [movementTypeFilter, setMovementTypeFilter] = useState("All");
  const [itemTypeFilter, setItemTypeFilter] = useState("All");
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
      const response = await apiClient.get('/inventory/transactions/book/report');
      if (response.data && response.data.data) {
        setData(response.data.data);
      } else {
        setData([]);
      }
    } catch (error) {
      console.error("Failed to fetch inventory report data:", error);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, []);

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

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchesSearch = 
        renderValue(item.item_name).toLowerCase().includes(searchTerm.toLowerCase()) ||
        renderValue(item.batch_number).toLowerCase().includes(searchTerm.toLowerCase()) ||
        renderValue(item.source_location).toLowerCase().includes(searchTerm.toLowerCase()) ||
        renderValue(item.destination_location).toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesMovementType = movementTypeFilter === "All" || item.movement_type === movementTypeFilter;
      const matchesItemType = itemTypeFilter === "All" || item.item_type === itemTypeFilter;

      let matchesDate = true;
      if (item.transaction_date) {
        const txDate = new Date(item.transaction_date);
        if (dateFrom) matchesDate = matchesDate && txDate >= new Date(dateFrom);
        if (dateTo) matchesDate = matchesDate && txDate <= new Date(dateTo + "T23:59:59");
      }

      return matchesSearch && matchesMovementType && matchesItemType && matchesDate;
    });
  }, [data, searchTerm, movementTypeFilter, itemTypeFilter, dateFrom, dateTo]);

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

  // Reset to first page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, movementTypeFilter, itemTypeFilter, dateFrom, dateTo]);

  const handleExportCSV = () => {
    exportToCSV(filteredData, "inventory_transaction_report");
    setIsExportOpen(false);
  };

  const handleExportExcel = () => {
    exportToExcel(filteredData, "inventory_transaction_report");
    setIsExportOpen(false);
  };

  const handleExportPDF = () => {
    exportToPDF(filteredData, "inventory_transaction_report", "Inventory Transaction Report");
    setIsExportOpen(false);
  };

  const headers = data.length > 0 ? Object.keys(data[0]) : [];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 animate-in slide-in-from-bottom-4 duration-500 w-full overflow-hidden flex flex-col">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Inventory Transaction Report</h2>
          <p className="text-sm text-slate-500">View and export all inventory transactions and movements.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setSearchTerm("");
              setTypeFilter("All");
              setDateFrom("");
              setDateTo("");
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

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <div className="relative lg:col-span-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search item, batch, location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={isLoading}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary disabled:opacity-50"
          />
        </div>
        <div>
          <select
            value={movementTypeFilter}
            onChange={(e) => setMovementTypeFilter(e.target.value)}
            disabled={isLoading}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-700 disabled:opacity-50"
          >
            <option value="All">All Movement Types</option>
            <option value="IN">IN</option>
            <option value="OUT">OUT</option>
            <option value="TRANSFER">TRANSFER</option>
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
            <option value="DRUG">Drug</option>
            <option value="CONSUMABLE">Consumable</option>
            <option value="ASSET">Asset</option>
          </select>
        </div>
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
      </div>

      <div className="overflow-x-auto overflow-y-auto rounded-xl border border-slate-200 flex-1 min-h-[400px]">
        {isLoading ? (
          <div className="h-full w-full flex items-center justify-center min-h-[400px] bg-slate-50/50">
            <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
          </div>
        ) : (
          <table className="w-full text-left text-sm whitespace-nowrap">
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
                  <tr key={`${row.transaction_date}-${index}`} className="hover:bg-slate-50/80 transition-colors">
                    {headers.map(header => (
                      <td key={header} className="px-4 py-3.5 text-slate-700 border-r border-slate-50 last:border-r-0">
                        {renderValue(row[header as keyof typeof row])}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={headers.length || 1} className="px-4 py-12 text-center text-slate-400 italic">
                    No inventory records found.
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
              {Math.min(indexOfLastItem, totalItems)}
            </span> of{" "}
            <span className="text-slate-900 font-bold">{totalItems}</span> records
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

export default InventoryReport;
