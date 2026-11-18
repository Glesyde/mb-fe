import React, { useState, useEffect } from "react";
import { Radiation, TrendingUp, AlertTriangle } from "lucide-react";
import apiClient from "../../api/client";
import { userService } from "../../services/user.service";
import { patientService } from "../../services/patient.service";
import {
  renderValue,
  formatCurrency,
  badgeClass,
  TimeframeSelect,
  CustomDateInputs,
  buildTimeframeParams,
  ReportShell,
  KpiCard,
  Pagination,
  usePagedRows,
} from "./billingReportShared";
import { i18n } from "../../i18n";

const RadiologyDashboardReport: React.FC = () => {
  const [metadata, setMetadata] = useState<any>(null);
  const [kpis, setKpis] = useState<any>(null);
  const [reports, setReports] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [timeframe, setTimeframe] = useState("all_time");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [specializationId, setSpecializationId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [payerTypeId, setPayerTypeId] = useState("");

  const [specializations, setSpecializations] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [payerTypes, setPayerTypes] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      userService.getSpecializations(),
      userService.getDoctors(),
      patientService.getPayerTypes(),
    ]).then(([specs, docs, payers]) => {
      setSpecializations(specs);
      setDoctors(docs);
      setPayerTypes(payers);
    }).catch(() => {});
  }, []);

  const fetchReportData = async () => {
    try {
      setIsLoading(true);
      const params = buildTimeframeParams(timeframe, dateFrom, dateTo);
      if (specializationId) params.push(`specialization_id=${specializationId}`);
      if (doctorId) params.push(`doctor_id=${doctorId}`);
      if (payerTypeId) params.push(`payer_type_id=${payerTypeId}`);
      const query = params.length ? `?${params.join("&")}` : "";
      const response = await apiClient.get(`/report/radiology${query}`);
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
      console.error("Failed to fetch radiology dashboard report:", error);
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
  }, [timeframe, dateFrom, dateTo, specializationId, doctorId, payerTypeId]);

  const modalityYieldMatrix: any[] = reports?.modality_yield_matrix || [];
  const topReferringDoctors: any[] = reports?.top_referring_doctors || [];
  const workloadDistribution: any[] = reports?.workload_distribution || [];
  const payorYieldMatrix: any[] = reports?.payor_yield_matrix || [];
  const activePendingBacklog: any[] = reports?.active_pending_backlog || [];

  const modalityYieldMatrixPage = usePagedRows(modalityYieldMatrix, 10);
  const topReferringDoctorsPage = usePagedRows(topReferringDoctors, 10);
  const workloadDistributionPage = usePagedRows(workloadDistribution, 10);
  const payorYieldMatrixPage = usePagedRows(payorYieldMatrix, 10);
  const activePendingBacklogPage = usePagedRows(activePendingBacklog, 10);

  const exportData = [
    ...modalityYieldMatrix.map((r) => ({ section: "Modality Yield Matrix", ...r })),
    ...topReferringDoctors.map((r) => ({ section: "Top Referring Doctors", ...r })),
    ...workloadDistribution.map((r) => ({ section: "Workload Distribution", ...r })),
    ...payorYieldMatrix.map((r) => ({ section: "Payor Yield Matrix", ...r })),
    ...activePendingBacklog.map((r) => ({ section: "Active Pending Backlog", ...r })),
  ];

  return (
    <ReportShell
      title={i18n.t("Radiology Report")}
      subtitle={i18n.t("Enterprise radiology dashboard — modality yield, referrers, workload, payors, and backlog.")}
      metaLine={metadata ? `Period: ${renderValue(metadata.report_period)}` : undefined}
      isLoading={isLoading}
      onClear={() => {
        setTimeframe("all_time");
        setDateFrom("");
        setDateTo("");
        setSpecializationId("");
        setDoctorId("");
        setPayerTypeId("");
      }}
      onRefresh={fetchReportData}
      exportData={exportData}
      exportFilename="radiology_dashboard_report"
      filters={
        <>
          <TimeframeSelect value={timeframe} onChange={setTimeframe} disabled={isLoading} />
          <div>
            <select
              value={specializationId}
              onChange={(e) => setSpecializationId(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-700 disabled:opacity-50"
            >
              <option value="">{i18n.t("All Specializations")}</option>
              {specializations.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <select
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-700 disabled:opacity-50"
            >
              <option value="">{i18n.t("All Doctors")}</option>
              {doctors.map((d) => <option key={d.doctor_id} value={d.doctor_id}>{d.first_name} {d.last_name}</option>)}
            </select>
          </div>
          <div>
            <select
              value={payerTypeId}
              onChange={(e) => setPayerTypeId(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-700 disabled:opacity-50"
            >
              <option value="">{i18n.t("All Payers")}</option>
              {payerTypes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          {timeframe === "custom" && (
            <CustomDateInputs dateFrom={dateFrom} dateTo={dateTo} setDateFrom={setDateFrom} setDateTo={setDateTo} disabled={isLoading} />
          )}
        </>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard icon={Radiation} label={i18n.t("Total Radiology Orders")} value={kpis?.total_radiology_orders ?? 0} colorClass="bg-blue-50 border-blue-100 text-blue-900" />
        <KpiCard icon={TrendingUp} label={i18n.t("Total Gross Revenue")} value={formatCurrency(kpis?.total_gross_revenue)} colorClass="bg-emerald-50 border-emerald-100 text-emerald-900" />
        <KpiCard icon={AlertTriangle} label={i18n.t("Active Bottlenecks")} value={kpis?.active_bottlenecks ?? 0} colorClass="bg-red-50 border-red-100 text-red-900" />
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-3">{i18n.t("Modality Yield Matrix")}</h3>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-start text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px]">{i18n.t("Modality Group")}</th>
                <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-end">{i18n.t("Scans Ordered")}</th>
                <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-end">{i18n.t("Scans Completed")}</th>
                <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-end">{i18n.t("Gross Expected Revenue")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {modalityYieldMatrixPage.pageRows.length > 0 ? modalityYieldMatrixPage.pageRows.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-800">{renderValue(row.modality_group)}</td>
                  <td className="px-4 py-3 text-slate-700 text-end">{renderValue(row.total_scans_ordered)}</td>
                  <td className="px-4 py-3 text-slate-700 text-end">{renderValue(row.scans_completed)}</td>
                  <td className="px-4 py-3 font-bold text-slate-800 text-end">{formatCurrency(row.gross_expected_revenue)}</td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic">{i18n.t("No modality yield data.")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {modalityYieldMatrix.length > 0 && (
          <Pagination
            currentPage={modalityYieldMatrixPage.page}
            totalPages={modalityYieldMatrixPage.totalPages}
            totalRecords={modalityYieldMatrixPage.totalRecords}
            rangeStart={modalityYieldMatrixPage.indexOfFirst + 1}
            rangeEnd={Math.min(modalityYieldMatrixPage.indexOfLast, modalityYieldMatrixPage.totalRecords)}
            itemsPerPage={modalityYieldMatrixPage.pageSize}
            onPageChange={modalityYieldMatrixPage.setPage}
            onLimitChange={modalityYieldMatrixPage.setPageSize}
            limitOptions={[5, 10, 25, 50]}
          />
        )}
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-3">{i18n.t("Top Referring Doctors")}</h3>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-start text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px]">{i18n.t("Referring Doctor")}</th>
                <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-end">{i18n.t("Referrals")}</th>
                <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-end">{i18n.t("Revenue")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topReferringDoctorsPage.pageRows.length > 0 ? topReferringDoctorsPage.pageRows.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-700">{renderValue(row.referring_doctor)}</td>
                  <td className="px-4 py-3 text-slate-700 text-end">{renderValue(row.total_referrals)}</td>
                  <td className="px-4 py-3 font-bold text-slate-800 text-end">{formatCurrency(row.revenue_generated)}</td>
                </tr>
              )) : (
                <tr><td colSpan={3} className="px-4 py-6 text-center text-slate-400 italic">{i18n.t("No data.")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {topReferringDoctors.length > 0 && (
          <Pagination
            currentPage={topReferringDoctorsPage.page}
            totalPages={topReferringDoctorsPage.totalPages}
            totalRecords={topReferringDoctorsPage.totalRecords}
            rangeStart={topReferringDoctorsPage.indexOfFirst + 1}
            rangeEnd={Math.min(topReferringDoctorsPage.indexOfLast, topReferringDoctorsPage.totalRecords)}
            itemsPerPage={topReferringDoctorsPage.pageSize}
            onPageChange={topReferringDoctorsPage.setPage}
            onLimitChange={topReferringDoctorsPage.setPageSize}
            limitOptions={[5, 10, 25, 50]}
          />
        )}
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-3">{i18n.t("Workload Distribution")}</h3>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-start text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px]">{i18n.t("Patient Origin")}</th>
                <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-end">{i18n.t("Scan Volume")}</th>
                <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-end">{i18n.t("Revenue")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {workloadDistributionPage.pageRows.length > 0 ? workloadDistributionPage.pageRows.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-800">{renderValue(row.patient_origin)}</td>
                  <td className="px-4 py-3 text-slate-700 text-end">{renderValue(row.scan_volume)}</td>
                  <td className="px-4 py-3 font-bold text-slate-800 text-end">{formatCurrency(row.revenue_generated)}</td>
                </tr>
              )) : (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400 italic">{i18n.t("No workload data.")}</td></tr>
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
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-3">{i18n.t("Payor Yield Matrix")}</h3>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-start text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px]">{i18n.t("Payor")}</th>
                <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px]">{i18n.t("Category")}</th>
                <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-end">{i18n.t("Scan Volume")}</th>
                <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-end">{i18n.t("Gross Billed")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payorYieldMatrixPage.pageRows.length > 0 ? payorYieldMatrixPage.pageRows.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-800">{renderValue(row.payor_name)}</td>
                  <td className="px-4 py-3 text-slate-700">{renderValue(row.payor_category)}</td>
                  <td className="px-4 py-3 text-slate-700 text-end">{renderValue(row.scan_volume)}</td>
                  <td className="px-4 py-3 font-bold text-slate-800 text-end">{formatCurrency(row.gross_billed)}</td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic">{i18n.t("No payor yield data.")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {payorYieldMatrix.length > 0 && (
          <Pagination
            currentPage={payorYieldMatrixPage.page}
            totalPages={payorYieldMatrixPage.totalPages}
            totalRecords={payorYieldMatrixPage.totalRecords}
            rangeStart={payorYieldMatrixPage.indexOfFirst + 1}
            rangeEnd={Math.min(payorYieldMatrixPage.indexOfLast, payorYieldMatrixPage.totalRecords)}
            itemsPerPage={payorYieldMatrixPage.pageSize}
            onPageChange={payorYieldMatrixPage.setPage}
            onLimitChange={payorYieldMatrixPage.setPageSize}
            limitOptions={[5, 10, 25, 50]}
          />
        )}
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-3">{i18n.t("Active Pending Backlog")}</h3>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-start text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px]">{i18n.t("Ordered At")}</th>
                <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px]">{i18n.t("Requested Scan")}</th>
                <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px]">{i18n.t("Patient")}</th>
                <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px]">{i18n.t("Ordering Doctor")}</th>
                <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px]">{i18n.t("Status")}</th>
                <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-end">{i18n.t("Days Waiting")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activePendingBacklogPage.pageRows.length > 0 ? activePendingBacklogPage.pageRows.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 text-slate-500">{renderValue(row.ordered_at)}</td>
                  <td className="px-4 py-3 font-semibold text-slate-700">{renderValue(row.requested_scan)}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-700">{renderValue(row.patient_name)}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{i18n.t("MRN:")}{" "}{renderValue(row.mrn)}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{renderValue(row.ordering_doctor)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wider ${badgeClass(row.processing_status)}`}>
                      {renderValue(row.processing_status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-red-600 text-end">{renderValue(row.days_waiting)}</td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic">{i18n.t("No pending backlog.")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {activePendingBacklog.length > 0 && (
          <Pagination
            currentPage={activePendingBacklogPage.page}
            totalPages={activePendingBacklogPage.totalPages}
            totalRecords={activePendingBacklogPage.totalRecords}
            rangeStart={activePendingBacklogPage.indexOfFirst + 1}
            rangeEnd={Math.min(activePendingBacklogPage.indexOfLast, activePendingBacklogPage.totalRecords)}
            itemsPerPage={activePendingBacklogPage.pageSize}
            onPageChange={activePendingBacklogPage.setPage}
            onLimitChange={activePendingBacklogPage.setPageSize}
            limitOptions={[5, 10, 25, 50]}
          />
        )}
      </div>
    </ReportShell>
  );
};

export default RadiologyDashboardReport;
