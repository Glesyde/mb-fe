import React, { useState, useEffect } from "react";
import apiClient from "../../api/client";
import {
  renderValue,
  formatCurrency,
  badgeClass,
  TimeframeSelect,
  CustomDateInputs,
  buildTimeframeParams,
  ReportShell,
} from "./billingReportShared";
import { i18n } from "../../i18n";

const STATUS_OPTIONS = ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

const OtLedgerReport: React.FC = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [metadata, setMetadata] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [timeframe, setTimeframe] = useState("all_time");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [assignedRoom, setAssignedRoom] = useState("");
  const [leadSurgeon, setLeadSurgeon] = useState("");
  const [mrn, setMrn] = useState("");
  const [status, setStatus] = useState("");

  const fetchReportData = async () => {
    try {
      setIsLoading(true);
      const params = buildTimeframeParams(timeframe, dateFrom, dateTo);
      if (assignedRoom) params.push(`assigned_room=${encodeURIComponent(assignedRoom)}`);
      if (leadSurgeon) params.push(`lead_surgeon=${encodeURIComponent(leadSurgeon)}`);
      if (mrn) params.push(`mrn=${encodeURIComponent(mrn)}`);
      if (status) params.push(`status=${encodeURIComponent(status)}`);
      const query = params.length ? `?${params.join("&")}` : "";
      const response = await apiClient.get(`/operating-theater/ledger/report${query}`);
      if (response.data && response.data.data) {
        setRecords(response.data.data.records || []);
        setMetadata(response.data.data.metadata || null);
      } else {
        setRecords([]);
        setMetadata(null);
      }
    } catch (error) {
      console.error("Failed to fetch OT master ledger:", error);
      setRecords([]);
      setMetadata(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeframe, dateFrom, dateTo, assignedRoom, leadSurgeon, mrn, status]);

  return (
    <ReportShell
      title={i18n.t("Master OT Case Ledger")}
      subtitle={i18n.t("Full surgical case ledger with status, financials, and room assignment.")}
      metaLine={metadata ? `Period: ${renderValue(metadata.period)}` : undefined}
      isLoading={isLoading}
      onClear={() => {
        setTimeframe("all_time");
        setDateFrom("");
        setDateTo("");
        setAssignedRoom("");
        setLeadSurgeon("");
        setMrn("");
        setStatus("");
      }}
      onRefresh={fetchReportData}
      exportData={records}
      exportFilename="master_ot_case_ledger"
      filters={
        <>
          <TimeframeSelect value={timeframe} onChange={setTimeframe} disabled={isLoading} />
          <div>
            <input
              type="text"
              placeholder={i18n.t("Assigned room")}
              value={assignedRoom}
              onChange={(e) => setAssignedRoom(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary disabled:opacity-50"
            />
          </div>
          <div>
            <input
              type="text"
              placeholder={i18n.t("Lead surgeon")}
              value={leadSurgeon}
              onChange={(e) => setLeadSurgeon(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary disabled:opacity-50"
            />
          </div>
          <div>
            <input
              type="text"
              placeholder={i18n.t("MRN")}
              value={mrn}
              onChange={(e) => setMrn(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary disabled:opacity-50"
            />
          </div>
          <div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-700 disabled:opacity-50"
            >
              <option value="">{i18n.t("All Statuses")}</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
          {timeframe === "custom" && (
            <CustomDateInputs dateFrom={dateFrom} dateTo={dateTo} setDateFrom={setDateFrom} setDateTo={setDateTo} disabled={isLoading} />
          )}
        </>
      }
    >
      <div className="overflow-x-auto overflow-y-auto rounded-xl border border-slate-200 flex-1 min-h-[300px]">
        <table className="w-full text-start text-sm whitespace-nowrap">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">{i18n.t("Case #")}</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">{i18n.t("Case Date")}</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">{i18n.t("Surgery")}</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">{i18n.t("Type")}</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">{i18n.t("Status")}</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">{i18n.t("Financial Status")}</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">{i18n.t("Patient")}</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">{i18n.t("Lead Surgeon")}</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">{i18n.t("Room")}</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-end">{i18n.t("Revenue")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.length > 0 ? (
              records.map((row, i) => (
                <tr key={`${row.case_id}-${i}`} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3.5 font-mono text-xs text-slate-500 border-e border-slate-50">{renderValue(row.ot_case_number)}</td>
                  <td className="px-4 py-3.5 text-slate-700 border-e border-slate-50">{renderValue(row.case_date)}</td>
                  <td className="px-4 py-3.5 font-bold text-slate-800 border-e border-slate-50 whitespace-normal min-w-[200px]">{renderValue(row.surgery_name)}</td>
                  <td className="px-4 py-3.5 text-slate-700 border-e border-slate-50">{renderValue(row.surgery_type)}</td>
                  <td className="px-4 py-3.5 border-e border-slate-50">
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wider ${badgeClass(row.status)}`}>
                      {renderValue(row.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 border-e border-slate-50">
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wider ${badgeClass(row.financial_status)}`}>
                      {renderValue(row.financial_status)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 border-e border-slate-50">
                    <div className="text-slate-700">{renderValue(row.patient_name)}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{i18n.t("MRN:")}{" "}{renderValue(row.mrn)}</div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-700 border-e border-slate-50">{renderValue(row.lead_surgeon)}</td>
                  <td className="px-4 py-3.5 text-slate-700 border-e border-slate-50">{renderValue(row.ot_room)}</td>
                  <td className="px-4 py-3.5 font-bold text-slate-800 text-end">{formatCurrency(row.total_encounter_revenue)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-slate-400 italic">{i18n.t("No OT ledger records found.")}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </ReportShell>
  );
};

export default OtLedgerReport;