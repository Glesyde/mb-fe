import React, { useState, useEffect } from "react";
import { Scissors, CheckCircle2, XCircle, CalendarClock, Siren } from "lucide-react";
import apiClient from "../../api/client";
import {
  renderValue,
  badgeClass,
  TimeframeSelect,
  CustomDateInputs,
  buildTimeframeParams,
  ReportShell,
  KpiCard,
} from "./billingReportShared";

const STATUS_OPTIONS = ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

const OtDashboardReport: React.FC = () => {
  const [kpis, setKpis] = useState<any>(null);
  const [reports, setReports] = useState<any>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [timeframe, setTimeframe] = useState("all_time");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [assignedRoom, setAssignedRoom] = useState("");
  const [leadSurgeon, setLeadSurgeon] = useState("");
  const [mrn, setMrn] = useState("");
  const [status, setStatus] = useState("");
  const [consentSigned, setConsentSigned] = useState("");

  const fetchReportData = async () => {
    try {
      setIsLoading(true);
      const params = buildTimeframeParams(timeframe, dateFrom, dateTo);
      if (assignedRoom) params.push(`assigned_room=${encodeURIComponent(assignedRoom)}`);
      if (leadSurgeon) params.push(`lead_surgeon=${encodeURIComponent(leadSurgeon)}`);
      if (mrn) params.push(`mrn=${encodeURIComponent(mrn)}`);
      if (status) params.push(`status=${encodeURIComponent(status)}`);
      if (consentSigned) params.push(`consent_signed=${encodeURIComponent(consentSigned)}`);
      const query = params.length ? `?${params.join("&")}` : "";
      const response = await apiClient.get(`/report/operating-theater${query}`);
      if (response.data && response.data.data) {
        setKpis(response.data.data.kpis || null);
        setReports(response.data.data.reports || null);
        setMetadata(response.data.data.metadata || null);
      } else {
        setKpis(null);
        setReports(null);
        setMetadata(null);
      }
    } catch (error) {
      console.error("Failed to fetch Enterprise OT Dashboard:", error);
      setKpis(null);
      setReports(null);
      setMetadata(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeframe, dateFrom, dateTo, assignedRoom, leadSurgeon, mrn, status, consentSigned]);

  const surgeonProductivity = reports?.surgeon_productivity || [];
  const roomUtilization = reports?.room_utilization || [];
  const activeBacklog = reports?.active_backlog || [];
  const exportData = [...surgeonProductivity, ...roomUtilization, ...activeBacklog];

  return (
    <ReportShell
      title="Enterprise OT Dashboard"
      subtitle="Theatre-wide surgical KPIs, surgeon productivity, room utilization, and active backlog."
      metaLine={metadata ? `Period: ${renderValue(metadata.report_period)}` : undefined}
      isLoading={isLoading}
      onClear={() => {
        setTimeframe("all_time");
        setDateFrom("");
        setDateTo("");
        setAssignedRoom("");
        setLeadSurgeon("");
        setMrn("");
        setStatus("");
        setConsentSigned("");
      }}
      onRefresh={fetchReportData}
      exportData={exportData}
      exportFilename="enterprise_ot_dashboard"
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
          <div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-700 disabled:opacity-50"
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={consentSigned}
              onChange={(e) => setConsentSigned(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-700 disabled:opacity-50"
            >
              <option value="">Consent Signed? (All)</option>
              <option value="YES">Yes</option>
              <option value="NO">No</option>
            </select>
          </div>
          {timeframe === "custom" && (
            <CustomDateInputs dateFrom={dateFrom} dateTo={dateTo} setDateFrom={setDateFrom} setDateTo={setDateTo} disabled={isLoading} />
          )}
        </>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard icon={Scissors} label="Total Surgeries" value={renderValue(kpis?.total_surgeries)} colorClass="bg-blue-50 border-blue-100 text-blue-900" />
        <KpiCard icon={CheckCircle2} label="Completed Cases" value={renderValue(kpis?.completed_cases)} colorClass="bg-emerald-50 border-emerald-100 text-emerald-900" />
        <KpiCard icon={XCircle} label="Cancelled Cases" value={renderValue(kpis?.cancelled_cases)} colorClass="bg-red-50 border-red-100 text-red-900" />
        <KpiCard icon={CalendarClock} label="Elective Cases" value={renderValue(kpis?.elective_cases)} colorClass="bg-amber-50 border-amber-100 text-amber-900" />
        <KpiCard icon={Siren} label="Emergency Cases" value={renderValue(kpis?.emergency_cases)} colorClass="bg-purple-50 border-purple-100 text-purple-900" />
      </div>

      <div className="mt-8">
        <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider mb-3">Surgeon Productivity</h3>
        <div className="overflow-x-auto overflow-y-auto rounded-xl border border-slate-200 min-h-[120px]">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Surgeon</th>
                <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-right">Cases</th>
                <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-right">Completed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {surgeonProductivity.length > 0 ? (
                surgeonProductivity.map((row: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-slate-800 border-r border-slate-50">{renderValue(row.surgeon_name || row.lead_surgeon)}</td>
                    <td className="px-4 py-3.5 text-slate-700 border-r border-slate-50 text-right">{renderValue(row.cases_performed)}</td>
                    <td className="px-4 py-3.5 text-slate-700 text-right">{renderValue(row.completed_cases)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-slate-400 italic">No surgeon productivity data found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider mb-3">Room Utilization</h3>
        <div className="overflow-x-auto overflow-y-auto rounded-xl border border-slate-200 min-h-[120px]">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Room</th>
                <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-right">Cases Performed</th>
                <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-right">Completed Cases</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {roomUtilization.length > 0 ? (
                roomUtilization.map((row: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-slate-800 border-r border-slate-50">{renderValue(row.room_name)}</td>
                    <td className="px-4 py-3.5 text-slate-700 border-r border-slate-50 text-right">{renderValue(row.cases_performed)}</td>
                    <td className="px-4 py-3.5 text-slate-700 text-right">{renderValue(row.completed_cases)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-slate-400 italic">No room utilization data found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider mb-3">Active Backlog</h3>
        <div className="overflow-x-auto overflow-y-auto rounded-xl border border-slate-200 min-h-[120px]">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Scheduled Date</th>
                <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Surgery</th>
                <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Type</th>
                <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Status</th>
                <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Patient</th>
                <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Lead Surgeon</th>
                <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Anaesthetist</th>
                <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Room</th>
                <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Consent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeBacklog.length > 0 ? (
                activeBacklog.map((row: any, i: number) => (
                  <tr key={row.case_id ?? i} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3.5 text-slate-700 border-r border-slate-50">{renderValue(row.scheduled_date)}</td>
                    <td className="px-4 py-3.5 font-bold text-slate-800 border-r border-slate-50 whitespace-normal min-w-[200px]">{renderValue(row.surgery_name)}</td>
                    <td className="px-4 py-3.5 text-slate-700 border-r border-slate-50">{renderValue(row.case_type)}</td>
                    <td className="px-4 py-3.5 border-r border-slate-50">
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wider ${badgeClass(row.status)}`}>
                        {renderValue(row.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 border-r border-slate-50">
                      <div className="text-slate-700">{renderValue(row.patient_name)}</div>
                      <div className="text-[11px] text-slate-400 font-mono">MRN: {renderValue(row.mrn)}</div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-700 border-r border-slate-50">{renderValue(row.lead_surgeon)}</td>
                    <td className="px-4 py-3.5 text-slate-700 border-r border-slate-50">{renderValue(row.anaesthetist)}</td>
                    <td className="px-4 py-3.5 text-slate-700 border-r border-slate-50">{renderValue(row.assigned_room)}</td>
                    <td className="px-4 py-3.5 text-slate-700">{renderValue(row.consent_signed)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400 italic">No active backlog cases found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </ReportShell>
  );
};

export default OtDashboardReport;