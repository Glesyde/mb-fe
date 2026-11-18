import React, { useState, useEffect } from "react";
import { Search } from "lucide-react";
import apiClient from "../../api/client";
import { userService } from "../../services/user.service";
import {
  renderValue,
  TimeframeSelect,
  CustomDateInputs,
  buildTimeframeParams,
  ReportShell,
} from "./billingReportShared";
import { i18n } from "../../i18n";

const PharmacyCancellationsReport: React.FC = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [metadata, setMetadata] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [timeframe, setTimeframe] = useState("all_time");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [prescribingDoctor, setPrescribingDoctor] = useState("");
  const [cancelledBy, setCancelledBy] = useState("");

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
      if (search) params.push(`search=${encodeURIComponent(search)}`);
      if (prescribingDoctor) params.push(`prescribing_doctor=${encodeURIComponent(prescribingDoctor)}`);
      if (cancelledBy) params.push(`dispensed_by=${encodeURIComponent(cancelledBy)}`);
      const query = params.length ? `?${params.join("&")}` : "";
      const response = await apiClient.get(`/pharmacy/cancellations/report${query}`);
      if (response.data && response.data.data) {
        setRecords(response.data.data.records || []);
        setMetadata(response.data.data.metadata || null);
      } else {
        setRecords([]);
        setMetadata(null);
      }
    } catch (error) {
      console.error("Failed to fetch pharmacy cancellations report:", error);
      setRecords([]);
      setMetadata(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeframe, dateFrom, dateTo, search, prescribingDoctor, cancelledBy]);

  return (
    <ReportShell
      title={i18n.t("Pharmacy Cancellations Report")}
      subtitle={i18n.t("Audit of cancelled prescriptions before dispensing.")}
      metaLine={metadata ? `Period: ${renderValue(metadata.period)}` : undefined}
      isLoading={isLoading}
      onClear={() => {
        setSearch("");
        setTimeframe("all_time");
        setDateFrom("");
        setDateTo("");
        setPrescribingDoctor("");
        setCancelledBy("");
      }}
      onRefresh={fetchReportData}
      exportData={records}
      exportFilename="pharmacy_cancellations_report"
      filters={
        <>
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder={i18n.t("Search by MRN...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={isLoading}
              className="w-full ps-10 pe-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary disabled:opacity-50"
            />
          </div>
          <TimeframeSelect value={timeframe} onChange={setTimeframe} disabled={isLoading} />
          <div>
            <select
              value={prescribingDoctor}
              onChange={(e) => setPrescribingDoctor(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-700 disabled:opacity-50"
            >
              <option value="">{i18n.t("All Prescribing Doctors")}</option>
              {doctors.map((d) => (
                <option key={d.doctor_id} value={`${d.first_name} ${d.last_name}`}>{d.first_name} {d.last_name}</option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={cancelledBy}
              onChange={(e) => setCancelledBy(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-700 disabled:opacity-50"
            >
              <option value="">{i18n.t("All Cancelled By")}</option>
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
        <table className="w-full text-start text-sm whitespace-nowrap">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">{i18n.t("Drug")}</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">{i18n.t("Patient")}</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">{i18n.t("Prescribing Doctor")}</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">{i18n.t("Cancelled By")}</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">{i18n.t("Ordered")}</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">{i18n.t("Cancelled")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.length > 0 ? (
              records.map((row, i) => (
                <tr key={`${row.mrn}-${i}`} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3.5 font-semibold text-slate-700 border-e border-slate-50">{renderValue(row.drug_name)}</td>
                  <td className="px-4 py-3.5 border-e border-slate-50">
                    <div className="font-semibold text-slate-700">{renderValue(row.patient_name)}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{i18n.t("MRN:")}{" "}{renderValue(row.mrn)}</div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-700 border-e border-slate-50">{renderValue(row.prescribing_doctor)}</td>
                  <td className="px-4 py-3.5 text-slate-700 border-e border-slate-50">{renderValue(row.cancelled_by)}</td>
                  <td className="px-4 py-3.5 text-slate-500 border-e border-slate-50">{renderValue(row.ordered_at)}</td>
                  <td className="px-4 py-3.5 font-bold text-red-600">{renderValue(row.cancelled_at)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-400 italic">{i18n.t("No cancelled prescriptions found.")}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </ReportShell>
  );
};

export default PharmacyCancellationsReport;
