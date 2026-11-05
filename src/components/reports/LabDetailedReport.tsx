import React, { useState, useEffect } from "react";
import { Search, ChevronDown, ChevronUp, ClipboardCheck, TestTube, CheckCircle2, Wallet } from "lucide-react";
import apiClient from "../../api/client";
import {
  renderValue,
  formatCurrency,
  badgeClass,
  TimeframeSelect,
  CustomDateInputs,
  buildTimeframeParams,
  ReportShell,
  KpiCard,
} from "./billingReportShared";

const LabDetailedReport: React.FC = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [aggregates, setAggregates] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [timeframe, setTimeframe] = useState("all_time");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [workflowStatus, setWorkflowStatus] = useState("All");

  const fetchReportData = async () => {
    try {
      setIsLoading(true);
      const params = buildTimeframeParams(timeframe, dateFrom, dateTo);
      if (workflowStatus !== "All") params.push(`workflow_status=${workflowStatus}`);
      
      // Removed the limit param so we fetch everything for the report
      const response = await apiClient.get(`/laboratory/detailed/report?${params.join("&")}`);
      if (response.data && response.data.data) {
        setRecords(response.data.data.records || []);
        setAggregates(response.data.data.metadata?.aggregates || {});
      } else {
        setRecords([]);
        setAggregates({});
      }
    } catch (error) {
      console.error("Failed to fetch lab detailed report:", error);
      setRecords([]);
      setAggregates({});
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeframe, dateFrom, dateTo, workflowStatus]);

  const filteredRecords = records.filter((r) =>
    renderValue(r.first_name).toLowerCase().includes(searchTerm.toLowerCase()) ||
    renderValue(r.last_name).toLowerCase().includes(searchTerm.toLowerCase()) ||
    renderValue(r.mrn).toLowerCase().includes(searchTerm.toLowerCase()) ||
    renderValue(r.reference_no).toLowerCase().includes(searchTerm.toLowerCase()) ||
    renderValue(r.service_name).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <ReportShell
      title="Lab Detailed Report"
      subtitle="Full breakdown of every lab order, sample, and result parameter."
      isLoading={isLoading}
      onClear={() => {
        setSearchTerm("");
        setTimeframe("all_time");
        setDateFrom("");
        setDateTo("");
        setWorkflowStatus("All");
      }}
      onRefresh={fetchReportData}
      exportData={filteredRecords}
      exportFilename="lab_detailed_report"
      filters={
        <>
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search patient, MRN, reference, test..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={isLoading}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary disabled:opacity-50"
            />
          </div>
          <TimeframeSelect value={timeframe} onChange={setTimeframe} disabled={isLoading} />
          
          <div>
            <select
              value={workflowStatus}
              onChange={(e) => setWorkflowStatus(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-700 disabled:opacity-50"
            >
              <option value="All">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="SAMPLE_COLLECTED">Sample Collected</option>
              <option value="PROCESSING">Processing</option>
              <option value="VERIFIED">Verified</option>
              <option value="RELEASED">Released</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {timeframe === "custom" && (
            <CustomDateInputs dateFrom={dateFrom} dateTo={dateTo} setDateFrom={setDateFrom} setDateTo={setDateTo} disabled={isLoading} />
          )}
        </>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard icon={ClipboardCheck} label="Orders Logged" value={aggregates.total_orders_logged ?? 0} colorClass="bg-blue-50 border-blue-100 text-blue-900" />
        <KpiCard icon={TestTube} label="Samples Collected" value={aggregates.samples_collected ?? 0} colorClass="bg-purple-50 border-purple-100 text-purple-900" />
        <KpiCard icon={CheckCircle2} label="Verified / Released" value={aggregates.tests_verified_released ?? 0} colorClass="bg-emerald-50 border-emerald-100 text-emerald-900" />
        <KpiCard icon={Wallet} label="Gross Billing" value={formatCurrency(aggregates.total_laboratory_gross_billing)} colorClass="bg-amber-50 border-amber-100 text-amber-900" />
      </div>

      <div className="overflow-x-auto overflow-y-auto rounded-xl border border-slate-200 flex-1 min-h-[300px] mt-6">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]"></th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Reference</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Test</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Patient</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Doctor / Collector</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Status</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-right">Billed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredRecords.length > 0 ? (
              filteredRecords.map((row) => (
                <React.Fragment key={row.processing_id}>
                  <tr
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    onClick={() => setExpandedId(expandedId === row.processing_id ? null : row.processing_id)}
                  >
                    <td className="px-4 py-3.5 text-slate-400">
                      {row.parameters?.length > 0 && (expandedId === row.processing_id ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
                    </td>
                    <td className="px-4 py-3.5 border-r border-slate-50">
                      <div className="font-bold text-slate-800">{renderValue(row.reference_no)}</div>
                      <div className="text-[11px] text-slate-400">{renderValue(row.ordered_at)}</div>
                    </td>
                    <td className="px-4 py-3.5 border-r border-slate-50">
                      <div className="font-semibold text-slate-700">{renderValue(row.service_name)}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{renderValue(row.service_code)}</div>
                    </td>
                    <td className="px-4 py-3.5 border-r border-slate-50">
                      <div className="font-semibold text-slate-700">{[row.first_name, row.middle_name, row.last_name].filter(Boolean).join(" ")}</div>
                      <div className="text-[11px] text-slate-400 font-mono">MRN: {renderValue(row.mrn)} • {renderValue(row.gender)}</div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-700 border-r border-slate-50">
                      <div>{renderValue(row.ordering_doctor_name)}</div>
                      <div className="text-[11px] text-slate-400">Collected by: {renderValue(row.collector_name)}</div>
                    </td>
                    <td className="px-4 py-3.5 border-r border-slate-50">
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wider ${badgeClass(row.processing_status)}`}>
                        {renderValue(row.processing_status)}
                      </span>
                      <div className="mt-1">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider ${badgeClass(row.billing_status)}`}>
                          {renderValue(row.billing_status)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-bold text-slate-800 text-right">{formatCurrency(row.total_billed)}</td>
                  </tr>
                  {expandedId === row.processing_id && row.parameters?.length > 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-4 bg-slate-50/60">
                        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                          <table className="w-full text-left text-xs whitespace-nowrap">
                            <thead className="bg-slate-50 border-b border-slate-200">
                              <tr>
                                <th className="px-3 py-2 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Parameter</th>
                                <th className="px-3 py-2 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Result</th>
                                <th className="px-3 py-2 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Unit</th>
                                <th className="px-3 py-2 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Flag</th>
                                <th className="px-3 py-2 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {row.parameters.map((p: any) => (
                                <tr key={p.parameter_id}>
                                  <td className="px-3 py-2 font-semibold text-slate-700">{renderValue(p.parameter_name)}</td>
                                  <td className="px-3 py-2 text-slate-700">{renderValue(p.result_value)}</td>
                                  <td className="px-3 py-2 text-slate-500">{renderValue(p.unit)}</td>
                                  <td className="px-3 py-2">
                                    {p.flagged ? (
                                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full border bg-red-50 text-red-600 border-red-100 uppercase">{p.flagged}</span>
                                    ) : "—"}
                                  </td>
                                  <td className="px-3 py-2 text-slate-500">{renderValue(p.workflow_status)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-400 italic">No lab detailed records found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </ReportShell>
  );
};

export default LabDetailedReport;




// import React, { useState, useEffect } from "react";
// import { Search, ChevronDown, ChevronUp, ClipboardCheck, TestTube, CheckCircle2, Wallet } from "lucide-react";
// import apiClient from "../../api/client";
// import {
//   renderValue,
//   formatCurrency,
//   badgeClass,
//   TimeframeSelect,
//   CustomDateInputs,
//   buildTimeframeParams,
//   ReportShell,
//   KpiCard,
// } from "./billingReportShared";

// const LabDetailedReport: React.FC = () => {
//   const [records, setRecords] = useState<any[]>([]);
//   const [aggregates, setAggregates] = useState<any>({});
//   const [isLoading, setIsLoading] = useState(true);
//   const [expandedId, setExpandedId] = useState<number | null>(null);

//   const [searchTerm, setSearchTerm] = useState("");
//   const [timeframe, setTimeframe] = useState("all_time");
//   const [dateFrom, setDateFrom] = useState("");
//   const [dateTo, setDateTo] = useState("");
//   const [workflowStatus, setWorkflowStatus] = useState("All");
//   const [limit, setLimit] = useState(50);

//   const fetchReportData = async () => {
//     try {
//       setIsLoading(true);
//       const params = buildTimeframeParams(timeframe, dateFrom, dateTo);
//       if (workflowStatus !== "All") params.push(`workflow_status=${workflowStatus}`);
//       params.push(`limit=${limit}`);
//       const response = await apiClient.get(`/laboratory/detailed/report?${params.join("&")}`);
//       if (response.data && response.data.data) {
//         setRecords(response.data.data.records || []);
//         setAggregates(response.data.data.metadata?.aggregates || {});
//       } else {
//         setRecords([]);
//         setAggregates({});
//       }
//     } catch (error) {
//       console.error("Failed to fetch lab detailed report:", error);
//       setRecords([]);
//       setAggregates({});
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchReportData();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [timeframe, dateFrom, dateTo, workflowStatus, limit]);

//   const filteredRecords = records.filter((r) =>
//     renderValue(r.first_name).toLowerCase().includes(searchTerm.toLowerCase()) ||
//     renderValue(r.last_name).toLowerCase().includes(searchTerm.toLowerCase()) ||
//     renderValue(r.mrn).toLowerCase().includes(searchTerm.toLowerCase()) ||
//     renderValue(r.reference_no).toLowerCase().includes(searchTerm.toLowerCase()) ||
//     renderValue(r.service_name).toLowerCase().includes(searchTerm.toLowerCase())
//   );

//   return (
//     <ReportShell
//       title="Lab Detailed Report"
//       subtitle="Full breakdown of every lab order, sample, and result parameter."
//       isLoading={isLoading}
//       onClear={() => {
//         setSearchTerm("");
//         setTimeframe("all_time");
//         setDateFrom("");
//         setDateTo("");
//         setWorkflowStatus("All");
//         setLimit(50);
//       }}
//       onRefresh={fetchReportData}
//       exportData={filteredRecords}
//       exportFilename="lab_detailed_report"
//       filters={
//         <>
//           <div className="relative lg:col-span-2">
//             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
//             <input
//               type="text"
//               placeholder="Search patient, MRN, reference, test..."
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//               disabled={isLoading}
//               className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary disabled:opacity-50"
//             />
//           </div>
//           <TimeframeSelect value={timeframe} onChange={setTimeframe} disabled={isLoading} />
          
//           <div>
//             <select
//               value={workflowStatus}
//               onChange={(e) => setWorkflowStatus(e.target.value)}
//               disabled={isLoading}
//               className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-700 disabled:opacity-50"
//             >
//               <option value="All">All Statuses</option>
//               <option value="PENDING">Pending</option>
//               <option value="SAMPLE_COLLECTED">Sample Collected</option>
//               <option value="PROCESSING">Processing</option>
//               <option value="VERIFIED">Verified</option>
//               <option value="RELEASED">Released</option>
//               <option value="CANCELLED">Cancelled</option>
//             </select>
//           </div>

//           <div>
//             <select
//               value={limit}
//               onChange={(e) => setLimit(Number(e.target.value))}
//               disabled={isLoading}
//               className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-700 disabled:opacity-50"
//             >
//               {[10, 25, 50, 100, 200].map((v) => <option key={v} value={v}>Limit {v}</option>)}
//             </select>
//           </div>
//           {timeframe === "custom" && (
//             <CustomDateInputs dateFrom={dateFrom} dateTo={dateTo} setDateFrom={setDateFrom} setDateTo={setDateTo} disabled={isLoading} />
//           )}
//         </>
//       }
//     >
//       <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
//         <KpiCard icon={ClipboardCheck} label="Orders Logged" value={aggregates.total_orders_logged ?? 0} colorClass="bg-blue-50 border-blue-100 text-blue-900" />
//         <KpiCard icon={TestTube} label="Samples Collected" value={aggregates.samples_collected ?? 0} colorClass="bg-purple-50 border-purple-100 text-purple-900" />
//         <KpiCard icon={CheckCircle2} label="Verified / Released" value={aggregates.tests_verified_released ?? 0} colorClass="bg-emerald-50 border-emerald-100 text-emerald-900" />
//         <KpiCard icon={Wallet} label="Gross Billing" value={formatCurrency(aggregates.total_laboratory_gross_billing)} colorClass="bg-amber-50 border-amber-100 text-amber-900" />
//       </div>

//       <div className="overflow-x-auto overflow-y-auto rounded-xl border border-slate-200 flex-1 min-h-[300px] mt-6">
//         <table className="w-full text-left text-sm whitespace-nowrap">
//           <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
//             <tr>
//               <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]"></th>
//               <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Reference</th>
//               <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Test</th>
//               <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Patient</th>
//               <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Doctor / Collector</th>
//               <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Status</th>
//               <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-right">Billed</th>
//             </tr>
//           </thead>
//           <tbody className="divide-y divide-slate-100">
//             {filteredRecords.length > 0 ? (
//               filteredRecords.map((row) => (
//                 <React.Fragment key={row.processing_id}>
//                   <tr
//                     className="hover:bg-slate-50/80 transition-colors cursor-pointer"
//                     onClick={() => setExpandedId(expandedId === row.processing_id ? null : row.processing_id)}
//                   >
//                     <td className="px-4 py-3.5 text-slate-400">
//                       {row.parameters?.length > 0 && (expandedId === row.processing_id ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
//                     </td>
//                     <td className="px-4 py-3.5 border-r border-slate-50">
//                       <div className="font-bold text-slate-800">{renderValue(row.reference_no)}</div>
//                       <div className="text-[11px] text-slate-400">{renderValue(row.ordered_at)}</div>
//                     </td>
//                     <td className="px-4 py-3.5 border-r border-slate-50">
//                       <div className="font-semibold text-slate-700">{renderValue(row.service_name)}</div>
//                       <div className="text-[11px] text-slate-400 font-mono">{renderValue(row.service_code)}</div>
//                     </td>
//                     <td className="px-4 py-3.5 border-r border-slate-50">
//                       <div className="font-semibold text-slate-700">{[row.first_name, row.middle_name, row.last_name].filter(Boolean).join(" ")}</div>
//                       <div className="text-[11px] text-slate-400 font-mono">MRN: {renderValue(row.mrn)} • {renderValue(row.gender)}</div>
//                     </td>
//                     <td className="px-4 py-3.5 text-slate-700 border-r border-slate-50">
//                       <div>{renderValue(row.ordering_doctor_name)}</div>
//                       <div className="text-[11px] text-slate-400">Collected by: {renderValue(row.collector_name)}</div>
//                     </td>
//                     <td className="px-4 py-3.5 border-r border-slate-50">
//                       <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wider ${badgeClass(row.processing_status)}`}>
//                         {renderValue(row.processing_status)}
//                       </span>
//                       <div className="mt-1">
//                         <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider ${badgeClass(row.billing_status)}`}>
//                           {renderValue(row.billing_status)}
//                         </span>
//                       </div>
//                     </td>
//                     <td className="px-4 py-3.5 font-bold text-slate-800 text-right">{formatCurrency(row.total_billed)}</td>
//                   </tr>
//                   {expandedId === row.processing_id && row.parameters?.length > 0 && (
//                     <tr>
//                       <td colSpan={7} className="px-4 py-4 bg-slate-50/60">
//                         <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
//                           <table className="w-full text-left text-xs whitespace-nowrap">
//                             <thead className="bg-slate-50 border-b border-slate-200">
//                               <tr>
//                                 <th className="px-3 py-2 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Parameter</th>
//                                 <th className="px-3 py-2 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Result</th>
//                                 <th className="px-3 py-2 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Unit</th>
//                                 <th className="px-3 py-2 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Flag</th>
//                                 <th className="px-3 py-2 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Status</th>
//                               </tr>
//                             </thead>
//                             <tbody className="divide-y divide-slate-100">
//                               {row.parameters.map((p: any) => (
//                                 <tr key={p.parameter_id}>
//                                   <td className="px-3 py-2 font-semibold text-slate-700">{renderValue(p.parameter_name)}</td>
//                                   <td className="px-3 py-2 text-slate-700">{renderValue(p.result_value)}</td>
//                                   <td className="px-3 py-2 text-slate-500">{renderValue(p.unit)}</td>
//                                   <td className="px-3 py-2">
//                                     {p.flagged ? (
//                                       <span className="text-[9px] font-black px-2 py-0.5 rounded-full border bg-red-50 text-red-600 border-red-100 uppercase">{p.flagged}</span>
//                                     ) : "—"}
//                                   </td>
//                                   <td className="px-3 py-2 text-slate-500">{renderValue(p.workflow_status)}</td>
//                                 </tr>
//                               ))}
//                             </tbody>
//                           </table>
//                         </div>
//                       </td>
//                     </tr>
//                   )}
//                 </React.Fragment>
//               ))
//             ) : (
//               <tr>
//                 <td colSpan={7} className="px-4 py-12 text-center text-slate-400 italic">No lab detailed records found.</td>
//               </tr>
//             )}
//           </tbody>
//         </table>
//       </div>
//     </ReportShell>
//   );
// };

// export default LabDetailedReport;



// import React, { useState, useEffect } from "react";
// import { Search, ChevronDown, ChevronUp, ClipboardCheck, TestTube, CheckCircle2, Wallet } from "lucide-react";
// import apiClient from "../../api/client";
// import {
//   renderValue,
//   formatCurrency,
//   badgeClass,
//   TimeframeSelect,
//   CustomDateInputs,
//   buildTimeframeParams,
//   ReportShell,
//   KpiCard,
// } from "./billingReportShared";

// const ITEM_TYPES = ["DRUG", "CONSUMABLE", "DEVICE"];
// const LOCATIONS = ["STORE", "PHARMACY", "CSSD", "THEATRE", "LAB", "RADIOLOGY", "WARD", "ICU", "HDU", "ERD", "OPD", "PATIENT"];

// const LabDetailedReport: React.FC = () => {
//   const [records, setRecords] = useState<any[]>([]);
//   const [aggregates, setAggregates] = useState<any>({});
//   const [isLoading, setIsLoading] = useState(true);
//   const [expandedId, setExpandedId] = useState<number | null>(null);

//   const [searchTerm, setSearchTerm] = useState("");
//   const [timeframe, setTimeframe] = useState("all_time");
//   const [dateFrom, setDateFrom] = useState("");
//   const [dateTo, setDateTo] = useState("");
//   const [location, setLocation] = useState("All");
//   const [itemType, setItemType] = useState("All");
//   const [limit, setLimit] = useState(50);

//   const fetchReportData = async () => {
//     try {
//       setIsLoading(true);
//       const params = buildTimeframeParams(timeframe, dateFrom, dateTo);
//       if (location !== "All") params.push(`location=${location}`);
//       if (itemType !== "All") params.push(`item_type=${itemType}`);
//       params.push(`limit=${limit}`);
//       const response = await apiClient.get(`/laboratory/detailed/report?${params.join("&")}`);
//       if (response.data && response.data.data) {
//         setRecords(response.data.data.records || []);
//         setAggregates(response.data.data.metadata?.aggregates || {});
//       } else {
//         setRecords([]);
//         setAggregates({});
//       }
//     } catch (error) {
//       console.error("Failed to fetch lab detailed report:", error);
//       setRecords([]);
//       setAggregates({});
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchReportData();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [timeframe, dateFrom, dateTo, location, itemType, limit]);

//   const filteredRecords = records.filter((r) =>
//     renderValue(r.first_name).toLowerCase().includes(searchTerm.toLowerCase()) ||
//     renderValue(r.last_name).toLowerCase().includes(searchTerm.toLowerCase()) ||
//     renderValue(r.mrn).toLowerCase().includes(searchTerm.toLowerCase()) ||
//     renderValue(r.reference_no).toLowerCase().includes(searchTerm.toLowerCase()) ||
//     renderValue(r.service_name).toLowerCase().includes(searchTerm.toLowerCase())
//   );

//   return (
//     <ReportShell
//       title="Lab Detailed Report"
//       subtitle="Full breakdown of every lab order, sample, and result parameter."
//       isLoading={isLoading}
//       onClear={() => {
//         setSearchTerm("");
//         setTimeframe("all_time");
//         setDateFrom("");
//         setDateTo("");
//         setLocation("All");
//         setItemType("All");
//         setLimit(50);
//       }}
//       onRefresh={fetchReportData}
//       exportData={filteredRecords}
//       exportFilename="lab_detailed_report"
//       filters={
//         <>
//           <div className="relative lg:col-span-2">
//             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
//             <input
//               type="text"
//               placeholder="Search patient, MRN, reference, test..."
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//               disabled={isLoading}
//               className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary disabled:opacity-50"
//             />
//           </div>
//           <TimeframeSelect value={timeframe} onChange={setTimeframe} disabled={isLoading} />
//           <div>
//             <select
//               value={location}
//               onChange={(e) => setLocation(e.target.value)}
//               disabled={isLoading}
//               className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-700 disabled:opacity-50"
//             >
//               <option value="All">All Locations</option>
//               {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
//             </select>
//           </div>
//           <div>
//             <select
//               value={itemType}
//               onChange={(e) => setItemType(e.target.value)}
//               disabled={isLoading}
//               className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-700 disabled:opacity-50"
//             >
//               <option value="All">All Item Types</option>
//               {ITEM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
//             </select>
//           </div>
//           <div>
//             <select
//               value={limit}
//               onChange={(e) => setLimit(Number(e.target.value))}
//               disabled={isLoading}
//               className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-700 disabled:opacity-50"
//             >
//               {[10, 25, 50, 100, 200].map((v) => <option key={v} value={v}>Limit {v}</option>)}
//             </select>
//           </div>
//           {timeframe === "custom" && (
//             <CustomDateInputs dateFrom={dateFrom} dateTo={dateTo} setDateFrom={setDateFrom} setDateTo={setDateTo} disabled={isLoading} />
//           )}
//         </>
//       }
//     >
//       <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
//         <KpiCard icon={ClipboardCheck} label="Orders Logged" value={aggregates.total_orders_logged ?? 0} colorClass="bg-blue-50 border-blue-100 text-blue-900" />
//         <KpiCard icon={TestTube} label="Samples Collected" value={aggregates.samples_collected ?? 0} colorClass="bg-purple-50 border-purple-100 text-purple-900" />
//         <KpiCard icon={CheckCircle2} label="Verified / Released" value={aggregates.tests_verified_released ?? 0} colorClass="bg-emerald-50 border-emerald-100 text-emerald-900" />
//         <KpiCard icon={Wallet} label="Gross Billing" value={formatCurrency(aggregates.total_laboratory_gross_billing)} colorClass="bg-amber-50 border-amber-100 text-amber-900" />
//       </div>

//       <div className="overflow-x-auto overflow-y-auto rounded-xl border border-slate-200 flex-1 min-h-[300px] mt-6">
//         <table className="w-full text-left text-sm whitespace-nowrap">
//           <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
//             <tr>
//               <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]"></th>
//               <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Reference</th>
//               <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Test</th>
//               <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Patient</th>
//               <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Doctor / Collector</th>
//               <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Status</th>
//               <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-right">Billed</th>
//             </tr>
//           </thead>
//           <tbody className="divide-y divide-slate-100">
//             {filteredRecords.length > 0 ? (
//               filteredRecords.map((row) => (
//                 <React.Fragment key={row.processing_id}>
//                   <tr
//                     className="hover:bg-slate-50/80 transition-colors cursor-pointer"
//                     onClick={() => setExpandedId(expandedId === row.processing_id ? null : row.processing_id)}
//                   >
//                     <td className="px-4 py-3.5 text-slate-400">
//                       {row.parameters?.length > 0 && (expandedId === row.processing_id ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
//                     </td>
//                     <td className="px-4 py-3.5 border-r border-slate-50">
//                       <div className="font-bold text-slate-800">{renderValue(row.reference_no)}</div>
//                       <div className="text-[11px] text-slate-400">{renderValue(row.ordered_at)}</div>
//                     </td>
//                     <td className="px-4 py-3.5 border-r border-slate-50">
//                       <div className="font-semibold text-slate-700">{renderValue(row.service_name)}</div>
//                       <div className="text-[11px] text-slate-400 font-mono">{renderValue(row.service_code)}</div>
//                     </td>
//                     <td className="px-4 py-3.5 border-r border-slate-50">
//                       <div className="font-semibold text-slate-700">{[row.first_name, row.middle_name, row.last_name].filter(Boolean).join(" ")}</div>
//                       <div className="text-[11px] text-slate-400 font-mono">MRN: {renderValue(row.mrn)} • {renderValue(row.gender)}</div>
//                     </td>
//                     <td className="px-4 py-3.5 text-slate-700 border-r border-slate-50">
//                       <div>{renderValue(row.ordering_doctor_name)}</div>
//                       <div className="text-[11px] text-slate-400">Collected by: {renderValue(row.collector_name)}</div>
//                     </td>
//                     <td className="px-4 py-3.5 border-r border-slate-50">
//                       <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wider ${badgeClass(row.processing_status)}`}>
//                         {renderValue(row.processing_status)}
//                       </span>
//                       <div className="mt-1">
//                         <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider ${badgeClass(row.billing_status)}`}>
//                           {renderValue(row.billing_status)}
//                         </span>
//                       </div>
//                     </td>
//                     <td className="px-4 py-3.5 font-bold text-slate-800 text-right">{formatCurrency(row.total_billed)}</td>
//                   </tr>
//                   {expandedId === row.processing_id && row.parameters?.length > 0 && (
//                     <tr>
//                       <td colSpan={7} className="px-4 py-4 bg-slate-50/60">
//                         <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
//                           <table className="w-full text-left text-xs whitespace-nowrap">
//                             <thead className="bg-slate-50 border-b border-slate-200">
//                               <tr>
//                                 <th className="px-3 py-2 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Parameter</th>
//                                 <th className="px-3 py-2 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Result</th>
//                                 <th className="px-3 py-2 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Unit</th>
//                                 <th className="px-3 py-2 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Flag</th>
//                                 <th className="px-3 py-2 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Status</th>
//                               </tr>
//                             </thead>
//                             <tbody className="divide-y divide-slate-100">
//                               {row.parameters.map((p: any) => (
//                                 <tr key={p.parameter_id}>
//                                   <td className="px-3 py-2 font-semibold text-slate-700">{renderValue(p.parameter_name)}</td>
//                                   <td className="px-3 py-2 text-slate-700">{renderValue(p.result_value)}</td>
//                                   <td className="px-3 py-2 text-slate-500">{renderValue(p.unit)}</td>
//                                   <td className="px-3 py-2">
//                                     {p.flagged ? (
//                                       <span className="text-[9px] font-black px-2 py-0.5 rounded-full border bg-red-50 text-red-600 border-red-100 uppercase">{p.flagged}</span>
//                                     ) : "—"}
//                                   </td>
//                                   <td className="px-3 py-2 text-slate-500">{renderValue(p.workflow_status)}</td>
//                                 </tr>
//                               ))}
//                             </tbody>
//                           </table>
//                         </div>
//                       </td>
//                     </tr>
//                   )}
//                 </React.Fragment>
//               ))
//             ) : (
//               <tr>
//                 <td colSpan={7} className="px-4 py-12 text-center text-slate-400 italic">No lab detailed records found.</td>
//               </tr>
//             )}
//           </tbody>
//         </table>
//       </div>
//     </ReportShell>
//   );
// };

// export default LabDetailedReport;
