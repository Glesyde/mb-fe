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
  Baby,
  Wallet
} from "lucide-react";
import { exportToCSV, exportToExcel, exportToPDF } from "../../utils/exportUtils";
import apiClient from "../../api/client";

const renderValue = (val: any) => {
  if (val === null || val === undefined || val === "") return "—";
  return String(val);
};

const formatCurrency = (val: any) => {
  if (!val) return "₦0.00";
  const num = parseFloat(val);
  if (isNaN(num)) return "₦0.00";
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(num);
};

const AncReport: React.FC = () => {
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
          apiClient.get('/payer-types')
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

      const query = params.toString() ? `?${params.toString()}` : '';
      const response = await apiClient.get(`/report/anc${query}`);
      if (response.data && response.data.data) {
        setData(response.data.data.records || []);
        setAggregates(response.data.data.metadata?.aggregates || {});
      } else {
        setData([]);
        setAggregates({});
      }
    } catch (error) {
      console.error("Failed to fetch ANC report data:", error);
      setData([]);
      setAggregates({});
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [timeframeFilter, dateFrom, dateTo, specializationFilter, doctorFilter, payerFilter]);

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
      const searchStr = `${item.first_name || ''} ${item.last_name || ''} ${item.mrn || ''}`.toLowerCase();
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
  }, [searchTerm, timeframeFilter, dateFrom, dateTo, specializationFilter, doctorFilter, payerFilter]);

  const handleExportCSV = () => {
    exportToCSV(filteredData, "anc_report");
    setIsExportOpen(false);
  };

  const handleExportExcel = () => {
    exportToExcel(filteredData, "anc_report");
    setIsExportOpen(false);
  };

  const handleExportPDF = () => {
    exportToPDF(filteredData, "anc_report", "Antenatal Care (ANC) Report");
    setIsExportOpen(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 animate-in slide-in-from-bottom-4 duration-500 w-full overflow-hidden flex flex-col">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">ANC Report</h2>
          <p className="text-sm text-slate-500">View and export all Antenatal Care visits and collections.</p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search patient or MRN..."
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-pink-100 text-pink-600 rounded-xl flex items-center justify-center shrink-0">
            <Baby size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total ANC Cases</p>
            <p className="text-2xl font-black text-slate-800">{aggregates.total_anc_cases || 0}</p>
          </div>
        </div>
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
            <Wallet size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Revenue</p>
            <p className="text-2xl font-black text-slate-800">{formatCurrency(aggregates.total_revenue_collected || 0)}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="text-xs text-slate-500 bg-slate-50 border-b border-slate-200 uppercase">
            <tr>
              <th className="px-6 py-4 font-bold">Appointment</th>
              <th className="px-6 py-4 font-bold">Patient</th>
              <th className="px-6 py-4 font-bold">Details</th>
              <th className="px-6 py-4 font-bold">Doctor</th>
              <th className="px-6 py-4 font-bold">Billing</th>
              <th className="px-6 py-4 font-bold text-right">Amounts</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <Loader2 size={32} className="animate-spin mb-2 text-brand-primary" />
                    <p>Loading records...</p>
                  </div>
                </td>
              </tr>
            ) : currentItems.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center">
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
                  key={item.appointment_id || idx}
                  className="bg-white border-b border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="font-bold text-brand-primary">{renderValue(item.appointment_code)}</div>
                    <div className="font-medium text-slate-700">{renderValue(item.appointment_date)}</div>
                    <div className="text-xs text-slate-500">{renderValue(item.appointment_time)}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-800">
                      {`${item.first_name || ''} ${item.middle_name ? item.middle_name + ' ' : ''}${item.last_name || ''}`}
                    </div>
                    <div className="text-xs text-slate-500">Gender: {renderValue(item.gender)}</div>
                    <div className="text-xs font-mono text-slate-500">MRN: {renderValue(item.mrn)}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-slate-700 whitespace-normal min-w-[200px]" title={item.reason_for_visit}>
                      {renderValue(item.reason_for_visit)}
                    </div>
                    <div className="text-xs font-medium text-slate-600 mt-1">
                      <span className="px-2 py-0.5 bg-slate-100 rounded-full">{renderValue(item.booking_type)}</span>
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full ml-1">{renderValue(item.appointment_status)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-700">Dr. {item.doctor_first_name} {item.doctor_last_name}</div>
                    <div className="text-xs text-slate-500">{renderValue(item.specialization_name)}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-slate-700 font-medium">{renderValue(item.payer_type_name) || 'N/A'}</div>
                    {item.invoice_number && (
                      <>
                        <div className="text-xs font-mono text-slate-500 mt-1">{renderValue(item.invoice_number)}</div>
                        <div className="text-xs font-bold text-slate-600">{renderValue(item.invoice_status)}</div>
                      </>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="font-bold text-emerald-700" title="Net Amount">{formatCurrency(item.net_amount)}</div>
                    <div className="text-xs font-medium text-slate-500" title="Amount Collected">Collected: {formatCurrency(item.amount_collected)}</div>
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

export default AncReport;
