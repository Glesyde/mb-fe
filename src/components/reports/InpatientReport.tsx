import React, { useState, useMemo, useEffect, useRef } from "react";
import { 
  Search, FileText, FileSpreadsheet, File as FilePdf, Loader2,
  ChevronDown, Download, ChevronLeft, ChevronRight, 
  Stethoscope, Building2, Wallet, FilterX, RefreshCw, 
  Activity, UserCheck, BedDouble, Users
} from "lucide-react";
import apiClient from "../../api/client";

const renderValue = (val: any) => {
  if (val === null || val === undefined || val === "") return "—";
  return String(val);
};

const formatCurrency = (amount: number | string) => {
  const num = Number(amount);
  if (isNaN(num)) return "—";
  return `₦${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const InpatientReport: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [metadata, setMetadata] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  
  // --- CORE FILTERS ---
  const [searchTerm, setSearchTerm] = useState("");
  const [timeframeFilter, setTimeframeFilter] = useState("this_month");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  
  // --- STRATEGIC FILTERS ---
  const [specializationFilter, setSpecializationFilter] = useState("");
  const [doctorFilter, setDoctorFilter] = useState("");
  const [payerFilter, setPayerFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [wardFilter, setWardFilter] = useState("");

  // --- DROPDOWN DATA ---
  const [specializations, setSpecializations] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [payers, setPayers] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);

  // --- PAGINATION & EXPORT ---
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [specs, docs, pays, wardsRes] = await Promise.all([
          apiClient.get('/doctors-specializations').catch(() => ({ data: { data: [] } })),
          apiClient.get('/doctors').catch(() => ({ data: { data: [] } })),
          apiClient.get('/payer-types').catch(() => ({ data: { data: [] } })),
          apiClient.get('/wards').catch(() => ({ data: { data: [] } }))
        ]);
        if (specs.data?.data) setSpecializations(specs.data.data);
        if (docs.data?.data) setDoctors(docs.data.data);
        if (pays.data?.data) setPayers(pays.data.data);
        if (wardsRes.data?.data) setWards(wardsRes.data.data);
      } catch (err) {
        console.error("Failed to fetch dropdowns", err);
      }
    };
    fetchDropdowns();
  }, []);

  const buildQueryParams = (format?: string) => {
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
    if (statusFilter) params.append("status", statusFilter);
    if (wardFilter) params.append("ward_id", wardFilter);
    if (searchTerm) params.append("search", searchTerm);
    
    if (format) {
      params.append("format", format);
    } else {
      params.append("limit", itemsPerPage.toString());
      params.append("offset", ((currentPage - 1) * itemsPerPage).toString());
    }
    
    return params.toString();
  };

  const fetchReportData = async () => {
    try {
      setIsLoading(true);
      const query = buildQueryParams();
      const response = await apiClient.get(`/report/ipd?${query}`);
      
      if (response.data && response.data.data) {
        const responseData = response.data.data;
        setData(responseData.records || responseData || []);
        setMetadata(responseData.metadata || responseData || null);
      } else {
        setData([]);
        setMetadata(null);
      }
    } catch (error) {
      console.error("Failed to fetch inpatient report data:", error);
      setData([]);
      setMetadata(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (timeframeFilter !== "custom" || (timeframeFilter === "custom" && dateFrom && dateTo)) {
      fetchReportData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    timeframeFilter, dateFrom, dateTo, specializationFilter, doctorFilter, 
    payerFilter, statusFilter, wardFilter, currentPage, itemsPerPage
  ]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsExportOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleServerExport = async (format: string, fileExtension: string) => {
    try {
      setIsExporting(true);
      const query = buildQueryParams(format);
      
      const response = await apiClient.get(`/report/ipd?${query}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `inpatient_report_${new Date().toISOString().split('T')[0]}.${fileExtension}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      setIsExportOpen(false);
    } catch (error) {
      console.error(`Failed to export as ${format}:`, error);
    } finally {
      setIsExporting(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setTimeframeFilter("this_month");
    setDateFrom("");
    setDateTo("");
    setSpecializationFilter("");
    setDoctorFilter("");
    setPayerFilter("");
    setStatusFilter("");
    setWardFilter("");
    setCurrentPage(1);
  };

  const currentItems = searchTerm ? data.filter((item) => {
    const searchStr = searchTerm.toLowerCase();
    return (
      renderValue(item.first_name).toLowerCase().includes(searchStr) ||
      renderValue(item.last_name).toLowerCase().includes(searchStr) ||
      renderValue(item.mrn).toLowerCase().includes(searchStr) ||
      renderValue(item.admission_number).toLowerCase().includes(searchStr) ||
      renderValue(item.invoice_number).toLowerCase().includes(searchStr)
    );
  }) : data;

  const aggregates = metadata?.aggregates || metadata?.summary;

  const displayHeaders = [
    { key: "mrn", label: "MRN" },
    { key: "admission_number", label: "Adm #" },
    { key: "patient_name", label: "Patient Name" },
    { key: "gender", label: "Gender" },
    { key: "age", label: "Age" },
    { key: "admission_date", label: "Admission Date" },
    { key: "doctor", label: "Doctor" },
    { key: "specialization_name", label: "Specialization" },
    { key: "status", label: "Adm. Status" },
    { key: "billing", label: "Billing" },
    { key: "net_amount", label: "Net Amount (₦)", align: "right" },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 animate-in slide-in-from-bottom-4 duration-500 w-full overflow-hidden flex flex-col flex-1 h-full">
      
      {/* HEADER & ACTIONS */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Inpatient Report (IPD)</h2>
          <p className="text-sm text-slate-500">View and export inpatient admissions, NHMIS demographics, and revenue.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={clearFilters}
            disabled={isLoading || isExporting}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50 rounded-xl text-sm font-bold transition-colors"
          >
            <FilterX size={18} />
            <span className="hidden sm:inline">Clear</span>
          </button>
          
          <button
            onClick={fetchReportData}
            disabled={isLoading || isExporting}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50 rounded-xl text-sm font-bold transition-colors"
          >
            <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsExportOpen(!isExportOpen)}
              disabled={isLoading || isExporting || data.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-primary text-white hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-bold transition-all shadow-md shadow-brand-primary/20"
            >
              {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
              Export
              <ChevronDown size={16} className={`transition-transform duration-200 ${isExportOpen ? "rotate-180" : ""}`} />
            </button>

            {isExportOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 py-2 animate-in fade-in zoom-in-95 duration-200">
                <button onClick={() => handleServerExport('csv', 'csv')} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                  <div className="p-1.5 bg-slate-50 text-slate-600 rounded-lg"><FileText size={16} /></div>
                  Export CSV
                </button>
                <button onClick={() => handleServerExport('excel', 'xlsx')} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                  <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg"><FileSpreadsheet size={16} /></div>
                  Export Excel
                </button>
                <button onClick={() => handleServerExport('pdf', 'pdf')} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                  <div className="p-1.5 bg-red-50 text-red-600 rounded-lg"><FilePdf size={16} /></div>
                  Export PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FILTER GRID */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6 space-y-4">
        
        {/* ROW 1: Search & Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search MRN, Name, Adm #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchReportData()}
              disabled={isLoading || isExporting}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>

          <div>
            <select
              value={timeframeFilter}
              onChange={(e) => { setTimeframeFilter(e.target.value); setCurrentPage(1); }}
              disabled={isLoading || isExporting}
              className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this_week">This Week</option>
              <option value="last_week">Last Week</option>
              <option value="last_7_days">Last 7 Days</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="last_30_days">Last 30 Days</option>
              <option value="last_90_days">Last 90 Days</option>
              <option value="this_year">This Year (YTD)</option>
              <option value="all_time">All Time</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {timeframeFilter === "custom" && (
            <>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
                disabled={isLoading || isExporting}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
                disabled={isLoading || isExporting}
                min={dateFrom}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              />
            </>
          )}
        </div>

        {/* ROW 2: Classifications */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="relative">
            <Activity className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active Admissions</option>
              <option value="DISCHARGED">Discharged</option>
            </select>
          </div>

          <div className="relative">
            <BedDouble className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <select
              value={wardFilter}
              onChange={(e) => { setWardFilter(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            >
              <option value="">All Wards</option>
              {wards.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <select
              value={doctorFilter}
              onChange={(e) => { setDoctorFilter(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            >
              <option value="">All Doctors</option>
              {doctors.map(d => (
                <option key={d.doctor_id} value={d.doctor_id}>Dr. {d.first_name} {d.last_name}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <select
              value={specializationFilter}
              onChange={(e) => { setSpecializationFilter(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            >
              <option value="">All Specializations</option>
              {specializations.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <select
              value={payerFilter}
              onChange={(e) => { setPayerFilter(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            >
              <option value="">All Payers</option>
              {payers.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* --- DASHBOARD SUMMARY CARDS --- */}
      {!isLoading && aggregates && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-500">
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <Activity size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Total Admissions</p>
              <h3 className="text-2xl font-bold text-slate-800">
                {aggregates.total_admissions ?? currentItems.length}
              </h3>
            </div>
          </div>
          
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
              <UserCheck size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Unique Patients</p>
              <h3 className="text-2xl font-bold text-slate-800">
                {aggregates.unique_patients}
              </h3>
            </div>
          </div>

          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-emerald-100 text-emerald-700 rounded-lg">
              <Wallet size={24} />
            </div>
            <div>
              <p className="text-sm text-emerald-700 font-medium">Total Net Revenue</p>
              <h3 className="text-xl font-bold text-emerald-800">
                {formatCurrency(aggregates.total_revenue)}
              </h3>
            </div>
          </div>

          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
              <Users size={24} />
            </div>
            <div className="w-full">
              <p className="text-sm text-slate-500 font-medium">Gender Split</p>
              <div className="flex justify-between items-end w-full mt-1">
                <div>
                  <span className="text-sm text-slate-400">M: </span>
                  <span className="font-bold text-slate-700">{aggregates.gender_summary?.total_male || 0}</span>
                </div>
                <div>
                  <span className="text-sm text-slate-400">F: </span>
                  <span className="font-bold text-slate-700">{aggregates.gender_summary?.total_female || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- NHMIS AGE/GENDER SUMMARY TABLE --- */}
      {!isLoading && aggregates?.nhmis_summary && (
        <div className="mb-6 rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
          <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">NHMIS Health Facility Monthly Summary</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-2 font-bold text-slate-600 text-[11px] uppercase w-32 border-r border-slate-100">Gender</th>
                  <th className="px-4 py-2 font-bold text-slate-600 text-[11px] uppercase text-center">0-28 Days</th>
                  <th className="px-4 py-2 font-bold text-slate-600 text-[11px] uppercase text-center">29d-11 Mths</th>
                  <th className="px-4 py-2 font-bold text-slate-600 text-[11px] uppercase text-center">12-59 Mths</th>
                  <th className="px-4 py-2 font-bold text-slate-600 text-[11px] uppercase text-center">5-9 Yrs</th>
                  <th className="px-4 py-2 font-bold text-slate-600 text-[11px] uppercase text-center">10-19 Yrs</th>
                  <th className="px-4 py-2 font-bold text-slate-600 text-[11px] uppercase text-center">≥20 Yrs</th>
                  <th className="px-4 py-2 font-bold text-brand-primary text-[11px] uppercase text-center bg-brand-primary/5">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-4 py-2 font-bold text-slate-700 border-r border-slate-100 bg-slate-50">Male</td>
                  <td className="px-4 py-2 text-center text-slate-600">{aggregates.nhmis_summary.male['0_28_days']}</td>
                  <td className="px-4 py-2 text-center text-slate-600">{aggregates.nhmis_summary.male['29d_11mths']}</td>
                  <td className="px-4 py-2 text-center text-slate-600">{aggregates.nhmis_summary.male['12_59_mths']}</td>
                  <td className="px-4 py-2 text-center text-slate-600">{aggregates.nhmis_summary.male['5_9_yrs']}</td>
                  <td className="px-4 py-2 text-center text-slate-600">{aggregates.nhmis_summary.male['10_19_yrs']}</td>
                  <td className="px-4 py-2 text-center text-slate-600">{aggregates.nhmis_summary.male['20_plus_yrs']}</td>
                  <td className="px-4 py-2 text-center font-bold text-brand-primary bg-brand-primary/5">{aggregates.gender_summary.total_male}</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-bold text-slate-700 border-r border-slate-100 bg-slate-50">Female</td>
                  <td className="px-4 py-2 text-center text-slate-600">{aggregates.nhmis_summary.female['0_28_days']}</td>
                  <td className="px-4 py-2 text-center text-slate-600">{aggregates.nhmis_summary.female['29d_11mths']}</td>
                  <td className="px-4 py-2 text-center text-slate-600">{aggregates.nhmis_summary.female['12_59_mths']}</td>
                  <td className="px-4 py-2 text-center text-slate-600">{aggregates.nhmis_summary.female['5_9_yrs']}</td>
                  <td className="px-4 py-2 text-center text-slate-600">{aggregates.nhmis_summary.female['10_19_yrs']}</td>
                  <td className="px-4 py-2 text-center text-slate-600">{aggregates.nhmis_summary.female['20_plus_yrs']}</td>
                  <td className="px-4 py-2 text-center font-bold text-brand-primary bg-brand-primary/5">{aggregates.gender_summary.total_female}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- DETAILED DATA TABLE --- */}
      <div className="overflow-x-auto overflow-y-auto rounded-xl border border-slate-200 flex-1 min-h-[400px]">
        {isLoading ? (
          <div className="h-full w-full flex items-center justify-center min-h-[400px] bg-slate-50/50">
            <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
          </div>
        ) : (
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
              <tr>
                {displayHeaders.map(header => (
                  <th key={header.key} className={`px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px] ${header.align === 'right' ? 'text-right' : 'text-left'}`}>
                    {header.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentItems.length > 0 ? (
                currentItems.map((row) => (
                  <tr key={row.admission_id || row.invoice_number || row.mrn} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3.5 text-slate-700 font-medium">{renderValue(row.mrn)}</td>
                    <td className="px-4 py-3.5 text-slate-700 font-mono text-xs">{renderValue(row.admission_number)}</td>
                    <td className="px-4 py-3.5 text-slate-700 font-medium">
                      {row.patient_name || `${row.first_name || ''} ${row.middle_name ? row.middle_name + ' ' : ''}${row.last_name || ''}`.trim() || '—'}
                    </td>
                    <td className="px-4 py-3.5 text-slate-700">{renderValue(row.gender)}</td>
                    <td className="px-4 py-3.5 text-slate-700">{row.age_years !== undefined && row.age_years !== null ? `${row.age_years} Yrs` : '—'}</td>
                    <td className="px-4 py-3.5 text-slate-700 text-xs">{row.admission_date ? new Date(row.admission_date).toLocaleString() : '—'}</td>
                    <td className="px-4 py-3.5 text-slate-700">{row.doctor_first_name || row.doctor_last_name ? `Dr. ${row.doctor_first_name || ''} ${row.doctor_last_name || ''}`.trim() : '—'}</td>
                    <td className="px-4 py-3.5 text-slate-700">{renderValue(row.specialization_name)}</td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        row.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' :
                        row.status === 'DISCHARGED' ? 'bg-slate-100 text-slate-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {renderValue(row.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col gap-1 items-start">
                        {row.invoice_status && (
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            row.invoice_status === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
                            row.invoice_status === 'UNPAID' ? 'bg-amber-100 text-amber-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {renderValue(row.invoice_status)}
                          </span>
                        )}
                        {row.invoice_number && <span className="text-[10px] font-mono text-slate-500">{row.invoice_number}</span>}
                        {(row.payer_type_name || row.payer_name) && <span className="text-[10px] text-slate-600">{row.payer_type_name || row.payer_name}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-800 font-bold text-right font-mono bg-slate-50/50">
                      {formatCurrency(row.net_amount)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={displayHeaders.length} className="px-4 py-12 text-center text-slate-400 italic">
                    No inpatient records found for the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
      
      {/* Pagination Footer */}
      {!isLoading && data.length > 0 && !searchTerm && (
        <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
          <div className="text-sm text-slate-500 font-medium">
            <span className="text-slate-900 font-bold text-xs uppercase mr-2 tracking-wider">Page {currentPage}</span>
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
                {[25, 50, 100, 250].map(val => (
                  <option key={val} value={val}>{val}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors shadow-sm"
              >
                <ChevronLeft size={16} />
              </button>

              <button
                onClick={() => setCurrentPage(prev => prev + 1)}
                disabled={currentItems.length < itemsPerPage}
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

export default InpatientReport;







// import React, { useState, useMemo, useEffect, useRef } from "react";
// import { 
//   Search, FileText, FileSpreadsheet, File as FilePdf, Loader2,
//   ChevronDown, Download, ChevronLeft, ChevronRight, 
//   Stethoscope, Building2, Wallet, FilterX, RefreshCw, 
//   Activity, UserCheck, BedDouble, FileClock
// } from "lucide-react";
// import apiClient from "../../api/client";

// const renderValue = (val: any) => {
//   if (val === null || val === undefined || val === "") return "—";
//   return String(val);
// };

// const formatCurrency = (amount: number | string) => {
//   const num = Number(amount);
//   if (isNaN(num)) return "—";
//   return `₦${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
// };

// const InpatientReport: React.FC = () => {
//   const [data, setData] = useState<any[]>([]);
//   const [metadata, setMetadata] = useState<any>(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [isExporting, setIsExporting] = useState(false);
  
//   // --- CORE FILTERS ---
//   const [searchTerm, setSearchTerm] = useState("");
//   const [timeframeFilter, setTimeframeFilter] = useState("this_month");
//   const [dateFrom, setDateFrom] = useState("");
//   const [dateTo, setDateTo] = useState("");
  
//   // --- STRATEGIC FILTERS ---
//   const [specializationFilter, setSpecializationFilter] = useState("");
//   const [doctorFilter, setDoctorFilter] = useState("");
//   const [payerFilter, setPayerFilter] = useState("");
//   const [statusFilter, setStatusFilter] = useState("");
//   const [wardFilter, setWardFilter] = useState("");

//   // --- DROPDOWN DATA ---
//   const [specializations, setSpecializations] = useState<any[]>([]);
//   const [doctors, setDoctors] = useState<any[]>([]);
//   const [payers, setPayers] = useState<any[]>([]);
//   const [wards, setWards] = useState<any[]>([]);

//   // --- PAGINATION & EXPORT ---
//   const [currentPage, setCurrentPage] = useState(1);
//   const [itemsPerPage, setItemsPerPage] = useState(50);
//   const [isExportOpen, setIsExportOpen] = useState(false);
//   const dropdownRef = useRef<HTMLDivElement>(null);

//   useEffect(() => {
//     const fetchDropdowns = async () => {
//       try {
//         const [specs, docs, pays, wardsRes] = await Promise.all([
//           apiClient.get('/doctors-specializations').catch(() => ({ data: { data: [] } })),
//           apiClient.get('/doctors').catch(() => ({ data: { data: [] } })),
//           apiClient.get('/payer-types').catch(() => ({ data: { data: [] } })),
//           apiClient.get('/wards').catch(() => ({ data: { data: [] } }))
//         ]);
//         if (specs.data?.data) setSpecializations(specs.data.data);
//         if (docs.data?.data) setDoctors(docs.data.data);
//         if (pays.data?.data) setPayers(pays.data.data);
//         if (wardsRes.data?.data) setWards(wardsRes.data.data);
//       } catch (err) {
//         console.error("Failed to fetch dropdowns", err);
//       }
//     };
//     fetchDropdowns();
//   }, []);

//   const buildQueryParams = (format?: string) => {
//     const params = new URLSearchParams();
//     if (timeframeFilter && timeframeFilter !== "custom") {
//       params.append("timeframe", timeframeFilter);
//     }
//     if (timeframeFilter === "custom" && dateFrom && dateTo) {
//       params.append("timeframe", "custom");
//       params.append("start_date", dateFrom);
//       params.append("end_date", dateTo);
//     }
//     if (specializationFilter) params.append("specialization_id", specializationFilter);
//     if (doctorFilter) params.append("doctor_id", doctorFilter);
//     if (payerFilter) params.append("payer_type_id", payerFilter);
//     if (statusFilter) params.append("status", statusFilter);
//     if (wardFilter) params.append("ward_id", wardFilter);
//     if (searchTerm) params.append("search", searchTerm);
    
//     if (format) {
//       params.append("format", format);
//     } else {
//       params.append("limit", itemsPerPage.toString());
//       params.append("offset", ((currentPage - 1) * itemsPerPage).toString());
//     }
    
//     return params.toString();
//   };

//   const fetchReportData = async () => {
//     try {
//       setIsLoading(true);
//       const query = buildQueryParams();
//       const response = await apiClient.get(`/report/ipd?${query}`);
      
//       if (response.data && response.data.data) {
//         // Handle variations in backend response wrappers
//         const responseData = response.data.data;
//         setData(responseData.records || responseData || []);
//         setMetadata(responseData.metadata || responseData || null);
//       } else {
//         setData([]);
//         setMetadata(null);
//       }
//     } catch (error) {
//       console.error("Failed to fetch inpatient report data:", error);
//       setData([]);
//       setMetadata(null);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   useEffect(() => {
//     if (timeframeFilter !== "custom" || (timeframeFilter === "custom" && dateFrom && dateTo)) {
//       fetchReportData();
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [
//     timeframeFilter, dateFrom, dateTo, specializationFilter, doctorFilter, 
//     payerFilter, statusFilter, wardFilter, currentPage, itemsPerPage
//   ]);

//   useEffect(() => {
//     const handleClickOutside = (event: MouseEvent) => {
//       if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
//         setIsExportOpen(false);
//       }
//     };
//     document.addEventListener("mousedown", handleClickOutside);
//     return () => document.removeEventListener("mousedown", handleClickOutside);
//   }, []);

//   const handleServerExport = async (format: string, fileExtension: string) => {
//     try {
//       setIsExporting(true);
//       const query = buildQueryParams(format);
      
//       const response = await apiClient.get(`/report/ipd?${query}`, {
//         responseType: 'blob'
//       });
      
//       const url = window.URL.createObjectURL(new Blob([response.data]));
//       const link = document.createElement('a');
//       link.href = url;
//       link.setAttribute('download', `inpatient_report_${new Date().toISOString().split('T')[0]}.${fileExtension}`);
//       document.body.appendChild(link);
//       link.click();
//       link.parentNode?.removeChild(link);
//       setIsExportOpen(false);
//     } catch (error) {
//       console.error(`Failed to export as ${format}:`, error);
//     } finally {
//       setIsExporting(false);
//     }
//   };

//   const clearFilters = () => {
//     setSearchTerm("");
//     setTimeframeFilter("this_month");
//     setDateFrom("");
//     setDateTo("");
//     setSpecializationFilter("");
//     setDoctorFilter("");
//     setPayerFilter("");
//     setStatusFilter("");
//     setWardFilter("");
//     setCurrentPage(1);
//   };

//   const currentItems = searchTerm ? data.filter((item) => {
//     const searchStr = searchTerm.toLowerCase();
//     return (
//       renderValue(item.first_name).toLowerCase().includes(searchStr) ||
//       renderValue(item.last_name).toLowerCase().includes(searchStr) ||
//       renderValue(item.mrn).toLowerCase().includes(searchStr) ||
//       renderValue(item.admission_number).toLowerCase().includes(searchStr) ||
//       renderValue(item.invoice_number).toLowerCase().includes(searchStr)
//     );
//   }) : data;

//   const aggregates = metadata?.aggregates || metadata?.summary;

//   const displayHeaders = [
//     { key: "mrn", label: "MRN" },
//     { key: "admission_number", label: "Adm #" },
//     { key: "patient_name", label: "Patient Name" },
//     { key: "gender", label: "Gender" },
//     { key: "admission_date", label: "Admission Date" },
//     { key: "admission_source", label: "Source" },
//     { key: "doctor", label: "Doctor" },
//     { key: "specialization_name", label: "Specialization" },
//     { key: "status", label: "Adm. Status" },
//     { key: "billing", label: "Billing" },
//     { key: "net_amount", label: "Net Amount", align: "right" },
//   ];

//   return (
//     <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 animate-in slide-in-from-bottom-4 duration-500 w-full overflow-hidden flex flex-col flex-1 h-full">
      
//       {/* HEADER & ACTIONS */}
//       <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
//         <div>
//           <h2 className="text-xl font-bold text-slate-800">Inpatient Report (IPD)</h2>
//           <p className="text-sm text-slate-500">View and export inpatient admissions, clinical metrics, and revenue.</p>
//         </div>
        
//         <div className="flex items-center gap-3">
//           <button
//             onClick={clearFilters}
//             disabled={isLoading || isExporting}
//             className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50 rounded-xl text-sm font-bold transition-colors"
//           >
//             <FilterX size={18} />
//             <span className="hidden sm:inline">Clear</span>
//           </button>
          
//           <button
//             onClick={fetchReportData}
//             disabled={isLoading || isExporting}
//             className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50 rounded-xl text-sm font-bold transition-colors"
//           >
//             <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
//             <span className="hidden sm:inline">Refresh</span>
//           </button>

//           <div className="relative" ref={dropdownRef}>
//             <button 
//               onClick={() => setIsExportOpen(!isExportOpen)}
//               disabled={isLoading || isExporting || data.length === 0}
//               className="flex items-center gap-2 px-5 py-2.5 bg-brand-primary text-white hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-bold transition-all shadow-md shadow-brand-primary/20"
//             >
//               {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
//               Export
//               <ChevronDown size={16} className={`transition-transform duration-200 ${isExportOpen ? "rotate-180" : ""}`} />
//             </button>

//             {isExportOpen && (
//               <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 py-2 animate-in fade-in zoom-in-95 duration-200">
//                 <button onClick={() => handleServerExport('csv', 'csv')} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
//                   <div className="p-1.5 bg-slate-50 text-slate-600 rounded-lg"><FileText size={16} /></div>
//                   Export CSV
//                 </button>
//                 <button onClick={() => handleServerExport('excel', 'xlsx')} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
//                   <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg"><FileSpreadsheet size={16} /></div>
//                   Export Excel
//                 </button>
//                 <button onClick={() => handleServerExport('pdf', 'pdf')} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
//                   <div className="p-1.5 bg-red-50 text-red-600 rounded-lg"><FilePdf size={16} /></div>
//                   Export PDF
//                 </button>
//               </div>
//             )}
//           </div>
//         </div>
//       </div>

//       {/* FILTER GRID */}
//       <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6 space-y-4">
        
//         {/* ROW 1: Search & Dates */}
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
//           <div className="relative">
//             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
//             <input
//               type="text"
//               placeholder="Search MRN, Name, Adm #..."
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//               onKeyDown={(e) => e.key === 'Enter' && fetchReportData()}
//               disabled={isLoading || isExporting}
//               className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
//             />
//           </div>

//           <div>
//             <select
//               value={timeframeFilter}
//               onChange={(e) => { setTimeframeFilter(e.target.value); setCurrentPage(1); }}
//               disabled={isLoading || isExporting}
//               className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
//             >
//               <option value="today">Today</option>
//               <option value="yesterday">Yesterday</option>
//               <option value="this_week">This Week</option>
//               <option value="last_week">Last Week</option>
//               <option value="last_7_days">Last 7 Days</option>
//               <option value="this_month">This Month</option>
//               <option value="last_month">Last Month</option>
//               <option value="last_30_days">Last 30 Days</option>
//               <option value="last_90_days">Last 90 Days</option>
//               <option value="this_year">This Year (YTD)</option>
//               <option value="all_time">All Time</option>
//               <option value="custom">Custom Range</option>
//             </select>
//           </div>

//           {timeframeFilter === "custom" && (
//             <>
//               <input
//                 type="date"
//                 value={dateFrom}
//                 onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
//                 disabled={isLoading || isExporting}
//                 className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
//               />
//               <input
//                 type="date"
//                 value={dateTo}
//                 onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
//                 disabled={isLoading || isExporting}
//                 min={dateFrom}
//                 className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
//               />
//             </>
//           )}
//         </div>

//         {/* ROW 2: Classifications */}
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
//           <div className="relative">
//             <Activity className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
//             <select
//               value={statusFilter}
//               onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
//               className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
//             >
//               <option value="">All Statuses</option>
//               <option value="ACTIVE">Active Admissions</option>
//               <option value="DISCHARGED">Discharged</option>
//               <option value="CANCELLED">Cancelled</option>
//             </select>
//           </div>

//           <div className="relative">
//             <BedDouble className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
//             <select
//               value={wardFilter}
//               onChange={(e) => { setWardFilter(e.target.value); setCurrentPage(1); }}
//               className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
//             >
//               <option value="">All Wards</option>
//               {wards.map(w => (
//                 <option key={w.id} value={w.id}>{w.name}</option>
//               ))}
//             </select>
//           </div>

//           <div className="relative">
//             <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
//             <select
//               value={doctorFilter}
//               onChange={(e) => { setDoctorFilter(e.target.value); setCurrentPage(1); }}
//               className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
//             >
//               <option value="">All Doctors</option>
//               {doctors.map(d => (
//                 <option key={d.doctor_id} value={d.doctor_id}>Dr. {d.first_name} {d.last_name}</option>
//               ))}
//             </select>
//           </div>

//           <div className="relative">
//             <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
//             <select
//               value={specializationFilter}
//               onChange={(e) => { setSpecializationFilter(e.target.value); setCurrentPage(1); }}
//               className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
//             >
//               <option value="">All Specializations</option>
//               {specializations.map(s => (
//                 <option key={s.id} value={s.id}>{s.name}</option>
//               ))}
//             </select>
//           </div>

//           <div className="relative">
//             <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
//             <select
//               value={payerFilter}
//               onChange={(e) => { setPayerFilter(e.target.value); setCurrentPage(1); }}
//               className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
//             >
//               <option value="">All Payers</option>
//               {payers.map(p => (
//                 <option key={p.id} value={p.id}>{p.name}</option>
//               ))}
//             </select>
//           </div>
//         </div>
//       </div>

//       {/* --- DASHBOARD SUMMARY CARDS --- */}
//       {!isLoading && aggregates && (
//         <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-500">
//           <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
//             <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
//               <Activity size={24} />
//             </div>
//             <div>
//               <p className="text-sm text-slate-500 font-medium">Total Admissions</p>
//               <h3 className="text-2xl font-bold text-slate-800">
//                 {aggregates.total_count ?? aggregates.total_admissions ?? metadata?.records_count ?? currentItems.length}
//               </h3>
//             </div>
//           </div>
          
//           {(aggregates.unique_patients || aggregates.total_discharged) && (
//             <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
//               <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
//                 {aggregates.unique_patients ? <UserCheck size={24} /> : <FileClock size={24} />}
//               </div>
//               <div>
//                 <p className="text-sm text-slate-500 font-medium">{aggregates.unique_patients ? 'Unique Patients' : 'Discharged'}</p>
//                 <h3 className="text-2xl font-bold text-slate-800">
//                   {aggregates.unique_patients ?? aggregates.total_discharged}
//                 </h3>
//               </div>
//             </div>
//           )}

//           <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
//             <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
//               <Wallet size={24} />
//             </div>
//             <div>
//               <p className="text-sm text-slate-500 font-medium">Total Net Revenue</p>
//               <h3 className="text-xl font-bold text-slate-800">
//                 {formatCurrency(aggregates.total_revenue ?? aggregates.subtotal_net_amount)}
//               </h3>
//             </div>
//           </div>
          
//           {(aggregates.total_gross || aggregates.subtotal_gross_amount) && (
//             <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
//               <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
//                 <FileText size={24} />
//               </div>
//               <div>
//                 <p className="text-sm text-slate-500 font-medium">Gross Billed</p>
//                 <h3 className="text-xl font-bold text-slate-800">
//                   {formatCurrency(aggregates.total_gross ?? aggregates.subtotal_gross_amount)}
//                 </h3>
//               </div>
//             </div>
//           )}
//         </div>
//       )}

//       {/* --- DETAILED DATA TABLE --- */}
//       <div className="overflow-x-auto overflow-y-auto rounded-xl border border-slate-200 flex-1 min-h-[400px]">
//         {isLoading ? (
//           <div className="h-full w-full flex items-center justify-center min-h-[400px] bg-slate-50/50">
//             <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
//           </div>
//         ) : (
//           <table className="w-full text-left text-sm whitespace-nowrap">
//             <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
//               <tr>
//                 {displayHeaders.map(header => (
//                   <th key={header.key} className={`px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px] ${header.align === 'right' ? 'text-right' : 'text-left'}`}>
//                     {header.label}
//                   </th>
//                 ))}
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-slate-100">
//               {currentItems.length > 0 ? (
//                 currentItems.map((row) => (
//                   <tr key={row.admission_id || row.invoice_number || row.mrn} className="hover:bg-slate-50/80 transition-colors">
//                     <td className="px-4 py-3.5 text-slate-700 font-medium">{renderValue(row.mrn)}</td>
//                     <td className="px-4 py-3.5 text-slate-700 font-mono text-xs">{renderValue(row.admission_number)}</td>
//                     <td className="px-4 py-3.5 text-slate-700 font-medium">
//                       {row.patient_name || `${row.first_name || ''} ${row.middle_name ? row.middle_name + ' ' : ''}${row.last_name || ''}`.trim() || '—'}
//                     </td>
//                     <td className="px-4 py-3.5 text-slate-700">{renderValue(row.gender)}</td>
//                     <td className="px-4 py-3.5 text-slate-700 text-xs">{row.admission_date ? new Date(row.admission_date).toLocaleString() : '—'}</td>
//                     <td className="px-4 py-3.5 text-slate-700">{renderValue(row.admission_source)}</td>
//                     <td className="px-4 py-3.5 text-slate-700">{row.doctor_first_name || row.doctor_last_name ? `Dr. ${row.doctor_first_name || ''} ${row.doctor_last_name || ''}`.trim() : '—'}</td>
//                     <td className="px-4 py-3.5 text-slate-700">{renderValue(row.specialization_name)}</td>
//                     <td className="px-4 py-3.5">
//                       <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
//                         row.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' :
//                         row.status === 'DISCHARGED' ? 'bg-slate-100 text-slate-700' :
//                         'bg-amber-100 text-amber-700'
//                       }`}>
//                         {renderValue(row.status)}
//                       </span>
//                     </td>
//                     <td className="px-4 py-3.5">
//                       <div className="flex flex-col gap-1 items-start">
//                         {row.invoice_status && (
//                           <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
//                             row.invoice_status === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
//                             row.invoice_status === 'UNPAID' ? 'bg-amber-100 text-amber-700' :
//                             'bg-slate-100 text-slate-700'
//                           }`}>
//                             {renderValue(row.invoice_status)}
//                           </span>
//                         )}
//                         {row.invoice_number && <span className="text-[10px] font-mono text-slate-500">{row.invoice_number}</span>}
//                         {(row.payer_type_name || row.payer_name) && <span className="text-[10px] text-slate-600">{row.payer_type_name || row.payer_name}</span>}
//                       </div>
//                     </td>
//                     <td className="px-4 py-3.5 text-slate-800 font-bold text-right font-mono bg-slate-50/50">
//                       {formatCurrency(row.net_amount)}
//                     </td>
//                   </tr>
//                 ))
//               ) : (
//                 <tr>
//                   <td colSpan={displayHeaders.length} className="px-4 py-12 text-center text-slate-400 italic">
//                     No inpatient records found for the selected filters.
//                   </td>
//                 </tr>
//               )}
//             </tbody>
//           </table>
//         )}
//       </div>
      
//       {/* Pagination Footer */}
//       {!isLoading && data.length > 0 && !searchTerm && (
//         <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
//           <div className="text-sm text-slate-500 font-medium">
//             <span className="text-slate-900 font-bold text-xs uppercase mr-2 tracking-wider">Page {currentPage}</span>
//           </div>
          
//           <div className="flex items-center gap-2">
//             <div className="flex items-center gap-1 mr-4">
//               <span className="text-xs text-slate-400 font-bold uppercase mr-2">Show</span>
//               <select 
//                 value={itemsPerPage}
//                 onChange={(e) => {
//                   setItemsPerPage(Number(e.target.value));
//                   setCurrentPage(1);
//                 }}
//                 className="bg-white border border-slate-200 rounded-lg text-xs font-bold px-2 py-1 outline-none focus:ring-2 focus:ring-brand-primary/20"
//               >
//                 {[25, 50, 100, 250].map(val => (
//                   <option key={val} value={val}>{val}</option>
//                 ))}
//               </select>
//             </div>

//             <div className="flex items-center gap-1">
//               <button
//                 onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
//                 disabled={currentPage === 1}
//                 className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors shadow-sm"
//               >
//                 <ChevronLeft size={16} />
//               </button>

//               <button
//                 onClick={() => setCurrentPage(prev => prev + 1)}
//                 disabled={currentItems.length < itemsPerPage}
//                 className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors shadow-sm"
//               >
//                 <ChevronRight size={16} />
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default InpatientReport;


// import React, { useState, useMemo, useEffect, useRef } from "react";
// import { 
//   Search, 
//   FileText, 
//   FileSpreadsheet, 
//   File as FilePdf, 
//   Loader2,
//   ChevronDown,
//   Download,
//   ChevronLeft,
//   ChevronRight,
//   Stethoscope,
//   Building2,
//   Wallet,
//   FilterX,
//   RefreshCw
// } from "lucide-react";
// import { exportToCSV, exportToExcel, exportToPDF } from "../../utils/exportUtils";
// import apiClient from "../../api/client";

// const renderValue = (val: any) => {
//   if (val === null || val === undefined || val === "") return "—";
//   return String(val);
// };

// const InpatientReport: React.FC = () => {
//   const [data, setData] = useState<any[]>([]);
//   const [isLoading, setIsLoading] = useState(true);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [timeframeFilter, setTimeframeFilter] = useState("");
//   const [dateFrom, setDateFrom] = useState("");
//   const [dateTo, setDateTo] = useState("");
//   const [specializationFilter, setSpecializationFilter] = useState("");
//   const [doctorFilter, setDoctorFilter] = useState("");
//   const [payerFilter, setPayerFilter] = useState("");

//   const [specializations, setSpecializations] = useState<any[]>([]);
//   const [doctors, setDoctors] = useState<any[]>([]);
//   const [payers, setPayers] = useState<any[]>([]);

//   // Pagination State
//   const [currentPage, setCurrentPage] = useState(1);
//   const [itemsPerPage, setItemsPerPage] = useState(25);
  
//   // Dropdown State
//   const [isExportOpen, setIsExportOpen] = useState(false);
//   const dropdownRef = useRef<HTMLDivElement>(null);

//   useEffect(() => {
//     const fetchDropdowns = async () => {
//       try {
//         const [specs, docs, pays] = await Promise.all([
//           apiClient.get('/doctors-specializations'),
//           apiClient.get('/doctors'),
//           apiClient.get('/payer-types')
//         ]);
//         if (specs.data?.data) setSpecializations(specs.data.data);
//         if (docs.data?.data) setDoctors(docs.data.data);
//         if (pays.data?.data) setPayers(pays.data.data);
//       } catch (err) {
//         console.error("Failed to fetch dropdowns", err);
//       }
//     };
//     fetchDropdowns();
//   }, []);

//   const fetchReportData = async () => {
//     try {
//       setIsLoading(true);
      
//       const params = new URLSearchParams();
//       if (timeframeFilter && timeframeFilter !== "custom") {
//         params.append("timeframe", timeframeFilter);
//       }
//       if (timeframeFilter === "custom" && dateFrom && dateTo) {
//         params.append("timeframe", "custom");
//         params.append("start_date", dateFrom);
//         params.append("end_date", dateTo);
//       }
//       if (specializationFilter) params.append("specialization_id", specializationFilter);
//       if (doctorFilter) params.append("doctor_id", doctorFilter);
//       if (payerFilter) params.append("payer_type_id", payerFilter);

//       const query = params.toString() ? `?${params.toString()}` : '';
//       const response = await apiClient.get(`/report/ipd${query}`);
//       if (response.data && response.data.data && response.data.data.records) {
//         setData(response.data.data.records);
//       } else {
//         setData([]);
//       }
//     } catch (error) {
//       console.error("Failed to fetch inpatient report data:", error);
//       setData([]);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   useEffect(() => {
//     if (timeframeFilter !== "custom" || (timeframeFilter === "custom" && dateFrom && dateTo)) {
//       fetchReportData();
//     }
//   }, [timeframeFilter, dateFrom, dateTo, specializationFilter, doctorFilter, payerFilter]);

//   // Close dropdown on click outside
//   useEffect(() => {
//     const handleClickOutside = (event: MouseEvent) => {
//       if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
//         setIsExportOpen(false);
//       }
//     };
//     document.addEventListener("mousedown", handleClickOutside);
//     return () => document.removeEventListener("mousedown", handleClickOutside);
//   }, []);

//   const filteredData = useMemo(() => {
//     return data.filter((item) => {
//       const searchStr = searchTerm.toLowerCase();
//       return (
//         renderValue(item.first_name).toLowerCase().includes(searchStr) ||
//         renderValue(item.last_name).toLowerCase().includes(searchStr) ||
//         renderValue(item.mrn).toLowerCase().includes(searchStr) ||
//         renderValue(item.admission_number).toLowerCase().includes(searchStr)
//       );
//     });
//   }, [data, searchTerm]);

//   // Pagination Logic
//   const totalItems = filteredData.length;
//   const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
//   const indexOfLastItem = currentPage * itemsPerPage;
//   const indexOfFirstItem = indexOfLastItem - itemsPerPage;
//   const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);

//   const handlePageChange = (page: number) => {
//     if (page >= 1 && page <= totalPages) {
//       setCurrentPage(page);
//     }
//   };

//   useEffect(() => {
//     setCurrentPage(1);
//   }, [searchTerm, timeframeFilter, dateFrom, dateTo, specializationFilter, doctorFilter, payerFilter]);

//   const handleExportCSV = () => {
//     exportToCSV(filteredData, "inpatient_report");
//     setIsExportOpen(false);
//   };

//   const handleExportExcel = () => {
//     exportToExcel(filteredData, "inpatient_report");
//     setIsExportOpen(false);
//   };

//   const handleExportPDF = () => {
//     exportToPDF(filteredData, "inpatient_report", "Inpatient Report");
//     setIsExportOpen(false);
//   };

//   const displayHeaders = [
//     { key: "mrn", label: "MRN" },
//     { key: "admission_number", label: "Adm #" },
//     { key: "patient_name", label: "Patient Name" },
//     { key: "gender", label: "Gender" },
//     { key: "admission_date", label: "Admission Date" },
//     { key: "admission_source", label: "Source" },
//     { key: "admission_reason", label: "Reason" },
//     { key: "doctor", label: "Doctor" },
//     { key: "specialization_name", label: "Specialization" },
//     { key: "status", label: "Adm. Status" },
//     { key: "billing", label: "Billing" },
//     { key: "net_amount", label: "Net Amount" },
//   ];

//   return (
//     <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 animate-in slide-in-from-bottom-4 duration-500 w-full overflow-hidden flex flex-col flex-1 h-full">
//       <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
//         <div>
//           <h2 className="text-xl font-bold text-slate-800">Inpatient Report (IPD)</h2>
//           <p className="text-sm text-slate-500">View and export inpatient admissions and metrics.</p>
//         </div>
        
//         <div className="flex items-center gap-3">
//           <button
//             onClick={() => {
//               setSearchTerm("");
//               setTimeframeFilter("");
//               setDateFrom("");
//               setDateTo("");
//               setSpecializationFilter("");
//               setDoctorFilter("");
//               setPayerFilter("");
//             }}
//             disabled={isLoading}
//             className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50 rounded-xl text-sm font-bold transition-colors"
//             title="Clear Filters"
//           >
//             <FilterX size={18} />
//             <span className="hidden sm:inline">Clear</span>
//           </button>
          
//           <button
//             onClick={fetchReportData}
//             disabled={isLoading}
//             className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50 rounded-xl text-sm font-bold transition-colors"
//             title="Refresh Data"
//           >
//             <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
//             <span className="hidden sm:inline">Refresh</span>
//           </button>

//           {/* Export Dropdown */}
//           <div className="relative" ref={dropdownRef}>
//             <button 
//               onClick={() => setIsExportOpen(!isExportOpen)}
//               disabled={isLoading || data.length === 0}
//               className="flex items-center gap-2 px-5 py-2.5 bg-brand-primary text-white hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-bold transition-all shadow-md shadow-brand-primary/20"
//             >
//               <Download size={18} />
//               Export
//               <ChevronDown size={16} className={`transition-transform duration-200 ${isExportOpen ? "rotate-180" : ""}`} />
//             </button>

//           {isExportOpen && (
//             <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 py-2 animate-in fade-in zoom-in-95 duration-200">
//               <button 
//                 onClick={handleExportCSV}
//                 className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
//               >
//                 <div className="p-1.5 bg-slate-50 text-slate-600 rounded-lg">
//                   <FileText size={16} />
//                 </div>
//                 Export as CSV
//               </button>
//               <button 
//                 onClick={handleExportExcel}
//                 className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
//               >
//                 <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
//                   <FileSpreadsheet size={16} />
//                 </div>
//                 Export as Excel
//               </button>
//               <button 
//                 onClick={handleExportPDF}
//                 className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
//               >
//                 <div className="p-1.5 bg-red-50 text-red-600 rounded-lg">
//                   <FilePdf size={16} />
//                 </div>
//                 Export as PDF
//               </button>
//             </div>
//           )}
//         </div>
//         </div>
//       </div>

//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
//         <div className="relative lg:col-span-2">
//           <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
//           <input
//             type="text"
//             placeholder="Search by name, MRN, admission #..."
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//             disabled={isLoading}
//             className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary disabled:opacity-50"
//           />
//         </div>

//         <div>
//           <select
//             value={timeframeFilter}
//             onChange={(e) => setTimeframeFilter(e.target.value)}
//             disabled={isLoading}
//             className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-700 disabled:opacity-50"
//           >
//             <option value="">All Time</option>
//             <option value="today">Today</option>
//             <option value="yesterday">Yesterday</option>
//             <option value="last_week">Last Week</option>
//             <option value="last_month">Last Month</option>
//             <option value="last_2_months">Last 2 Months</option>
//             <option value="last_3_months">Last 3 Months</option>
//             <option value="last_year">Last Year</option>
//             <option value="custom">Custom Date Range</option>
//           </select>
//         </div>

//         {timeframeFilter === "custom" && (
//           <>
//             <div className="relative">
//               <input
//                 type="date"
//                 value={dateFrom}
//                 onChange={(e) => setDateFrom(e.target.value)}
//                 disabled={isLoading}
//                 className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 text-slate-700 disabled:opacity-50"
//               />
//             </div>
//             <div className="relative">
//               <input
//                 type="date"
//                 value={dateTo}
//                 onChange={(e) => setDateTo(e.target.value)}
//                 disabled={isLoading}
//                 min={dateFrom}
//                 className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 text-slate-700 disabled:opacity-50"
//               />
//             </div>
//           </>
//         )}

//         <div className="relative">
//           <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
//           <select
//             value={doctorFilter}
//             onChange={(e) => setDoctorFilter(e.target.value)}
//             disabled={isLoading}
//             className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-700 disabled:opacity-50"
//           >
//             <option value="">All Doctors</option>
//             {doctors.map(d => (
//               <option key={d.doctor_id} value={d.doctor_id}>Dr. {d.first_name} {d.last_name}</option>
//             ))}
//           </select>
//         </div>

//         <div className="relative">
//           <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
//           <select
//             value={specializationFilter}
//             onChange={(e) => setSpecializationFilter(e.target.value)}
//             disabled={isLoading}
//             className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-700 disabled:opacity-50"
//           >
//             <option value="">All Specializations</option>
//             {specializations.map(s => (
//               <option key={s.id} value={s.id}>{s.name}</option>
//             ))}
//           </select>
//         </div>

//         <div className="relative">
//           <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
//           <select
//             value={payerFilter}
//             onChange={(e) => setPayerFilter(e.target.value)}
//             disabled={isLoading}
//             className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-700 disabled:opacity-50"
//           >
//             <option value="">All Payers</option>
//             {payers.map(p => (
//               <option key={p.id} value={p.id}>{p.name}</option>
//             ))}
//           </select>
//         </div>
//       </div>

//       <div className="overflow-x-auto overflow-y-auto rounded-xl border border-slate-200 flex-1 min-h-[400px]">
//         {isLoading ? (
//           <div className="h-full w-full flex items-center justify-center min-h-[400px] bg-slate-50/50">
//             <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
//           </div>
//         ) : (
//           <table className="w-full text-left text-sm whitespace-nowrap">
//             <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
//               <tr>
//                 {displayHeaders.map(header => (
//                   <th key={header.key} className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">
//                     {header.label}
//                   </th>
//                 ))}
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-slate-100">
//               {currentItems.length > 0 ? (
//                 currentItems.map((row) => (
//                   <tr key={row.admission_id || row.mrn} className="hover:bg-slate-50/80 transition-colors">
//                     <td className="px-4 py-3.5 text-slate-700 font-medium">
//                       {renderValue(row.mrn)}
//                     </td>
//                     <td className="px-4 py-3.5 text-slate-700">
//                       {renderValue(row.admission_number)}
//                     </td>
//                     <td className="px-4 py-3.5 text-slate-700">
//                       {`${row.first_name || ''} ${row.middle_name ? row.middle_name + ' ' : ''}${row.last_name || ''}`.trim() || '—'}
//                     </td>
//                     <td className="px-4 py-3.5 text-slate-700">
//                       {renderValue(row.gender)}
//                     </td>
//                     <td className="px-4 py-3.5 text-slate-700">
//                       {row.admission_date ? new Date(row.admission_date).toLocaleString() : '—'}
//                     </td>
//                     <td className="px-4 py-3.5 text-slate-700">
//                       {renderValue(row.admission_source)}
//                     </td>
//                     <td className="px-4 py-3.5 text-slate-700 whitespace-normal min-w-[200px]">
//                       {renderValue(row.admission_reason)}
//                     </td>
//                     <td className="px-4 py-3.5 text-slate-700">
//                       {row.doctor_first_name || row.doctor_last_name ? `Dr. ${row.doctor_first_name || ''} ${row.doctor_last_name || ''}`.trim() : '—'}
//                     </td>
//                     <td className="px-4 py-3.5 text-slate-700">
//                       {renderValue(row.specialization_name)}
//                     </td>
//                     <td className="px-4 py-3.5">
//                       <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
//                         row.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' :
//                         row.status === 'DISCHARGED' ? 'bg-slate-100 text-slate-700' :
//                         'bg-amber-100 text-amber-700'
//                       }`}>
//                         {renderValue(row.status)}
//                       </span>
//                     </td>
//                     <td className="px-4 py-3.5">
//                       <div className="flex flex-col gap-1 items-start">
//                         {row.invoice_status && (
//                           <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
//                             row.invoice_status === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
//                             row.invoice_status === 'UNPAID' ? 'bg-amber-100 text-amber-700' :
//                             'bg-slate-100 text-slate-700'
//                           }`}>
//                             {renderValue(row.invoice_status)}
//                           </span>
//                         )}
//                         {row.invoice_number && (
//                           <span className="text-[10px] font-mono text-slate-500">{row.invoice_number}</span>
//                         )}
//                         {row.payer_type_name && (
//                           <span className="text-[10px] text-slate-600">{row.payer_type_name}</span>
//                         )}
//                       </div>
//                     </td>
//                     <td className="px-4 py-3.5 text-slate-700 font-bold">
//                       {row.net_amount !== null && row.net_amount !== undefined ? `₦${Number(row.net_amount).toLocaleString(undefined, {minimumFractionDigits: 2})}` : '—'}
//                     </td>
//                   </tr>
//                 ))
//               ) : (
//                 <tr>
//                   <td colSpan={displayHeaders.length} className="px-4 py-12 text-center text-slate-400 italic">
//                     No inpatient records found for the selected filters.
//                   </td>
//                 </tr>
//               )}
//             </tbody>
//           </table>
//         )}
//       </div>
      
//       {/* Pagination Footer */}
//       {!isLoading && data.length > 0 && (
//         <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
//           <div className="text-sm text-slate-500 font-medium">
//             Showing <span className="text-slate-900 font-bold">{indexOfFirstItem + 1}</span> to{" "}
//             <span className="text-slate-900 font-bold">
//               {Math.min(indexOfLastItem, totalItems)}
//             </span> of{" "}
//             <span className="text-slate-900 font-bold">{totalItems}</span> records
//           </div>
          
//           <div className="flex items-center gap-2">
//             <div className="flex items-center gap-1 mr-4">
//               <span className="text-xs text-slate-400 font-bold uppercase mr-2">Show</span>
//               <select 
//                 value={itemsPerPage}
//                 onChange={(e) => {
//                   setItemsPerPage(Number(e.target.value));
//                   setCurrentPage(1);
//                 }}
//                 className="bg-white border border-slate-200 rounded-lg text-xs font-bold px-2 py-1 outline-none focus:ring-2 focus:ring-brand-primary/20"
//               >
//                 {[10, 25, 50, 100].map(val => (
//                   <option key={val} value={val}>{val}</option>
//                 ))}
//               </select>
//             </div>

//             <div className="flex items-center gap-1">
//               <button
//                 onClick={() => handlePageChange(currentPage - 1)}
//                 disabled={currentPage === 1}
//                 className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors shadow-sm"
//               >
//                 <ChevronLeft size={16} />
//               </button>
              
//               <div className="flex items-center gap-1 px-2">
//                 <span className="text-sm font-bold text-slate-900">{currentPage}</span>
//                 <span className="text-sm text-slate-400 mx-1">of</span>
//                 <span className="text-sm font-bold text-slate-900">{totalPages || 1}</span>
//               </div>

//               <button
//                 onClick={() => handlePageChange(currentPage + 1)}
//                 disabled={currentPage === totalPages || totalPages === 0}
//                 className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors shadow-sm"
//               >
//                 <ChevronRight size={16} />
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default InpatientReport;
