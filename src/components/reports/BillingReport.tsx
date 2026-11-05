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
  FilterX,
  RefreshCw,
  Receipt,
  Wallet,
  TrendingUp,
  Percent,
  Banknote,
  AlertCircle
} from "lucide-react";
import { exportToCSV, exportToExcel, exportToPDF } from "../../utils/exportUtils";
import apiClient from "../../api/client";
import SearchableUserSelect from "../shared/SearchableUserSelect";

const renderValue = (val: any) => {
  if (val === null || val === undefined || val === "") return "—";
  return String(val);
};

const formatCurrency = (val: any) => {
  if (val === null || val === undefined) return "₦0.00";
  const num = parseFloat(val);
  if (isNaN(num)) return "₦0.00";
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(num);
};

const getStatusColor = (status: string) => {
  switch (status?.toUpperCase()) {
    case 'PAID': return 'bg-emerald-100 text-emerald-800';
    case 'PARTIALLY_PAID': return 'bg-amber-100 text-amber-800';
    case 'OPEN': return 'bg-blue-100 text-blue-800';
    case 'CANCELLED': return 'bg-red-100 text-red-800';
    default: return 'bg-slate-100 text-slate-800';
  }
};

const BillingReport: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [aggregates, setAggregates] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [timeframeFilter, setTimeframeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [specializationFilter, setSpecializationFilter] = useState("");
  const [doctorFilter, setDoctorFilter] = useState("");
  const [payerFilter, setPayerFilter] = useState("");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState("");
  const [createdByFilter, setCreatedByFilter] = useState("");

  const [specializations, setSpecializations] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [payers, setPayers] = useState<any[]>([]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  
  // Dropdown State
  const [isExportOpen, setIsExportOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [specs, docs, pays] = await Promise.all([
          apiClient.get('/doctors-specializations'),
          apiClient.get('/doctors'),
          apiClient.get('/payer-types'),
        ]);
        if (specs.data?.data) setSpecializations(specs.data.data);
        if (docs.data?.data) setDoctors(docs.data.data);
        if (pays.data?.data) setPayers(pays.data.data);
      } catch (err) {
        console.error("Failed to fetch dropdowns", err);
      }
    };
    fetchDropdowns();
  }, []);

  const fetchReportData = async () => {
    try {
      setIsLoading(true);
      
      const params = new URLSearchParams();
      if (timeframeFilter && timeframeFilter !== "custom") {
        params.append("timeframe", timeframeFilter);
      }
      if (timeframeFilter === "custom" && dateFrom && dateTo) {
        params.append("timeframe", "custom");
        params.append("start_date", dateFrom);
        params.append("end_date", dateTo);
      }
      if (specializationFilter) params.append("specialization_id", specializationFilter);
      if (doctorFilter) params.append("doctor_id", doctorFilter);
      if (payerFilter) params.append("payer_type_id", payerFilter);
      if (invoiceStatusFilter) params.append("invoice_status", invoiceStatusFilter);
      if (createdByFilter) params.append("created_by", createdByFilter);

      const query = params.toString() ? `?${params.toString()}` : '';
      const response = await apiClient.get(`/report/billing${query}`);
      if (response.data && response.data.data) {
        setData(response.data.data.records || []);
        setAggregates(response.data.data.metadata?.aggregates || {});
      } else {
        setData([]);
        setAggregates({});
      }
    } catch (error) {
      console.error("Failed to fetch Billing report data:", error);
      setData([]);
      setAggregates({});
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [timeframeFilter, dateFrom, dateTo, specializationFilter, doctorFilter, payerFilter, invoiceStatusFilter, createdByFilter]);

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
      const searchStr = `${item.first_name || ''} ${item.last_name || ''} ${item.mrn || ''} ${item.invoice_number || ''}`.toLowerCase();
      return searchStr.includes(searchTerm.toLowerCase());
    });
  }, [data, searchTerm]);

  // Pagination logic
  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
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
  }, [searchTerm, timeframeFilter, dateFrom, dateTo, specializationFilter, doctorFilter, payerFilter, invoiceStatusFilter, createdByFilter]);

  const handleExportCSV = () => {
    exportToCSV(filteredData, "billing_report");
    setIsExportOpen(false);
  };

  const handleExportExcel = () => {
    exportToExcel(filteredData, "billing_report");
    setIsExportOpen(false);
  };

  const handleExportPDF = () => {
    exportToPDF(filteredData, "billing_report", "Financial Billing Report");
    setIsExportOpen(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 animate-in slide-in-from-bottom-4 duration-500 w-full overflow-hidden flex flex-col">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Billing Report</h2>
          <p className="text-sm text-slate-500">View and export financial billing analysis.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setSearchTerm("");
              setTimeframeFilter("");
              setDateFrom("");
              setDateTo("");
              setSpecializationFilter("");
              setDoctorFilter("");
              setPayerFilter("");
              setInvoiceStatusFilter("");
              setCreatedByFilter("");
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
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
              <Receipt size={20} />
            </div>
            <p className="text-sm font-medium text-slate-500">Invoices</p>
          </div>
          <p className="text-xl font-black text-slate-800">{aggregates.total_invoices_issued || 0}</p>
        </div>
        
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
              <TrendingUp size={20} />
            </div>
            <p className="text-sm font-medium text-slate-500">Gross Amount</p>
          </div>
          <p className="text-xl font-black text-slate-800">{formatCurrency(aggregates.gross_amount_billed || 0)}</p>
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-pink-100 text-pink-600 rounded-xl flex items-center justify-center shrink-0">
              <Percent size={20} />
            </div>
            <p className="text-sm font-medium text-slate-500">Discounts</p>
          </div>
          <p className="text-xl font-black text-slate-800">{formatCurrency(aggregates.total_discounts_granted || 0)}</p>
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
              <Wallet size={20} />
            </div>
            <p className="text-sm font-medium text-slate-500">Net Receivable</p>
          </div>
          <p className="text-xl font-black text-slate-800">{formatCurrency(aggregates.net_amount_receivable || 0)}</p>
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
              <Banknote size={20} />
            </div>
            <p className="text-sm font-medium text-slate-500">Collected</p>
          </div>
          <p className="text-xl font-black text-slate-800">{formatCurrency(aggregates.total_liquidity_collected || 0)}</p>
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center shrink-0">
              <AlertCircle size={20} />
            </div>
            <p className="text-sm font-medium text-slate-500">Outstanding AR</p>
          </div>
          <p className="text-xl font-black text-slate-800">{formatCurrency(aggregates.outstanding_ar_aging || 0)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-8 gap-4 mb-6">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search patient, MRN, invoice..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={isLoading}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary disabled:opacity-50"
          />
        </div>
        
        <div>
          <select
            value={timeframeFilter}
            onChange={(e) => setTimeframeFilter(e.target.value)}
            disabled={isLoading}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-700 disabled:opacity-50"
          >
            <option value="">All Time</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="last_week">Last Week</option>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="last_2_months">Last 2 Months</option>
            <option value="last_3_months">Last 3 Months</option>
            <option value="last_year">Last Year</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>

        {timeframeFilter === "custom" && (
          <>
            <div>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                disabled={isLoading}
                title="Date From"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-700 disabled:opacity-50"
              />
            </div>
            <div>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                disabled={isLoading}
                min={dateFrom}
                title="Date To"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-700 disabled:opacity-50"
              />
            </div>
          </>
        )}

        <div>
          <select
            value={invoiceStatusFilter}
            onChange={(e) => setInvoiceStatusFilter(e.target.value)}
            disabled={isLoading}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-700 disabled:opacity-50"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="PAID">Paid</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <div>
          <select
            value={specializationFilter}
            onChange={(e) => setSpecializationFilter(e.target.value)}
            disabled={isLoading}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-700 disabled:opacity-50"
          >
            <option value="">All Specializations</option>
            {specializations.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        
        <div>
          <select
            value={doctorFilter}
            onChange={(e) => setDoctorFilter(e.target.value)}
            disabled={isLoading}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-700 disabled:opacity-50"
          >
            <option value="">All Doctors</option>
            {doctors.map(d => (
              <option key={d.doctor_id} value={d.doctor_id}>
                {d.first_name} {d.last_name}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <select
            value={payerFilter}
            onChange={(e) => setPayerFilter(e.target.value)}
            disabled={isLoading}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-700 disabled:opacity-50"
          >
            <option value="">All Payers</option>
            {payers.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div>
          <SearchableUserSelect
            value={createdByFilter}
            onChange={(userId) => setCreatedByFilter(userId ? String(userId) : "")}
            placeholder="All Billing Officers"
          />
        </div>
      </div>

      <div className="flex-1 overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="text-xs text-slate-500 bg-slate-50 border-b border-slate-200 uppercase">
            <tr>
              <th className="px-6 py-4 font-bold">Invoice #</th>
              <th className="px-6 py-4 font-bold">Patient</th>
              <th className="px-6 py-4 font-bold">Type</th>
              <th className="px-6 py-4 font-bold">Payer</th>
              <th className="px-6 py-4 font-bold">Billed By</th>
              <th className="px-6 py-4 font-bold text-center">Status</th>
              <th className="px-6 py-4 font-bold text-right">Gross</th>
              <th className="px-6 py-4 font-bold text-right text-red-600">Discount</th>
              <th className="px-6 py-4 font-bold text-right text-emerald-600">Net</th>
              <th className="px-6 py-4 font-bold text-right text-amber-600">Outstanding</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={10} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <Loader2 size={32} className="animate-spin mb-2 text-brand-primary" />
                    <p>Loading records...</p>
                  </div>
                </td>
              </tr>
            ) : currentItems.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <FileText size={48} className="mb-4 opacity-20" />
                    <p className="text-base font-medium text-slate-600">No records found</p>
                    <p className="text-sm">Try adjusting your filters</p>
                  </div>
                </td>
              </tr>
            ) : (
              currentItems.map((item, idx) => (
                <tr 
                  key={item.invoice_id || idx}
                  className="bg-white border-b border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="font-bold text-brand-primary">{renderValue(item.invoice_number)}</div>
                    <div className="text-xs text-slate-500">{renderValue(item.invoice_date)}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-800">
                      {`${item.first_name || ''} ${item.middle_name ? item.middle_name + ' ' : ''}${item.last_name || ''}`}
                    </div>
                    <div className="text-xs font-mono text-slate-500">
                      MRN: {renderValue(item.mrn)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-medium">
                    {renderValue(item.encounter_type)}
                  </td>
                  <td className="px-6 py-4 text-slate-600 max-w-[150px] truncate" title={item.payer_type_name}>
                    {renderValue(item.payer_type_name)}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {renderValue(item.billing_officer_name)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider ${getStatusColor(item.invoice_status)}`}>
                      {renderValue(item.invoice_status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-700 text-right">
                    {formatCurrency(item.total_amount)}
                  </td>
                  <td className="px-6 py-4 font-medium text-red-600 text-right">
                    {formatCurrency(item.discount_amount)}
                  </td>
                  <td className="px-6 py-4 font-bold text-emerald-700 text-right">
                    {formatCurrency(item.net_amount)}
                  </td>
                  <td className="px-6 py-4 font-bold text-amber-700 text-right">
                    {formatCurrency(item.outstanding_amount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!isLoading && filteredData.length > 0 && (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Rows per page:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-brand-primary focus:border-brand-primary block p-2"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">
              Showing <span className="font-bold text-slate-800">{indexOfFirstItem + 1}</span> to{" "}
              <span className="font-bold text-slate-800">
                {Math.min(indexOfLastItem, totalItems)}
              </span>{" "}
              of <span className="font-bold text-slate-800">{totalItems}</span>
            </span>
            
            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              
              <div className="px-4 py-2 rounded-lg bg-brand-primary/10 text-brand-primary font-bold text-sm">
                {currentPage} / {totalPages}
              </div>
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingReport;
