import React, { useState, useEffect, useMemo } from "react";
import { 
  Search, 
  TestTube, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  TrendingUp, 
  Stethoscope, 
  UserCheck, 
  FlaskConical,
  Activity,
  AlertTriangle,
  Download,
  RefreshCw,
  FilterX
} from "lucide-react";
import apiClient from "../../api/client";
import {
  renderValue,
  CustomDateInputs,
  ReportShell,
  KpiCard,
} from "./billingReportShared";

interface SummaryKPIs {
  tests_requested: number;
  tests_completed: number;
  tests_in_progress: number;
  tests_cancelled: number;
  completion_rate_pct?: number;
  cancellation_rate_pct?: number;
  in_progress_rate_pct?: number;
}

interface RankedInvestigation {
  user_id: number;
  ordering_physician: string;
  department: string;
  investigation_name: string;
  service_code?: string;
  total_requests: number;
  completed_count?: number;
  cancelled_count?: number;
}

interface TestPerformance {
  user_id: number;
  lab_personnel: string;
  staff_id: string;
  department: string;
  investigation_name: string;
  total_handled: number;
  completed: number;
  in_progress: number;
  avg_turnaround_time_hrs: number | string;
  sla_status?: string;
}

const LabOperationalReport: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"ranked" | "performance">("ranked");
  const [summaryKPIs, setSummaryKPIs] = useState<SummaryKPIs>({
    tests_requested: 0,
    tests_completed: 0,
    tests_in_progress: 0,
    tests_cancelled: 0,
    completion_rate_pct: 0,
    cancellation_rate_pct: 0,
    in_progress_rate_pct: 0
  });
  const [rankedInvestigations, setRankedInvestigations] = useState<RankedInvestigation[]>([]);
  const [testPerformance, setTestPerformance] = useState<TestPerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [timeframe, setTimeframe] = useState("this_month");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("All");
  const [selectedPersonnel, setSelectedPersonnel] = useState("All");

  const fetchReportData = async () => {
    try {
      setIsLoading(true);

      const params = new URLSearchParams();
      params.append("timeframe", timeframe);
      if (timeframe === "custom") {
        if (dateFrom) params.append("start_date", dateFrom);
        if (dateTo) params.append("end_date", dateTo);
      }
      if (selectedDoctor !== "All") params.append("doctor_id", selectedDoctor);
      if (selectedPersonnel !== "All") params.append("lab_tech_id", selectedPersonnel);

      const response = await apiClient.get(`/report/laboratory/operational-metrics?${params.toString()}`);
      if (response.data && response.data.data) {
        const d = response.data.data;
        setSummaryKPIs(d.summary_kpis || {});
        setRankedInvestigations(d.ranked_investigations_by_user || []);
        setTestPerformance(d.test_performance_by_user || []);
      } else {
        setRankedInvestigations([]);
        setTestPerformance([]);
      }
    } catch (error) {
      console.error("Failed to load lab operational performance metrics:", error);
      setRankedInvestigations([]);
      setTestPerformance([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeframe, dateFrom, dateTo, selectedDoctor, selectedPersonnel]);

  // Unique lists for filter dropdowns
  const doctorOptions = useMemo(() => {
    const map = new Map<number, string>();
    rankedInvestigations.forEach((r) => {
      if (r.user_id && r.ordering_physician) {
        map.set(r.user_id, r.ordering_physician);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [rankedInvestigations]);

  const personnelOptions = useMemo(() => {
    const map = new Map<number, string>();
    testPerformance.forEach((p) => {
      if (p.user_id && p.lab_personnel) {
        map.set(p.user_id, p.lab_personnel);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [testPerformance]);

  // Client-side search filters
  const filteredRanked = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return rankedInvestigations.filter(
      (r) =>
        renderValue(r.investigation_name).toLowerCase().includes(term) ||
        renderValue(r.ordering_physician).toLowerCase().includes(term) ||
        renderValue(r.department).toLowerCase().includes(term)
    );
  }, [rankedInvestigations, searchTerm]);

  const filteredPerformance = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return testPerformance.filter(
      (p) =>
        renderValue(p.lab_personnel).toLowerCase().includes(term) ||
        renderValue(p.staff_id).toLowerCase().includes(term) ||
        renderValue(p.investigation_name).toLowerCase().includes(term) ||
        renderValue(p.department).toLowerCase().includes(term)
    );
  }, [testPerformance, searchTerm]);

  const handleExport = () => {
    const params = new URLSearchParams();
    params.append("timeframe", timeframe);
    params.append("format", "xlsx");
    if (timeframe === "custom") {
      if (dateFrom) params.append("start_date", dateFrom);
      if (dateTo) params.append("end_date", dateTo);
    }
    window.open(`/api/report/laboratory/operational-metrics?${params.toString()}`, "_blank");
  };

  return (
    <ReportShell
      title="Laboratory Operational Metrics"
      subtitle="Standardized HIMS diagnostic volume, bench turnaround tracking, and personnel accountability."
      isLoading={isLoading}
      onClear={() => {
        setSearchTerm("");
        setTimeframe("this_month");
        setDateFrom("");
        setDateTo("");
        setSelectedDoctor("All");
        setSelectedPersonnel("All");
      }}
      onRefresh={fetchReportData}
      exportData={activeTab === "ranked" ? filteredRanked : filteredPerformance}
      exportFilename={activeTab === "ranked" ? "lab_demand_by_doctor" : "lab_staff_bench_performance"}
      filters={
        <>
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder={
                activeTab === "ranked"
                  ? "Search test, ordering doctor, department..."
                  : "Search scientist, test handled, staff ID..."
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={isLoading}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 disabled:opacity-50"
            />
          </div>

          {/* Timeframe Selector with This Year properly enabled */}
          <div>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600/20"
            >
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
              <option value="last_year">Last Year</option>
              <option value="all_time">All Time</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          {/* Doctor Filter */}
          {activeTab === "ranked" && (
            <div>
              <select
                value={selectedDoctor}
                onChange={(e) => setSelectedDoctor(e.target.value)}
                disabled={isLoading}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600/20"
              >
                <option value="All">All Ordering Doctors</option>
                {doctorOptions.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Lab Personnel Filter */}
          {activeTab === "performance" && (
            <div>
              <select
                value={selectedPersonnel}
                onChange={(e) => setSelectedPersonnel(e.target.value)}
                disabled={isLoading}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600/20"
              >
                <option value="All">All Lab Personnel</option>
                {personnelOptions.map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    {tech.name}
                  </option>
                ))}
              </select>
            </div>
          )}

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
      {/* ---------------- 1. Primary Volume KPIs & Rates ---------------- */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3.5 mb-6">
        <KpiCard
          icon={TestTube}
          label="Tests Requested"
          value={summaryKPIs.tests_requested ?? 0}
          colorClass="bg-blue-50 border-blue-100 text-blue-900"
        />
        <KpiCard
          icon={CheckCircle2}
          label="Tests Completed"
          value={summaryKPIs.tests_completed ?? 0}
          colorClass="bg-emerald-50 border-emerald-100 text-emerald-900"
        />
        <KpiCard
          icon={Clock}
          label="Tests In-Progress"
          value={summaryKPIs.tests_in_progress ?? 0}
          colorClass="bg-amber-50 border-amber-100 text-amber-900"
        />
        <KpiCard
          icon={XCircle}
          label="Tests Cancelled"
          value={summaryKPIs.tests_cancelled ?? 0}
          colorClass="bg-rose-50 border-rose-100 text-rose-900"
        />
        <KpiCard
          icon={TrendingUp}
          label="Completion Rate"
          value={`${summaryKPIs.completion_rate_pct ?? 0}%`}
          colorClass="bg-indigo-50 border-indigo-100 text-indigo-900"
        />
        <KpiCard
          icon={AlertTriangle}
          label="Rejection / Cancel Rate"
          value={`${summaryKPIs.cancellation_rate_pct ?? 0}%`}
          colorClass={
            (summaryKPIs.cancellation_rate_pct || 0) > 4
              ? "bg-rose-100 border-rose-200 text-rose-900"
              : "bg-slate-100 border-slate-200 text-slate-800"
          }
        />
      </div>

      {/* ---------------- 2. Sub-Navigation Tabs ---------------- */}
      <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
        <button
          onClick={() => setActiveTab("ranked")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "ranked"
              ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <Stethoscope size={15} />
          Ranked Investigations by Requesting Doctor ({filteredRanked.length})
        </button>

        <button
          onClick={() => setActiveTab("performance")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "performance"
              ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <UserCheck size={15} />
          Bench Performance by Lab Personnel ({filteredPerformance.length})
        </button>
      </div>

      {/* ---------------- 3. Data Tables ---------------- */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 min-h-[350px]">
        {activeTab === "ranked" ? (
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 text-[11px] font-black uppercase text-slate-600 tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Rank</th>
                <th className="px-4 py-3.5">Investigation / Test Name</th>
                <th className="px-4 py-3.5">Ordering Physician</th>
                <th className="px-4 py-3.5">Department</th>
                <th className="px-4 py-3.5 text-center">Completed</th>
                <th className="px-4 py-3.5 text-center">Cancelled</th>
                <th className="px-4 py-3.5 text-right">Total Demand</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRanked.length > 0 ? (
                filteredRanked.map((row, idx) => (
                  <tr key={`${row.user_id}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 text-xs font-bold text-slate-400">#{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-800 flex items-center gap-2">
                        <FlaskConical size={14} className="text-indigo-600 shrink-0" />
                        {renderValue(row.investigation_name)}
                      </div>
                      {row.service_code && (
                        <div className="text-[10px] text-slate-400 font-mono ml-5">
                          {row.service_code}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-700">
                      {renderValue(row.ordering_physician)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-medium">
                        {renderValue(row.department)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold text-xs">
                        {row.completed_count ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-100 font-bold text-xs">
                        {row.cancelled_count ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="px-3 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 font-black text-xs">
                        {row.total_requests} requests
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400 italic">
                    {isLoading ? "Compiling demand rankings..." : "No investigation demand records found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 text-[11px] font-black uppercase text-slate-600 tracking-wider">
              <tr>
                <th className="px-4 py-3.5">#</th>
                <th className="px-4 py-3.5">Lab Personnel</th>
                <th className="px-4 py-3.5">Staff ID</th>
                <th className="px-4 py-3.5">Test Processed</th>
                <th className="px-4 py-3.5 text-center">Handled</th>
                <th className="px-4 py-3.5 text-center">Completed</th>
                <th className="px-4 py-3.5 text-center">In-Progress</th>
                <th className="px-4 py-3.5 text-center">Avg TAT</th>
                <th className="px-4 py-3.5 text-right">SLA Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPerformance.length > 0 ? (
                filteredPerformance.map((row, idx) => (
                  <tr key={`${row.user_id}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 text-xs font-bold text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-3 font-bold text-slate-800">
                      {renderValue(row.lab_personnel)}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-slate-500">
                      {renderValue(row.staff_id)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-700">
                      {renderValue(row.investigation_name)}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-slate-900">
                      {row.total_handled}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold text-xs">
                        {row.completed}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-100 font-bold text-xs">
                        {row.in_progress}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-mono font-bold text-slate-800 text-xs">
                        {row.avg_turnaround_time_hrs !== null ? `${row.avg_turnaround_time_hrs} hrs` : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {row.sla_status === "BREACHED" ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-black uppercase tracking-wider">
                          Delayed
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase tracking-wider">
                          Within SLA
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400 italic">
                    {isLoading ? "Compiling scientist productivity metrics..." : "No lab test performance records found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </ReportShell>
  );
};

export default LabOperationalReport;

// import React, { useState, useEffect, useMemo } from "react";
// import { 
//   Search, 
//   TestTube, 
//   CheckCircle2, 
//   Clock, 
//   XCircle, 
//   TrendingUp, 
//   Stethoscope, 
//   UserCheck, 
//   FlaskConical,
//   Activity
// } from "lucide-react";
// import apiClient from "../../api/client";
// import {
//   renderValue,
//   badgeClass,
//   TimeframeSelect,
//   CustomDateInputs,
//   buildTimeframeParams,
//   ReportShell,
//   KpiCard,
// } from "./billingReportShared";

// interface SummaryKPIs {
//   tests_requested: number;
//   tests_completed: number;
//   tests_in_progress: number;
//   tests_cancelled: number;
//   completion_rate_pct?: number;
//   cancellation_rate_pct?: number;
// }

// interface RankedInvestigation {
//   user_id: number;
//   ordering_physician: string;
//   department: string;
//   investigation_name: string;
//   total_requests: number;
// }

// interface TestPerformance {
//   user_id: number;
//   lab_personnel: string;
//   staff_id: string;
//   department: string;
//   investigation_name: string;
//   total_handled: number;
//   completed: number;
//   in_progress: number;
//   avg_turnaround_time_hrs: number | string;
// }

// const LabOperationalReport: React.FC = () => {
//   const [activeTab, setActiveTab] = useState<"ranked" | "performance">("ranked");
//   const [summaryKPIs, setSummaryKPIs] = useState<SummaryKPIs>({
//     tests_requested: 0,
//     tests_completed: 0,
//     tests_in_progress: 0,
//     tests_cancelled: 0,
//     completion_rate_pct: 0,
//     cancellation_rate_pct: 0,
//   });
//   const [rankedInvestigations, setRankedInvestigations] = useState<RankedInvestigation[]>([]);
//   const [testPerformance, setTestPerformance] = useState<TestPerformance[]>([]);
//   const [isLoading, setIsLoading] = useState(true);

//   // Filters
//   const [searchTerm, setSearchTerm] = useState("");
//   const [timeframe, setTimeframe] = useState("this_month");
//   const [dateFrom, setDateFrom] = useState("");
//   const [dateTo, setDateTo] = useState("");

//   const fetchReportData = async () => {
//     try {
//       setIsLoading(true);
//       const params = buildTimeframeParams(timeframe, dateFrom, dateTo);

//       const response = await apiClient.get(`/report/laboratory/operational-metrics?${params.join("&")}`);
//       if (response.data && response.data.data) {
//         const d = response.data.data;
//         setSummaryKPIs(d.summary_kpis || {});
//         setRankedInvestigations(d.ranked_investigations_by_user || []);
//         setTestPerformance(d.test_performance_by_user || []);
//       } else {
//         setRankedInvestigations([]);
//         setTestPerformance([]);
//       }
//     } catch (error) {
//       console.error("Failed to load lab operational performance metrics:", error);
//       setRankedInvestigations([]);
//       setTestPerformance([]);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchReportData();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [timeframe, dateFrom, dateTo]);

//   // Client-side instant filter on active data
//   const filteredRanked = useMemo(() => {
//     const term = searchTerm.toLowerCase();
//     return rankedInvestigations.filter(
//       (r) =>
//         renderValue(r.investigation_name).toLowerCase().includes(term) ||
//         renderValue(r.ordering_physician).toLowerCase().includes(term) ||
//         renderValue(r.department).toLowerCase().includes(term)
//     );
//   }, [rankedInvestigations, searchTerm]);

//   const filteredPerformance = useMemo(() => {
//     const term = searchTerm.toLowerCase();
//     return testPerformance.filter(
//       (p) =>
//         renderValue(p.lab_personnel).toLowerCase().includes(term) ||
//         renderValue(p.staff_id).toLowerCase().includes(term) ||
//         renderValue(p.investigation_name).toLowerCase().includes(term) ||
//         renderValue(p.department).toLowerCase().includes(term)
//     );
//   }, [testPerformance, searchTerm]);

//   const currentExportData = activeTab === "ranked" ? filteredRanked : filteredPerformance;
//   const currentExportFilename =
//     activeTab === "ranked" ? "lab_ranked_investigations_by_user" : "lab_test_performance_by_user";

//   return (
//     <ReportShell
//       title="Laboratory Operational Metrics"
//       subtitle="Audited test demand, completion metrics, and staff workload analytics without heavy parameter overhead."
//       isLoading={isLoading}
//       onClear={() => {
//         setSearchTerm("");
//         setTimeframe("this_month");
//         setDateFrom("");
//         setDateTo("");
//       }}
//       onRefresh={fetchReportData}
//       exportData={currentExportData}
//       exportFilename={currentExportFilename}
//       filters={
//         <>
//           <div className="relative lg:col-span-2">
//             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
//             <input
//               type="text"
//               placeholder={
//                 activeTab === "ranked"
//                   ? "Filter by test name, doctor, department..."
//                   : "Filter by lab scientist, test, staff ID..."
//               }
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//               disabled={isLoading}
//               className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 disabled:opacity-50"
//             />
//           </div>

//           <TimeframeSelect value={timeframe} onChange={setTimeframe} disabled={isLoading} />

//           {timeframe === "custom" && (
//             <CustomDateInputs
//               dateFrom={dateFrom}
//               dateTo={dateTo}
//               setDateFrom={setDateFrom}
//               setDateTo={setDateTo}
//               disabled={isLoading}
//             />
//           )}
//         </>
//       }
//     >
//       {/* ---------------- 1. Primary Volume KPIs ---------------- */}
//       <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3.5 mb-6">
//         <KpiCard
//           icon={TestTube}
//           label="Tests Requested"
//           value={summaryKPIs.tests_requested ?? 0}
//           colorClass="bg-blue-50 border-blue-100 text-blue-900"
//         />
//         <KpiCard
//           icon={CheckCircle2}
//           label="Tests Completed"
//           value={summaryKPIs.tests_completed ?? 0}
//           colorClass="bg-emerald-50 border-emerald-100 text-emerald-900"
//         />
//         <KpiCard
//           icon={Clock}
//           label="Tests In-Progress"
//           value={summaryKPIs.tests_in_progress ?? 0}
//           colorClass="bg-amber-50 border-amber-100 text-amber-900"
//         />
//         <KpiCard
//           icon={XCircle}
//           label="Tests Cancelled"
//           value={summaryKPIs.tests_cancelled ?? 0}
//           colorClass="bg-rose-50 border-rose-100 text-rose-900"
//         />
//         <KpiCard
//           icon={TrendingUp}
//           label="Completion Rate"
//           value={`${summaryKPIs.completion_rate_pct ?? 0}%`}
//           colorClass="bg-indigo-50 border-indigo-100 text-indigo-900"
//         />
//         <KpiCard
//           icon={Activity}
//           label="Cancellation Rate"
//           value={`${summaryKPIs.cancellation_rate_pct ?? 0}%`}
//           colorClass="bg-slate-100 border-slate-200 text-slate-800"
//         />
//       </div>

//       {/* ---------------- 2. Sub-Navigation Tabs ---------------- */}
//       <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
//         <button
//           onClick={() => setActiveTab("ranked")}
//           className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
//             activeTab === "ranked"
//               ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
//               : "bg-slate-100 text-slate-600 hover:bg-slate-200"
//           }`}
//         >
//           <Stethoscope size={15} />
//           Ranked Investigations by Doctor ({filteredRanked.length})
//         </button>

//         <button
//           onClick={() => setActiveTab("performance")}
//           className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
//             activeTab === "performance"
//               ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
//               : "bg-slate-100 text-slate-600 hover:bg-slate-200"
//           }`}
//         >
//           <UserCheck size={15} />
//           Test Performance by Lab Personnel ({filteredPerformance.length})
//         </button>
//       </div>

//       {/* ---------------- 3. Active Tab Data Tables ---------------- */}
//       <div className="overflow-x-auto rounded-xl border border-slate-200 min-h-[350px]">
//         {activeTab === "ranked" ? (
//           /* TAB A: Ranked Investigations Arranged by Requesting Users */
//           <table className="w-full text-left text-sm whitespace-nowrap">
//             <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 text-[11px] font-black uppercase text-slate-600 tracking-wider">
//               <tr>
//                 <th className="px-4 py-3.5">Rank</th>
//                 <th className="px-4 py-3.5">Investigation / Test Name</th>
//                 <th className="px-4 py-3.5">Ordering Physician</th>
//                 <th className="px-4 py-3.5">Department</th>
//                 <th className="px-4 py-3.5 text-right">Total Requests</th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-slate-100">
//               {filteredRanked.length > 0 ? (
//                 filteredRanked.map((row, idx) => (
//                   <tr key={`${row.user_id}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
//                     <td className="px-4 py-3 text-xs font-bold text-slate-400">#{idx + 1}</td>
//                     <td className="px-4 py-3">
//                       <div className="font-bold text-slate-800 flex items-center gap-2">
//                         <FlaskConical size={14} className="text-indigo-600 shrink-0" />
//                         {renderValue(row.investigation_name)}
//                       </div>
//                     </td>
//                     <td className="px-4 py-3 font-semibold text-slate-700">
//                       {renderValue(row.ordering_physician)}
//                     </td>
//                     <td className="px-4 py-3 text-xs text-slate-500">
//                       <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-medium">
//                         {renderValue(row.department)}
//                       </span>
//                     </td>
//                     <td className="px-4 py-3 text-right">
//                       <span className="px-3 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 font-black text-xs">
//                         {row.total_requests} requests
//                       </span>
//                     </td>
//                   </tr>
//                 ))
//               ) : (
//                 <tr>
//                   <td colSpan={5} className="px-4 py-12 text-center text-slate-400 italic">
//                     {isLoading ? "Compiling demand rankings..." : "No investigation demand records found."}
//                   </td>
//                 </tr>
//               )}
//             </tbody>
//           </table>
//         ) : (
//           /* TAB B: Performance of Lab Tests Arranged by Lab Scientists/Techs */
//           <table className="w-full text-left text-sm whitespace-nowrap">
//             <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 text-[11px] font-black uppercase text-slate-600 tracking-wider">
//               <tr>
//                 <th className="px-4 py-3.5">#</th>
//                 <th className="px-4 py-3.5">Lab Personnel</th>
//                 <th className="px-4 py-3.5">Staff ID</th>
//                 <th className="px-4 py-3.5">Test Processed</th>
//                 <th className="px-4 py-3.5 text-center">Handled</th>
//                 <th className="px-4 py-3.5 text-center">Completed</th>
//                 <th className="px-4 py-3.5 text-center">In-Progress</th>
//                 <th className="px-4 py-3.5 text-right">Avg TAT</th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-slate-100">
//               {filteredPerformance.length > 0 ? (
//                 filteredPerformance.map((row, idx) => (
//                   <tr key={`${row.user_id}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
//                     <td className="px-4 py-3 text-xs font-bold text-slate-400">{idx + 1}</td>
//                     <td className="px-4 py-3 font-bold text-slate-800">
//                       {renderValue(row.lab_personnel)}
//                     </td>
//                     <td className="px-4 py-3 text-xs font-mono text-slate-500">
//                       {renderValue(row.staff_id)}
//                     </td>
//                     <td className="px-4 py-3 font-semibold text-slate-700">
//                       {renderValue(row.investigation_name)}
//                     </td>
//                     <td className="px-4 py-3 text-center">
//                       <span className="font-bold text-slate-900">{row.total_handled}</span>
//                     </td>
//                     <td className="px-4 py-3 text-center">
//                       <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold text-xs">
//                         {row.completed}
//                       </span>
//                     </td>
//                     <td className="px-4 py-3 text-center">
//                       <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-100 font-bold text-xs">
//                         {row.in_progress}
//                       </span>
//                     </td>
//                     <td className="px-4 py-3 text-right">
//                       <span className="font-mono font-bold text-slate-800 text-xs">
//                         {row.avg_turnaround_time_hrs !== null ? `${row.avg_turnaround_time_hrs} hrs` : "—"}
//                       </span>
//                     </td>
//                   </tr>
//                 ))
//               ) : (
//                 <tr>
//                   <td colSpan={8} className="px-4 py-12 text-center text-slate-400 italic">
//                     {isLoading ? "Compiling scientist productivity metrics..." : "No lab test performance records found."}
//                   </td>
//                 </tr>
//               )}
//             </tbody>
//           </table>
//         )}
//       </div>
//     </ReportShell>
//   );
// };

// export default LabOperationalReport;