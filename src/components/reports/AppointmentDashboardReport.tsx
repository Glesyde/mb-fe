import React, { useState, useEffect } from "react";
import { CalendarCheck, CheckCircle2, XCircle, UserX, Clock, Users } from "lucide-react";
import apiClient from "../../api/client";
import {
  renderValue,
  TimeframeSelect,
  CustomDateInputs,
  buildTimeframeParams,
  ReportShell,
  KpiCard,
  Pagination,
  usePagedRows,
} from "./billingReportShared";

const AppointmentDashboardReport: React.FC = () => {
  const [metadata, setMetadata] = useState<any>(null);
  const [kpis, setKpis] = useState<any>(null);
  const [reports, setReports] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [timeframe, setTimeframe] = useState("all_time");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchReportData = async () => {
    try {
      setIsLoading(true);
      const params = buildTimeframeParams(timeframe, dateFrom, dateTo);
      const response = await apiClient.get(`/appointments/overview/report?${params.join("&")}`);
      if (response.data && response.data.data) {
        setMetadata(response.data.data.metadata || null);
        setKpis(response.data.data.kpis || null);
        setReports(response.data.data.reports || null);
      } else {
        setMetadata(null);
        setKpis(null);
        setReports(null);
      }
    } catch (error) {
      console.error("Failed to fetch appointments dashboard report:", error);
      setMetadata(null);
      setKpis(null);
      setReports(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeframe, dateFrom, dateTo]);

  const doctorUtilization: any[] = reports?.doctor_utilization || [];
  const specialtyDemand: any[] = reports?.specialty_demand || [];

  const doctorUtilizationPage = usePagedRows(doctorUtilization, 10);
  const specialtyDemandPage = usePagedRows(specialtyDemand, 10);

  const exportData = [
    ...doctorUtilization.map((r) => ({ section: "Doctor Utilization", ...r })),
    ...specialtyDemand.map((r) => ({ section: "Specialty Demand", ...r })),
  ];

  return (
    <ReportShell
      title="Appointments Dashboard"
      subtitle="Enterprise appointments overview — visit outcomes, doctor utilization, and specialty demand."
      metaLine={metadata ? `Period: ${renderValue(metadata.report_period)}` : undefined}
      isLoading={isLoading}
      onClear={() => {
        setTimeframe("all_time");
        setDateFrom("");
        setDateTo("");
      }}
      onRefresh={fetchReportData}
      exportData={exportData}
      exportFilename="appointments_dashboard_report"
      filters={
        <>
          <TimeframeSelect value={timeframe} onChange={setTimeframe} disabled={isLoading} />
          {timeframe === "custom" && (
            <CustomDateInputs dateFrom={dateFrom} dateTo={dateTo} setDateFrom={setDateFrom} setDateTo={setDateTo} disabled={isLoading} />
          )}
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard icon={CalendarCheck} label="Total Appointments" value={kpis?.total_appointments ?? 0} colorClass="bg-blue-50 border-blue-100 text-blue-900" />
        <KpiCard icon={CheckCircle2} label="Completed Visits" value={kpis?.completed_visits ?? 0} colorClass="bg-emerald-50 border-emerald-100 text-emerald-900" />
        <KpiCard icon={XCircle} label="Cancelled Visits" value={kpis?.cancelled_visits ?? 0} colorClass="bg-red-50 border-red-100 text-red-900" />
        <KpiCard icon={UserX} label="No Shows" value={kpis?.no_shows ?? 0} colorClass="bg-amber-50 border-amber-100 text-amber-900" />
        <KpiCard icon={Clock} label="Pending Visits" value={kpis?.pending_visits ?? 0} colorClass="bg-purple-50 border-purple-100 text-purple-900" />
        <KpiCard icon={Users} label="Unique Patients" value={kpis?.unique_patients ?? 0} colorClass="bg-slate-50 border-slate-200 text-slate-900" />
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-3">Doctor Utilization</h3>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Doctor</th>
                <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Specialization</th>
                <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-right">Total Appointments</th>
                <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-right">Completed</th>
                <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-right">Cancelled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {doctorUtilizationPage.pageRows.length > 0 ? doctorUtilizationPage.pageRows.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-800">{renderValue(row.doctor_name)}</td>
                  <td className="px-4 py-3 text-slate-700">{renderValue(row.specialization)}</td>
                  <td className="px-4 py-3 text-slate-700 text-right">{renderValue(row.total_appointments)}</td>
                  <td className="px-4 py-3 text-slate-700 text-right">{renderValue(row.completed)}</td>
                  <td className="px-4 py-3 text-slate-700 text-right">{renderValue(row.cancelled)}</td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">No doctor utilization data.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {doctorUtilization.length > 0 && (
          <Pagination
            currentPage={doctorUtilizationPage.page}
            totalPages={doctorUtilizationPage.totalPages}
            totalRecords={doctorUtilizationPage.totalRecords}
            rangeStart={doctorUtilizationPage.indexOfFirst + 1}
            rangeEnd={Math.min(doctorUtilizationPage.indexOfLast, doctorUtilizationPage.totalRecords)}
            itemsPerPage={doctorUtilizationPage.pageSize}
            onPageChange={doctorUtilizationPage.setPage}
            onLimitChange={doctorUtilizationPage.setPageSize}
            limitOptions={[5, 10, 25, 50]}
          />
        )}
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-3">Specialty Demand</h3>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Specialization</th>
                <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-right">Total Volume</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {specialtyDemandPage.pageRows.length > 0 ? specialtyDemandPage.pageRows.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-700">{renderValue(row.specialization)}</td>
                  <td className="px-4 py-3 font-bold text-slate-800 text-right">{renderValue(row.total_volume)}</td>
                </tr>
              )) : (
                <tr><td colSpan={2} className="px-4 py-8 text-center text-slate-400 italic">No specialty demand data.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {specialtyDemand.length > 0 && (
          <Pagination
            currentPage={specialtyDemandPage.page}
            totalPages={specialtyDemandPage.totalPages}
            totalRecords={specialtyDemandPage.totalRecords}
            rangeStart={specialtyDemandPage.indexOfFirst + 1}
            rangeEnd={Math.min(specialtyDemandPage.indexOfLast, specialtyDemandPage.totalRecords)}
            itemsPerPage={specialtyDemandPage.pageSize}
            onPageChange={specialtyDemandPage.setPage}
            onLimitChange={specialtyDemandPage.setPageSize}
            limitOptions={[5, 10, 25, 50]}
          />
        )}
      </div>
    </ReportShell>
  );
};

export default AppointmentDashboardReport;
