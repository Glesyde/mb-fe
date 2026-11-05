import React, { useState, useEffect } from "react";
import { Search, AlertOctagon, ListOrdered } from "lucide-react";
import apiClient from "../../api/client";
import { patientService } from "../../services/patient.service";
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

const ENCOUNTER_TYPES = ["OPD", "IPD", "ERD"];

const UnbilledOrdersReport: React.FC = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const [pagination, setPagination] = useState<{ total_records: number; total_pages: number; current_page: number; limit: number; offset: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [timeframe, setTimeframe] = useState("all_time");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [payerTypeId, setPayerTypeId] = useState("");
  const [encounterType, setEncounterType] = useState("All");
  const [department, setDepartment] = useState("");

  const [payerTypes, setPayerTypes] = useState<any[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  useEffect(() => {
    patientService.getPayerTypes().then(setPayerTypes).catch(() => setPayerTypes([]));
  }, []);

  const fetchReportData = async () => {
    try {
      setIsLoading(true);
      const params = buildTimeframeParams(timeframe, dateFrom, dateTo);
      if (payerTypeId) params.push(`payer_type_id=${payerTypeId}`);
      if (encounterType !== "All") params.push(`encounter_type=${encounterType}`);
      if (department) params.push(`department=${encodeURIComponent(department)}`);
      params.push(`limit=${itemsPerPage}`, `offset=${(currentPage - 1) * itemsPerPage}`);

      const response = await apiClient.get(`/billing/unbilled/orders/report?${params.join("&")}`);
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
      console.error("Failed to fetch unbilled orders report:", error);
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
  }, [timeframe, dateFrom, dateTo, payerTypeId, encounterType, department, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [timeframe, dateFrom, dateTo, payerTypeId, encounterType, department]);

  const filteredRecords = records.filter((r) =>
    renderValue(r.patient_name).toLowerCase().includes(searchTerm.toLowerCase()) ||
    renderValue(r.mrn).toLowerCase().includes(searchTerm.toLowerCase()) ||
    renderValue(r.item_name).toLowerCase().includes(searchTerm.toLowerCase()) ||
    renderValue(r.encounter_number).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalRecords = pagination?.total_records ?? filteredRecords.length;
  const totalPages = pagination?.total_pages ?? 1;
  const offset = pagination?.offset ?? 0;

  return (
    <ReportShell
      title="Unbilled Orders Report"
      subtitle="Clinical orders and services rendered that have not yet been invoiced."
      metaLine={metadata ? `Period: ${renderValue(metadata.report_period)}` : undefined}
      isLoading={isLoading}
      onClear={() => {
        setSearchTerm("");
        setTimeframe("all_time");
        setDateFrom("");
        setDateTo("");
        setPayerTypeId("");
        setEncounterType("All");
        setDepartment("");
      }}
      onRefresh={fetchReportData}
      exportData={filteredRecords}
      exportFilename="unbilled_orders_report"
      filters={
        <>
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search patient, MRN, item, encounter #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={isLoading}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary disabled:opacity-50"
            />
          </div>
          <TimeframeSelect value={timeframe} onChange={setTimeframe} disabled={isLoading} />
          <div>
            <select
              value={payerTypeId}
              onChange={(e) => setPayerTypeId(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-700 disabled:opacity-50"
            >
              <option value="">All Payer Types</option>
              {payerTypes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <select
              value={encounterType}
              onChange={(e) => setEncounterType(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-700 disabled:opacity-50"
            >
              <option value="All">All Encounter Types</option>
              {ENCOUNTER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <input
              type="text"
              placeholder="Department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary disabled:opacity-50"
            />
          </div>
          {timeframe === "custom" && (
            <CustomDateInputs dateFrom={dateFrom} dateTo={dateTo} setDateFrom={setDateFrom} setDateTo={setDateTo} disabled={isLoading} />
          )}
        </>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard icon={AlertOctagon} label="Total Unbilled Revenue" value={formatCurrency(summary?.total_unbilled_revenue)} colorClass="bg-red-50 border-red-100 text-red-900" />
        <KpiCard icon={ListOrdered} label="Total Unbilled Orders" value={summary?.total_unbilled_orders ?? 0} colorClass="bg-amber-50 border-amber-100 text-amber-900" />
      </div>

      {summary?.payer_risk_exposure?.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-3">Payer Risk Exposure</h3>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Payer</th>
                  <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-right">Unbilled Count</th>
                  <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-right">Unbilled Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary.payer_risk_exposure.map((row: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-700">{renderValue(row.payer_name)}</td>
                    <td className="px-4 py-3 text-slate-700 text-right">{renderValue(row.unbilled_count)}</td>
                    <td className="px-4 py-3 font-bold text-slate-800 text-right">{formatCurrency(row.unbilled_value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="overflow-x-auto overflow-y-auto rounded-xl border border-slate-200 flex-1 min-h-[300px] mt-6">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Item</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Patient</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Encounter</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Payer</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Ordered By</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-right">Qty</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-right">Amount</th>
              <th className="px-4 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredRecords.length > 0 ? (
              filteredRecords.map((row, i) => (
                <tr key={`${row.billable_item_id}-${i}`} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3.5 border-r border-slate-50">
                    <div className="font-bold text-slate-800">{renderValue(row.item_name)}</div>
                    <div className="text-[11px] text-slate-400">{renderValue(row.service_department)} • {renderValue(row.order_date)}</div>
                  </td>
                  <td className="px-4 py-3.5 border-r border-slate-50">
                    <div className="font-semibold text-slate-700">{renderValue(row.patient_name)}</div>
                    <div className="text-[11px] text-slate-400 font-mono">MRN: {renderValue(row.mrn)}</div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-700 border-r border-slate-50">
                    <div>{renderValue(row.encounter_number)}</div>
                    <div className="text-[11px] text-slate-400">{renderValue(row.encounter_type)}</div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-700 border-r border-slate-50">{renderValue(row.payer_name)}</td>
                  <td className="px-4 py-3.5 text-slate-700 border-r border-slate-50">{renderValue(row.ordered_by_name)}</td>
                  <td className="px-4 py-3.5 text-slate-700 border-r border-slate-50 text-right">{renderValue(row.quantity)}</td>
                  <td className="px-4 py-3.5 font-bold text-slate-800 border-r border-slate-50 text-right">{formatCurrency(row.total_unbilled_amount)}</td>
                  <td className="px-4 py-3.5">
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wider ${badgeClass(row.billing_status)}`}>
                      {renderValue(row.billing_status)}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-slate-400 italic">No unbilled orders found.</td>
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

export default UnbilledOrdersReport;
