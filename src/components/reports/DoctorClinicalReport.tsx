import React, { useState, useEffect, useRef } from "react";
import { 
  Activity, FileText, FileSpreadsheet, File as FilePdf, Loader2,
  ChevronDown, Download, ChevronLeft, ChevronRight, 
  Stethoscope, FileType2, Pill, FlaskConical, FilterX, RefreshCw
} from "lucide-react";
import apiClient from "../../api/client";

const renderValue = (val: any) => {
  if (val === null || val === undefined || val === "") return "—";
  return String(val);
};

const DoctorClinicalReport: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [metadata, setMetadata] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  
  // --- CORE FILTERS ---
  const [reportCategory, setReportCategory] = useState("consultations");
  const [searchTerm, setSearchTerm] = useState("");
  const [timeframeFilter, setTimeframeFilter] = useState("this_month");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  
  // --- CLINICAL FILTERS ---
  const [doctorFilter, setDoctorFilter] = useState("");
  const [doctors, setDoctors] = useState<any[]>([]);

  // --- PAGINATION & EXPORT ---
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const docs = await apiClient.get('/doctors').catch(() => ({ data: { data: [] } }));
        if (docs.data?.data) setDoctors(docs.data.data);
      } catch (err) {
        console.error("Failed to fetch doctors", err);
      }
    };
    fetchDropdowns();
  }, []);

  const buildQueryParams = (format?: string) => {
    const params = new URLSearchParams();
    if (timeframeFilter && timeframeFilter !== "custom") params.append("timeframe", timeframeFilter);
    if (timeframeFilter === "custom" && dateFrom && dateTo) {
      params.append("timeframe", "custom");
      params.append("start_date", dateFrom);
      params.append("end_date", dateTo);
    }
    if (doctorFilter) params.append("doctor_id", doctorFilter);
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
      
      let endpoint = '';
      if (reportCategory === 'consultations') endpoint = '/report/doctor/consultations';
      if (reportCategory === 'diagnoses') endpoint = '/report/doctor/diagnoses';
      if (reportCategory === 'prescriptions') endpoint = '/report/doctor/prescriptions';
      if (reportCategory === 'orders') endpoint = '/report/doctor/orders';

      const response = await apiClient.get(`${endpoint}?${query}`);
      
      if (response.data && response.data.data) {
        setData(response.data.data.records || []);
        setMetadata(response.data.data.metadata || null);
      } else {
        setData([]);
        setMetadata(null);
      }
    } catch (error) {
      console.error("Failed to fetch doctor report data:", error);
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
  }, [reportCategory, timeframeFilter, dateFrom, dateTo, doctorFilter, currentPage, itemsPerPage]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsExportOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleServerExport = async (format: string, fileExtension: string) => {
    try {
      setIsExporting(true);
      const query = buildQueryParams(format);
      
      let endpoint = '';
      if (reportCategory === 'consultations') endpoint = '/report/doctor/consultations';
      if (reportCategory === 'diagnoses') endpoint = '/report/doctor/diagnoses';
      if (reportCategory === 'prescriptions') endpoint = '/report/doctor/prescriptions';
      if (reportCategory === 'orders') endpoint = '/report/doctor/orders';

      const response = await apiClient.get(`${endpoint}?${query}`, { responseType: 'blob' });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `doctor_clinical_${reportCategory}_${new Date().toISOString().split('T')[0]}.${fileExtension}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      setIsExportOpen(false);
    } catch (error) {
      console.error(`Failed to export:`, error);
    } finally {
      setIsExporting(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setTimeframeFilter("this_month");
    setDateFrom("");
    setDateTo("");
    setDoctorFilter("");
    setCurrentPage(1);
  };

  const aggregates = metadata?.aggregates;

  const getHeaders = () => {
    switch (reportCategory) {
      case 'consultations': return [
        { key: "doctor_name", label: "Attending Doctor" },
        { key: "encounter_type", label: "Encounter Type" },
        { key: "encounter_status", label: "Status" },
        { key: "volume", label: "Total Cases", align: "center" },
        { key: "avg_duration_mins", label: "Avg TAT (Mins)", align: "center" },
      ];
      case 'diagnoses': return [
        { key: "icd10_code", label: "ICD-10 Code" },
        { key: "diagnosis_description", label: "Diagnosis Name" },
        { key: "diagnosis_type", label: "Type" },
        { key: "frequency", label: "Frequency", align: "center" },
      ];
      case 'prescriptions': return [
        { key: "prescribed_by_doctor", label: "Doctor" },
        { key: "drug_name", label: "Medication" },
        { key: "route", label: "Route" },
        { key: "times_prescribed", label: "Times Prescribed", align: "center" },
        { key: "total_quantity_prescribed", label: "Total Units Billed", align: "center" },
      ];
      case 'orders': return [
        { key: "ordered_by_doctor", label: "Doctor" },
        { key: "order_type", label: "Order Department" },
        { key: "service_name", label: "Service / Test Name" },
        { key: "order_status", label: "Fulfillment Status" },
        { key: "times_ordered", label: "Times Ordered", align: "center" },
      ];
      default: return [];
    }
  };

  const displayHeaders = getHeaders();

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 animate-in slide-in-from-bottom-4 duration-500 w-full overflow-hidden flex flex-col flex-1 h-full">
      
      {/* HEADER & ACTIONS */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Doctor Clinical Analytics</h2>
          <p className="text-sm text-slate-500">Analyze diagnosis trends, prescription habits, and consultation times.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button onClick={clearFilters} disabled={isLoading || isExporting} className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50 rounded-xl text-sm font-bold transition-colors">
            <FilterX size={18} /> <span className="hidden sm:inline">Clear</span>
          </button>
          
          <button onClick={fetchReportData} disabled={isLoading || isExporting} className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50 rounded-xl text-sm font-bold transition-colors">
            <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} /> <span className="hidden sm:inline">Refresh</span>
          </button>

          <div className="relative" ref={dropdownRef}>
            <button onClick={() => setIsExportOpen(!isExportOpen)} disabled={isLoading || isExporting || data.length === 0} className="flex items-center gap-2 px-5 py-2.5 bg-brand-primary text-white hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-bold transition-all shadow-md shadow-brand-primary/20">
              {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />} Export
              <ChevronDown size={16} className={`transition-transform duration-200 ${isExportOpen ? "rotate-180" : ""}`} />
            </button>
            {isExportOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 py-2 animate-in fade-in zoom-in-95 duration-200">
                <button onClick={() => handleServerExport('csv', 'csv')} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"><div className="p-1.5 bg-slate-50 text-slate-600 rounded-lg"><FileText size={16} /></div> Export CSV</button>
                <button onClick={() => handleServerExport('excel', 'xlsx')} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"><div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg"><FileSpreadsheet size={16} /></div> Export Excel</button>
                <button onClick={() => handleServerExport('pdf', 'pdf')} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"><div className="p-1.5 bg-red-50 text-red-600 rounded-lg"><FilePdf size={16} /></div> Export PDF</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FILTER GRID */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Main Sub-report Switcher */}
          <div className="relative">
             <Activity className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-primary" size={16} />
             <select value={reportCategory} onChange={(e) => { setReportCategory(e.target.value); setCurrentPage(1); }} disabled={isLoading} className="w-full pl-9 pr-4 py-2 bg-brand-primary/5 border border-brand-primary/20 text-brand-primary font-bold rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30">
               <option value="consultations">Consultation Volumes</option>
               <option value="diagnoses">Clinical Diagnostic Trends</option>
               <option value="prescriptions">Prescription Habits</option>
               <option value="orders">Diagnostic Order Analytics</option>
             </select>
          </div>

          <div className="relative">
            <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select value={doctorFilter} onChange={(e) => { setDoctorFilter(e.target.value); setCurrentPage(1); }} disabled={isLoading} className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20">
              <option value="">All Doctors</option>
              {doctors.map(d => (
                <option key={d.doctor_id} value={d.doctor_id}>Dr. {d.first_name} {d.last_name}</option>
              ))}
            </select>
          </div>

          <div>
            <select value={timeframeFilter} onChange={(e) => { setTimeframeFilter(e.target.value); setCurrentPage(1); }} disabled={isLoading} className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20">
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="this_year">This Year (YTD)</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {timeframeFilter === "custom" && (
            <div className="flex gap-2">
              <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }} disabled={isLoading} className="w-full px-2 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary/20" />
              <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }} disabled={isLoading} min={dateFrom} className="w-full px-2 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary/20" />
            </div>
          )}
        </div>
      </div>

      {/* --- CLINICAL DASHBOARD CARDS --- */}
      {!isLoading && aggregates && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in duration-500">
          
          {reportCategory === 'consultations' && (
            <>
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Stethoscope size={24} /></div>
                <div><p className="text-sm text-slate-500 font-medium">Total Consultations</p><h3 className="text-2xl font-bold text-slate-800">{aggregates.total_consultations || 0}</h3></div>
              </div>
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-emerald-100 text-emerald-700 rounded-lg"><FileType2 size={24} /></div>
                <div><p className="text-sm text-emerald-700 font-medium">Unique Patients Seen</p><h3 className="text-2xl font-bold text-emerald-800">{aggregates.unique_patients_seen || 0}</h3></div>
              </div>
            </>
          )}

          {reportCategory === 'diagnoses' && (
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><FileType2 size={24} /></div>
              <div><p className="text-sm text-slate-500 font-medium">Total Diagnoses Logged</p><h3 className="text-2xl font-bold text-slate-800">{aggregates.total_diagnoses_logged || 0}</h3></div>
            </div>
          )}

          {reportCategory === 'prescriptions' && (
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><Pill size={24} /></div>
              <div><p className="text-sm text-slate-500 font-medium">Total Prescriptions Written</p><h3 className="text-2xl font-bold text-slate-800">{aggregates.total_prescriptions_written || 0}</h3></div>
            </div>
          )}

          {reportCategory === 'orders' && (
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-lg"><FlaskConical size={24} /></div>
              <div><p className="text-sm text-slate-500 font-medium">Total Clinical Orders Sent</p><h3 className="text-2xl font-bold text-slate-800">{aggregates.total_clinical_orders || 0}</h3></div>
            </div>
          )}
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
                  <th key={header.key} className={`px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px] ${header.align === 'center' ? 'text-center' : 'text-left'}`}>
                    {header.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.length > 0 ? (
                data.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    {displayHeaders.map(header => (
                      <td key={header.key} className={`px-4 py-3.5 text-slate-700 ${header.align === 'center' ? 'text-center' : 'text-left'}`}>
                        {header.key === 'encounter_status' || header.key === 'order_status' ? (
                          <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                            ['COMPLETED', 'CLOSED'].includes(row[header.key]) ? 'bg-emerald-100 text-emerald-700' :
                            ['IN_PROGRESS', 'PAID', 'PARTIALLY_PAID'].includes(row[header.key]) ? 'bg-blue-100 text-blue-700' :
                            ['CANCELLED'].includes(row[header.key]) ? 'bg-red-100 text-red-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {renderValue(row[header.key])}
                          </span>
                        ) : (
                          renderValue(row[header.key])
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={displayHeaders.length} className="px-4 py-12 text-center text-slate-400 italic">
                    No clinical records found for the selected filters.
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
            <span className="text-slate-900 font-bold text-xs uppercase mr-2 tracking-wider">Page {currentPage}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 mr-4">
              <span className="text-xs text-slate-400 font-bold uppercase mr-2">Show</span>
              <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="bg-white border border-slate-200 rounded-lg text-xs font-bold px-2 py-1 outline-none focus:ring-2 focus:ring-brand-primary/20">
                {[25, 50, 100, 250].map(val => (<option key={val} value={val}>{val}</option>))}
              </select>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors shadow-sm"><ChevronLeft size={16} /></button>
              <button onClick={() => setCurrentPage(prev => prev + 1)} disabled={data.length < itemsPerPage} className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors shadow-sm"><ChevronRight size={16} /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorClinicalReport;