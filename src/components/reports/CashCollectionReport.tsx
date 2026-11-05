import React, { useState, useEffect } from "react";
import { Search, Banknote } from "lucide-react";
import apiClient from "../../api/client";
import { billingService } from "../../services/billing.service";
import SearchableUserSelect from "../shared/SearchableUserSelect";
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

const COLLECTION_TYPES = ["INVOICE_PAYMENT", "DEPOSIT"];

const CashCollectionReport: React.FC = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const [pagination, setPagination] = useState<{ total_records: number; total_pages: number; current_page: number; limit: number; offset: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [timeframe, setTimeframe] = useState("all_time");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [cashierId, setCashierId] = useState("");
  const [collectionType, setCollectionType] = useState("All");

  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  useEffect(() => {
    billingService.getPaymentMethods().then(setPaymentMethods).catch(() => setPaymentMethods([]));
  }, []);

  const fetchReportData = async () => {
    try {
      setIsLoading(true);
      const params = buildTimeframeParams(timeframe, dateFrom, dateTo);
      if (paymentMethodId) params.push(`payment_method_id=${paymentMethodId}`);
      if (cashierId) params.push(`cashier_id=${cashierId}`);
      if (collectionType !== "All") params.push(`collection_type=${collectionType}`);
      params.push(`limit=${itemsPerPage}`, `offset=${(currentPage - 1) * itemsPerPage}`);

      const response = await apiClient.get(`/billing/cash/collection/report?${params.join("&")}`);
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
      console.error("Failed to fetch cash collection report:", error);
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
  }, [timeframe, dateFrom, dateTo, paymentMethodId, cashierId, collectionType, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [timeframe, dateFrom, dateTo, paymentMethodId, cashierId, collectionType]);

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
      title="Cash Collection Report"
      subtitle="Track daily cash collections by payment method and cashier."
      metaLine={metadata ? `Period: ${renderValue(metadata.report_period)}` : undefined}
      isLoading={isLoading}
      onClear={() => {
        setSearchTerm("");
        setTimeframe("all_time");
        setDateFrom("");
        setDateTo("");
        setPaymentMethodId("");
        setCashierId("");
        setCollectionType("All");
      }}
      onRefresh={fetchReportData}
      exportData={filteredRecords}
      exportFilename="cash_collection_report"
      filters={
        <>
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search patient, MRN, receipt #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={isLoading}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary disabled:opacity-50"
            />
          </div>
          <TimeframeSelect value={timeframe} onChange={setTimeframe} disabled={isLoading} />
          <div>
            <select
              value={paymentMethodId}
              onChange={(e) => setPaymentMethodId(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-700 disabled:opacity-50"
            >
              <option value="">All Payment Methods</option>
              {paymentMethods.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <select
              value={collectionType}
              onChange={(e) => setCollectionType(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-700 disabled:opacity-50"
            >
              <option value="All">All Collection Types</option>
              {COLLECTION_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
            </select>
          </div>
          <div>
            <SearchableUserSelect value={cashierId} onChange={(id) => setCashierId(id ? String(id) : "")} placeholder="All Cashiers" />
          </div>
          {timeframe === "custom" && (
            <CustomDateInputs dateFrom={dateFrom} dateTo={dateTo} setDateFrom={setDateFrom} setDateTo={setDateTo} disabled={isLoading} />
          )}
        </>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard icon={Banknote} label="Total Cash Collected" value={formatCurrency(summary?.total_cash_collected)} colorClass="bg-emerald-50 border-emerald-100 text-emerald-900" />
      </div>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-3">Breakdown by Method</h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Method</th>
                    <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(summary.breakdown_by_method || []).length > 0 ? (
                    summary.breakdown_by_method.map((row: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-700">{renderValue(row.payment_method)}</td>
                        <td className="px-4 py-3 font-bold text-slate-800 text-right">{formatCurrency(row.total)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={2} className="px-4 py-6 text-center text-slate-400 italic">No data.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-3">Breakdown by Cashier</h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Cashier</th>
                    <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(summary.breakdown_by_cashier || []).length > 0 ? (
                    summary.breakdown_by_cashier.map((row: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-700">{renderValue(row.cashier_name)}</td>
                        <td className="px-4 py-3 font-bold text-slate-800 text-right">{formatCurrency(row.total)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={2} className="px-4 py-6 text-center text-slate-400 italic">No data.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto overflow-y-auto rounded-xl border border-slate-200 flex-1 min-h-[300px] mt-6">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Type</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Date</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Receipt #</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Patient</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Method</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Cashier</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredRecords.length > 0 ? (
              filteredRecords.map((row, i) => (
                <tr key={`${row.transaction_id}-${i}`} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3.5 text-slate-700 border-r border-slate-50">{renderValue(row.collection_type)?.toString().replace(/_/g, " ")}</td>
                  <td className="px-4 py-3.5 text-slate-500 border-r border-slate-50">{renderValue(row.transaction_date)}</td>
                  <td className="px-4 py-3.5 text-slate-700 border-r border-slate-50">{renderValue(row.receipt_number)}</td>
                  <td className="px-4 py-3.5 border-r border-slate-50">
                    <div className="font-semibold text-slate-700">{renderValue(row.patient_name)}</div>
                    <div className="text-[11px] text-slate-400 font-mono">MRN: {renderValue(row.mrn)}</div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-700 border-r border-slate-50">{renderValue(row.payment_method)}</td>
                  <td className="px-4 py-3.5 text-slate-700 border-r border-slate-50">{renderValue(row.cashier_name)}</td>
                  <td className="px-4 py-3.5 font-bold text-slate-800 text-right">{formatCurrency(row.amount)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-400 italic">No cash collection records found.</td>
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

export default CashCollectionReport;
