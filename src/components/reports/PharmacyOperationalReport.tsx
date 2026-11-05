import React, { useState, useEffect, useMemo } from "react";
import { 
  Search, 
  Pill, 
  CheckCircle2, 
  Clock, 
  AlertOctagon, 
  AlertTriangle, 
  TrendingUp, 
  Archive, 
  Warehouse,
  ShieldAlert,
  CalendarHeart,
  Download
} from "lucide-react";
import apiClient from "../../api/client";
import {
  renderValue,
  formatCurrency,
  CustomDateInputs,
  ReportShell,
  KpiCard,
} from "./billingReportShared";

interface SummaryKPIs {
  prescriptions_requested: number;
  total_units_requested: number;
  prescriptions_dispensed: number;
  total_units_dispensed: number;
  fulfillment_rate_pct?: number;
  out_of_stock_items: number;
  low_stock_items: number;
  healthy_stock_items: number;
  expired_batches_count: number;
  expired_units_count: number;
  expired_financial_loss: number | string;
  expiring_30_days_count: number;
  expiring_90_days_count: number;
  expiring_90_days_value_at_risk: number | string;
}

interface FulfillmentRecord {
  item_id: number;
  drug_name: string;
  brand?: string;
  strength?: string;
  formulation?: string;
  reorder_level: number;
  units_prescribed: number;
  units_dispensed: number;
  fulfillment_pct: number;
  pharmacy_stock: number;
  store_stock: number;
  stock_status: "OUT_OF_STOCK" | "LOW_STOCK" | "SUFFICIENT";
}

interface ExpiryRecord {
  batch_id: number;
  batch_number: string;
  mfg_batch_no?: string;
  expiry_date: string;
  item_name: string;
  brand?: string;
  strength?: string;
  formulation?: string;
  location: string;
  available_quantity: number;
  purchase_price: number | string;
  total_cost_value: number | string;
  days_difference: number;
  expiry_status: "EXPIRED" | "CRITICAL_30_DAYS" | "WARNING_90_DAYS" | "HEALTHY";
}

const PharmacyOperationalReport: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"fulfillment" | "expiry">("fulfillment");
  const [summaryKPIs, setSummaryKPIs] = useState<SummaryKPIs>({
    prescriptions_requested: 0,
    total_units_requested: 0,
    prescriptions_dispensed: 0,
    total_units_dispensed: 0,
    fulfillment_rate_pct: 0,
    out_of_stock_items: 0,
    low_stock_items: 0,
    healthy_stock_items: 0,
    expired_batches_count: 0,
    expired_units_count: 0,
    expired_financial_loss: 0,
    expiring_30_days_count: 0,
    expiring_90_days_count: 0,
    expiring_90_days_value_at_risk: 0
  });
  const [fulfillmentRecords, setFulfillmentRecords] = useState<FulfillmentRecord[]>([]);
  const [expiryRecords, setExpiryRecords] = useState<ExpiryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [timeframe, setTimeframe] = useState("this_month");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [locationFilter, setLocationFilter] = useState("ALL");
  const [stockStatusFilter, setStockStatusFilter] = useState("ALL");

  const fetchReportData = async () => {
    try {
      setIsLoading(true);

      const params = new URLSearchParams();
      params.append("timeframe", timeframe);
      if (timeframe === "custom") {
        if (dateFrom) params.append("start_date", dateFrom);
        if (dateTo) params.append("end_date", dateTo);
      }
      if (locationFilter !== "ALL") params.append("location", locationFilter);
      if (stockStatusFilter !== "ALL") params.append("stock_status", stockStatusFilter);

      const response = await apiClient.get(`/report/pharmacy/operational-metrics?${params.toString()}`);
      if (response.data && response.data.data) {
        const d = response.data.data;
        setSummaryKPIs(d.summary_kpis || {});
        setFulfillmentRecords(d.fulfillment_ledger || []);
        setExpiryRecords(d.expiry_ledger || []);
      } else {
        setFulfillmentRecords([]);
        setExpiryRecords([]);
      }
    } catch (error) {
      console.error("Failed to load pharmacy operational metrics:", error);
      setFulfillmentRecords([]);
      setExpiryRecords([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeframe, dateFrom, dateTo, locationFilter, stockStatusFilter]);

  // Client-side search filters
  const filteredFulfillment = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return fulfillmentRecords.filter(
      (r) =>
        renderValue(r.drug_name).toLowerCase().includes(term) ||
        renderValue(r.brand).toLowerCase().includes(term)
    );
  }, [fulfillmentRecords, searchTerm]);

  const filteredExpiry = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return expiryRecords.filter(
      (e) =>
        renderValue(e.item_name).toLowerCase().includes(term) ||
        renderValue(e.batch_number).toLowerCase().includes(term) ||
        renderValue(e.location).toLowerCase().includes(term)
    );
  }, [expiryRecords, searchTerm]);

  return (
    <ReportShell
      title="Pharmacy Operations & Inventory Health"
      subtitle="Comprehensive drug fulfillment tracking, stock shortage alerts, and capital loss expiration audit."
      isLoading={isLoading}
      onClear={() => {
        setSearchTerm("");
        setTimeframe("this_month");
        setDateFrom("");
        setDateTo("");
        setLocationFilter("ALL");
        setStockStatusFilter("ALL");
      }}
      onRefresh={fetchReportData}
      exportData={activeTab === "fulfillment" ? filteredFulfillment : filteredExpiry}
      exportFilename={activeTab === "fulfillment" ? "pharmacy_fulfillment_stock_report" : "pharmacy_expired_batches_audit"}
      filters={
        <>
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder={
                activeTab === "fulfillment"
                  ? "Search drug name, brand, formulation..."
                  : "Search batch number, drug, location..."
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={isLoading}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 disabled:opacity-50"
            />
          </div>

          {/* Standardized Timeframe with This Year properly enabled */}
          <div>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600/20"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this_week">This Week</option>
              <option value="last_week">Last Week</option>
              <option value="last_7_days">Last 7 Days</option>
              <option value="last_30_days">Last 30 Days</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="last_3_months">Last 3 Months</option>
              <option value="this_year">This Year</option>
              <option value="last_year">Last Year</option>
              <option value="all_time">All Time</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          {/* Inventory Location Filter */}
          <div>
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600/20"
            >
              <option value="ALL">All Storage Locations</option>
              <option value="PHARMACY">Pharmacy Dispensary</option>
              <option value="STORE">Main Medical Store</option>
              <option value="THEATRE">Operating Theatre</option>
              <option value="ERD">Emergency (ERD)</option>
              <option value="ICU">ICU / CCU</option>
            </select>
          </div>

          {/* Expiry / Stock Specific Filter */}
          {activeTab === "expiry" && (
            <div>
              <select
                value={stockStatusFilter}
                onChange={(e) => setStockStatusFilter(e.target.value)}
                disabled={isLoading}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600/20 font-semibold"
              >
                <option value="ALL">All Expiry Windows</option>
                <option value="EXPIRED">Expired Items Only</option>
                <option value="EXPIRING_30">Expiring in &lt; 30 Days (Critical)</option>
                <option value="EXPIRING_90">Expiring in &lt; 90 Days (Warning)</option>
              </select>
            </div>
          )}

          {timeframe === "custom" && (
            <CustomDateInputs
              dateFrom={dateFrom}
              dateTo={dateTo}
              setDateFrom={setDateFrom}
              setDateTo={setDateTo}
              disabled={isLoading}
            />
          )}
        </>
      }
    >
      {/* ---------------- 1. Key Performance Indicators ---------------- */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 mb-6">
        <KpiCard
          icon={Pill}
          label="Prescriptions Requested"
          value={summaryKPIs.prescriptions_requested ?? 0}
          colorClass="bg-blue-50 border-blue-100 text-blue-900"
        />
        <KpiCard
          icon={CheckCircle2}
          label="Units Dispensed"
          value={summaryKPIs.total_units_dispensed ?? 0}
          colorClass="bg-emerald-50 border-emerald-100 text-emerald-900"
        />
        <KpiCard
          icon={TrendingUp}
          label="Fulfillment Rate"
          value={`${summaryKPIs.fulfillment_rate_pct ?? 0}%`}
          colorClass="bg-indigo-50 border-indigo-100 text-indigo-900"
        />
        <KpiCard
          icon={AlertOctagon}
          label="Out of Stock Drugs"
          value={summaryKPIs.out_of_stock_items ?? 0}
          colorClass="bg-rose-50 border-rose-100 text-rose-900"
        />
        <KpiCard
          icon={AlertTriangle}
          label="Expired Batches"
          value={summaryKPIs.expired_batches_count ?? 0}
          colorClass="bg-amber-50 border-amber-100 text-amber-900"
        />
        <KpiCard
          icon={ShieldAlert}
          label="Expired Capital Loss"
          value={formatCurrency(summaryKPIs.expired_financial_loss)}
          colorClass="bg-purple-50 border-purple-100 text-purple-900"
        />
      </div>

      {/* ---------------- 2. Sub-Navigation Tabs ---------------- */}
      <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
        <button
          onClick={() => setActiveTab("fulfillment")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "fulfillment"
              ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <Warehouse size={15} />
          Medication Fulfillment & Stock Health ({filteredFulfillment.length})
        </button>

        <button
          onClick={() => setActiveTab("expiry")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "expiry"
              ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <CalendarHeart size={15} />
          Expired & Expiring Batches Audit ({filteredExpiry.length})
        </button>
      </div>

      {/* ---------------- 3. Active Data Tables ---------------- */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 min-h-[350px]">
        {activeTab === "fulfillment" ? (
          /* TAB A: Prescription vs Dispense & Stock Levels */
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 text-[11px] font-black uppercase text-slate-600 tracking-wider">
              <tr>
                <th className="px-4 py-3.5">#</th>
                <th className="px-4 py-3.5">Medication Name</th>
                <th className="px-4 py-3.5">Strength / Formulation</th>
                <th className="px-4 py-3.5 text-center">Prescribed Units</th>
                <th className="px-4 py-3.5 text-center">Dispensed Units</th>
                <th className="px-4 py-3.5 text-center">Fulfillment %</th>
                <th className="px-4 py-3.5 text-center">Pharmacy Stock</th>
                <th className="px-4 py-3.5 text-center">Store Stock</th>
                <th className="px-4 py-3.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredFulfillment.length > 0 ? (
                filteredFulfillment.map((row, idx) => (
                  <tr key={`${row.item_id}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 text-xs font-bold text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{renderValue(row.drug_name)}</div>
                      {row.brand && (
                        <div className="text-[11px] text-slate-400 font-semibold">{row.brand}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {trimText(`${row.strength || ""} ${row.formulation || ""}`) || "—"}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-slate-800">
                      {row.units_prescribed}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-emerald-700">
                      {row.units_dispensed}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-mono font-bold text-xs text-slate-800">
                        {row.fulfillment_pct}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-indigo-700">
                      {row.pharmacy_stock}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-slate-500">
                      {row.store_stock}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {row.stock_status === "OUT_OF_STOCK" && (
                        <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-black uppercase">
                          Out of Stock
                        </span>
                      )}
                      {row.stock_status === "LOW_STOCK" && (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black uppercase">
                          Reorder Soon
                        </span>
                      )}
                      {row.stock_status === "SUFFICIENT" && (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase">
                          In Stock
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400 italic">
                    {isLoading ? "Compiling pharmacy fulfillment records..." : "No medication fulfillment records found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          /* TAB B: Expired & Expiring Batches Audit */
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 text-[11px] font-black uppercase text-slate-600 tracking-wider">
              <tr>
                <th className="px-4 py-3.5">#</th>
                <th className="px-4 py-3.5">Drug Name</th>
                <th className="px-4 py-3.5">Batch No</th>
                <th className="px-4 py-3.5">Location</th>
                <th className="px-4 py-3.5 text-center">Available Units</th>
                <th className="px-4 py-3.5 text-right">Unit Cost</th>
                <th className="px-4 py-3.5 text-right">Total Loss at Risk</th>
                <th className="px-4 py-3.5">Expiry Date</th>
                <th className="px-4 py-3.5 text-right">Status / Timeline</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpiry.length > 0 ? (
                filteredExpiry.map((row, idx) => (
                  <tr key={`${row.batch_id}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 text-xs font-bold text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">
                      {renderValue(row.item_name)}
                      {row.brand && <span className="text-xs text-slate-400 font-normal ml-1">({row.brand})</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700 font-semibold">
                      {renderValue(row.batch_number)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700">
                        {renderValue(row.location)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-slate-800">
                      {row.available_quantity}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600 font-mono text-xs">
                      {formatCurrency(row.purchase_price)}
                    </td>
                    <td className="px-4 py-3 text-right font-black font-mono text-xs text-slate-900">
                      {formatCurrency(row.total_cost_value)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-800 font-semibold">
                      {renderValue(row.expiry_date)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {row.expiry_status === "EXPIRED" && (
                        <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-black uppercase">
                          Expired ({Math.abs(row.days_difference)}d ago)
                        </span>
                      )}
                      {row.expiry_status === "CRITICAL_30_DAYS" && (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-black uppercase">
                          Expires in {Math.abs(row.days_difference)}d
                        </span>
                      )}
                      {row.expiry_status === "WARNING_90_DAYS" && (
                        <span className="px-2.5 py-0.5 rounded-full bg-yellow-50 text-yellow-800 border border-yellow-200 text-[10px] font-black uppercase">
                          Expires in {Math.abs(row.days_difference)}d
                        </span>
                      )}
                      {row.expiry_status === "HEALTHY" && (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase">
                          Valid
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400 italic">
                    {isLoading ? "Auditing stock expirations..." : "No expired or expiring batch records found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </ReportShell>
  );
};

const trimText = (str: string) => str.trim();

export default PharmacyOperationalReport;