import React, { useState, useCallback, useMemo } from "react";
import {
  Search,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Loader2,
  Eye,
  Printer,
  Calendar,
  DollarSign,
  FileText,
  Tag,
  X,
  CheckCircle2,
  Unlock,
  Ban,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNotification } from "../context/NotificationContext";
import { billingService } from "../services/billing.service";
import InvoiceDetailsModal from "./InvoiceDetailsModal";

interface PatientInfo {
  id: number;
  mrn: string;
  first_name: string;
  last_name: string;
  dob: string;
  age: string;
  gender: string;
  email: string;
  phone: string;
}

interface BillingRecord {
  id: number;
  type: "INVOICE" | "ADVANCE";
  reference: string;
  financials: {
    total_gross: number;
    discount: number;
    net_payable: number;
    amount_paid?: number | string;
    outstanding: number;
  };
  status: string;
  date: string;
  encounter: {
    id: number | null;
    number: string | null;
    type: string | null;
  };
  doctor: string | null;
  patient: PatientInfo;
  payer: {
    name: string;
    type: string;
    policy_number: string | null;
  };
}

interface BillingHistoryData {
  summary: {
    patient: PatientInfo;
    total_records: number;
    returned_records: number;
    total_gross: number;
    total_discount: number;
    total_net_payable: number;
    total_paid: number;
    total_outstanding: number;
    total_advance: number;
    available_advance_balance: number;
  };
  pagination: {
    limit: number;
    offset: number;
  };
  financial_position: {
    invoice_gross: number;
    invoice_discount: number;
    invoice_net: number;
    invoice_paid: number;
    invoice_outstanding: number;
    advance_received: number;
    advance_available: number;
    patient_net_exposure: number;
  };
  history: BillingRecord[];
}

const BillingHistory: React.FC = () => {
  const { notify } = useNotification();
  const navigate = useNavigate();

  const [searchMrn, setSearchMrn] = useState("");
  const [patient, setPatient] = useState<PatientInfo | null>(null);
  const [financialPosition, setFinancialPosition] = useState<BillingHistoryData['financial_position'] | null>(null);
  const [historyData, setHistoryData] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Expandable Groups State
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(["INVOICE", "ADVANCE"]),
  );

  // Pagination State
  const [pagination, setPagination] = useState({
    limit: 20,
    offset: 0,
    totalRecords: 0,
  });

  // Expanded Row Details
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // Modal State
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<BillingRecord | null>(
    null,
  );

  // Discount Modal State
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountInvoiceId, setDiscountInvoiceId] = useState<number | null>(null);
  const [discountType, setDiscountType] = useState<"PERCENTAGE" | "FLAT" | "WAIVER">("PERCENTAGE");
  const [discountValue, setDiscountValue] = useState<number | "">("");
  const [discountReason, setDiscountReason] = useState("");
  const [isRequestingDiscount, setIsRequestingDiscount] = useState(false);

  const handleRequestDiscount = async () => {
    if (!discountInvoiceId) return;
    if (!discountReason.trim()) {
      notify("Please provide a reason", "error");
      return;
    }
    if (discountType !== "WAIVER" && (!discountValue || Number(discountValue) <= 0)) {
      notify("Please provide a valid value", "error");
      return;
    }

    setIsRequestingDiscount(true);
    try {
      const payload = {
        invoice_id: discountInvoiceId,
        discount_type: discountType,
        value: discountType === "WAIVER" ? 0 : Number(discountValue),
        reason: discountReason
      };
      const res = await billingService.requestDiscount(payload);
      if (res.status === "success") {
        notify("Discount requested successfully!", "success");
        setShowDiscountModal(false);
        setDiscountReason("");
        setDiscountValue("");
      } else {
        notify(res.message || "Failed to request discount", "error");
      }
    } catch (err: any) {
      console.error(err);
      notify(err.response?.data?.message || "Failed to request discount", "error");
    } finally {
      setIsRequestingDiscount(false);
    }
  };

  const [isSettling, setIsSettling] = useState<string | null>(null);

  // Cancel Invoice Modal State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelInvoiceData, setCancelInvoiceData] = useState<{ id: number; reference: string } | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelReverse, setCancelReverse] = useState(false);
  const [cancelRefund, setCancelRefund] = useState(false);
  const [cancelNotes, setCancelNotes] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  const handleCancelInvoice = async () => {
    if (!cancelInvoiceData) return;
    if (!cancelReason.trim()) {
      notify("Please provide a reason", "error");
      return;
    }

    setIsCancelling(true);
    try {
      const payload = {
        invoice_id: cancelInvoiceData.id,
        reference: cancelInvoiceData.reference,
        action: "CANCEL",
        reason: cancelReason,
        reverse_payments: cancelReverse,
        generate_refund: cancelRefund,
        notes: cancelNotes
      };
      const res = await billingService.cancelInvoice(payload);
      if (res.status === "success" || res.success) {
        notify("Invoice cancelled successfully!", "success");
        setShowCancelModal(false);
        setCancelReason("");
        setCancelNotes("");
        setCancelReverse(false);
        setCancelRefund(false);
        handleSearch();
      } else {
        notify(res.message || "Failed to cancel invoice", "error");
      }
    } catch (err: any) {
      console.error(err);
      notify(err.response?.data?.message || "Failed to cancel invoice", "error");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleClearOutstanding = async (encounterNumber: string) => {
    setIsSettling(encounterNumber);
    try {
      const payload = {
        encounter_number: encounterNumber,
        use_advance: true
      };
      const res = await billingService.processOPDOrder(payload);
      if (res.status === "success" || res.success) {
        notify("Outstanding balance settled successfully!", "success");
        handleSearch();
      } else {
        notify(res.message || "Failed to settle outstanding", "error");
      }
    } catch (err: any) {
      console.error(err);
      notify(err.response?.data?.message || "Failed to settle outstanding", "error");
    } finally {
      setIsSettling(null);
    }
  };

  // Filter State
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "PAID" | "OPEN" | "PENDING" | "SUCCESS"
  >("ALL");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "INVOICE" | "ADVANCE">(
    "ALL",
  );
  const [dateFilters, setDateFilters] = useState({
    startDate: "",
    endDate: "",
  });

  // Summary calculations
  const summary = useMemo(() => {
    const dataToSummarize =
      statusFilter === "ALL" &&
        typeFilter === "ALL" &&
        !dateFilters.startDate &&
        !dateFilters.endDate
        ? historyData
        : historyData.filter((record) => {
          // Status filter
          if (statusFilter !== "ALL" && record.status !== statusFilter) {
            return false;
          }
          // Type filter
          if (typeFilter !== "ALL" && record.type !== typeFilter) {
            return false;
          }
          // Date range filter
          if (dateFilters.startDate || dateFilters.endDate) {
            const recordDate = new Date(record.date);
            if (dateFilters.startDate) {
              const startDate = new Date(dateFilters.startDate);
              if (recordDate < startDate) return false;
            }
            if (dateFilters.endDate) {
              const endDate = new Date(dateFilters.endDate);
              endDate.setHours(23, 59, 59, 999);
              if (recordDate > endDate) return false;
            }
          }
          return true;
        });

    if (!dataToSummarize) return null;

    const invoices = dataToSummarize.filter((h) => h.type === "INVOICE");
    const advances = dataToSummarize.filter((h) => h.type === "ADVANCE");

    const invoice_gross = invoices.reduce(
      (sum, h) => sum + h.financials.total_gross,
      0,
    );
    const advance_gross = advances.reduce(
      (sum, h) => sum + h.financials.total_gross,
      0,
    );
    const invoice_paid = invoices.reduce(
      (sum, h) => sum + (h.financials.amount_paid !== undefined
        ? (typeof h.financials.amount_paid === 'string'
          ? parseFloat(h.financials.amount_paid)
          : h.financials.amount_paid)
        : 0),
      0,
    );
    const invoice_outstanding = invoices.reduce(
      (sum, h) => sum + h.financials.outstanding,
      0,
    );
    const advance_available = advances.reduce(
      (sum, h) => sum + h.financials.outstanding,
      0,
    );

    const paidCount = invoices.filter((i) => i.status === "PAID").length;
    const pendingCount = invoices.filter(
      (i) => i.status === "OPEN" || i.status === "PENDING",
    ).length;

    return {
      invoice_gross,
      advance_gross,
      invoice_paid,
      invoice_outstanding,
      advance_available,
      invoiceCount: invoices.length,
      advanceCount: advances.length,
      paidCount,
      pendingCount,
    };
  }, [historyData, statusFilter, typeFilter, dateFilters]);

  // Format currency NGN
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-NG", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Format time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-NG", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "PAID":
        return "bg-emerald-50 text-emerald-700 border border-emerald-200";
      case "OPEN":
        return "bg-amber-50 text-amber-700 border border-amber-200";
      case "SUCCESS":
        return "bg-brand-active text-brand-primary border border-brand-active";
      case "PENDING":
        return "bg-yellow-50 text-yellow-700 border border-yellow-200";
      default:
        return "bg-slate-50 text-slate-700 border border-slate-200";
    }
  };

  // Type badge color
  const getTypeColor = (type: string) => {
    return type === "INVOICE"
      ? "bg-brand-active text-brand-primary"
      : "bg-purple-100 text-purple-800";
  };

  // Handle MRN search with debounce
  const handleSearch = useCallback(async () => {
    if (!searchMrn.trim()) {
      notify("Please enter an MRN", "error");
      return;
    }

    setLoading(true);
    setError(null);
    setHistoryData([]);
    setPatient(null);
    setFinancialPosition(null);
    setPagination({ limit: 20, offset: 0, totalRecords: 0 });

    try {
      const response = await billingService.getBillingHistory(
        searchMrn.trim(),
        pagination.limit,
        pagination.offset,
      );

      if (response.status === "success" && response.data) {
        const data = response.data as BillingHistoryData;
        setPatient(data.summary.patient);
        setFinancialPosition(data.financial_position);
        setHistoryData(data.history);
        setPagination({
          limit: data.pagination.limit,
          offset: data.pagination.offset,
          totalRecords: data.summary.total_records,
        });
        notify(`Found ${data.history.length} billing records`, "success");
      } else {
        setError("No billing history found for this patient");
        notify("No billing history found", "info");
      }
    } catch (err: any) {
      console.error("Billing History Error:", err);
      const errorMsg = err.message || "Failed to fetch billing history";
      setError(errorMsg);
      notify(errorMsg, "error");
    } finally {
      setLoading(false);
    }
  }, [searchMrn, pagination.limit, pagination.offset, notify]);

  // Handle pagination change
  const handlePageChange = async (newOffset: number) => {
    if (!patient) return;

    setLoading(true);
    try {
      const response = await billingService.getBillingHistory(
        patient.mrn,
        pagination.limit,
        newOffset,
      );

      if (response.status === "success" && response.data) {
        const data = response.data as BillingHistoryData;
        setFinancialPosition(data.financial_position);
        setHistoryData(data.history);
        setPagination({
          limit: data.pagination.limit,
          offset: data.pagination.offset,
          totalRecords: data.summary.total_records,
        });
      }
    } catch (err: any) {
      notify("Failed to load page", "error");
    } finally {
      setLoading(false);
    }
  };

  // Handle limit change
  const handleLimitChange = (newLimit: number) => {
    setPagination({ ...pagination, limit: newLimit, offset: 0 });
  };

  // Toggle group expansion
  const toggleGroup = (group: string) => {
    const newGroups = new Set(expandedGroups);
    if (newGroups.has(group)) {
      newGroups.delete(group);
    } else {
      newGroups.add(group);
    }
    setExpandedGroups(newGroups);
  };

  // Toggle row expansion
  const toggleRowExpand = (id: number) => {
    const newRows = new Set(expandedRows);
    if (newRows.has(id)) {
      newRows.delete(id);
    } else {
      newRows.add(id);
    }
    setExpandedRows(newRows);
  };

  // Filter records based on status, type, and date range
  const filteredData = useMemo(() => {
    if (!historyData) return [];

    return historyData.filter((record) => {
      // Status filter
      if (statusFilter !== "ALL" && record.status !== statusFilter) {
        return false;
      }

      // Type filter
      if (typeFilter !== "ALL" && record.type !== typeFilter) {
        return false;
      }

      // Date range filter
      if (dateFilters.startDate || dateFilters.endDate) {
        const recordDate = new Date(record.date);
        if (dateFilters.startDate) {
          const startDate = new Date(dateFilters.startDate);
          if (recordDate < startDate) return false;
        }
        if (dateFilters.endDate) {
          const endDate = new Date(dateFilters.endDate);
          // Set end date to end of day
          endDate.setHours(23, 59, 59, 999);
          if (recordDate > endDate) return false;
        }
      }

      return true;
    });
  }, [historyData, statusFilter, typeFilter, dateFilters]);

  // Group records by type
  const groupedRecords = useMemo(() => {
    const grouped = {
      INVOICE: filteredData.filter((h) => h.type === "INVOICE"),
      ADVANCE: filteredData.filter((h) => h.type === "ADVANCE"),
    };
    return grouped;
  }, [filteredData]);

  // Calculate pagination info
  const startRecord = pagination.offset + 1;
  const endRecord = Math.min(
    pagination.offset + pagination.limit,
    pagination.totalRecords,
  );
  const totalPages = Math.ceil(pagination.totalRecords / pagination.limit);
  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;

  // Reopen Invoice Modal State
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [reopenInvoiceData, setReopenInvoiceData] = useState<{ id: number; reference: string } | null>(null);
  const [reopenReason, setReopenReason] = useState("");
  const [isReopening, setIsReopening] = useState(false);
  const [needsNewBed, setNeedsNewBed] = useState(false);
  const [selectedNewBedId, setSelectedNewBedId] = useState<number | "">("");
  const [availableBeds, setAvailableBeds] = useState<any[]>([]);


  const handleReopenInvoice = async () => {
    if (!reopenInvoiceData) return;
    if (!reopenReason.trim()) {
      notify("An audit reason is strictly required to reopen an invoice.", "error");
      return;
    }
    if (needsNewBed && !selectedNewBedId) {
      notify("Please select a new bed to readmit the patient into.", "error");
      return;
    }

    setIsReopening(true);
    try {
      // Define as 'any' to allow dynamic bed_id insertion
      const payload: any = {
        invoice_id: reopenInvoiceData.id,
        reason: reopenReason,
      };
      
      if (needsNewBed && selectedNewBedId) {
          payload.bed_id = Number(selectedNewBedId);
      }

      const res = await billingService.reopenInvoice(payload);
      
      if (res.status === "success" || res.success) {
        notify(res.message, "success");
        setShowReopenModal(false);
        setReopenReason("");
        setNeedsNewBed(false);
        setSelectedNewBedId("");
        handleSearch(); 
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || "Failed to reopen invoice";
      
      if (errorMsg.includes("BED_OCCUPIED_ERROR")) {
          setNeedsNewBed(true);
          notify("The previous bed is occupied. Please select a new bed below.", "warning");
      } else {
          notify(errorMsg, "error");
      }
    } finally {
      setIsReopening(false);
    }
  };
  
  // const handleReopenInvoice = async () => {
  //   if (!reopenInvoiceData) return;
  //   if (!reopenReason.trim()) {
  //     notify("An audit reason is strictly required to reopen an invoice.", "error");
  //     return;
  //   }
  //   if (needsNewBed && !selectedNewBedId) {
  //     notify("Please select a new bed to readmit the patient into.", "error");
  //     return;
  //   }

  //   setIsReopening(true);
  //   try {
  //     const payload: any = {
  //       invoice_id: reopenInvoiceData.id,
  //       reason: reopenReason,
  //     };
      
  //     // Attach the new bed if the user selected one
  //     if (needsNewBed && selectedNewBedId) {
  //         payload.bed_id = Number(selectedNewBedId);
  //     }

  //     const res = await billingService.reopenInvoice(payload);
      
  //     if (res.status === "success" || res.success) {
  //       notify(res.message, "success");
  //       setShowReopenModal(false);
  //       setReopenReason("");
  //       setNeedsNewBed(false);
  //       setSelectedNewBedId("");
  //       handleSearch(); 
  //     }
  //   } catch (err: any) {
  //     const errorMsg = err.response?.data?.message || "Failed to reopen invoice";
      
  //     // Catch our custom Backend Flag
  //     if (errorMsg.includes("BED_OCCUPIED_ERROR")) {
  //         setNeedsNewBed(true);
  //         notify("The previous bed is occupied. Please select a new bed below.", "warning");
  //         // TODO: Call your service to load available beds here:
  //         // fetchAvailableBeds().then(setAvailableBeds);
  //     } else {
  //         notify(errorMsg, "error");
  //     }
  //   } finally {
  //     setIsReopening(false);
  //   }
  // };


  // const handleReopenInvoice = async () => {
  //   if (!reopenInvoiceData) return;
  //   if (!reopenReason.trim()) {
  //     notify("An audit reason is strictly required to reopen an invoice.", "error");
  //     return;
  //   }

  //   setIsReopening(true);
  //   try {
  //     const payload = {
  //       invoice_id: reopenInvoiceData.id,
  //       reason: reopenReason,
  //     };
  //     const res = await billingService.reopenInvoice(payload);
      
  //     if (res.status === "success" || res.success) {
  //       notify(res.message || "Invoice reopened successfully. Funds moved to advance.", "success");
  //       setShowReopenModal(false);
  //       setReopenReason("");
  //       handleSearch(); // Refresh the ledger
  //     } else {
  //       notify(res.message || "Failed to reopen invoice", "error");
  //     }
  //   } catch (err: any) {
  //     console.error(err);
  //     notify(err.response?.data?.message || "Failed to reopen invoice", "error");
  //   } finally {
  //     setIsReopening(false);
  //   }
  // };



  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Search Header */}
      <div className="bg-gradient-to-r from-slate-700 to-slate-600 rounded-2xl p-6 shadow-lg">
        <div className="flex gap-3 mb-6">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-white mb-2">
              Patient MRN / ID
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchMrn}
                onChange={(e) => setSearchMrn(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Enter patient MRN (e.g., GSH-2026-000002)"
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-active0"
              />
              <button
                onClick={handleSearch}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 bg-brand-primary text-white rounded-lg hover:bg-brand-primary transition-colors disabled:bg-slate-400"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Search size={16} />
                )}
                {loading ? "Searching..." : "Search"}
              </button>
            </div>
          </div>
        </div>

        {/* Patient Info Banner */}
        {patient && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 pt-4 border-t border-slate-500">
            <div className="text-white">
              <p className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Patient Name
              </p>
              <p className="text-lg font-bold mt-1">
                {patient.first_name} {patient.last_name}
              </p>
            </div>
            <div className="text-white">
              <p className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                MRN
              </p>
              <p className="text-lg font-mono font-bold mt-1">{patient.mrn}</p>
            </div>
            <div className="text-white">
              <p className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Age
              </p>
              <p className="text-lg font-bold mt-1">
                {patient.age}
              </p>
            </div>
            <div className="text-white">
              <p className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Gender
              </p>
              <p className="text-lg font-bold mt-1">
                {patient.gender}
              </p>
            </div>
            <div className="text-white">
              <p className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Contact
              </p>
              <p className="text-sm font-semibold mt-1">{patient.phone}</p>
              <p className="text-xs text-slate-200">{patient.email}</p>
            </div>
          </div>
        )}
      </div>

      {/* Error State */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-900">{error}</p>
            <p className="text-xs text-red-700 mt-1">
              Please check the MRN and try again
            </p>
          </div>
        </div>
      )}

      {/* Main Content - Only Show if Patient is Selected and has data */}
      {patient && historyData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main History Table */}
          <div className="lg:col-span-3 space-y-4">
            {/* Filter Bar */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value as typeof statusFilter);
                      setPagination({ ...pagination, offset: 0 });
                    }}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-active0"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="PAID">Paid</option>
                    <option value="OPEN">Open</option>
                    <option value="PENDING">Pending</option>
                    <option value="SUCCESS">Success</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                    Type
                  </label>
                  <select
                    value={typeFilter}
                    onChange={(e) => {
                      setTypeFilter(e.target.value as typeof typeFilter);
                      setPagination({ ...pagination, offset: 0 });
                    }}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-active0"
                  >
                    <option value="ALL">All Types</option>
                    <option value="INVOICE">Invoices</option>
                    <option value="ADVANCE">Advances</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={dateFilters.startDate}
                    onChange={(e) => {
                      setDateFilters({
                        ...dateFilters,
                        startDate: e.target.value,
                      });
                      setPagination({ ...pagination, offset: 0 });
                    }}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-active0"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={dateFilters.endDate}
                    onChange={(e) => {
                      setDateFilters({
                        ...dateFilters,
                        endDate: e.target.value,
                      });
                      setPagination({ ...pagination, offset: 0 });
                    }}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-active0"
                  />
                </div>
                <button
                  onClick={() => {
                    setStatusFilter("ALL");
                    setTypeFilter("ALL");
                    setDateFilters({ startDate: "", endDate: "" });
                    setPagination({ ...pagination, offset: 0 });
                  }}
                  className="px-4 py-2.5 bg-slate-600 text-white text-sm font-semibold rounded-lg hover:bg-slate-700 transition-colors whitespace-nowrap"
                >
                  Clear Filters
                </button>
              </div>
            </div>

            {/* Filter Feedback */}
            {(statusFilter !== "ALL" ||
              typeFilter !== "ALL" ||
              dateFilters.startDate ||
              dateFilters.endDate) && (
                <div className="px-4 py-3 bg-brand-active border border-brand-active rounded-lg text-sm text-slate-700">
                  <span className="font-medium">
                    Showing{" "}
                    {groupedRecords.INVOICE.length +
                      groupedRecords.ADVANCE.length}{" "}
                    of {historyData.length} records
                  </span>
                </div>
              )}

            {/* Invoice Records */}
            {groupedRecords.INVOICE.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleGroup("INVOICE")}
                  className="w-full px-4 py-4 bg-gradient-to-r from-brand-active to-brand-active border-b border-slate-200 flex items-center justify-between hover:bg-brand-active transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {expandedGroups.has("INVOICE") ? (
                      <ChevronDown size={18} className="text-brand-primary" />
                    ) : (
                      <ChevronRight size={18} className="text-slate-600" />
                    )}
                    <FileText size={18} className="text-brand-primary" />
                    <span className="font-bold text-slate-900">
                      Invoices ({groupedRecords.INVOICE.length})
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-slate-600">
                    {formatCurrency(
                      groupedRecords.INVOICE.reduce(
                        (sum, r) => sum + r.financials.total_gross,
                        0,
                      ),
                    )}
                  </span>
                </button>

                {expandedGroups.has("INVOICE") && (
                  <div className="divide-y divide-slate-200">
                    {groupedRecords.INVOICE.map((record) => (
                      <div key={record.id}>
                        <button
                          onClick={() => toggleRowExpand(record.id)}
                          className="w-full px-4 py-3 hover:bg-slate-50 transition-colors flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {expandedRows.has(record.id) ? (
                              <ChevronDown
                                size={16}
                                className="text-slate-600 flex-shrink-0"
                              />
                            ) : (
                              <ChevronRight
                                size={16}
                                className="text-slate-600 flex-shrink-0"
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-slate-900 truncate">
                                {record.reference}
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {formatDate(record.date)} at{" "}
                                {formatTime(record.date)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                            <div className="text-right">
                              <p className="font-bold text-slate-900">
                                {formatCurrency(record.financials.net_payable)}
                              </p>
                              <span
                                className={`inline-block text-xs font-semibold px-2 py-1 rounded-full mt-1 ${getStatusColor(
                                  record.status,
                                )}`}
                              >
                                {record.status}
                              </span>
                            </div>
                          </div>
                        </button>

                        {/* Row Details */}
                        {expandedRows.has(record.id) && (
                          <div className="bg-slate-50 px-4 py-4 border-t border-slate-200">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                  Encounter
                                </p>
                                <p className="font-semibold text-slate-900 mt-1">
                                  {record.encounter.number || "N/A"}
                                </p>
                                <p className="text-xs text-slate-500">
                                  ({record.encounter.type || "N/A"})
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                  Doctor
                                </p>
                                <p className="font-semibold text-slate-900 mt-1">
                                  {record.doctor || "N/A"}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                  Payer
                                </p>
                                <p className="font-semibold text-slate-900 mt-1">
                                  {record.payer.name}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                  Gross Amount
                                </p>
                                <p className="font-semibold text-slate-900 mt-1">
                                  {formatCurrency(
                                    record.financials.total_gross,
                                  )}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                  Discount
                                </p>
                                <p className="font-semibold text-slate-900 mt-1">
                                  {formatCurrency(record.financials.discount)}
                                </p>
                              </div>

                              <div>
                                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                  Paid Amount
                                </p>
                                <p className="font-bold text-emerald-600 mt-1">
                                  {formatCurrency(
                                    record.financials.amount_paid !== undefined
                                      ? (typeof record.financials.amount_paid === 'string'
                                        ? parseFloat(record.financials.amount_paid)
                                        : record.financials.amount_paid)
                                      : 0,
                                  )}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                  Outstanding
                                </p>
                                <p className="font-bold text-red-600 mt-1">
                                  {formatCurrency(
                                    record.financials.outstanding,
                                  )}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2 mt-4">
                              <button
                                onClick={() => {
                                  setSelectedRecord(record);
                                  setShowDetailsModal(true);
                                }}
                                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-brand-primary hover:bg-brand-active rounded-lg transition-colors border border-brand-active"
                              >
                                <Eye size={14} />
                                View Details
                              </button>
                              <button
                                onClick={() =>
                                  window.open(
                                    `/print/invoice/${record.type}/${record.id}`,
                                    "_blank",
                                  )
                                }
                                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
                              >
                                <Printer size={14} />
                                Print Receipt
                              </button>
                              {record.status === "PAID" && (
                                <button
                                  onClick={() => {
                                    setDiscountInvoiceId(record.id);
                                    setShowDiscountModal(true);
                                  }}
                                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-indigo-100"
                                >
                                  <Tag size={14} />
                                  Request Discount
                                </button>
                              )}
                              {record.financials.outstanding > 0 && record.encounter?.number && (
                                <button
                                  onClick={() => handleClearOutstanding(record.encounter.number!)}
                                  // onClick={() => handleClearOutstanding(record.encounter.number)}
                                  disabled={isSettling === record.encounter.number}
                                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-emerald-100 disabled:opacity-50"
                                >
                                  {isSettling === record.encounter.number ? (
                                    <Loader2 size={14} className="animate-spin" />
                                  ) : (
                                    <CheckCircle2 size={14} />
                                  )}
                                  Settle with Advance
                                </button>
                              )}
                              {record.status !== "CANCELLED" && (
                                <button
                                  onClick={() => {
                                    setCancelInvoiceData({ id: record.id, reference: record.reference });
                                    setShowCancelModal(true);
                                  }}
                                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-rose-100"
                                >
                                  <Ban size={14} />
                                  Cancel Invoice
                                </button>
                              )}

                              {record.type === "INVOICE" && record.status !== "CANCELLED" && (
                                <button
                                  onClick={() => {
                                    setReopenInvoiceData({ id: record.id, reference: record.reference });
                                    setShowReopenModal(true);
                                  }}
                                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-amber-600 hover:bg-amber-50 rounded-lg transition-colors border border-amber-100"
                                >
                                  <Unlock size={14} />
                                  Reopen (Late Charge)
                                </button>
                              )}

                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Advance Records */}
            {groupedRecords.ADVANCE.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleGroup("ADVANCE")}
                  className="w-full px-4 py-4 bg-gradient-to-r from-purple-50 to-purple-25 border-b border-slate-200 flex items-center justify-between hover:bg-purple-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {expandedGroups.has("ADVANCE") ? (
                      <ChevronDown size={18} className="text-purple-600" />
                    ) : (
                      <ChevronRight size={18} className="text-slate-600" />
                    )}
                    <DollarSign size={18} className="text-purple-600" />
                    <span className="font-bold text-slate-900">
                      Advances ({groupedRecords.ADVANCE.length})
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-slate-600">
                    {formatCurrency(
                      groupedRecords.ADVANCE.reduce(
                        (sum, r) => sum + r.financials.total_gross,
                        0,
                      ),
                    )}
                  </span>
                </button>

                {expandedGroups.has("ADVANCE") && (
                  <div className="divide-y divide-slate-200">
                    {groupedRecords.ADVANCE.map((record) => (
                      <div key={record.id}>
                        <button
                          onClick={() => toggleRowExpand(record.id)}
                          className="w-full px-4 py-3 hover:bg-slate-50 transition-colors flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {expandedRows.has(record.id) ? (
                              <ChevronDown
                                size={16}
                                className="text-slate-600 flex-shrink-0"
                              />
                            ) : (
                              <ChevronRight
                                size={16}
                                className="text-slate-600 flex-shrink-0"
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-slate-900 truncate">
                                {record.reference}
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {formatDate(record.date)} at{" "}
                                {formatTime(record.date)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                            <div className="text-right">
                              <p className="font-bold text-slate-900">
                                {formatCurrency(record.financials.total_gross)}
                              </p>
                              <span
                                className={`inline-block text-xs font-semibold px-2 py-1 rounded-full mt-1 ${getStatusColor(
                                  record.status,
                                )}`}
                              >
                                {record.status}
                              </span>
                            </div>
                          </div>
                        </button>

                        {/* Row Details */}
                        {expandedRows.has(record.id) && (
                          <div className="bg-slate-50 px-4 py-4 border-t border-slate-200">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                  Payer
                                </p>
                                <p className="font-semibold text-slate-900 mt-1">
                                  {record.payer.name}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                  Amount
                                </p>
                                <p className="font-semibold text-slate-900 mt-1">
                                  {formatCurrency(
                                    record.financials.total_gross,
                                  )}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                  Paid Amount
                                </p>
                                <p className="font-bold text-emerald-600 mt-1">
                                  {formatCurrency(
                                    record.financials.amount_paid !== undefined
                                      ? (typeof record.financials.amount_paid === 'string'
                                        ? parseFloat(record.financials.amount_paid)
                                        : record.financials.amount_paid)
                                      : 0,
                                  )}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                  Outstanding
                                </p>
                                <p className="font-bold text-red-600 mt-1">
                                  {formatCurrency(
                                    record.financials.outstanding,
                                  )}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2 mt-4">
                              <button
                                onClick={() => {
                                  setSelectedRecord(record);
                                  setShowDetailsModal(true);
                                }}
                                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-brand-primary hover:bg-brand-active rounded-lg transition-colors border border-brand-active"
                              >
                                <Eye size={14} />
                                View Details
                              </button>
                              <button
                                onClick={() =>
                                  window.open(
                                    `/print/invoice/${record.type}/${record.id}`,
                                    "_blank",
                                  )
                                }
                                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
                              >
                                <Printer size={14} />
                                Print Receipt
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Pagination Controls */}
            {pagination.totalRecords > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between flex-wrap gap-4">
                <div className="text-sm text-slate-600">
                  Showing <span className="font-semibold">{startRecord}</span>{" "}
                  to <span className="font-semibold">{endRecord}</span> of{" "}
                  <span className="font-semibold">
                    {pagination.totalRecords}
                  </span>{" "}
                  records
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() =>
                      handlePageChange(
                        Math.max(0, pagination.offset - pagination.limit),
                      )
                    }
                    disabled={pagination.offset === 0}
                    className="px-3 py-2 text-sm font-semibold text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <div className="text-sm font-semibold text-slate-600">
                    Page <span className="text-brand-primary">{currentPage}</span> of{" "}
                    <span className="text-brand-primary">{totalPages}</span>
                  </div>
                  <button
                    onClick={() =>
                      handlePageChange(
                        Math.min(
                          pagination.offset + pagination.limit,
                          (totalPages - 1) * pagination.limit,
                        ),
                      )
                    }
                    disabled={currentPage >= totalPages}
                    className="px-3 py-2 text-sm font-semibold text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">
                    Records per page:
                  </span>
                  <select
                    value={pagination.limit}
                    onChange={(e) =>
                      handleLimitChange(parseInt(e.target.value))
                    }
                    className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-active0"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar - Summary Stats */}
          <div className="space-y-4">
            {financialPosition && (
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <DollarSign size={18} className="text-purple-600" />
                  Financial Position
                </h3>
                <div className="space-y-3">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Invoice Gross
                    </p>
                    <p className="text-xl font-bold text-slate-900 mt-1">
                      {formatCurrency(financialPosition.invoice_gross)}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Invoice Discount
                    </p>
                    <p className="text-lg font-bold text-slate-800 mt-1">
                      {formatCurrency(financialPosition.invoice_discount)}
                    </p>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                    <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
                      Invoice Paid
                    </p>
                    <p className="text-xl font-bold text-emerald-700 mt-1">
                      {formatCurrency(financialPosition.invoice_paid)}
                    </p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                    <p className="text-xs font-semibold text-red-600 uppercase tracking-wider">
                      Invoice Outstanding
                    </p>
                    <p className="text-xl font-bold text-red-700 mt-1">
                      {formatCurrency(financialPosition.invoice_outstanding)}
                    </p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                    <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider">
                      Available Advance
                    </p>
                    <p className="text-xl font-bold text-purple-700 mt-1">
                      {formatCurrency(financialPosition.advance_available)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {summary && (
              <>
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                  <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <DollarSign size={18} className="text-brand-primary" />
                    Filtered Summary
                  </h3>
                  <div className="space-y-3">
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Invoice Gross
                      </p>
                      <p className="text-xl font-bold text-slate-900 mt-1">
                        {formatCurrency(summary.invoice_gross)}
                      </p>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                      <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
                        Invoice Paid
                      </p>
                      <p className="text-xl font-bold text-emerald-700 mt-1">
                        {formatCurrency(summary.invoice_paid)}
                      </p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                      <p className="text-xs font-semibold text-red-600 uppercase tracking-wider">
                        Invoice Outstanding
                      </p>
                      <p className="text-xl font-bold text-red-700 mt-1">
                        {formatCurrency(summary.invoice_outstanding)}
                      </p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                      <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider">
                        Available Advance
                      </p>
                      <p className="text-xl font-bold text-purple-700 mt-1">
                        {formatCurrency(summary.advance_available)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Statistics Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-4">Records</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-slate-200">
                    <span className="text-sm text-slate-600">
                      Total Records
                    </span>
                    <span className="font-bold text-slate-900">
                      {summary.invoiceCount + summary.advanceCount}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-200">
                    <span className="text-sm text-slate-600">Invoices</span>
                    <span className="font-bold text-brand-primary">
                      {summary.invoiceCount}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-200">
                    <span className="text-sm text-slate-600">Advances</span>
                    <span className="font-bold text-purple-600">
                      {summary.advanceCount}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-200">
                    <span className="text-sm text-emerald-600 font-semibold">
                      Paid
                    </span>
                    <span className="font-bold text-emerald-600">
                      {summary.paidCount}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-amber-600 font-semibold">
                      Pending
                    </span>
                    <span className="font-bold text-amber-600">
                      {summary.pendingCount}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        </div>
      )}

      {/* Empty State */}
      {patient && historyData.length === 0 && !loading && (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-12 text-center">
          <AlertCircle size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-lg font-semibold text-slate-700 mb-2">
            No Billing History Found
          </p>
          <p className="text-sm text-slate-600">
            This patient has no billing records in the system.
          </p>
        </div>
      )}

      {/* Initial State */}
      {!patient && !error && !loading && (
        <div className="bg-brand-active rounded-xl border border-brand-active p-12 text-center">
          <Search size={48} className="mx-auto text-brand-primary mb-4" />
          <p className="text-lg font-semibold text-brand-primary mb-2">
            Search for Patient Billing History
          </p>
          <p className="text-sm text-brand-primary">
            Enter a patient MRN to view their complete billing history including
            invoices and advance payments.
          </p>
        </div>
      )}

      {/* Invoice Details Modal */}
      {selectedRecord && (
        <InvoiceDetailsModal
          isOpen={showDetailsModal}
          recordId={selectedRecord.id}
          recordType={selectedRecord.type}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedRecord(null);
          }}
          onPrint={(type, id) =>
            window.open(`/print/invoice/${type}/${id}`, "_blank")
          }
        />
      )}

      {/* Discount Request Modal */}
      {showDiscountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                <Tag className="text-indigo-600" size={20} />
                Request Discount
              </h3>
              <button
                onClick={() => setShowDiscountModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Discount Type
                </label>
                <div className="relative">
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as any)}
                    className="w-full pl-3 pr-8 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-sm font-medium text-slate-800 appearance-none bg-white"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FLAT">Flat Amount</option>
                    <option value="WAIVER">Full Waiver</option>
                  </select>
                  <ChevronDown
                    size={16}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                </div>
              </div>

              {discountType !== "WAIVER" && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Value
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(Number(e.target.value))}
                      className="w-full pl-3 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-sm font-medium text-slate-800"
                      placeholder={discountType === "PERCENTAGE" ? "e.g. 10" : "e.g. 5000"}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                      {discountType === "PERCENTAGE" ? "%" : "₦"}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason / Justification
                </label>
                <textarea
                  value={discountReason}
                  onChange={(e) => setDiscountReason(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-sm resize-none"
                  rows={3}
                  placeholder="Provide a reason for this request..."
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50">
              <button
                onClick={() => setShowDiscountModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestDiscount}
                disabled={isRequestingDiscount}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isRequestingDiscount && <Loader2 size={14} className="animate-spin" />}
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Invoice Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-rose-50">
              <h3 className="text-lg font-black text-rose-900 tracking-tight flex items-center gap-2">
                <Ban className="text-rose-600" size={20} />
                Cancel Invoice
              </h3>
              <button
                onClick={() => setShowCancelModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason for Cancellation
                </label>
                <input
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-500 text-sm font-medium text-slate-800"
                  placeholder="e.g. Duplicate invoice"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Additional Notes
                </label>
                <textarea
                  value={cancelNotes}
                  onChange={(e) => setCancelNotes(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-500 text-sm resize-none"
                  rows={2}
                  placeholder="Testing invoice cancellation workflow..."
                />
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${cancelReverse ? 'bg-rose-600 border-rose-600' : 'border-slate-300 group-hover:border-rose-400'}`}>
                    {cancelReverse && <CheckCircle2 size={14} className="text-white" />}
                  </div>
                  <input type="checkbox" className="hidden" checked={cancelReverse} onChange={(e) => setCancelReverse(e.target.checked)} />
                  <span className="text-sm font-bold text-slate-700">Reverse Payments</span>
                </label>
                
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${cancelRefund ? 'bg-rose-600 border-rose-600' : 'border-slate-300 group-hover:border-rose-400'}`}>
                    {cancelRefund && <CheckCircle2 size={14} className="text-white" />}
                  </div>
                  <input type="checkbox" className="hidden" checked={cancelRefund} onChange={(e) => setCancelRefund(e.target.checked)} />
                  <span className="text-sm font-bold text-slate-700">Generate Refund Request</span>
                </label>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleCancelInvoice}
                disabled={isCancelling}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-700 shadow-sm shadow-rose-200 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isCancelling && <Loader2 size={14} className="animate-spin" />}
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reopen Invoice Modal */}
      {showReopenModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-amber-50">
              <h3 className="text-lg font-black text-amber-900 tracking-tight flex items-center gap-2">
                <Unlock className="text-amber-600" size={20} />
                Reopen Invoice
              </h3>
              <button
                onClick={() => setShowReopenModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-amber-50 text-amber-800 p-3 rounded-xl text-xs font-medium border border-amber-200">
                This action will cancel the current invoice and refund all settled payments into the patient's advance wallet. It will rollback the discharge workflow to allow late charges to be posted.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Audit Reason (Required) <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500 text-sm resize-none"
                  rows={3}
                  placeholder="e.g. Readmitting to post unbilled CBC lab results..."
                />
              </div>

              {/* Dynamic Bed Selection UI - Only visible if old bed is taken */}
              {needsNewBed && (
                <div className="mt-4 p-4 border border-rose-200 bg-rose-50 rounded-xl">
                    <label className="block text-xs font-bold text-rose-800 mb-1">
                      New Bed Assignment Required <span className="text-red-500">*</span>
                    </label>
                    <p className="text-xs text-rose-600 mb-3">
                        The patient's previous bed is currently occupied by another patient. Please assign them to an available bed to complete the readmission.
                    </p>
                    <select
                      value={selectedNewBedId}
                      onChange={(e) => setSelectedNewBedId(e.target.value ? Number(e.target.value) : "")}
                      className="w-full px-3 py-2 border border-rose-200 rounded-lg focus:outline-none focus:border-rose-500 text-sm font-medium text-slate-800 bg-white"
                    >
                      <option value="">-- Select Available Bed --</option>
                      {/* Map your available beds here, e.g.: */}
                      {/* {availableBeds.map(bed => <option key={bed.id} value={bed.id}>{bed.bed_number} ({bed.ward_name})</option>)} */}
                      
                      {/* Temporary Mock Data for testing */}
                      <option value="1">Bed A1 (General Ward)</option>
                      <option value="2">Bed A2 (General Ward)</option>
                    </select>
                </div>
              )}

            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50">
              <button
                onClick={() => setShowReopenModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReopenInvoice}
                disabled={isReopening || !reopenReason.trim()}
                className="px-4 py-2 text-xs font-bold text-white bg-amber-600 rounded-xl hover:bg-amber-700 shadow-sm shadow-amber-200 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isReopening && <Loader2 size={14} className="animate-spin" />}
                Confirm Reopen
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default BillingHistory;
