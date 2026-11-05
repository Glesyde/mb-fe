import React, { useState, useEffect } from "react";
import apiClient from "../../api/client";
import { userService } from "../../services/user.service";
import {
  renderValue,
  TimeframeSelect,
  CustomDateInputs,
  buildTimeframeParams,
  ReportShell,
} from "./billingReportShared";

const PharmacyProductivityReport: React.FC = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [metadata, setMetadata] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [timeframe, setTimeframe] = useState("all_time");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dispensedBy, setDispensedBy] = useState("");
  const [prescribingDoctor, setPrescribingDoctor] = useState("");

  const [doctors, setDoctors] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      userService.getDoctors(),
      userService.listUsers(),
    ]).then(([docs, allUsers]) => {
      setDoctors(docs);
      setUsers(allUsers);
    }).catch(() => {});
  }, []);

  const fetchReportData = async () => {
    try {
      setIsLoading(true);
      const params = buildTimeframeParams(timeframe, dateFrom, dateTo);
      if (dispensedBy) params.push(`dispensed_by=${encodeURIComponent(dispensedBy)}`);
      if (prescribingDoctor) params.push(`prescribing_doctor=${encodeURIComponent(prescribingDoctor)}`);
      const query = params.length ? `?${params.join("&")}` : "";
      const response = await apiClient.get(`/pharmacy/productivity/report${query}`);
      if (response.data && response.data.data) {
        setRecords(response.data.data.records || []);
        setMetadata(response.data.data.metadata || null);
      } else {
        setRecords([]);
        setMetadata(null);
      }
    } catch (error) {
      console.error("Failed to fetch pharmacy productivity report:", error);
      setRecords([]);
      setMetadata(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeframe, dateFrom, dateTo, dispensedBy, prescribingDoctor]);

  return (
    <ReportShell
      title="Pharmacist Productivity Report"
      subtitle="Dispensing throughput and average turnaround time per pharmacist."
      metaLine={metadata ? `Period: ${renderValue(metadata.period)}` : undefined}
      isLoading={isLoading}
      onClear={() => {
        setTimeframe("all_time");
        setDateFrom("");
        setDateTo("");
        setDispensedBy("");
        setPrescribingDoctor("");
      }}
      onRefresh={fetchReportData}
      exportData={records}
      exportFilename="pharmacist_productivity_report"
      filters={
        <>
          <TimeframeSelect value={timeframe} onChange={setTimeframe} disabled={isLoading} />
          <div>
            <select
              value={prescribingDoctor}
              onChange={(e) => setPrescribingDoctor(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-700 disabled:opacity-50"
            >
              <option value="">All Prescribing Doctors</option>
              {doctors.map((d) => (
                <option key={d.doctor_id} value={`${d.first_name} ${d.last_name}`}>{d.first_name} {d.last_name}</option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={dispensedBy}
              onChange={(e) => setDispensedBy(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-700 disabled:opacity-50"
            >
              <option value="">All Dispensed By</option>
              {users.map((u) => (
                <option key={u.id} value={`${u.first_name} ${u.last_name}`}>{u.first_name} {u.last_name}</option>
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
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Pharmacist</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-right">Prescriptions Dispensed</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-right">Units Dispensed</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-right">Avg Dispensing TAT (hrs)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.length > 0 ? (
              records.map((row, i) => (
                <tr key={`${row.pharmacist_id}-${i}`} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3.5 font-bold text-slate-800 border-r border-slate-50">{renderValue(row.pharmacist_name)}</td>
                  <td className="px-4 py-3.5 text-slate-700 border-r border-slate-50 text-right">{renderValue(row.total_prescriptions_dispensed)}</td>
                  <td className="px-4 py-3.5 text-slate-700 border-r border-slate-50 text-right">{renderValue(row.total_units_dispensed)}</td>
                  <td className="px-4 py-3.5 font-bold text-slate-800 text-right">{renderValue(row.avg_dispensing_tat_hrs)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-slate-400 italic">No productivity records found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </ReportShell>
  );
};

export default PharmacyProductivityReport;
