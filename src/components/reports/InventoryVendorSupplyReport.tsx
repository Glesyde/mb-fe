import React, { useState, useEffect } from "react";
import { Banknote, Truck, Building } from "lucide-react";
import apiClient from "../../api/client";
import {
  renderValue,
  formatCurrency,
  TimeframeSelect,
  CustomDateInputs,
  buildTimeframeParams,
  ReportShell,
  KpiCard,
  Pagination,
  ITEM_TYPES,
  LOCATIONS,
} from "./billingReportShared";

const InventoryVendorSupplyReport: React.FC = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const [pagination, setPagination] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [timeframe, setTimeframe] = useState("all_time");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [itemTypeFilter, setItemTypeFilter] = useState("All");
  const [locationFilter, setLocationFilter] = useState("All");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  const fetchReportData = async () => {
    try {
      setIsLoading(true);
      const params = buildTimeframeParams(timeframe, dateFrom, dateTo);
      if (itemTypeFilter !== "All") params.push(`item_type=${itemTypeFilter}`);
      if (locationFilter !== "All") params.push(`location=${locationFilter}`);
      params.push(`limit=${itemsPerPage}`, `offset=${(currentPage - 1) * itemsPerPage}`);
      const response = await apiClient.get(`/inventory/get/vendor/supply/report?${params.join("&")}`);
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
      console.error("Failed to fetch vendor supply report:", error);
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
  }, [timeframe, dateFrom, dateTo, itemTypeFilter, locationFilter, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [timeframe, dateFrom, dateTo, itemTypeFilter, locationFilter]);

  const totalRecords = pagination?.total_records ?? records.length;
  const totalPages = pagination?.total_pages ?? Math.max(1, Math.ceil(totalRecords / itemsPerPage));
  const offset = pagination?.offset ?? (currentPage - 1) * itemsPerPage;

  return (
    <ReportShell
      title="Vendor Supply Report"
      subtitle="Stock received per vendor, batch, and receiving location."
      metaLine={metadata ? `Period: ${renderValue(metadata.report_period)}` : undefined}
      isLoading={isLoading}
      onClear={() => {
        setTimeframe("all_time");
        setDateFrom("");
        setDateTo("");
        setItemTypeFilter("All");
        setLocationFilter("All");
      }}
      onRefresh={fetchReportData}
      exportData={records}
      exportFilename="vendor_supply_report"
      filters={
        <>
          <TimeframeSelect value={timeframe} onChange={setTimeframe} disabled={isLoading} />
          <div>
            <select
              value={itemTypeFilter}
              onChange={(e) => setItemTypeFilter(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-700 disabled:opacity-50"
            >
              <option value="All">All Item Types</option>
              {ITEM_TYPES.map((t) => (
                <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-700 disabled:opacity-50"
            >
              <option value="All">All Locations</option>
              {LOCATIONS.map((l) => (
                <option key={l} value={l}>{l}</option>
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
        <KpiCard icon={Banknote} label="Total Financial Cost" value={formatCurrency(summary?.total_financial_cost)} colorClass="bg-emerald-50 border-emerald-100 text-emerald-900" />
        <KpiCard icon={Truck} label="Total Volume Received" value={renderValue(summary?.total_volume_received)} colorClass="bg-amber-50 border-amber-100 text-amber-900" />
        <KpiCard icon={Building} label="Unique Vendors" value={renderValue(summary?.unique_vendors_count)} colorClass="bg-blue-50 border-blue-100 text-blue-900" />
      </div>

      <div className="overflow-x-auto overflow-y-auto rounded-xl border border-slate-200 flex-1 min-h-[300px] mt-6">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Supply Date</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Item</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Batch</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Expiry</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-right">Qty Received</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-right">Unit Cost</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-right">Total Cost</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Vendor</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Received At</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Received By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.length > 0 ? (
              records.map((row, i) => (
                <tr key={`${row.movement_id}-${i}`} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3.5 text-slate-700 border-r border-slate-50">{renderValue(row.supply_date)}</td>
                  <td className="px-4 py-3.5 border-r border-slate-50">
                    <div className="font-bold text-slate-800">{renderValue(row.item_name)}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{renderValue(row.items_uhid)} • {renderValue(row.item_type)}</div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-700 border-r border-slate-50">{renderValue(row.batch_number)}</td>
                  <td className="px-4 py-3.5 text-slate-700 border-r border-slate-50">{renderValue(row.expiry_date)}</td>
                  <td className="px-4 py-3.5 text-slate-700 border-r border-slate-50 text-right">{renderValue(row.quantity_received)}</td>
                  <td className="px-4 py-3.5 text-slate-700 border-r border-slate-50 text-right">{formatCurrency(row.unit_cost)}</td>
                  <td className="px-4 py-3.5 font-bold text-slate-800 border-r border-slate-50 text-right">{formatCurrency(row.total_cost)}</td>
                  <td className="px-4 py-3.5 border-r border-slate-50">
                    <div className="text-slate-700">{renderValue(row.vendor_name)}</div>
                    <div className="text-[11px] text-slate-400">{renderValue(row.vendor_contact)}</div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-700 border-r border-slate-50">{renderValue(row.receiving_location)}</td>
                  <td className="px-4 py-3.5 text-slate-700">{renderValue(row.received_by_name)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-slate-400 italic">No vendor supply records found.</td>
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

export default InventoryVendorSupplyReport;