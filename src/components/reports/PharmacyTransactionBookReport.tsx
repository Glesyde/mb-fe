import React, { useState, useEffect } from "react";
import { Search } from "lucide-react";
import apiClient from "../../api/client";
import {
  renderValue,
  badgeClass,
  TimeframeSelect,
  CustomDateInputs,
  buildTimeframeParams,
  ReportShell,
  Pagination,
} from "./billingReportShared";

const PharmacyTransactionBookReport: React.FC = () => {
  const [records, setRecords] = useState<any[]>([]);
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
      const response = await apiClient.get(`/inventory/transactions/book/report${query}`);
      if (response.data && response.data.data) {
        setRecords(response.data.data || []);
      } else {
        setRecords([]);
      }
    } catch (error) {
      console.error("Failed to fetch pharmacy transaction book report:", error);
      setRecords([]);
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
    renderValue(r.item_name).toLowerCase().includes(searchTerm.toLowerCase()) ||
    renderValue(r.batch_number).toLowerCase().includes(searchTerm.toLowerCase()) ||
    renderValue(r.handled_by).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalRecords = filteredRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / itemsPerPage));
  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentItems = filteredRecords.slice(indexOfFirst, indexOfLast);

  return (
    <ReportShell
      title="Pharmacy Transaction Book"
      subtitle="Transactions and item movements across the pharmacy store."
      isLoading={isLoading}
      onClear={() => {
        setSearchTerm("");
        setTimeframe("all_time");
        setDateFrom("");
        setDateTo("");
      }}
      onRefresh={fetchReportData}
      exportData={filteredRecords}
      exportFilename="pharmacy_transaction_book_report"
      filters={
        <>
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search item, batch, handled by..."
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
      <div className="overflow-x-auto overflow-y-auto rounded-xl border border-slate-200 flex-1 min-h-[300px]">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Date</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Item</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Batch</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Movement</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Reference</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Source</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Destination</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-right">Quantity</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Handled By</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {currentItems.length > 0 ? (
              currentItems.map((row, i) => (
                <tr key={`${row.batch_number}-${i}`} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3.5 text-slate-500 border-r border-slate-50">{renderValue(row.transaction_date)}</td>
                  <td className="px-4 py-3.5 font-semibold text-slate-700 border-r border-slate-50">{renderValue(row.item_name)}</td>
                  <td className="px-4 py-3.5 text-slate-500 font-mono text-xs border-r border-slate-50">{renderValue(row.batch_number)}</td>
                  <td className="px-4 py-3.5 border-r border-slate-50">
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wider ${row.movement_type === "OUT" ? "bg-red-50 text-red-600 border-red-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"}`}>
                      {renderValue(row.movement_type)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 border-r border-slate-50">
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wider ${badgeClass(row.reference_type)}`}>
                      {renderValue(row.reference_type)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-700 border-r border-slate-50">{renderValue(row.source_location)}</td>
                  <td className="px-4 py-3.5 text-slate-700 border-r border-slate-50">{renderValue(row.destination_location)}</td>
                  <td className="px-4 py-3.5 font-bold text-slate-800 border-r border-slate-50 text-right">{renderValue(row.quantity)}</td>
                  <td className="px-4 py-3.5 text-slate-700 border-r border-slate-50">{renderValue(row.handled_by)}</td>
                  <td className="px-4 py-3.5 text-slate-500">{renderValue(row.reason)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-slate-400 italic">No transaction records found.</td>
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

export default PharmacyTransactionBookReport;
