import React, { useState, useEffect } from "react";
import { Search, Wallet, AlertTriangle, TrendingUp, PiggyBank, Landmark } from "lucide-react";
import apiClient from "../../api/client";
import SearchableUserSelect from "../shared/SearchableUserSelect";
import {
  renderValue,
  formatCurrency,
  badgeClass,
  TimeframeSelect,
  CustomDateInputs,
  buildTimeframeParams,
  ReportShell,
  Pagination,
  KpiCard,
} from "./billingReportShared";
import { i18n } from "../../i18n";

const ITEM_TYPES = ["DRUG", "CONSUMABLE", "DEVICE"];

const DepositUtilizationReport: React.FC = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [aggregates, setAggregates] = useState<any>({});
  const [pagination, setPagination] = useState<{ total_records: number; limit: number; offset: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [timeframe, setTimeframe] = useState("all_time");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [location, setLocation] = useState("");
  const [itemType, setItemType] = useState("All");
  const [createdBy, setCreatedBy] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  const fetchReportData = async () => {
    try {
      setIsLoading(true);
      const params = buildTimeframeParams(timeframe, dateFrom, dateTo);
      if (location) params.push(`location=${encodeURIComponent(location)}`);
      if (itemType !== "All") params.push(`item_type=${itemType}`);
      if (createdBy) params.push(`created_by=${createdBy}`);
      params.push(`limit=${itemsPerPage}`, `offset=${(currentPage - 1) * itemsPerPage}`);

      const response = await apiClient.get(`/billing/ipd/deposit/utilization/report?${params.join("&")}`);
      if (response.data && response.data.data) {
        setRecords(response.data.data.records || []);
        setAggregates(response.data.data.metadata?.aggregates || {});
        setPagination(response.data.data.pagination || null);
      } else {
        setRecords([]);
        setAggregates({});
        setPagination(null);
      }
    } catch (error) {
      console.error("Failed to fetch deposit utilization report:", error);
      setRecords([]);
      setAggregates({});
      setPagination(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeframe, dateFrom, dateTo, location, itemType, createdBy, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [timeframe, dateFrom, dateTo, location, itemType, createdBy]);

  const filteredRecords = records.filter((r) =>
    renderValue(r.patient_name).toLowerCase().includes(searchTerm.toLowerCase()) ||
    renderValue(r.mrn).toLowerCase().includes(searchTerm.toLowerCase()) ||
    renderValue(r.admission_number).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalRecords = pagination?.total_records ?? filteredRecords.length;
  const limit = pagination?.limit ?? itemsPerPage;
  const offset = pagination?.offset ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalRecords / limit));

  return (
    <ReportShell
      title={i18n.t("IPD Deposit Utilization Report")}
      subtitle={i18n.t("Track deposit coverage and financial risk across active admissions.")}
      isLoading={isLoading}
      onClear={() => {
        setSearchTerm("");
        setTimeframe("all_time");
        setDateFrom("");
        setDateTo("");
        setLocation("");
        setItemType("All");
        setCreatedBy("");
      }}
      onRefresh={fetchReportData}
      exportData={filteredRecords}
      exportFilename="ipd_deposit_utilization_report"
      filters={
        <>
          <div className="relative lg:col-span-2">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder={i18n.t("Search patient, MRN, admission #...")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={isLoading}
              className="w-full ps-10 pe-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary disabled:opacity-50"
            />
          </div>
          <TimeframeSelect value={timeframe} onChange={setTimeframe} disabled={isLoading} />
          <div>
            <input
              type="text"
              placeholder={i18n.t("Location (e.g. ICU)")}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary disabled:opacity-50"
            />
          </div>
          <div>
            <select
              value={itemType}
              onChange={(e) => setItemType(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-700 disabled:opacity-50"
            >
              <option value="All">{i18n.t("All Item Types")}</option>
              {ITEM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <SearchableUserSelect value={createdBy} onChange={(id) => setCreatedBy(id ? String(id) : "")} placeholder={i18n.t("All Users")} />
          </div>
          {timeframe === "custom" && (
            <CustomDateInputs dateFrom={dateFrom} dateTo={dateTo} setDateFrom={setDateFrom} setDateTo={setDateTo} disabled={isLoading} />
          )}
        </>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard icon={Landmark} label={i18n.t("Total Admissions")} value={aggregates.total_admissions ?? 0} colorClass="bg-blue-50 border-blue-100 text-blue-900" />
        <KpiCard icon={AlertTriangle} label={i18n.t("Critical Risks")} value={aggregates.total_critical_risks ?? 0} colorClass="bg-red-50 border-red-100 text-red-900" />
        <KpiCard icon={TrendingUp} label={i18n.t("Gross Revenue")} value={formatCurrency(aggregates.total_ipd_gross_revenue)} colorClass="bg-purple-50 border-purple-100 text-purple-900" />
        <KpiCard icon={PiggyBank} label={i18n.t("Deposits Held")} value={formatCurrency(aggregates.total_deposits_held)} colorClass="bg-emerald-50 border-emerald-100 text-emerald-900" />
        <KpiCard icon={Wallet} label={i18n.t("Outstanding")} value={formatCurrency(aggregates.total_ipd_outstanding)} colorClass="bg-amber-50 border-amber-100 text-amber-900" />
      </div>

      <div className="overflow-x-auto overflow-y-auto rounded-xl border border-slate-200 flex-1 min-h-[300px] mt-6">
        <table className="w-full text-start text-sm whitespace-nowrap">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">{i18n.t("Admission")}</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">{i18n.t("Patient")}</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">{i18n.t("Doctor")}</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">{i18n.t("Ward / Bed")}</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-end">{i18n.t("LOS")}</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-end">{i18n.t("Net Amount")}</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-end">{i18n.t("Outstanding")}</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-end">{i18n.t("Deposit Paid")}</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-end">{i18n.t("Utilization")}</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">{i18n.t("Financial Risk")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredRecords.length > 0 ? (
              filteredRecords.map((row, i) => (
                <tr key={`${row.admission_id}-${i}`} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3.5 border-e border-slate-50">
                    <div className="font-bold text-slate-800">{renderValue(row.admission_number)}</div>
                    <div className="text-[11px] text-slate-400">{renderValue(row.admission_date)}</div>
                  </td>
                  <td className="px-4 py-3.5 border-e border-slate-50">
                    <div className="font-semibold text-slate-700">{renderValue(row.patient_name)}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{i18n.t("MRN:")}{" "}{renderValue(row.mrn)}</div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-700 border-e border-slate-50">{renderValue(row.admitted_doctor)}</td>
                  <td className="px-4 py-3.5 text-slate-700 border-e border-slate-50">
                    {[row.ward_name, row.room_number, row.bed_number].filter(Boolean).join(" • ") || "—"}
                  </td>
                  <td className="px-4 py-3.5 text-slate-700 border-e border-slate-50 text-end">{renderValue(row.length_of_stay)}</td>
                  <td className="px-4 py-3.5 font-bold text-slate-800 border-e border-slate-50 text-end">{formatCurrency(row.net_amount)}</td>
                  <td className="px-4 py-3.5 text-amber-700 font-bold border-e border-slate-50 text-end">{formatCurrency(row.outstanding_amount)}</td>
                  <td className="px-4 py-3.5 text-emerald-700 font-bold border-e border-slate-50 text-end">{formatCurrency(row.deposit_paid)}</td>
                  <td className="px-4 py-3.5 text-slate-700 border-e border-slate-50 text-end">{renderValue(row.utilization_percent)}%</td>
                  <td className="px-4 py-3.5">
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wider ${badgeClass(row.financial_risk)}`}>
                      {renderValue(row.financial_risk)}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-slate-400 italic">{i18n.t("No deposit utilization records found.")}</td>
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

export default DepositUtilizationReport;
