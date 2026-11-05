import React, { useState, useEffect } from "react";
import { Boxes, Layers, Banknote } from "lucide-react";
import apiClient from "../../api/client";
import {
  renderValue,
  formatCurrency,
  TimeframeSelect,
  CustomDateInputs,
  buildTimeframeParams,
  ReportShell,
  KpiCard,
  ITEM_TYPES,
  LOCATIONS,
} from "./billingReportShared";

const InventoryClassificationReport: React.FC = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [timeframe, setTimeframe] = useState("all_time");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [itemTypeFilter, setItemTypeFilter] = useState("All");
  const [locationFilter, setLocationFilter] = useState("All");

  const fetchReportData = async () => {
    try {
      setIsLoading(true);
      const params = buildTimeframeParams(timeframe, dateFrom, dateTo);
      if (itemTypeFilter !== "All") params.push(`item_type=${itemTypeFilter}`);
      if (locationFilter !== "All") params.push(`location=${locationFilter}`);
      const query = params.length ? `?${params.join("&")}` : "";
      const response = await apiClient.get(`/inventory/classification/report${query}`);
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
      console.error("Failed to fetch inventory classification report:", error);
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
  }, [timeframe, dateFrom, dateTo, itemTypeFilter, locationFilter]);

  return (
    <ReportShell
      title="Inventory Classification Summary"
      subtitle="Stock volume and financial value broken down by item classification."
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
      exportFilename="inventory_classification_summary"
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
        <KpiCard icon={Boxes} label="Total Unique SKUs" value={renderValue(summary?.total_unique_skus)} colorClass="bg-blue-50 border-blue-100 text-blue-900" />
        <KpiCard icon={Layers} label="Total Physical Stock" value={renderValue(summary?.total_physical_stock)} colorClass="bg-amber-50 border-amber-100 text-amber-900" />
        <KpiCard icon={Banknote} label="Total Financial Value" value={formatCurrency(summary?.total_financial_value)} colorClass="bg-emerald-50 border-emerald-100 text-emerald-900" />
      </div>

      <div className="overflow-x-auto overflow-y-auto rounded-xl border border-slate-200 flex-1 min-h-[300px] mt-6">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Classification</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-right">Unique Items</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-right">Total Physical Stock</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-right">Total Financial Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.length > 0 ? (
              records.map((row, i) => (
                <tr key={`${row.classification}-${i}`} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3.5 font-bold text-slate-800 border-r border-slate-50">{renderValue(row.classification)}</td>
                  <td className="px-4 py-3.5 text-slate-700 border-r border-slate-50 text-right">{renderValue(row.unique_items_count)}</td>
                  <td className="px-4 py-3.5 text-slate-700 border-r border-slate-50 text-right">{renderValue(row.total_physical_stock)}</td>
                  <td className="px-4 py-3.5 font-bold text-slate-800 text-right">{formatCurrency(row.total_financial_value)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-slate-400 italic">No classification records found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </ReportShell>
  );
};

export default InventoryClassificationReport;