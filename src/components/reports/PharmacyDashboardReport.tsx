import React, { useState, useEffect } from "react";
import { Pill, TrendingUp, AlertTriangle } from "lucide-react";
import apiClient from "../../api/client";
import { userService } from "../../services/user.service";
import {
  renderValue,
  formatCurrency,
  TimeframeSelect,
  CustomDateInputs,
  buildTimeframeParams,
  ReportShell,
  KpiCard,
  Pagination,
  usePagedRows,
} from "./billingReportShared";

const PharmacyDashboardReport: React.FC = () => {
  const [metadata, setMetadata] = useState<any>(null);
  const [kpis, setKpis] = useState<any>(null);
  const [reports, setReports] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [timeframe, setTimeframe] = useState("all_time");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [prescribingDoctor, setPrescribingDoctor] = useState("");
  const [dispensedBy, setDispensedBy] = useState("");

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
      if (prescribingDoctor) params.push(`prescribing_doctor=${encodeURIComponent(prescribingDoctor)}`);
      if (dispensedBy) params.push(`dispensed_by=${encodeURIComponent(dispensedBy)}`);
      const query = params.length ? `?${params.join("&")}` : "";
      const response = await apiClient.get(`/report/pharmacy${query}`);
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
      console.error("Failed to fetch pharmacy dashboard report:", error);
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
  }, [timeframe, dateFrom, dateTo, prescribingDoctor, dispensedBy]);

  const topDispensedDrugs: any[] = reports?.top_dispensed_drugs || [];
  const prescribingDoctors: any[] = reports?.prescribing_doctors || [];
  const workloadDistribution: any[] = reports?.workload_distribution || [];
  const activeBacklog: any[] = reports?.active_backlog || [];

  const topDispensedDrugsPage = usePagedRows(topDispensedDrugs, 10);
  const prescribingDoctorsPage = usePagedRows(prescribingDoctors, 10);
  const workloadDistributionPage = usePagedRows(workloadDistribution, 10);
  const activeBacklogPage = usePagedRows(activeBacklog, 10);

  const backlogHeaders = activeBacklog.length > 0 ? Object.keys(activeBacklog[0]) : [];

  const exportData = [
    ...topDispensedDrugs.map((r) => ({ section: "Top Dispensed Drugs", ...r })),
    ...prescribingDoctors.map((r) => ({ section: "Prescribing Doctors", ...r })),
    ...workloadDistribution.map((r) => ({ section: "Workload Distribution", ...r })),
    ...activeBacklog.map((r) => ({ section: "Active Backlog", ...r })),
  ];

  return (
    <ReportShell
      title="Pharmacy Report"
      subtitle="Enterprise pharmacy dashboard — top drugs, prescribers, workload, and active backlog."
      metaLine={metadata ? `Period: ${renderValue(metadata.report_period)}` : undefined}
      isLoading={isLoading}
      onClear={() => {
        setTimeframe("all_time");
        setDateFrom("");
        setDateTo("");
        setPrescribingDoctor("");
        setDispensedBy("");
      }}
      onRefresh={fetchReportData}
      exportData={exportData}
      exportFilename="pharmacy_dashboard_report"
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard icon={Pill} label="Total Prescriptions" value={kpis?.total_prescriptions ?? 0} colorClass="bg-blue-50 border-blue-100 text-blue-900" />
        <KpiCard icon={TrendingUp} label="Total Gross Revenue" value={formatCurrency(kpis?.total_gross_revenue)} colorClass="bg-emerald-50 border-emerald-100 text-emerald-900" />
        <KpiCard icon={AlertTriangle} label="Active Bottlenecks" value={kpis?.active_bottlenecks ?? 0} colorClass="bg-red-50 border-red-100 text-red-900" />
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-3">Top Dispensed Drugs</h3>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Drug</th>
                <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Type</th>
                <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-right">Prescriptions</th>
                <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-right">Units Ordered</th>
                <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topDispensedDrugsPage.pageRows.length > 0 ? topDispensedDrugsPage.pageRows.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-700">{renderValue(row.drug_name)}</td>
                  <td className="px-4 py-3 text-slate-500">{renderValue(row.item_type)}</td>
                  <td className="px-4 py-3 text-slate-700 text-right">{renderValue(row.total_prescriptions)}</td>
                  <td className="px-4 py-3 text-slate-700 text-right">{renderValue(row.total_units_ordered)}</td>
                  <td className="px-4 py-3 font-bold text-slate-800 text-right">{formatCurrency(row.revenue_generated)}</td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">No dispensing data.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {topDispensedDrugs.length > 0 && (
          <Pagination
            currentPage={topDispensedDrugsPage.page}
            totalPages={topDispensedDrugsPage.totalPages}
            totalRecords={topDispensedDrugsPage.totalRecords}
            rangeStart={topDispensedDrugsPage.indexOfFirst + 1}
            rangeEnd={Math.min(topDispensedDrugsPage.indexOfLast, topDispensedDrugsPage.totalRecords)}
            itemsPerPage={topDispensedDrugsPage.pageSize}
            onPageChange={topDispensedDrugsPage.setPage}
            onLimitChange={topDispensedDrugsPage.setPageSize}
            limitOptions={[5, 10, 25, 50]}
          />
        )}
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-3">Prescribing Doctors</h3>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Prescribing Doctor</th>
                <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-right">Prescriptions Written</th>
                <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {prescribingDoctorsPage.pageRows.length > 0 ? prescribingDoctorsPage.pageRows.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-800">{renderValue(row.prescribing_doctor)}</td>
                  <td className="px-4 py-3 text-slate-700 text-right">{renderValue(row.total_prescriptions_written)}</td>
                  <td className="px-4 py-3 font-bold text-slate-800 text-right">{formatCurrency(row.revenue_generated)}</td>
                </tr>
              )) : (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400 italic">No prescriber data.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {prescribingDoctors.length > 0 && (
          <Pagination
            currentPage={prescribingDoctorsPage.page}
            totalPages={prescribingDoctorsPage.totalPages}
            totalRecords={prescribingDoctorsPage.totalRecords}
            rangeStart={prescribingDoctorsPage.indexOfFirst + 1}
            rangeEnd={Math.min(prescribingDoctorsPage.indexOfLast, prescribingDoctorsPage.totalRecords)}
            itemsPerPage={prescribingDoctorsPage.pageSize}
            onPageChange={prescribingDoctorsPage.setPage}
            onLimitChange={prescribingDoctorsPage.setPageSize}
            limitOptions={[5, 10, 25, 50]}
          />
        )}
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-3">Workload Distribution</h3>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Patient Origin</th>
                <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-right">Prescription Volume</th>
                <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {workloadDistributionPage.pageRows.length > 0 ? workloadDistributionPage.pageRows.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-800">{renderValue(row.patient_origin)}</td>
                  <td className="px-4 py-3 text-slate-700 text-right">{renderValue(row.prescription_volume)}</td>
                  <td className="px-4 py-3 font-bold text-slate-800 text-right">{formatCurrency(row.revenue_generated)}</td>
                </tr>
              )) : (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400 italic">No workload data.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {workloadDistribution.length > 0 && (
          <Pagination
            currentPage={workloadDistributionPage.page}
            totalPages={workloadDistributionPage.totalPages}
            totalRecords={workloadDistributionPage.totalRecords}
            rangeStart={workloadDistributionPage.indexOfFirst + 1}
            rangeEnd={Math.min(workloadDistributionPage.indexOfLast, workloadDistributionPage.totalRecords)}
            itemsPerPage={workloadDistributionPage.pageSize}
            onPageChange={workloadDistributionPage.setPage}
            onLimitChange={workloadDistributionPage.setPageSize}
            limitOptions={[5, 10, 25, 50]}
          />
        )}
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-3">Active Backlog</h3>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {backlogHeaders.length > 0 ? backlogHeaders.map((header) => (
                  <th key={header} className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px]">
                    {header.replace(/_/g, " ")}
                  </th>
                )) : (
                  <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Backlog</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeBacklogPage.pageRows.length > 0 ? activeBacklogPage.pageRows.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                  {backlogHeaders.map((header) => (
                    <td key={header} className="px-4 py-3 text-slate-700">{renderValue(row[header])}</td>
                  ))}
                </tr>
              )) : (
                <tr><td colSpan={backlogHeaders.length || 1} className="px-4 py-8 text-center text-slate-400 italic">No active backlog.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {activeBacklog.length > 0 && (
          <Pagination
            currentPage={activeBacklogPage.page}
            totalPages={activeBacklogPage.totalPages}
            totalRecords={activeBacklogPage.totalRecords}
            rangeStart={activeBacklogPage.indexOfFirst + 1}
            rangeEnd={Math.min(activeBacklogPage.indexOfLast, activeBacklogPage.totalRecords)}
            itemsPerPage={activeBacklogPage.pageSize}
            onPageChange={activeBacklogPage.setPage}
            onLimitChange={activeBacklogPage.setPageSize}
            limitOptions={[5, 10, 25, 50]}
          />
        )}
      </div>
    </ReportShell>
  );
};

export default PharmacyDashboardReport;
