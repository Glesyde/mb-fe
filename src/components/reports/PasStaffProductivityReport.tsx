import React, { useState, useEffect } from "react";
import apiClient from "../../api/client";
import {
  renderValue,
  TimeframeSelect,
  CustomDateInputs,
  buildTimeframeParams,
  ReportShell,
  Pagination,
} from "./billingReportShared";
import { i18n } from "../../i18n";

const PasStaffProductivityReport: React.FC = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [metadata, setMetadata] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [timeframe, setTimeframe] = useState("all_time");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  const fetchReportData = async () => {
    try {
      setIsLoading(true);
      const params = buildTimeframeParams(timeframe, dateFrom, dateTo);
      params.push(`limit=${itemsPerPage}`, `offset=${(currentPage - 1) * itemsPerPage}`);
      const response = await apiClient.get(`/patient-admin/staff-productivity/report?${params.join("&")}`);
      if (response.data && response.data.data) {
        setRecords(response.data.data.records || []);
        setMetadata(response.data.data.metadata || null);
      } else {
        setRecords([]);
        setMetadata(null);
      }
    } catch (error) {
      console.error("Failed to fetch Registration Staff Productivity Audit:", error);
      setRecords([]);
      setMetadata(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeframe, dateFrom, dateTo, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [timeframe, dateFrom, dateTo]);

  const totalRecords = metadata?.records_count ?? records.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / itemsPerPage));
  const offset = (currentPage - 1) * itemsPerPage;

  return (
    <ReportShell
      title={i18n.t("Registration Staff Productivity Audit")}
      subtitle={i18n.t("Patient registrations logged per front-desk staff member.")}
      metaLine={metadata ? `Period: ${renderValue(metadata.period)}` : undefined}
      isLoading={isLoading}
      onClear={() => {
        setTimeframe("all_time");
        setDateFrom("");
        setDateTo("");
      }}
      onRefresh={fetchReportData}
      exportData={records}
      exportFilename="registration_staff_productivity_audit"
      filters={
        <>
          <TimeframeSelect value={timeframe} onChange={setTimeframe} disabled={isLoading} />
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
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">{i18n.t("Staff Code")}</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">{i18n.t("Staff Name")}</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">{i18n.t("Department")}</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-end">{i18n.t("Total Registrations")}</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">{i18n.t("First Registration")}</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">{i18n.t("Last Registration")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.length > 0 ? (
              records.map((row, i) => (
                <tr key={`${row.staff_id}-${i}`} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3.5 font-mono text-xs text-slate-500 border-e border-slate-50">{renderValue(row.staff_code)}</td>
                  <td className="px-4 py-3.5 font-bold text-slate-800 border-e border-slate-50">{renderValue(row.staff_name)}</td>
                  <td className="px-4 py-3.5 text-slate-700 border-e border-slate-50">{renderValue(row.department)}</td>
                  <td className="px-4 py-3.5 font-bold text-slate-800 border-e border-slate-50 text-end">{renderValue(row.total_registrations_logged)}</td>
                  <td className="px-4 py-3.5 text-slate-700 border-e border-slate-50">{renderValue(row.first_registration)}</td>
                  <td className="px-4 py-3.5 text-slate-700">{renderValue(row.last_registration)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-400 italic">{i18n.t("No staff productivity records found.")}</td>
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

export default PasStaffProductivityReport;