import React, { useState, useEffect } from "react";
import { Search, ShieldAlert, Banknote } from "lucide-react";
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

const CancellationAuditReport: React.FC = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [timeframe, setTimeframe] = useState("all_time");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const fetchReportData = async () => {
    try {
      setIsLoading(true);
      const params = buildTimeframeParams(timeframe, dateFrom, dateTo);
      const query = params.length ? `?${params.join("&")}` : "";
      const response = await apiClient.get(`/billing/cancellation/report${query}`);
      if (response.data && response.data.data) {
        setRecords(response.data.data.records || []);
        setSummary(response.data.data.summary || null);
        setMetadata(response.data.data.metadata || null);
      } else {
        setRecords([]);
        setSummary(null);
        setMetadata(null);
      }
    } catch (error) {
      console.error("Failed to fetch cancellation & reversal audit report:", error);
      setRecords([]);
      setSummary(null);
      setMetadata(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeframe, dateFrom, dateTo]);

  useEffect(() => {
    setCurrentPage(1);
  }, [timeframe, dateFrom, dateTo, searchTerm]);

  const filteredRecords = records.filter((r) =>
    renderValue(r.patient_name).toLowerCase().includes(searchTerm.toLowerCase()) ||
    renderValue(r.mrn).toLowerCase().includes(searchTerm.toLowerCase()) ||
    renderValue(r.reference).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalRecords = filteredRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / itemsPerPage));
  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentItems = filteredRecords.slice(indexOfFirst, indexOfLast);

  return (
    <ReportShell
      title="Cancellation & Reversal Audit"
      subtitle="Security audit of invoice cancellations and financial reversals."
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
      exportFilename="cancellation_reversal_audit_report"
      filters={
        <>
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search patient, MRN, reference..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={isLoading}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary disabled:opacity-50"
            />
          </div>
          <TimeframeSelect value={timeframe} onChange={setTimeframe} disabled={isLoading} />
          {timeframe === "custom" && (
            <CustomDateInputs dateFrom={dateFrom} dateTo={dateTo} setDateFrom={setDateFrom} setDateTo={setDateTo} disabled={isLoading} />
          )}
        </>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <KpiCard icon={ShieldAlert} label="Total Security Events" value={summary?.total_security_events ?? 0} colorClass="bg-red-50 border-red-100 text-red-900" />
        <KpiCard icon={Banknote} label="Financial Value Impacted" value={formatCurrency(summary?.total_financial_value_impacted)} colorClass="bg-amber-50 border-amber-100 text-amber-900" />
      </div>

      <div className="overflow-x-auto overflow-y-auto rounded-xl border border-slate-200 flex-1 min-h-[300px] mt-6">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Event</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Reference</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Date</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Patient</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Acted By</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-right">Value Impact</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {currentItems.length > 0 ? (
              currentItems.map((row, i) => (
                <tr key={`${row.reference}-${i}`} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3.5 border-r border-slate-50">
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wider ${badgeClass(row.audit_event)}`}>
                      {renderValue(row.audit_event)?.toString().replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-bold text-slate-800 border-r border-slate-50">{renderValue(row.reference)}</td>
                  <td className="px-4 py-3.5 text-slate-500 border-r border-slate-50">{renderValue(row.event_date)}</td>
                  <td className="px-4 py-3.5 border-r border-slate-50">
                    <div className="font-semibold text-slate-700">{renderValue(row.patient_name)}</div>
                    <div className="text-[11px] text-slate-400 font-mono">MRN: {renderValue(row.mrn)}</div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-700 border-r border-slate-50">{renderValue(row.acted_by)}</td>
                  <td className="px-4 py-3.5 font-bold text-red-600 text-right">{formatCurrency(row.value_impact)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-400 italic">No cancellation or reversal events found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filteredRecords.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalRecords={totalRecords}
          rangeStart={indexOfFirst + 1}
          rangeEnd={Math.min(indexOfLast, totalRecords)}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onLimitChange={(v) => { setItemsPerPage(v); setCurrentPage(1); }}
          limitOptions={[10, 25, 50, 100]}
        />
      )}
    </ReportShell>
  );
};

export default CancellationAuditReport;
