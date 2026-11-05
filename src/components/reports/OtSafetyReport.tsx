import React, { useState, useEffect } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import apiClient from "../../api/client";
import {
  renderValue,
  TimeframeSelect,
  CustomDateInputs,
  buildTimeframeParams,
  ReportShell,
} from "./billingReportShared";

const BoolFlag: React.FC<{ value: any; invert?: boolean }> = ({ value, invert }) => {
  const truthy = value === 1 || value === true || value === "1";
  const good = invert ? !truthy : truthy;
  return truthy ? (
    <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full border uppercase tracking-wider ${good ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-red-50 text-red-600 border-red-100"}`}>
      {good ? <CheckCircle2 size={11} /> : <XCircle size={11} />} Yes
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full border uppercase tracking-wider bg-slate-50 text-slate-500 border-slate-100">
      No
    </span>
  );
};

const OtSafetyReport: React.FC = () => {
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
      const response = await apiClient.get(`/operating-theater/safety/report${query}`);
      if (response.data && response.data.data) {
        setRecords(response.data.data.records || []);
        setMetadata(response.data.data.metadata || null);
      } else {
        setRecords([]);
        setMetadata(null);
      }
    } catch (error) {
      console.error("Failed to fetch OT safety audit:", error);
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
      title="Pre-Op Safety & Equipment Audit"
      subtitle="Identity confirmation, allergy, blood, and equipment safety checks per case."
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
      exportFilename="pre_op_safety_equipment_audit"
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
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Patient</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Surgeon</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Anaesthetist</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Identity Confirmed</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Has Allergy</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Blood Loss Risk</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Blood Prepared</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">ICU Required</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Equipment Issue</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Sterility Confirmed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.length > 0 ? (
              records.map((row, i) => (
                <tr key={`${row.case_id}-${i}`} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3.5 font-bold text-slate-800 border-r border-slate-50 whitespace-normal min-w-[220px]">{renderValue(row.surgery_name)}</td>
                  <td className="px-4 py-3.5 border-r border-slate-50">
                    <div className="text-slate-700">{renderValue(row.patient_name)}</div>
                    <div className="text-[11px] text-slate-400 font-mono">MRN: {renderValue(row.mrn)}</div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-700 border-r border-slate-50">{renderValue(row.surgeon_name)}</td>
                  <td className="px-4 py-3.5 text-slate-700 border-r border-slate-50">{renderValue(row.anaesthetist_name)}</td>
                  <td className="px-4 py-3.5 border-r border-slate-50"><BoolFlag value={row.identity_confirmed} /></td>
                  <td className="px-4 py-3.5 border-r border-slate-50"><BoolFlag value={row.has_allergy} invert /></td>
                  <td className="px-4 py-3.5 border-r border-slate-50"><BoolFlag value={row.blood_loss_risk} invert /></td>
                  <td className="px-4 py-3.5 border-r border-slate-50"><BoolFlag value={row.blood_prepared} /></td>
                  <td className="px-4 py-3.5 border-r border-slate-50"><BoolFlag value={row.icu_required} invert /></td>
                  <td className="px-4 py-3.5 border-r border-slate-50">
                    <BoolFlag value={row.equipment_issues_flag} invert />
                    {row.equipment_issue_details && (
                      <div className="text-[11px] text-slate-400 mt-1 whitespace-normal max-w-[180px]">{row.equipment_issue_details}</div>
                    )}
                  </td>
                  <td className="px-4 py-3.5"><BoolFlag value={row.instrument_sterility_confirmed} /></td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={11} className="px-4 py-12 text-center text-slate-400 italic">No pre-op safety audit records found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </ReportShell>
  );
};

export default OtSafetyReport;