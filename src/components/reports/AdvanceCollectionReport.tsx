import React, { useState, useEffect } from "react";
import { Search, PiggyBank } from "lucide-react";
import apiClient from "../../api/client";
import {
  renderValue,
  formatCurrency,
  TimeframeSelect,
  CustomDateInputs,
  buildTimeframeParams,
  ReportShell,
  Pagination,
  KpiCard,
} from "./billingReportShared";
import { i18n } from "../../i18n";

const AdvanceCollectionReport: React.FC = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const [pagination, setPagination] = useState<{ total_records: number; total_pages: number; current_page: number; limit: number; offset: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
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

      const response = await apiClient.get(`/billing/advance/collection/report?${params.join("&")}`);
      if (response.data && response.data.data) {
        setRecords(response.data.data.records || []);
        setSummary(response.data.data.summary || null);
        setMetadata(response.data.data.metadata || null);
        setPagination(response.data.data.pagination || null);
      } else {
        setRecords([]);
        setSummary(null);
        setMetadata(null);
        setPagination(null);
      }
    } catch (error) {
      console.error("Failed to fetch advance collection report:", error);
      setRecords([]);
      setSummary(null);
      setMetadata(null);
      setPagination(null);
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

  const filteredRecords = records.filter((r) =>
    renderValue(r.patient_name).toLowerCase().includes(searchTerm.toLowerCase()) ||
    renderValue(r.mrn).toLowerCase().includes(searchTerm.toLowerCase()) ||
    renderValue(r.receipt_number).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalRecords = pagination?.total_records ?? filteredRecords.length;
  const totalPages = pagination?.total_pages ?? 1;
  const offset = pagination?.offset ?? 0;

  return (
    <ReportShell
      title={i18n.t("Advance Collection Report")}
      subtitle={i18n.t("Track deposit and advance payments collected from patients.")}
      metaLine={metadata ? `Period: ${renderValue(metadata.report_period)}` : undefined}
      isLoading={isLoading}
      onClear={() => {
        setSearchTerm("");
        setTimeframe("all_time");
        setDateFrom("");
        setDateTo("");
      }}
      onRefresh={fetchReportData}
      exportData={filteredRecords}
      exportFilename="advance_collection_report"
      filters={
        <>
          <div className="relative lg:col-span-2">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder={i18n.t("Search patient, MRN, receipt #...")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={isLoading}
              className="w-full ps-10 pe-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary disabled:opacity-50"
            />
          </div>
          <TimeframeSelect value={timeframe} onChange={setTimeframe} disabled={isLoading} />
          {timeframe === "custom" && (
            <CustomDateInputs dateFrom={dateFrom} dateTo={dateTo} setDateFrom={setDateFrom} setDateTo={setDateTo} disabled={isLoading} />
          )}
        </>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard icon={PiggyBank} label={i18n.t("Total Advance Collected")} value={formatCurrency(summary?.total_cash_collected)} colorClass="bg-emerald-50 border-emerald-100 text-emerald-900" />
      </div>

      <div className="overflow-x-auto overflow-y-auto rounded-xl border border-slate-200 flex-1 min-h-[300px] mt-6">
        <table className="w-full text-start text-sm whitespace-nowrap">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">{i18n.t("Type")}</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">{i18n.t("Date")}</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">{i18n.t("Receipt #")}</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">{i18n.t("Patient")}</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">{i18n.t("Method")}</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">{i18n.t("Cashier")}</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-end">{i18n.t("Amount")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredRecords.length > 0 ? (
              filteredRecords.map((row, i) => (
                <tr key={`${row.transaction_id}-${i}`} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3.5 text-slate-700 border-e border-slate-50">{renderValue(row.collection_type)?.toString().replace(/_/g, " ")}</td>
                  <td className="px-4 py-3.5 text-slate-500 border-e border-slate-50">{renderValue(row.transaction_date)}</td>
                  <td className="px-4 py-3.5 text-slate-700 border-e border-slate-50">{renderValue(row.receipt_number)}</td>
                  <td className="px-4 py-3.5 border-e border-slate-50">
                    <div className="font-semibold text-slate-700">{renderValue(row.patient_name)}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{i18n.t("MRN:")}{" "}{renderValue(row.mrn)}</div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-700 border-e border-slate-50">{renderValue(row.payment_method)}</td>
                  <td className="px-4 py-3.5 text-slate-700 border-e border-slate-50">{renderValue(row.cashier_name)}</td>
                  <td className="px-4 py-3.5 font-bold text-slate-800 text-end">{formatCurrency(row.amount)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-400 italic">{i18n.t("No advance collection records found.")}</td>
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

export default AdvanceCollectionReport;
