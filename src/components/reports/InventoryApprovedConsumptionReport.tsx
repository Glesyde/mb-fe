import React, { useState, useEffect } from "react";
import { Package2, TrendingUp, ClipboardCheck } from "lucide-react";
import apiClient from "../../api/client";
import {
  renderValue,
  TimeframeSelect,
  CustomDateInputs,
  buildTimeframeParams,
  ReportShell,
  KpiCard,
  ITEM_TYPES,
  LOCATIONS,
} from "./billingReportShared";

const InventoryApprovedConsumptionReport: React.FC = () => {
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
      const response = await apiClient.get(`/inventory/get/approved/items/consumption/report${query}`);
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
      console.error("Failed to fetch approved items consumption report:", error);
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
      title="Approved Items Consumption"
      subtitle="Requisition items approved and consumed across departments."
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
      exportFilename="approved_items_consumption"
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
        <KpiCard icon={Package2} label="Unique Items" value={renderValue(summary?.total_unique_items)} colorClass="bg-blue-50 border-blue-100 text-blue-900" />
        <KpiCard icon={TrendingUp} label="Total Approved Volume" value={renderValue(summary?.total_approved_volume)} colorClass="bg-amber-50 border-amber-100 text-amber-900" />
        <KpiCard icon={ClipboardCheck} label="Total Requisitions" value={renderValue(summary?.total_requisitions)} colorClass="bg-emerald-50 border-emerald-100 text-emerald-900" />
      </div>

      <div className="overflow-x-auto overflow-y-auto rounded-xl border border-slate-200 flex-1 min-h-[300px] mt-6">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Item</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Type</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-right">Approved Qty</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-right">Requisitions</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Consuming Departments</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Approved By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.length > 0 ? (
              records.map((row, i) => (
                <tr key={`${row.items_uhid}-${i}`} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3.5 border-r border-slate-50">
                    <div className="font-bold text-slate-800">{renderValue(row.item_name)}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{renderValue(row.items_uhid)}</div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-700 border-r border-slate-50">{renderValue(row.item_type)}</td>
                  <td className="px-4 py-3.5 font-bold text-slate-800 border-r border-slate-50 text-right">{renderValue(row.total_approved_qty)}</td>
                  <td className="px-4 py-3.5 text-slate-700 border-r border-slate-50 text-right">{renderValue(row.requisition_count)}</td>
                  <td className="px-4 py-3.5 text-slate-700 border-r border-slate-50">{renderValue(row.consuming_departments)}</td>
                  <td className="px-4 py-3.5 text-slate-700">{renderValue(row.approved_by_names)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-400 italic">No approved consumption records found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </ReportShell>
  );
};

export default InventoryApprovedConsumptionReport;