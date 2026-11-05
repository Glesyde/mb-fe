import React, { useState, useEffect } from "react";
import { Search } from "lucide-react";
import apiClient from "../../api/client";
import {
  renderValue,
  TimeframeSelect,
  CustomDateInputs,
  buildTimeframeParams,
  ReportShell,
} from "./billingReportShared";

const RadiologyProductivityReport: React.FC = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [metadata, setMetadata] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [timeframe, setTimeframe] = useState("all_time");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [limit, setLimit] = useState(50);

  const fetchReportData = async () => {
    try {
      setIsLoading(true);
      const params = buildTimeframeParams(timeframe, dateFrom, dateTo);
      if (search) params.push(`search=${encodeURIComponent(search)}`);
      params.push(`limit=${limit}`);
      const response = await apiClient.get(`/radiology/productivity/report?${params.join("&")}`);
      if (response.data && response.data.data) {
        setRecords(response.data.data.records || []);
        setMetadata(response.data.data.metadata || null);
      } else {
        setRecords([]);
        setMetadata(null);
      }
    } catch (error) {
      console.error("Failed to fetch radiology productivity report:", error);
      setRecords([]);
      setMetadata(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeframe, dateFrom, dateTo, search, limit]);

  return (
    <ReportShell
      title="Radiologist Productivity Report"
      subtitle="Reporting throughput and turnaround time per radiologist, by modality."
      metaLine={metadata ? `Period: ${renderValue(metadata.period)}` : undefined}
      isLoading={isLoading}
      onClear={() => {
        setSearch("");
        setTimeframe("all_time");
        setDateFrom("");
        setDateTo("");
        setLimit(50);
      }}
      onRefresh={fetchReportData}
      exportData={records}
      exportFilename="radiologist_productivity_report"
      filters={
        <>
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={isLoading}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary disabled:opacity-50"
            />
          </div>
          <TimeframeSelect value={timeframe} onChange={setTimeframe} disabled={isLoading} />
          <div>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-700 disabled:opacity-50"
            >
              {[10, 25, 50, 100, 200].map((v) => <option key={v} value={v}>Limit {v}</option>)}
            </select>
          </div>
          {timeframe === "custom" && (
            <CustomDateInputs dateFrom={dateFrom} dateTo={dateTo} setDateFrom={setDateFrom} setDateTo={setDateTo} disabled={isLoading} />
          )}
        </>
      }
    >
      <div className="overflow-x-auto overflow-y-auto rounded-xl border border-slate-200 flex-1 min-h-[300px]">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Radiologist</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-right">Reports Authored</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-right">MRI Reads</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-right">CT Reads</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-right">X-Ray Reads</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-right">Ultrasound Reads</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-right">Avg Reporting TAT (hrs)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.length > 0 ? (
              records.map((row, i) => (
                <tr key={`${row.radiologist_id}-${i}`} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3.5 font-bold text-slate-800 border-r border-slate-50">{renderValue(row.radiologist_name)}</td>
                  <td className="px-4 py-3.5 text-slate-700 border-r border-slate-50 text-right">{renderValue(row.total_reports_authored)}</td>
                  <td className="px-4 py-3.5 text-slate-700 border-r border-slate-50 text-right">{renderValue(row.mri_reads)}</td>
                  <td className="px-4 py-3.5 text-slate-700 border-r border-slate-50 text-right">{renderValue(row.ct_reads)}</td>
                  <td className="px-4 py-3.5 text-slate-700 border-r border-slate-50 text-right">{renderValue(row.xray_reads)}</td>
                  <td className="px-4 py-3.5 text-slate-700 border-r border-slate-50 text-right">{renderValue(row.ultrasound_reads)}</td>
                  <td className="px-4 py-3.5 font-bold text-slate-800 text-right">{renderValue(row.avg_reporting_tat_hrs)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-400 italic">No productivity records found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </ReportShell>
  );
};

export default RadiologyProductivityReport;
