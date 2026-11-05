import React, { useState, useEffect } from "react";
import apiClient from "../../api/client";
import {
  renderValue,
  TimeframeSelect,
  CustomDateInputs,
  buildTimeframeParams,
  ReportShell,
} from "./billingReportShared";

const OtCancellationsReport: React.FC = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [metadata, setMetadata] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [timeframe, setTimeframe] = useState("all_time");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [assignedRoom, setAssignedRoom] = useState("");
  const [leadSurgeon, setLeadSurgeon] = useState("");
  const [mrn, setMrn] = useState("");

  const fetchReportData = async () => {
    try {
      setIsLoading(true);
      const params = buildTimeframeParams(timeframe, dateFrom, dateTo);
      if (assignedRoom) params.push(`assigned_room=${encodeURIComponent(assignedRoom)}`);
      if (leadSurgeon) params.push(`lead_surgeon=${encodeURIComponent(leadSurgeon)}`);
      if (mrn) params.push(`mrn=${encodeURIComponent(mrn)}`);
      const query = params.length ? `?${params.join("&")}` : "";
      const response = await apiClient.get(`/operating-theater/cancellations/report${query}`);
      if (response.data && response.data.data) {
        setRecords(response.data.data.records || []);
        setMetadata(response.data.data.metadata || null);
      } else {
        setRecords([]);
        setMetadata(null);
      }
    } catch (error) {
      console.error("Failed to fetch OT cancellations report:", error);
      setRecords([]);
      setMetadata(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeframe, dateFrom, dateTo, assignedRoom, leadSurgeon, mrn]);

  return (
    <ReportShell
      title="OT Cancellations Audit"
      subtitle="Surgical cases requested then cancelled before completion."
      metaLine={metadata ? `Period: ${renderValue(metadata.period)}` : undefined}
      isLoading={isLoading}
      onClear={() => {
        setTimeframe("all_time");
        setDateFrom("");
        setDateTo("");
        setAssignedRoom("");
        setLeadSurgeon("");
        setMrn("");
      }}
      onRefresh={fetchReportData}
      exportData={records}
      exportFilename="ot_cancellations_audit"
      filters={
        <>
          <TimeframeSelect value={timeframe} onChange={setTimeframe} disabled={isLoading} />
          <div>
            <input
              type="text"
              placeholder="Assigned room"
              value={assignedRoom}
              onChange={(e) => setAssignedRoom(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary disabled:opacity-50"
            />
          </div>
          <div>
            <input
              type="text"
              placeholder="Lead surgeon"
              value={leadSurgeon}
              onChange={(e) => setLeadSurgeon(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary disabled:opacity-50"
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
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Surgery</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Type</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Patient</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Lead Surgeon</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Requested Date</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Cancelled Date</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Cancelled By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.length > 0 ? (
              records.map((row, i) => (
                <tr key={`${row.case_id}-${i}`} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3.5 font-bold text-slate-800 border-r border-slate-50 whitespace-normal min-w-[220px]">{renderValue(row.surgery_name)}</td>
                  <td className="px-4 py-3.5 text-slate-700 border-r border-slate-50">{renderValue(row.surgery_type)}</td>
                  <td className="px-4 py-3.5 border-r border-slate-50">
                    <div className="text-slate-700">{renderValue(row.patient_name)}</div>
                    <div className="text-[11px] text-slate-400 font-mono">MRN: {renderValue(row.mrn)}</div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-700 border-r border-slate-50">{renderValue(row.lead_surgeon)}</td>
                  <td className="px-4 py-3.5 text-slate-700 border-r border-slate-50">{renderValue(row.requested_date)}</td>
                  <td className="px-4 py-3.5 text-slate-700 border-r border-slate-50">{renderValue(row.cancelled_date)}</td>
                  <td className="px-4 py-3.5 text-slate-700">{renderValue(row.cancelled_by_user)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-400 italic">No OT cancellation records found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </ReportShell>
  );
};

export default OtCancellationsReport;