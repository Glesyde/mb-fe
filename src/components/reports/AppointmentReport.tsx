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
  CalendarCheck,
  Clock,
  UserPlus,
  Users,
  Wallet,
  Building2,
  Activity,
  FilterX,
  RefreshCw,
  TrendingUp,
  Stethoscope
} from "lucide-react";
import { exportToCSV, exportToExcel, exportToPDF } from "../../utils/exportUtils";
import apiClient from "../../api/client";

// --- Types ---
interface KPIReport {
  total_appointments: number;
  total_unique_patients: number;
  new_patients_count: number;
  old_patients_count: number;
  new_patient_appointments: number | string;
  old_patient_appointments: number | string;
  pvt_cash_appointments: number | string;
  hmo_appointments: number | string;
  pvt_cash_unique_patients: number;
  hmo_unique_patients: number;
  completed_visits: number | string;
  cancelled_visits: number | string;
  no_shows: number | string;
  active_pending_visits: number | string;
  walk_in_count: number | string;
  pre_booked_count: number | string;
  follow_up_count: number | string;
  new_patient_percentage: number;
  old_patient_percentage: number;
  pvt_cash_percentage: number;
  hmo_percentage: number;
  hmo_vs_pvt_ratio: string;
}

interface UserProductivityAudit {
  user_id: number;
  staff_name: string;
  staff_id: string;
  department: string;
  total_patients_registered: number;
  total_appointments_booked: number;
  walk_in_booked: number | string;
  pre_booked: number | string;
  follow_up_booked: number | string;
  completed_appointments: number | string;
  cancelled_appointments: number | string;
}

interface PayerDistribution {
  payer_name: string;
  payer_category: string;
  appointment_count: number;
  unique_patients: number;
}

interface DoctorUtilization {
  doctor_name: string;
  specialization: string;
  total_appointments: number;
  completed: string | number;
  cancelled: string | number;
}

interface SpecialtyDemand {
  specialization: string;
  total_volume: number;
}

const renderValue = (val: any) => {
  if (val === null || val === undefined || val === "") return "—";
  return String(val);
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  switch (status?.toUpperCase()) {
    case "SCHEDULED":
      return <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200">Scheduled</span>;
    case "CONFIRMED":
      return <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200">Confirmed</span>;
    case "CHECKED_IN":
      return <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">Checked In</span>;
    case "COMPLETED":
      return <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Completed</span>;
    case "CANCELLED":
      return <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-200">Cancelled</span>;
    case "BILLING_CLEARANCE":
      return <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200">Billing Clearance</span>;
    case "NO_SHOW":
      return <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-slate-100 text-slate-600 border border-slate-300">No Show</span>;
    default:
      return <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-slate-100 text-slate-600 border border-slate-200">{status || "—"}</span>;
  }
};

const BookingTypeBadge: React.FC<{ type: string }> = ({ type }) => {
  if (type === "PRE_BOOKED") {
    return <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-sky-50 text-sky-700 border border-sky-200">Pre-booked</span>;
  } else if (type === "WALK_IN") {
    return <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-purple-50 text-purple-700 border border-purple-200">Walk-in</span>;
  } else if (type === "FOLLOW_UP") {
    return <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-amber-50 text-amber-700 border border-amber-200">Follow-up</span>;
  }
  return <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-slate-100 text-slate-600 border border-slate-200">{type}</span>;
};

const AppointmentReport: React.FC = () => {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<"dashboard" | "ledger" | "staff">("dashboard");

  // Core Data State
  const [ledgerData, setLedgerData] = useState<any[]>([]);
  const [kpis, setKpis] = useState<KPIReport | null>(null);
  const [userAudit, setUserAudit] = useState<UserProductivityAudit[]>([]);
  const [payerDistribution, setPayerDistribution] = useState<PayerDistribution[]>([]);
  const [doctorUtilization, setDoctorUtilization] = useState<DoctorUtilization[]>([]);
  const [specialtyDemand, setSpecialtyDemand] = useState<SpecialtyDemand[]>([]);
  const [pagination, setPagination] = useState({ current_page: 1, per_page: 25, total_rows: 0 });

  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [mrnFilter, setMrnFilter] = useState("");
  const [debouncedMrn, setDebouncedMrn] = useState("");
  const [timeframeFilter, setTimeframeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [bookingTypeFilter, setBookingTypeFilter] = useState("All");
  const [doctorFilter, setDoctorFilter] = useState("All");
  const [specializationFilter, setSpecializationFilter] = useState("All");
  const [payerFilter, setPayerFilter] = useState("");
  const [payerTypeFilter, setPayerTypeFilter] = useState("All");
  const [patientCategoryFilter, setPatientCategoryFilter] = useState("All");
  const [bookedByFilter, setBookedByFilter] = useState("All");

  // Dropdown options
  const [doctors, setDoctors] = useState<any[]>([]);
  const [payers, setPayers] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [specializations, setSpecializations] = useState<{ id: number; name: string }[]>([]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Export Dropdown
  const [isExportOpen, setIsExportOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 450);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedMrn(mrnFilter), 450);
    return () => clearTimeout(timer);
  }, [mrnFilter]);

  // Load Dropdowns Once on Mount
  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [specsRes, docsRes, paysRes, staffRes] = await Promise.all([
          apiClient.get("/doctors-specializations"),
          apiClient.get("/report/appointment/doctors"),
          apiClient.get("/report/appointment/payers"),
          apiClient.get("/report/appointment/staff")
        ]);
        
        if (specsRes.data?.data) setSpecializations(specsRes.data.data);
        if (docsRes.data?.data) setDoctors(docsRes.data.data);
        if (paysRes.data?.data) setPayers(paysRes.data.data);
        if (staffRes.data?.data) setStaffList(staffRes.data.data);
      } catch (error) {
        console.error("Failed to load initial dropdowns:", error);
      }
    };
    fetchDropdowns();
  }, []);

  // Fetch Report Data
  const fetchReportData = async () => {
    try {
      setIsLoading(true);

      const params: any = {
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage
      };

      if (debouncedSearch) params.search = debouncedSearch;
      if (debouncedMrn) params.mrn = debouncedMrn;

      if (timeframeFilter === "custom") {
        params.timeframe = "custom";
        if (dateFrom) params.start_date = dateFrom;
        if (dateTo) params.end_date = dateTo;
      } else {
        params.timeframe = timeframeFilter;
      }

      if (statusFilter !== "All") params.status = statusFilter;
      if (bookingTypeFilter !== "All") params.booking_type = bookingTypeFilter;
      if (doctorFilter !== "All") params.doctor_id = doctorFilter;
      if (specializationFilter !== "All") params.specialization_id = specializationFilter;
      if (payerFilter && payerFilter !== "All") params.payer_id = payerFilter;
      if (payerTypeFilter !== "All") params.payer_type = payerTypeFilter;
      if (patientCategoryFilter !== "All") params.patient_category = patientCategoryFilter;
      if (bookedByFilter !== "All") params.booked_by_id = bookedByFilter;

      const [dashboardRes, ledgerRes] = await Promise.allSettled([
        apiClient.get("/report/appointment", { params }),
        apiClient.get("/report/appointment/ledger", { params })
      ]);

      // 1. Process Executive Dashboard
      if (dashboardRes.status === "fulfilled" && dashboardRes.value?.data?.data) {
        const d = dashboardRes.value.data.data;
        const reports = d.reports || d;

        setKpis(reports.kpis || null);
        setUserAudit(reports.user_productivity_audit || []);
        setPayerDistribution(reports.payer_distribution || []);
        setDoctorUtilization(reports.doctor_utilization || []);
        setSpecialtyDemand(reports.specialty_demand || []);

        if (reports.kpis?.total_appointments) {
          setPagination(prev => ({ ...prev, total_rows: Number(reports.kpis.total_appointments) }));
        }

        if (reports.records || d.records) {
          setLedgerData(reports.records || d.records);
        }
      }

      // 2. Process Dedicated Master Ledger Records
      if (ledgerRes.status === "fulfilled" && ledgerRes.value?.data?.data) {
        const l = ledgerRes.value.data.data;
        const records = l.records || l.details || [];
        if (records.length > 0) {
          setLedgerData(records);
        }
      }
    } catch (error) {
      console.error("Failed to load appointment reports:", error);
      setLedgerData([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [
    currentPage,
    itemsPerPage,
    debouncedSearch,
    debouncedMrn,
    timeframeFilter,
    dateFrom,
    dateTo,
    statusFilter,
    bookingTypeFilter,
    doctorFilter,
    specializationFilter,
    payerFilter,
    payerTypeFilter,
    patientCategoryFilter,
    bookedByFilter
  ]);

  const handleFilterChange = (setter: any, value: any) => {
    setter(value);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setMrnFilter("");
    setTimeframeFilter("all");
    setDateFrom("");
    setDateTo("");
    setStatusFilter("All");
    setBookingTypeFilter("All");
    setDoctorFilter("All");
    setSpecializationFilter("All");
    setPayerFilter("");
    setPayerTypeFilter("All");
    setPatientCategoryFilter("All");
    setBookedByFilter("All");
    setCurrentPage(1);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsExportOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const totalPages = Math.ceil(pagination.total_rows / itemsPerPage) || 1;

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleExportCSV = () => {
    exportToCSV(ledgerData.length > 0 ? ledgerData : userAudit, "appointment_management_report");
    setIsExportOpen(false);
  };

  const handleExportExcel = () => {
    exportToExcel(ledgerData.length > 0 ? ledgerData : userAudit, "appointment_management_report");
    setIsExportOpen(false);
  };

  const handleExportPDF = () => {
    exportToPDF(ledgerData.length > 0 ? ledgerData : userAudit, "appointment_management_report", "Appointment Management Report");
    setIsExportOpen(false);
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 w-full overflow-hidden flex flex-col space-y-6">
      
      {/* ----------------- Top Header & Actions ----------------- */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-2xl">
              <CalendarCheck size={26} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">Appointment & Registration Intelligence</h2>
              <p className="text-xs font-semibold text-slate-500">
                Audited Patient Flow, Staff Productivity & HMO vs Private Cash Distribution
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {/* Navigation Tabs */}
          <div className="bg-slate-100 p-1 rounded-2xl flex items-center text-xs font-bold text-slate-600">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`px-3.5 py-1.5 rounded-xl transition-all ${
                activeTab === "dashboard" ? "bg-white text-indigo-700 shadow-sm" : "hover:text-slate-900"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("staff")}
              className={`px-3.5 py-1.5 rounded-xl transition-all ${
                activeTab === "staff" ? "bg-white text-indigo-700 shadow-sm" : "hover:text-slate-900"
              }`}
            >
              Staff Audit
            </button>
            <button
              onClick={() => setActiveTab("ledger")}
              className={`px-3.5 py-1.5 rounded-xl transition-all ${
                activeTab === "ledger" ? "bg-white text-indigo-700 shadow-sm" : "hover:text-slate-900"
              }`}
            >
              Master Ledger
            </button>
          </div>

          <button
            onClick={handleClearFilters}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50 rounded-xl text-xs font-bold transition-all"
            title="Reset All Filters"
          >
            <FilterX size={16} />
            <span className="hidden sm:inline">Reset</span>
          </button>

          <button
            onClick={fetchReportData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50 rounded-xl text-xs font-bold transition-all"
            title="Refresh Intelligence Data"
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin text-indigo-600" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsExportOpen(!isExportOpen)}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 rounded-xl text-xs font-black shadow-md shadow-indigo-600/20 transition-all"
            >
              <Download size={16} />
              Export
              <ChevronDown size={14} className={`transition-transform duration-200 ${isExportOpen ? "rotate-180" : ""}`} />
            </button>

            {isExportOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 py-2 animate-in fade-in zoom-in-95 duration-150">
                <button
                  onClick={handleExportExcel}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <FileSpreadsheet size={16} className="text-emerald-600" />
                  Export Excel (.xlsx)
                </button>
                <button
                  onClick={handleExportCSV}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <FileText size={16} className="text-blue-600" />
                  Export CSV (.csv)
                </button>
                <button
                  onClick={handleExportPDF}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <FilePdf size={16} className="text-rose-600" />
                  Export PDF (.pdf)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ----------------- Top Executive KPI Cards ----------------- */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
          <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex flex-col justify-between">
            <div className="flex items-center justify-between text-indigo-700 mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider">Total Appts</span>
              <CalendarCheck size={18} />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900">{kpis.total_appointments || 0}</div>
              <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
                {kpis.completed_visits || 0} completed • {kpis.cancelled_visits || 0} cancelled
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-100 flex flex-col justify-between">
            <div className="flex items-center justify-between text-sky-700 mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider">Unique Patients</span>
              <Users size={18} />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900">{kpis.total_unique_patients || 0}</div>
              <div className="text-[11px] font-semibold text-slate-500 mt-0.5">Active clinical heads</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-700 mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider">New vs Old</span>
              <UserPlus size={18} />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900">
                {kpis.new_patients_count || 0}{" "}
                <span className="text-xs font-bold text-slate-400">/ {kpis.old_patients_count || 0}</span>
              </div>
              <div className="text-[11px] font-semibold text-emerald-700 mt-0.5">
                {kpis.new_patient_percentage || 0}% New Patients
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-violet-50/60 border border-violet-100 flex flex-col justify-between">
            <div className="flex items-center justify-between text-violet-700 mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider">HMO vs PVT Ratio</span>
              <TrendingUp size={18} />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900">{kpis.hmo_vs_pvt_ratio || "0 : 1"}</div>
              <div className="text-[11px] font-semibold text-violet-700 mt-0.5">
                {kpis.hmo_appointments || 0} HMO vs {kpis.pvt_cash_appointments || 0} Cash
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100 flex flex-col justify-between">
            <div className="flex items-center justify-between text-amber-700 mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider">Private Cash</span>
              <Wallet size={18} />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900">{kpis.pvt_cash_appointments || 0}</div>
              <div className="text-[11px] font-semibold text-amber-700 mt-0.5">
                {kpis.pvt_cash_percentage || 0}% Total Revenue Share
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-100 flex flex-col justify-between">
            <div className="flex items-center justify-between text-rose-700 mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider">Pre-Booked vs Walk-in</span>
              <Clock size={18} />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900">
                {kpis.pre_booked_count || 0}{" "}
                <span className="text-xs font-bold text-slate-400">/ {kpis.walk_in_count || 0}</span>
              </div>
              <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
                {kpis.active_pending_visits || 0} active / pending
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- Filter Bar ----------------- */}
      <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search patient, phone, code..."
            value={searchTerm}
            onChange={e => handleFilterChange(setSearchTerm, e.target.value)}
            disabled={isLoading}
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none"
          />
        </div>

        {/* MRN Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Filter by MRN..."
            value={mrnFilter}
            onChange={e => handleFilterChange(setMrnFilter, e.target.value)}
            disabled={isLoading}
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none"
          />
        </div>

        {/* Timeframe Resolver */}
        <div>
          <select
            value={timeframeFilter}
            onChange={e => handleFilterChange(setTimeframeFilter, e.target.value)}
            disabled={isLoading}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600/20"
          >
            <option value="all">All Time Intervals</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="this_week">This Week</option>
            <option value="last_week">Last Week</option>
            <option value="last_7_days">Last 7 Days</option>
            <option value="last_30_days">Last 30 Days</option>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="last_3_months">Last 3 Months</option>
            <option value="this_year">This Year</option>
            <option value="custom">Custom Date Range</option>
          </select>
        </div>

        {/* Custom Date Pickers */}
        {timeframeFilter === "custom" && (
          <>
            <div>
              <input
                type="date"
                value={dateFrom}
                onChange={e => handleFilterChange(setDateFrom, e.target.value)}
                disabled={isLoading}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none"
              />
            </div>
            <div>
              <input
                type="date"
                value={dateTo}
                onChange={e => handleFilterChange(setDateTo, e.target.value)}
                disabled={isLoading}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none"
              />
            </div>
          </>
        )}

        {/* Staff Booker Filter */}
        <div>
          <select
            value={bookedByFilter}
            onChange={e => handleFilterChange(setBookedByFilter, e.target.value)}
            disabled={isLoading}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600/20"
          >
            <option value="All">All Staff / Bookers</option>
            {staffList.map(s => (
              <option key={s.user_id} value={s.user_id}>
                {s.staff_name} ({s.staff_id || "Staff"})
              </option>
            ))}
          </select>
        </div>

        {/* Patient Category Filter */}
        <div>
          <select
            value={patientCategoryFilter}
            onChange={e => handleFilterChange(setPatientCategoryFilter, e.target.value)}
            disabled={isLoading}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600/20"
          >
            <option value="All">All Patient Categories</option>
            <option value="NEW">New Patients (Registered in Period)</option>
            <option value="OLD">Old / Returning Patients</option>
          </select>
        </div>

        {/* Payer Group Filter */}
        <div>
          <select
            value={payerTypeFilter}
            onChange={e => handleFilterChange(setPayerTypeFilter, e.target.value)}
            disabled={isLoading}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600/20"
          >
            <option value="All">All Payer Groups (HMO & PVT)</option>
            <option value="PVT">Private Cash Only</option>
            <option value="HMO">HMO Covered Only</option>
          </select>
        </div>

        {/* Specific Payer */}
        <div>
          <select
            value={payerFilter}
            onChange={e => handleFilterChange(setPayerFilter, e.target.value)}
            disabled={isLoading}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none"
          >
            <option value="">All Specific Payers</option>
            {payers.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Doctor Filter */}
        <div>
          <select
            value={doctorFilter}
            onChange={e => handleFilterChange(setDoctorFilter, e.target.value)}
            disabled={isLoading}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none"
          >
            <option value="All">All Attending Doctors</option>
            {doctors.map(doc => (
              <option key={doc.doctor_id || doc.id} value={doc.doctor_id || doc.id}>
                Dr. {doc.first_name} {doc.last_name}
              </option>
            ))}
          </select>
        </div>

        {/* Specialization Filter */}
        <div>
          <select
            value={specializationFilter}
            onChange={e => handleFilterChange(setSpecializationFilter, e.target.value)}
            disabled={isLoading}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none"
          >
            <option value="All">All Specializations</option>
            {specializations.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={statusFilter}
            onChange={e => handleFilterChange(setStatusFilter, e.target.value)}
            disabled={isLoading}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="CHECKED_IN">Checked In</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="NO_SHOW">No Show</option>
            <option value="BILLING_CLEARANCE">Billing Clearance</option>
          </select>
        </div>

        {/* Booking Type Filter */}
        <div>
          <select
            value={bookingTypeFilter}
            onChange={e => handleFilterChange(setBookingTypeFilter, e.target.value)}
            disabled={isLoading}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none"
          >
            <option value="All">All Booking Types</option>
            <option value="PRE_BOOKED">Pre-booked</option>
            <option value="WALK_IN">Walk-in</option>
            <option value="FOLLOW_UP">Follow-up</option>
          </select>
        </div>
      </div>

      {/* ----------------- TAB 1: EXECUTIVE DASHBOARD ----------------- */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          {/* Ratio Comparison Bars */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* New vs Returning Patients Bar */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <UserPlus size={16} className="text-emerald-600" /> Patient Acquisition Share
                </span>
                <span className="text-xs font-extrabold text-slate-500">
                  {kpis?.new_patient_percentage || 0}% New • {kpis?.old_patient_percentage || 0}% Returning
                </span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full transition-all duration-500"
                  style={{ width: `${kpis?.new_patient_percentage || 0}%` }}
                  title={`New Patients: ${kpis?.new_patients_count || 0}`}
                />
                <div
                  className="bg-sky-500 h-full transition-all duration-500"
                  style={{ width: `${kpis?.old_patient_percentage || 0}%` }}
                  title={`Returning Patients: ${kpis?.old_patients_count || 0}`}
                />
              </div>
              <div className="flex justify-between text-[11px] font-semibold text-slate-500 mt-2">
                <span>New: {kpis?.new_patients_count || 0}</span>
                <span>Returning: {kpis?.old_patients_count || 0}</span>
              </div>
            </div>

            {/* HMO vs Private Cash Bar */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Wallet size={16} className="text-violet-600" /> HMO vs Private Cash Ratio
                </span>
                <span className="text-xs font-extrabold text-slate-500">
                  {kpis?.pvt_cash_percentage || 0}% Cash • {kpis?.hmo_percentage || 0}% HMO
                </span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
                <div
                  className="bg-amber-500 h-full transition-all duration-500"
                  style={{ width: `${kpis?.pvt_cash_percentage || 0}%` }}
                  title={`Private Cash: ${kpis?.pvt_cash_appointments || 0}`}
                />
                <div
                  className="bg-violet-500 h-full transition-all duration-500"
                  style={{ width: `${kpis?.hmo_percentage || 0}%` }}
                  title={`HMO Covered: ${kpis?.hmo_appointments || 0}`}
                />
              </div>
              <div className="flex justify-between text-[11px] font-semibold text-slate-500 mt-2">
                <span>Cash Appts: {kpis?.pvt_cash_appointments || 0}</span>
                <span>HMO Appts: {kpis?.hmo_appointments || 0}</span>
              </div>
            </div>
          </div>

          {/* Breakdown Grids */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Payer Breakdown */}
            <div className="rounded-2xl border border-slate-200 p-4 bg-white flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                  <Building2 size={18} className="text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-800">Top Payers Distribution</h3>
                </div>
                <div className="space-y-2.5">
                  {payerDistribution.length > 0 ? (
                    payerDistribution.map((p, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs">
                        <div>
                          <div className="font-bold text-slate-800">{p.payer_name}</div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase">{p.payer_category}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-black text-slate-900">{p.appointment_count} appts</div>
                          <div className="text-[10px] text-slate-500">{p.unique_patients} patients</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-400 italic py-4 text-center">No payer records found</div>
                  )}
                </div>
              </div>
            </div>

            {/* Doctor Utilization */}
            <div className="rounded-2xl border border-slate-200 p-4 bg-white flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                  <Stethoscope size={18} className="text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-800">Physician Workload</h3>
                </div>
                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {doctorUtilization.length > 0 ? (
                    doctorUtilization.slice(0, 6).map((doc, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs">
                        <div>
                          <div className="font-bold text-slate-800">{doc.doctor_name}</div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{doc.specialization}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-black text-slate-900">{doc.total_appointments} visits</div>
                          <div className="text-[10px] text-rose-600 font-semibold">{doc.cancelled} cancelled</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-400 italic py-4 text-center">No physician records</div>
                  )}
                </div>
              </div>
            </div>

            {/* Specialty Demand */}
            <div className="rounded-2xl border border-slate-200 p-4 bg-white flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                  <Activity size={18} className="text-sky-600" />
                  <h3 className="text-sm font-bold text-slate-800">Specialty Volume Demand</h3>
                </div>
                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {specialtyDemand.length > 0 ? (
                    specialtyDemand.slice(0, 6).map((spec, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs">
                        <div className="font-bold text-slate-800 truncate max-w-[180px]">{spec.specialization}</div>
                        <div className="font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                          {spec.total_volume}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-400 italic py-4 text-center">No specialty data</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- TAB 2: STAFF WORKLOAD & PRODUCTIVITY AUDIT ----------------- */}
      {activeTab === "staff" && (
        <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-xs">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                Staff Workload & Registration Audit
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Tracking appointments and registrations performed by individual staff members
              </p>
            </div>
            <span className="px-3 py-1 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700">
              {userAudit.length} Active Staff Found
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-50/80 border-b border-slate-200 font-black text-slate-600 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Staff Name</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3 text-center">Patients Registered</th>
                  <th className="px-4 py-3 text-center">Total Appointments</th>
                  <th className="px-4 py-3 text-center">Pre-Booked</th>
                  <th className="px-4 py-3 text-center">Walk-In</th>
                  <th className="px-4 py-3 text-center">Completed Visits</th>
                  <th className="px-4 py-3 text-center">Cancelled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {userAudit.length > 0 ? (
                  userAudit.map((u, i) => (
                    <tr key={u.user_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 text-slate-400 font-bold">{i + 1}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {u.staff_name}
                        <div className="text-[10px] text-slate-400 font-normal">ID: {u.staff_id || "N/A"}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{u.department}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-black rounded-lg border border-emerald-100">
                          {u.total_patients_registered}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-black rounded-lg border border-indigo-100">
                          {u.total_appointments_booked}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-slate-800">{u.pre_booked}</td>
                      <td className="px-4 py-3 text-center font-bold text-slate-800">{u.walk_in_booked}</td>
                      <td className="px-4 py-3 text-center font-bold text-emerald-600">{u.completed_appointments}</td>
                      <td className="px-4 py-3 text-center font-bold text-rose-600">{u.cancelled_appointments}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-400 italic">
                      No staff booking audit metrics available for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ----------------- TAB 3: MASTER APPOINTMENT LEDGER ----------------- */}
      {activeTab === "ledger" && (
        <div className="rounded-2xl border border-slate-200 flex-1 min-h-[400px] relative overflow-hidden flex flex-col bg-white shadow-xs">
          {isLoading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70 backdrop-blur-xs">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          )}

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 font-black text-slate-600 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Appt. Code</th>
                  <th className="px-4 py-3">Patient Details</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Date & Time</th>
                  <th className="px-4 py-3">Attending Doctor</th>
                  <th className="px-4 py-3">Payer & Policy</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Booked By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {ledgerData.length > 0 ? (
                  ledgerData.map((row, index) => (
                    <tr key={row.appointment_id || index} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 text-slate-400 font-semibold">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>
                      <td className="px-4 py-3 text-slate-800 font-mono font-bold">
                        {renderValue(row.appointment_code)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{renderValue(row.patient_name)}</div>
                        <div className="text-[11px] text-slate-500 flex gap-1.5 items-center">
                          <span className="font-mono">{renderValue(row.mrn)}</span>
                          <span>•</span>
                          <span>{renderValue(row.age_years || row.age)} yrs</span>
                          <span>•</span>
                          <span>{renderValue(row.gender)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {row.patient_category === "NEW" ? (
                          <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                            NEW
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-sky-50 text-sky-700 border border-sky-200">
                            RETURNING
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-800">{renderValue(row.appointment_date)}</div>
                        <div className="text-[11px] text-slate-500">{renderValue(row.appointment_time)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{renderValue(row.doctor_name)}</div>
                        <div className="text-[11px] text-slate-500">{renderValue(row.specialization_name)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                          {renderValue(row.payer_name)}
                          {row.payer_category === "HMO" ? (
                            <span className="px-1.5 py-0.2 bg-violet-100 text-violet-700 font-black text-[9px] rounded">HMO</span>
                          ) : (
                            <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 font-black text-[9px] rounded">CASH</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {row.policy_number ? `Pol: ${row.policy_number}` : "Direct Cash"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <BookingTypeBadge type={row.booking_type} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={row.appointment_status || row.status} />
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <div className="font-bold">{renderValue(row.booked_by_staff || row.booked_by)}</div>
                        {row.registered_by_staff && (
                          <div className="text-[10px] text-slate-400">Reg: {row.registered_by_staff}</div>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-slate-400 italic">
                      {isLoading ? "Retrieving records..." : "No appointment records found for the selected criteria."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {!isLoading && pagination.total_rows > 0 && (
            <div className="p-3.5 bg-slate-50/70 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="text-xs text-slate-500 font-semibold">
                Showing <span className="text-slate-900 font-bold">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
                <span className="text-slate-900 font-bold">
                  {Math.min(currentPage * itemsPerPage, pagination.total_rows)}
                </span> of{" "}
                <span className="text-slate-900 font-bold">{pagination.total_rows}</span> records
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400 font-bold uppercase">Show</span>
                  <select
                    value={itemsPerPage}
                    onChange={e => handleFilterChange(setItemsPerPage, Number(e.target.value))}
                    className="bg-white border border-slate-200 rounded-lg text-xs font-bold px-2 py-1 outline-none"
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
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 hover:bg-slate-50"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-xs font-bold text-slate-800 px-2">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 hover:bg-slate-50"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AppointmentReport;

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
//   CalendarCheck,
//   CheckCircle2,
//   Clock,
//   XCircle,
//   UserPlus,
//   Users,
//   Wallet,
//   Building2,
//   Activity,
//   UserCheck,
//   FilterX,
//   RefreshCw,
//   TrendingUp,
//   Stethoscope,
//   Briefcase
// } from "lucide-react";
// import { exportToCSV, exportToExcel, exportToPDF } from "../../utils/exportUtils";
// import apiClient from "../../api/client";

// // --- Types ---
// interface KPIReport {
//   total_appointments: number;
//   total_unique_patients: number;
//   new_patients_count: number;
//   old_patients_count: number;
//   new_patient_appointments: number | string;
//   old_patient_appointments: number | string;
//   pvt_cash_appointments: number | string;
//   hmo_appointments: number | string;
//   pvt_cash_unique_patients: number;
//   hmo_unique_patients: number;
//   completed_visits: number | string;
//   cancelled_visits: number | string;
//   no_shows: number | string;
//   active_pending_visits: number | string;
//   walk_in_count: number | string;
//   pre_booked_count: number | string;
//   follow_up_count: number | string;
//   new_patient_percentage: number;
//   old_patient_percentage: number;
//   pvt_cash_percentage: number;
//   hmo_percentage: number;
//   hmo_vs_pvt_ratio: string;
// }

// interface UserProductivityAudit {
//   user_id: number;
//   staff_name: string;
//   staff_id: string;
//   department: string;
//   total_patients_registered: number;
//   total_appointments_booked: number;
//   walk_in_booked: number | string;
//   pre_booked: number | string;
//   follow_up_booked: number | string;
//   completed_appointments: number | string;
//   cancelled_appointments: number | string;
// }

// interface PayerDistribution {
//   payer_name: string;
//   payer_category: string;
//   appointment_count: number;
//   unique_patients: number;
// }

// interface DoctorUtilization {
//   doctor_name: string;
//   specialization: string;
//   total_appointments: number;
//   completed: string | number;
//   cancelled: string | number;
// }

// interface SpecialtyDemand {
//   specialization: string;
//   total_volume: number;
// }

// const renderValue = (val: any) => {
//   if (val === null || val === undefined || val === "") return "—";
//   return String(val);
// };

// const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
//   switch (status?.toUpperCase()) {
//     case "SCHEDULED":
//       return <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200">Scheduled</span>;
//     case "CONFIRMED":
//       return <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200">Confirmed</span>;
//     case "CHECKED_IN":
//       return <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">Checked In</span>;
//     case "COMPLETED":
//       return <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Completed</span>;
//     case "CANCELLED":
//       return <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-200">Cancelled</span>;
//     case "BILLING_CLEARANCE":
//       return <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200">Billing Clearance</span>;
//     case "NO_SHOW":
//       return <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-slate-100 text-slate-600 border border-slate-300">No Show</span>;
//     default:
//       return <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-slate-100 text-slate-600 border border-slate-200">{status || "—"}</span>;
//   }
// };

// const BookingTypeBadge: React.FC<{ type: string }> = ({ type }) => {
//   if (type === "PRE_BOOKED") {
//     return <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-sky-50 text-sky-700 border border-sky-200">Pre-booked</span>;
//   } else if (type === "WALK_IN") {
//     return <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-purple-50 text-purple-700 border border-purple-200">Walk-in</span>;
//   } else if (type === "FOLLOW_UP") {
//     return <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-amber-50 text-amber-700 border border-amber-200">Follow-up</span>;
//   }
//   return <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-slate-100 text-slate-600 border border-slate-200">{type}</span>;
// };

// const AppointmentReport: React.FC = () => {
//   // Navigation Tabs
//   const [activeTab, setActiveTab] = useState<"dashboard" | "ledger" | "staff">("dashboard");

//   // Core Data State
//   const [ledgerData, setLedgerData] = useState<any[]>([]);
//   const [kpis, setKpis] = useState<KPIReport | null>(null);
//   const [userAudit, setUserAudit] = useState<UserProductivityAudit[]>([]);
//   const [payerDistribution, setPayerDistribution] = useState<PayerDistribution[]>([]);
//   const [doctorUtilization, setDoctorUtilization] = useState<DoctorUtilization[]>([]);
//   const [specialtyDemand, setSpecialtyDemand] = useState<SpecialtyDemand[]>([]);
//   const [pagination, setPagination] = useState({ current_page: 1, per_page: 25, total_rows: 0 });

//   const [isLoading, setIsLoading] = useState(true);

//   // Filters
//   const [searchTerm, setSearchTerm] = useState("");
//   const [debouncedSearch, setDebouncedSearch] = useState("");
//   const [mrnFilter, setMrnFilter] = useState("");
//   const [debouncedMrn, setDebouncedMrn] = useState("");
//   const [timeframeFilter, setTimeframeFilter] = useState("all");
//   const [dateFrom, setDateFrom] = useState("");
//   const [dateTo, setDateTo] = useState("");
//   const [statusFilter, setStatusFilter] = useState("All");
//   const [bookingTypeFilter, setBookingTypeFilter] = useState("All");
//   const [doctorFilter, setDoctorFilter] = useState("All");
//   const [specializationFilter, setSpecializationFilter] = useState("All");
//   const [payerFilter, setPayerFilter] = useState("");
//   const [payerTypeFilter, setPayerTypeFilter] = useState("All"); // 'HMO' vs 'PVT'
//   const [patientCategoryFilter, setPatientCategoryFilter] = useState("All"); // 'NEW' vs 'OLD'
//   const [bookedByFilter, setBookedByFilter] = useState("All"); // Staff Filter

//   // Dropdown options
//   const [doctors, setDoctors] = useState<any[]>([]);
//   const [payers, setPayers] = useState<any[]>([]);
//   const [staffList, setStaffList] = useState<any[]>([]);
//   const [specializations, setSpecializations] = useState<{ id: number; name: string }[]>([]);

//   // Pagination State
//   const [currentPage, setCurrentPage] = useState(1);
//   const [itemsPerPage, setItemsPerPage] = useState(25);

//   // Export Dropdown
//   const [isExportOpen, setIsExportOpen] = useState(false);
//   const dropdownRef = useRef<HTMLDivElement>(null);

//   // Debounce search
//   useEffect(() => {
//     const timer = setTimeout(() => setDebouncedSearch(searchTerm), 450);
//     return () => clearTimeout(timer);
//   }, [searchTerm]);

//   useEffect(() => {
//     const timer = setTimeout(() => setDebouncedMrn(mrnFilter), 450);
//     return () => clearTimeout(timer);
//   }, [mrnFilter]);

//   // Load Dropdowns
//   useEffect(() => {
//     const fetchDropdowns = async () => {
//       try {
//         const [specsRes, docsRes, paysRes] = await Promise.all([
//           apiClient.get("/doctors-specializations"),
//           apiClient.get("/doctors"),
//           apiClient.get("/payer-types")
//         ]);
//         if (specsRes.data?.data) setSpecializations(specsRes.data.data);
//         if (docsRes.data?.data) setDoctors(docsRes.data.data);
//         if (paysRes.data?.data) setPayers(paysRes.data.data);
//         if (paysRes.data?.data) setStaffList(paysRes.data.data);
//       } catch (error) {
//         console.error("Failed to load initial dropdowns:", error);
//       }
//     };
//     fetchDropdowns();
//   }, []);


//   // Load Dropdowns
//   useEffect(() => {
//     const fetchDropdowns = async () => {
//       try {
//         const [specsRes, docsRes, paysRes, staffRes] = await Promise.all([
//           apiClient.get("/doctors-specializations"), // Assuming this endpoint already exists
//           apiClient.get("/report/appointment/doctors"), // Updated route
//           apiClient.get("/report/appointment/payers"),  // Updated route
//           apiClient.get("/report/appointment/staff")    // New route for Booked By filter
//         ]);
        
//         if (specsRes.data?.data) setSpecializations(specsRes.data.data);
//         if (docsRes.data?.data) setDoctors(docsRes.data.data);
//         if (paysRes.data?.data) setPayers(paysRes.data.data);
//         if (staffRes.data?.data) setStaffList(staffRes.data.data); // Add setStaffList state
//       } catch (error) {
//         console.error("Failed to load initial dropdowns:", error);
//       }
//     };
//     fetchDropdowns();
//   }, []);


//   // Fetch Report Data
//   const fetchReportData = async () => {
//     try {
//       setIsLoading(true);

//       const params: any = {
//         limit: itemsPerPage,
//         offset: (currentPage - 1) * itemsPerPage
//       };

//       if (debouncedSearch) params.search = debouncedSearch;
//       if (debouncedMrn) params.mrn = debouncedMrn;

//       if (timeframeFilter === "custom") {
//         params.timeframe = "custom";
//         if (dateFrom) params.start_date = dateFrom;
//         if (dateTo) params.end_date = dateTo;
//       } else {
//         params.timeframe = timeframeFilter;
//       }

//       if (statusFilter !== "All") params.status = statusFilter;
//       if (bookingTypeFilter !== "All") params.booking_type = bookingTypeFilter;
//       if (doctorFilter !== "All") params.doctor_id = doctorFilter;
//       if (specializationFilter !== "All") params.specialization_id = specializationFilter;
//       if (payerFilter && payerFilter !== "All") params.payer_id = payerFilter;
//       if (payerTypeFilter !== "All") params.payer_type = payerTypeFilter;
//       if (patientCategoryFilter !== "All") params.patient_category = patientCategoryFilter;
//       if (bookedByFilter !== "All") params.booked_by_id = bookedByFilter;

//       // Concurrently query dashboard summary and detailed ledger
//       const [dashboardRes, ledgerRes] = await Promise.allSettled([
//         apiClient.get("/report/appointment", { params }),
//         apiClient.get("/report/appointment/ledger", { params })
//       ]);

//       // 1. Process Executive Dashboard
//       if (dashboardRes.status === "fulfilled" && dashboardRes.value?.data?.data) {
//         const d = dashboardRes.value.data.data;
//         const reports = d.reports || d; // Handles nested "reports" or flat payload

//         setKpis(reports.kpis || null);
//         setUserAudit(reports.user_productivity_audit || []);
//         setPayerDistribution(reports.payer_distribution || []);
//         setDoctorUtilization(reports.doctor_utilization || []);
//         setSpecialtyDemand(reports.specialty_demand || []);

//         if (reports.kpis?.total_appointments) {
//           setPagination(prev => ({ ...prev, total_rows: Number(reports.kpis.total_appointments) }));
//         }
//       }

//       // 2. Process Master Ledger Records
//       if (ledgerRes.status === "fulfilled" && ledgerRes.value?.data?.data) {
//         const l = ledgerRes.value.data.data;
//         setLedgerData(l.records || l.details || []);
//       } else if (dashboardRes.status === "fulfilled" && dashboardRes.value?.data?.data?.records) {
//         setLedgerData(dashboardRes.value.data.data.records);
//       } else {
//         setLedgerData([]);
//       }
//     } catch (error) {
//       console.error("Failed to load appointment reports:", error);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchReportData();
//   }, [
//     currentPage,
//     itemsPerPage,
//     debouncedSearch,
//     debouncedMrn,
//     timeframeFilter,
//     dateFrom,
//     dateTo,
//     statusFilter,
//     bookingTypeFilter,
//     doctorFilter,
//     specializationFilter,
//     payerFilter,
//     payerTypeFilter,
//     patientCategoryFilter,
//     bookedByFilter
//   ]);

//   const handleFilterChange = (setter: any, value: any) => {
//     setter(value);
//     setCurrentPage(1);
//   };

//   const handleClearFilters = () => {
//     setSearchTerm("");
//     setMrnFilter("");
//     setTimeframeFilter("all");
//     setDateFrom("");
//     setDateTo("");
//     setStatusFilter("All");
//     setBookingTypeFilter("All");
//     setDoctorFilter("All");
//     setSpecializationFilter("All");
//     setPayerFilter("");
//     setPayerTypeFilter("All");
//     setPatientCategoryFilter("All");
//     setBookedByFilter("All");
//     setCurrentPage(1);
//   };

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

//   const totalPages = Math.ceil(pagination.total_rows / itemsPerPage) || 1;

//   const handlePageChange = (page: number) => {
//     if (page >= 1 && page <= totalPages) {
//       setCurrentPage(page);
//     }
//   };

//   const handleExportCSV = () => {
//     exportToCSV(ledgerData.length > 0 ? ledgerData : userAudit, "appointment_management_report");
//     setIsExportOpen(false);
//   };

//   const handleExportExcel = () => {
//     exportToExcel(ledgerData.length > 0 ? ledgerData : userAudit, "appointment_management_report");
//     setIsExportOpen(false);
//   };

//   const handleExportPDF = () => {
//     exportToPDF(ledgerData.length > 0 ? ledgerData : userAudit, "appointment_management_report", "Appointment Management Report");
//     setIsExportOpen(false);
//   };


  

//   return (
//     <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 w-full overflow-hidden flex flex-col space-y-6">
      
//       {/* ----------------- Top Header & Actions ----------------- */}
//       <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b border-slate-100">
//         <div>
//           <div className="flex items-center gap-3">
//             <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-2xl">
//               <CalendarCheck size={26} />
//             </div>
//             <div>
//               <h2 className="text-xl font-black text-slate-800 tracking-tight">Appointment & Registration Intelligence</h2>
//               <p className="text-xs font-semibold text-slate-500">
//                 Audited Patient Flow, Staff Productivity & HMO vs Private Cash Distribution
//               </p>
//             </div>
//           </div>
//         </div>

//         <div className="flex items-center gap-2.5 w-full sm:w-auto">
//           {/* Navigation Tabs */}
//           <div className="bg-slate-100 p-1 rounded-2xl flex items-center text-xs font-bold text-slate-600">
//             <button
//               onClick={() => setActiveTab("dashboard")}
//               className={`px-3.5 py-1.5 rounded-xl transition-all ${
//                 activeTab === "dashboard" ? "bg-white text-indigo-700 shadow-sm" : "hover:text-slate-900"
//               }`}
//             >
//               Overview
//             </button>
//             <button
//               onClick={() => setActiveTab("staff")}
//               className={`px-3.5 py-1.5 rounded-xl transition-all ${
//                 activeTab === "staff" ? "bg-white text-indigo-700 shadow-sm" : "hover:text-slate-900"
//               }`}
//             >
//               Staff Audit
//             </button>
//             <button
//               onClick={() => setActiveTab("ledger")}
//               className={`px-3.5 py-1.5 rounded-xl transition-all ${
//                 activeTab === "ledger" ? "bg-white text-indigo-700 shadow-sm" : "hover:text-slate-900"
//               }`}
//             >
//               Master Ledger
//             </button>
//           </div>

//           <button
//             onClick={handleClearFilters}
//             disabled={isLoading}
//             className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50 rounded-xl text-xs font-bold transition-all"
//             title="Reset All Filters"
//           >
//             <FilterX size={16} />
//             <span className="hidden sm:inline">Reset</span>
//           </button>

//           <button
//             onClick={fetchReportData}
//             disabled={isLoading}
//             className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50 rounded-xl text-xs font-bold transition-all"
//             title="Refresh Intelligence Data"
//           >
//             <RefreshCw size={16} className={isLoading ? "animate-spin text-indigo-600" : ""} />
//             <span className="hidden sm:inline">Refresh</span>
//           </button>

//           {/* Export Dropdown */}
//           <div className="relative" ref={dropdownRef}>
//             <button
//               onClick={() => setIsExportOpen(!isExportOpen)}
//               disabled={isLoading}
//               className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 rounded-xl text-xs font-black shadow-md shadow-indigo-600/20 transition-all"
//             >
//               <Download size={16} />
//               Export
//               <ChevronDown size={14} className={`transition-transform duration-200 ${isExportOpen ? "rotate-180" : ""}`} />
//             </button>

//             {isExportOpen && (
//               <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 py-2 animate-in fade-in zoom-in-95 duration-150">
//                 <button
//                   onClick={handleExportExcel}
//                   className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
//                 >
//                   <FileSpreadsheet size={16} className="text-emerald-600" />
//                   Export Excel (.xlsx)
//                 </button>
//                 <button
//                   onClick={handleExportCSV}
//                   className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
//                 >
//                   <FileText size={16} className="text-blue-600" />
//                   Export CSV (.csv)
//                 </button>
//                 <button
//                   onClick={handleExportPDF}
//                   className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
//                 >
//                   <FilePdf size={16} className="text-rose-600" />
//                   Export PDF (.pdf)
//                 </button>
//               </div>
//             )}
//           </div>
//         </div>
//       </div>

//       {/* ----------------- Top Executive KPI Cards ----------------- */}
//       {kpis && (
//         <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
//           {/* Card 1: Total Appointments */}
//           <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex flex-col justify-between">
//             <div className="flex items-center justify-between text-indigo-700 mb-2">
//               <span className="text-[11px] font-black uppercase tracking-wider">Total Appts</span>
//               <CalendarCheck size={18} />
//             </div>
//             <div>
//               <div className="text-2xl font-black text-slate-900">{kpis.total_appointments || 0}</div>
//               <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
//                 {kpis.completed_visits || 0} completed • {kpis.cancelled_visits || 0} cancelled
//               </div>
//             </div>
//           </div>

//           {/* Card 2: Unique Patients */}
//           <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-100 flex flex-col justify-between">
//             <div className="flex items-center justify-between text-sky-700 mb-2">
//               <span className="text-[11px] font-black uppercase tracking-wider">Unique Patients</span>
//               <Users size={18} />
//             </div>
//             <div>
//               <div className="text-2xl font-black text-slate-900">{kpis.total_unique_patients || 0}</div>
//               <div className="text-[11px] font-semibold text-slate-500 mt-0.5">Active clinical heads</div>
//             </div>
//           </div>

//           {/* Card 3: New vs Old Patients */}
//           <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex flex-col justify-between">
//             <div className="flex items-center justify-between text-emerald-700 mb-2">
//               <span className="text-[11px] font-black uppercase tracking-wider">New vs Old</span>
//               <UserPlus size={18} />
//             </div>
//             <div>
//               <div className="text-2xl font-black text-slate-900">
//                 {kpis.new_patients_count || 0}{" "}
//                 <span className="text-xs font-bold text-slate-400">/ {kpis.old_patients_count || 0}</span>
//               </div>
//               <div className="text-[11px] font-semibold text-emerald-700 mt-0.5">
//                 {kpis.new_patient_percentage || 0}% New Patients
//               </div>
//             </div>
//           </div>

//           {/* Card 4: HMO vs Private Cash Ratio */}
//           <div className="p-4 rounded-2xl bg-violet-50/60 border border-violet-100 flex flex-col justify-between">
//             <div className="flex items-center justify-between text-violet-700 mb-2">
//               <span className="text-[11px] font-black uppercase tracking-wider">HMO vs PVT Ratio</span>
//               <TrendingUp size={18} />
//             </div>
//             <div>
//               <div className="text-2xl font-black text-slate-900">{kpis.hmo_vs_pvt_ratio || "0 : 1"}</div>
//               <div className="text-[11px] font-semibold text-violet-700 mt-0.5">
//                 {kpis.hmo_appointments || 0} HMO vs {kpis.pvt_cash_appointments || 0} Cash
//               </div>
//             </div>
//           </div>

//           {/* Card 5: Private Cash Volume */}
//           <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100 flex flex-col justify-between">
//             <div className="flex items-center justify-between text-amber-700 mb-2">
//               <span className="text-[11px] font-black uppercase tracking-wider">Private Cash</span>
//               <Wallet size={18} />
//             </div>
//             <div>
//               <div className="text-2xl font-black text-slate-900">{kpis.pvt_cash_appointments || 0}</div>
//               <div className="text-[11px] font-semibold text-amber-700 mt-0.5">
//                 {kpis.pvt_cash_percentage || 0}% Total Revenue Share
//               </div>
//             </div>
//           </div>

//           {/* Card 6: Booking Method */}
//           <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-100 flex flex-col justify-between">
//             <div className="flex items-center justify-between text-rose-700 mb-2">
//               <span className="text-[11px] font-black uppercase tracking-wider">Pre-Booked vs Walk-in</span>
//               <Clock size={18} />
//             </div>
//             <div>
//               <div className="text-2xl font-black text-slate-900">
//                 {kpis.pre_booked_count || 0}{" "}
//                 <span className="text-xs font-bold text-slate-400">/ {kpis.walk_in_count || 0}</span>
//               </div>
//               <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
//                 {kpis.active_pending_visits || 0} active / pending
//               </div>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* ----------------- Filter Bar ----------------- */}
//       <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
//         {/* Search */}
//         <div className="relative">
//           <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
//           <input
//             type="text"
//             placeholder="Search patient, phone, code..."
//             value={searchTerm}
//             onChange={e => handleFilterChange(setSearchTerm, e.target.value)}
//             disabled={isLoading}
//             className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none"
//           />
//         </div>

//         {/* MRN Search */}
//         <div className="relative">
//           <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
//           <input
//             type="text"
//             placeholder="Filter by MRN..."
//             value={mrnFilter}
//             onChange={e => handleFilterChange(setMrnFilter, e.target.value)}
//             disabled={isLoading}
//             className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none"
//           />
//         </div>

//         {/* Timeframe Resolver */}
//         <div>
//           <select
//             value={timeframeFilter}
//             onChange={e => handleFilterChange(setTimeframeFilter, e.target.value)}
//             disabled={isLoading}
//             className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600/20"
//           >
//             <option value="all">All Time Intervals</option>
//             <option value="today">Today</option>
//             <option value="yesterday">Yesterday</option>
//             <option value="this_week">This Week</option>
//             <option value="last_week">Last Week</option>
//             <option value="last_7_days">Last 7 Days</option>
//             <option value="last_30_days">Last 30 Days</option>
//             <option value="this_month">This Month</option>
//             <option value="last_month">Last Month</option>
//             <option value="last_3_months">Last 3 Months</option>
//             <option value="this_year">This Year</option>
//             <option value="custom">Custom Date Range</option>
//           </select>
//         </div>

//         {/* Custom Date Pickers */}
//         {timeframeFilter === "custom" && (
//           <>
//             <div>
//               <input
//                 type="date"
//                 value={dateFrom}
//                 onChange={e => handleFilterChange(setDateFrom, e.target.value)}
//                 disabled={isLoading}
//                 className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none"
//               />
//             </div>
//             <div>
//               <input
//                 type="date"
//                 value={dateTo}
//                 onChange={e => handleFilterChange(setDateTo, e.target.value)}
//                 disabled={isLoading}
//                 className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none"
//               />
//             </div>
//           </>
//         )}

//         {/* Staff Booker Filter */}
//         <div>
//           <select
//             value={bookedByFilter}
//             onChange={e => handleFilterChange(setBookedByFilter, e.target.value)}
//             disabled={isLoading}
//             className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600/20"
//           >
//             <option value="All">All Staff / Bookers</option>
//             {userAudit.map(u => (
//               <option key={u.user_id} value={u.user_id}>
//                 {u.staff_name} ({u.staff_id || "Staff"})
//               </option>
//             ))}
//           </select>
//         </div>

//         {/* Patient Category Filter */}
//         <div>
//           <select
//             value={patientCategoryFilter}
//             onChange={e => handleFilterChange(setPatientCategoryFilter, e.target.value)}
//             disabled={isLoading}
//             className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600/20"
//           >
//             <option value="All">All Patient Categories</option>
//             <option value="NEW">New Patients (Registered in Period)</option>
//             <option value="OLD">Old / Returning Patients</option>
//           </select>
//         </div>

//         {/* Payer Group Filter */}
//         <div>
//           <select
//             value={payerTypeFilter}
//             onChange={e => handleFilterChange(setPayerTypeFilter, e.target.value)}
//             disabled={isLoading}
//             className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600/20"
//           >
//             <option value="All">All Payer Groups (HMO & PVT)</option>
//             <option value="PVT">Private Cash Only</option>
//             <option value="HMO">HMO Covered Only</option>
//           </select>
//         </div>

//         {/* Specific Payer */}
//         <div>
//           <select
//             value={payerFilter}
//             onChange={e => handleFilterChange(setPayerFilter, e.target.value)}
//             disabled={isLoading}
//             className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none"
//           >
//             <option value="">All Specific Payers</option>
//             {payers.map(p => (
//               <option key={p.id} value={p.id}>{p.name}</option>
//             ))}
//           </select>
//         </div>

//         {/* Staff Booker Filter */}
//         <div>
//           <select
//             value={bookedByFilter}
//             onChange={e => handleFilterChange(setBookedByFilter, e.target.value)}
//             disabled={isLoading}
//             className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600/20"
//           >
//             <option value="All">All Staff / Bookers</option>
//             {staffList.map(s => (
//               <option key={s.user_id} value={s.user_id}>
//                 {s.staff_name} ({s.staff_id || "Staff"})
//               </option>
//             ))}
//           </select>
//         </div>

//         {/* Doctor Filter */}
//         <div>
//           <select
//             value={doctorFilter}
//             onChange={e => handleFilterChange(setDoctorFilter, e.target.value)}
//             disabled={isLoading}
//             className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none"
//           >
//             <option value="All">All Attending Doctors</option>
//             {doctors.map(doc => (
//               <option key={doc.doctor_id} value={doc.doctor_id}>
//                 Dr. {doc.first_name} {doc.last_name}
//               </option>
//             ))}
//           </select>
//         </div>

//         {/* Specialization Filter */}
//         <div>
//           <select
//             value={specializationFilter}
//             onChange={e => handleFilterChange(setSpecializationFilter, e.target.value)}
//             disabled={isLoading}
//             className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none"
//           >
//             <option value="All">All Specializations</option>
//             {specializations.map(s => (
//               <option key={s.id} value={s.id}>{s.name}</option>
//             ))}
//           </select>
//         </div>

//         {/* Status Filter */}
//         <div>
//           <select
//             value={statusFilter}
//             onChange={e => handleFilterChange(setStatusFilter, e.target.value)}
//             disabled={isLoading}
//             className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none"
//           >
//             <option value="All">All Statuses</option>
//             <option value="SCHEDULED">Scheduled</option>
//             <option value="CONFIRMED">Confirmed</option>
//             <option value="CHECKED_IN">Checked In</option>
//             <option value="COMPLETED">Completed</option>
//             <option value="CANCELLED">Cancelled</option>
//             <option value="NO_SHOW">No Show</option>
//             <option value="BILLING_CLEARANCE">Billing Clearance</option>
//           </select>
//         </div>

//         {/* Booking Type Filter */}
//         <div>
//           <select
//             value={bookingTypeFilter}
//             onChange={e => handleFilterChange(setBookingTypeFilter, e.target.value)}
//             disabled={isLoading}
//             className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none"
//           >
//             <option value="All">All Booking Types</option>
//             <option value="PRE_BOOKED">Pre-booked</option>
//             <option value="WALK_IN">Walk-in</option>
//             <option value="FOLLOW_UP">Follow-up</option>
//           </select>
//         </div>
//       </div>

//       {/* ----------------- TAB 1: EXECUTIVE DASHBOARD ----------------- */}
//       {activeTab === "dashboard" && (
//         <div className="space-y-6">
//           {/* Ratio Comparison Bars */}
//           <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
//             {/* New vs Returning Patients Bar */}
//             <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs">
//               <div className="flex justify-between items-center mb-2">
//                 <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
//                   <UserPlus size={16} className="text-emerald-600" /> Patient Acquisition Share
//                 </span>
//                 <span className="text-xs font-extrabold text-slate-500">
//                   {kpis?.new_patient_percentage || 0}% New • {kpis?.old_patient_percentage || 0}% Returning
//                 </span>
//               </div>
//               <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
//                 <div
//                   className="bg-emerald-500 h-full transition-all duration-500"
//                   style={{ width: `${kpis?.new_patient_percentage || 0}%` }}
//                   title={`New Patients: ${kpis?.new_patients_count || 0}`}
//                 />
//                 <div
//                   className="bg-sky-500 h-full transition-all duration-500"
//                   style={{ width: `${kpis?.old_patient_percentage || 0}%` }}
//                   title={`Returning Patients: ${kpis?.old_patients_count || 0}`}
//                 />
//               </div>
//               <div className="flex justify-between text-[11px] font-semibold text-slate-500 mt-2">
//                 <span>New: {kpis?.new_patients_count || 0}</span>
//                 <span>Returning: {kpis?.old_patients_count || 0}</span>
//               </div>
//             </div>

//             {/* HMO vs Private Cash Bar */}
//             <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs">
//               <div className="flex justify-between items-center mb-2">
//                 <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
//                   <Wallet size={16} className="text-violet-600" /> HMO vs Private Cash Ratio
//                 </span>
//                 <span className="text-xs font-extrabold text-slate-500">
//                   {kpis?.pvt_cash_percentage || 0}% Cash • {kpis?.hmo_percentage || 0}% HMO
//                 </span>
//               </div>
//               <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
//                 <div
//                   className="bg-amber-500 h-full transition-all duration-500"
//                   style={{ width: `${kpis?.pvt_cash_percentage || 0}%` }}
//                   title={`Private Cash: ${kpis?.pvt_cash_appointments || 0}`}
//                 />
//                 <div
//                   className="bg-violet-500 h-full transition-all duration-500"
//                   style={{ width: `${kpis?.hmo_percentage || 0}%` }}
//                   title={`HMO Covered: ${kpis?.hmo_appointments || 0}`}
//                 />
//               </div>
//               <div className="flex justify-between text-[11px] font-semibold text-slate-500 mt-2">
//                 <span>Cash Appts: {kpis?.pvt_cash_appointments || 0}</span>
//                 <span>HMO Appts: {kpis?.hmo_appointments || 0}</span>
//               </div>
//             </div>
//           </div>

//           {/* Breakdown Grids */}
//           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//             {/* Payer Breakdown */}
//             <div className="rounded-2xl border border-slate-200 p-4 bg-white flex flex-col justify-between">
//               <div>
//                 <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
//                   <Building2 size={18} className="text-indigo-600" />
//                   <h3 className="text-sm font-bold text-slate-800">Top Payers Distribution</h3>
//                 </div>
//                 <div className="space-y-2.5">
//                   {payerDistribution.length > 0 ? (
//                     payerDistribution.map((p, idx) => (
//                       <div key={idx} className="flex justify-between items-center text-xs">
//                         <div>
//                           <div className="font-bold text-slate-800">{p.payer_name}</div>
//                           <div className="text-[10px] text-slate-400 font-bold uppercase">{p.payer_category}</div>
//                         </div>
//                         <div className="text-right">
//                           <div className="font-black text-slate-900">{p.appointment_count} appts</div>
//                           <div className="text-[10px] text-slate-500">{p.unique_patients} patients</div>
//                         </div>
//                       </div>
//                     ))
//                   ) : (
//                     <div className="text-xs text-slate-400 italic py-4 text-center">No payer records found</div>
//                   )}
//                 </div>
//               </div>
//             </div>

//             {/* Doctor Utilization */}
//             <div className="rounded-2xl border border-slate-200 p-4 bg-white flex flex-col justify-between">
//               <div>
//                 <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
//                   <Stethoscope size={18} className="text-emerald-600" />
//                   <h3 className="text-sm font-bold text-slate-800">Physician Workload</h3>
//                 </div>
//                 <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
//                   {doctorUtilization.length > 0 ? (
//                     doctorUtilization.slice(0, 6).map((doc, idx) => (
//                       <div key={idx} className="flex justify-between items-center text-xs">
//                         <div>
//                           <div className="font-bold text-slate-800">{doc.doctor_name}</div>
//                           <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{doc.specialization}</div>
//                         </div>
//                         <div className="text-right">
//                           <div className="font-black text-slate-900">{doc.total_appointments} visits</div>
//                           <div className="text-[10px] text-rose-600 font-semibold">{doc.cancelled} cancelled</div>
//                         </div>
//                       </div>
//                     ))
//                   ) : (
//                     <div className="text-xs text-slate-400 italic py-4 text-center">No physician records</div>
//                   )}
//                 </div>
//               </div>
//             </div>

//             {/* Specialty Demand */}
//             <div className="rounded-2xl border border-slate-200 p-4 bg-white flex flex-col justify-between">
//               <div>
//                 <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
//                   <Activity size={18} className="text-sky-600" />
//                   <h3 className="text-sm font-bold text-slate-800">Specialty Volume Demand</h3>
//                 </div>
//                 <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
//                   {specialtyDemand.length > 0 ? (
//                     specialtyDemand.slice(0, 6).map((spec, idx) => (
//                       <div key={idx} className="flex justify-between items-center text-xs">
//                         <div className="font-bold text-slate-800 truncate max-w-[180px]">{spec.specialization}</div>
//                         <div className="font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
//                           {spec.total_volume}
//                         </div>
//                       </div>
//                     ))
//                   ) : (
//                     <div className="text-xs text-slate-400 italic py-4 text-center">No specialty data</div>
//                   )}
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* ----------------- TAB 2: STAFF WORKLOAD & PRODUCTIVITY AUDIT ----------------- */}
//       {activeTab === "staff" && (
//         <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-xs">
//           <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
//             <div>
//               <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
//                 Staff Workload & Registration Audit
//               </h3>
//               <p className="text-xs text-slate-500 font-medium">
//                 Tracking appointments and registrations performed by individual staff members
//               </p>
//             </div>
//             <span className="px-3 py-1 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700">
//               {userAudit.length} Active Staff Found
//             </span>
//           </div>

//           <div className="overflow-x-auto">
//             <table className="w-full text-left text-xs whitespace-nowrap">
//               <thead className="bg-slate-50/80 border-b border-slate-200 font-black text-slate-600 uppercase tracking-wider text-[11px]">
//                 <tr>
//                   <th className="px-4 py-3">#</th>
//                   <th className="px-4 py-3">Staff Name</th>
//                   <th className="px-4 py-3">Department</th>
//                   <th className="px-4 py-3 text-center">Patients Registered</th>
//                   <th className="px-4 py-3 text-center">Total Appointments</th>
//                   <th className="px-4 py-3 text-center">Pre-Booked</th>
//                   <th className="px-4 py-3 text-center">Walk-In</th>
//                   <th className="px-4 py-3 text-center">Completed Visits</th>
//                   <th className="px-4 py-3 text-center">Cancelled</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
//                 {userAudit.length > 0 ? (
//                   userAudit.map((u, i) => (
//                     <tr key={u.user_id} className="hover:bg-slate-50/80 transition-colors">
//                       <td className="px-4 py-3 text-slate-400 font-bold">{i + 1}</td>
//                       <td className="px-4 py-3 font-bold text-slate-900">
//                         {u.staff_name}
//                         <div className="text-[10px] text-slate-400 font-normal">ID: {u.staff_id || "N/A"}</div>
//                       </td>
//                       <td className="px-4 py-3 text-slate-600">{u.department}</td>
//                       <td className="px-4 py-3 text-center">
//                         <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-black rounded-lg border border-emerald-100">
//                           {u.total_patients_registered}
//                         </span>
//                       </td>
//                       <td className="px-4 py-3 text-center">
//                         <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-black rounded-lg border border-indigo-100">
//                           {u.total_appointments_booked}
//                         </span>
//                       </td>
//                       <td className="px-4 py-3 text-center font-bold text-slate-800">{u.pre_booked}</td>
//                       <td className="px-4 py-3 text-center font-bold text-slate-800">{u.walk_in_booked}</td>
//                       <td className="px-4 py-3 text-center font-bold text-emerald-600">{u.completed_appointments}</td>
//                       <td className="px-4 py-3 text-center font-bold text-rose-600">{u.cancelled_appointments}</td>
//                     </tr>
//                   ))
//                 ) : (
//                   <tr>
//                     <td colSpan={9} className="px-4 py-8 text-center text-slate-400 italic">
//                       No staff booking audit metrics available for this period.
//                     </td>
//                   </tr>
//                 )}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       )}

//       {/* ----------------- TAB 3: MASTER APPOINTMENT LEDGER ----------------- */}
//       {activeTab === "ledger" && (
//         <div className="rounded-2xl border border-slate-200 flex-1 min-h-[400px] relative overflow-hidden flex flex-col bg-white shadow-xs">
//           {isLoading && (
//             <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70 backdrop-blur-xs">
//               <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
//             </div>
//           )}

//           <div className="overflow-x-auto flex-1">
//             <table className="w-full text-left text-xs whitespace-nowrap">
//               <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 font-black text-slate-600 uppercase tracking-wider text-[11px]">
//                 <tr>
//                   <th className="px-4 py-3">#</th>
//                   <th className="px-4 py-3">Appt. Code</th>
//                   <th className="px-4 py-3">Patient Details</th>
//                   <th className="px-4 py-3">Category</th>
//                   <th className="px-4 py-3">Date & Time</th>
//                   <th className="px-4 py-3">Attending Doctor</th>
//                   <th className="px-4 py-3">Payer & Policy</th>
//                   <th className="px-4 py-3">Type</th>
//                   <th className="px-4 py-3">Status</th>
//                   <th className="px-4 py-3">Booked By</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-100 font-medium">
//                 {ledgerData.length > 0 ? (
//                   ledgerData.map((row, index) => (
//                     <tr key={row.appointment_id || index} className="hover:bg-slate-50/80 transition-colors">
//                       <td className="px-4 py-3 text-slate-400 font-semibold">
//                         {(currentPage - 1) * itemsPerPage + index + 1}
//                       </td>
//                       <td className="px-4 py-3 text-slate-800 font-mono font-bold">
//                         {renderValue(row.appointment_code)}
//                       </td>
//                       <td className="px-4 py-3">
//                         <div className="font-bold text-slate-900">{renderValue(row.patient_name)}</div>
//                         <div className="text-[11px] text-slate-500 flex gap-1.5 items-center">
//                           <span className="font-mono">{renderValue(row.mrn)}</span>
//                           <span>•</span>
//                           <span>{renderValue(row.age_years || row.age)} yrs</span>
//                           <span>•</span>
//                           <span>{renderValue(row.gender)}</span>
//                         </div>
//                       </td>
//                       <td className="px-4 py-3">
//                         {row.patient_category === "NEW" ? (
//                           <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
//                             NEW
//                           </span>
//                         ) : (
//                           <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-sky-50 text-sky-700 border border-sky-200">
//                             RETURNING
//                           </span>
//                         )}
//                       </td>
//                       <td className="px-4 py-3">
//                         <div className="font-bold text-slate-800">{renderValue(row.appointment_date)}</div>
//                         <div className="text-[11px] text-slate-500">{renderValue(row.appointment_time)}</div>
//                       </td>
//                       <td className="px-4 py-3">
//                         <div className="font-bold text-slate-900">{renderValue(row.doctor_name)}</div>
//                         <div className="text-[11px] text-slate-500">{renderValue(row.specialization_name)}</div>
//                       </td>
//                       <td className="px-4 py-3">
//                         <div className="font-bold text-slate-800 flex items-center gap-1.5">
//                           {renderValue(row.payer_name)}
//                           {row.payer_category === "HMO" ? (
//                             <span className="px-1.5 py-0.2 bg-violet-100 text-violet-700 font-black text-[9px] rounded">HMO</span>
//                           ) : (
//                             <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 font-black text-[9px] rounded">CASH</span>
//                           )}
//                         </div>
//                         <div className="text-[11px] text-slate-400">
//                           {row.policy_number ? `Pol: ${row.policy_number}` : "Direct Cash"}
//                         </div>
//                       </td>
//                       <td className="px-4 py-3">
//                         <BookingTypeBadge type={row.booking_type} />
//                       </td>
//                       <td className="px-4 py-3">
//                         <StatusBadge status={row.appointment_status || row.status} />
//                       </td>
//                       <td className="px-4 py-3 text-slate-600">
//                         <div className="font-bold">{renderValue(row.booked_by_staff || row.booked_by)}</div>
//                         {row.registered_by_staff && (
//                           <div className="text-[10px] text-slate-400">Reg: {row.registered_by_staff}</div>
//                         )}
//                       </td>
//                     </tr>
//                   ))
//                 ) : (
//                   <tr>
//                     <td colSpan={10} className="px-4 py-12 text-center text-slate-400 italic">
//                       {isLoading ? "Retrieving records..." : "No appointment records found for the selected criteria."}
//                     </td>
//                   </tr>
//                 )}
//               </tbody>
//             </table>
//           </div>

//           {/* Pagination Footer */}
//           {!isLoading && pagination.total_rows > 0 && (
//             <div className="p-3.5 bg-slate-50/70 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3">
//               <div className="text-xs text-slate-500 font-semibold">
//                 Showing <span className="text-slate-900 font-bold">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
//                 <span className="text-slate-900 font-bold">
//                   {Math.min(currentPage * itemsPerPage, pagination.total_rows)}
//                 </span> of{" "}
//                 <span className="text-slate-900 font-bold">{pagination.total_rows}</span> records
//               </div>

//               <div className="flex items-center gap-3">
//                 <div className="flex items-center gap-1.5">
//                   <span className="text-xs text-slate-400 font-bold uppercase">Show</span>
//                   <select
//                     value={itemsPerPage}
//                     onChange={e => handleFilterChange(setItemsPerPage, Number(e.target.value))}
//                     className="bg-white border border-slate-200 rounded-lg text-xs font-bold px-2 py-1 outline-none"
//                   >
//                     {[10, 25, 50, 100].map(val => (
//                       <option key={val} value={val}>{val}</option>
//                     ))}
//                   </select>
//                 </div>

//                 <div className="flex items-center gap-1">
//                   <button
//                     onClick={() => handlePageChange(currentPage - 1)}
//                     disabled={currentPage === 1}
//                     className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 hover:bg-slate-50"
//                   >
//                     <ChevronLeft size={16} />
//                   </button>
//                   <span className="text-xs font-bold text-slate-800 px-2">
//                     {currentPage} / {totalPages}
//                   </span>
//                   <button
//                     onClick={() => handlePageChange(currentPage + 1)}
//                     disabled={currentPage === totalPages || totalPages === 0}
//                     className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 hover:bg-slate-50"
//                   >
//                     <ChevronRight size={16} />
//                   </button>
//                 </div>
//               </div>
//             </div>
//           )}
//         </div>
//       )}
//     </div>
//   );
// };

// export default AppointmentReport;
























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
//   CalendarCheck,
//   CheckCircle,
//   Clock,
//   XCircle,
//   UserPlus,
//   Calendar as CalendarIcon,
//   FilterX,
//   RefreshCw
// } from "lucide-react";
// import { exportToCSV, exportToExcel, exportToPDF } from "../../utils/exportUtils";
// import apiClient from "../../api/client";

// const renderValue = (val: any) => {
//   if (val === null || val === undefined || val === "") return "—";
//   return String(val);
// };

// const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
//   switch (status) {
//     case "SCHEDULED":
//       return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">Scheduled</span>;
//     case "COMPLETED":
//       return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">Completed</span>;
//     case "CANCELLED":
//       return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-red-50 text-red-600 border border-red-100">Cancelled</span>;
//     case "BILLING_CLEARANCE":
//       return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-50 text-amber-600 border border-amber-100">Billing Clearance</span>;
//     case "NO_SHOW":
//       return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-600 border border-slate-200">No Show</span>;
//     default:
//       return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-600 border border-slate-200">{status}</span>;
//   }
// };

// const BookingTypeBadge: React.FC<{ type: string }> = ({ type }) => {
//   if (type === "PRE_BOOKED") {
//     return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-50 text-blue-600 border border-blue-100">Pre-booked</span>;
//   } else if (type === "WALK_IN") {
//     return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-purple-50 text-purple-600 border border-purple-100">Walk-in</span>;
//   }
//   return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-600 border border-slate-200">{type}</span>;
// };

// const AppointmentReport: React.FC = () => {
//   const [data, setData] = useState<any[]>([]);
//   const [summary, setSummary] = useState<any>(null);
//   const [pagination, setPagination] = useState({ current_page: 1, per_page: 25, total_rows: 0 });
  
//   const [isLoading, setIsLoading] = useState(true);
  
//   // Filters
//   const [searchTerm, setSearchTerm] = useState("");
//   const [debouncedSearch, setDebouncedSearch] = useState("");
//   const [mrnFilter, setMrnFilter] = useState("");
//   const [debouncedMrn, setDebouncedMrn] = useState("");
//   const [timeframeFilter, setTimeframeFilter] = useState("all");
//   const [dateFrom, setDateFrom] = useState("");
//   const [dateTo, setDateTo] = useState("");
//   const [statusFilter, setStatusFilter] = useState("All");
//   const [bookingTypeFilter, setBookingTypeFilter] = useState("All");
//   const [doctorFilter, setDoctorFilter] = useState("All");
//   const [specializationFilter, setSpecializationFilter] = useState("All");
//   const [payerFilter, setPayerFilter] = useState("");
  
//   const [doctors, setDoctors] = useState<any[]>([]);
//   const [payers, setPayers] = useState<any[]>([]);
//   const [specializations, setSpecializations] = useState<{id: number, name: string}[]>([]);

//   // Pagination State
//   const [currentPage, setCurrentPage] = useState(1);
//   const [itemsPerPage, setItemsPerPage] = useState(25);
  
//   // Dropdown State
//   const [isExportOpen, setIsExportOpen] = useState(false);
//   const dropdownRef = useRef<HTMLDivElement>(null);

//   // Debounce search
//   useEffect(() => {
//     const timer = setTimeout(() => {
//       setDebouncedSearch(searchTerm);
//     }, 500);
//     return () => clearTimeout(timer);
//   }, [searchTerm]);

//   // Debounce MRN search
//   useEffect(() => {
//     const timer = setTimeout(() => {
//       setDebouncedMrn(mrnFilter);
//     }, 500);
//     return () => clearTimeout(timer);
//   }, [mrnFilter]);

//   useEffect(() => {
//     const fetchDropdowns = async () => {
//       try {
//         const [specsRes, docsRes, paysRes] = await Promise.all([
//           apiClient.get('/doctors-specializations'),
//           apiClient.get('/doctors'),
//           apiClient.get('/payer-types')
//         ]);
//         if (specsRes.data?.data) setSpecializations(specsRes.data.data);
//         if (docsRes.data?.data) setDoctors(docsRes.data.data);
//         if (paysRes.data?.data) setPayers(paysRes.data.data);
//       } catch (error) {
//         console.error("Failed to fetch filters:", error);
//       }
//     };
//     fetchDropdowns();
//   }, []);

//   const fetchReportData = async () => {
//     try {
//       setIsLoading(true);
//       const params: any = {
//         page: currentPage,
//         limit: itemsPerPage
//       };
      
//       if (debouncedSearch) params.search = debouncedSearch;
//       if (debouncedMrn) params.mrn = debouncedMrn;

//       // Handle timeframe by explicitly sending custom start/end dates or the exact timeframe string
//       if (timeframeFilter === "custom") {
//         params.timeframe = "custom";
//         if (dateFrom) params.start_date = dateFrom;
//         if (dateTo) params.end_date = dateTo;
//       } else {
//         params.timeframe = timeframeFilter;
//       }

//       if (statusFilter !== "All") params.status = statusFilter;
//       if (bookingTypeFilter !== "All") params.booking_type = bookingTypeFilter;
//       if (doctorFilter !== "All") params.doctor_id = doctorFilter;
//       if (specializationFilter !== "All") params.specialization_id = specializationFilter;
//       if (payerFilter && payerFilter !== "All") params.payer_id = payerFilter;

//       const response = await apiClient.get('/report/appointment', { params });
      
//       if (response.data?.data) {
//         setData(response.data.data.details || []);
//         setSummary(response.data.data.summary || null);
//         if (response.data.data.pagination) {
//           setPagination(response.data.data.pagination);
//         }
//       } else {
//         setData([]);
//         setSummary(null);
//       }
//     } catch (error) {
//       console.error("Failed to fetch appointment report data:", error);
//       setData([]);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchReportData();
//   }, [
//     currentPage, 
//     itemsPerPage, 
//     debouncedSearch, 
//     debouncedMrn,
//     timeframeFilter, 
//     dateFrom, 
//     dateTo, 
//     statusFilter, 
//     bookingTypeFilter,
//     doctorFilter,
//     specializationFilter,
//     payerFilter
//   ]);

//   // Reset page when filters change (except page changes themselves)
//   const handleFilterChange = (setter: any, value: any) => {
//     setter(value);
//     setCurrentPage(1);
//   };

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

//   const totalPages = Math.ceil(pagination.total_rows / itemsPerPage) || 1;

//   const handlePageChange = (page: number) => {
//     if (page >= 1 && page <= totalPages) {
//       setCurrentPage(page);
//     }
//   };

//   const handleExportCSV = () => {
//     exportToCSV(data, "appointment_report");
//     setIsExportOpen(false);
//   };

//   const handleExportExcel = () => {
//     exportToExcel(data, "appointment_report");
//     setIsExportOpen(false);
//   };

//   const handleExportPDF = () => {
//     exportToPDF(data, "appointment_report", "Appointment Report");
//     setIsExportOpen(false);
//   };

//   return (
//     <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 animate-in slide-in-from-bottom-4 duration-500 w-full overflow-hidden flex flex-col">
//       <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
//         <div>
//           <h2 className="text-xl font-bold text-slate-800">Appointment Report</h2>
//           <p className="text-sm text-slate-500">View and export all appointment details.</p>
//         </div>
        
//         <div className="flex items-center gap-3">
//           <button
//             onClick={() => {
//               setSearchTerm("");
//               setMrnFilter("");
//               setTimeframeFilter("all");
//               setDateFrom("");
//               setDateTo("");
//               setStatusFilter("All");
//               setBookingTypeFilter("All");
//               setDoctorFilter("All");
//               setSpecializationFilter("All");
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

//       {/* Summary KPI Cards */}
//       {summary && (
//         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
//           <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100">
//             <div className="flex items-center gap-2 mb-2">
//               <CalendarCheck className="text-blue-600" size={18} />
//               <span className="text-xs font-bold text-blue-900">Total Appts</span>
//             </div>
//             <div className="text-2xl font-black text-blue-700">{summary.total_appointments || "0"}</div>
//           </div>
//         </div>
//       )}

//       {/* Advanced Filters */}
//       <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-6">
//         <div className="relative">
//           <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
//           <input
//             type="text"
//             placeholder="Search by name, phone..."
//             value={searchTerm}
//             onChange={(e) => handleFilterChange(setSearchTerm, e.target.value)}
//             disabled={isLoading}
//             className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary disabled:opacity-50"
//           />
//         </div>
        
//         <div className="relative">
//           <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
//           <input
//             type="text"
//             placeholder="Search by MRN..."
//             value={mrnFilter}
//             onChange={(e) => handleFilterChange(setMrnFilter, e.target.value)}
//             disabled={isLoading}
//             className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary disabled:opacity-50"
//           />
//         </div>

//         <div>
//           <select
//             value={timeframeFilter}
//             onChange={(e) => handleFilterChange(setTimeframeFilter, e.target.value)}
//             disabled={isLoading}
//             className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-700 disabled:opacity-50"
//           >
//             <option value="all">All Time</option>
//             <option value="today">Today</option>
//             <option value="yesterday">Yesterday</option>
//             <option value="last_week">Last Week</option>
//             <option value="this_month">This Month</option>
//             <option value="last_month">Last Month</option>
//             <option value="last_2_months">Last 2 Months</option>
//             <option value="last_3_months">Last 3 Months</option>
//             <option value="last_year">Last Year</option>
//             <option value="custom">Custom Date Range</option>
//           </select>
//         </div>

//         {timeframeFilter === "custom" && (
//           <>
//             <div>
//               <input
//                 type="date"
//                 value={dateFrom}
//                 onChange={(e) => handleFilterChange(setDateFrom, e.target.value)}
//                 disabled={isLoading}
//                 className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-700 disabled:opacity-50"
//               />
//             </div>
//             <div>
//               <input
//                 type="date"
//                 value={dateTo}
//                 onChange={(e) => handleFilterChange(setDateTo, e.target.value)}
//                 disabled={isLoading}
//                 className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-700 disabled:opacity-50"
//               />
//             </div>
//           </>
//         )}

//         <div>
//           <select
//             value={statusFilter}
//             onChange={(e) => handleFilterChange(setStatusFilter, e.target.value)}
//             disabled={isLoading}
//             className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-700 disabled:opacity-50"
//           >
//             <option value="All">All Statuses</option>
//             <option value="SCHEDULED">Scheduled</option>
//             <option value="COMPLETED">Completed</option>
//             <option value="CANCELLED">Cancelled</option>
//             <option value="NO_SHOW">No Show</option>
//             <option value="BILLING_CLEARANCE">Billing Clearance</option>
//           </select>
//         </div>

//         <div>
//           <select
//             value={bookingTypeFilter}
//             onChange={(e) => handleFilterChange(setBookingTypeFilter, e.target.value)}
//             disabled={isLoading}
//             className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-700 disabled:opacity-50"
//           >
//             <option value="All">All Booking Types</option>
//             <option value="PRE_BOOKED">Pre-booked</option>
//             <option value="WALK_IN">Walk-in</option>
//           </select>
//         </div>

//         <div>
//           <select
//             value={specializationFilter}
//             onChange={(e) => handleFilterChange(setSpecializationFilter, e.target.value)}
//             disabled={isLoading}
//             className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-700 disabled:opacity-50"
//           >
//             <option value="All">All Specializations</option>
//             {specializations.map(s => (
//               <option key={s.id} value={s.id}>{s.name}</option>
//             ))}
//           </select>
//         </div>

//         <div>
//           <select
//             value={payerFilter}
//             onChange={(e) => handleFilterChange(setPayerFilter, e.target.value)}
//             disabled={isLoading}
//             className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-700 disabled:opacity-50"
//           >
//             <option value="">All Payers</option>
//             {payers.map(p => (
//               <option key={p.id} value={p.id}>{p.name}</option>
//             ))}
//           </select>
//         </div>

//         <div>
//           <select
//             value={doctorFilter}
//             onChange={(e) => handleFilterChange(setDoctorFilter, e.target.value)}
//             disabled={isLoading}
//             className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-700 disabled:opacity-50"
//           >
//             <option value="All">All Doctors</option>
//             {doctors.map(doc => (
//               <option key={doc.doctor_id} value={doc.doctor_id}>Dr. {doc.first_name} {doc.last_name}</option>
//             ))}
//           </select>
//         </div>
//       </div>

//       <div className="overflow-x-auto overflow-y-auto rounded-xl border border-slate-200 flex-1 min-h-[400px] relative">
//         {isLoading && (
//           <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70 backdrop-blur-sm">
//             <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
//           </div>
//         )}
        
//         <table className="w-full text-left text-sm whitespace-nowrap">
//           <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
//             <tr>
//               <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px]">#</th>
//               <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Appt. Code</th>
//               <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Patient</th>
//               <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Date & Time</th>
//               <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Doctor</th>
//               <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Reason</th>
//               <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Status</th>
//               <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Type</th>
//               <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Payer</th>
//               <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Booked By</th>
//             </tr>
//           </thead>
//           <tbody className="divide-y divide-slate-100">
//             {data.length > 0 ? (
//               data.map((row, index) => (
//                 <tr key={row.id || index} className="hover:bg-slate-50/80 transition-colors">
//                   <td className="px-4 py-3 text-slate-500 font-medium text-xs">
//                     {(currentPage - 1) * itemsPerPage + index + 1}
//                   </td>
//                   <td className="px-4 py-3 text-slate-700 font-mono text-xs">
//                     {renderValue(row.appointment_code)}
//                   </td>
//                   <td className="px-4 py-3">
//                     <div className="font-bold text-slate-800">{renderValue(row.patient_name)}</div>
//                     <div className="text-xs text-slate-500 flex gap-2">
//                       <span>{renderValue(row.mrn)}</span>
//                       <span>•</span>
//                       <span>{renderValue(row.age)} yrs</span>
//                     </div>
//                   </td>
//                   <td className="px-4 py-3">
//                     <div className="font-semibold text-slate-700">{renderValue(row.appointment_date)}</div>
//                     <div className="text-xs text-slate-500">{renderValue(row.appointment_time)}</div>
//                   </td>
//                   <td className="px-4 py-3">
//                     <div className="font-bold text-slate-800">{renderValue(row.doctor_name)}</div>
//                     <div className="text-xs text-slate-500">{renderValue(row.specialization_name)}</div>
//                   </td>
//                   <td className="px-4 py-3 text-slate-700">
//                     <div className="max-w-[150px] truncate" title={row.reason_for_visit}>
//                       {renderValue(row.reason_for_visit)}
//                     </div>
//                   </td>
//                   <td className="px-4 py-3">
//                     <StatusBadge status={row.status} />
//                   </td>
//                   <td className="px-4 py-3">
//                     <BookingTypeBadge type={row.booking_type} />
//                   </td>
//                   <td className="px-4 py-3 text-slate-700 text-xs">
//                     {renderValue(row.payer_name)}
//                   </td>
//                   <td className="px-4 py-3 text-slate-500 text-xs">
//                     {renderValue(row.booked_by)}
//                   </td>
//                 </tr>
//               ))
//             ) : (
//               <tr>
//                 <td colSpan={10} className="px-4 py-12 text-center text-slate-400 italic">
//                   {isLoading ? "Loading appointments..." : "No appointment records found."}
//                 </td>
//               </tr>
//             )}
//           </tbody>
//         </table>
//       </div>
      
//       {/* Pagination Footer */}
//       {!isLoading && data.length > 0 && (
//         <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
//           <div className="text-sm text-slate-500 font-medium">
//             Showing <span className="text-slate-900 font-bold">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
//             <span className="text-slate-900 font-bold">
//               {Math.min(currentPage * itemsPerPage, pagination.total_rows)}
//             </span> of{" "}
//             <span className="text-slate-900 font-bold">{pagination.total_rows}</span> records
//           </div>
          
//           <div className="flex items-center gap-2">
//             <div className="flex items-center gap-1 mr-4">
//               <span className="text-xs text-slate-400 font-bold uppercase mr-2">Show</span>
//               <select 
//                 value={itemsPerPage}
//                 onChange={(e) => handleFilterChange(setItemsPerPage, Number(e.target.value))}
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
//                 <span className="text-sm font-bold text-slate-900">{totalPages}</span>
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

// export default AppointmentReport;
