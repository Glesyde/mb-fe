import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search, CheckCircle2, Microscope, X, AlertCircle, Loader2, Eye,
  Edit3, Printer, Undo, FileText, RefreshCw, SlidersHorizontal,
  ChevronLeft, ChevronRight, ShieldCheck, Send, Stethoscope, RotateCcw
} from "lucide-react";
import { labService } from "../services/lab.service";
import { useNotification } from "../context/NotificationContext";
import { createPortal } from "react-dom";
import { getFlagBadgeClass, getFlagLabel } from "../utils/flagColors";

interface ResultParameter {
  id: number;
  parameter_id: number;
  parameter_name: string;
  result_value: string;
  unit: string;
  ref_low: string;
  ref_high: string;
  flagged?: string;
  interpretation?: string;
  workflow_status: string;
  verified_at?: string | null;
  released_at?: string | null;
  verification_comment?: string | null;
}

// Robust extractor for nested paginated responses from PHP/Axios
const extractPaginatedData = (res: any) => {
  if (res?.data?.status === 'success' && res?.data?.data) {
      return {
          data: Array.isArray(res.data.data.data) ? res.data.data.data : [],
          total: Number(res.data.data.total) || 0
      };
  }
  if (res?.status === 'success' && res?.data) {
      return {
          data: Array.isArray(res.data.data) ? res.data.data : [],
          total: Number(res.data.total) || 0
      };
  }
  if (res?.total !== undefined && Array.isArray(res?.data)) {
      return {
          data: res.data,
          total: Number(res.total) || 0
      };
  }
  const fallbackArray = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
  return { data: fallbackArray, total: fallbackArray.length };
};

const LabVerification: React.FC = () => {
  const { notify } = useNotification();
  const [samples, setSamples] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Debounce
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [activeMenu, setActiveMenu] = useState<string | number | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [dateFilter, setDateFilter] = useState<string>("ALL");
  const [dateTypeFilter, setDateTypeFilter] = useState<"collected_at" | "ordered_at">("collected_at");
  const [serviceFilter, setServiceFilter] = useState<string>("ALL");
  const [activeTab, setActiveTab] = useState<"pending" | "verified" | "completed" | "released" | "all">("pending");

  // Server-Side Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // Tab Counts State
  const [tabCounts, setTabCounts] = useState({
    pending: 0,
    verified: 0,
    completed: 0,
    released: 0,
    all: 0
  });

  // Modals
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);
  const [isAmendModalOpen, setIsAmendModalOpen] = useState(false);

  const [selectedSample, setSelectedSample] = useState<any | null>(null);
  const [detailedResult, setDetailedResult] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);

  // Input states for pathologist actions
  const [verificationComment, setVerificationComment] = useState("");
  const [reopenReason, setReopenReason] = useState("");
  const [amendmentReason, setAmendmentReason] = useState("");
  const [amendedValues, setAmendedValues] = useState<Record<number, string>>({});

  // ... existing modal states ...
  const [isReverseModalOpen, setIsReverseModalOpen] = useState(false);
  const [reverseReason, setReverseReason] = useState("");

  const handleOpenReverseModal = (sample: any) => {
    setSelectedSample(sample);
    setReverseReason("");
    setIsReverseModalOpen(true);
  };

  const handleReverse = async () => {
    if (!selectedSample) return;
    if (!reverseReason.trim()) {
      notify("Please provide a reason for reversing to pending", "warning");
      return;
    }
    setIsActionSubmitting(true);
    try {
      await labService.reverseResult({
        reference_no: selectedSample.reference_no,
        reason: reverseReason,
      });
      notify("Laboratory results successfully reversed to Pending", "success");
      setIsReverseModalOpen(false);
      syncAfterAction();
    } catch (err: any) {
      // notify(err.response?.data?.message || "Failed to reverse results", "error");
            notify(err.response?.data?.message || "Reverse results", "error");
    } finally {
      setIsActionSubmitting(false);
    }
  };

  // Debounce search term to prevent API spam
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Reset page to 1 when any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, activeTab, statusFilter, priorityFilter, dateFilter, dateTypeFilter, serviceFilter, itemsPerPage]);

  // Fetch Accurate Counts for the tabs dynamically
  const refreshTabCounts = useCallback(async () => {
    try {
      const baseParams = {
        search: debouncedSearch,
        service: serviceFilter,
        date: dateFilter,
        dateType: dateTypeFilter,
      };

      const statuses = ["TECH_REVIEW", "VERIFIED", "COMPLETED", "RELEASED", "ALL", "PENDING"];
      const requests = statuses.map(st => labService.getSamples({ ...baseParams, status: st, limit: 1 }));
      const responses = await Promise.all(requests);
      
      const counts = responses.map(res => extractPaginatedData(res).total);
      
      setTabCounts({
        pending: counts[0] + counts[5], // Combines TECH_REVIEW and PENDING
        verified: counts[1],
        completed: counts[2],
        released: counts[3],
        all: counts[4]
      });
    } catch (e) {
      console.error("Failed to fetch tab counts", e);
    }
  }, [debouncedSearch, serviceFilter, dateFilter, dateTypeFilter]);

  // Refresh counts when global filters change
  useEffect(() => {
    refreshTabCounts();
  }, [refreshTabCounts]);

  const fetchSamples = async () => {
    setLoading(true);
    try {
      // Map frontend tab to backend status
      let backendStatus = "ALL";
      if (activeTab === "pending") backendStatus = "TECH_REVIEW"; // Might need specific handling if backend doesn't support array
      else if (activeTab === "verified") backendStatus = "VERIFIED";
      else if (activeTab === "completed") backendStatus = "COMPLETED";
      else if (activeTab === "released") backendStatus = "RELEASED";
      else backendStatus = statusFilter;

      const params = {
        page: currentPage,
        limit: itemsPerPage,
        search: debouncedSearch,
        status: backendStatus,
        service: serviceFilter,
        date: dateFilter,
        dateType: dateTypeFilter,
      };

      // Since pending technically includes TECH_REVIEW + PENDING
      // If we are strictly on the pending tab, grab both manually if needed, 
      // but assuming your backend groups them natively under your workflow logic.
      const response = await labService.getSamples(params);
      const { data, total } = extractPaginatedData(response);

      setSamples(data);
      setTotalItems(total);
    } catch (err: any) {
      notify(err.response?.data?.message || "Failed to load laboratory samples", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSamples();
  }, [currentPage, itemsPerPage, debouncedSearch, activeTab, statusFilter, priorityFilter, dateFilter, dateTypeFilter, serviceFilter]);

  useEffect(() => {
    const handleClickOutside = () => setActiveMenu(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const fetchSampleDetail = async (sample: any) => {
    setDetailLoading(true);
    try {
      const details = await labService.getResultByRef(sample.reference_no);
      setDetailedResult(details);
      if (details?.results) {
        const initialAmended: Record<number, string> = {};
        details.results.forEach((r: any) => {
          initialAmended[r.parameter_id] = r.result_value;
        });
        setAmendedValues(initialAmended);
      }
    } catch (err: any) {
      notify(err.response?.data?.message || "Failed to load result details", "error");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOpenDetailModal = (sample: any) => {
    setSelectedSample(sample);
    setDetailedResult(null);
    setIsDetailModalOpen(true);
    fetchSampleDetail(sample);
  };

  const handleOpenVerifyModal = (sample: any) => {
    setSelectedSample(sample);
    setDetailedResult(null);
    setVerificationComment("");
    setIsVerifyModalOpen(true);
    fetchSampleDetail(sample);
  };

  const handleOpenReopenModal = (sample: any) => {
    setSelectedSample(sample);
    setReopenReason("");
    setIsReopenModalOpen(true);
  };

  const handleOpenAmendModal = (sample: any) => {
    setSelectedSample(sample);
    setDetailedResult(null);
    setAmendmentReason("");
    setIsAmendModalOpen(true);
    fetchSampleDetail(sample);
  };

  const syncAfterAction = () => {
    fetchSamples();
    refreshTabCounts();
  };

  // Actions
  const handleVerify = async () => {
    if (!selectedSample) return;
    setIsActionSubmitting(true);
    try {
      await labService.verifyResult({
        reference_no: selectedSample.reference_no,
        comment: verificationComment || "Verified by Pathologist",
      });
      notify("Laboratory results successfully verified", "success");
      setIsVerifyModalOpen(false);
      syncAfterAction();
    } catch (err: any) {
      notify(err.response?.data?.message || "Failed to verify results", "error");
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const handleComplete = async (sampleOverride?: any) => {
    const sample = sampleOverride || selectedSample;
    if (!sample) return;
    setIsActionSubmitting(true);
    try {
      await labService.completeResult(sample.reference_no);
      notify("Laboratory results successfully completed", "success");
      setIsVerifyModalOpen(false);
      syncAfterAction();
    } catch (err: any) {
      notify(err.response?.data?.message || "Failed to complete results", "error");
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const handleReopen = async () => {
    if (!selectedSample) return;
    if (!reopenReason.trim()) {
      notify("Please provide a reason for reopening the results", "warning");
      return;
    }
    setIsActionSubmitting(true);
    try {
      await labService.reopenResult({
        reference_no: selectedSample.reference_no,
        reason: reopenReason,
      });
      notify("Laboratory results status successfully set to Reopened", "success");
      setIsReopenModalOpen(false);
      syncAfterAction();
    } catch (err: any) {
      notify(err.response?.data?.message || "Failed to reopen results", "error");
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const handleRelease = async (sample: any) => {
    if (!window.confirm(`Are you sure you want to release the verified report for ${sample.patient_name}?`)) {
      return;
    }
    setLoading(true);
    try {
      await labService.releaseResult({
        reference_no: sample.reference_no,
      });
      notify("Laboratory report released and published to EMR successfully", "success");
      syncAfterAction();
    } catch (err: any) {
      notify(err.response?.data?.message || "Failed to release results", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAmend = async () => {
    if (!selectedSample || !detailedResult) return;
    if (!amendmentReason.trim()) {
      notify("Please provide a reason for result amendment", "warning");
      return;
    }

    const modifiedParams = Object.keys(amendedValues).map((paramIdStr) => {
      const paramId = Number(paramIdStr);
      return {
        parameter_id: paramId,
        result_value: amendedValues[paramId],
      };
    });

    setIsActionSubmitting(true);
    try {
      await labService.amendResult({
        reference_no: selectedSample.reference_no,
        reason: amendmentReason,
        results: modifiedParams,
      });
      notify("Laboratory results amended and updated successfully", "success");
      setIsAmendModalOpen(false);
      syncAfterAction();
    } catch (err: any) {
      notify(err.response?.data?.message || "Failed to amend results", "error");
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const handlePrintPreview = (sample: any) => {
    const url = `/print/lab/${sample.reference_no}`;
    window.open(url, "_blank");
  };

  const uniqueServices = useMemo(() => {
    const services = samples.map((s) => s.service_name || s.sample_name).filter(Boolean);
    return Array.from(new Set(services));
  }, [samples]);

  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header and Sync Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            Result Auditing & Verification
          </h2>
          <p className="text-slate-500 font-medium mt-1">
            Pathologist Portal: Review diagnostic profiles, approve clinical values, amend discrepancies, and dispatch final reports.
          </p>
        </div>
        <button
          onClick={syncAfterAction}
          className="flex items-center gap-2 px-5 py-3 text-slate-700 bg-white border border-slate-200 rounded-2xl text-sm font-bold shadow-sm hover:shadow-md hover:bg-slate-50 transition-all self-end md:self-auto"
        >
          <RefreshCw size={16} /> Refresh Workspace
        </button>
      </div>

      {/* Main Panel */}
      <div className="bg-white border border-slate-200 rounded-[36px] shadow-sm overflow-hidden">
        {/* Toolbar & Filter Bar */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Tab Selection */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-200/50 rounded-2xl w-fit overflow-x-auto">
              <button
                onClick={() => setActiveTab("pending")}
                className={`px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === "pending"
                  ? "bg-white text-purple-600 shadow-sm border border-slate-200/50"
                  : "text-slate-500 hover:text-slate-800"
                  }`}
              >
                Needs Verification ({tabCounts.pending})
              </button>
              <button
                onClick={() => setActiveTab("verified")}
                className={`px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === "verified"
                  ? "bg-white text-blue-600 shadow-sm border border-slate-200/50"
                  : "text-slate-500 hover:text-slate-800"
                  }`}
              >
                Verified ({tabCounts.verified})
              </button>
              <button
                onClick={() => setActiveTab("completed")}
                className={`px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === "completed"
                  ? "bg-white text-teal-600 shadow-sm border border-slate-200/50"
                  : "text-slate-500 hover:text-slate-800"
                  }`}
              >
                Completed ({tabCounts.completed})
              </button>
              <button
                onClick={() => setActiveTab("released")}
                className={`px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === "released"
                  ? "bg-white text-emerald-600 shadow-sm border border-slate-200/50"
                  : "text-slate-500 hover:text-slate-800"
                  }`}
              >
                Released ({tabCounts.released})
              </button>
              <button
                onClick={() => setActiveTab("all")}
                className={`px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === "all"
                  ? "bg-white text-slate-700 shadow-sm border border-slate-200/50"
                  : "text-slate-500 hover:text-slate-800"
                  }`}
              >
                All Records ({tabCounts.all})
              </button>
            </div>

            {/* Search Inputs */}
            <div className="relative max-w-md w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search by Patient, MRN, Ref No, Panel..."
                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2">
            {/* Status Filter */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Workflow Status</label>
              <select
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all disabled:opacity-50 disabled:bg-slate-100"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                disabled={activeTab !== "all"}
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending Entry</option>
                <option value="TECH_REVIEW">Tech Review</option>
                <option value="VERIFIED">Verified</option>
                <option value="RELEASED">Released/Dispatched</option>
                <option value="REOPENED">Reopened</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Urgency</label>
              <select
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <option value="ALL">All Priorities</option>
                <option value="Stat">Stat (Urgent)</option>
                <option value="Routine">Routine</option>
              </select>
            </div>

            {/* Date Type Filter */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Date Type</label>
              <select
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all"
                value={dateTypeFilter}
                onChange={(e) => setDateTypeFilter(e.target.value as "collected_at" | "ordered_at")}
              >
                <option value="collected_at">Collected At</option>
                <option value="ordered_at">Ordered At</option>
              </select>
            </div>

            {/* Date Filter */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Order Date</label>
              <select
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              >
                <option value="ALL">All Dates</option>
                <option value="TODAY">Today</option>
                <option value="YESTERDAY">Yesterday</option>
                <option value="WEEK">Last 7 Days</option>
              </select>
            </div>

            {/* Service/Panel Filter */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Service / Panel</label>
              <select
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all"
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
              >
                <option value="ALL">All Panels</option>
                {uniqueServices.map((srv: any, idx) => (
                  <option key={idx} value={srv}>{srv}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto pb-32">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="p-5 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Order / Ref No</th>
                <th className="p-5 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Patient Context</th>
                <th className="p-5 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Service / Panel</th>
                <th className="p-5 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Dates</th>
                <th className="p-5 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Workflow Status</th>
                <th className="p-5 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-16 text-center">
                    <Loader2 className="animate-spin mx-auto text-purple-600 mb-2" size={28} />
                    <p className="text-sm text-slate-500 font-bold">Synchronizing ledger audit records...</p>
                  </td>
                </tr>
              ) : samples.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-20 text-center">
                    <Microscope size={64} className="mx-auto text-slate-200 mb-4" />
                    <p className="text-xl font-black text-slate-700">No matching audit files</p>
                    <p className="text-sm text-slate-400 mt-1">Adjust filters or check back later</p>
                  </td>
                </tr>
              ) : (
                samples.map((sample) => (
                  <tr key={sample.reference_no || sample.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="p-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-800 tracking-tight">{sample.reference_no || "-"}</span>
                        <span className="text-[10px] font-mono font-bold text-slate-400 mt-0.5">ID: {sample.id || sample.order_id}</span>
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-800">{sample.patient_name}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">MRN: {sample.mrn}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-700">{sample.service_name || sample.sample_name}</span>
                        {sample.doctor_name && (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-purple-600/80 bg-purple-50/50 w-fit px-1.5 py-0.5 rounded mt-1.5">
                            <Stethoscope size={10} />
                            {sample.doctor_name.replace(/^Dr\.?\s*/i, 'Dr. ')}
                          </div>
                        )}
                        {sample.summary && (
                          <span className="text-[10px] text-slate-400 font-semibold mt-0.5">
                            Total: {sample.summary.total_parameters} | Critical: {sample.summary.critical_results}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="flex flex-col gap-1">
                        {sample.ordered_at && (
                          <div className="text-xs text-slate-600 font-medium">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Ordered</span>
                            {new Date(sample.ordered_at).toLocaleString()}
                          </div>
                        )}
                        {sample.collected_at && (
                          <div className="text-xs text-slate-600 font-medium mt-1">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Collected</span>
                            {new Date(sample.collected_at).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-5">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${sample.workflow_status === "RELEASED"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : sample.workflow_status === "VERIFIED"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : sample.workflow_status === "TECH_REVIEW"
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : sample.workflow_status === "REOPENED"
                                ? "bg-red-50 text-red-700 border-red-200"
                                : sample.workflow_status === "COMPLETED"
                                  ? "bg-teal-50 text-teal-700 border-teal-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}>
                        {sample.workflow_status === "TECH_REVIEW" ? "Tech Review" : sample.workflow_status === "RELEASED" ? "Dispatched" : (sample.workflow_status || "PENDING")}
                      </span>
                    </td>
                    <td className="p-5 text-right relative">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => handleOpenDetailModal(sample)} className="p-2 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all" title="View Parameters">
                          <Eye size={18} />
                        </button>
                        <button onClick={() => handlePrintPreview(sample)} className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all" title="Print Report">
                          <Printer size={18} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenu(activeMenu === (sample.id || sample.order_id) ? null : (sample.id || sample.order_id));
                          }}
                          className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
                        >
                          <SlidersHorizontal size={18} />
                        </button>
                      </div>

                      {/* Dropdown Menu */}
                      {activeMenu === (sample.id || sample.order_id) && (
                        <div className="absolute right-6 top-14 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 py-2.5 z-30 animate-in fade-in slide-in-from-top-2">
                          {(sample.workflow_status === "TECH_REVIEW" || sample.workflow_status === "PENDING" || !sample.workflow_status) && (
                            <button onClick={() => handleOpenVerifyModal(sample)} className="w-full text-left px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-purple-600 flex items-center gap-2">
                              <ShieldCheck size={16} /> Audit & Verify
                            </button>
                          )}
                          {sample.workflow_status === "VERIFIED" && (
                            <button onClick={() => handleComplete(sample)} className="w-full text-left px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-teal-600 flex items-center gap-2">
                              <CheckCircle2 size={16} /> Complete Result
                            </button>
                          )}
                          {sample.workflow_status === "COMPLETED" && (
                            <button onClick={() => handleRelease(sample)} className="w-full text-left px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-emerald-600 flex items-center gap-2">
                              <Send size={16} /> Release to Patient
                            </button>
                          )}
                          {sample.workflow_status && sample.workflow_status !== "RELEASED" && sample.workflow_status !== "PENDING" && (
                            <button onClick={() => handleOpenReopenModal(sample)} className="w-full text-left px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-amber-600 flex items-center gap-2">
                              <Undo size={16} /> Reopen / Correct
                            </button>
                          )}
                          {sample.workflow_status && sample.workflow_status !== "PENDING" && (
                            <button onClick={() => handleOpenAmendModal(sample)} className="w-full text-left px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2">
                              <Edit3 size={16} /> Amend Values
                            </button>
                          )}

                          {sample.workflow_status && sample.workflow_status !== "PENDING" && (
                            <button onClick={() => handleOpenReverseModal(sample)} className="w-full text-left px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-rose-600 flex items-center gap-2">
                              <RotateCcw size={16} /> Reverse to Pending
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Server-Side Pagination Footer */}
        {!loading && samples.length > 0 && (
          <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, totalItems)} of{" "}
              {totalItems} audits
            </span>
            <div className="flex items-center gap-4">
              <select 
                  value={itemsPerPage} 
                  onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-xl outline-none bg-white text-slate-600 shadow-sm"
              >
                  <option value={10}>10 / page</option>
                  <option value={20}>20 / page</option>
                  <option value={50}>50 / page</option>
                  <option value={100}>100 / page</option>
              </select>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs font-bold text-slate-700 px-3">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PORTALS & MODALS */}
      {/* 1. Detail View Modal */}
      {isDetailModalOpen && selectedSample && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsDetailModalOpen(false)} />
          <div className="relative w-full max-w-3xl bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                  <FileText size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">Sample Results Auditing</h3>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{selectedSample.patient_name} • {selectedSample.reference_no}</p>
                </div>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all"><X size={20} /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {detailLoading ? (
                <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-purple-600 mb-2" size={24} /><p className="text-xs text-slate-400 font-bold">Synchronizing parameters...</p></div>
              ) : detailedResult?.results ? (
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Parameter</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Result</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Unit</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Reference Range</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Interpretation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detailedResult.results.map((res: ResultParameter) => (
                        <tr key={res.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 text-sm font-bold text-slate-800">{res.parameter_name}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-slate-700">{res.result_value}</td>
                          <td className="px-4 py-3 text-sm text-slate-500">{res.unit || "-"}</td>
                          <td className="px-4 py-3 text-sm text-slate-500">{res.ref_low} - {res.ref_high}</td>
                          <td className="px-4 py-3"><span className={`flag-badge ${getFlagBadgeClass(res.interpretation || res.flag_type)}`}>{getFlagLabel(res.interpretation || res.flag_type)}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (<p className="text-center text-sm font-bold text-slate-400">Failed to render parameter schema.</p>)}
            </div>
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button onClick={() => setIsDetailModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">Close Audit</button>
            </div>
          </div>
        </div>, document.body
      )}

      {/* 2. Pathologist Verification Modal */}
      {isVerifyModalOpen && selectedSample && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsVerifyModalOpen(false)} />
          <div className="relative w-full max-w-3xl bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-600 text-white flex items-center justify-center"><ShieldCheck size={22} /></div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">Verify Laboratory Results</h3>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{selectedSample.patient_name} • {selectedSample.reference_no}</p>
                </div>
              </div>
              <button onClick={() => setIsVerifyModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all"><X size={20} /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {detailLoading ? (
                <div className="py-10 text-center"><Loader2 className="animate-spin mx-auto text-purple-600 mb-2" size={24} /><p className="text-xs text-slate-400 font-bold">Synchronizing parameters...</p></div>
              ) : detailedResult?.results ? (
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2.5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Parameter</th>
                        <th className="px-4 py-2.5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Result</th>
                        <th className="px-4 py-2.5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Interpretation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detailedResult.results.map((res: ResultParameter) => (
                        <tr key={res.id}>
                          <td className="px-4 py-2 text-xs font-bold text-slate-800">{res.parameter_name}</td>
                          <td className="px-4 py-2 text-xs font-semibold text-slate-700">{res.result_value} {res.unit}</td>
                          <td className="px-4 py-2"><span className={`flag-badge ${getFlagBadgeClass(res.interpretation || res.flag_type)}`}>{getFlagLabel(res.interpretation || res.flag_type)}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Pathologist Verification Comment</label>
                <textarea rows={3} placeholder="Enter audit/verification notes here..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10 transition-all" value={verificationComment} onChange={(e) => setVerificationComment(e.target.value)} />
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100 font-bold flex items-center gap-1.5"><AlertCircle size={14} /> Confirms clinical approval</span>
              <div className="flex items-center gap-3">
                <button onClick={() => setIsVerifyModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
                <button onClick={() => handleComplete()} disabled={isActionSubmitting} className="px-5 py-2.5 text-sm font-bold text-white bg-teal-600 rounded-xl hover:bg-teal-700 shadow-lg shadow-teal-100 transition-all flex items-center gap-1.5 disabled:opacity-50">
                  {isActionSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Complete Result
                </button>
                <button onClick={handleVerify} disabled={isActionSubmitting} className="px-5 py-2.5 text-sm font-bold text-white bg-purple-600 rounded-xl hover:bg-purple-700 shadow-lg shadow-purple-100 transition-all flex items-center gap-1.5 disabled:opacity-50">
                  {isActionSubmitting ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />} Verify Report
                </button>
              </div>
            </div>
          </div>
        </div>, document.body
      )}

      {/* 3. Reopen Modal */}
      {isReopenModalOpen && selectedSample && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsReopenModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center"><Undo size={22} /></div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">Reopen Lab Result</h3>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{selectedSample.reference_no}</p>
                </div>
              </div>
              <button onClick={() => setIsReopenModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
                <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                <p className="text-xs text-amber-800 font-semibold leading-relaxed">Reopening will reset the status of this result and return it to Draft/Pending status. You must provide a valid correction or retesting reason.</p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Reason for Reopening</label>
                <textarea rows={3} placeholder="Enter reason..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/10 transition-all" value={reopenReason} onChange={(e) => setReopenReason(e.target.value)} />
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setIsReopenModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={handleReopen} disabled={isActionSubmitting} className="px-5 py-2.5 text-sm font-bold text-white bg-amber-600 rounded-xl hover:bg-amber-700 shadow-lg shadow-amber-100 transition-all flex items-center gap-1.5 disabled:opacity-50">
                {isActionSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Undo size={16} />} Confirm Reopen
              </button>
            </div>
          </div>
        </div>, document.body
      )}

      {/* 4. Amend Results Modal */}
      {isAmendModalOpen && selectedSample && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsAmendModalOpen(false)} />
          <div className="relative w-full max-w-3xl bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center"><Edit3 size={22} /></div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">Amend Result Values</h3>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{selectedSample.patient_name} • {selectedSample.reference_no}</p>
                </div>
              </div>
              <button onClick={() => setIsAmendModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all"><X size={20} /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {detailLoading ? (
                <div className="py-10 text-center"><Loader2 className="animate-spin mx-auto text-indigo-600 mb-2" size={24} /><p className="text-xs text-slate-400 font-bold">Synchronizing parameters...</p></div>
              ) : detailedResult?.results ? (
                <div className="space-y-6">
                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Parameter</th>
                          <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Unit</th>
                          <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Reference Range</th>
                          <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest w-40">Amended Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {detailedResult.results.map((res: ResultParameter) => (
                          <tr key={res.id}>
                            <td className="px-4 py-3 text-sm font-bold text-slate-800">{res.parameter_name}</td>
                            <td className="px-4 py-3 text-sm text-slate-500">{res.unit}</td>
                            <td className="px-4 py-3 text-sm text-slate-500">{res.ref_low} - {res.ref_high}</td>
                            <td className="px-4 py-3">
                              <input type="text" className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:bg-white focus:border-indigo-500 transition-all" value={amendedValues[res.parameter_id] ?? ""} onChange={(e) => setAmendedValues({ ...amendedValues, [res.parameter_id]: e.target.value, })} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Amendment Reason</label>
                    <textarea rows={2} placeholder="Provide reasoning..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all" value={amendmentReason} onChange={(e) => setAmendmentReason(e.target.value)} />
                  </div>
                </div>
              ) : null}
            </div>
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setIsAmendModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={handleAmend} disabled={isActionSubmitting} className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all flex items-center gap-1.5 disabled:opacity-50">
                {isActionSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Edit3 size={16} />} Save Amendment
              </button>
            </div>
          </div>
        </div>, document.body
      )}

      {/* Reverse to Pending Modal */}
      {isReverseModalOpen && selectedSample && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsReverseModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center"><RotateCcw size={22} /></div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">Reverse</h3>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{selectedSample.reference_no}</p>
                </div>
              </div>
              <button onClick={() => setIsReverseModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3">
                <AlertCircle className="text-rose-600 shrink-0 mt-0.5" size={18} />
                <p className="text-xs text-rose-800 font-semibold leading-relaxed">
                  Reversing will completely reset the workflow status back to <strong>PENDING</strong>. The result values will be retained, but the sample will need to be re-processed from the beginning.
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Reversal Reason</label>
                <textarea rows={3} placeholder="Provide reasoning for reversal..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:border-rose-500 focus:bg-white focus:ring-4 focus:ring-rose-500/10 transition-all" value={reverseReason} onChange={(e) => setReverseReason(e.target.value)} />
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setIsReverseModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={handleReverse} disabled={isActionSubmitting} className="px-5 py-2.5 text-sm font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-700 shadow-lg shadow-rose-100 transition-all flex items-center gap-1.5 disabled:opacity-50">
                {isActionSubmitting ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />} Confirm Reversal
              </button>
            </div>
          </div>
        </div>, document.body
      )}
    </div>
  );
};

export default LabVerification;




// import React, { useState, useEffect, useMemo } from "react";
// import {
//   Search, CheckCircle2, Microscope, X, AlertCircle, Loader2, Eye,
//   Edit3, Printer, Undo, FileText, RefreshCw, SlidersHorizontal,
//   ChevronLeft, ChevronRight, ShieldCheck, Send, Stethoscope,
// } from "lucide-react";
// import { labService } from "../services/lab.service";
// import { useNotification } from "../context/NotificationContext";
// import { createPortal } from "react-dom";
// import { getFlagBadgeClass, getFlagLabel } from "../utils/flagColors";

// interface ResultParameter {
//   id: number;
//   parameter_id: number;
//   parameter_name: string;
//   result_value: string;
//   unit: string;
//   ref_low: string;
//   ref_high: string;
//   flagged?: string;
//   interpretation?: string;
//   workflow_status: string;
//   verified_at?: string | null;
//   released_at?: string | null;
//   verification_comment?: string | null;
// }

// const LabVerification: React.FC = () => {
//   const { notify } = useNotification();
//   const [samples, setSamples] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
  
//   // Search & Debounce
//   const [searchTerm, setSearchTerm] = useState("");
//   const [debouncedSearch, setDebouncedSearch] = useState("");

//   const [activeMenu, setActiveMenu] = useState<string | number | null>(null);

//   // Filters
//   const [statusFilter, setStatusFilter] = useState<string>("ALL");
//   const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
//   const [dateFilter, setDateFilter] = useState<string>("ALL");
//   const [dateTypeFilter, setDateTypeFilter] = useState<"collected_at" | "ordered_at">("collected_at");
//   const [serviceFilter, setServiceFilter] = useState<string>("ALL");
//   const [activeTab, setActiveTab] = useState<"pending" | "verified" | "completed" | "released" | "all">("pending");

//   // Server-Side Pagination
//   const [currentPage, setCurrentPage] = useState(1);
//   const [totalItems, setTotalItems] = useState(0);
//   const itemsPerPage = 10;

//   // Modals
//   const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
//   const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
//   const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);
//   const [isAmendModalOpen, setIsAmendModalOpen] = useState(false);

//   const [selectedSample, setSelectedSample] = useState<any | null>(null);
//   const [detailedResult, setDetailedResult] = useState<any | null>(null);
//   const [detailLoading, setDetailLoading] = useState(false);
//   const [isActionSubmitting, setIsActionSubmitting] = useState(false);

//   // Input states for pathologist actions
//   const [verificationComment, setVerificationComment] = useState("");
//   const [reopenReason, setReopenReason] = useState("");
//   const [amendmentReason, setAmendmentReason] = useState("");
//   const [amendedValues, setAmendedValues] = useState<Record<number, string>>({});

//   // Debounce search term to prevent API spam
//   useEffect(() => {
//     const handler = setTimeout(() => setDebouncedSearch(searchTerm), 500);
//     return () => clearTimeout(handler);
//   }, [searchTerm]);

//   // Reset page to 1 when any filter changes
//   useEffect(() => {
//     setCurrentPage(1);
//   }, [debouncedSearch, activeTab, statusFilter, priorityFilter, dateFilter, dateTypeFilter, serviceFilter]);

//   const fetchSamples = async () => {
//     setLoading(true);
//     try {
//       // Map frontend tab to backend status
//       let backendStatus = "ALL";
//       if (activeTab === "pending") backendStatus = "TECH_REVIEW";
//       else if (activeTab === "verified") backendStatus = "VERIFIED";
//       else if (activeTab === "completed") backendStatus = "COMPLETED";
//       else if (activeTab === "released") backendStatus = "RELEASED";
//       else backendStatus = statusFilter;

//       const params = {
//         page: currentPage,
//         limit: itemsPerPage,
//         search: debouncedSearch,
//         status: backendStatus,
//         service: serviceFilter,
//         date: dateFilter,
//         dateType: dateTypeFilter,
//       };

//       const response = await labService.getSamples(params);
      
//       // Parse backend pagination format
//       const resData = response?.data?.data || response?.data || {};
//       const dataArray = Array.isArray(resData.data) ? resData.data : (Array.isArray(resData) ? resData : []);
//       const total = resData.total || dataArray.length;

//       setSamples(dataArray);
//       setTotalItems(total);
//     } catch (err: any) {
//       notify(err.response?.data?.message || "Failed to load laboratory samples", "error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchSamples();
//   }, [currentPage, debouncedSearch, activeTab, statusFilter, priorityFilter, dateFilter, dateTypeFilter, serviceFilter]);

//   useEffect(() => {
//     const handleClickOutside = () => setActiveMenu(null);
//     document.addEventListener("click", handleClickOutside);
//     return () => document.removeEventListener("click", handleClickOutside);
//   }, []);

//   const fetchSampleDetail = async (sample: any) => {
//     setDetailLoading(true);
//     try {
//       const details = await labService.getResultByRef(sample.reference_no);
//       setDetailedResult(details);
//       if (details?.results) {
//         const initialAmended: Record<number, string> = {};
//         details.results.forEach((r: any) => {
//           initialAmended[r.parameter_id] = r.result_value;
//         });
//         setAmendedValues(initialAmended);
//       }
//     } catch (err: any) {
//       notify(err.response?.data?.message || "Failed to load result details", "error");
//     } finally {
//       setDetailLoading(false);
//     }
//   };

//   const handleOpenDetailModal = (sample: any) => {
//     setSelectedSample(sample);
//     setDetailedResult(null);
//     setIsDetailModalOpen(true);
//     fetchSampleDetail(sample);
//   };

//   const handleOpenVerifyModal = (sample: any) => {
//     setSelectedSample(sample);
//     setDetailedResult(null);
//     setVerificationComment("");
//     setIsVerifyModalOpen(true);
//     fetchSampleDetail(sample);
//   };

//   const handleOpenReopenModal = (sample: any) => {
//     setSelectedSample(sample);
//     setReopenReason("");
//     setIsReopenModalOpen(true);
//   };

//   const handleOpenAmendModal = (sample: any) => {
//     setSelectedSample(sample);
//     setDetailedResult(null);
//     setAmendmentReason("");
//     setIsAmendModalOpen(true);
//     fetchSampleDetail(sample);
//   };

//   // Actions
//   const handleVerify = async () => {
//     if (!selectedSample) return;
//     setIsActionSubmitting(true);
//     try {
//       await labService.verifyResult({
//         reference_no: selectedSample.reference_no,
//         comment: verificationComment || "Verified by Pathologist",
//       });
//       notify("Laboratory results successfully verified", "success");
//       setIsVerifyModalOpen(false);
//       fetchSamples();
//     } catch (err: any) {
//       notify(err.response?.data?.message || "Failed to verify results", "error");
//     } finally {
//       setIsActionSubmitting(false);
//     }
//   };

//   const handleComplete = async (sampleOverride?: any) => {
//     const sample = sampleOverride || selectedSample;
//     if (!sample) return;
//     setIsActionSubmitting(true);
//     try {
//       await labService.completeResult(sample.reference_no);
//       notify("Laboratory results successfully completed", "success");
//       setIsVerifyModalOpen(false);
//       fetchSamples();
//     } catch (err: any) {
//       notify(err.response?.data?.message || "Failed to complete results", "error");
//     } finally {
//       setIsActionSubmitting(false);
//     }
//   };

//   const handleReopen = async () => {
//     if (!selectedSample) return;
//     if (!reopenReason.trim()) {
//       notify("Please provide a reason for reopening the results", "warning");
//       return;
//     }
//     setIsActionSubmitting(true);
//     try {
//       await labService.reopenResult({
//         reference_no: selectedSample.reference_no,
//         reason: reopenReason,
//       });
//       notify("Laboratory results status successfully set to Reopened", "success");
//       setIsReopenModalOpen(false);
//       fetchSamples();
//     } catch (err: any) {
//       notify(err.response?.data?.message || "Failed to reopen results", "error");
//     } finally {
//       setIsActionSubmitting(false);
//     }
//   };

//   const handleRelease = async (sample: any) => {
//     if (!window.confirm(`Are you sure you want to release the verified report for ${sample.patient_name}?`)) {
//       return;
//     }
//     setLoading(true);
//     try {
//       await labService.releaseResult({
//         reference_no: sample.reference_no,
//       });
//       notify("Laboratory report released and published to EMR successfully", "success");
//       fetchSamples();
//     } catch (err: any) {
//       notify(err.response?.data?.message || "Failed to release results", "error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleAmend = async () => {
//     if (!selectedSample || !detailedResult) return;
//     if (!amendmentReason.trim()) {
//       notify("Please provide a reason for result amendment", "warning");
//       return;
//     }

//     const modifiedParams = Object.keys(amendedValues).map((paramIdStr) => {
//       const paramId = Number(paramIdStr);
//       return {
//         parameter_id: paramId,
//         result_value: amendedValues[paramId],
//       };
//     });

//     setIsActionSubmitting(true);
//     try {
//       await labService.amendResult({
//         reference_no: selectedSample.reference_no,
//         reason: amendmentReason,
//         results: modifiedParams,
//       });
//       notify("Laboratory results amended and updated successfully", "success");
//       setIsAmendModalOpen(false);
//       fetchSamples();
//     } catch (err: any) {
//       notify(err.response?.data?.message || "Failed to amend results", "error");
//     } finally {
//       setIsActionSubmitting(false);
//     }
//   };

//   const handlePrintPreview = (sample: any) => {
//     const url = `/print/lab/${sample.reference_no}`;
//     window.open(url, "_blank");
//   };

//   const uniqueServices = useMemo(() => {
//     const services = samples.map((s) => s.service_name || s.sample_name).filter(Boolean);
//     return Array.from(new Set(services));
//   }, [samples]);

//   const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

//   return (
//     <div className="space-y-8 animate-in fade-in duration-500 pb-20">
//       {/* Header and Sync Actions */}
//       <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
//         <div>
//           <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
//             Result Auditing & Verification
//           </h2>
//           <p className="text-slate-500 font-medium mt-1">
//             Pathologist Portal: Review diagnostic profiles, approve clinical values, amend discrepancies, and dispatch final reports.
//           </p>
//         </div>
//         <button
//           onClick={fetchSamples}
//           className="flex items-center gap-2 px-5 py-3 text-slate-700 bg-white border border-slate-200 rounded-2xl text-sm font-bold shadow-sm hover:shadow-md hover:bg-slate-50 transition-all self-end md:self-auto"
//         >
//           <RefreshCw size={16} /> Refresh Workspace
//         </button>
//       </div>

//       {/* Main Panel */}
//       <div className="bg-white border border-slate-200 rounded-[36px] shadow-sm overflow-hidden">
//         {/* Toolbar & Filter Bar */}
//         <div className="p-6 border-b border-slate-100 bg-slate-50/50 space-y-4">
//           <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
//             {/* Tab Selection */}
//             <div className="flex items-center gap-1.5 p-1 bg-slate-200/50 rounded-2xl w-fit overflow-x-auto">
//               <button
//                 onClick={() => setActiveTab("pending")}
//                 className={`px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === "pending"
//                   ? "bg-white text-purple-600 shadow-sm border border-slate-200/50"
//                   : "text-slate-500 hover:text-slate-800"
//                   }`}
//               >
//                 Needs Verification {activeTab === "pending" && `(${totalItems})`}
//               </button>
//               <button
//                 onClick={() => setActiveTab("verified")}
//                 className={`px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === "verified"
//                   ? "bg-white text-blue-600 shadow-sm border border-slate-200/50"
//                   : "text-slate-500 hover:text-slate-800"
//                   }`}
//               >
//                 Verified {activeTab === "verified" && `(${totalItems})`}
//               </button>
//               <button
//                 onClick={() => setActiveTab("completed")}
//                 className={`px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === "completed"
//                   ? "bg-white text-teal-600 shadow-sm border border-slate-200/50"
//                   : "text-slate-500 hover:text-slate-800"
//                   }`}
//               >
//                 Completed {activeTab === "completed" && `(${totalItems})`}
//               </button>
//               <button
//                 onClick={() => setActiveTab("released")}
//                 className={`px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === "released"
//                   ? "bg-white text-emerald-600 shadow-sm border border-slate-200/50"
//                   : "text-slate-500 hover:text-slate-800"
//                   }`}
//               >
//                 Released {activeTab === "released" && `(${totalItems})`}
//               </button>
//               <button
//                 onClick={() => setActiveTab("all")}
//                 className={`px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === "all"
//                   ? "bg-white text-slate-700 shadow-sm border border-slate-200/50"
//                   : "text-slate-500 hover:text-slate-800"
//                   }`}
//               >
//                 All Records {activeTab === "all" && `(${totalItems})`}
//               </button>
//             </div>

//             {/* Search Inputs */}
//             <div className="relative max-w-md w-full">
//               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
//               <input
//                 type="text"
//                 placeholder="Search by Patient, MRN, Ref No, Panel..."
//                 className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all"
//                 value={searchTerm}
//                 onChange={(e) => setSearchTerm(e.target.value)}
//               />
//             </div>
//           </div>

//           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2">
//             {/* Status Filter */}
//             <div className="flex flex-col gap-1.5">
//               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Workflow Status</label>
//               <select
//                 className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all disabled:opacity-50 disabled:bg-slate-100"
//                 value={statusFilter}
//                 onChange={(e) => setStatusFilter(e.target.value)}
//                 disabled={activeTab !== "all"}
//               >
//                 <option value="ALL">All Statuses</option>
//                 <option value="PENDING">Pending Entry</option>
//                 <option value="TECH_REVIEW">Tech Review</option>
//                 <option value="VERIFIED">Verified</option>
//                 <option value="RELEASED">Released/Dispatched</option>
//                 <option value="REOPENED">Reopened</option>
//               </select>
//             </div>

//             {/* Priority Filter */}
//             <div className="flex flex-col gap-1.5">
//               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Urgency</label>
//               <select
//                 className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all"
//                 value={priorityFilter}
//                 onChange={(e) => setPriorityFilter(e.target.value)}
//               >
//                 <option value="ALL">All Priorities</option>
//                 <option value="Stat">Stat (Urgent)</option>
//                 <option value="Routine">Routine</option>
//               </select>
//             </div>

//             {/* Date Type Filter */}
//             <div className="flex flex-col gap-1.5">
//               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Date Type</label>
//               <select
//                 className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all"
//                 value={dateTypeFilter}
//                 onChange={(e) => setDateTypeFilter(e.target.value as "collected_at" | "ordered_at")}
//               >
//                 <option value="collected_at">Collected At</option>
//                 <option value="ordered_at">Ordered At</option>
//               </select>
//             </div>

//             {/* Date Filter */}
//             <div className="flex flex-col gap-1.5">
//               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Order Date</label>
//               <select
//                 className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all"
//                 value={dateFilter}
//                 onChange={(e) => setDateFilter(e.target.value)}
//               >
//                 <option value="ALL">All Dates</option>
//                 <option value="TODAY">Today</option>
//                 <option value="YESTERDAY">Yesterday</option>
//                 <option value="WEEK">Last 7 Days</option>
//               </select>
//             </div>

//             {/* Service/Panel Filter */}
//             <div className="flex flex-col gap-1.5">
//               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Service / Panel</label>
//               <select
//                 className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all"
//                 value={serviceFilter}
//                 onChange={(e) => setServiceFilter(e.target.value)}
//               >
//                 <option value="ALL">All Panels</option>
//                 {uniqueServices.map((srv: any, idx) => (
//                   <option key={idx} value={srv}>{srv}</option>
//                 ))}
//               </select>
//             </div>
//           </div>
//         </div>

//         {/* Data Table */}
//         <div className="overflow-x-auto pb-32">
//           <table className="w-full text-left border-collapse">
//             <thead>
//               <tr className="bg-slate-50 border-b border-slate-100">
//                 <th className="p-5 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Order / Ref No</th>
//                 <th className="p-5 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Patient Context</th>
//                 <th className="p-5 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Service / Panel</th>
//                 <th className="p-5 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Dates</th>
//                 <th className="p-5 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Workflow Status</th>
//                 <th className="p-5 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap text-right">Actions</th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-slate-100">
//               {loading ? (
//                 <tr>
//                   <td colSpan={6} className="p-16 text-center">
//                     <Loader2 className="animate-spin mx-auto text-purple-600 mb-2" size={28} />
//                     <p className="text-sm text-slate-500 font-bold">Synchronizing ledger audit records...</p>
//                   </td>
//                 </tr>
//               ) : samples.length === 0 ? (
//                 <tr>
//                   <td colSpan={6} className="p-20 text-center">
//                     <Microscope size={64} className="mx-auto text-slate-200 mb-4" />
//                     <p className="text-xl font-black text-slate-700">No matching audit files</p>
//                     <p className="text-sm text-slate-400 mt-1">Adjust filters or check back later</p>
//                   </td>
//                 </tr>
//               ) : (
//                 samples.map((sample) => (
//                   <tr key={sample.reference_no || sample.id} className="hover:bg-slate-50/50 transition-colors group">
//                     <td className="p-5">
//                       <div className="flex flex-col">
//                         <span className="text-sm font-black text-slate-800 tracking-tight">{sample.reference_no || "-"}</span>
//                         <span className="text-[10px] font-mono font-bold text-slate-400 mt-0.5">ID: {sample.id || sample.order_id}</span>
//                       </div>
//                     </td>
//                     <td className="p-5">
//                       <div className="flex flex-col">
//                         <span className="text-sm font-black text-slate-800">{sample.patient_name}</span>
//                         <div className="flex items-center gap-2 mt-0.5">
//                           <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">MRN: {sample.mrn}</span>
//                         </div>
//                       </div>
//                     </td>
//                     <td className="p-5">
//                       <div className="flex flex-col">
//                         <span className="text-sm font-bold text-slate-700">{sample.service_name || sample.sample_name}</span>
//                         {sample.doctor_name && (
//                           <div className="flex items-center gap-1 text-[10px] font-bold text-purple-600/80 bg-purple-50/50 w-fit px-1.5 py-0.5 rounded mt-1.5">
//                             <Stethoscope size={10} />
//                             {sample.doctor_name.replace(/^Dr\.?\s*/i, 'Dr. ')}
//                           </div>
//                         )}
//                         {sample.summary && (
//                           <span className="text-[10px] text-slate-400 font-semibold mt-0.5">
//                             Total: {sample.summary.total_parameters} | Critical: {sample.summary.critical_results}
//                           </span>
//                         )}
//                       </div>
//                     </td>
//                     <td className="p-5">
//                       <div className="flex flex-col gap-1">
//                         {sample.ordered_at && (
//                           <div className="text-xs text-slate-600 font-medium">
//                             <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Ordered</span>
//                             {new Date(sample.ordered_at).toLocaleString()}
//                           </div>
//                         )}
//                         {sample.collected_at && (
//                           <div className="text-xs text-slate-600 font-medium mt-1">
//                             <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Collected</span>
//                             {new Date(sample.collected_at).toLocaleString()}
//                           </div>
//                         )}
//                       </div>
//                     </td>
//                     <td className="p-5">
//                       <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${sample.workflow_status === "RELEASED"
//                           ? "bg-emerald-50 text-emerald-700 border-emerald-200"
//                           : sample.workflow_status === "VERIFIED"
//                             ? "bg-blue-50 text-blue-700 border-blue-200"
//                             : sample.workflow_status === "TECH_REVIEW"
//                               ? "bg-purple-50 text-purple-700 border-purple-200"
//                               : sample.workflow_status === "REOPENED"
//                                 ? "bg-red-50 text-red-700 border-red-200"
//                                 : sample.workflow_status === "COMPLETED"
//                                   ? "bg-teal-50 text-teal-700 border-teal-200"
//                                   : "bg-amber-50 text-amber-700 border-amber-200"
//                         }`}>
//                         {sample.workflow_status === "TECH_REVIEW" ? "Tech Review" : sample.workflow_status === "RELEASED" ? "Dispatched" : (sample.workflow_status || "PENDING")}
//                       </span>
//                     </td>
//                     <td className="p-5 text-right relative">
//                       <div className="flex items-center justify-end gap-1.5">
//                         <button onClick={() => handleOpenDetailModal(sample)} className="p-2 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all" title="View Parameters">
//                           <Eye size={18} />
//                         </button>
//                         <button onClick={() => handlePrintPreview(sample)} className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all" title="Print Report">
//                           <Printer size={18} />
//                         </button>
//                         <button
//                           onClick={(e) => {
//                             e.stopPropagation();
//                             setActiveMenu(activeMenu === (sample.id || sample.order_id) ? null : (sample.id || sample.order_id));
//                           }}
//                           className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
//                         >
//                           <SlidersHorizontal size={18} />
//                         </button>
//                       </div>

//                       {/* Dropdown Menu */}
//                       {activeMenu === (sample.id || sample.order_id) && (
//                         <div className="absolute right-6 top-14 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 py-2.5 z-30 animate-in fade-in slide-in-from-top-2">
//                           {(sample.workflow_status === "TECH_REVIEW" || sample.workflow_status === "PENDING" || !sample.workflow_status) && (
//                             <button onClick={() => handleOpenVerifyModal(sample)} className="w-full text-left px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-purple-600 flex items-center gap-2">
//                               <ShieldCheck size={16} /> Audit & Verify
//                             </button>
//                           )}
//                           {sample.workflow_status === "VERIFIED" && (
//                             <button onClick={() => handleComplete(sample)} className="w-full text-left px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-teal-600 flex items-center gap-2">
//                               <CheckCircle2 size={16} /> Complete Result
//                             </button>
//                           )}
//                           {sample.workflow_status === "COMPLETED" && (
//                             <button onClick={() => handleRelease(sample)} className="w-full text-left px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-emerald-600 flex items-center gap-2">
//                               <Send size={16} /> Release to Patient
//                             </button>
//                           )}
//                           {sample.workflow_status && sample.workflow_status !== "RELEASED" && sample.workflow_status !== "PENDING" && (
//                             <button onClick={() => handleOpenReopenModal(sample)} className="w-full text-left px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-amber-600 flex items-center gap-2">
//                               <Undo size={16} /> Reopen / Correct
//                             </button>
//                           )}
//                           {sample.workflow_status && sample.workflow_status !== "PENDING" && (
//                             <button onClick={() => handleOpenAmendModal(sample)} className="w-full text-left px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2">
//                               <Edit3 size={16} /> Amend Values
//                             </button>
//                           )}
//                         </div>
//                       )}
//                     </td>
//                   </tr>
//                 ))
//               )}
//             </tbody>
//           </table>
//         </div>

//         {/* Server-Side Pagination Footer */}
//         {!loading && samples.length > 0 && (
//           <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
//             <span className="text-xs font-semibold text-slate-500">
//               Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
//               {Math.min(currentPage * itemsPerPage, totalItems)} of{" "}
//               {totalItems} audits
//             </span>
//             <div className="flex items-center gap-2">
//               <button
//                 onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
//                 disabled={currentPage === 1}
//                 className="p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
//               >
//                 <ChevronLeft size={16} />
//               </button>
//               <span className="text-xs font-bold text-slate-700 px-3">
//                 Page {currentPage} of {totalPages}
//               </span>
//               <button
//                 onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
//                 disabled={currentPage === totalPages}
//                 className="p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
//               >
//                 <ChevronRight size={16} />
//               </button>
//             </div>
//           </div>
//         )}
//       </div>

//       {/* PORTALS & MODALS (Kept original logic, rendering abbreviated for space) */}
//       {/* 1. Detail View Modal */}
//       {isDetailModalOpen && selectedSample && createPortal(
//         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
//           <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsDetailModalOpen(false)} />
//           <div className="relative w-full max-w-3xl bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
//             <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
//               <div className="flex items-center gap-4">
//                 <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
//                   <FileText size={22} />
//                 </div>
//                 <div>
//                   <h3 className="text-lg font-black text-slate-800">Sample Results Auditing</h3>
//                   <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{selectedSample.patient_name} • {selectedSample.reference_no}</p>
//                 </div>
//               </div>
//               <button onClick={() => setIsDetailModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all"><X size={20} /></button>
//             </div>
//             <div className="p-6 overflow-y-auto flex-1 space-y-6">
//               {detailLoading ? (
//                 <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-purple-600 mb-2" size={24} /><p className="text-xs text-slate-400 font-bold">Synchronizing parameters...</p></div>
//               ) : detailedResult?.results ? (
//                 <div className="border border-slate-200 rounded-2xl overflow-hidden">
//                   <table className="w-full text-left">
//                     <thead className="bg-slate-50 border-b border-slate-200">
//                       <tr>
//                         <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Parameter</th>
//                         <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Result</th>
//                         <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Unit</th>
//                         <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Reference Range</th>
//                         <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Interpretation</th>
//                       </tr>
//                     </thead>
//                     <tbody className="divide-y divide-slate-100">
//                       {detailedResult.results.map((res: ResultParameter) => (
//                         <tr key={res.id} className="hover:bg-slate-50/50">
//                           <td className="px-4 py-3 text-sm font-bold text-slate-800">{res.parameter_name}</td>
//                           <td className="px-4 py-3 text-sm font-semibold text-slate-700">{res.result_value}</td>
//                           <td className="px-4 py-3 text-sm text-slate-500">{res.unit || "-"}</td>
//                           <td className="px-4 py-3 text-sm text-slate-500">{res.ref_low} - {res.ref_high}</td>
//                           <td className="px-4 py-3"><span className={`flag-badge ${getFlagBadgeClass(res.interpretation || res.flag_type)}`}>{getFlagLabel(res.interpretation || res.flag_type)}</span></td>
//                         </tr>
//                       ))}
//                     </tbody>
//                   </table>
//                 </div>
//               ) : (<p className="text-center text-sm font-bold text-slate-400">Failed to render parameter schema.</p>)}
//             </div>
//             <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end">
//               <button onClick={() => setIsDetailModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">Close Audit</button>
//             </div>
//           </div>
//         </div>, document.body
//       )}

//       {/* 2. Pathologist Verification Modal */}
//       {isVerifyModalOpen && selectedSample && createPortal(
//         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
//           <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsVerifyModalOpen(false)} />
//           <div className="relative w-full max-w-3xl bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
//             <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
//               <div className="flex items-center gap-4">
//                 <div className="w-12 h-12 rounded-xl bg-purple-600 text-white flex items-center justify-center"><ShieldCheck size={22} /></div>
//                 <div>
//                   <h3 className="text-lg font-black text-slate-800">Verify Laboratory Results</h3>
//                   <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{selectedSample.patient_name} • {selectedSample.reference_no}</p>
//                 </div>
//               </div>
//               <button onClick={() => setIsVerifyModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all"><X size={20} /></button>
//             </div>
//             <div className="p-6 overflow-y-auto flex-1 space-y-6">
//               {detailLoading ? (
//                 <div className="py-10 text-center"><Loader2 className="animate-spin mx-auto text-purple-600 mb-2" size={24} /><p className="text-xs text-slate-400 font-bold">Synchronizing parameters...</p></div>
//               ) : detailedResult?.results ? (
//                 <div className="border border-slate-200 rounded-2xl overflow-hidden">
//                   <table className="w-full text-left">
//                     <thead className="bg-slate-50 border-b border-slate-200">
//                       <tr>
//                         <th className="px-4 py-2.5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Parameter</th>
//                         <th className="px-4 py-2.5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Result</th>
//                         <th className="px-4 py-2.5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Interpretation</th>
//                       </tr>
//                     </thead>
//                     <tbody className="divide-y divide-slate-100">
//                       {detailedResult.results.map((res: ResultParameter) => (
//                         <tr key={res.id}>
//                           <td className="px-4 py-2 text-xs font-bold text-slate-800">{res.parameter_name}</td>
//                           <td className="px-4 py-2 text-xs font-semibold text-slate-700">{res.result_value} {res.unit}</td>
//                           <td className="px-4 py-2"><span className={`flag-badge ${getFlagBadgeClass(res.interpretation || res.flag_type)}`}>{getFlagLabel(res.interpretation || res.flag_type)}</span></td>
//                         </tr>
//                       ))}
//                     </tbody>
//                   </table>
//                 </div>
//               ) : null}
//               <div className="space-y-2">
//                 <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Pathologist Verification Comment</label>
//                 <textarea rows={3} placeholder="Enter audit/verification notes here..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10 transition-all" value={verificationComment} onChange={(e) => setVerificationComment(e.target.value)} />
//               </div>
//             </div>
//             <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
//               <span className="text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100 font-bold flex items-center gap-1.5"><AlertCircle size={14} /> Confirms clinical approval</span>
//               <div className="flex items-center gap-3">
//                 <button onClick={() => setIsVerifyModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
//                 <button onClick={() => handleComplete()} disabled={isActionSubmitting} className="px-5 py-2.5 text-sm font-bold text-white bg-teal-600 rounded-xl hover:bg-teal-700 shadow-lg shadow-teal-100 transition-all flex items-center gap-1.5 disabled:opacity-50">
//                   {isActionSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Complete Result
//                 </button>
//                 <button onClick={handleVerify} disabled={isActionSubmitting} className="px-5 py-2.5 text-sm font-bold text-white bg-purple-600 rounded-xl hover:bg-purple-700 shadow-lg shadow-purple-100 transition-all flex items-center gap-1.5 disabled:opacity-50">
//                   {isActionSubmitting ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />} Verify Report
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>, document.body
//       )}

//       {/* 3. Reopen Modal */}
//       {isReopenModalOpen && selectedSample && createPortal(
//         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
//           <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsReopenModalOpen(false)} />
//           <div className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
//             <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
//               <div className="flex items-center gap-4">
//                 <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center"><Undo size={22} /></div>
//                 <div>
//                   <h3 className="text-lg font-black text-slate-800">Reopen Lab Result</h3>
//                   <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{selectedSample.reference_no}</p>
//                 </div>
//               </div>
//               <button onClick={() => setIsReopenModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all"><X size={20} /></button>
//             </div>
//             <div className="p-6 space-y-4">
//               <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
//                 <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={18} />
//                 <p className="text-xs text-amber-800 font-semibold leading-relaxed">Reopening will reset the status of this result and return it to Draft/Pending status. You must provide a valid correction or retesting reason.</p>
//               </div>
//               <div className="space-y-2">
//                 <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Reason for Reopening</label>
//                 <textarea rows={3} placeholder="Enter reason..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/10 transition-all" value={reopenReason} onChange={(e) => setReopenReason(e.target.value)} />
//               </div>
//             </div>
//             <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
//               <button onClick={() => setIsReopenModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
//               <button onClick={handleReopen} disabled={isActionSubmitting} className="px-5 py-2.5 text-sm font-bold text-white bg-amber-600 rounded-xl hover:bg-amber-700 shadow-lg shadow-amber-100 transition-all flex items-center gap-1.5 disabled:opacity-50">
//                 {isActionSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Undo size={16} />} Confirm Reopen
//               </button>
//             </div>
//           </div>
//         </div>, document.body
//       )}

//       {/* 4. Amend Results Modal */}
//       {isAmendModalOpen && selectedSample && createPortal(
//         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
//           <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsAmendModalOpen(false)} />
//           <div className="relative w-full max-w-3xl bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
//             <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
//               <div className="flex items-center gap-4">
//                 <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center"><Edit3 size={22} /></div>
//                 <div>
//                   <h3 className="text-lg font-black text-slate-800">Amend Result Values</h3>
//                   <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{selectedSample.patient_name} • {selectedSample.reference_no}</p>
//                 </div>
//               </div>
//               <button onClick={() => setIsAmendModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all"><X size={20} /></button>
//             </div>
//             <div className="p-6 overflow-y-auto flex-1 space-y-6">
//               {detailLoading ? (
//                 <div className="py-10 text-center"><Loader2 className="animate-spin mx-auto text-indigo-600 mb-2" size={24} /><p className="text-xs text-slate-400 font-bold">Synchronizing parameters...</p></div>
//               ) : detailedResult?.results ? (
//                 <div className="space-y-6">
//                   <div className="border border-slate-200 rounded-2xl overflow-hidden">
//                     <table className="w-full text-left">
//                       <thead className="bg-slate-50 border-b border-slate-200">
//                         <tr>
//                           <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Parameter</th>
//                           <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Unit</th>
//                           <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Reference Range</th>
//                           <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest w-40">Amended Value</th>
//                         </tr>
//                       </thead>
//                       <tbody className="divide-y divide-slate-100">
//                         {detailedResult.results.map((res: ResultParameter) => (
//                           <tr key={res.id}>
//                             <td className="px-4 py-3 text-sm font-bold text-slate-800">{res.parameter_name}</td>
//                             <td className="px-4 py-3 text-sm text-slate-500">{res.unit}</td>
//                             <td className="px-4 py-3 text-sm text-slate-500">{res.ref_low} - {res.ref_high}</td>
//                             <td className="px-4 py-3">
//                               <input type="text" className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:bg-white focus:border-indigo-500 transition-all" value={amendedValues[res.parameter_id] ?? ""} onChange={(e) => setAmendedValues({ ...amendedValues, [res.parameter_id]: e.target.value, })} />
//                             </td>
//                           </tr>
//                         ))}
//                       </tbody>
//                     </table>
//                   </div>
//                   <div className="space-y-2">
//                     <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Amendment Reason</label>
//                     <textarea rows={2} placeholder="Provide reasoning..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all" value={amendmentReason} onChange={(e) => setAmendmentReason(e.target.value)} />
//                   </div>
//                 </div>
//               ) : null}
//             </div>
//             <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
//               <button onClick={() => setIsAmendModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
//               <button onClick={handleAmend} disabled={isActionSubmitting} className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all flex items-center gap-1.5 disabled:opacity-50">
//                 {isActionSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Edit3 size={16} />} Save Amendment
//               </button>
//             </div>
//           </div>
//         </div>, document.body
//       )}
//     </div>
//   );
// };

// export default LabVerification;
// // import React, { useState, useEffect, useMemo } from "react";
// // import {
// //   Search,
// //   CheckCircle2,
// //   Microscope,
// //   X,
// //   AlertCircle,
// //   Loader2,
// //   Eye,
// //   Edit3,
// //   Printer,
// //   Undo,
// //   FileText,
// //   RefreshCw,
// //   SlidersHorizontal,
// //   ChevronLeft,
// //   ChevronRight,
// //   ShieldCheck,
// //   Send,
// //   Activity,
// //   Stethoscope,
// // } from "lucide-react";
// // import { labService } from "../services/lab.service";
// // import { useNotification } from "../context/NotificationContext";
// // import { createPortal } from "react-dom";
// // import { getFlagBadgeClass, getFlagLabel } from "../utils/flagColors";

// // interface ResultParameter {
// //   id: number;
// //   parameter_id: number;
// //   parameter_name: string;
// //   result_value: string;
// //   unit: string;
// //   ref_low: string;
// //   ref_high: string;
// //   flagged?: string;
// //   interpretation?: string;
// //   workflow_status: string;
// //   verified_at?: string | null;
// //   released_at?: string | null;
// //   verification_comment?: string | null;
// // }

// // const LabVerification: React.FC = () => {
// //   const { notify } = useNotification();
// //   const [samples, setSamples] = useState<any[]>([]);
// //   const [loading, setLoading] = useState(true);
// //   const [searchTerm, setSearchTerm] = useState("");
// //   // Track by reference_no instead of id to prevent multiple menus from opening

// //   // Change from string | null to string | number | null
// //   const [activeMenu, setActiveMenu] = useState<string | number | null>(null);
// //   // const [activeMenu, setActiveMenu] = useState<string | null>(null);

// //   // Filters
// //   const [statusFilter, setStatusFilter] = useState<string>("ALL");
// //   const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
// //   const [dateFilter, setDateFilter] = useState<string>("ALL");
// //   const [dateTypeFilter, setDateTypeFilter] = useState<"collected_at" | "ordered_at">("collected_at");
// //   const [serviceFilter, setServiceFilter] = useState<string>("ALL");

// //   // Navigation Tabs: 'pending' | 'verified' | 'completed' | 'released' | 'all'
// //   const [activeTab, setActiveTab] = useState<"pending" | "verified" | "completed" | "released" | "all">("pending");

// //   // Pagination
// //   const [currentPage, setCurrentPage] = useState(1);
// //   const itemsPerPage = 10;

// //   // Modals
// //   const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
// //   const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
// //   const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);
// //   const [isAmendModalOpen, setIsAmendModalOpen] = useState(false);

// //   const [selectedSample, setSelectedSample] = useState<any | null>(null);
// //   const [detailedResult, setDetailedResult] = useState<any | null>(null);
// //   const [detailLoading, setDetailLoading] = useState(false);
// //   const [isActionSubmitting, setIsActionSubmitting] = useState(false);

// //   // Input states for pathologist actions
// //   const [verificationComment, setVerificationComment] = useState("");
// //   const [reopenReason, setReopenReason] = useState("");
// //   const [amendmentReason, setAmendmentReason] = useState("");
// //   const [amendedValues, setAmendedValues] = useState<Record<number, string>>({}); // parameter_id -> new value

// //   const fetchSamples = async () => {
// //     setLoading(true);
// //     try {
// //       const response = await labService.getSamples();
// //       // Ensure we always set an array, even if the API returns { data: [...] }
// //       const dataArray = Array.isArray(response) 
// //         ? response 
// //         : (Array.isArray(response?.data) ? response.data : []);
// //       setSamples(dataArray);
// //     } catch (err: any) {
// //       notify(err.response?.data?.message || "Failed to load laboratory samples", "error");
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   useEffect(() => {
// //     fetchSamples();
// //   }, []);

// //   // Reset page count on filter changes
// //   useEffect(() => {
// //     setCurrentPage(1);
// //   }, [searchTerm, activeTab, statusFilter, priorityFilter, dateFilter, dateTypeFilter, serviceFilter]);

// //   // Close context dropdown on outside click
// //   useEffect(() => {
// //     const handleClickOutside = () => setActiveMenu(null);
// //     document.addEventListener("click", handleClickOutside);
// //     return () => document.removeEventListener("click", handleClickOutside);
// //   }, []);

// //   // Fetch detailed data for a specific sample
// //   const fetchSampleDetail = async (sample: any) => {
// //     setDetailLoading(true);
// //     try {
// //       const details = await labService.getResultByRef(sample.reference_no);
// //       setDetailedResult(details);
// //       // Pre-populate amendment values
// //       if (details?.results) {
// //         const initialAmended: Record<number, string> = {};
// //         details.results.forEach((r: any) => {
// //           initialAmended[r.parameter_id] = r.result_value;
// //         });
// //         setAmendedValues(initialAmended);
// //       }
// //     } catch (err: any) {
// //       notify(err.response?.data?.message || "Failed to load result details", "error");
// //     } finally {
// //       setDetailLoading(false);
// //     }
// //   };

// //   const handleOpenDetailModal = (sample: any) => {
// //     setSelectedSample(sample);
// //     setDetailedResult(null);
// //     setIsDetailModalOpen(true);
// //     fetchSampleDetail(sample);
// //   };

// //   const handleOpenVerifyModal = (sample: any) => {
// //     setSelectedSample(sample);
// //     setDetailedResult(null);
// //     setVerificationComment("");
// //     setIsVerifyModalOpen(true);
// //     fetchSampleDetail(sample);
// //   };

// //   const handleOpenReopenModal = (sample: any) => {
// //     setSelectedSample(sample);
// //     setReopenReason("");
// //     setIsReopenModalOpen(true);
// //   };

// //   const handleOpenAmendModal = (sample: any) => {
// //     setSelectedSample(sample);
// //     setDetailedResult(null);
// //     setAmendmentReason("");
// //     setIsAmendModalOpen(true);
// //     fetchSampleDetail(sample);
// //   };

// //   // Action: Verify Result
// //   const handleVerify = async () => {
// //     if (!selectedSample) return;
// //     setIsActionSubmitting(true);
// //     try {
// //       await labService.verifyResult({
// //         reference_no: selectedSample.reference_no,
// //         comment: verificationComment || "Verified by Pathologist",
// //       });
// //       notify("Laboratory results successfully verified", "success");
// //       setIsVerifyModalOpen(false);
// //       fetchSamples();
// //     } catch (err: any) {
// //       notify(err.response?.data?.message || "Failed to verify results", "error");
// //     } finally {
// //       setIsActionSubmitting(false);
// //     }
// //   };

// //   // Action: Complete Result
// //   const handleComplete = async (sampleOverride?: any) => {
// //     const sample = sampleOverride || selectedSample;
// //     if (!sample) return;
// //     setIsActionSubmitting(true);
// //     try {
// //       await labService.completeResult(sample.reference_no);
// //       notify("Laboratory results successfully completed", "success");
// //       setIsVerifyModalOpen(false);
// //       fetchSamples();
// //     } catch (err: any) {
// //       notify(err.response?.data?.message || "Failed to complete results", "error");
// //     } finally {
// //       setIsActionSubmitting(false);
// //     }
// //   };

// //   // Action: Reopen Result
// //   const handleReopen = async () => {
// //     if (!selectedSample) return;
// //     if (!reopenReason.trim()) {
// //       notify("Please provide a reason for reopening the results", "warning");
// //       return;
// //     }
// //     setIsActionSubmitting(true);
// //     try {
// //       await labService.reopenResult({
// //         reference_no: selectedSample.reference_no,
// //         reason: reopenReason,
// //       });
// //       notify("Laboratory results status successfully set to Reopened", "success");
// //       setIsReopenModalOpen(false);
// //       fetchSamples();
// //     } catch (err: any) {
// //       notify(err.response?.data?.message || "Failed to reopen results", "error");
// //     } finally {
// //       setIsActionSubmitting(false);
// //     }
// //   };

// //   // Action: Release Result
// //   const handleRelease = async (sample: any) => {
// //     if (!window.confirm(`Are you sure you want to release the verified report for ${sample.patient_name}?`)) {
// //       return;
// //     }
// //     setLoading(true);
// //     try {
// //       await labService.releaseResult({
// //         reference_no: sample.reference_no,
// //       });
// //       notify("Laboratory report released and published to EMR successfully", "success");
// //       fetchSamples();
// //     } catch (err: any) {
// //       notify(err.response?.data?.message || "Failed to release results", "error");
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   // Action: Amend Results
// //   const handleAmend = async () => {
// //     if (!selectedSample || !detailedResult) return;
// //     if (!amendmentReason.trim()) {
// //       notify("Please provide a reason for result amendment", "warning");
// //       return;
// //     }

// //     const modifiedParams = Object.keys(amendedValues).map((paramIdStr) => {
// //       const paramId = Number(paramIdStr);
// //       return {
// //         parameter_id: paramId,
// //         result_value: amendedValues[paramId],
// //       };
// //     });

// //     setIsActionSubmitting(true);
// //     try {
// //       await labService.amendResult({
// //         reference_no: selectedSample.reference_no,
// //         reason: amendmentReason,
// //         results: modifiedParams,
// //       });
// //       notify("Laboratory results amended and updated successfully", "success");
// //       setIsAmendModalOpen(false);
// //       fetchSamples();
// //     } catch (err: any) {
// //       notify(err.response?.data?.message || "Failed to amend results", "error");
// //     } finally {
// //       setIsActionSubmitting(false);
// //     }
// //   };

// //   const handlePrintPreview = (sample: any) => {
// //     const url = `/print/lab/${sample.reference_no}`;
// //     window.open(url, "_blank");
// //   };

// //   // Statistics Computations
// //   const stats = useMemo(() => {
// //   const totalPending = samples.filter(
// //       (s) => s.workflow_status === "TECH_REVIEW" || s.workflow_status === "PENDING" || !s.workflow_status
// //     ).length;
// //     // const totalPending = samples.filter(
// //     //   (s) => s.workflow_status === "TECH_REVIEW"
// //     // ).length;
// //     const totalVerified = samples.filter(
// //       (s) => s.workflow_status === "VERIFIED"
// //     ).length;
// //     const totalCompleted = samples.filter(
// //       (s) => s.workflow_status === "COMPLETED"
// //     ).length;
// //     const totalReleased = samples.filter(
// //       (s) => s.workflow_status === "RELEASED"
// //     ).length;
// //     return { totalPending, totalVerified, totalCompleted, totalReleased };
// //   }, [samples]);

// //   const uniqueServices = useMemo(() => {
// //     const services = samples.map((s) => s.service_name || s.sample_name).filter(Boolean);
// //     return Array.from(new Set(services));
// //   }, [samples]);

// //   // Tab Filtering & Query Searches
// //   const filteredSamples = useMemo(() => {
// //     const lowerSearch = searchTerm.toLowerCase();

// //     return samples.filter((s) => {
// //       // 1. Search Query filter
// //       const matchesSearch =
// //         !searchTerm ||
// //         s.patient_name?.toLowerCase().includes(lowerSearch) ||
// //         s.mrn?.toLowerCase().includes(lowerSearch) ||
// //         (s.service_name || s.sample_name || "").toLowerCase().includes(lowerSearch) ||
// //         s.reference_no?.toLowerCase().includes(lowerSearch);

// //       // 2. Tab Filter
// //       let matchesTab = true;
// //       if (activeTab === "pending") {
// //         matchesTab = s.workflow_status === "TECH_REVIEW" || s.workflow_status === "PENDING" || !s.workflow_status;
// //         // matchesTab = s.workflow_status === "TECH_REVIEW";
// //       } else if (activeTab === "verified") {
// //         matchesTab = s.workflow_status === "VERIFIED";
// //       } else if (activeTab === "completed") {
// //         matchesTab = s.workflow_status === "COMPLETED";
// //       } else if (activeTab === "released") {
// //         matchesTab = s.workflow_status === "RELEASED";
// //       }

// //       // 3. Status filter (when activeTab is "all")
// //       const matchesStatus =
// //         activeTab !== "all" ||
// //         statusFilter === "ALL" ||
// //         (statusFilter === "PENDING" && (s.workflow_status === "PENDING" || !s.workflow_status)) ||
// //         s.workflow_status === statusFilter;

// //       // 4. Priority filter
// //       const matchesPriority =
// //         priorityFilter === "ALL" ||
// //         s.priority === priorityFilter;

// //       // 5. Service/Panel filter
// //       const matchesService =
// //         serviceFilter === "ALL" ||
// //         (s.service_name || s.sample_name) === serviceFilter;

// //       // 6. Date filter
// //       let matchesDate = true;
// //       const targetDateStr = dateTypeFilter === "collected_at" ? s.collected_at : s.ordered_at;
// //       if (dateFilter !== "ALL" && targetDateStr) {
// //         const orderDate = new Date(targetDateStr);
// //         const today = new Date();
// //         today.setHours(0, 0, 0, 0);

// //         if (dateFilter === "TODAY") {
// //           matchesDate = orderDate >= today;
// //         } else if (dateFilter === "YESTERDAY") {
// //           const yesterday = new Date(today);
// //           yesterday.setDate(yesterday.getDate() - 1);
// //           matchesDate = orderDate >= yesterday && orderDate < today;
// //         } else if (dateFilter === "WEEK") {
// //           const lastWeek = new Date(today);
// //           lastWeek.setDate(lastWeek.getDate() - 7);
// //           matchesDate = orderDate >= lastWeek;
// //         }
// //       }

// //       return matchesSearch && matchesTab && matchesStatus && matchesPriority && matchesService && matchesDate;
// //     });
// //   }, [samples, searchTerm, activeTab, statusFilter, priorityFilter, serviceFilter, dateFilter, dateTypeFilter]);

// //   const totalPages = Math.ceil(filteredSamples.length / itemsPerPage);
// //   const paginatedSamples = filteredSamples.slice(
// //     (currentPage - 1) * itemsPerPage,
// //     currentPage * itemsPerPage,
// //   );

// //   return (
// //     <div className="space-y-8 animate-in fade-in duration-500 pb-20">
// //       {/* Header and Sync Actions */}
// //       <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
// //         <div>
// //           <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
// //             Result Auditing & Verification
// //           </h2>
// //           <p className="text-slate-500 font-medium mt-1">
// //             Pathologist Portal: Review diagnostic profiles, approve clinical values, amend discrepancies, and dispatch final reports.
// //           </p>
// //         </div>
// //         <button
// //           onClick={fetchSamples}
// //           className="flex items-center gap-2 px-5 py-3 text-slate-700 bg-white border border-slate-200 rounded-2xl text-sm font-bold shadow-sm hover:shadow-md hover:bg-slate-50 transition-all self-end md:self-auto"
// //         >
// //           <RefreshCw size={16} /> Refresh Workspace
// //         </button>
// //       </div>

// //       {/* Audit Stats Dashboard */}
// //       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
// //         {/* Pending Card */}
// //         <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 rounded-3xl p-6 shadow-sm flex items-center justify-between relative overflow-hidden group">
// //           <div className="space-y-1 relative z-10">
// //             <p className="text-xs font-black uppercase text-purple-500 tracking-widest">Pending Verification</p>
// //             <h3 className="text-4xl font-black text-purple-900">{stats.totalPending}</h3>
// //             <p className="text-xs font-semibold text-purple-600">Awaiting pathologist approval</p>
// //           </div>
// //           <div className="p-4 bg-white/60 text-purple-600 rounded-2xl relative z-10 shadow-sm">
// //             <ShieldCheck size={28} />
// //           </div>
// //           <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-purple-200/20 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500" />
// //         </div>

// //         {/* Verified Card */}
// //         <div className="bg-gradient-to-br from-blue-50 to-sky-50 border border-blue-100 rounded-3xl p-6 shadow-sm flex items-center justify-between relative overflow-hidden group">
// //           <div className="space-y-1 relative z-10">
// //             <p className="text-xs font-black uppercase text-blue-500 tracking-widest">Verified (On Hold)</p>
// //             <h3 className="text-4xl font-black text-blue-900">{stats.totalVerified}</h3>
// //             <p className="text-xs font-semibold text-blue-600">Pending final release to EMR</p>
// //           </div>
// //           <div className="p-4 bg-white/60 text-blue-600 rounded-2xl relative z-10 shadow-sm">
// //             <CheckCircle2 size={28} />
// //           </div>
// //           <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-blue-200/20 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500" />
// //         </div>

// //         {/* Released Card */}
// //         <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-3xl p-6 shadow-sm flex items-center justify-between relative overflow-hidden group">
// //           <div className="space-y-1 relative z-10">
// //             <p className="text-xs font-black uppercase text-emerald-500 tracking-widest">Released Reports</p>
// //             <h3 className="text-4xl font-black text-emerald-900">{stats.totalReleased}</h3>
// //             <p className="text-xs font-semibold text-emerald-600">Completed & dispatched</p>
// //           </div>
// //           <div className="p-4 bg-white/60 text-emerald-600 rounded-2xl relative z-10 shadow-sm">
// //             <Send size={28} />
// //           </div>
// //           <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-emerald-200/20 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500" />
// //         </div>
// //       </div>

// //       {/* Main Panel */}
// //       <div className="bg-white border border-slate-200 rounded-[36px] shadow-sm overflow-hidden">
// //         {/* Toolbar & Filter Bar */}
// //         <div className="p-6 border-b border-slate-100 bg-slate-50/50 space-y-4">
// //           <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
// //             {/* Tab Selection */}
// //             <div className="flex items-center gap-1.5 p-1 bg-slate-200/50 rounded-2xl w-fit overflow-x-auto">
// //               <button
// //                 onClick={() => setActiveTab("pending")}
// //                 className={`px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === "pending"
// //                   ? "bg-white text-purple-600 shadow-sm border border-slate-200/50"
// //                   : "text-slate-500 hover:text-slate-800"
// //                   }`}
// //               >
// //                 Needs Verification ({stats.totalPending})
// //               </button>
// //               <button
// //                 onClick={() => setActiveTab("verified")}
// //                 className={`px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === "verified"
// //                   ? "bg-white text-blue-600 shadow-sm border border-slate-200/50"
// //                   : "text-slate-500 hover:text-slate-800"
// //                   }`}
// //               >
// //                 Verified ({stats.totalVerified})
// //               </button>
// //               <button
// //                 onClick={() => setActiveTab("completed")}
// //                 className={`px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === "completed"
// //                   ? "bg-white text-teal-600 shadow-sm border border-slate-200/50"
// //                   : "text-slate-500 hover:text-slate-800"
// //                   }`}
// //               >
// //                 Completed ({stats.totalCompleted})
// //               </button>
// //               <button
// //                 onClick={() => setActiveTab("released")}
// //                 className={`px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === "released"
// //                   ? "bg-white text-emerald-600 shadow-sm border border-slate-200/50"
// //                   : "text-slate-500 hover:text-slate-800"
// //                   }`}
// //               >
// //                 Released ({stats.totalReleased})
// //               </button>
// //               <button
// //                 onClick={() => setActiveTab("all")}
// //                 className={`px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === "all"
// //                   ? "bg-white text-slate-700 shadow-sm border border-slate-200/50"
// //                   : "text-slate-500 hover:text-slate-800"
// //                   }`}
// //               >
// //                 All Records
// //               </button>
// //             </div>

// //             {/* Search Inputs */}
// //             <div className="relative max-w-md w-full">
// //               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
// //               <input
// //                 type="text"
// //                 placeholder="Search by Patient, MRN, Ref No, Panel..."
// //                 className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all"
// //                 value={searchTerm}
// //                 onChange={(e) => setSearchTerm(e.target.value)}
// //               />
// //             </div>
// //           </div>

// //           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2">
// //             {/* Status Filter (Only active/meaningful if on "all" tab) */}
// //             <div className="flex flex-col gap-1.5">
// //               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Workflow Status</label>
// //               <select
// //                 className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all disabled:opacity-50 disabled:bg-slate-100"
// //                 value={statusFilter}
// //                 onChange={(e) => setStatusFilter(e.target.value)}
// //                 disabled={activeTab !== "all"}
// //               >
// //                 <option value="ALL">All Statuses</option>
// //                 <option value="PENDING">Pending Entry</option>
// //                 <option value="TECH_REVIEW">Tech Review</option>
// //                 <option value="VERIFIED">Verified</option>
// //                 <option value="RELEASED">Released/Dispatched</option>
// //                 <option value="REOPENED">Reopened</option>
// //               </select>
// //             </div>

// //             {/* Priority Filter */}
// //             <div className="flex flex-col gap-1.5">
// //               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Urgency</label>
// //               <select
// //                 className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all"
// //                 value={priorityFilter}
// //                 onChange={(e) => setPriorityFilter(e.target.value)}
// //               >
// //                 <option value="ALL">All Priorities</option>
// //                 <option value="Stat">Stat (Urgent)</option>
// //                 <option value="Routine">Routine</option>
// //               </select>
// //             </div>

// //             {/* Date Type Filter */}
// //             <div className="flex flex-col gap-1.5">
// //               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Date Type</label>
// //               <select
// //                 className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all"
// //                 value={dateTypeFilter}
// //                 onChange={(e) => setDateTypeFilter(e.target.value as "collected_at" | "ordered_at")}
// //               >
// //                 <option value="collected_at">Collected At</option>
// //                 <option value="ordered_at">Ordered At</option>
// //               </select>
// //             </div>

// //             {/* Date Filter */}
// //             <div className="flex flex-col gap-1.5">
// //               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Order Date</label>
// //               <select
// //                 className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all"
// //                 value={dateFilter}
// //                 onChange={(e) => setDateFilter(e.target.value)}
// //               >
// //                 <option value="ALL">All Dates</option>
// //                 <option value="TODAY">Today</option>
// //                 <option value="YESTERDAY">Yesterday</option>
// //                 <option value="WEEK">Last 7 Days</option>
// //               </select>
// //             </div>

// //             {/* Service/Panel Filter */}
// //             <div className="flex flex-col gap-1.5">
// //               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Service / Panel</label>
// //               <select
// //                 className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all"
// //                 value={serviceFilter}
// //                 onChange={(e) => setServiceFilter(e.target.value)}
// //               >
// //                 <option value="ALL">All Panels</option>
// //                 {uniqueServices.map((srv: any, idx) => (
// //                   <option key={idx} value={srv}>{srv}</option>
// //                 ))}
// //               </select>
// //             </div>
// //           </div>
// //         </div>

// //         {/* Data Table */}
// //         <div className="overflow-x-auto pb-32">
// //           <table className="w-full text-left border-collapse">
// //             <thead>
// //               <tr className="bg-slate-50 border-b border-slate-100">
// //                 <th className="p-5 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
// //                   Order / Ref No
// //                 </th>
// //                 <th className="p-5 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
// //                   Patient Context
// //                 </th>
// //                 <th className="p-5 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
// //                   Service / Panel
// //                 </th>
// //                 <th className="p-5 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
// //                   Dates
// //                 </th>
// //                 <th className="p-5 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
// //                   Workflow Status
// //                 </th>
// //                 <th className="p-5 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap text-right">
// //                   Actions
// //                 </th>
// //               </tr>
// //             </thead>
// //             <tbody className="divide-y divide-slate-100">
// //               {loading ? (
// //                 <tr>
// //                   <td colSpan={7} className="p-16 text-center">
// //                     <Loader2 className="animate-spin mx-auto text-purple-600 mb-2" size={28} />
// //                     <p className="text-sm text-slate-500 font-bold">Synchronizing ledger audit records...</p>
// //                   </td>
// //                 </tr>
// //               ) : paginatedSamples.length === 0 ? (
// //                 <tr>
// //                   <td colSpan={7} className="p-20 text-center">
// //                     <Microscope size={64} className="mx-auto text-slate-200 mb-4" />
// //                     <p className="text-xl font-black text-slate-700">No matching audit files</p>
// //                     <p className="text-sm text-slate-400 mt-1">Adjust filters or check back later</p>
// //                   </td>
// //                 </tr>
// //               ) : (
// //                 paginatedSamples.map((sample) => (
// //                   <tr key={sample.reference_no} className="hover:bg-slate-50/50 transition-colors group">
// //                     <td className="p-5">
// //                       <div className="flex flex-col">
// //                         <span className="text-sm font-black text-slate-800 tracking-tight">
// //                           {sample.reference_no || "-"}
// //                         </span>
// //                         <span className="text-[10px] font-mono font-bold text-slate-400 mt-0.5">
// //                           ID: {sample.id}
// //                         </span>
// //                       </div>
// //                     </td>
// //                     <td className="p-5">
// //                       <div className="flex flex-col">
// //                         <span className="text-sm font-black text-slate-800">
// //                           {sample.patient_name}
// //                         </span>
// //                         <div className="flex items-center gap-2 mt-0.5">
// //                           <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
// //                             MRN: {sample.mrn}
// //                           </span>
// //                         </div>
// //                       </div>
// //                     </td>
// //                     <td className="p-5">
// //                       <div className="flex flex-col">
// //                         <span className="text-sm font-bold text-slate-700">{sample.service_name || sample.sample_name}</span>
// //                         {sample.doctor_name && (
// //                           <div className="flex items-center gap-1 text-[10px] font-bold text-purple-600/80 bg-purple-50/50 w-fit px-1.5 py-0.5 rounded mt-1.5">
// //                             <Stethoscope size={10} />
// //                             {sample.doctor_name.replace(/^Dr\.?\s*/i, 'Dr. ')}
// //                           </div>
// //                         )}
// //                         {sample.summary && (
// //                           <span className="text-[10px] text-slate-400 font-semibold mt-0.5">
// //                             Total: {sample.summary.total_parameters} | Critical: {sample.summary.critical_results}
// //                           </span>
// //                         )}
// //                       </div>
// //                     </td>
// //                     <td className="p-5">
// //                       <div className="flex flex-col gap-1">
// //                         {sample.ordered_at && (
// //                           <div className="text-xs text-slate-600 font-medium">
// //                             <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Ordered</span>
// //                             {new Date(sample.ordered_at).toLocaleString()}
// //                           </div>
// //                         )}
// //                         {sample.collected_at && (
// //                           <div className="text-xs text-slate-600 font-medium mt-1">
// //                             <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Collected</span>
// //                             {new Date(sample.collected_at).toLocaleString()}
// //                           </div>
// //                         )}
// //                       </div>
// //                     </td>
// //                     <td className="p-5">
// //                       <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${sample.workflow_status === "RELEASED"
// //                         ? "bg-emerald-50 text-emerald-700 border-emerald-200"
// //                         : sample.workflow_status === "VERIFIED"
// //                           ? "bg-blue-50 text-blue-700 border-blue-200"
// //                           : sample.workflow_status === "TECH_REVIEW"
// //                             ? "bg-purple-50 text-purple-700 border-purple-200"
// //                             : sample.workflow_status === "REOPENED"
// //                               ? "bg-red-50 text-red-700 border-red-200"
// //                               : sample.workflow_status === "COMPLETED"
// //                                 ? "bg-teal-50 text-teal-700 border-teal-200"
// //                                 : "bg-amber-50 text-amber-700 border-amber-200"
// //                         }`}>
// //                         {sample.workflow_status === "TECH_REVIEW"
// //                           ? "Tech Review"
// //                           : sample.workflow_status === "RELEASED"
// //                             ? "Dispatched"
// //                             : (sample.workflow_status || "PENDING")}
// //                       </span>
// //                     </td>
// //                     <td className="p-5 text-right relative">
// //                       <div className="flex items-center justify-end gap-1.5">
// //                         <button
// //                           onClick={() => handleOpenDetailModal(sample)}
// //                           className="p-2 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all"
// //                           title="View Parameters"
// //                         >
// //                           <Eye size={18} />
// //                         </button>
// //                         <button
// //                           onClick={() => handlePrintPreview(sample)}
// //                           className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
// //                           title="Print Report"
// //                         >
// //                           <Printer size={18} />
// //                         </button>
// //                         <button
// //                           onClick={(e) => {
// //                             e.stopPropagation();
// //                             setActiveMenu(activeMenu === sample.reference_no ? null : sample.reference_no);
// //                           }}
// //                           className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
// //                         >
// //                           <SlidersHorizontal size={18} />
// //                         </button>
// //                       </div>

// //                       {/* Dropdown Menu */}
// //                       {activeMenu === sample.reference_no && (
// //                         <div className="absolute right-6 top-14 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 py-2.5 z-30 animate-in fade-in slide-in-from-top-2">
// //                           {/* Verify */}
// //                           {sample.workflow_status === "TECH_REVIEW" && (
// //                             <button
// //                               onClick={() => handleOpenVerifyModal(sample)}
// //                               className="w-full text-left px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-purple-600 flex items-center gap-2"
// //                             >
// //                               <ShieldCheck size={16} /> Audit & Verify
// //                             </button>
// //                           )}
// //                           {/* Complete */}
// //                           {sample.workflow_status === "VERIFIED" && (
// //                             <button
// //                               onClick={() => handleComplete(sample)}
// //                               className="w-full text-left px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-teal-600 flex items-center gap-2"
// //                             >
// //                               <CheckCircle2 size={16} /> Complete Result
// //                             </button>
// //                           )}
// //                           {/* Release */}
// //                           {sample.workflow_status === "COMPLETED" && (
// //                             <button
// //                               onClick={() => handleRelease(sample)}
// //                               className="w-full text-left px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-emerald-600 flex items-center gap-2"
// //                             >
// //                               <Send size={16} /> Release to Patient
// //                             </button>
// //                           )}
// //                           {/* Reopen */}
// //                           {sample.workflow_status && sample.workflow_status !== "RELEASED" && sample.workflow_status !== "PENDING" && (
// //                             <button
// //                               onClick={() => handleOpenReopenModal(sample)}
// //                               className="w-full text-left px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-amber-600 flex items-center gap-2"
// //                             >
// //                               <Undo size={16} /> Reopen / Correct
// //                             </button>
// //                           )}
// //                           {/* Amend */}
// //                           {sample.workflow_status && sample.workflow_status !== "PENDING" && (
// //                             <button
// //                               onClick={() => handleOpenAmendModal(sample)}
// //                               className="w-full text-left px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2"
// //                             >
// //                               <Edit3 size={16} /> Amend Values
// //                             </button>
// //                           )}
// //                         </div>
// //                       )}
// //                     </td>
// //                   </tr>
// //                 ))
// //               )}
// //             </tbody>
// //           </table>
// //         </div>

// //         {/* Pagination Footer */}
// //         {!loading && filteredSamples.length > 0 && (
// //           <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
// //             <span className="text-xs font-semibold text-slate-500">
// //               Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
// //               {Math.min(currentPage * itemsPerPage, filteredSamples.length)} of{" "}
// //               {filteredSamples.length} audits
// //             </span>
// //             <div className="flex items-center gap-2">
// //               <button
// //                 onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
// //                 disabled={currentPage === 1}
// //                 className="p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
// //               >
// //                 <ChevronLeft size={16} />
// //               </button>
// //               <span className="text-xs font-bold text-slate-700 px-3">
// //                 Page {currentPage} of {totalPages}
// //               </span>
// //               <button
// //                 onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
// //                 disabled={currentPage === totalPages}
// //                 className="p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
// //               >
// //                 <ChevronRight size={16} />
// //               </button>
// //             </div>
// //           </div>
// //         )}
// //       </div>

// //       {/* PORTALS & MODALS */}

// //       {/* 1. Detail View Modal */}
// //       {isDetailModalOpen &&
// //         selectedSample &&
// //         createPortal(
// //           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
// //             <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsDetailModalOpen(false)} />
// //             <div className="relative w-full max-w-3xl bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
// //               <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
// //                 <div className="flex items-center gap-4">
// //                   <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
// //                     <FileText size={22} />
// //                   </div>
// //                   <div>
// //                     <h3 className="text-lg font-black text-slate-800">Sample Results Auditing</h3>
// //                     <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{selectedSample.patient_name} • {selectedSample.reference_no}</p>
// //                   </div>
// //                 </div>
// //                 <button onClick={() => setIsDetailModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all">
// //                   <X size={20} />
// //                 </button>
// //               </div>

// //               <div className="p-6 overflow-y-auto flex-1 space-y-6">
// //                 {detailLoading ? (
// //                   <div className="py-20 text-center">
// //                     <Loader2 className="animate-spin mx-auto text-purple-600 mb-2" size={24} />
// //                     <p className="text-xs text-slate-400 font-bold">Synchronizing parameters...</p>
// //                   </div>
// //                 ) : detailedResult?.results ? (
// //                   <div className="border border-slate-200 rounded-2xl overflow-hidden">
// //                     <table className="w-full text-left">
// //                       <thead className="bg-slate-50 border-b border-slate-200">
// //                         <tr>
// //                           <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Parameter</th>
// //                           <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Result</th>
// //                           <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Unit</th>
// //                           <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Reference Range</th>
// //                           <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Interpretation</th>
// //                         </tr>
// //                       </thead>
// //                       <tbody className="divide-y divide-slate-100">
// //                         {detailedResult.results.map((res: ResultParameter) => (
// //                           <tr key={res.id} className="hover:bg-slate-50/50">
// //                             <td className="px-4 py-3 text-sm font-bold text-slate-800">{res.parameter_name}</td>
// //                             <td className="px-4 py-3 text-sm font-semibold text-slate-700">{res.result_value}</td>
// //                             <td className="px-4 py-3 text-sm text-slate-500">{res.unit || "-"}</td>
// //                             <td className="px-4 py-3 text-sm text-slate-500">{res.ref_low} - {res.ref_high}</td>
// //                             <td className="px-4 py-3">
// //                               <span className={`flag-badge ${getFlagBadgeClass(res.interpretation || res.flag_type)}`}>
// //                                 {getFlagLabel(res.interpretation || res.flag_type)}
// //                               </span>
// //                             </td>
// //                           </tr>
// //                         ))}
// //                       </tbody>
// //                     </table>
// //                   </div>
// //                 ) : (
// //                   <p className="text-center text-sm font-bold text-slate-400">Failed to render parameter schema.</p>
// //                 )}

// //                 {!detailLoading && detailedResult && (
// //                   <div className="space-y-4 mt-6">
// //                     {detailedResult.results?.[0]?.review_comment && (
// //                       <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-5 space-y-2">
// //                         <h5 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1.5">
// //                           <CheckCircle2 size={12} /> Technician / Doctor Review
// //                         </h5>
// //                         <p className="text-sm font-semibold text-slate-700 leading-relaxed">
// //                           "{detailedResult.results[0].review_comment}"
// //                         </p>
// //                         <div className="flex items-center gap-4 text-[10px] text-slate-400 font-bold">
// //                           <span>Reviewed By: {detailedResult.results[0].reviewed_by_name || "Staff"}</span>
// //                           {detailedResult.results[0].reviewed_at && (
// //                             <span>Date: {new Date(detailedResult.results[0].reviewed_at).toLocaleString()}</span>
// //                           )}
// //                         </div>
// //                       </div>
// //                     )}

// //                     {detailedResult.results?.[0]?.verification_comment && (
// //                       <div className="bg-purple-50/50 border border-purple-100 rounded-2xl p-5 space-y-2">
// //                         <h5 className="text-[10px] font-black text-purple-600 uppercase tracking-widest flex items-center gap-1.5">
// //                           <ShieldCheck size={12} /> Pathologist Verification
// //                         </h5>
// //                         <p className="text-sm font-semibold text-slate-700 leading-relaxed">
// //                           "{detailedResult.results[0].verification_comment}"
// //                         </p>
// //                         <div className="flex items-center gap-4 text-[10px] text-slate-400 font-bold">
// //                           <span>Verified By: {detailedResult.results[0].verified_by_name || "Pathologist"}</span>
// //                           {detailedResult.results[0].verified_at && (
// //                             <span>Date: {new Date(detailedResult.results[0].verified_at).toLocaleString()}</span>
// //                           )}
// //                         </div>
// //                       </div>
// //                     )}
// //                   </div>
// //                 )}
// //               </div>

// //               <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end">
// //                 <button onClick={() => setIsDetailModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
// //                   Close Audit
// //                 </button>
// //               </div>
// //             </div>
// //           </div>,
// //           document.body,
// //         )}

// //       {/* 2. Pathologist Verification Modal */}
// //       {isVerifyModalOpen &&
// //         selectedSample &&
// //         createPortal(
// //           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
// //             <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsVerifyModalOpen(false)} />
// //             <div className="relative w-full max-w-3xl bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
// //               <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
// //                 <div className="flex items-center gap-4">
// //                   <div className="w-12 h-12 rounded-xl bg-purple-600 text-white flex items-center justify-center">
// //                     <ShieldCheck size={22} />
// //                   </div>
// //                   <div>
// //                     <h3 className="text-lg font-black text-slate-800">Verify Laboratory Results</h3>
// //                     <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{selectedSample.patient_name} • {selectedSample.reference_no}</p>
// //                   </div>
// //                 </div>
// //                 <button onClick={() => setIsVerifyModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all">
// //                   <X size={20} />
// //                 </button>
// //               </div>

// //               <div className="p-6 overflow-y-auto flex-1 space-y-6">
// //                 {/* Result Parameters table preview */}
// //                 {detailLoading ? (
// //                   <div className="py-10 text-center">
// //                     <Loader2 className="animate-spin mx-auto text-purple-600 mb-2" size={24} />
// //                     <p className="text-xs text-slate-400 font-bold">Synchronizing parameters...</p>
// //                   </div>
// //                 ) : detailedResult?.results ? (
// //                   <div className="border border-slate-200 rounded-2xl overflow-hidden">
// //                     <table className="w-full text-left">
// //                       <thead className="bg-slate-50 border-b border-slate-200">
// //                         <tr>
// //                           <th className="px-4 py-2.5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Parameter</th>
// //                           <th className="px-4 py-2.5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Result</th>
// //                           <th className="px-4 py-2.5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Interpretation</th>
// //                         </tr>
// //                       </thead>
// //                       <tbody className="divide-y divide-slate-100">
// //                         {detailedResult.results.map((res: ResultParameter) => (
// //                           <tr key={res.id}>
// //                             <td className="px-4 py-2 text-xs font-bold text-slate-800">{res.parameter_name}</td>
// //                             <td className="px-4 py-2 text-xs font-semibold text-slate-700">{res.result_value} {res.unit}</td>
// //                             <td className="px-4 py-2">
// //                               <span className={`flag-badge ${getFlagBadgeClass(res.interpretation || res.flag_type)}`}>
// //                                 {getFlagLabel(res.interpretation || res.flag_type)}
// //                               </span>
// //                             </td>
// //                           </tr>
// //                         ))}
// //                       </tbody>
// //                     </table>
// //                   </div>
// //                 ) : null}

// //                 {/* Comment Area */}
// //                 <div className="space-y-2">
// //                   <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Pathologist Verification Comment</label>
// //                   <textarea
// //                     rows={3}
// //                     placeholder="Enter audit/verification notes here..."
// //                     className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10 transition-all"
// //                     value={verificationComment}
// //                     onChange={(e) => setVerificationComment(e.target.value)}
// //                   />
// //                 </div>
// //               </div>

// //               <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
// //                 <span className="text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100 font-bold flex items-center gap-1.5">
// //                   <AlertCircle size={14} /> Confirms clinical approval
// //                 </span>
// //                 <div className="flex items-center gap-3">
// //                   <button
// //                     onClick={() => setIsVerifyModalOpen(false)}
// //                     className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
// //                   >
// //                     Cancel
// //                   </button>
// //                   <button
// //                     onClick={() => handleComplete()}
// //                     disabled={isActionSubmitting}
// //                     className="px-5 py-2.5 text-sm font-bold text-white bg-teal-600 rounded-xl hover:bg-teal-700 shadow-lg shadow-teal-100 transition-all flex items-center gap-1.5 disabled:opacity-50"
// //                   >
// //                     {isActionSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
// //                     Complete Result
// //                   </button>
// //                   <button
// //                     onClick={handleVerify}
// //                     disabled={isActionSubmitting}
// //                     className="px-5 py-2.5 text-sm font-bold text-white bg-purple-600 rounded-xl hover:bg-purple-700 shadow-lg shadow-purple-100 transition-all flex items-center gap-1.5 disabled:opacity-50"
// //                   >
// //                     {isActionSubmitting ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
// //                     Verify Report
// //                   </button>
// //                 </div>
// //               </div>
// //             </div>
// //           </div>,
// //           document.body,
// //         )}

// //       {/* 3. Reopen Modal */}
// //       {isReopenModalOpen &&
// //         selectedSample &&
// //         createPortal(
// //           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
// //             <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsReopenModalOpen(false)} />
// //             <div className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
// //               <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
// //                 <div className="flex items-center gap-4">
// //                   <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
// //                     <Undo size={22} />
// //                   </div>
// //                   <div>
// //                     <h3 className="text-lg font-black text-slate-800">Reopen Lab Result</h3>
// //                     <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{selectedSample.reference_no}</p>
// //                   </div>
// //                 </div>
// //                 <button onClick={() => setIsReopenModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all">
// //                   <X size={20} />
// //                 </button>
// //               </div>

// //               <div className="p-6 space-y-4">
// //                 <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
// //                   <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={18} />
// //                   <p className="text-xs text-amber-800 font-semibold leading-relaxed">
// //                     Reopening will reset the status of this result and return it to Draft/Pending status. You must provide a valid correction or retesting reason.
// //                   </p>
// //                 </div>

// //                 <div className="space-y-2">
// //                   <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Reason for Reopening</label>
// //                   <textarea
// //                     rows={3}
// //                     placeholder="Enter reason (e.g., Update result value, incorrect parameter input)..."
// //                     className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/10 transition-all"
// //                     value={reopenReason}
// //                     onChange={(e) => setReopenReason(e.target.value)}
// //                   />
// //                 </div>
// //               </div>

// //               <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
// //                 <button
// //                   onClick={() => setIsReopenModalOpen(false)}
// //                   className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
// //                 >
// //                   Cancel
// //                 </button>
// //                 <button
// //                   onClick={handleReopen}
// //                   disabled={isActionSubmitting}
// //                   className="px-5 py-2.5 text-sm font-bold text-white bg-amber-600 rounded-xl hover:bg-amber-700 shadow-lg shadow-amber-100 transition-all flex items-center gap-1.5 disabled:opacity-50"
// //                 >
// //                   {isActionSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Undo size={16} />}
// //                   Confirm Reopen
// //                 </button>
// //               </div>
// //             </div>
// //           </div>,
// //           document.body,
// //         )}

// //       {/* 4. Amend Results Modal */}
// //       {isAmendModalOpen &&
// //         selectedSample &&
// //         createPortal(
// //           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
// //             <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsAmendModalOpen(false)} />
// //             <div className="relative w-full max-w-3xl bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
// //               <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
// //                 <div className="flex items-center gap-4">
// //                   <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
// //                     <Edit3 size={22} />
// //                   </div>
// //                   <div>
// //                     <h3 className="text-lg font-black text-slate-800">Amend Result Values</h3>
// //                     <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{selectedSample.patient_name} • {selectedSample.reference_no}</p>
// //                   </div>
// //                 </div>
// //                 <button onClick={() => setIsAmendModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all">
// //                   <X size={20} />
// //                 </button>
// //               </div>

// //               <div className="p-6 overflow-y-auto flex-1 space-y-6">
// //                 {detailLoading ? (
// //                   <div className="py-10 text-center">
// //                     <Loader2 className="animate-spin mx-auto text-indigo-600 mb-2" size={24} />
// //                     <p className="text-xs text-slate-400 font-bold">Synchronizing parameters...</p>
// //                   </div>
// //                 ) : detailedResult?.results ? (
// //                   <div className="space-y-6">
// //                     <div className="border border-slate-200 rounded-2xl overflow-hidden">
// //                       <table className="w-full text-left">
// //                         <thead className="bg-slate-50 border-b border-slate-200">
// //                           <tr>
// //                             <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Parameter</th>
// //                             <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Unit</th>
// //                             <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Reference Range</th>
// //                             <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest w-40">Amended Value</th>
// //                           </tr>
// //                         </thead>
// //                         <tbody className="divide-y divide-slate-100">
// //                           {detailedResult.results.map((res: ResultParameter) => (
// //                             <tr key={res.id}>
// //                               <td className="px-4 py-3 text-sm font-bold text-slate-800">{res.parameter_name}</td>
// //                               <td className="px-4 py-3 text-sm text-slate-500">{res.unit}</td>
// //                               <td className="px-4 py-3 text-sm text-slate-500">{res.ref_low} - {res.ref_high}</td>
// //                               <td className="px-4 py-3">
// //                                 <input
// //                                   type="text"
// //                                   className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:bg-white focus:border-indigo-500 transition-all"
// //                                   value={amendedValues[res.parameter_id] ?? ""}
// //                                   onChange={(e) =>
// //                                     setAmendedValues({
// //                                       ...amendedValues,
// //                                       [res.parameter_id]: e.target.value,
// //                                     })
// //                                   }
// //                                 />
// //                               </td>
// //                             </tr>
// //                           ))}
// //                         </tbody>
// //                       </table>
// //                     </div>

// //                     {/* Amendment Reason */}
// //                     <div className="space-y-2">
// //                       <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Amendment Reason</label>
// //                       <textarea
// //                         rows={2}
// //                         placeholder="Provide reasoning (e.g., correction of calibration, manual validation correction)..."
// //                         className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all"
// //                         value={amendmentReason}
// //                         onChange={(e) => setAmendmentReason(e.target.value)}
// //                       />
// //                     </div>
// //                   </div>
// //                 ) : null}
// //               </div>

// //               <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
// //                 <button
// //                   onClick={() => setIsAmendModalOpen(false)}
// //                   className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
// //                 >
// //                   Cancel
// //                 </button>
// //                 <button
// //                   onClick={handleAmend}
// //                   disabled={isActionSubmitting}
// //                   className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all flex items-center gap-1.5 disabled:opacity-50"
// //                 >
// //                   {isActionSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Edit3 size={16} />}
// //                   Save Amendment
// //                 </button>
// //               </div>
// //             </div>
// //           </div>,
// //           document.body,
// //         )}
// //     </div>
// //   );
// // };

// // export default LabVerification;


// // import React, { useState, useEffect, useMemo } from "react";
// // import {
// //   Search,
// //   CheckCircle2,
// //   Microscope,
// //   X,
// //   AlertCircle,
// //   Loader2,
// //   Eye,
// //   Edit3,
// //   Printer,
// //   Undo,
// //   FileText,
// //   RefreshCw,
// //   SlidersHorizontal,
// //   ChevronLeft,
// //   ChevronRight,
// //   ShieldCheck,
// //   Send,
// //   Activity,
// //   Stethoscope,
// // } from "lucide-react";
// // import { labService } from "../services/lab.service";
// // import { useNotification } from "../context/NotificationContext";
// // import { createPortal } from "react-dom";
// // import { getFlagBadgeClass, getFlagLabel } from "../utils/flagColors";

// // interface ResultParameter {
// //   id: number;
// //   parameter_id: number;
// //   parameter_name: string;
// //   result_value: string;
// //   unit: string;
// //   ref_low: string;
// //   ref_high: string;
// //   flagged?: string;
// //   interpretation?: string;
// //   workflow_status: string;
// //   verified_at?: string | null;
// //   released_at?: string | null;
// //   verification_comment?: string | null;
// // }

// // const LabVerification: React.FC = () => {
// //   const { notify } = useNotification();
// //   const [samples, setSamples] = useState<any[]>([]);
// //   const [loading, setLoading] = useState(true);
// //   const [searchTerm, setSearchTerm] = useState("");
// //   const [activeMenu, setActiveMenu] = useState<number | null>(null);

// //   // Filters
// //   const [statusFilter, setStatusFilter] = useState<string>("ALL");
// //   const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
// //   const [dateFilter, setDateFilter] = useState<string>("ALL");
// //   const [dateTypeFilter, setDateTypeFilter] = useState<"collected_at" | "ordered_at">("collected_at");
// //   const [serviceFilter, setServiceFilter] = useState<string>("ALL");

// //   // Navigation Tabs: 'pending' | 'verified' | 'completed' | 'released' | 'all'
// //   const [activeTab, setActiveTab] = useState<"pending" | "verified" | "completed" | "released" | "all">("pending");

// //   // Pagination
// //   const [currentPage, setCurrentPage] = useState(1);
// //   const itemsPerPage = 10;

// //   // Modals
// //   const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
// //   const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
// //   const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);
// //   const [isAmendModalOpen, setIsAmendModalOpen] = useState(false);

// //   const [selectedSample, setSelectedSample] = useState<any | null>(null);
// //   const [detailedResult, setDetailedResult] = useState<any | null>(null);
// //   const [detailLoading, setDetailLoading] = useState(false);
// //   const [isActionSubmitting, setIsActionSubmitting] = useState(false);

// //   // Input states for pathologist actions
// //   const [verificationComment, setVerificationComment] = useState("");
// //   const [reopenReason, setReopenReason] = useState("");
// //   const [amendmentReason, setAmendmentReason] = useState("");
// //   const [amendedValues, setAmendedValues] = useState<Record<number, string>>({}); // parameter_id -> new value

// //   const fetchSamples = async () => {
// //     setLoading(true);
// //     try {
// //       const data = await labService.getSamples();
// //       setSamples(data);
// //     } catch (err: any) {
// //       notify(err.response?.data?.message || "Failed to load laboratory samples", "error");
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   useEffect(() => {
// //     fetchSamples();
// //   }, []);

// //   // Reset page count on filter changes
// //   useEffect(() => {
// //     setCurrentPage(1);
// //   }, [searchTerm, activeTab, statusFilter, priorityFilter, dateFilter, dateTypeFilter, serviceFilter]);

// //   // Close context dropdown on outside click
// //   useEffect(() => {
// //     const handleClickOutside = () => setActiveMenu(null);
// //     document.addEventListener("click", handleClickOutside);
// //     return () => document.removeEventListener("click", handleClickOutside);
// //   }, []);

// //   // Fetch detailed data for a specific sample
// //   const fetchSampleDetail = async (sample: any) => {
// //     setDetailLoading(true);
// //     try {
// //       const details = await labService.getResultByRef(sample.reference_no);
// //       setDetailedResult(details);
// //       // Pre-populate amendment values
// //       if (details?.results) {
// //         const initialAmended: Record<number, string> = {};
// //         details.results.forEach((r: any) => {
// //           initialAmended[r.parameter_id] = r.result_value;
// //         });
// //         setAmendedValues(initialAmended);
// //       }
// //     } catch (err: any) {
// //       notify(err.response?.data?.message || "Failed to load result details", "error");
// //     } finally {
// //       setDetailLoading(false);
// //     }
// //   };

// //   const handleOpenDetailModal = (sample: any) => {
// //     setSelectedSample(sample);
// //     setDetailedResult(null);
// //     setIsDetailModalOpen(true);
// //     fetchSampleDetail(sample);
// //   };

// //   const handleOpenVerifyModal = (sample: any) => {
// //     setSelectedSample(sample);
// //     setDetailedResult(null);
// //     setVerificationComment("");
// //     setIsVerifyModalOpen(true);
// //     fetchSampleDetail(sample);
// //   };

// //   const handleOpenReopenModal = (sample: any) => {
// //     setSelectedSample(sample);
// //     setReopenReason("");
// //     setIsReopenModalOpen(true);
// //   };

// //   const handleOpenAmendModal = (sample: any) => {
// //     setSelectedSample(sample);
// //     setDetailedResult(null);
// //     setAmendmentReason("");
// //     setIsAmendModalOpen(true);
// //     fetchSampleDetail(sample);
// //   };

// //   // Action: Verify Result
// //   const handleVerify = async () => {
// //     if (!selectedSample) return;
// //     setIsActionSubmitting(true);
// //     try {
// //       await labService.verifyResult({
// //         reference_no: selectedSample.reference_no,
// //         comment: verificationComment || "Verified by Pathologist",
// //       });
// //       notify("Laboratory results successfully verified", "success");
// //       setIsVerifyModalOpen(false);
// //       fetchSamples();
// //     } catch (err: any) {
// //       notify(err.response?.data?.message || "Failed to verify results", "error");
// //     } finally {
// //       setIsActionSubmitting(false);
// //     }
// //   };

// //   // Action: Complete Result
// //   const handleComplete = async (sampleOverride?: any) => {
// //     const sample = sampleOverride || selectedSample;
// //     if (!sample) return;
// //     setIsActionSubmitting(true);
// //     try {
// //       await labService.completeResult(sample.reference_no);
// //       notify("Laboratory results successfully completed", "success");
// //       setIsVerifyModalOpen(false);
// //       fetchSamples();
// //     } catch (err: any) {
// //       notify(err.response?.data?.message || "Failed to complete results", "error");
// //     } finally {
// //       setIsActionSubmitting(false);
// //     }
// //   };

// //   // Action: Reopen Result
// //   const handleReopen = async () => {
// //     if (!selectedSample) return;
// //     if (!reopenReason.trim()) {
// //       notify("Please provide a reason for reopening the results", "warning");
// //       return;
// //     }
// //     setIsActionSubmitting(true);
// //     try {
// //       await labService.reopenResult({
// //         reference_no: selectedSample.reference_no,
// //         reason: reopenReason,
// //       });
// //       notify("Laboratory results status successfully set to Reopened", "success");
// //       setIsReopenModalOpen(false);
// //       fetchSamples();
// //     } catch (err: any) {
// //       notify(err.response?.data?.message || "Failed to reopen results", "error");
// //     } finally {
// //       setIsActionSubmitting(false);
// //     }
// //   };

// //   // Action: Release Result
// //   const handleRelease = async (sample: any) => {
// //     if (!window.confirm(`Are you sure you want to release the verified report for ${sample.patient_name}?`)) {
// //       return;
// //     }
// //     setLoading(true);
// //     try {
// //       await labService.releaseResult({
// //         reference_no: sample.reference_no,
// //       });
// //       notify("Laboratory report released and published to EMR successfully", "success");
// //       fetchSamples();
// //     } catch (err: any) {
// //       notify(err.response?.data?.message || "Failed to release results", "error");
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   // Action: Amend Results
// //   const handleAmend = async () => {
// //     if (!selectedSample || !detailedResult) return;
// //     if (!amendmentReason.trim()) {
// //       notify("Please provide a reason for result amendment", "warning");
// //       return;
// //     }

// //     const modifiedParams = Object.keys(amendedValues).map((paramIdStr) => {
// //       const paramId = Number(paramIdStr);
// //       return {
// //         parameter_id: paramId,
// //         result_value: amendedValues[paramId],
// //       };
// //     });

// //     setIsActionSubmitting(true);
// //     try {
// //       await labService.amendResult({
// //         reference_no: selectedSample.reference_no,
// //         reason: amendmentReason,
// //         results: modifiedParams,
// //       });
// //       notify("Laboratory results amended and updated successfully", "success");
// //       setIsAmendModalOpen(false);
// //       fetchSamples();
// //     } catch (err: any) {
// //       notify(err.response?.data?.message || "Failed to amend results", "error");
// //     } finally {
// //       setIsActionSubmitting(false);
// //     }
// //   };

// //   const handlePrintPreview = (sample: any) => {
// //     const url = `/print/lab/${sample.reference_no}`;
// //     window.open(url, "_blank");
// //   };

// //   // Statistics Computations
// //   const stats = useMemo(() => {
// //     const totalPending = samples.filter(
// //       (s) => s.workflow_status === "TECH_REVIEW"
// //     ).length;
// //     const totalVerified = samples.filter(
// //       (s) => s.workflow_status === "VERIFIED"
// //     ).length;
// //     const totalCompleted = samples.filter(
// //       (s) => s.workflow_status === "COMPLETED"
// //     ).length;
// //     const totalReleased = samples.filter(
// //       (s) => s.workflow_status === "RELEASED"
// //     ).length;
// //     return { totalPending, totalVerified, totalCompleted, totalReleased };
// //   }, [samples]);

// //   const uniqueServices = useMemo(() => {
// //     const services = samples.map((s) => s.service_name || s.sample_name).filter(Boolean);
// //     return Array.from(new Set(services));
// //   }, [samples]);

// //   // Tab Filtering & Query Searches
// //   const filteredSamples = useMemo(() => {
// //     const lowerSearch = searchTerm.toLowerCase();

// //     return samples.filter((s) => {
// //       // 1. Search Query filter
// //       const matchesSearch =
// //         !searchTerm ||
// //         s.patient_name?.toLowerCase().includes(lowerSearch) ||
// //         s.mrn?.toLowerCase().includes(lowerSearch) ||
// //         (s.service_name || s.sample_name || "").toLowerCase().includes(lowerSearch) ||
// //         s.reference_no?.toLowerCase().includes(lowerSearch);

// //       // 2. Tab Filter
// //       let matchesTab = true;
// //       if (activeTab === "pending") {
// //         matchesTab = s.workflow_status === "TECH_REVIEW";
// //       } else if (activeTab === "verified") {
// //         matchesTab = s.workflow_status === "VERIFIED";
// //       } else if (activeTab === "completed") {
// //         matchesTab = s.workflow_status === "COMPLETED";
// //       } else if (activeTab === "released") {
// //         matchesTab = s.workflow_status === "RELEASED";
// //       }

// //       // 3. Status filter (when activeTab is "all")
// //       const matchesStatus =
// //         activeTab !== "all" ||
// //         statusFilter === "ALL" ||
// //         (statusFilter === "PENDING" && (s.workflow_status === "PENDING" || !s.workflow_status)) ||
// //         s.workflow_status === statusFilter;

// //       // 4. Priority filter
// //       const matchesPriority =
// //         priorityFilter === "ALL" ||
// //         s.priority === priorityFilter;

// //       // 5. Service/Panel filter
// //       const matchesService =
// //         serviceFilter === "ALL" ||
// //         (s.service_name || s.sample_name) === serviceFilter;

// //       // 6. Date filter
// //       let matchesDate = true;
// //       const targetDateStr = dateTypeFilter === "collected_at" ? s.collected_at : s.ordered_at;
// //       if (dateFilter !== "ALL" && targetDateStr) {
// //         const orderDate = new Date(targetDateStr);
// //         const today = new Date();
// //         today.setHours(0, 0, 0, 0);

// //         if (dateFilter === "TODAY") {
// //           matchesDate = orderDate >= today;
// //         } else if (dateFilter === "YESTERDAY") {
// //           const yesterday = new Date(today);
// //           yesterday.setDate(yesterday.getDate() - 1);
// //           matchesDate = orderDate >= yesterday && orderDate < today;
// //         } else if (dateFilter === "WEEK") {
// //           const lastWeek = new Date(today);
// //           lastWeek.setDate(lastWeek.getDate() - 7);
// //           matchesDate = orderDate >= lastWeek;
// //         }
// //       }

// //       return matchesSearch && matchesTab && matchesStatus && matchesPriority && matchesService && matchesDate;
// //     });
// //   }, [samples, searchTerm, activeTab, statusFilter, priorityFilter, serviceFilter, dateFilter, dateTypeFilter]);

// //   const totalPages = Math.ceil(filteredSamples.length / itemsPerPage);
// //   const paginatedSamples = filteredSamples.slice(
// //     (currentPage - 1) * itemsPerPage,
// //     currentPage * itemsPerPage,
// //   );

// //   return (
// //     <div className="space-y-8 animate-in fade-in duration-500 pb-20">
// //       {/* Header and Sync Actions */}
// //       <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
// //         <div>
// //           <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
// //             Result Auditing & Verification
// //           </h2>
// //           <p className="text-slate-500 font-medium mt-1">
// //             Pathologist Portal: Review diagnostic profiles, approve clinical values, amend discrepancies, and dispatch final reports.
// //           </p>
// //         </div>
// //         <button
// //           onClick={fetchSamples}
// //           className="flex items-center gap-2 px-5 py-3 text-slate-700 bg-white border border-slate-200 rounded-2xl text-sm font-bold shadow-sm hover:shadow-md hover:bg-slate-50 transition-all self-end md:self-auto"
// //         >
// //           <RefreshCw size={16} /> Refresh Workspace
// //         </button>
// //       </div>

// //       {/* Audit Stats Dashboard */}
// //       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
// //         {/* Pending Card */}
// //         <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 rounded-3xl p-6 shadow-sm flex items-center justify-between relative overflow-hidden group">
// //           <div className="space-y-1 relative z-10">
// //             <p className="text-xs font-black uppercase text-purple-500 tracking-widest">Pending Verification</p>
// //             <h3 className="text-4xl font-black text-purple-900">{stats.totalPending}</h3>
// //             <p className="text-xs font-semibold text-purple-600">Awaiting pathologist approval</p>
// //           </div>
// //           <div className="p-4 bg-white/60 text-purple-600 rounded-2xl relative z-10 shadow-sm">
// //             <ShieldCheck size={28} />
// //           </div>
// //           <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-purple-200/20 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500" />
// //         </div>

// //         {/* Verified Card */}
// //         <div className="bg-gradient-to-br from-blue-50 to-sky-50 border border-blue-100 rounded-3xl p-6 shadow-sm flex items-center justify-between relative overflow-hidden group">
// //           <div className="space-y-1 relative z-10">
// //             <p className="text-xs font-black uppercase text-blue-500 tracking-widest">Verified (On Hold)</p>
// //             <h3 className="text-4xl font-black text-blue-900">{stats.totalVerified}</h3>
// //             <p className="text-xs font-semibold text-blue-600">Pending final release to EMR</p>
// //           </div>
// //           <div className="p-4 bg-white/60 text-blue-600 rounded-2xl relative z-10 shadow-sm">
// //             <CheckCircle2 size={28} />
// //           </div>
// //           <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-blue-200/20 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500" />
// //         </div>

// //         {/* Released Card */}
// //         <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-3xl p-6 shadow-sm flex items-center justify-between relative overflow-hidden group">
// //           <div className="space-y-1 relative z-10">
// //             <p className="text-xs font-black uppercase text-emerald-500 tracking-widest">Released Reports</p>
// //             <h3 className="text-4xl font-black text-emerald-900">{stats.totalReleased}</h3>
// //             <p className="text-xs font-semibold text-emerald-600">Completed & dispatched</p>
// //           </div>
// //           <div className="p-4 bg-white/60 text-emerald-600 rounded-2xl relative z-10 shadow-sm">
// //             <Send size={28} />
// //           </div>
// //           <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-emerald-200/20 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500" />
// //         </div>
// //       </div>

// //       {/* Main Panel */}
// //       <div className="bg-white border border-slate-200 rounded-[36px] shadow-sm overflow-hidden">
// //         {/* Toolbar & Filter Bar */}
// //         <div className="p-6 border-b border-slate-100 bg-slate-50/50 space-y-4">
// //           <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
// //             {/* Tab Selection */}
// //             <div className="flex items-center gap-1.5 p-1 bg-slate-200/50 rounded-2xl w-fit overflow-x-auto">
// //               <button
// //                 onClick={() => setActiveTab("pending")}
// //                 className={`px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === "pending"
// //                   ? "bg-white text-purple-600 shadow-sm border border-slate-200/50"
// //                   : "text-slate-500 hover:text-slate-800"
// //                   }`}
// //               >
// //                 Needs Verification ({stats.totalPending})
// //               </button>
// //               <button
// //                 onClick={() => setActiveTab("verified")}
// //                 className={`px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === "verified"
// //                   ? "bg-white text-blue-600 shadow-sm border border-slate-200/50"
// //                   : "text-slate-500 hover:text-slate-800"
// //                   }`}
// //               >
// //                 Verified ({stats.totalVerified})
// //               </button>
// //               <button
// //                 onClick={() => setActiveTab("completed")}
// //                 className={`px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === "completed"
// //                   ? "bg-white text-teal-600 shadow-sm border border-slate-200/50"
// //                   : "text-slate-500 hover:text-slate-800"
// //                   }`}
// //               >
// //                 Completed ({stats.totalCompleted})
// //               </button>
// //               <button
// //                 onClick={() => setActiveTab("released")}
// //                 className={`px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === "released"
// //                   ? "bg-white text-emerald-600 shadow-sm border border-slate-200/50"
// //                   : "text-slate-500 hover:text-slate-800"
// //                   }`}
// //               >
// //                 Released ({stats.totalReleased})
// //               </button>
// //               <button
// //                 onClick={() => setActiveTab("all")}
// //                 className={`px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === "all"
// //                   ? "bg-white text-slate-700 shadow-sm border border-slate-200/50"
// //                   : "text-slate-500 hover:text-slate-800"
// //                   }`}
// //               >
// //                 All Records
// //               </button>
// //             </div>

// //             {/* Search Inputs */}
// //             <div className="relative max-w-md w-full">
// //               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
// //               <input
// //                 type="text"
// //                 placeholder="Search by Patient, MRN, Ref No, Panel..."
// //                 className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all"
// //                 value={searchTerm}
// //                 onChange={(e) => setSearchTerm(e.target.value)}
// //               />
// //             </div>
// //           </div>

// //           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2">
// //             {/* Status Filter (Only active/meaningful if on "all" tab) */}
// //             <div className="flex flex-col gap-1.5">
// //               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Workflow Status</label>
// //               <select
// //                 className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all disabled:opacity-50 disabled:bg-slate-100"
// //                 value={statusFilter}
// //                 onChange={(e) => setStatusFilter(e.target.value)}
// //                 disabled={activeTab !== "all"}
// //               >
// //                 <option value="ALL">All Statuses</option>
// //                 <option value="PENDING">Pending Entry</option>
// //                 <option value="TECH_REVIEW">Tech Review</option>
// //                 <option value="VERIFIED">Verified</option>
// //                 <option value="RELEASED">Released/Dispatched</option>
// //                 <option value="REOPENED">Reopened</option>
// //               </select>
// //             </div>

// //             {/* Priority Filter */}
// //             <div className="flex flex-col gap-1.5">
// //               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Urgency</label>
// //               <select
// //                 className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all"
// //                 value={priorityFilter}
// //                 onChange={(e) => setPriorityFilter(e.target.value)}
// //               >
// //                 <option value="ALL">All Priorities</option>
// //                 <option value="Stat">Stat (Urgent)</option>
// //                 <option value="Routine">Routine</option>
// //               </select>
// //             </div>

// //             {/* Date Type Filter */}
// //             <div className="flex flex-col gap-1.5">
// //               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Date Type</label>
// //               <select
// //                 className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all"
// //                 value={dateTypeFilter}
// //                 onChange={(e) => setDateTypeFilter(e.target.value as "collected_at" | "ordered_at")}
// //               >
// //                 <option value="collected_at">Collected At</option>
// //                 <option value="ordered_at">Ordered At</option>
// //               </select>
// //             </div>

// //             {/* Date Filter */}
// //             <div className="flex flex-col gap-1.5">
// //               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Order Date</label>
// //               <select
// //                 className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all"
// //                 value={dateFilter}
// //                 onChange={(e) => setDateFilter(e.target.value)}
// //               >
// //                 <option value="ALL">All Dates</option>
// //                 <option value="TODAY">Today</option>
// //                 <option value="YESTERDAY">Yesterday</option>
// //                 <option value="WEEK">Last 7 Days</option>
// //               </select>
// //             </div>

// //             {/* Service/Panel Filter */}
// //             <div className="flex flex-col gap-1.5">
// //               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Service / Panel</label>
// //               <select
// //                 className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all"
// //                 value={serviceFilter}
// //                 onChange={(e) => setServiceFilter(e.target.value)}
// //               >
// //                 <option value="ALL">All Panels</option>
// //                 {uniqueServices.map((srv, idx) => (
// //                   <option key={idx} value={srv}>{srv}</option>
// //                 ))}
// //               </select>
// //             </div>
// //           </div>
// //         </div>

// //         {/* Data Table */}
// //         <div className="overflow-x-auto pb-32">
// //           <table className="w-full text-left border-collapse">
// //             <thead>
// //               <tr className="bg-slate-50 border-b border-slate-100">
// //                 <th className="p-5 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
// //                   Order / Ref No
// //                 </th>
// //                 <th className="p-5 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
// //                   Patient Context
// //                 </th>
// //                 <th className="p-5 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
// //                   Service / Panel
// //                 </th>
// //                 <th className="p-5 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
// //                   Dates
// //                 </th>
// //                 {/* <th className="p-5 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
// //                   Auditing Details
// //                 </th> */}
// //                 <th className="p-5 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
// //                   Workflow Status
// //                 </th>
// //                 <th className="p-5 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap text-right">
// //                   Actions
// //                 </th>
// //               </tr>
// //             </thead>
// //             <tbody className="divide-y divide-slate-100">
// //               {loading ? (
// //                 <tr>
// //                   <td colSpan={7} className="p-16 text-center">
// //                     <Loader2 className="animate-spin mx-auto text-purple-600 mb-2" size={28} />
// //                     <p className="text-sm text-slate-500 font-bold">Synchronizing ledger audit records...</p>
// //                   </td>
// //                 </tr>
// //               ) : paginatedSamples.length === 0 ? (
// //                 <tr>
// //                   <td colSpan={7} className="p-20 text-center">
// //                     <Microscope size={64} className="mx-auto text-slate-200 mb-4" />
// //                     <p className="text-xl font-black text-slate-700">No matching audit files</p>
// //                     <p className="text-sm text-slate-400 mt-1">Adjust filters or check back later</p>
// //                   </td>
// //                 </tr>
// //               ) : (
// //                 paginatedSamples.map((sample) => (
// //                   <tr key={sample.id} className="hover:bg-slate-50/50 transition-colors group">
// //                     <td className="p-5">
// //                       <div className="flex flex-col">
// //                         <span className="text-sm font-black text-slate-800 tracking-tight">
// //                           {sample.reference_no || "-"}
// //                         </span>
// //                         <span className="text-[10px] font-mono font-bold text-slate-400 mt-0.5">
// //                           ID: {sample.id}
// //                         </span>
// //                       </div>
// //                     </td>
// //                     <td className="p-5">
// //                       <div className="flex flex-col">
// //                         <span className="text-sm font-black text-slate-800">
// //                           {sample.patient_name}
// //                         </span>
// //                         <div className="flex items-center gap-2 mt-0.5">
// //                           <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
// //                             MRN: {sample.mrn}
// //                           </span>
// //                         </div>
// //                       </div>
// //                     </td>
// //                     <td className="p-5">
// //                       <div className="flex flex-col">
// //                         <span className="text-sm font-bold text-slate-700">{sample.service_name || sample.sample_name}</span>
// //                         {sample.doctor_name && (
// //                           <div className="flex items-center gap-1 text-[10px] font-bold text-purple-600/80 bg-purple-50/50 w-fit px-1.5 py-0.5 rounded mt-1.5">
// //                             <Stethoscope size={10} />
// //                             {sample.doctor_name.replace(/^Dr\.?\s*/i, 'Dr. ')}
// //                           </div>
// //                         )}
// //                         {sample.summary && (
// //                           <span className="text-[10px] text-slate-400 font-semibold mt-0.5">
// //                             Total: {sample.summary.total_parameters} | Critical: {sample.summary.critical_results}
// //                           </span>
// //                         )}
// //                       </div>
// //                     </td>
// //                     <td className="p-5">
// //                       <div className="flex flex-col gap-1">
// //                         {sample.ordered_at && (
// //                           <div className="text-xs text-slate-600 font-medium">
// //                             <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Ordered</span>
// //                             {new Date(sample.ordered_at).toLocaleString()}
// //                           </div>
// //                         )}
// //                         {sample.collected_at && (
// //                           <div className="text-xs text-slate-600 font-medium mt-1">
// //                             <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Collected</span>
// //                             {new Date(sample.collected_at).toLocaleString()}
// //                           </div>
// //                         )}
// //                       </div>
// //                     </td>
// //                     {/* <td className="p-5">
// //                       <div className="flex flex-col text-xs text-slate-600 font-semibold space-y-0.5">
// //                         {sample.verified_at ? (
// //                           <span className="text-blue-600">
// //                             Verified: {new Date(sample.verified_at).toLocaleDateString()}
// //                           </span>
// //                         ) : (
// //                           <span className="text-slate-400 italic">Not Verified</span>
// //                         )}
// //                         {sample.released_at && (
// //                           <span className="text-emerald-600">
// //                             Released: {new Date(sample.released_at).toLocaleDateString()}
// //                           </span>
// //                         )}
// //                       </div>
// //                     </td> */}
// //                     <td className="p-5">
// //                       <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${sample.workflow_status === "RELEASED"
// //                         ? "bg-emerald-50 text-emerald-700 border-emerald-200"
// //                         : sample.workflow_status === "VERIFIED"
// //                           ? "bg-blue-50 text-blue-700 border-blue-200"
// //                           : sample.workflow_status === "TECH_REVIEW"
// //                             ? "bg-purple-50 text-purple-700 border-purple-200"
// //                             : sample.workflow_status === "REOPENED"
// //                               ? "bg-red-50 text-red-700 border-red-200"
// //                               : sample.workflow_status === "COMPLETED"
// //                                 ? "bg-teal-50 text-teal-700 border-teal-200"
// //                                 : "bg-amber-50 text-amber-700 border-amber-200"
// //                         }`}>
// //                         {sample.workflow_status === "TECH_REVIEW"
// //                           ? "Tech Review"
// //                           : sample.workflow_status === "RELEASED"
// //                             ? "Dispatched"
// //                             : (sample.workflow_status || "PENDING")}
// //                       </span>
// //                     </td>
// //                     <td className="p-5 text-right relative">
// //                       <div className="flex items-center justify-end gap-1.5">
// //                         <button
// //                           onClick={() => handleOpenDetailModal(sample)}
// //                           className="p-2 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all"
// //                           title="View Parameters"
// //                         >
// //                           <Eye size={18} />
// //                         </button>
// //                         <button
// //                           onClick={() => handlePrintPreview(sample)}
// //                           className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
// //                           title="Print Report"
// //                         >
// //                           <Printer size={18} />
// //                         </button>
// //                         <button
// //                           onClick={(e) => {
// //                             e.stopPropagation();
// //                             setActiveMenu(activeMenu === sample.id ? null : sample.id);
// //                           }}
// //                           className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
// //                         >
// //                           <SlidersHorizontal size={18} />
// //                         </button>
// //                       </div>

// //                       {/* Dropdown Menu */}
// //                       {activeMenu === sample.id && (
// //                         <div className="absolute right-6 top-14 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 py-2.5 z-30 animate-in fade-in slide-in-from-top-2">
// //                           {/* Verify */}
// //                           {sample.workflow_status === "TECH_REVIEW" && (
// //                             <button
// //                               onClick={() => handleOpenVerifyModal(sample)}
// //                               className="w-full text-left px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-purple-600 flex items-center gap-2"
// //                             >
// //                               <ShieldCheck size={16} /> Audit & Verify
// //                             </button>
// //                           )}
// //                           {/* Complete */}
// //                           {sample.workflow_status === "VERIFIED" && (
// //                             <button
// //                               onClick={() => handleComplete(sample)}
// //                               className="w-full text-left px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-teal-600 flex items-center gap-2"
// //                             >
// //                               <CheckCircle2 size={16} /> Complete Result
// //                             </button>
// //                           )}
// //                           {/* Release */}
// //                           {sample.workflow_status === "COMPLETED" && (
// //                             <button
// //                               onClick={() => handleRelease(sample)}
// //                               className="w-full text-left px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-emerald-600 flex items-center gap-2"
// //                             >
// //                               <Send size={16} /> Release to Patient
// //                             </button>
// //                           )}
// //                           {/* Reopen */}
// //                           {sample.workflow_status && sample.workflow_status !== "RELEASED" && sample.workflow_status !== "PENDING" && (
// //                             <button
// //                               onClick={() => handleOpenReopenModal(sample)}
// //                               className="w-full text-left px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-amber-600 flex items-center gap-2"
// //                             >
// //                               <Undo size={16} /> Reopen / Correct
// //                             </button>
// //                           )}
// //                           {/* Amend */}
// //                           {sample.workflow_status && sample.workflow_status !== "PENDING" && (
// //                             <button
// //                               onClick={() => handleOpenAmendModal(sample)}
// //                               className="w-full text-left px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2"
// //                             >
// //                               <Edit3 size={16} /> Amend Values
// //                             </button>
// //                           )}
// //                         </div>
// //                       )}
// //                     </td>
// //                   </tr>
// //                 ))
// //               )}
// //             </tbody>
// //           </table>
// //         </div>

// //         {/* Pagination Footer */}
// //         {!loading && filteredSamples.length > 0 && (
// //           <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
// //             <span className="text-xs font-semibold text-slate-500">
// //               Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
// //               {Math.min(currentPage * itemsPerPage, filteredSamples.length)} of{" "}
// //               {filteredSamples.length} audits
// //             </span>
// //             <div className="flex items-center gap-2">
// //               <button
// //                 onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
// //                 disabled={currentPage === 1}
// //                 className="p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
// //               >
// //                 <ChevronLeft size={16} />
// //               </button>
// //               <span className="text-xs font-bold text-slate-700 px-3">
// //                 Page {currentPage} of {totalPages}
// //               </span>
// //               <button
// //                 onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
// //                 disabled={currentPage === totalPages}
// //                 className="p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
// //               >
// //                 <ChevronRight size={16} />
// //               </button>
// //             </div>
// //           </div>
// //         )}
// //       </div>

// //       {/* PORTALS & MODALS */}

// //       {/* 1. Detail View Modal */}
// //       {isDetailModalOpen &&
// //         selectedSample &&
// //         createPortal(
// //           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
// //             <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsDetailModalOpen(false)} />
// //             <div className="relative w-full max-w-3xl bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
// //               <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
// //                 <div className="flex items-center gap-4">
// //                   <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
// //                     <FileText size={22} />
// //                   </div>
// //                   <div>
// //                     <h3 className="text-lg font-black text-slate-800">Sample Results Auditing</h3>
// //                     <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{selectedSample.patient_name} • {selectedSample.reference_no}</p>
// //                   </div>
// //                 </div>
// //                 <button onClick={() => setIsDetailModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all">
// //                   <X size={20} />
// //                 </button>
// //               </div>

// //               <div className="p-6 overflow-y-auto flex-1 space-y-6">
// //                 {detailLoading ? (
// //                   <div className="py-20 text-center">
// //                     <Loader2 className="animate-spin mx-auto text-purple-600 mb-2" size={24} />
// //                     <p className="text-xs text-slate-400 font-bold">Synchronizing parameters...</p>
// //                   </div>
// //                 ) : detailedResult?.results ? (
// //                   <div className="border border-slate-200 rounded-2xl overflow-hidden">
// //                     <table className="w-full text-left">
// //                       <thead className="bg-slate-50 border-b border-slate-200">
// //                         <tr>
// //                           <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Parameter</th>
// //                           <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Result</th>
// //                           <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Unit</th>
// //                           <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Reference Range</th>
// //                           <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Interpretation</th>
// //                         </tr>
// //                       </thead>
// //                       <tbody className="divide-y divide-slate-100">
// //                         {detailedResult.results.map((res: ResultParameter) => (
// //                           <tr key={res.id} className="hover:bg-slate-50/50">
// //                             <td className="px-4 py-3 text-sm font-bold text-slate-800">{res.parameter_name}</td>
// //                             <td className="px-4 py-3 text-sm font-semibold text-slate-700">{res.result_value}</td>
// //                             <td className="px-4 py-3 text-sm text-slate-500">{res.unit || "-"}</td>
// //                             <td className="px-4 py-3 text-sm text-slate-500">{res.ref_low} - {res.ref_high}</td>
// //                             <td className="px-4 py-3">
// //                               <span className={`flag-badge ${getFlagBadgeClass(res.interpretation || res.flag_type)}`}>
// //                                 {getFlagLabel(res.interpretation || res.flag_type)}
// //                               </span>
// //                             </td>
// //                           </tr>
// //                         ))}
// //                       </tbody>
// //                     </table>
// //                   </div>
// //                 ) : (
// //                   <p className="text-center text-sm font-bold text-slate-400">Failed to render parameter schema.</p>
// //                 )}

// //                 {!detailLoading && detailedResult && (
// //                   <div className="space-y-4 mt-6">
// //                     {detailedResult.results?.[0]?.review_comment && (
// //                       <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-5 space-y-2">
// //                         <h5 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1.5">
// //                           <CheckCircle2 size={12} /> Technician / Doctor Review
// //                         </h5>
// //                         <p className="text-sm font-semibold text-slate-700 leading-relaxed">
// //                           "{detailedResult.results[0].review_comment}"
// //                         </p>
// //                         <div className="flex items-center gap-4 text-[10px] text-slate-400 font-bold">
// //                           <span>Reviewed By: {detailedResult.results[0].reviewed_by_name || "Staff"}</span>
// //                           {detailedResult.results[0].reviewed_at && (
// //                             <span>Date: {new Date(detailedResult.results[0].reviewed_at).toLocaleString()}</span>
// //                           )}
// //                         </div>
// //                       </div>
// //                     )}

// //                     {detailedResult.results?.[0]?.verification_comment && (
// //                       <div className="bg-purple-50/50 border border-purple-100 rounded-2xl p-5 space-y-2">
// //                         <h5 className="text-[10px] font-black text-purple-600 uppercase tracking-widest flex items-center gap-1.5">
// //                           <ShieldCheck size={12} /> Pathologist Verification
// //                         </h5>
// //                         <p className="text-sm font-semibold text-slate-700 leading-relaxed">
// //                           "{detailedResult.results[0].verification_comment}"
// //                         </p>
// //                         <div className="flex items-center gap-4 text-[10px] text-slate-400 font-bold">
// //                           <span>Verified By: {detailedResult.results[0].verified_by_name || "Pathologist"}</span>
// //                           {detailedResult.results[0].verified_at && (
// //                             <span>Date: {new Date(detailedResult.results[0].verified_at).toLocaleString()}</span>
// //                           )}
// //                         </div>
// //                       </div>
// //                     )}
// //                   </div>
// //                 )}
// //               </div>

// //               <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end">
// //                 <button onClick={() => setIsDetailModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
// //                   Close Audit
// //                 </button>
// //               </div>
// //             </div>
// //           </div>,
// //           document.body,
// //         )}

// //       {/* 2. Pathologist Verification Modal */}
// //       {isVerifyModalOpen &&
// //         selectedSample &&
// //         createPortal(
// //           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
// //             <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsVerifyModalOpen(false)} />
// //             <div className="relative w-full max-w-3xl bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
// //               <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
// //                 <div className="flex items-center gap-4">
// //                   <div className="w-12 h-12 rounded-xl bg-purple-600 text-white flex items-center justify-center">
// //                     <ShieldCheck size={22} />
// //                   </div>
// //                   <div>
// //                     <h3 className="text-lg font-black text-slate-800">Verify Laboratory Results</h3>
// //                     <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{selectedSample.patient_name} • {selectedSample.reference_no}</p>
// //                   </div>
// //                 </div>
// //                 <button onClick={() => setIsVerifyModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all">
// //                   <X size={20} />
// //                 </button>
// //               </div>

// //               <div className="p-6 overflow-y-auto flex-1 space-y-6">
// //                 {/* Result Parameters table preview */}
// //                 {detailLoading ? (
// //                   <div className="py-10 text-center">
// //                     <Loader2 className="animate-spin mx-auto text-purple-600 mb-2" size={24} />
// //                     <p className="text-xs text-slate-400 font-bold">Synchronizing parameters...</p>
// //                   </div>
// //                 ) : detailedResult?.results ? (
// //                   <div className="border border-slate-200 rounded-2xl overflow-hidden">
// //                     <table className="w-full text-left">
// //                       <thead className="bg-slate-50 border-b border-slate-200">
// //                         <tr>
// //                           <th className="px-4 py-2.5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Parameter</th>
// //                           <th className="px-4 py-2.5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Result</th>
// //                           <th className="px-4 py-2.5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Interpretation</th>
// //                         </tr>
// //                       </thead>
// //                       <tbody className="divide-y divide-slate-100">
// //                         {detailedResult.results.map((res: ResultParameter) => (
// //                           <tr key={res.id}>
// //                             <td className="px-4 py-2 text-xs font-bold text-slate-800">{res.parameter_name}</td>
// //                             <td className="px-4 py-2 text-xs font-semibold text-slate-700">{res.result_value} {res.unit}</td>
// //                             <td className="px-4 py-2">
// //                               <span className={`flag-badge ${getFlagBadgeClass(res.interpretation || res.flag_type)}`}>
// //                                 {getFlagLabel(res.interpretation || res.flag_type)}
// //                               </span>
// //                             </td>
// //                           </tr>
// //                         ))}
// //                       </tbody>
// //                     </table>
// //                   </div>
// //                 ) : null}

// //                 {/* Comment Area */}
// //                 <div className="space-y-2">
// //                   <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Pathologist Verification Comment</label>
// //                   <textarea
// //                     rows={3}
// //                     placeholder="Enter audit/verification notes here..."
// //                     className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10 transition-all"
// //                     value={verificationComment}
// //                     onChange={(e) => setVerificationComment(e.target.value)}
// //                   />
// //                 </div>
// //               </div>

// //               <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
// //                 <span className="text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100 font-bold flex items-center gap-1.5">
// //                   <AlertCircle size={14} /> Confirms clinical approval
// //                 </span>
// //                 <div className="flex items-center gap-3">
// //                   <button
// //                     onClick={() => setIsVerifyModalOpen(false)}
// //                     className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
// //                   >
// //                     Cancel
// //                   </button>
// //                   <button
// //                     onClick={() => handleComplete()}
// //                     disabled={isActionSubmitting}
// //                     className="px-5 py-2.5 text-sm font-bold text-white bg-teal-600 rounded-xl hover:bg-teal-700 shadow-lg shadow-teal-100 transition-all flex items-center gap-1.5 disabled:opacity-50"
// //                   >
// //                     {isActionSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
// //                     Complete Result
// //                   </button>
// //                   <button
// //                     onClick={handleVerify}
// //                     disabled={isActionSubmitting}
// //                     className="px-5 py-2.5 text-sm font-bold text-white bg-purple-600 rounded-xl hover:bg-purple-700 shadow-lg shadow-purple-100 transition-all flex items-center gap-1.5 disabled:opacity-50"
// //                   >
// //                     {isActionSubmitting ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
// //                     Verify Report
// //                   </button>
// //                 </div>
// //               </div>
// //             </div>
// //           </div>,
// //           document.body,
// //         )}

// //       {/* 3. Reopen Modal */}
// //       {isReopenModalOpen &&
// //         selectedSample &&
// //         createPortal(
// //           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
// //             <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsReopenModalOpen(false)} />
// //             <div className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
// //               <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
// //                 <div className="flex items-center gap-4">
// //                   <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
// //                     <Undo size={22} />
// //                   </div>
// //                   <div>
// //                     <h3 className="text-lg font-black text-slate-800">Reopen Lab Result</h3>
// //                     <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{selectedSample.reference_no}</p>
// //                   </div>
// //                 </div>
// //                 <button onClick={() => setIsReopenModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all">
// //                   <X size={20} />
// //                 </button>
// //               </div>

// //               <div className="p-6 space-y-4">
// //                 <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
// //                   <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={18} />
// //                   <p className="text-xs text-amber-800 font-semibold leading-relaxed">
// //                     Reopening will reset the status of this result and return it to Draft/Pending status. You must provide a valid correction or retesting reason.
// //                   </p>
// //                 </div>

// //                 <div className="space-y-2">
// //                   <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Reason for Reopening</label>
// //                   <textarea
// //                     rows={3}
// //                     placeholder="Enter reason (e.g., Update result value, incorrect parameter input)..."
// //                     className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/10 transition-all"
// //                     value={reopenReason}
// //                     onChange={(e) => setReopenReason(e.target.value)}
// //                   />
// //                 </div>
// //               </div>

// //               <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
// //                 <button
// //                   onClick={() => setIsReopenModalOpen(false)}
// //                   className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
// //                 >
// //                   Cancel
// //                 </button>
// //                 <button
// //                   onClick={handleReopen}
// //                   disabled={isActionSubmitting}
// //                   className="px-5 py-2.5 text-sm font-bold text-white bg-amber-600 rounded-xl hover:bg-amber-700 shadow-lg shadow-amber-100 transition-all flex items-center gap-1.5 disabled:opacity-50"
// //                 >
// //                   {isActionSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Undo size={16} />}
// //                   Confirm Reopen
// //                 </button>
// //               </div>
// //             </div>
// //           </div>,
// //           document.body,
// //         )}

// //       {/* 4. Amend Results Modal */}
// //       {isAmendModalOpen &&
// //         selectedSample &&
// //         createPortal(
// //           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
// //             <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsAmendModalOpen(false)} />
// //             <div className="relative w-full max-w-3xl bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
// //               <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
// //                 <div className="flex items-center gap-4">
// //                   <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
// //                     <Edit3 size={22} />
// //                   </div>
// //                   <div>
// //                     <h3 className="text-lg font-black text-slate-800">Amend Result Values</h3>
// //                     <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{selectedSample.patient_name} • {selectedSample.reference_no}</p>
// //                   </div>
// //                 </div>
// //                 <button onClick={() => setIsAmendModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all">
// //                   <X size={20} />
// //                 </button>
// //               </div>

// //               <div className="p-6 overflow-y-auto flex-1 space-y-6">
// //                 {detailLoading ? (
// //                   <div className="py-10 text-center">
// //                     <Loader2 className="animate-spin mx-auto text-indigo-600 mb-2" size={24} />
// //                     <p className="text-xs text-slate-400 font-bold">Synchronizing parameters...</p>
// //                   </div>
// //                 ) : detailedResult?.results ? (
// //                   <div className="space-y-6">
// //                     <div className="border border-slate-200 rounded-2xl overflow-hidden">
// //                       <table className="w-full text-left">
// //                         <thead className="bg-slate-50 border-b border-slate-200">
// //                           <tr>
// //                             <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Parameter</th>
// //                             <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Unit</th>
// //                             <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Reference Range</th>
// //                             <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest w-40">Amended Value</th>
// //                           </tr>
// //                         </thead>
// //                         <tbody className="divide-y divide-slate-100">
// //                           {detailedResult.results.map((res: ResultParameter) => (
// //                             <tr key={res.id}>
// //                               <td className="px-4 py-3 text-sm font-bold text-slate-800">{res.parameter_name}</td>
// //                               <td className="px-4 py-3 text-sm text-slate-500">{res.unit}</td>
// //                               <td className="px-4 py-3 text-sm text-slate-500">{res.ref_low} - {res.ref_high}</td>
// //                               <td className="px-4 py-3">
// //                                 <input
// //                                   type="text"
// //                                   className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:bg-white focus:border-indigo-500 transition-all"
// //                                   value={amendedValues[res.parameter_id] ?? ""}
// //                                   onChange={(e) =>
// //                                     setAmendedValues({
// //                                       ...amendedValues,
// //                                       [res.parameter_id]: e.target.value,
// //                                     })
// //                                   }
// //                                 />
// //                               </td>
// //                             </tr>
// //                           ))}
// //                         </tbody>
// //                       </table>
// //                     </div>

// //                     {/* Amendment Reason */}
// //                     <div className="space-y-2">
// //                       <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Amendment Reason</label>
// //                       <textarea
// //                         rows={2}
// //                         placeholder="Provide reasoning (e.g., correction of calibration, manual validation correction)..."
// //                         className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all"
// //                         value={amendmentReason}
// //                         onChange={(e) => setAmendmentReason(e.target.value)}
// //                       />
// //                     </div>
// //                   </div>
// //                 ) : null}
// //               </div>

// //               <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
// //                 <button
// //                   onClick={() => setIsAmendModalOpen(false)}
// //                   className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
// //                 >
// //                   Cancel
// //                 </button>
// //                 <button
// //                   onClick={handleAmend}
// //                   disabled={isActionSubmitting}
// //                   className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all flex items-center gap-1.5 disabled:opacity-50"
// //                 >
// //                   {isActionSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Edit3 size={16} />}
// //                   Save Amendment
// //                 </button>
// //               </div>
// //             </div>
// //           </div>,
// //           document.body,
// //         )}
// //     </div>
// //   );
// // };

// // export default LabVerification;
