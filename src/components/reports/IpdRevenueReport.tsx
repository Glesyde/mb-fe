import React, { useState, useEffect } from "react";
import { Search, Wallet, PercentCircle, Banknote } from "lucide-react";
import apiClient from "../../api/client";
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

const IpdRevenueReport: React.FC = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [metadata, setMetadata] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [mrn, setMrn] = useState("");
  const [patientName, setPatientName] = useState("");
  const [payerName, setPayerName] = useState("");
  const [payerType, setPayerType] = useState("");
  const [invoiceStatus, setInvoiceStatus] = useState("");
  const [timeframe, setTimeframe] = useState("all_time");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  const fetchReportData = async () => {
    try {
      setIsLoading(true);
      const params = buildTimeframeParams(timeframe, dateFrom, dateTo);
      if (search) params.push(`search=${encodeURIComponent(search)}`);
      if (mrn) params.push(`mrn=${encodeURIComponent(mrn)}`);
      if (patientName) params.push(`patient_name=${encodeURIComponent(patientName)}`);
      if (payerName) params.push(`payer_name=${encodeURIComponent(payerName)}`);
      if (payerType) params.push(`payer_type=${encodeURIComponent(payerType)}`);
      if (invoiceStatus) params.push(`invoice_status=${encodeURIComponent(invoiceStatus)}`);
      params.push(`limit=${itemsPerPage}`, `offset=${(currentPage - 1) * itemsPerPage}`);
      const response = await apiClient.get(`/report/ipd/revenue?${params.join("&")}`);
      if (response.data && response.data.data) {
        setRecords(response.data.data.records || []);
        setMetadata(response.data.data.metadata || null);
      } else {
        setRecords([]);
        setMetadata(null);
      }
    } catch (error) {
      console.error("Failed to fetch IPD financial ledger & payer breakdown report:", error);
      setRecords([]);
      setMetadata(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeframe, dateFrom, dateTo, search, mrn, patientName, payerName, payerType, invoiceStatus, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [timeframe, dateFrom, dateTo, search, mrn, patientName, payerName, payerType, invoiceStatus]);

  const totalRecords = metadata?.records_count ?? records.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / itemsPerPage));
  const offset = (currentPage - 1) * itemsPerPage;
  const aggregates = metadata?.aggregates;

  return (
    <ReportShell
      title="IPD Financial Ledger & Payer Breakdown"
      subtitle="Inpatient invoice ledger with gross, discount, and net revenue by payer."
      metaLine={metadata ? `Period: ${renderValue(metadata.period)}` : undefined}
      isLoading={isLoading}
      onClear={() => {
        setSearch("");
        setMrn("");
        setPatientName("");
        setPayerName("");
        setPayerType("");
        setInvoiceStatus("");
        setTimeframe("all_time");
        setDateFrom("");
        setDateTo("");
      }}
      onRefresh={fetchReportData}
      exportData={records}
      exportFilename="ipd_financial_ledger_payer_breakdown"
      filters={
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={isLoading}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary disabled:opacity-50"
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
          <div>
            <input
              type="text"
              placeholder="Patient name"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary disabled:opacity-50"
            />
          </div>
          <div>
            <input
              type="text"
              placeholder="Payer name"
              value={payerName}
              onChange={(e) => setPayerName(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary disabled:opacity-50"
            />
          </div>
          <div>
            <input
              type="text"
              placeholder="Payer type"
              value={payerType}
              onChange={(e) => setPayerType(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary disabled:opacity-50"
            />
          </div>
          <div>
            <input
              type="text"
              placeholder="Invoice status"
              value={invoiceStatus}
              onChange={(e) => setInvoiceStatus(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary disabled:opacity-50"
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
        <KpiCard icon={Wallet} label="Subtotal Gross Amount" value={formatCurrency(aggregates?.subtotal_gross_amount)} colorClass="bg-blue-50 border-blue-100 text-blue-900" />
        <KpiCard icon={PercentCircle} label="Subtotal Discount Amount" value={formatCurrency(aggregates?.subtotal_discount_amount)} colorClass="bg-amber-50 border-amber-100 text-amber-900" />
        <KpiCard icon={Banknote} label="Subtotal Net Amount" value={formatCurrency(aggregates?.subtotal_net_amount)} colorClass="bg-emerald-50 border-emerald-100 text-emerald-900" />
      </div>

      <div className="overflow-x-auto overflow-y-auto rounded-xl border border-slate-200 flex-1 min-h-[300px] mt-6">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Invoice</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Admission #</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Patient</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Payer</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-right">Gross Amount</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-right">Discount</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-right">Net Amount</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-right">Outstanding</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.length > 0 ? (
              records.map((row, i) => (
                <tr key={`${row.invoice_number}-${i}`} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3.5 font-mono text-xs text-slate-500 border-r border-slate-50">{renderValue(row.invoice_number)}</td>
                  <td className="px-4 py-3.5 font-mono text-xs text-slate-500 border-r border-slate-50">{renderValue(row.admission_number)}</td>
                  <td className="px-4 py-3.5 border-r border-slate-50">
                    <div className="font-semibold text-slate-700">{renderValue(row.patient_name)}</div>
                    <div className="text-[11px] text-slate-400 font-mono">MRN: {renderValue(row.mrn)}</div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-700 border-r border-slate-50">
                    <div>{renderValue(row.payer_name)}</div>
                    <div className="text-[11px] text-slate-400">{renderValue(row.payer_type)}</div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-700 border-r border-slate-50 text-right">{formatCurrency(row.gross_amount)}</td>
                  <td className="px-4 py-3.5 text-slate-700 border-r border-slate-50 text-right">{formatCurrency(row.discount_amount)}</td>
                  <td className="px-4 py-3.5 font-bold text-slate-800 border-r border-slate-50 text-right">{formatCurrency(row.net_amount)}</td>
                  <td className="px-4 py-3.5 font-bold text-red-600 border-r border-slate-50 text-right">{formatCurrency(row.outstanding_amount)}</td>
                  <td className="px-4 py-3.5">
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wider ${badgeClass(row.invoice_status)}`}>
                      {renderValue(row.invoice_status)}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-slate-400 italic">No IPD revenue records found.</td>
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

export default IpdRevenueReport;
