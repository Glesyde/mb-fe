import React, { useState, useEffect, useMemo } from "react";
import { 
  Search, 
  Wallet, 
  Building2, 
  AlertOctagon, 
  TrendingUp, 
  CreditCard, 
  UserCheck, 
  Percent,
  Stethoscope,
  Layers,
  FileText,
  ChevronDown,
  ChevronRight,
  Package,
  Activity,
  Calendar,
  User
} from "lucide-react";
import apiClient from "../../api/client";
import {
  renderValue,
  formatCurrency,
  CustomDateInputs,
  ReportShell,
  KpiCard,
} from "./billingReportShared";

interface InvoiceLineItem {
  item_id: number;
  service_code: string;
  description: string;
  category: string;
  department: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  discount_amount: number;
  net_line_total: number;
  copay_amount: number;
  package_covered_amount: number;
}

interface DetailedInvoiceRecord {
  invoice_id: number;
  invoice_number: string;
  invoice_date: string;
  invoice_status: string;
  visit_type: string;
  encounter_number?: string;
  patient_id: number;
  mrn: string;
  patient_name: string;
  gender: string;
  age_years: number;
  payer_id: number;
  payer_name: string;
  payer_type: string;
  payer_group: string;
  attending_doctor: string;
  billing_officer: string;
  gross_amount: number | string;
  discount_amount: number | string;
  net_amount: number | string;
  amount_paid: number | string;
  outstanding_balance: number | string;
  aging_days: number;
  items?: InvoiceLineItem[];
  items_count?: number;
}

const getCategoryBadgeClass = (category: string) => {
  switch (category) {
    case "pharmacy":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "lab":
      return "bg-cyan-50 text-cyan-700 border-cyan-200";
    case "radiology":
      return "bg-purple-50 text-purple-700 border-purple-200";
    case "consultation":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "bed_charge":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "surgery":
    case "procedure":
      return "bg-rose-50 text-rose-700 border-rose-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
};

const FinancialOverviewReport: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    "detailed_ledger" | "revenue_ar" | "departments" | "discounts" | "cash_exhaust"
  >("detailed_ledger");

  const [kpis, setKpis] = useState({
    total_money_received: 0,
    total_outstanding_ar: 0,
    total_discounts_granted: 0,
    collection_vs_ar_ratio: "0 : 1"
  });

  const [revenueByPayer, setRevenueByPayer] = useState<any[]>([]);
  const [outstandingByPayer, setOutstandingByPayer] = useState<any[]>([]);
  const [detailedLedger, setDetailedLedger] = useState<DetailedInvoiceRecord[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [discountsByUser, setDiscountsByUser] = useState<any[]>([]);
  const [cashExhaust, setCashExhaust] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number | string>(50);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Expandable Invoices Set
  const [expandedInvoices, setExpandedInvoices] = useState<Set<number>>(new Set());

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [timeframe, setTimeframe] = useState("this_year");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedPayer, setSelectedPayer] = useState("All");
  const [selectedVisitType, setSelectedVisitType] = useState("All");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState("All");

  const toggleInvoiceExpansion = (invoiceId: number) => {
    setExpandedInvoices((prev) => {
      const next = new Set(prev);
      if (next.has(invoiceId)) next.delete(invoiceId);
      else next.add(invoiceId);
      return next;
    });
  };

  const fetchReportData = async () => {
    try {
      setIsLoading(true);

      const params = new URLSearchParams();
      params.append("timeframe", timeframe);
      params.append("page", String(currentPage));
      params.append("limit", String(itemsPerPage));

      if (timeframe === "custom") {
        if (dateFrom) params.append("start_date", dateFrom);
        if (dateTo) params.append("end_date", dateTo);
      }
      if (selectedPayer !== "All") params.append("payer_id", selectedPayer);
      if (selectedVisitType !== "All") params.append("encounter_type", selectedVisitType);
      if (invoiceStatusFilter !== "All") params.append("invoice_status", invoiceStatusFilter);
      if (searchTerm) params.append("search", searchTerm);

      const response = await apiClient.get(`/report/billing/financial-overview?${params.toString()}`);
      if (response.data && response.data.data) {
        const d = response.data.data;
        setKpis(d.executive_kpis || {});
        setRevenueByPayer(d.revenue_by_payer || []);
        setOutstandingByPayer(d.outstanding_by_payer || []);
        setDetailedLedger(d.detailed_invoices_ledger || []);
        setDepartments(d.department_distribution || []);
        setDiscountsByUser(d.discounts_by_user || []);
        setCashExhaust(d.deposit_exhaust_cash || []);

        if (d.metadata?.pagination) {
          setTotalPages(d.metadata.pagination.total_pages || 1);
          setTotalRecords(d.metadata.pagination.total_records || 0);
        }
      }
    } catch (error) {
      console.error("Failed to load financial breakdown:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeframe, dateFrom, dateTo, selectedPayer, selectedVisitType, invoiceStatusFilter, currentPage, itemsPerPage]);

  const payerOptions = useMemo(() => {
    const map = new Map<number, string>();
    detailedLedger.forEach((row) => {
      if (row.payer_id && row.payer_name) {
        map.set(row.payer_id, row.payer_name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [detailedLedger]);

  return (
    <ReportShell
      title="Financial Performance & Detailed Billing Audit"
      subtitle="Complete accounting breakdown showing every patient invoice, tariff item, attending physician, and payer settlement."
      isLoading={isLoading}
      onClear={() => {
        setSearchTerm("");
        setTimeframe("this_year");
        setDateFrom("");
        setDateTo("");
        setSelectedPayer("All");
        setSelectedVisitType("All");
        setInvoiceStatusFilter("All");
        setCurrentPage(1);
      }}
      onRefresh={fetchReportData}
      exportData={detailedLedger}
      exportFilename={`billing_ledger_${timeframe}`}
      filters={
        <>
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search invoice #, patient, MRN, doctor, biller, or payer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setCurrentPage(1);
                  fetchReportData();
                }
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 font-medium"
            />
          </div>

          <div>
            <select
              value={timeframe}
              onChange={(e) => {
                setTimeframe(e.target.value);
                setCurrentPage(1);
              }}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600/20"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this_week">This Week</option>
              <option value="last_week">Last Week</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="this_year">This Year</option>
              <option value="all_time">All Time</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          <div>
            <select
              value={selectedPayer}
              onChange={(e) => {
                setSelectedPayer(e.target.value);
                setCurrentPage(1);
              }}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600/20"
            >
              <option value="All">All Payers</option>
              {payerOptions.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedVisitType}
              onChange={(e) => {
                setSelectedVisitType(e.target.value);
                setCurrentPage(1);
              }}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600/20"
            >
              <option value="All">All Visit Types</option>
              <option value="OPD">Outpatient (OPD)</option>
              <option value="IPD">Inpatient (IPD)</option>
              <option value="ERD">Emergency (ERD)</option>
            </select>
          </div>

          <div>
            <select
              value={invoiceStatusFilter}
              onChange={(e) => {
                setInvoiceStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600/20"
            >
              <option value="All">All Settlement Statuses</option>
              <option value="PAID">Fully Paid</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="OPEN">Unsettled / Open</option>
            </select>
          </div>

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
      {/* ---------------- 1. Executive Summary Cards ---------------- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard
          icon={Wallet}
          label="Total Money Received"
          value={formatCurrency(kpis.total_money_received)}
          colorClass="bg-emerald-50 border-emerald-100 text-emerald-900"
        />
        <KpiCard
          icon={AlertOctagon}
          label="Total Outstanding (AR)"
          value={formatCurrency(kpis.total_outstanding_ar)}
          colorClass="bg-rose-50 border-rose-100 text-rose-900"
        />
        <KpiCard
          icon={Percent}
          label="Discounts Allowed"
          value={formatCurrency(kpis.total_discounts_granted)}
          colorClass="bg-amber-50 border-amber-100 text-amber-900"
        />
        <KpiCard
          icon={TrendingUp}
          label="Collection to AR Ratio"
          value={kpis.collection_vs_ar_ratio}
          colorClass="bg-indigo-50 border-indigo-100 text-indigo-900"
        />
      </div>

      {/* ---------------- 2. Navigation Tabs ---------------- */}
      <div className="flex flex-wrap items-center gap-2 mb-4 border-b border-slate-100 pb-3">
        <button
          onClick={() => setActiveTab("detailed_ledger")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "detailed_ledger"
              ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <FileText size={15} />
          Invoices & Line-Item Breakdown ({totalRecords})
        </button>

        <button
          onClick={() => setActiveTab("revenue_ar")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "revenue_ar"
              ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <Building2 size={15} />
          Payer Revenue & AR Summary
        </button>

        <button
          onClick={() => setActiveTab("departments")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "departments"
              ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <Layers size={15} />
          Department Origin
        </button>

        <button
          onClick={() => setActiveTab("discounts")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "discounts"
              ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <UserCheck size={15} />
          Discounts Given By Staff
        </button>

        <button
          onClick={() => setActiveTab("cash_exhaust")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "cash_exhaust"
              ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <CreditCard size={15} />
          Deposit Exhaustion (Cash)
        </button>
      </div>

      {/* ---------------- 3. Active Data Area ---------------- */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 min-h-[420px] bg-white">
        
        {/* TAB 1: Itemized Invoices Ledger with Expandable Line Items */}
        {activeTab === "detailed_ledger" && (
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 text-[11px] font-black uppercase text-slate-600 tracking-wider">
              <tr>
                <th className="w-8 px-3 py-3.5 text-center"></th>
                <th className="px-4 py-3.5">Invoice #</th>
                <th className="px-4 py-3.5">Patient Details</th>
                <th className="px-4 py-3.5">Context</th>
                <th className="px-4 py-3.5">Payer Entity</th>
                <th className="px-4 py-3.5">Attending Doctor</th>
                <th className="px-4 py-3.5">Biller</th>
                <th className="px-4 py-3.5 text-right">Gross (₦)</th>
                <th className="px-4 py-3.5 text-right">Discount (₦)</th>
                <th className="px-4 py-3.5 text-right">Net Billed (₦)</th>
                <th className="px-4 py-3.5 text-right">Paid (₦)</th>
                <th className="px-4 py-3.5 text-right">Outstanding (₦)</th>
                <th className="px-4 py-3.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {detailedLedger.length > 0 ? (
                detailedLedger.map((row) => {
                  const isExpanded = expandedInvoices.has(row.invoice_id);
                  const hasItems = row.items && row.items.length > 0;

                  return (
                    <React.Fragment key={row.invoice_id}>
                      <tr 
                        onClick={() => toggleInvoiceExpansion(row.invoice_id)}
                        className={`cursor-pointer transition-colors ${isExpanded ? "bg-indigo-50/50" : "hover:bg-slate-50/80"}`}
                      >
                        <td className="px-3 py-3 text-center text-slate-400">
                          {isExpanded ? <ChevronDown size={16} className="text-indigo-600" /> : <ChevronRight size={16} />}
                        </td>
                        
                        <td className="px-4 py-3 font-mono font-bold text-slate-800 text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="text-indigo-600 hover:underline">{row.invoice_number}</span>
                            {hasItems && (
                              <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-500 rounded font-normal">
                                {row.items?.length} items
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-normal">{row.invoice_date?.slice(0, 10)}</div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">{row.patient_name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            MRN: {row.mrn} • {row.age_years || "—"}y / {row.gender}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-xs">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold border border-slate-200">
                            {row.visit_type}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-xs">
                          <div className="font-bold text-indigo-700">{row.payer_name}</div>
                          <div className="text-[10px] text-slate-400 font-semibold uppercase">{row.payer_group}</div>
                        </td>

                        <td className="px-4 py-3 text-xs text-slate-700">
                          <div className="font-medium flex items-center gap-1">
                            <Stethoscope size={13} className="text-slate-400 shrink-0" />
                            {row.attending_doctor}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-xs text-slate-600">
                          {row.billing_officer}
                        </td>

                        <td className="px-4 py-3 text-right font-mono text-slate-600 text-xs">
                          {formatCurrency(row.gross_amount)}
                        </td>

                        <td className="px-4 py-3 text-right font-mono text-amber-600 text-xs">
                          {Number(row.discount_amount) > 0 ? formatCurrency(row.discount_amount) : "—"}
                        </td>

                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 text-xs">
                          {formatCurrency(row.net_amount)}
                        </td>

                        <td className="px-4 py-3 text-right font-mono text-emerald-700 font-semibold text-xs">
                          {formatCurrency(row.amount_paid)}
                        </td>

                        <td className="px-4 py-3 text-right font-mono font-black text-rose-700 text-xs">
                          {Number(row.outstanding_balance) > 0 ? formatCurrency(row.outstanding_balance) : "₦0.00"}
                        </td>

                        <td className="px-4 py-3 text-center">
                          {row.invoice_status === "PAID" && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase">
                              Paid
                            </span>
                          )}
                          {row.invoice_status === "PARTIALLY_PAID" && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black uppercase">
                              Partial
                            </span>
                          )}
                          {row.invoice_status === "OPEN" && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-black uppercase">
                              Unpaid
                            </span>
                          )}
                        </td>
                      </tr>

                      {/* Expandable Line-Items Drawer */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={13} className="p-0 bg-slate-50/90 border-y border-indigo-100">
                            <div className="p-4 pl-12 pr-6">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-xs font-black uppercase text-indigo-950 flex items-center gap-2">
                                  <Package size={14} className="text-indigo-600" />
                                  Invoice Charge Breakdown ({row.items?.length || 0} billable items)
                                </h4>
                                <span className="text-[11px] text-slate-500 font-medium">
                                  Linked Encounter: <span className="font-mono font-bold text-slate-800">{row.encounter_number || "Direct Bill"}</span>
                                </span>
                              </div>

                              {row.items && row.items.length > 0 ? (
                                <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-xs">
                                  <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-100/70 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
                                      <tr>
                                        <th className="px-3 py-2">Code</th>
                                        <th className="px-3 py-2">Category</th>
                                        <th className="px-3 py-2">Item Description</th>
                                        <th className="px-3 py-2">Dept</th>
                                        <th className="px-3 py-2 text-center">Qty</th>
                                        <th className="px-3 py-2 text-right">Unit Price</th>
                                        <th className="px-3 py-2 text-right">Gross Total</th>
                                        <th className="px-3 py-2 text-right">Discount</th>
                                        <th className="px-3 py-2 text-right">Net Line Total</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {row.items.map((item, idx) => (
                                        <tr key={item.item_id || idx} className="hover:bg-slate-50">
                                          <td className="px-3 py-2 font-mono text-[10px] text-slate-500">{item.service_code || "—"}</td>
                                          <td className="px-3 py-2">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getCategoryBadgeClass(item.category)}`}>
                                              {item.category}
                                            </span>
                                          </td>
                                          <td className="px-3 py-2 font-semibold text-slate-800">{item.description}</td>
                                          <td className="px-3 py-2 text-slate-500 text-[11px]">{item.department}</td>
                                          <td className="px-3 py-2 text-center font-bold text-slate-700">{item.quantity}</td>
                                          <td className="px-3 py-2 text-right font-mono text-slate-600">{formatCurrency(item.unit_price)}</td>
                                          <td className="px-3 py-2 text-right font-mono text-slate-600">{formatCurrency(item.line_total)}</td>
                                          <td className="px-3 py-2 text-right font-mono text-amber-600">
                                            {item.discount_amount > 0 ? formatCurrency(item.discount_amount) : "—"}
                                          </td>
                                          <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">{formatCurrency(item.net_line_total)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <div className="p-3 text-center text-xs text-slate-400 italic bg-white rounded border border-slate-200">
                                  No individual line items registered for this historical invoice.
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={13} className="px-4 py-12 text-center text-slate-400 italic">
                    {isLoading ? "Compiling detailed financial billing ledger..." : "No invoices found for the specified criteria."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {/* TAB 2: Payer Revenue & AR Summary */}
        {activeTab === "revenue_ar" && (
          <div className="p-4 space-y-8">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                Money Received by Exact Payer Entity
              </h3>
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Payer Entity</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3 text-center">Receipts / Payments</th>
                      <th className="px-4 py-3 text-center">Unique Patients</th>
                      <th className="px-4 py-3 text-right">Total Collected (₦)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {revenueByPayer.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3 font-bold text-indigo-700">{r.payer_name}</td>
                        <td className="px-4 py-3 text-slate-600 font-medium">{r.payer_category}</td>
                        <td className="px-4 py-3 text-center font-bold text-slate-700">{r.payment_count}</td>
                        <td className="px-4 py-3 text-center text-slate-600">{r.unique_patients}</td>
                        <td className="px-4 py-3 text-right font-black font-mono text-emerald-700">
                          {formatCurrency(r.total_collected)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                Outstanding Debt Exposure (AR) by Exact Payer Entity
              </h3>
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Payer Entity</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3 text-center">Open Invoices</th>
                      <th className="px-4 py-3 text-center">Indebted Patients</th>
                      <th className="px-4 py-3 text-right">Gross Billed</th>
                      <th className="px-4 py-3 text-right">Discounts</th>
                      <th className="px-4 py-3 text-right">Net Billed</th>
                      <th className="px-4 py-3 text-right">Outstanding Balance (₦)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {outstandingByPayer.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3 font-bold text-indigo-700">{r.payer_name}</td>
                        <td className="px-4 py-3 text-slate-600 font-medium">{r.payer_category}</td>
                        <td className="px-4 py-3 text-center font-semibold text-slate-700">{r.open_invoices_count}</td>
                        <td className="px-4 py-3 text-center text-slate-600">{r.indebted_patients}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-600">{formatCurrency(r.gross_billed)}</td>
                        <td className="px-4 py-3 text-right font-mono text-amber-600">{formatCurrency(r.total_discount)}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-900">{formatCurrency(r.net_billed)}</td>
                        <td className="px-4 py-3 text-right font-black font-mono text-rose-700">
                          {formatCurrency(r.total_outstanding)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Departmental Service Composition */}
        {activeTab === "departments" && (
          <div className="p-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-3">
              Hospital Service Revenue Origin
            </h3>
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3.5">#</th>
                  <th className="px-4 py-3.5">Department / Service Group</th>
                  <th className="px-4 py-3.5 text-center">Service Volume</th>
                  <th className="px-4 py-3.5 text-right">Billed Revenue (₦)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {departments.map((dept, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 text-xs font-bold text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-3 font-bold text-slate-800">{dept.department_name}</td>
                    <td className="px-4 py-3 text-center font-semibold text-slate-700">{dept.service_volume} charges</td>
                    <td className="px-4 py-3 text-right font-mono font-black text-slate-900">
                      {formatCurrency(dept.total_billed_revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 4: Discounts Authorized By User */}
        {activeTab === "discounts" && (
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3.5">#</th>
                <th className="px-4 py-3.5">Authorizing Staff</th>
                <th className="px-4 py-3.5">Staff ID</th>
                <th className="px-4 py-3.5">Department</th>
                <th className="px-4 py-3.5 text-center">Discounts Given</th>
                <th className="px-4 py-3.5 text-center">Invoices Impacted</th>
                <th className="px-4 py-3.5 text-right">Gross Billed</th>
                <th className="px-4 py-3.5 text-right">Discount Concession (₦)</th>
                <th className="px-4 py-3.5 text-right">Avg Discount %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {discountsByUser.map((row, idx) => (
                <tr key={row.user_id || idx} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 text-xs font-bold text-slate-400">{idx + 1}</td>
                  <td className="px-4 py-3 font-bold text-slate-900">{renderValue(row.staff_name)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{renderValue(row.staff_id)}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{renderValue(row.department)}</td>
                  <td className="px-4 py-3 text-center font-bold text-slate-800">{row.total_discounts_granted}</td>
                  <td className="px-4 py-3 text-center text-slate-600">{row.total_invoices_impacted}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-600">{formatCurrency(row.total_gross_value)}</td>
                  <td className="px-4 py-3 text-right font-black font-mono text-amber-700">
                    {formatCurrency(row.total_discount_granted)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-indigo-700">{row.avg_discount_pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* TAB 5: Cash Deposit Exhaustion */}
        {activeTab === "cash_exhaust" && (
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3.5">#</th>
                <th className="px-4 py-3.5">Receipt #</th>
                <th className="px-4 py-3.5">Date</th>
                <th className="px-4 py-3.5">Patient Details</th>
                <th className="px-4 py-3.5 text-right">Deposited</th>
                <th className="px-4 py-3.5 text-right">Utilized</th>
                <th className="px-4 py-3.5 text-right">Balance</th>
                <th className="px-4 py-3.5 text-center">Exhaustion %</th>
                <th className="px-4 py-3.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cashExhaust.map((row, idx) => (
                <tr key={row.deposit_id || idx} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 text-xs font-bold text-slate-400">{idx + 1}</td>
                  <td className="px-4 py-3 font-mono text-xs font-bold text-slate-800">{row.receipt_number}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{row.deposit_date?.slice(0, 10)}</td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-900">{row.patient_name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">MRN: {row.mrn}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-700">{formatCurrency(row.total_deposited)}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-700">{formatCurrency(row.amount_utilized)}</td>
                  <td className="px-4 py-3 text-right font-black font-mono text-slate-900">{formatCurrency(row.balance_remaining)}</td>
                  <td className="px-4 py-3 text-center font-mono font-bold text-xs">{row.exhaust_rate_pct}%</td>
                  <td className="px-4 py-3 text-right">
                    {row.exhaustion_status === "EXHAUSTED" ? (
                      <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-black uppercase">
                        Exhausted
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase">
                        Surplus
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

      </div>

      {/* ---------------- 4. Pagination Controls ---------------- */}
      {activeTab === "detailed_ledger" && totalRecords > 0 && (
        <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="text-xs text-slate-500 font-semibold">
            Showing <span className="text-slate-900 font-bold">
              {itemsPerPage === "ALL" ? 1 : (currentPage - 1) * Number(itemsPerPage) + 1}
            </span> to{" "}
            <span className="text-slate-900 font-bold">
              {itemsPerPage === "ALL" ? totalRecords : Math.min(currentPage * Number(itemsPerPage), totalRecords)}
            </span> of{" "}
            <span className="text-slate-900 font-bold">{totalRecords}</span> invoices
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 font-bold uppercase">Show</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(e.target.value === "ALL" ? "ALL" : Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-200 rounded-lg text-xs font-bold px-2 py-1 outline-none"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={250}>250</option>
                <option value="ALL">All Invoices</option>
              </select>
            </div>

            {itemsPerPage !== "ALL" && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs text-slate-600 disabled:opacity-40 hover:bg-slate-50 font-bold"
                >
                  Prev
                </button>
                <span className="text-xs font-bold text-slate-800 px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs text-slate-600 disabled:opacity-40 hover:bg-slate-50 font-bold"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </ReportShell>
  );
};

export default FinancialOverviewReport;


// import React, { useState, useEffect, useMemo } from "react";
// import { 
//   Search, 
//   Wallet, 
//   Building2, 
//   AlertOctagon, 
//   TrendingUp, 
//   CreditCard, 
//   UserCheck, 
//   ShieldAlert,
//   Percent,
//   FileSpreadsheet,
//   Stethoscope,
//   Activity,
//   Layers,
//   FileText
// } from "lucide-react";
// import apiClient from "../../api/client";
// import {
//   renderValue,
//   formatCurrency,
//   CustomDateInputs,
//   ReportShell,
//   KpiCard,
// } from "./billingReportShared";

// interface ExecutiveKPIs {
//   total_money_received: number;
//   total_outstanding_ar: number;
//   total_discounts_granted: number;
//   collection_vs_ar_ratio: string;
// }

// interface RevenueItem {
//   payer_id: number;
//   payer_name: string;
//   payer_category: string;
//   payment_count: number;
//   unique_patients: number;
//   total_collected: number | string;
// }

// interface OutstandingItem {
//   payer_id: number;
//   payer_name: string;
//   payer_category: string;
//   open_invoices_count: number;
//   indebted_patients: number;
//   gross_billed: number | string;
//   total_discount: number | string;
//   net_billed: number | string;
//   total_outstanding: number | string;
// }

// interface DetailedInvoiceRecord {
//   invoice_id: number;
//   invoice_number: string;
//   invoice_date: string;
//   invoice_status: string;
//   visit_type: string;
//   encounter_number?: string;
//   patient_id: number;
//   mrn: string;
//   patient_name: string;
//   gender: string;
//   age_years: number;
//   payer_id: number;
//   payer_name: string;
//   payer_type: string;
//   payer_group: string;
//   attending_doctor: string;
//   billing_officer: string;
//   gross_amount: number | string;
//   discount_amount: number | string;
//   net_amount: number | string;
//   amount_paid: number | string;
//   outstanding_balance: number | string;
//   aging_days: number;
// }

// interface DepartmentItem {
//   department_name: string;
//   service_volume: number;
//   total_billed_revenue: number | string;
// }

// interface DiscountUser {
//   user_id: number;
//   staff_name: string;
//   staff_id: string;
//   department: string;
//   total_discounts_granted: number;
//   total_invoices_impacted: number;
//   total_gross_value: number | string;
//   total_discount_granted: number | string;
//   total_net_realized: number | string;
//   avg_discount_pct: number | string;
// }

// interface DepositExhaustRecord {
//   deposit_id: number;
//   receipt_number: string;
//   deposit_date: string;
//   mrn: string;
//   patient_name: string;
//   payer_name: string;
//   payer_group: string;
//   total_deposited: number | string;
//   amount_utilized: number | string;
//   balance_remaining: number | string;
//   exhaust_rate_pct: number;
//   exhaustion_status: "EXHAUSTED" | "CRITICAL_DEPLETION" | "HEALTHY_SURPLUS";
//   received_by_staff: string;
// }

// const FinancialOverviewReport: React.FC = () => {
//   const [activeTab, setActiveTab] = useState<
//     "revenue_ar" | "detailed_ledger" | "departments" | "discounts" | "cash_exhaust" | "credit_exhaust"
//   >("detailed_ledger");

//   const [kpis, setKpis] = useState<ExecutiveKPIs>({
//     total_money_received: 0,
//     total_outstanding_ar: 0,
//     total_discounts_granted: 0,
//     collection_vs_ar_ratio: "0 : 1"
//   });

//   const [revenueByPayer, setRevenueByPayer] = useState<RevenueItem[]>([]);
//   const [outstandingByPayer, setOutstandingByPayer] = useState<OutstandingItem[]>([]);
//   const [detailedLedger, setDetailedLedger] = useState<DetailedInvoiceRecord[]>([]);
//   const [departments, setDepartments] = useState<DepartmentItem[]>([]);
//   const [discountsByUser, setDiscountsByUser] = useState<DiscountUser[]>([]);
//   const [cashExhaust, setCashExhaust] = useState<DepositExhaustRecord[]>([]);
//   const [creditExhaust, setCreditExhaust] = useState<DepositExhaustRecord[]>([]);
//   const [isLoading, setIsLoading] = useState(true);

//   // Filters
//   const [searchTerm, setSearchTerm] = useState("");
//   const [timeframe, setTimeframe] = useState("this_year");
//   const [dateFrom, setDateFrom] = useState("");
//   const [dateTo, setDateTo] = useState("");
//   const [selectedPayer, setSelectedPayer] = useState("All");
//   const [selectedVisitType, setSelectedVisitType] = useState("All");
//   const [invoiceStatusFilter, setInvoiceStatusFilter] = useState("All");

//   const fetchReportData = async () => {
//     try {
//       setIsLoading(true);

//       const params = new URLSearchParams();
//       params.append("timeframe", timeframe);
//       if (timeframe === "custom") {
//         if (dateFrom) params.append("start_date", dateFrom);
//         if (dateTo) params.append("end_date", dateTo);
//       }
//       if (selectedPayer !== "All") params.append("payer_id", selectedPayer);
//       if (selectedVisitType !== "All") params.append("encounter_type", selectedVisitType);
//       if (invoiceStatusFilter !== "All") params.append("invoice_status", invoiceStatusFilter);
//       if (searchTerm) params.append("search", searchTerm);
//       params.append("limit", "200");

//       const response = await apiClient.get(`/report/billing/financial-overview?${params.toString()}`);
//       if (response.data && response.data.data) {
//         const d = response.data.data;
//         setKpis(d.executive_kpis || {});
//         setRevenueByPayer(d.revenue_by_payer || []);
//         setOutstandingByPayer(d.outstanding_by_payer || []);
//         setDetailedLedger(d.detailed_invoices_ledger || []);
//         setDepartments(d.department_distribution || []);
//         setDiscountsByUser(d.discounts_by_user || []);
//         setCashExhaust(d.deposit_exhaust_cash || []);
//         setCreditExhaust(d.deposit_exhaust_credit || []);
//       }
//     } catch (error) {
//       console.error("Failed to load financial breakdown:", error);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchReportData();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [timeframe, dateFrom, dateTo, selectedPayer, selectedVisitType, invoiceStatusFilter]);

//   // Unique Payer Dropdown options derived from the actual invoices
//   const payerOptions = useMemo(() => {
//     const map = new Map<number, string>();
//     detailedLedger.forEach((row) => {
//       if (row.payer_id && row.payer_name) {
//         map.set(row.payer_id, row.payer_name);
//       }
//     });
//     return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
//   }, [detailedLedger]);

//   // Client-side quick search on the detailed ledger
//   const filteredLedger = useMemo(() => {
//     const term = searchTerm.toLowerCase();
//     return detailedLedger.filter(
//       (r) =>
//         renderValue(r.invoice_number).toLowerCase().includes(term) ||
//         renderValue(r.patient_name).toLowerCase().includes(term) ||
//         renderValue(r.mrn).toLowerCase().includes(term) ||
//         renderValue(r.payer_name).toLowerCase().includes(term) ||
//         renderValue(r.attending_doctor).toLowerCase().includes(term) ||
//         renderValue(r.billing_officer).toLowerCase().includes(term)
//     );
//   }, [detailedLedger, searchTerm]);

//   return (
//     <ReportShell
//       title="Financial Performance & Detailed Invoicing Ledger"
//       subtitle="Complete accounting breakdown showing every patient invoice, attending doctor, billing officer, and payer settlement."
//       isLoading={isLoading}
//       onClear={() => {
//         setSearchTerm("");
//         setTimeframe("this_year");
//         setDateFrom("");
//         setDateTo("");
//         setSelectedPayer("All");
//         setSelectedVisitType("All");
//         setInvoiceStatusFilter("All");
//       }}
//       onRefresh={fetchReportData}
//       exportData={filteredLedger}
//       exportFilename={`billing_ledger_${timeframe}`}
//       filters={
//         <>
//           <div className="relative lg:col-span-2">
//             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
//             <input
//               type="text"
//               placeholder="Search invoice #, patient, MRN, doctor, biller, or payer..."
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//               className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 font-medium"
//             />
//           </div>

//           <div>
//             <select
//               value={timeframe}
//               onChange={(e) => setTimeframe(e.target.value)}
//               disabled={isLoading}
//               className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600/20"
//             >
//               <option value="today">Today</option>
//               <option value="yesterday">Yesterday</option>
//               <option value="this_week">This Week</option>
//               <option value="last_week">Last Week</option>
//               <option value="last_7_days">Last 7 Days</option>
//               <option value="last_30_days">Last 30 Days</option>
//               <option value="this_month">This Month</option>
//               <option value="last_month">Last Month</option>
//               <option value="last_3_months">Last 3 Months</option>
//               <option value="this_year">This Year</option>
//               <option value="all_time">All Time</option>
//               <option value="custom">Custom Date Range</option>
//             </select>
//           </div>

//           <div>
//             <select
//               value={selectedPayer}
//               onChange={(e) => setSelectedPayer(e.target.value)}
//               disabled={isLoading}
//               className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600/20"
//             >
//               <option value="All">All Payers</option>
//               {payerOptions.map((p) => (
//                 <option key={p.id} value={p.id}>{p.name}</option>
//               ))}
//             </select>
//           </div>

//           <div>
//             <select
//               value={selectedVisitType}
//               onChange={(e) => setSelectedVisitType(e.target.value)}
//               disabled={isLoading}
//               className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600/20"
//             >
//               <option value="All">All Visit Contexts</option>
//               <option value="OPD">Outpatient (OPD)</option>
//               <option value="IPD">Inpatient Admission (IPD)</option>
//               <option value="ERD">Emergency Department (ERD)</option>
//             </select>
//           </div>

//           <div>
//             <select
//               value={invoiceStatusFilter}
//               onChange={(e) => setInvoiceStatusFilter(e.target.value)}
//               disabled={isLoading}
//               className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600/20"
//             >
//               <option value="All">All Invoice Statuses</option>
//               <option value="PAID">Fully Paid</option>
//               <option value="PARTIALLY_PAID">Partially Paid</option>
//               <option value="OPEN">Unsettled / Open</option>
//             </select>
//           </div>

//           {timeframe === "custom" && (
//             <CustomDateInputs
//               dateFrom={dateFrom}
//               dateTo={dateTo}
//               setDateFrom={setDateFrom}
//               setDateTo={setDateTo}
//               disabled={isLoading}
//             />
//           )}
//         </>
//       }
//     >
//       {/* ---------------- 1. Executive Summary Cards ---------------- */}
//       <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
//         <KpiCard
//           icon={Wallet}
//           label="Total Money Received"
//           value={formatCurrency(kpis.total_money_received)}
//           colorClass="bg-emerald-50 border-emerald-100 text-emerald-900"
//         />
//         <KpiCard
//           icon={AlertOctagon}
//           label="Total Outstanding (AR)"
//           value={formatCurrency(kpis.total_outstanding_ar)}
//           colorClass="bg-rose-50 border-rose-100 text-rose-900"
//         />
//         <KpiCard
//           icon={Percent}
//           label="Discounts Allowed"
//           value={formatCurrency(kpis.total_discounts_granted)}
//           colorClass="bg-amber-50 border-amber-100 text-amber-900"
//         />
//         <KpiCard
//           icon={TrendingUp}
//           label="Collection to AR Ratio"
//           value={kpis.collection_vs_ar_ratio}
//           colorClass="bg-indigo-50 border-indigo-100 text-indigo-900"
//         />
//       </div>

//       {/* ---------------- 2. Navigation Tabs ---------------- */}
//       <div className="flex flex-wrap items-center gap-2 mb-4 border-b border-slate-100 pb-3">
//         <button
//           onClick={() => setActiveTab("detailed_ledger")}
//           className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
//             activeTab === "detailed_ledger"
//               ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
//               : "bg-slate-100 text-slate-600 hover:bg-slate-200"
//           }`}
//         >
//           <FileText size={15} />
//           Itemized Invoices & Bills Ledger ({filteredLedger.length})
//         </button>

//         <button
//           onClick={() => setActiveTab("revenue_ar")}
//           className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
//             activeTab === "revenue_ar"
//               ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
//               : "bg-slate-100 text-slate-600 hover:bg-slate-200"
//           }`}
//         >
//           <Building2 size={15} />
//           Payer Revenue & AR Summary ({revenueByPayer.length})
//         </button>

//         <button
//           onClick={() => setActiveTab("departments")}
//           className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
//             activeTab === "departments"
//               ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
//               : "bg-slate-100 text-slate-600 hover:bg-slate-200"
//           }`}
//         >
//           <Layers size={15} />
//           Departmental Charge Origin
//         </button>

//         <button
//           onClick={() => setActiveTab("discounts")}
//           className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
//             activeTab === "discounts"
//               ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
//               : "bg-slate-100 text-slate-600 hover:bg-slate-200"
//           }`}
//         >
//           <UserCheck size={15} />
//           Discounts By Staff
//         </button>

//         <button
//           onClick={() => setActiveTab("cash_exhaust")}
//           className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
//             activeTab === "cash_exhaust"
//               ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
//               : "bg-slate-100 text-slate-600 hover:bg-slate-200"
//           }`}
//         >
//           <CreditCard size={15} />
//           Deposit Exhaustion (Cash)
//         </button>
//       </div>

//       {/* ---------------- 3. Active Data Area ---------------- */}
//       <div className="overflow-x-auto rounded-xl border border-slate-200 min-h-[420px] bg-white">
        
//         {/* TAB 1: Itemized Invoices Ledger (The Exact Breakdown of "Why" & "What") */}
//         {activeTab === "detailed_ledger" && (
//           <table className="w-full text-left text-sm whitespace-nowrap">
//             <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 text-[11px] font-black uppercase text-slate-600 tracking-wider">
//               <tr>
//                 <th className="px-4 py-3.5">#</th>
//                 <th className="px-4 py-3.5">Invoice #</th>
//                 <th className="px-4 py-3.5">Patient Details</th>
//                 <th className="px-4 py-3.5">Context</th>
//                 <th className="px-4 py-3.5">Payer Entity</th>
//                 <th className="px-4 py-3.5">Attending Doctor</th>
//                 <th className="px-4 py-3.5">Biller</th>
//                 <th className="px-4 py-3.5 text-right">Gross (₦)</th>
//                 <th className="px-4 py-3.5 text-right">Discount (₦)</th>
//                 <th className="px-4 py-3.5 text-right">Net Billed (₦)</th>
//                 <th className="px-4 py-3.5 text-right">Paid (₦)</th>
//                 <th className="px-4 py-3.5 text-right">Outstanding (₦)</th>
//                 <th className="px-4 py-3.5 text-center">Status</th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-slate-100">
//               {filteredLedger.length > 0 ? (
//                 filteredLedger.map((row, idx) => (
//                   <tr key={row.invoice_id || idx} className="hover:bg-slate-50/80 transition-colors">
//                     <td className="px-4 py-3 text-xs font-bold text-slate-400">{idx + 1}</td>
                    
//                     <td className="px-4 py-3 font-mono font-bold text-slate-800 text-xs">
//                       <div>{row.invoice_number}</div>
//                       <div className="text-[10px] text-slate-400 font-normal">{row.invoice_date?.slice(0, 10)}</div>
//                     </td>

//                     <td className="px-4 py-3">
//                       <div className="font-bold text-slate-900">{row.patient_name}</div>
//                       <div className="text-[10px] text-slate-400 font-mono">
//                         MRN: {row.mrn} • {row.age_years || "—"}y / {row.gender}
//                       </div>
//                     </td>

//                     <td className="px-4 py-3 text-xs">
//                       <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold border border-slate-200">
//                         {row.visit_type}
//                       </span>
//                     </td>

//                     <td className="px-4 py-3 text-xs">
//                       <div className="font-bold text-indigo-700">{row.payer_name}</div>
//                       <div className="text-[10px] text-slate-400 font-semibold uppercase">{row.payer_group}</div>
//                     </td>

//                     <td className="px-4 py-3 text-xs text-slate-700">
//                       <div className="font-medium flex items-center gap-1">
//                         <Stethoscope size={13} className="text-slate-400 shrink-0" />
//                         {row.attending_doctor}
//                       </div>
//                     </td>

//                     <td className="px-4 py-3 text-xs text-slate-600">
//                       {row.billing_officer}
//                     </td>

//                     <td className="px-4 py-3 text-right font-mono text-slate-600 text-xs">
//                       {formatCurrency(row.gross_amount)}
//                     </td>

//                     <td className="px-4 py-3 text-right font-mono text-amber-600 text-xs">
//                       {Number(row.discount_amount) > 0 ? formatCurrency(row.discount_amount) : "—"}
//                     </td>

//                     <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 text-xs">
//                       {formatCurrency(row.net_amount)}
//                     </td>

//                     <td className="px-4 py-3 text-right font-mono text-emerald-700 font-semibold text-xs">
//                       {formatCurrency(row.amount_paid)}
//                     </td>

//                     <td className="px-4 py-3 text-right font-mono font-black text-rose-700 text-xs">
//                       {Number(row.outstanding_balance) > 0 ? formatCurrency(row.outstanding_balance) : "₦0.00"}
//                     </td>

//                     <td className="px-4 py-3 text-center">
//                       {row.invoice_status === "PAID" && (
//                         <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase">
//                           Paid
//                         </span>
//                       )}
//                       {row.invoice_status === "PARTIALLY_PAID" && (
//                         <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black uppercase">
//                           Partial
//                         </span>
//                       )}
//                       {row.invoice_status === "OPEN" && (
//                         <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-black uppercase">
//                           Unpaid
//                         </span>
//                       )}
//                     </td>
//                   </tr>
//                 ))
//               ) : (
//                 <tr>
//                   <td colSpan={13} className="px-4 py-12 text-center text-slate-400 italic">
//                     {isLoading ? "Compiling detailed financial billing ledger..." : "No invoices found for the specified criteria."}
//                   </td>
//                 </tr>
//               )}
//             </tbody>
//           </table>
//         )}

//         {/* TAB 2: Payer Revenue & AR Summary */}
//         {activeTab === "revenue_ar" && (
//           <div className="p-4 space-y-8">
//             <div>
//               <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
//                 <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
//                 Money Received by Exact Payer Entity
//               </h3>
//               <div className="rounded-xl border border-slate-200 overflow-hidden">
//                 <table className="w-full text-left text-sm whitespace-nowrap">
//                   <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase text-slate-600">
//                     <tr>
//                       <th className="px-4 py-3">Payer Entity</th>
//                       <th className="px-4 py-3">Category</th>
//                       <th className="px-4 py-3 text-center">Receipts / Payments</th>
//                       <th className="px-4 py-3 text-center">Unique Patients</th>
//                       <th className="px-4 py-3 text-right">Total Collected (₦)</th>
//                     </tr>
//                   </thead>
//                   <tbody className="divide-y divide-slate-100">
//                     {revenueByPayer.map((r, i) => (
//                       <tr key={i} className="hover:bg-slate-50/80">
//                         <td className="px-4 py-3 font-bold text-indigo-700">{r.payer_name}</td>
//                         <td className="px-4 py-3 text-slate-600 font-medium">{r.payer_category}</td>
//                         <td className="px-4 py-3 text-center font-bold text-slate-700">{r.payment_count}</td>
//                         <td className="px-4 py-3 text-center text-slate-600">{r.unique_patients}</td>
//                         <td className="px-4 py-3 text-right font-black font-mono text-emerald-700">
//                           {formatCurrency(r.total_collected)}
//                         </td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
//             </div>

//             <div>
//               <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
//                 <div className="w-2 h-2 rounded-full bg-rose-500"></div>
//                 Outstanding Debt Exposure (AR) by Exact Payer Entity
//               </h3>
//               <div className="rounded-xl border border-slate-200 overflow-hidden">
//                 <table className="w-full text-left text-sm whitespace-nowrap">
//                   <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase text-slate-600">
//                     <tr>
//                       <th className="px-4 py-3">Payer Entity</th>
//                       <th className="px-4 py-3">Category</th>
//                       <th className="px-4 py-3 text-center">Open Invoices</th>
//                       <th className="px-4 py-3 text-center">Indebted Patients</th>
//                       <th className="px-4 py-3 text-right">Gross Billed</th>
//                       <th className="px-4 py-3 text-right">Discounts</th>
//                       <th className="px-4 py-3 text-right">Net Billed</th>
//                       <th className="px-4 py-3 text-right">Outstanding Balance (₦)</th>
//                     </tr>
//                   </thead>
//                   <tbody className="divide-y divide-slate-100">
//                     {outstandingByPayer.map((r, i) => (
//                       <tr key={i} className="hover:bg-slate-50/80">
//                         <td className="px-4 py-3 font-bold text-indigo-700">{r.payer_name}</td>
//                         <td className="px-4 py-3 text-slate-600 font-medium">{r.payer_category}</td>
//                         <td className="px-4 py-3 text-center font-semibold text-slate-700">{r.open_invoices_count}</td>
//                         <td className="px-4 py-3 text-center text-slate-600">{r.indebted_patients}</td>
//                         <td className="px-4 py-3 text-right font-mono text-slate-600">{formatCurrency(r.gross_billed)}</td>
//                         <td className="px-4 py-3 text-right font-mono text-amber-600">{formatCurrency(r.total_discount)}</td>
//                         <td className="px-4 py-3 text-right font-mono text-slate-900">{formatCurrency(r.net_billed)}</td>
//                         <td className="px-4 py-3 text-right font-black font-mono text-rose-700">
//                           {formatCurrency(r.total_outstanding)}
//                         </td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
//             </div>
//           </div>
//         )}

//         {/* TAB 3: Departmental Service Composition */}
//         {activeTab === "departments" && (
//           <div className="p-4">
//             <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-3">
//               Hospital Service Revenue Origin
//             </h3>
//             <table className="w-full text-left text-sm whitespace-nowrap">
//               <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase text-slate-600">
//                 <tr>
//                   <th className="px-4 py-3.5">#</th>
//                   <th className="px-4 py-3.5">Department / Service Group</th>
//                   <th className="px-4 py-3.5 text-center">Service Volume</th>
//                   <th className="px-4 py-3.5 text-right">Billed Revenue (₦)</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-100">
//                 {departments.map((dept, idx) => (
//                   <tr key={idx} className="hover:bg-slate-50/80">
//                     <td className="px-4 py-3 text-xs font-bold text-slate-400">{idx + 1}</td>
//                     <td className="px-4 py-3 font-bold text-slate-800">{dept.department_name}</td>
//                     <td className="px-4 py-3 text-center font-semibold text-slate-700">{dept.service_volume} charges</td>
//                     <td className="px-4 py-3 text-right font-mono font-black text-slate-900">
//                       {formatCurrency(dept.total_billed_revenue)}
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         )}

//         {/* TAB 4: Discounts Authorized By User */}
//         {activeTab === "discounts" && (
//           <table className="w-full text-left text-sm whitespace-nowrap">
//             <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase text-slate-600">
//               <tr>
//                 <th className="px-4 py-3.5">#</th>
//                 <th className="px-4 py-3.5">Authorizing Staff</th>
//                 <th className="px-4 py-3.5">Staff ID</th>
//                 <th className="px-4 py-3.5">Department</th>
//                 <th className="px-4 py-3.5 text-center">Discounts Given</th>
//                 <th className="px-4 py-3.5 text-center">Invoices Impacted</th>
//                 <th className="px-4 py-3.5 text-right">Gross Billed</th>
//                 <th className="px-4 py-3.5 text-right">Discount Concession (₦)</th>
//                 <th className="px-4 py-3.5 text-right">Avg Discount %</th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-slate-100">
//               {discountsByUser.map((row, idx) => (
//                 <tr key={row.user_id || idx} className="hover:bg-slate-50/80">
//                   <td className="px-4 py-3 text-xs font-bold text-slate-400">{idx + 1}</td>
//                   <td className="px-4 py-3 font-bold text-slate-900">{renderValue(row.staff_name)}</td>
//                   <td className="px-4 py-3 font-mono text-xs text-slate-500">{renderValue(row.staff_id)}</td>
//                   <td className="px-4 py-3 text-xs text-slate-600">{renderValue(row.department)}</td>
//                   <td className="px-4 py-3 text-center font-bold text-slate-800">{row.total_discounts_granted}</td>
//                   <td className="px-4 py-3 text-center text-slate-600">{row.total_invoices_impacted}</td>
//                   <td className="px-4 py-3 text-right font-mono text-slate-600">{formatCurrency(row.total_gross_value)}</td>
//                   <td className="px-4 py-3 text-right font-black font-mono text-amber-700">
//                     {formatCurrency(row.total_discount_granted)}
//                   </td>
//                   <td className="px-4 py-3 text-right font-bold text-indigo-700">{row.avg_discount_pct}%</td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         )}

//         {/* TAB 5: Cash Deposit Exhaustion */}
//         {activeTab === "cash_exhaust" && (
//           <table className="w-full text-left text-sm whitespace-nowrap">
//             <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase text-slate-600">
//               <tr>
//                 <th className="px-4 py-3.5">#</th>
//                 <th className="px-4 py-3.5">Receipt #</th>
//                 <th className="px-4 py-3.5">Date</th>
//                 <th className="px-4 py-3.5">Patient Details</th>
//                 <th className="px-4 py-3.5 text-right">Deposited</th>
//                 <th className="px-4 py-3.5 text-right">Utilized</th>
//                 <th className="px-4 py-3.5 text-right">Balance</th>
//                 <th className="px-4 py-3.5 text-center">Exhaustion %</th>
//                 <th className="px-4 py-3.5 text-right">Status</th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-slate-100">
//               {cashExhaust.map((row, idx) => (
//                 <tr key={row.deposit_id || idx} className="hover:bg-slate-50/80">
//                   <td className="px-4 py-3 text-xs font-bold text-slate-400">{idx + 1}</td>
//                   <td className="px-4 py-3 font-mono text-xs font-bold text-slate-800">{row.receipt_number}</td>
//                   <td className="px-4 py-3 text-xs text-slate-600">{row.deposit_date?.slice(0, 10)}</td>
//                   <td className="px-4 py-3">
//                     <div className="font-bold text-slate-900">{row.patient_name}</div>
//                     <div className="text-[10px] text-slate-400 font-mono">MRN: {row.mrn}</div>
//                   </td>
//                   <td className="px-4 py-3 text-right font-mono text-slate-700">{formatCurrency(row.total_deposited)}</td>
//                   <td className="px-4 py-3 text-right font-mono text-slate-700">{formatCurrency(row.amount_utilized)}</td>
//                   <td className="px-4 py-3 text-right font-black font-mono text-slate-900">{formatCurrency(row.balance_remaining)}</td>
//                   <td className="px-4 py-3 text-center font-mono font-bold text-xs">{row.exhaust_rate_pct}%</td>
//                   <td className="px-4 py-3 text-right">
//                     {row.exhaustion_status === "EXHAUSTED" ? (
//                       <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-black uppercase">
//                         Exhausted
//                       </span>
//                     ) : (
//                       <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase">
//                         Surplus
//                       </span>
//                     )}
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         )}

//       </div>
//     </ReportShell>
//   );
// };

// export default FinancialOverviewReport;



// // import React, { useState, useEffect, useMemo } from "react";
// // import { 
// //   Search, 
// //   Wallet, 
// //   Building2, 
// //   AlertOctagon, 
// //   TrendingUp, 
// //   CreditCard, 
// //   UserCheck, 
// //   ShieldAlert,
// //   Percent
// // } from "lucide-react";
// // import apiClient from "../../api/client";
// // import {
// //   renderValue,
// //   formatCurrency,
// //   CustomDateInputs,
// //   ReportShell,
// //   KpiCard,
// // } from "./billingReportShared";

// // interface ExecutiveKPIs {
// //   total_money_received: number;
// //   total_outstanding_ar: number;
// //   total_discounts_granted: number;
// //   collection_vs_ar_ratio: string;
// // }

// // interface RevenueItem {
// //   payer_name: string;
// //   payer_category: string;
// //   payment_count: number;
// //   unique_patients: number;
// //   total_collected: number | string;
// // }

// // interface OutstandingItem {
// //   payer_name: string;
// //   payer_category: string;
// //   open_invoices_count: number;
// //   indebted_patients: number;
// //   gross_billed: number | string;
// //   total_discount: number | string;
// //   net_billed: number | string;
// //   total_outstanding: number | string;
// // }

// // interface DiscountUser {
// //   user_id: number;
// //   staff_name: string;
// //   staff_id: string;
// //   department: string;
// //   total_discounts_granted: number;
// //   total_invoices_impacted: number;
// //   total_gross_value: number | string;
// //   total_discount_granted: number | string;
// //   total_net_realized: number | string;
// //   avg_discount_pct: number | string;
// // }

// // interface DepositExhaustRecord {
// //   deposit_id: number;
// //   receipt_number: string;
// //   deposit_date: string;
// //   mrn: string;
// //   patient_name: string;
// //   payer_name: string;
// //   payer_group: string;
// //   total_deposited: number | string;
// //   amount_utilized: number | string;
// //   balance_remaining: number | string;
// //   exhaust_rate_pct: number;
// //   exhaustion_status: "EXHAUSTED" | "CRITICAL_DEPLETION" | "HEALTHY_SURPLUS";
// //   received_by_staff: string;
// // }

// // const FinancialOverviewReport: React.FC = () => {
// //   const [activeTab, setActiveTab] = useState<"revenue_ar" | "discounts" | "cash_exhaust" | "credit_exhaust">("revenue_ar");
// //   const [kpis, setKpis] = useState<ExecutiveKPIs>({
// //     total_money_received: 0,
// //     total_outstanding_ar: 0,
// //     total_discounts_granted: 0,
// //     collection_vs_ar_ratio: "0 : 1"
// //   });

// //   const [revenueBreakdown, setRevenueBreakdown] = useState<RevenueItem[]>([]);
// //   const [outstandingBreakdown, setOutstandingBreakdown] = useState<OutstandingItem[]>([]);
// //   const [discountsByUser, setDiscountsByUser] = useState<DiscountUser[]>([]);
// //   const [cashExhaust, setCashExhaust] = useState<DepositExhaustRecord[]>([]);
// //   const [creditExhaust, setCreditExhaust] = useState<DepositExhaustRecord[]>([]);
// //   const [isLoading, setIsLoading] = useState(true);

// //   // Filters
// //   const [searchTerm, setSearchTerm] = useState("");
// //   const [timeframe, setTimeframe] = useState("this_month");
// //   const [dateFrom, setDateFrom] = useState("");
// //   const [dateTo, setDateTo] = useState("");
// //   const [exhaustStatusFilter, setExhaustStatusFilter] = useState("ALL");

// //   const fetchReportData = async () => {
// //     try {
// //       setIsLoading(true);

// //       const params = new URLSearchParams();
// //       params.append("timeframe", timeframe);
// //       if (timeframe === "custom") {
// //         if (dateFrom) params.append("start_date", dateFrom);
// //         if (dateTo) params.append("end_date", dateTo);
// //       }
// //       if (exhaustStatusFilter !== "ALL") params.append("exhaust_status", exhaustStatusFilter);
// //       if (searchTerm) params.append("search", searchTerm);

// //       const response = await apiClient.get(`/report/billing/financial-overview?${params.toString()}`);
// //       if (response.data && response.data.data) {
// //         const d = response.data.data;
// //         setKpis(d.executive_kpis || {});
// //         setRevenueBreakdown(d.revenue_breakdown || []);
// //         setOutstandingBreakdown(d.outstanding_breakdown || []);
// //         setDiscountsByUser(d.discounts_by_user || []);
// //         setCashExhaust(d.deposit_exhaust_cash || []);
// //         setCreditExhaust(d.deposit_exhaust_credit || []);
// //       }
// //     } catch (error) {
// //       console.error("Failed to load financial overview report:", error);
// //     } finally {
// //       setIsLoading(false);
// //     }
// //   };

// //   useEffect(() => {
// //     fetchReportData();
// //     // eslint-disable-next-line react-hooks/exhaustive-deps
// //   }, [timeframe, dateFrom, dateTo, exhaustStatusFilter]);

// //   const activeRecords = useMemo(() => {
// //     if (activeTab === "discounts") return discountsByUser;
// //     if (activeTab === "cash_exhaust") return cashExhaust;
// //     if (activeTab === "credit_exhaust") return creditExhaust;
// //     return revenueBreakdown;
// //   }, [activeTab, discountsByUser, cashExhaust, creditExhaust, revenueBreakdown]);

// //   return (
// //     <ReportShell
// //       title="Financial Performance & Deposit Intelligence"
// //       subtitle="Executive view of collections by specific payer entity, outstanding debt aging, discount approvals, and patient deposit exhaustion."
// //       isLoading={isLoading}
// //       onClear={() => {
// //         setSearchTerm("");
// //         setTimeframe("this_month");
// //         setDateFrom("");
// //         setDateTo("");
// //         setExhaustStatusFilter("ALL");
// //       }}
// //       onRefresh={fetchReportData}
// //       exportData={activeRecords}
// //       exportFilename={`financial_overview_${activeTab}`}
// //       filters={
// //         <>
// //           <div className="relative lg:col-span-2">
// //             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
// //             <input
// //               type="text"
// //               placeholder="Search specific payer, patient, receipt, or staff..."
// //               value={searchTerm}
// //               onChange={(e) => setSearchTerm(e.target.value)}
// //               onKeyDown={(e) => e.key === "Enter" && fetchReportData()}
// //               className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 font-medium"
// //             />
// //           </div>

// //           <div>
// //             <select
// //               value={timeframe}
// //               onChange={(e) => setTimeframe(e.target.value)}
// //               disabled={isLoading}
// //               className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600/20"
// //             >
// //               <option value="today">Today</option>
// //               <option value="yesterday">Yesterday</option>
// //               <option value="this_week">This Week</option>
// //               <option value="last_week">Last Week</option>
// //               <option value="last_7_days">Last 7 Days</option>
// //               <option value="last_30_days">Last 30 Days</option>
// //               <option value="this_month">This Month</option>
// //               <option value="last_month">Last Month</option>
// //               <option value="last_3_months">Last 3 Months</option>
// //               <option value="this_year">This Year</option>
// //               <option value="all_time">All Time</option>
// //               <option value="custom">Custom Date Range</option>
// //             </select>
// //           </div>

// //           {(activeTab === "cash_exhaust" || activeTab === "credit_exhaust") && (
// //             <div>
// //               <select
// //                 value={exhaustStatusFilter}
// //                 onChange={(e) => setExhaustStatusFilter(e.target.value)}
// //                 disabled={isLoading}
// //                 className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600/20"
// //               >
// //                 <option value="ALL">All Deposit States</option>
// //                 <option value="EXHAUSTED">100% Exhausted (Zero Balance)</option>
// //                 <option value="CRITICAL">Critical Depletion (&lt; 20% remaining)</option>
// //                 <option value="HEALTHY">Healthy Surplus</option>
// //               </select>
// //             </div>
// //           )}

// //           {timeframe === "custom" && (
// //             <CustomDateInputs
// //               dateFrom={dateFrom}
// //               dateTo={dateTo}
// //               setDateFrom={setDateFrom}
// //               setDateTo={setDateTo}
// //               disabled={isLoading}
// //             />
// //           )}
// //         </>
// //       }
// //     >
// //       {/* ---------------- 1. Executive Metric Cards ---------------- */}
// //       <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
// //         <KpiCard
// //           icon={Wallet}
// //           label="Total Money Received"
// //           value={formatCurrency(kpis.total_money_received)}
// //           colorClass="bg-emerald-50 border-emerald-100 text-emerald-900"
// //         />
// //         <KpiCard
// //           icon={AlertOctagon}
// //           label="Total Outstanding (AR)"
// //           value={formatCurrency(kpis.total_outstanding_ar)}
// //           colorClass="bg-rose-50 border-rose-100 text-rose-900"
// //         />
// //         <KpiCard
// //           icon={Percent}
// //           label="Discounts Authorized"
// //           value={formatCurrency(kpis.total_discounts_granted)}
// //           colorClass="bg-amber-50 border-amber-100 text-amber-900"
// //         />
// //         <KpiCard
// //           icon={TrendingUp}
// //           label="Collection to AR Ratio"
// //           value={kpis.collection_vs_ar_ratio}
// //           colorClass="bg-indigo-50 border-indigo-100 text-indigo-900"
// //         />
// //       </div>

// //       {/* ---------------- 2. Navigation Tabs ---------------- */}
// //       <div className="flex flex-wrap items-center gap-2 mb-4 border-b border-slate-100 pb-3">
// //         <button
// //           onClick={() => setActiveTab("revenue_ar")}
// //           className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
// //             activeTab === "revenue_ar"
// //               ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
// //               : "bg-slate-100 text-slate-600 hover:bg-slate-200"
// //           }`}
// //         >
// //           <Building2 size={15} />
// //           Payer Revenue & Outstanding AR
// //         </button>

// //         <button
// //           onClick={() => setActiveTab("discounts")}
// //           className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
// //             activeTab === "discounts"
// //               ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
// //               : "bg-slate-100 text-slate-600 hover:bg-slate-200"
// //           }`}
// //         >
// //           <UserCheck size={15} />
// //           Discounts Given By Staff ({discountsByUser.length})
// //         </button>

// //         <button
// //           onClick={() => setActiveTab("cash_exhaust")}
// //           className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
// //             activeTab === "cash_exhaust"
// //               ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
// //               : "bg-slate-100 text-slate-600 hover:bg-slate-200"
// //           }`}
// //         >
// //           <CreditCard size={15} />
// //           Deposit Exhaustion (Cash) ({cashExhaust.length})
// //         </button>

// //         <button
// //           onClick={() => setActiveTab("credit_exhaust")}
// //           className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
// //             activeTab === "credit_exhaust"
// //               ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
// //               : "bg-slate-100 text-slate-600 hover:bg-slate-200"
// //           }`}
// //         >
// //           <ShieldAlert size={15} />
// //           Deposit Exhaustion (Credit Payors) ({creditExhaust.length})
// //         </button>
// //       </div>

// //       {/* ---------------- 3. Data Presentation Area ---------------- */}
// //       <div className="overflow-x-auto rounded-xl border border-slate-200 min-h-[380px] bg-white">
        
// //         {/* TAB 1: Revenue & Outstanding by Payer Category */}
// //         {activeTab === "revenue_ar" && (
// //           <div className="p-4 space-y-8">
// //             <div>
// //               <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-2.5 flex items-center gap-2">
// //                 <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
// //                 Detailed Money Received By Payer Entity
// //               </h3>
// //               <div className="rounded-xl border border-slate-200 overflow-hidden">
// //                 <table className="w-full text-left text-sm whitespace-nowrap">
// //                   <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase text-slate-600">
// //                     <tr>
// //                       <th className="px-4 py-3">Payer Entity Name</th>
// //                       <th className="px-4 py-3">Framework Category</th>
// //                       <th className="px-4 py-3 text-center">Receipts / Payments</th>
// //                       <th className="px-4 py-3 text-center">Unique Patients</th>
// //                       <th className="px-4 py-3 text-right">Total Money Collected (₦)</th>
// //                     </tr>
// //                   </thead>
// //                   <tbody className="divide-y divide-slate-100">
// //                     {revenueBreakdown.map((r, i) => (
// //                       <tr key={i} className="hover:bg-slate-50/80">
// //                         <td className="px-4 py-3 font-bold text-indigo-700">{r.payer_name}</td>
// //                         <td className="px-4 py-3 font-semibold text-slate-700">
// //                           {r.payer_category === "PRIVATE_CASH" && "Private Cash / Self-Pay"}
// //                           {r.payer_category === "HMO" && "Health Maintenance Organization (HMO)"}
// //                           {r.payer_category === "CORPORATE" && "Corporate & Staff Retainership"}
// //                           {r.payer_category === "FOUNDATION" && "Foundation, NGO & Charity Grants"}
// //                         </td>
// //                         <td className="px-4 py-3 text-center font-bold text-slate-700">{r.payment_count}</td>
// //                         <td className="px-4 py-3 text-center text-slate-600">{r.unique_patients}</td>
// //                         <td className="px-4 py-3 text-right font-black font-mono text-emerald-700">
// //                           {formatCurrency(r.total_collected)}
// //                         </td>
// //                       </tr>
// //                     ))}
// //                     {revenueBreakdown.length === 0 && (
// //                       <tr>
// //                         <td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">No revenue collected during this period.</td>
// //                       </tr>
// //                     )}
// //                   </tbody>
// //                 </table>
// //               </div>
// //             </div>

// //             <div>
// //               <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-2.5 flex items-center gap-2">
// //                 <div className="w-2 h-2 rounded-full bg-rose-500"></div>
// //                 Detailed Outstanding Receivables (AR Exposure) By Payer
// //               </h3>
// //               <div className="rounded-xl border border-slate-200 overflow-hidden">
// //                 <table className="w-full text-left text-sm whitespace-nowrap">
// //                   <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase text-slate-600">
// //                     <tr>
// //                       <th className="px-4 py-3">Payer Entity Name</th>
// //                       <th className="px-4 py-3">Framework Category</th>
// //                       <th className="px-4 py-3 text-center">Open Invoices</th>
// //                       <th className="px-4 py-3 text-center">Indebted Patients</th>
// //                       <th className="px-4 py-3 text-right">Gross Billed</th>
// //                       <th className="px-4 py-3 text-right">Discounts</th>
// //                       <th className="px-4 py-3 text-right">Net Billed</th>
// //                       <th className="px-4 py-3 text-right">Outstanding Balance (₦)</th>
// //                     </tr>
// //                   </thead>
// //                   <tbody className="divide-y divide-slate-100">
// //                     {outstandingBreakdown.map((r, i) => (
// //                       <tr key={i} className="hover:bg-slate-50/80">
// //                         <td className="px-4 py-3 font-bold text-indigo-700">{r.payer_name}</td>
// //                         <td className="px-4 py-3 font-semibold text-slate-700">
// //                           {r.payer_category === "PRIVATE_CASH" && "Private Cash / Self-Pay"}
// //                           {r.payer_category === "HMO" && "Health Maintenance Organization (HMO)"}
// //                           {r.payer_category === "CORPORATE" && "Corporate & Staff Retainership"}
// //                           {r.payer_category === "FOUNDATION" && "Foundation, NGO & Charity Grants"}
// //                         </td>
// //                         <td className="px-4 py-3 text-center font-semibold text-slate-700">{r.open_invoices_count}</td>
// //                         <td className="px-4 py-3 text-center text-slate-600">{r.indebted_patients}</td>
// //                         <td className="px-4 py-3 text-right font-mono text-slate-600">{formatCurrency(r.gross_billed)}</td>
// //                         <td className="px-4 py-3 text-right font-mono text-amber-600">{formatCurrency(r.total_discount)}</td>
// //                         <td className="px-4 py-3 text-right font-mono text-slate-900">{formatCurrency(r.net_billed)}</td>
// //                         <td className="px-4 py-3 text-right font-black font-mono text-rose-700">
// //                           {formatCurrency(r.total_outstanding)}
// //                         </td>
// //                       </tr>
// //                     ))}
// //                     {outstandingBreakdown.length === 0 && (
// //                       <tr>
// //                         <td colSpan={8} className="px-4 py-8 text-center text-slate-400 italic">No outstanding receivables for this period.</td>
// //                       </tr>
// //                     )}
// //                   </tbody>
// //                 </table>
// //               </div>
// //             </div>
// //           </div>
// //         )}

// //         {/* TAB 2: Discounts Authorized by User */}
// //         {activeTab === "discounts" && (
// //           <table className="w-full text-left text-sm whitespace-nowrap">
// //             <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase text-slate-600">
// //               <tr>
// //                 <th className="px-4 py-3.5">#</th>
// //                 <th className="px-4 py-3.5">Authorizing Staff</th>
// //                 <th className="px-4 py-3.5">Staff ID</th>
// //                 <th className="px-4 py-3.5">Department</th>
// //                 <th className="px-4 py-3.5 text-center">Discounts Given</th>
// //                 <th className="px-4 py-3.5 text-center">Invoices Impacted</th>
// //                 <th className="px-4 py-3.5 text-right">Gross Billed</th>
// //                 <th className="px-4 py-3.5 text-right">Discount Concession (₦)</th>
// //                 <th className="px-4 py-3.5 text-right">Avg Discount %</th>
// //               </tr>
// //             </thead>
// //             <tbody className="divide-y divide-slate-100">
// //               {discountsByUser.map((row, idx) => (
// //                 <tr key={row.user_id || idx} className="hover:bg-slate-50/80">
// //                   <td className="px-4 py-3 text-xs font-bold text-slate-400">{idx + 1}</td>
// //                   <td className="px-4 py-3 font-bold text-slate-900">{renderValue(row.staff_name)}</td>
// //                   <td className="px-4 py-3 font-mono text-xs text-slate-500">{renderValue(row.staff_id)}</td>
// //                   <td className="px-4 py-3 text-xs text-slate-600">{renderValue(row.department)}</td>
// //                   <td className="px-4 py-3 text-center font-bold text-slate-800">{row.total_discounts_granted}</td>
// //                   <td className="px-4 py-3 text-center text-slate-600">{row.total_invoices_impacted}</td>
// //                   <td className="px-4 py-3 text-right font-mono text-slate-600">{formatCurrency(row.total_gross_value)}</td>
// //                   <td className="px-4 py-3 text-right font-black font-mono text-amber-700">
// //                     {formatCurrency(row.total_discount_granted)}
// //                   </td>
// //                   <td className="px-4 py-3 text-right font-bold text-indigo-700">{row.avg_discount_pct}%</td>
// //                 </tr>
// //               ))}
// //             </tbody>
// //           </table>
// //         )}

// //         {/* TAB 3 & 4: Deposit Exhaustion Ledger (Cash vs. Credit Payors) */}
// //         {(activeTab === "cash_exhaust" || activeTab === "credit_exhaust") && (
// //           <table className="w-full text-left text-sm whitespace-nowrap">
// //             <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase text-slate-600">
// //               <tr>
// //                 <th className="px-4 py-3.5">#</th>
// //                 <th className="px-4 py-3.5">Receipt No</th>
// //                 <th className="px-4 py-3.5">Deposit Date</th>
// //                 {activeTab === "credit_exhaust" && <th className="px-4 py-3.5">Corporate / Payor Entity</th>}
// //                 <th className="px-4 py-3.5">Patient Details</th>
// //                 <th className="px-4 py-3.5 text-right">Total Deposited</th>
// //                 <th className="px-4 py-3.5 text-right">Amount Utilized</th>
// //                 <th className="px-4 py-3.5 text-right">Remaining Balance (₦)</th>
// //                 <th className="px-4 py-3.5 text-center">Exhaustion %</th>
// //                 <th className="px-4 py-3.5 text-right">Exhaustion Status</th>
// //               </tr>
// //             </thead>
// //             <tbody className="divide-y divide-slate-100">
// //               {(activeTab === "cash_exhaust" ? cashExhaust : creditExhaust).map((row, idx) => (
// //                 <tr key={row.deposit_id || idx} className="hover:bg-slate-50/80">
// //                   <td className="px-4 py-3 text-xs font-bold text-slate-400">{idx + 1}</td>
// //                   <td className="px-4 py-3 font-mono text-xs font-bold text-slate-800">{row.receipt_number}</td>
// //                   <td className="px-4 py-3 text-xs text-slate-600">{row.deposit_date?.slice(0, 10)}</td>
// //                   {activeTab === "credit_exhaust" && (
// //                     <td className="px-4 py-3 font-bold text-indigo-700 text-xs">{row.payer_name}</td>
// //                   )}
// //                   <td className="px-4 py-3">
// //                     <div className="font-bold text-slate-900">{row.patient_name}</div>
// //                     <div className="text-[10px] text-slate-400 font-mono">MRN: {row.mrn}</div>
// //                   </td>
// //                   <td className="px-4 py-3 text-right font-mono text-slate-700">{formatCurrency(row.total_deposited)}</td>
// //                   <td className="px-4 py-3 text-right font-mono text-slate-700">{formatCurrency(row.amount_utilized)}</td>
// //                   <td className="px-4 py-3 text-right font-black font-mono text-slate-900">
// //                     {formatCurrency(row.balance_remaining)}
// //                   </td>
// //                   <td className="px-4 py-3 text-center">
// //                     <span className="font-mono font-bold text-xs">{row.exhaust_rate_pct}%</span>
// //                   </td>
// //                   <td className="px-4 py-3 text-right">
// //                     {row.exhaustion_status === "EXHAUSTED" && (
// //                       <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-black uppercase">
// //                         Exhausted (₦0.00)
// //                       </span>
// //                     )}
// //                     {row.exhaustion_status === "CRITICAL_DEPLETION" && (
// //                       <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-black uppercase">
// //                         Critical Depletion (&lt; 20%)
// //                       </span>
// //                     )}
// //                     {row.exhaustion_status === "HEALTHY_SURPLUS" && (
// //                       <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase">
// //                         Active Surplus
// //                       </span>
// //                     )}
// //                   </td>
// //                 </tr>
// //               ))}
// //             </tbody>
// //           </table>
// //         )}

// //       </div>
// //     </ReportShell>
// //   );
// // };

// // export default FinancialOverviewReport;

// // import React, { useState, useEffect, useMemo } from "react";
// // import { 
// //   Search, 
// //   Wallet, 
// //   Building2, 
// //   Tag, 
// //   AlertOctagon, 
// //   TrendingUp, 
// //   CreditCard, 
// //   UserCheck, 
// //   ShieldAlert,
// //   Percent,
// //   Download,
// //   Users
// // } from "lucide-react";
// // import apiClient from "../../api/client";
// // import {
// //   renderValue,
// //   formatCurrency,
// //   CustomDateInputs,
// //   ReportShell,
// //   KpiCard,
// // } from "./billingReportShared";

// // interface ExecutiveKPIs {
// //   total_money_received: number;
// //   total_outstanding_ar: number;
// //   total_discounts_granted: number;
// //   collection_vs_ar_ratio: string;
// // }

// // interface RevenueItem {
// //   payer_category: string;
// //   payment_count: number;
// //   unique_patients: number;
// //   total_collected: number | string;
// // }

// // interface OutstandingItem {
// //   payer_category: string;
// //   open_invoices_count: number;
// //   indebted_patients: number;
// //   gross_billed: number | string;
// //   total_discount: number | string;
// //   net_billed: number | string;
// //   total_outstanding: number | string;
// // }

// // interface DiscountUser {
// //   user_id: number;
// //   staff_name: string;
// //   staff_id: string;
// //   department: string;
// //   total_discounts_granted: number;
// //   total_invoices_impacted: number;
// //   total_gross_value: number | string;
// //   total_discount_granted: number | string;
// //   total_net_realized: number | string;
// //   avg_discount_pct: number | string;
// // }

// // interface DepositExhaustRecord {
// //   deposit_id: number;
// //   receipt_number: string;
// //   deposit_date: string;
// //   mrn: string;
// //   patient_name: string;
// //   payer_name: string;
// //   payer_group: string;
// //   total_deposited: number | string;
// //   amount_utilized: number | string;
// //   balance_remaining: number | string;
// //   exhaust_rate_pct: number;
// //   exhaustion_status: "EXHAUSTED" | "CRITICAL_DEPLETION" | "HEALTHY_SURPLUS";
// //   received_by_staff: string;
// // }

// // const FinancialOverviewReport: React.FC = () => {
// //   const [activeTab, setActiveTab] = useState<"revenue_ar" | "discounts" | "cash_exhaust" | "credit_exhaust">("revenue_ar");
// //   const [kpis, setKpis] = useState<ExecutiveKPIs>({
// //     total_money_received: 0,
// //     total_outstanding_ar: 0,
// //     total_discounts_granted: 0,
// //     collection_vs_ar_ratio: "0 : 1"
// //   });

// //   const [revenueBreakdown, setRevenueBreakdown] = useState<RevenueItem[]>([]);
// //   const [outstandingBreakdown, setOutstandingBreakdown] = useState<OutstandingItem[]>([]);
// //   const [discountsByUser, setDiscountsByUser] = useState<DiscountUser[]>([]);
// //   const [cashExhaust, setCashExhaust] = useState<DepositExhaustRecord[]>([]);
// //   const [creditExhaust, setCreditExhaust] = useState<DepositExhaustRecord[]>([]);
// //   const [isLoading, setIsLoading] = useState(true);

// //   // Filters
// //   const [searchTerm, setSearchTerm] = useState("");
// //   const [timeframe, setTimeframe] = useState("this_month");
// //   const [dateFrom, setDateFrom] = useState("");
// //   const [dateTo, setDateTo] = useState("");
// //   const [exhaustStatusFilter, setExhaustStatusFilter] = useState("ALL");

// //   const fetchReportData = async () => {
// //     try {
// //       setIsLoading(true);

// //       const params = new URLSearchParams();
// //       params.append("timeframe", timeframe);
// //       if (timeframe === "custom") {
// //         if (dateFrom) params.append("start_date", dateFrom);
// //         if (dateTo) params.append("end_date", dateTo);
// //       }
// //       if (exhaustStatusFilter !== "ALL") params.append("exhaust_status", exhaustStatusFilter);
// //       if (searchTerm) params.append("search", searchTerm);

// //       const response = await apiClient.get(`/report/billing/financial-overview?${params.toString()}`);
// //       if (response.data && response.data.data) {
// //         const d = response.data.data;
// //         setKpis(d.executive_kpis || {});
// //         setRevenueBreakdown(d.revenue_breakdown || []);
// //         setOutstandingBreakdown(d.outstanding_breakdown || []);
// //         setDiscountsByUser(d.discounts_by_user || []);
// //         setCashExhaust(d.deposit_exhaust_cash || []);
// //         setCreditExhaust(d.deposit_exhaust_credit || []);
// //       }
// //     } catch (error) {
// //       console.error("Failed to load financial overview report:", error);
// //     } finally {
// //       setIsLoading(false);
// //     }
// //   };

// //   useEffect(() => {
// //     fetchReportData();
// //     // eslint-disable-next-line react-hooks/exhaustive-deps
// //   }, [timeframe, dateFrom, dateTo, exhaustStatusFilter]);

// //   const activeRecords = useMemo(() => {
// //     if (activeTab === "discounts") return discountsByUser;
// //     if (activeTab === "cash_exhaust") return cashExhaust;
// //     if (activeTab === "credit_exhaust") return creditExhaust;
// //     return revenueBreakdown;
// //   }, [activeTab, discountsByUser, cashExhaust, creditExhaust, revenueBreakdown]);

// //   return (
// //     <ReportShell
// //       title="Financial Performance & Deposit Intelligence"
// //       subtitle="Executive view of collections by payer category, outstanding debt aging, discount approvals, and patient deposit exhaustion."
// //       isLoading={isLoading}
// //       onClear={() => {
// //         setSearchTerm("");
// //         setTimeframe("this_month");
// //         setDateFrom("");
// //         setDateTo("");
// //         setExhaustStatusFilter("ALL");
// //       }}
// //       onRefresh={fetchReportData}
// //       exportData={activeRecords}
// //       exportFilename={`financial_overview_${activeTab}`}
// //       filters={
// //         <>
// //           <div className="relative lg:col-span-2">
// //             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
// //             <input
// //               type="text"
// //               placeholder="Search payer, patient name, MRN, receipt, or staff..."
// //               value={searchTerm}
// //               onChange={(e) => setSearchTerm(e.target.value)}
// //               onKeyDown={(e) => e.key === "Enter" && fetchReportData()}
// //               className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 font-medium"
// //             />
// //           </div>

// //           <div>
// //             <select
// //               value={timeframe}
// //               onChange={(e) => setTimeframe(e.target.value)}
// //               disabled={isLoading}
// //               className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600/20"
// //             >
// //               <option value="today">Today</option>
// //               <option value="yesterday">Yesterday</option>
// //               <option value="this_week">This Week</option>
// //               <option value="last_week">Last Week</option>
// //               <option value="last_7_days">Last 7 Days</option>
// //               <option value="last_30_days">Last 30 Days</option>
// //               <option value="this_month">This Month</option>
// //               <option value="last_month">Last Month</option>
// //               <option value="last_3_months">Last 3 Months</option>
// //               <option value="this_year">This Year</option>
// //               <option value="all_time">All Time</option>
// //               <option value="custom">Custom Date Range</option>
// //             </select>
// //           </div>

// //           {(activeTab === "cash_exhaust" || activeTab === "credit_exhaust") && (
// //             <div>
// //               <select
// //                 value={exhaustStatusFilter}
// //                 onChange={(e) => setExhaustStatusFilter(e.target.value)}
// //                 disabled={isLoading}
// //                 className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600/20"
// //               >
// //                 <option value="ALL">All Deposit States</option>
// //                 <option value="EXHAUSTED">100% Exhausted (Zero Balance)</option>
// //                 <option value="CRITICAL">Critical Depletion (&lt; 20% remaining)</option>
// //                 <option value="HEALTHY">Healthy Surplus</option>
// //               </select>
// //             </div>
// //           )}

// //           {timeframe === "custom" && (
// //             <CustomDateInputs
// //               dateFrom={dateFrom}
// //               dateTo={dateTo}
// //               setDateFrom={setDateFrom}
// //               setDateTo={setDateTo}
// //               disabled={isLoading}
// //             />
// //           )}
// //         </>
// //       }
// //     >
// //       {/* ---------------- 1. Executive Metric Cards ---------------- */}
// //       <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
// //         <KpiCard
// //           icon={Wallet}
// //           label="Total Money Received"
// //           value={formatCurrency(kpis.total_money_received)}
// //           colorClass="bg-emerald-50 border-emerald-100 text-emerald-900"
// //         />
// //         <KpiCard
// //           icon={AlertOctagon}
// //           label="Total Outstanding (AR)"
// //           value={formatCurrency(kpis.total_outstanding_ar)}
// //           colorClass="bg-rose-50 border-rose-100 text-rose-900"
// //         />
// //         <KpiCard
// //           icon={Percent}
// //           label="Discounts Authorized"
// //           value={formatCurrency(kpis.total_discounts_granted)}
// //           colorClass="bg-amber-50 border-amber-100 text-amber-900"
// //         />
// //         <KpiCard
// //           icon={TrendingUp}
// //           label="Collection to AR Ratio"
// //           value={kpis.collection_vs_ar_ratio}
// //           colorClass="bg-indigo-50 border-indigo-100 text-indigo-900"
// //         />
// //       </div>

// //       {/* ---------------- 2. Navigation Tabs ---------------- */}
// //       <div className="flex flex-wrap items-center gap-2 mb-4 border-b border-slate-100 pb-3">
// //         <button
// //           onClick={() => setActiveTab("revenue_ar")}
// //           className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
// //             activeTab === "revenue_ar"
// //               ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
// //               : "bg-slate-100 text-slate-600 hover:bg-slate-200"
// //           }`}
// //         >
// //           <Building2 size={15} />
// //           Payer Revenue & Outstanding AR
// //         </button>

// //         <button
// //           onClick={() => setActiveTab("discounts")}
// //           className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
// //             activeTab === "discounts"
// //               ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
// //               : "bg-slate-100 text-slate-600 hover:bg-slate-200"
// //           }`}
// //         >
// //           <UserCheck size={15} />
// //           Discounts Given By Staff ({discountsByUser.length})
// //         </button>

// //         <button
// //           onClick={() => setActiveTab("cash_exhaust")}
// //           className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
// //             activeTab === "cash_exhaust"
// //               ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
// //               : "bg-slate-100 text-slate-600 hover:bg-slate-200"
// //           }`}
// //         >
// //           <CreditCard size={15} />
// //           Deposit Exhaustion (Cash) ({cashExhaust.length})
// //         </button>

// //         <button
// //           onClick={() => setActiveTab("credit_exhaust")}
// //           className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
// //             activeTab === "credit_exhaust"
// //               ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
// //               : "bg-slate-100 text-slate-600 hover:bg-slate-200"
// //           }`}
// //         >
// //           <ShieldAlert size={15} />
// //           Deposit Exhaustion (Credit Payors) ({creditExhaust.length})
// //         </button>
// //       </div>

// //       {/* ---------------- 3. Data Presentation Area ---------------- */}
// //       <div className="overflow-x-auto rounded-xl border border-slate-200 min-h-[380px] bg-white">
        
// //         {/* TAB 1: Revenue & Outstanding by Payer Category */}
// //         {activeTab === "revenue_ar" && (
// //           <div className="p-4 space-y-6">
// //             <div>
// //               <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-2.5">
// //                 Total Money Received (Private Patient, HMO, Foundation, Corporate)
// //               </h3>
// //               <table className="w-full text-left text-sm whitespace-nowrap">
// //                 <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase text-slate-600">
// //                   <tr>
// //                     <th className="px-4 py-3">Payer Framework Category</th>
// //                     <th className="px-4 py-3 text-center">Receipts / Payments</th>
// //                     <th className="px-4 py-3 text-center">Unique Patients</th>
// //                     <th className="px-4 py-3 text-right">Total Money Collected (₦)</th>
// //                   </tr>
// //                 </thead>
// //                 <tbody className="divide-y divide-slate-100">
// //                   {revenueBreakdown.map((r, i) => (
// //                     <tr key={i} className="hover:bg-slate-50/80">
// //                       <td className="px-4 py-3 font-bold text-slate-900">
// //                         {r.payer_category === "PRIVATE_CASH" && "Private Cash / Self-Pay"}
// //                         {r.payer_category === "HMO" && "Health Maintenance Organization (HMO)"}
// //                         {r.payer_category === "CORPORATE" && "Corporate & Staff Retainership"}
// //                         {r.payer_category === "FOUNDATION" && "Foundation, NGO & Charity Grants"}
// //                       </td>
// //                       <td className="px-4 py-3 text-center font-bold text-slate-700">{r.payment_count}</td>
// //                       <td className="px-4 py-3 text-center text-slate-600">{r.unique_patients}</td>
// //                       <td className="px-4 py-3 text-right font-black font-mono text-emerald-700">
// //                         {formatCurrency(r.total_collected)}
// //                       </td>
// //                     </tr>
// //                   ))}
// //                 </tbody>
// //               </table>
// //             </div>

// //             <div>
// //               <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-2.5">
// //                 Total Outstanding Receivables (AR Exposure)
// //               </h3>
// //               <table className="w-full text-left text-sm whitespace-nowrap">
// //                 <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase text-slate-600">
// //                   <tr>
// //                     <th className="px-4 py-3">Payer Framework Category</th>
// //                     <th className="px-4 py-3 text-center">Open Invoices</th>
// //                     <th className="px-4 py-3 text-center">Indebted Patients</th>
// //                     <th className="px-4 py-3 text-right">Gross Billed</th>
// //                     <th className="px-4 py-3 text-right">Discounts</th>
// //                     <th className="px-4 py-3 text-right">Net Billed</th>
// //                     <th className="px-4 py-3 text-right">Total Outstanding Balance (₦)</th>
// //                   </tr>
// //                 </thead>
// //                 <tbody className="divide-y divide-slate-100">
// //                   {outstandingBreakdown.map((r, i) => (
// //                     <tr key={i} className="hover:bg-slate-50/80">
// //                       <td className="px-4 py-3 font-bold text-slate-900">
// //                         {r.payer_category === "PRIVATE_CASH" && "Private Cash / Self-Pay"}
// //                         {r.payer_category === "HMO" && "Health Maintenance Organization (HMO)"}
// //                         {r.payer_category === "CORPORATE" && "Corporate & Staff Retainership"}
// //                         {r.payer_category === "FOUNDATION" && "Foundation, NGO & Charity Grants"}
// //                       </td>
// //                       <td className="px-4 py-3 text-center font-semibold text-slate-700">{r.open_invoices_count}</td>
// //                       <td className="px-4 py-3 text-center text-slate-600">{r.indebted_patients}</td>
// //                       <td className="px-4 py-3 text-right font-mono text-slate-600">{formatCurrency(r.gross_billed)}</td>
// //                       <td className="px-4 py-3 text-right font-mono text-amber-600">{formatCurrency(r.total_discount)}</td>
// //                       <td className="px-4 py-3 text-right font-mono text-slate-900">{formatCurrency(r.net_billed)}</td>
// //                       <td className="px-4 py-3 text-right font-black font-mono text-rose-700">
// //                         {formatCurrency(r.total_outstanding)}
// //                       </td>
// //                     </tr>
// //                   ))}
// //                 </tbody>
// //               </table>
// //             </div>
// //           </div>
// //         )}

// //         {/* TAB 2: Discounts Authorized by User */}
// //         {activeTab === "discounts" && (
// //           <table className="w-full text-left text-sm whitespace-nowrap">
// //             <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase text-slate-600">
// //               <tr>
// //                 <th className="px-4 py-3.5">#</th>
// //                 <th className="px-4 py-3.5">Authorizing Staff</th>
// //                 <th className="px-4 py-3.5">Staff ID</th>
// //                 <th className="px-4 py-3.5">Department</th>
// //                 <th className="px-4 py-3.5 text-center">Discounts Given</th>
// //                 <th className="px-4 py-3.5 text-center">Invoices Impacted</th>
// //                 <th className="px-4 py-3.5 text-right">Gross Billed</th>
// //                 <th className="px-4 py-3.5 text-right">Discount Concession (₦)</th>
// //                 <th className="px-4 py-3.5 text-right">Avg Discount %</th>
// //               </tr>
// //             </thead>
// //             <tbody className="divide-y divide-slate-100">
// //               {discountsByUser.map((row, idx) => (
// //                 <tr key={row.user_id || idx} className="hover:bg-slate-50/80">
// //                   <td className="px-4 py-3 text-xs font-bold text-slate-400">{idx + 1}</td>
// //                   <td className="px-4 py-3 font-bold text-slate-900">{renderValue(row.staff_name)}</td>
// //                   <td className="px-4 py-3 font-mono text-xs text-slate-500">{renderValue(row.staff_id)}</td>
// //                   <td className="px-4 py-3 text-xs text-slate-600">{renderValue(row.department)}</td>
// //                   <td className="px-4 py-3 text-center font-bold text-slate-800">{row.total_discounts_granted}</td>
// //                   <td className="px-4 py-3 text-center text-slate-600">{row.total_invoices_impacted}</td>
// //                   <td className="px-4 py-3 text-right font-mono text-slate-600">{formatCurrency(row.total_gross_value)}</td>
// //                   <td className="px-4 py-3 text-right font-black font-mono text-amber-700">
// //                     {formatCurrency(row.total_discount_granted)}
// //                   </td>
// //                   <td className="px-4 py-3 text-right font-bold text-indigo-700">{row.avg_discount_pct}%</td>
// //                 </tr>
// //               ))}
// //             </tbody>
// //           </table>
// //         )}

// //         {/* TAB 3 & 4: Deposit Exhaustion Ledger (Cash vs. Credit Payors) */}
// //         {(activeTab === "cash_exhaust" || activeTab === "credit_exhaust") && (
// //           <table className="w-full text-left text-sm whitespace-nowrap">
// //             <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase text-slate-600">
// //               <tr>
// //                 <th className="px-4 py-3.5">#</th>
// //                 <th className="px-4 py-3.5">Receipt No</th>
// //                 <th className="px-4 py-3.5">Deposit Date</th>
// //                 {activeTab === "credit_exhaust" && <th className="px-4 py-3.5">Corporate / Payor Entity</th>}
// //                 <th className="px-4 py-3.5">Patient Details</th>
// //                 <th className="px-4 py-3.5 text-right">Total Deposited</th>
// //                 <th className="px-4 py-3.5 text-right">Amount Utilized</th>
// //                 <th className="px-4 py-3.5 text-right">Remaining Balance (₦)</th>
// //                 <th className="px-4 py-3.5 text-center">Exhaustion %</th>
// //                 <th className="px-4 py-3.5 text-right">Exhaustion Status</th>
// //               </tr>
// //             </thead>
// //             <tbody className="divide-y divide-slate-100">
// //               {(activeTab === "cash_exhaust" ? cashExhaust : creditExhaust).map((row, idx) => (
// //                 <tr key={row.deposit_id || idx} className="hover:bg-slate-50/80">
// //                   <td className="px-4 py-3 text-xs font-bold text-slate-400">{idx + 1}</td>
// //                   <td className="px-4 py-3 font-mono text-xs font-bold text-slate-800">{row.receipt_number}</td>
// //                   <td className="px-4 py-3 text-xs text-slate-600">{row.deposit_date?.slice(0, 10)}</td>
// //                   {activeTab === "credit_exhaust" && (
// //                     <td className="px-4 py-3 font-bold text-indigo-700 text-xs">{row.payer_name}</td>
// //                   )}
// //                   <td className="px-4 py-3">
// //                     <div className="font-bold text-slate-900">{row.patient_name}</div>
// //                     <div className="text-[10px] text-slate-400 font-mono">MRN: {row.mrn}</div>
// //                   </td>
// //                   <td className="px-4 py-3 text-right font-mono text-slate-700">{formatCurrency(row.total_deposited)}</td>
// //                   <td className="px-4 py-3 text-right font-mono text-slate-700">{formatCurrency(row.amount_utilized)}</td>
// //                   <td className="px-4 py-3 text-right font-black font-mono text-slate-900">
// //                     {formatCurrency(row.balance_remaining)}
// //                   </td>
// //                   <td className="px-4 py-3 text-center">
// //                     <span className="font-mono font-bold text-xs">{row.exhaust_rate_pct}%</span>
// //                   </td>
// //                   <td className="px-4 py-3 text-right">
// //                     {row.exhaustion_status === "EXHAUSTED" && (
// //                       <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-black uppercase">
// //                         Exhausted (₦0.00)
// //                       </span>
// //                     )}
// //                     {row.exhaustion_status === "CRITICAL_DEPLETION" && (
// //                       <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-black uppercase">
// //                         Critical Depletion (&lt; 20%)
// //                       </span>
// //                     )}
// //                     {row.exhaustion_status === "HEALTHY_SURPLUS" && (
// //                       <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase">
// //                         Active Surplus
// //                       </span>
// //                     )}
// //                   </td>
// //                 </tr>
// //               ))}
// //             </tbody>
// //           </table>
// //         )}

// //       </div>
// //     </ReportShell>
// //   );
// // };

// // export default FinancialOverviewReport;