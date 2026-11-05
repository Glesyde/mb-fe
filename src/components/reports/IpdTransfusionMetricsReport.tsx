import React, { useState, useEffect } from "react";
import { Search } from "lucide-react";
import apiClient from "../../api/client";
import {
  renderValue,
  badgeClass,
  TimeframeSelect,
  CustomDateInputs,
  buildTimeframeParams,
  ReportShell,
  Pagination,
} from "./billingReportShared";

const IpdTransfusionMetricsReport: React.FC = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [metadata, setMetadata] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [mrn, setMrn] = useState("");
  const [surgicalStatus, setSurgicalStatus] = useState("");
  const [theatreRoom, setTheatreRoom] = useState("");
  const [timeframe, setTimeframe] = useState("all_time");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  const fetchReportData = async () => {
    try {
      setIsLoading(true);
      const params = buildTimeframeParams(timeframe, dateFrom, dateTo);
      if (search) params.push(`search=${encodeURIComponent(search)}`);
      if (mrn) params.push(`mrn=${encodeURIComponent(mrn)}`);
      if (surgicalStatus) params.push(`surgical_status=${encodeURIComponent(surgicalStatus)}`);
      if (theatreRoom) params.push(`theatre_room=${encodeURIComponent(theatreRoom)}`);
      params.push(`limit=${itemsPerPage}`, `offset=${(currentPage - 1) * itemsPerPage}`);
      const response = await apiClient.get(`/report/ipd/transfusion-metrics?${params.join("&")}`);
      if (response.data && response.data.data) {
        setRecords(response.data.data.records || []);
        setMetadata(response.data.data.metadata || null);
      } else {
        setRecords([]);
        setMetadata(null);
      }
    } catch (error) {
      console.error("Failed to fetch blood transfusion utilization report:", error);
      setRecords([]);
      setMetadata(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeframe, dateFrom, dateTo, search, mrn, surgicalStatus, theatreRoom, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [timeframe, dateFrom, dateTo, search, mrn, surgicalStatus, theatreRoom]);

  const totalRecords = metadata?.records_count ?? records.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / itemsPerPage));
  const offset = (currentPage - 1) * itemsPerPage;

  return (
    <ReportShell
      title="Blood Transfusion Utilization"
      subtitle="Audit of blood component requests, urgency, and transfusion outcomes."
      metaLine={metadata ? `Period: ${renderValue(metadata.period)}` : undefined}
      isLoading={isLoading}
      onClear={() => {
        setSearch("");
        setMrn("");
        setSurgicalStatus("");
        setTheatreRoom("");
        setTimeframe("all_time");
        setDateFrom("");
        setDateTo("");
      }}
      onRefresh={fetchReportData}
      exportData={records}
      exportFilename="blood_transfusion_utilization_report"
      filters={
        <>
          <div className="relative">
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
          <div>
            <input
              type="text"
              placeholder="MRN"
              value={mrn}
              onChange={(e) => setMrn(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary disabled:opacity-50"
            />
          </div>
          <div>
            <input
              type="text"
              placeholder="Surgical status"
              value={surgicalStatus}
              onChange={(e) => setSurgicalStatus(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary disabled:opacity-50"
            />
          </div>
          <div>
            <input
              type="text"
              placeholder="Theatre room"
              value={theatreRoom}
              onChange={(e) => setTheatreRoom(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary disabled:opacity-50"
            />
          </div>
          <TimeframeSelect value={timeframe} onChange={setTimeframe} disabled={isLoading} />
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
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Request Code</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Patient</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Component</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-right">Qty Requested</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Urgency</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Status</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Requested</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Transfusion Start</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Adverse Reaction</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.length > 0 ? (
              records.map((row, i) => (
                <tr key={`${row.request_code}-${i}`} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3.5 font-mono text-xs text-slate-500 border-r border-slate-50">{renderValue(row.request_code)}</td>
                  <td className="px-4 py-3.5 border-r border-slate-50">
                    <div className="font-semibold text-slate-700">{renderValue(row.patient_name)}</div>
                    <div className="text-[11px] text-slate-400 font-mono">MRN: {renderValue(row.mrn)}</div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-700 border-r border-slate-50">{renderValue(row.component_name)?.toString().replace(/_/g, " ")}</td>
                  <td className="px-4 py-3.5 text-slate-700 border-r border-slate-50 text-right">{renderValue(row.quantity_requested)}</td>
                  <td className="px-4 py-3.5 border-r border-slate-50">
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wider ${badgeClass(row.urgency_level)}`}>
                      {renderValue(row.urgency_level)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 border-r border-slate-50">
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wider ${badgeClass(row.request_status)}`}>
                      {renderValue(row.request_status)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-500 border-r border-slate-50">{renderValue(row.request_date)}</td>
                  <td className="px-4 py-3.5 text-slate-500 border-r border-slate-50">{renderValue(row.transfusion_start_time)}</td>
                  <td className="px-4 py-3.5 text-slate-500">{renderValue(row.adverse_reaction_noted)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-slate-400 italic">No transfusion records found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {records.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalRecords={totalRecords}
          rangeStart={offset + 1}
          rangeEnd={Math.min(offset + records.length, totalRecords)}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onLimitChange={(v) => { setItemsPerPage(v); setCurrentPage(1); }}
        />
      )}
    </ReportShell>
  );
};

export default IpdTransfusionMetricsReport;
