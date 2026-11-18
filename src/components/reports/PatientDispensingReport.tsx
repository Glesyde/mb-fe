import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Search, 
  Pill, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Stethoscope, 
  UserCheck, 
  Download,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  FileText,
  File as FilePdf,
  RefreshCw,
  FilterX,
  Activity,
  AlertOctagon,
  Info
} from "lucide-react";
import { exportToCSV, exportToExcel, exportToPDF } from "../../utils/exportUtils";
import apiClient from "../../api/client";
import {
  renderValue,
  CustomDateInputs,
  ReportShell,
  KpiCard,
} from "./billingReportShared";
import { i18n } from "../../i18n";

interface DispensingRecord {
  dispense_id?: number;
  dispense_ref: string;
  dispensed_at?: string;
  prescription_id: number;
  prescribed_at: string;
  patient_id: number;
  mrn: string;
  patient_name: string;
  gender: string;
  age_years: number;
  medication_name: string;
  strength?: string;
  formulation?: string;
  clinical_regimen: string;
  route: string;
  instructions?: string;
  qty_prescribed: number;
  dosage_unit: string;
  qty_dispensed: number;
  balance_remaining: number;
  prescribing_doctor: string;
  doctor_department: string;
  dispensed_by_pharmacist: string;
  fulfillment_audit_status: "FULLY_DISPENSED" | "PARTIALLY_DISPENSED" | "PENDING_DISPENSE" | "CANCELLED";
}

interface Aggregates {
  total_prescriptions_reviewed: number;
  fully_dispensed: number;
  partially_dispensed: number;
  pending_dispense: number;
  total_units_prescribed?: number;
  total_units_dispensed?: number;
  overall_fulfillment_rate_pct?: number;
}

const AuditBadge: React.FC<{ status: string }> = ({ status }) => {
  switch (status) {
    case "FULLY_DISPENSED":
      return (
        <span className="px-2.5 py-1 text-xs font-black rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">{i18n.t("Fully Dispensed")}</span>
      );
    case "PARTIALLY_DISPENSED":
      return (
        <span className="px-2.5 py-1 text-xs font-black rounded-full bg-amber-50 text-amber-700 border border-amber-200">{i18n.t("Partial Dispense")}</span>
      );
    case "PENDING_DISPENSE":
      return (
        <span className="px-2.5 py-1 text-xs font-black rounded-full bg-sky-50 text-sky-700 border border-sky-200">{i18n.t("Awaiting Dispense")}</span>
      );
    case "CANCELLED":
      return (
        <span className="px-2.5 py-1 text-xs font-black rounded-full bg-rose-50 text-rose-700 border border-rose-200">{i18n.t("Cancelled")}</span>
      );
    default:
      return (
        <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-600 border border-slate-200">
          {status}
        </span>
      );
  }
};

const PatientDispensingReport: React.FC = () => {
  const [records, setRecords] = useState<DispensingRecord[]>([]);
  const [aggregates, setAggregates] = useState<Aggregates>({
    total_prescriptions_reviewed: 0,
    fully_dispensed: 0,
    partially_dispensed: 0,
    pending_dispense: 0,
    total_units_prescribed: 0,
    total_units_dispensed: 0,
    overall_fulfillment_rate_pct: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [timeframe, setTimeframe] = useState("this_month");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedDoctor, setSelectedDoctor] = useState("All");
  const [selectedPharmacist, setSelectedPharmacist] = useState("All");

  // Export dropdown
  const [isExportOpen, setIsExportOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
// Add Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const fetchReportData = async () => {
    try {
      setIsLoading(true);

      const params: any = {
        timeframe,
        page: currentPage,
        limit: itemsPerPage
      };

      if (timeframe === "custom") {
        if (dateFrom) params.start_date = dateFrom;
        if (dateTo) params.end_date = dateTo;
      }

      if (statusFilter !== "All") params.status = statusFilter;
      if (selectedDoctor !== "All") params.doctor_id = selectedDoctor;
      if (selectedPharmacist !== "All") params.pharmacist_id = selectedPharmacist;
      if (debouncedSearch) params.search = debouncedSearch;

      const response = await apiClient.get("/pharmacy/dispensing/report", { params });
      if (response.data && response.data.data) {
        const d = response.data.data;
        setRecords(d.records || []);
        setAggregates(d.aggregates || {});

        if (d.metadata?.pagination) {
          setTotalPages(d.metadata.pagination.total_pages || 1);
          setTotalRecords(d.metadata.pagination.total_records || 0);
        }
      } else {
        setRecords([]);
      }
    } catch (error) {
      console.error("Failed to load medication dispensing records:", error);
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset to page 1 whenever any filter changes
  const handleFilterChange = (setter: any, val: any) => {
    setter(val);
    setCurrentPage(1);
  };



  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

//   const fetchReportData = async () => {
//     try {
//       setIsLoading(true);

//       const params: any = {
//         timeframe,
//         limit: 250 // Exhaustive ledger review limit
//       };

//       if (timeframe === "custom") {
//         if (dateFrom) params.start_date = dateFrom;
//         if (dateTo) params.end_date = dateTo;
//       }

//       if (statusFilter !== "All") params.status = statusFilter;
//       if (selectedDoctor !== "All") params.doctor_id = selectedDoctor;
//       if (selectedPharmacist !== "All") params.pharmacist_id = selectedPharmacist;
//       if (debouncedSearch) params.search = debouncedSearch;

//       const response = await apiClient.get("/pharmacy/dispensing/report", { params });
//       if (response.data && response.data.data) {
//         setRecords(response.data.data.records || []);
//         setAggregates(response.data.data.aggregates || {});
//       } else {
//         setRecords([]);
//       }
//     } catch (error) {
//       console.error("Failed to load medication dispensing records:", error);
//       setRecords([]);
//     } finally {
//       setIsLoading(false);
//     }
//   };

  useEffect(() => {
    fetchReportData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeframe, dateFrom, dateTo, statusFilter, selectedDoctor, selectedPharmacist, debouncedSearch]);

  // Dynamic filter dropdown options extracted from active dataset
  const doctorOptions = useMemo(() => {
    const map = new Map<string, string>();
    records.forEach((r) => {
      if (r.prescribing_doctor && r.prescribing_doctor !== "Unassigned Doctor") {
        map.set(r.prescribing_doctor, r.prescribing_doctor);
      }
    });
    return Array.from(map.values());
  }, [records]);

  const pharmacistOptions = useMemo(() => {
    const map = new Map<string, string>();
    records.forEach((r) => {
      if (r.dispensed_by_pharmacist && r.dispensed_by_pharmacist !== "Not Dispensed") {
        map.set(r.dispensed_by_pharmacist, r.dispensed_by_pharmacist);
      }
    });
    return Array.from(map.values());
  }, [records]);

  const handleClear = () => {
    setSearchTerm("");
    setTimeframe("this_month");
    setDateFrom("");
    setDateTo("");
    setStatusFilter("All");
    setSelectedDoctor("All");
    setSelectedPharmacist("All");
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsExportOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleExportCSV = () => {
    exportToCSV(records, "patient_medication_dispensation_register");
    setIsExportOpen(false);
  };

  const handleExportExcel = () => {
    exportToExcel(records, "patient_medication_dispensation_register");
    setIsExportOpen(false);
  };

  const handleExportPDF = () => {
    exportToPDF(records, "patient_medication_dispensation_register", "Patient Medication Dispensation Register");
    setIsExportOpen(false);
  };

  return (
    <ReportShell
      title={i18n.t("Patient Medication Dispensation Register")}
      subtitle={i18n.t("Reconciled audit register of clinical prescription orders, prescribing physicians, patient identity, and dispensed medications.")}
      isLoading={isLoading}
      onClear={handleClear}
      onRefresh={fetchReportData}
      exportData={records}
      exportFilename="patient_medication_dispensation_register"
      filters={
        <>
          {/* Universal Search Bar */}
          <div className="relative lg:col-span-2">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder={i18n.t("Search patient, MRN, drug, doctor, pharmacist, or ref...")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={isLoading}
              className="w-full ps-10 pe-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 disabled:opacity-50 font-medium"
            />
          </div>

          {/* Timeframe Selector */}
          <div>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600/20"
            >
              <option value="today">{i18n.t("Today")}</option>
              <option value="yesterday">{i18n.t("Yesterday")}</option>
              <option value="this_week">{i18n.t("This Week")}</option>
              <option value="last_week">{i18n.t("Last Week")}</option>
              <option value="last_7_days">{i18n.t("Last 7 Days")}</option>
              <option value="last_30_days">{i18n.t("Last 30 Days")}</option>
              <option value="this_month">{i18n.t("This Month")}</option>
              <option value="last_month">{i18n.t("Last Month")}</option>
              <option value="last_3_months">{i18n.t("Last 3 Months")}</option>
              <option value="this_year">{i18n.t("This Year")}</option>
              <option value="last_year">{i18n.t("Last Year")}</option>
              <option value="all_time">{i18n.t("All Time")}</option>
              <option value="custom">{i18n.t("Custom Date Range")}</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600/20"
            >
              <option value="All">{i18n.t("All Dispense Statuses")}</option>
              <option value="FULLY_DISPENSED">{i18n.t("Fully Dispensed")}</option>
              <option value="PARTIALLY_DISPENSED">{i18n.t("Partially Dispensed")}</option>
              <option value="PENDING_DISPENSE">{i18n.t("Awaiting Dispensing")}</option>
              <option value="CANCELLED">{i18n.t("Cancelled Prescriptions")}</option>
            </select>
          </div>

          {/* Prescribing Doctor Filter */}
          <div>
            <select
              value={selectedDoctor}
              onChange={(e) => setSelectedDoctor(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600/20"
            >
              <option value="All">{i18n.t("All Prescribing Doctors")}</option>
              {doctorOptions.map((doc) => (
                <option key={doc} value={doc}>
                  {doc}
                </option>
              ))}
            </select>
          </div>

          {/* Dispensing Pharmacist Filter */}
          <div>
            <select
              value={selectedPharmacist}
              onChange={(e) => setSelectedPharmacist(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600/20"
            >
              <option value="All">{i18n.t("All Dispensing Staff")}</option>
              {pharmacistOptions.map((pharm) => (
                <option key={pharm} value={pharm}>
                  {pharm}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Date Pickers */}
          {timeframe === "custom" && (
            <CustomDateInputs
              dateFrom={dateFrom}
              dateTo={dateTo}
              setDateFrom={setDateFrom}
              setDateTo={setDateTo}
              disabled={isLoading}
            />
          )}
        </>
      }
    >
      {/* ---------------- 1. Summary KPI Cards ---------------- */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3.5 mb-6">
        <KpiCard
          icon={Pill}
          label={i18n.t("Prescriptions Audited")}
          value={aggregates.total_prescriptions_reviewed ?? records.length}
          colorClass="bg-blue-50 border-blue-100 text-blue-900"
        />
        <KpiCard
          icon={CheckCircle2}
          label={i18n.t("Fully Dispensed")}
          value={aggregates.fully_dispensed ?? 0}
          colorClass="bg-emerald-50 border-emerald-100 text-emerald-900"
        />
        <KpiCard
          icon={AlertCircle}
          label={i18n.t("Partially Dispensed")}
          value={aggregates.partially_dispensed ?? 0}
          colorClass="bg-amber-50 border-amber-100 text-amber-900"
        />
        <KpiCard
          icon={Clock}
          label={i18n.t("Pending at Counter")}
          value={aggregates.pending_dispense ?? 0}
          colorClass="bg-sky-50 border-sky-100 text-sky-900"
        />
        <KpiCard
          icon={Activity}
          label={i18n.t("Fulfillment Rate")}
          value={`${aggregates.overall_fulfillment_rate_pct ?? 0}%`}
          colorClass="bg-indigo-50 border-indigo-100 text-indigo-900"
        />
      </div>

      {/* ---------------- 2. Dispensation Register Table ---------------- */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 min-h-[420px] bg-white">
        <table className="w-full text-start text-sm whitespace-nowrap">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 text-[11px] font-black uppercase text-slate-600 tracking-wider">
            <tr>
              <th className="px-3 py-3.5 w-10"></th>
              <th className="px-4 py-3.5">#</th>
              <th className="px-4 py-3.5">{i18n.t("Patient Details")}</th>
              <th className="px-4 py-3.5">{i18n.t("Prescribed Medication")}</th>
              <th className="px-4 py-3.5">{i18n.t("Clinical Regimen")}</th>
              <th className="px-4 py-3.5 text-center">{i18n.t("Prescribed")}</th>
              <th className="px-4 py-3.5 text-center">{i18n.t("Dispensed")}</th>
              <th className="px-4 py-3.5">{i18n.t("Prescribing Physician")}</th>
              <th className="px-4 py-3.5">{i18n.t("Dispensed By")}</th>
              <th className="px-4 py-3.5 text-end">{i18n.t("Audit Status")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.length > 0 ? (
              records.map((row, idx) => (
                <React.Fragment key={`${row.prescription_id}-${idx}`}>
                  <tr 
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    onClick={() => setExpandedId(expandedId === row.prescription_id ? null : row.prescription_id)}
                  >
                    {/* Expand/Collapse Chevron */}
                    <td className="px-3 py-3.5 text-slate-400 text-center">
                      {expandedId === row.prescription_id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </td>

                    {/* Sequential Index */}
                    <td className="px-4 py-3 text-xs font-bold text-slate-400">
                      {idx + 1}
                    </td>

                    {/* Patient Identification */}
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{renderValue(row.patient_name)}</div>
                      <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                        <span className="font-semibold text-slate-700">{i18n.t("MRN:")}{" "}{renderValue(row.mrn)}</span>
                        <span>•</span>
                        <span>{row.age_years || "—"}{i18n.t("y")}</span>
                        <span>•</span>
                        <span>{renderValue(row.gender)}</span>
                      </div>
                    </td>

                    {/* Prescribed Drug & Formulation */}
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Pill size={15} className="text-indigo-600 shrink-0" />
                        {renderValue(row.medication_name)}
                      </div>
                      {(row.strength || row.formulation) && (
                        <div className="text-[11px] text-slate-400 ms-5 font-medium">
                          {[row.strength, row.formulation].filter(Boolean).join(" • ")}
                        </div>
                      )}
                    </td>

                    {/* Clinical Regimen & Route */}
                    <td className="px-4 py-3 text-xs text-slate-700">
                      <div className="font-semibold">{renderValue(row.clinical_regimen)}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{i18n.t("Route:")}{" "}<span className="font-bold uppercase text-slate-600">{renderValue(row.route)}</span>
                      </div>
                    </td>

                    {/* Prescribed Quantity */}
                    <td className="px-4 py-3 text-center font-bold text-slate-800">
                      {row.qty_prescribed} {row.dosage_unit}
                    </td>

                    {/* Dispensed Quantity & Balance */}
                    <td className="px-4 py-3 text-center">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-black text-xs border border-emerald-200">
                        {row.qty_dispensed} {row.dosage_unit}
                      </span>
                      {row.balance_remaining > 0 && (
                        <div className="text-[10px] text-amber-600 font-bold mt-0.5">{i18n.t("Bal:")}{" "}{row.balance_remaining}
                        </div>
                      )}
                    </td>

                    {/* Prescribing Doctor */}
                    <td className="px-4 py-3 text-xs">
                      <div className="font-bold text-slate-800 flex items-center gap-1">
                        <Stethoscope size={13} className="text-slate-400 shrink-0" />
                        {renderValue(row.prescribing_doctor)}
                      </div>
                      <div className="text-[10px] text-slate-400 ms-4">
                        {renderValue(row.doctor_department)} • {row.prescribed_at?.slice(0, 10)}
                      </div>
                    </td>

                    {/* Dispensing Pharmacist */}
                    <td className="px-4 py-3 text-xs">
                      <div className="font-bold text-slate-800 flex items-center gap-1">
                        <UserCheck size={13} className="text-emerald-600 shrink-0" />
                        {renderValue(row.dispensed_by_pharmacist)}
                      </div>
                      {row.dispensed_at ? (
                        <div className="text-[10px] text-slate-400 ms-4 font-mono">{i18n.t("Ref:")}{" "}{row.dispense_ref} ({row.dispensed_at.slice(0, 16)})
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400 ms-4 italic">{i18n.t("Awaiting Dispensing")}</div>
                      )}
                    </td>

                    {/* Audit Status */}
                    <td className="px-4 py-3 text-end">
                      <AuditBadge status={row.fulfillment_audit_status} />
                    </td>
                  </tr>

                  {/* Expandable Clinical Regimen Details Drawer */}
                  {expandedId === row.prescription_id && (
                    <tr>
                      <td colSpan={10} className="px-4 py-3.5 bg-slate-50/80 border-b border-slate-200">
                        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                          <div>
                            <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 block mb-1">{i18n.t("Clinical Instructions & Timing")}</span>
                            <p className="font-semibold text-slate-700">
                              {renderValue(row.instructions) || i18n.t("Standard prescribed dosing frequency applies.")}
                            </p>
                          </div>

                          <div>
                            <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 block mb-1">{i18n.t("Prescription Timeline & Verification")}</span>
                            <div className="text-slate-600 space-y-0.5">
                              <div>{i18n.t("Ordered:")}{" "}<span className="font-semibold text-slate-900">{row.prescribed_at}</span></div>
                              <div>{i18n.t("Dispensed:")}{" "}<span className="font-semibold text-slate-900">{row.dispensed_at || i18n.t("Pending Handover")}</span></div>
                            </div>
                          </div>

                          <div>
                            <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 block mb-1">{i18n.t("Dispense Authentication Reference")}</span>
                            <div className="text-slate-600 space-y-0.5">
                              <div>{i18n.t("Receipt / Accession:")}{" "}<span className="font-mono font-bold text-slate-800">{row.dispense_ref}</span></div>
                              <div>{i18n.t("Pharmacist on Duty:")}{" "}<span className="font-semibold text-slate-900">{row.dispensed_by_pharmacist}</span></div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            ) : (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-slate-400 italic">
                  {isLoading 
                    ? i18n.t("Compiling patient medication dispensation ledger...") 
                    : i18n.t("No medication dispensing records found for the selected timeframe and criteria.")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ---------------- Pagination Footer ---------------- */}
      {!isLoading && totalRecords > 0 && (
        <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="text-xs text-slate-500 font-semibold">{i18n.t("Showing")}{" "}<span className="text-slate-900 font-bold">{(currentPage - 1) * itemsPerPage + 1}</span>{" "}{i18n.t("to")}{" "}
            <span className="text-slate-900 font-bold">{Math.min(currentPage * itemsPerPage, totalRecords)}</span>{" "}{i18n.t("of")}{" "}
            <span className="text-slate-900 font-bold">{totalRecords}</span>{" "}{i18n.t("prescriptions")}</div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 font-bold uppercase">{i18n.t("Show")}</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-200 rounded-lg text-xs font-bold px-2 py-1 outline-none"
              >
                {[25, 50, 100, 250].map((val) => (
                  <option key={val} value={val}>{val}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 hover:bg-slate-50"
              >{i18n.t("Prev")}</button>
              <span className="text-xs font-bold text-slate-800 px-2">{i18n.t("Page")}{" "}{currentPage}{" "}{i18n.t("of")}{" "}{totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 hover:bg-slate-50"
              >{i18n.t("Next")}</button>
            </div>
          </div>
        </div>
      )}
      
    </ReportShell>
  );
};

export default PatientDispensingReport;