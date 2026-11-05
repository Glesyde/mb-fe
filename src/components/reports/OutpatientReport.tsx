import React, { useState, useEffect, useRef } from "react";
import { 
  Search, FileText, FileSpreadsheet, File as FilePdf, Loader2,
  ChevronDown, Download, ChevronLeft, ChevronRight, 
  Stethoscope, Building2, Wallet, FilterX, RefreshCw, 
  Activity, UserCheck, Users, ClipboardList, Thermometer
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

const OutpatientReport: React.FC = () => {
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
  const [payerFilter, setPayerFilter] = useState(""); // Now stores Specific Payer ID
  const [encounterStatus, setEncounterStatus] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [procedureFilter, setProcedureFilter] = useState("");
  const [visitReason, setVisitReason] = useState("");

  // --- DROPDOWN DATA ---
  const [specializations, setSpecializations] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [payers, setPayers] = useState<any[]>([]); // Specific Payers (Leadway, etc)
  const [services, setServices] = useState<any[]>([]);
  const [procedures, setProcedures] = useState<any[]>([]);

  // --- PAGINATION & EXPORT ---
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [specs, docs, pays, servs, procs] = await Promise.all([
          apiClient.get('/doctors-specializations').catch(() => ({ data: { data: [] } })),
          apiClient.get('/doctors').catch(() => ({ data: { data: [] } })),
          apiClient.get('/payers').catch(() => ({ data: { data: [] } })), // Fetching specific payers now
          apiClient.get('/services').catch(() => ({ data: { data: [] } })),
          apiClient.get('/procedures').catch(() => ({ data: { data: [] } }))
        ]);
        if (specs.data?.data) setSpecializations(specs.data.data);
        if (docs.data?.data) setDoctors(docs.data.data);
        if (pays.data?.data) setPayers(pays.data.data);
        if (servs.data?.data) setServices(servs.data.data);
        if (procs.data?.data) setProcedures(procs.data.data);
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
    if (payerFilter) params.append("payer_id", payerFilter); // Send specific payer
    if (encounterStatus) params.append("encounter_status", encounterStatus);
    if (searchTerm) params.append("search", searchTerm);
    if (visitReason) params.append("visit_reason", visitReason);
    
    // Arrays required for services/procedures based on backend update
    if (serviceFilter) params.append("service_ids[]", serviceFilter);
    if (procedureFilter) params.append("procedure_ids[]", procedureFilter);
    
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
      const response = await apiClient.get(`/report/opd?${query}`);
      
      if (response.data && response.data.data) {
        const responseData = response.data.data;
        setData(responseData.records || []);
        setMetadata(responseData.metadata || null);
      } else {
        setData([]);
        setMetadata(null);
      }
    } catch (error) {
      console.error("Failed to fetch outpatient report data:", error);
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
    // Note: visitReason and searchTerm trigger manually on Enter/Refresh to avoid heavy rapid-fire requests
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    timeframeFilter, dateFrom, dateTo, specializationFilter, doctorFilter, 
    payerFilter, encounterStatus, serviceFilter, procedureFilter, currentPage, itemsPerPage
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
      
      const response = await apiClient.get(`/report/opd?${query}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `outpatient_registry_${new Date().toISOString().split('T')[0]}.${fileExtension}`);
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
    setEncounterStatus("");
    setServiceFilter("");
    setProcedureFilter("");
    setVisitReason("");
    setCurrentPage(1);
  };

  const currentItems = searchTerm ? data.filter((item) => {
    const searchStr = searchTerm.toLowerCase();
    return (
      renderValue(item.first_name).toLowerCase().includes(searchStr) ||
      renderValue(item.last_name).toLowerCase().includes(searchStr) ||
      renderValue(item.mrn).toLowerCase().includes(searchStr) ||
      renderValue(item.invoice_number).toLowerCase().includes(searchStr)
    );
  }) : data;

  const aggregates = metadata?.aggregates;

  const displayHeaders = [
    { key: "mrn", label: "MRN" },
    { key: "patient_name", label: "Patient Name" },
    { key: "gender", label: "Gender" },
    { key: "age", label: "Age" },
    { key: "started_at", label: "Encounter Date" },
    { key: "doctor", label: "Doctor" },
    { key: "specialization_name", label: "Specialization" },
    { key: "payer_name", label: "Payer" }, // Updated from Payer Framework
    { key: "encounter_status", label: "Encounter" },
    { key: "invoice_status", label: "Billing Status" },
    { key: "net_amount", label: "Net Amount (₦)", align: "right" },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 animate-in slide-in-from-bottom-4 duration-500 w-full overflow-hidden flex flex-col flex-1 h-full">
      
      {/* HEADER & ACTIONS */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Outpatient Report (OPD)</h2>
          <p className="text-sm text-slate-500">View and export outpatient encounters, NHMIS demographics, and revenue.</p>
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
              placeholder="Search MRN, Name, Invoice..."
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

        {/* ROW 2: Base Classifications */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <ClipboardList className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <select
              value={encounterStatus}
              onChange={(e) => { setEncounterStatus(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            >
              <option value="">All Encounter Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="QUEUED">Queued / Waiting</option>
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
              <option value="">All Payers (Leadway, etc)</option>
              {payers.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ROW 3: Clinical Items & Reason */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="relative">
            <Activity className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <select
              value={serviceFilter}
              onChange={(e) => { setServiceFilter(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            >
              <option value="">Filter by Specific Service</option>
              {services.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Thermometer className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <select
              value={procedureFilter}
              onChange={(e) => { setProcedureFilter(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            >
              <option value="">Filter by Specific Procedure</option>
              {procedures.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Search specific Visit Reason..."
              value={visitReason}
              onChange={(e) => setVisitReason(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchReportData()}
              disabled={isLoading || isExporting}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
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
              <p className="text-sm text-slate-500 font-medium">Total Encounters</p>
              <h3 className="text-2xl font-bold text-slate-800">{aggregates.total_encounters || 0}</h3>
            </div>
          </div>
          
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
              <UserCheck size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Unique Patients</p>
              <h3 className="text-2xl font-bold text-slate-800">{aggregates.unique_patients || 0}</h3>
            </div>
          </div>

          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-emerald-100 text-emerald-700 rounded-lg">
              <Wallet size={24} />
            </div>
            <div>
              <p className="text-sm text-emerald-700 font-medium">Total Net Revenue</p>
              <h3 className="text-xl font-bold text-emerald-800">
                {formatCurrency(aggregates.total_revenue || 0)}
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
                  <td className="px-4 py-2 text-center text-slate-600">{aggregates.nhmis_summary.male?.['0_28_days'] || 0}</td>
                  <td className="px-4 py-2 text-center text-slate-600">{aggregates.nhmis_summary.male?.['29d_11mths'] || 0}</td>
                  <td className="px-4 py-2 text-center text-slate-600">{aggregates.nhmis_summary.male?.['12_59_mths'] || 0}</td>
                  <td className="px-4 py-2 text-center text-slate-600">{aggregates.nhmis_summary.male?.['5_9_yrs'] || 0}</td>
                  <td className="px-4 py-2 text-center text-slate-600">{aggregates.nhmis_summary.male?.['10_19_yrs'] || 0}</td>
                  <td className="px-4 py-2 text-center text-slate-600">{aggregates.nhmis_summary.male?.['20_plus_yrs'] || 0}</td>
                  <td className="px-4 py-2 text-center font-bold text-brand-primary bg-brand-primary/5">{aggregates.gender_summary?.total_male || 0}</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-bold text-slate-700 border-r border-slate-100 bg-slate-50">Female</td>
                  <td className="px-4 py-2 text-center text-slate-600">{aggregates.nhmis_summary.female?.['0_28_days'] || 0}</td>
                  <td className="px-4 py-2 text-center text-slate-600">{aggregates.nhmis_summary.female?.['29d_11mths'] || 0}</td>
                  <td className="px-4 py-2 text-center text-slate-600">{aggregates.nhmis_summary.female?.['12_59_mths'] || 0}</td>
                  <td className="px-4 py-2 text-center text-slate-600">{aggregates.nhmis_summary.female?.['5_9_yrs'] || 0}</td>
                  <td className="px-4 py-2 text-center text-slate-600">{aggregates.nhmis_summary.female?.['10_19_yrs'] || 0}</td>
                  <td className="px-4 py-2 text-center text-slate-600">{aggregates.nhmis_summary.female?.['20_plus_yrs'] || 0}</td>
                  <td className="px-4 py-2 text-center font-bold text-brand-primary bg-brand-primary/5">{aggregates.gender_summary?.total_female || 0}</td>
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
                  <tr key={row.encounter_id || row.mrn} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3.5 text-slate-700 font-medium">{renderValue(row.mrn)}</td>
                    <td className="px-4 py-3.5 text-slate-700">{`${row.first_name || ''} ${row.middle_name ? row.middle_name + ' ' : ''}${row.last_name || ''}`.trim() || '—'}</td>
                    <td className="px-4 py-3.5 text-slate-700">{renderValue(row.gender)}</td>
                    <td className="px-4 py-3.5 text-slate-700">{row.age_years !== undefined && row.age_years !== null ? `${row.age_years} Yrs` : '—'}</td>
                    <td className="px-4 py-3.5 text-slate-700">{row.started_at ? new Date(row.started_at).toLocaleString() : '—'}</td>
                    <td className="px-4 py-3.5 text-slate-700">{row.doctor_first_name || row.doctor_last_name ? `Dr. ${row.doctor_first_name || ''} ${row.doctor_last_name || ''}`.trim() : '—'}</td>
                    <td className="px-4 py-3.5 text-slate-700">{renderValue(row.specialization_name)}</td>
                    <td className="px-4 py-3.5 text-slate-700">{renderValue(row.payer_name || row.payer_type_name)}</td>
                    <td className="px-4 py-3.5">
                      {row.encounter_status ? (
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                          row.encounter_status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                          row.encounter_status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {renderValue(row.encounter_status)}
                        </span>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col gap-1 items-start">
                        {row.invoice_status ? (
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            row.invoice_status === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
                            row.invoice_status === 'UNPAID' ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {renderValue(row.invoice_status)}
                          </span>
                        ) : <span className="text-slate-400">—</span>}
                        {row.invoice_number && <span className="text-[10px] font-mono text-slate-500">{row.invoice_number}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-800 text-right font-bold font-mono bg-slate-50/50">
                      {formatCurrency(row.net_amount)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={displayHeaders.length} className="px-4 py-12 text-center text-slate-400 italic">
                    No outpatient records found for the selected filters.
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
                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
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

export default OutpatientReport;




// import React, { useState, useMemo, useEffect, useRef } from "react";
// import { 
//   Search, FileText, FileSpreadsheet, File as FilePdf, Loader2,
//   ChevronDown, Download, ChevronLeft, ChevronRight, 
//   Stethoscope, Building2, Wallet, FilterX, RefreshCw, 
//   Activity, UserCheck, Users, ClipboardList
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

// const OutpatientReport: React.FC = () => {
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
//   const [encounterStatus, setEncounterStatus] = useState("");

//   // --- DROPDOWN DATA ---
//   const [specializations, setSpecializations] = useState<any[]>([]);
//   const [doctors, setDoctors] = useState<any[]>([]);
//   const [payers, setPayers] = useState<any[]>([]);

//   // --- PAGINATION & EXPORT ---
//   const [currentPage, setCurrentPage] = useState(1);
//   const [itemsPerPage, setItemsPerPage] = useState(50);
//   const [isExportOpen, setIsExportOpen] = useState(false);
//   const dropdownRef = useRef<HTMLDivElement>(null);

//   useEffect(() => {
//     const fetchDropdowns = async () => {
//       try {
//         const [specs, docs, pays] = await Promise.all([
//           apiClient.get('/doctors-specializations').catch(() => ({ data: { data: [] } })),
//           apiClient.get('/doctors').catch(() => ({ data: { data: [] } })),
//           apiClient.get('/payer-types').catch(() => ({ data: { data: [] } }))
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
//     if (encounterStatus) params.append("encounter_status", encounterStatus);
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
//       const response = await apiClient.get(`/report/opd?${query}`);
      
//       if (response.data && response.data.data) {
//         const responseData = response.data.data;
//         setData(responseData.records || []);
//         setMetadata(responseData.metadata || null);
//       } else {
//         setData([]);
//         setMetadata(null);
//       }
//     } catch (error) {
//       console.error("Failed to fetch outpatient report data:", error);
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
//     payerFilter, encounterStatus, currentPage, itemsPerPage
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
      
//       const response = await apiClient.get(`/report/opd?${query}`, {
//         responseType: 'blob'
//       });
      
//       const url = window.URL.createObjectURL(new Blob([response.data]));
//       const link = document.createElement('a');
//       link.href = url;
//       link.setAttribute('download', `outpatient_registry_${new Date().toISOString().split('T')[0]}.${fileExtension}`);
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
//     setEncounterStatus("");
//     setCurrentPage(1);
//   };

//   const currentItems = searchTerm ? data.filter((item) => {
//     const searchStr = searchTerm.toLowerCase();
//     return (
//       renderValue(item.first_name).toLowerCase().includes(searchStr) ||
//       renderValue(item.last_name).toLowerCase().includes(searchStr) ||
//       renderValue(item.mrn).toLowerCase().includes(searchStr) ||
//       renderValue(item.invoice_number).toLowerCase().includes(searchStr)
//     );
//   }) : data;

//   const aggregates = metadata?.aggregates;

//   const displayHeaders = [
//     { key: "mrn", label: "MRN" },
//     { key: "patient_name", label: "Patient Name" },
//     { key: "gender", label: "Gender" },
//     { key: "age", label: "Age" },
//     { key: "started_at", label: "Encounter Date" },
//     { key: "doctor", label: "Doctor" },
//     { key: "specialization_name", label: "Specialization" },
//     { key: "payer_type_name", label: "Payer Framework" },
//     { key: "encounter_status", label: "Encounter" },
//     { key: "invoice_status", label: "Billing Status" },
//     { key: "net_amount", label: "Net Amount (₦)", align: "right" },
//   ];

//   return (
//     <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 animate-in slide-in-from-bottom-4 duration-500 w-full overflow-hidden flex flex-col flex-1 h-full">
      
//       {/* HEADER & ACTIONS */}
//       <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
//         <div>
//           <h2 className="text-xl font-bold text-slate-800">Outpatient Report (OPD)</h2>
//           <p className="text-sm text-slate-500">View and export outpatient encounters, NHMIS demographics, and revenue.</p>
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
//               placeholder="Search MRN, Name, Invoice..."
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
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
//           <div className="relative">
//             <ClipboardList className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
//             <select
//               value={encounterStatus}
//               onChange={(e) => { setEncounterStatus(e.target.value); setCurrentPage(1); }}
//               className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
//             >
//               <option value="">All Encounter Statuses</option>
//               <option value="COMPLETED">Completed</option>
//               <option value="IN_PROGRESS">In Progress</option>
//               <option value="QUEUED">Queued / Waiting</option>
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
//               <p className="text-sm text-slate-500 font-medium">Total Encounters</p>
//               <h3 className="text-2xl font-bold text-slate-800">{aggregates.total_encounters}</h3>
//             </div>
//           </div>
          
//           <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
//             <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
//               <UserCheck size={24} />
//             </div>
//             <div>
//               <p className="text-sm text-slate-500 font-medium">Unique Patients</p>
//               <h3 className="text-2xl font-bold text-slate-800">{aggregates.unique_patients}</h3>
//             </div>
//           </div>

//           <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 shadow-sm flex items-center gap-4">
//             <div className="p-3 bg-emerald-100 text-emerald-700 rounded-lg">
//               <Wallet size={24} />
//             </div>
//             <div>
//               <p className="text-sm text-emerald-700 font-medium">Total Net Revenue</p>
//               <h3 className="text-xl font-bold text-emerald-800">
//                 {formatCurrency(aggregates.total_revenue)}
//               </h3>
//             </div>
//           </div>

//           <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
//             <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
//               <Users size={24} />
//             </div>
//             <div className="w-full">
//               <p className="text-sm text-slate-500 font-medium">Gender Split</p>
//               <div className="flex justify-between items-end w-full mt-1">
//                 <div>
//                   <span className="text-sm text-slate-400">M: </span>
//                   <span className="font-bold text-slate-700">{aggregates.gender_summary?.total_male || 0}</span>
//                 </div>
//                 <div>
//                   <span className="text-sm text-slate-400">F: </span>
//                   <span className="font-bold text-slate-700">{aggregates.gender_summary?.total_female || 0}</span>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* --- NHMIS AGE/GENDER SUMMARY TABLE --- */}
//       {!isLoading && aggregates?.nhmis_summary && (
//         <div className="mb-6 rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
//           <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
//             <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">NHMIS Health Facility Monthly Summary</h3>
//           </div>
//           <div className="overflow-x-auto">
//             <table className="w-full text-left text-sm whitespace-nowrap">
//               <thead className="bg-slate-50 border-b border-slate-100">
//                 <tr>
//                   <th className="px-4 py-2 font-bold text-slate-600 text-[11px] uppercase w-32 border-r border-slate-100">Gender</th>
//                   <th className="px-4 py-2 font-bold text-slate-600 text-[11px] uppercase text-center">0-28 Days</th>
//                   <th className="px-4 py-2 font-bold text-slate-600 text-[11px] uppercase text-center">29d-11 Mths</th>
//                   <th className="px-4 py-2 font-bold text-slate-600 text-[11px] uppercase text-center">12-59 Mths</th>
//                   <th className="px-4 py-2 font-bold text-slate-600 text-[11px] uppercase text-center">5-9 Yrs</th>
//                   <th className="px-4 py-2 font-bold text-slate-600 text-[11px] uppercase text-center">10-19 Yrs</th>
//                   <th className="px-4 py-2 font-bold text-slate-600 text-[11px] uppercase text-center">≥20 Yrs</th>
//                   <th className="px-4 py-2 font-bold text-brand-primary text-[11px] uppercase text-center bg-brand-primary/5">Total</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-100">
//                 <tr>
//                   <td className="px-4 py-2 font-bold text-slate-700 border-r border-slate-100 bg-slate-50">Male</td>
//                   <td className="px-4 py-2 text-center text-slate-600">{aggregates.nhmis_summary.male['0_28_days']}</td>
//                   <td className="px-4 py-2 text-center text-slate-600">{aggregates.nhmis_summary.male['29d_11mths']}</td>
//                   <td className="px-4 py-2 text-center text-slate-600">{aggregates.nhmis_summary.male['12_59_mths']}</td>
//                   <td className="px-4 py-2 text-center text-slate-600">{aggregates.nhmis_summary.male['5_9_yrs']}</td>
//                   <td className="px-4 py-2 text-center text-slate-600">{aggregates.nhmis_summary.male['10_19_yrs']}</td>
//                   <td className="px-4 py-2 text-center text-slate-600">{aggregates.nhmis_summary.male['20_plus_yrs']}</td>
//                   <td className="px-4 py-2 text-center font-bold text-brand-primary bg-brand-primary/5">{aggregates.gender_summary.total_male}</td>
//                 </tr>
//                 <tr>
//                   <td className="px-4 py-2 font-bold text-slate-700 border-r border-slate-100 bg-slate-50">Female</td>
//                   <td className="px-4 py-2 text-center text-slate-600">{aggregates.nhmis_summary.female['0_28_days']}</td>
//                   <td className="px-4 py-2 text-center text-slate-600">{aggregates.nhmis_summary.female['29d_11mths']}</td>
//                   <td className="px-4 py-2 text-center text-slate-600">{aggregates.nhmis_summary.female['12_59_mths']}</td>
//                   <td className="px-4 py-2 text-center text-slate-600">{aggregates.nhmis_summary.female['5_9_yrs']}</td>
//                   <td className="px-4 py-2 text-center text-slate-600">{aggregates.nhmis_summary.female['10_19_yrs']}</td>
//                   <td className="px-4 py-2 text-center text-slate-600">{aggregates.nhmis_summary.female['20_plus_yrs']}</td>
//                   <td className="px-4 py-2 text-center font-bold text-brand-primary bg-brand-primary/5">{aggregates.gender_summary.total_female}</td>
//                 </tr>
//               </tbody>
//             </table>
//           </div>
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
//                   <tr key={row.encounter_id || row.mrn} className="hover:bg-slate-50/80 transition-colors">
//                     <td className="px-4 py-3.5 text-slate-700 font-medium">{renderValue(row.mrn)}</td>
//                     <td className="px-4 py-3.5 text-slate-700">{`${row.first_name || ''} ${row.middle_name ? row.middle_name + ' ' : ''}${row.last_name || ''}`.trim() || '—'}</td>
//                     <td className="px-4 py-3.5 text-slate-700">{renderValue(row.gender)}</td>
//                     <td className="px-4 py-3.5 text-slate-700">{row.age_years !== undefined && row.age_years !== null ? `${row.age_years} Yrs` : '—'}</td>
//                     <td className="px-4 py-3.5 text-slate-700">{row.started_at ? new Date(row.started_at).toLocaleString() : '—'}</td>
//                     <td className="px-4 py-3.5 text-slate-700">{row.doctor_first_name || row.doctor_last_name ? `Dr. ${row.doctor_first_name || ''} ${row.doctor_last_name || ''}`.trim() : '—'}</td>
//                     <td className="px-4 py-3.5 text-slate-700">{renderValue(row.specialization_name)}</td>
//                     <td className="px-4 py-3.5 text-slate-700">{renderValue(row.payer_type_name)}</td>
//                     <td className="px-4 py-3.5">
//                       {row.encounter_status ? (
//                         <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${
//                           row.encounter_status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
//                           row.encounter_status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-700' :
//                           'bg-slate-100 text-slate-700'
//                         }`}>
//                           {renderValue(row.encounter_status)}
//                         </span>
//                       ) : <span className="text-slate-400">—</span>}
//                     </td>
//                     <td className="px-4 py-3.5">
//                       <div className="flex flex-col gap-1 items-start">
//                         {row.invoice_status ? (
//                           <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
//                             row.invoice_status === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
//                             row.invoice_status === 'UNPAID' ? 'bg-red-100 text-red-700' :
//                             'bg-amber-100 text-amber-700'
//                           }`}>
//                             {renderValue(row.invoice_status)}
//                           </span>
//                         ) : <span className="text-slate-400">—</span>}
//                         {row.invoice_number && <span className="text-[10px] font-mono text-slate-500">{row.invoice_number}</span>}
//                       </div>
//                     </td>
//                     <td className="px-4 py-3.5 text-slate-800 text-right font-bold font-mono bg-slate-50/50">
//                       {formatCurrency(row.net_amount)}
//                     </td>
//                   </tr>
//                 ))
//               ) : (
//                 <tr>
//                   <td colSpan={displayHeaders.length} className="px-4 py-12 text-center text-slate-400 italic">
//                     No outpatient records found for the selected filters.
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
//                 onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
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

// export default OutpatientReport;







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
//   RefreshCw,
//   Users,
//   Activity,
//   UserCheck
// } from "lucide-react";
// import apiClient from "../../api/client";

// const renderValue = (val: any) => {
//   if (val === null || val === undefined || val === "") return "—";
//   return String(val);
// };

// const OutpatientReport: React.FC = () => {
//   const [data, setData] = useState<any[]>([]);
//   const [metadata, setMetadata] = useState<any>(null); // Added state for metadata
//   const [isLoading, setIsLoading] = useState(true);
//   const [isExporting, setIsExporting] = useState(false);
  
//   // Filters
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
//       const response = await apiClient.get(`/report/opd?${query}`);
      
//       if (response.data && response.data.data) {
//         setData(response.data.data.records || []);
//         setMetadata(response.data.data.metadata || null); // Capture metadata
//       } else {
//         setData([]);
//         setMetadata(null);
//       }
//     } catch (error) {
//       console.error("Failed to fetch outpatient report data:", error);
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
//   }, [timeframeFilter, dateFrom, dateTo, specializationFilter, doctorFilter, payerFilter, currentPage, itemsPerPage]);

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
      
//       const response = await apiClient.get(`/report/opd?${query}`, {
//         responseType: 'blob'
//       });
      
//       const url = window.URL.createObjectURL(new Blob([response.data]));
//       const link = document.createElement('a');
//       link.href = url;
//       link.setAttribute('download', `outpatient_report_${new Date().toISOString().split('T')[0]}.${fileExtension}`);
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

//   const filteredData = useMemo(() => {
//     if (!searchTerm) return data;
//     return data.filter((item) => {
//       const searchStr = searchTerm.toLowerCase();
//       return (
//         renderValue(item.first_name).toLowerCase().includes(searchStr) ||
//         renderValue(item.last_name).toLowerCase().includes(searchStr) ||
//         renderValue(item.mrn).toLowerCase().includes(searchStr) ||
//         renderValue(item.invoice_number).toLowerCase().includes(searchStr)
//       );
//     });
//   }, [data, searchTerm]);

//   const currentItems = searchTerm ? filteredData : data;
//   const aggregates = metadata?.aggregates;

//   const displayHeaders = [
//     { key: "mrn", label: "MRN" },
//     { key: "patient_name", label: "Patient Name" },
//     { key: "gender", label: "Gender" },
//     { key: "age", label: "Age" },
//     { key: "started_at", label: "Encounter Date" },
//     { key: "visit_reason", label: "Reason" },
//     { key: "doctor", label: "Doctor" },
//     { key: "specialization_name", label: "Specialization" },
//     { key: "payer_type_name", label: "Payer" },
//     { key: "encounter_status", label: "Encounter" },
//     { key: "invoice_status", label: "Billing" },
//     { key: "net_amount", label: "Net Amount" },
//   ];

//   return (
//     <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 animate-in slide-in-from-bottom-4 duration-500 w-full overflow-hidden flex flex-col flex-1 h-full">
//       <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
//         <div>
//           <h2 className="text-xl font-bold text-slate-800">Outpatient Report (OPD)</h2>
//           <p className="text-sm text-slate-500">View and export outpatient encounters and metrics.</p>
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
//               setCurrentPage(1);
//             }}
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
//               disabled={isLoading || isExporting || currentItems.length === 0}
//               className="flex items-center gap-2 px-5 py-2.5 bg-brand-primary text-white hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-bold transition-all shadow-md shadow-brand-primary/20"
//             >
//               {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
//               Export
//               <ChevronDown size={16} className={`transition-transform duration-200 ${isExportOpen ? "rotate-180" : ""}`} />
//             </button>

//             {isExportOpen && (
//               <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 py-2 animate-in fade-in zoom-in-95 duration-200">
//                 <button 
//                   onClick={() => handleServerExport('csv', 'csv')}
//                   className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
//                 >
//                   <div className="p-1.5 bg-slate-50 text-slate-600 rounded-lg"><FileText size={16} /></div>
//                   Export as CSV
//                 </button>
//                 <button 
//                   onClick={() => handleServerExport('excel', 'xlsx')}
//                   className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
//                 >
//                   <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg"><FileSpreadsheet size={16} /></div>
//                   Export as Excel
//                 </button>
//                 <button 
//                   onClick={() => handleServerExport('pdf', 'pdf')}
//                   className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
//                 >
//                   <div className="p-1.5 bg-red-50 text-red-600 rounded-lg"><FilePdf size={16} /></div>
//                   Export as PDF
//                 </button>
//               </div>
//             )}
//           </div>
//         </div>
//       </div>

//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
//         <div className="relative lg:col-span-2">
//           <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
//           <input
//             type="text"
//             placeholder="Search by name, MRN, invoice..."
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//             onKeyDown={(e) => e.key === 'Enter' && fetchReportData()}
//             disabled={isLoading || isExporting}
//             className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary disabled:opacity-50"
//           />
//         </div>

//         <div>
//           <select
//             value={timeframeFilter}
//             onChange={(e) => { setTimeframeFilter(e.target.value); setCurrentPage(1); }}
//             disabled={isLoading || isExporting}
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
//                 onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
//                 disabled={isLoading || isExporting}
//                 className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 text-slate-700 disabled:opacity-50"
//               />
//             </div>
//             <div className="relative">
//               <input
//                 type="date"
//                 value={dateTo}
//                 onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
//                 disabled={isLoading || isExporting}
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
//             onChange={(e) => { setDoctorFilter(e.target.value); setCurrentPage(1); }}
//             disabled={isLoading || isExporting}
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
//             onChange={(e) => { setSpecializationFilter(e.target.value); setCurrentPage(1); }}
//             disabled={isLoading || isExporting}
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
//             onChange={(e) => { setPayerFilter(e.target.value); setCurrentPage(1); }}
//             disabled={isLoading || isExporting}
//             className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-700 disabled:opacity-50"
//           >
//             <option value="">All Payers</option>
//             {payers.map(p => (
//               <option key={p.id} value={p.id}>{p.name}</option>
//             ))}
//           </select>
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
//               <p className="text-sm text-slate-500 font-medium">Total Encounters</p>
//               <h3 className="text-2xl font-bold text-slate-800">{aggregates.total_encounters}</h3>
//             </div>
//           </div>
          
//           <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
//             <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
//               <UserCheck size={24} />
//             </div>
//             <div>
//               <p className="text-sm text-slate-500 font-medium">Unique Patients</p>
//               <h3 className="text-2xl font-bold text-slate-800">{aggregates.unique_patients}</h3>
//             </div>
//           </div>

//           <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
//             <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
//               <Wallet size={24} />
//             </div>
//             <div>
//               <p className="text-sm text-slate-500 font-medium">Total Net Revenue</p>
//               <h3 className="text-xl font-bold text-slate-800">
//                 ₦{Number(aggregates.total_revenue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
//               </h3>
//             </div>
//           </div>

//           <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
//             <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
//               <Users size={24} />
//             </div>
//             <div className="w-full">
//               <p className="text-sm text-slate-500 font-medium">Gender Split</p>
//               <div className="flex justify-between items-end w-full mt-1">
//                 <div>
//                   <span className="text-sm text-slate-400">M: </span>
//                   <span className="font-bold text-slate-700">{aggregates.gender_summary?.total_male || 0}</span>
//                 </div>
//                 <div>
//                   <span className="text-sm text-slate-400">F: </span>
//                   <span className="font-bold text-slate-700">{aggregates.gender_summary?.total_female || 0}</span>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* --- NHMIS AGE/GENDER SUMMARY TABLE --- */}
//       {!isLoading && aggregates?.nhmis_summary && (
//         <div className="mb-6 rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
//           <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
//             <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">NHMIS Health Facility Monthly Summary</h3>
//           </div>
//           <div className="overflow-x-auto">
//             <table className="w-full text-left text-sm whitespace-nowrap">
//               <thead className="bg-slate-50 border-b border-slate-100">
//                 <tr>
//                   <th className="px-4 py-2 font-bold text-slate-600 text-[11px] uppercase w-32 border-r border-slate-100">Gender</th>
//                   <th className="px-4 py-2 font-bold text-slate-600 text-[11px] uppercase text-center">0-28 Days</th>
//                   <th className="px-4 py-2 font-bold text-slate-600 text-[11px] uppercase text-center">29d-11 Mths</th>
//                   <th className="px-4 py-2 font-bold text-slate-600 text-[11px] uppercase text-center">12-59 Mths</th>
//                   <th className="px-4 py-2 font-bold text-slate-600 text-[11px] uppercase text-center">5-9 Yrs</th>
//                   <th className="px-4 py-2 font-bold text-slate-600 text-[11px] uppercase text-center">10-19 Yrs</th>
//                   <th className="px-4 py-2 font-bold text-slate-600 text-[11px] uppercase text-center">≥20 Yrs</th>
//                   <th className="px-4 py-2 font-bold text-brand-primary text-[11px] uppercase text-center bg-brand-primary/5">Total</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-100">
//                 <tr>
//                   <td className="px-4 py-2 font-bold text-slate-700 border-r border-slate-100 bg-slate-50">Male</td>
//                   <td className="px-4 py-2 text-center text-slate-600">{aggregates.nhmis_summary.male['0_28_days']}</td>
//                   <td className="px-4 py-2 text-center text-slate-600">{aggregates.nhmis_summary.male['29d_11mths']}</td>
//                   <td className="px-4 py-2 text-center text-slate-600">{aggregates.nhmis_summary.male['12_59_mths']}</td>
//                   <td className="px-4 py-2 text-center text-slate-600">{aggregates.nhmis_summary.male['5_9_yrs']}</td>
//                   <td className="px-4 py-2 text-center text-slate-600">{aggregates.nhmis_summary.male['10_19_yrs']}</td>
//                   <td className="px-4 py-2 text-center text-slate-600">{aggregates.nhmis_summary.male['20_plus_yrs']}</td>
//                   <td className="px-4 py-2 text-center font-bold text-brand-primary bg-brand-primary/5">{aggregates.gender_summary.total_male}</td>
//                 </tr>
//                 <tr>
//                   <td className="px-4 py-2 font-bold text-slate-700 border-r border-slate-100 bg-slate-50">Female</td>
//                   <td className="px-4 py-2 text-center text-slate-600">{aggregates.nhmis_summary.female['0_28_days']}</td>
//                   <td className="px-4 py-2 text-center text-slate-600">{aggregates.nhmis_summary.female['29d_11mths']}</td>
//                   <td className="px-4 py-2 text-center text-slate-600">{aggregates.nhmis_summary.female['12_59_mths']}</td>
//                   <td className="px-4 py-2 text-center text-slate-600">{aggregates.nhmis_summary.female['5_9_yrs']}</td>
//                   <td className="px-4 py-2 text-center text-slate-600">{aggregates.nhmis_summary.female['10_19_yrs']}</td>
//                   <td className="px-4 py-2 text-center text-slate-600">{aggregates.nhmis_summary.female['20_plus_yrs']}</td>
//                   <td className="px-4 py-2 text-center font-bold text-brand-primary bg-brand-primary/5">{aggregates.gender_summary.total_female}</td>
//                 </tr>
//               </tbody>
//             </table>
//           </div>
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
//                   <th key={header.key} className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">
//                     {header.label}
//                   </th>
//                 ))}
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-slate-100">
//               {currentItems.length > 0 ? (
//                 currentItems.map((row) => (
//                   <tr key={row.encounter_id || row.mrn} className="hover:bg-slate-50/80 transition-colors">
//                     <td className="px-4 py-3.5 text-slate-700 font-medium">{renderValue(row.mrn)}</td>
//                     <td className="px-4 py-3.5 text-slate-700">{`${row.first_name || ''} ${row.middle_name ? row.middle_name + ' ' : ''}${row.last_name || ''}`.trim() || '—'}</td>
//                     <td className="px-4 py-3.5 text-slate-700">{renderValue(row.gender)}</td>
//                     <td className="px-4 py-3.5 text-slate-700">{row.age_years !== undefined && row.age_years !== null ? `${row.age_years} Yrs` : '—'}</td>
//                     <td className="px-4 py-3.5 text-slate-700">{row.started_at ? new Date(row.started_at).toLocaleString() : '—'}</td>
//                     <td className="px-4 py-3.5 text-slate-700 whitespace-normal min-w-[200px]">{renderValue(row.visit_reason)}</td>
//                     <td className="px-4 py-3.5 text-slate-700">{row.doctor_first_name || row.doctor_last_name ? `Dr. ${row.doctor_first_name || ''} ${row.doctor_last_name || ''}`.trim() : '—'}</td>
//                     <td className="px-4 py-3.5 text-slate-700">{renderValue(row.specialization_name)}</td>
//                     <td className="px-4 py-3.5 text-slate-700">{renderValue(row.payer_type_name)}</td>
//                     <td className="px-4 py-3.5">
//                       {row.encounter_status ? (
//                         <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-bold">{renderValue(row.encounter_status)}</span>
//                       ) : <span className="text-slate-400">—</span>}
//                     </td>
//                     <td className="px-4 py-3.5">
//                       <div className="flex flex-col gap-1 items-start">
//                         {row.invoice_status ? (
//                           <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
//                             row.invoice_status === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
//                             row.invoice_status === 'UNPAID' ? 'bg-amber-100 text-amber-700' :
//                             'bg-slate-100 text-slate-700'
//                           }`}>
//                             {renderValue(row.invoice_status)}
//                           </span>
//                         ) : <span className="text-slate-400">—</span>}
//                         {row.invoice_number && <span className="text-[10px] font-mono text-slate-500">{row.invoice_number}</span>}
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
//                     No outpatient records found for the selected filters.
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
//                 {[10, 25, 50, 100].map(val => (
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

// export default OutpatientReport;


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

// const OutpatientReport: React.FC = () => {
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
//     // Fetch dropdown data
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
//       const response = await apiClient.get(`/report/opd${query}`);
//       if (response.data && response.data.data && response.data.data.records) {
//         setData(response.data.data.records);
//       } else {
//         setData([]);
//       }
//     } catch (error) {
//       console.error("Failed to fetch outpatient report data:", error);
//       setData([]);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   useEffect(() => {
//     // Only fetch if not custom, or if custom and dates are set
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
//         renderValue(item.invoice_number).toLowerCase().includes(searchStr)
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
//     exportToCSV(filteredData, "outpatient_report");
//     setIsExportOpen(false);
//   };

//   const handleExportExcel = () => {
//     exportToExcel(filteredData, "outpatient_report");
//     setIsExportOpen(false);
//   };

//   const handleExportPDF = () => {
//     exportToPDF(filteredData, "outpatient_report", "Outpatient Report");
//     setIsExportOpen(false);
//   };

//   const displayHeaders = [
//     { key: "mrn", label: "MRN" },
//     { key: "patient_name", label: "Patient Name" },
//     { key: "gender", label: "Gender" },
//     { key: "started_at", label: "Encounter Date" },
//     { key: "visit_reason", label: "Reason" },
//     { key: "doctor", label: "Doctor" },
//     { key: "specialization_name", label: "Specialization" },
//     { key: "payer_type_name", label: "Payer" },
//     { key: "encounter_status", label: "Encounter" },
//     { key: "invoice_status", label: "Billing" },
//     { key: "net_amount", label: "Net Amount" },
//   ];

//   return (
//     <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 animate-in slide-in-from-bottom-4 duration-500 w-full overflow-hidden flex flex-col flex-1 h-full">
//       <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
//         <div>
//           <h2 className="text-xl font-bold text-slate-800">Outpatient Report (OPD)</h2>
//           <p className="text-sm text-slate-500">View and export outpatient encounters and metrics.</p>
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
//             placeholder="Search by name, MRN, invoice..."
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
//                   <tr key={row.encounter_id || row.mrn} className="hover:bg-slate-50/80 transition-colors">
//                     <td className="px-4 py-3.5 text-slate-700 font-medium">
//                       {renderValue(row.mrn)}
//                     </td>
//                     <td className="px-4 py-3.5 text-slate-700">
//                       {`${row.first_name || ''} ${row.middle_name ? row.middle_name + ' ' : ''}${row.last_name || ''}`.trim() || '—'}
//                     </td>
//                     <td className="px-4 py-3.5 text-slate-700">
//                       {renderValue(row.gender)}
//                     </td>
//                     <td className="px-4 py-3.5 text-slate-700">
//                       {row.started_at ? new Date(row.started_at).toLocaleString() : '—'}
//                     </td>
//                     <td className="px-4 py-3.5 text-slate-700 whitespace-normal min-w-[200px]">
//                       {renderValue(row.visit_reason)}
//                     </td>
//                     <td className="px-4 py-3.5 text-slate-700">
//                       {row.doctor_first_name || row.doctor_last_name ? `Dr. ${row.doctor_first_name || ''} ${row.doctor_last_name || ''}`.trim() : '—'}
//                     </td>
//                     <td className="px-4 py-3.5 text-slate-700">
//                       {renderValue(row.specialization_name)}
//                     </td>
//                     <td className="px-4 py-3.5 text-slate-700">
//                       {renderValue(row.payer_type_name)}
//                     </td>
//                     <td className="px-4 py-3.5">
//                       {row.encounter_status ? (
//                         <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-bold">
//                           {renderValue(row.encounter_status)}
//                         </span>
//                       ) : (
//                         <span className="text-slate-400">—</span>
//                       )}
//                     </td>
//                     <td className="px-4 py-3.5">
//                       <div className="flex flex-col gap-1 items-start">
//                         {row.invoice_status ? (
//                           <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
//                             row.invoice_status === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
//                             row.invoice_status === 'UNPAID' ? 'bg-amber-100 text-amber-700' :
//                             'bg-slate-100 text-slate-700'
//                           }`}>
//                             {renderValue(row.invoice_status)}
//                           </span>
//                         ) : (
//                           <span className="text-slate-400">—</span>
//                         )}
//                         {row.invoice_number && (
//                           <span className="text-[10px] font-mono text-slate-500">{row.invoice_number}</span>
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
//                     No outpatient records found for the selected filters.
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

// export default OutpatientReport;
